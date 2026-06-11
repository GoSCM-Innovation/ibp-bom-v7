const { fetch, SOAP_TIMEOUT_MS, jsonResp } = require('./_shared/helpers');

// Allows production + preview deploys on both Vercel and Netlify.
// Override via ALLOWED_FEEDBACK_ORIGIN env var for custom domains.
const DEFAULT_ORIGIN_RE = /^https:\/\/ibp-bom-v7(-[a-z0-9-]+)?\.(vercel|netlify)\.app$/i;
function getAllowedOriginRe() {
  const raw = process.env.ALLOWED_FEEDBACK_ORIGIN;
  if (!raw) return DEFAULT_ORIGIN_RE;
  try { return new RegExp(raw, 'i'); }
  catch { return DEFAULT_ORIGIN_RE; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { name, app: appName, type, description } = body || {};

  if (!name || !description)
    return jsonResp(400, { error: 'Faltan campos requeridos' });
  if (typeof name !== 'string' || name.length > 200)
    return jsonResp(400, { error: 'Nombre demasiado largo' });
  if (typeof description !== 'string' || description.length > 5000)
    return jsonResp(400, { error: 'Descripción demasiado larga (máx 5000 caracteres)' });
  if (appName && (typeof appName !== 'string' || appName.length > 100))
    return jsonResp(400, { error: 'Campo "app" inválido' });
  if (type && (typeof type !== 'string' || type.length > 100))
    return jsonResp(400, { error: 'Campo "type" inválido' });

  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (origin && !getAllowedOriginRe().test(origin))
    return jsonResp(403, { error: 'Origen no permitido' });

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
      }),
      timeout: SOAP_TIMEOUT_MS
    });

    if (resp.ok) return jsonResp(200, { ok: true });

    console.error('[feedback] EmailJS error:', resp.status);
    return jsonResp(500, { error: 'Error al enviar feedback' });
  } catch (err) {
    console.error('[feedback error]', err.message);
    return jsonResp(500, { error: 'Error interno' });
  }
};
