const {
  validateProxyUrl, FETCH_TIMEOUT_MS, httpsAgent, fetch, jsonResp
} = require('./_shared/helpers');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { url, user, password } = body;

  if (!url || !user || !password)
    return jsonResp(400, { error: 'Faltan parámetros requeridos' });

  const urlError = validateProxyUrl(url);
  if (urlError) return jsonResp(400, { error: urlError });

  let parsed;
  try { parsed = new URL(url); } catch { return jsonResp(400, { error: 'URL inválida' }); }

  const lcPath = parsed.pathname.toLowerCase();
  if (!lcPath.startsWith('/sap/opu/odata/ibp/') && !lcPath.startsWith('/sap/opu/odata/sap/'))
    return jsonResp(400, { error: 'Path no permitido' });

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
      return jsonResp(resp.status, { error: `Error al conectar con SAP IBP (${resp.status})` });
    }

    const data = await resp.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (err) {
    console.error('[proxy-next error]', err.message);
    return jsonResp(500, { error: 'Error interno del servidor' });
  }
};
