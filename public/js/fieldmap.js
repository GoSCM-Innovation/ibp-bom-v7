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

// checks: [{ role, entityName, required, fields }]
//   role      — etiqueta legible para el panel (opcional)
//   entityName — nombre del EntitySet; null/'' si no fue detectada
//   required  — false → no reportar entity_missing (default: true)
//   fields    — campos canónicos esperados
//
// Tipos de issue devueltos:
//   entity_missing      — entityName vacío y required != false
//   entity_not_in_schema — entityName dado pero ausente en $metadata
//   field_missing       — campo canónico no existe en el schema
function validateEntityFields(checks) {
  var issues = [];
  checks.forEach(function (chk) {

    // Caso 1: entidad no detectada / no seleccionada
    if (!chk.entityName) {
      if (chk.required !== false) {
        issues.push({
          type:       'entity_missing',
          role:       chk.role || '(sin rol)',
          entityName: null,
          field:      null,
          suggestion: null,
          allFields:  []
        });
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

    // Caso 3: campo canónico ausente del schema
    var emap = FIELD_MAP[chk.entityName] || {};
    chk.fields.forEach(function (f) {
      if (f in emap) return;
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
  return issues;
}

/* ── Panel de corrección ── */

var _fmPendingIssues   = [];
var _fmPanelCallback   = null; // resolve() de la Promise
var _fmPanelSelections = {};   // { entityName_field: 'actualName' | '__null__' }

// Muestra el panel de corrección y retorna una Promise que resuelve cuando
// el usuario confirma. Si no hay issues, resuelve inmediatamente.
function fmShowCorrectionPanel(issues, containerId) {
  if (!issues.length) return Promise.resolve();
  return new Promise(function (resolve) {
    _fmPendingIssues   = issues;
    _fmPanelCallback   = resolve;
    _fmPanelSelections = {};

    // Inicializar selecciones con sugerencias (solo para field_missing)
    issues.forEach(function (iss) {
      if (iss.type !== 'field_missing') return;
      var key = iss.entityName + '||' + iss.field;
      _fmPanelSelections[key] = iss.suggestion ? iss.suggestion : '__null__';
    });

    var container = document.getElementById(containerId);
    if (!container) { resolve(); return; }

    container.innerHTML = _fmRenderPanel(issues);
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function _fmRenderPanel(issues) {
  var entityIssues = issues.filter(function(i) { return i.type !== 'field_missing'; });
  var fieldIssues  = issues.filter(function(i) { return i.type === 'field_missing'; });

  // Agrupar issues de campo por entidad
  var byEntity = {};
  fieldIssues.forEach(function (iss) {
    if (!byEntity[iss.entityName]) byEntity[iss.entityName] = [];
    byEntity[iss.entityName].push(iss);
  });

  var total = issues.length;
  var html = '<div class="fm-panel">';
  html += '<div class="fm-panel-header">';
  html += '<span class="fm-panel-icon">&#9888;</span>';
  html += '<div>';
  html += '<div class="fm-panel-title">Corrección requerida</div>';
  html += '<div class="fm-panel-subtitle">Se encontraron ' + total + ' problema' + (total !== 1 ? 's' : '') +
          ' de compatibilidad con el schema de este sistema SAP IBP. ' +
          'Confirma cómo debe tratarlos la aplicación antes de continuar.</div>';
  html += '</div></div>';

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
  html += '<button class="btn btn-primary" onclick="fmConfirmCorrections()">Aplicar y continuar</button>';
  html += '</div></div>';
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
    html += '<div class="fm-entity-warning">La auto-detección no encontró ninguna entidad para este rol. ' +
            'Puedes seleccionarla manualmente en el panel de configuración. ' +
            'Si no existe en tu sistema, la funcionalidad relacionada quedará sin datos.</div>';
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
  html += '<input type="radio" name="fm_' + key + '" value="__null__"' + noExistsChecked +
          ' onchange="fmSetSelection(\'' + key + '\',\'__null__\')">';
  html += '<span>No existe en mi sistema &mdash; la app funcionará sin esta información</span>';
  html += '</label>';

  // Radio: existe con otro nombre
  var mapChecked = (currentSel !== '__null__') ? ' checked' : '';
  html += '<label class="fm-radio-label">';
  html += '<input type="radio" name="fm_' + key + '" value="__map__"' + mapChecked +
          ' onchange="fmSetSelection(\'' + key + '\',\'__map__\')">';
  html += '<span>Existe con otro nombre:</span>';
  html += '</label>';

  // Dropdown de campos del schema
  html += '<div class="fm-dropdown-wrap" id="fmDrop_' + key + '" style="' +
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

function fmSetSelection(key, value) {
  if (value === '__null__') {
    _fmPanelSelections[key] = '__null__';
  } else {
    // Activar modo map; si ya tenía un valor de campo lo mantiene
    if (_fmPanelSelections[key] === '__null__') {
      _fmPanelSelections[key] = '__map__';
    }
  }
  // Toggle opacidad del dropdown
  var drop = document.getElementById('fmDrop_' + key);
  if (drop) {
    drop.style.opacity    = (value === '__null__') ? '0.4' : '1';
    drop.style.pointerEvents = (value === '__null__') ? 'none' : '';
  }
}

function fmSetFieldValue(key, value) {
  _fmPanelSelections[key] = value || '__null__';
}

function fmConfirmCorrections() {
  // Solo los issues de tipo field_missing escriben a FIELD_MAP.
  // entity_missing / entity_not_in_schema son informativos: solo se confirman.
  _fmPendingIssues.forEach(function (iss) {
    if (iss.type !== 'field_missing') return;
    var key = iss.entityName + '||' + iss.field;
    var sel = _fmPanelSelections[key];
    if (!FIELD_MAP[iss.entityName]) FIELD_MAP[iss.entityName] = {};
    if (sel === '__null__' || !sel || sel === '__map__') {
      FIELD_MAP[iss.entityName][iss.field] = null;
    } else {
      FIELD_MAP[iss.entityName][iss.field] = sel;
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
