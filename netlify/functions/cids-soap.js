const {
  validateHciUrl, xe, xmlVal, xmlAll, parseSoapFault, buildCidsEnvelope, cidsRawSoap, jsonResp
} = require('./_shared/helpers');

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
        name: xmlVal(p, 'name'), guid: xmlVal(p, 'guid'), description: xmlVal(p, 'description')
      }));
    case 'getProjectTasks':
      return xmlAll(xml, 'tasks').map(t => ({
        taskName: xmlVal(t, 'taskName'), taskGuid: xmlVal(t, 'taskGuid'), type: xmlVal(t, 'type')
      }));
    default: return { raw: xml };
  }
}

const SOAP_ACTIONS = {
  getProjects: 'function=getAllProjects',
  getProjectTasks: 'function=getAllProjectTasks',
  logout: 'function=logoff'
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResp(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { error: 'Body inválido' }); }

  const { hciUrl, sessionId, operation, params = {} } = body || {};

  if (!hciUrl)    return jsonResp(400, { error: 'hciUrl requerido' });
  if (!sessionId) return jsonResp(400, { error: 'sessionId requerido' });
  if (!operation) return jsonResp(400, { error: 'operation requerida' });
  if (!CIDS_ALLOWED_OPS.has(operation)) return jsonResp(400, { error: 'Operación no permitida' });

  const hciError = validateHciUrl(hciUrl);
  if (hciError) return jsonResp(400, { error: hciError });

  try {
    const soapBody = buildCidsBody(operation, { ...params, sessionId });
    const envelope = buildCidsEnvelope(soapBody, sessionId);
    const { ok, status, text } = await cidsRawSoap(hciUrl, SOAP_ACTIONS[operation] || `function=${operation}`, envelope);

    if (!ok) {
      const fault = parseSoapFault(text);
      if (/session/i.test(fault?.faultCode || '') || /session/i.test(fault?.faultString || ''))
        return jsonResp(401, { error: 'SESSION_EXPIRED' });
      console.error('[cids-soap] fault', status, fault?.faultCode || '', fault?.faultString || '');
      return jsonResp(status >= 400 && status < 600 ? status : 502, { error: `Error en CI-DS (HTTP ${status})` });
    }

    return jsonResp(200, parseCidsResponse(operation, text));
  } catch (e) {
    console.error('[cids-soap]', e.message);
    return jsonResp(500, { error: 'Error interno del servidor' });
  }
};
