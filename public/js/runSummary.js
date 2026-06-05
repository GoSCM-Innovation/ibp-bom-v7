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
     entities     — [{ name, entityName, downloaded, retained, analyzed, note }]
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

  var _lang = (window.I18n && I18n.getLang && I18n.getLang() === 'en') ? 'en-US' : 'es-CL';
  var _prods = I18n.t('xls.resumen.prods');

  /* ── Bloque 1: Informacion de la ejecucion ── */
  secRow(I18n.t('xls.resumen.execInfo'));
  var dt = opts.generatedAt || new Date();
  kvRow(I18n.t('xls.resumen.generatedAt'), dt.toLocaleString(_lang));
  kvRow(I18n.t('xls.resumen.analyzer'), opts.analyzer || '—');
  kvRow(I18n.t('xls.resumen.excelFile'), opts.fileName || '—');

  /* ── Bloque 2: Conexion SAP IBP ── */
  ws.addRow([]);
  secRow(I18n.t('xls.resumen.connection'));
  var cfg = opts.cfg || {};
  kvRow('API Base URL', cfg.url || '—');
  kvRow('Planning Area ID', cfg.pa || '—');
  kvRow(I18n.t('xls.resumen.version'), cfg.pver || I18n.t('xls.resumen.baseline'));
  kvRow(I18n.t('xls.resumen.odataFilter'), opts.paFilter || I18n.t('xls.resumen.noFilter'));

  /* ── Bloque 3: Entidades OData utilizadas ── */
  ws.addRow([]);
  var ents = opts.entities || [];
  secRow(I18n.t('xls.resumen.entities', { n: ents.length }));
  if (ents.length === 0) {
    kvRow(I18n.t('xls.resumen.noEntities'), '');
  } else {
    ents.forEach(function(e) {
      if (e.downloaded == null) { kvRow(e.name, I18n.t('xls.resumen.notAvailable')); return; }
      // Cadena: descargados -> retenidos (filtros automaticos) -> analizados (exclusion tipo de material)
      var steps = [ I18n.t('xls.resumen.recordsDownloaded', { n: e.downloaded.toLocaleString(_lang) }) ];
      var prev  = e.downloaded;
      if (e.retained != null && e.retained !== prev) {
        var ret = I18n.t('xls.resumen.recordsRetained', { n: e.retained.toLocaleString(_lang) });
        if (e.note) ret += ' (' + e.note + ')';
        steps.push(ret);
        prev = e.retained;
      }
      if (e.analyzed != null && e.analyzed !== prev) {
        steps.push(I18n.t('xls.resumen.recordsAnalyzed', { n: e.analyzed.toLocaleString(_lang) }));
      }
      var detail = steps.join(' → ');
      // Si la nota no se adjunto en el paso "retenidos", agregarla al final
      if (e.note && !(e.retained != null && e.retained !== e.downloaded)) detail += ' — ' + e.note;
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
    secRow(I18n.t('xls.resumen.mattypeHeader', { total: mtKeys.length, incl: incl.length, excl: excl.length, catted: catted.length }));

    if (incl.length) {
      ws.addRow([I18n.t('xls.resumen.includedTypes'), I18n.t('xls.resumen.products'), I18n.t('xls.resumen.assignedCats')]);
      incl.forEach(function(mt) {
        var cfg = mc[mt];
        var cats = (cfg.categories && cfg.categories.size > 0)
          ? Array.from(cfg.categories).map(function(c) {
              var found = (typeof MATTYPE_CATS !== 'undefined' ? MATTYPE_CATS : []).filter(function(x) { return x.id === c; });
              return found.length ? found[0].label : c;
            }).join(', ')
          : I18n.t('xls.resumen.uncategorized');
        ws.addRow([mt, (cfg.count || 0) + ' ' + _prods, cats]);
      });
    }

    if (excl.length) {
      ws.addRow([]);
      ws.addRow([I18n.t('xls.resumen.excludedTypes'), I18n.t('xls.resumen.omittedProds'), '']);
      excl.forEach(function(mt) {
        var cfg = mc[mt];
        ws.addRow([mt, (cfg.count || 0) + ' ' + _prods, '']);
      });
    }
  }

  /* ── Bloque 5: Metricas globales ── */
  var kpis = opts.kpis || [];
  if (kpis.length) {
    ws.addRow([]);
    secRow(I18n.t('xls.resumen.globalMetrics'));
    kpis.forEach(function(kpi) {
      kvRow(kpi.label, kpi.value);
    });
  }
}
