/**
 * IBP BOM v6 — Express Proxy Server
 * Forwards OData requests to SAP IBP, handling CORS and authentication.
 * 
 * Usage:
 *   npm install
 *   npm start
 *   Open http://localhost:3000
 */

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Auth helpers ──────────────────────────────────────────────────
function getExpectedToken() {
  const password = process.env.APP_PASSWORD || '';
  const secret = process.env.APP_SECRET || 'goscm-session-secret';
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(part => {
    const [name, ...rest] = part.split('=');
    if (name) cookies[name.trim()] = rest.join('=').trim();
  });
  return cookies;
}

function isAuthenticated(req) {
  // If APP_PASSWORD is not set, auth is disabled
  if (!process.env.APP_PASSWORD) return true;
  const cookies = parseCookies(req.headers.cookie);
  return cookies.goscm_session === getExpectedToken();
}

// ─── Auth middleware (before static files) ─────────────────────────
const PUBLIC_PATHS = ['/login.html', '/api/auth', '/css/', '/logo-goscm.png', '/favicon.png'];

app.use((req, res, next) => {
  const isPublic = PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p));
  if (isPublic) return next();
  if (!isAuthenticated(req)) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    return res.redirect('/login.html');
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── POST /api/auth — Login ────────────────────────────────────────
app.post('/api/auth', (req, res) => {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'APP_PASSWORD no configurado en el servidor' });
  }
  const { password } = req.body || {};
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = getExpectedToken();
  const isSecure = !!(process.env.VERCEL || process.env.NODE_ENV === 'production');
  res.setHeader('Set-Cookie',
    `goscm_session=${token}; HttpOnly; Path=/; SameSite=Strict${isSecure ? '; Secure' : ''}; Max-Age=86400`
  );
  res.json({ ok: true });
});

// ─── GET /api/logout ───────────────────────────────────────────────
app.get('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'goscm_session=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/login.html');
});

// ─── Proxy endpoint ───────────────────────────────────────────────
// POST /api/proxy
// Body: { url, user, password }
// Forwards GET request to the SAP IBP OData URL with Basic Auth
app.post('/api/proxy', async (req, res) => {
  const { url, user, password } = req.body;

  if (!url || !user || !password) {
    return res.status(400).json({ error: 'Missing url, user, or password' });
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
      return res.status(resp.status).json({
        error: `SAP IBP returned ${resp.status}`,
        detail: text.substring(0, 500)
      });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Proxy for $metadata (returns XML) ────────────────────────────
app.post('/api/proxy-xml', async (req, res) => {
  const { url, user, password } = req.body;

  if (!url || !user || !password) {
    return res.status(400).json({ error: 'Missing url, user, or password' });
  }

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
      return res.status(resp.status).json({
        error: `SAP IBP returned ${resp.status}`,
        detail: text.substring(0, 500)
      });
    }

    const text = await resp.text();
    res.type('text/xml').send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  IBP BOM Hierarchy v6                    ║`);
    console.log(`  ║  http://localhost:${PORT}                    ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

module.exports = app;
