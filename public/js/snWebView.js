/* ══════════════════════════════════════════════════════════════════
   snWebView.js — Vista web del Supply Network Analyzer (piloto)
   Renderiza el mismo análisis que el Excel directamente en la web, sin
   descargar nada. Los datos los captura analyzer.js en window.SN_WEB_RESULT.
   - Hojas acotadas (Resumen/Product/Location/Customer): completas en memoria.
   - Hojas grandes (Location/Customer Source): 100% paginadas desde IndexedDB
     (stores sn_loc_web/sn_cust_web). Si IDB no está listo, degrada a la vista
     en memoria (capada) + fallback Excel.
   - Estadísticas: secciones + tablas capturadas de StatsSheet.
   i18n vía I18n.t con fallback en español + re-render en 'i18n:change'.
   100% frontend, sin dependencias externas.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PAGE_SIZE   = 50;
  var MAX_SEARCH  = 2000;     // máx coincidencias recogidas al buscar en hojas grandes
  var MAX_SCAN    = 300000;   // máx filas revisadas por búsqueda (cota de tiempo)

  var _data        = null;    // window.SN_WEB_RESULT
  var _activeSheet = null;    // baseName de la hoja activa ('__stats__' para Estadísticas)
  var _sev         = 'all';   // 'all' | 'red' | 'yel' | 'ok'
  var _q           = '';      // texto de búsqueda
  var _page        = 1;
  var _searchTimer = null;
  var _reqSeq      = 0;       // token anti-carrera para render asíncrono (IDB)
  var _searchCache = null;   // { key, rows, truncated } cache de búsqueda en hoja grande
  var _panelId     = 'snResultsPanel';  // contenedor destino (SN o PA)
  var SNWV_PANELS  = ['snResultsPanel', 'paResultsPanel'];  // posibles destinos (solo uno vivo a la vez)

  var SEV = {
    red: { icon: '⛔', cls: 'snwv-red' },
    yel: { icon: '⚠', cls: 'snwv-yel' },
    ok:  { icon: '✅', cls: 'snwv-ok'  }
  };

  /* ── i18n: traducción con fallback en español + interpolación {var} ── */
  function t(key, fallback, vars) {
    if (window.I18n && I18n.has && I18n.t && I18n.has(key)) return I18n.t(key, vars || undefined);
    var s = fallback != null ? fallback : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (_m, k) { return vars[k] != null ? vars[k] : '{' + k + '}'; });
    return s;
  }
  function sevLabel(sv) {
    return sv === 'red' ? t('snweb.sev.red', 'Alerta')
         : sv === 'yel' ? t('snweb.sev.yel', 'Advertencia')
         : t('snweb.sev.ok', 'OK');
  }

  /* ── helpers ── */
  function esc(s)  { return (typeof escH === 'function') ? escH(s) : String(s == null ? '' : s); }
  function el(id)  { return document.getElementById(id); }
  function fmtN(n) {
    try { return Number(n).toLocaleString((window.I18n && I18n.getLang && I18n.getLang() === 'en') ? 'en-US' : 'es-CL'); }
    catch (e) { return String(n); }
  }
  function closestAttr(node, attr) {
    while (node && node !== document) {
      if (node.getAttribute && node.getAttribute(attr) != null) return node;
      node = node.parentNode;
    }
    return null;
  }
  function idbAvailable() {
    return typeof IDB !== 'undefined' && IDB && typeof idbCursorPage === 'function';
  }
  function isIdbSheet(sh) {
    return !!(sh && sh.idbStore && sh.idbReady && idbAvailable());
  }

  /* ── CSS scoped (inyectado una vez) ── */
  function injectCss() {
    if (el('snwv-styles')) return;
    var css =
    '.snwv-wrap{margin-top:24px;border:1px solid var(--border);border-radius:10px;background:var(--bg2);overflow:hidden}' +
    '.snwv-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);background:var(--surface);flex-wrap:wrap}' +
    '.snwv-title{font-size:15px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}' +
    '.snwv-sub{font-size:12px;color:var(--text2);margin-top:2px}' +
    '.snwv-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '.snwv-btn{cursor:pointer;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;padding:7px 13px;border-radius:6px;font-family:inherit}' +
    '.snwv-btn:hover{border-color:var(--accent)}' +
    '.snwv-btn:disabled{opacity:.55;cursor:default}' +
    '.snwv-btn-primary{background:var(--accent);color:#0b1120;border-color:var(--accent);font-weight:600}' +
    '.snwv-cards{display:flex;gap:10px;padding:14px 18px;flex-wrap:wrap;border-bottom:1px solid var(--border)}' +
    '.snwv-card{flex:1 1 150px;min-width:140px;border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg);cursor:pointer;transition:border-color .15s}' +
    '.snwv-card:hover{border-color:var(--accent)}' +
    '.snwv-card.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}' +
    '.snwv-card-name{font-size:12px;color:var(--text2);font-weight:600}' +
    '.snwv-card-total{font-size:22px;font-weight:700;color:var(--text);margin:3px 0}' +
    '.snwv-card-sev{display:flex;gap:8px;font-size:11px}' +
    '.snwv-dot{display:inline-flex;align-items:center;gap:3px}' +
    '.snwv-dot b{font-weight:700}' +
    '.snwv-tabs{display:flex;gap:4px;padding:12px 18px 0;flex-wrap:wrap}' +
    '.snwv-tab{cursor:pointer;border:1px solid var(--border);border-bottom:none;background:var(--bg);color:var(--text2);font-size:12px;padding:7px 14px;border-radius:6px 6px 0 0}' +
    '.snwv-tab.active{background:var(--bg2);color:var(--text);font-weight:600;border-color:var(--accent)}' +
    '.snwv-toolbar{display:flex;gap:10px;align-items:center;padding:12px 18px;flex-wrap:wrap;border-bottom:1px solid var(--border)}' +
    '.snwv-chips{display:flex;gap:6px;flex-wrap:wrap}' +
    '.snwv-chip{cursor:pointer;border:1px solid var(--border);background:var(--bg);color:var(--text2);font-size:11px;padding:5px 11px;border-radius:20px}' +
    '.snwv-chip.active{border-color:var(--accent);color:var(--text);font-weight:600}' +
    '.snwv-search{flex:1;min-width:160px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;padding:7px 11px;border-radius:6px;font-family:inherit}' +
    '.snwv-tablewrap{overflow:auto;max-height:62vh}' +
    '.snwv-table{border-collapse:collapse;width:100%;font-size:12px}' +
    '.snwv-table th{position:sticky;top:0;background:var(--surface);color:var(--text);text-align:left;padding:8px 10px;border-bottom:2px solid var(--accent2);white-space:nowrap;font-weight:600;z-index:1}' +
    '.snwv-table td{padding:6px 10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:top;max-width:340px}' +
    '.snwv-table tr.snwv-red td:first-child{box-shadow:inset 3px 0 0 var(--red)}' +
    '.snwv-table tr.snwv-yel td:first-child{box-shadow:inset 3px 0 0 var(--amber)}' +
    '.snwv-table tr.snwv-ok td:first-child{box-shadow:inset 3px 0 0 var(--green)}' +
    '.snwv-table tr.snwv-red{background:rgba(255,107,107,.07)}' +
    '.snwv-table tr.snwv-yel{background:rgba(247,168,0,.07)}' +
    '.snwv-sevcell{white-space:nowrap;font-weight:600}' +
    '.snwv-sevcell.snwv-red{color:var(--red)}' +
    '.snwv-sevcell.snwv-yel{color:var(--amber)}' +
    '.snwv-sevcell.snwv-ok{color:var(--green)}' +
    '.snwv-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;flex-wrap:wrap}' +
    '.snwv-pager{display:flex;align-items:center;gap:8px}' +
    '.snwv-count{font-size:12px;color:var(--text2)}' +
    '.snwv-cap{font-size:11px;color:var(--accent2);margin-top:4px}' +
    '.snwv-note{font-size:11px;color:var(--text3);margin-top:4px}' +
    '.snwv-empty{padding:30px;text-align:center;color:var(--text2);font-size:13px}' +
    '.snwv-statsbox{padding:16px 18px}' +
    '.snwv-st-h{font-size:13px;font-weight:700;color:var(--accent);margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)}' +
    '.snwv-statsbox .snwv-st-h:first-child{margin-top:0}' +
    '.snwv-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999}' +
    '.snwv-modal{background:var(--bg2);border:1px solid var(--border);border-radius:12px;max-width:460px;width:90%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.4)}' +
    '.snwv-modal h3{margin:0 0 6px;font-size:16px;color:var(--text)}' +
    '.snwv-modal p{margin:0 0 16px;font-size:13px;color:var(--text2)}' +
    '.snwv-opts{display:flex;flex-direction:column;gap:10px}' +
    '.snwv-opt{cursor:pointer;border:1px solid var(--border);background:var(--bg);border-radius:8px;padding:12px 14px;text-align:left;color:var(--text);transition:border-color .15s;font-family:inherit}' +
    '.snwv-opt:hover{border-color:var(--accent)}' +
    '.snwv-opt b{display:block;font-size:13px;margin-bottom:2px}' +
    '.snwv-opt span{font-size:11px;color:var(--text2)}' +
    '.snwv-modal-foot{margin-top:14px;text-align:right}';
    var st = document.createElement('style');
    st.id = 'snwv-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ══════════════════════════════════════════════════════════════════
     Modal: ¿vista web / Excel / ambos?  → Promise<'web'|'excel'|'both'|null>
     ══════════════════════════════════════════════════════════════════ */
  function askOutputMode() {
    injectCss();
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'snwv-ov';
      ov.innerHTML =
        '<div class="snwv-modal" role="dialog" aria-modal="true">' +
          '<h3>' + esc(t('snweb.modal.title', '¿Cómo quieres ver el análisis?')) + '</h3>' +
          '<p>' + esc(t('snweb.modal.desc', 'Puedes explorar el resultado directamente en la web, descargar el Excel, o ambos.')) + '</p>' +
          '<div class="snwv-opts">' +
            '<button class="snwv-opt" data-m="web"><b>🖥️ ' + esc(t('snweb.modal.web', 'Ver en la web')) + '</b><span>' + esc(t('snweb.modal.webDesc', 'Explora el análisis en pantalla sin descargar nada.')) + '</span></button>' +
            '<button class="snwv-opt" data-m="excel"><b>⬇️ ' + esc(t('snweb.modal.excel', 'Descargar Excel')) + '</b><span>' + esc(t('snweb.modal.excelDesc', 'Genera y descarga el informe .xlsx (comportamiento actual).')) + '</span></button>' +
            '<button class="snwv-opt" data-m="both"><b>📊 ' + esc(t('snweb.modal.both', 'Ambos')) + '</b><span>' + esc(t('snweb.modal.bothDesc', 'Descarga el Excel y además muestra la vista web.')) + '</span></button>' +
          '</div>' +
          '<div class="snwv-modal-foot"><button class="snwv-btn" data-m="cancel">' + esc(t('snweb.modal.cancel', 'Cancelar')) + '</button></div>' +
        '</div>';
      function done(m) {
        document.removeEventListener('keydown', onKey);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        resolve(m === 'cancel' ? null : m);
      }
      function onKey(e) { if (e.key === 'Escape' || e.keyCode === 27) done('cancel'); }
      ov.addEventListener('click', function (e) {
        var b = closestAttr(e.target, 'data-m');
        if (b) { done(b.getAttribute('data-m')); return; }
        if (e.target === ov) done('cancel');
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(ov);
      var first = ov.querySelector('.snwv-opt'); if (first) first.focus();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     Render principal
     ══════════════════════════════════════════════════════════════════ */
  function render(data) {
    injectCss();
    _panelId = (data && data.panel) ? data.panel : 'snResultsPanel';
    // Mantener un solo panel vivo a la vez: limpiar los demás evita IDs internos snwv-* duplicados
    // (getElementById devolvería el del otro panel y mezclaría SN con PA).
    SNWV_PANELS.forEach(function (pid) {
      if (pid !== _panelId) { var _o = el(pid); if (_o) { _o.innerHTML = ''; _o.classList.add('hidden'); } }
    });
    var panel = el(_panelId);
    if (!panel) return;
    _data = data;
    _sev = 'all'; _q = ''; _page = 1; _searchCache = null;

    if (!data || !data.order || !data.order.length) {
      panel.classList.remove('hidden');
      panel.innerHTML = '<div class="snwv-wrap"><div class="snwv-empty">' + esc(t('snweb.empty', 'No hay datos para mostrar en la vista web.')) + '</div></div>';
      return;
    }
    // Preservar hoja activa entre re-renders (p.ej. cambio de idioma)
    var keep = _activeSheet;
    var keepOk = keep && (keep === '__stats__' ? (data.stats && data.stats.length) : data.sheets[keep]);
    _activeSheet = keepOk ? keep : data.order[0];

    panel.classList.remove('hidden');
    panel.innerHTML = buildShell(data);
    wireShell();
    renderActive();
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }

  function buildShell(data) {
    var gen   = data.generatedAt ? (' · ' + esc(data.generatedAt)) : '';
    var canDl = (typeof data.downloadExcel === 'function');
    var h = '';
    h += '<div class="snwv-wrap">';
    h += '<div class="snwv-head"><div>';
    var titleTxt = data.titleKey ? t(data.titleKey, data.title || '') : t('snweb.title', 'Supply Network Analyzer — vista web');
    h += '<div class="snwv-title">🌐 ' + esc(titleTxt) + '</div>';
    h += '<div class="snwv-sub">' + esc(t('snweb.subtitle', 'Mismo análisis que el Excel, explorable en pantalla')) + gen + '</div>';
    h += '</div><div class="snwv-actions">';
    if (canDl) h += '<button class="snwv-btn snwv-btn-primary" id="snwv-dl">⬇️ ' + esc(t('snweb.downloadExcel', 'Descargar Excel')) + '</button>';
    h += '<button class="snwv-btn" id="snwv-close">' + esc(t('snweb.close', 'Cerrar')) + '</button>';
    h += '</div></div>';
    h += '<div class="snwv-cards" id="snwv-cards">' + buildCards(data) + '</div>';
    h += '<div class="snwv-tabs" id="snwv-tabs">' + buildTabs(data) + '</div>';
    h += '<div id="snwv-body"></div>';
    h += '</div>';
    return h;
  }

  function buildCards(data) {
    var rows = (data.summary && data.summary.length) ? data.summary : (data.order || []).map(function (nm) {
      var s = data.sheets[nm]; return { name: nm, total: s.total, red: s.red, yel: s.yel, ok: s.ok };
    });
    return rows.map(function (r) {
      var act = (r.name === _activeSheet) ? ' active' : '';
      return '<div class="snwv-card' + act + '" data-sheet="' + esc(r.name) + '">' +
        '<div class="snwv-card-name">' + esc(r.name) + '</div>' +
        '<div class="snwv-card-total">' + fmtN(r.total) + '</div>' +
        '<div class="snwv-card-sev">' +
          '<span class="snwv-dot" style="color:var(--red)">⛔ <b>' + fmtN(r.red) + '</b></span>' +
          '<span class="snwv-dot" style="color:var(--amber)">⚠ <b>' + fmtN(r.yel) + '</b></span>' +
          '<span class="snwv-dot" style="color:var(--green)">✅ <b>' + fmtN(r.ok) + '</b></span>' +
        '</div></div>';
    }).join('');
  }

  function buildTabs(data) {
    var h = (data.order || []).map(function (nm) {
      var s = data.sheets[nm];
      var act = (nm === _activeSheet) ? ' active' : '';
      return '<div class="snwv-tab' + act + '" data-sheet="' + esc(nm) + '">' + esc(nm) +
        ' <span style="opacity:.6">(' + fmtN(s.total) + ')</span></div>';
    }).join('');
    if (data.stats && data.stats.length) {
      var sact = (_activeSheet === '__stats__') ? ' active' : '';
      h += '<div class="snwv-tab' + sact + '" data-sheet="__stats__">📈 ' + esc(data.statsName || t('snweb.stats', 'Estadísticas')) + '</div>';
    }
    return h;
  }

  function wireShell() {
    var dl = el('snwv-dl');
    if (dl) dl.addEventListener('click', function () {
      if (!_data || typeof _data.downloadExcel !== 'function') return;
      dl.disabled = true; dl.textContent = t('snweb.generating', 'Generando...');
      _data.downloadExcel().then(function () {
        dl.textContent = '✅ ' + t('snweb.downloaded', 'Excel descargado');
      }).catch(function (e) {
        dl.disabled = false; dl.textContent = '⬇️ ' + t('snweb.downloadExcel', 'Descargar Excel');
        alert(t('snweb.dlError', 'No se pudo generar el Excel: ') + (e && e.message ? e.message : e));
      });
    });
    var cl = el('snwv-close');
    if (cl) cl.addEventListener('click', function () { var p = el(_panelId); if (p) p.classList.add('hidden'); });

    var cards = el('snwv-cards');
    if (cards) cards.addEventListener('click', function (e) {
      var c = closestAttr(e.target, 'data-sheet'); if (c) setSheet(c.getAttribute('data-sheet'));
    });
    var tabs = el('snwv-tabs');
    if (tabs) tabs.addEventListener('click', function (e) {
      var t2 = closestAttr(e.target, 'data-sheet'); if (t2) setSheet(t2.getAttribute('data-sheet'));
    });
  }

  function setSheet(name) {
    if (name !== '__stats__' && !_data.sheets[name]) return;
    _activeSheet = name; _sev = 'all'; _q = ''; _page = 1; _searchCache = null;
    var nodes = document.querySelectorAll('#snwv-cards .snwv-card, #snwv-tabs .snwv-tab');
    Array.prototype.forEach.call(nodes, function (nd) {
      nd.classList.toggle('active', nd.getAttribute('data-sheet') === _activeSheet);
    });
    renderActive();
  }

  /* ── toolbar (chips + búsqueda) — se construye una vez por hoja ── */
  function renderActive() {
    var body = el('snwv-body');
    if (!body) return;
    if (_activeSheet === '__stats__') { body.innerHTML = renderStats(); return; }
    var sh = _data.sheets[_activeSheet];
    var h = '';
    h += '<div class="snwv-toolbar">';
    h += '<div class="snwv-chips" id="snwv-chips">' +
           chip('all', t('snweb.all', 'Todos'), sh.total) +
           chip('red', '⛔ ' + t('snweb.alerts', 'Alertas'), sh.red) +
           chip('yel', '⚠ ' + t('snweb.warnings', 'Advertencias'), sh.yel) +
           chip('ok',  '✅ ' + t('snweb.ok', 'OK'), sh.ok) +
         '</div>';
    h += '<input class="snwv-search" id="snwv-q" type="text" placeholder="' + esc(t('snweb.searchPh', 'Buscar en {sheet}...', { sheet: sh.name })) + '" value="' + esc(_q) + '">';
    h += '</div>';
    h += '<div id="snwv-tablearea"></div>';
    body.innerHTML = h;

    var chips = el('snwv-chips');
    chips.addEventListener('click', function (e) {
      var c = closestAttr(e.target, 'data-sev'); if (!c) return;
      _sev = c.getAttribute('data-sev'); _page = 1; _searchCache = null;
      Array.prototype.forEach.call(chips.children, function (ch) {
        ch.classList.toggle('active', ch.getAttribute('data-sev') === _sev);
      });
      renderTable();
    });
    var q = el('snwv-q');
    q.addEventListener('input', function () {
      if (_searchTimer) clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () { _q = q.value; _page = 1; renderTable(); }, 220);
    });
    renderTable();
  }

  /* ── Estadísticas (descriptiva): secuencia de títulos + tablas ── */
  function renderStats() {
    var rows = _data.stats || [];
    if (!rows.length) return '<div class="snwv-empty">' + esc(t('snweb.statsEmpty', 'Estadísticas no disponibles.')) + '</div>';
    var h = '<div class="snwv-statsbox">';
    var i = 0, n = rows.length;
    while (i < n) {
      var r = rows[i];
      if (!r || !r.length) { i++; continue; }                 // separador
      if (r.length === 1) {                                    // título / banner de sección
        if (String(r[0]).trim() !== '') h += '<div class="snwv-st-h">' + esc(r[0]) + '</div>';
        i++; continue;
      }
      var block = [];                                          // bloque de tabla contiguo
      while (i < n && rows[i] && rows[i].length > 1) { block.push(rows[i]); i++; }
      h += '<div class="snwv-tablewrap" style="max-height:none;margin-bottom:14px"><table class="snwv-table"><thead><tr>';
      for (var c = 0; c < block[0].length; c++) h += '<th>' + esc(block[0][c]) + '</th>';
      h += '</tr></thead><tbody>';
      for (var b = 1; b < block.length; b++) {
        h += '<tr>';
        for (var cc = 0; cc < block[b].length; cc++) h += '<td>' + esc(block[b][cc]) + '</td>';
        h += '</tr>';
      }
      h += '</tbody></table></div>';
    }
    h += '</div>';
    return h;
  }

  function chip(key, label, count) {
    var act = (_sev === key) ? ' active' : '';
    return '<span class="snwv-chip' + act + '" data-sev="' + key + '">' + label + ' (' + fmtN(count) + ')</span>';
  }

  /* ══════════════════════════════════════════════════════════════════
     Tabla: dispatch entre memoria (hojas acotadas / fallback) e IDB (grandes)
     ══════════════════════════════════════════════════════════════════ */
  function renderTable() {
    var sh = _data.sheets[_activeSheet];
    if (!sh) return;
    if (isIdbSheet(sh)) renderTableIdb(sh);
    else                renderTableMem(sh, false);
  }

  /* ── filas de display → HTML tabla + footer (compartido mem/IDB) ── */
  function buildTableHtml(sh, recs, opts) {
    var h = '';
    if (!recs.length) {
      h += '<div class="snwv-empty">' + esc(t('snweb.noMatch', 'Sin filas que coincidan con el filtro.')) + '</div>';
    } else {
      h += '<div class="snwv-tablewrap"><table class="snwv-table"><thead><tr>';
      for (var k = 0; k < sh.headers.length; k++) h += '<th>' + esc(sh.headers[k]) + '</th>';
      h += '</tr></thead><tbody>';
      for (var ri = 0; ri < recs.length; ri++) {
        var row  = recs[ri];
        var meta = SEV[row.s] || SEV.ok;
        h += '<tr class="' + meta.cls + '">';
        for (var ci = 0; ci < sh.headers.length; ci++) {
          var v = (row.c && row.c[ci] != null) ? row.c[ci] : '';
          if (ci === 0) {
            // Componer siempre desde la severidad para que siga el idioma activo (no usar el texto capturado).
            h += '<td class="snwv-sevcell ' + meta.cls + '">' + meta.icon + ' ' + esc(sevLabel(row.s)) + '</td>';
          } else {
            h += '<td>' + esc(v) + '</td>';
          }
        }
        h += '</tr>';
      }
      h += '</tbody></table></div>';
    }

    var shownFrom = opts.filteredCount ? (opts.offset + 1) : 0;
    var shownTo   = Math.min(opts.offset + PAGE_SIZE, opts.filteredCount);
    h += '<div class="snwv-foot"><div>';
    h += '<div class="snwv-count">' + esc(t('snweb.showing', 'Mostrando {a}–{b} de {n}', { a: fmtN(shownFrom), b: fmtN(shownTo), n: fmtN(opts.filteredCount) })) +
         (opts.filteredCount !== sh.total ? ' ' + esc(t('snweb.filteredOf', '(filtrado de {n})', { n: fmtN(sh.total) })) : '') + '</div>';
    if (opts.idb) {
      if (opts.searching && opts.truncated) {
        h += '<div class="snwv-cap">⚠ ' + esc(t('snweb.searchTrunc', 'Búsqueda limitada a las primeras {n} coincidencias. Afina el filtro o descarga el Excel.', { n: fmtN(opts.filteredCount) })) + '</div>';
      } else {
        h += '<div class="snwv-note">' + esc(t('snweb.idbNote', 'Navegando el 100% de las filas desde el almacenamiento local del navegador.')) + '</div>';
      }
    } else if (opts.fellBack) {
      h += '<div class="snwv-cap">⚠ ' + esc(t('snweb.idbFail', 'No se pudo leer el detalle completo; mostrando vista parcial.')) + '</div>';
    } else if (sh.capped) {
      h += '<div class="snwv-cap">⚠ ' + esc(t('snweb.capped', 'Vista limitada a {shown} filas (de {total}). Descarga el Excel para el detalle completo.', { shown: fmtN(sh.rows.length), total: fmtN(sh.total) })) + '</div>';
    }
    h += '</div>';
    h += '<div class="snwv-pager">';
    h += '<button class="snwv-btn" id="snwv-prev"' + (_page <= 1 ? ' disabled' : '') + '>‹ ' + esc(t('snweb.prev', 'Anterior')) + '</button>';
    h += '<span class="snwv-count">' + esc(t('snweb.page', 'Página {p} / {t}', { p: fmtN(_page), t: fmtN(opts.totalPages) })) + '</span>';
    h += '<button class="snwv-btn" id="snwv-next"' + (_page >= opts.totalPages ? ' disabled' : '') + '>' + esc(t('snweb.next', 'Siguiente')) + ' ›</button>';
    h += '</div></div>';
    return h;
  }

  function wirePager() {
    var prev = el('snwv-prev'); if (prev) prev.addEventListener('click', function () { if (_page > 1) { _page--; renderTable(); } });
    var next = el('snwv-next'); if (next) next.addEventListener('click', function () { _page++; renderTable(); });
  }

  /* ── Memoria: hojas acotadas (completas) o fallback de hojas grandes ── */
  function getFiltered(sh) {
    var rows = sh.rows || [];
    var q = _q.trim().toLowerCase();
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (_sev !== 'all' && r.s !== _sev) continue;
      if (q) {
        var hit = false, c = r.c;
        for (var j = 0; j < c.length; j++) {
          if (c[j] && String(c[j]).toLowerCase().indexOf(q) !== -1) { hit = true; break; }
        }
        if (!hit) continue;
      }
      out.push(r);
    }
    return out;
  }

  function renderTableMem(sh, fellBack) {
    var area = el('snwv-tablearea');
    if (!area) return;
    var filtered = getFiltered(sh);
    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (_page > totalPages) _page = totalPages;
    if (_page < 1) _page = 1;
    var offset = (_page - 1) * PAGE_SIZE;
    var pageRows = filtered.slice(offset, offset + PAGE_SIZE);
    area.innerHTML = buildTableHtml(sh, pageRows, {
      filteredCount: filtered.length, totalPages: totalPages, offset: offset,
      idb: false, fellBack: !!fellBack
    });
    wirePager();
  }

  /* ── IDB: hojas grandes paginadas al 100% (sin búsqueda) ── */
  function renderTableIdb(sh) {
    var area = el('snwv-tablearea');
    if (!area) return;
    var myReq = ++_reqSeq;
    var q = _q.trim().toLowerCase();
    if (q) { renderTableIdbSearch(sh, q, myReq); return; }

    area.innerHTML = '<div class="snwv-empty">' + esc(t('snweb.loading', 'Cargando...')) + '</div>';
    var filteredCount = (_sev === 'all') ? sh.total : (sh[_sev] || 0);
    var totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
    if (_page > totalPages) _page = totalPages;
    if (_page < 1) _page = 1;
    var offset = (_page - 1) * PAGE_SIZE;
    var pager = (_sev === 'all')
      ? idbCursorPage(sh.idbStore, null, null, offset, PAGE_SIZE)
      : idbCursorPage(sh.idbStore, 'by_severity', _sev, offset, PAGE_SIZE);
    pager.then(function (recs) {
      if (myReq !== _reqSeq) return;
      area.innerHTML = buildTableHtml(sh, recs || [], {
        filteredCount: filteredCount, totalPages: totalPages, offset: offset,
        idb: true, searching: false, truncated: false
      });
      wirePager();
    }).catch(function (e) {
      if (myReq !== _reqSeq) return;
      renderTableMem(sh, true);   // degradación elegante a la vista en memoria
    });
  }

  /* ── IDB: búsqueda acotada (scan con tope) + paginación cliente ── */
  function renderTableIdbSearch(sh, q, myReq) {
    var area = el('snwv-tablearea');
    if (!area) return;
    var cacheKey = _activeSheet + '|' + _sev + '|' + q;
    if (_searchCache && _searchCache.key === cacheKey) { paintSearchPage(sh); return; }

    area.innerHTML = '<div class="snwv-empty">' + esc(t('snweb.searching', 'Buscando...')) + '</div>';
    var test = function (rec) {
      var c = rec.c || [];
      for (var j = 0; j < c.length; j++) { if (c[j] && String(c[j]).toLowerCase().indexOf(q) !== -1) return true; }
      return false;
    };
    var idxName = (_sev === 'all') ? null : 'by_severity';
    var key     = (_sev === 'all') ? null : _sev;
    idbCursorScanMatch(sh.idbStore, idxName, key, test, MAX_SEARCH, MAX_SCAN).then(function (res) {
      if (myReq !== _reqSeq) return;
      _searchCache = { key: cacheKey, rows: res.rows || [], truncated: !!res.truncated };
      paintSearchPage(sh);
    }).catch(function (e) {
      if (myReq !== _reqSeq) return;
      renderTableMem(sh, true);
    });
  }

  function paintSearchPage(sh) {
    var area = el('snwv-tablearea');
    if (!area || !_searchCache) return;
    var rows = _searchCache.rows;
    var totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (_page > totalPages) _page = totalPages;
    if (_page < 1) _page = 1;
    var offset = (_page - 1) * PAGE_SIZE;
    var pageRows = rows.slice(offset, offset + PAGE_SIZE);
    area.innerHTML = buildTableHtml(sh, pageRows, {
      filteredCount: rows.length, totalPages: totalPages, offset: offset,
      idb: true, searching: true, truncated: _searchCache.truncated
    });
    wirePager();
  }

  /* Re-render al cambiar idioma (mismo patrón que glosario/explorer). */
  document.addEventListener('i18n:change', function () {
    var panel = el(_panelId);
    if (_data && panel && !panel.classList.contains('hidden')) render(_data);
  });

  window.SnWebView = { askOutputMode: askOutputMode, render: render };
})();
