/* ═══════════════════════════════════════════════════════════════
   GLOSARIO.JS — Guía de lectura del Excel para Production Analyzer
   y Supply Network Analyzer. Audiencia: consultor SAP IBP.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _currentModule = 'pa';

  /* ─── I18N ─────────────────────────────────────────────────── */
  function _lang() {
    try { return (window.I18n && window.I18n.getLang) ? window.I18n.getLang() : 'es'; }
    catch (e) { return 'es'; }
  }
  function _t(s) {
    if (_lang() !== 'en') return s;
    return (_TEXTS[s] != null) ? _TEXTS[s] : s;
  }
  /* Mapa ES → EN. Las claves son cadenas exactas en español tal como aparecen
     en el HTML generado por las secciones. Se completa al final del archivo
     (se hace hoist por ser `var`). */
  var _TEXTS = {};

  /* ─── MICRO-HELPERS ─────────────────────────────────────────── */
  function h(tag, cls, content) {
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</' + tag + '>';
  }
  function badge(sev) {
    var map = {
      red:    '<span class="glos-badge glos-red">' + _t('⛔ Alerta') + '</span>',
      yellow: '<span class="glos-badge glos-yellow">' + _t('⚠ Advertencia') + '</span>',
      ok:     '<span class="glos-badge glos-ok">' + _t('✅ OK') + '</span>',
      info:   '<span class="glos-badge glos-info">' + _t('ℹ Info') + '</span>'
    };
    return map[sev] || '';
  }
  function catBadge(cat) {
    var map = {
      finished:      '<span class="glos-cat glos-cat-finished">' + _t('Terminado') + '</span>',
      semi:          '<span class="glos-cat glos-cat-semi">' + _t('Semiterminado') + '</span>',
      rawmat:        '<span class="glos-cat glos-cat-rawmat">' + _t('Mat. Prima') + '</span>',
      trading:       '<span class="glos-cat glos-cat-trading">' + _t('Mercadería') + '</span>',
      uncategorized: '<span class="glos-cat glos-cat-uncategorized">' + _t('Sin cat.') + '</span>',
      all:           '<span class="glos-cat glos-cat-all">' + _t('Todos') + '</span>'
    };
    return (cat || []).map(function (c) { return map[c] || ''; }).join(' ');
  }

  function obsTable(rows) {
    var header = '<tr><th>' + _t('Texto en Excel') + '</th><th>' + _t('Estado') + '</th><th>' + _t('Aplica a') + '</th><th>' + _t('Por qué aparece') + '</th><th>' + _t('Qué revisar en IBP') + '</th></tr>';
    var body = rows.map(function (r) {
      return '<tr class="glos-obs-' + r[1] + '">' +
        '<td><code class="glos-obs-code">' + r[0] + '</code></td>' +
        '<td>' + badge(r[1]) + '</td>' +
        '<td>' + catBadge(r[2]) + '</td>' +
        '<td class="glos-obs-cause">' + r[3] + '</td>' +
        '<td class="glos-obs-action">' + r[4] + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="glos-table-wrap"><table class="glos-obs-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function colTable(rows) {
    var header = '<tr><th>' + _t('Columna') + '</th><th>' + _t('Qué significa') + '</th></tr>';
    var body = rows.map(function (r) {
      return '<tr><td><strong class="glos-col-name">' + r[0] + '</strong></td><td>' + r[1] + '</td></tr>';
    }).join('');
    return '<div class="glos-table-wrap"><table class="glos-col-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function netStatusTable(rows) {
    var header = '<tr><th>' + _t('Estado de la Red') + '</th><th>' + _t('Estado') + '</th><th>' + _t('Aplica a') + '</th><th>' + _t('Significado') + '</th></tr>';
    var body = rows.map(function (r) {
      return '<tr class="glos-obs-' + r[1] + '">' +
        '<td><code class="glos-obs-code">' + r[0] + '</code></td>' +
        '<td>' + badge(r[1]) + '</td>' +
        '<td>' + catBadge(r[2]) + '</td>' +
        '<td class="glos-obs-cause">' + r[3] + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="glos-table-wrap"><table class="glos-obs-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function section(id, icon, title, content) {
    return '<section class="glos-section" id="' + id + '">' +
      '<h2 class="glos-section-title">' + icon + ' ' + title + '</h2>' +
      content + '</section>';
  }

  function sub(title, content) {
    return '<div class="glos-sub"><h3 class="glos-sub-title">' + title + '</h3>' + content + '</div>';
  }

  function callout(type, text) {
    return '<div class="glos-callout glos-callout-' + type + '">' + text + '</div>';
  }

  function p(text) { return '<p class="glos-p">' + text + '</p>'; }

  /* ─── LEGEND COMUN ──────────────────────────────────────────── */
  function legendEstados() {
    return sub('Estados del Excel',
      '<div class="glos-legend">' +
        '<div class="glos-legend-item">' + badge('red') + '<span>Problema crítico que bloquea o distorsiona la planificación en IBP. Requiere acción antes de ejecutar cualquier plan.</span></div>' +
        '<div class="glos-legend-item">' + badge('yellow') + '<span>Dato incompleto o sospechoso que conviene revisar. No bloquea IBP pero puede generar resultados incorrectos.</span></div>' +
        '<div class="glos-legend-item">' + badge('ok') + '<span>Todas las validaciones aplicables pasaron. El registro está correctamente configurado.</span></div>' +
        '<div class="glos-legend-item"><span class="glos-badge glos-dash">—</span><span>El dato no aplica para este registro (N/A). Celda con fondo gris claro e itálica. No indica error sino ausencia de dato para ese campo.</span></div>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     PRODUCTION ANALYZER — SECCIONES
     ═══════════════════════════════════════════════════════════════ */

  var PA_SECTIONS = [

    /* ── INTRO ── */
    {
      id: 'pa-intro', icon: '📋', title: 'Introducción',
      content: function () {
        return p('El <strong>Production Analyzer</strong> analiza la configuración de producción en SAP IBP y exporta un Excel con hasta 9 hojas. Cada hoja examina una entidad distinta desde el punto de vista de su completitud y consistencia para la planificación.') +
          p('El análisis cruza diez entidades: Production Source Header (PSH), Production Source Item (PSI), Production Source Resource (PSR), Resource, Resource Location, Product, Location, Location Product y Location Source. Los hallazgos se expresan siempre en términos de qué falta o qué está mal configurado respecto a lo que IBP necesita para planificar correctamente.') +
          legendEstados() +
          callout('info', '<strong>Hojas condicionales:</strong> Las hojas Product, Location, Resource, Resource Location, Prod Source Item y Prod Source Resource solo se crean si el usuario seleccionó la entidad correspondiente antes de ejecutar el análisis. La hoja Tipos Excluidos solo aparece si existen tipos de material excluidos del análisis principal. La hoja Resumen siempre se genera.') +
          callout('info', '<strong>Importante:</strong> Los resultados dependen de la categorización de tipos de material (MATTYPEID). Un mismo hallazgo puede ser ⛔ Alerta para un Producto Terminado y no aplicar para una Materia Prima. Ver sección <em>Tipos de Material</em>.');
      }
    },

    /* ── RESUMEN ── */
    {
      id: 'pa-resumen', icon: '📊', title: 'Hoja: Resumen',
      content: function () {
        return p('Primera hoja del libro. Una fila por cada hoja analizada. Permite ver de un vistazo la salud general de la configuración.') +
          colTable([
            ['#', 'Número de hoja en el libro Excel.'],
            ['Hoja', 'Nombre de la hoja analizada (Product, Location, Resource, etc.).'],
            ['Total registros', 'Cantidad de filas procesadas. Ej: 350 = se analizaron 350 productos.'],
            ['Alertas 🔴', 'Registros con problema crítico que bloquea o distorsiona la planificación.'],
            ['Advertencias 🟡', 'Registros con dato incompleto o sospechoso que conviene revisar.'],
            ['OK ✅', 'Registros sin hallazgos — todas las validaciones aplicables pasaron.'],
            ['% Consistencia', 'Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100. Una hoja con 85% de consistencia tiene el 15% restante con hallazgos.']
          ]) +
          callout('tip', '<strong>Lectura recomendada:</strong> Comienza por la hoja con menor % de Consistencia y mayor cantidad de Alertas 🔴. Eso indica dónde están los problemas más críticos para la planificación.');
      }
    },

    /* ── PRODUCT ── */
    {
      id: 'pa-product', icon: '🧪', title: 'Hoja: Product',
      content: function () {
        return p('Una fila por cada producto del maestro de materiales de SAP IBP. Esta hoja valida si cada producto tiene la configuración mínima necesaria para que IBP lo pueda planificar correctamente.') +
          sub('Columnas clave', colTable([
            ['Estado', '⛔ Alerta / ⚠ Advertencia / ✅ OK. El peor hallazgo del producto determina el color de la fila.'],
            ['Observacion', 'Texto detallado de todos los hallazgos encontrados, separados por |. Si el estado es OK, describe qué validaciones pasaron.'],
            ['PRDID', 'Código único del producto en SAP IBP.'],
            ['PRDDESCR', 'Descripción del producto del maestro.'],
            ['MATTYPEID', 'Tipo de material SAP. Determina qué validaciones aplican. Es el insumo principal para la categorización.'],
            ['En Location Product', 'Sí/No — ¿El producto está habilitado en al menos una ubicación? Sin esto IBP ignora completamente el producto.'],
            ['En PSH (output)', 'Sí/No — ¿El producto tiene fuente de producción propia (SOURCETYPE=P)?'],
            ['En PSI (componente)', 'Sí/No — ¿Este producto es ingrediente en el BOM de algún otro producto?'],
            ['En Location Source', 'Sí/No — ¿Tiene arcos de transferencia entre ubicaciones?'],
            ['# Opciones prod.', 'Cuántas recetas distintas (SOURCEIDs) producen este producto. Más de una implica multi-sourcing — verificar cuotas (PRATIO).'],
            ['Opciones prod. (SOURCEIDs)', 'Códigos de los SOURCEIDs que producen este producto.'],
            ['# Plantas prod.', 'Número de plantas distintas donde se fabrica.'],
            ['Plantas prod. (códigos)', 'Códigos de las plantas productoras.'],
            ['# Componentes BOM', 'Total de ingredientes PSI definidos en todas sus recetas.'],
            ['# Recursos prod.', 'Máquinas/líneas asignadas vía PSR.'],
            ['Recursos prod. (códigos)', 'Códigos de los recursos asignados a las recetas de este producto.'],
            ['# Proveedores', 'Número de ubicaciones origen distintas en Location Source (campo LOCFR) que abastecen este producto.'],
            ['Proveedores (códigos)', 'Códigos de las ubicaciones origen en Location Source.'],
            ['# Plantas cubiertas', 'Plantas que reciben este producto con arco de abastecimiento configurado en Location Source.'],
            ['Plantas cubiertas (códigos)', 'Códigos de las plantas con arco de abastecimiento configurado.'],
            ['# Plantas sin cobertura', 'Plantas que consumen este producto como insumo pero no tienen arco de abastecimiento configurado. Si > 0: falta Location Source. ⛔ crítico.'],
            ['Plantas sin cobertura (códigos)', 'Códigos de las plantas consumidoras sin cobertura de abastecimiento.'],
            ['# Productos que lo usan', 'Cuántos otros productos distintos requieren este material como componente PSI.'],
            ['# Orígenes en red', 'Número de nodos origen distintos detectados en la red de este producto (LOCFR en Location Source).'],
            ['Orígenes en red (códigos)', 'Códigos de los nodos origen.'],
            ['# Plantas consumidoras', 'Número de plantas que consumen este producto como componente PSI en alguna receta.'],
            ['Plantas consumidoras (códigos)', 'Códigos de las plantas que consumen este producto como ingrediente.']
          ])) +
          sub('Observaciones posibles',
            callout('info', '<strong>Productos sin categoría:</strong> Los tipos de material sin categoría asignada reciben todas las validaciones con severidad ⚠ Advertencia. Sus observaciones van precedidas por <code>Sin categoría [MATTYPEID]</code>. Si no hay hallazgos, muestran <code>Sin categoría [MATTYPEID] — sin hallazgos en modo permisivo</code> con estado ✅ OK. Asignar la categoría correcta activa las validaciones estrictas correspondientes.') +
            obsTable([
            ['Sin cobertura en Location Product', 'red', ['all'], 'El producto no está registrado en ninguna ubicación en Location Product.', 'Habilitar el producto en Location Product para cada planta y/o DC donde se requiera. Sin esto IBP lo ignora en planificación de demanda y producción.'],
            ['Sin fuente de producción propia (PSH)', 'red', ['finished', 'semi'], 'No existe ningún Production Source Header activo con SOURCETYPE=P para este producto.', 'Crear o activar la receta de producción en IBP (PSH con SOURCETYPE=P). Verificar que el Planning Area y Version sean correctos.'],
            ['PSH sin componentes PSI', 'red', ['finished', 'semi'], 'La receta de producción existe pero no tiene ingredientes definidos — BOM vacío.', 'Revisar el BOM en IBP y cargar los componentes (PSI) necesarios en la receta del SOURCEID indicado.'],
            ['PSH sin recursos PSR asignados', 'red', ['finished', 'semi'], 'La receta existe pero no tiene ninguna máquina o línea asignada en Production Source Resource.', 'Asignar al menos un recurso productivo (RESID) al SOURCEID vía Production Source Resource en IBP.'],
            ['Planta productora no es origen en Location Source', 'red', ['finished'], 'El producto se fabrica en la planta pero no hay arco de Location Source declarando esa planta como LOCFR.', 'Crear arco en Location Source con la planta productora como LOCFR para distribuir el producto hacia DCs o clientes.'],
            ['Sin arco de abastecimiento hacia: X, Y', 'red', ['rawmat'], 'El insumo se consume en las plantas indicadas pero no hay Location Source que lo lleve ahí.', 'Crear arco(s) en Location Source con el proveedor como LOCFR y la planta consumidora como LOCID para cada insumo sin cobertura.'],
            ['Sin arco de abastecimiento (no registrado en Location Source)', 'red', ['rawmat'], 'El insumo no tiene ningún arco de transferencia en Location Source.', 'Configurar Location Source con el proveedor o planta origen como LOCFR hacia la(s) planta(s) consumidora(s).'],
            ['Sin arcos en Location Source', 'red', ['trading'], 'El producto de tipo Mercadería no tiene arcos de distribución en Location Source.', 'Configurar Location Source con el proveedor/origen del producto para que IBP pueda planificar su flujo.'],
            ['Semiterminado sin consumo PSI en planta productora ni transferencia configurada', 'red', ['semi'], 'El semiterminado se produce pero nadie lo consume ni se transfiere a otra planta — producción sin destino.', 'Verificar que el semiterminado esté en el BOM (PSI) de algún terminado en la misma planta, o configurar Location Source para transferirlo al punto de consumo.'],
            ['Transfiere a N destino(s) sin consumo PSI en ningún punto: X', 'red', ['semi'], 'El semiterminado se transfiere a destinos donde no es consumido como ingrediente, y tampoco se usa en la planta de origen.', 'Agregar el semiterminado como componente PSI en la receta de la planta destino, o eliminar el arco de transferencia si es un error de configuración.'],
            ['Transfiere a N destino(s) sin consumo PSI (sí consume en planta origen): X', 'yellow', ['semi'], 'El semiterminado se consume localmente en la planta de origen, pero también se transfiere a destinos donde no se usa como ingrediente.', 'Verificar si la transferencia a los destinos indicados es intencional. Si no, eliminar el arco de Location Source hacia esas ubicaciones.'],
            ['PLEADTIME ausente o cero en N SOURCEID(s)', 'red', ['finished'], 'El lead time de producción es 0 o está vacío en la(s) receta(s). IBP planifica como si la producción fuera instantánea.', 'Ingresar el PLEADTIME real en días en el Production Source Header de IBP para cada SOURCEID afectado.'],
            ['PLEADTIME ausente o cero en N SOURCEID(s)', 'yellow', ['semi'], 'El lead time de producción es 0 o está vacío en la(s) receta(s). IBP planifica como si la producción fuera instantánea.', 'Ingresar el PLEADTIME real en días en el Production Source Header de IBP para cada SOURCEID afectado.'],
            ['OUTPUTCOEFFICIENT ausente o cero en N SOURCEID(s)', 'red', ['finished'], 'El coeficiente de salida de la receta es 0 o está vacío. IBP no sabe cuántas unidades produce cada corrida.', 'Revisar y corregir el OUTPUTCOEFFICIENT en el Production Source Header.'],
            ['OUTPUTCOEFFICIENT ausente o cero en N SOURCEID(s)', 'yellow', ['semi'], 'El coeficiente de salida de la receta es 0 o está vacío. IBP no sabe cuántas unidades produce cada corrida.', 'Revisar y corregir el OUTPUTCOEFFICIENT en el Production Source Header.'],
            ['Configurado solo como co-producto (SOURCETYPE=C) — falta PSH primario', 'yellow', ['finished', 'semi'], 'El producto aparece en recetas como subproducto (C) pero nunca como output principal (P).', 'Verificar si es intencional (es co-producto puro de otro proceso) o si falta crear la receta principal con SOURCETYPE=P.'],
            ['Tiene BOM de fabricación (PSH) — verificar categorización', 'yellow', ['rawmat', 'trading'], 'El producto tiene una receta de producción pero está categorizado como Mat. Prima o Mercadería, que no deberían fabricarse.', 'Revisar si la categoría del MATTYPEID es correcta, o si el PSH es un error de configuración en IBP.'],
            ['No consumido como componente en ningún BOM', 'yellow', ['semi', 'rawmat'], 'El producto existe como Semiterminado o Mat. Prima pero no aparece como ingrediente en ninguna receta PSI.', 'Verificar si el material todavía está vigente y si está correctamente vinculado en el BOM de los productos que lo consumen.'],
            ['TLEADTIME = 0 en todos los arcos de Location Source', 'yellow', ['all'], 'Todos los arcos de transferencia de este producto tienen lead time = 0. IBP planifica transferencias instantáneas.', 'Revisar y completar el TLEADTIME (en días) en los arcos de Location Source para este producto.'],
            ['Con PSH, PSI y PSR', 'ok', ['finished', 'semi'], 'La receta de producción existe con BOM completo y recursos asignados.', 'Sin acción requerida.'],
            ['Planta es origen en Location Source', 'ok', ['finished'], 'La planta productora tiene al menos un arco saliente en Location Source para este producto.', 'Sin acción requerida.'],
            ['Arcos de abastecimiento completos', 'ok', ['rawmat'], 'Todas las plantas que consumen este insumo tienen arco de abastecimiento configurado en Location Source.', 'Sin acción requerida.'],
            ['Con arcos en Location Source', 'ok', ['trading'], 'El producto tiene arcos de distribución configurados en Location Source.', 'Sin acción requerida.'],
            ['PLEADTIME definido en todos los SOURCEIDs', 'ok', ['finished', 'semi'], 'Ningún SOURCEID tiene PLEADTIME = 0 o vacío.', 'Sin acción requerida.'],
            ['Coeficiente de salida definido', 'ok', ['finished', 'semi'], 'Todos los SOURCEIDs tienen OUTPUTCOEFFICIENT mayor que cero.', 'Sin acción requerida.'],
            ['PSH con SOURCETYPE=P presente', 'ok', ['finished', 'semi'], 'Al menos un registro con SOURCETYPE=P existe para este producto.', 'Sin acción requerida.'],
            ['Sin BOM de fabricación', 'ok', ['rawmat', 'trading'], 'El producto no tiene PSH, lo cual es correcto para Mat. Prima y Mercadería.', 'Sin acción requerida.'],
            ['Consumido como componente en BOM', 'ok', ['semi', 'rawmat'], 'El producto aparece como ingrediente en al menos una receta PSI.', 'Sin acción requerida.'],
            ['Consume en planta productora', 'ok', ['semi'], 'El semiterminado se produce y se consume localmente en la misma planta — no requiere transferencia.', 'Sin acción requerida.'],
            ['Consumo en destino de transferencia verificado', 'ok', ['semi'], 'El semiterminado se transfiere a otra planta y en el destino existe consumo PSI configurado.', 'Sin acción requerida.'],
            ['TLEADTIME definido en Location Source', 'ok', ['all'], 'Al menos un arco de Location Source tiene TLEADTIME mayor que cero.', 'Sin acción requerida.'],
            ['Sin categoría [MATTYPEID] — sin hallazgos en modo permisivo', 'ok', ['uncategorized'], 'El producto no tiene categoría asignada y no presentó hallazgos. Las validaciones se aplicaron en modo permisivo. El texto entre corchetes es el MATTYPEID real del producto.', 'Asignar la categoría correcta al tipo de material en el panel de categorización para activar las validaciones estrictas correspondientes.']
          ]));
      }
    },

    /* ── LOCATION ── */
    {
      id: 'pa-location', icon: '🏭', title: 'Hoja: Location',
      content: function () {
        return p('Una fila por cada ubicación (planta, DC, proveedor, etc.) detectada en los datos. El análisis infiere el <strong>rol real</strong> de cada ubicación según su comportamiento en los datos, independientemente del campo LOCTYPE de IBP. Las columnas se agrupan por rol: las columnas de planta solo tienen datos si la ubicación tiene producción, y así sucesivamente.') +
          sub('Roles inferidos', colTable([
            ['Planta de producción', 'Tiene al menos un Production Source Header (PSH) asociado — fabrica productos.'],
            ['Proveedor', 'Aparece como LOCFR en Location Source enviando productos que se consumen como PSI en la planta destino — abastece insumos.'],
            ['Nodo de transferencia', 'Aparece como LOCFR en Location Source enviando productos que NO se consumen como PSI en el destino — redistribuye o distribuye.'],
            ['Nodo receptor', 'Solo aparece como LOCID (destino) en Location Source, sin producción propia ni envíos salientes — solo recibe.'],
            ['Nodo de recursos', 'Tiene recursos asignados en Resource Location pero sin producción ni transferencias activas.'],
            ['Sin actividad', 'Existe en el maestro de ubicaciones pero no aparece en ningún otro dato — ubicación inactiva o huérfana.']
          ])) +
          sub('Columnas generales (todas las ubicaciones)', colTable([
            ['LOCID', 'Código único de la ubicación en SAP IBP.'],
            ['LOCDESCR', 'Descripción de la ubicación del maestro.'],
            ['LOCTYPE', 'Tipo de ubicación del maestro (ej: 1010 = planta). Informativo — el rol real se infiere del comportamiento.'],
            ['Rol(es) inferido(s)', 'Uno o más roles detectados según participación real en PSH, Location Source y Customer Source.'],
            ['En Location Product', 'Sí/No — ¿La ubicación está habilitada en Location Product? Sin esto IBP no planifica en esa ubicación.']
          ])) +
          sub('Columnas de planta de producción', colTable([
            ['# Productos fabricados', 'Productos distintos con al menos un SOURCEID en esta planta.'],
            ['Productos fabricados (códigos)', 'Códigos de los productos fabricados.'],
            ['# SOURCEIDs', 'Total de recetas de producción en esta planta.'],
            ['SOURCEIDs (códigos)', 'Códigos de las recetas.'],
            ['# Recursos asignados', 'Recursos con Resource Location configurado en esta planta.'],
            ['Recursos asignados (códigos)', 'Códigos de los recursos asignados.'],
            ['# Recursos activos PSR', 'Recursos que además participan en alguna receta PSR activa en esta planta.'],
            ['Recursos activos (códigos)', 'Códigos de los recursos activos.'],
            ['# Recursos ociosos', 'Recursos asignados en Resource Location pero sin ningún PSR activo — configuración sin uso.'],
            ['Recursos ociosos (códigos)', 'Códigos de los recursos ociosos.'],
            ['# BOMs sin PSI', 'SOURCEIDs de esta planta sin componentes PSI definidos.'],
            ['SOURCEIDs sin PSI (códigos)', 'Códigos de los SOURCEIDs con BOM vacío.'],
            ['# BOMs sin PSR', 'SOURCEIDs sin recurso asignado.'],
            ['SOURCEIDs sin PSR (códigos)', 'Códigos de los SOURCEIDs sin recurso.'],
            ['# Componentes externos', 'Ingredientes PSI de esta planta que no son semiterminados producidos localmente y deben llegar vía Location Source.'],
            ['# Componentes sin cobertura LocSrc', 'Insumos consumidos en esta planta sin arco de abastecimiento configurado. Crítico para planificación de compras.'],
            ['Componentes sin cobertura (códigos)', 'Códigos de los productos sin arco de abastecimiento hacia esta planta.'],
            ['# SOURCEIDs sin PLEADTIME', 'Recetas con PLEADTIME = 0 o vacío en esta planta.'],
            ['SOURCEIDs sin PLEADTIME (códigos)', 'Códigos de los SOURCEIDs sin lead time de producción.']
          ])) +
          sub('Columnas de proveedor / nodo origen', colTable([
            ['# Productos abastecidos (como proveedor)', 'Productos que esta ubicación envía hacia plantas donde se consumen como PSI.'],
            ['Productos abastecidos (códigos)', 'Códigos de esos productos.'],
            ['# Plantas abastecidas', 'Plantas destino que reciben abastecimiento desde esta ubicación.'],
            ['Plantas abastecidas (códigos)', 'Códigos de las plantas abastecidas.'],
            ['# Arcos sin consumo PSI en destino', 'Arcos donde el producto enviado no se consume como PSI en la planta destino — posible error o nodo intermedio.'],
            ['Productos sin consumo PSI (códigos)', 'Códigos de esos productos.'],
            ['# Productos sin LocProd en destino', 'Productos que se envían a plantas que no los tienen habilitados en Location Product.'],
            ['Productos sin LocProd (códigos)', 'Códigos de esos productos.']
          ])) +
          sub('Columnas de nodo de transferencia', colTable([
            ['# Productos transferidos', 'Productos que esta ubicación redistribuye hacia otros nodos sin ser consumidos como PSI en destino.'],
            ['Productos transferidos (códigos)', 'Códigos de los productos transferidos.'],
            ['# Destinos transferencia', 'Número de nodos destino hacia los que transfiere.'],
            ['Destinos transferencia (códigos)', 'Códigos de los destinos.']
          ])) +
          sub('Columnas de nodo receptor', colTable([
            ['# Productos recibidos', 'Productos que esta ubicación recibe desde otros nodos vía Location Source.'],
            ['Productos recibidos (códigos)', 'Códigos de los productos recibidos.'],
            ['# Orígenes desde los que recibe', 'Número de ubicaciones distintas que envían productos a esta ubicación.'],
            ['Orígenes (códigos)', 'Códigos de las ubicaciones origen.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['N SOURCEID(s) sin PSI', 'red', ['finished', 'semi'], 'N recetas de producción de esta planta no tienen ingredientes definidos (BOM vacío). IBP no puede planificar compra de insumos para esas recetas.', 'Revisar y completar el BOM (PSI) de los SOURCEIDs indicados en la hoja Prod Source Header.'],
            ['N SOURCEID(s) sin PSR', 'red', ['finished', 'semi'], 'N recetas no tienen ningún recurso productivo asignado. IBP no evalúa capacidad para esas recetas.', 'Asignar un recurso (RESID) a cada SOURCEID indicado vía Production Source Resource en IBP.'],
            ['N componente(s) sin arco de abastecimiento', 'red', ['finished', 'semi'], 'N insumos que se consumen en esta planta no tienen arco en Location Source que los traiga hasta aquí.', 'Crear arcos en Location Source para los componentes indicados, con el proveedor como LOCFR y esta planta como LOCID.'],
            ['N SOURCEID(s) con PLEADTIME = 0', 'red', ['finished', 'semi'], 'N recetas tienen lead time de producción cero o vacío. IBP planifica esas producciones como instantáneas.', 'Ingresar el PLEADTIME real (en días) en el Production Source Header de cada SOURCEID afectado.'],
            ['N recurso(s) asignados sin uso en PSR', 'yellow', ['all'], 'N recursos tienen Resource Location configurado en esta planta pero no participan en ninguna receta activa.', 'Verificar si los recursos son obsoletos y deben eliminarse de Resource Location, o si falta asignarlos a algún PSR.'],
            ['N producto(s) Mat. Prima/Mercadería con BOM de fabricación en esta planta — verificar categorización', 'yellow', ['rawmat', 'trading'], 'Productos categorizados como Mat. Prima o Mercadería tienen PSH en esta planta — posible error de categorización.', 'Revisar la categoría del MATTYPEID o verificar si el PSH es un error de configuración en IBP.'],
            ['N producto(s) abastecidos sin consumo PSI en destino', 'yellow', ['rawmat', 'semi'], 'Esta ubicación envía productos hacia plantas donde no son consumidos como ingrediente en ninguna receta.', 'Verificar si el arco de Location Source es correcto o si falta agregar el componente en el BOM del destino.'],
            ['N producto(s) sin Location Product en planta destino', 'red', ['all'], 'Esta ubicación envía productos hacia plantas que no los tienen habilitados en Location Product — IBP no puede planificarlos ahí.', 'Habilitar los productos indicados en Location Product para la planta destino.'],
            ['N componente(s) Mat. Prima/Semiterminado transferido(s) a planta sin consumo PSI — verificar BOM', 'red', ['rawmat', 'semi'], 'Esta ubicación envía componentes a una planta donde ninguna receta los consume. El insumo llega sin destino productivo.', 'Revisar el BOM de la planta destino y agregar el componente como PSI, o eliminar el arco de Location Source si es un error.'],
            ['N componente(s) Mat. Prima/Semiterminado transferido(s) a nodo sin producción', 'yellow', ['rawmat', 'semi'], 'Esta ubicación envía componentes a una ubicación que no tiene producción — posible nodo intermedio o configuración incompleta.', 'Verificar si el nodo destino es un punto de cross-docking o si el arco de transferencia es un error.'],
            ['N producto(s) sin categoría transferidos sin consumo PSI en destino', 'yellow', ['all'], 'Productos sin categoría asignada se transfieren a destinos donde no se usan en ningún BOM.', 'Asignar categoría al MATTYPEID de los productos indicados para que el análisis pueda aplicar las reglas correctas.'],
            ['N producto(s) recibidos sin cobertura en Location Product', 'red', ['all'], 'Esta ubicación recibe productos por Location Source pero no los tiene habilitados en Location Product — IBP no puede planificarlos aquí.', 'Habilitar los productos indicados en Location Product para esta ubicación.'],
            ['N componente(s) Mat. Prima/Semiterminado recibidos en ubicación sin producción asociada', 'yellow', ['rawmat', 'semi'], 'Esta ubicación recibe insumos o semiterminados pero no tiene ninguna receta de producción — los insumos llegan sin uso productivo declarado.', 'Verificar si esta ubicación debería tener producción configurada o si los arcos de abastecimiento son incorrectos.'],
            ['Ubicación en maestro sin actividad en otros datos', 'info', ['all'], 'La ubicación existe en el maestro pero no aparece en ninguna entidad de red (PSH, Location Source, Customer Source, Location Product).', 'Verificar si la ubicación es obsoleta y puede depurarse del maestro, o si falta configurar su participación en la red.'],
            ['BOMs con PSI, PSR y lead time | Sin componentes sin cobertura | Sin recursos ociosos', 'ok', ['finished', 'semi'], 'Planta completamente configurada: todas las recetas tienen BOM, recursos y lead time; todos los insumos tienen cobertura; no hay recursos sin uso.', 'Sin acción requerida.'],
            ['Abastecimiento con consumo PSI y cobertura LP en destino', 'ok', ['rawmat', 'semi'], 'Todos los productos que esta ubicación envía son consumidos como PSI en las plantas destino y están habilitados en Location Product.', 'Sin acción requerida.'],
            ['Distribuye N producto(s) terminado(s)/mercadería sin hallazgos', 'ok', ['finished', 'trading'], 'Nodo de transferencia que redistribuye productos terminados o mercadería sin anomalías detectadas.', 'Sin acción requerida.'],
            ['Nodo de transferencia sin hallazgos', 'ok', ['all'], 'La ubicación actúa como nodo de transferencia y no se detectaron problemas de configuración en los productos que redistribuye.', 'Sin acción requerida.'],
            ['Recibe N producto(s) | Location Product OK | Sin componentes sin producción', 'ok', ['all'], 'Nodo receptor correctamente configurado: todos los productos recibidos están habilitados en Location Product y ningún insumo llega a una ubicación sin producción asociada.', 'Sin acción requerida.'],
            ['Nodo receptor sin hallazgos', 'ok', ['all'], 'La ubicación solo recibe productos y no se detectaron problemas de configuración.', 'Sin acción requerida.'],
            ['Ubicación activa sin hallazgos', 'ok', ['all'], 'La ubicación tiene actividad en la red y no se detectaron anomalías de configuración.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── RESOURCE ── */
    {
      id: 'pa-resource', icon: '⚙️', title: 'Hoja: Resource',
      content: function () {
        return p('Una fila por cada recurso productivo (máquina, línea, horno, etc.) del maestro de recursos de SAP IBP. Valida que cada recurso tenga planta asignada y esté en uso en alguna receta.') +
          sub('Columnas clave', colTable([
            ['RESID', 'Código único del recurso en SAP IBP. Ej: LINEA-01, HORNO-A.'],
            ['RESDESCR', 'Descripción del recurso del maestro.'],
            ['En PSR', 'Sí/No — ¿Este recurso está asignado a al menos una fuente de producción en Production Source Resource? Si No, IBP nunca lo usa para planificar capacidad.'],
            ['En Resource Location', 'Sí/No — ¿Este recurso tiene al menos una planta configurada en Resource Location? Si No, IBP no sabe dónde opera físicamente.'],
            ['# Plantas asignadas', 'Número de plantas donde este recurso tiene Resource Location configurado.'],
            ['Plantas asignadas (códigos)', 'Códigos de las plantas donde está configurado el recurso.'],
            ['# Fuentes prod.', 'Número de SOURCEIDs a los que está asignado este recurso vía PSR.'],
            ['Fuentes prod. (SOURCEIDs)', 'Códigos de los SOURCEIDs a los que está asignado este recurso.'],
            ['# Productos que fabrica', 'Número de productos distintos que este recurso ayuda a producir.'],
            ['Productos que fabrica (códigos)', 'Códigos de los productos que produce este recurso.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Recurso huérfano: sin uso en producción ni planta asignada', 'red', ['all'], 'El recurso existe en el maestro pero no aparece ni en PSR ni en Resource Location — completamente desconectado de la configuración productiva.', 'Verificar si el recurso es obsoleto y puede eliminarse del maestro, o si falta asignarlo a recetas (PSR) y a su planta (Resource Location).'],
            ['Sin uso en producción (no aparece en PSR)', 'yellow', ['all'], 'El recurso tiene planta asignada en Resource Location pero ninguna receta lo usa. IBP tiene el recurso ubicado pero nunca lo considera para planificar capacidad.', 'Asignar el recurso a al menos una receta (SOURCEID) vía Production Source Resource, o verificar si es obsoleto.'],
            ['Sin planta asignada en Resource Location', 'yellow', ['all'], 'El recurso participa en recetas (PSR) pero no tiene planta configurada en Resource Location. IBP no sabe en qué planta opera físicamente.', 'Agregar la combinación RESID+LOCID correspondiente en Resource Location en IBP.'],
            ['En uso en PSR y con planta asignada en Resource Location', 'ok', ['all'], 'El recurso está activo en al menos una receta y tiene su planta correctamente configurada.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── RESOURCE LOCATION ── */
    {
      id: 'pa-resloc', icon: '📍', title: 'Hoja: Resource Location',
      content: function () {
        return p('Una fila por cada combinación Recurso + Planta configurada en Resource Location. Valida si cada combinación está siendo efectivamente usada en alguna receta de producción.') +
          sub('Columnas clave', colTable([
            ['RESID', 'Código del recurso productivo.'],
            ['RESDESCR', 'Descripción del recurso.'],
            ['LOCID', 'Código de la planta donde está configurado este recurso.'],
            ['LOCDESCR', 'Descripción de la planta.'],
            ['RESID+LOCID usado en PSR', 'Sí/No — ¿Esta combinación aparece en al menos un Production Source Resource activo? Si No, el recurso está en el maestro de esa planta pero no participa en ninguna receta.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Recurso activo en PSR para esta planta', 'ok', ['all'], 'La combinación RESID+LOCID está en uso en al menos una receta de producción en esa planta.', 'Sin acción requerida.'],
            ['Recurso asignado a planta pero sin uso en PSR para esta planta', 'yellow', ['all'], 'El recurso está en el maestro de la planta (Resource Location) pero ninguna receta activa lo usa en esa planta. IBP lo conoce pero nunca lo considera para planificación de capacidad en ese sitio.', 'Verificar si el recurso es obsoleto para esa planta y puede eliminarse de Resource Location, o si falta asignarlo a alguna receta (PSR) en esa planta.']
          ]));
      }
    },

    /* ── PROD SOURCE HEADER ── */
    {
      id: 'pa-psh', icon: '📄', title: 'Hoja: Prod Source Header',
      content: function () {
        return p('Una fila por cada fuente de producción (SOURCEID) en SAP IBP. Cada SOURCEID representa una receta que transforma insumos en un producto terminado o semiterminado en una planta específica.') +
          sub('Columnas clave', colTable([
            ['SOURCEID', 'Identificador único de la receta de producción.'],
            ['PRDID output', 'Producto que produce esta receta (output principal).'],
            ['PRDDESCR output', 'Descripción del producto output.'],
            ['MATTYPEID output', 'Tipo de material del producto output. Determina qué validaciones aplican a esta receta.'],
            ['LOCID planta', 'Planta donde se ejecuta esta producción.'],
            ['LOCDESCR planta', 'Descripción de la planta.'],
            ['SOURCETYPE(s)', 'P = fuente primaria (output principal) | C = co-producto (subproducto del mismo proceso). Una receta puede tener P y C simultáneamente.'],
            ['PLEADTIME', 'Lead time de producción en días. 0 o vacío → IBP planifica producción instantánea (⛔).'],
            ['OUTPUTCOEFFICIENT', 'Unidades del producto terminado por corrida de producción. Afecta el cálculo de cuántas corridas se necesitan para cubrir la demanda.'],
            ['PRATIO', 'Proporción asignada a esta fuente cuando hay múltiples SOURCEIDs para el mismo producto+planta. IBP usa este valor para distribuir la demanda entre recetas. Vacío = fuente única o sin cuota definida.'],
            ['PRDID+LOCID en Location Product', 'Sí/No — ¿Esta combinación producto+planta está habilitada en Location Product? Sin esto la receta existe pero IBP no la activa.'],
            ['# Componentes PSI', 'Ingredientes definidos en el BOM. 0 = BOM vacío → IBP no planifica compra de insumos.'],
            ['# Recursos PSR', 'Recursos asignados a esta receta. 0 = sin capacidad modelada.'],
            ['Recursos PSR (códigos)', 'Códigos de los recursos asignados a esta receta vía Production Source Resource.'],
            ['# Componentes con alternativa', 'Ingredientes marcados como material de reemplazo (ISALTITEM=X). Útil para conocer la flexibilidad de sustitución del BOM.'],
            ['Tiene PSR', 'Sí/No — resumen directo de si la receta tiene al menos un recurso asignado en Production Source Resource.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['BOM vacío: sin componentes PSI', 'red', ['finished', 'semi'], 'La receta no tiene ningún ingrediente definido. IBP no genera demanda de insumos para este producto.', 'Cargar los componentes (PSI) necesarios en el BOM del SOURCEID indicado en IBP.'],
            ['PLEADTIME = 0 o no definido', 'red', ['finished', 'semi'], 'El lead time de producción es cero o está vacío. IBP planifica como si el producto se fabricara de forma instantánea, lo que genera fechas de entrega incorrectas.', 'Ingresar el lead time real de producción (en días) en el campo PLEADTIME del Production Source Header en IBP.'],
            ['PRDID+LOCID sin cobertura en Location Product', 'red', ['all'], 'La combinación producto+planta de esta receta no está habilitada en Location Product. La receta existe pero IBP no la usa para planificar.', 'Habilitar la combinación PRDID+LOCID en Location Product en IBP.'],
            ['Sin recursos PSR asignados', 'red', ['finished', 'semi'], 'La receta no tiene ningún recurso productivo asignado. IBP no puede evaluar restricciones de capacidad para esta receta.', 'Asignar al menos un recurso (RESID) a este SOURCEID vía Production Source Resource en IBP.'],
            ['Sin registro SOURCETYPE=P', 'yellow', ['finished', 'semi'], 'La receta no tiene un registro con SOURCETYPE=P — solo tiene co-productos (C). No tiene un output principal definido.', 'Revisar la configuración del SOURCEID y agregar el registro con SOURCETYPE=P para el producto principal.'],
            ['Múltiples SOURCEIDs para mismo PRDID+LOCID — verificar cuotas', 'yellow', ['all'], 'Hay más de una receta para el mismo producto en la misma planta. IBP necesita PRATIO definido para distribuir correctamente la demanda entre las fuentes.', 'Revisar que los SOURCEIDs indicados tengan PRATIO definido y que la suma de cuotas sea coherente con la estrategia de producción.'],
            ['BOM con componentes PSI | Lead time definido | Habilitado en LP | SOURCETYPE=P presente | Recursos PSR asignados', 'ok', ['all'], 'La receta está completamente configurada.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── PROD SOURCE ITEM ── */
    {
      id: 'pa-psi', icon: '🧩', title: 'Hoja: Prod Source Item',
      content: function () {
        return p('Una fila por cada componente (ingrediente) en el BOM de una receta de producción. Valida que cada ingrediente tenga coeficiente definido y arco de abastecimiento configurado.') +
          sub('Columnas clave', colTable([
            ['SOURCEID', 'Receta a la que pertenece este componente.'],
            ['PRDID output', 'Producto que fabrica esa receta.'],
            ['PRDDESCR output', 'Descripción del producto output.'],
            ['MATTYPEID output', 'Tipo de material del producto output.'],
            ['LOCID planta', 'Planta donde se ejecuta la receta.'],
            ['LOCDESCR planta', 'Descripción de la planta.'],
            ['PRDID componente', 'Material que se consume como ingrediente en esta receta.'],
            ['PRDDESCR comp', 'Descripción del componente.'],
            ['MATTYPEID comp', 'Tipo de material del componente. Determina si se trata como semiterminado o insumo externo.'],
            ['COMPONENTCOEFFICIENT', 'Unidades del componente consumidas por unidad de producto terminado. Si es 0, IBP no planifica la compra de este insumo.'],
            ['Tipo componente', 'Semielaborado = se fabrica en la misma planta (tiene PSH propio ahí) | Semielaborado (ext.) = se fabrica en otra planta (PSH en planta distinta) | Semielaborado (sin receta) = categorizado como semi pero sin PSH activo en ninguna planta | Insumo = debe llegar desde fuera vía Location Source | No determinado = no se pudo clasificar con la información disponible.'],
            ['PRDID comp+LOCID en Location Product', 'Sí/No — ¿El componente está habilitado en Location Product para esta planta? Sin esto IBP no puede planificar su consumo aquí.'],
            ['En Location Source (insumo)', 'Sí/No — ¿Hay arco de Location Source que traiga este insumo a esta planta? Muestra N/A para semielaborados (se producen localmente).'],
            ['LOCFR origen', 'Código(s) de las ubicaciones de origen en Location Source para este componente en esta planta.'],
            ['LOCDESCR origen', 'Descripción(es) de las ubicaciones origen.'],
            ['# Orígenes comp.', 'Número de ubicaciones distintas que abastecen este componente a esta planta.'],
            ['Orígenes comp. (códigos)', 'Códigos de todas las ubicaciones origen para este componente+planta.'],
            ['Material de reemplazo (ISALTITEM)', 'X = este componente puede sustituir a otro material alternativo. Vacío = componente principal sin sustitución configurada.'],
            ['Reemplaza a', 'Código del componente principal al que este material puede reemplazar (solo cuando ISALTITEM=X).']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Coeficiente = 0 o no definido', 'red', ['all'], 'El coeficiente de consumo del componente es cero o está vacío. IBP no planifica la compra de este insumo aunque esté en el BOM.', 'Revisar y corregir el COMPONENTCOEFFICIENT en el Production Source Item en IBP.'],
            ['Semiterminado sin arco de transferencia hacia esta planta', 'red', ['semi'], 'El componente es un semiterminado categorizado como tal (MATTYPEID semi) con producción en otra planta, pero no existe ningún arco en Location Source que lo traslade a esta planta consumidora.', 'Crear arco en Location Source con la planta productora del semiterminado como LOCFR y esta planta como LOCID para el componente indicado.'],
            ['Insumo sin arco de abastecimiento en Location Source', 'red', ['all'], 'El componente es un insumo externo (no semielaborado) pero no hay ningún arco en Location Source que lo traiga a esta planta.', 'Crear arco en Location Source con el proveedor como LOCFR y esta planta como LOCID para el componente indicado.'],
            ['Componente no habilitado en Location Product para esta planta', 'red', ['all'], 'El componente no está registrado en Location Product para la planta donde se consume. IBP no puede planificar su consumo aquí.', 'Habilitar la combinación componente+planta en Location Product en IBP.'],
            ['SOURCEID no encontrado en PSH', 'yellow', ['all'], 'El SOURCEID de este componente no existe en el Production Source Header descargado. Puede ser un dato huérfano o un filtro de datos que excluye el PSH padre.', 'Verificar que el PSH del SOURCEID indicado exista y esté activo en IBP con el mismo Planning Area y Version.'],
            ['Semiterminado sin receta de produccion (PSH) en ninguna planta', 'yellow', ['semi'], 'El componente está categorizado como semiterminado (MATTYPEID semi) pero no se encontró ningún Production Source Header activo para este material en ninguna planta del Planning Area y Version analizados.', 'Verificar que exista un PSH activo para este semiterminado en IBP con el Planning Area y Version correctos. Si el PSH está en otro Planning Area, revisar la configuración de la jerarquía de producción.'],
            ['Material de reemplazo sin registro en Item Sub', 'yellow', ['all'], 'El componente está marcado como ISALTITEM=X (sustituto) pero no tiene registro en Production Source Item Sub que lo vincule al material que reemplaza.', 'Completar la configuración del sustituto en Production Source Item Sub en IBP.'],
            ['Componente de tipo excluido ([MATTYPE]) — validado en contexto', 'info', ['all'], 'El componente pertenece a un tipo de material excluido del análisis principal. Se valida su coeficiente y cobertura de abastecimiento porque es ingrediente de un producto incluido.', 'Si el insumo tiene brechas de cobertura, revisar en IBP aunque su tipo esté excluido del análisis general.'],
            ['Semielaborado: trazabilidad en PSH', 'ok', ['semi'], 'El componente es un semiterminado que se fabrica en esta misma planta — se rastrea vía su propio PSH.', 'Sin acción requerida. No requiere arco de Location Source porque se produce localmente.'],
            ['Semiterminado producido en otra planta: transferencia configurada', 'ok', ['semi'], 'El componente es un semiterminado categorizado como tal (MATTYPEID semi) con producción en otra planta y con arco de Location Source configurado que lo traslada a esta planta consumidora.', 'Sin acción requerida. La transferencia está correctamente configurada.'],
            ['SOURCEID valido en PSH | Coeficiente definido | Con arco de abastecimiento en Location Source | Habilitado en Location Product', 'ok', ['all'], 'El componente está correctamente configurado.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── PROD SOURCE RESOURCE ── */
    {
      id: 'pa-psr', icon: '🔧', title: 'Hoja: Prod Source Resource',
      content: function () {
        return p('Una fila por cada asignación Recurso + Receta (RESID + SOURCEID) en Production Source Resource. Valida que el recurso asignado a una receta también tenga configuración de planta en Resource Location.') +
          sub('Columnas clave', colTable([
            ['SOURCEID', 'Receta de producción a la que está asignado el recurso.'],
            ['PRDID output', 'Producto que fabrica esa receta.'],
            ['PRDDESCR output', 'Descripción del producto output.'],
            ['MATTYPEID output', 'Tipo de material del producto output.'],
            ['LOCID planta', 'Planta donde opera la receta.'],
            ['LOCDESCR planta', 'Descripción de la planta.'],
            ['RESID', 'Recurso asignado a esta receta.'],
            ['RESDESCR', 'Descripción del recurso.'],
            ['RESID+LOCID en Resource Location', 'Sí/No — ¿Esta combinación recurso+planta existe en Resource Location? Si No, hay inconsistencia: el recurso opera en una receta de esa planta pero no figura en el maestro de esa planta.'],
            ['# Plantas con este recurso asignado', 'Número de plantas donde el recurso tiene Resource Location configurado.'],
            ['Plantas recurso (códigos)', 'Códigos de las plantas donde este recurso tiene Resource Location configurado.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Recurso en producción sin asignación en Resource Location para planta X', 'yellow', ['all'], 'El recurso está asignado a una receta de la planta X pero no tiene Resource Location configurado para esa planta. IBP registra el uso del recurso en la receta pero no lo reconoce formalmente en ese sitio.', 'Agregar la combinación RESID+LOCID en Resource Location en IBP para formalizar la asignación del recurso a esa planta.'],
            ['SOURCEID no encontrado en PSH', 'yellow', ['all'], 'El SOURCEID del PSR no existe en el Production Source Header — dato huérfano.', 'Verificar que el PSH del SOURCEID exista y esté activo en IBP.'],
            ['Recurso X asignado en Resource Location para planta Y | Asociado a SOURCEID Z', 'ok', ['all'], 'La asignación recurso+planta es consistente entre PSR y Resource Location.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── TIPOS EXCLUIDOS ── */
    {
      id: 'pa-excluidos', icon: '🚫', title: 'Hoja: Tipos Excluidos',
      content: function () {
        return p('Solo aparece si el usuario excluyó algún tipo de material antes de ejecutar el análisis. Una fila por cada MATTYPEID excluido. Aunque un tipo esté excluido del análisis principal, sus productos siguen siendo validados <em>en contexto</em> si aparecen como componentes en el BOM de productos incluidos.') +
          sub('Columnas clave', colTable([
            ['MATTYPEID', 'Código del tipo de material excluido.'],
            ['# Productos', 'Cuántos productos del maestro tienen este tipo.'],
            ['Aparece como componente PSI en # SOURCEIDs', 'Cuántas recetas distintas usan productos de este tipo como ingrediente. Aunque el tipo esté excluido, se valida su configuración de abastecimiento cuando es componente.'],
            ['SOURCEIDs donde es componente (códigos)', 'Códigos de las recetas que usan productos de este tipo como componente PSI.'],
            ['Componentes con cobertura LocSrc', 'Cuántas combinaciones componente+planta (de este tipo excluido) SÍ tienen arco de Location Source configurado.'],
            ['Componentes sin cobertura LocSrc', 'Cuántas combinaciones componente+planta (de este tipo excluido) NO tienen arco de Location Source. Si > 0, hay insumos sin ruta de llegada a la planta que los consume.'],
            ['Observacion', 'Texto descriptivo del estado: indica si el tipo aparece como componente y si hay brechas de abastecimiento.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Excluido del análisis principal. Validado como componente en N fuente(s) de producción.', 'info', ['all'], 'El tipo de material está excluido del análisis principal pero sus productos aparecen como componentes PSI en N recetas distintas de productos incluidos. Se validan en contexto.', 'Sin acción requerida si la exclusión es intencional. Revisar las columnas de cobertura LocSrc para confirmar que los componentes tienen arcos de abastecimiento configurados.'],
            ['Excluido del análisis principal. No aparece como componente en ninguna fuente de producción.', 'info', ['all'], 'El tipo está excluido y ninguno de sus productos aparece como componente PSI de productos incluidos. No participa activamente en el análisis.', 'Sin acción requerida. La fila se incluye como registro de la exclusión y su impacto nulo en otros BOMs.'],
            ['⚠ N combinación(es) componente-planta sin arco de abastecimiento.', 'yellow', ['all'], 'Sufijo que se concatena a la observación cuando existen productos del tipo excluido que actúan como componentes y no tienen arco de Location Source hacia la planta donde se consumen.', 'Configurar el arco de Location Source para las combinaciones componente+planta sin cobertura, o revisar si la exclusión del tipo es realmente apropiada.']
          ])) +
          callout('info', 'Un tipo excluido que actúa como componente PSI de productos incluidos se valida igualmente. La exclusión solo omite el análisis principal de los productos de ese tipo, no su validación como ingrediente en otros BOMs.');
      }
    },

    /* ── TIPOS DE MATERIAL ── */
    {
      id: 'pa-mattypes', icon: '🏷️', title: 'Tipos de Material',
      content: function () {
        return p('Antes de ejecutar el análisis, el usuario asigna cada MATTYPEID a una o más categorías. Esta categorización determina <strong>qué validaciones aplican</strong> y <strong>qué severidad</strong> tienen los hallazgos. Un mismo dato faltante puede ser ⛔ Alerta para un Terminado y no generar ningún hallazgo para una Materia Prima.') +
          callout('warn', 'Si no se asigna ninguna categoría, el análisis aplica reglas en "modo permisivo" (todo se marca máximo ⚠ Advertencia) y puede ocultar problemas críticos reales. <strong>Se recomienda siempre categorizar antes de interpretar los resultados.</strong>') +
          sub('Categorías disponibles',
            '<div class="glos-mattype-grid">' +
              '<div class="glos-mattype-card">' +
                '<div class="glos-mattype-header" style="background:var(--accent)">' + catBadge(['finished']) + ' Producto Terminado</div>' +
                '<div class="glos-mattype-body">' +
                  '<p>Producto fabricado internamente. Requiere configuración completa para planificación de producción y distribución.</p>' +
                  '<ul>' +
                    '<li>Requiere BOM completo (PSH + PSI + PSR)</li>' +
                    '<li>PLEADTIME ausente o cero → ⛔ Alerta</li>' +
                    '<li>OUTPUTCOEFFICIENT ausente o cero → ⛔ Alerta</li>' +
                    '<li>Sin Location Product → ⛔ Alerta</li>' +
                    '<li>Planta productora no es origen en Location Source → ⛔ Alerta</li>' +
                  '</ul>' +
                '</div>' +
              '</div>' +
              '<div class="glos-mattype-card">' +
                '<div class="glos-mattype-header" style="background:var(--cyan)">' + catBadge(['semi']) + ' Semiterminado</div>' +
                '<div class="glos-mattype-body">' +
                  '<p>Componente fabricado internamente que alimenta otro proceso. No llega directamente al cliente.</p>' +
                  '<ul>' +
                    '<li>Requiere BOM (PSH + PSI + PSR)</li>' +
                    '<li>PLEADTIME ausente o cero → ⚠ Advertencia (no ⛔)</li>' +
                    '<li>Consume en planta productora → ✅ OK (sin transferencia requerida)</li>' +
                    '<li>Transfiere sin consumo en destino → ⛔ Alerta</li>' +
                    '<li>No aplica detección de Ghost Nodes ni Dead-ends (no necesita llegar a cliente)</li>' +
                  '</ul>' +
                '</div>' +
              '</div>' +
              '<div class="glos-mattype-card">' +
                '<div class="glos-mattype-header" style="background:var(--green)">' + catBadge(['rawmat']) + ' Mat. Prima / Insumo</div>' +
                '<div class="glos-mattype-body">' +
                  '<p>Ítem adquirido externamente. No se fabrica ni transforma internamente.</p>' +
                  '<ul>' +
                    '<li>No requiere PSH, PSI ni PSR</li>' +
                    '<li>Debe tener arco de proveedor en Location Source → si falta = ⛔ Alerta</li>' +
                    '<li>No se evalúa PLEADTIME ni ruta a cliente</li>' +
                    '<li>Tener PSH es inusual → ⚠ Advertencia de categorización</li>' +
                  '</ul>' +
                '</div>' +
              '</div>' +
              '<div class="glos-mattype-card">' +
                '<div class="glos-mattype-header" style="background:var(--purple)">' + catBadge(['trading']) + ' Mercadería</div>' +
                '<div class="glos-mattype-body">' +
                  '<p>Producto comprado y revendido sin transformación interna.</p>' +
                  '<ul>' +
                    '<li>No requiere PSH, PSI ni PSR</li>' +
                    '<li>Debe tener Location Source y Customer Source → sin ninguno = ⚠ Advertencia</li>' +
                    '<li>PLEADTIME no se evalúa</li>' +
                  '</ul>' +
                '</div>' +
              '</div>' +
            '</div>'
          ) +
          callout('info', '<strong>Multi-categoría:</strong> Un MATTYPEID puede pertenecer a más de una categoría. En ese caso, se aplica la regla más permisiva: si Terminado pide ⛔ y Semiterminado pide ⚠, el resultado es ⚠.');
      }
    }
  ];

  /* ═══════════════════════════════════════════════════════════════
     SUPPLY NETWORK ANALYZER — SECCIONES
     ═══════════════════════════════════════════════════════════════ */

  var SN_SECTIONS = [

    /* ── INTRO ── */
    {
      id: 'sn-intro', icon: '📋', title: 'Introducción',
      content: function () {
        return p('El <strong>Network Analyzer</strong> examina la red logística completa de SAP IBP: plantas, centros de distribución, clientes, arcos de transferencia (Location Source) y arcos de entrega (Customer Source). Para cada producto, construye el grafo de la red y detecta anomalías topológicas.') +
          p('El Excel de salida tiene 6 hojas: Resumen, Product, Location, Customer, Location Source y Customer Source. Cada hoja analiza la entidad desde la perspectiva de conectividad, lead times y habilitación en Location Product.') +
          legendEstados() +
          callout('info', '<strong>Importante:</strong> Al igual que en Production Analyzer, los hallazgos dependen de la categorización de tipos de material. Un producto Terminado que no llega a ningún cliente genera ⛔ Alerta; el mismo problema en un Semiterminado puede no generar alerta porque no se espera que llegue directamente al cliente. Ver sección <em>Tipos de Material</em>.') +
          callout('info', '<strong>Auto-split:</strong> Si una hoja supera 900.000 filas, el analizador crea hojas adicionales con el mismo nombre y sufijo numérico: Product (2), Product (3), etc. Las columnas son idénticas en todas las hojas del mismo grupo.');
      }
    },

    /* ── RESUMEN ── */
    {
      id: 'sn-resumen', icon: '📊', title: 'Hoja: Resumen',
      content: function () {
        return p('Primera hoja del libro. Una fila por cada hoja analizada. Permite ver de un vistazo la salud general de la red logística.') +
          colTable([
            ['#', 'Número de hoja en el libro Excel.'],
            ['Hoja', 'Nombre de la hoja analizada (Product, Location, Customer, Location Source, Customer Source).'],
            ['Total registros', 'Cantidad de filas procesadas en esa hoja.'],
            ['Alertas 🔴', 'Registros con problema crítico de conectividad o configuración.'],
            ['Advertencias 🟡', 'Registros con dato incompleto o sospechoso que conviene revisar.'],
            ['OK ✅', 'Registros sin hallazgos — todas las validaciones aplicables pasaron.'],
            ['% Consistencia', 'Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100.']
          ]) +
          callout('tip', '<strong>Lectura recomendada:</strong> Comienza por la hoja Product, que concentra los hallazgos más importantes de conectividad. Luego revisa Location para identificar nodos críticos y finalmente Location Source / Customer Source para arcos con problemas de lead time o configuración.');
      }
    },

    /* ── PRODUCT ── */
    {
      id: 'sn-product', icon: '🧪', title: 'Hoja: Product',
      content: function () {
        return p('Una fila por cada producto presente en la red (Location Source, Customer Source, PSH o Location Product). Esta hoja es el corazón del análisis: construye el grafo completo de la red para cada producto y detecta anomalías de conectividad.') +
          sub('Columnas de identificación', colTable([
            ['Estado', '⛔ / ⚠ / ✅ según el hallazgo más grave encontrado.'],
            ['Observacion', 'Detalle de todos los hallazgos o, si está OK, descripción de qué validaciones pasaron.'],
            ['PRDID', 'Código único del producto en SAP IBP.'],
            ['PRDDESCR', 'Descripción del producto del maestro.'],
            ['MATTYPEID', 'Tipo de material SAP. Determina qué reglas de análisis se aplican.']
          ])) +
          sub('Columnas de presencia en red (flags Sí/No)', colTable([
            ['En PSH?', '¿El producto tiene al menos una fuente de producción (PSH)?'],
            ['En PSI?', '¿El producto aparece como componente en alguna receta?'],
            ['En Location Source?', '¿Tiene arcos de transferencia entre ubicaciones?'],
            ['En Customer Source?', '¿Tiene arcos de entrega a algún cliente?'],
            ['En Location Product?', '¿Está habilitado en Location Product en al menos una ubicación?'],
            ['En Customer Product?', '¿Está habilitado en Customer Product para algún cliente?'],
            ['Solo en maestro?', 'Sí = el producto solo existe en el maestro de materiales sin ninguna actividad en la red. Indica producto huérfano.']
          ])) +
          sub('Columnas de análisis de red', colTable([
            ['Estado de la Red', 'Clasificación sintética de la situación logística del producto. Ver tabla de estados más abajo.'],
            ['# Plantas', 'Número de plantas que producen este producto (tienen PSH).'],
            ['# DCs', 'Número de centros de distribución o nodos intermedios que manejan este producto en Location Source sin ser plantas productoras.'],
            ['# Clientes', 'Número de clientes que reciben este producto vía Customer Source.'],
            ['# Rutas completas', 'Cantidad de rutas planta-a-cliente encontradas. 0 = el producto no llega a ningún cliente.'],
            ['Ruta mas larga', 'Número de saltos de la ruta más larga encontrada (planta → DC → ... → cliente).'],
            ['# Ghost Nodes', 'Ubicaciones intermedias que reciben el producto pero cuyas salidas no llegan a ningún cliente.'],
            ['# Dead Ends', 'Ubicaciones que reciben el producto pero no tienen ninguna salida configurada.'],
            ['Health Score', 'Puntaje 0-100 que mide la salud de la configuración de red del producto. Ver sección Health Score más abajo.'],
            ['Categoria de salud', 'Healthy = Health Score ≥ 80 | Acceptable = ≥ 60 | Weak = ≥ 40 | Critical = < 40.'],
            ['Detalle Calculo Health Score', 'Desglose paso a paso: bonificaciones (+) por rutas completas, multi-sourcing, múltiples clientes y lead times; penalizaciones (-) por Ghost Nodes, Dead-ends, rutas únicas y fuente única de producción.'],
            ['# Origenes (LOCFR)', 'Número de ubicaciones de origen distintas que envían este producto en Location Source.'],
            ['Origenes (codigos)', 'Códigos de las ubicaciones origen.'],
            ['# Destinos (LOCID)', 'Número de ubicaciones de destino distintas que reciben este producto vía Location Source.'],
            ['Destinos (codigos)', 'Códigos de las ubicaciones destino.'],
            ['# Clientes en CustSrc', 'Número de clientes configurados en Customer Source para este producto.'],
            ['Clientes (codigos)', 'Códigos de los clientes configurados en Customer Source.'],
            ['Multi-sourced?', 'Sí/No — alguna ubicación destino recibe este producto desde más de un origen simultáneamente.'],
            ['TLT promedio (dias)', 'Promedio de TLEADTIME de todos los arcos de Location Source. "—" si no hay arcos.'],
            ['CLT promedio (dias)', 'Promedio de CLEADTIME de todos los arcos de Customer Source. "—" si no hay arcos.'],
            ['# Plantas aisladas', 'Plantas que producen el producto pero no tienen ninguna ruta hasta algún cliente.']
          ])) +
          callout('info', '<strong>Valor N/A:</strong> Cuando una métrica no aplica o no tiene datos (ej: TLT promedio para un producto sin Location Source), la celda muestra "—" con fondo gris claro en itálica. No indica un error sino ausencia de dato para ese campo.') +
          sub('Health Score — fórmula por categoría',
            p('El puntaje se calcula de forma diferente según la categoría del producto, porque las expectativas de red son distintas para cada tipo:') +
            '<div class="glos-table-wrap"><table class="glos-col-table"><thead><tr><th>Categoría</th><th>Bonificaciones</th><th>Penalizaciones</th></tr></thead><tbody>' +
              '<tr><td>' + catBadge(['finished']) + ' Terminado / Sin cat.</td><td>+50 si hay rutas completas; +15 si múltiples clientes; +15 si múltiples rutas; +20 si múltiples plantas.</td><td>-20 por ghost nodes; -15 por dead-ends; -20 por clientes con ruta única; -15 por fuente única de producción.</td></tr>' +
              '<tr><td>' + catBadge(['semi']) + ' Semiterminado</td><td>+30 si tiene PSH; +40 si tiene consumo PSI; +20 si múltiples plantas; +10 si tiene Location Source.</td><td>Sin penalizaciones.</td></tr>' +
              '<tr><td>' + catBadge(['rawmat']) + ' Mat. Prima</td><td>+60 si tiene Location Source; +20 si tiene al menos un destino intermedio (DC) en Location Source; +20 si tiene Customer Source.</td><td>Sin penalizaciones.</td></tr>' +
              '<tr><td>' + catBadge(['trading']) + ' Mercadería</td><td>+40 si tiene Location Source; +40 si tiene Customer Source; +20 si múltiples clientes.</td><td>Sin penalizaciones.</td></tr>' +
            '</tbody></table></div>'
          ) +
          sub('Estados de la Red', netStatusTable([
            ['Red Completa', 'ok', ['finished', 'uncategorized'], 'El producto tiene al menos una ruta completa desde una planta productora hasta un cliente. Configuración correcta.'],
            ['Sin Entrega a Cliente', 'red', ['finished', 'uncategorized'], 'El producto tiene producción (PSH) y arcos de distribución (Location Source) pero ninguno llega hasta un Customer Source — no se entrega a ningún cliente.'],
            ['Sin Distribución', 'red', ['finished', 'uncategorized'], 'El producto tiene producción (PSH) pero no hay arcos de distribución (Location Source) desde la planta. Sale de la planta sin ruta configurada.'],
            ['Distribución sin ruta completa', 'red', ['finished', 'uncategorized'], 'El producto tiene Customer Source configurado pero no existe ninguna ruta completa que conecte la producción con esa entrega al cliente.'],
            ['Solo Entrega', 'red', ['trading', 'uncategorized'], 'El producto tiene Customer Source (entrega a cliente) pero no tiene Location Source (distribución). Sin origen declarado en la red.'],
            ['Solo Distribución', 'yellow', ['trading'], 'El producto tiene Location Source pero no tiene Customer Source — nunca llega a ningún cliente desde la red declarada.'],
            ['Solo Distribución', 'red', ['uncategorized'], 'El producto sin categoría tiene Location Source pero no tiene Customer Source ni PSH. Sin categoría definida, la ausencia de entrega a cliente se considera un error.'],
            ['Solo Distribución + Entrega', 'ok', ['trading'], 'Mercadería con arcos de distribución (LS) y entrega (CS) correctamente configurados.'],
            ['Solo Distribución + Entrega', 'red', ['uncategorized'], 'El producto sin categoría tiene arcos de distribución y entrega pero no tiene PSH. Sin categoría definida, la ausencia de producción se considera un error.'],
            ['Semiterminado Local', 'ok', ['semi'], 'El semiterminado se produce y consume en la misma planta. No requiere transferencia.'],
            ['Semiterminado con Transferencia', 'ok', ['semi'], 'El semiterminado se produce en una planta y se consume como PSI en la planta destino de la transferencia.'],
            ['Semiterminado Local con Transferencia', 'ok', ['semi'], 'El semiterminado se consume en la planta productora Y también se transfiere a otra planta donde también se consume.'],
            ['Semiterminado sin Transferencia', 'red', ['semi'], 'El semiterminado tiene PSH en una planta distinta a donde es consumido, pero no tiene arco de Location Source hacia la planta consumidora.'],
            ['Sin Producción', 'red', ['semi', 'finished'], 'El producto no tiene Production Source Header — no tiene fuente de producción configurada. Para semiterminado: no se está fabricando internamente. Para terminado: está categorizado como producto final pero tiene arcos de red sin receta de producción.'],
            ['Sin Consumo PSI', 'red', ['semi'], 'El semiterminado tiene producción pero no aparece como componente en ningún BOM.'],
            ['Abastecimiento Completo', 'ok', ['rawmat'], 'El insumo tiene arcos de Location Source que llegan hasta al menos una planta productora.'],
            ['Abastecimiento Parcial', 'yellow', ['rawmat'], 'El insumo tiene Location Source pero ningún arco llega hasta una planta productora — posible configuración incompleta.'],
            ['Abastecimiento sin Consumo PSI', 'yellow', ['rawmat'], 'El insumo tiene Location Source pero no aparece en ningún BOM como componente — arco de abastecimiento sin uso productivo declarado.'],
            ['Sin Abastecimiento', 'red', ['rawmat'], 'El insumo no tiene ningún arco en Location Source — no tiene origen declarado en la red.'],
            ['Sin arcos de red', 'red', ['finished', 'uncategorized'], 'El producto no tiene ningún arco en Location Source ni Customer Source — completamente desconectado de la red.'],
            ['Sin arcos de red', 'yellow', ['trading'], 'La mercadería no tiene ningún arco en Location Source ni Customer Source — completamente desconectada de la red.'],
            ['Huérfano', 'red', ['all'], 'El producto solo existe en el maestro de materiales sin ninguna actividad en la red (no está en PSH, PSI, Location Source, Customer Source ni Location Product).']
          ])) +
          callout('warn', '<strong>Estados de la Red en la columna Observacion:</strong> Cuando el Estado de la Red no es el estado OK de la categoría del producto, su texto exacto aparece también como primera observación en la columna Observacion. Los estados OK por categoría son: <em>Terminado / Sin cat.</em> = "Red Completa"; <em>Mercadería</em> = "Solo Distribución + Entrega"; <em>Mat. Prima</em> = "Abastecimiento Completo"; <em>Semiterminado</em> = cualquiera de los tres estados "Semiterminado...". Todos los demás estados indican un problema y aparecen en Observacion con el mismo texto.') +
          sub('Observaciones posibles', obsTable([
            ['Sin Entrega a Cliente', 'red', ['finished', 'uncategorized'], 'El producto tiene PSH y Location Source pero ningún arco llega hasta un cliente. El Estado de la Red es "Sin Entrega a Cliente" y ese texto aparece en Observacion.', 'Verificar que exista al menos un arco de Customer Source para este producto, o que la red de Location Source conecte la producción con alguna ubicación que tenga Customer Source.'],
            ['Sin Distribución', 'red', ['finished', 'uncategorized'], 'El producto tiene PSH pero no tiene arcos de Location Source saliendo de la planta. El Estado de la Red es "Sin Distribución" y ese texto aparece en Observacion.', 'Crear al menos un arco en Location Source con la planta productora como LOCFR.'],
            ['Distribución sin ruta completa', 'red', ['finished', 'uncategorized'], 'El producto tiene Customer Source pero no existe ninguna ruta completa de producción que llegue hasta él. Aparece textualmente en Observacion.', 'Revisar los arcos de Location Source e identificar el nodo desconectado que impide que la producción llegue hasta el arco de entrega al cliente.'],
            ['Solo Entrega', 'red', ['trading', 'uncategorized'], 'El producto tiene Customer Source pero no tiene Location Source. Aparece textualmente en Observacion.', 'Configurar los arcos de Location Source que lleven el producto desde su origen hasta la ubicación de entrega al cliente.'],
            ['Solo Distribución', 'yellow', ['trading'], 'El producto tiene Location Source pero no tiene Customer Source. Aparece textualmente en Observacion.', 'Configurar los arcos de Customer Source para que el producto llegue a algún cliente.'],
            ['Solo Distribución', 'red', ['uncategorized'], 'El producto sin categoría tiene Location Source pero no tiene Customer Source ni PSH. Aparece textualmente en Observacion.', 'Asignar una categoría al tipo de material en la configuración, o configurar los arcos de Customer Source y Production Source Header que correspondan.'],
            ['Solo Distribución + Entrega', 'red', ['uncategorized'], 'El producto sin categoría tiene arcos de distribución (LS) y entrega (CS) pero no tiene PSH. Aparece textualmente en Observacion.', 'Asignar la categoría correcta al tipo de material. Si es Mercadería, reclasificarlo como trading en la configuración de tipos de material.'],
            ['Sin arcos de red', 'red', ['finished', 'uncategorized'], 'El producto no tiene ningún arco en Location Source ni Customer Source. Aparece textualmente en Observacion.', 'Revisar si el producto está activo en IBP. Configurar al menos un arco en Location Source o Customer Source según corresponda a su rol en la cadena.'],
            ['Sin arcos de red', 'yellow', ['trading'], 'La mercadería no tiene ningún arco en Location Source ni Customer Source. Aparece textualmente en Observacion.', 'Revisar si el producto está activo en IBP. Configurar al menos un arco en Location Source o Customer Source según el rol de distribución esperado.'],
            ['Semiterminado sin Transferencia', 'red', ['semi'], 'El semiterminado se produce en una planta distinta a donde es consumido, pero no tiene arco de Location Source hacia la planta consumidora. Aparece textualmente en Observacion.', 'Configurar el arco de Location Source desde la planta productora del semiterminado hacia la planta donde es consumido como componente.'],
            ['Sin Producción', 'red', ['semi', 'finished'], 'El producto no tiene PSH. Para semiterminado: no está fabricándose internamente. Para terminado: tiene arcos de red pero no tiene receta de producción configurada. Aparece textualmente en Observacion.', 'Crear la fuente de producción (PSH con SOURCETYPE=P) en IBP, o verificar si el producto debe reclasificarse como Mercadería en la configuración de tipos de material.'],
            ['Sin Consumo PSI', 'red', ['semi'], 'El semiterminado tiene PSH pero no aparece como componente en ningún BOM. Aparece textualmente en Observacion.', 'Agregar este semiterminado como componente (PSI) en el BOM del producto terminado que lo consume.'],
            ['Sin Abastecimiento', 'red', ['rawmat'], 'El insumo no tiene ningún arco en Location Source. Aparece textualmente en Observacion.', 'Configurar el arco de Location Source con el proveedor o planta origen como LOCFR hacia las plantas consumidoras.'],
            ['Abastecimiento Parcial', 'yellow', ['rawmat'], 'El insumo tiene Location Source pero ningún arco llega hasta una planta productora. Aparece textualmente en Observacion.', 'Revisar si falta el arco final en Location Source que conecte el origen con la planta donde se consume el insumo.'],
            ['Abastecimiento sin Consumo PSI', 'yellow', ['rawmat'], 'El insumo tiene Location Source pero no aparece en ningún BOM. Aparece textualmente en Observacion.', 'Verificar si el insumo está vigente y si debe ser agregado como componente PSI en alguna receta de producción.'],
            ['Huérfano', 'red', ['all'], 'El producto solo existe en el maestro de materiales — no tiene ninguna actividad en la red. Aparece textualmente en Observacion.', 'Verificar si el producto es obsoleto o si falta configurar su participación en la red (PSH, Location Source, Customer Source o Location Product).'],
            ['Ghost node: X', 'red', ['finished', 'trading', 'uncategorized'], 'La ubicación X recibe el producto pero todas sus salidas terminan en un callejón sin salida — no llega a ningún cliente.', 'Revisar la configuración de arcos salientes de la ubicación X en Location Source. Puede faltar un arco hacia el siguiente nodo o hacia un Customer Source.'],
            ['Dead-end: X', 'red', ['finished', 'trading', 'uncategorized'], 'La ubicación X recibe el producto por Location Source pero no tiene ninguna salida configurada — el producto llega y no puede continuar.', 'Agregar el arco de salida faltante en Location Source o en Customer Source desde la ubicación X, o verificar si ese nodo es el destino final (y entonces falta un Customer Source).'],
            ['Planta aislada: X', 'red', ['finished', 'trading', 'uncategorized'], 'La planta X produce este producto pero no tiene ninguna ruta que llegue a algún cliente — producción sin mercado alcanzable.', 'Revisar arcos de distribución desde la planta X en Location Source. Puede faltar el arco inicial desde la planta hacia el primer nodo de distribución.'],
            ['Ciclo: X → Y → Z → X', 'red', ['all'], 'Se detectó un ciclo en la red: el producto puede circular indefinidamente entre estas ubicaciones sin llegar a ningún cliente.', 'Revisar los arcos de Location Source entre las ubicaciones del ciclo e identificar cuál está configurado en sentido incorrecto.'],
            ['PLEADTIME faltante: X', 'red', ['finished', 'semi', 'uncategorized'], 'La planta X produce este producto pero su PLEADTIME es 0 o está vacío. IBP planifica producción instantánea.', 'Ingresar el PLEADTIME real en días en el Production Source Header para la planta X y este producto.'],
            ['TLEADTIME faltante: X→Y', 'yellow', ['all'], 'El arco de transferencia X→Y tiene TLEADTIME = 0 o vacío. IBP planifica transferencias instantáneas en ese tramo.', 'Ingresar el TLEADTIME real en días en el arco de Location Source X→Y para este producto.'],
            ['CLEADTIME faltante: X→Y', 'yellow', ['finished', 'trading', 'uncategorized'], 'El arco de entrega X→Y (hacia cliente) tiene CLEADTIME = 0 o vacío. IBP planifica entregas instantáneas en ese tramo.', 'Ingresar el CLEADTIME real en días en el arco de Customer Source X→Y para este producto.'],
            ['Sin Location Product', 'yellow', ['all'], 'El producto está en PSH o en Location Source pero no está habilitado en Location Product en alguna ubicación de la red.', 'Habilitar el producto en Location Product para las ubicaciones donde participa activamente en la red.'],
            ['Sin Customer Product', 'yellow', ['all'], 'El producto tiene Customer Source (entrega a cliente) pero no está habilitado en Customer Product para ese cliente.', 'Habilitar la combinación producto+cliente en Customer Product en IBP.'],
            ['Red desconectada: arcos LS y CS no comparten ubicaciones', 'red', ['trading', 'uncategorized'], 'Los arcos de distribución (Location Source) y los arcos de entrega (Customer Source) no tienen ninguna ubicación en común — la red está partida en dos fragmentos desconectados.', 'Revisar que al menos una ubicación aparezca tanto en Location Source (como destino) como en Customer Source (como origen de entrega).'],
            ['Destino(s) de transferencia sin consumo PSI: X, Y', 'red', ['semi'], 'El semiterminado se transfiere a las ubicaciones X, Y pero en ninguna de ellas se consume como ingrediente en alguna receta.', 'Agregar el semiterminado como componente PSI en el BOM de la planta destino, o eliminar el arco de transferencia si es un error.'],
            ['Paths truncados (>50.000, red muy compleja)', 'yellow', ['all'], 'La red tiene más de 50.000 rutas posibles — se procesaron parcialmente para evitar bloqueo del sistema.', 'Esta advertencia es informativa. El análisis es representativo pero puede no detectar todas las anomalías. Considerar simplificar la red o analizar por subconjunto de productos.'],
            ['Semiterminado consumido en planta productora con transferencia configurada', 'ok', ['semi'], 'El semiterminado se consume en la planta donde se fabrica y además se transfiere a otra planta donde también se consume como PSI.', 'Sin acción requerida.'],
            ['Semiterminado consumido en destino de transferencia', 'ok', ['semi'], 'El semiterminado se transfiere a otra planta donde es consumido como PSI — flujo correcto.', 'Sin acción requerida.'],
            ['Semiterminado consumido en planta productora', 'ok', ['semi'], 'El semiterminado se consume localmente en la planta donde se fabrica.', 'Sin acción requerida.'],
            ['Habilitado en Location Product', 'ok', ['all'], 'El producto está habilitado en Location Product en todas las ubicaciones activas de su red.', 'Sin acción requerida.'],
            ['Lead times definidos', 'ok', ['semi', 'finished', 'uncategorized'], 'Todos los arcos de transferencia y entrega del producto tienen lead time mayor que cero.', 'Sin acción requerida.'],
            ['Mercadería con arcos de distribución y entrega', 'ok', ['trading'], 'La mercadería tiene Location Source y Customer Source correctamente configurados.', 'Sin acción requerida.'],
            ['Red completa sin anomalias', 'ok', ['finished', 'uncategorized'], 'El producto tiene rutas completas de planta a cliente y no se detectaron Ghost Nodes, Dead-ends ni ciclos.', 'Sin acción requerida.'],
            ['N ruta(s) a cliente', 'ok', ['finished', 'trading', 'uncategorized'], 'El producto tiene N rutas completas desde plantas productoras hasta clientes. A mayor número de rutas, mayor resiliencia.', 'Sin acción requerida.'],
            ['Habilitado en Customer Product', 'ok', ['finished', 'trading', 'uncategorized'], 'El producto está habilitado en Customer Product en todos los clientes con entrega configurada.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── LOCATION ── */
    {
      id: 'sn-location', icon: '🏭', title: 'Hoja: Location',
      content: function () {
        return p('Una fila por cada ubicación detectada en la red. Acumula los hallazgos topológicos de todos los productos que pasan por esa ubicación.') +
          sub('Roles inferidos de ubicación', colTable([
            ['Planta con Entrega', 'Tiene PSH (fabrica) Y entrega directamente a clientes vía Customer Source.'],
            ['Planta', 'Tiene PSH (fabrica) pero no entrega directamente a clientes.'],
            ['DC con Entrega Directa', 'Aparece en Location Source como origen o destino (redistribuye) Y entrega directamente a clientes vía Customer Source.'],
            ['DC', 'Aparece en Location Source sin entrega directa a clientes.'],
            ['Punto de Entrega', 'Solo aparece en Customer Source como origen de entrega a clientes — sin producción ni transferencias entre ubicaciones.'],
            ['Sin rol activo', 'No aparece en ninguna entidad de red activa — ubicación inactiva o solo en el maestro.']
          ])) +
          sub('Columnas clave', colTable([
            ['Estado', '⛔ / ⚠ / ✅ según el hallazgo más grave.'],
            ['Observacion', 'Detalle de todos los hallazgos.'],
            ['LOCID', 'Código de la ubicación.'],
            ['LOCDESCR', 'Descripción de la ubicación del maestro.'],
            ['LOCTYPE', 'Tipo de ubicación del maestro (informativo).'],
            ['Rol inferido', 'Rol inferido del comportamiento de la ubicación en la red. Ver tabla de roles más arriba.'],
            ['En PSH?', 'Sí/No — la ubicación tiene al menos una fuente de producción (fabrica algo).'],
            ['En Location Source?', 'Sí/No — aparece como origen o destino en algún arco de transferencia.'],
            ['En Customer Source?', 'Sí/No — aparece como ubicación de entrega a algún cliente.'],
            ['En Location Product?', 'Sí/No — habilitada en Location Product. Sin esto IBP no planifica en esta ubicación.'],
            ['Solo en maestro?', 'Sí = la ubicación existe en el maestro pero no aparece en ninguna entidad de red activa.'],
            ['# Productos manejados', 'Total de productos distintos que pasan por esta ubicación como origen, destino o planta productora.'],
            ['# Como origen (LOCFR)', 'Cuántos arcos de Location Source tienen esta ubicación como origen.'],
            ['# Como destino (LOCID)', 'Cuántos arcos de Location Source tienen esta ubicación como destino.'],
            ['# Clientes servidos', 'Número de clientes distintos que reciben productos desde esta ubicación vía Customer Source.'],
            ['Es nodo critico?', 'Sí/No — su eliminación cortaría rutas de al menos un producto a al menos un cliente.'],
            ['# Productos impactados', 'Si es nodo crítico: cuántos productos distintos dependen de este nodo para llegar a algún cliente.'],
            ['# Clientes impactados', 'Si es nodo crítico: cuántos clientes distintos perderían abastecimiento si este nodo fallara.'],
            ['Nivel de riesgo', 'Critical = 4 o más productos impactados | High = 2-3 productos | Medium = 1 producto. Solo aplica si es nodo crítico.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Ghost node (alimentado sin salida util)', 'red', ['finished', 'trading'], 'Esta ubicación recibe el producto desde algún origen pero todas sus salidas conducen a callejones sin salida — el producto nunca llega a un cliente a través de este nodo.', 'Revisar los arcos salientes de esta ubicación en Location Source y Customer Source. Puede faltar el arco final hacia un cliente o hacia el siguiente nodo de la cadena.'],
            ['Dead-end (recibe pero no reenvía)', 'red', ['finished', 'trading'], 'Esta ubicación recibe producto por Location Source pero no tiene ningún arco de salida configurado — el producto llega y no puede continuar.', 'Agregar el arco de salida faltante en Location Source o Customer Source, o verificar si esta ubicación es el destino final y falta el arco a un cliente.'],
            ['Planta aislada (sin ruta a ningun cliente)', 'red', ['finished'], 'Esta planta produce algún producto pero ninguna de sus rutas logísticas llega hasta algún cliente.', 'Revisar la configuración de Location Source desde esta planta e identificar el arco faltante que conecte la producción con la red de distribución.'],
            ['Participa en ciclo: X→Y→Z→X', 'red', ['all'], 'Esta ubicación forma parte de un ciclo en la red logística. El producto puede circular indefinidamente sin llegar a un cliente.', 'Identificar cuál de los arcos del ciclo está configurado en sentido incorrecto y corregirlo en Location Source.'],
            ['Sin Location Product', 'red', ['all'], 'Esta ubicación participa activamente en la red (PSH o Location Source) pero no está habilitada en Location Product. IBP no puede planificar en ella.', 'Habilitar la ubicación en Location Product para los productos que la utilizan.'],
            ['Nodo critico: N prod, N clientes', 'yellow', ['all'], 'Esta ubicación es un punto único de falla: si desaparece, N productos dejarían de llegar a N clientes. No es un error de configuración sino un riesgo de resiliencia.', 'Evaluar si se justifica agregar una ruta alternativa que no dependa de este nodo para los productos críticos.'],
            ['Solo en maestro de ubicaciones, sin actividad en la red', 'yellow', ['all'], 'La ubicación existe en el maestro pero no aparece en ninguna entidad de red.', 'Verificar si la ubicación es obsoleta o si falta configurar su participación en la red de abastecimiento.'],
            ['Sin anomalias topologicas', 'ok', ['all'], 'La ubicación no presenta Ghost Nodes, Dead-ends, ciclos ni problemas de Location Product en ninguno de sus productos.', 'Sin acción requerida.'],
            ['Habilitado en Location Product', 'ok', ['all'], 'La ubicación está habilitada en Location Product para todos los productos activos que la utilizan.', 'Sin acción requerida.'],
            ['N cliente(s) servido(s)', 'ok', ['all'], 'La ubicación despacha a N clientes distintos vía Customer Source.', 'Sin acción requerida.'],
            ['Activo como origen para N producto(s)', 'ok', ['all'], 'La ubicación es origen activo en Location Source para N productos distintos.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── CUSTOMER ── */
    {
      id: 'sn-customer', icon: '👤', title: 'Hoja: Customer',
      content: function () {
        return p('Una fila por cada cliente detectado en la red (Customer Source o Customer Product). Analiza si cada cliente puede recibir productos a través de rutas completas desde la producción.') +
          sub('Columnas clave', colTable([
            ['Estado', '⛔ / ⚠ / ✅ según el hallazgo más grave.'],
            ['Observacion', 'Detalle de todos los hallazgos.'],
            ['CUSTID', 'Código único del cliente en SAP IBP.'],
            ['CUSTDESCR', 'Descripción del cliente del maestro.'],
            ['En Customer Source?', 'Sí/No — el cliente tiene al menos un arco de entrega configurado.'],
            ['En Customer Product?', 'Sí/No — habilitado en Customer Product. Sin esto IBP ignora al cliente en planificación.'],
            ['Solo en maestro?', 'Sí = el cliente existe en el maestro pero no tiene arcos de entrega en Customer Source.'],
            ['# Productos recibidos', 'Número de productos distintos que este cliente puede recibir según Customer Source.'],
            ['# Ubicaciones proveedoras', 'Número de ubicaciones desde las que se despacha al cliente.'],
            ['# Paths que llegan', 'Total de rutas completas de planta a este cliente (suma de todos sus productos).'],
            ['Resiliencia predominante', 'Single Path = algún producto llega solo por una ruta completa | Single Node Dependency = hay un nodo único cuyo fallo corta el abastecimiento | Resilient = todos los productos tienen rutas alternativas | — = sin rutas configuradas.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Sin productos alcanzables desde produccion', 'red', ['all'], 'El cliente tiene Customer Source configurado pero ninguna ruta completa conecta la producción con sus arcos de entrega.', 'Revisar la red de distribución hacia este cliente e identificar los arcos faltantes en Location Source o Customer Source.'],
            ['Sin Customer Product', 'yellow', ['all'], 'El cliente tiene arcos de entrega (Customer Source) pero no está habilitado en Customer Product. IBP lo ignora en la planificación.', 'Habilitar las combinaciones cliente+producto correspondientes en Customer Product en IBP.'],
            ['N producto(s) con unica ruta', 'yellow', ['all'], 'N productos llegan a este cliente por una sola ruta completa. Si esa ruta falla, el abastecimiento se corta.', 'Evaluar si se justifica agregar una ruta alternativa para los productos indicados, para aumentar la resiliencia del abastecimiento.'],
            ['N producto(s) con nodo critico unico', 'info', ['all'], 'N productos llegan a este cliente a través de un nodo crítico único: si ese nodo desaparece, el abastecimiento se corta. El Estado puede ser ✅ si no hay además rutas de punto único — es una observación de riesgo de resiliencia, no un error de configuración.', 'Identificar el nodo crítico indicado y evaluar agregar una ruta alternativa que evite ese único punto de falla.'],
            ['Solo en maestro, sin uso en red', 'red', ['all'], 'El cliente existe en el maestro pero no tiene arcos de entrega en Customer Source ni está habilitado en Customer Product. Se marca ⛔ porque un cliente sin ninguna actividad en la red es una anomalía de datos.', 'Verificar si el cliente es obsoleto o si falta configurar sus arcos de entrega en Customer Source.'],
            ['Abastecido con rutas resilientes', 'ok', ['all'], 'Todos los productos de este cliente tienen múltiples rutas alternativas y no dependen de un nodo único.', 'Sin acción requerida.'],
            ['Habilitado en Customer Product', 'ok', ['all'], 'El cliente está habilitado en Customer Product para todos los productos que lo abastecen.', 'Sin acción requerida.'],
            ['N producto(s) alcanzables', 'ok', ['all'], 'El cliente tiene N productos con al menos una ruta completa de producción configurada.', 'Sin acción requerida.'],
            ['N ruta(s) configuradas', 'ok', ['all'], 'El cliente tiene N rutas de entrega activas en Customer Source con al menos una fuente de producción alcanzable.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── LOCATION SOURCE ── */
    {
      id: 'sn-ls', icon: '↗️', title: 'Hoja: Location Source',
      content: function () {
        return p('Una fila por cada arco de transferencia en Location Source (combinación PRDID + LOCFR + LOCID). Analiza si cada arco tiene lead time definido, si los nodos extremos están habilitados en Location Product, y si el arco pertenece a alguna ruta completa.') +
          sub('Columnas clave', colTable([
            ['Estado', '⛔ / ⚠ / ✅ según el hallazgo más grave del arco.'],
            ['Observacion', 'Detalle de todos los hallazgos del arco.'],
            ['PRDID', 'Producto transferido en este arco.'],
            ['PRDDESCR', 'Descripción del producto.'],
            ['MATTYPEID', 'Tipo de material del producto.'],
            ['LOCFR', 'Código de la ubicación de origen del arco.'],
            ['LOCFR Descripcion', 'Descripción de la ubicación origen.'],
            ['LOCID', 'Código de la ubicación de destino del arco.'],
            ['LOCID Descripcion', 'Descripción de la ubicación destino.'],
            ['TLEADTIME', 'Lead time de transferencia en días. 0 o vacío genera ⚠ Advertencia.'],
            ['LOCFR+PRDID en Location Product?', 'Sí/No — la ubicación origen está habilitada para este producto en Location Product.'],
            ['LOCID+PRDID en Location Product?', 'Sí/No — la ubicación destino está habilitada para este producto en Location Product.'],
            ['PRDID en PSH?', 'Sí/No — el producto tiene al menos una fuente de producción. Útil para distinguir si el producto se fabrica o solo se redistribuye.'],
            ['Arco en ruta completa?', 'Sí/No — este arco forma parte de al menos una ruta que llega a un cliente. Arcos con No son candidatos a revisión: están configurados pero no contribuyen a ninguna ruta de planta a cliente. Pueden ser obsoletos o pueden indicar una brecha en la red.'],
            ['Arco inverso?', 'Sí/No — existe un arco configurado en dirección opuesta (LOCID→LOCFR) para el mismo producto. Puede indicar un ciclo en la red.'],
            ['Lead Time Status', 'OK = TLEADTIME > 0 | Zero = TLEADTIME = 0 | Missing = sin valor definido.'],
            ['SPOF arco?', 'Sí/No — Single Point of Failure: el destino LOCID tiene un único origen para este producto (este arco). Si falla, el destino queda sin abastecimiento del producto.']
          ])) +
          sub('Observaciones posibles', obsTable([
            ['Sin Location Product en origen (X)', 'red', ['all'], 'La ubicación origen X no tiene habilitado este producto en Location Product. IBP no reconoce el producto en ese punto de la red.', 'Habilitar la combinación LOCFR+PRDID en Location Product en IBP.'],
            ['Sin Location Product en destino (X)', 'red', ['all'], 'La ubicación destino X no tiene habilitado este producto en Location Product. IBP no puede planificar el producto en esa ubicación.', 'Habilitar la combinación LOCID+PRDID en Location Product en IBP.'],
            ['Arco duplicado en el dataset', 'red', ['all'], 'Existe más de un arco con la misma combinación PRDID+LOCFR+LOCID en el dataset descargado. IBP puede producir comportamientos inesperados con arcos duplicados.', 'Revisar y eliminar el arco duplicado en Location Source en IBP. Verificar que no sean versiones o planning areas distintos mezclados en el mismo download.'],
            ['TLEADTIME missing', 'yellow', ['all'], 'El campo TLEADTIME no tiene valor definido. IBP usa 0 por defecto, planificando transferencias instantáneas.', 'Ingresar el TLEADTIME real en días en el arco de Location Source correspondiente en IBP.'],
            ['TLEADTIME zero', 'yellow', ['all'], 'El TLEADTIME está explícitamente definido como 0. IBP planifica transferencias instantáneas en este tramo.', 'Verificar si 0 días es intencional (cross-docking mismo día) o si falta ingresar el lead time real.'],
            ['Existe arco inverso (LOCID→LOCFR)', 'yellow', ['all'], 'Hay un arco configurado en la dirección opuesta para el mismo producto. Puede ser intencional (flujo bidireccional) o puede indicar un ciclo en la red.', 'Verificar si el flujo bidireccional es intencional. Si no, eliminar el arco inverso incorrecto en Location Source.'],
            ['Arco valido | Location Product en origen y destino | TLEADTIME definido', 'ok', ['all'], 'El arco tiene lead time definido y ambas ubicaciones extremas están habilitadas en Location Product.', 'Sin acción requerida.'],
            ['... | En ruta completa', 'ok', ['all'], 'Además de estar correctamente configurado, este arco forma parte de al menos una ruta completa de planta a cliente.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── CUSTOMER SOURCE ── */
    {
      id: 'sn-cs', icon: '📦', title: 'Hoja: Customer Source',
      content: function () {
        return p('Una fila por cada arco de entrega a cliente en Customer Source (combinación PRDID + LOCID + CUSTID). Analiza si cada entrega tiene lead time definido, si los extremos están habilitados, y si existe una ruta completa que la abastezca.') +
          sub('Columnas clave', colTable([
            ['Estado', '⛔ / ⚠ / ✅ según el hallazgo más grave del arco.'],
            ['Observacion', 'Detalle de todos los hallazgos del arco.'],
            ['PRDID', 'Producto entregado al cliente.'],
            ['PRDDESCR', 'Descripción del producto.'],
            ['MATTYPEID', 'Tipo de material del producto.'],
            ['LOCID', 'Código de la ubicación de despacho desde donde sale el producto al cliente.'],
            ['LOCID Descripcion', 'Descripción de la ubicación de despacho.'],
            ['CUSTID', 'Código del cliente receptor.'],
            ['CUSTID Descripcion', 'Descripción del cliente.'],
            ['CLEADTIME', 'Lead time de entrega al cliente en días. 0 o vacío genera ⚠ Advertencia.'],
            ['LOCID+PRDID en Location Product?', 'Sí/No — la ubicación de despacho está habilitada para este producto en Location Product.'],
            ['CUSTID+PRDID en Customer Product?', 'Sí/No — el cliente está habilitado para este producto en Customer Product.'],
            ['PRDID en PSH?', 'Sí/No — el producto tiene al menos una fuente de producción. Útil para distinguir productos fabricados de mercadería.'],
            ['Entrega alcanzable desde produccion?', 'Sí/No — existe una ruta completa de producción que llega hasta este arco de entrega. No = hay una brecha en la red de distribución.'],
            ['Lead Time Status', 'OK = CLEADTIME > 0 | Zero = CLEADTIME = 0 | Missing = sin valor definido.']
          ])) +
          callout('tip', '<strong>Lectura clave:</strong> Los arcos con <em>Entrega alcanzable = No</em> indican que el cliente tiene arcos de entrega configurados pero la producción nunca llega hasta ese punto — hay una brecha en la red de distribución.') +
          sub('Observaciones posibles', obsTable([
            ['Sin Location Product en ubicacion (X)', 'red', ['all'], 'La ubicación de despacho X no tiene habilitado este producto en Location Product. IBP no puede planificar la entrega desde ese punto.', 'Habilitar la combinación LOCID+PRDID en Location Product en IBP.'],
            ['Sin Customer Product para cliente (X)', 'red', ['all'], 'El cliente X no está habilitado en Customer Product para este producto. IBP ignora el arco de entrega en la planificación.', 'Habilitar la combinación CUSTID+PRDID en Customer Product en IBP.'],
            ['Entrega no alcanzable desde produccion', 'yellow', ['all'], 'La entrega al cliente está configurada pero no existe ninguna ruta completa de producción que llegue hasta este arco. El cliente tiene arco de entrega pero sin fuente de abastecimiento conectada.', 'Revisar la red de distribución e identificar el arco faltante en Location Source que conecte la producción con esta ubicación de despacho.'],
            ['CLEADTIME missing', 'yellow', ['all'], 'El campo CLEADTIME no tiene valor definido. IBP usa 0 por defecto, planificando entregas instantáneas al cliente.', 'Ingresar el CLEADTIME real en días en el arco de Customer Source correspondiente en IBP.'],
            ['CLEADTIME zero', 'yellow', ['all'], 'El CLEADTIME está explícitamente definido como 0. IBP planifica entrega al cliente sin tiempo de tránsito.', 'Verificar si 0 días es intencional (entrega inmediata) o si falta ingresar el lead time real de entrega.'],
            ['Entrega alcanzable | Location Product y Customer Product configurados | CLEADTIME definido', 'ok', ['all'], 'El arco de entrega es alcanzable desde la producción, tiene lead time definido y ambos extremos están habilitados correctamente.', 'Sin acción requerida.']
          ]));
      }
    },

    /* ── TIPOS DE MATERIAL SN ── */
    {
      id: 'sn-mattypes', icon: '🏷️', title: 'Tipos de Material',
      content: function () {
        return p('La categorización de MATTYPEID afecta directamente qué hallazgos se generan y cuál es su severidad en la hoja Product del Network Analyzer. La misma ausencia de ruta a cliente puede ser ⛔ Alerta para un Terminado y no generar ningún hallazgo para un Semiterminado.') +
          sub('Impacto por categoría en Network Analyzer',
            '<div class="glos-table-wrap"><table class="glos-col-table"><thead><tr><th>Regla de análisis</th>' +
              '<th style="color:var(--accent)">Terminado</th>' +
              '<th style="color:var(--cyan)">Semiterminado</th>' +
              '<th style="color:var(--green)">Mat. Prima</th>' +
              '<th style="color:var(--purple)">Mercadería</th>' +
              '<th style="color:#9090c0">Sin cat.</th>' +
            '</tr></thead><tbody>' +
              '<tr><td>Necesita ruta completa a cliente</td><td>⛔ Alerta</td><td>No aplica</td><td>No aplica</td><td>⛔ Alerta</td><td>⛔ Alerta</td></tr>' +
              '<tr><td>Ghost Nodes / Dead-ends</td><td>⛔ Detecta</td><td>No detecta</td><td>No detecta</td><td>⛔ Detecta</td><td>⛔ Detecta</td></tr>' +
              '<tr><td>Plantas aisladas</td><td>⛔ Detecta</td><td>No detecta</td><td>No detecta</td><td>⛔ Detecta</td><td>⛔ Detecta</td></tr>' +
              '<tr><td>PLEADTIME faltante</td><td>⛔ Alerta</td><td>⚠ Advertencia</td><td>No aplica</td><td>No aplica</td><td>⛔ Alerta</td></tr>' +
              '<tr><td>TLEADTIME faltante</td><td>⚠ Advertencia</td><td>⚠ Advertencia</td><td>⚠ Advertencia</td><td>⚠ Advertencia</td><td>⚠ Advertencia</td></tr>' +
              '<tr><td>CLEADTIME faltante</td><td>⚠ Advertencia</td><td>No aplica</td><td>No aplica</td><td>⚠ Advertencia</td><td>⚠ Advertencia</td></tr>' +
              '<tr><td>Necesita PSH propio</td><td>⛔ Alerta</td><td>⛔ Alerta</td><td>No aplica</td><td>No aplica</td><td>⛔ Alerta</td></tr>' +
              '<tr><td>Necesita consumo PSI en destino (semi)</td><td>No aplica</td><td>⛔ Alerta</td><td>No aplica</td><td>No aplica</td><td>No aplica</td></tr>' +
              '<tr><td>Necesita arco de abastecimiento</td><td>No aplica</td><td>No aplica</td><td>⛔ Alerta</td><td>No aplica</td><td>No aplica</td></tr>' +
              '<tr><td>Arcos LS + CS conectados</td><td>No aplica</td><td>No aplica</td><td>No aplica</td><td>⛔ Alerta</td><td>⚠ Advertencia</td></tr>' +
            '</tbody></table></div>'
          ) +
          callout('warn', '<strong>Tipo excluido:</strong> Los productos excluidos no generan filas en la hoja Product del Network Analyzer. Sin embargo, si son componentes PSI de productos incluidos, sus arcos de abastecimiento sí se validan en la hoja Product del producto consumidor.') +
          callout('info', '<strong>Sin categoría (uncategorized):</strong> Se ejecutan todas las validaciones disponibles — es el modo más completo, equivalente al de Terminado. El Estado de la Red se determina por lo que está presente en la data: si tiene PSH, se evalúa como Terminado; si tiene PSI sin PSH, como insumo. Cualquier anomalía detectada genera ⛔ Alerta igual que un Terminado. Se recomienda categorizar los materiales para obtener hallazgos precisos según el rol real del producto.');
      }
    }
  ];

  /* ─── RENDER ─────────────────────────────────────────────────── */

  function renderNav(sections) {
    var nav = document.getElementById('glosarioSidenav');
    if (!nav) return;
    nav.innerHTML = sections.map(function (s) {
      return '<a class="glos-nav-link" href="#' + s.id + '" onclick="glosarioNavClick(event,\'' + s.id + '\')">' +
        s.icon + ' ' + _t(s.title) + '</a>';
    }).join('');
  }

  function renderContent(sections) {
    var cont = document.getElementById('glosarioContent');
    if (!cont) return;
    var html = sections.map(function (s) {
      return section(s.id, s.icon, _t(s.title), s.content());
    }).join('<hr class="glos-hr">');
    if (_lang() === 'en') html = _translateHtml(html);
    cont.innerHTML = html;
    cont.scrollTop = 0;
  }

  /* Recorre nodos de texto del HTML generado y traduce con _TEXTS.
     Es robusto frente a inner HTML porque opera sobre nodos de texto y
     atributos title/aria-label. */
  function _translateHtml(html) {
    try {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      // Traducir bloques HTML completos cuando coinciden con una clave
      // (algunas entradas del mapa contienen <strong>...).
      _walkAndTranslate(tmp);
      return tmp.innerHTML;
    } catch (e) {
      console.warn('[glosario i18n] _translateHtml', e);
      return html;
    }
  }

  function _walkAndTranslate(root) {
    // 1) intentar match exacto de innerHTML de elementos hoja (p, td, th, li, span, h3, h2, strong, em, div)
    var candidates = root.querySelectorAll('p, td, th, li, span, h2, h3, h4, strong, em, code, a, div');
    candidates.forEach(function (el) {
      // saltar contenedores con muchos hijos estructurales
      var inner = el.innerHTML;
      if (inner == null) return;
      var trimmed = inner.trim();
      if (!trimmed) return;
      if (_TEXTS[trimmed] != null) {
        el.innerHTML = _TEXTS[trimmed];
      }
    });
    // 2) nodos de texto sueltos
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      var t = tn.nodeValue;
      if (!t) return;
      var trimmed = t.trim();
      if (!trimmed) return;
      if (_TEXTS[trimmed] != null) {
        tn.nodeValue = t.replace(trimmed, _TEXTS[trimmed]);
      }
    });
  }

  /* ─── PDF EXPORT ─────────────────────────────────────────────── */

  window.glosarioExportPDF = function () {
    var J = window.jspdf;
    if (!J || !J.jsPDF) { alert('Librería PDF no disponible. Recarga la página.'); return; }

    var activeBtn = document.querySelector('.glosario-mod-btn.active');
    if (activeBtn) { _currentModule = activeBtn.id.replace('glosModBtn-', ''); }

    var modName  = _currentModule === 'pa' ? 'Production Analyzer' : 'Network Analyzer';
    var today    = new Date();
    var dateStr  = today.toISOString().slice(0, 10);
    var fileName = 'Glosario_' + _currentModule.toUpperCase() + '_' + dateStr + '.pdf';

    var btn = document.getElementById('glosarioPdfBtn');
    if (btn) { btn.disabled = true; btn.textContent = (_lang() === 'en') ? 'Generating...' : 'Generando...'; }

    setTimeout(function () {
      try { _buildPDF(J, modName, today, fileName); }
      finally {
        if (btn) { btn.disabled = false; btn.textContent = (_lang() === 'en') ? '↓ Export PDF' : '↓ Exportar PDF'; }
      }
    }, 0);
  };

  function _buildPDF(J, modName, today, fileName) {
    var doc = new J.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    var PW = 210, PH = 297, ML = 15, MR = 15;
    var CW  = PW - ML - MR;          // 180 mm usable
    var HDR = 12, FTR = 12;
    var TOP = HDR + 3, BOT = PH - FTR;

    var C = {
      accent: [247, 168, 0],
      dark:   [30, 41, 59],
      text:   [25, 25, 35],
      muted:  [100, 105, 125],
      border: [210, 215, 225],
      cInfo:  [41, 171, 226],
      cTip:   [52, 211, 153],
      cWarn:  [232, 98, 42],
      tHead:  [30, 41, 59],
      tAlt:   [244, 246, 252],
    };

    var y = TOP;

    function F(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function D(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function T(c) { doc.setTextColor(c[0], c[1], c[2]); }

    function strip(html) {
      var d = document.createElement('div');
      d.innerHTML = html;
      var t = (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim();
      return t.replace(/[^ -ɏ–—‘’“”…]/g, '')
              .replace(/\s+/g, ' ').trim();
    }

    function drawHeader() {
      F(C.dark);
      doc.rect(0, 0, PW, HDR, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      T([185, 200, 220]);
      doc.text('GoSCM  |  ' + (_lang() === 'en' ? 'Glossary ' : 'Glosario ') + modName, ML, 8);
    }

    function newPage() {
      doc.addPage();
      y = TOP;
      drawHeader();
    }

    function ensure(h) { if (y + h > BOT - 3) newPage(); }

    /* ── COVER ── */
    F([13, 21, 40]);
    doc.rect(0, 0, PW, PH, 'F');
    F(C.accent);
    doc.rect(0, 72, PW, 58, 'F');

    doc.setFontSize(8.5); T([90, 110, 150]); doc.setFont('helvetica', 'normal');
    doc.text('GOSCM APPLICATIONS HUB', PW / 2, 62, { align: 'center' });

    doc.setFontSize(30); T([10, 10, 10]); doc.setFont('helvetica', 'bold');
    doc.text(_lang() === 'en' ? 'Glossary' : 'Glosario', PW / 2, 94, { align: 'center' });
    doc.setFontSize(17);
    doc.text(modName, PW / 2, 108, { align: 'center' });

    D([10, 10, 10]); doc.setLineWidth(0.4);
    doc.line(ML + 25, 140, PW - MR - 25, 140);

    var dateLocale = today.toLocaleDateString(_lang() === 'en' ? 'en-US' : 'es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(9.5); T([150, 165, 205]); doc.setFont('helvetica', 'normal');
    doc.text(_lang() === 'en'
      ? 'Reference guide for reading the exported analysis'
      : 'Guía de referencia para la lectura del análisis exportado', PW / 2, 149, { align: 'center' });
    doc.text((_lang() === 'en' ? 'Generated on ' : 'Generado el ') + dateLocale, PW / 2, 159, { align: 'center' });

    /* ── CONTENT PAGES ── */
    newPage();

    var secEls = document.querySelectorAll('#glosarioContent .glos-section');
    secEls.forEach(function (sec) {
      var h2    = sec.querySelector('.glos-section-title');
      var title = h2 ? strip(h2.innerHTML) : '';

      ensure(14);
      F(C.accent);
      doc.rect(ML, y, CW, 9, 'F');
      doc.setFontSize(11); T([10, 10, 10]); doc.setFont('helvetica', 'bold');
      doc.text(title, ML + 3, y + 6.2);
      y += 11;

      var kids = sec.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].tagName === 'H2') continue;
        renderEl(kids[i]);
      }
      y += 4;
    });

    /* ── FOOTERS (post-process) ── */
    var totalPg = doc.getNumberOfPages();
    var contPg  = totalPg - 1;
    for (var pg = 2; pg <= totalPg; pg++) {
      doc.setPage(pg);
      D(C.border); doc.setLineWidth(0.2);
      doc.line(ML, PH - FTR + 2, PW - MR, PH - FTR + 2);
      doc.setFontSize(7); T(C.muted); doc.setFont('helvetica', 'normal');
      doc.text('GoSCM Applications Hub', ML, PH - 5.5);
      doc.text((_lang() === 'en' ? 'Page ' : 'Página ') + (pg - 1) + (_lang() === 'en' ? ' of ' : ' de ') + contPg, PW - MR, PH - 5.5, { align: 'right' });
    }

    doc.save(fileName);

    /* ── ELEMENT RENDERERS ── */

    function renderEl(el) {
      var cls = el.className || '';
      var tag = el.tagName;
      if (tag === 'HR') return;
      if (tag === 'P')                            { renderPara(el);              return; }
      if (tag === 'UL' || tag === 'OL')           { renderList(el);              return; }
      if (cls.indexOf('glos-section-title') >= 0) return;
      if (cls.indexOf('glos-p') >= 0)             { renderPara(el);              return; }
      if (cls.indexOf('glos-callout') >= 0)        { renderCallout(el, cls);     return; }
      if (cls.indexOf('glos-mattype-card') >= 0)   { renderMattypeCard(el);      return; }
      if (cls.indexOf('glos-sub') >= 0) {
        var h3 = el.querySelector('.glos-sub-title');
        if (h3) renderSubTitle(strip(h3.innerHTML));
        var ch = el.children;
        for (var i = 0; i < ch.length; i++) {
          if (ch[i].tagName === 'H3') continue;
          renderEl(ch[i]);
        }
        return;
      }
      if (cls.indexOf('glos-table-wrap') >= 0) { var t = el.querySelector('table'); if (t) renderTable(t); return; }
      if (cls.indexOf('glos-legend') >= 0)      { renderLegend(el); return; }
      var gc = el.children;
      for (var j = 0; j < gc.length; j++) renderEl(gc[j]);
    }

    function renderPara(el) {
      var text = strip(el.innerHTML);
      if (!text) return;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); T(C.text);
      var lines = doc.splitTextToSize(text, CW - 4);
      ensure(lines.length * 4.5 + 3);
      doc.text(lines, ML + 2, y);
      y += lines.length * 4.5 + 3;
    }

    function renderSubTitle(text) {
      if (!text) return;
      doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
      var lines = doc.splitTextToSize(text, CW - 6);
      var rectH = lines.length * 5.2 + 2;
      ensure(rectH + 3);
      F(C.dark); doc.rect(ML, y, CW, rectH, 'F');
      T(C.accent);
      for (var li = 0; li < lines.length; li++) {
        doc.text(lines[li], ML + 3, y + 4.5 + li * 5.2);
      }
      y += rectH + 2;
    }

    function renderCallout(el, cls) {
      var text = strip(el.innerHTML);
      if (!text) return;
      var ac = cls.indexOf('callout-tip')  >= 0 ? C.cTip  :
               cls.indexOf('callout-warn') >= 0 ? C.cWarn : C.cInfo;
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      var lines = doc.splitTextToSize(text, CW - 10);
      var boxH  = lines.length * 4.3 + 6;
      ensure(boxH + 3);
      var bg = [
        Math.min(255, Math.round(255 - (255 - ac[0]) * 0.10)),
        Math.min(255, Math.round(255 - (255 - ac[1]) * 0.10)),
        Math.min(255, Math.round(255 - (255 - ac[2]) * 0.10))
      ];
      F(bg);  doc.rect(ML, y, CW, boxH, 'F');
      F(ac);  doc.rect(ML, y, 3, boxH, 'F');
      T(C.text);
      doc.text(lines, ML + 6, y + 4.5);
      y += boxH + 3;
    }

    function renderLegend(el) {
      var items = el.querySelectorAll('.glos-legend-item');
      if (!items.length) return;
      var rows = [];
      items.forEach(function (item) {
        var spans = item.querySelectorAll('span');
        var badge = spans.length > 0 ? strip(spans[0].innerHTML) : '';
        var desc  = spans.length > 1 ? strip(spans[spans.length - 1].innerHTML) : '';
        rows.push([badge, desc]);
      });
      ensure(12);
      doc.autoTable({
        startY: y,
        head: [[_t('Estado'), _t('Significado')]],
        body: rows,
        margin: { top: TOP, left: ML, right: MR, bottom: FTR + 3 },
        tableWidth: CW,
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: C.tHead, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: C.tAlt },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: CW - 29 } },
        didDrawPage: drawHeader
      });
      y = doc.lastAutoTable.finalY + 4;
      ensure(0);
    }

    function renderTable(tblEl) {
      var thead = tblEl.querySelector('thead');
      var tbody = tblEl.querySelector('tbody');
      if (!tbody) return;
      var head = [];
      if (thead) {
        head = [Array.from(thead.querySelectorAll('th')).map(function (th) { return strip(th.innerHTML); })];
      }
      var body = Array.from(tbody.querySelectorAll('tr')).map(function (tr) {
        return Array.from(tr.querySelectorAll('td')).map(function (td) { return strip(td.innerHTML); });
      });
      if (!body.length) return;
      var nc = head.length ? head[0].length : (body[0] ? body[0].length : 1);
      var colStyles = {};
      if (nc === 2) {
        colStyles = { 0: { cellWidth: 55 }, 1: { cellWidth: CW - 56 } };
      } else if (nc === 4) {
        colStyles = { 0: { cellWidth: 44 }, 1: { cellWidth: 20 }, 2: { cellWidth: 24 }, 3: { cellWidth: CW - 91 } };
      } else if (nc === 5) {
        var rem = CW - 42 - 20 - 24 - 40 - 2;
        colStyles = { 0: { cellWidth: 42 }, 1: { cellWidth: 20 }, 2: { cellWidth: 24 }, 3: { cellWidth: rem }, 4: { cellWidth: 40 } };
      } else if (nc === 6) {
        var w6 = (CW - 50) / 5;
        colStyles = {
          0: { cellWidth: 50 },
          1: { cellWidth: w6 }, 2: { cellWidth: w6 }, 3: { cellWidth: w6 },
          4: { cellWidth: w6 }, 5: { cellWidth: CW - 50 - w6 * 4 }
        };
      }
      ensure(12);
      doc.autoTable({
        startY: y,
        head: head.length ? head : undefined,
        body: body,
        margin: { top: TOP, left: ML, right: MR, bottom: FTR + 3 },
        tableWidth: CW,
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: C.tHead, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: C.tAlt },
        columnStyles: colStyles,
        didDrawPage: drawHeader
      });
      y = doc.lastAutoTable.finalY + 4;
      ensure(0);
    }

    function renderList(el) {
      var items = el.querySelectorAll('li');
      if (!items.length) return;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); T(C.text);
      items.forEach(function (li) {
        var text = strip(li.innerHTML);
        if (!text) return;
        var lines = doc.splitTextToSize(text, CW - 10);
        ensure(lines.length * 4.5 + 1);
        doc.text('-', ML + 4, y);
        doc.text(lines[0], ML + 9, y);
        for (var k = 1; k < lines.length; k++) {
          y += 4.5;
          doc.text(lines[k], ML + 9, y);
        }
        y += 5;
      });
      y += 2;
    }

    function renderMattypeCard(el) {
      var headerEl = el.querySelector('.glos-mattype-header');
      var bodyEl   = el.querySelector('.glos-mattype-body');
      if (headerEl) renderSubTitle(strip(headerEl.innerHTML));
      if (bodyEl) {
        var ch = bodyEl.children;
        for (var i = 0; i < ch.length; i++) renderEl(ch[i]);
      }
      y += 3;
    }
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────── */

  window.glosarioSwitchModule = function (mod) {
    _currentModule = mod;
    document.querySelectorAll('.glosario-mod-btn').forEach(function (b) {
      b.classList.toggle('active', b.id === 'glosModBtn-' + mod);
    });
    var sections = mod === 'pa' ? PA_SECTIONS : SN_SECTIONS;
    renderNav(sections);
    renderContent(sections);
  };

  var _scrollLocked = false;
  var _scrollLockTimer = null;

  window.glosarioNavClick = function (e, id) {
    e.preventDefault();
    _scrollLocked = true;
    clearTimeout(_scrollLockTimer);
    var el = document.getElementById(id);
    var cont = document.getElementById('glosarioContent');
    if (el && cont) {
      var rect = el.getBoundingClientRect();
      var contRect = cont.getBoundingClientRect();
      cont.scrollTo({ top: cont.scrollTop + rect.top - contRect.top - 16, behavior: 'smooth' });
    }
    document.querySelectorAll('.glos-nav-link').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
    _scrollLockTimer = setTimeout(function () { _scrollLocked = false; }, 600);
  };

  /* Scrollspy */
  function initScrollspy() {
    var cont = document.getElementById('glosarioContent');
    if (!cont) return;
    cont.addEventListener('scroll', function () {
      if (_scrollLocked) return;
      var sections = cont.querySelectorAll('.glos-section');
      var scrollTop = cont.scrollTop + 40;
      var activeId = null;
      sections.forEach(function (s) {
        if (s.offsetTop <= scrollTop) activeId = s.id;
      });
      document.querySelectorAll('.glos-nav-link').forEach(function (a) {
        a.classList.toggle('active', activeId && a.getAttribute('href') === '#' + activeId);
      });
    });
  }

  /* Auto-init when tab is shown */
  var _initialized = false;
  var _origSwitch = null;

  function hookSwitchTab() {
    if (typeof window.switchTab !== 'function') return;
    if (_origSwitch) return;
    _origSwitch = window.switchTab;
    window.switchTab = function (tabId) {
      _origSwitch(tabId);
      if (tabId === 'glosario' && !_initialized) {
        _initialized = true;
        glosarioSwitchModule('pa');
        setTimeout(initScrollspy, 100);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookSwitchTab);
  } else {
    hookSwitchTab();
  }

  /* ═══════════════════════════════════════════════════════════════
     DICCIONARIO ES → EN
     ═══════════════════════════════════════════════════════════════ */

  // Badges + categorías
  _TEXTS['⛔ Alerta'] = '⛔ Alert';
  _TEXTS['⚠ Advertencia'] = '⚠ Warning';
  _TEXTS['✅ OK'] = '✅ OK';
  _TEXTS['ℹ Info'] = 'ℹ Info';
  _TEXTS['Terminado'] = 'Finished';
  _TEXTS['Semiterminado'] = 'Semi-finished';
  _TEXTS['Mat. Prima'] = 'Raw mat.';
  _TEXTS['Mercadería'] = 'Trading';
  _TEXTS['Sin cat.'] = 'Uncat.';
  _TEXTS['Todos'] = 'All';

  // Cabeceras de tablas
  _TEXTS['Texto en Excel'] = 'Excel text';
  _TEXTS['Estado'] = 'Status';
  _TEXTS['Aplica a'] = 'Applies to';
  _TEXTS['Por qué aparece'] = 'Why it appears';
  _TEXTS['Qué revisar en IBP'] = 'What to review in IBP';
  _TEXTS['Columna'] = 'Column';
  _TEXTS['Qué significa'] = 'Meaning';
  _TEXTS['Estado de la Red'] = 'Network Status';
  _TEXTS['Significado'] = 'Meaning';

  // Títulos de sección (PA)
  _TEXTS['Introducción'] = 'Introduction';
  _TEXTS['Hoja: Resumen'] = 'Sheet: Summary';
  _TEXTS['Hoja: Product'] = 'Sheet: Product';
  _TEXTS['Hoja: Location'] = 'Sheet: Location';
  _TEXTS['Hoja: Resource'] = 'Sheet: Resource';
  _TEXTS['Hoja: Resource Location'] = 'Sheet: Resource Location';
  _TEXTS['Hoja: Prod Source Header'] = 'Sheet: Prod Source Header';
  _TEXTS['Hoja: Prod Source Item'] = 'Sheet: Prod Source Item';
  _TEXTS['Hoja: Prod Source Resource'] = 'Sheet: Prod Source Resource';
  _TEXTS['Hoja: Tipos Excluidos'] = 'Sheet: Excluded Types';
  _TEXTS['Tipos de Material'] = 'Material Types';
  _TEXTS['Hoja: Customer'] = 'Sheet: Customer';
  _TEXTS['Hoja: Location Source'] = 'Sheet: Location Source';
  _TEXTS['Hoja: Customer Source'] = 'Sheet: Customer Source';

  // Sub-títulos
  _TEXTS['Estados del Excel'] = 'Excel statuses';
  _TEXTS['Columnas clave'] = 'Key columns';
  _TEXTS['Observaciones posibles'] = 'Possible observations';
  _TEXTS['Roles inferidos'] = 'Inferred roles';
  _TEXTS['Roles inferidos de ubicación'] = 'Inferred location roles';
  _TEXTS['Columnas generales (todas las ubicaciones)'] = 'General columns (all locations)';
  _TEXTS['Columnas de planta de producción'] = 'Production plant columns';
  _TEXTS['Columnas de proveedor / nodo origen'] = 'Supplier / source node columns';
  _TEXTS['Columnas de nodo de transferencia'] = 'Transfer node columns';
  _TEXTS['Columnas de nodo receptor'] = 'Receiver node columns';
  _TEXTS['Columnas de identificación'] = 'Identification columns';
  _TEXTS['Columnas de presencia en red (flags Sí/No)'] = 'Network presence columns (Yes/No flags)';
  _TEXTS['Columnas de análisis de red'] = 'Network analysis columns';
  _TEXTS['Health Score — fórmula por categoría'] = 'Health Score — formula by category';
  _TEXTS['Estados de la Red'] = 'Network Statuses';
  _TEXTS['Categorías disponibles'] = 'Available categories';
  _TEXTS['Impacto por categoría en Network Analyzer'] = 'Impact by category in Network Analyzer';

  // --- INTRO PA ---
  _TEXTS['El <strong>Production Analyzer</strong> analiza la configuración de producción en SAP IBP y exporta un Excel con hasta 9 hojas. Cada hoja examina una entidad distinta desde el punto de vista de su completitud y consistencia para la planificación.'] =
    'The <strong>Production Analyzer</strong> analyzes the production configuration in SAP IBP and exports an Excel workbook with up to 9 sheets. Each sheet examines a different entity from the perspective of its completeness and consistency for planning.';
  _TEXTS['El análisis cruza diez entidades: Production Source Header (PSH), Production Source Item (PSI), Production Source Resource (PSR), Resource, Resource Location, Product, Location, Location Product y Location Source. Los hallazgos se expresan siempre en términos de qué falta o qué está mal configurado respecto a lo que IBP necesita para planificar correctamente.'] =
    'The analysis cross-references ten entities: Production Source Header (PSH), Production Source Item (PSI), Production Source Resource (PSR), Resource, Resource Location, Product, Location, Location Product and Location Source. Findings are always expressed in terms of what is missing or misconfigured relative to what IBP needs to plan correctly.';
  _TEXTS['<strong>Hojas condicionales:</strong> Las hojas Product, Location, Resource, Resource Location, Prod Source Item y Prod Source Resource solo se crean si el usuario seleccionó la entidad correspondiente antes de ejecutar el análisis. La hoja Tipos Excluidos solo aparece si existen tipos de material excluidos del análisis principal. La hoja Resumen siempre se genera.'] =
    '<strong>Conditional sheets:</strong> The Product, Location, Resource, Resource Location, Prod Source Item and Prod Source Resource sheets are only created if the user selected the corresponding entity before running the analysis. The Excluded Types sheet only appears if material types were excluded from the main analysis. The Summary sheet is always generated.';
  _TEXTS['<strong>Importante:</strong> Los resultados dependen de la categorización de tipos de material (MATTYPEID). Un mismo hallazgo puede ser ⛔ Alerta para un Producto Terminado y no aplicar para una Materia Prima. Ver sección <em>Tipos de Material</em>.'] =
    '<strong>Important:</strong> Results depend on the material type categorization (MATTYPEID). The same finding can be ⛔ Alert for a Finished Product and not apply for a Raw Material. See the <em>Material Types</em> section.';

  // Legend
  _TEXTS['Problema crítico que bloquea o distorsiona la planificación en IBP. Requiere acción antes de ejecutar cualquier plan.'] =
    'Critical issue that blocks or distorts planning in IBP. Requires action before running any plan.';
  _TEXTS['Dato incompleto o sospechoso que conviene revisar. No bloquea IBP pero puede generar resultados incorrectos.'] =
    'Incomplete or suspicious data worth reviewing. Does not block IBP but may produce incorrect results.';
  _TEXTS['Todas las validaciones aplicables pasaron. El registro está correctamente configurado.'] =
    'All applicable validations passed. The record is correctly configured.';
  _TEXTS['El dato no aplica para este registro (N/A). Celda con fondo gris claro e itálica. No indica error sino ausencia de dato para ese campo.'] =
    'The field does not apply for this record (N/A). Cell shown with light gray background and italic. Does not indicate an error, just absence of data for that field.';

  // Resumen PA
  _TEXTS['Primera hoja del libro. Una fila por cada hoja analizada. Permite ver de un vistazo la salud general de la configuración.'] =
    'First sheet of the workbook. One row per analyzed sheet. Lets you see overall configuration health at a glance.';
  _TEXTS['Número de hoja en el libro Excel.'] = 'Sheet number in the Excel workbook.';
  _TEXTS['Nombre de la hoja analizada (Product, Location, Resource, etc.).'] = 'Name of the analyzed sheet (Product, Location, Resource, etc.).';
  _TEXTS['Cantidad de filas procesadas. Ej: 350 = se analizaron 350 productos.'] = 'Number of processed rows. Ex: 350 = 350 products analyzed.';
  _TEXTS['Registros con problema crítico que bloquea o distorsiona la planificación.'] = 'Records with critical issues that block or distort planning.';
  _TEXTS['Registros con dato incompleto o sospechoso que conviene revisar.'] = 'Records with incomplete or suspicious data worth reviewing.';
  _TEXTS['Registros sin hallazgos — todas las validaciones aplicables pasaron.'] = 'Records with no findings — all applicable validations passed.';
  _TEXTS['Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100. Una hoja con 85% de consistencia tiene el 15% restante con hallazgos.'] =
    'Percentage of OK records over the total. Formula: OK / Total × 100. A sheet with 85% consistency has 15% of its records with findings.';
  _TEXTS['<strong>Lectura recomendada:</strong> Comienza por la hoja con menor % de Consistencia y mayor cantidad de Alertas 🔴. Eso indica dónde están los problemas más críticos para la planificación.'] =
    '<strong>Recommended reading:</strong> Start with the sheet having the lowest Consistency % and the highest number of 🔴 Alerts. That indicates where the most critical planning problems are.';

  // --- PA Product (intro + columnas) ---
  _TEXTS['Una fila por cada producto del maestro de materiales de SAP IBP. Esta hoja valida si cada producto tiene la configuración mínima necesaria para que IBP lo pueda planificar correctamente.'] =
    'One row per product in the SAP IBP material master. This sheet validates whether each product has the minimum configuration needed for IBP to plan it correctly.';
  _TEXTS['⛔ Alerta / ⚠ Advertencia / ✅ OK. El peor hallazgo del producto determina el color de la fila.'] = '⛔ Alert / ⚠ Warning / ✅ OK. The worst finding of the product determines the row color.';
  _TEXTS['Texto detallado de todos los hallazgos encontrados, separados por |. Si el estado es OK, describe qué validaciones pasaron.'] = 'Detailed text of all findings, separated by |. If status is OK, describes which validations passed.';
  _TEXTS['Código único del producto en SAP IBP.'] = 'Unique product code in SAP IBP.';
  _TEXTS['Descripción del producto del maestro.'] = 'Product description from the master.';
  _TEXTS['Tipo de material SAP. Determina qué validaciones aplican. Es el insumo principal para la categorización.'] = 'SAP material type. Determines which validations apply. Main input for categorization.';
  _TEXTS['Sí/No — ¿El producto está habilitado en al menos una ubicación? Sin esto IBP ignora completamente el producto.'] = 'Yes/No — Is the product enabled in at least one location? Without this, IBP completely ignores the product.';
  _TEXTS['Sí/No — ¿El producto tiene fuente de producción propia (SOURCETYPE=P)?'] = 'Yes/No — Does the product have its own production source (SOURCETYPE=P)?';
  _TEXTS['Sí/No — ¿Este producto es ingrediente en el BOM de algún otro producto?'] = 'Yes/No — Is this product an ingredient in any other product’s BOM?';
  _TEXTS['Sí/No — ¿Tiene arcos de transferencia entre ubicaciones?'] = 'Yes/No — Does it have transfer arcs between locations?';
  _TEXTS['Cuántas recetas distintas (SOURCEIDs) producen este producto. Más de una implica multi-sourcing — verificar cuotas (PRATIO).'] = 'How many distinct recipes (SOURCEIDs) produce this product. More than one implies multi-sourcing — check quotas (PRATIO).';
  _TEXTS['Códigos de los SOURCEIDs que producen este producto.'] = 'Codes of the SOURCEIDs that produce this product.';
  _TEXTS['Número de plantas distintas donde se fabrica.'] = 'Number of distinct plants where it is manufactured.';
  _TEXTS['Códigos de las plantas productoras.'] = 'Codes of the producing plants.';
  _TEXTS['Total de ingredientes PSI definidos en todas sus recetas.'] = 'Total PSI components defined across all its recipes.';
  _TEXTS['Máquinas/líneas asignadas vía PSR.'] = 'Machines/lines assigned via PSR.';
  _TEXTS['Códigos de los recursos asignados a las recetas de este producto.'] = 'Codes of the resources assigned to this product’s recipes.';
  _TEXTS['Número de ubicaciones origen distintas en Location Source (campo LOCFR) que abastecen este producto.'] = 'Number of distinct source locations in Location Source (LOCFR field) supplying this product.';
  _TEXTS['Códigos de las ubicaciones origen en Location Source.'] = 'Codes of the source locations in Location Source.';
  _TEXTS['Plantas que reciben este producto con arco de abastecimiento configurado en Location Source.'] = 'Plants that receive this product with a supply arc configured in Location Source.';
  _TEXTS['Códigos de las plantas con arco de abastecimiento configurado.'] = 'Codes of plants with a supply arc configured.';
  _TEXTS['Plantas que consumen este producto como insumo pero no tienen arco de abastecimiento configurado. Si > 0: falta Location Source. ⛔ crítico.'] = 'Plants that consume this product as input but have no supply arc configured. If > 0: missing Location Source. ⛔ critical.';
  _TEXTS['Códigos de las plantas consumidoras sin cobertura de abastecimiento.'] = 'Codes of consumer plants without supply coverage.';
  _TEXTS['Cuántos otros productos distintos requieren este material como componente PSI.'] = 'How many other distinct products require this material as a PSI component.';
  _TEXTS['Número de nodos origen distintos detectados en la red de este producto (LOCFR en Location Source).'] = 'Number of distinct source nodes detected in this product’s network (LOCFR in Location Source).';
  _TEXTS['Códigos de los nodos origen.'] = 'Codes of the source nodes.';
  _TEXTS['Número de plantas que consumen este producto como componente PSI en alguna receta.'] = 'Number of plants that consume this product as a PSI component in any recipe.';
  _TEXTS['Códigos de las plantas que consumen este producto como ingrediente.'] = 'Codes of the plants that consume this product as ingredient.';
  _TEXTS['<strong>Productos sin categoría:</strong> Los tipos de material sin categoría asignada reciben todas las validaciones con severidad ⚠ Advertencia. Sus observaciones van precedidas por <code>Sin categoría [MATTYPEID]</code>. Si no hay hallazgos, muestran <code>Sin categoría [MATTYPEID] — sin hallazgos en modo permisivo</code> con estado ✅ OK. Asignar la categoría correcta activa las validaciones estrictas correspondientes.'] =
    '<strong>Uncategorized products:</strong> Material types without an assigned category receive all validations at ⚠ Warning severity. Their observations are prefixed with <code>Uncategorized [MATTYPEID]</code>. If there are no findings, they show <code>Uncategorized [MATTYPEID] — no findings in permissive mode</code> with status ✅ OK. Assigning the correct category enables the corresponding strict validations.';

  // --- PA Product observaciones ---
  _TEXTS['Sin cobertura en Location Product'] = 'No coverage in Location Product';
  _TEXTS['El producto no está registrado en ninguna ubicación en Location Product.'] = 'The product is not registered in any location in Location Product.';
  _TEXTS['Habilitar el producto en Location Product para cada planta y/o DC donde se requiera. Sin esto IBP lo ignora en planificación de demanda y producción.'] = 'Enable the product in Location Product for every plant and/or DC where it is required. Without this, IBP ignores it in demand and production planning.';
  _TEXTS['Sin fuente de producción propia (PSH)'] = 'No production source (PSH)';
  _TEXTS['No existe ningún Production Source Header activo con SOURCETYPE=P para este producto.'] = 'There is no active Production Source Header with SOURCETYPE=P for this product.';
  _TEXTS['Crear o activar la receta de producción en IBP (PSH con SOURCETYPE=P). Verificar que el Planning Area y Version sean correctos.'] = 'Create or activate the production recipe in IBP (PSH with SOURCETYPE=P). Verify the Planning Area and Version are correct.';
  _TEXTS['PSH sin componentes PSI'] = 'PSH without PSI components';
  _TEXTS['La receta de producción existe pero no tiene ingredientes definidos — BOM vacío.'] = 'The production recipe exists but has no ingredients defined — empty BOM.';
  _TEXTS['Revisar el BOM en IBP y cargar los componentes (PSI) necesarios en la receta del SOURCEID indicado.'] = 'Review the BOM in IBP and load the required components (PSI) in the recipe of the indicated SOURCEID.';
  _TEXTS['PSH sin recursos PSR asignados'] = 'PSH without PSR resources assigned';
  _TEXTS['La receta existe pero no tiene ninguna máquina o línea asignada en Production Source Resource.'] = 'The recipe exists but has no machine or line assigned in Production Source Resource.';
  _TEXTS['Asignar al menos un recurso productivo (RESID) al SOURCEID vía Production Source Resource en IBP.'] = 'Assign at least one production resource (RESID) to the SOURCEID via Production Source Resource in IBP.';
  _TEXTS['Planta productora no es origen en Location Source'] = 'Producing plant is not a source in Location Source';
  _TEXTS['El producto se fabrica en la planta pero no hay arco de Location Source declarando esa planta como LOCFR.'] = 'The product is manufactured in the plant but there is no Location Source arc declaring that plant as LOCFR.';
  _TEXTS['Crear arco en Location Source con la planta productora como LOCFR para distribuir el producto hacia DCs o clientes.'] = 'Create a Location Source arc with the producing plant as LOCFR to distribute the product to DCs or customers.';
  _TEXTS['Sin arco de abastecimiento hacia: X, Y'] = 'No supply arc to: X, Y';
  _TEXTS['El insumo se consume en las plantas indicadas pero no hay Location Source que lo lleve ahí.'] = 'The input is consumed in the indicated plants but there is no Location Source bringing it there.';
  _TEXTS['Crear arco(s) en Location Source con el proveedor como LOCFR y la planta consumidora como LOCID para cada insumo sin cobertura.'] = 'Create Location Source arc(s) with the supplier as LOCFR and the consuming plant as LOCID for each uncovered input.';
  _TEXTS['Sin arco de abastecimiento (no registrado en Location Source)'] = 'No supply arc (not registered in Location Source)';
  _TEXTS['El insumo no tiene ningún arco de transferencia en Location Source.'] = 'The input has no transfer arc in Location Source.';
  _TEXTS['Configurar Location Source con el proveedor o planta origen como LOCFR hacia la(s) planta(s) consumidora(s).'] = 'Configure Location Source with the supplier or source plant as LOCFR to the consuming plant(s).';
  _TEXTS['Sin arcos en Location Source'] = 'No arcs in Location Source';
  _TEXTS['El producto de tipo Mercadería no tiene arcos de distribución en Location Source.'] = 'The Trading-type product has no distribution arcs in Location Source.';
  _TEXTS['Configurar Location Source con el proveedor/origen del producto para que IBP pueda planificar su flujo.'] = 'Configure Location Source with the supplier/source of the product so IBP can plan its flow.';
  _TEXTS['Sin acción requerida.'] = 'No action required.';

  // --- PA Location ---
  _TEXTS['Una fila por cada ubicación (planta, DC, proveedor, etc.) detectada en los datos. El análisis infiere el <strong>rol real</strong> de cada ubicación según su comportamiento en los datos, independientemente del campo LOCTYPE de IBP. Las columnas se agrupan por rol: las columnas de planta solo tienen datos si la ubicación tiene producción, y así sucesivamente.'] =
    'One row per location (plant, DC, supplier, etc.) detected in the data. The analysis infers each location’s <strong>actual role</strong> from its behavior in the data, regardless of the LOCTYPE field in IBP. Columns are grouped by role: plant columns only have data if the location has production, and so on.';
  _TEXTS['Planta de producción'] = 'Production plant';
  _TEXTS['Tiene al menos un Production Source Header (PSH) asociado — fabrica productos.'] = 'Has at least one associated Production Source Header (PSH) — manufactures products.';
  _TEXTS['Proveedor'] = 'Supplier';
  _TEXTS['Aparece como LOCFR en Location Source enviando productos que se consumen como PSI en la planta destino — abastece insumos.'] = 'Appears as LOCFR in Location Source sending products that are consumed as PSI in the destination plant — supplies inputs.';
  _TEXTS['Nodo de transferencia'] = 'Transfer node';
  _TEXTS['Aparece como LOCFR en Location Source enviando productos que NO se consumen como PSI en el destino — redistribuye o distribuye.'] = 'Appears as LOCFR in Location Source sending products that are NOT consumed as PSI in the destination — redistributes or distributes.';
  _TEXTS['Nodo receptor'] = 'Receiver node';
  _TEXTS['Solo aparece como LOCID (destino) en Location Source, sin producción propia ni envíos salientes — solo recibe.'] = 'Only appears as LOCID (destination) in Location Source, without own production or outgoing shipments — only receives.';
  _TEXTS['Nodo de recursos'] = 'Resource node';
  _TEXTS['Tiene recursos asignados en Resource Location pero sin producción ni transferencias activas.'] = 'Has resources assigned in Resource Location but no active production or transfers.';
  _TEXTS['Sin actividad'] = 'No activity';
  _TEXTS['Existe en el maestro de ubicaciones pero no aparece en ningún otro dato — ubicación inactiva o huérfana.'] = 'Exists in the location master but does not appear in any other data — inactive or orphan location.';
  _TEXTS['Código único de la ubicación en SAP IBP.'] = 'Unique location code in SAP IBP.';
  _TEXTS['Descripción de la ubicación del maestro.'] = 'Location description from the master.';
  _TEXTS['Tipo de ubicación del maestro (ej: 1010 = planta). Informativo — el rol real se infiere del comportamiento.'] = 'Location type from the master (e.g. 1010 = plant). Informational — the actual role is inferred from behavior.';
  _TEXTS['Uno o más roles detectados según participación real en PSH, Location Source y Customer Source.'] = 'One or more roles detected based on actual participation in PSH, Location Source and Customer Source.';
  _TEXTS['Sí/No — ¿La ubicación está habilitada en Location Product? Sin esto IBP no planifica en esa ubicación.'] = 'Yes/No — Is the location enabled in Location Product? Without this, IBP does not plan at that location.';

  // --- PA Resource ---
  _TEXTS['Una fila por cada recurso productivo (máquina, línea, horno, etc.) del maestro de recursos de SAP IBP. Valida que cada recurso tenga planta asignada y esté en uso en alguna receta.'] =
    'One row per production resource (machine, line, oven, etc.) from the SAP IBP resource master. Validates that each resource has an assigned plant and is used in some recipe.';
  _TEXTS['Código único del recurso en SAP IBP. Ej: LINEA-01, HORNO-A.'] = 'Unique resource code in SAP IBP. Ex: LINE-01, OVEN-A.';
  _TEXTS['Descripción del recurso del maestro.'] = 'Resource description from the master.';
  _TEXTS['Recurso huérfano: sin uso en producción ni planta asignada'] = 'Orphan resource: not used in production and no plant assigned';
  _TEXTS['Sin uso en producción (no aparece en PSR)'] = 'Not used in production (does not appear in PSR)';
  _TEXTS['Sin planta asignada en Resource Location'] = 'No plant assigned in Resource Location';
  _TEXTS['En uso en PSR y con planta asignada en Resource Location'] = 'In use in PSR and with plant assigned in Resource Location';

  // --- PA PSH/PSI/PSR ---
  _TEXTS['Una fila por cada fuente de producción (SOURCEID) en SAP IBP. Cada SOURCEID representa una receta que transforma insumos en un producto terminado o semiterminado en una planta específica.'] =
    'One row per production source (SOURCEID) in SAP IBP. Each SOURCEID represents a recipe that transforms inputs into a finished or semi-finished product at a specific plant.';
  _TEXTS['Identificador único de la receta de producción.'] = 'Unique identifier of the production recipe.';
  _TEXTS['Producto que produce esta receta (output principal).'] = 'Product produced by this recipe (main output).';
  _TEXTS['Descripción del producto output.'] = 'Output product description.';
  _TEXTS['Tipo de material del producto output. Determina qué validaciones aplican a esta receta.'] = 'Material type of the output product. Determines which validations apply to this recipe.';
  _TEXTS['Planta donde se ejecuta esta producción.'] = 'Plant where this production runs.';
  _TEXTS['Descripción de la planta.'] = 'Plant description.';

  // --- PA Tipos de Material ---
  _TEXTS['Antes de ejecutar el análisis, el usuario asigna cada MATTYPEID a una o más categorías. Esta categorización determina <strong>qué validaciones aplican</strong> y <strong>qué severidad</strong> tienen los hallazgos. Un mismo dato faltante puede ser ⛔ Alerta para un Terminado y no generar ningún hallazgo para una Materia Prima.'] =
    'Before running the analysis, the user assigns each MATTYPEID to one or more categories. This categorization determines <strong>which validations apply</strong> and the <strong>severity</strong> of the findings. The same missing data can be ⛔ Alert for a Finished product and not generate any finding for a Raw Material.';
  _TEXTS['Si no se asigna ninguna categoría, el análisis aplica reglas en "modo permisivo" (todo se marca máximo ⚠ Advertencia) y puede ocultar problemas críticos reales. <strong>Se recomienda siempre categorizar antes de interpretar los resultados.</strong>'] =
    'If no category is assigned, the analysis applies rules in "permissive mode" (everything is marked at most ⚠ Warning) and may hide real critical problems. <strong>It is always recommended to categorize before interpreting the results.</strong>';
  _TEXTS['Producto Terminado'] = 'Finished Product';
  _TEXTS['Mat. Prima / Insumo'] = 'Raw Material / Input';

  // --- SN Intro ---
  _TEXTS['El <strong>Network Analyzer</strong> examina la red logística completa de SAP IBP: plantas, centros de distribución, clientes, arcos de transferencia (Location Source) y arcos de entrega (Customer Source). Para cada producto, construye el grafo de la red y detecta anomalías topológicas.'] =
    'The <strong>Network Analyzer</strong> examines the complete SAP IBP logistics network: plants, distribution centers, customers, transfer arcs (Location Source) and delivery arcs (Customer Source). For each product, it builds the network graph and detects topological anomalies.';
  _TEXTS['El Excel de salida tiene 6 hojas: Resumen, Product, Location, Customer, Location Source y Customer Source. Cada hoja analiza la entidad desde la perspectiva de conectividad, lead times y habilitación en Location Product.'] =
    'The output Excel has 6 sheets: Summary, Product, Location, Customer, Location Source and Customer Source. Each sheet analyzes the entity from the perspective of connectivity, lead times and enablement in Location Product.';
  _TEXTS['<strong>Importante:</strong> Al igual que en Production Analyzer, los hallazgos dependen de la categorización de tipos de material. Un producto Terminado que no llega a ningún cliente genera ⛔ Alerta; el mismo problema en un Semiterminado puede no generar alerta porque no se espera que llegue directamente al cliente. Ver sección <em>Tipos de Material</em>.'] =
    '<strong>Important:</strong> As in Production Analyzer, findings depend on the material type categorization. A Finished product that does not reach any customer generates ⛔ Alert; the same problem in a Semi-finished may not generate an alert because it is not expected to reach the customer directly. See the <em>Material Types</em> section.';
  _TEXTS['<strong>Auto-split:</strong> Si una hoja supera 900.000 filas, el analizador crea hojas adicionales con el mismo nombre y sufijo numérico: Product (2), Product (3), etc. Las columnas son idénticas en todas las hojas del mismo grupo.'] =
    '<strong>Auto-split:</strong> If a sheet exceeds 900,000 rows, the analyzer creates additional sheets with the same name and a numeric suffix: Product (2), Product (3), etc. Columns are identical across all sheets in the same group.';

  // SN Resumen
  _TEXTS['Primera hoja del libro. Una fila por cada hoja analizada. Permite ver de un vistazo la salud general de la red logística.'] =
    'First sheet of the workbook. One row per analyzed sheet. Lets you see overall logistics network health at a glance.';
  _TEXTS['Nombre de la hoja analizada (Product, Location, Customer, Location Source, Customer Source).'] = 'Name of the analyzed sheet (Product, Location, Customer, Location Source, Customer Source).';
  _TEXTS['Cantidad de filas procesadas en esa hoja.'] = 'Number of processed rows in that sheet.';
  _TEXTS['Registros con problema crítico de conectividad o configuración.'] = 'Records with critical connectivity or configuration issues.';
  _TEXTS['Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100.'] = 'Percentage of OK records over the total. Formula: OK / Total × 100.';
  _TEXTS['<strong>Lectura recomendada:</strong> Comienza por la hoja Product, que concentra los hallazgos más importantes de conectividad. Luego revisa Location para identificar nodos críticos y finalmente Location Source / Customer Source para arcos con problemas de lead time o configuración.'] =
    '<strong>Recommended reading:</strong> Start with the Product sheet, which concentrates the most important connectivity findings. Then review Location to identify critical nodes and finally Location Source / Customer Source for arcs with lead time or configuration issues.';

  // SN Product
  _TEXTS['Una fila por cada producto presente en la red (Location Source, Customer Source, PSH o Location Product). Esta hoja es el corazón del análisis: construye el grafo completo de la red para cada producto y detecta anomalías de conectividad.'] =
    'One row per product present in the network (Location Source, Customer Source, PSH or Location Product). This sheet is the heart of the analysis: it builds the complete network graph for each product and detects connectivity anomalies.';

  // SN Network states (cabeceras)
  _TEXTS['Red Completa'] = 'Complete Network';
  _TEXTS['Sin Entrega a Cliente'] = 'No Customer Delivery';
  _TEXTS['Sin Distribución'] = 'No Distribution';
  _TEXTS['Distribución sin ruta completa'] = 'Distribution without complete route';
  _TEXTS['Solo Entrega'] = 'Delivery only';
  _TEXTS['Solo Distribución'] = 'Distribution only';
  _TEXTS['Solo Distribución + Entrega'] = 'Distribution + Delivery only';
  _TEXTS['Semiterminado Local'] = 'Local Semi-finished';
  _TEXTS['Semiterminado con Transferencia'] = 'Semi-finished with Transfer';
  _TEXTS['Semiterminado Local con Transferencia'] = 'Local Semi-finished with Transfer';
  _TEXTS['Semiterminado sin Transferencia'] = 'Semi-finished without Transfer';
  _TEXTS['Sin Producción'] = 'No Production';
  _TEXTS['Sin Consumo PSI'] = 'No PSI Consumption';
  _TEXTS['Abastecimiento Completo'] = 'Complete Supply';
  _TEXTS['Abastecimiento Parcial'] = 'Partial Supply';
  _TEXTS['Abastecimiento sin Consumo PSI'] = 'Supply without PSI consumption';
  _TEXTS['Sin Abastecimiento'] = 'No Supply';
  _TEXTS['Sin arcos de red'] = 'No network arcs';
  _TEXTS['Huérfano'] = 'Orphan';

  // SN Customer
  _TEXTS['Una fila por cada cliente detectado en la red (Customer Source o Customer Product). Analiza si cada cliente puede recibir productos a través de rutas completas desde la producción.'] =
    'One row per customer detected in the network (Customer Source or Customer Product). Analyzes whether each customer can receive products through complete routes from production.';
  _TEXTS['Código único del cliente en SAP IBP.'] = 'Unique customer code in SAP IBP.';
  _TEXTS['Descripción del cliente del maestro.'] = 'Customer description from the master.';

  // SN Location Source / Customer Source
  _TEXTS['Una fila por cada arco de transferencia en Location Source (combinación PRDID + LOCFR + LOCID). Analiza si cada arco tiene lead time definido, si los nodos extremos están habilitados en Location Product, y si el arco pertenece a alguna ruta completa.'] =
    'One row per transfer arc in Location Source (PRDID + LOCFR + LOCID combination). Analyzes whether each arc has a defined lead time, whether the endpoint nodes are enabled in Location Product, and whether the arc is part of a complete route.';
  _TEXTS['Una fila por cada arco de entrega a cliente en Customer Source (combinación PRDID + LOCID + CUSTID). Analiza si cada entrega tiene lead time definido, si los extremos están habilitados, y si existe una ruta completa que la abastezca.'] =
    'One row per customer delivery arc in Customer Source (PRDID + LOCID + CUSTID combination). Analyzes whether each delivery has a defined lead time, whether the endpoints are enabled, and whether a complete supply route exists.';
  _TEXTS['<strong>Lectura clave:</strong> Los arcos con <em>Entrega alcanzable = No</em> indican que el cliente tiene arcos de entrega configurados pero la producción nunca llega hasta ese punto — hay una brecha en la red de distribución.'] =
    '<strong>Key reading:</strong> Arcs with <em>Reachable Delivery = No</em> indicate the customer has delivery arcs configured but production never reaches that point — there is a gap in the distribution network.';

  // SN Tipos de Material
  _TEXTS['La categorización de MATTYPEID afecta directamente qué hallazgos se generan y cuál es su severidad en la hoja Product del Network Analyzer. La misma ausencia de ruta a cliente puede ser ⛔ Alerta para un Terminado y no generar ningún hallazgo para un Semiterminado.'] =
    'MATTYPEID categorization directly affects which findings are generated and their severity in the Network Analyzer Product sheet. The same lack of route to customer can be ⛔ Alert for a Finished product and not generate any finding for a Semi-finished.';
  _TEXTS['<strong>Tipo excluido:</strong> Los productos excluidos no generan filas en la hoja Product del Network Analyzer. Sin embargo, si son componentes PSI de productos incluidos, sus arcos de abastecimiento sí se validan en la hoja Product del producto consumidor.'] =
    '<strong>Excluded type:</strong> Excluded products do not generate rows in the Network Analyzer Product sheet. However, if they are PSI components of included products, their supply arcs are validated in the consumer product’s Product sheet.';
  _TEXTS['<strong>Sin categoría (uncategorized):</strong> Se ejecutan todas las validaciones disponibles — es el modo más completo, equivalente al de Terminado. El Estado de la Red se determina por lo que está presente en la data: si tiene PSH, se evalúa como Terminado; si tiene PSI sin PSH, como insumo. Cualquier anomalía detectada genera ⛔ Alerta igual que un Terminado. Se recomienda categorizar los materiales para obtener hallazgos precisos según el rol real del producto.'] =
    '<strong>Uncategorized:</strong> All available validations are executed — it is the most complete mode, equivalent to Finished. The Network Status is determined by what is present in the data: if it has PSH, it is evaluated as Finished; if it has PSI without PSH, as input. Any detected anomaly generates ⛔ Alert just like a Finished product. It is recommended to categorize materials to obtain accurate findings according to the actual product role.';

  /* ─── EXTENSIÓN: COBERTURA COMPLETA ─── */

  // Resumen PA (columnas faltantes)
  _TEXTS['Hoja'] = 'Sheet';
  _TEXTS['Total registros'] = 'Total records';
  _TEXTS['Alertas 🔴'] = 'Alerts 🔴';
  _TEXTS['Advertencias 🟡'] = 'Warnings 🟡';
  _TEXTS['OK ✅'] = 'OK ✅';
  _TEXTS['% Consistencia'] = '% Consistency';

  // PA Product — columnas faltantes
  _TEXTS['PRDID'] = 'PRDID';
  _TEXTS['PRDDESCR'] = 'PRDDESCR';
  _TEXTS['MATTYPEID'] = 'MATTYPEID';
  _TEXTS['En Location Product'] = 'In Location Product';
  _TEXTS['En PSH (output)'] = 'In PSH (output)';
  _TEXTS['En PSI (componente)'] = 'In PSI (component)';
  _TEXTS['En Location Source'] = 'In Location Source';
  _TEXTS['# Opciones prod.'] = '# Prod. options';
  _TEXTS['Opciones prod. (SOURCEIDs)'] = 'Prod. options (SOURCEIDs)';
  _TEXTS['# Plantas prod.'] = '# Producing plants';
  _TEXTS['Plantas prod. (códigos)'] = 'Producing plants (codes)';
  _TEXTS['# Componentes BOM'] = '# BOM components';
  _TEXTS['# Recursos prod.'] = '# Production resources';
  _TEXTS['Recursos prod. (códigos)'] = 'Production resources (codes)';
  _TEXTS['# Proveedores'] = '# Suppliers';
  _TEXTS['Proveedores (códigos)'] = 'Suppliers (codes)';
  _TEXTS['# Plantas cubiertas'] = '# Covered plants';
  _TEXTS['Plantas cubiertas (códigos)'] = 'Covered plants (codes)';
  _TEXTS['# Plantas sin cobertura'] = '# Plants without coverage';
  _TEXTS['Plantas sin cobertura (códigos)'] = 'Plants without coverage (codes)';
  _TEXTS['# Productos que lo usan'] = '# Products that use it';
  _TEXTS['# Orígenes en red'] = '# Network sources';
  _TEXTS['Orígenes en red (códigos)'] = 'Network sources (codes)';
  _TEXTS['# Plantas consumidoras'] = '# Consumer plants';
  _TEXTS['Plantas consumidoras (códigos)'] = 'Consumer plants (codes)';

  // PA Product — observaciones (filas obsTable)
  _TEXTS['Semiterminado sin consumo PSI en planta productora ni transferencia configurada'] = 'Semi-finished without PSI consumption at producing plant nor transfer configured';
  _TEXTS['El semiterminado se produce pero nadie lo consume ni se transfiere a otra planta — producción sin destino.'] = 'The semi-finished is produced but nobody consumes it nor is it transferred to another plant — production without destination.';
  _TEXTS['Verificar que el semiterminado esté en el BOM (PSI) de algún terminado en la misma planta, o configurar Location Source para transferirlo al punto de consumo.'] = 'Verify the semi-finished is in the BOM (PSI) of some finished product at the same plant, or configure Location Source to transfer it to the consumption point.';
  _TEXTS['Transfiere a N destino(s) sin consumo PSI en ningún punto: X'] = 'Transfers to N destination(s) without PSI consumption at any point: X';
  _TEXTS['El semiterminado se transfiere a destinos donde no es consumido como ingrediente, y tampoco se usa en la planta de origen.'] = 'The semi-finished is transferred to destinations where it is not consumed as an ingredient, and is not used at the source plant either.';
  _TEXTS['Agregar el semiterminado como componente PSI en la receta de la planta destino, o eliminar el arco de transferencia si es un error de configuración.'] = 'Add the semi-finished as a PSI component in the destination plant recipe, or remove the transfer arc if it is a configuration error.';
  _TEXTS['Transfiere a N destino(s) sin consumo PSI (sí consume en planta origen): X'] = 'Transfers to N destination(s) without PSI consumption (consumed at source plant): X';
  _TEXTS['El semiterminado se consume localmente en la planta de origen, pero también se transfiere a destinos donde no se usa como ingrediente.'] = 'The semi-finished is consumed locally at the source plant, but is also transferred to destinations where it is not used as an ingredient.';
  _TEXTS['Verificar si la transferencia a los destinos indicados es intencional. Si no, eliminar el arco de Location Source hacia esas ubicaciones.'] = 'Verify if the transfer to the indicated destinations is intentional. If not, remove the Location Source arc to those locations.';
  _TEXTS['PLEADTIME ausente o cero en N SOURCEID(s)'] = 'PLEADTIME missing or zero in N SOURCEID(s)';
  _TEXTS['El lead time de producción es 0 o está vacío en la(s) receta(s). IBP planifica como si la producción fuera instantánea.'] = 'The production lead time is 0 or empty in the recipe(s). IBP plans as if production were instantaneous.';
  _TEXTS['Ingresar el PLEADTIME real en días en el Production Source Header de IBP para cada SOURCEID afectado.'] = 'Enter the real PLEADTIME in days in the Production Source Header in IBP for each affected SOURCEID.';
  _TEXTS['OUTPUTCOEFFICIENT ausente o cero en N SOURCEID(s)'] = 'OUTPUTCOEFFICIENT missing or zero in N SOURCEID(s)';
  _TEXTS['El coeficiente de salida de la receta es 0 o está vacío. IBP no sabe cuántas unidades produce cada corrida.'] = 'The recipe output coefficient is 0 or empty. IBP does not know how many units are produced per run.';
  _TEXTS['Revisar y corregir el OUTPUTCOEFFICIENT en el Production Source Header.'] = 'Review and fix the OUTPUTCOEFFICIENT in the Production Source Header.';
  _TEXTS['Configurado solo como co-producto (SOURCETYPE=C) — falta PSH primario'] = 'Configured only as co-product (SOURCETYPE=C) — missing primary PSH';
  _TEXTS['El producto aparece en recetas como subproducto (C) pero nunca como output principal (P).'] = 'The product appears in recipes as a by-product (C) but never as the main output (P).';
  _TEXTS['Verificar si es intencional (es co-producto puro de otro proceso) o si falta crear la receta principal con SOURCETYPE=P.'] = 'Verify if it is intentional (pure co-product of another process) or if the main recipe with SOURCETYPE=P is missing.';
  _TEXTS['Tiene BOM de fabricación (PSH) — verificar categorización'] = 'Has manufacturing BOM (PSH) — verify categorization';
  _TEXTS['El producto tiene una receta de producción pero está categorizado como Mat. Prima o Mercadería, que no deberían fabricarse.'] = 'The product has a production recipe but is categorized as Raw Material or Trading, which should not be manufactured.';
  _TEXTS['Revisar si la categoría del MATTYPEID es correcta, o si el PSH es un error de configuración en IBP.'] = 'Check if the MATTYPEID category is correct, or if the PSH is a configuration error in IBP.';
  _TEXTS['No consumido como componente en ningún BOM'] = 'Not consumed as a component in any BOM';
  _TEXTS['El producto existe como Semiterminado o Mat. Prima pero no aparece como ingrediente en ninguna receta PSI.'] = 'The product exists as Semi-finished or Raw Material but does not appear as an ingredient in any PSI recipe.';
  _TEXTS['Verificar si el material todavía está vigente y si está correctamente vinculado en el BOM de los productos que lo consumen.'] = 'Verify if the material is still active and correctly linked in the BOM of the products that consume it.';
  _TEXTS['TLEADTIME = 0 en todos los arcos de Location Source'] = 'TLEADTIME = 0 in all Location Source arcs';
  _TEXTS['Todos los arcos de transferencia de este producto tienen lead time = 0. IBP planifica transferencias instantáneas.'] = 'All transfer arcs for this product have lead time = 0. IBP plans instantaneous transfers.';
  _TEXTS['Revisar y completar el TLEADTIME (en días) en los arcos de Location Source para este producto.'] = 'Review and complete the TLEADTIME (in days) in the Location Source arcs for this product.';
  _TEXTS['Con PSH, PSI y PSR'] = 'With PSH, PSI and PSR';
  _TEXTS['La receta de producción existe con BOM completo y recursos asignados.'] = 'The production recipe exists with a complete BOM and assigned resources.';
  _TEXTS['Planta es origen en Location Source'] = 'Plant is a source in Location Source';
  _TEXTS['La planta productora tiene al menos un arco saliente en Location Source para este producto.'] = 'The producing plant has at least one outbound arc in Location Source for this product.';
  _TEXTS['Arcos de abastecimiento completos'] = 'Complete supply arcs';
  _TEXTS['Todas las plantas que consumen este insumo tienen arco de abastecimiento configurado en Location Source.'] = 'All plants consuming this input have a supply arc configured in Location Source.';
  _TEXTS['Con arcos en Location Source'] = 'With arcs in Location Source';
  _TEXTS['El producto tiene arcos de distribución configurados en Location Source.'] = 'The product has distribution arcs configured in Location Source.';
  _TEXTS['PLEADTIME definido en todos los SOURCEIDs'] = 'PLEADTIME defined in all SOURCEIDs';
  _TEXTS['Ningún SOURCEID tiene PLEADTIME = 0 o vacío.'] = 'No SOURCEID has PLEADTIME = 0 or empty.';
  _TEXTS['Coeficiente de salida definido'] = 'Output coefficient defined';
  _TEXTS['Todos los SOURCEIDs tienen OUTPUTCOEFFICIENT mayor que cero.'] = 'All SOURCEIDs have OUTPUTCOEFFICIENT greater than zero.';
  _TEXTS['PSH con SOURCETYPE=P presente'] = 'PSH with SOURCETYPE=P present';
  _TEXTS['Al menos un registro con SOURCETYPE=P existe para este producto.'] = 'At least one record with SOURCETYPE=P exists for this product.';
  _TEXTS['Sin BOM de fabricación'] = 'No manufacturing BOM';
  _TEXTS['El producto no tiene PSH, lo cual es correcto para Mat. Prima y Mercadería.'] = 'The product has no PSH, which is correct for Raw Material and Trading.';
  _TEXTS['Consumido como componente en BOM'] = 'Consumed as a component in BOM';
  _TEXTS['El producto aparece como ingrediente en al menos una receta PSI.'] = 'The product appears as an ingredient in at least one PSI recipe.';
  _TEXTS['Consume en planta productora'] = 'Consumed at producing plant';
  _TEXTS['El semiterminado se produce y se consume localmente en la misma planta — no requiere transferencia.'] = 'The semi-finished is produced and consumed locally at the same plant — no transfer required.';
  _TEXTS['Consumo en destino de transferencia verificado'] = 'Consumption at transfer destination verified';
  _TEXTS['El semiterminado se transfiere a otra planta y en el destino existe consumo PSI configurado.'] = 'The semi-finished is transferred to another plant and PSI consumption is configured at the destination.';
  _TEXTS['TLEADTIME definido en Location Source'] = 'TLEADTIME defined in Location Source';
  _TEXTS['Al menos un arco de Location Source tiene TLEADTIME mayor que cero.'] = 'At least one Location Source arc has TLEADTIME greater than zero.';
  _TEXTS['Sin categoría [MATTYPEID] — sin hallazgos en modo permisivo'] = 'Uncategorized [MATTYPEID] — no findings in permissive mode';
  _TEXTS['El producto no tiene categoría asignada y no presentó hallazgos. Las validaciones se aplicaron en modo permisivo. El texto entre corchetes es el MATTYPEID real del producto.'] = 'The product has no assigned category and showed no findings. Validations were applied in permissive mode. The text in brackets is the actual MATTYPEID of the product.';
  _TEXTS['Asignar la categoría correcta al tipo de material en el panel de categorización para activar las validaciones estrictas correspondientes.'] = 'Assign the correct category to the material type in the categorization panel to enable the corresponding strict validations.';

  // PA Location — columnas (productores)
  _TEXTS['LOCID'] = 'LOCID';
  _TEXTS['LOCDESCR'] = 'LOCDESCR';
  _TEXTS['LOCTYPE'] = 'LOCTYPE';
  _TEXTS['Rol(es) inferido(s)'] = 'Inferred role(s)';
  _TEXTS['# Productos fabricados'] = '# Manufactured products';
  _TEXTS['Productos fabricados (códigos)'] = 'Manufactured products (codes)';
  _TEXTS['# SOURCEIDs'] = '# SOURCEIDs';
  _TEXTS['SOURCEIDs (códigos)'] = 'SOURCEIDs (codes)';
  _TEXTS['# Recursos asignados'] = '# Assigned resources';
  _TEXTS['Recursos asignados (códigos)'] = 'Assigned resources (codes)';
  _TEXTS['# Recursos activos PSR'] = '# Active resources PSR';
  _TEXTS['Recursos activos (códigos)'] = 'Active resources (codes)';
  _TEXTS['# Recursos ociosos'] = '# Idle resources';
  _TEXTS['Recursos ociosos (códigos)'] = 'Idle resources (codes)';
  _TEXTS['# BOMs sin PSI'] = '# BOMs without PSI';
  _TEXTS['SOURCEIDs sin PSI (códigos)'] = 'SOURCEIDs without PSI (codes)';
  _TEXTS['# BOMs sin PSR'] = '# BOMs without PSR';
  _TEXTS['SOURCEIDs sin PSR (códigos)'] = 'SOURCEIDs without PSR (codes)';
  _TEXTS['# Componentes externos'] = '# External components';
  _TEXTS['# Componentes sin cobertura LocSrc'] = '# Components without LocSrc coverage';
  _TEXTS['Componentes sin cobertura (códigos)'] = 'Components without coverage (codes)';
  _TEXTS['# SOURCEIDs sin PLEADTIME'] = '# SOURCEIDs without PLEADTIME';
  _TEXTS['SOURCEIDs sin PLEADTIME (códigos)'] = 'SOURCEIDs without PLEADTIME (codes)';
  _TEXTS['Productos distintos con al menos un SOURCEID en esta planta.'] = 'Distinct products with at least one SOURCEID at this plant.';
  _TEXTS['Códigos de los productos fabricados.'] = 'Codes of the manufactured products.';
  _TEXTS['Total de recetas de producción en esta planta.'] = 'Total production recipes at this plant.';
  _TEXTS['Códigos de las recetas.'] = 'Codes of the recipes.';
  _TEXTS['Recursos con Resource Location configurado en esta planta.'] = 'Resources with Resource Location configured at this plant.';
  _TEXTS['Códigos de los recursos asignados.'] = 'Codes of the assigned resources.';
  _TEXTS['Recursos que además participan en alguna receta PSR activa en esta planta.'] = 'Resources that also participate in some active PSR recipe at this plant.';
  _TEXTS['Códigos de los recursos activos.'] = 'Codes of the active resources.';
  _TEXTS['Recursos asignados en Resource Location pero sin ningún PSR activo — configuración sin uso.'] = 'Resources assigned in Resource Location but without any active PSR — unused configuration.';
  _TEXTS['Códigos de los recursos ociosos.'] = 'Codes of the idle resources.';
  _TEXTS['SOURCEIDs de esta planta sin componentes PSI definidos.'] = 'SOURCEIDs of this plant without defined PSI components.';
  _TEXTS['Códigos de los SOURCEIDs con BOM vacío.'] = 'Codes of the SOURCEIDs with empty BOM.';
  _TEXTS['SOURCEIDs sin recurso asignado.'] = 'SOURCEIDs without assigned resource.';
  _TEXTS['Códigos de los SOURCEIDs sin recurso.'] = 'Codes of the SOURCEIDs without resource.';
  _TEXTS['Ingredientes PSI de esta planta que no son semiterminados producidos localmente y deben llegar vía Location Source.'] = 'PSI ingredients of this plant that are not locally produced semi-finished and must arrive via Location Source.';
  _TEXTS['Insumos consumidos en esta planta sin arco de abastecimiento configurado. Crítico para planificación de compras.'] = 'Inputs consumed at this plant without a supply arc configured. Critical for purchasing planning.';
  _TEXTS['Códigos de los productos sin arco de abastecimiento hacia esta planta.'] = 'Codes of the products without a supply arc to this plant.';
  _TEXTS['Recetas con PLEADTIME = 0 o vacío en esta planta.'] = 'Recipes with PLEADTIME = 0 or empty at this plant.';
  _TEXTS['Códigos de los SOURCEIDs sin lead time de producción.'] = 'Codes of the SOURCEIDs without production lead time.';

  // PA Location — columnas (proveedor)
  _TEXTS['# Productos abastecidos (como proveedor)'] = '# Supplied products (as supplier)';
  _TEXTS['Productos abastecidos (códigos)'] = 'Supplied products (codes)';
  _TEXTS['# Plantas abastecidas'] = '# Supplied plants';
  _TEXTS['Plantas abastecidas (códigos)'] = 'Supplied plants (codes)';
  _TEXTS['# Arcos sin consumo PSI en destino'] = '# Arcs without PSI consumption at destination';
  _TEXTS['Productos sin consumo PSI (códigos)'] = 'Products without PSI consumption (codes)';
  _TEXTS['# Productos sin LocProd en destino'] = '# Products without LocProd at destination';
  _TEXTS['Productos sin LocProd (códigos)'] = 'Products without LocProd (codes)';
  _TEXTS['Productos que esta ubicación envía hacia plantas donde se consumen como PSI.'] = 'Products this location sends to plants where they are consumed as PSI.';
  _TEXTS['Códigos de esos productos.'] = 'Codes of those products.';
  _TEXTS['Plantas destino que reciben abastecimiento desde esta ubicación.'] = 'Destination plants that receive supply from this location.';
  _TEXTS['Códigos de las plantas abastecidas.'] = 'Codes of the supplied plants.';
  _TEXTS['Arcos donde el producto enviado no se consume como PSI en la planta destino — posible error o nodo intermedio.'] = 'Arcs where the sent product is not consumed as PSI at the destination plant — possible error or intermediate node.';
  _TEXTS['Productos que se envían a plantas que no los tienen habilitados en Location Product.'] = 'Products sent to plants that do not have them enabled in Location Product.';

  // PA Location — columnas (transferencia y receptor)
  _TEXTS['# Productos transferidos'] = '# Transferred products';
  _TEXTS['Productos transferidos (códigos)'] = 'Transferred products (codes)';
  _TEXTS['# Destinos transferencia'] = '# Transfer destinations';
  _TEXTS['Destinos transferencia (códigos)'] = 'Transfer destinations (codes)';
  _TEXTS['Productos que esta ubicación redistribuye hacia otros nodos sin ser consumidos como PSI en destino.'] = 'Products this location redistributes to other nodes without being consumed as PSI at the destination.';
  _TEXTS['Códigos de los productos transferidos.'] = 'Codes of the transferred products.';
  _TEXTS['Número de nodos destino hacia los que transfiere.'] = 'Number of destination nodes to which it transfers.';
  _TEXTS['Códigos de los destinos.'] = 'Codes of the destinations.';
  _TEXTS['# Productos recibidos'] = '# Received products';
  _TEXTS['Productos recibidos (códigos)'] = 'Received products (codes)';
  _TEXTS['# Orígenes desde los que recibe'] = '# Sources it receives from';
  _TEXTS['Orígenes (códigos)'] = 'Sources (codes)';
  _TEXTS['Productos que esta ubicación recibe desde otros nodos vía Location Source.'] = 'Products this location receives from other nodes via Location Source.';
  _TEXTS['Códigos de los productos recibidos.'] = 'Codes of the received products.';
  _TEXTS['Número de ubicaciones distintas que envían productos a esta ubicación.'] = 'Number of distinct locations that send products to this location.';
  _TEXTS['Códigos de las ubicaciones origen.'] = 'Codes of the source locations.';

  // PA Location — observaciones
  _TEXTS['N SOURCEID(s) sin PSI'] = 'N SOURCEID(s) without PSI';
  _TEXTS['N recetas de producción de esta planta no tienen ingredientes definidos (BOM vacío). IBP no puede planificar compra de insumos para esas recetas.'] = 'N production recipes at this plant have no defined ingredients (empty BOM). IBP cannot plan input purchasing for those recipes.';
  _TEXTS['Revisar y completar el BOM (PSI) de los SOURCEIDs indicados en la hoja Prod Source Header.'] = 'Review and complete the BOM (PSI) of the indicated SOURCEIDs in the Prod Source Header sheet.';
  _TEXTS['N SOURCEID(s) sin PSR'] = 'N SOURCEID(s) without PSR';
  _TEXTS['N recetas no tienen ningún recurso productivo asignado. IBP no evalúa capacidad para esas recetas.'] = 'N recipes have no production resource assigned. IBP does not evaluate capacity for those recipes.';
  _TEXTS['Asignar un recurso (RESID) a cada SOURCEID indicado vía Production Source Resource en IBP.'] = 'Assign a resource (RESID) to each indicated SOURCEID via Production Source Resource in IBP.';
  _TEXTS['N componente(s) sin arco de abastecimiento'] = 'N component(s) without supply arc';
  _TEXTS['N insumos que se consumen en esta planta no tienen arco en Location Source que los traiga hasta aquí.'] = 'N inputs consumed at this plant have no Location Source arc bringing them here.';
  _TEXTS['Crear arcos en Location Source para los componentes indicados, con el proveedor como LOCFR y esta planta como LOCID.'] = 'Create Location Source arcs for the indicated components, with the supplier as LOCFR and this plant as LOCID.';
  _TEXTS['N SOURCEID(s) con PLEADTIME = 0'] = 'N SOURCEID(s) with PLEADTIME = 0';
  _TEXTS['N recetas tienen lead time de producción cero o vacío. IBP planifica esas producciones como instantáneas.'] = 'N recipes have production lead time zero or empty. IBP plans those productions as instantaneous.';
  _TEXTS['Ingresar el PLEADTIME real (en días) en el Production Source Header de cada SOURCEID afectado.'] = 'Enter the real PLEADTIME (in days) in the Production Source Header of each affected SOURCEID.';
  _TEXTS['N recurso(s) asignados sin uso en PSR'] = 'N resource(s) assigned without use in PSR';
  _TEXTS['N recursos tienen Resource Location configurado en esta planta pero no participan en ninguna receta activa.'] = 'N resources have Resource Location configured at this plant but do not participate in any active recipe.';
  _TEXTS['Verificar si los recursos son obsoletos y deben eliminarse de Resource Location, o si falta asignarlos a algún PSR.'] = 'Check if the resources are obsolete and should be removed from Resource Location, or if they are missing assignment in some PSR.';
  _TEXTS['N producto(s) Mat. Prima/Mercadería con BOM de fabricación en esta planta — verificar categorización'] = 'N Raw Material/Trading product(s) with manufacturing BOM at this plant — verify categorization';
  _TEXTS['Productos categorizados como Mat. Prima o Mercadería tienen PSH en esta planta — posible error de categorización.'] = 'Products categorized as Raw Material or Trading have PSH at this plant — possible categorization error.';
  _TEXTS['Revisar la categoría del MATTYPEID o verificar si el PSH es un error de configuración en IBP.'] = 'Review the MATTYPEID category or check whether the PSH is a configuration error in IBP.';
  _TEXTS['N producto(s) abastecidos sin consumo PSI en destino'] = 'N supplied product(s) without PSI consumption at destination';
  _TEXTS['Esta ubicación envía productos hacia plantas donde no son consumidos como ingrediente en ninguna receta.'] = 'This location sends products to plants where they are not consumed as an ingredient in any recipe.';
  _TEXTS['Verificar si el arco de Location Source es correcto o si falta agregar el componente en el BOM del destino.'] = 'Verify if the Location Source arc is correct or if the component is missing from the destination BOM.';
  _TEXTS['N producto(s) sin Location Product en planta destino'] = 'N product(s) without Location Product at destination plant';
  _TEXTS['Esta ubicación envía productos hacia plantas que no los tienen habilitados en Location Product — IBP no puede planificarlos ahí.'] = 'This location sends products to plants that do not have them enabled in Location Product — IBP cannot plan them there.';
  _TEXTS['Habilitar los productos indicados en Location Product para la planta destino.'] = 'Enable the indicated products in Location Product for the destination plant.';
  _TEXTS['N componente(s) Mat. Prima/Semiterminado transferido(s) a planta sin consumo PSI — verificar BOM'] = 'N Raw Material/Semi-finished component(s) transferred to plant without PSI consumption — verify BOM';
  _TEXTS['Esta ubicación envía componentes a una planta donde ninguna receta los consume. El insumo llega sin destino productivo.'] = 'This location sends components to a plant where no recipe consumes them. The input arrives without a productive destination.';
  _TEXTS['Revisar el BOM de la planta destino y agregar el componente como PSI, o eliminar el arco de Location Source si es un error.'] = 'Review the destination plant BOM and add the component as PSI, or remove the Location Source arc if it is an error.';
  _TEXTS['N componente(s) Mat. Prima/Semiterminado transferido(s) a nodo sin producción'] = 'N Raw Material/Semi-finished component(s) transferred to node without production';
  _TEXTS['Esta ubicación envía componentes a una ubicación que no tiene producción — posible nodo intermedio o configuración incompleta.'] = 'This location sends components to a location with no production — possible intermediate node or incomplete configuration.';
  _TEXTS['Verificar si el nodo destino es un punto de cross-docking o si el arco de transferencia es un error.'] = 'Check if the destination node is a cross-docking point or if the transfer arc is an error.';
  _TEXTS['N producto(s) sin categoría transferidos sin consumo PSI en destino'] = 'N uncategorized product(s) transferred without PSI consumption at destination';
  _TEXTS['Productos sin categoría asignada se transfieren a destinos donde no se usan en ningún BOM.'] = 'Uncategorized products are transferred to destinations where they are not used in any BOM.';
  _TEXTS['Asignar categoría al MATTYPEID de los productos indicados para que el análisis pueda aplicar las reglas correctas.'] = 'Assign a category to the MATTYPEID of the indicated products so the analysis can apply the correct rules.';
  _TEXTS['N producto(s) recibidos sin cobertura en Location Product'] = 'N received product(s) without coverage in Location Product';
  _TEXTS['Esta ubicación recibe productos por Location Source pero no los tiene habilitados en Location Product — IBP no puede planificarlos aquí.'] = 'This location receives products through Location Source but does not have them enabled in Location Product — IBP cannot plan them here.';
  _TEXTS['Habilitar los productos indicados en Location Product para esta ubicación.'] = 'Enable the indicated products in Location Product for this location.';
  _TEXTS['N componente(s) Mat. Prima/Semiterminado recibidos en ubicación sin producción asociada'] = 'N Raw Material/Semi-finished component(s) received at location without associated production';
  _TEXTS['Esta ubicación recibe insumos o semiterminados pero no tiene ninguna receta de producción — los insumos llegan sin uso productivo declarado.'] = 'This location receives inputs or semi-finished but has no production recipe — the inputs arrive without declared productive use.';
  _TEXTS['Verificar si esta ubicación debería tener producción configurada o si los arcos de abastecimiento son incorrectos.'] = 'Verify whether this location should have production configured or whether the supply arcs are incorrect.';
  _TEXTS['Ubicación en maestro sin actividad en otros datos'] = 'Location in master without activity in other data';
  _TEXTS['La ubicación existe en el maestro pero no aparece en ninguna entidad de red (PSH, Location Source, Customer Source, Location Product).'] = 'The location exists in the master but does not appear in any network entity (PSH, Location Source, Customer Source, Location Product).';
  _TEXTS['Verificar si la ubicación es obsoleta y puede depurarse del maestro, o si falta configurar su participación en la red.'] = 'Check if the location is obsolete and can be removed from the master, or if its network participation is missing.';
  _TEXTS['BOMs con PSI, PSR y lead time | Sin componentes sin cobertura | Sin recursos ociosos'] = 'BOMs with PSI, PSR and lead time | No uncovered components | No idle resources';
  _TEXTS['Planta completamente configurada: todas las recetas tienen BOM, recursos y lead time; todos los insumos tienen cobertura; no hay recursos sin uso.'] = 'Fully configured plant: all recipes have BOM, resources and lead time; all inputs have coverage; no unused resources.';
  _TEXTS['Abastecimiento con consumo PSI y cobertura LP en destino'] = 'Supply with PSI consumption and LP coverage at destination';
  _TEXTS['Todos los productos que esta ubicación envía son consumidos como PSI en las plantas destino y están habilitados en Location Product.'] = 'All products this location sends are consumed as PSI at the destination plants and are enabled in Location Product.';
  _TEXTS['Distribuye N producto(s) terminado(s)/mercadería sin hallazgos'] = 'Distributes N finished/trading product(s) without findings';
  _TEXTS['Nodo de transferencia que redistribuye productos terminados o mercadería sin anomalías detectadas.'] = 'Transfer node that redistributes finished or trading products without detected anomalies.';
  _TEXTS['Nodo de transferencia sin hallazgos'] = 'Transfer node without findings';
  _TEXTS['La ubicación actúa como nodo de transferencia y no se detectaron problemas de configuración en los productos que redistribuye.'] = 'The location acts as a transfer node and no configuration problems were detected in the products it redistributes.';
  _TEXTS['Recibe N producto(s) | Location Product OK | Sin componentes sin producción'] = 'Receives N product(s) | Location Product OK | No components without production';
  _TEXTS['Nodo receptor correctamente configurado: todos los productos recibidos están habilitados en Location Product y ningún insumo llega a una ubicación sin producción asociada.'] = 'Correctly configured receiver node: all received products are enabled in Location Product and no input arrives at a location without associated production.';
  _TEXTS['Nodo receptor sin hallazgos'] = 'Receiver node without findings';
  _TEXTS['La ubicación solo recibe productos y no se detectaron problemas de configuración.'] = 'The location only receives products and no configuration problems were detected.';
  _TEXTS['Ubicación activa sin hallazgos'] = 'Active location without findings';
  _TEXTS['La ubicación tiene actividad en la red y no se detectaron anomalías de configuración.'] = 'The location has activity in the network and no configuration anomalies were detected.';

  // PA Resource — columnas
  _TEXTS['RESID'] = 'RESID';
  _TEXTS['RESDESCR'] = 'RESDESCR';
  _TEXTS['En PSR'] = 'In PSR';
  _TEXTS['En Resource Location'] = 'In Resource Location';
  _TEXTS['# Plantas asignadas'] = '# Assigned plants';
  _TEXTS['Plantas asignadas (códigos)'] = 'Assigned plants (codes)';
  _TEXTS['# Fuentes prod.'] = '# Production sources';
  _TEXTS['Fuentes prod. (SOURCEIDs)'] = 'Production sources (SOURCEIDs)';
  _TEXTS['# Productos que fabrica'] = '# Products it manufactures';
  _TEXTS['Productos que fabrica (códigos)'] = 'Products it manufactures (codes)';
  _TEXTS['Sí/No — ¿Este recurso está asignado a al menos una fuente de producción en Production Source Resource? Si No, IBP nunca lo usa para planificar capacidad.'] = 'Yes/No — Is this resource assigned to at least one production source in Production Source Resource? If No, IBP never uses it for capacity planning.';
  _TEXTS['Sí/No — ¿Este recurso tiene al menos una planta configurada en Resource Location? Si No, IBP no sabe dónde opera físicamente.'] = 'Yes/No — Does this resource have at least one plant configured in Resource Location? If No, IBP does not know where it physically operates.';
  _TEXTS['Número de plantas donde este recurso tiene Resource Location configurado.'] = 'Number of plants where this resource has Resource Location configured.';
  _TEXTS['Códigos de las plantas donde está configurado el recurso.'] = 'Codes of the plants where the resource is configured.';
  _TEXTS['Número de SOURCEIDs a los que está asignado este recurso vía PSR.'] = 'Number of SOURCEIDs to which this resource is assigned via PSR.';
  _TEXTS['Códigos de los SOURCEIDs a los que está asignado este recurso.'] = 'Codes of the SOURCEIDs to which this resource is assigned.';
  _TEXTS['Número de productos distintos que este recurso ayuda a producir.'] = 'Number of distinct products this resource helps to produce.';
  _TEXTS['Códigos de los productos que produce este recurso.'] = 'Codes of the products produced by this resource.';

  // PA Resource — observaciones
  _TEXTS['El recurso existe en el maestro pero no aparece ni en PSR ni en Resource Location — completamente desconectado de la configuración productiva.'] = 'The resource exists in the master but appears neither in PSR nor in Resource Location — completely disconnected from the production configuration.';
  _TEXTS['Verificar si el recurso es obsoleto y puede eliminarse del maestro, o si falta asignarlo a recetas (PSR) y a su planta (Resource Location).'] = 'Check if the resource is obsolete and can be removed from the master, or if it is missing assignment to recipes (PSR) and to its plant (Resource Location).';
  _TEXTS['El recurso tiene planta asignada en Resource Location pero ninguna receta lo usa. IBP tiene el recurso ubicado pero nunca lo considera para planificar capacidad.'] = 'The resource has a plant assigned in Resource Location but no recipe uses it. IBP has the resource located but never considers it for capacity planning.';
  _TEXTS['Asignar el recurso a al menos una receta (SOURCEID) vía Production Source Resource, o verificar si es obsoleto.'] = 'Assign the resource to at least one recipe (SOURCEID) via Production Source Resource, or check if it is obsolete.';
  _TEXTS['El recurso participa en recetas (PSR) pero no tiene planta configurada en Resource Location. IBP no sabe en qué planta opera físicamente.'] = 'The resource participates in recipes (PSR) but has no plant configured in Resource Location. IBP does not know in which plant it physically operates.';
  _TEXTS['Agregar la combinación RESID+LOCID correspondiente en Resource Location en IBP.'] = 'Add the corresponding RESID+LOCID combination in Resource Location in IBP.';
  _TEXTS['El recurso está activo en al menos una receta y tiene su planta correctamente configurada.'] = 'The resource is active in at least one recipe and has its plant correctly configured.';

  // PA Resource Location
  _TEXTS['Una fila por cada combinación Recurso + Planta configurada en Resource Location. Valida si cada combinación está siendo efectivamente usada en alguna receta de producción.'] = 'One row per Resource + Plant combination configured in Resource Location. Validates whether each combination is actually being used in some production recipe.';
  _TEXTS['Código del recurso productivo.'] = 'Production resource code.';
  _TEXTS['Descripción del recurso.'] = 'Resource description.';
  _TEXTS['Código de la planta donde está configurado este recurso.'] = 'Code of the plant where this resource is configured.';
  _TEXTS['RESID+LOCID usado en PSR'] = 'RESID+LOCID used in PSR';
  _TEXTS['Sí/No — ¿Esta combinación aparece en al menos un Production Source Resource activo? Si No, el recurso está en el maestro de esa planta pero no participa en ninguna receta.'] = 'Yes/No — Does this combination appear in at least one active Production Source Resource? If No, the resource is in the plant master but does not participate in any recipe.';
  _TEXTS['Recurso activo en PSR para esta planta'] = 'Resource active in PSR for this plant';
  _TEXTS['La combinación RESID+LOCID está en uso en al menos una receta de producción en esa planta.'] = 'The RESID+LOCID combination is in use in at least one production recipe at that plant.';
  _TEXTS['Recurso asignado a planta pero sin uso en PSR para esta planta'] = 'Resource assigned to plant but unused in PSR for this plant';
  _TEXTS['El recurso está en el maestro de la planta (Resource Location) pero ninguna receta activa lo usa en esa planta. IBP lo conoce pero nunca lo considera para planificación de capacidad en ese sitio.'] = 'The resource is in the plant master (Resource Location) but no active recipe uses it at that plant. IBP knows it but never considers it for capacity planning at that site.';
  _TEXTS['Verificar si el recurso es obsoleto para esa planta y puede eliminarse de Resource Location, o si falta asignarlo a alguna receta (PSR) en esa planta.'] = 'Check if the resource is obsolete for that plant and can be removed from Resource Location, or if it is missing assignment to some recipe (PSR) at that plant.';

  // PA PSH — columnas
  _TEXTS['SOURCEID'] = 'SOURCEID';
  _TEXTS['PRDID output'] = 'PRDID output';
  _TEXTS['PRDDESCR output'] = 'PRDDESCR output';
  _TEXTS['MATTYPEID output'] = 'MATTYPEID output';
  _TEXTS['LOCID planta'] = 'LOCID plant';
  _TEXTS['LOCDESCR planta'] = 'LOCDESCR plant';
  _TEXTS['SOURCETYPE(s)'] = 'SOURCETYPE(s)';
  _TEXTS['PLEADTIME'] = 'PLEADTIME';
  _TEXTS['OUTPUTCOEFFICIENT'] = 'OUTPUTCOEFFICIENT';
  _TEXTS['PRATIO'] = 'PRATIO';
  _TEXTS['PRDID+LOCID en Location Product'] = 'PRDID+LOCID in Location Product';
  _TEXTS['# Componentes PSI'] = '# PSI components';
  _TEXTS['# Recursos PSR'] = '# PSR resources';
  _TEXTS['Recursos PSR (códigos)'] = 'PSR resources (codes)';
  _TEXTS['# Componentes con alternativa'] = '# Components with alternative';
  _TEXTS['Tiene PSR'] = 'Has PSR';
  _TEXTS['P = fuente primaria (output principal) | C = co-producto (subproducto del mismo proceso). Una receta puede tener P y C simultáneamente.'] = 'P = primary source (main output) | C = co-product (by-product of the same process). A recipe can have both P and C simultaneously.';
  _TEXTS['Lead time de producción en días. 0 o vacío → IBP planifica producción instantánea (⛔).'] = 'Production lead time in days. 0 or empty → IBP plans instantaneous production (⛔).';
  _TEXTS['Unidades del producto terminado por corrida de producción. Afecta el cálculo de cuántas corridas se necesitan para cubrir la demanda.'] = 'Finished product units per production run. Affects the calculation of how many runs are needed to cover demand.';
  _TEXTS['Proporción asignada a esta fuente cuando hay múltiples SOURCEIDs para el mismo producto+planta. IBP usa este valor para distribuir la demanda entre recetas. Vacío = fuente única o sin cuota definida.'] = 'Share assigned to this source when multiple SOURCEIDs exist for the same product+plant. IBP uses this value to distribute demand among recipes. Empty = single source or no quota defined.';
  _TEXTS['Sí/No — ¿Esta combinación producto+planta está habilitada en Location Product? Sin esto la receta existe pero IBP no la activa.'] = 'Yes/No — Is this product+plant combination enabled in Location Product? Without this, the recipe exists but IBP does not activate it.';
  _TEXTS['Ingredientes definidos en el BOM. 0 = BOM vacío → IBP no planifica compra de insumos.'] = 'Ingredients defined in the BOM. 0 = empty BOM → IBP does not plan input purchasing.';
  _TEXTS['Recursos asignados a esta receta. 0 = sin capacidad modelada.'] = 'Resources assigned to this recipe. 0 = no modeled capacity.';
  _TEXTS['Códigos de los recursos asignados a esta receta vía Production Source Resource.'] = 'Codes of the resources assigned to this recipe via Production Source Resource.';
  _TEXTS['Ingredientes marcados como material de reemplazo (ISALTITEM=X). Útil para conocer la flexibilidad de sustitución del BOM.'] = 'Ingredients marked as alternative material (ISALTITEM=X). Useful to know the BOM substitution flexibility.';
  _TEXTS['Sí/No — resumen directo de si la receta tiene al menos un recurso asignado en Production Source Resource.'] = 'Yes/No — direct summary of whether the recipe has at least one resource assigned in Production Source Resource.';

  // PA PSH — observaciones
  _TEXTS['BOM vacío: sin componentes PSI'] = 'Empty BOM: no PSI components';
  _TEXTS['La receta no tiene ningún ingrediente definido. IBP no genera demanda de insumos para este producto.'] = 'The recipe has no defined ingredient. IBP does not generate input demand for this product.';
  _TEXTS['Cargar los componentes (PSI) necesarios en el BOM del SOURCEID indicado en IBP.'] = 'Load the required components (PSI) in the BOM of the indicated SOURCEID in IBP.';
  _TEXTS['PLEADTIME = 0 o no definido'] = 'PLEADTIME = 0 or undefined';
  _TEXTS['El lead time de producción es cero o está vacío. IBP planifica como si el producto se fabricara de forma instantánea, lo que genera fechas de entrega incorrectas.'] = 'The production lead time is zero or empty. IBP plans as if the product were manufactured instantaneously, generating incorrect delivery dates.';
  _TEXTS['Ingresar el lead time real de producción (en días) en el campo PLEADTIME del Production Source Header en IBP.'] = 'Enter the real production lead time (in days) in the PLEADTIME field of the Production Source Header in IBP.';
  _TEXTS['PRDID+LOCID sin cobertura en Location Product'] = 'PRDID+LOCID without coverage in Location Product';
  _TEXTS['La combinación producto+planta de esta receta no está habilitada en Location Product. La receta existe pero IBP no la usa para planificar.'] = 'The product+plant combination of this recipe is not enabled in Location Product. The recipe exists but IBP does not use it for planning.';
  _TEXTS['Habilitar la combinación PRDID+LOCID en Location Product en IBP.'] = 'Enable the PRDID+LOCID combination in Location Product in IBP.';
  _TEXTS['Sin recursos PSR asignados'] = 'No PSR resources assigned';
  _TEXTS['La receta no tiene ningún recurso productivo asignado. IBP no puede evaluar restricciones de capacidad para esta receta.'] = 'The recipe has no production resource assigned. IBP cannot evaluate capacity constraints for this recipe.';
  _TEXTS['Asignar al menos un recurso (RESID) a este SOURCEID vía Production Source Resource en IBP.'] = 'Assign at least one resource (RESID) to this SOURCEID via Production Source Resource in IBP.';
  _TEXTS['Sin registro SOURCETYPE=P'] = 'No SOURCETYPE=P record';
  _TEXTS['La receta no tiene un registro con SOURCETYPE=P — solo tiene co-productos (C). No tiene un output principal definido.'] = 'The recipe has no record with SOURCETYPE=P — only has co-products (C). It has no defined main output.';
  _TEXTS['Revisar la configuración del SOURCEID y agregar el registro con SOURCETYPE=P para el producto principal.'] = 'Review the SOURCEID configuration and add the record with SOURCETYPE=P for the main product.';
  _TEXTS['Múltiples SOURCEIDs para mismo PRDID+LOCID — verificar cuotas'] = 'Multiple SOURCEIDs for same PRDID+LOCID — verify quotas';
  _TEXTS['Hay más de una receta para el mismo producto en la misma planta. IBP necesita PRATIO definido para distribuir correctamente la demanda entre las fuentes.'] = 'There is more than one recipe for the same product at the same plant. IBP needs PRATIO defined to correctly distribute demand among sources.';
  _TEXTS['Revisar que los SOURCEIDs indicados tengan PRATIO definido y que la suma de cuotas sea coherente con la estrategia de producción.'] = 'Verify that the indicated SOURCEIDs have PRATIO defined and that the sum of quotas is consistent with the production strategy.';
  _TEXTS['BOM con componentes PSI | Lead time definido | Habilitado en LP | SOURCETYPE=P presente | Recursos PSR asignados'] = 'BOM with PSI components | Lead time defined | Enabled in LP | SOURCETYPE=P present | PSR resources assigned';
  _TEXTS['La receta está completamente configurada.'] = 'The recipe is fully configured.';

  // PA PSI
  _TEXTS['Una fila por cada componente (ingrediente) en el BOM de una receta de producción. Valida que cada ingrediente tenga coeficiente definido y arco de abastecimiento configurado.'] = 'One row per component (ingredient) in the BOM of a production recipe. Validates that each ingredient has a defined coefficient and a supply arc configured.';
  _TEXTS['Receta a la que pertenece este componente.'] = 'Recipe to which this component belongs.';
  _TEXTS['Producto que fabrica esa receta.'] = 'Product manufactured by that recipe.';
  _TEXTS['Planta donde se ejecuta la receta.'] = 'Plant where the recipe runs.';
  _TEXTS['PRDID componente'] = 'PRDID component';
  _TEXTS['PRDDESCR comp'] = 'PRDDESCR comp';
  _TEXTS['MATTYPEID comp'] = 'MATTYPEID comp';
  _TEXTS['COMPONENTCOEFFICIENT'] = 'COMPONENTCOEFFICIENT';
  _TEXTS['Tipo componente'] = 'Component type';
  _TEXTS['PRDID comp+LOCID en Location Product'] = 'PRDID comp+LOCID in Location Product';
  _TEXTS['En Location Source (insumo)'] = 'In Location Source (input)';
  _TEXTS['LOCFR origen'] = 'LOCFR source';
  _TEXTS['LOCDESCR origen'] = 'LOCDESCR source';
  _TEXTS['# Orígenes comp.'] = '# Sources comp.';
  _TEXTS['Orígenes comp. (códigos)'] = 'Sources comp. (codes)';
  _TEXTS['Material de reemplazo (ISALTITEM)'] = 'Alternative material (ISALTITEM)';
  _TEXTS['Reemplaza a'] = 'Replaces';
  _TEXTS['Material que se consume como ingrediente en esta receta.'] = 'Material consumed as an ingredient in this recipe.';
  _TEXTS['Descripción del componente.'] = 'Component description.';
  _TEXTS['Tipo de material del componente. Determina si se trata como semiterminado o insumo externo.'] = 'Material type of the component. Determines whether it is treated as semi-finished or external input.';
  _TEXTS['Unidades del componente consumidas por unidad de producto terminado. Si es 0, IBP no planifica la compra de este insumo.'] = 'Component units consumed per unit of finished product. If 0, IBP does not plan the purchase of this input.';
  _TEXTS['Semielaborado = se fabrica en la misma planta (tiene PSH propio ahí) | Semielaborado (ext.) = se fabrica en otra planta (PSH en planta distinta) | Semielaborado (sin receta) = categorizado como semi pero sin PSH activo en ninguna planta | Insumo = debe llegar desde fuera vía Location Source | No determinado = no se pudo clasificar con la información disponible.'] = 'Semi-finished = manufactured at the same plant (has its own PSH there) | Semi-finished (ext.) = manufactured at another plant (PSH at a different plant) | Semi-finished (no recipe) = categorized as semi but with no active PSH at any plant | Input = must arrive from outside via Location Source | Undetermined = could not be classified with the available information.';
  _TEXTS['Sí/No — ¿El componente está habilitado en Location Product para esta planta? Sin esto IBP no puede planificar su consumo aquí.'] = 'Yes/No — Is the component enabled in Location Product for this plant? Without this, IBP cannot plan its consumption here.';
  _TEXTS['Sí/No — ¿Hay arco de Location Source que traiga este insumo a esta planta? Muestra N/A para semielaborados (se producen localmente).'] = 'Yes/No — Is there a Location Source arc bringing this input to this plant? Shows N/A for semi-finished (produced locally).';
  _TEXTS['Código(s) de las ubicaciones de origen en Location Source para este componente en esta planta.'] = 'Code(s) of the source locations in Location Source for this component at this plant.';
  _TEXTS['Descripción(es) de las ubicaciones origen.'] = 'Description(s) of the source locations.';
  _TEXTS['Número de ubicaciones distintas que abastecen este componente a esta planta.'] = 'Number of distinct locations supplying this component to this plant.';
  _TEXTS['Códigos de todas las ubicaciones origen para este componente+planta.'] = 'Codes of all source locations for this component+plant.';
  _TEXTS['X = este componente puede sustituir a otro material alternativo. Vacío = componente principal sin sustitución configurada.'] = 'X = this component can substitute another alternative material. Empty = main component without configured substitution.';
  _TEXTS['Código del componente principal al que este material puede reemplazar (solo cuando ISALTITEM=X).'] = 'Code of the main component this material can replace (only when ISALTITEM=X).';

  // PA PSI — observaciones
  _TEXTS['Coeficiente = 0 o no definido'] = 'Coefficient = 0 or undefined';
  _TEXTS['El coeficiente de consumo del componente es cero o está vacío. IBP no planifica la compra de este insumo aunque esté en el BOM.'] = 'The component consumption coefficient is zero or empty. IBP does not plan the purchase of this input even if it is in the BOM.';
  _TEXTS['Revisar y corregir el COMPONENTCOEFFICIENT en el Production Source Item en IBP.'] = 'Review and fix the COMPONENTCOEFFICIENT in the Production Source Item in IBP.';
  _TEXTS['Semiterminado sin arco de transferencia hacia esta planta'] = 'Semi-finished without transfer arc to this plant';
  _TEXTS['El componente es un semiterminado categorizado como tal (MATTYPEID semi) con producción en otra planta, pero no existe ningún arco en Location Source que lo traslade a esta planta consumidora.'] = 'The component is a semi-finished categorized as such (semi MATTYPEID) with production at another plant, but there is no Location Source arc moving it to this consuming plant.';
  _TEXTS['Crear arco en Location Source con la planta productora del semiterminado como LOCFR y esta planta como LOCID para el componente indicado.'] = 'Create a Location Source arc with the semi-finished producing plant as LOCFR and this plant as LOCID for the indicated component.';
  _TEXTS['Insumo sin arco de abastecimiento en Location Source'] = 'Input without supply arc in Location Source';
  _TEXTS['El componente es un insumo externo (no semielaborado) pero no hay ningún arco en Location Source que lo traiga a esta planta.'] = 'The component is an external input (not semi-finished) but there is no Location Source arc bringing it to this plant.';
  _TEXTS['Crear arco en Location Source con el proveedor como LOCFR y esta planta como LOCID para el componente indicado.'] = 'Create a Location Source arc with the supplier as LOCFR and this plant as LOCID for the indicated component.';
  _TEXTS['Componente no habilitado en Location Product para esta planta'] = 'Component not enabled in Location Product for this plant';
  _TEXTS['El componente no está registrado en Location Product para la planta donde se consume. IBP no puede planificar su consumo aquí.'] = 'The component is not registered in Location Product for the plant where it is consumed. IBP cannot plan its consumption here.';
  _TEXTS['Habilitar la combinación componente+planta en Location Product en IBP.'] = 'Enable the component+plant combination in Location Product in IBP.';
  _TEXTS['SOURCEID no encontrado en PSH'] = 'SOURCEID not found in PSH';
  _TEXTS['El SOURCEID de este componente no existe en el Production Source Header descargado. Puede ser un dato huérfano o un filtro de datos que excluye el PSH padre.'] = 'The SOURCEID of this component does not exist in the downloaded Production Source Header. It may be orphan data or a data filter excluding the parent PSH.';
  _TEXTS['Verificar que el PSH del SOURCEID indicado exista y esté activo en IBP con el mismo Planning Area y Version.'] = 'Verify that the PSH of the indicated SOURCEID exists and is active in IBP with the same Planning Area and Version.';
  _TEXTS['Semiterminado sin receta de produccion (PSH) en ninguna planta'] = 'Semi-finished without production recipe (PSH) at any plant';
  _TEXTS['El componente está categorizado como semiterminado (MATTYPEID semi) pero no se encontró ningún Production Source Header activo para este material en ninguna planta del Planning Area y Version analizados.'] = 'The component is categorized as semi-finished (semi MATTYPEID) but no active Production Source Header was found for this material at any plant of the analyzed Planning Area and Version.';
  _TEXTS['Verificar que exista un PSH activo para este semiterminado en IBP con el Planning Area y Version correctos. Si el PSH está en otro Planning Area, revisar la configuración de la jerarquía de producción.'] = 'Verify that an active PSH exists for this semi-finished in IBP with the correct Planning Area and Version. If the PSH is in another Planning Area, review the production hierarchy configuration.';
  _TEXTS['Material de reemplazo sin registro en Item Sub'] = 'Alternative material without record in Item Sub';
  _TEXTS['El componente está marcado como ISALTITEM=X (sustituto) pero no tiene registro en Production Source Item Sub que lo vincule al material que reemplaza.'] = 'The component is marked as ISALTITEM=X (substitute) but has no record in Production Source Item Sub linking it to the material it replaces.';
  _TEXTS['Completar la configuración del sustituto en Production Source Item Sub en IBP.'] = 'Complete the substitute configuration in Production Source Item Sub in IBP.';
  _TEXTS['Componente de tipo excluido ([MATTYPE]) — validado en contexto'] = 'Component of excluded type ([MATTYPE]) — validated in context';
  _TEXTS['El componente pertenece a un tipo de material excluido del análisis principal. Se valida su coeficiente y cobertura de abastecimiento porque es ingrediente de un producto incluido.'] = 'The component belongs to a material type excluded from the main analysis. Its coefficient and supply coverage are validated because it is an ingredient of an included product.';
  _TEXTS['Si el insumo tiene brechas de cobertura, revisar en IBP aunque su tipo esté excluido del análisis general.'] = 'If the input has coverage gaps, review in IBP even if its type is excluded from the general analysis.';
  _TEXTS['Semielaborado: trazabilidad en PSH'] = 'Semi-finished: traceability in PSH';
  _TEXTS['El componente es un semiterminado que se fabrica en esta misma planta — se rastrea vía su propio PSH.'] = 'The component is a semi-finished manufactured at this same plant — it is tracked via its own PSH.';
  _TEXTS['Sin acción requerida. No requiere arco de Location Source porque se produce localmente.'] = 'No action required. It does not require a Location Source arc because it is produced locally.';
  _TEXTS['Semiterminado producido en otra planta: transferencia configurada'] = 'Semi-finished produced at another plant: transfer configured';
  _TEXTS['El componente es un semiterminado categorizado como tal (MATTYPEID semi) con producción en otra planta y con arco de Location Source configurado que lo traslada a esta planta consumidora.'] = 'The component is a semi-finished categorized as such (semi MATTYPEID) with production at another plant and a Location Source arc configured to move it to this consuming plant.';
  _TEXTS['Sin acción requerida. La transferencia está correctamente configurada.'] = 'No action required. The transfer is correctly configured.';
  _TEXTS['SOURCEID valido en PSH | Coeficiente definido | Con arco de abastecimiento en Location Source | Habilitado en Location Product'] = 'Valid SOURCEID in PSH | Coefficient defined | With supply arc in Location Source | Enabled in Location Product';
  _TEXTS['El componente está correctamente configurado.'] = 'The component is correctly configured.';

  // PA PSR
  _TEXTS['Una fila por cada asignación Recurso + Receta (RESID + SOURCEID) en Production Source Resource. Valida que el recurso asignado a una receta también tenga configuración de planta en Resource Location.'] = 'One row per Resource + Recipe assignment (RESID + SOURCEID) in Production Source Resource. Validates that the resource assigned to a recipe also has a plant configuration in Resource Location.';
  _TEXTS['Receta de producción a la que está asignado el recurso.'] = 'Production recipe to which the resource is assigned.';
  _TEXTS['Planta donde opera la receta.'] = 'Plant where the recipe operates.';
  _TEXTS['Recurso asignado a esta receta.'] = 'Resource assigned to this recipe.';
  _TEXTS['RESID+LOCID en Resource Location'] = 'RESID+LOCID in Resource Location';
  _TEXTS['Sí/No — ¿Esta combinación recurso+planta existe en Resource Location? Si No, hay inconsistencia: el recurso opera en una receta de esa planta pero no figura en el maestro de esa planta.'] = 'Yes/No — Does this resource+plant combination exist in Resource Location? If No, there is an inconsistency: the resource operates in a recipe at that plant but does not appear in that plant master.';
  _TEXTS['# Plantas con este recurso asignado'] = '# Plants with this resource assigned';
  _TEXTS['Plantas recurso (códigos)'] = 'Resource plants (codes)';
  _TEXTS['Códigos de las plantas donde este recurso tiene Resource Location configurado.'] = 'Codes of the plants where this resource has Resource Location configured.';
  _TEXTS['Recurso en producción sin asignación en Resource Location para planta X'] = 'Resource in production without assignment in Resource Location for plant X';
  _TEXTS['El recurso está asignado a una receta de la planta X pero no tiene Resource Location configurado para esa planta. IBP registra el uso del recurso en la receta pero no lo reconoce formalmente en ese sitio.'] = 'The resource is assigned to a recipe at plant X but has no Resource Location configured for that plant. IBP registers the resource use in the recipe but does not formally recognize it at that site.';
  _TEXTS['Agregar la combinación RESID+LOCID en Resource Location en IBP para formalizar la asignación del recurso a esa planta.'] = 'Add the RESID+LOCID combination in Resource Location in IBP to formalize the resource assignment to that plant.';
  _TEXTS['El SOURCEID del PSR no existe en el Production Source Header — dato huérfano.'] = 'The PSR SOURCEID does not exist in the Production Source Header — orphan data.';
  _TEXTS['Verificar que el PSH del SOURCEID exista y esté activo en IBP.'] = 'Verify that the PSH of the SOURCEID exists and is active in IBP.';
  _TEXTS['Recurso X asignado en Resource Location para planta Y | Asociado a SOURCEID Z'] = 'Resource X assigned in Resource Location for plant Y | Associated with SOURCEID Z';
  _TEXTS['La asignación recurso+planta es consistente entre PSR y Resource Location.'] = 'The resource+plant assignment is consistent between PSR and Resource Location.';

  // PA Tipos Excluidos
  _TEXTS['Solo aparece si el usuario excluyó algún tipo de material antes de ejecutar el análisis. Una fila por cada MATTYPEID excluido. Aunque un tipo esté excluido del análisis principal, sus productos siguen siendo validados <em>en contexto</em> si aparecen como componentes en el BOM de productos incluidos.'] = 'Only appears if the user excluded some material type before running the analysis. One row per excluded MATTYPEID. Even if a type is excluded from the main analysis, its products continue to be validated <em>in context</em> if they appear as components in the BOM of included products.';
  _TEXTS['Código del tipo de material excluido.'] = 'Code of the excluded material type.';
  _TEXTS['# Productos'] = '# Products';
  _TEXTS['Cuántos productos del maestro tienen este tipo.'] = 'How many products in the master have this type.';
  _TEXTS['Aparece como componente PSI en # SOURCEIDs'] = 'Appears as PSI component in # SOURCEIDs';
  _TEXTS['Cuántas recetas distintas usan productos de este tipo como ingrediente. Aunque el tipo esté excluido, se valida su configuración de abastecimiento cuando es componente.'] = 'How many distinct recipes use products of this type as an ingredient. Even if the type is excluded, its supply configuration is validated when it is a component.';
  _TEXTS['SOURCEIDs donde es componente (códigos)'] = 'SOURCEIDs where it is a component (codes)';
  _TEXTS['Códigos de las recetas que usan productos de este tipo como componente PSI.'] = 'Codes of the recipes that use products of this type as a PSI component.';
  _TEXTS['Componentes con cobertura LocSrc'] = 'Components with LocSrc coverage';
  _TEXTS['Cuántas combinaciones componente+planta (de este tipo excluido) SÍ tienen arco de Location Source configurado.'] = 'How many component+plant combinations (of this excluded type) DO have a Location Source arc configured.';
  _TEXTS['Componentes sin cobertura LocSrc'] = 'Components without LocSrc coverage';
  _TEXTS['Cuántas combinaciones componente+planta (de este tipo excluido) NO tienen arco de Location Source. Si > 0, hay insumos sin ruta de llegada a la planta que los consume.'] = 'How many component+plant combinations (of this excluded type) DO NOT have a Location Source arc. If > 0, there are inputs without an arrival route to the plant consuming them.';
  _TEXTS['Observacion'] = 'Observation';
  _TEXTS['Texto descriptivo del estado: indica si el tipo aparece como componente y si hay brechas de abastecimiento.'] = 'Descriptive status text: indicates whether the type appears as a component and whether there are supply gaps.';
  _TEXTS['Excluido del análisis principal. Validado como componente en N fuente(s) de producción.'] = 'Excluded from the main analysis. Validated as a component in N production source(s).';
  _TEXTS['El tipo de material está excluido del análisis principal pero sus productos aparecen como componentes PSI en N recetas distintas de productos incluidos. Se validan en contexto.'] = 'The material type is excluded from the main analysis but its products appear as PSI components in N distinct recipes of included products. They are validated in context.';
  _TEXTS['Sin acción requerida si la exclusión es intencional. Revisar las columnas de cobertura LocSrc para confirmar que los componentes tienen arcos de abastecimiento configurados.'] = 'No action required if the exclusion is intentional. Review the LocSrc coverage columns to confirm the components have supply arcs configured.';
  _TEXTS['Excluido del análisis principal. No aparece como componente en ninguna fuente de producción.'] = 'Excluded from the main analysis. Does not appear as a component in any production source.';
  _TEXTS['El tipo está excluido y ninguno de sus productos aparece como componente PSI de productos incluidos. No participa activamente en el análisis.'] = 'The type is excluded and none of its products appears as a PSI component of included products. It does not actively participate in the analysis.';
  _TEXTS['Sin acción requerida. La fila se incluye como registro de la exclusión y su impacto nulo en otros BOMs.'] = 'No action required. The row is included as a record of the exclusion and its null impact on other BOMs.';
  _TEXTS['⚠ N combinación(es) componente-planta sin arco de abastecimiento.'] = '⚠ N component-plant combination(s) without supply arc.';
  _TEXTS['Sufijo que se concatena a la observación cuando existen productos del tipo excluido que actúan como componentes y no tienen arco de Location Source hacia la planta donde se consumen.'] = 'Suffix concatenated to the observation when there are products of the excluded type acting as components without a Location Source arc to the plant where they are consumed.';
  _TEXTS['Configurar el arco de Location Source para las combinaciones componente+planta sin cobertura, o revisar si la exclusión del tipo es realmente apropiada.'] = 'Configure the Location Source arc for the component+plant combinations without coverage, or review whether the type exclusion is really appropriate.';
  _TEXTS['Un tipo excluido que actúa como componente PSI de productos incluidos se valida igualmente. La exclusión solo omite el análisis principal de los productos de ese tipo, no su validación como ingrediente en otros BOMs.'] = 'An excluded type acting as a PSI component of included products is validated anyway. Exclusion only skips the main analysis of products of that type, not their validation as an ingredient in other BOMs.';

  // PA Tipos de Material - cards content
  _TEXTS['Producto fabricado internamente. Requiere configuración completa para planificación de producción y distribución.'] = 'Product manufactured internally. Requires complete configuration for production and distribution planning.';
  _TEXTS['Requiere BOM completo (PSH + PSI + PSR)'] = 'Requires complete BOM (PSH + PSI + PSR)';
  _TEXTS['PLEADTIME ausente o cero → ⛔ Alerta'] = 'PLEADTIME missing or zero → ⛔ Alert';
  _TEXTS['OUTPUTCOEFFICIENT ausente o cero → ⛔ Alerta'] = 'OUTPUTCOEFFICIENT missing or zero → ⛔ Alert';
  _TEXTS['Sin Location Product → ⛔ Alerta'] = 'No Location Product → ⛔ Alert';
  _TEXTS['Planta productora no es origen en Location Source → ⛔ Alerta'] = 'Producing plant is not a source in Location Source → ⛔ Alert';
  _TEXTS['Componente fabricado internamente que alimenta otro proceso. No llega directamente al cliente.'] = 'Component manufactured internally that feeds another process. Does not reach the customer directly.';
  _TEXTS['Requiere BOM (PSH + PSI + PSR)'] = 'Requires BOM (PSH + PSI + PSR)';
  _TEXTS['PLEADTIME ausente o cero → ⚠ Advertencia (no ⛔)'] = 'PLEADTIME missing or zero → ⚠ Warning (not ⛔)';
  _TEXTS['Consume en planta productora → ✅ OK (sin transferencia requerida)'] = 'Consumed at producing plant → ✅ OK (no transfer required)';
  _TEXTS['Transfiere sin consumo en destino → ⛔ Alerta'] = 'Transferred without consumption at destination → ⛔ Alert';
  _TEXTS['No aplica detección de Ghost Nodes ni Dead-ends (no necesita llegar a cliente)'] = 'Ghost Node and Dead-end detection does not apply (does not need to reach the customer)';
  _TEXTS['Ítem adquirido externamente. No se fabrica ni transforma internamente.'] = 'Item acquired externally. It is not manufactured nor transformed internally.';
  _TEXTS['No requiere PSH, PSI ni PSR'] = 'Does not require PSH, PSI or PSR';
  _TEXTS['Debe tener arco de proveedor en Location Source → si falta = ⛔ Alerta'] = 'Must have a supplier arc in Location Source → if missing = ⛔ Alert';
  _TEXTS['No se evalúa PLEADTIME ni ruta a cliente'] = 'PLEADTIME and route to customer are not evaluated';
  _TEXTS['Tener PSH es inusual → ⚠ Advertencia de categorización'] = 'Having PSH is unusual → ⚠ Categorization warning';
  _TEXTS['Producto comprado y revendido sin transformación interna.'] = 'Product purchased and resold without internal transformation.';
  _TEXTS['Debe tener Location Source y Customer Source → sin ninguno = ⚠ Advertencia'] = 'Must have Location Source and Customer Source → with neither = ⚠ Warning';
  _TEXTS['PLEADTIME no se evalúa'] = 'PLEADTIME is not evaluated';
  _TEXTS['<strong>Multi-categoría:</strong> Un MATTYPEID puede pertenecer a más de una categoría. En ese caso, se aplica la regla más permisiva: si Terminado pide ⛔ y Semiterminado pide ⚠, el resultado es ⚠.'] = '<strong>Multi-category:</strong> A MATTYPEID can belong to more than one category. In that case, the most permissive rule is applied: if Finished requires ⛔ and Semi-finished requires ⚠, the result is ⚠.';

  // SN Product — columnas identificación / presencia
  _TEXTS['⛔ / ⚠ / ✅ según el hallazgo más grave encontrado.'] = '⛔ / ⚠ / ✅ depending on the most severe finding.';
  _TEXTS['Detalle de todos los hallazgos o, si está OK, descripción de qué validaciones pasaron.'] = 'Detail of all findings or, if OK, description of which validations passed.';
  _TEXTS['Tipo de material SAP. Determina qué reglas de análisis se aplican.'] = 'SAP material type. Determines which analysis rules are applied.';
  _TEXTS['En PSH?'] = 'In PSH?';
  _TEXTS['En PSI?'] = 'In PSI?';
  _TEXTS['En Location Source?'] = 'In Location Source?';
  _TEXTS['En Customer Source?'] = 'In Customer Source?';
  _TEXTS['En Location Product?'] = 'In Location Product?';
  _TEXTS['En Customer Product?'] = 'In Customer Product?';
  _TEXTS['Solo en maestro?'] = 'Only in master?';
  _TEXTS['¿El producto tiene al menos una fuente de producción (PSH)?'] = 'Does the product have at least one production source (PSH)?';
  _TEXTS['¿El producto aparece como componente en alguna receta?'] = 'Does the product appear as a component in any recipe?';
  _TEXTS['¿Tiene arcos de transferencia entre ubicaciones?'] = 'Does it have transfer arcs between locations?';
  _TEXTS['¿Tiene arcos de entrega a algún cliente?'] = 'Does it have delivery arcs to any customer?';
  _TEXTS['¿Está habilitado en Location Product en al menos una ubicación?'] = 'Is it enabled in Location Product in at least one location?';
  _TEXTS['¿Está habilitado en Customer Product para algún cliente?'] = 'Is it enabled in Customer Product for any customer?';
  _TEXTS['Sí = el producto solo existe en el maestro de materiales sin ninguna actividad en la red. Indica producto huérfano.'] = 'Yes = the product only exists in the material master with no network activity. Indicates an orphan product.';

  // SN Product — análisis de red
  _TEXTS['Clasificación sintética de la situación logística del producto. Ver tabla de estados más abajo.'] = 'Synthetic classification of the product logistics situation. See states table below.';
  _TEXTS['# Plantas'] = '# Plants';
  _TEXTS['# DCs'] = '# DCs';
  _TEXTS['# Clientes'] = '# Customers';
  _TEXTS['# Rutas completas'] = '# Complete routes';
  _TEXTS['Ruta mas larga'] = 'Longest route';
  _TEXTS['# Ghost Nodes'] = '# Ghost Nodes';
  _TEXTS['# Dead Ends'] = '# Dead Ends';
  _TEXTS['Health Score'] = 'Health Score';
  _TEXTS['Categoria de salud'] = 'Health category';
  _TEXTS['Detalle Calculo Health Score'] = 'Health Score calculation detail';
  _TEXTS['# Origenes (LOCFR)'] = '# Sources (LOCFR)';
  _TEXTS['Origenes (codigos)'] = 'Sources (codes)';
  _TEXTS['# Destinos (LOCID)'] = '# Destinations (LOCID)';
  _TEXTS['Destinos (codigos)'] = 'Destinations (codes)';
  _TEXTS['# Clientes en CustSrc'] = '# Customers in CustSrc';
  _TEXTS['Clientes (codigos)'] = 'Customers (codes)';
  _TEXTS['Multi-sourced?'] = 'Multi-sourced?';
  _TEXTS['TLT promedio (dias)'] = 'Average TLT (days)';
  _TEXTS['CLT promedio (dias)'] = 'Average CLT (days)';
  _TEXTS['# Plantas aisladas'] = '# Isolated plants';
  _TEXTS['Número de plantas que producen este producto (tienen PSH).'] = 'Number of plants that produce this product (have PSH).';
  _TEXTS['Número de centros de distribución o nodos intermedios que manejan este producto en Location Source sin ser plantas productoras.'] = 'Number of distribution centers or intermediate nodes that handle this product in Location Source without being producing plants.';
  _TEXTS['Número de clientes que reciben este producto vía Customer Source.'] = 'Number of customers that receive this product via Customer Source.';
  _TEXTS['Cantidad de rutas planta-a-cliente encontradas. 0 = el producto no llega a ningún cliente.'] = 'Number of plant-to-customer routes found. 0 = the product does not reach any customer.';
  _TEXTS['Número de saltos de la ruta más larga encontrada (planta → DC → ... → cliente).'] = 'Number of hops of the longest route found (plant → DC → ... → customer).';
  _TEXTS['Ubicaciones intermedias que reciben el producto pero cuyas salidas no llegan a ningún cliente.'] = 'Intermediate locations that receive the product but whose outputs do not reach any customer.';
  _TEXTS['Ubicaciones que reciben el producto pero no tienen ninguna salida configurada.'] = 'Locations that receive the product but have no configured output.';
  _TEXTS['Puntaje 0-100 que mide la salud de la configuración de red del producto. Ver sección Health Score más abajo.'] = 'Score 0-100 measuring the health of the product network configuration. See Health Score section below.';
  _TEXTS['Healthy = Health Score ≥ 80 | Acceptable = ≥ 60 | Weak = ≥ 40 | Critical = < 40.'] = 'Healthy = Health Score ≥ 80 | Acceptable = ≥ 60 | Weak = ≥ 40 | Critical = < 40.';
  _TEXTS['Desglose paso a paso: bonificaciones (+) por rutas completas, multi-sourcing, múltiples clientes y lead times; penalizaciones (-) por Ghost Nodes, Dead-ends, rutas únicas y fuente única de producción.'] = 'Step-by-step breakdown: bonuses (+) for complete routes, multi-sourcing, multiple customers and lead times; penalties (-) for Ghost Nodes, Dead-ends, unique routes and single production source.';
  _TEXTS['Número de ubicaciones de origen distintas que envían este producto en Location Source.'] = 'Number of distinct source locations that send this product in Location Source.';
  _TEXTS['Número de ubicaciones de destino distintas que reciben este producto vía Location Source.'] = 'Number of distinct destination locations that receive this product via Location Source.';
  _TEXTS['Códigos de las ubicaciones destino.'] = 'Codes of the destination locations.';
  _TEXTS['Número de clientes configurados en Customer Source para este producto.'] = 'Number of customers configured in Customer Source for this product.';
  _TEXTS['Códigos de los clientes configurados en Customer Source.'] = 'Codes of the customers configured in Customer Source.';
  _TEXTS['Sí/No — alguna ubicación destino recibe este producto desde más de un origen simultáneamente.'] = 'Yes/No — some destination location receives this product from more than one source simultaneously.';
  _TEXTS['Promedio de TLEADTIME de todos los arcos de Location Source. "—" si no hay arcos.'] = 'Average TLEADTIME across all Location Source arcs. "—" if there are no arcs.';
  _TEXTS['Promedio de CLEADTIME de todos los arcos de Customer Source. "—" si no hay arcos.'] = 'Average CLEADTIME across all Customer Source arcs. "—" if there are no arcs.';
  _TEXTS['Plantas que producen el producto pero no tienen ninguna ruta hasta algún cliente.'] = 'Plants that produce the product but have no route to any customer.';
  _TEXTS['<strong>Valor N/A:</strong> Cuando una métrica no aplica o no tiene datos (ej: TLT promedio para un producto sin Location Source), la celda muestra "—" con fondo gris claro en itálica. No indica un error sino ausencia de dato para ese campo.'] = '<strong>N/A value:</strong> When a metric does not apply or has no data (e.g. average TLT for a product without Location Source), the cell shows "—" with a light gray background in italics. It does not indicate an error but the absence of data for that field.';

  // SN Health Score — formula intro
  _TEXTS['El puntaje se calcula de forma diferente según la categoría del producto, porque las expectativas de red son distintas para cada tipo:'] = 'The score is calculated differently depending on the product category, because network expectations differ for each type:';
  _TEXTS['Categoría'] = 'Category';
  _TEXTS['Bonificaciones'] = 'Bonuses';
  _TEXTS['Penalizaciones'] = 'Penalties';
  _TEXTS['Terminado / Sin cat.'] = 'Finished / Uncat.';
  _TEXTS['+50 si hay rutas completas; +15 si múltiples clientes; +15 si múltiples rutas; +20 si múltiples plantas.'] = '+50 if there are complete routes; +15 if multiple customers; +15 if multiple routes; +20 if multiple plants.';
  _TEXTS['-20 por ghost nodes; -15 por dead-ends; -20 por clientes con ruta única; -15 por fuente única de producción.'] = '-20 for ghost nodes; -15 for dead-ends; -20 for customers with a single route; -15 for single production source.';
  _TEXTS['+30 si tiene PSH; +40 si tiene consumo PSI; +20 si múltiples plantas; +10 si tiene Location Source.'] = '+30 if it has PSH; +40 if it has PSI consumption; +20 if multiple plants; +10 if it has Location Source.';
  _TEXTS['Sin penalizaciones.'] = 'No penalties.';
  _TEXTS['+60 si tiene Location Source; +20 si tiene al menos un destino intermedio (DC) en Location Source; +20 si tiene Customer Source.'] = '+60 if it has Location Source; +20 if it has at least one intermediate destination (DC) in Location Source; +20 if it has Customer Source.';
  _TEXTS['+40 si tiene Location Source; +40 si tiene Customer Source; +20 si múltiples clientes.'] = '+40 if it has Location Source; +40 if it has Customer Source; +20 if multiple customers.';

  // SN Product — Estados de la Red (descripciones)
  _TEXTS['El producto tiene al menos una ruta completa desde una planta productora hasta un cliente. Configuración correcta.'] = 'The product has at least one complete route from a producing plant to a customer. Correct configuration.';
  _TEXTS['El producto tiene producción (PSH) y arcos de distribución (Location Source) pero ninguno llega hasta un Customer Source — no se entrega a ningún cliente.'] = 'The product has production (PSH) and distribution arcs (Location Source) but none reaches a Customer Source — it is not delivered to any customer.';
  _TEXTS['El producto tiene producción (PSH) pero no hay arcos de distribución (Location Source) desde la planta. Sale de la planta sin ruta configurada.'] = 'The product has production (PSH) but there are no distribution arcs (Location Source) from the plant. It leaves the plant without a configured route.';
  _TEXTS['El producto tiene Customer Source configurado pero no existe ninguna ruta completa que conecte la producción con esa entrega al cliente.'] = 'The product has Customer Source configured but no complete route exists connecting production with that customer delivery.';
  _TEXTS['El producto tiene Customer Source (entrega a cliente) pero no tiene Location Source (distribución). Sin origen declarado en la red.'] = 'The product has Customer Source (customer delivery) but no Location Source (distribution). No declared source in the network.';
  _TEXTS['El producto tiene Location Source pero no tiene Customer Source — nunca llega a ningún cliente desde la red declarada.'] = 'The product has Location Source but no Customer Source — it never reaches any customer from the declared network.';
  _TEXTS['El producto sin categoría tiene Location Source pero no tiene Customer Source ni PSH. Sin categoría definida, la ausencia de entrega a cliente se considera un error.'] = 'The uncategorized product has Location Source but no Customer Source or PSH. Without a defined category, the absence of customer delivery is considered an error.';
  _TEXTS['Mercadería con arcos de distribución (LS) y entrega (CS) correctamente configurados.'] = 'Trading product with distribution (LS) and delivery (CS) arcs correctly configured.';
  _TEXTS['El producto sin categoría tiene arcos de distribución y entrega pero no tiene PSH. Sin categoría definida, la ausencia de producción se considera un error.'] = 'The uncategorized product has distribution and delivery arcs but no PSH. Without a defined category, the absence of production is considered an error.';
  _TEXTS['El semiterminado se produce y consume en la misma planta. No requiere transferencia.'] = 'The semi-finished is produced and consumed at the same plant. No transfer required.';
  _TEXTS['El semiterminado se produce en una planta y se consume como PSI en la planta destino de la transferencia.'] = 'The semi-finished is produced at one plant and consumed as PSI at the transfer destination plant.';
  _TEXTS['El semiterminado se consume en la planta productora Y también se transfiere a otra planta donde también se consume.'] = 'The semi-finished is consumed at the producing plant AND also transferred to another plant where it is also consumed.';
  _TEXTS['El semiterminado tiene PSH en una planta distinta a donde es consumido, pero no tiene arco de Location Source hacia la planta consumidora.'] = 'The semi-finished has PSH at a plant different from where it is consumed, but has no Location Source arc to the consuming plant.';
  _TEXTS['El producto no tiene Production Source Header — no tiene fuente de producción configurada. Para semiterminado: no se está fabricando internamente. Para terminado: está categorizado como producto final pero tiene arcos de red sin receta de producción.'] = 'The product has no Production Source Header — no production source configured. For semi-finished: it is not being manufactured internally. For finished: it is categorized as a final product but has network arcs without a production recipe.';
  _TEXTS['El semiterminado tiene producción pero no aparece como componente en ningún BOM.'] = 'The semi-finished has production but does not appear as a component in any BOM.';
  _TEXTS['El insumo tiene arcos de Location Source que llegan hasta al menos una planta productora.'] = 'The input has Location Source arcs that reach at least one producing plant.';
  _TEXTS['El insumo tiene Location Source pero ningún arco llega hasta una planta productora — posible configuración incompleta.'] = 'The input has Location Source but no arc reaches a producing plant — possible incomplete configuration.';
  _TEXTS['El insumo tiene Location Source pero no aparece en ningún BOM como componente — arco de abastecimiento sin uso productivo declarado.'] = 'The input has Location Source but does not appear in any BOM as a component — supply arc without declared productive use.';
  _TEXTS['El insumo no tiene ningún arco en Location Source — no tiene origen declarado en la red.'] = 'The input has no Location Source arc — no declared source in the network.';
  _TEXTS['El producto no tiene ningún arco en Location Source ni Customer Source — completamente desconectado de la red.'] = 'The product has no arc in Location Source or Customer Source — completely disconnected from the network.';
  _TEXTS['La mercadería no tiene ningún arco en Location Source ni Customer Source — completamente desconectada de la red.'] = 'The trading product has no arc in Location Source or Customer Source — completely disconnected from the network.';
  _TEXTS['El producto solo existe en el maestro de materiales sin ninguna actividad en la red (no está en PSH, PSI, Location Source, Customer Source ni Location Product).'] = 'The product only exists in the material master with no network activity (not in PSH, PSI, Location Source, Customer Source or Location Product).';
  _TEXTS['<strong>Estados de la Red en la columna Observacion:</strong> Cuando el Estado de la Red no es el estado OK de la categoría del producto, su texto exacto aparece también como primera observación en la columna Observacion. Los estados OK por categoría son: <em>Terminado / Sin cat.</em> = "Red Completa"; <em>Mercadería</em> = "Solo Distribución + Entrega"; <em>Mat. Prima</em> = "Abastecimiento Completo"; <em>Semiterminado</em> = cualquiera de los tres estados "Semiterminado...". Todos los demás estados indican un problema y aparecen en Observacion con el mismo texto.'] = '<strong>Network States in the Observation column:</strong> When the Network State is not the OK state for the product category, its exact text also appears as the first observation in the Observation column. The OK states by category are: <em>Finished / Uncat.</em> = "Complete Network"; <em>Trading</em> = "Distribution + Delivery only"; <em>Raw Material</em> = "Complete Supply"; <em>Semi-finished</em> = any of the three "Semi-finished..." states. All other states indicate a problem and appear in Observation with the same text.';

  // SN Product — observaciones (cause/action)
  _TEXTS['El producto tiene PSH y Location Source pero ningún arco llega hasta un cliente. El Estado de la Red es "Sin Entrega a Cliente" y ese texto aparece en Observacion.'] = 'The product has PSH and Location Source but no arc reaches a customer. The Network State is "No Customer Delivery" and that text appears in Observation.';
  _TEXTS['Verificar que exista al menos un arco de Customer Source para este producto, o que la red de Location Source conecte la producción con alguna ubicación que tenga Customer Source.'] = 'Verify that at least one Customer Source arc exists for this product, or that the Location Source network connects production with some location that has Customer Source.';
  _TEXTS['El producto tiene PSH pero no tiene arcos de Location Source saliendo de la planta. El Estado de la Red es "Sin Distribución" y ese texto aparece en Observacion.'] = 'The product has PSH but no Location Source arcs leaving the plant. The Network State is "No Distribution" and that text appears in Observation.';
  _TEXTS['Crear al menos un arco en Location Source con la planta productora como LOCFR.'] = 'Create at least one Location Source arc with the producing plant as LOCFR.';
  _TEXTS['El producto tiene Customer Source pero no existe ninguna ruta completa de producción que llegue hasta él. Aparece textualmente en Observacion.'] = 'The product has Customer Source but no complete production route reaches it. Appears verbatim in Observation.';
  _TEXTS['Revisar los arcos de Location Source e identificar el nodo desconectado que impide que la producción llegue hasta el arco de entrega al cliente.'] = 'Review the Location Source arcs and identify the disconnected node preventing production from reaching the customer delivery arc.';
  _TEXTS['El producto tiene Customer Source pero no tiene Location Source. Aparece textualmente en Observacion.'] = 'The product has Customer Source but no Location Source. Appears verbatim in Observation.';
  _TEXTS['Configurar los arcos de Location Source que lleven el producto desde su origen hasta la ubicación de entrega al cliente.'] = 'Configure the Location Source arcs that bring the product from its source to the customer delivery location.';
  _TEXTS['El producto tiene Location Source pero no tiene Customer Source. Aparece textualmente en Observacion.'] = 'The product has Location Source but no Customer Source. Appears verbatim in Observation.';
  _TEXTS['Configurar los arcos de Customer Source para que el producto llegue a algún cliente.'] = 'Configure the Customer Source arcs so the product reaches some customer.';
  _TEXTS['El producto sin categoría tiene Location Source pero no tiene Customer Source ni PSH. Aparece textualmente en Observacion.'] = 'The uncategorized product has Location Source but no Customer Source or PSH. Appears verbatim in Observation.';
  _TEXTS['Asignar una categoría al tipo de material en la configuración, o configurar los arcos de Customer Source y Production Source Header que correspondan.'] = 'Assign a category to the material type in the configuration, or configure the corresponding Customer Source and Production Source Header arcs.';
  _TEXTS['El producto sin categoría tiene arcos de distribución (LS) y entrega (CS) pero no tiene PSH. Aparece textualmente en Observacion.'] = 'The uncategorized product has distribution (LS) and delivery (CS) arcs but no PSH. Appears verbatim in Observation.';
  _TEXTS['Asignar la categoría correcta al tipo de material. Si es Mercadería, reclasificarlo como trading en la configuración de tipos de material.'] = 'Assign the correct category to the material type. If it is Trading, reclassify it as trading in the material types configuration.';
  _TEXTS['El producto no tiene ningún arco en Location Source ni Customer Source. Aparece textualmente en Observacion.'] = 'The product has no arc in Location Source or Customer Source. Appears verbatim in Observation.';
  _TEXTS['Revisar si el producto está activo en IBP. Configurar al menos un arco en Location Source o Customer Source según corresponda a su rol en la cadena.'] = 'Check whether the product is active in IBP. Configure at least one arc in Location Source or Customer Source according to its role in the chain.';
  _TEXTS['La mercadería no tiene ningún arco en Location Source ni Customer Source. Aparece textualmente en Observacion.'] = 'The trading product has no arc in Location Source or Customer Source. Appears verbatim in Observation.';
  _TEXTS['Revisar si el producto está activo en IBP. Configurar al menos un arco en Location Source o Customer Source según el rol de distribución esperado.'] = 'Check whether the product is active in IBP. Configure at least one arc in Location Source or Customer Source according to the expected distribution role.';
  _TEXTS['El semiterminado se produce en una planta distinta a donde es consumido, pero no tiene arco de Location Source hacia la planta consumidora. Aparece textualmente en Observacion.'] = 'The semi-finished is produced at a plant different from where it is consumed, but has no Location Source arc to the consuming plant. Appears verbatim in Observation.';
  _TEXTS['Configurar el arco de Location Source desde la planta productora del semiterminado hacia la planta donde es consumido como componente.'] = 'Configure the Location Source arc from the semi-finished producing plant to the plant where it is consumed as a component.';
  _TEXTS['El producto no tiene PSH. Para semiterminado: no está fabricándose internamente. Para terminado: tiene arcos de red pero no tiene receta de producción configurada. Aparece textualmente en Observacion.'] = 'The product has no PSH. For semi-finished: it is not being manufactured internally. For finished: it has network arcs but no configured production recipe. Appears verbatim in Observation.';
  _TEXTS['Crear la fuente de producción (PSH con SOURCETYPE=P) en IBP, o verificar si el producto debe reclasificarse como Mercadería en la configuración de tipos de material.'] = 'Create the production source (PSH with SOURCETYPE=P) in IBP, or check whether the product should be reclassified as Trading in the material types configuration.';
  _TEXTS['El semiterminado tiene PSH pero no aparece como componente en ningún BOM. Aparece textualmente en Observacion.'] = 'The semi-finished has PSH but does not appear as a component in any BOM. Appears verbatim in Observation.';
  _TEXTS['Agregar este semiterminado como componente (PSI) en el BOM del producto terminado que lo consume.'] = 'Add this semi-finished as a component (PSI) in the BOM of the finished product that consumes it.';
  _TEXTS['El insumo no tiene ningún arco en Location Source. Aparece textualmente en Observacion.'] = 'The input has no Location Source arc. Appears verbatim in Observation.';
  _TEXTS['Configurar el arco de Location Source con el proveedor o planta origen como LOCFR hacia las plantas consumidoras.'] = 'Configure the Location Source arc with the supplier or source plant as LOCFR to the consuming plants.';
  _TEXTS['El insumo tiene Location Source pero ningún arco llega hasta una planta productora. Aparece textualmente en Observacion.'] = 'The input has Location Source but no arc reaches a producing plant. Appears verbatim in Observation.';
  _TEXTS['Revisar si falta el arco final en Location Source que conecte el origen con la planta donde se consume el insumo.'] = 'Check if the final Location Source arc connecting the source with the plant consuming the input is missing.';
  _TEXTS['El insumo tiene Location Source pero no aparece en ningún BOM. Aparece textualmente en Observacion.'] = 'The input has Location Source but does not appear in any BOM. Appears verbatim in Observation.';
  _TEXTS['Verificar si el insumo está vigente y si debe ser agregado como componente PSI en alguna receta de producción.'] = 'Verify whether the input is active and whether it should be added as a PSI component in some production recipe.';
  _TEXTS['El producto solo existe en el maestro de materiales — no tiene ninguna actividad en la red. Aparece textualmente en Observacion.'] = 'The product only exists in the material master — has no network activity. Appears verbatim in Observation.';
  _TEXTS['Verificar si el producto es obsoleto o si falta configurar su participación en la red (PSH, Location Source, Customer Source o Location Product).'] = 'Check whether the product is obsolete or if its network participation is missing (PSH, Location Source, Customer Source or Location Product).';
  _TEXTS['Ghost node: X'] = 'Ghost node: X';
  _TEXTS['La ubicación X recibe el producto pero todas sus salidas terminan en un callejón sin salida — no llega a ningún cliente.'] = 'Location X receives the product but all its outputs end in a dead-end — it does not reach any customer.';
  _TEXTS['Revisar la configuración de arcos salientes de la ubicación X en Location Source. Puede faltar un arco hacia el siguiente nodo o hacia un Customer Source.'] = 'Review the outbound arc configuration of location X in Location Source. An arc to the next node or to a Customer Source may be missing.';
  _TEXTS['Dead-end: X'] = 'Dead-end: X';
  _TEXTS['La ubicación X recibe el producto por Location Source pero no tiene ninguna salida configurada — el producto llega y no puede continuar.'] = 'Location X receives the product via Location Source but has no configured output — the product arrives and cannot continue.';
  _TEXTS['Agregar el arco de salida faltante en Location Source o en Customer Source desde la ubicación X, o verificar si ese nodo es el destino final (y entonces falta un Customer Source).'] = 'Add the missing outbound arc in Location Source or Customer Source from location X, or check whether that node is the final destination (in which case a Customer Source is missing).';
  _TEXTS['Planta aislada: X'] = 'Isolated plant: X';
  _TEXTS['La planta X produce este producto pero no tiene ninguna ruta que llegue a algún cliente — producción sin mercado alcanzable.'] = 'Plant X produces this product but has no route reaching any customer — production with no reachable market.';
  _TEXTS['Revisar arcos de distribución desde la planta X en Location Source. Puede faltar el arco inicial desde la planta hacia el primer nodo de distribución.'] = 'Review distribution arcs from plant X in Location Source. The initial arc from the plant to the first distribution node may be missing.';
  _TEXTS['Ciclo: X → Y → Z → X'] = 'Cycle: X → Y → Z → X';
  _TEXTS['Se detectó un ciclo en la red: el producto puede circular indefinidamente entre estas ubicaciones sin llegar a ningún cliente.'] = 'A cycle was detected in the network: the product can circulate indefinitely between these locations without reaching any customer.';
  _TEXTS['Revisar los arcos de Location Source entre las ubicaciones del ciclo e identificar cuál está configurado en sentido incorrecto.'] = 'Review the Location Source arcs among the cycle locations and identify which is configured in the wrong direction.';
  _TEXTS['PLEADTIME faltante: X'] = 'PLEADTIME missing: X';
  _TEXTS['La planta X produce este producto pero su PLEADTIME es 0 o está vacío. IBP planifica producción instantánea.'] = 'Plant X produces this product but its PLEADTIME is 0 or empty. IBP plans instantaneous production.';
  _TEXTS['Ingresar el PLEADTIME real en días en el Production Source Header para la planta X y este producto.'] = 'Enter the real PLEADTIME in days in the Production Source Header for plant X and this product.';
  _TEXTS['TLEADTIME faltante: X→Y'] = 'TLEADTIME missing: X→Y';
  _TEXTS['El arco de transferencia X→Y tiene TLEADTIME = 0 o vacío. IBP planifica transferencias instantáneas en ese tramo.'] = 'The transfer arc X→Y has TLEADTIME = 0 or empty. IBP plans instantaneous transfers on that leg.';
  _TEXTS['Ingresar el TLEADTIME real en días en el arco de Location Source X→Y para este producto.'] = 'Enter the real TLEADTIME in days in the Location Source arc X→Y for this product.';
  _TEXTS['CLEADTIME faltante: X→Y'] = 'CLEADTIME missing: X→Y';
  _TEXTS['El arco de entrega X→Y (hacia cliente) tiene CLEADTIME = 0 o vacío. IBP planifica entregas instantáneas en ese tramo.'] = 'The delivery arc X→Y (to customer) has CLEADTIME = 0 or empty. IBP plans instantaneous deliveries on that leg.';
  _TEXTS['Ingresar el CLEADTIME real en días en el arco de Customer Source X→Y para este producto.'] = 'Enter the real CLEADTIME in days in the Customer Source arc X→Y for this product.';
  _TEXTS['Sin Location Product'] = 'No Location Product';
  _TEXTS['El producto está en PSH o en Location Source pero no está habilitado en Location Product en alguna ubicación de la red.'] = 'The product is in PSH or in Location Source but is not enabled in Location Product at some network location.';
  _TEXTS['Habilitar el producto en Location Product para las ubicaciones donde participa activamente en la red.'] = 'Enable the product in Location Product for the locations where it actively participates in the network.';
  _TEXTS['Sin Customer Product'] = 'No Customer Product';
  _TEXTS['El producto tiene Customer Source (entrega a cliente) pero no está habilitado en Customer Product para ese cliente.'] = 'The product has Customer Source (customer delivery) but is not enabled in Customer Product for that customer.';
  _TEXTS['Habilitar la combinación producto+cliente en Customer Product en IBP.'] = 'Enable the product+customer combination in Customer Product in IBP.';
  _TEXTS['Red desconectada: arcos LS y CS no comparten ubicaciones'] = 'Disconnected network: LS and CS arcs do not share locations';
  _TEXTS['Los arcos de distribución (Location Source) y los arcos de entrega (Customer Source) no tienen ninguna ubicación en común — la red está partida en dos fragmentos desconectados.'] = 'Distribution arcs (Location Source) and delivery arcs (Customer Source) have no location in common — the network is split into two disconnected fragments.';
  _TEXTS['Revisar que al menos una ubicación aparezca tanto en Location Source (como destino) como en Customer Source (como origen de entrega).'] = 'Verify that at least one location appears both in Location Source (as destination) and in Customer Source (as delivery source).';
  _TEXTS['Destino(s) de transferencia sin consumo PSI: X, Y'] = 'Transfer destination(s) without PSI consumption: X, Y';
  _TEXTS['El semiterminado se transfiere a las ubicaciones X, Y pero en ninguna de ellas se consume como ingrediente en alguna receta.'] = 'The semi-finished is transferred to locations X, Y but in none of them is it consumed as an ingredient in any recipe.';
  _TEXTS['Paths truncados (>50.000, red muy compleja)'] = 'Truncated paths (>50,000, very complex network)';
  _TEXTS['La red tiene más de 50.000 rutas posibles — se procesaron parcialmente para evitar bloqueo del sistema.'] = 'The network has more than 50,000 possible routes — they were partially processed to avoid system blocking.';
  _TEXTS['Esta advertencia es informativa. El análisis es representativo pero puede no detectar todas las anomalías. Considerar simplificar la red o analizar por subconjunto de productos.'] = 'This warning is informational. The analysis is representative but may not detect all anomalies. Consider simplifying the network or analyzing by product subset.';
  _TEXTS['Semiterminado consumido en planta productora con transferencia configurada'] = 'Semi-finished consumed at producing plant with transfer configured';
  _TEXTS['El semiterminado se consume en la planta donde se fabrica y además se transfiere a otra planta donde también se consume como PSI.'] = 'The semi-finished is consumed at the plant where it is manufactured and is also transferred to another plant where it is also consumed as PSI.';
  _TEXTS['Semiterminado consumido en destino de transferencia'] = 'Semi-finished consumed at transfer destination';
  _TEXTS['El semiterminado se transfiere a otra planta donde es consumido como PSI — flujo correcto.'] = 'The semi-finished is transferred to another plant where it is consumed as PSI — correct flow.';
  _TEXTS['Semiterminado consumido en planta productora'] = 'Semi-finished consumed at producing plant';
  _TEXTS['El semiterminado se consume localmente en la planta donde se fabrica.'] = 'The semi-finished is consumed locally at the plant where it is manufactured.';
  _TEXTS['Habilitado en Location Product'] = 'Enabled in Location Product';
  _TEXTS['El producto está habilitado en Location Product en todas las ubicaciones activas de su red.'] = 'The product is enabled in Location Product at all active locations of its network.';
  _TEXTS['Lead times definidos'] = 'Lead times defined';
  _TEXTS['Todos los arcos de transferencia y entrega del producto tienen lead time mayor que cero.'] = 'All transfer and delivery arcs of the product have lead time greater than zero.';
  _TEXTS['Mercadería con arcos de distribución y entrega'] = 'Trading product with distribution and delivery arcs';
  _TEXTS['La mercadería tiene Location Source y Customer Source correctamente configurados.'] = 'The trading product has Location Source and Customer Source correctly configured.';
  _TEXTS['Red completa sin anomalias'] = 'Complete network without anomalies';
  _TEXTS['El producto tiene rutas completas de planta a cliente y no se detectaron Ghost Nodes, Dead-ends ni ciclos.'] = 'The product has complete plant-to-customer routes and no Ghost Nodes, Dead-ends or cycles were detected.';
  _TEXTS['N ruta(s) a cliente'] = 'N route(s) to customer';
  _TEXTS['El producto tiene N rutas completas desde plantas productoras hasta clientes. A mayor número de rutas, mayor resiliencia.'] = 'The product has N complete routes from producing plants to customers. The greater the number of routes, the greater the resilience.';
  _TEXTS['Habilitado en Customer Product'] = 'Enabled in Customer Product';
  _TEXTS['El producto está habilitado en Customer Product en todos los clientes con entrega configurada.'] = 'The product is enabled in Customer Product for all customers with delivery configured.';

  // SN Location
  _TEXTS['Una fila por cada ubicación detectada en la red. Acumula los hallazgos topológicos de todos los productos que pasan por esa ubicación.'] = 'One row per location detected in the network. Accumulates the topological findings of all products passing through that location.';
  _TEXTS['Planta con Entrega'] = 'Plant with Delivery';
  _TEXTS['Tiene PSH (fabrica) Y entrega directamente a clientes vía Customer Source.'] = 'Has PSH (manufactures) AND delivers directly to customers via Customer Source.';
  _TEXTS['Planta'] = 'Plant';
  _TEXTS['Tiene PSH (fabrica) pero no entrega directamente a clientes.'] = 'Has PSH (manufactures) but does not deliver directly to customers.';
  _TEXTS['DC con Entrega Directa'] = 'DC with Direct Delivery';
  _TEXTS['Aparece en Location Source como origen o destino (redistribuye) Y entrega directamente a clientes vía Customer Source.'] = 'Appears in Location Source as source or destination (redistributes) AND delivers directly to customers via Customer Source.';
  _TEXTS['DC'] = 'DC';
  _TEXTS['Aparece en Location Source sin entrega directa a clientes.'] = 'Appears in Location Source without direct delivery to customers.';
  _TEXTS['Punto de Entrega'] = 'Delivery Point';
  _TEXTS['Solo aparece en Customer Source como origen de entrega a clientes — sin producción ni transferencias entre ubicaciones.'] = 'Only appears in Customer Source as a delivery source to customers — no production or transfers between locations.';
  _TEXTS['Sin rol activo'] = 'No active role';
  _TEXTS['No aparece en ninguna entidad de red activa — ubicación inactiva o solo en el maestro.'] = 'Does not appear in any active network entity — inactive location or only in the master.';
  _TEXTS['⛔ / ⚠ / ✅ según el hallazgo más grave.'] = '⛔ / ⚠ / ✅ depending on the most severe finding.';
  _TEXTS['Detalle de todos los hallazgos.'] = 'Detail of all findings.';
  _TEXTS['Código de la ubicación.'] = 'Location code.';
  _TEXTS['Tipo de ubicación del maestro (informativo).'] = 'Location type from the master (informational).';
  _TEXTS['Rol inferido'] = 'Inferred role';
  _TEXTS['Rol inferido del comportamiento de la ubicación en la red. Ver tabla de roles más arriba.'] = 'Role inferred from the location behavior in the network. See roles table above.';
  _TEXTS['Sí/No — la ubicación tiene al menos una fuente de producción (fabrica algo).'] = 'Yes/No — the location has at least one production source (manufactures something).';
  _TEXTS['Sí/No — aparece como origen o destino en algún arco de transferencia.'] = 'Yes/No — appears as source or destination in some transfer arc.';
  _TEXTS['Sí/No — aparece como ubicación de entrega a algún cliente.'] = 'Yes/No — appears as a delivery location to some customer.';
  _TEXTS['Sí/No — habilitada en Location Product. Sin esto IBP no planifica en esta ubicación.'] = 'Yes/No — enabled in Location Product. Without this, IBP does not plan at this location.';
  _TEXTS['Sí = la ubicación existe en el maestro pero no aparece en ninguna entidad de red activa.'] = 'Yes = the location exists in the master but does not appear in any active network entity.';
  _TEXTS['# Productos manejados'] = '# Products handled';
  _TEXTS['# Como origen (LOCFR)'] = '# As source (LOCFR)';
  _TEXTS['# Como destino (LOCID)'] = '# As destination (LOCID)';
  _TEXTS['# Clientes servidos'] = '# Customers served';
  _TEXTS['Es nodo critico?'] = 'Is critical node?';
  _TEXTS['# Productos impactados'] = '# Impacted products';
  _TEXTS['# Clientes impactados'] = '# Impacted customers';
  _TEXTS['Nivel de riesgo'] = 'Risk level';
  _TEXTS['Total de productos distintos que pasan por esta ubicación como origen, destino o planta productora.'] = 'Total distinct products passing through this location as source, destination or producing plant.';
  _TEXTS['Cuántos arcos de Location Source tienen esta ubicación como origen.'] = 'How many Location Source arcs have this location as source.';
  _TEXTS['Cuántos arcos de Location Source tienen esta ubicación como destino.'] = 'How many Location Source arcs have this location as destination.';
  _TEXTS['Número de clientes distintos que reciben productos desde esta ubicación vía Customer Source.'] = 'Number of distinct customers receiving products from this location via Customer Source.';
  _TEXTS['Sí/No — su eliminación cortaría rutas de al menos un producto a al menos un cliente.'] = 'Yes/No — its removal would cut routes of at least one product to at least one customer.';
  _TEXTS['Si es nodo crítico: cuántos productos distintos dependen de este nodo para llegar a algún cliente.'] = 'If critical node: how many distinct products depend on this node to reach any customer.';
  _TEXTS['Si es nodo crítico: cuántos clientes distintos perderían abastecimiento si este nodo fallara.'] = 'If critical node: how many distinct customers would lose supply if this node failed.';
  _TEXTS['Critical = 4 o más productos impactados | High = 2-3 productos | Medium = 1 producto. Solo aplica si es nodo crítico.'] = 'Critical = 4 or more impacted products | High = 2-3 products | Medium = 1 product. Only applies if critical node.';
  _TEXTS['Ghost node (alimentado sin salida util)'] = 'Ghost node (fed without useful output)';
  _TEXTS['Esta ubicación recibe el producto desde algún origen pero todas sus salidas conducen a callejones sin salida — el producto nunca llega a un cliente a través de este nodo.'] = 'This location receives the product from some source but all its outputs lead to dead-ends — the product never reaches a customer through this node.';
  _TEXTS['Revisar los arcos salientes de esta ubicación en Location Source y Customer Source. Puede faltar el arco final hacia un cliente o hacia el siguiente nodo de la cadena.'] = 'Review the outbound arcs of this location in Location Source and Customer Source. The final arc to a customer or to the next node in the chain may be missing.';
  _TEXTS['Dead-end (recibe pero no reenvía)'] = 'Dead-end (receives but does not forward)';
  _TEXTS['Esta ubicación recibe producto por Location Source pero no tiene ningún arco de salida configurado — el producto llega y no puede continuar.'] = 'This location receives product via Location Source but has no configured outbound arc — the product arrives and cannot continue.';
  _TEXTS['Agregar el arco de salida faltante en Location Source o Customer Source, o verificar si esta ubicación es el destino final y falta el arco a un cliente.'] = 'Add the missing outbound arc in Location Source or Customer Source, or check whether this location is the final destination and an arc to a customer is missing.';
  _TEXTS['Planta aislada (sin ruta a ningun cliente)'] = 'Isolated plant (no route to any customer)';
  _TEXTS['Esta planta produce algún producto pero ninguna de sus rutas logísticas llega hasta algún cliente.'] = 'This plant produces some product but none of its logistics routes reaches any customer.';
  _TEXTS['Revisar la configuración de Location Source desde esta planta e identificar el arco faltante que conecte la producción con la red de distribución.'] = 'Review the Location Source configuration from this plant and identify the missing arc connecting production with the distribution network.';
  _TEXTS['Participa en ciclo: X→Y→Z→X'] = 'Participates in cycle: X→Y→Z→X';
  _TEXTS['Esta ubicación forma parte de un ciclo en la red logística. El producto puede circular indefinidamente sin llegar a un cliente.'] = 'This location is part of a cycle in the logistics network. The product can circulate indefinitely without reaching a customer.';
  _TEXTS['Identificar cuál de los arcos del ciclo está configurado en sentido incorrecto y corregirlo en Location Source.'] = 'Identify which arc of the cycle is configured in the wrong direction and fix it in Location Source.';
  _TEXTS['Esta ubicación participa activamente en la red (PSH o Location Source) pero no está habilitada en Location Product. IBP no puede planificar en ella.'] = 'This location actively participates in the network (PSH or Location Source) but is not enabled in Location Product. IBP cannot plan there.';
  _TEXTS['Habilitar la ubicación en Location Product para los productos que la utilizan.'] = 'Enable the location in Location Product for the products that use it.';
  _TEXTS['Nodo critico: N prod, N clientes'] = 'Critical node: N prod, N customers';
  _TEXTS['Esta ubicación es un punto único de falla: si desaparece, N productos dejarían de llegar a N clientes. No es un error de configuración sino un riesgo de resiliencia.'] = 'This location is a single point of failure: if it disappears, N products would stop reaching N customers. It is not a configuration error but a resilience risk.';
  _TEXTS['Evaluar si se justifica agregar una ruta alternativa que no dependa de este nodo para los productos críticos.'] = 'Evaluate whether adding an alternative route that does not depend on this node is justified for critical products.';
  _TEXTS['Solo en maestro de ubicaciones, sin actividad en la red'] = 'Only in location master, no network activity';
  _TEXTS['La ubicación existe en el maestro pero no aparece en ninguna entidad de red.'] = 'The location exists in the master but does not appear in any network entity.';
  _TEXTS['Verificar si la ubicación es obsoleta o si falta configurar su participación en la red de abastecimiento.'] = 'Check whether the location is obsolete or if its participation in the supply network is missing.';
  _TEXTS['Sin anomalias topologicas'] = 'No topological anomalies';
  _TEXTS['La ubicación no presenta Ghost Nodes, Dead-ends, ciclos ni problemas de Location Product en ninguno de sus productos.'] = 'The location does not present Ghost Nodes, Dead-ends, cycles or Location Product issues in any of its products.';
  _TEXTS['La ubicación está habilitada en Location Product para todos los productos activos que la utilizan.'] = 'The location is enabled in Location Product for all active products that use it.';
  _TEXTS['N cliente(s) servido(s)'] = 'N customer(s) served';
  _TEXTS['La ubicación despacha a N clientes distintos vía Customer Source.'] = 'The location ships to N distinct customers via Customer Source.';
  _TEXTS['Activo como origen para N producto(s)'] = 'Active as source for N product(s)';
  _TEXTS['La ubicación es origen activo en Location Source para N productos distintos.'] = 'The location is an active source in Location Source for N distinct products.';

  // SN Customer
  _TEXTS['CUSTID'] = 'CUSTID';
  _TEXTS['CUSTDESCR'] = 'CUSTDESCR';
  _TEXTS['Sí/No — el cliente tiene al menos un arco de entrega configurado.'] = 'Yes/No — the customer has at least one delivery arc configured.';
  _TEXTS['Sí/No — habilitado en Customer Product. Sin esto IBP ignora al cliente en planificación.'] = 'Yes/No — enabled in Customer Product. Without this, IBP ignores the customer in planning.';
  _TEXTS['Sí = el cliente existe en el maestro pero no tiene arcos de entrega en Customer Source.'] = 'Yes = the customer exists in the master but has no delivery arcs in Customer Source.';
  _TEXTS['Número de productos distintos que este cliente puede recibir según Customer Source.'] = 'Number of distinct products this customer can receive according to Customer Source.';
  _TEXTS['# Ubicaciones proveedoras'] = '# Supplying locations';
  _TEXTS['Número de ubicaciones desde las que se despacha al cliente.'] = 'Number of locations from which the customer is shipped to.';
  _TEXTS['# Paths que llegan'] = '# Reaching paths';
  _TEXTS['Total de rutas completas de planta a este cliente (suma de todos sus productos).'] = 'Total complete routes from plant to this customer (sum across all its products).';
  _TEXTS['Resiliencia predominante'] = 'Predominant resilience';
  _TEXTS['Single Path = algún producto llega solo por una ruta completa | Single Node Dependency = hay un nodo único cuyo fallo corta el abastecimiento | Resilient = todos los productos tienen rutas alternativas | — = sin rutas configuradas.'] = 'Single Path = some product arrives by only one complete route | Single Node Dependency = there is a single node whose failure cuts the supply | Resilient = all products have alternative routes | — = no routes configured.';
  _TEXTS['Sin productos alcanzables desde produccion'] = 'No products reachable from production';
  _TEXTS['El cliente tiene Customer Source configurado pero ninguna ruta completa conecta la producción con sus arcos de entrega.'] = 'The customer has Customer Source configured but no complete route connects production with its delivery arcs.';
  _TEXTS['Revisar la red de distribución hacia este cliente e identificar los arcos faltantes en Location Source o Customer Source.'] = 'Review the distribution network to this customer and identify the missing arcs in Location Source or Customer Source.';
  _TEXTS['El cliente tiene arcos de entrega (Customer Source) pero no está habilitado en Customer Product. IBP lo ignora en la planificación.'] = 'The customer has delivery arcs (Customer Source) but is not enabled in Customer Product. IBP ignores it in planning.';
  _TEXTS['Habilitar las combinaciones cliente+producto correspondientes en Customer Product en IBP.'] = 'Enable the corresponding customer+product combinations in Customer Product in IBP.';
  _TEXTS['N producto(s) con unica ruta'] = 'N product(s) with single route';
  _TEXTS['N productos llegan a este cliente por una sola ruta completa. Si esa ruta falla, el abastecimiento se corta.'] = 'N products reach this customer by a single complete route. If that route fails, the supply is cut.';
  _TEXTS['Evaluar si se justifica agregar una ruta alternativa para los productos indicados, para aumentar la resiliencia del abastecimiento.'] = 'Evaluate whether adding an alternative route for the indicated products is justified to increase supply resilience.';
  _TEXTS['N producto(s) con nodo critico unico'] = 'N product(s) with single critical node';
  _TEXTS['N productos llegan a este cliente a través de un nodo crítico único: si ese nodo desaparece, el abastecimiento se corta. El Estado puede ser ✅ si no hay además rutas de punto único — es una observación de riesgo de resiliencia, no un error de configuración.'] = 'N products reach this customer through a single critical node: if that node disappears, the supply is cut. Status can be ✅ if there are no additional single-point routes — it is a resilience risk observation, not a configuration error.';
  _TEXTS['Identificar el nodo crítico indicado y evaluar agregar una ruta alternativa que evite ese único punto de falla.'] = 'Identify the indicated critical node and evaluate adding an alternative route that avoids that single point of failure.';
  _TEXTS['Solo en maestro, sin uso en red'] = 'Only in master, no network use';
  _TEXTS['El cliente existe en el maestro pero no tiene arcos de entrega en Customer Source ni está habilitado en Customer Product. Se marca ⛔ porque un cliente sin ninguna actividad en la red es una anomalía de datos.'] = 'The customer exists in the master but has no delivery arcs in Customer Source and is not enabled in Customer Product. Marked ⛔ because a customer without any network activity is a data anomaly.';
  _TEXTS['Verificar si el cliente es obsoleto o si falta configurar sus arcos de entrega en Customer Source.'] = 'Check whether the customer is obsolete or if its delivery arcs in Customer Source are missing.';
  _TEXTS['Abastecido con rutas resilientes'] = 'Supplied with resilient routes';
  _TEXTS['Todos los productos de este cliente tienen múltiples rutas alternativas y no dependen de un nodo único.'] = 'All products of this customer have multiple alternative routes and do not depend on a single node.';
  _TEXTS['El cliente está habilitado en Customer Product para todos los productos que lo abastecen.'] = 'The customer is enabled in Customer Product for all products that supply it.';
  _TEXTS['N producto(s) alcanzables'] = 'N reachable product(s)';
  _TEXTS['El cliente tiene N productos con al menos una ruta completa de producción configurada.'] = 'The customer has N products with at least one complete production route configured.';
  _TEXTS['N ruta(s) configuradas'] = 'N route(s) configured';
  _TEXTS['El cliente tiene N rutas de entrega activas en Customer Source con al menos una fuente de producción alcanzable.'] = 'The customer has N active delivery routes in Customer Source with at least one reachable production source.';

  // SN Location Source — columnas
  _TEXTS['⛔ / ⚠ / ✅ según el hallazgo más grave del arco.'] = '⛔ / ⚠ / ✅ depending on the most severe finding of the arc.';
  _TEXTS['Detalle de todos los hallazgos del arco.'] = 'Detail of all arc findings.';
  _TEXTS['Producto transferido en este arco.'] = 'Product transferred in this arc.';
  _TEXTS['Descripción del producto.'] = 'Product description.';
  _TEXTS['Tipo de material del producto.'] = 'Product material type.';
  _TEXTS['LOCFR'] = 'LOCFR';
  _TEXTS['LOCFR Descripcion'] = 'LOCFR Description';
  _TEXTS['LOCID Descripcion'] = 'LOCID Description';
  _TEXTS['Código de la ubicación de origen del arco.'] = 'Arc source location code.';
  _TEXTS['Descripción de la ubicación origen.'] = 'Source location description.';
  _TEXTS['Código de la ubicación de destino del arco.'] = 'Arc destination location code.';
  _TEXTS['Descripción de la ubicación destino.'] = 'Destination location description.';
  _TEXTS['TLEADTIME'] = 'TLEADTIME';
  _TEXTS['Lead time de transferencia en días. 0 o vacío genera ⚠ Advertencia.'] = 'Transfer lead time in days. 0 or empty generates ⚠ Warning.';
  _TEXTS['LOCFR+PRDID en Location Product?'] = 'LOCFR+PRDID in Location Product?';
  _TEXTS['LOCID+PRDID en Location Product?'] = 'LOCID+PRDID in Location Product?';
  _TEXTS['PRDID en PSH?'] = 'PRDID in PSH?';
  _TEXTS['Arco en ruta completa?'] = 'Arc on complete route?';
  _TEXTS['Arco inverso?'] = 'Reverse arc?';
  _TEXTS['Lead Time Status'] = 'Lead Time Status';
  _TEXTS['SPOF arco?'] = 'SPOF arc?';
  _TEXTS['Sí/No — la ubicación origen está habilitada para este producto en Location Product.'] = 'Yes/No — the source location is enabled for this product in Location Product.';
  _TEXTS['Sí/No — la ubicación destino está habilitada para este producto en Location Product.'] = 'Yes/No — the destination location is enabled for this product in Location Product.';
  _TEXTS['Sí/No — el producto tiene al menos una fuente de producción. Útil para distinguir si el producto se fabrica o solo se redistribuye.'] = 'Yes/No — the product has at least one production source. Useful to distinguish whether the product is manufactured or only redistributed.';
  _TEXTS['Sí/No — este arco forma parte de al menos una ruta que llega a un cliente. Arcos con No son candidatos a revisión: están configurados pero no contribuyen a ninguna ruta de planta a cliente. Pueden ser obsoletos o pueden indicar una brecha en la red.'] = 'Yes/No — this arc is part of at least one route that reaches a customer. Arcs with No are review candidates: they are configured but do not contribute to any plant-to-customer route. They may be obsolete or indicate a gap in the network.';
  _TEXTS['Sí/No — existe un arco configurado en dirección opuesta (LOCID→LOCFR) para el mismo producto. Puede indicar un ciclo en la red.'] = 'Yes/No — an arc is configured in the opposite direction (LOCID→LOCFR) for the same product. May indicate a cycle in the network.';
  _TEXTS['OK = TLEADTIME > 0 | Zero = TLEADTIME = 0 | Missing = sin valor definido.'] = 'OK = TLEADTIME > 0 | Zero = TLEADTIME = 0 | Missing = no value defined.';
  _TEXTS['Sí/No — Single Point of Failure: el destino LOCID tiene un único origen para este producto (este arco). Si falla, el destino queda sin abastecimiento del producto.'] = 'Yes/No — Single Point of Failure: the destination LOCID has a single source for this product (this arc). If it fails, the destination is left without product supply.';

  // SN Location Source — observaciones
  _TEXTS['Sin Location Product en origen (X)'] = 'No Location Product at source (X)';
  _TEXTS['La ubicación origen X no tiene habilitado este producto en Location Product. IBP no reconoce el producto en ese punto de la red.'] = 'Source location X does not have this product enabled in Location Product. IBP does not recognize the product at that network point.';
  _TEXTS['Habilitar la combinación LOCFR+PRDID en Location Product en IBP.'] = 'Enable the LOCFR+PRDID combination in Location Product in IBP.';
  _TEXTS['Sin Location Product en destino (X)'] = 'No Location Product at destination (X)';
  _TEXTS['La ubicación destino X no tiene habilitado este producto en Location Product. IBP no puede planificar el producto en esa ubicación.'] = 'Destination location X does not have this product enabled in Location Product. IBP cannot plan the product at that location.';
  _TEXTS['Habilitar la combinación LOCID+PRDID en Location Product en IBP.'] = 'Enable the LOCID+PRDID combination in Location Product in IBP.';
  _TEXTS['Arco duplicado en el dataset'] = 'Duplicate arc in the dataset';
  _TEXTS['Existe más de un arco con la misma combinación PRDID+LOCFR+LOCID en el dataset descargado. IBP puede producir comportamientos inesperados con arcos duplicados.'] = 'There is more than one arc with the same PRDID+LOCFR+LOCID combination in the downloaded dataset. IBP may produce unexpected behavior with duplicate arcs.';
  _TEXTS['Revisar y eliminar el arco duplicado en Location Source en IBP. Verificar que no sean versiones o planning areas distintos mezclados en el mismo download.'] = 'Review and remove the duplicate arc in Location Source in IBP. Verify they are not different versions or planning areas mixed in the same download.';
  _TEXTS['TLEADTIME missing'] = 'TLEADTIME missing';
  _TEXTS['El campo TLEADTIME no tiene valor definido. IBP usa 0 por defecto, planificando transferencias instantáneas.'] = 'The TLEADTIME field has no defined value. IBP defaults to 0, planning instantaneous transfers.';
  _TEXTS['Ingresar el TLEADTIME real en días en el arco de Location Source correspondiente en IBP.'] = 'Enter the real TLEADTIME in days in the corresponding Location Source arc in IBP.';
  _TEXTS['TLEADTIME zero'] = 'TLEADTIME zero';
  _TEXTS['El TLEADTIME está explícitamente definido como 0. IBP planifica transferencias instantáneas en este tramo.'] = 'The TLEADTIME is explicitly defined as 0. IBP plans instantaneous transfers on this leg.';
  _TEXTS['Verificar si 0 días es intencional (cross-docking mismo día) o si falta ingresar el lead time real.'] = 'Verify if 0 days is intentional (same-day cross-docking) or if the real lead time is missing.';
  _TEXTS['Existe arco inverso (LOCID→LOCFR)'] = 'Reverse arc exists (LOCID→LOCFR)';
  _TEXTS['Hay un arco configurado en la dirección opuesta para el mismo producto. Puede ser intencional (flujo bidireccional) o puede indicar un ciclo en la red.'] = 'An arc is configured in the opposite direction for the same product. It may be intentional (bidirectional flow) or indicate a cycle in the network.';
  _TEXTS['Verificar si el flujo bidireccional es intencional. Si no, eliminar el arco inverso incorrecto en Location Source.'] = 'Verify whether the bidirectional flow is intentional. If not, remove the incorrect reverse arc in Location Source.';
  _TEXTS['Arco valido | Location Product en origen y destino | TLEADTIME definido'] = 'Valid arc | Location Product at source and destination | TLEADTIME defined';
  _TEXTS['El arco tiene lead time definido y ambas ubicaciones extremas están habilitadas en Location Product.'] = 'The arc has lead time defined and both endpoint locations are enabled in Location Product.';
  _TEXTS['... | En ruta completa'] = '... | On complete route';
  _TEXTS['Además de estar correctamente configurado, este arco forma parte de al menos una ruta completa de planta a cliente.'] = 'In addition to being correctly configured, this arc is part of at least one complete plant-to-customer route.';

  // SN Customer Source — columnas
  _TEXTS['Producto entregado al cliente.'] = 'Product delivered to the customer.';
  _TEXTS['Código de la ubicación de despacho desde donde sale el producto al cliente.'] = 'Code of the shipping location from which the product leaves to the customer.';
  _TEXTS['Descripción de la ubicación de despacho.'] = 'Shipping location description.';
  _TEXTS['CUSTID Descripcion'] = 'CUSTID Description';
  _TEXTS['Código del cliente receptor.'] = 'Receiving customer code.';
  _TEXTS['Descripción del cliente.'] = 'Customer description.';
  _TEXTS['CLEADTIME'] = 'CLEADTIME';
  _TEXTS['Lead time de entrega al cliente en días. 0 o vacío genera ⚠ Advertencia.'] = 'Customer delivery lead time in days. 0 or empty generates ⚠ Warning.';
  _TEXTS['CUSTID+PRDID en Customer Product?'] = 'CUSTID+PRDID in Customer Product?';
  _TEXTS['Entrega alcanzable desde produccion?'] = 'Delivery reachable from production?';
  _TEXTS['Sí/No — la ubicación de despacho está habilitada para este producto en Location Product.'] = 'Yes/No — the shipping location is enabled for this product in Location Product.';
  _TEXTS['Sí/No — el cliente está habilitado para este producto en Customer Product.'] = 'Yes/No — the customer is enabled for this product in Customer Product.';
  _TEXTS['Sí/No — el producto tiene al menos una fuente de producción. Útil para distinguir productos fabricados de mercadería.'] = 'Yes/No — the product has at least one production source. Useful to distinguish manufactured products from trading.';
  _TEXTS['Sí/No — existe una ruta completa de producción que llega hasta este arco de entrega. No = hay una brecha en la red de distribución.'] = 'Yes/No — a complete production route reaches this delivery arc. No = there is a gap in the distribution network.';
  _TEXTS['OK = CLEADTIME > 0 | Zero = CLEADTIME = 0 | Missing = sin valor definido.'] = 'OK = CLEADTIME > 0 | Zero = CLEADTIME = 0 | Missing = no value defined.';

  // SN Customer Source — observaciones
  _TEXTS['Sin Location Product en ubicacion (X)'] = 'No Location Product at location (X)';
  _TEXTS['La ubicación de despacho X no tiene habilitado este producto en Location Product. IBP no puede planificar la entrega desde ese punto.'] = 'Shipping location X does not have this product enabled in Location Product. IBP cannot plan delivery from that point.';
  _TEXTS['Sin Customer Product para cliente (X)'] = 'No Customer Product for customer (X)';
  _TEXTS['El cliente X no está habilitado en Customer Product para este producto. IBP ignora el arco de entrega en la planificación.'] = 'Customer X is not enabled in Customer Product for this product. IBP ignores the delivery arc in planning.';
  _TEXTS['Habilitar la combinación CUSTID+PRDID en Customer Product en IBP.'] = 'Enable the CUSTID+PRDID combination in Customer Product in IBP.';
  _TEXTS['Entrega no alcanzable desde produccion'] = 'Delivery not reachable from production';
  _TEXTS['La entrega al cliente está configurada pero no existe ninguna ruta completa de producción que llegue hasta este arco. El cliente tiene arco de entrega pero sin fuente de abastecimiento conectada.'] = 'The customer delivery is configured but no complete production route reaches this arc. The customer has a delivery arc but no connected supply source.';
  _TEXTS['Revisar la red de distribución e identificar el arco faltante en Location Source que conecte la producción con esta ubicación de despacho.'] = 'Review the distribution network and identify the missing Location Source arc connecting production with this shipping location.';
  _TEXTS['CLEADTIME missing'] = 'CLEADTIME missing';
  _TEXTS['El campo CLEADTIME no tiene valor definido. IBP usa 0 por defecto, planificando entregas instantáneas al cliente.'] = 'The CLEADTIME field has no defined value. IBP defaults to 0, planning instantaneous customer deliveries.';
  _TEXTS['Ingresar el CLEADTIME real en días en el arco de Customer Source correspondiente en IBP.'] = 'Enter the real CLEADTIME in days in the corresponding Customer Source arc in IBP.';
  _TEXTS['CLEADTIME zero'] = 'CLEADTIME zero';
  _TEXTS['El CLEADTIME está explícitamente definido como 0. IBP planifica entrega al cliente sin tiempo de tránsito.'] = 'The CLEADTIME is explicitly defined as 0. IBP plans customer delivery with no transit time.';
  _TEXTS['Verificar si 0 días es intencional (entrega inmediata) o si falta ingresar el lead time real de entrega.'] = 'Verify if 0 days is intentional (immediate delivery) or if the real delivery lead time is missing.';
  _TEXTS['Entrega alcanzable | Location Product y Customer Product configurados | CLEADTIME definido'] = 'Reachable delivery | Location Product and Customer Product configured | CLEADTIME defined';
  _TEXTS['El arco de entrega es alcanzable desde la producción, tiene lead time definido y ambos extremos están habilitados correctamente.'] = 'The delivery arc is reachable from production, has a lead time defined and both endpoints are correctly enabled.';

  // SN Tipos de Material — tabla
  _TEXTS['Regla de análisis'] = 'Analysis rule';
  _TEXTS['Necesita ruta completa a cliente'] = 'Needs complete route to customer';
  _TEXTS['No aplica'] = 'Not applicable';
  _TEXTS['Ghost Nodes / Dead-ends'] = 'Ghost Nodes / Dead-ends';
  _TEXTS['⛔ Detecta'] = '⛔ Detects';
  _TEXTS['No detecta'] = 'Does not detect';
  _TEXTS['Plantas aisladas'] = 'Isolated plants';
  _TEXTS['PLEADTIME faltante'] = 'PLEADTIME missing';
  _TEXTS['TLEADTIME faltante'] = 'TLEADTIME missing';
  _TEXTS['CLEADTIME faltante'] = 'CLEADTIME missing';
  _TEXTS['Necesita PSH propio'] = 'Needs its own PSH';
  _TEXTS['Necesita consumo PSI en destino (semi)'] = 'Needs PSI consumption at destination (semi)';
  _TEXTS['Necesita arco de abastecimiento'] = 'Needs supply arc';
  _TEXTS['Arcos LS + CS conectados'] = 'LS + CS arcs connected';

  // Misc faltantes
  _TEXTS['Tipo de material del producto output.'] = 'Output product material type.';
  _TEXTS['Agregar el semiterminado como componente PSI en el BOM de la planta destino, o eliminar el arco de transferencia si es un error.'] = 'Add the semi-finished as a PSI component in the destination plant BOM, or remove the transfer arc if it is an error.';

  /* Re-render al cambiar de idioma */
  document.addEventListener('i18n:change', function () {
    try {
      var tab = document.getElementById('tab-glosario');
      if (!tab) return;
      if (_initialized) {
        var sections = _currentModule === 'pa' ? PA_SECTIONS : SN_SECTIONS;
        renderNav(sections);
        renderContent(sections);
      }
      var btn = document.getElementById('glosarioPdfBtn');
      if (btn && !btn.disabled) {
        btn.textContent = (_lang() === 'en') ? '↓ Export PDF' : '↓ Exportar PDF';
      }
    } catch (e) { console.warn('[glosario i18n change]', e); }
  });
})();
