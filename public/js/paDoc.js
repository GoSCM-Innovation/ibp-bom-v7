/* ════════════════════════════════════════════════════════════════════════
   PA Documenter — Documentación del Planning Area (SAP IBP) en Word (.docx)

   Toma los CSV del "Download Configuration File" de un Planning Area de
   SAP IBP y genera un documento .docx (OOXML WordprocessingML) construido
   de forma nativa con JSZip — mismo patrón que la generación de .xlsx del
   módulo Doc Generator (docs.js). Sin dependencias CDN nuevas.

   - Contenido bilingüe (es/en): sigue el idioma configurado en la app (I18n).
   - Prosa explicativa por sección + tablas de datos + anexos exhaustivos.
   - Logo del cliente (subido en la UI) + logo GoSCM embebido en la portada.

   Fase 1 (este archivo): 100% offline, a partir de los CSV.
   Fase 2 (pendiente): enriquecimiento en vivo (SAP_COM_0720 volumetría de
   datos, SAP_COM_0326 procesos/Application Jobs).

   Namespace: PADoc (IIFE).
   ════════════════════════════════════════════════════════════════════════ */
const PADoc = (function () {
  'use strict';

  const _JSZip = (typeof JSZip !== 'undefined') ? JSZip
    : (typeof require !== 'undefined' ? require('jszip') : null);

  const KNOWN_SECTIONS = [
    'ATTRIBUTES_AS_KEYFIGURE', 'CURRENCY_CONVERSIONS', 'PLANNING_HORIZONS',
    'MASTERDATATYPES', 'PLEVELS_ATTRS', 'PA_ATTRIBUTES', 'UOM_CONVERSIONS',
    'GENERAL_INFO', 'TIMEPROFILE', 'KEYFIGURES', 'OPERATORS', 'SNAPSHOTS', 'VERSIONS'
  ];

  let padData = {};   // { SECTION: { header:[], rows:[[...]], objs:[{}], file } }
  let padPaId = '';
  let padLogo = null;    // logo cliente  { b64, ext, w, h }
  let padGoscm = null;   // logo GoSCM    { b64, ext, w, h }

  /* ══════════════════════════════════════════════════════════════════════
     0. IDIOMA / DICCIONARIO DEL DOCUMENTO
     ══════════════════════════════════════════════════════════════════════ */
  function L() { return (typeof I18n !== 'undefined' && I18n.getLang) ? I18n.getLang() : 'es'; }

  const T = {
    es: {
      docTitle: 'Documentación del Planning Area',
      subtitle: 'SAP Integrated Business Planning',
      genBy: 'Generado con GoSCM · PA Documenter',
      metaClient: 'Cliente', metaPA: 'Planning Area', metaAuthor: 'Autor',
      metaVersion: 'Versión del documento', metaDate: 'Fecha de generación', metaGen: 'Generado con',
      toc: 'Tabla de contenido',
      tocHint: 'Abra el documento en Word y actualice este campo (clic derecho → Actualizar campos) para ver la tabla de contenido.',
      colField: 'Campo', colValue: 'Valor', colObject: 'Objeto', colQty: 'Cantidad', colDetail: 'Detalle',
      notProvided: 'No provisto en los archivos cargados.',

      s1: '1. Resumen ejecutivo',
      s1intro: 'Un Planning Area (área de planificación) es el contenedor central del modelo de SAP IBP: define los niveles de planificación, los atributos de datos maestros, las key figures (indicadores), las versiones de escenario y los procesos que operan sobre el plan. Este documento describe la configuración del área {pa}, extraída del Download Configuration File.',
      s1mods: 'Módulos de SAP IBP identificados en la configuración: {mods}.',
      s1figs: '1.1 Cifras clave',
      s1figsIntro: 'Resumen cuantitativo de los principales objetos configurados en el área.',

      s2: '2. Configuración general',
      s2gi: '2.1 Información general',
      s2giIntro: 'Parámetros globales del área: si tiene planificación de suministro habilitada, historial de cambios, key figures de orden, y el perfil de tiempo asociado.',
      s2tp: '2.2 Perfil de tiempo',
      s2tpIntro: 'El perfil de tiempo define los niveles temporales sobre los que se planifica (día, semana, mes, trimestre, año) y el nivel al que se almacenan los datos. Determina la granularidad temporal de todas las key figures.',
      s2ph: '2.3 Horizontes de planificación',
      s2phIntro: 'Ventana de visualización por defecto hacia el pasado y el futuro en cada nivel temporal.',

      s3: '3. Modelo de datos maestros',
      s3intro: 'Los Master Data Types (tipos de datos maestros) describen los objetos del negocio sobre los que se planifica: productos, ubicaciones, clientes, recursos, fuentes de aprovisionamiento, etc. Pueden ser Simple (tabla propia), Reference (referencia a otro tipo) o Compound (combinación de varios).',
      s3mdt: '3.1 Master Data Types',
      s3mdtIntro: 'Se identifican {n} tipos de datos maestros con {a} atributos en total. La columna "En PA" indica cuántos atributos de cada tipo están activos en esta área.',
      s3attr: '3.2 Atributos del Planning Area',
      s3attrIntro: 'Atributos habilitados en el área, con su tipo de dato, longitud y categoría. Los atributos son las dimensiones por las que se puede desglosar y filtrar la información.',
      s3aak: '3.3 Atributos usados como Key Figure',
      s3aakIntro: 'Atributos de datos maestros que se exponen como key figures (por ejemplo lead times o costos), permitiendo usarlos en cálculos y planificación como si fueran indicadores.',

      s4: '4. Planning Levels',
      s4intro: 'Un Planning Level (nivel de planificación) es una combinación de atributos que define la granularidad a la que se almacena o calcula una key figure (por ejemplo Producto × Ubicación × Cliente × Semana). El área define {n} niveles; se listan con su descripción y los atributos que los componen.',

      s5: '5. Key Figures',
      s5intro: 'Una Key Figure es un indicador cuantitativo del plan (demanda, pronóstico, inventario, capacidad, etc.). Puede ser almacenada (Stored, guarda valores) o calculada (Calculated, se deriva de otras mediante una expresión). Las helper son auxiliares de cálculo y las alert generan alertas. Cada key figure tiene un nivel base, modos de agregación/desagregación y, si es calculada, una definición de cálculo.',
      s5cls: '5.1 Clasificación',
      s5clsColA: 'Clasificación', s5clsColB: 'Cantidad',
      s5cTotal: 'Total', s5cStored: 'Almacenadas (Stored)', s5cCalc: 'Calculadas (Calculated)',
      s5cHelper: 'Auxiliares (Helper)', s5cAlert: 'De alerta (Alert)',
      s5lvl: '5.2 Distribución por nivel base',
      s5lvlIntro: 'Número de key figures definidas en cada nivel de planificación (los 20 niveles con más key figures).',
      s5colLvl: 'Nivel base', s5colN: 'N.º KF',

      s6: '6. Versiones del Planning Area',
      s6intro: 'Las versiones permiten mantener escenarios alternativos del plan (base, optimista, pesimista, etc.). La versión base contiene el plan oficial; las versiones específicas pueden tener sus propios valores de key figures. Se registran {n} definiciones de key figures por versión.',
      s6colV: 'Versión', s6colN: 'N.º de key figures',

      s7: '7. Operadores y procesos de planificación',
      s7intro: 'Los operadores son los procesos que transforman los datos del área: copiar valores entre key figures (Copy), ejecutar modelos de pronóstico (Forecast), tomar capturas (Snapshot), correr el optimizador o la heurística de suministro (SCM), segmentar productos (ABC/XYZ), calcular lead times, etc. Se identifican {n} operadores en {c} categorías.',
      s7colCat: 'Categoría (perfil)', s7colType: 'Tipo', s7colN: 'N.º',
      s7colName: 'Nombre', s7colDescr: 'Descripción',

      s8: '8. Snapshots',
      s8intro: 'Un snapshot captura el valor de una o varias key figures en un momento dado, para poder comparar la evolución del plan a lo largo del tiempo (por ejemplo, medir el error de pronóstico por lag). Se documentan los perfiles configurados con sus key figures de entrada y salida.',

      s9: '9. Conversiones de UM y moneda',
      s9intro: 'Reglas de conversión entre unidades de medida y entre monedas usadas por las key figures del área.',
      s9uom: '9.1 Conversiones de unidad de medida', s9cur: '9.2 Conversiones de moneda',
      s9noUom: 'No hay conversiones de unidad de medida configuradas en este Planning Area.',
      s9noCur: 'No hay conversiones de moneda configuradas en este Planning Area.',

      anexoA: 'Anexo A. Índice completo de Key Figures',
      anexoAintro: 'Listado de las {n} key figures con su nivel base, tipo, modo de agregación y expresión de cálculo.',
      anexoAcols: ['ID', 'Nombre', 'Nivel base', 'Tipo', 'Agregación', 'Definición de cálculo'],
      anexoB: 'Anexo B. Atributos por Master Data Type',
      anexoBintro: 'Detalle de todos los atributos de cada tipo de dato maestro, con su tipo, longitud, si es clave, si es obligatorio y la referencia a otros tipos.',
      anexoBcols: ['MDT', 'Atributo', 'Descripción', 'Tipo', 'Long.', 'Key', 'Req.', 'Ref. MDT'],
      s3mdtCols: ['ID', 'Nombre', 'Tipo', 'Atributos', 'En PA'],
      s3attrCols: ['MDT', 'Atributo', 'Descripción', 'Tipo', 'Long.', 'Categoría'],
      s4cols: ['Planning Level', 'Descripción', 'N.º attrs', 'Atributos (muestra)'],
      s8cols: ['Perfil', 'Descripción', 'Desde', 'Hasta', 'N.º', 'Operador', 'KF ID', 'KF Nombre']
    },
    en: {
      docTitle: 'Planning Area Documentation',
      subtitle: 'SAP Integrated Business Planning',
      genBy: 'Generated with GoSCM · PA Documenter',
      metaClient: 'Customer', metaPA: 'Planning Area', metaAuthor: 'Author',
      metaVersion: 'Document version', metaDate: 'Generation date', metaGen: 'Generated with',
      toc: 'Table of contents',
      tocHint: 'Open the document in Word and update this field (right-click → Update field) to display the table of contents.',
      colField: 'Field', colValue: 'Value', colObject: 'Object', colQty: 'Count', colDetail: 'Detail',
      notProvided: 'Not provided in the loaded files.',

      s1: '1. Executive summary',
      s1intro: 'A Planning Area is the central container of the SAP IBP model: it defines the planning levels, master data attributes, key figures, scenario versions and the processes that operate on the plan. This document describes the configuration of area {pa}, extracted from the Download Configuration File.',
      s1mods: 'SAP IBP modules identified in the configuration: {mods}.',
      s1figs: '1.1 Key figures at a glance',
      s1figsIntro: 'Quantitative summary of the main objects configured in the area.',

      s2: '2. General configuration',
      s2gi: '2.1 General information',
      s2giIntro: 'Global area parameters: whether supply planning and change history are enabled, order key figures, and the associated time profile.',
      s2tp: '2.2 Time profile',
      s2tpIntro: 'The time profile defines the time levels used for planning (day, week, month, quarter, year) and the storage level. It determines the time granularity of every key figure.',
      s2ph: '2.3 Planning horizons',
      s2phIntro: 'Default display window into the past and future for each time level.',

      s3: '3. Master data model',
      s3intro: 'Master Data Types describe the business objects being planned: products, locations, customers, resources, supply sources, etc. They can be Simple (own table), Reference (points to another type) or Compound (combination of several).',
      s3mdt: '3.1 Master Data Types',
      s3mdtIntro: '{n} master data types are identified with {a} attributes in total. The "In PA" column shows how many attributes of each type are active in this area.',
      s3attr: '3.2 Planning Area attributes',
      s3attrIntro: 'Attributes enabled in the area, with their data type, length and category. Attributes are the dimensions used to break down and filter the information.',
      s3aak: '3.3 Attributes used as Key Figure',
      s3aakIntro: 'Master data attributes exposed as key figures (for example lead times or costs), so they can be used in calculations and planning as if they were measures.',

      s4: '4. Planning Levels',
      s4intro: 'A Planning Level is a combination of attributes that defines the granularity at which a key figure is stored or calculated (for example Product × Location × Customer × Week). The area defines {n} levels; they are listed with their description and composing attributes.',

      s5: '5. Key Figures',
      s5intro: 'A Key Figure is a quantitative measure of the plan (demand, forecast, inventory, capacity, etc.). It can be Stored (holds values) or Calculated (derived from others via an expression). Helper key figures assist calculations and Alert ones raise alerts. Each key figure has a base level, aggregation/disaggregation modes and, if calculated, a calculation definition.',
      s5cls: '5.1 Classification',
      s5clsColA: 'Classification', s5clsColB: 'Count',
      s5cTotal: 'Total', s5cStored: 'Stored', s5cCalc: 'Calculated',
      s5cHelper: 'Helper', s5cAlert: 'Alert',
      s5lvl: '5.2 Distribution by base level',
      s5lvlIntro: 'Number of key figures defined at each planning level (top 20 levels).',
      s5colLvl: 'Base level', s5colN: 'KF count',

      s6: '6. Planning Area versions',
      s6intro: 'Versions allow keeping alternative scenarios of the plan (base, upside, downside, etc.). The base version holds the official plan; version-specific ones may have their own key figure values. {n} version-specific key figure definitions are recorded.',
      s6colV: 'Version', s6colN: 'Key figure count',

      s7: '7. Operators and planning processes',
      s7intro: 'Operators are the processes that transform the area data: copying values between key figures (Copy), running forecast models (Forecast), taking snapshots (Snapshot), running the supply optimizer or heuristic (SCM), segmenting products (ABC/XYZ), computing lead times, etc. {n} operators are identified in {c} categories.',
      s7colCat: 'Category (profile)', s7colType: 'Type', s7colN: 'Count',
      s7colName: 'Name', s7colDescr: 'Description',

      s8: '8. Snapshots',
      s8intro: 'A snapshot captures the value of one or more key figures at a point in time, to compare how the plan evolves (for example, measuring forecast error by lag). The configured profiles are documented with their input and output key figures.',

      s9: '9. UoM and currency conversions',
      s9intro: 'Conversion rules between units of measure and between currencies used by the area key figures.',
      s9uom: '9.1 Unit of measure conversions', s9cur: '9.2 Currency conversions',
      s9noUom: 'No unit of measure conversions are configured in this Planning Area.',
      s9noCur: 'No currency conversions are configured in this Planning Area.',

      anexoA: 'Appendix A. Full Key Figure index',
      anexoAintro: 'List of the {n} key figures with their base level, type, aggregation mode and calculation expression.',
      anexoAcols: ['ID', 'Name', 'Base level', 'Type', 'Aggregation', 'Calculation definition'],
      anexoB: 'Appendix B. Attributes by Master Data Type',
      anexoBintro: 'Detail of every attribute of each master data type, with its type, length, whether it is a key, whether it is required, and the reference to other types.',
      anexoBcols: ['MDT', 'Attribute', 'Description', 'Type', 'Len.', 'Key', 'Req.', 'Ref. MDT'],
      s3mdtCols: ['ID', 'Name', 'Type', 'Attributes', 'In PA'],
      s3attrCols: ['MDT', 'Attribute', 'Description', 'Type', 'Len.', 'Category'],
      s4cols: ['Planning Level', 'Description', '# attrs', 'Attributes (sample)'],
      s8cols: ['Profile', 'Description', 'From', 'To', 'Count', 'Operator', 'KF ID', 'KF Name']
    }
  };
  function tr(key) { const d = T[L()] || T.es; return d[key] !== undefined ? d[key] : (T.es[key] !== undefined ? T.es[key] : key); }
  function trf(key, vars) {
    let s = tr(key);
    if (typeof s === 'string' && vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. PARSING DE CSV
     ══════════════════════════════════════════════════════════════════════ */
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
  function cleanHeader(h) { return String(h || '').replace(/^﻿/, '').trim(); }
  function detectSection(filename) {
    const up = String(filename || '').toUpperCase();
    for (const s of KNOWN_SECTIONS) {
      const re = new RegExp('(^|_)' + s + '(_|\\.|$)');
      if (re.test(up)) return s;
    }
    return null;
  }
  function paFromName(filename) {
    const base = String(filename || '').replace(/\.[^.]*$/, '');
    const m = base.match(/^([A-Za-z0-9]+)_/);
    return m ? m[1] : '';
  }
  function toObjects(header, rows) {
    return rows.map(r => { const o = {}; header.forEach((h, i) => { o[h] = (r[i] !== undefined ? r[i] : ''); }); return o; });
  }
  function ingestCsvText(filename, text) {
    const section = detectSection(filename);
    if (!section) return null;
    const raw = parseCSV(text);
    if (!raw.length) return section;
    const header = raw[0].map(cleanHeader);
    const rows = raw.slice(1).filter(r => r.some(c => c && c.trim() !== ''));
    padData[section] = { header, rows, objs: toObjects(header, rows), file: filename };
    if (!padPaId) {
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
      r.onload = () => resolve(r.result); r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });
  }
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
            const s = ingestCsvText(n.split('/').pop(), txt);
            if (logEl && s) log(logEl, 'ok', 'ZIP → ' + s);
          }
        } else if (/\.csv$/i.test(name)) {
          const txt = await readFileText(f);
          const s = ingestCsvText(name, txt);
          if (logEl) log(logEl, s ? 'ok' : 'warn', s ? ('Detectado: ' + s) : ('No reconocido: ' + name));
        }
      } catch (e) { if (logEl) log(logEl, 'err', 'Error con ' + name + ': ' + e.message); }
    }
    renderStatus();
  }
  function blobToB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  }
  function imgDims(dataUrl, fw, fh) {
    return new Promise((res) => { const img = new Image(); img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => res({ w: fw, h: fh }); img.src = dataUrl; });
  }
  async function setLogoFile(file) {
    if (!file) { padLogo = null; renderStatus(); return; }
    const ext = (file.name.match(/\.(png|jpe?g)$/i) || [, 'png'])[1].toLowerCase();
    const b64 = await blobToB64(file);
    const dims = await imgDims('data:image/' + ext + ';base64,' + b64, 200, 80);
    padLogo = { b64, ext: ext.indexOf('jp') === 0 ? 'jpeg' : 'png', w: dims.w || 200, h: dims.h || 80 };
    renderStatus();
  }
  async function loadAsset(url) {
    try {
      const resp = await fetch(url); if (!resp.ok) return null;
      const blob = await resp.blob();
      const b64 = await blobToB64(blob);
      const ext = (blob.type.indexOf('jpeg') >= 0 || /\.jpe?g$/i.test(url)) ? 'jpeg' : 'png';
      const dims = await imgDims('data:image/' + ext + ';base64,' + b64, 300, 120);
      return { b64, ext, w: dims.w || 300, h: dims.h || 120 };
    } catch (e) { return null; }
  }

  function renderStatus() {
    const box = document.getElementById('padoc-status');
    if (!box) return;
    const rowsFor = s => padData[s] ? padData[s].rows.length : null;
    const items = KNOWN_SECTIONS.slice().sort().map(s => {
      const n = rowsFor(s); const ok = n !== null;
      const cnt = ok ? (n + ' filas') : 'no provisto';
      return '<div class="padoc-chk ' + (ok ? 'on' : 'off') + '"><span>' + (ok ? '✓' : '·') + '</span> ' + escH(s) + ' <em>' + escH(cnt) + '</em></div>';
    }).join('');
    const paLine = padPaId ? ('<b>Planning Area:</b> ' + escH(padPaId)) : '<span class="padoc-muted">Sin PA detectado aún</span>';
    const logoLine = padLogo ? ('· Logo cargado (' + padLogo.w + '×' + padLogo.h + ')') : '';
    box.innerHTML = '<div class="padoc-status-head">' + paLine + ' ' + escH(logoLine) + '</div><div class="padoc-chk-grid">' + items + '</div>';
    const btn = document.getElementById('padoc-gen-btn');
    if (btn) btn.disabled = Object.keys(padData).length === 0;
  }
  function reset() {
    padData = {}; padPaId = ''; padLogo = null;
    const l = document.getElementById('padoc-log'); if (l) l.innerHTML = '';
    const fi = document.getElementById('padoc-fi'); if (fi) fi.value = '';
    renderStatus();
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. HELPERS OOXML
     ══════════════════════════════════════════════════════════════════════ */
  function xesc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function runs(text, rPr) {
    const rpr = rPr ? ('<w:rPr>' + rPr + '</w:rPr>') : '';
    const parts = String(text == null ? '' : text).split(/\r?\n/);
    return parts.map((p, i) => '<w:r>' + rpr + (i > 0 ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + xesc(p) + '</w:t></w:r>').join('');
  }
  function para(text, opts) {
    opts = opts || {};
    const pPrParts = [];
    if (opts.style) pPrParts.push('<w:pStyle w:val="' + opts.style + '"/>');
    if (opts.spacingAfter != null) pPrParts.push('<w:spacing w:after="' + opts.spacingAfter + '"/>');
    if (opts.align) pPrParts.push('<w:jc w:val="' + opts.align + '"/>');
    const pPr = pPrParts.length ? ('<w:pPr>' + pPrParts.join('') + '</w:pPr>') : '';
    let rPr = '';
    if (opts.bold) rPr += '<w:b/>';
    if (opts.italic) rPr += '<w:i/>';
    if (opts.color) rPr += '<w:color w:val="' + opts.color + '"/>';
    if (opts.size) rPr += '<w:sz w:val="' + (opts.size * 2) + '"/>';
    return '<w:p>' + pPr + runs(text, rPr || null) + '</w:p>';
  }
  // Párrafo explicativo estándar (prosa de sección).
  function prose(text) { return para(text, { spacingAfter: 120 }); }
  function heading(text, level) { return '<w:p><w:pPr><w:pStyle w:val="Heading' + level + '"/></w:pPr>' + runs(text) + '</w:p>'; }
  function pageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
  function emptyPara() { return '<w:p/>'; }

  function table(headerCells, dataRows, opts) {
    opts = opts || {};
    const fs = opts.fontSize || 9;
    const fill = opts.headerFill || 'E8622A';
    const nCols = headerCells.length;
    const colW = Math.floor(5000 / nCols);
    const grid = '<w:tblGrid>' + headerCells.map(() => '<w:gridCol w:w="' + Math.floor(9350 / nCols) + '"/>').join('') + '</w:tblGrid>';
    function cell(content, isHeader) {
      const shd = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' : '';
      const tcPr = '<w:tcPr><w:tcW w:w="' + colW + '" w:type="pct"/>' + shd + '</w:tcPr>';
      const rPr = (isHeader ? '<w:b/><w:color w:val="FFFFFF"/>' : '') + '<w:sz w:val="' + (fs * 2) + '"/>';
      return '<w:tc>' + tcPr + '<w:p><w:pPr><w:spacing w:after="20"/></w:pPr>' + runs(content, rPr) + '</w:p></w:tc>';
    }
    const headerRow = '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + headerCells.map(h => cell(h, true)).join('') + '</w:tr>';
    const body = dataRows.map(r => '<w:tr>' + headerCells.map((_, i) => cell(r[i] !== undefined ? r[i] : '', false)).join('') + '</w:tr>').join('');
    const borders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>').join('') + '</w:tblBorders>';
    return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/>' + borders +
      '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>' +
      grid + headerRow + body + '</w:tbl>' + emptyPara();
  }
  function kvTable(pairs, opts) {
    return table([tr('colField'), tr('colValue')], pairs.map(p => [p[0], p[1]]), Object.assign({ headerFill: '1F3864' }, opts || {}));
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. ACCESO A DATOS
     ══════════════════════════════════════════════════════════════════════ */
  function sec(name) { return padData[name] || null; }
  function objs(name) { const s = padData[name]; return s ? s.objs : []; }
  function get(o, col) { return o && o[col] !== undefined ? str(o[col]) : ''; }
  function getLike(o, needle) {
    if (!o) return '';
    const keys = Object.keys(o);
    let k = keys.find(x => x.toLowerCase() === needle.toLowerCase());
    if (!k) k = keys.find(x => x.toLowerCase().includes(needle.toLowerCase()));
    return k ? str(o[k]) : '';
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. BUILDERS POR SECCIÓN
     ══════════════════════════════════════════════════════════════════════ */
  function bCover(meta) {
    const b = [];
    if (padLogo) b.push(drawing('rIdLogo', padLogo, 240));
    b.push(para(meta.cliente || tr('metaClient'), { align: 'center', bold: true, size: 20, color: 'E8622A', spacingAfter: 120 }));
    b.push(para(tr('docTitle'), { align: 'center', size: 26, bold: true, color: '1F3864', spacingAfter: 40 }));
    b.push(para(padPaId || 'SAP IBP', { align: 'center', size: 30, bold: true, color: '1F3864', spacingAfter: 200 }));
    const gi = objs('GENERAL_INFO')[0];
    if (gi) b.push(para(getLike(gi, 'Description'), { align: 'center', italic: true, size: 13, spacingAfter: 240 }));
    b.push(para(tr('subtitle'), { align: 'center', size: 12, color: '808080', spacingAfter: 240 }));
    b.push(kvTable([
      [tr('metaClient'), meta.cliente || ''],
      [tr('metaPA'), padPaId || ''],
      [tr('metaAuthor'), meta.autor || ''],
      [tr('metaVersion'), meta.version || '1.0'],
      [tr('metaDate'), meta.fecha],
      [tr('metaGen'), 'GoSCM · PA Documenter']
    ]));
    if (padGoscm) { b.push(emptyPara()); b.push(drawing('rIdGoscm', padGoscm, 150)); }
    b.push(para(tr('genBy'), { align: 'center', size: 9, color: '808080' }));
    b.push(pageBreak());
    return b;
  }

  function bToc() {
    return [
      heading(tr('toc'), 1),
      '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
      '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>' +
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r>' +
      '<w:r><w:t xml:space="preserve">' + xesc(tr('tocHint')) + '</w:t></w:r>' +
      '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>',
      pageBreak()
    ];
  }

  function bResumen() {
    const b = [heading(tr('s1'), 1)];
    b.push(prose(trf('s1intro', { pa: padPaId ? ('“' + padPaId + '”') : '' })));
    const mods = detectModules();
    if (mods.length) b.push(prose(trf('s1mods', { mods: mods.join(', ') })));
    b.push(heading(tr('s1figs'), 2));
    b.push(prose(tr('s1figsIntro')));
    const kf = sec('KEYFIGURES'); const st = kf ? kfClassify() : null;
    const rows = [];
    if (kf) rows.push(['Key Figures', String(kf.rows.length), st ? (st.stored + ' stored · ' + st.calc + ' calc · ' + st.helper + ' helper · ' + st.alert + ' alert') : '']);
    const pl = distinctPlanningLevels(); if (pl != null) rows.push(['Planning Levels', String(pl), '']);
    const mdt = distinctMDT(); if (mdt != null) rows.push(['Master Data Types', String(mdt.count), mdt.attrs + ' attrs']);
    if (sec('PA_ATTRIBUTES')) rows.push([tr('s3attr').replace(/^3\.2 /, ''), String(sec('PA_ATTRIBUTES').rows.length), '']);
    if (sec('OPERATORS')) rows.push(['Operators', String(sec('OPERATORS').rows.length), operatorCategories().length + ' cat.']);
    if (sec('SNAPSHOTS')) rows.push(['Snapshots', String(sec('SNAPSHOTS').rows.length), '']);
    if (sec('VERSIONS')) rows.push(['Versions (KF)', String(sec('VERSIONS').rows.length), '']);
    const gi = objs('GENERAL_INFO')[0]; const tp = gi ? getLike(gi, 'Time Profile') : '';
    if (tp) rows.push([tr('s2tp').replace(/^2\.2 /, ''), tp, '']);
    b.push(table([tr('colObject'), tr('colQty'), tr('colDetail')], rows, { headerFill: '1F3864', fontSize: 10 }));
    b.push(pageBreak());
    return b;
  }

  function bGeneral() {
    const b = [heading(tr('s2'), 1)];
    const gi = objs('GENERAL_INFO')[0];
    if (gi) { b.push(heading(tr('s2gi'), 2)); b.push(prose(tr('s2giIntro'))); b.push(kvTable(Object.keys(gi).map(k => [k, get(gi, k)]))); }
    const tp = objs('TIMEPROFILE');
    if (tp.length) { b.push(heading(tr('s2tp'), 2)); b.push(prose(tr('s2tpIntro'))); const cols = sec('TIMEPROFILE').header.filter(h => h); b.push(table(cols, tp.map(o => cols.map(c => get(o, c))), { fontSize: 9 })); }
    const ph = objs('PLANNING_HORIZONS');
    if (ph.length) { b.push(heading(tr('s2ph'), 2)); b.push(prose(tr('s2phIntro'))); const cols = sec('PLANNING_HORIZONS').header.filter(h => h); b.push(table(cols, ph.map(o => cols.map(c => get(o, c))), { fontSize: 9 })); }
    b.push(pageBreak());
    return b;
  }

  function bMasterData() {
    const b = [heading(tr('s3'), 1)];
    b.push(prose(tr('s3intro')));
    const md = objs('MASTERDATATYPES');
    if (md.length) {
      const byMdt = {};
      md.forEach(o => {
        const id = getLike(o, 'Master Data Type ID');
        if (!byMdt[id]) byMdt[id] = { name: getLike(o, 'Name'), type: '', attrs: 0, used: 0 };
        const t = get(o, 'Type'); if (t && !byMdt[id].type) byMdt[id].type = t;
        byMdt[id].attrs++; if (getLike(o, 'Used in Planning Area') === 'X') byMdt[id].used++;
      });
      b.push(heading(tr('s3mdt'), 2));
      b.push(prose(trf('s3mdtIntro', { n: Object.keys(byMdt).length, a: md.length })));
      const rows = Object.keys(byMdt).sort().map(id => [id, byMdt[id].name, byMdt[id].type, String(byMdt[id].attrs), String(byMdt[id].used)]);
      b.push(table(tr('s3mdtCols'), rows, { fontSize: 8 }));
    }
    const paa = objs('PA_ATTRIBUTES');
    if (paa.length) {
      b.push(heading(tr('s3attr'), 2)); b.push(prose(tr('s3attrIntro')));
      const cols = ['Master Data Type ID', 'Attribute ID', 'Planning Area Attribute Description', 'Data Type', 'Length', 'Attribute Category'];
      b.push(table(tr('s3attrCols'), paa.map(o => cols.map(c => getLike(o, c))), { fontSize: 8 }));
    }
    const aak = objs('ATTRIBUTES_AS_KEYFIGURE');
    if (aak.length) {
      b.push(heading(tr('s3aak'), 2)); b.push(prose(tr('s3aakIntro')));
      const cols = sec('ATTRIBUTES_AS_KEYFIGURE').header.filter(h => h);
      b.push(table(cols.map(shortHdr), aak.map(o => cols.map(c => get(o, c))), { fontSize: 8 }));
    }
    b.push(pageBreak());
    return b;
  }

  function bPlanningLevels() {
    const b = [heading(tr('s4'), 1)];
    const pl = objs('PLEVELS_ATTRS');
    if (!pl.length) { b.push(prose(tr('notProvided'))); b.push(pageBreak()); return b; }
    const byLvl = {};
    pl.forEach(o => { const lvl = getLike(o, 'Planning Level'); if (!byLvl[lvl]) byLvl[lvl] = { descr: getLike(o, 'Description'), attrs: [] }; const a = getLike(o, 'Attribute ID'); if (a) byLvl[lvl].attrs.push(a); });
    const names = Object.keys(byLvl).sort();
    b.push(prose(trf('s4intro', { n: names.length })));
    const rows = names.map(n => [n, byLvl[n].descr, String(byLvl[n].attrs.length), byLvl[n].attrs.slice(0, 12).join(', ') + (byLvl[n].attrs.length > 12 ? ' …' : '')]);
    b.push(table(tr('s4cols'), rows, { fontSize: 8 }));
    b.push(pageBreak());
    return b;
  }

  function bKeyFigures() {
    const b = [heading(tr('s5'), 1)];
    const kf = objs('KEYFIGURES');
    if (!kf.length) { b.push(prose(tr('notProvided'))); b.push(pageBreak()); return b; }
    b.push(prose(tr('s5intro')));
    const st = kfClassify();
    b.push(heading(tr('s5cls'), 2));
    b.push(table([tr('s5clsColA'), tr('s5clsColB')], [
      [tr('s5cTotal'), String(kf.length)], [tr('s5cStored'), String(st.stored)], [tr('s5cCalc'), String(st.calc)],
      [tr('s5cHelper'), String(st.helper)], [tr('s5cAlert'), String(st.alert)]
    ], { headerFill: '1F3864', fontSize: 10 }));
    b.push(heading(tr('s5lvl'), 2));
    b.push(prose(tr('s5lvlIntro')));
    const byLvl = {};
    kf.forEach(o => { const l = getLike(o, 'Base Planning Level') || '(—)'; byLvl[l] = (byLvl[l] || 0) + 1; });
    const lvlRows = Object.entries(byLvl).sort((a, c) => c[1] - a[1]).slice(0, 20).map(e => [e[0], String(e[1])]);
    b.push(table([tr('s5colLvl'), tr('s5colN')], lvlRows, { fontSize: 9 }));
    b.push(pageBreak());
    return b;
  }

  function bVersions() {
    const b = [heading(tr('s6'), 1)];
    const v = objs('VERSIONS');
    if (!v.length) { b.push(prose(tr('notProvided'))); b.push(pageBreak()); return b; }
    const byV = {};
    v.forEach(o => { const id = getLike(o, 'ID') || '(baseline)'; byV[id] = (byV[id] || 0) + 1; });
    b.push(prose(trf('s6intro', { n: v.length })));
    const rows = Object.entries(byV).sort((a, c) => c[1] - a[1]).map(e => [e[0], String(e[1])]);
    b.push(table([tr('s6colV'), tr('s6colN')], rows, { fontSize: 9 }));
    b.push(pageBreak());
    return b;
  }

  function bOperators() {
    const b = [heading(tr('s7'), 1)];
    const op = objs('OPERATORS');
    if (!op.length) { b.push(prose(tr('notProvided'))); b.push(pageBreak()); return b; }
    const typeCol = 'Operator Profile / Operator Type', nameCol = 'Operator Profile Name / Operator Type Name';
    const byType = {};
    op.forEach(o => { const t = getLike(o, typeCol) || '(—)'; const label = getLike(o, nameCol); if (!byType[t]) byType[t] = { label, items: [] }; byType[t].items.push([getLike(o, 'Name'), getLike(o, 'Description')]); });
    b.push(prose(trf('s7intro', { n: op.length, c: Object.keys(byType).length })));
    b.push(table([tr('s7colCat'), tr('s7colType'), tr('s7colN')], Object.keys(byType).sort().map(t => [byType[t].label || t, t, String(byType[t].items.length)]), { headerFill: '1F3864', fontSize: 9 }));
    Object.keys(byType).sort().forEach((t, i) => {
      b.push(heading('7.' + (i + 1) + ' ' + (byType[t].label || t), 2));
      b.push(table([tr('s7colName'), tr('s7colDescr')], byType[t].items, { fontSize: 8 }));
    });
    b.push(pageBreak());
    return b;
  }

  function bSnapshots() {
    const b = [heading(tr('s8'), 1)];
    const sn = objs('SNAPSHOTS');
    if (!sn.length) { b.push(prose(tr('notProvided'))); b.push(pageBreak()); return b; }
    b.push(prose(tr('s8intro')));
    const cols = ['Name', 'Description', 'From Period', 'To Period', 'Number of Snapshots', 'Operator ID', 'Key Figure ID', 'Key Figure Name'];
    b.push(table(tr('s8cols'), sn.map(o => cols.map(c => getLike(o, c))), { fontSize: 8 }));
    b.push(pageBreak());
    return b;
  }

  function bConversions() {
    const b = [heading(tr('s9'), 1)];
    b.push(prose(tr('s9intro')));
    const uom = sec('UOM_CONVERSIONS'), cur = sec('CURRENCY_CONVERSIONS');
    if (uom && uom.rows.length) { const cols = uom.header.filter(h => h); b.push(heading(tr('s9uom'), 2)); b.push(table(cols.map(shortHdr), uom.objs.map(o => cols.map(c => get(o, c))), { fontSize: 8 })); }
    else b.push(prose(tr('s9noUom')));
    if (cur && cur.rows.length) { const cols = cur.header.filter(h => h); b.push(heading(tr('s9cur'), 2)); b.push(table(cols.map(shortHdr), cur.objs.map(o => cols.map(c => get(o, c))), { fontSize: 8 })); }
    else b.push(prose(tr('s9noCur')));
    b.push(pageBreak());
    return b;
  }

  function bAnexoKF() {
    const b = [heading(tr('anexoA'), 1)];
    const kf = objs('KEYFIGURES');
    if (!kf.length) { b.push(prose(tr('notProvided'))); return b; }
    b.push(prose(trf('anexoAintro', { n: kf.length })));
    const rows = kf.map(o => [
      getLike(o, 'ID'), getLike(o, 'Name'), getLike(o, 'Base Planning Level'),
      (get(o, 'Stored Key Figure') === 'X' ? 'S' : '') + (get(o, 'Calculated Key Figure') === 'X' ? 'C' : ''),
      getLike(o, 'Aggregation Mode'), clip(getLike(o, 'Calculation Definitions'), 220)
    ]);
    b.push(table(tr('anexoAcols'), rows, { fontSize: 7 }));
    return b;
  }
  function bAnexoAttrs() {
    const b = [heading(tr('anexoB'), 1)];
    const md = objs('MASTERDATATYPES');
    if (!md.length) { b.push(prose(tr('notProvided'))); return b; }
    b.push(prose(tr('anexoBintro')));
    const cols = ['Master Data Type ID', 'Attribute ID', 'Attribute Description', 'Data Type', 'Length', 'Key', 'Required', 'Referenced Master Data Type'];
    b.push(table(tr('anexoBcols'), md.map(o => cols.map(c => getLike(o, c))), { fontSize: 7 }));
    return b;
  }

  /* ── análisis ────────────────────────────────────────────────────────── */
  function kfClassify() {
    const kf = objs('KEYFIGURES'); let stored = 0, calc = 0, helper = 0, alert = 0;
    kf.forEach(o => {
      if (get(o, 'Stored Key Figure') === 'X') stored++;
      if (get(o, 'Calculated Key Figure') === 'X') calc++;
      if (getLike(o, 'Helper Key Figure') === 'X') helper++;
      if (getLike(o, 'Alert Key Figure') === 'X') alert++;
    });
    return { stored, calc, helper, alert };
  }
  function distinctPlanningLevels() { const pl = objs('PLEVELS_ATTRS'); if (!pl.length) return null; return new Set(pl.map(o => getLike(o, 'Planning Level'))).size; }
  function distinctMDT() { const md = objs('MASTERDATATYPES'); if (!md.length) return null; return { count: new Set(md.map(o => getLike(o, 'Master Data Type ID'))).size, attrs: md.length }; }
  function operatorCategories() { return [...new Set(objs('OPERATORS').map(o => getLike(o, 'Operator Profile / Operator Type')))]; }
  function detectModules() {
    const found = new Set();
    objs('KEYFIGURES').forEach(o => { (getLike(o, 'Hashtags').match(/#([A-Z]+)/g) || []).forEach(t => { const m = t.slice(1); if (['DP', 'DS', 'IO', 'SOP', 'SNP'].includes(m)) found.add(m); }); });
    const map = { DP: 'Demand Planning', DS: 'Demand Sensing', IO: 'Inventory Optimization', SOP: 'S&OP', SNP: 'Supply Planning' };
    return [...found].map(m => map[m] || m);
  }
  function shortHdr(h) { return String(h).replace(/Planning Area Attribute/i, 'Attr').replace(/Master Data Type/i, 'MDT'); }
  function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* ══════════════════════════════════════════════════════════════════════
     6. IMAGEN
     ══════════════════════════════════════════════════════════════════════ */
  const EMU = 9525;
  function drawing(rId, img, maxW) {
    if (!img) return '';
    const scale = Math.min(1, maxW / img.w);
    const cx = Math.round(img.w * scale * EMU), cy = Math.round(img.h * scale * EMU);
    return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="' + (rId === 'rIdGoscm' ? 2 : 1) + '" name="' + rId + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + (rId === 'rIdGoscm' ? 2 : 1) + '" name="' + rId + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. ENSAMBLADO .docx
     ══════════════════════════════════════════════════════════════════════ */
  const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    styleHeading(1, 'heading 1', 32, '1F3864') + styleHeading(2, 'heading 2', 26, '2E74B5') + styleHeading(3, 'heading 3', 22, '2E74B5') +
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(x => '<w:' + x + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>').join('') +
    '</w:tblBorders></w:tblPr></w:style></w:styles>';
  function styleHeading(level, name, sizeHalfPt, color) {
    return '<w:style w:type="paragraph" w:styleId="Heading' + level + '"><w:name w:val="' + name + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>' +
      '<w:pPr><w:keepNext/><w:spacing w:before="' + (level === 1 ? 240 : level === 2 ? 200 : 160) + '" w:after="80"/><w:outlineLvl w:val="' + (level - 1) + '"/></w:pPr>' +
      '<w:rPr><w:b/><w:color w:val="' + color + '"/><w:sz w:val="' + sizeHalfPt + '"/></w:rPr></w:style>';
  }
  const SETTINGS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:updateFields w:val="true"/></w:settings>';

  function buildDocumentXml(bodyBlocks) {
    const sectPr = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' +
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + bodyBlocks.join('') + sectPr + '</w:body></w:document>';
  }
  function buildBody(meta) {
    let body = [];
    const add = a => { body = body.concat(a); };
    add(bCover(meta)); add(bToc()); add(bResumen()); add(bGeneral()); add(bMasterData());
    add(bPlanningLevels()); add(bKeyFigures()); add(bVersions()); add(bOperators());
    add(bSnapshots()); add(bConversions()); add(bAnexoKF()); add(bAnexoAttrs());
    return body;
  }

  async function buildDocxBuffer(meta) {
    const zip = new _JSZip();
    const imgs = [];
    if (padLogo) imgs.push({ rId: 'rIdLogo', name: 'logo_cliente.' + padLogo.ext, img: padLogo });
    if (padGoscm) imgs.push({ rId: 'rIdGoscm', name: 'logo_goscm.' + padGoscm.ext, img: padGoscm });
    const exts = [...new Set(imgs.map(i => i.img.ext))];

    zip.file('[Content_Types].xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      exts.map(e => '<Default Extension="' + e + '" ContentType="image/' + e + '"/>').join('') +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>');

    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');

    let docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>';
    imgs.forEach(im => {
      docRels += '<Relationship Id="' + im.rId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + im.name + '"/>';
      zip.file('word/media/' + im.name, im.img.b64, { base64: true });
    });
    docRels += '</Relationships>';
    zip.file('word/_rels/document.xml.rels', docRels);

    zip.file('word/styles.xml', STYLES_XML);
    zip.file('word/settings.xml', SETTINGS_XML);
    zip.file('word/document.xml', buildDocumentXml(buildBody(meta)));

    return await zip.generateAsync({ type: (typeof window !== 'undefined' ? 'arraybuffer' : 'nodebuffer'), compression: 'DEFLATE' });
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. UI
     ══════════════════════════════════════════════════════════════════════ */
  async function generate() {
    if (typeof document === 'undefined') return;
    const logEl = document.getElementById('padoc-log');
    if (!Object.keys(padData).length) { if (logEl) log(logEl, 'err', 'Carga primero los CSV del Download Configuration File.'); return; }
    const meta = {
      cliente: (document.getElementById('padoc-cliente') || {}).value || '',
      autor: (document.getElementById('padoc-autor') || {}).value || '',
      version: (document.getElementById('padoc-version') || {}).value || '1.0',
      fecha: new Date().toLocaleDateString(L() === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    const btn = document.getElementById('padoc-gen-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ …'; }
    try {
      if (!padGoscm) padGoscm = await loadAsset('logo-goscm.png');   // marca GoSCM embebida
      if (logEl) log(logEl, 'info', 'Construyendo documento (' + L() + ')…');
      const buf = await buildDocxBuffer(meta);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      a.download = 'Documentacion_PA_' + (padPaId || 'IBP') + '_' + new Date().toISOString().slice(0, 10) + '.docx';
      a.click(); URL.revokeObjectURL(a.href);
      if (logEl) log(logEl, 'ok', 'Documento generado y descargado.');
    } catch (e) {
      if (logEl) log(logEl, 'err', 'Error al generar: ' + e.message);
      console.error('[PADoc]', e);
    } finally { if (btn) { btn.disabled = false; btn.textContent = '📝 Generar documento Word'; } }
  }

  function init() {
    if (typeof document === 'undefined') return;
    const dz = document.getElementById('padoc-dz'), fi = document.getElementById('padoc-fi');
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

  return {
    addFiles, setLogoFile, generate, reset,
    _test: { ingestCsvText, buildDocxBuffer, parseCSV, detectSection, setLogos: (c, g) => { padLogo = c; padGoscm = g; }, get state() { return { padData, padPaId }; } }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PADoc;
