/* runSummary.js — helper compartido para enriquecer la hoja Resumen en ambos Analyzers.
   Añade bloques de metadata DEBAJO de la tabla de estadísticas existente.
   Compatible con StreamingXlsx (_Sheet) y makeSheet wrapper (usa ws directamente).
   Fills disponibles en filas de datos: FFE5E7EB (gris), FFFFCCCC (rojo), FFFFFFCC (amarillo). */

function buildResumenMeta(ws, opts) {
  /* opts:
     analyzer     — string nombre del analizador
     generatedAt  — Date
     fileName     — string nombre del archivo descargado
     cfg          — CFG global { url, pa, pver }
     paFilter     — string filtro OData aplicado
     entities     — [{ name, entityName, downloaded, note }]
     mattypeCfg   — referencia a MATTYPE_CFG global
     kpis         — [{ label, value }]
  */
  var NA_FILL = 'FFE5E7EB';

  function secRow(label) {
    var r = ws.addRow([label]);
    r.eachCell(function(cell) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NA_FILL } };
    });
  }

  function kvRow(label, value) {
    ws.addRow([label, value != null ? String(value) : '—']);
  }

  ws.addRow([]);

  /* ── Bloque 1: Informacion de la ejecucion ── */
  secRow('INFORMACION DE LA EJECUCION');
  var dt = opts.generatedAt || new Date();
  kvRow('Generado el', dt.toLocaleString('es-CL'));
  kvRow('Analizador', opts.analyzer || '—');
  kvRow('Archivo Excel', opts.fileName || '—');

  /* ── Bloque 2: Conexion SAP IBP ── */
  ws.addRow([]);
  secRow('CONEXION SAP IBP');
  var cfg = opts.cfg || {};
  kvRow('API Base URL', cfg.url || '—');
  kvRow('Planning Area ID', cfg.pa || '—');
  kvRow('Version', cfg.pver || '(Baseline)');
  kvRow('Filtro OData aplicado', opts.paFilter || '(sin filtro de PA/Version)');

  /* ── Bloque 3: Entidades OData utilizadas ── */
  ws.addRow([]);
  var ents = opts.entities || [];
  secRow('ENTIDADES ODATA UTILIZADAS (' + ents.length + ')');
  if (ents.length === 0) {
    kvRow('(sin entidades registradas)', '');
  } else {
    ents.forEach(function(e) {
      var detail = (e.downloaded != null ? e.downloaded.toLocaleString('es-CL') + ' registros descargados' : 'n/a');
      if (e.note) detail += ' — ' + e.note;
      kvRow(e.name, detail);
    });
  }

  /* ── Bloque 4: Tipos de material ── */
  var mc = opts.mattypeCfg || {};
  var mtKeys = Object.keys(mc).sort();
  if (mtKeys.length) {
    ws.addRow([]);
    var incl = mtKeys.filter(function(k) { return !mc[k].excluded; });
    var excl = mtKeys.filter(function(k) { return mc[k].excluded; });
    var catted = incl.filter(function(k) { return mc[k].categories && mc[k].categories.size > 0; });
    secRow('TIPOS DE MATERIAL — ' + mtKeys.length + ' detectados | ' + incl.length + ' incluidos | ' + excl.length + ' excluidos | ' + catted.length + ' categorizados');

    if (incl.length) {
      ws.addRow(['Tipos incluidos en el analisis', 'Productos', 'Categorias asignadas']);
      incl.forEach(function(mt) {
        var cfg = mc[mt];
        var cats = (cfg.categories && cfg.categories.size > 0)
          ? Array.from(cfg.categories).map(function(c) {
              var found = (typeof MATTYPE_CATS !== 'undefined' ? MATTYPE_CATS : []).filter(function(x) { return x.id === c; });
              return found.length ? found[0].label : c;
            }).join(', ')
          : 'Sin categoria — reglas permisivas (' + '⚠' + ')';
        ws.addRow([mt, (cfg.count || 0) + ' prods', cats]);
      });
    }

    if (excl.length) {
      ws.addRow([]);
      ws.addRow(['Tipos excluidos del analisis principal', 'Productos omitidos', '']);
      excl.forEach(function(mt) {
        var cfg = mc[mt];
        ws.addRow([mt, (cfg.count || 0) + ' prods', '']);
      });
    }
  }

  /* ── Bloque 5: Metricas globales ── */
  var kpis = opts.kpis || [];
  if (kpis.length) {
    ws.addRow([]);
    secRow('METRICAS GLOBALES DE LA EJECUCION');
    kpis.forEach(function(kpi) {
      kvRow(kpi.label, kpi.value);
    });
  }
}
