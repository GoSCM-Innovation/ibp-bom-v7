/**
 * IBP BOM v7 — Express Proxy Server
 * Forwards OData requests to SAP IBP, handling CORS and authentication.
 *
 * Usage:
 *   npm install
 *   npm run dev   (local, requires .env)
 *   npm start     (production / Vercel)
 */

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const https = require('https');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel sits behind a proxy — required for express-rate-limit to read the real client IP
app.set('trust proxy', 1);

// ─── OData constants ──────────────────────────────────────────────
const ALLOWED_SERVICES = ['MASTER_DATA_API_SRV', 'PLANNING_DATA_API_SRV', 'BC_EXT_APPJOB_MANAGEMENT'];
const ODATA_PREFIX_IBP = '/sap/opu/odata/IBP/';
const ODATA_PREFIX_SAP = '/sap/opu/odata/sap/';   // lowercase — BC_EXT_APPJOB_MANAGEMENT uses /sap/opu/odata/sap/
const PREFIX_MAP = { IBP: ODATA_PREFIX_IBP, SAP: ODATA_PREFIX_SAP };

// ─── Outbound HTTPS agent — bounded socket pool (audit M-05) ─────
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

// Fetch defaults: 90s per-request timeout is wide enough for SAP IBP heavy pages
// (5–30 s typical) but kills slowloris/DoS attempts. Use this on every outbound fetch.
const FETCH_TIMEOUT_MS = 90000;
const SOAP_TIMEOUT_MS  = 60000;

// ─── Security headers (audit L-11 fase 1) ────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// body limit: largest legit request is the OData `query` field (~25 KB measured).
// 64 KB cap leaves 2× headroom while blocking inflated bodies (audit M-04).
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rate limiting ───────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 60,              // máx 60 requests/min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo en un minuto' }
});
app.use('/api/', apiLimiter);

// ─── Validation helpers ───────────────────────────────────────────

// Validates a hostname against private/internal IP ranges (audit H-05).
// Returns true if the host is private/loopback/link-local/CGNAT (IPv4 + IPv6).
function isPrivateHost(host) {
  // Strip IPv6 brackets if present
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv4 loopback, RFC1918, link-local, CGNAT, all-zeros
  if (/^(localhost|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;

  // IPv6: loopback (::1), unspecified (::), unique-local (fc00::/7), link-local (fe80::/10),
  // IPv4-mapped (::ffff:0.0.0.0/96)
  if (/^(::1|::|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe[89ab][0-9a-f]:|::ffff:)/i.test(h)) return true;

  return false;
}

// SAP IBP tenants follow the pattern <tenant>-api.scmibp<dc>.ondemand.com,
// where <dc> is an optional datacenter number (scmibp, scmibp1, scmibp2, ...).
// Override via ALLOWED_IBP_HOST_REGEX env var if a non-standard tenant exists.
// Default pattern is anchored to prevent partial matches (audit H-03).
const DEFAULT_IBP_HOST_REGEX = /^[a-z0-9-]+-api\.scmibp\d*\.ondemand\.com$/i;
function getIbpHostRegex() {
  const raw = process.env.ALLOWED_IBP_HOST_REGEX;
  if (!raw) return DEFAULT_IBP_HOST_REGEX;
  try { return new RegExp(raw, 'i'); }
  catch { console.error('[config] ALLOWED_IBP_HOST_REGEX inválido, usando default'); return DEFAULT_IBP_HOST_REGEX; }
}

// Validates the base URL: must be HTTPS, NOT a private/internal IP, and match the
// SAP IBP tenant regex (audit H-03, H-05).
function validateProxyUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return 'URL inválida'; }

  if (parsed.protocol !== 'https:') return 'Solo se permite HTTPS';

  const host = parsed.hostname;
  if (isPrivateHost(host)) return 'Host no permitido';

  if (!getIbpHostRegex().test(host)) return 'Host no permitido';

  return null;
}

// Validates a CI-DS HCI URL (audit H-01). SAP CI-DS lives on Kyma, Neo, or HCS.
// Override via ALLOWED_HCI_HOST_REGEX env var if needed.
const DEFAULT_HCI_HOST_REGEX = /^([a-z0-9-]+\.)+(kyma\.ondemand\.com|hana\.ondemand\.com|hcs\.cloud\.sap)$/i;
function getHciHostRegex() {
  const raw = process.env.ALLOWED_HCI_HOST_REGEX;
  if (!raw) return DEFAULT_HCI_HOST_REGEX;
  try { return new RegExp(raw, 'i'); }
  catch { console.error('[config] ALLOWED_HCI_HOST_REGEX inválido, usando default'); return DEFAULT_HCI_HOST_REGEX; }
}
function validateHciUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return 'URL CI-DS inválida'; }
  if (parsed.protocol !== 'https:') return 'Solo se permite HTTPS';
  const host = parsed.hostname;
  if (isPrivateHost(host)) return 'Host CI-DS no permitido';
  if (!getHciHostRegex().test(host)) return 'Host CI-DS no permitido';
  return null;
}

// Validates that the OData service name is in the allowed list.
// Strict regex: SERVICE_NAME optionally followed by ;v=NNNN. Anything else
// (path traversal, slashes, dots) is rejected (audit H-02).
const SERVICE_RE = /^[A-Z][A-Z0-9_]*(?:;v=\d+)?$/;
function validateService(service) {
  if (!service || typeof service !== 'string') return 'Servicio no permitido';
  if (!SERVICE_RE.test(service)) return 'Servicio no permitido';
  const baseName = service.split(';')[0];
  if (!ALLOWED_SERVICES.includes(baseName)) return 'Servicio no permitido';
  return null;
}

// Validates the OData query string forwarded to SAP. Caps length and rejects
// characters the frontend never sends (audit M-01). Spaces are allowed because
// $select fields are not URL-encoded by the client (api.js:275-277).
const MAX_QUERY_LEN = 60000;
function validateQuery(query) {
  if (query === undefined || query === null || query === '') return null;
  if (typeof query !== 'string') return 'Query inválida';
  if (query.length > MAX_QUERY_LEN) return 'Query demasiado larga';
  if (/[\x00#]/.test(query)) return 'Query inválida';
  return null;
}

// Validates the entity path: alphanumeric + underscores only, or $metadata.
// Prevents path traversal (../, extra slashes, special chars).
function validateEntityPath(entityPath) {
  if (!entityPath) return 'Path requerido';
  if (!/^\$?[a-zA-Z][a-zA-Z0-9_]*$/.test(entityPath)) return 'Path de entidad inválido';
  return null;
}

// ─── /api/proxy — OData JSON requests ────────────────────────────
// Body: { base, service, path, query, user, password }
// Server reconstructs: ${base}/sap/opu/odata/IBP/${service}/${path}?${query}
app.post('/api/proxy', async (req, res) => {
  const { base, service, path: entityPath, query, user, password, prefix } = req.body;

  if (!base || !service || !entityPath || !user || !password) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const baseError  = validateProxyUrl(base + '/');
  const svcError   = validateService(service);
  const pathError  = validateEntityPath(entityPath);
  const queryError = validateQuery(query);

  if (baseError)  return res.status(400).json({ error: baseError });
  if (svcError)   return res.status(400).json({ error: svcError });
  if (pathError)  return res.status(400).json({ error: pathError });
  if (queryError) return res.status(400).json({ error: queryError });

  const odataPrefix = PREFIX_MAP[prefix] || ODATA_PREFIX_IBP;
  const url = `${base}${odataPrefix}${service}/${entityPath}${query ? '?' + query : ''}`;

  try {
    const auth = Buffer.from(`${user}:${password}`).toString('base64');
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: FETCH_TIMEOUT_MS,
      agent: httpsAgent,
      redirect: 'manual'
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[proxy] SAP error', resp.status, text.substring(0, 200));
      return res.status(resp.status).json({
        error: `Error al conectar con SAP IBP (${resp.status})`
      });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('[proxy error]', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── /api/proxy-xml — OData $metadata requests ───────────────────
// Body: { base, service, user, password }
// Path is always $metadata — hardcoded server-side.
app.post('/api/proxy-xml', async (req, res) => {
  const { base, service, user, password, prefix } = req.body;

  if (!base || !service || !user || !password) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const baseError = validateProxyUrl(base + '/');
  const svcError  = validateService(service);

  if (baseError) return res.status(400).json({ error: baseError });
  if (svcError)  return res.status(400).json({ error: svcError });

  const odataPrefix = PREFIX_MAP[prefix] || ODATA_PREFIX_IBP;
  const url = `${base}${odataPrefix}${service}/$metadata`;

  try {
    const auth = Buffer.from(`${user}:${password}`).toString('base64');
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/xml'
      },
      timeout: SOAP_TIMEOUT_MS,
      agent: httpsAgent,
      redirect: 'manual'
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[proxy-xml] SAP error', resp.status, text.substring(0, 200));
      return res.status(resp.status).json({
        error: `Error al conectar con SAP IBP (${resp.status})`
      });
    }

    const text = await resp.text();
    res.type('text/xml').send(text);
  } catch (err) {
    console.error('[proxy-xml error]', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── /api/proxy-next — OData pagination next links ───────────────
// Used exclusively for __next / @odata.nextLink URLs returned by SAP IBP.
// Body: { url, user, password }
// Validates domain + that path starts with the expected OData prefix.
app.post('/api/proxy-next', async (req, res) => {
  const { url, user, password } = req.body;

  if (!url || !user || !password) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  const urlError = validateProxyUrl(url);
  if (urlError) return res.status(400).json({ error: urlError });

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'URL inválida' }); }

  const lcPath = parsed.pathname.toLowerCase();
  if (!lcPath.startsWith('/sap/opu/odata/ibp/') && !lcPath.startsWith('/sap/opu/odata/sap/')) {
    return res.status(400).json({ error: 'Path no permitido' });
  }

  // Strip any userinfo from the SAP-returned __next URL — credentials must come
  // only from the Authorization header we attach, never from the URL itself.
  parsed.username = '';
  parsed.password = '';
  const safeUrl = parsed.toString();

  try {
    const auth = Buffer.from(`${user}:${password}`).toString('base64');
    const resp = await fetch(safeUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: FETCH_TIMEOUT_MS,
      agent: httpsAgent,
      redirect: 'manual'
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[proxy-next] SAP error', resp.status, text.substring(0, 200));
      return res.status(resp.status).json({
        error: `Error al conectar con SAP IBP (${resp.status})`
      });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('[proxy-next error]', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── CI-DS SOAP helpers ───────────────────────────────────────────
function xmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<(?:[\\w]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w]+:)?${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}
function xmlAll(xml, tag) {
  const re = new RegExp(`<(?:[\\w]+:)?${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:[\\w]+:)?${tag}>`, 'gi');
  return [...xml.matchAll(re)].map(m => m[0]);
}
function xe(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function parseSoapFault(xml) {
  const code = xmlVal(xml, 'faultcode') || xmlVal(xml, 'faultCode');
  const str  = xmlVal(xml, 'faultstring') || xmlVal(xml, 'faultString');
  if (!code && !str) return null;
  const detail = xmlVal(xml, 'message') || xmlVal(xml, 'detail');
  return { faultCode: code, faultString: detail ? `${str} — ${detail}` : str };
}
function buildCidsEnvelope(body, sessionId) {
  const header = sessionId
    ? `<soapenv:Header><SessionId>${xe(sessionId)}</SessionId></soapenv:Header>`
    : '<soapenv:Header/>';
  return `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservices.dsod.sap.com/">${header}<soapenv:Body>${body}</soapenv:Body></soapenv:Envelope>`;
}
async function cidsRawSoap(hciUrl, soapAction, envelope) {
  const resp = await fetch(hciUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': soapAction },
    body: envelope,
    timeout: SOAP_TIMEOUT_MS,
    agent: httpsAgent,
    redirect: 'manual'
  });
  return { ok: resp.ok, status: resp.status, text: await resp.text() };
}

const CIDS_ALLOWED_OPS = new Set(['getProjects', 'getProjectTasks', 'logout', 'ping']);

function buildCidsBody(operation, params) {
  switch (operation) {
    case 'ping':            return `<web:pingRequest/>`;
    case 'logout':          return `<web:logoutRequest><SessionID>${xe(params.sessionId)}</SessionID></web:logoutRequest>`;
    case 'getProjects':     return `<web:allProjectsRequest/>`;
    case 'getProjectTasks': return `<web:allProjectTasksRequest><projectGuid>${xe(params.projectGuid)}</projectGuid></web:allProjectTasksRequest>`;
    default: throw new Error(`Operación no permitida: ${operation}`);
  }
}

function parseCidsResponse(operation, xml) {
  const fault = parseSoapFault(xml);
  if (fault) throw new Error(fault.faultString || fault.faultCode || 'SOAP fault');
  switch (operation) {
    case 'ping':    return { message: xmlVal(xml, 'Message') || xmlVal(xml, 'message') };
    case 'logout':  return { message: xmlVal(xml, 'LogoutMessage') || xmlVal(xml, 'logoutMessage') };
    case 'getProjects':
      return xmlAll(xml, 'projects').map(p => ({
        name: xmlVal(p, 'name'), guid: xmlVal(p, 'guid'), description: xmlVal(p, 'description'),
      }));
    case 'getProjectTasks':
      return xmlAll(xml, 'tasks').map(t => ({
        taskName: xmlVal(t, 'taskName'), taskGuid: xmlVal(t, 'taskGuid'), type: xmlVal(t, 'type'),
      }));
    default: return { raw: xml };
  }
}

// ─── /api/cids-login ──────────────────────────────────────────────
app.post('/api/cids-login', async (req, res) => {
  const { hciUrl, orgName, user, password, isProduction } = req.body || {};
  if (!hciUrl || !orgName || !user || !password)
    return res.status(400).json({ error: 'hciUrl, orgName, user y password son requeridos' });

  // audit H-01: hciUrl previously had zero validation, enabling SSRF + credential
  // exfiltration. Now allowlisted against SAP CI-DS host patterns (Kyma/Neo/HCS).
  const hciError = validateHciUrl(hciUrl);
  if (hciError) return res.status(400).json({ error: hciError });

  const loginBody = `<web:logonRequest><orgName>${xe(orgName)}</orgName><userName>${xe(user)}</userName><password>${xe(password)}</password><isProduction>${isProduction ? 'true' : 'false'}</isProduction></web:logonRequest>`;
  try {
    const { ok, status, text } = await cidsRawSoap(hciUrl, 'function=logon', buildCidsEnvelope(loginBody, null));
    if (!ok) {
      const fault = parseSoapFault(text);
      console.error('[cids-login] auth failed', status, fault?.faultString || '');
      return res.status(401).json({ error: `Error de autenticación (HTTP ${status})` });
    }
    const sessionId = xmlVal(text, 'SessionID') || xmlVal(text, 'sessionID');
    if (!sessionId) return res.status(401).json({ error: 'La respuesta no devolvió SessionID' });
    return res.json({ sessionId });
  } catch (e) {
    console.error('[cids-login]', e.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── /api/cids-soap ───────────────────────────────────────────────
app.post('/api/cids-soap', async (req, res) => {
  const { hciUrl, sessionId, operation, params = {} } = req.body || {};
  if (!hciUrl)    return res.status(400).json({ error: 'hciUrl requerido' });
  if (!sessionId) return res.status(400).json({ error: 'sessionId requerido' });
  if (!operation) return res.status(400).json({ error: 'operation requerida' });
  if (!CIDS_ALLOWED_OPS.has(operation)) return res.status(400).json({ error: 'Operación no permitida' });

  // audit H-01: validate hciUrl against allowlist before any outbound fetch.
  const hciError = validateHciUrl(hciUrl);
  if (hciError) return res.status(400).json({ error: hciError });

  const soapActions = { getProjects: 'function=getAllProjects', getProjectTasks: 'function=getAllProjectTasks', logout: 'function=logoff' };
  try {
    const body     = buildCidsBody(operation, { ...params, sessionId });
    const envelope = buildCidsEnvelope(body, sessionId);
    const { ok, status, text } = await cidsRawSoap(hciUrl, soapActions[operation] || `function=${operation}`, envelope);
    if (!ok) {
      const fault = parseSoapFault(text);
      if (/session/i.test(fault?.faultCode || '') || /session/i.test(fault?.faultString || ''))
        return res.status(401).json({ error: 'SESSION_EXPIRED' });
      // audit M-02: don't leak upstream SOAP fault details to client; log them instead.
      console.error('[cids-soap] fault', status, fault?.faultCode || '', fault?.faultString || '');
      return res.status(status >= 400 && status < 600 ? status : 502).json({ error: `Error en CI-DS (HTTP ${status})` });
    }
    return res.json(parseCidsResponse(operation, text));
  } catch (e) {
    console.error('[cids-soap]', e.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  IBP BOM Hierarchy v7                    ║`);
    console.log(`  ║  http://localhost:${PORT}                   ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

module.exports = app;
