/* ════════════════════════════════════════════════════════════════════════
   PA Documenter — Documentación del Planning Area (SAP IBP) en Word (.docx)

   Toma los CSV del "Download Configuration File" de un Planning Area de
   SAP IBP y genera un documento .docx (OOXML WordprocessingML) construido
   de forma nativa con JSZip — mismo patrón que la generación de .xlsx del
   módulo Doc Generator (docs.js). Sin dependencias CDN nuevas.

   Fase 1 (este archivo): 100% offline, a partir de los CSV.
   Fase 2 (pendiente): enriquecimiento en vivo vía SAP_COM_0720.

   Namespace: PADoc (IIFE) para no colisionar con las globales del proyecto.
   ════════════════════════════════════════════════════════════════════════ */
const PADoc = (function () {
  'use strict';

  // JSZip: global en el browser, require en Node (para el test).
  const _JSZip = (typeof JSZip !== 'undefined') ? JSZip
    : (typeof require !== 'undefined' ? require('jszip') : null);

  // ── Secciones esperadas del Download Configuration File ────────────────
  // Orden por longitud desc: el detector de sección elige el match más largo
  // (ATTRIBUTES_AS_KEYFIGURE antes que KEYFIGURES, PA_ATTRIBUTES, etc.).
  const KNOWN_SECTIONS = [
    'ATTRIBUTES_AS_KEYFIGURE',
    'CURRENCY_CONVERSIONS',
    'PLANNING_HORIZONS',
    'MASTERDATATYPES',
    'PLEVELS_ATTRS',
    'PA_ATTRIBUTES',
    'UOM_CONVERSIONS',
    'GENERAL_INFO',
    'TIMEPROFILE',
    'KEYFIGURES',
    'OPERATORS',
    'SNAPSHOTS',
    'VERSIONS'
  ];

  // ── Estado del módulo ──────────────────────────────────────────────────
  let padData = {};   // { SECTION: { header:[], rows:[[...]], objs:[{}], file } }
  let padPaId = '';   // ID del Planning Area detectado
  let padLogo = null; // { b64, ext, w, h }  (logo cliente, opcional)

  /* ══════════════════════════════════════════════════════════════════════
     1. PARSING DE CSV
     ══════════════════════════════════════════════════════════════════════ */

  // CSV con separador ';', comillas dobles y campos multilínea.
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ';') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Quita BOM y espacios de una cabecera.
  function cleanHeader(h) { return String(h || '').replace(/^﻿/, '').trim(); }

  // Detecta la sección conocida contenida en el nombre de archivo.
  function detectSection(filename) {
    const up = String(filename || '').toUpperCase();
    for (const s of KNOWN_SECTIONS) {
      // delimitado por _ (o inicio/fin) para evitar solapes accidentales
      const re = new RegExp('(^|_)' + s + '(_|\\.|$)');
      if (re.test(up)) return s;
    }
    return null;
  }

  // Deriva el PA ID del prefijo del nombre (texto antes del primer '_').
  function paFromName(filename) {
    const base = String(filename || '').replace(/\.[^.]*$/, '');
    const m = base.match(/^([A-Za-z0-9]+)_/);
    return m ? m[1] : '';
  }

  // Convierte {header, rows} en array de objetos {colName: value}.
  function toObjects(header, rows) {
    return rows.map(r => {
      const o = {};
      header.forEach((h, i) => { o[h] = (r[i] !== undefined ? r[i] : ''); });
      return o;
    });
  }

  // Ingesta un CSV ya leído como texto. Devuelve la sección detectada o null.
  function ingestCsvText(filename, text) {
    const section = detectSection(filename);
    if (!section) return null;
    const raw = parseCSV(text);
    if (!raw.length) return section;
    const header = raw[0].map(cleanHeader);
    const rows = raw.slice(1).filter(r => r.some(c => c && c.trim() !== ''));
    padData[section] = { header, rows, objs: toObjects(header, rows), file: filename };
    if (!padPaId) {
      // GENERAL_INFO trae el ID real del PA en su primera columna.
      if (section === 'GENERAL_INFO' && rows.length) padPaId = str(rows[0][0]);
      else { const p = paFromName(filename); if (p) padPaId = p; }
    }
    return section;
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. MANEJO DE ARCHIVOS (browser)
     ══════════════════════════════════════════════════════════════════════ */

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });
  }

  // Acepta CSV sueltos y/o un ZIP que los contenga.
  async function addFiles(list) {
    const logEl = document.getElementById('padoc-log');
    for (const f of list) {
      const name = f.name || '';
      try {
        if (/\.zip$/i.test(name)) {
          const zip = await _JSZip.loadAsync(f);
          const entries = Object.keys(zip.files).filter(n => /\.csv$/i.test(n) && !zip.files[n].dir);
          for (const n of entries) {
            const txt = await zip.files[n].async('string');
            const sec = ingestCsvText(n.split('/').pop(), txt);
            if (logEl && sec) log(logEl, 'ok', 'ZIP → ' + sec);
          }
        } else if (/\.csv$/i.test(name)) {
          const txt = await readFileText(f);
          const sec = ingestCsvText(name, txt);
          if (logEl) log(logEl, sec ? 'ok' : 'warn', sec ? ('Detectado: ' + sec) : ('No reconocido: ' + name));
        }
      } catch (e) {
        if (logEl) log(logEl, 'err','Error con ' + name + ': ' + e.message);
      }
    }
    renderStatus();
  }

  async function setLogoFile(file) {
    if (!file) { padLogo = null; renderStatus(); return; }
    const ext = (file.name.match(/\.(png|jpe?g)$/i) || [, 'png'])[1].toLowerCase().replace('jpeg', 'jpg');
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file);
    });
    const b64 = String(dataUrl).split(',')[1] || '';
    // Dimensiones para calcular el tamaño en el documento.
    const dims = await new Promise((res) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => res({ w: 200, h: 80 });
      img.src = dataUrl;
    });
    padLogo = { b64, ext: ext === 'jpg' ? 'jpeg' : ext, w: dims.w || 200, h: dims.h || 80 };
    renderStatus();
  }

  // Estado de secciones cargadas (checklist) + habilita el botón generar.
  function renderStatus() {
    const box = document.getElementById('padoc-status');
    if (!box) return;
    const rowsFor = s => padData[s] ? padData[s].rows.length : null;
    const items = KNOWN_SECTIONS.slice().sort().map(s => {
      const n = rowsFor(s);
      const ok = n !== null;
      const cnt = ok ? (n + ' filas') : 'no provisto';
      return '<div class="padoc-chk ' + (ok ? 'on' : 'off') + '">' +
        '<span>' + (ok ? '✓' : '·') + '</span> ' + escH(s) +
        ' <em>' + escH(cnt) + '</em></div>';
    }).join('');
    const paLine = padPaId ? ('<b>Planning Area:</b> ' + escH(padPaId)) : '<span class="padoc-muted">Sin PA detectado aún</span>';
    const logoLine = padLogo ? ('· Logo cargado (' + padLogo.w + '×' + padLogo.h + ')') : '';
    box.innerHTML = '<div class="padoc-status-head">' + paLine + ' ' + escH(logoLine) + '</div>' +
      '<div class="padoc-chk-grid">' + items + '</div>';
    const btn = document.getElementById('padoc-gen-btn');
    if (btn) btn.disabled = Object.keys(padData).length === 0;
  }

  function reset() {
    padData = {}; padPaId = ''; padLogo = null;
    const log = document.getElementById('padoc-log'); if (log) log.innerHTML = '';
    renderStatus();
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. HELPERS OOXML (WordprocessingML)
     ══════════════════════════════════════════════════════════════════════ */

  function xesc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // Runs de texto, respetando saltos de línea como <w:br/>.
  function runs(text, rPr) {
    const rpr = rPr ? ('<w:rPr>' + rPr + '</w:rPr>') : '';
    const parts = String(text == null ? '' : text).split(/\r?\n/);
    return parts.map((p, i) =>
      '<w:r>' + rpr + (i > 0 ? '<w:br/>' : '') +
      '<w:t xml:space="preserve">' + xesc(p) + '</w:t></w:r>'
    ).join('');
  }

  function para(text, opts) {
    opts = opts || {};
    // Orden de elementos según el schema OOXML (CT_PPr): pStyle → spacing → jc.
    const pPrParts = [];
    if (opts.style) pPrParts.push('<w:pStyle w:val="' + opts.style + '"/>');
    if (opts.spacingAfter != null) pPrParts.push('<w:spacing w:after="' + opts.spacingAfter + '"/>');
    if (opts.align) pPrParts.push('<w:jc w:val="' + opts.align + '"/>');
    const pPr = pPrParts.length ? ('<w:pPr>' + pPrParts.join('') + '</w:pPr>') : '';
    // Orden CT_RPr: b → i → color → sz.
    let rPr = '';
    if (opts.bold) rPr += '<w:b/>';
    if (opts.italic) rPr += '<w:i/>';
    if (opts.color) rPr += '<w:color w:val="' + opts.color + '"/>';
    if (opts.size) rPr += '<w:sz w:val="' + (opts.size * 2) + '"/>';
    return '<w:p>' + pPr + runs(text, rPr || null) + '</w:p>';
  }

  function heading(text, level) {
    return '<w:p><w:pPr><w:pStyle w:val="Heading' + level + '"/></w:pPr>' + runs(text) + '</w:p>';
  }

  function pageBreak() {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  function emptyPara() { return '<w:p/>'; }

  // Tabla. cols = [{w:pct}], header = [str], data = [[str]].
  // opts: { fontSize (pt), headerFill (hex) }
  function table(headerCells, dataRows, opts) {
    opts = opts || {};
    const fs = opts.fontSize || 9;
    const fill = opts.headerFill || 'E8622A';
    const nCols = headerCells.length;
    const colW = Math.floor(5000 / nCols); // pct de 5000 = 100%

    const grid = '<w:tblGrid>' + headerCells.map(() => '<w:gridCol w:w="' + Math.floor(9350 / nCols) + '"/>').join('') + '</w:tblGrid>';

    function cell(content, isHeader) {
      const shd = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' : '';
      const tcPr = '<w:tcPr><w:tcW w:w="' + colW + '" w:type="pct"/>' + shd + '</w:tcPr>';
      const rPr = (isHeader ? '<w:b/><w:color w:val="FFFFFF"/>' : '') + '<w:sz w:val="' + (fs * 2) + '"/>';
      const pPr = '<w:pPr><w:spacing w:after="20"/></w:pPr>';
      return '<w:tc>' + tcPr + '<w:p>' + pPr + runs(content, rPr) + '</w:p></w:tc>';
    }

    const headerRow = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
      headerCells.map(h => cell(h, true)).join('') + '</w:tr>';
    const body = dataRows.map(r =>
      '<w:tr>' + headerCells.map((_, i) => cell(r[i] !== undefined ? r[i] : '', false)).join('') + '</w:tr>'
    ).join('');

    const borders = '<w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(b => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>').join('') +
      '</w:tblBorders>';

    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>' +
      '<w:tblW w:w="5000" w:type="pct"/>' + borders +
      '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>' +
      '</w:tblPr>' + grid + headerRow + body + '</w:tbl>' + emptyPara();
  }

  // Tabla de dos columnas clave→valor (ficha).
  function kvTable(pairs, opts) {
    return table(['Campo', 'Valor'], pairs.map(p => [p[0], p[1]]),
      Object.assign({ headerFill: '1F3864' }, opts || {}));
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. ACCESO A DATOS
     ══════════════════════════════════════════════════════════════════════ */

  function sec(name) { return padData[name] || null; }
  function objs(name) { const s = padData[name]; return s ? s.objs : []; }
  function get(o, col) { return o && o[col] !== undefined ? str(o[col]) : ''; }
  // busca una columna por nombre exacto o, si no, por inclusión (case-insensitive)
  function getLike(o, needle) {
    if (!o) return '';
    const keys = Object.keys(o);
    let k = keys.find(x => x.toLowerCase() === needle.toLowerCase());
    if (!k) k = keys.find(x => x.toLowerCase().includes(needle.toLowerCase()));
    return k ? str(o[k]) : '';
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. BUILDERS POR SECCIÓN  → devuelven arrays de bloques XML
     ══════════════════════════════════════════════════════════════════════ */

  function bCover(meta) {
    const blocks = [];
    if (padLogo) blocks.push(drawingLogo());
    blocks.push(para(meta.cliente || 'Cliente', { align: 'center', bold: true, size: 20, color: 'E8622A', spacingAfter: 120 }));
    blocks.push(para('Documentación del Planning Area', { align: 'center', size: 26, bold: true, color: '1F3864', spacingAfter: 40 }));
    blocks.push(para(padPaId || 'SAP IBP', { align: 'center', size: 30, bold: true, color: '1F3864', spacingAfter: 200 }));
    const gi = objs('GENERAL_INFO')[0];
    if (gi) blocks.push(para(getLike(gi, 'Description'), { align: 'center', italic: true, size: 13, spacingAfter: 300 }));
    blocks.push(para('SAP Integrated Business Planning', { align: 'center', size: 12, color: '808080' }));
    blocks.push(kvTable([
      ['Cliente', meta.cliente || ''],
      ['Planning Area', padPaId || ''],
      ['Autor', meta.autor || ''],
      ['Versión del documento', meta.version || '1.0'],
      ['Fecha de generación', meta.fecha],
      ['Generado con', 'GoSCM · PA Documenter']
    ]));
    blocks.push(pageBreak());
    return blocks;
  }

  function bToc() {
    return [
      heading('Tabla de contenido', 1),
      '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>' +
      '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
      '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>' +
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
      '<w:r><w:t xml:space="preserve">Abra el documento en Word y actualice este campo (clic derecho → Actualizar campos) para ver la tabla de contenido.</w:t></w:r>' +
      '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
      pageBreak()
    ];
  }

  function bResumen() {
    const b = [heading('1. Resumen ejecutivo', 1)];
    const gi = objs('GENERAL_INFO')[0] || {};
    b.push(para('Este documento describe la configuración del área de planificación ' +
      (padPaId ? ('“' + padPaId + '”') : '') + ' de SAP IBP, generada a partir de los archivos del Download Configuration File.', {}));

    // Módulos activos (inferidos por hashtags de KF y familias de operadores)
    const mods = detectModules();
    if (mods.length) b.push(para('Módulos IBP identificados: ' + mods.join(', ') + '.', { spacingAfter: 120 }));

    b.push(heading('1.1 Cifras clave', 2));
    const kf = sec('KEYFIGURES');
    const kfStats = kf ? kfClassify() : null;
    const rows = [];
    if (kf) rows.push(['Key Figures', String(kf.rows.length),
      (kfStats ? (kfStats.stored + ' almacenadas · ' + kfStats.calc + ' calculadas · ' + kfStats.helper + ' helper · ' + kfStats.alert + ' alerta') : '')]);
    const pl = distinctPlanningLevels();
    if (pl != null) rows.push(['Planning Levels', String(pl), 'niveles de planificación']);
    const mdt = distinctMDT();
    if (mdt != null) rows.push(['Master Data Types', String(mdt.count), mdt.attrs + ' atributos definidos']);
    if (sec('PA_ATTRIBUTES')) rows.push(['Atributos del PA', String(sec('PA_ATTRIBUTES').rows.length), '']);
    if (sec('ATTRIBUTES_AS_KEYFIGURE')) rows.push(['Atributos como Key Figure', String(sec('ATTRIBUTES_AS_KEYFIGURE').rows.length), '']);
    if (sec('OPERATORS')) rows.push(['Operadores / perfiles', String(sec('OPERATORS').rows.length), String(operatorCategories().length) + ' categorías']);
    if (sec('SNAPSHOTS')) rows.push(['Snapshots (asignaciones)', String(sec('SNAPSHOTS').rows.length), '']);
    if (sec('VERSIONS')) rows.push(['Versiones (registros KF)', String(sec('VERSIONS').rows.length), '']);
    const tp = getLike(gi, 'Time Profile');
    if (tp) rows.push(['Perfil de tiempo', tp, '']);
    b.push(table(['Objeto', 'Cantidad', 'Detalle'], rows, { headerFill: '1F3864', fontSize: 10 }));
    b.push(pageBreak());
    return b;
  }

  function bGeneral() {
    const b = [heading('2. Configuración general', 1)];
    const gi = objs('GENERAL_INFO')[0];
    if (gi) {
      b.push(heading('2.1 Información general', 2));
      b.push(kvTable(Object.keys(gi).map(k => [k, get(gi, k)])));
    }
    const tp = objs('TIMEPROFILE');
    if (tp.length) {
      b.push(heading('2.2 Perfil de tiempo', 2));
      const cols = sec('TIMEPROFILE').header.filter(h => h);
      b.push(table(cols, tp.map(o => cols.map(c => get(o, c))), { fontSize: 9 }));
    }
    const ph = objs('PLANNING_HORIZONS');
    if (ph.length) {
      b.push(heading('2.3 Horizontes de planificación', 2));
      const cols = sec('PLANNING_HORIZONS').header.filter(h => h);
      b.push(table(cols, ph.map(o => cols.map(c => get(o, c))), { fontSize: 9 }));
    }
    b.push(pageBreak());
    return b;
  }

  function bMasterData() {
    const b = [heading('3. Modelo de datos maestros', 1)];
    const md = objs('MASTERDATATYPES');
    if (md.length) {
      // Agrupa por MDT
      const byMdt = {};
      md.forEach(o => {
        const id = getLike(o, 'Master Data Type ID');
        if (!byMdt[id]) byMdt[id] = { name: getLike(o, 'Name'), type: '', attrs: 0, used: 0 };
        // 'Type' aparece dos veces (MDT y atributo); el primero no vacío a nivel MDT
        const t = get(o, 'Type');
        if (t && !byMdt[id].type) byMdt[id].type = t;
        byMdt[id].attrs++;
        if (getLike(o, 'Used in Planning Area') === 'X') byMdt[id].used++;
      });
      b.push(heading('3.1 Master Data Types', 2));
      b.push(para('Se identifican ' + Object.keys(byMdt).length + ' tipos de datos maestros con ' + md.length + ' atributos en total.', { spacingAfter: 80 }));
      const rows = Object.keys(byMdt).sort().map(id =>
        [id, byMdt[id].name, byMdt[id].type, String(byMdt[id].attrs), String(byMdt[id].used)]);
      b.push(table(['ID', 'Nombre', 'Tipo', 'Atributos', 'En PA'], rows, { fontSize: 8 }));
    }
    const paa = objs('PA_ATTRIBUTES');
    if (paa.length) {
      b.push(heading('3.2 Atributos del Planning Area', 2));
      const cols = ['Master Data Type ID', 'Attribute ID', 'Planning Area Attribute Description', 'Data Type', 'Length', 'Attribute Category'];
      const rows = paa.map(o => cols.map(c => getLike(o, c)));
      b.push(table(['MDT', 'Atributo', 'Descripción', 'Tipo', 'Long.', 'Categoría'], rows, { fontSize: 8 }));
    }
    const aak = objs('ATTRIBUTES_AS_KEYFIGURE');
    if (aak.length) {
      b.push(heading('3.3 Atributos usados como Key Figure', 2));
      const cols = sec('ATTRIBUTES_AS_KEYFIGURE').header.filter(h => h);
      b.push(table(cols.map(shortHdr), aak.map(o => cols.map(c => get(o, c))), { fontSize: 8 }));
    }
    b.push(pageBreak());
    return b;
  }

  function bPlanningLevels() {
    const b = [heading('4. Planning Levels', 1)];
    const pl = objs('PLEVELS_ATTRS');
    if (!pl.length) { b.push(para('No provisto.', { italic: true })); b.push(pageBreak()); return b; }
    const byLvl = {};
    pl.forEach(o => {
      const lvl = getLike(o, 'Planning Level');
      if (!byLvl[lvl]) byLvl[lvl] = { descr: getLike(o, 'Description'), attrs: [] };
      const a = getLike(o, 'Attribute ID'); if (a) byLvl[lvl].attrs.push(a);
    });
    const names = Object.keys(byLvl).sort();
    b.push(para('El área define ' + names.length + ' niveles de planificación. Se listan con su descripción y el número de atributos que los componen.', { spacingAfter: 80 }));
    const rows = names.map(n => [n, byLvl[n].descr, String(byLvl[n].attrs.length),
      byLvl[n].attrs.slice(0, 12).join(', ') + (byLvl[n].attrs.length > 12 ? ' …' : '')]);
    b.push(table(['Planning Level', 'Descripción', 'N.º attrs', 'Atributos (muestra)'], rows, { fontSize: 8 }));
    b.push(pageBreak());
    return b;
  }

  function bKeyFigures() {
    const b = [heading('5. Key Figures', 1)];
    const kf = objs('KEYFIGURES');
    if (!kf.length) { b.push(para('No provisto.', { italic: true })); b.push(pageBreak()); return b; }
    const st = kfClassify();
    b.push(heading('5.1 Clasificación', 2));
    b.push(table(['Clasificación', 'Cantidad'], [
      ['Total', String(kf.length)],
      ['Almacenadas (Stored)', String(st.stored)],
      ['Calculadas (Calculated)', String(st.calc)],
      ['Auxiliares (Helper)', String(st.helper)],
      ['De alerta (Alert)', String(st.alert)]
    ], { headerFill: '1F3864', fontSize: 10 }));

    // Distribución por nivel base (top)
    b.push(heading('5.2 Distribución por nivel base', 2));
    const byLvl = {};
    kf.forEach(o => { const l = getLike(o, 'Base Planning Level') || '(sin nivel)'; byLvl[l] = (byLvl[l] || 0) + 1; });
    const lvlRows = Object.entries(byLvl).sort((a, c) => c[1] - a[1]).slice(0, 20).map(e => [e[0], String(e[1])]);
    b.push(table(['Nivel base', 'N.º KF'], lvlRows, { fontSize: 9 }));

    b.push(pageBreak());
    return b;
  }

  function bVersions() {
    const b = [heading('6. Versiones del Planning Area', 1)];
    const v = objs('VERSIONS');
    if (!v.length) { b.push(para('No provisto.', { italic: true })); b.push(pageBreak()); return b; }
    const byV = {};
    v.forEach(o => { const id = getLike(o, 'ID') || '(baseline)'; byV[id] = (byV[id] || 0) + 1; });
    b.push(para('Se registran ' + v.length + ' definiciones de key figures específicas por versión.', { spacingAfter: 80 }));
    const rows = Object.entries(byV).sort((a, c) => c[1] - a[1]).map(e => [e[0], String(e[1])]);
    b.push(table(['Versión', 'N.º de key figures'], rows, { fontSize: 9 }));
    b.push(pageBreak());
    return b;
  }

  function bOperators() {
    const b = [heading('7. Operadores y procesos de planificación', 1)];
    const op = objs('OPERATORS');
    if (!op.length) { b.push(para('No provisto.', { italic: true })); b.push(pageBreak()); return b; }
    const typeCol = 'Operator Profile / Operator Type';
    const nameCol = 'Operator Profile Name / Operator Type Name';
    const byType = {};
    op.forEach(o => {
      const t = getLike(o, typeCol) || '(sin tipo)';
      const label = getLike(o, nameCol);
      if (!byType[t]) byType[t] = { label, items: [] };
      byType[t].items.push([getLike(o, 'Name'), getLike(o, 'Description')]);
    });
    b.push(para('Se identifican ' + op.length + ' operadores/perfiles en ' + Object.keys(byType).length + ' categorías.', { spacingAfter: 80 }));
    b.push(table(['Categoría (perfil)', 'Tipo', 'N.º'],
      Object.keys(byType).sort().map(t => [byType[t].label || t, t, String(byType[t].items.length)]),
      { headerFill: '1F3864', fontSize: 9 }));
    // Detalle por categoría
    Object.keys(byType).sort().forEach((t, i) => {
      b.push(heading('7.' + (i + 1) + ' ' + (byType[t].label || t), 2));
      b.push(table(['Nombre', 'Descripción'], byType[t].items, { fontSize: 8 }));
    });
    b.push(pageBreak());
    return b;
  }

  function bSnapshots() {
    const b = [heading('8. Snapshots', 1)];
    const sn = objs('SNAPSHOTS');
    if (!sn.length) { b.push(para('No provisto.', { italic: true })); b.push(pageBreak()); return b; }
    const cols = ['Name', 'Description', 'From Period', 'To Period', 'Number of Snapshots', 'Operator ID', 'Key Figure ID', 'Key Figure Name'];
    const rows = sn.map(o => cols.map(c => getLike(o, c)));
    b.push(table(['Perfil', 'Descripción', 'Desde', 'Hasta', 'N.º', 'Operador', 'KF ID', 'KF Nombre'], rows, { fontSize: 8 }));
    b.push(pageBreak());
    return b;
  }

  function bConversions() {
    const b = [heading('9. Conversiones de UM y moneda', 1)];
    const uom = sec('UOM_CONVERSIONS'), cur = sec('CURRENCY_CONVERSIONS');
    const uN = uom ? uom.rows.length : 0, cN = cur ? cur.rows.length : 0;
    if (uom && uN) {
      const cols = uom.header.filter(h => h);
      b.push(heading('9.1 Conversiones de unidad de medida', 2));
      b.push(table(cols.map(shortHdr), uom.objs.map(o => cols.map(c => get(o, c))), { fontSize: 8 }));
    } else b.push(para('No hay conversiones de unidad de medida configuradas en este Planning Area.', { italic: true, spacingAfter: 80 }));
    if (cur && cN) {
      const cols = cur.header.filter(h => h);
      b.push(heading('9.2 Conversiones de moneda', 2));
      b.push(table(cols.map(shortHdr), cur.objs.map(o => cols.map(c => get(o, c))), { fontSize: 8 }));
    } else b.push(para('No hay conversiones de moneda configuradas en este Planning Area.', { italic: true }));
    b.push(pageBreak());
    return b;
  }

  function bAnexoKF() {
    const b = [heading('Anexo A. Índice completo de Key Figures', 1)];
    const kf = objs('KEYFIGURES');
    if (!kf.length) { b.push(para('No provisto.', { italic: true })); return b; }
    b.push(para('Listado de las ' + kf.length + ' key figures con su nivel base, tipo, modo de agregación y expresión de cálculo.', { spacingAfter: 80 }));
    const rows = kf.map(o => [
      getLike(o, 'ID'),
      getLike(o, 'Name'),
      getLike(o, 'Base Planning Level'),
      (get(o, 'Stored Key Figure') === 'X' ? 'S' : '') + (get(o, 'Calculated Key Figure') === 'X' ? 'C' : ''),
      getLike(o, 'Aggregation Mode'),
      clip(getLike(o, 'Calculation Definitions'), 220)
    ]);
    b.push(table(['ID', 'Nombre', 'Nivel base', 'Tipo', 'Agregación', 'Definición de cálculo'], rows, { fontSize: 7 }));
    return b;
  }

  function bAnexoAttrs() {
    const b = [heading('Anexo B. Atributos por Master Data Type', 1)];
    const md = objs('MASTERDATATYPES');
    if (!md.length) { b.push(para('No provisto.', { italic: true })); return b; }
    const cols = ['Master Data Type ID', 'Attribute ID', 'Attribute Description', 'Data Type', 'Length', 'Key', 'Required', 'Referenced Master Data Type'];
    const rows = md.map(o => cols.map(c => getLike(o, c)));
    b.push(table(['MDT', 'Atributo', 'Descripción', 'Tipo', 'Long.', 'Key', 'Req.', 'Ref. MDT'], rows, { fontSize: 7 }));
    return b;
  }

  /* ── utilidades de análisis ─────────────────────────────────────────── */
  function kfClassify() {
    const kf = objs('KEYFIGURES');
    let stored = 0, calc = 0, helper = 0, alert = 0;
    kf.forEach(o => {
      if (get(o, 'Stored Key Figure') === 'X') stored++;
      if (get(o, 'Calculated Key Figure') === 'X') calc++;
      if (getLike(o, 'Helper Key Figure') === 'X') helper++;
      if (getLike(o, 'Alert Key Figure') === 'X') alert++;
    });
    return { stored, calc, helper, alert };
  }
  function distinctPlanningLevels() {
    const pl = objs('PLEVELS_ATTRS'); if (!pl.length) return null;
    const set = new Set(pl.map(o => getLike(o, 'Planning Level'))); return set.size;
  }
  function distinctMDT() {
    const md = objs('MASTERDATATYPES'); if (!md.length) return null;
    const set = new Set(md.map(o => getLike(o, 'Master Data Type ID'))); return { count: set.size, attrs: md.length };
  }
  function operatorCategories() {
    const op = objs('OPERATORS'); const set = new Set(op.map(o => getLike(o, 'Operator Profile / Operator Type'))); return [...set];
  }
  function detectModules() {
    const found = new Set();
    objs('KEYFIGURES').forEach(o => {
      const h = getLike(o, 'Hashtags');
      (h.match(/#([A-Z]+)/g) || []).forEach(t => {
        const m = t.slice(1);
        if (['DP', 'DS', 'IO', 'SOP', 'SNP'].includes(m)) found.add(m);
      });
    });
    const map = { DP: 'Demand Planning', DS: 'Demand Sensing', IO: 'Inventory Optimization', SOP: 'S&OP', SNP: 'Supply Planning' };
    return [...found].map(m => map[m] || m);
  }
  function shortHdr(h) { return String(h).replace(/Planning Area Attribute/i, 'Attr').replace(/Master Data Type/i, 'MDT'); }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ══════════════════════════════════════════════════════════════════════
     6. IMAGEN (logo)
     ══════════════════════════════════════════════════════════════════════ */
  const EMU = 9525; // EMU por pixel
  function drawingLogo() {
    if (!padLogo) return '';
    const maxW = 240; // px, escala manteniendo proporción
    const scale = Math.min(1, maxW / padLogo.w);
    const cx = Math.round(padLogo.w * scale * EMU);
    const cy = Math.round(padLogo.h * scale * EMU);
    return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
      '<wp:docPr id="1" name="LogoCliente"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="1" name="LogoCliente"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline>' +
      '</w:drawing></w:r></w:p>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. ENSAMBLADO DEL PAQUETE .docx
     ══════════════════════════════════════════════════════════════════════ */

  const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    styleHeading(1, 'heading 1', 32, '1F3864', 240, true) +
    styleHeading(2, 'heading 2', 26, '2E74B5', 200, true) +
    styleHeading(3, 'heading 3', 22, '2E74B5', 160, true) +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/>' +
    '<w:tblPr><w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(x => '<w:' + x + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>').join('') +
    '</w:tblBorders></w:tblPr></w:style>' +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    '</w:styles>';

  function styleHeading(level, name, sizeHalfPt, color, spaceBefore, bold) {
    return '<w:style w:type="paragraph" w:styleId="Heading' + level + '">' +
      '<w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="' + spaceBefore + '" w:after="80"/><w:outlineLvl w:val="' + (level - 1) + '"/></w:pPr>' +
      '<w:rPr>' + (bold ? '<w:b/>' : '') + '<w:color w:val="' + color + '"/><w:sz w:val="' + sizeHalfPt + '"/></w:rPr></w:style>';
  }

  const SETTINGS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:updateFields w:val="true"/></w:settings>';

  function buildDocumentXml(bodyBlocks) {
    const sectPr = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>' +
      '<w:cols w:space="720"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<w:body>' + bodyBlocks.join('') + sectPr + '</w:body></w:document>';
  }

  function buildBody(meta) {
    let body = [];
    const add = arr => { body = body.concat(arr); };
    add(bCover(meta));
    add(bToc());
    add(bResumen());
    add(bGeneral());
    add(bMasterData());
    add(bPlanningLevels());
    add(bKeyFigures());
    add(bVersions());
    add(bOperators());
    add(bSnapshots());
    add(bConversions());
    add(bAnexoKF());
    add(bAnexoAttrs());
    return body;
  }

  // Construye el ArrayBuffer del .docx. meta = {cliente, autor, version, fecha}
  async function buildDocxBuffer(meta) {
    const zip = new _JSZip();

    zip.file('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      (padLogo ? '<Default Extension="' + (padLogo.ext === 'jpeg' ? 'jpeg' : 'png') + '" ContentType="image/' + padLogo.ext + '"/>' : '') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '</Types>');

    zip.file('_rels/.rels',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>');

    let docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>';
    if (padLogo) {
      const imgName = 'logo.' + (padLogo.ext === 'jpeg' ? 'jpeg' : 'png');
      docRels += '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + imgName + '"/>';
      zip.file('word/media/' + imgName, padLogo.b64, { base64: true });
    }
    docRels += '</Relationships>';
    zip.file('word/_rels/document.xml.rels', docRels);

    zip.file('word/styles.xml', STYLES_XML);
    zip.file('word/settings.xml', SETTINGS_XML);
    zip.file('word/document.xml', buildDocumentXml(buildBody(meta)));

    return await zip.generateAsync({ type: (typeof window !== 'undefined' ? 'arraybuffer' : 'nodebuffer'), compression: 'DEFLATE' });
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. ENTRADA DESDE LA UI
     ══════════════════════════════════════════════════════════════════════ */
  async function generate() {
    if (typeof document === 'undefined') return;
    const logEl = document.getElementById('padoc-log');
    if (!Object.keys(padData).length) { if (logEl) log(logEl, 'err','Carga primero los CSV del Download Configuration File.'); return; }
    const meta = {
      cliente: (document.getElementById('padoc-cliente') || {}).value || '',
      autor: (document.getElementById('padoc-autor') || {}).value || '',
      version: (document.getElementById('padoc-version') || {}).value || '1.0',
      fecha: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    const btn = document.getElementById('padoc-gen-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando…'; }
    try {
      if (logEl) log(logEl, 'info', 'Construyendo documento…');
      const buf = await buildDocxBuffer(meta);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      a.download = 'Documentacion_PA_' + (padPaId || 'IBP') + '_' + new Date().toISOString().slice(0, 10) + '.docx';
      a.click();
      URL.revokeObjectURL(a.href);
      if (logEl) log(logEl, 'ok', 'Documento generado y descargado.');
    } catch (e) {
      if (logEl) log(logEl, 'err','Error al generar: ' + e.message);
      console.error('[PADoc]', e);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📝 Generar documento Word'; }
    }
  }

  // Inicializa el drop zone al cargar (si el DOM está presente).
  function init() {
    if (typeof document === 'undefined') return;
    const dz = document.getElementById('padoc-dz');
    const fi = document.getElementById('padoc-fi');
    if (dz && fi) {
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); addFiles([...e.dataTransfer.files]); });
      fi.addEventListener('change', e => addFiles([...e.target.files]));
    }
    const logoFi = document.getElementById('padoc-logo-fi');
    if (logoFi) logoFi.addEventListener('change', e => setLogoFile(e.target.files[0]));
    renderStatus();
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  // API pública + internos para test en Node.
  return {
    addFiles, setLogoFile, generate, reset,
    _test: { ingestCsvText, buildDocxBuffer, parseCSV, detectSection, get state() { return { padData, padPaId }; } }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PADoc;
