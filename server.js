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

// ─── Security headers ────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json());
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

// Validates the base URL: must be HTTPS and end with the allowed host suffix.
// Blocks loopback and private IP ranges (RFC 1918 / RFC 5735).
function validateProxyUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return 'URL inválida'; }

  if (parsed.protocol !== 'https:') return 'Solo se permite HTTPS';

  const host = parsed.hostname;

  // Block loopback and private ranges
  if (/^(localhost|127\.|10\.|169\.254\.|::1$)/.test(host)) return 'Host no permitido';
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return 'Host no permitido';
  if (/^192\.168\./.test(host)) return 'Host no permitido';

  // Allowlist: only SAP IBP domains (override via ALLOWED_HOST_SUFFIX env var)
  const suffix = process.env.ALLOWED_HOST_SUFFIX || '.ondemand.com';
  if (!host.endsWith(suffix)) return 'Host no permitido';

  return null;
}

// Validates that the OData service name is in the allowed list.
// Strips optional version suffix (e.g. ;v=0002) before checking.
function validateService(service) {
  if (!service) return 'Servicio no permitido';
  const baseName = service.split(';')[0];
  if (!ALLOWED_SERVICES.includes(baseName)) return 'Servicio no permitido';
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

  const baseError = validateProxyUrl(base + '/');
  const svcError  = validateService(service);
  const pathError = validateEntityPath(entityPath);

  if (baseError) return res.status(400).json({ error: baseError });
  if (svcError)  return res.status(400).json({ error: svcError });
  if (pathError) return res.status(400).json({ error: pathError });

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
      timeout: 120000
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
      timeout: 60000
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

  try {
    const auth = Buffer.from(`${user}:${password}`).toString('base64');
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 120000
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

// ─── /api/send-feedback ───────────────────────────────────────────
// Body: { name, app, type, description }
// Sends feedback email via EmailJS REST API using server-side credentials.
app.post('/api/send-feedback', async (req, res) => {
  const { name, app: appName, type, description } = req.body || {};

  if (!name || !description) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      process.env.EMAILJS_SERVICE_ID,
        template_id:     process.env.EMAILJS_TEMPLATE_ID,
        user_id:         process.env.EMAILJS_PUBLIC_KEY,
        accessToken:     process.env.EMAILJS_PRIVATE_KEY,
        template_params: { from_name: name, app: appName, type, description }
      })
    });

    if (resp.ok) return res.json({ ok: true });

    console.error('[feedback] EmailJS error:', resp.status);
    res.status(500).json({ error: 'Error al enviar feedback' });
  } catch (err) {
    console.error('[feedback error]', err.message);
    res.status(500).json({ error: 'Error interno' });
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
    timeout: 60000,
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

  const loginBody = `<web:logonRequest><orgName>${xe(orgName)}</orgName><userName>${xe(user)}</userName><password>${xe(password)}</password><isProduction>${isProduction ? 'true' : 'false'}</isProduction></web:logonRequest>`;
  try {
    const { ok, status, text } = await cidsRawSoap(hciUrl, 'function=logon', buildCidsEnvelope(loginBody, null));
    if (!ok) {
      const fault = parseSoapFault(text);
      return res.status(401).json({ error: fault?.faultString || `Error de autenticación (HTTP ${status})` });
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

  const soapActions = { getProjects: 'function=getAllProjects', getProjectTasks: 'function=getAllProjectTasks', logout: 'function=logoff' };
  try {
    const body     = buildCidsBody(operation, { ...params, sessionId });
    const envelope = buildCidsEnvelope(body, sessionId);
    const { ok, status, text } = await cidsRawSoap(hciUrl, soapActions[operation] || `function=${operation}`, envelope);
    if (!ok) {
      const fault = parseSoapFault(text);
      if (/session/i.test(fault?.faultCode || '') || /session/i.test(fault?.faultString || ''))
        return res.status(401).json({ error: 'SESSION_EXPIRED' });
      return res.status(status).json({ error: fault?.faultString || `SOAP error HTTP ${status}` });
    }
    return res.json(parseCidsResponse(operation, text));
  } catch (e) {
    console.error('[cids-soap]', e.message);
    return res.status(500).json({ error: e.message });
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
