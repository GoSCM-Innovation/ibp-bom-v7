const {
  validateProxyUrl, validateService,
  PREFIX_MAP, ODATA_PREFIX_IBP, SOAP_TIMEOUT_MS, httpsAgent, fetch, jsonResp
} = require('./_shared/helpers');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { base, service, user, password, prefix } = body;

  if (!base || !service || !user || !password)
    return jsonResp(400, { error: 'Faltan parámetros requeridos' });

  const baseError = validateProxyUrl(base + '/');
  const svcError  = validateService(service);

  if (baseError) return jsonResp(400, { error: baseError });
  if (svcError)  return jsonResp(400, { error: svcError });

  const odataPrefix = PREFIX_MAP[prefix] || ODATA_PREFIX_IBP;
  const url = `${base}${odataPrefix}${service}/$metadata`;

  try {
    const auth = Buffer.from(`${user}:${password}`).toString('base64');
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/xml' },
      timeout: SOAP_TIMEOUT_MS,
      agent: httpsAgent,
      redirect: 'manual'
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[proxy-xml] SAP error', resp.status, text.substring(0, 200));
      return jsonResp(resp.status, { error: `Error al conectar con SAP IBP (${resp.status})` });
    }

    const text = await resp.text();
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: text };
  } catch (err) {
    console.error('[proxy-xml error]', err.message);
    return jsonResp(500, { error: 'Error interno del servidor' });
  }
};
