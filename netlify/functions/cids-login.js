const {
  validateHciUrl, xe, xmlVal, parseSoapFault, buildCidsEnvelope, cidsRawSoap, jsonResp
} = require('./_shared/helpers');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { hciUrl, orgName, user, password, isProduction } = body || {};

  if (!hciUrl || !orgName || !user || !password)
    return jsonResp(400, { error: 'hciUrl, orgName, user y password son requeridos' });

  const hciError = validateHciUrl(hciUrl);
  if (hciError) return jsonResp(400, { error: hciError });

  const loginBody = `<web:logonRequest><orgName>${xe(orgName)}</orgName><userName>${xe(user)}</userName><password>${xe(password)}</password><isProduction>${isProduction ? 'true' : 'false'}</isProduction></web:logonRequest>`;

  try {
    const { ok, status, text } = await cidsRawSoap(hciUrl, 'function=logon', buildCidsEnvelope(loginBody, null));
    if (!ok) {
      const fault = parseSoapFault(text);
      console.error('[cids-login] auth failed', status, fault?.faultString || '');
      return jsonResp(401, { error: `Error de autenticación (HTTP ${status})` });
    }
    const sessionId = xmlVal(text, 'SessionID') || xmlVal(text, 'sessionID');
    if (!sessionId) return jsonResp(401, { error: 'La respuesta no devolvió SessionID' });
    return jsonResp(200, { sessionId });
  } catch (e) {
    console.error('[cids-login]', e.message);
    return jsonResp(500, { error: 'Error interno del servidor' });
  }
};
