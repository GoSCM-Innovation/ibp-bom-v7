const {
  validateProxyUrl, validateService, validateEntityPath, validateQuery,
  PREFIX_MAP, ODATA_PREFIX_IBP, FETCH_TIMEOUT_MS, httpsAgent, fetch, jsonResp
} = require('./_shared/helpers');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { base, service, path: entityPath, query, user, password, prefix } = body;

  if (!base || !service || !entityPath || !user || !password)
    return jsonResp(400, { error: 'Faltan parámetros requeridos' });

  const baseError  = validateProxyUrl(base + '/');
  const svcError   = validateService(service);
  const pathError  = validateEntityPath(entityPath);
  const queryError = validateQuery(query);

  if (baseError)  return jsonResp(400, { error: baseError });
  if (svcError)   return jsonResp(400, { error: svcError });
  if (pathError)  return jsonResp(400, { error: pathError });
  if (queryError) return jsonResp(400, { error: queryError });

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
      return jsonResp(resp.status, { error: `Error al conectar con SAP IBP (${resp.status})` });
    }

    const data = await resp.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (err) {
    console.error('[proxy error]', err.message);
    return jsonResp(500, { error: 'Error interno del servidor' });
  }
};
