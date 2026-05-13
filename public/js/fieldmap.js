/* ═══════════════════════════════════════════════════════════════
   FIELD MAP — Corrección de campos entre schema IBP y app
   ═══════════════════════════════════════════════════════════════
   Tres casos:
     A) Campo renombrado  : CLEADTIME → LEADTIME  (string)
     B) Campo ausente     : ISALTITEM → null       (null)
     C) Entidad incompatible: múltiples campos ausentes, sin equivalente

   Flujo:
     1. Al hacer fetch, validateEntityFields() detecta issues pre-llamada
     2. Si hay issues sin resolver, renderCorrectionPanel() los muestra
     3. Usuario mapea o descarta → fmSave() persiste en localStorage
     4. buildSelect() construye el $select con nombres reales
     5. normalizeRows() añade alias canónicos en cada fila de respuesta
*/

/* ── Estado global ── */
var FIELD_MAP = {};
// { entityName: { canonicalField: 'actualField' | null } }
// null  = campo no existe, omitir del $select

/* ── Descripciones legibles para el panel de corrección ── */
var FIELD_DESCRIPTIONS = {
  CLEADTIME:         'Lead time de entrega al cliente en días. Detecta arcos sin lead time hacia clientes.',
  ISALTITEM:         'Indica si el componente PSI es material de reemplazo alternativo (X = sustituto).',
  PRDFR:             'Producto componente origen en la tabla de sustituciones de componentes.',
  SPRDFR:            'Producto sustituto que reemplaza al componente PRDFR.',
  TLEADTIME:         'Lead time de transferencia entre ubicaciones en días.',
  TINVALID:          'Flag de invalidez del arco de transferencia (X = registro inactivo).',
  CINVALID:          'Flag de invalidez del arco de entrega a cliente (X = registro inactivo).',
  PINVALID:          'Flag de invalidez de la receta de producción (X = registro inactivo).',
  LOCVALID:          'Flag de invalidez de la ubicación maestra (X = ubicación inactiva).',
  CUSTVALID:         'Flag de invalidez del cliente maestro (X = cliente inactivo).',
  PRATIO:            'Cuota de producción asignada a esta fuente cuando hay múltiples recetas para PRDID+LOCID.',
  OUTPUTCOEFFICIENT: 'Unidades de producto terminado generadas por corrida de producción.',
  SOURCETYPE:        'Tipo de fuente (P = producción primaria, C = co-producto / subproducto).',
  COMPONENTCOEFFICIENT: 'Unidades del componente consumidas por unidad de producto terminado.',
  PLEADTIME:         'Lead time de producción en días.',
  UOMID:             'Código de unidad de medida del producto.',
  UOMDESCR:          'Descripción de la unidad de medida.',
  LOCDESCR:          'Descripción de la ubicación maestra.',
  LOCTYPE:           'Tipo de ubicación (código SAP, ej: 1010 = planta).',
  CUSTDESCR:         'Descripción del cliente maestra.',
  PRDDESCR:          'Descripción del producto maestra.',
  MATTYPEID:         'Tipo de material SAP. Determina categorías de planificación.',
  RESDESCR:          'Descripción del recurso productivo.',
};

/* ── Persistencia ── */
function fmLsKey() {
  var pa = (typeof CFG !== 'undefined' && CFG && CFG.pa) ? CFG.pa : 'default';
  return 'fieldmap_' + pa;
}

function fmLoad() {
  try {
    var raw = localStorage.getItem(fmLsKey());
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') FIELD_MAP = parsed;
    }
  } catch (e) {}
}

function fmSave() {
  try { localStorage.setItem(fmLsKey(), JSON.stringify(FIELD_MAP)); } catch (e) {}
}

/* ── Core helpers ── */

// Devuelve el nombre real del campo en la entidad (o el canónico si no hay mapeo)
function fm(entityName, canonicalField) {
  var emap = FIELD_MAP[entityName];
  if (!emap || !(canonicalField in emap)) return canonicalField;
  return emap[canonicalField]; // puede ser null
}

// Construye el string $select aplicando mapeos; omite campos mapeados a null
function buildSelect(entityName, canonicalFields) {
  return canonicalFields.map(function (f) {
    return fm(entityName, f);
  }).filter(function (f) { return f !== null && f !== undefined && f !== ''; }).join(',');
}

// Agrega alias canónicos a cada fila para que el código downstream funcione sin cambios
// Ej: row.CLEADTIME = row.LEADTIME  cuando map={CLEADTIME:'LEADTIME'}
function normalizeRows(entityName, rows) {
  var emap = FIELD_MAP[entityName];
  if (!emap) return rows;
  var remaps = Object.keys(emap).filter(function (c) {
    return emap[c] && emap[c] !== c;
  });
  if (!remaps.length) return rows;
  return rows.map(function (r) {
    var out = Object.assign({}, r);
    remaps.forEach(function (canonical) {
      out[canonical] = r[emap[canonical]];
    });
    return out;
  });
}

/* ── Sugerencia automática de campo alternativo ── */
function suggestField(entityName, canonicalField) {
  var schema = _fmGetSchemaFields(entityName);
  if (!schema.length) return null;
  if (schema.indexOf(canonicalField) >= 0) return canonicalField;

  // Quitar prefijo de tipo (C, T, P, L) → CLEADTIME→LEADTIME, TLEADTIME→LEADTIME
  var stripped = canonicalField.replace(/^[CTPL](?=[A-Z][A-Z])/, '');
  if (stripped !== canonicalField && schema.indexOf(stripped) >= 0) return stripped;

  // Substring: schema field contiene el canónico o viceversa
  var lower = canonicalField.toLowerCase();
  var found = schema.find(function (f) {
    var fl = f.toLowerCase();
    return fl.indexOf(lower) >= 0 || lower.indexOf(fl) >= 0;
  });
  return found || null;
}

function _fmGetSchemaFields(entityName) {
  if (typeof ENTITIES === 'undefined') return [];
  // ENTITIES stores EntityType names (e.g. LSVPRODUCTIONSOURCEHDR)
  // but callers pass EntitySet names (e.g. LSVPRODUCTIONSOURCEHDRSet).
  // Try exact match first, then strip trailing "Set".
  var ent = ENTITIES.find(function (e) { return e.name === entityName; });
  if (!ent) {
    var stripped = entityName.replace(/Set$/i, '');
    ent = ENTITIES.find(function (e) { return e.name === stripped; });
  }
  return ent ? ent.fields : [];
}

/* ── Validación pre-fetch ── */

// checks: [{ role, entityName, required, selectorId, fields }]
//   role       — etiqueta legible para el panel
//   entityName — nombre del EntitySet; null/'' si no fue detectada
//   required   — false → no reportar entity_missing (default: true)
//   selectorId — ID del input hidden del selector MDT (para entity_missing)
//   fields     — campos canónicos esperados
//
// Retorna { issues, applied }
//   issues  — problemas nuevos: entity_missing, entity_not_in_schema, field_missing
//   applied — correcciones ya guardadas en FIELD_MAP que se están aplicando
//             [{ role, entityName, field, mappedTo }]
function validateEntityFields(checks) {
  var issues  = [];
  var applied = [];
  checks.forEach(function (chk) {

    // Caso 1: entidad no detectada / no seleccionada
    if (!chk.entityName) {
      if (chk.required !== false) {
        var role = chk.role || '(sin rol)';
        var absentMap = FIELD_MAP['__absent_entities__'] || {};
        if (role in absentMap) {
          // Usuario ya confirmó que no existe — mostrar como corrección activa
          applied.push({ type: 'entity_absent', role: role, entityName: null });
        } else {
          issues.push({
            type:       'entity_missing',
            role:       role,
            entityName: null,
            field:      null,
            suggestion: null,
            allFields:  [],
            selectorId: chk.selectorId || null
          });
        }
      }
      return;
    }

    var schema = _fmGetSchemaFields(chk.entityName);

    // Caso 2: nombre de entidad configurado pero ausente en $metadata
    if (!schema.length) {
      issues.push({
        type:       'entity_not_in_schema',
        role:       chk.role || chk.entityName,
        entityName: chk.entityName,
        field:      null,
        suggestion: null,
        allFields:  []
      });
      return;
    }

    // Caso 3: campo canónico — nuevo o ya corregido
    var emap = FIELD_MAP[chk.entityName] || {};
    chk.fields.forEach(function (f) {
      if (f in emap) {
        // Corrección guardada — registrar como aplicada para mostrar al usuario
        applied.push({
          role:       chk.role || chk.entityName,
          entityName: chk.entityName,
          field:      f,
          mappedTo:   emap[f]   // null = no existe, string = nombre real
        });
        return;
      }
      if (schema.indexOf(f) >= 0) return;
      issues.push({
        type:       'field_missing',
        role:       chk.role || chk.entityName,
        entityName: chk.entityName,
        field:      f,
        suggestion: suggestField(chk.entityName, f),
        allFields:  schema
      });
    });
  });
  return { issues: issues, applied: applied };
}

/* ── Panel de corrección ── */

var _fmPendingIssues   = [];
var _fmPanelCallback   = null; // resolve() de la Promise
var _fmPanelSelections = {};   // { entityName_field: 'actualName' | '__null__' }
var _fmPanelChecks      = [];  // checks originales para re-validar al limpiar
var _fmPanelContainerId = '';  // contenedor activo

// Muestra el panel de corrección y retorna una Promise que resuelve cuando
// el usuario confirma. Si no hay issues ni applied, resuelve inmediatamente.
// applied: lista de correcciones ya guardadas que se están aplicando (solo info).
// checks:  array original pasado a validateEntityFields (necesario para re-validar al limpiar).
function fmShowCorrectionPanel(issues, applied, containerId, checks) {
  applied = applied || [];
  if (!issues.length && !applied.length) return Promise.resolve();
  return new Promise(function (resolve) {
    _fmPendingIssues    = issues;
    _fmPanelCallback    = resolve;
    _fmPanelSelections  = {};
    _fmPanelChecks      = checks || [];
    _fmPanelContainerId = containerId;

    // Inicializar selecciones por tipo de issue
    issues.forEach(function (iss) {
      if (iss.type === 'field_missing') {
        var key = iss.entityName + '||' + iss.field;
        _fmPanelSelections[key] = iss.suggestion ? iss.suggestion : '__null__';
      } else if (iss.type === 'entity_missing') {
        _fmPanelSelections['entity||' + iss.role] = '__null__';
      }
    });

    var container = document.getElementById(containerId);
    if (!container) { resolve(); return; }

    container.innerHTML = _fmRenderPanel(issues, applied, true);
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// Muestra el panel en el paso de mapeo de entidades (no bloqueante, sin Promise).
// issues:  problemas nuevos detectados al conectar.
// applied: correcciones ya guardadas que se están aplicando.
// Si no hay nada que mostrar, no hace nada.
function fmShowCorrectionStep1(issues, applied, containerId, checks) {
  issues  = issues  || [];
  applied = applied || [];
  if (!issues.length && !applied.length) return;
  var container = document.getElementById(containerId);
  if (!container) return;

  _fmPendingIssues    = issues;
  _fmPanelCallback    = null;   // sin Promise — fmConfirmCorrections solo guarda y oculta
  _fmPanelSelections  = {};
  _fmPanelChecks      = checks || [];
  _fmPanelContainerId = containerId;

  issues.forEach(function (iss) {
    if (iss.type === 'field_missing') {
      var key = iss.entityName + '||' + iss.field;
      _fmPanelSelections[key] = iss.suggestion ? iss.suggestion : '__null__';
    } else if (iss.type === 'entity_missing') {
      _fmPanelSelections['entity||' + iss.role] = '__null__';
    }
  });

  container.innerHTML = _fmRenderPanel(issues, applied, false);
  container.style.display = 'block';
}

// isBlocking=true  (fetch time):  "Aplicar y continuar" / "Continuar" + "Limpiar"
// isBlocking=false (step 1):      "Guardar correcciones" (si hay issues) + "Limpiar"
function _fmRenderPanel(issues, applied, isBlocking) {
  applied = applied || [];
  var hasIssues = issues.length > 0;

  var entityIssues = issues.filter(function(i) { return i.type !== 'field_missing'; });
  var fieldIssues  = issues.filter(function(i) { return i.type === 'field_missing'; });

  // Agrupar issues de campo por entidad
  var byEntity = {};
  fieldIssues.forEach(function (iss) {
    if (!byEntity[iss.entityName]) byEntity[iss.entityName] = [];
    byEntity[iss.entityName].push(iss);
  });

  // Agrupar applied por entidad (field_correction) o rol (entity_absent)
  var byEntityApplied = {};
  applied.forEach(function (a) {
    var key = (a.type === 'entity_absent') ? ('__absent__||' + a.role) : (a.entityName + '||' + a.role);
    if (!byEntityApplied[key]) {
      byEntityApplied[key] = { role: a.role, entityName: a.entityName, isAbsent: a.type === 'entity_absent', fields: [] };
    }
    if (a.type !== 'entity_absent') byEntityApplied[key].fields.push(a);
  });

  var html = '<div class="fm-panel">';
  html += '<div class="fm-panel-header">';
  html += '<span class="fm-panel-icon">' + (hasIssues ? '&#9888;' : '&#9432;') + '</span>';
  html += '<div>';
  if (hasIssues) {
    var total = issues.length;
    html += '<div class="fm-panel-title">Corrección requerida</div>';
    html += '<div class="fm-panel-subtitle">Se encontraron ' + total + ' problema' + (total !== 1 ? 's' : '') +
            ' de compatibilidad con el schema de este sistema SAP IBP. ' +
            'Confirma cómo debe tratarlos la aplicación antes de continuar.</div>';
  } else {
    html += '<div class="fm-panel-title">Correcciones activas</div>';
    html += '<div class="fm-panel-subtitle">La aplicación está usando las siguientes correcciones guardadas ' +
            'para adaptar los campos a tu sistema SAP IBP.</div>';
  }
  html += '</div></div>';

  // Sección: correcciones ya guardadas (siempre visible si existen)
  if (Object.keys(byEntityApplied).length) {
    html += '<div class="fm-section-label fm-section-label--applied">Correcciones activas</div>';
    Object.keys(byEntityApplied).forEach(function(key) {
      html += _fmRenderAppliedCard(byEntityApplied[key]);
    });
  }

  // Sección: problemas nuevos que requieren acción
  if (entityIssues.length) {
    html += '<div class="fm-section-label">Entidades</div>';
    entityIssues.forEach(function(iss) { html += _fmRenderEntityIssueCard(iss); });
  }

  if (Object.keys(byEntity).length) {
    html += '<div class="fm-section-label">Campos ausentes</div>';
    Object.keys(byEntity).forEach(function(entityName) {
      html += _fmRenderEntityCard(entityName, byEntity[entityName]);
    });
  }

  html += '<div class="fm-panel-actions">';
  if (isBlocking) {
    if (hasIssues) {
      html += '<button class="btn btn-primary" onclick="fmConfirmCorrections()">Aplicar y continuar</button>';
    } else {
      html += '<button class="btn btn-primary" onclick="fmConfirmCorrections()">Continuar</button>';
    }
    html += '<button class="btn btn-secondary" style="margin-left:8px" onclick="fmClearCorrections()">Limpiar correcciones guardadas</button>';
  } else {
    if (hasIssues) {
      html += '<button class="btn btn-primary" onclick="fmConfirmCorrections()">Guardar correcciones</button>';
      html += '<button class="btn btn-secondary" style="margin-left:8px" onclick="fmClearCorrections()">Limpiar correcciones guardadas</button>';
    } else {
      html += '<button class="btn btn-secondary" onclick="fmClearCorrections()">Limpiar correcciones guardadas</button>';
    }
  }
  html += '</div></div>';
  return html;
}

// Delegado: muestra solo correcciones activas (sin issues) en modo no bloqueante.
function fmShowCorrectionInfo(applied, containerId) {
  fmShowCorrectionStep1([], applied, containerId, []);
}

// Card de solo lectura para correcciones ya guardadas
function _fmRenderAppliedCard(group) {
  var html = '<div class="fm-entity-card fm-entity-card--applied">';
  html += '<div class="fm-entity-header">';
  html += '<span class="fm-entity-name">' + escH(group.role) + '</span>';

  if (group.isAbsent) {
    html += '<span class="fm-entity-badge fm-badge-applied">ausente confirmado</span>';
    html += '</div>';
    html += '<div class="fm-applied-list">';
    html += '<div class="fm-applied-row"><span class="fm-applied-null">No disponible en este sistema</span></div>';
    html += '</div>';
  } else {
    var count = group.fields.length;
    var label = count + ' corrección' + (count !== 1 ? 'es' : '') + ' activa' + (count !== 1 ? 's' : '');
    html += '<span class="fm-entity-badge fm-badge-applied">' + escH(label) + '</span>';
    html += '</div>';
    if (group.entityName && group.role !== group.entityName) {
      html += '<div class="fm-entity-techname">' + escH(group.entityName) + '</div>';
    }
    html += '<div class="fm-applied-list">';
    group.fields.forEach(function (a) {
      html += '<div class="fm-applied-row">';
      html += '<span class="fm-field-tag">' + escH(a.field) + '</span>';
      html += '<span class="fm-applied-arrow">&#8594;</span>';
      if (a.mappedTo === null) {
        html += '<span class="fm-applied-value fm-applied-null">no existe en este sistema (omitido)</span>';
      } else {
        html += '<span class="fm-applied-value">' + escH(a.mappedTo) + '</span>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

// Card para entity_missing / entity_not_in_schema
function _fmRenderEntityIssueCard(iss) {
  var html = '<div class="fm-entity-card fm-entity-card--alert">';
  html += '<div class="fm-entity-header">';
  html += '<span class="fm-entity-name">' + escH(iss.role) + '</span>';
  if (iss.type === 'entity_missing') {
    html += '<span class="fm-entity-badge fm-badge-alert">No detectada</span>';
  } else {
    html += '<span class="fm-entity-badge fm-badge-alert">Fuera de schema</span>';
  }
  html += '</div>';
  if (iss.entityName) {
    html += '<div class="fm-entity-techname">' + escH(iss.entityName) + '</div>';
  }

  if (iss.type === 'entity_missing') {
    var key = 'entity||' + iss.role;
    var keyAttr = escH(key);
    var cid     = escH(_fmPanelContainerId);
    var dropId  = 'fmEntDrop_' + cid.replace(/[^a-zA-Z0-9]/g, '_') + '_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    var currentSel = _fmPanelSelections[key] || '__null__';
    var isNull = currentSel === '__null__';

    html += '<div class="fm-entity-warning" style="margin-bottom:8px">' +
            'La auto-detección no encontró ninguna entidad para este rol. ' +
            'Indica si existe en tu sistema IBP o confirma que no está disponible.</div>';

    html += '<label class="fm-radio-label">';
    html += '<input type="radio" name="fmEnt_' + cid + '_' + keyAttr + '" value="__null__"' +
            (isNull ? ' checked' : '') +
            ' onchange="fmSetEntitySelection(\'' + keyAttr + '\',\'__null__\',\'' + cid + '\')">';
    html += '<span>No existe en este sistema &mdash; omitir esta funcionalidad</span>';
    html += '</label>';

    html += '<label class="fm-radio-label">';
    html += '<input type="radio" name="fmEnt_' + cid + '_' + keyAttr + '" value="__exists__"' +
            (!isNull ? ' checked' : '') +
            ' onchange="fmSetEntitySelection(\'' + keyAttr + '\',\'__exists__\',\'' + cid + '\')">';
    html += '<span>Sí existe &mdash; seleccionar entidad:</span>';
    html += '</label>';

    var entityList = (typeof ENTITIES !== 'undefined')
      ? ENTITIES.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; })
      : [];
    html += '<div class="fm-dropdown-wrap" id="' + escH(dropId) + '" style="' +
            (isNull ? 'opacity:0.4;pointer-events:none' : '') + '">';
    html += '<select class="fm-select" onchange="fmSetEntityValue(\'' + keyAttr + '\',this.value)">';
    html += '<option value="">(selecciona entidad)</option>';
    entityList.forEach(function (e) {
      var setName = e.name + 'Set';
      var sel = (currentSel === setName) ? ' selected' : '';
      html += '<option value="' + escH(setName) + '"' + sel + '>' + escH(setName) + '</option>';
    });
    html += '</select></div>';

  } else {
    html += '<div class="fm-entity-warning">Esta entidad no aparece en el <code>$metadata</code> del sistema. ' +
            'Es posible que el nombre sea incorrecto. Verifica en el panel de configuración.</div>';
  }

  html += '</div>';
  return html;
}

// Card para field_missing (agrupados por entidad)
function _fmRenderEntityCard(entityName, issues) {
  var label = issues.length + ' campo' + (issues.length !== 1 ? 's' : '');
  var role = (issues[0] && issues[0].role && issues[0].role !== entityName) ? issues[0].role : null;

  var html = '<div class="fm-entity-card">';
  html += '<div class="fm-entity-header">';
  html += '<span class="fm-entity-name">' + escH(role || entityName) + '</span>';
  html += '<span class="fm-entity-badge">' + escH(label) + '</span>';
  html += '</div>';
  if (role) {
    html += '<div class="fm-entity-techname">' + escH(entityName) + '</div>';
  }

  var noSuggestions = issues.every(function(i) { return !i.suggestion; });
  if (issues.length > 1 && noSuggestions) {
    html += '<div class="fm-entity-warning">La app espera: ' +
      escH(issues.map(function (i) { return i.field; }).join(', ')) +
      '. Ninguno se encontró en el schema. Esta entidad puede tener un rol diferente en tu sistema.</div>';
  }

  issues.forEach(function (iss) { html += _fmRenderFieldRow(iss); });
  html += '</div>';
  return html;
}

function _fmRenderFieldRow(iss) {
  var key = escH(iss.entityName + '||' + iss.field);
  var cid = escH(_fmPanelContainerId);
  var dropId = 'fmDrop_' + cid + '_' + key;
  var currentSel = _fmPanelSelections[iss.entityName + '||' + iss.field] || '__null__';
  var desc = FIELD_DESCRIPTIONS[iss.field] || '';

  var html = '<div class="fm-field-row">';
  html += '<div class="fm-field-header">';
  html += '<span class="fm-field-tag">' + escH(iss.field) + '</span>';
  if (desc) html += '<span class="fm-field-desc">' + escH(desc) + '</span>';
  html += '</div>';

  // Radio: no existe
  var noExistsChecked = (currentSel === '__null__') ? ' checked' : '';
  html += '<label class="fm-radio-label">';
  html += '<input type="radio" name="fm_' + cid + '_' + key + '" value="__null__"' + noExistsChecked +
          ' onchange="fmSetSelection(\'' + key + '\',\'__null__\',\'' + cid + '\')">';
  html += '<span>No existe en mi sistema &mdash; la app funcionará sin esta información</span>';
  html += '</label>';

  // Radio: existe con otro nombre
  var mapChecked = (currentSel !== '__null__') ? ' checked' : '';
  html += '<label class="fm-radio-label">';
  html += '<input type="radio" name="fm_' + cid + '_' + key + '" value="__map__"' + mapChecked +
          ' onchange="fmSetSelection(\'' + key + '\',\'__map__\',\'' + cid + '\')">';
  html += '<span>Existe con otro nombre:</span>';
  html += '</label>';

  // Dropdown de campos del schema
  html += '<div class="fm-dropdown-wrap" id="' + escH(dropId) + '" style="' +
          (currentSel !== '__null__' ? '' : 'opacity:0.4;pointer-events:none') + '">';
  html += '<select class="fm-select" onchange="fmSetFieldValue(\'' + key + '\',this.value)">';
  html += '<option value="">(selecciona campo)</option>';
  iss.allFields.forEach(function (f) {
    var sel = (currentSel === f) ? ' selected' : '';
    html += '<option value="' + escH(f) + '"' + sel + '>' + escH(f) + '</option>';
  });
  html += '</select></div>';
  html += '</div>';
  return html;
}

/* ── Handlers del panel (llamados desde HTML inline) ── */

function fmSetEntitySelection(key, value, containerId) {
  _fmPanelSelections[key] = value; // '__null__' o '__exists__'
  var cidSafe = (containerId || '').replace(/[^a-zA-Z0-9]/g, '_');
  var dropId = 'fmEntDrop_' + cidSafe + '_' + key.replace(/[^a-zA-Z0-9]/g, '_');
  var drop = document.getElementById(dropId);
  if (drop) {
    drop.style.opacity      = (value === '__null__') ? '0.4' : '1';
    drop.style.pointerEvents = (value === '__null__') ? 'none' : '';
  }
}

function fmSetEntityValue(key, value) {
  _fmPanelSelections[key] = value || '__null__';
}

function fmUpdateSelector(selectorId, value) {
  var hiddenEl = document.getElementById(selectorId);
  var visEl    = document.getElementById('ssVis-' + selectorId);
  if (hiddenEl) hiddenEl.value = value;
  if (visEl)    visEl.value    = value;
}

function fmSetSelection(key, value, containerId) {
  if (value === '__null__') {
    _fmPanelSelections[key] = '__null__';
  } else {
    // Activar modo map; si ya tenía un valor de campo lo mantiene
    if (_fmPanelSelections[key] === '__null__') {
      _fmPanelSelections[key] = '__map__';
    }
  }
  // Toggle opacidad del dropdown
  var drop = document.getElementById('fmDrop_' + (containerId || '') + '_' + key);
  if (drop) {
    drop.style.opacity    = (value === '__null__') ? '0.4' : '1';
    drop.style.pointerEvents = (value === '__null__') ? 'none' : '';
  }
}

function fmSetFieldValue(key, value) {
  _fmPanelSelections[key] = value || '__null__';
}

function fmConfirmCorrections() {
  _fmPendingIssues.forEach(function (iss) {
    if (iss.type === 'field_missing') {
      var key = iss.entityName + '||' + iss.field;
      var sel = _fmPanelSelections[key];
      if (!FIELD_MAP[iss.entityName]) FIELD_MAP[iss.entityName] = {};
      if (sel === '__null__' || !sel || sel === '__map__') {
        FIELD_MAP[iss.entityName][iss.field] = null;
      } else {
        FIELD_MAP[iss.entityName][iss.field] = sel;
      }
    } else if (iss.type === 'entity_missing') {
      var key = 'entity||' + iss.role;
      var sel = _fmPanelSelections[key];
      if (!sel || sel === '__null__') {
        // Usuario confirmó que la entidad no existe — persistir para no volver a preguntar
        if (!FIELD_MAP['__absent_entities__']) FIELD_MAP['__absent_entities__'] = {};
        FIELD_MAP['__absent_entities__'][iss.role] = true;
      } else if (sel !== '__exists__' && iss.selectorId) {
        // Usuario seleccionó una entidad del dropdown
        fmUpdateSelector(iss.selectorId, sel);
      }
    }
  });
  fmSave();

  // Ocultar panel
  var panels = document.querySelectorAll('.fm-correction-container');
  panels.forEach(function (p) { p.style.display = 'none'; p.innerHTML = ''; });

  if (_fmPanelCallback) {
    var cb = _fmPanelCallback;
    _fmPanelCallback   = null;
    _fmPendingIssues   = [];
    _fmPanelSelections = {};
    cb();
  }
}

function fmClearCorrections() {
  FIELD_MAP = {};
  fmSave();

  // Si hay contexto de panel activo, re-validar y re-renderizar en el mismo contenedor.
  // Aplica tanto al modo bloqueante (callback pendiente) como al modo step1 (sin callback).
  if (_fmPanelChecks.length && _fmPanelContainerId) {
    var result = validateEntityFields(_fmPanelChecks);
    _fmPendingIssues   = result.issues;
    _fmPanelSelections = {};
    result.issues.forEach(function (iss) {
      if (iss.type === 'field_missing') {
        var key = iss.entityName + '||' + iss.field;
        _fmPanelSelections[key] = iss.suggestion ? iss.suggestion : '__null__';
      } else if (iss.type === 'entity_missing') {
        _fmPanelSelections['entity||' + iss.role] = '__null__';
      }
    });
    var container = document.getElementById(_fmPanelContainerId);
    if (container) {
      container.innerHTML = _fmRenderPanel(result.issues, result.applied, !!_fmPanelCallback);
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
  }

  // Sin contexto de panel: solo ocultar
  var panels = document.querySelectorAll('.fm-correction-container');
  panels.forEach(function (p) { p.style.display = 'none'; p.innerHTML = ''; });
}

/* ── Parsing de errores SAP IBP ── */
// Extrae el nombre de campo de mensajes de error OData como:
//   "Property 'CLEADTIME' not found in type '...'"
//   "Unknown property name 'ISALTITEM'"
function fmParseFieldError(errorText) {
  if (!errorText) return null;
  var m = errorText.match(/[Pp]roperty\s+'([^']+)'/);
  if (m) return m[1];
  m = errorText.match(/[Uu]nknown property[^']*'([^']+)'/);
  if (m) return m[1];
  m = errorText.match(/[Ff]ield[^']*'([^']+)'\s+not found/);
  if (m) return m[1];
  return null;
}
