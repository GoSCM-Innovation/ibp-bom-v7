/**
 * Shared validation helpers and SOAP utilities for Netlify Functions.
 * Extracted from server.js — keep in sync with any changes there.
 */

const https = require('https');
const fetch = require('node-fetch');

// ─── OData constants ──────────────────────────────────────────────
const ALLOWED_SERVICES = ['MASTER_DATA_API_SRV', 'PLANNING_DATA_API_SRV', 'BC_EXT_APPJOB_MANAGEMENT'];
const ODATA_PREFIX_IBP = '/sap/opu/odata/IBP/';
const ODATA_PREFIX_SAP = '/sap/opu/odata/sap/';
const PREFIX_MAP = { IBP: ODATA_PREFIX_IBP, SAP: ODATA_PREFIX_SAP };

const FETCH_TIMEOUT_MS = 90000;
const SOAP_TIMEOUT_MS  = 60000;

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });

// ─── Validation helpers ───────────────────────────────────────────

function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (/^(localhost|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (/^(::1|::|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe[89ab][0-9a-f]:|::ffff:)/i.test(h)) return true;
  return false;
}

const DEFAULT_IBP_HOST_REGEX = /^[a-z0-9-]+-api\.scmibp\d*\.ondemand\.com$/i;
function getIbpHostRegex() {
  const raw = process.env.ALLOWED_IBP_HOST_REGEX;
  if (!raw) return DEFAULT_IBP_HOST_REGEX;
  try { return new RegExp(raw, 'i'); }
  catch { console.error('[config] ALLOWED_IBP_HOST_REGEX inválido, usando default'); return DEFAULT_IBP_HOST_REGEX; }
}

function validateProxyUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return 'URL inválida'; }
  if (parsed.protocol !== 'https:') return 'Solo se permite HTTPS';
  const host = parsed.hostname;
  if (isPrivateHost(host)) return 'Host no permitido';
  if (!getIbpHostRegex().test(host)) return 'Host no permitido';
  return null;
}

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

const SERVICE_RE = /^[A-Z][A-Z0-9_]*(?:;v=\d+)?$/;
function validateService(service) {
  if (!service || typeof service !== 'string') return 'Servicio no permitido';
  if (!SERVICE_RE.test(service)) return 'Servicio no permitido';
  const baseName = service.split(';')[0];
  if (!ALLOWED_SERVICES.includes(baseName)) return 'Servicio no permitido';
  return null;
}

const MAX_QUERY_LEN = 60000;
function validateQuery(query) {
  if (query === undefined || query === null || query === '') return null;
  if (typeof query !== 'string') return 'Query inválida';
  if (query.length > MAX_QUERY_LEN) return 'Query demasiado larga';
  if (/[\x00#]/.test(query)) return 'Query inválida';
  return null;
}

function validateEntityPath(entityPath) {
  if (!entityPath) return 'Path requerido';
  if (!/^\$?[a-zA-Z][a-zA-Z0-9_]*$/.test(entityPath)) return 'Path de entidad inválido';
  return null;
}

// ─── SOAP helpers ─────────────────────────────────────────────────

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

// ─── Response helper ──────────────────────────────────────────────

function jsonResp(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

module.exports = {
  ALLOWED_SERVICES, ODATA_PREFIX_IBP, ODATA_PREFIX_SAP, PREFIX_MAP,
  FETCH_TIMEOUT_MS, SOAP_TIMEOUT_MS, httpsAgent, fetch,
  isPrivateHost, validateProxyUrl, validateHciUrl,
  validateService, validateQuery, validateEntityPath,
  xmlVal, xmlAll, xe, parseSoapFault, buildCidsEnvelope, cidsRawSoap,
  jsonResp
};
