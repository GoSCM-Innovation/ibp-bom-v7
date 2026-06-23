/* ════════════════════════════════════════════════════════════════
   statsSheet.js — Hoja "Estadísticas" para ambos analizadores.

   Estadística DESCRIPTIVA del dato: composición, distribución,
   cobertura, cardinalidades, lead times. NO repite la hoja Resumen
   (que entrega veredictos —Alertas/Advertencias/OK, health, network
   status— y totales por hoja).

   Compatible con StreamingXlsx (_Sheet): usa ws.addRow + row.eachCell.
   El cuerpo solo admite relleno gris/amarillo/rojo; la fila 1 de cada
   hoja sale con estilo de encabezado dorado automáticamente.

   Carga: después de runSummary.js y api.js, antes de
   analyzer.js / prodAnalyzer.js (acceso a globales str, efGetExtraHeaders,
   idbCursorEach, I18n).

   API:
     StatsSheet.sheetName()        → nombre de hoja traducido
     StatsSheet.buildPA(ws, ctx)   → llena la hoja para Production Hierarchy (síncrono)
     StatsSheet.buildSN(ws, ctx)   → llena la hoja para Supply Network (async, lee IDB)
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── i18n inline (texto original ES → EN) ── */
  var _EN = {
    'Estadísticas': 'Statistics',
    'TOTAL': 'TOTAL',
    'Total': 'Total',
    'Valor': 'Value',
    'Métrica': 'Metric',
    '% del total': '% of total',
    '% maestro': '% of master',
    'Productos': 'Products',
    '(sin tipo)': '(no type)',
    '(sin LOCTYPE)': '(no LOCTYPE)',
    '(vacío)': '(blank)',
    'Otros': 'Others',
    'Registros': 'Records',
    'Distribución de': 'Distribution of',
    'Tipo de material': 'Material type',
    'Ubicaciones': 'Locations',
    'SOURCEIDs': 'SOURCEIDs',
    'CRUCES POR CAMPOS ADICIONALES': 'CROSS-TABS BY ADDITIONAL FIELDS',
    'No se seleccionaron campos adicionales. Agrégalos en el paso "Campos adicionales" para ver cruces aquí.':
      'No additional fields selected. Add them in the "Additional fields" step to see cross-tabs here.',
    // ── PA ──
    'PRODUCTO — Composición del maestro por tipo de material':
      'PRODUCT — Master composition by material type',
    'Solo output (PSH)': 'Output only (PSH)',
    'Solo componente (PSI)': 'Component only (PSI)',
    'Output + componente': 'Output + component',
    'Sin uso en estructura': 'No use in structure',
    'RECETAS — Tipo de fuente (SOURCETYPE)': 'RECIPES — Source type (SOURCETYPE)',
    'Tipo de fuente': 'Source type',
    'Primario (P)': 'Primary (P)',
    'Solo co-producto (C)': 'Co-product only (C)',
    'RECETAS — Tamaño de BOM (componentes por receta)':
      'RECIPES — BOM size (components per recipe)',
    'Componentes por receta': 'Components per recipe',
    'Recetas': 'Recipes',
    '0 (BOM vacío)': '0 (empty BOM)',
    'Métrica de BOM': 'BOM metric',
    'Promedio de componentes por receta': 'Average components per recipe',
    'Promedio en recetas con BOM': 'Average in recipes with BOM',
    'Máximo de componentes en una receta': 'Max components in one recipe',
    'RECETAS — Lead time de producción (PLEADTIME)':
      'RECIPES — Production lead time (PLEADTIME)',
    'PLEADTIME (días)': 'PLEADTIME (days)',
    '0 / no definido': '0 / undefined',
    'Promedio (definidos > 0)': 'Average (defined > 0)',
    'RECETAS — Multi-fuente y sustitutos': 'RECIPES — Multi-source and substitutes',
    'Combinaciones producto-planta con múltiples recetas':
      'Product-plant combinations with multiple recipes',
    '% de combinaciones multi-receta': '% of multi-recipe combinations',
    'Recetas con componentes sustitutos (ISALTITEM=X)':
      'Recipes with substitute components (ISALTITEM=X)',
    'Componentes marcados como sustituto': 'Components flagged as substitute',
    'UBICACIONES — Composición por tipo (LOCTYPE)':
      'LOCATIONS — Composition by type (LOCTYPE)',
    'UBICACIONES — Producción por planta': 'LOCATIONS — Production by plant',
    'Plantas que fabrican (con PSH)': 'Plants that manufacture (with PSH)',
    '% sobre total de ubicaciones': '% of total locations',
    'Productos distintos fabricados': 'Distinct products manufactured',
    'Recetas (SOURCEIDs) totales': 'Total recipes (SOURCEIDs)',
    'Promedio de recetas por planta': 'Average recipes per plant',
    'Promedio de productos distintos por planta': 'Average distinct products per plant',
    'Máximo de recetas en una planta': 'Max recipes in one plant',
    'UBICACIONES — Distribución de recetas por planta': 'LOCATIONS — Recipe distribution per plant',
    'Recetas por planta': 'Recipes per plant',
    'Plantas': 'Plants',
    'RECURSOS — Uso en producción': 'RESOURCES — Use in production',
    'Recursos en el maestro': 'Resources in master',
    'Recursos usados en PSR': 'Resources used in PSR',
    'Recursos sin uso en PSR (ociosos)': 'Resources unused in PSR (idle)',
    'Promedio de recursos por receta': 'Average resources per recipe',
    'Recetas sin recurso asignado': 'Recipes without assigned resource',
    // ── SN ──
    'PRODUCTO — Cobertura en la red': 'PRODUCT — Network coverage',
    'Presencia': 'Presence',
    'Con producción propia (PSH)': 'With own production (PSH)',
    'Como componente (PSI)': 'As component (PSI)',
    'En Location Source': 'In Location Source',
    'En Customer Source': 'In Customer Source',
    'En Location Product': 'In Location Product',
    'En Customer Product': 'In Customer Product',
    'Sin actividad en la red': 'No network activity',
    'UBICACIONES — Presencia en la red': 'LOCATIONS — Network presence',
    'Con producción (PSH)': 'With production (PSH)',
    'Con transferencias (Location Source)': 'With transfers (Location Source)',
    'Con entrega a cliente (Customer Source)': 'With customer delivery (Customer Source)',
    'Habilitadas en Location Product': 'Enabled in Location Product',
    'UBICACIONES — Conectividad': 'LOCATIONS — Connectivity',
    'Ubicaciones origen (Location Source)': 'Origin locations (Location Source)',
    'Ubicaciones destino (Location Source)': 'Destination locations (Location Source)',
    'Promedio de productos por ubicación origen': 'Average products per origin location',
    'Máximo de productos en una ubicación origen': 'Max products in one origin location',
    'ARCOS — Transferencias (Location Source)': 'ARCS — Transfers (Location Source)',
    'Arcos de transferencia': 'Transfer arcs',
    'Orígenes distintos (LOCFR)': 'Distinct origins (LOCFR)',
    'Destinos distintos (LOCID)': 'Distinct destinations (LOCID)',
    'Productos transferidos': 'Transferred products',
    'TLEADTIME promedio (días)': 'Average TLEADTIME (days)',
    'Destinos producto-planta con múltiples orígenes':
      'Product-plant destinations with multiple origins',
    'ARCOS — Distribución de TLEADTIME': 'ARCS — TLEADTIME distribution',
    'TLEADTIME (días)': 'TLEADTIME (days)',
    'Arcos': 'Arcs',
    'CLIENTES — Entrega (Customer Source)': 'CUSTOMERS — Delivery (Customer Source)',
    'Clientes en el maestro': 'Customers in master',
    'Clientes con arco de entrega': 'Customers with delivery arc',
    'Arcos de entrega': 'Delivery arcs',
    'Productos entregados a cliente': 'Products delivered to customer',
    'CLEADTIME promedio (días)': 'Average CLEADTIME (days)',
    'CLIENTES — Distribución de CLEADTIME': 'CUSTOMERS — CLEADTIME distribution',
    'CLEADTIME (días)': 'CLEADTIME (days)',
    'UBICACIONES — Distribución de productos por origen': 'LOCATIONS — Product distribution per origin',
    'Productos por origen': 'Products per origin',
    'Ubicaciones origen': 'Origin locations',
    'CLIENTES — Distribución por nº de productos': 'CUSTOMERS — Distribution by number of products',
    'Productos por cliente': 'Products per customer',
    'Clientes': 'Customers'
  };
  function T(s) {
    return (global.I18n && I18n.getLang() === 'en' && _EN[s]) ? _EN[s] : s;
  }

  /* str global de utils.js; fallback defensivo */
  function S(v) {
    if (typeof str === 'function') return str(v);
    return v == null ? '' : String(v).trim();
  }

  /* ── Rellenos admitidos en cuerpo (ver StreamingXlsx) ── */
  var FILL_GRAY = 'FFE5E7EB';

  /* ── Primitivas de render sobre ws crudo (_Sheet) ── */
  function _fill(r, argb) {
    if (!argb) return;
    r.eachCell(function (cell) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } };
    });
  }
  function blank(ws) { ws.addRow([]); }
  function title(ws, text) { ws.addRow([text]); }            // fila 1 → estilo dorado
  function banner(ws, text) { _fill(ws.addRow([text]), FILL_GRAY); }
  function header(ws, cells) { _fill(ws.addRow(cells), FILL_GRAY); }
  function row(ws, cells, argb) { var r = ws.addRow(cells); if (argb) _fill(r, argb); }

  /* tabla = banner opcional + header + filas (+ línea en blanco final).
     Cada fila puede llevar ._fill para colorearse (p. ej. TOTAL en gris). */
  function table(ws, opts) {
    if (opts.banner)  banner(ws, opts.banner);
    if (opts.headers) header(ws, opts.headers);
    (opts.rows || []).forEach(function (rw) { row(ws, rw, rw && rw._fill); });
    blank(ws);
  }

  /* ── Helpers de cálculo ── */
  function pctStr(n, total) { return (total > 0 ? Math.round(n / total * 100) : 0) + '%'; }
  function nkeys(o) { return o ? Object.keys(o).length : 0; }
  function avg1(sum, n) { return n > 0 ? Math.round(sum / n * 10) / 10 : 0; }
  function objVals(o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); }
  function grayTotal(arr) { arr._fill = FILL_GRAY; return arr; }

  /* valores distintos de un campo en un set de registros → { valor: count } */
  function _valueCounts(recs, field) {
    var out = {};
    recs.forEach(function (r) {
      var v = S(r && r[field] != null ? r[field] : '');
      if (v === '') v = T('(vacío)');
      out[v] = (out[v] || 0) + 1;
    });
    return out;
  }

  /* tabla de frecuencia simple (campo de alta cardinalidad) */
  function renderFrequency(ws, recs, field, maxRows) {
    var counts = _valueCounts(recs, field);
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var total = recs.length;
    banner(ws, T('Distribución de') + ' ' + field);
    header(ws, [field, T('Registros'), T('% del total')]);
    var shown = keys.slice(0, maxRows);
    shown.forEach(function (k) { row(ws, [k, counts[k], pctStr(counts[k], total)]); });
    if (keys.length > maxRows) {
      var restN = 0;
      keys.slice(maxRows).forEach(function (k) { restN += counts[k]; });
      row(ws, [T('Otros') + ' (' + (keys.length - maxRows) + ')', restN, pctStr(restN, total)]);
    }
    blank(ws);
  }

  /* cruce campo extra × dimensión del maestro. El campo (puede ser de alta
     cardinalidad, p. ej. brand) va en FILAS; la dimensión chica (MATTYPEID /
     LOCTYPE) va en COLUMNAS. Ambas se acotan por frecuencia: filas top maxRows
     + "Otros", columnas top maxCols + "Otros". Así nunca se pierde el cruce ni
     se desborda el ancho. */
  function renderCrosstab(ws, recs, dimFn, dimLabel, field, maxRows, maxCols) {
    maxRows = maxRows || 30;
    maxCols = maxCols || 15;

    var fieldTot = {}, dimTot = {}, cell = {};
    recs.forEach(function (r) {
      var fv = S(r && r[field] != null ? r[field] : ''); if (fv === '') fv = T('(vacío)');
      var dv = dimFn(r);
      fieldTot[fv] = (fieldTot[fv] || 0) + 1;
      dimTot[dv] = (dimTot[dv] || 0) + 1;
      var k = fv + '\u0001' + dv;
      cell[k] = (cell[k] || 0) + 1;
    });

    var dimKeys = Object.keys(dimTot).sort(function (a, b) { return dimTot[b] - dimTot[a]; });
    var dimShown = dimKeys.slice(0, maxCols), dimRest = dimKeys.slice(maxCols), hasDimRest = dimRest.length > 0;
    var fieldKeys = Object.keys(fieldTot).sort(function (a, b) { return fieldTot[b] - fieldTot[a]; });
    var fieldShown = fieldKeys.slice(0, maxRows), fieldRest = fieldKeys.slice(maxRows), hasFieldRest = fieldRest.length > 0;

    function cnt(fv, dv) { return cell[fv + '\u0001' + dv] || 0; }

    banner(ws, field + ' × ' + dimLabel);
    var hdr = [field].concat(dimShown);
    if (hasDimRest) hdr.push(T('Otros'));
    hdr.push(T('Total'));
    header(ws, hdr);

    var colTot = {}, otrosCol = 0, grand = 0;
    dimShown.forEach(function (dv) { colTot[dv] = 0; });

    function emitRow(label, fvs) {
      var arr = [label], rt = 0;
      dimShown.forEach(function (dv) {
        var c = 0; fvs.forEach(function (fv) { c += cnt(fv, dv); });
        arr.push(c); colTot[dv] += c; rt += c;
      });
      if (hasDimRest) {
        var co = 0; fvs.forEach(function (fv) { dimRest.forEach(function (dv) { co += cnt(fv, dv); }); });
        arr.push(co); otrosCol += co; rt += co;
      }
      arr.push(rt); grand += rt;
      row(ws, arr);
    }

    fieldShown.forEach(function (fv) { emitRow(fv, [fv]); });
    if (hasFieldRest) emitRow(T('Otros') + ' (' + fieldRest.length + ')', fieldRest);

    var totArr = [T('Total')];
    dimShown.forEach(function (dv) { totArr.push(colTot[dv]); });
    if (hasDimRest) totArr.push(otrosCol);
    totArr.push(grand);
    row(ws, totArr, FILL_GRAY);
    blank(ws);
  }

  /* aplica cruces a todos los campos extra de una entidad.
     dimFn presente → cruce; ausente → frecuencia. Devuelve nº de campos. */
  function renderExtraFields(ws, opts) {
    var extra = (typeof efGetExtraHeaders === 'function')
      ? efGetExtraHeaders(opts.ns, opts.entity) : [];
    if (!extra.length) return 0;
    extra.forEach(function (f) {
      if (opts.dimFn) renderCrosstab(ws, opts.recs, opts.dimFn, opts.dimLabel, f);
      else renderFrequency(ws, opts.recs, f, 25);
    });
    return extra.length;
  }

  /* ════════════════════════════════════════════════════════════════
     PRODUCTION HIERARCHY (síncrono — datos en memoria)
     ════════════════════════════════════════════════════════════════ */
  function buildPA(ws, ctx) {
    var PRD = ctx.prd || {}, LOC = ctx.loc || {}, RES = ctx.res || {};
    var pshBySid    = ctx.pshBySid || {};
    var pshByPrdLoc = ctx.pshByPrdLoc || {};
    var pshPrdSetP  = ctx.pshPrdSetP || {};
    var psiPrdSet   = ctx.psiPrdSet || new Set();
    var psiBySid    = ctx.psiBySourceid || {};
    var psrBySid    = ctx.psrBySourceid || {};
    var psrResidSet = ctx.psrResidSet || new Set();
    var allPsi      = ctx.allPsi || [];
    function pm(id)  { var p = PRD[id] || {}; return S(p.MATTYPEID || ''); }
    function lct(id) { var l = LOC[id] || {}; return S(l.LOCTYPE || ''); }

    var prdIds = Object.keys(PRD), totalPrd = prdIds.length;
    var sidIds = Object.keys(pshBySid), totalSid = sidIds.length;

    title(ws, T('Estadísticas') + ' — Production Hierarchy');
    blank(ws);

    /* PRODUCT — composición por tipo de material */
    var byMt = {};
    prdIds.forEach(function (prd) {
      var mt = pm(prd) || T('(sin tipo)');
      if (!byMt[mt]) byMt[mt] = { n: 0, out: 0, comp: 0, both: 0, none: 0 };
      var isOut = !!pshPrdSetP[prd];
      var isComp = psiPrdSet.has ? psiPrdSet.has(prd) : false;
      byMt[mt].n++;
      if (isOut && isComp) byMt[mt].both++;
      else if (isOut) byMt[mt].out++;
      else if (isComp) byMt[mt].comp++;
      else byMt[mt].none++;
    });
    var tot = { n: 0, out: 0, comp: 0, both: 0, none: 0 };
    var mtRows = Object.keys(byMt).sort().map(function (mt) {
      var d = byMt[mt];
      tot.n += d.n; tot.out += d.out; tot.comp += d.comp; tot.both += d.both; tot.none += d.none;
      return [mt, d.n, d.out, d.comp, d.both, d.none, pctStr(d.n, totalPrd)];
    });
    mtRows.push(grayTotal([T('TOTAL'), tot.n, tot.out, tot.comp, tot.both, tot.none, pctStr(tot.n, totalPrd)]));
    table(ws, {
      banner: T('PRODUCTO — Composición del maestro por tipo de material'),
      headers: [T('Tipo de material'), T('Productos'), T('Solo output (PSH)'),
        T('Solo componente (PSI)'), T('Output + componente'), T('Sin uso en estructura'), T('% maestro')],
      rows: mtRows
    });

    /* RECETAS — tamaño de BOM */
    var nEmpty = 0, b15 = 0, b610 = 0, b1120 = 0, b21 = 0, sumComp = 0, maxComp = 0, withBom = 0;
    sidIds.forEach(function (sid) {
      var n = (psiBySid[sid] || []).length;
      sumComp += n; if (n > maxComp) maxComp = n;
      if (n === 0) nEmpty++;
      else { withBom++; if (n <= 5) b15++; else if (n <= 10) b610++; else if (n <= 20) b1120++; else b21++; }
    });
    table(ws, {
      banner: T('RECETAS — Tamaño de BOM (componentes por receta)'),
      headers: [T('Componentes por receta'), T('Recetas'), T('% del total')],
      rows: [
        [T('0 (BOM vacío)'), nEmpty, pctStr(nEmpty, totalSid)],
        ['1-5', b15, pctStr(b15, totalSid)],
        ['6-10', b610, pctStr(b610, totalSid)],
        ['11-20', b1120, pctStr(b1120, totalSid)],
        ['21+', b21, pctStr(b21, totalSid)],
        grayTotal([T('TOTAL'), totalSid, '100%'])
      ]
    });
    table(ws, {
      headers: [T('Métrica de BOM'), T('Valor')],
      rows: [
        [T('Promedio de componentes por receta'), avg1(sumComp, totalSid)],
        [T('Promedio en recetas con BOM'), avg1(sumComp, withBom)],
        [T('Máximo de componentes en una receta'), maxComp]
      ]
    });

    /* RECETAS — PLEADTIME */
    var pl0 = 0, pl15 = 0, pl615 = 0, pl16 = 0, plSum = 0, plN = 0;
    sidIds.forEach(function (sid) {
      var recs = pshBySid[sid] || [], prim = null;
      for (var i = 0; i < recs.length; i++) { if (recs[i].SOURCETYPE === 'P') { prim = recs[i]; break; } }
      if (!prim) prim = recs[0] || {};
      var n = parseFloat(S(prim.PLEADTIME || ''));
      if (!(n > 0)) pl0++;
      else { plSum += n; plN++; if (n <= 5) pl15++; else if (n <= 15) pl615++; else pl16++; }
    });
    table(ws, {
      banner: T('RECETAS — Lead time de producción (PLEADTIME)'),
      headers: [T('PLEADTIME (días)'), T('SOURCEIDs'), T('% del total')],
      rows: [
        [T('0 / no definido'), pl0, pctStr(pl0, totalSid)],
        ['1-5', pl15, pctStr(pl15, totalSid)],
        ['6-15', pl615, pctStr(pl615, totalSid)],
        ['16+', pl16, pctStr(pl16, totalSid)],
        [T('Promedio (definidos > 0)'), avg1(plSum, plN), '']
      ]
    });

    /* RECETAS — multi-fuente y sustitutos */
    var plKeys = Object.keys(pshByPrdLoc);
    var multi = plKeys.filter(function (k) { return pshByPrdLoc[k].length > 1; }).length;
    var subRecs = 0, subSids = {};
    allPsi.forEach(function (r) {
      if (S(r.ISALTITEM || '') === 'X') { subRecs++; subSids[S(r.SOURCEID)] = true; }
    });
    table(ws, {
      banner: T('RECETAS — Multi-fuente y sustitutos'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Combinaciones producto-planta con múltiples recetas'), multi],
        [T('% de combinaciones multi-receta'), pctStr(multi, plKeys.length)],
        [T('Recetas con componentes sustitutos (ISALTITEM=X)'), nkeys(subSids)],
        [T('Componentes marcados como sustituto'), subRecs]
      ]
    });

    /* UBICACIONES — LOCTYPE */
    var locIds = Object.keys(LOC), totalLoc = locIds.length, byLt = {};
    locIds.forEach(function (l) { var t = lct(l) || T('(sin LOCTYPE)'); byLt[t] = (byLt[t] || 0) + 1; });
    var ltRows = Object.keys(byLt).sort().map(function (t) { return [t, byLt[t], pctStr(byLt[t], totalLoc)]; });
    ltRows.push(grayTotal([T('TOTAL'), totalLoc, '100%']));
    table(ws, {
      banner: T('UBICACIONES — Composición por tipo (LOCTYPE)'),
      headers: ['LOCTYPE', T('Ubicaciones'), T('% del total')],
      rows: ltRows
    });

    /* UBICACIONES — producción por planta (deriva planta/producto de cada receta) */
    var recipesByPlant = {}, productsByPlant = {}, mfgProducts = {};
    sidIds.forEach(function (sid) {
      var recs = pshBySid[sid] || [], prim = null;
      for (var i = 0; i < recs.length; i++) { if (recs[i].SOURCETYPE === 'P') { prim = recs[i]; break; } }
      if (!prim) prim = recs[0] || {};
      var loc = S(prim.LOCID || ''), prd = S(prim.PRDID || '');
      if (loc) {
        recipesByPlant[loc] = (recipesByPlant[loc] || 0) + 1;
        if (prd) { (productsByPlant[loc] || (productsByPlant[loc] = {}))[prd] = true; }
      }
      if (prd) mfgProducts[prd] = true;
    });
    var plantKeys = Object.keys(recipesByPlant), nPlants = plantKeys.length;
    var maxRecipes = 0, sumProdPerPlant = 0;
    plantKeys.forEach(function (l) {
      if (recipesByPlant[l] > maxRecipes) maxRecipes = recipesByPlant[l];
      sumProdPerPlant += nkeys(productsByPlant[l]);
    });
    table(ws, {
      banner: T('UBICACIONES — Producción por planta'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Plantas que fabrican (con PSH)'), nPlants],
        [T('% sobre total de ubicaciones'), pctStr(nPlants, totalLoc)],
        [T('Productos distintos fabricados'), nkeys(mfgProducts)],
        [T('Recetas (SOURCEIDs) totales'), totalSid],
        [T('Promedio de recetas por planta'), avg1(totalSid, nPlants)],
        [T('Promedio de productos distintos por planta'), avg1(sumProdPerPlant, nPlants)],
        [T('Máximo de recetas en una planta'), maxRecipes]
      ]
    });
    var rp15 = 0, rp620 = 0, rp2150 = 0, rp51 = 0;
    plantKeys.forEach(function (l) {
      var n = recipesByPlant[l];
      if (n <= 5) rp15++; else if (n <= 20) rp620++; else if (n <= 50) rp2150++; else rp51++;
    });
    table(ws, {
      banner: T('UBICACIONES — Distribución de recetas por planta'),
      headers: [T('Recetas por planta'), T('Plantas'), T('% del total')],
      rows: [
        ['1-5', rp15, pctStr(rp15, nPlants)],
        ['6-20', rp620, pctStr(rp620, nPlants)],
        ['21-50', rp2150, pctStr(rp2150, nPlants)],
        ['51+', rp51, pctStr(rp51, nPlants)]
      ]
    });

    /* RECURSOS */
    var totalRes = Object.keys(RES).length;
    var usedRes = psrResidSet.size || 0;
    var psrSids = Object.keys(psrBySid), sumResPerRecipe = 0;
    psrSids.forEach(function (sid) { sumResPerRecipe += psrBySid[sid].length; });
    var sidsNoPsr = sidIds.filter(function (sid) { return !psrBySid[sid]; }).length;
    table(ws, {
      banner: T('RECURSOS — Uso en producción'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Recursos en el maestro'), totalRes],
        [T('Recursos usados en PSR'), usedRes],
        [T('Recursos sin uso en PSR (ociosos)'), Math.max(0, totalRes - usedRes)],
        [T('Promedio de recursos por receta'), avg1(sumResPerRecipe, psrSids.length)],
        [T('Recetas sin recurso asignado'), sidsNoPsr]
      ]
    });

    /* CRUCES por campos adicionales */
    banner(ws, T('CRUCES POR CAMPOS ADICIONALES'));
    blank(ws);
    var nX = 0;
    nX += renderExtraFields(ws, { ns: 'pa', entity: 'product', recs: objVals(PRD),
      dimLabel: T('Tipo de material'), dimFn: function (r) { return S(r.MATTYPEID || '') || T('(sin tipo)'); } });
    nX += renderExtraFields(ws, { ns: 'pa', entity: 'location', recs: objVals(LOC),
      dimLabel: 'LOCTYPE', dimFn: function (r) { return S(r.LOCTYPE || '') || T('(sin LOCTYPE)'); } });
    nX += renderExtraFields(ws, { ns: 'pa', entity: 'resource', recs: objVals(RES) });
    if (!nX) row(ws, [T('No se seleccionaron campos adicionales. Agrégalos en el paso "Campos adicionales" para ver cruces aquí.')]);
  }

  /* ════════════════════════════════════════════════════════════════
     SUPPLY NETWORK (async — arcos en IndexedDB vía cursor)
     ════════════════════════════════════════════════════════════════ */
  async function buildSN(ws, ctx) {
    var idx = ctx.idx || {};
    var prdLookup = idx.prdLookup || {}, locLookup = idx.locLookup || {}, custLookup = idx.custLookup || {};
    var pshPrds = idx.pshPrds || {}, psiCompPrds = idx.psiCompPrds || {};

    function cur(store, cb) {
      if (typeof idbCursorEach !== 'function') return Promise.resolve();
      return idbCursorEach(store, cb).catch(function () {});  // store ausente → ignora
    }
    function bucketLT(n, h) { if (!(n > 0)) h.z++; else if (n <= 5) h.a++; else if (n <= 15) h.b++; else h.c++; }

    var prdInLocSrc = {}, prdInCustSrc = {}, prdInLocProd = {}, prdInCustProd = {};
    var locInPSH = {}, locInLocSrc = {}, locInCustSrc = {}, locInLocProd = {};
    var origins = {}, dests = {}, originsPerDest = {}, locOriginPrds = {};
    var locSrcArcs = 0, custArcs = 0, custInCustSrc = {}, custPrds = {};
    var tlt = { z: 0, a: 0, b: 0, c: 0 }, tltSum = 0, tltN = 0;
    var clt = { z: 0, a: 0, b: 0, c: 0 }, cltSum = 0, cltN = 0;

    await cur('sn_loc', function (r) {
      var p = S(r.PRDID), fr = S(r.LOCFR), to = S(r.LOCID);
      locSrcArcs++;
      if (p) prdInLocSrc[p] = true;
      if (fr) { locInLocSrc[fr] = true; origins[fr] = true; if (p) { (locOriginPrds[fr] || (locOriginPrds[fr] = {}))[p] = true; } }
      if (to) { locInLocSrc[to] = true; dests[to] = true; }
      if (p && to) { var k = p + '|' + to; originsPerDest[k] = (originsPerDest[k] || 0) + 1; }
      var n = parseFloat(S(r.TLEADTIME || '')); bucketLT(n, tlt); if (n > 0) { tltSum += n; tltN++; }
    });
    await cur('sn_cust', function (r) {
      var p = S(r.PRDID), c = S(r.CUSTID);
      custArcs++;
      if (p) prdInCustSrc[p] = true;
      if (c) custInCustSrc[c] = true;
      if (c && p) { (custPrds[c] || (custPrds[c] = {}))[p] = true; }
      var n = parseFloat(S(r.CLEADTIME || '')); bucketLT(n, clt); if (n > 0) { cltSum += n; cltN++; }
    });
    await cur('sn_plant', function (r) { var l = S(r.LOCID); if (l) locInPSH[l] = true; });
    await cur('sn_loc_prod', function (r) { var l = S(r.LOCID), p = S(r.PRDID); if (p) prdInLocProd[p] = true; if (l) locInLocProd[l] = true; });
    await cur('sn_cust_prod', function (r) { var p = S(r.PRDID); if (p) prdInCustProd[p] = true; });

    var prdIds = Object.keys(prdLookup), totalPrd = prdIds.length;
    var locIds = Object.keys(locLookup), totalLoc = locIds.length;

    title(ws, T('Estadísticas') + ' — Supply Network');
    blank(ws);

    /* PRODUCT — cobertura en la red */
    var noActivity = 0;
    prdIds.forEach(function (p) {
      if (!pshPrds[p] && !psiCompPrds[p] && !prdInLocSrc[p] && !prdInCustSrc[p] && !prdInLocProd[p] && !prdInCustProd[p]) noActivity++;
    });
    table(ws, {
      banner: T('PRODUCTO — Cobertura en la red'),
      headers: [T('Presencia'), T('Productos'), T('% maestro')],
      rows: [
        [T('Con producción propia (PSH)'), nkeys(pshPrds), pctStr(nkeys(pshPrds), totalPrd)],
        [T('Como componente (PSI)'), nkeys(psiCompPrds), pctStr(nkeys(psiCompPrds), totalPrd)],
        [T('En Location Source'), nkeys(prdInLocSrc), pctStr(nkeys(prdInLocSrc), totalPrd)],
        [T('En Customer Source'), nkeys(prdInCustSrc), pctStr(nkeys(prdInCustSrc), totalPrd)],
        [T('En Location Product'), nkeys(prdInLocProd), pctStr(nkeys(prdInLocProd), totalPrd)],
        [T('En Customer Product'), nkeys(prdInCustProd), pctStr(nkeys(prdInCustProd), totalPrd)],
        [T('Sin actividad en la red'), noActivity, pctStr(noActivity, totalPrd)]
      ]
    });

    /* UBICACIONES — LOCTYPE */
    var byLt = {};
    locIds.forEach(function (l) { var t = S(locLookup[l].LOCTYPE || '') || T('(sin LOCTYPE)'); byLt[t] = (byLt[t] || 0) + 1; });
    var ltRows = Object.keys(byLt).sort().map(function (t) { return [t, byLt[t], pctStr(byLt[t], totalLoc)]; });
    ltRows.push(grayTotal([T('TOTAL'), totalLoc, '100%']));
    table(ws, {
      banner: T('UBICACIONES — Composición por tipo (LOCTYPE)'),
      headers: ['LOCTYPE', T('Ubicaciones'), T('% del total')],
      rows: ltRows
    });

    /* UBICACIONES — presencia en la red */
    var locNoAct = 0;
    locIds.forEach(function (l) {
      if (!locInPSH[l] && !locInLocSrc[l] && !locInCustSrc[l] && !locInLocProd[l]) locNoAct++;
    });
    table(ws, {
      banner: T('UBICACIONES — Presencia en la red'),
      headers: [T('Presencia'), T('Ubicaciones'), T('% del total')],
      rows: [
        [T('Con producción (PSH)'), nkeys(locInPSH), pctStr(nkeys(locInPSH), totalLoc)],
        [T('Con transferencias (Location Source)'), nkeys(locInLocSrc), pctStr(nkeys(locInLocSrc), totalLoc)],
        [T('Con entrega a cliente (Customer Source)'), nkeys(locInCustSrc), pctStr(nkeys(locInCustSrc), totalLoc)],
        [T('Habilitadas en Location Product'), nkeys(locInLocProd), pctStr(nkeys(locInLocProd), totalLoc)],
        [T('Sin actividad en la red'), locNoAct, pctStr(locNoAct, totalLoc)]
      ]
    });

    /* UBICACIONES — conectividad (fan-out) */
    var oKeys = Object.keys(locOriginPrds), sumFan = 0, maxFan = 0;
    oKeys.forEach(function (o) { var c = nkeys(locOriginPrds[o]); sumFan += c; if (c > maxFan) maxFan = c; });
    table(ws, {
      banner: T('UBICACIONES — Conectividad'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Ubicaciones origen (Location Source)'), nkeys(origins)],
        [T('Ubicaciones destino (Location Source)'), nkeys(dests)],
        [T('Promedio de productos por ubicación origen'), avg1(sumFan, oKeys.length)],
        [T('Máximo de productos en una ubicación origen'), maxFan]
      ]
    });
    var fo15 = 0, fo620 = 0, fo2150 = 0, fo51 = 0;
    oKeys.forEach(function (o) {
      var n = nkeys(locOriginPrds[o]);
      if (n <= 5) fo15++; else if (n <= 20) fo620++; else if (n <= 50) fo2150++; else fo51++;
    });
    table(ws, {
      banner: T('UBICACIONES — Distribución de productos por origen'),
      headers: [T('Productos por origen'), T('Ubicaciones origen'), T('% del total')],
      rows: [
        ['1-5', fo15, pctStr(fo15, oKeys.length)],
        ['6-20', fo620, pctStr(fo620, oKeys.length)],
        ['21-50', fo2150, pctStr(fo2150, oKeys.length)],
        ['51+', fo51, pctStr(fo51, oKeys.length)]
      ]
    });

    /* ARCOS — Location Source */
    var multiSrc = Object.keys(originsPerDest).filter(function (k) { return originsPerDest[k] >= 2; }).length;
    table(ws, {
      banner: T('ARCOS — Transferencias (Location Source)'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Arcos de transferencia'), locSrcArcs],
        [T('Orígenes distintos (LOCFR)'), nkeys(origins)],
        [T('Destinos distintos (LOCID)'), nkeys(dests)],
        [T('Productos transferidos'), nkeys(prdInLocSrc)],
        [T('TLEADTIME promedio (días)'), avg1(tltSum, tltN)],
        [T('Destinos producto-planta con múltiples orígenes'), multiSrc]
      ]
    });
    table(ws, {
      banner: T('ARCOS — Distribución de TLEADTIME'),
      headers: [T('TLEADTIME (días)'), T('Arcos'), T('% del total')],
      rows: [
        [T('0 / no definido'), tlt.z, pctStr(tlt.z, locSrcArcs)],
        ['1-5', tlt.a, pctStr(tlt.a, locSrcArcs)],
        ['6-15', tlt.b, pctStr(tlt.b, locSrcArcs)],
        ['16+', tlt.c, pctStr(tlt.c, locSrcArcs)]
      ]
    });

    /* CLIENTES — Customer Source */
    table(ws, {
      banner: T('CLIENTES — Entrega (Customer Source)'),
      headers: [T('Métrica'), T('Valor')],
      rows: [
        [T('Clientes en el maestro'), nkeys(custLookup)],
        [T('Clientes con arco de entrega'), nkeys(custInCustSrc)],
        [T('Arcos de entrega'), custArcs],
        [T('Productos entregados a cliente'), nkeys(prdInCustSrc)],
        [T('CLEADTIME promedio (días)'), avg1(cltSum, cltN)]
      ]
    });
    var cKeys = Object.keys(custPrds), cn15 = 0, cn620 = 0, cn2150 = 0, cn51 = 0;
    cKeys.forEach(function (c) {
      var n = nkeys(custPrds[c]);
      if (n <= 5) cn15++; else if (n <= 20) cn620++; else if (n <= 50) cn2150++; else cn51++;
    });
    table(ws, {
      banner: T('CLIENTES — Distribución por nº de productos'),
      headers: [T('Productos por cliente'), T('Clientes'), T('% del total')],
      rows: [
        ['1-5', cn15, pctStr(cn15, cKeys.length)],
        ['6-20', cn620, pctStr(cn620, cKeys.length)],
        ['21-50', cn2150, pctStr(cn2150, cKeys.length)],
        ['51+', cn51, pctStr(cn51, cKeys.length)]
      ]
    });
    table(ws, {
      banner: T('CLIENTES — Distribución de CLEADTIME'),
      headers: [T('CLEADTIME (días)'), T('Arcos'), T('% del total')],
      rows: [
        [T('0 / no definido'), clt.z, pctStr(clt.z, custArcs)],
        ['1-5', clt.a, pctStr(clt.a, custArcs)],
        ['6-15', clt.b, pctStr(clt.b, custArcs)],
        ['16+', clt.c, pctStr(clt.c, custArcs)]
      ]
    });

    /* CRUCES por campos adicionales */
    banner(ws, T('CRUCES POR CAMPOS ADICIONALES'));
    blank(ws);
    var nX = 0;
    nX += renderExtraFields(ws, { ns: 'sn', entity: 'product', recs: objVals(prdLookup),
      dimLabel: T('Tipo de material'), dimFn: function (r) { return S(r.MATTYPEID || '') || T('(sin tipo)'); } });
    nX += renderExtraFields(ws, { ns: 'sn', entity: 'location', recs: objVals(locLookup),
      dimLabel: 'LOCTYPE', dimFn: function (r) { return S(r.LOCTYPE || '') || T('(sin LOCTYPE)'); } });
    nX += renderExtraFields(ws, { ns: 'sn', entity: 'customer', recs: objVals(custLookup) });
    if (!nX) row(ws, [T('No se seleccionaron campos adicionales. Agrégalos en el paso "Campos adicionales" para ver cruces aquí.')]);
  }

  global.StatsSheet = {
    sheetName: function () { return T('Estadísticas'); },
    buildPA: buildPA,
    buildSN: buildSN
  };
})(typeof window !== 'undefined' ? window : this);
