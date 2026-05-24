/* ═══════════════════════════════════════════════════════════════
   PRODUCTION HIERARCHY ANALYZER  v2
   Descarga 10 entidades → IDB/memoria → analiza →
   exporta Excel con hojas:
     Resumen, Product, Resource, Resource Location,
     Prod Source Header, Prod Source Item,
     Prod Source Resource, Location, Tipos Excluidos
   ═══════════════════════════════════════════════════════════════ */

/* ── i18n helper para notas de columnas Excel ── */
var _XLS_PA_NOTES_EN = {
  'Color de alerta: 🔴 Alerta = BOM vacío, PLEADTIME=0, sin Location Product o sin PSR | 🟡 Advertencia = sin SOURCETYPE=P o múltiples fuentes sin cuota | ✅ OK = receta completa.':
    'Alert color: 🔴 Alert = empty BOM, PLEADTIME=0, no Location Product, or no PSR | 🟡 Warning = no SOURCETYPE=P or multiple sources without quota | ✅ OK = complete recipe.',
  'Color de alerta: 🔴 Alerta = coeficiente cero, insumo sin arco de abastecimiento o componente sin Location Product | 🟡 Advertencia = SOURCEID no encontrado o sustituto sin registro Item Sub | ✅ OK = componente bien configurado.':
    'Alert color: 🔴 Alert = zero coefficient, input without supply arc, or component without Location Product | 🟡 Warning = SOURCEID not found or substitute without Item Sub record | ✅ OK = well-configured component.',
  'Color de alerta: 🔴 Alerta = problema crítico que bloquea la planificación | 🟡 Advertencia = dato incompleto o sospechoso | ✅ OK = sin hallazgos.':
    'Alert color: 🔴 Alert = critical issue that blocks planning | 🟡 Warning = incomplete or suspicious data | ✅ OK = no findings.',
  'Color de alerta: 🔴 Alerta = recurso completamente huérfano (sin PSR ni Resource Location) | 🟡 Advertencia = dato incompleto | ✅ OK = recurso activo y con planta asignada.':
    'Alert color: 🔴 Alert = fully orphan resource (no PSR nor Resource Location) | 🟡 Warning = incomplete data | ✅ OK = active resource with plant assigned.',
  'Color de alerta: 🟡 Advertencia = recurso asignado a planta pero sin uso en ninguna receta | ✅ OK = recurso activo en PSR para esta planta.':
    'Alert color: 🟡 Warning = resource assigned to plant but not used in any recipe | ✅ OK = resource active in PSR at this plant.',
  'Color de alerta: 🟡 Advertencia = recurso asignado a una receta pero sin Resource Location en esa planta | ✅ OK = asignación válida y consistente.':
    'Alert color: 🟡 Warning = resource assigned to a recipe but without Resource Location at that plant | ✅ OK = valid and consistent assignment.',
  'Cuántas recetas de producción distintas (SOURCEIDs) tienen a este producto como output principal. Ej: 2 = puede fabricarse de dos maneras diferentes.':
    'How many distinct production recipes (SOURCEIDs) have this product as primary output. E.g.: 2 = can be manufactured in two different ways.',
  'Cuántos otros productos distintos requieren este material como componente en sus BOMs. Ej: 3 = MAT-A es ingrediente en PROD-001, PROD-002 y PROD-003.':
    'How many other distinct products require this material as a component in their BOMs. E.g.: 3 = MAT-A is an ingredient in PROD-001, PROD-002 and PROD-003.',
  'Código de la planta donde está configurado este recurso (LOCID). Ej: P001.':
    'Code of the plant where this resource is configured (LOCID). E.g.: P001.',
  'Código de la planta donde se ejecuta esta producción (LOCID). Ej: P001.':
    'Code of the plant where this production runs (LOCID). E.g.: P001.',
  'Código del componente principal al que reemplaza este sustituto. Solo aplica cuando ISALTITEM=X. Ej: MAT-A = este sustituto reemplaza a MAT-A.':
    'Code of the primary component this substitute replaces. Only applies when ISALTITEM=X. E.g.: MAT-A = this substitute replaces MAT-A.',
  'Código del material que se consume como ingrediente en esta receta (PRDID componente). Ej: MAT-A.':
    'Code of the material consumed as ingredient in this recipe (component PRDID). E.g.: MAT-A.',
  'Código del producto que fabrica esta fuente. Ej: PROD-001.':
    'Code of the product manufactured by this source. E.g.: PROD-001.',
  'Código del producto terminado que produce esta receta (output). Ej: PROD-001.':
    'Code of the finished product this recipe produces (output). E.g.: PROD-001.',
  'Código del producto terminado que se fabrica en esta receta (output). Ej: PROD-001.':
    'Code of the finished product manufactured in this recipe (output). E.g.: PROD-001.',
  'Código del recurso asignado a esta fuente de producción (RESID). Ej: LINEA-01.':
    'Code of the resource assigned to this production source (RESID). E.g.: LINEA-01.',
  'Código del recurso productivo (RESID). Ej: LINEA-01.':
    'Production resource code (RESID). E.g.: LINEA-01.',
  'Código del tipo de material excluido del análisis principal por configuración del usuario. Ej: VERP = embalajes, NLAG = no planificados.':
    'Material type code excluded from main analysis per user configuration. E.g.: VERP = packaging, NLAG = non-planned.',
  'Código único de la ubicación en SAP IBP (LOCID). Ej: P001, DC-NORTE, PROV-05.':
    'Unique location code in SAP IBP (LOCID). E.g.: P001, DC-NORTH, PROV-05.',
  'Código único del producto en SAP IBP (PRDID). Ej: PROD-001, MAT-A.':
    'Unique product code in SAP IBP (PRDID). E.g.: PROD-001, MAT-A.',
  'Código único del recurso productivo en SAP IBP (RESID). Ej: LINEA-01, HORNO-A, MAQUINA-03.':
    'Unique production resource code in SAP IBP (RESID). E.g.: LINEA-01, OVEN-A, MACHINE-03.',
  'Código(s) de la(s) ubicación(es) desde donde se transfiere este componente hacia la planta (LOCFR). Ej: PROV-01, PROV-02 si llega desde dos orígenes distintos.':
    'Code(s) of the origin location(s) from which this component is transferred to the plant (LOCFR). E.g.: PROV-01, PROV-02 if it arrives from two different origins.',
  'Códigos de las fuentes de producción (SOURCEIDs) donde este producto es el output. Ej: SRC-001, SRC-002.':
    'Codes of the production sources (SOURCEIDs) where this product is the output. E.g.: SRC-001, SRC-002.',
  'Códigos de las plantas (LOCID) donde este recurso está configurado en Resource Location. Ej: P001, P002.':
    'Codes of the plants (LOCID) where this resource is configured in Resource Location. E.g.: P001, P002.',
  'Códigos de las plantas de producción (LOCID) donde tiene PSH asociado. Ej: P001, P002.':
    'Codes of the production plants (LOCID) where it has an associated PSH. E.g.: P001, P002.',
  'Códigos de las plantas destino abastecidas. Ej: P001, P002.':
    'Codes of the destination plants supplied. E.g.: P001, P002.',
  'Códigos de las plantas donde este producto aparece como componente PSI. Ej: P001, P002.':
    'Codes of the plants where this product appears as a PSI component. E.g.: P001, P002.',
  'Códigos de las plantas donde este recurso tiene Resource Location configurado. Ej: P001, P002.':
    'Codes of the plants where this resource has Resource Location configured. E.g.: P001, P002.',
  'Códigos de las plantas que sí tienen arco de abastecimiento para este producto. Ej: P001, P002.':
    'Codes of plants that do have a supply arc for this product. E.g.: P001, P002.',
  'Códigos de las plantas sin cobertura de abastecimiento. Ej: P003.':
    'Codes of plants without supply coverage. E.g.: P003.',
  'Códigos de las ubicaciones destino de transferencia. Ej: DC-SUR, DC-ESTE.':
    'Codes of transfer destination locations. E.g.: DC-SOUTH, DC-EAST.',
  'Códigos de las ubicaciones origen (LOCFR) que proveen este producto. Ej: PROV-01, PROV-02.':
    'Codes of the origin locations (LOCFR) that supply this product. E.g.: PROV-01, PROV-02.',
  'Códigos de las ubicaciones origen que abastecen a esta ubicación. Ej: P001, PROV-01.':
    'Codes of the origin locations that supply this location. E.g.: P001, PROV-01.',
  'Códigos de los SOURCEIDs a los que está asignado este recurso. Ej: SRC-001, SRC-002.':
    'Codes of the SOURCEIDs to which this resource is assigned. E.g.: SRC-001, SRC-002.',
  'Códigos de los SOURCEIDs con BOM vacío (sin PSI). Ej: SRC-003.':
    'Codes of the SOURCEIDs with empty BOM (no PSI). E.g.: SRC-003.',
  'Códigos de los SOURCEIDs con PLEADTIME faltante o cero en esta planta. Ej: SRC-001.':
    'Codes of the SOURCEIDs with missing or zero PLEADTIME at this plant. E.g.: SRC-001.',
  'Códigos de los SOURCEIDs de producción de esta planta. Ej: SRC-001, SRC-002.':
    'Codes of this plant’s production SOURCEIDs. E.g.: SRC-001, SRC-002.',
  'Códigos de los SOURCEIDs donde productos de este tipo excluido aparecen como componente en un BOM. Ej: SRC-001, SRC-005.':
    'Codes of the SOURCEIDs where products of this excluded type appear as a component in a BOM. E.g.: SRC-001, SRC-005.',
  'Códigos de los SOURCEIDs sin recursos PSR asignados. Ej: SRC-002.':
    'Codes of the SOURCEIDs without PSR resources assigned. E.g.: SRC-002.',
  'Códigos de los insumos externos sin cobertura de abastecimiento hacia esta planta. Ej: MAT-A, MAT-B.':
    'Codes of the external inputs without supply coverage to this plant. E.g.: MAT-A, MAT-B.',
  'Códigos de los nodos origen del componente hacia esta planta. Ej: PROV-01, PROV-02.':
    'Codes of the component’s origin nodes toward this plant. E.g.: PROV-01, PROV-02.',
  'Códigos de los nodos origen del producto en la red. Ej: PROV-01, P002.':
    'Codes of the product’s network origin nodes. E.g.: PROV-01, P002.',
  'Códigos de los productos abastecidos desde esta ubicación. Ej: MAT-A, MAT-B.':
    'Codes of the products supplied from this location. E.g.: MAT-A, MAT-B.',
  'Códigos de los productos enviados sin consumo PSI en la planta destino. Ej: MAT-X.':
    'Codes of products shipped without PSI consumption at the destination plant. E.g.: MAT-X.',
  'Códigos de los productos fabricados en esta planta. Ej: PROD-001, PROD-002.':
    'Codes of the products manufactured at this plant. E.g.: PROD-001, PROD-002.',
  'Códigos de los productos fabricados por las fuentes donde participa este recurso. Ej: PROD-001, PROD-002.':
    'Codes of the products manufactured by the sources where this resource participates. E.g.: PROD-001, PROD-002.',
  'Códigos de los productos recibidos en esta ubicación. Ej: PROD-001, MAT-A.':
    'Codes of the products received at this location. E.g.: PROD-001, MAT-A.',
  'Códigos de los productos sin Location Product en la planta destino. Ej: MAT-Y.':
    'Codes of the products without Location Product at the destination plant. E.g.: MAT-Y.',
  'Códigos de los productos transferidos sin consumo productivo en destino. Ej: PROD-001.':
    'Codes of products transferred without productive consumption at destination. E.g.: PROD-001.',
  'Códigos de los recursos (RESID) asignados a esta fuente de producción. Ej: LINEA-01, HORNO-A.':
    'Codes of the resources (RESID) assigned to this production source. E.g.: LINEA-01, OVEN-A.',
  'Códigos de los recursos (RESID) asignados a sus fuentes de producción. Ej: LINEA-01, HORNO-A.':
    'Codes of the resources (RESID) assigned to its production sources. E.g.: LINEA-01, OVEN-A.',
  'Códigos de los recursos activos en algún PSR de esta planta. Ej: LINEA-01, LINEA-02, HORNO-A.':
    'Codes of resources active in some PSR at this plant. E.g.: LINEA-01, LINEA-02, OVEN-A.',
  'Códigos de los recursos asignados a esta planta en Resource Location. Ej: LINEA-01, HORNO-A.':
    'Codes of resources assigned to this plant in Resource Location. E.g.: LINEA-01, OVEN-A.',
  'Códigos de los recursos ociosos (en Resource Location sin uso en PSR). Ej: HORNO-B.':
    'Codes of idle resources (in Resource Location without use in PSR). E.g.: OVEN-B.',
  'Descripción de la planta de fabricación. Ej: "Planta Santiago".':
    'Manufacturing plant description. E.g.: "Santiago Plant".',
  'Descripción de la planta de producción. Ej: "Planta Santiago".':
    'Production plant description. E.g.: "Santiago Plant".',
  'Descripción de la planta del maestro de ubicaciones. Ej: "Planta Santiago".':
    'Plant description from the location master. E.g.: "Santiago Plant".',
  'Descripción de la planta. Ej: "Planta Santiago".':
    'Plant description. E.g.: "Santiago Plant".',
  'Descripción de la ubicación del maestro de ubicaciones. Ej: "Planta Santiago", "Centro Distribución Norte".':
    'Location description from the location master. E.g.: "Santiago Plant", "North Distribution Center".',
  'Descripción del componente del maestro de materiales. Ej: "Aceite crudo a granel".':
    'Component description from the material master. E.g.: "Bulk crude oil".',
  'Descripción del producto output. Ej: "Aceite refinado 1L".':
    'Output product description. E.g.: "Refined oil 1L".',
  'Descripción del producto según el maestro de materiales. Ej: "Aceite refinado 1L".':
    'Product description from the material master. E.g.: "Refined oil 1L".',
  'Descripción del recurso del maestro de recursos. Ej: "Línea de envasado 1", "Horno túnel A".':
    'Resource description from the resource master. E.g.: "Packaging Line 1", "Tunnel Oven A".',
  'Descripción del recurso del maestro de recursos. Ej: "Línea de envasado 1".':
    'Resource description from the resource master. E.g.: "Packaging Line 1".',
  'Descripción(es) de la(s) ubicación(es) origen del componente. Ej: "Proveedor Nacional 01".':
    'Description(s) of the component’s origin location(s). E.g.: "National Supplier 01".',
  'Detalle de cada validación. Ej 🔴: "2 SOURCEID(s) sin PSI | 1 componente sin arco de abastecimiento". Ej ✅: "BOMs con PSI, PSR y lead time | Sin componentes descubiertos".':
    'Detail of each validation. E.g. 🔴: "2 SOURCEID(s) without PSI | 1 component without supply arc". E.g. ✅: "BOMs with PSI, PSR and lead time | No uncovered components".',
  'Detalle de cada validación. Si hay hallazgos, describe el problema concreto. Si el estado es OK, lista las validaciones que pasaron. Ej OK: "Habilitado en Location Product | Con PSH, PSI y PSR | Lead time definido en todos los SOURCEIDs".':
    'Detail of each validation. If there are findings, describes the concrete issue. If status is OK, lists the validations that passed. E.g. OK: "Enabled in Location Product | With PSH, PSI and PSR | Lead time defined in all SOURCEIDs".',
  'Detalle de hallazgos. Ej 🔴: "BOM vacío: sin componentes PSI | PLEADTIME = 0 o no definido". Ej 🟡: "Múltiples SOURCEIDs para mismo PRDID+LOCID — verificar cuotas". Ej ✅: "BOM con PSI | Lead time definido | Habilitado en LP | SOURCETYPE=P presente | Recursos PSR asignados".':
    'Findings detail. E.g. 🔴: "Empty BOM: no PSI components | PLEADTIME = 0 or undefined". E.g. 🟡: "Multiple SOURCEIDs for same PRDID+LOCID — verify quotas". E.g. ✅: "BOM with PSI | Lead time defined | Enabled in LP | SOURCETYPE=P present | PSR resources assigned".',
  'Detalle de hallazgos. Ej 🔴: "Coeficiente = 0 o no definido | Insumo sin arco de abastecimiento en Location Source". Ej ✅: "SOURCEID válido | Coeficiente definido | Con arco de abastecimiento | Habilitado en Location Product".':
    'Findings detail. E.g. 🔴: "Coefficient = 0 or undefined | Input without supply arc in Location Source". E.g. ✅: "Valid SOURCEID | Coefficient defined | Has supply arc | Enabled in Location Product".',
  'Detalle de la validación. Ej ✅: "Recurso LINEA-01 asignado en Resource Location para planta P001 | Asociado a SOURCEID SRC-001". Ej 🟡: "Recurso en producción sin asignación en Resource Location para planta P001" — el recurso opera en una receta de P001 pero no figura en el maestro de esa planta.':
    'Validation detail. E.g. ✅: "Resource LINEA-01 assigned in Resource Location for plant P001 | Linked to SOURCEID SRC-001". E.g. 🟡: "Resource in production without assignment in Resource Location for plant P001" — the resource operates in a P001 recipe but is not in that plant’s master.',
  'Detalle de la validación. Ej ✅: "Recurso activo en PSR para esta planta". Ej 🟡: "Recurso asignado a planta pero sin uso en PSR para esta planta" — significa que está en el maestro pero IBP nunca lo considera en esa planta.':
    'Validation detail. E.g. ✅: "Resource active in PSR for this plant". E.g. 🟡: "Resource assigned to plant but not used in PSR for this plant" — means it is in the master but IBP never considers it at that plant.',
  'Detalle de la validación. Ej 🔴: "Recurso huérfano: sin uso en producción ni planta asignada". Ej 🟡: "Sin uso en producción (no aparece en PSR)". Ej ✅: "En uso en PSR y con planta asignada en Resource Location".':
    'Validation detail. E.g. 🔴: "Orphan resource: no use in production nor plant assigned". E.g. 🟡: "No use in production (does not appear in PSR)". E.g. ✅: "In use in PSR and with plant assigned in Resource Location".',
  'Detalle: indica si el tipo aparece como componente en BOMs activos y si hay gaps de abastecimiento detectados. Ej: "Excluido del análisis principal. Validado como componente en 12 fuente(s). ⚠️ 3 combinación(es) componente-planta sin arco de abastecimiento".':
    'Detail: indicates whether the type appears as a component in active BOMs and whether supply gaps were detected. E.g.: "Excluded from main analysis. Validated as a component in 12 source(s). ⚠️ 3 component-plant combination(s) without supply arc".',
  'Fuente de producción (SOURCEID) a la que está asignado este recurso. Ej: SRC-001.':
    'Production source (SOURCEID) to which this resource is assigned. E.g.: SRC-001.',
  'Fuente de producción (SOURCEID) a la que pertenece este componente. Ej: SRC-001 = este componente es ingrediente de la receta SRC-001.':
    'Production source (SOURCEID) this component belongs to. E.g.: SRC-001 = this component is an ingredient of recipe SRC-001.',
  'Identificador único de la fuente de producción (SOURCEID) en SAP IBP. Ej: SRC-001.':
    'Unique production source identifier (SOURCEID) in SAP IBP. E.g.: SRC-001.',
  'Lead time de producción en días. Indica cuánto tarda el proceso desde que se lanza la orden hasta tener el producto listo. PLEADTIME = 0 o vacío hace que IBP planifique como producción instantánea → 🔴. Ej: 5 = 5 días de fabricación.':
    'Production lead time in days. Indicates how long the process takes from order release until the product is ready. PLEADTIME = 0 or empty makes IBP plan as instantaneous production → 🔴. E.g.: 5 = 5 manufacturing days.',
  'Nombre de la hoja analizada.': 'Name of the analyzed sheet.',
  'Número de SOURCEIDs de esta planta con PLEADTIME = 0 o no definido. Un lead time cero hace que IBP planifique como si la producción fuera instantánea. Ej: SRC-001 con PLEADTIME=0 → 🔴.':
    'Number of this plant’s SOURCEIDs with PLEADTIME = 0 or undefined. A zero lead time makes IBP plan as if production were instantaneous. E.g.: SRC-001 with PLEADTIME=0 → 🔴.',
  'Número de SOURCEIDs de esta planta que no tienen ningún componente PSI definido (BOMs vacíos). Un BOM vacío impide planificar la compra de insumos. Ej: SRC-003 sin PSI → 🔴.':
    'Number of this plant’s SOURCEIDs with no PSI component defined (empty BOMs). An empty BOM prevents planning input purchases. E.g.: SRC-003 without PSI → 🔴.',
  'Número de SOURCEIDs de esta planta que no tienen ningún recurso PSR asignado. Sin recurso, IBP no puede planificar capacidad. Ej: SRC-002 sin PSR → 🔴.':
    'Number of this plant’s SOURCEIDs with no PSR resource assigned. Without a resource, IBP cannot plan capacity. E.g.: SRC-002 without PSR → 🔴.',
  'Número de combinaciones componente-planta (de este tipo excluido) con arco de abastecimiento configurado en Location Source. Ej: 8 = 8 pares producto-planta tienen ruta de abastecimiento.':
    'Number of component-plant combinations (of this excluded type) with a supply arc configured in Location Source. E.g.: 8 = 8 product-plant pairs have a supply route.',
  'Número de combinaciones componente-planta SIN arco de abastecimiento. Si > 0, hay insumos de tipo excluido sin ruta de llegada a la planta que los consume. Ej: 3 = 3 pares sin cobertura → 🟡 aunque el tipo esté excluido del análisis principal.':
    'Number of component-plant combinations WITHOUT supply arc. If > 0, there are excluded-type inputs without a route to the plant that consumes them. E.g.: 3 = 3 pairs without coverage → 🟡 even if the type is excluded from the main analysis.',
  'Número de componentes (PSI) definidos en el BOM de esta receta. 0 = BOM vacío → IBP no planifica compra de insumos. Ej: 4 = esta receta requiere 4 ingredientes.':
    'Number of components (PSI) defined in this recipe’s BOM. 0 = empty BOM → IBP does not plan input purchases. E.g.: 4 = this recipe requires 4 ingredients.',
  'Número de componentes PSI marcados como material de reemplazo alternativo (ISALTITEM=X). Ej: 1 = MAT-A-PREMIUM puede reemplazar a MAT-A en esta receta.':
    'Number of PSI components flagged as alternative replacement materials (ISALTITEM=X). E.g.: 1 = MAT-A-PREMIUM can replace MAT-A in this recipe.',
  'Número de fuentes de producción (SOURCEIDs) a las que está asignado vía PSR. Ej: 3 = participa en SRC-001, SRC-002, SRC-003.':
    'Number of production sources (SOURCEIDs) to which it is assigned via PSR. E.g.: 3 = participates in SRC-001, SRC-002, SRC-003.',
  'Número de fuentes de producción (SOURCEIDs) asociadas a esta planta. Ej: 3 = SRC-001, SRC-002, SRC-003.':
    'Number of production sources (SOURCEIDs) associated with this plant. E.g.: 3 = SRC-001, SRC-002, SRC-003.',
  'Número de fuentes de producción (SOURCEIDs) que usan productos de este tipo como componente PSI. Aunque estén excluidos del análisis principal, se valida su presencia como insumo. Ej: 12 = 12 recetas distintas usan un VERP como ingrediente.':
    'Number of production sources (SOURCEIDs) that use products of this type as a PSI component. Even when excluded from main analysis, their presence as input is validated. E.g.: 12 = 12 distinct recipes use a VERP as ingredient.',
  'Número de hoja en el libro.': 'Sheet number in the workbook.',
  'Número de insumos externos de esta planta que no tienen arco de abastecimiento en Location Source. Ej: 2 = MAT-A y MAT-B se requieren en P001 pero no hay Location Source que los lleve ahí → 🔴.':
    'Number of this plant’s external inputs without a supply arc in Location Source. E.g.: 2 = MAT-A and MAT-B are required at P001 but no Location Source brings them there → 🔴.',
  'Número de nodos origen distintos desde los que este producto puede ser recibido en la red. Ej: 2 = puede llegar desde PROV-01 o desde P002.':
    'Number of distinct origin nodes from which this product can be received in the network. E.g.: 2 = can arrive from PROV-01 or from P002.',
  'Número de nodos origen distintos que abastecen este componente hacia esta planta. Ej: 2 = llega desde PROV-01 y PROV-02 (doble fuente, mayor resiliencia).':
    'Number of distinct origin nodes that supply this component to this plant. E.g.: 2 = arrives from PROV-01 and PROV-02 (dual source, higher resilience).',
  'Número de plantas consumidoras SIN arco de abastecimiento configurado para este producto. Si > 0: falta configurar Location Source. Ej: P003 consume MAT-A pero no tiene arco desde ningún proveedor → 🔴.':
    'Number of consuming plants WITHOUT supply arc configured for this product. If > 0: Location Source needs to be set up. E.g.: P003 consumes MAT-A but has no arc from any supplier → 🔴.',
  'Número de plantas consumidoras que tienen arco de abastecimiento configurado para este producto. Ej: 2 de 3 plantas cubiertas = OK.':
    'Number of consuming plants with supply arc configured for this product. E.g.: 2 of 3 plants covered = OK.',
  'Número de plantas destino a las que esta ubicación envía productos. Ej: 2 = abastece a P001 y P002.':
    'Number of destination plants to which this location ships products. E.g.: 2 = supplies P001 and P002.',
  'Número de plantas distintas donde este recurso tiene configuración en Resource Location. Ej: 2 = LINEA-01 opera en P001 y P002.':
    'Number of distinct plants where this resource is configured in Resource Location. E.g.: 2 = LINEA-01 operates at P001 and P002.',
  'Número de plantas distintas donde se fabrica este producto. Ej: 3 = se produce en P001, P002 y P003.':
    'Number of distinct plants where this product is manufactured. E.g.: 3 = produced at P001, P002 and P003.',
  'Número de plantas donde este producto es consumido como ingrediente en algún BOM. Ej: 2 = se usa como componente en P001 y P002.':
    'Number of plants where this product is consumed as an ingredient in some BOM. E.g.: 2 = used as component at P001 and P002.',
  'Número de plantas donde este recurso tiene configuración en Resource Location. Ej: 2 = LINEA-01 tiene Resource Location en P001 y P002.':
    'Number of plants where this resource has configuration in Resource Location. E.g.: 2 = LINEA-01 has Resource Location at P001 and P002.',
  'Número de productos del maestro que tienen este tipo de material. Ej: 45 = hay 45 productos de tipo VERP.':
    'Number of master-data products with this material type. E.g.: 45 = there are 45 products of type VERP.',
  'Número de productos distintos que esta ubicación envía como origen en Location Source hacia plantas que los consumen como PSI. Ej: 3 = PROV-01 abastece MAT-A, MAT-B, MAT-C.':
    'Number of distinct products this location ships as origin in Location Source to plants that consume them as PSI. E.g.: 3 = PROV-01 supplies MAT-A, MAT-B, MAT-C.',
  'Número de productos distintos que fabrica a través de sus SOURCEIDs. Ej: 2 = HORNO-A produce PROD-001 y PROD-002.':
    'Number of distinct products manufactured through its SOURCEIDs. E.g.: 2 = OVEN-A produces PROD-001 and PROD-002.',
  'Número de productos distintos que se fabrican en esta planta (tienen PSH con este LOCID como planta). Ej: 5 = fabrica PROD-001, PROD-002, PROD-003, SEMI-A, SEMI-B.':
    'Number of distinct products manufactured at this plant (have a PSH with this LOCID as plant). E.g.: 5 = manufactures PROD-001, PROD-002, PROD-003, SEMI-A, SEMI-B.',
  'Número de productos que esta ubicación recibe como destino en Location Source. Ej: 4 = recibe PROD-001, PROD-002, MAT-A, MAT-B.':
    'Number of products this location receives as destination in Location Source. E.g.: 4 = receives PROD-001, PROD-002, MAT-A, MAT-B.',
  'Número de productos que esta ubicación reenvía vía Location Source sin que sean consumidos como PSI en el destino. Ej: DC-NORTE transfiere PROD-001 a DC-SUR sin que DC-SUR lo use como insumo productivo.':
    'Number of products this location forwards via Location Source without them being consumed as PSI at the destination. E.g.: DC-NORTH transfers PROD-001 to DC-SOUTH without DC-SOUTH using it as productive input.',
  'Número de recursos (máquinas/líneas) con Resource Location configurado en esta planta. Ej: 4 = LINEA-01, LINEA-02, HORNO-A, HORNO-B.':
    'Number of resources (machines/lines) with Resource Location configured at this plant. E.g.: 4 = LINEA-01, LINEA-02, OVEN-A, OVEN-B.',
  'Número de recursos asignados que aparecen en al menos un PSR activo en esta planta. Ej: 3 de 4 asignados están activos.':
    'Number of assigned resources that appear in at least one active PSR at this plant. E.g.: 3 of 4 assigned are active.',
  'Número de recursos productivos (máquinas/líneas) asignados a esta receta vía PSR. 0 = sin capacidad modelada. Ej: 2 = LINEA-01 y HORNO-A.':
    'Number of production resources (machines/lines) assigned to this recipe via PSR. 0 = no capacity modeled. E.g.: 2 = LINEA-01 and OVEN-A.',
  'Número de recursos productivos (máquinas/líneas) asignados a sus recetas vía PSR. Ej: 2 = LINEA-01 y HORNO-A.':
    'Number of production resources (machines/lines) assigned to its recipes via PSR. E.g.: 2 = LINEA-01 and OVEN-A.',
  'Número de ubicaciones destino hacia las que esta ubicación transfiere productos. Ej: 2 = reenvía a DC-SUR y DC-ESTE.':
    'Number of destination locations to which this location transfers products. E.g.: 2 = forwards to DC-SOUTH and DC-EAST.',
  'Número de ubicaciones origen distintas desde las que recibe productos. Ej: 3 = recibe desde P001, P002 y PROV-01.':
    'Number of distinct origin locations from which it receives products. E.g.: 3 = receives from P001, P002 and PROV-01.',
  'Número de ubicaciones origen que abastecen este producto como insumo vía Location Source. Ej: 2 = llega desde PROV-01 y PROV-02.':
    'Number of origin locations that supply this product as input via Location Source. E.g.: 2 = arrives from PROV-01 and PROV-02.',
  'Planta donde opera esta fuente de producción (LOCID). Ej: P001.':
    'Plant where this production source operates (LOCID). E.g.: P001.',
  'Planta donde se fabrica el producto output (LOCID). Ej: P001.':
    'Plant where the output product is manufactured (LOCID). E.g.: P001.',
  'Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100. Ej: 85 de 100 productos OK = 85%.':
    'Percentage of OK records over total. Formula: OK / Total × 100. E.g.: 85 of 100 products OK = 85%.',
  'Productos que se envían a una planta destino donde no tienen Location Product habilitado. IBP no puede planificarlos en esa planta. Ej: MAT-Y llega a P002 pero no tiene Location Product en P002 → 🔴.':
    'Products shipped to a destination plant where they have no Location Product enabled. IBP cannot plan them at that plant. E.g.: MAT-Y arrives at P002 but has no Location Product at P002 → 🔴.',
  'Productos que se envían desde aquí pero no se consumen como componente PSI en la planta destino. Puede indicar arcos configurados de más o sin uso real. Ej: MAT-X se envía a P001 pero ningún BOM de P001 lo usa → 🟡.':
    'Products shipped from here but not consumed as PSI component at the destination plant. May indicate over-configured or unused arcs. E.g.: MAT-X is shipped to P001 but no BOM at P001 uses it → 🟡.',
  'Proporción de producción asignada a esta fuente cuando existen múltiples SOURCEIDs para el mismo PRDID+LOCID. IBP usa PRATIO para distribuir la demanda planificada entre fuentes. Ej: 0.6 = esta fuente cubre el 60% de la demanda. Vacío = fuente única o sin cuota definida.':
    'Production share assigned to this source when multiple SOURCEIDs exist for the same PRDID+LOCID. IBP uses PRATIO to distribute planned demand across sources. E.g.: 0.6 = this source covers 60% of demand. Empty = single source or no quota defined.',
  'Recursos que están en Resource Location para esta planta pero no aparecen en ningún PSR. Posible configuración huérfana. Ej: HORNO-B asignado a P001 pero sin ninguna receta que lo use → 🟡.':
    'Resources that are in Resource Location for this plant but appear in no PSR. Possible orphan configuration. E.g.: OVEN-B assigned to P001 but no recipe uses it → 🟡.',
  'Registros con dato incompleto o sospechoso que conviene revisar. Ej: recurso sin Resource Location, arco sin consumo PSI en destino.':
    'Records with incomplete or suspicious data worth reviewing. E.g.: resource without Resource Location, arc without PSI consumption at destination.',
  'Registros con problema crítico que bloquea o distorsiona la planificación. Ej: producto sin PSH, BOM vacío, PLEADTIME = 0.':
    'Records with a critical issue that blocks or distorts planning. E.g.: product without PSH, empty BOM, PLEADTIME = 0.',
  'Registros sin hallazgos — todas las validaciones aplicables pasaron correctamente.':
    'Records with no findings — all applicable validations passed correctly.',
  'Rol(es) inferidos del comportamiento real en los datos (independiente del LOCTYPE). Posibles: Planta de producción = tiene PSH | Proveedor = abastece componentes PSI en destino | Nodo de transferencia = envía productos sin consumo PSI en destino | Nodo receptor = solo recibe vía Location Source | Nodo de recursos = tiene Resource Location pero sin producción ni transferencias | Sin actividad = existe en el maestro pero no aparece en ningún otro dato.':
    'Role(s) inferred from actual data behavior (independent of LOCTYPE). Possible: Production plant = has PSH | Supplier = supplies PSI components at destination | Transfer node = ships products without PSI consumption at destination | Receiver node = only receives via Location Source | Resource node = has Resource Location but no production or transfers | No activity = exists in master but does not appear in any other data.',
  'Semielaborado = el componente tiene PSH propio en esta planta y se fabrica antes de usarse (trazabilidad en PSH). Insumo = no se fabrica aquí, debe llegar desde un proveedor u otra planta vía Location Source. Ej: SEMI-B = Semielaborado | MAT-A = Insumo.':
    'Semi-finished = the component has its own PSH at this plant and is manufactured before use (traceable in PSH). Input = not manufactured here, must arrive from a supplier or another plant via Location Source. E.g.: SEMI-B = Semi-finished | MAT-A = Input.',
  'Si / No — ¿El componente está habilitado en Location Product para esta planta? Si No, IBP no puede planificar su consumo en esa planta. Ej: MAT-A en P001 = No → componente desconocido para IBP en esa planta → 🔴.':
    'Yes / No — Is the component enabled in Location Product for this plant? If No, IBP cannot plan its consumption at that plant. E.g.: MAT-A at P001 = No → component unknown to IBP at that plant → 🔴.',
  'Si / No — ¿El producto aparece como output principal (SOURCETYPE=P) en alguna fuente de producción (PSH)? Sin PSH no hay instrucciones de fabricación. Ej: PROD-001 con PSH en planta P001.':
    'Yes / No — Does the product appear as primary output (SOURCETYPE=P) in some production source (PSH)? Without PSH there are no manufacturing instructions. E.g.: PROD-001 with PSH at plant P001.',
  'Si / No — ¿El producto está registrado en al menos una ubicación en Location Product? Sin esto, IBP ignora el producto en la planificación. Ej: PROD-001 sin Location Product → no entra a ningún plan.':
    'Yes / No — Is the product registered in at least one location in Location Product? Without this, IBP ignores the product in planning. E.g.: PROD-001 without Location Product → does not enter any plan.',
  'Si / No — ¿Esta combinación RESID+LOCID aparece en al menos un PSR? Si No, el recurso está en el maestro de esa planta pero no participa en ninguna receta. Ej: HORNO-B en P002 = No → 🟡 configuración sin uso productivo.':
    'Yes / No — Does this RESID+LOCID combination appear in at least one PSR? If No, the resource is in that plant’s master but participates in no recipe. E.g.: OVEN-B at P002 = No → 🟡 configuration without productive use.',
  'Si / No — ¿Esta fuente tiene al menos un recurso asignado en Prod Source Resource? Si No, IBP no puede planificar la capacidad de esta receta. Ej: SRC-003 = No → sin restricción de capacidad modelada → 🔴.':
    'Yes / No — Does this source have at least one resource assigned in Prod Source Resource? If No, IBP cannot plan this recipe’s capacity. E.g.: SRC-003 = No → no capacity constraint modeled → 🔴.',
  'Si / No — ¿Este producto es usado como ingrediente en el BOM de algún otro producto (PSI)? Ej: MAT-A = Sí porque es componente en el BOM de PROD-001.':
    'Yes / No — Is this product used as an ingredient in another product’s BOM (PSI)? E.g.: MAT-A = Yes because it is a component in PROD-001’s BOM.',
  'Si / No — ¿Este producto tiene al menos un arco de transferencia configurado en Location Source? Ej: MAT-A = Sí porque se transfiere de PROV-01 a P001.':
    'Yes / No — Does this product have at least one transfer arc configured in Location Source? E.g.: MAT-A = Yes because it is transferred from PROV-01 to P001.',
  'Si / No — ¿Este recurso está asignado a al menos una fuente de producción en PSR? Si No, IBP no lo usa para planificar capacidad. Ej: HORNO-B = No → nunca se considera en ninguna receta.':
    'Yes / No — Is this resource assigned to at least one production source in PSR? If No, IBP does not use it to plan capacity. E.g.: OVEN-B = No → never considered in any recipe.',
  'Si / No — ¿Este recurso tiene al menos una planta configurada en Resource Location? Si No, IBP no sabe dónde opera físicamente. Ej: LINEA-01 = No → recurso sin ubicación conocida → 🟡.':
    'Yes / No — Does this resource have at least one plant configured in Resource Location? If No, IBP does not know where it physically operates. E.g.: LINEA-01 = No → resource without known location → 🟡.',
  'Si / No — ¿Hay al menos un arco en Location Source que traiga este insumo a esta planta? Muestra N/A para semielaborados (se producen localmente, no se transfieren). Ej: MAT-A en P001 = No → no hay ruta de abastecimiento configurada → 🔴.':
    'Yes / No — Is there at least one arc in Location Source bringing this input to this plant? Shows N/A for semi-finished items (produced locally, not transferred). E.g.: MAT-A at P001 = No → no supply route configured → 🔴.',
  'Si / No — ¿La combinación PRDID+LOCID está habilitada en Location Product? Sin esto, IBP no planifica este producto en esta planta aunque exista la receta. Ej: PROD-001 en P001 = No → receta sin efecto.':
    'Yes / No — Is the PRDID+LOCID combination enabled in Location Product? Without this, IBP does not plan this product at this plant even if the recipe exists. E.g.: PROD-001 at P001 = No → recipe with no effect.',
  'Si / No — ¿La combinación RESID+LOCID aparece en Resource Location? Si No, el recurso está en la receta pero IBP no lo reconoce como ubicado en esa planta. Ej: LINEA-01 en P001 = No → 🟡 inconsistencia entre PSR y Resource Location.':
    'Yes / No — Does the RESID+LOCID combination appear in Resource Location? If No, the resource is in the recipe but IBP does not recognize it as located at that plant. E.g.: LINEA-01 at P001 = No → 🟡 inconsistency between PSR and Resource Location.',
  'Tipo de material SAP asignado a este producto (MATTYPEID). Determina qué validaciones aplican. Ej: FERT = producto terminado, HALB = semielaborado, ROH = materia prima.':
    'SAP material type assigned to this product (MATTYPEID). Determines which validations apply. E.g.: FERT = finished product, HALB = semi-finished, ROH = raw material.',
  'Tipo de material del componente. Ej: ROH = materia prima, HALB = semielaborado.':
    'Component material type. E.g.: ROH = raw material, HALB = semi-finished.',
  'Tipo de material del producto output. Ej: FERT = terminado, HALB = semielaborado.':
    'Output product material type. E.g.: FERT = finished, HALB = semi-finished.',
  'Tipo de material del producto output. Ej: FERT.':
    'Output product material type. E.g.: FERT.',
  'Tipo de ubicación según el campo LOCTYPE de SAP IBP. Ej: 1010 = planta, 1020 = centro distribución. Campo informativo, el rol real se infiere del comportamiento en los datos.':
    'Location type per SAP IBP’s LOCTYPE field. E.g.: 1010 = plant, 1020 = distribution center. Informational field; the real role is inferred from data behavior.',
  'Tipo(s) de fuente en esta receta: P = producción primaria (el output principal) | C = co-producto (se obtiene en el mismo proceso). Ej: P/C = esta receta produce PROD-001 como primario y SEMI-X como co-producto.':
    'Source type(s) in this recipe: P = primary production (the main output) | C = co-product (obtained in the same process). E.g.: P/C = this recipe produces PROD-001 as primary and SEMI-X as co-product.',
  'Total de componentes PSI definidos en todos sus BOMs. Ej: 5 = la suma de ingredientes en todas sus recetas de producción es 5.':
    'Total PSI components defined across all its BOMs. E.g.: 5 = the sum of ingredients across all its production recipes is 5.',
  'Total de componentes de tipo insumo (no semielaborados) requeridos por los BOMs de esta planta. Ej: 8 = suma de ingredientes externos en todas las recetas de P001.':
    'Total input-type components (not semi-finished) required by this plant’s BOMs. E.g.: 8 = sum of external ingredients across all P001 recipes.',
  'Total de filas procesadas en esa hoja. Ej: 350 = se analizaron 350 productos.':
    'Total rows processed in that sheet. E.g.: 350 = 350 products were analyzed.',
  'Unidades del componente consumidas por cada unidad del producto terminado. Si = 0, IBP no planifica la compra de este insumo. Ej: 2.5 = se consumen 2.5 kg de MAT-A por cada unidad de PROD-001 fabricada.':
    'Component units consumed per unit of finished product. If = 0, IBP does not plan the purchase of this input. E.g.: 2.5 = 2.5 kg of MAT-A are consumed per unit of PROD-001 manufactured.',
  'Unidades del producto terminado que se obtienen por corrida de producción. Afecta directamente el cálculo de cuántas corridas se necesitan. Ej: 100 = cada corrida produce 100 unidades.':
    'Units of finished product obtained per production run. Directly affects the calculation of how many runs are needed. E.g.: 100 = each run produces 100 units.',
  'X = este componente es un material de reemplazo alternativo (ISALTITEM=X). Vacío = componente principal. Ej: MAT-A-PREMIUM con X = puede sustituir a MAT-A cuando no hay stock.':
    'X = this component is an alternative replacement material (ISALTITEM=X). Empty = primary component. E.g.: MAT-A-PREMIUM with X = can substitute MAT-A when out of stock.'
};
function _xnPA(s) {
  return (window.I18n && I18n.getLang() === 'en' && _XLS_PA_NOTES_EN[s]) ? _XLS_PA_NOTES_EN[s] : s;
}

async function doProductionAnalysis() {
  var logEl   = document.getElementById('logPA');
  var progEl  = document.getElementById('progFillPA');
  logEl.innerHTML = '';
  logEl.classList.add('hidden');
  document.getElementById('progBarPA').classList.remove('hidden');
  document.getElementById('progStatusPA').style.cssText =
    'display:flex;font-size:12px;color:var(--text2);margin-top:4px;align-items:center;gap:8px;';
  document.getElementById('btnFetchPA').disabled = true;
  document.getElementById('paSuccessBanner').classList.add('hidden');
  var timer = createTimer();

  function setStatusPA(msg, pct) {
    var el = document.getElementById('progStatusTextPA');
    if (el) { el.style.color = ''; el.textContent = msg; }
    if (pct !== undefined) progEl.style.width = pct + '%';
  }

  var ent = {
    psh:    document.getElementById('selPAHeader').value,
    psi:    document.getElementById('selPAItem').value,
    psiSub: document.getElementById('selPAItemSub').value,
    psr:    document.getElementById('selPAResource').value,
    prd:    document.getElementById('selPAProduct').value,
    loc:    document.getElementById('selPALocMaster').value,
    res:    document.getElementById('selPAResMaster').value,
    locPrd: document.getElementById('selPALocProd').value,
    locSrc: document.getElementById('selPALocSrc').value,
    resLoc: document.getElementById('selPAResLoc').value
  };

  if (!ent.psh) {
    log(logEl, 'err', timer.fmt() + ' ' + I18n.t('xls.log.configureHeader'));
    document.getElementById('btnFetchPA').disabled = false;
    return;
  }

  var baseOData = CFG.url + '/sap/opu/odata/IBP/' + CFG.service + '/';
  var paFilter  = CFG.pa
    ? (CFG.pver
      ? "PlanningAreaID eq '" + CFG.pa + "' and VersionID eq '" + CFG.pver + "'"
      : "PlanningAreaID eq '" + CFG.pa + "'")
    : '';
  var andF = function(b, c) { return b ? b + ' and ' + c : c; };
  var fPsh    = paFilter;
  var fLoc    = paFilter;
  var fLocSrc = paFilter;

  var PA_EXEC_META = { generatedAt: new Date(), paFilter: paFilter, entities: [] };

  var PA_PRD = {}, PA_LOC = {}, PA_RES = {}, PA_RES_LOC = {};
  var pshBySid = {}, pshPrdSet = {};

  if (typeof validateEntityFields === 'function') {
    var _paChecks = [
      { role: 'Production Source Header',   entityName: ent.psh,    required: true,  selectorId: 'selPAHeader',  fields: ['PRDID','SOURCEID','LOCID','SOURCETYPE','PLEADTIME','OUTPUTCOEFFICIENT','PRATIO','PINVALID'] },
      { role: 'Production Source Item',     entityName: ent.psi,    required: true,  selectorId: 'selPAItem',    fields: ['SOURCEID','PRDID','COMPONENTCOEFFICIENT','ISALTITEM'] },
      { role: 'Production Source Item Sub', entityName: ent.psiSub, required: true,  selectorId: 'selPAItemSub', fields: ['SOURCEID','PRDFR','SPRDFR'] },
      { role: 'Location Source',            entityName: ent.locSrc, required: true,  selectorId: 'selPALocSrc',  fields: ['PRDID','LOCFR','LOCID','TLEADTIME','TINVALID'] },
    ];
    var _paResult = validateEntityFields(_paChecks);
    if (_paResult.issues.length) {
      document.getElementById('btnFetchPA').disabled = false;
      log(logEl, 'error', I18n.t('xls.log.pendingCorrections'));
      if (typeof toggleMappingBody === 'function') toggleMappingBody('bodyPAMDT', 'arrPAMDT', true);
      return;
    }
  }

  try {
    progEl.style.width = '0%';
    if (!IDB) IDB = await openDB();
    await Promise.all(['pa_psh','pa_psi','pa_psisub','pa_psr','pa_loc_prod','pa_loc_src'].map(idbClear));

    /* ── PHASE 1: Download entities (0 → 75%) ── */

    setStatusPA(I18n.t('xls.log.downloading', { entity: 'Production Source Header' }), 2);
    log(logEl, 'info', timer.fmt() + ' [GET] ' + baseOData + ent.psh);
    var nPsh = await fetchAndIndex(baseOData + ent.psh, logEl, fPsh,
      efGetSelect('pa', 'psh'),
      function(rows) {
        rows = rows.filter(function(r) { return r.PINVALID !== 'X'; });
        var _pshExtra = (typeof EF_SEL !== 'undefined') ? (EF_SEL['pa']['psh'] || []) : [];
        rows.forEach(function(r) {
          var sid = str(r.SOURCEID); if (!sid) return;
          if (!pshBySid[sid]) pshBySid[sid] = [];
          var _entry = {
            PRDID: str(r.PRDID), LOCID: str(r.LOCID),
            SOURCETYPE: str(r.SOURCETYPE),
            PLEADTIME: r.PLEADTIME != null ? str(r.PLEADTIME) : '',
            OUTPUTCOEFFICIENT: r.OUTPUTCOEFFICIENT != null ? str(r.OUTPUTCOEFFICIENT) : '',
            PRATIO: r.PRATIO != null ? str(r.PRATIO) : ''
          };
          _pshExtra.forEach(function(f) { if (r[f] != null) _entry[f] = str(r[f]); });
          pshBySid[sid].push(_entry);
          var p = str(r.PRDID); if (p) pshPrdSet[p] = true;
        });
        return idbBulkPut('pa_psh', rows);
      });
    log(logEl, 'ok', timer.fmt() + ' PSH: ' + nPsh + ' reg (' + Object.keys(pshBySid).length + ' SOURCEIDs)');
    PA_EXEC_META.entities.push({ name: 'Production Source Header', entityName: ent.psh, downloaded: nPsh, note: 'Excluye PINVALID=X' });
    progEl.style.width = '12%';

    if (ent.psi) {
      setStatusPA(I18n.t('xls.log.downloading', { entity: 'Production Source Item' }), 12);
      var nPsi = await fetchAndIndex(baseOData + ent.psi, logEl, paFilter,
        efGetSelect('pa', 'psi'),
        function(rows) {
          var validRows = rows.filter(function(r) { return !!pshBySid[str(r.SOURCEID)]; });
          return idbBulkPut('pa_psi', validRows);
        });
      log(logEl, 'ok', timer.fmt() + ' PSI: ' + nPsi + ' reg');
      PA_EXEC_META.entities.push({ name: 'Production Source Item', entityName: ent.psi, downloaded: nPsi, note: 'Solo SOURCEIDs activos en PSH' });
    }
    progEl.style.width = '18%';

    if (ent.psiSub) {
      setStatusPA(I18n.t('xls.log.downloading', { entity: 'Production Source Item Sub' }), 18);
      var nPsiSub = await fetchAndIndex(baseOData + ent.psiSub, logEl, paFilter,
        'SOURCEID,PRDFR,SPRDFR',
        function(rows) {
          var validRows = rows.filter(function(r) { return !!pshBySid[str(r.SOURCEID)]; });
          return idbBulkPut('pa_psisub', validRows);
        });
      log(logEl, 'ok', timer.fmt() + ' PSI Sub: ' + nPsiSub + ' reg');
      PA_EXEC_META.entities.push({ name: 'Production Source Item Sub', entityName: ent.psiSub, downloaded: nPsiSub, note: 'Solo SOURCEIDs activos en PSH' });
    }
    progEl.style.width = '22%';

    if (ent.psr) {
      setStatusPA(I18n.t('xls.log.downloading', { entity: 'Production Source Resource' }), 22);
      var nPsr = await fetchAndIndex(baseOData + ent.psr, logEl, paFilter,
        efGetSelect('pa', 'psr'),
        function(rows) {
          var validRows = rows.filter(function(r) { return !!pshBySid[str(r.SOURCEID)]; });
          return idbBulkPut('pa_psr', validRows);
        });
      log(logEl, 'ok', timer.fmt() + ' PSR: ' + nPsr + ' reg');
      PA_EXEC_META.entities.push({ name: 'Production Source Resource', entityName: ent.psr, downloaded: nPsr, note: 'Solo SOURCEIDs activos en PSH' });
    }
    progEl.style.width = '32%';

    if (ent.prd) {
      setStatusPA(I18n.t('xls.log.indexing', { entity: 'Product' }), 32);
      var nPrd = await fetchAndIndex(baseOData + ent.prd, logEl, paFilter,
        efGetSelect('pa', 'product'),
        function(rows) {
          rows.forEach(function(r) { var k = str(r.PRDID); if (k) PA_PRD[k] = r; });
          return Promise.resolve();
        });
      log(logEl, 'ok', timer.fmt() + ' Product: ' + nPrd + ' reg');
      PA_EXEC_META.entities.push({ name: 'Product', entityName: ent.prd, downloaded: nPrd });
    }
    progEl.style.width = '44%';

    if (ent.loc) {
      setStatusPA(I18n.t('xls.log.indexing', { entity: 'Location' }), 44);
      var nLoc = await fetchAndIndex(baseOData + ent.loc, logEl, fLoc,
        efGetSelect('pa', 'location'),
        function(rows) {
          rows = rows.filter(function(r) { return r.LOCVALID !== 'X'; });
          rows.forEach(function(r) { var k = str(r.LOCID); if (k) PA_LOC[k] = r; });
          return Promise.resolve();
        });
      log(logEl, 'ok', timer.fmt() + ' Location: ' + nLoc + ' reg');
      PA_EXEC_META.entities.push({ name: 'Location', entityName: ent.loc, downloaded: nLoc, note: 'Excluye LOCVALID=X' });
    }
    progEl.style.width = '54%';

    if (ent.res) {
      setStatusPA(I18n.t('xls.log.indexing', { entity: 'Resource' }), 54);
      var nRes = await fetchAndIndex(baseOData + ent.res, logEl, paFilter,
        efGetSelect('pa', 'resource'),
        function(rows) {
          rows.forEach(function(r) { var k = str(r.RESID); if (k) PA_RES[k] = r; });
          return Promise.resolve();
        });
      log(logEl, 'ok', timer.fmt() + ' Resource: ' + nRes + ' reg');
      PA_EXEC_META.entities.push({ name: 'Resource', entityName: ent.res, downloaded: nRes });
    }
    progEl.style.width = '60%';

    if (ent.resLoc) {
      setStatusPA(I18n.t('xls.log.indexing', { entity: 'Resource Location' }), 60);
      var nResLoc = await fetchAndIndex(baseOData + ent.resLoc, logEl, paFilter,
        efGetSelect('pa', 'resourceLocation'),
        function(rows) {
          var _rlExtra = (typeof EF_SEL !== 'undefined') ? (EF_SEL['pa']['resourceLocation'] || []) : [];
          rows.forEach(function(r) {
            var k = str(r.RESID); if (!k) return;
            if (!PA_RES_LOC[k]) PA_RES_LOC[k] = [];
            var _entry = { LOCID: str(r.LOCID || '') };
            _rlExtra.forEach(function(f) { if (r[f] != null) _entry[f] = str(r[f]); });
            PA_RES_LOC[k].push(_entry);
          });
          return Promise.resolve();
        });
      log(logEl, 'ok', timer.fmt() + ' Resource Location: ' + nResLoc + ' reg');
      PA_EXEC_META.entities.push({ name: 'Resource Location', entityName: ent.resLoc, downloaded: nResLoc });
    }
    progEl.style.width = '64%';

    if (ent.locPrd) {
      setStatusPA(I18n.t('xls.log.downloading', { entity: 'Location Product' }), 64);
      var nLp = await fetchAndIndex(baseOData + ent.locPrd, logEl, paFilter,
        'LOCID,PRDID',
        function(rows) { return idbBulkPut('pa_loc_prod', rows); });
      log(logEl, 'ok', timer.fmt() + ' Location Product: ' + nLp + ' reg');
      PA_EXEC_META.entities.push({ name: 'Location Product', entityName: ent.locPrd, downloaded: nLp });
    }
    progEl.style.width = '68%';

    if (ent.locSrc) {
      setStatusPA(I18n.t('xls.log.downloading', { entity: 'Location Source' }), 68);
      var nLs = await fetchAndIndex(baseOData + ent.locSrc, logEl, fLocSrc,
        'PRDID,LOCFR,LOCID,TLEADTIME,TINVALID',
        function(rows) {
          rows = rows.filter(function(r) { return r.TINVALID !== 'X'; });
          return idbBulkPut('pa_loc_src', rows);
        });
      log(logEl, 'ok', timer.fmt() + ' Location Source: ' + nLs + ' reg');
      PA_EXEC_META.entities.push({ name: 'Location Source', entityName: ent.locSrc, downloaded: nLs, note: 'Excluye TINVALID=X' });
    }
    progEl.style.width = '75%';

    /* ── Init mattype config after PA_PRD is ready ── */
    if (Object.keys(PA_PRD).length) mattyeInit(PA_PRD);

    log(logEl, 'ok', timer.fmt() + ' Descarga completa. Iniciando análisis...');
    setStatusPA(I18n.t('xls.log.analyzing'), 75);

    await paAnalyzeAndExport(
      ent, PA_PRD, PA_LOC, PA_RES, PA_RES_LOC,
      pshBySid, pshPrdSet,
      timer, logEl, setStatusPA, progEl, PA_EXEC_META
    );

    progEl.style.width = '100%';
    log(logEl, 'ok', timer.fmt() + ' ¡Excel descargado! Análisis completado en ' + timer.ms() + 'ms.');
    setStatusPA(I18n.t('xls.log.completedShort', { ms: timer.ms() }), 100);
    document.getElementById('paSuccessBanner').classList.remove('hidden');

  } catch(e) {
    log(logEl, 'err', timer.fmt() + ' Error: ' + e.message);
    var errEl = document.getElementById('progStatusTextPA');
    if (errEl) { errEl.style.color = 'var(--red)'; errEl.textContent = 'Error: ' + e.message; }
  }
  document.getElementById('btnFetchPA').disabled = false;
}

function togglePALogs() {
  var logEl = document.getElementById('logPA');
  var btn   = document.getElementById('btnTogglePALogs');
  var hidden = logEl.classList.toggle('hidden');
  var key = hidden ? 'common.viewLogs' : 'common.hideLogs';
  btn.setAttribute('data-i18n', key);
  btn.textContent = window.I18n ? I18n.t(key) : (hidden ? 'Ver logs técnicos' : 'Ocultar logs');
}

/* ── Fetch ligero de Product master para poblar tipos de material ── */
async function paFetchMattypes() {
  var prdEnt = document.getElementById('selPAProduct').value;
  if (!prdEnt || !CFG || !CFG.url) return;

  var baseOData = CFG.url + '/sap/opu/odata/IBP/' + CFG.service + '/';
  var paFilter  = CFG.pa
    ? (CFG.pver
      ? "PlanningAreaID eq '" + CFG.pa + "' and VersionID eq '" + CFG.pver + "'"
      : "PlanningAreaID eq '" + CFG.pa + "'")
    : '';

  var tmpPrd = {};
  // logEl dummy (off-DOM) para que fetchAndIndex/log no rompan
  var logDummy = document.getElementById('logPA') || document.createElement('div');
  try {
    await fetchAndIndex(baseOData + prdEnt, logDummy, paFilter, 'PRDID,MATTYPEID',
      function(rows) {
        rows.forEach(function(r) { var k = str(r.PRDID); if (k) tmpPrd[k] = r; });
        return Promise.resolve();
      });
    mattyeInit(tmpPrd);
  } catch(e) {
    console.warn('[paFetchMattypes] fetch falló:', e);
  }
}

/* ── Helpers de apertura/cierre de bodies de mattype-panel ── */
function _paOpenMattypeBody(bodyId, arrId) {
  var body = document.getElementById(bodyId);
  var arr  = document.getElementById(arrId);
  if (body) body.style.display = 'block';
  if (arr)  arr.textContent = '▼';
}
function _paCloseMattypeBody(bodyId, arrId) {
  var body = document.getElementById(bodyId);
  var arr  = document.getElementById(arrId);
  if (body) body.style.display = 'none';
  if (arr)  arr.textContent = '▶';
}

/* ── Navegación entre paneles ── */

/* MDT → Exclude */
async function paConfirmMapping() {
  if (typeof validateEntityFields === 'function') {
    var _paConfirmChecks = [
      { role: 'Production Source Header',   entityName: document.getElementById('selPAHeader').value,  required: true, selectorId: 'selPAHeader',  fields: ['PRDID','SOURCEID','LOCID','SOURCETYPE','PLEADTIME','OUTPUTCOEFFICIENT','PRATIO','PINVALID'] },
      { role: 'Production Source Item',     entityName: document.getElementById('selPAItem').value,    required: true, selectorId: 'selPAItem',    fields: ['SOURCEID','PRDID','COMPONENTCOEFFICIENT','ISALTITEM'] },
      { role: 'Production Source Item Sub', entityName: document.getElementById('selPAItemSub').value, required: true, selectorId: 'selPAItemSub', fields: ['SOURCEID','PRDFR','SPRDFR'] },
      { role: 'Location Source',            entityName: document.getElementById('selPALocSrc').value,  required: true, selectorId: 'selPALocSrc',  fields: ['PRDID','LOCFR','LOCID','TLEADTIME','TINVALID'] },
    ];
    var _paConfirmResult = validateEntityFields(_paConfirmChecks);
    if (_paConfirmResult.issues.length || _paConfirmResult.applied.length) {
      await fmShowCorrectionPanel(_paConfirmResult.issues, _paConfirmResult.applied, 'fmPanelPA', _paConfirmChecks);
    }
  }
  // Colapsar mapeo
  var mdtBody = document.getElementById('bodyPAMDT');
  var mdtArr  = document.getElementById('arrPAMDT');
  if (mdtBody) { toggleMappingBody('bodyPAMDT', 'arrPAMDT', false); }

  // Mostrar y expandir panel de exclusión
  var excl = document.getElementById('panelPAExclude');
  if (excl) {
    excl.classList.remove('hidden');
    _paOpenMattypeBody('mattypeExcludeBody', 'mattypeExcludeArr');
    excl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Fetch ligero de tipos de material
  var wrap = document.getElementById('mattypeExcludeWrap');
  if (wrap) wrap.innerHTML = '<p style="color:var(--text2);font-size:12px;margin:8px 0;">' + escH(I18n.t('mattype.status.loading')) + '</p>';
  paFetchMattypes().then(function() {
    mattyeRenderExclude('');
    _mattyeUpdateExcludeSummary();
    _paUpdateRunSummary();
  });
}

/* Exclude → MDT (volver) */
function paBackToMapping() {
  ['panelPAExclude', 'panelPACategories', 'panelPAExportMode'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  _paCloseMattypeBody('mattypeExcludeBody', 'mattypeExcludeArr');
  _paCloseMattypeBody('mattypeCatBody',     'mattypeCatArr');

  var mdtBody = document.getElementById('bodyPAMDT');
  var mdtArr  = document.getElementById('arrPAMDT');
  if (mdtBody) {
    mdtBody.classList.remove('hidden');
    if (mdtArr) mdtArr.textContent = '▼';
    document.getElementById('panelPAMDT').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* Exclude → Categories */
function paContinueToCategories() {
  // Colapsar exclusión
  _paCloseMattypeBody('mattypeExcludeBody', 'mattypeExcludeArr');

  // Mostrar y expandir categorización
  var cat = document.getElementById('panelPACategories');
  if (cat) {
    cat.classList.remove('hidden');
    _paOpenMattypeBody('mattypeCatBody', 'mattypeCatArr');
    mattyeRenderCategorize();
    cat.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  _paUpdateRunSummary();
}

/* Categories → Exclude (volver) */
function paBackToExclude() {
  // Colapsar categorización
  _paCloseMattypeBody('mattypeCatBody', 'mattypeCatArr');

  // Expandir exclusión
  _paOpenMattypeBody('mattypeExcludeBody', 'mattypeExcludeArr');
  document.getElementById('panelPAExclude').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* Categories → Run */
function paContinueToRun() {
  _paCloseMattypeBody('mattypeCatBody', 'mattypeCatArr');
  _efCloseEFBody('pa');

  var run = document.getElementById('panelPAExportMode');
  if (run) {
    run.classList.remove('hidden');
    run.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  _paUpdateRunSummary();
}

/* Run → Categories (volver) */
function paBackToCategories() {
  var run = document.getElementById('panelPAExportMode');
  if (run) run.classList.add('hidden');

  // Expandir categorización
  _paOpenMattypeBody('mattypeCatBody', 'mattypeCatArr');
  document.getElementById('panelPACategories').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function _paUpdateRunSummary() {
  var el = document.getElementById('paRunSummary');
  if (!el) return;
  var excl    = Object.keys(MATTYPE_CFG).filter(function(k) { return MATTYPE_CFG[k].excluded; });
  var catted  = Object.keys(MATTYPE_CFG).filter(function(k) { return !MATTYPE_CFG[k].excluded && MATTYPE_CFG[k].categories.size > 0; });
  var inclPrds = Object.keys(MATTYPE_CFG).filter(function(k) { return !MATTYPE_CFG[k].excluded; })
    .reduce(function(s,k){ return s + (MATTYPE_CFG[k].count||0); }, 0);
  var exclPrds = excl.reduce(function(s,k){ return s + (MATTYPE_CFG[k].count||0); }, 0);

  var isEn = window.I18n && I18n.getLang() === 'en';
  if (!excl.length && !catted.length) {
    el.textContent = I18n.t('run.paDefault');
  } else {
    var parts = [];
    parts.push(inclPrds + (isEn ? ' products included in ' : ' productos incluidos en ') + (Object.keys(MATTYPE_CFG).length - excl.length) + (isEn ? ' type(s)' : ' tipo(s)'));
    if (excl.length) parts.push(exclPrds + (isEn ? ' products excluded (' : ' productos excluidos (') + excl.join(', ') + ')');
    if (catted.length) parts.push(catted.length + (isEn ? ' type(s) categorized' : ' tipo(s) categorizados'));
    el.textContent = parts.join(' · ');
  }
}

function paModeChange() {} // kept for compatibility — no-op

/* ═══════════════════════════════════════════════════════════════
   PA — ANÁLISIS + EXPORTACIÓN EXCEL
   ═══════════════════════════════════════════════════════════════ */
async function paAnalyzeAndExport(
  ent, PA_PRD, PA_LOC, PA_RES, PA_RES_LOC,
  pshBySid, pshPrdSet,
  timer, logEl, setStatusPA, progEl, execMeta
) {
  /* ── Helpers de lookup ── */
  function pd(id)  { var p = PA_PRD[id] || {}; return str(p.PRDDESCR  || ''); }
  function pm(id)  { var p = PA_PRD[id] || {}; return str(p.MATTYPEID || ''); }
  function ld(id)  { var l = PA_LOC[id]  || {}; return str(l.LOCDESCR  || ''); }
  function lct(id) { var l = PA_LOC[id]  || {}; return str(l.LOCTYPE   || ''); }
  function rd(id)  { var r = PA_RES[id]  || {}; return str(r.RESDESCR  || ''); }
  function yn(b)   { return b ? I18n.t('xls.yes') : I18n.t('xls.no'); }

  /* ── PHASE A: cargar IDB a memoria ── */
  setStatusPA('Cargando datos desde IndexedDB...', 75);
  var allLocProd = ent.locPrd  ? (await idbGetAll('pa_loc_prod'))  : [];
  var allLocSrc  = ent.locSrc  ? (await idbGetAll('pa_loc_src'))   : [];
  var allPsi     = ent.psi     ? (await idbGetAll('pa_psi'))       : [];
  var allPsiSub  = ent.psiSub  ? (await idbGetAll('pa_psisub'))    : [];
  var allPsr     = ent.psr     ? (await idbGetAll('pa_psr'))       : [];
  log(logEl, 'ok', timer.fmt() + ' IDB cargado — LocProd:' + allLocProd.length +
    ' LocSrc:' + allLocSrc.length + ' PSI:' + allPsi.length);

  /* ── PHASE B: construir índices ── */
  setStatusPA('Construyendo índices...', 77);

  /* PSH */
  var pshByPrdLoc  = {};   // "PRDID|LOCID" → [SOURCEID] SOURCETYPE=P
  var pshSidLocid  = {};   // SOURCEID → { LOCID, PRDID }
  var pshSidHasP   = {};
  var pshPrdSetP   = {};
  Object.keys(pshBySid).forEach(function(sid) {
    var recs    = pshBySid[sid];
    var primary = recs.find(function(r){ return r.SOURCETYPE === 'P'; }) || recs[0];
    pshSidLocid[sid] = { LOCID: primary.LOCID, PRDID: primary.PRDID };
    pshSidHasP[sid]  = recs.some(function(r){ return r.SOURCETYPE === 'P'; });
    recs.forEach(function(r) {
      if (r.SOURCETYPE !== 'P' || !r.PRDID || !r.LOCID) return;
      var k = r.PRDID + '|' + r.LOCID;
      if (!pshByPrdLoc[k]) pshByPrdLoc[k] = [];
      pshByPrdLoc[k].push(sid);
      pshPrdSetP[r.PRDID] = true;
    });
  });

  /* PSI */
  var psiPrdSet     = new Set();
  var psiBySourceid = {};
  var psiCompByLocPrd = {};  // "LOCID|PRDID(comp)" → true — componente en esta planta
  allPsi.forEach(function(r) {
    var sid = str(r.SOURCEID), prd = str(r.PRDID || '');
    if (prd) psiPrdSet.add(prd);
    if (sid) { if (!psiBySourceid[sid]) psiBySourceid[sid] = []; psiBySourceid[sid].push(r); }
    // Index por planta del SOURCEID
    var info = pshSidLocid[sid] || {};
    if (info.LOCID && prd) psiCompByLocPrd[info.LOCID + '|' + prd] = true;
  });

  /* PSI Sub */
  var psiSubBySprdfr = {};
  allPsiSub.forEach(function(r) {
    var sprdfr = str(r.SPRDFR || ''), prdfr = str(r.PRDFR || '');
    if (sprdfr && prdfr) {
      if (!psiSubBySprdfr[sprdfr]) psiSubBySprdfr[sprdfr] = [];
      if (psiSubBySprdfr[sprdfr].indexOf(prdfr) < 0) psiSubBySprdfr[sprdfr].push(prdfr);
    }
  });

  /* PSR */
  var psrResidSet   = new Set();
  var psrByResidLoc = new Set();
  var psrBySourceid = {};
  allPsr.forEach(function(r) {
    var sid = str(r.SOURCEID), resid = str(r.RESID || '');
    if (resid) psrResidSet.add(resid);
    if (sid) {
      if (!psrBySourceid[sid]) psrBySourceid[sid] = [];
      psrBySourceid[sid].push(r);
      if (pshSidLocid[sid] && pshSidLocid[sid].LOCID && resid)
        psrByResidLoc.add(resid + '|' + pshSidLocid[sid].LOCID);
    }
  });

  /* Location Product */
  var locPrdSet     = new Set();  // "LOCID|PRDID"
  var locPrdPrdSet  = new Set();
  allLocProd.forEach(function(r) {
    var loc = str(r.LOCID), prd = str(r.PRDID);
    if (loc && prd) { locPrdSet.add(loc + '|' + prd); locPrdPrdSet.add(prd); }
  });

  /* Location Source */
  var locSrcByPrdLoc    = {};         // "PRDID|LOCID(dest)" → [{LOCFR, TLEADTIME}]
  var locSrcByPrdLocfr  = new Set();  // "PRDID|LOCFR(orig)"
  var locSrcPrdSet      = new Set();
  var locSrcByLocfr     = {};         // LOCFR → [{PRDID, LOCID}]
  var locSrcByLocid     = {};         // LOCID → [{PRDID, LOCFR}]
  allLocSrc.forEach(function(r) {
    var prd = str(r.PRDID), locfr = str(r.LOCFR || ''), locid = str(r.LOCID || ''), tlt = str(r.TLEADTIME || '');
    if (prd) locSrcPrdSet.add(prd);
    if (prd && locid) {
      var k = prd + '|' + locid;
      if (!locSrcByPrdLoc[k]) locSrcByPrdLoc[k] = [];
      locSrcByPrdLoc[k].push({ LOCFR: locfr, TLEADTIME: tlt });
    }
    if (prd && locfr) locSrcByPrdLocfr.add(prd + '|' + locfr);
    if (locfr) {
      if (!locSrcByLocfr[locfr]) locSrcByLocfr[locfr] = [];
      locSrcByLocfr[locfr].push({ PRDID: prd, LOCID: locid });
    }
    if (locid) {
      if (!locSrcByLocid[locid]) locSrcByLocid[locid] = [];
      locSrcByLocid[locid].push({ PRDID: prd, LOCFR: locfr });
    }
  });

  /* Índice LS por PRDID — para check de TLEADTIME */
  var locSrcRowsByPrd = {};
  allLocSrc.forEach(function(r) {
    var prd = str(r.PRDID);
    if (!prd) return;
    if (!locSrcRowsByPrd[prd]) locSrcRowsByPrd[prd] = [];
    locSrcRowsByPrd[prd].push(r);
  });

  /* Resource Location */
  var resLocSet      = new Set();
  var resLocResidSet = new Set();
  Object.keys(PA_RES_LOC).forEach(function(resid) {
    resLocResidSet.add(resid);
    PA_RES_LOC[resid].forEach(function(e) { if (e.LOCID) resLocSet.add(resid + '|' + e.LOCID); });
  });

  /* ── Índices derivados para métricas ── */

  // PSH por producto: PRDID → [SOURCEID]
  var pshSidsByPrd = {};
  // PSH por ubicación: LOCID → [SOURCEID]
  var pshSidsByLoc = {};
  Object.keys(pshBySid).forEach(function(sid) {
    var info = pshSidLocid[sid] || {};
    var prd = info.PRDID, loc = info.LOCID;
    if (prd) { if (!pshSidsByPrd[prd]) pshSidsByPrd[prd] = []; if (pshSidsByPrd[prd].indexOf(sid) < 0) pshSidsByPrd[prd].push(sid); }
    if (loc) { if (!pshSidsByLoc[loc]) pshSidsByLoc[loc] = []; if (pshSidsByLoc[loc].indexOf(sid) < 0) pshSidsByLoc[loc].push(sid); }
  });

  // Plantas por producto (distinct LOCIDs desde PSH SOURCETYPE=P)
  var plantsByPrd = {};
  Object.keys(pshByPrdLoc).forEach(function(key) {
    var prd = key.split('|')[0], loc = key.split('|')[1];
    if (!plantsByPrd[prd]) plantsByPrd[prd] = new Set();
    plantsByPrd[prd].add(loc);
  });

  // PSR recursos por producto (via SOURCEID → planta → PSH por planta → producto)
  var resByPrd  = {};  // PRDID → Set of RESID
  var resByLoc  = {};  // LOCID → Set of RESID (activos en PSR)
  allPsr.forEach(function(r) {
    var sid = str(r.SOURCEID), resid = str(r.RESID || '');
    if (!resid) return;
    var info = pshSidLocid[sid] || {};
    if (info.PRDID) { if (!resByPrd[info.PRDID]) resByPrd[info.PRDID] = new Set(); resByPrd[info.PRDID].add(resid); }
    if (info.LOCID) { if (!resByLoc[info.LOCID]) resByLoc[info.LOCID] = new Set(); resByLoc[info.LOCID].add(resid); }
  });

  // Componentes por producto: PRDID(output) → count de PSI
  var psiCountByPrd = {};
  allPsi.forEach(function(r) {
    var sid = str(r.SOURCEID);
    var info = pshSidLocid[sid] || {};
    if (info.PRDID) psiCountByPrd[info.PRDID] = (psiCountByPrd[info.PRDID] || 0) + 1;
  });

  // Productos que usan un PRDID como componente: comp → Set<output_prd>
  var usedByPrd = {};
  allPsi.forEach(function(r) {
    var comp = str(r.PRDID || '');
    var sid  = str(r.SOURCEID);
    var info = pshSidLocid[sid] || {};
    if (comp && info.PRDID) {
      if (!usedByPrd[comp]) usedByPrd[comp] = new Set();
      usedByPrd[comp].add(info.PRDID);
    }
  });

  // Plantas que consumen un PRDID como componente PSI: comp → Set<LOCID>
  var consumedAtLoc = {};
  allPsi.forEach(function(r) {
    var comp = str(r.PRDID || '');
    var sid  = str(r.SOURCEID);
    var info = pshSidLocid[sid] || {};
    if (comp && info.LOCID) {
      if (!consumedAtLoc[comp]) consumedAtLoc[comp] = new Set();
      consumedAtLoc[comp].add(info.LOCID);
    }
  });

  // Proveedores (LOCFR que abastecen un PRDID como componente PSI)
  // "proveedor" = LOCFR en LocSrc donde el PRDID es componente PSI en LOCID destino
  var vendorsByComp = {};   // PRDID(comp) → Set<LOCFR>
  allLocSrc.forEach(function(r) {
    var prd = str(r.PRDID), locfr = str(r.LOCFR || ''), locid = str(r.LOCID || '');
    if (!prd || !locfr || !locid) return;
    if (psiCompByLocPrd[locid + '|' + prd]) {
      if (!vendorsByComp[prd]) vendorsByComp[prd] = new Set();
      vendorsByComp[prd].add(locfr);
    }
  });

  // Plantas consumidoras cubiertas por LocSrc para un componente
  // cubierta = existe LocSrc con PRDID=comp y LOCID=planta consumidora
  function _coveredPlants(comp) {
    var consuming = consumedAtLoc[comp];
    if (!consuming) return { covered: new Set(), uncovered: new Set() };
    var covered = new Set(), uncovered = new Set();
    consuming.forEach(function(loc) {
      var k = comp + '|' + loc;
      if (locSrcByPrdLoc[k] && locSrcByPrdLoc[k].length > 0) covered.add(loc);
      else uncovered.add(loc);
    });
    return { covered: covered, uncovered: uncovered };
  }

  // Orígenes en red para un PRDID (LOCFR en LocSrc)
  function _originsInNet(prd) {
    var origins = new Set();
    allLocSrc.forEach(function(r) {
      if (str(r.PRDID) === prd && str(r.LOCFR || '')) origins.add(str(r.LOCFR));
    });
    return origins;
  }

  /* ── Mattype CFG ── */
  // Asegurar que MATTYPE_CFG esté inicializado (puede estar vacío si no hay productos)
  if (Object.keys(MATTYPE_CFG).length === 0 && Object.keys(PA_PRD).length) {
    mattyeInit(PA_PRD);
  }

  /* ── Workbook setup ── */
  setStatusPA('Inicializando Excel...', 79);
  var today = new Date().toISOString().slice(0, 10);
  var GOLD  = 'FFF7A800', ORANGE = 'FFE8622A', NAVY = 'FF0B1120';
  var C_RED = 'FFFFCCCC', C_YEL  = 'FFFFFFCC';
  var NA_DASH = '\u2014', NA_FILL = 'FFE5E7EB', NA_FONT = 'FF6B7280';
  var GRP = { control:'FFD1D5DB', ibp:'FFBAE6FD', flag:'FFFDE68A', metric:'FFA7F3D0', detail:'FF99F6E4' };
  var wb    = new StreamingXlsx();

  function makeSheet(name, tabArgb, hdrs, notes, groups) {
    var ws = wb.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: tabArgb } }
    });
    ws.addRow(hdrs.map(cleanXml));
    ws.getRow(1).eachCell(function(cell, colNum) {
      var grpKey  = groups && groups[colNum - 1];
      var hdrFill = grpKey ? (GRP[grpKey] || GOLD) : GOLD;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hdrFill } };
      cell.font = { bold: true, name: 'DM Sans', size: 10, color: { argb: NAVY } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: ORANGE } } };
      var rawNote = notes && notes[colNum - 1];
      if (rawNote) {
        var safeNote = cleanXml(rawNote);
        try { if (safeNote) cell.note = safeNote; } catch(e) {}
      }
    });
    ws.getRow(1).height = 22;
    var colW = hdrs.map(function(h) { return h.length; });
    return {
      ws: ws,
      addRow: function(data, fillArgb) {
        var row = ws.addRow(data.map(cleanXml));
        row.eachCell({ includeEmpty: true }, function(cell) {
          if (cell.value === NA_DASH) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NA_FILL } };
            cell.font = { name: 'DM Sans', size: 10, color: { argb: NA_FONT }, italic: true };
            return;
          }
          if (fillArgb) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
          }
        });
        data.forEach(function(v, ci) {
          if (v === NA_DASH) return;
          var len = v != null ? String(v).length : 0;
          if (len > (colW[ci] || 0)) colW[ci] = len;
        });
      },
      finalize: function() {
        ws.columns.forEach(function(col, ci) {
          col.width = Math.min(Math.max((colW[ci] || 10) + 2, 10), 60);
        });
      }
    };
  }

  function statusLabel(fill) {
    return fill === C_RED ? I18n.t('xls.severity.alert') : fill === C_YEL ? I18n.t('xls.severity.warning') : I18n.t('xls.severity.ok');
  }

  var STATS = {};
  function initStat(name) { STATS[name] = { total: 0, red: 0, yel: 0, ok: 0 }; }
  function track(name, fill) {
    if (!STATS[name]) return;
    STATS[name].total++;
    if (fill === C_RED) STATS[name].red++;
    else if (fill === C_YEL) STATS[name].yel++;
    else STATS[name].ok++;
  }

  function severityToFill(sev) {
    if (sev === 'red')    return C_RED;
    if (sev === 'yellow') return C_YEL;
    return null;
  }

  /* helper: elimina caracteres inválidos para XML 1.0 y espacios extremos.
     SAP IBP devuelve campos CHAR con padding de espacios; ExcelJS 4.x no genera
     xml:space="preserve" correctamente para esos strings → Excel repara sharedStrings.xml. */
  function cleanXml(v) {
    if (v == null) return v;
    if (typeof v !== 'string') return v;
    var s = v.replace(/[\uD800-\uDFFF]/g, '')
             .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, '')
             .trim();
    return s === '' ? null : s;
  }

  /* helper: array → string concatenado */
  function codes(arr) { return Array.from(arr || []).sort().join(', '); }

  /* ── Resumen (se llena al final) ── */
  var S0 = makeSheet(I18n.t('xls.sheet.summary'), 'FF34D399',
    ['#', I18n.t('xls.col.sheet'), I18n.t('xls.col.totalRecords'), I18n.t('xls.col.alerts'), I18n.t('xls.col.warnings'), I18n.t('xls.col.ok'), I18n.t('xls.col.consistencyPct')],
    [
      _xnPA('Número de hoja en el libro.'),
      _xnPA('Nombre de la hoja analizada.'),
      _xnPA('Total de filas procesadas en esa hoja. Ej: 350 = se analizaron 350 productos.'),
      _xnPA('Registros con problema crítico que bloquea o distorsiona la planificación. Ej: producto sin PSH, BOM vacío, PLEADTIME = 0.'),
      _xnPA('Registros con dato incompleto o sospechoso que conviene revisar. Ej: recurso sin Resource Location, arco sin consumo PSI en destino.'),
      _xnPA('Registros sin hallazgos — todas las validaciones aplicables pasaron correctamente.'),
      _xnPA('Porcentaje de registros OK sobre el total. Fórmula: OK / Total × 100. Ej: 85 de 100 productos OK = 85%.')
    ],
    ['control','control','metric','metric','metric','metric','metric']);

  /* ════════════════════════════════════════════════════════════════
     HOJA 1 — PRODUCT
     ════════════════════════════════════════════════════════════════ */
  if (ent.prd) {
    initStat('Product');
    var _s1Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'PRDID','PRDDESCR','MATTYPEID',
      I18n.t('xls.col.inLocProduct'), I18n.t('xls.col.inPSHOutput'), I18n.t('xls.col.inPSIComp'), I18n.t('xls.col.inLocSource'),
      I18n.t('xls.col.numProdOptions'), I18n.t('xls.col.prodOptions'),
      I18n.t('xls.col.numProdPlants'), I18n.t('xls.col.prodPlants'),
      I18n.t('xls.col.numBomComps'),
      I18n.t('xls.col.numProdResources'), I18n.t('xls.col.prodResources'),
      I18n.t('xls.col.numSuppliers'), I18n.t('xls.col.suppliers'),
      I18n.t('xls.col.numPlantsCovered'), I18n.t('xls.col.plantsCovered'),
      I18n.t('xls.col.numPlantsUncovered'), I18n.t('xls.col.plantsUncovered'),
      I18n.t('xls.col.numProdUsing'),
      I18n.t('xls.col.numNetOrigins'), I18n.t('xls.col.netOrigins'),
      I18n.t('xls.col.numConsumerPlants'), I18n.t('xls.col.consumerPlants')
    ];
    var _s1Notes = [
      _xnPA('Color de alerta: 🔴 Alerta = problema crítico que bloquea la planificación | 🟡 Advertencia = dato incompleto o sospechoso | ✅ OK = sin hallazgos.'),
      _xnPA('Detalle de cada validación. Si hay hallazgos, describe el problema concreto. Si el estado es OK, lista las validaciones que pasaron. Ej OK: "Habilitado en Location Product | Con PSH, PSI y PSR | Lead time definido en todos los SOURCEIDs".'),
      _xnPA('Código único del producto en SAP IBP (PRDID). Ej: PROD-001, MAT-A.'),
      _xnPA('Descripción del producto según el maestro de materiales. Ej: "Aceite refinado 1L".'),
      _xnPA('Tipo de material SAP asignado a este producto (MATTYPEID). Determina qué validaciones aplican. Ej: FERT = producto terminado, HALB = semielaborado, ROH = materia prima.'),
      _xnPA('Si / No — ¿El producto está registrado en al menos una ubicación en Location Product? Sin esto, IBP ignora el producto en la planificación. Ej: PROD-001 sin Location Product → no entra a ningún plan.'),
      _xnPA('Si / No — ¿El producto aparece como output principal (SOURCETYPE=P) en alguna fuente de producción (PSH)? Sin PSH no hay instrucciones de fabricación. Ej: PROD-001 con PSH en planta P001.'),
      _xnPA('Si / No — ¿Este producto es usado como ingrediente en el BOM de algún otro producto (PSI)? Ej: MAT-A = Sí porque es componente en el BOM de PROD-001.'),
      _xnPA('Si / No — ¿Este producto tiene al menos un arco de transferencia configurado en Location Source? Ej: MAT-A = Sí porque se transfiere de PROV-01 a P001.'),
      _xnPA('Cuántas recetas de producción distintas (SOURCEIDs) tienen a este producto como output principal. Ej: 2 = puede fabricarse de dos maneras diferentes.'),
      _xnPA('Códigos de las fuentes de producción (SOURCEIDs) donde este producto es el output. Ej: SRC-001, SRC-002.'),
      _xnPA('Número de plantas distintas donde se fabrica este producto. Ej: 3 = se produce en P001, P002 y P003.'),
      _xnPA('Códigos de las plantas de producción (LOCID) donde tiene PSH asociado. Ej: P001, P002.'),
      _xnPA('Total de componentes PSI definidos en todos sus BOMs. Ej: 5 = la suma de ingredientes en todas sus recetas de producción es 5.'),
      _xnPA('Número de recursos productivos (máquinas/líneas) asignados a sus recetas vía PSR. Ej: 2 = LINEA-01 y HORNO-A.'),
      _xnPA('Códigos de los recursos (RESID) asignados a sus fuentes de producción. Ej: LINEA-01, HORNO-A.'),
      _xnPA('Número de ubicaciones origen que abastecen este producto como insumo vía Location Source. Ej: 2 = llega desde PROV-01 y PROV-02.'),
      _xnPA('Códigos de las ubicaciones origen (LOCFR) que proveen este producto. Ej: PROV-01, PROV-02.'),
      _xnPA('Número de plantas consumidoras que tienen arco de abastecimiento configurado para este producto. Ej: 2 de 3 plantas cubiertas = OK.'),
      _xnPA('Códigos de las plantas que sí tienen arco de abastecimiento para este producto. Ej: P001, P002.'),
      _xnPA('Número de plantas consumidoras SIN arco de abastecimiento configurado para este producto. Si > 0: falta configurar Location Source. Ej: P003 consume MAT-A pero no tiene arco desde ningún proveedor → 🔴.'),
      _xnPA('Códigos de las plantas sin cobertura de abastecimiento. Ej: P003.'),
      _xnPA('Cuántos otros productos distintos requieren este material como componente en sus BOMs. Ej: 3 = MAT-A es ingrediente en PROD-001, PROD-002 y PROD-003.'),
      _xnPA('Número de nodos origen distintos desde los que este producto puede ser recibido en la red. Ej: 2 = puede llegar desde PROV-01 o desde P002.'),
      _xnPA('Códigos de los nodos origen del producto en la red. Ej: PROV-01, P002.'),
      _xnPA('Número de plantas donde este producto es consumido como ingrediente en algún BOM. Ej: 2 = se usa como componente en P001 y P002.'),
      _xnPA('Códigos de las plantas donde este producto aparece como componente PSI. Ej: P001, P002.')
    ];
    var _s1Groups = [
      'control','control',
      'ibp','ibp','ibp',
      'flag','flag','flag','flag',
      'metric','detail',
      'metric','detail',
      'metric',
      'metric','detail',
      'metric','detail',
      'metric','detail',
      'metric','detail',
      'metric',
      'metric','detail',
      'metric','detail'
    ];
    efInjectHeaders(_s1Hdrs, _s1Notes, _s1Groups, 'pa', 'product', 4);
    var S1 = makeSheet(I18n.t('xls.sheet.product'), 'FF29ABE2', _s1Hdrs, _s1Notes, _s1Groups);

    Object.keys(PA_PRD).sort().forEach(function(prdid) {
      var mattypeid = pm(prdid);
      var cats      = mattypeGetCategories(mattypeid);
      var isExcl    = mattypeIsExcluded(mattypeid);
      if (isExcl) return; // excluidos no se analizan aquí
      if (!mattypeid) return;

      var rules           = mattypeGetRules(cats);
      var isUncategorized = cats[0] === 'uncategorized';

      var inLP  = locPrdPrdSet.has(prdid);
      var inPSH = !!pshPrdSetP[prdid];
      var inPSI = psiPrdSet.has(prdid);
      var inLS  = locSrcPrdSet.has(prdid);

      /* Métricas producción */
      var sidsPrd    = pshSidsByPrd[prdid]   || [];
      var plantsSet  = plantsByPrd[prdid]     || new Set();
      var resSet     = resByPrd[prdid]        || new Set();
      var compCount  = psiCountByPrd[prdid]   || 0;

      /* Métricas abastecimiento */
      var vendorSet  = vendorsByComp[prdid]   || new Set();
      var covData    = _coveredPlants(prdid);
      var usedBySet  = usedByPrd[prdid]       || new Set();
      var origins    = _originsInNet(prdid);
      var consLocs   = consumedAtLoc[prdid]   || new Set();

      /* Validaciones según categoría */
      var obs = [];
      var fills = [];

      // Location Product — universal 🔴
      if (!inLP) { obs.push('Sin cobertura en Location Product'); fills.push('red'); }

      // PSH + PSI + PSR como bloque
      var reqPSH = rules.requiresPSH;
      if (reqPSH !== 'none') {
        if (!inPSH) {
          obs.push('Sin fuente de producción propia (PSH)');
          fills.push(reqPSH);
        } else {
          // Si tiene PSH, PSI y PSR son obligatorios al mismo nivel
          var hasPSI = inPSI || compCount > 0;
          var hasPSR = resSet.size > 0;
          if (!hasPSI) { obs.push('PSH sin componentes PSI'); fills.push(reqPSH); }
          if (!hasPSR) { obs.push('PSH sin recursos PSR asignados'); fills.push(reqPSH); }
        }
      }

      // LocSrc: planta PSH debe ser LOCFR
      if (rules.requiresPlantAsOrigin !== 'none' && inPSH) {
        var plantsArr = Array.from(plantsSet);
        var hasPlantAsOrigin = plantsArr.some(function(loc) {
          return locSrcByPrdLocfr.has(prdid + '|' + loc);
        });
        if (!hasPlantAsOrigin) {
          obs.push('Planta productora no es origen en Location Source');
          fills.push(rules.requiresPlantAsOrigin);
        }
      }

      // LocSrc: arco de compra llega a planta consumidora
      if (rules.requiresVendorArc !== 'none') {
        if (covData.uncovered.size > 0) {
          obs.push('Sin arco de abastecimiento hacia: ' + codes(covData.uncovered));
          fills.push(rules.requiresVendorArc);
        } else if (!inLS) {
          obs.push('Sin arco de abastecimiento (no registrado en Location Source)');
          fills.push(rules.requiresVendorArc);
        }
      }

      // LocSrc: algún origen y destino (trading / finished)
      if (rules.requiresAnyOriginDest !== 'none') {
        if (!inLS) { obs.push('Sin arcos en Location Source'); fills.push(rules.requiresAnyOriginDest); }
      }

      // Semiterminado: validación específica de consumo y transferencia (7 casos)
      if (cats.indexOf('semi') >= 0 && inPSH) {
        var semiPlantsArr = Array.from(plantsSet);
        var semiHasLocalConsumption = semiPlantsArr.some(function(loc) {
          return !!psiCompByLocPrd[loc + '|' + prdid];
        });
        var semiHasTransferOut = semiPlantsArr.some(function(loc) {
          return locSrcByPrdLocfr.has(prdid + '|' + loc);
        });
        var semiLsFromPlant = (locSrcRowsByPrd[prdid] || []).filter(function(r) {
          return plantsSet.has(str(r.LOCFR || ''));
        });
        var semiDestsNoConsumption = new Set(
          semiLsFromPlant
            .map(function(r) { return str(r.LOCID || ''); })
            .filter(function(dest) { return dest && !psiCompByLocPrd[dest + '|' + prdid]; })
        );

        if (!semiHasLocalConsumption && !semiHasTransferOut) {
          // Caso 4: produce sin consumo PSI local ni transferencia
          obs.push('Semiterminado sin consumo PSI en planta productora ni transferencia configurada');
          fills.push('red');
        } else if (semiHasTransferOut && semiDestsNoConsumption.size > 0) {
          if (!semiHasLocalConsumption) {
            // Caso 5: transfiere sin consumo en destino y sin consumo local
            obs.push('Transfiere a ' + semiDestsNoConsumption.size + ' destino(s) sin consumo PSI en ningún punto: ' + codes(semiDestsNoConsumption));
            fills.push('red');
          } else {
            // Caso 6: consume localmente pero transfiere a destino sin consumo
            obs.push('Transfiere a ' + semiDestsNoConsumption.size + ' destino(s) sin consumo PSI (sí consume en planta origen): ' + codes(semiDestsNoConsumption));
            fills.push('yellow');
          }
        }
        // Caso 1: consume localmente, sin transferencia → OK (sin alerta)
        // Casos 2 y 3: transfiere y consume en destino → OK (sin alerta)
      }

      // PLEADTIME
      if (rules.pleadtimeZero !== 'none' && inPSH) {
        var sidsMissingPlt = sidsPrd.filter(function(sid) {
          var recs = pshBySid[sid] || [];
          return recs.some(function(r) { return !r.PLEADTIME || r.PLEADTIME === '0'; });
        });
        if (sidsMissingPlt.length) {
          obs.push('PLEADTIME ausente o cero en ' + sidsMissingPlt.length + ' SOURCEID(s)');
          fills.push(rules.pleadtimeZero);
        }
      }

      // OUTPUTCOEFFICIENT = 0 en PSH
      if (rules.outputCoeffZero !== 'none' && inPSH) {
        var sidsMissingCoeff = sidsPrd.filter(function(sid) {
          var recs = pshBySid[sid] || [];
          return recs.some(function(r) { return !r.OUTPUTCOEFFICIENT || r.OUTPUTCOEFFICIENT === '0'; });
        });
        if (sidsMissingCoeff.length) {
          obs.push('OUTPUTCOEFFICIENT ausente o cero en ' + sidsMissingCoeff.length + ' SOURCEID(s)');
          fills.push(rules.outputCoeffZero);
        }
      }

      // Solo co-producto: aparece en PSH pero nunca como SOURCETYPE=P
      if (rules.isCoproductOnly !== 'none') {
        if (pshPrdSet[prdid] && !inPSH) {
          obs.push('Configurado solo como co-producto (SOURCETYPE=C) — falta PSH primario');
          fills.push(rules.isCoproductOnly);
        }
      }

      // Tiene PSH cuando no debería (rawmat / trading)
      if (rules.hasPSHUnexpected !== 'none') {
        if (pshPrdSet[prdid]) {
          obs.push('Tiene BOM de fabricación (PSH) — verificar categorización');
          fills.push(rules.hasPSHUnexpected);
        }
      }

      // No consumido como componente en ningún BOM
      if (rules.notConsumedInBOM !== 'none') {
        if (consLocs.size === 0) {
          obs.push('No consumido como componente en ningún BOM');
          fills.push(rules.notConsumedInBOM);
        }
      }

      // TLEADTIME = 0 en todos los arcos de Location Source
      if (rules.tleadtimeZero !== 'none' && inLS) {
        var lsRows = locSrcRowsByPrd[prdid] || [];
        if (lsRows.length > 0) {
          var allZeroTlt = lsRows.every(function(r) {
            return !r.TLEADTIME || str(r.TLEADTIME) === '0';
          });
          if (allZeroTlt) {
            obs.push('TLEADTIME = 0 en todos los arcos de Location Source');
            fills.push(rules.tleadtimeZero);
          }
        }
      }

      var uncatLabel = isUncategorized
        ? 'Sin categoría [' + (mattypeid || 'sin MATTYPEID') + ']'
        : null;

      if (!obs.length) {
        if (isUncategorized) {
          obs.push(uncatLabel + ' — sin hallazgos en modo permisivo');
        } else {
          var okParts = ['Habilitado en Location Product'];
          if (reqPSH !== 'none' && inPSH)                      okParts.push('Con PSH, PSI y PSR');
          if (rules.requiresPlantAsOrigin !== 'none' && inPSH) okParts.push('Planta es origen en Location Source');
          if (rules.requiresVendorArc !== 'none')               okParts.push('Arcos de abastecimiento completos');
          if (rules.requiresAnyOriginDest !== 'none')           okParts.push('Con arcos en Location Source');
          if (cats.indexOf('semi') >= 0 && inPSH) {
            var _semiLocalOk = Array.from(plantsSet).some(function(loc) { return !!psiCompByLocPrd[loc + '|' + prdid]; });
            okParts.push(_semiLocalOk ? 'Consume en planta productora' : 'Consumo en destino de transferencia verificado');
          }
          if (rules.pleadtimeZero !== 'none' && inPSH)          okParts.push('PLEADTIME definido en todos los SOURCEIDs');
          if (rules.outputCoeffZero !== 'none' && inPSH)        okParts.push('Coeficiente de salida definido');
          if (rules.isCoproductOnly !== 'none' && inPSH)        okParts.push('PSH con SOURCETYPE=P presente');
          if (rules.hasPSHUnexpected !== 'none')                okParts.push('Sin BOM de fabricación');
          if (rules.notConsumedInBOM !== 'none')                okParts.push('Consumido como componente en BOM');
          if (rules.tleadtimeZero !== 'none' && inLS)           okParts.push('TLEADTIME definido en Location Source');
          obs.push(okParts.join(' | '));
        }
      } else if (isUncategorized) {
        obs.unshift(uncatLabel);
      }

      // Severidad final — máximo entre todos los hallazgos (el más grave gana)
      var finalSev = 'none';
      if (fills.length) {
        var _sevOrder = ['none', 'info', 'yellow', 'red'];
        fills.forEach(function(f) {
          var s = f === 'red' ? 'red' : f === 'yellow' ? 'yellow' : 'none';
          if (_sevOrder.indexOf(s) > _sevOrder.indexOf(finalSev)) finalSev = s;
        });
      }
      // Sin categoría sin hallazgos → ✅ OK (glosario documenta "sin hallazgos en modo permisivo" como OK)
      var fill = severityToFill(finalSev);

      var _s1Row = [
        statusLabel(fill), obs.join(' | '),
        prdid, pd(prdid), mattypeid,
        yn(inLP), yn(inPSH), yn(inPSI), yn(inLS),
        sidsPrd.length,        codes(sidsPrd),
        plantsSet.size,        codes(plantsSet),
        compCount,
        resSet.size,           codes(resSet),
        vendorSet.size,        codes(vendorSet),
        covData.covered.size,  codes(covData.covered),
        covData.uncovered.size, codes(covData.uncovered),
        usedBySet.size,
        origins.size,         codes(origins),
        consLocs.size,        codes(consLocs)
      ];
      efInjectRow(_s1Row, 'pa', 'product', 4, PA_PRD[prdid]);
      S1.addRow(_s1Row, fill);
      track('Product', fill);
    });
    S1.finalize();
    setStatusPA('Hoja Product lista...', 82);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 2 — LOCATION
     Roles inferidos por comportamiento en los datos
     ════════════════════════════════════════════════════════════════ */
  if (ent.loc) {
    initStat('Location');
    var _s9Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'LOCID','LOCDESCR','LOCTYPE',
      'Rol(es) inferido(s)',
      /* Planta */
      '# Productos fabricados','Productos fabricados (códigos)',
      '# SOURCEIDs','SOURCEIDs (códigos)',
      '# Recursos asignados','Recursos asignados (códigos)',
      '# Recursos activos PSR','Recursos activos (códigos)',
      '# Recursos ociosos','Recursos ociosos (códigos)',
      '# BOMs sin PSI','SOURCEIDs sin PSI (códigos)',
      '# BOMs sin PSR','SOURCEIDs sin PSR (códigos)',
      '# Componentes externos','# Componentes sin cobertura LocSrc','Componentes sin cobertura (códigos)',
      '# SOURCEIDs sin PLEADTIME','SOURCEIDs sin PLEADTIME (códigos)',
      /* Proveedor */
      '# Productos abastecidos (como proveedor)','Productos abastecidos (códigos)',
      '# Plantas abastecidas','Plantas abastecidas (códigos)',
      '# Arcos sin consumo PSI en destino','Productos sin consumo PSI (códigos)',
      '# Productos sin LocProd en destino','Productos sin LocProd (códigos)',
      /* Nodo transferencia */
      '# Productos transferidos','Productos transferidos (códigos)',
      '# Destinos transferencia','Destinos transferencia (códigos)',
      /* Nodo receptor */
      '# Productos recibidos','Productos recibidos (códigos)',
      '# Orígenes desde los que recibe','Orígenes (códigos)'
    ];
    var _s9Notes = [
      _xnPA('Color de alerta: 🔴 Alerta = problema crítico que bloquea la planificación | 🟡 Advertencia = dato incompleto o sospechoso | ✅ OK = sin hallazgos.'),
      _xnPA('Detalle de cada validación. Ej 🔴: "2 SOURCEID(s) sin PSI | 1 componente sin arco de abastecimiento". Ej ✅: "BOMs con PSI, PSR y lead time | Sin componentes descubiertos".'),
      _xnPA('Código único de la ubicación en SAP IBP (LOCID). Ej: P001, DC-NORTE, PROV-05.'),
      _xnPA('Descripción de la ubicación del maestro de ubicaciones. Ej: "Planta Santiago", "Centro Distribución Norte".'),
      _xnPA('Tipo de ubicación según el campo LOCTYPE de SAP IBP. Ej: 1010 = planta, 1020 = centro distribución. Campo informativo, el rol real se infiere del comportamiento en los datos.'),
      _xnPA('Rol(es) inferidos del comportamiento real en los datos (independiente del LOCTYPE). Posibles: Planta de producción = tiene PSH | Proveedor = abastece componentes PSI en destino | Nodo de transferencia = envía productos sin consumo PSI en destino | Nodo receptor = solo recibe vía Location Source | Nodo de recursos = tiene Resource Location pero sin producción ni transferencias | Sin actividad = existe en el maestro pero no aparece en ningún otro dato.'),
      /* Planta */
      _xnPA('Número de productos distintos que se fabrican en esta planta (tienen PSH con este LOCID como planta). Ej: 5 = fabrica PROD-001, PROD-002, PROD-003, SEMI-A, SEMI-B.'),
      _xnPA('Códigos de los productos fabricados en esta planta. Ej: PROD-001, PROD-002.'),
      _xnPA('Número de fuentes de producción (SOURCEIDs) asociadas a esta planta. Ej: 3 = SRC-001, SRC-002, SRC-003.'),
      _xnPA('Códigos de los SOURCEIDs de producción de esta planta. Ej: SRC-001, SRC-002.'),
      _xnPA('Número de recursos (máquinas/líneas) con Resource Location configurado en esta planta. Ej: 4 = LINEA-01, LINEA-02, HORNO-A, HORNO-B.'),
      _xnPA('Códigos de los recursos asignados a esta planta en Resource Location. Ej: LINEA-01, HORNO-A.'),
      _xnPA('Número de recursos asignados que aparecen en al menos un PSR activo en esta planta. Ej: 3 de 4 asignados están activos.'),
      _xnPA('Códigos de los recursos activos en algún PSR de esta planta. Ej: LINEA-01, LINEA-02, HORNO-A.'),
      _xnPA('Recursos que están en Resource Location para esta planta pero no aparecen en ningún PSR. Posible configuración huérfana. Ej: HORNO-B asignado a P001 pero sin ninguna receta que lo use → 🟡.'),
      _xnPA('Códigos de los recursos ociosos (en Resource Location sin uso en PSR). Ej: HORNO-B.'),
      _xnPA('Número de SOURCEIDs de esta planta que no tienen ningún componente PSI definido (BOMs vacíos). Un BOM vacío impide planificar la compra de insumos. Ej: SRC-003 sin PSI → 🔴.'),
      _xnPA('Códigos de los SOURCEIDs con BOM vacío (sin PSI). Ej: SRC-003.'),
      _xnPA('Número de SOURCEIDs de esta planta que no tienen ningún recurso PSR asignado. Sin recurso, IBP no puede planificar capacidad. Ej: SRC-002 sin PSR → 🔴.'),
      _xnPA('Códigos de los SOURCEIDs sin recursos PSR asignados. Ej: SRC-002.'),
      _xnPA('Total de componentes de tipo insumo (no semielaborados) requeridos por los BOMs de esta planta. Ej: 8 = suma de ingredientes externos en todas las recetas de P001.'),
      _xnPA('Número de insumos externos de esta planta que no tienen arco de abastecimiento en Location Source. Ej: 2 = MAT-A y MAT-B se requieren en P001 pero no hay Location Source que los lleve ahí → 🔴.'),
      _xnPA('Códigos de los insumos externos sin cobertura de abastecimiento hacia esta planta. Ej: MAT-A, MAT-B.'),
      _xnPA('Número de SOURCEIDs de esta planta con PLEADTIME = 0 o no definido. Un lead time cero hace que IBP planifique como si la producción fuera instantánea. Ej: SRC-001 con PLEADTIME=0 → 🔴.'),
      _xnPA('Códigos de los SOURCEIDs con PLEADTIME faltante o cero en esta planta. Ej: SRC-001.'),
      /* Proveedor */
      _xnPA('Número de productos distintos que esta ubicación envía como origen en Location Source hacia plantas que los consumen como PSI. Ej: 3 = PROV-01 abastece MAT-A, MAT-B, MAT-C.'),
      _xnPA('Códigos de los productos abastecidos desde esta ubicación. Ej: MAT-A, MAT-B.'),
      _xnPA('Número de plantas destino a las que esta ubicación envía productos. Ej: 2 = abastece a P001 y P002.'),
      _xnPA('Códigos de las plantas destino abastecidas. Ej: P001, P002.'),
      _xnPA('Productos que se envían desde aquí pero no se consumen como componente PSI en la planta destino. Puede indicar arcos configurados de más o sin uso real. Ej: MAT-X se envía a P001 pero ningún BOM de P001 lo usa → 🟡.'),
      _xnPA('Códigos de los productos enviados sin consumo PSI en la planta destino. Ej: MAT-X.'),
      _xnPA('Productos que se envían a una planta destino donde no tienen Location Product habilitado. IBP no puede planificarlos en esa planta. Ej: MAT-Y llega a P002 pero no tiene Location Product en P002 → 🔴.'),
      _xnPA('Códigos de los productos sin Location Product en la planta destino. Ej: MAT-Y.'),
      /* Nodo transferencia */
      _xnPA('Número de productos que esta ubicación reenvía vía Location Source sin que sean consumidos como PSI en el destino. Ej: DC-NORTE transfiere PROD-001 a DC-SUR sin que DC-SUR lo use como insumo productivo.'),
      _xnPA('Códigos de los productos transferidos sin consumo productivo en destino. Ej: PROD-001.'),
      _xnPA('Número de ubicaciones destino hacia las que esta ubicación transfiere productos. Ej: 2 = reenvía a DC-SUR y DC-ESTE.'),
      _xnPA('Códigos de las ubicaciones destino de transferencia. Ej: DC-SUR, DC-ESTE.'),
      /* Nodo receptor */
      _xnPA('Número de productos que esta ubicación recibe como destino en Location Source. Ej: 4 = recibe PROD-001, PROD-002, MAT-A, MAT-B.'),
      _xnPA('Códigos de los productos recibidos en esta ubicación. Ej: PROD-001, MAT-A.'),
      _xnPA('Número de ubicaciones origen distintas desde las que recibe productos. Ej: 3 = recibe desde P001, P002 y PROV-01.'),
      _xnPA('Códigos de las ubicaciones origen que abastecen a esta ubicación. Ej: P001, PROV-01.')
    ];
    var _s9Groups = [
      'control','control',
      'ibp','ibp','ibp','ibp',
      /* Planta */
      'metric','detail','metric','detail',
      'metric','detail','metric','detail','metric','detail',
      'metric','detail','metric','detail',
      'metric','metric','detail',
      'metric','detail',
      /* Proveedor */
      'metric','detail','metric','detail','metric','detail','metric','detail',
      /* Transferencia */
      'metric','detail','metric','detail',
      /* Receptor */
      'metric','detail','metric','detail'
    ];
    efInjectHeaders(_s9Hdrs, _s9Notes, _s9Groups, 'pa', 'location', 4);
    var S9 = makeSheet(I18n.t('xls.sheet.location'), 'FF10B981', _s9Hdrs, _s9Notes, _s9Groups);

    // Unión de todos los locids conocidos
    var allLocIds = new Set();
    Object.keys(PA_LOC).forEach(function(l) { allLocIds.add(l); });
    Object.keys(pshSidsByLoc).forEach(function(l) { allLocIds.add(l); });
    Object.keys(locSrcByLocfr).forEach(function(l) { allLocIds.add(l); });
    Object.keys(locSrcByLocid).forEach(function(l) { allLocIds.add(l); });
    Object.keys(PA_RES_LOC).forEach(function(resid) {
      PA_RES_LOC[resid].forEach(function(e) { if(e.LOCID) allLocIds.add(e.LOCID); });
    });

    Array.from(allLocIds).sort().forEach(function(locid) {
      var locRec = PA_LOC[locid] || {};
      var locdescr = str(locRec.LOCDESCR || '');
      var loctype  = str(locRec.LOCTYPE  || '');

      /* Inferir roles */
      var roles = [];

      // Planta: tiene PSH
      var sidsAtLoc = pshSidsByLoc[locid] || [];
      var isPlanta  = sidsAtLoc.length > 0;
      if (isPlanta) roles.push('Planta de producción');

      // Determinar si LOCFR en LocSrc provee componentes PSI en LOCID destino
      var locfrRows = locSrcByLocfr[locid] || [];
      var isProveedor = false, isTransferencia = false;
      locfrRows.forEach(function(row) {
        if (row.LOCID && row.PRDID) {
          if (psiCompByLocPrd[row.LOCID + '|' + row.PRDID]) isProveedor = true;
          else isTransferencia = true;
        }
      });
      if (isProveedor)     roles.push('Proveedor');
      if (isTransferencia) roles.push('Nodo de transferencia');

      // Receptor: solo LOCID en LocSrc, sin PSH, sin ser LOCFR
      var locidRows   = locSrcByLocid[locid] || [];
      var isReceptor  = locidRows.length > 0 && !isPlanta && locfrRows.length === 0;
      if (isReceptor) roles.push('Nodo receptor');

      // Nodo de recursos: Resource Location sin PSH ni LocSrc
      var hasResLoc = resLocResidSet.size > 0 && Object.keys(PA_RES_LOC).some(function(resid) {
        return PA_RES_LOC[resid].some(function(e){ return e.LOCID === locid; });
      });
      if (hasResLoc && !isPlanta && !isProveedor && !isTransferencia && !isReceptor) {
        roles.push('Nodo de recursos');
      }

      if (!roles.length) roles.push('Sin actividad');

      var rolStr = roles.join(' | ');

      /* ── Métricas Planta ── */
      var plantaPrds    = new Set();
      var plantaSids    = new Set(sidsAtLoc);
      var resAsignados  = new Set(Object.keys(PA_RES_LOC).filter(function(resid){
        return PA_RES_LOC[resid].some(function(e){ return e.LOCID === locid; });
      }));
      var resActivos    = resByLoc[locid] || new Set();
      var resOciosos    = new Set(Array.from(resAsignados).filter(function(r){ return !resActivos.has(r); }));
      var bomssinPSI    = new Set();
      var bomssinPSR    = new Set();
      var compExternos  = 0;
      var compSinCov    = new Set();
      var sidsSinPlt    = new Set();

      sidsAtLoc.forEach(function(sid) {
        var info = pshSidLocid[sid] || {};
        if (info.PRDID) plantaPrds.add(info.PRDID);
        if (!(psiBySourceid[sid] && psiBySourceid[sid].length)) bomssinPSI.add(sid);
        if (!(psrBySourceid[sid] && psrBySourceid[sid].length)) bomssinPSR.add(sid);
        var recs = pshBySid[sid] || [];
        if (recs.some(function(r){ return !r.PLEADTIME || r.PLEADTIME === '0'; })) sidsSinPlt.add(sid);
        // Componentes externos y sin cobertura
        (psiBySourceid[sid] || []).forEach(function(pr) {
          var comp = str(pr.PRDID || '');
          if (!comp) return;
          var isSemi = !!pshByPrdLoc[comp + '|' + locid];
          if (!isSemi) {
            compExternos++;
            var lsRows = locSrcByPrdLoc[comp + '|' + locid] || [];
            if (!lsRows.length) compSinCov.add(comp);
          }
        });
      });

      /* ── Métricas Proveedor ── */
      var prdAbastecidos   = new Set();
      var plantasAbast     = new Set();
      var sinConsumoPSI    = new Set();
      var sinLocProd       = new Set();
      locfrRows.forEach(function(row) {
        if (!row.PRDID || !row.LOCID) return;
        prdAbastecidos.add(row.PRDID);
        plantasAbast.add(row.LOCID);
        if (!psiCompByLocPrd[row.LOCID + '|' + row.PRDID]) sinConsumoPSI.add(row.PRDID);
        if (!locPrdSet.has(row.LOCID + '|' + row.PRDID))    sinLocProd.add(row.PRDID);
      });

      /* ── Métricas Transferencia ── */
      var prdTransferidos = new Set();
      var destTransf      = new Set();
      locfrRows.forEach(function(row) {
        if (!row.PRDID || !row.LOCID) return;
        if (!psiCompByLocPrd[row.LOCID + '|' + row.PRDID]) {
          prdTransferidos.add(row.PRDID);
          destTransf.add(row.LOCID);
        }
      });

      /* ── Métricas Receptor ── */
      var prdRecibidos = new Set();
      var origenes     = new Set();
      locidRows.forEach(function(row) {
        if (row.PRDID) prdRecibidos.add(row.PRDID);
        if (row.LOCFR) origenes.add(row.LOCFR);
      });

      /* ── Métricas por categoría de producto ── */
      var hasSomeCategorized = Object.keys(MATTYPE_CFG).some(function(k) {
        return MATTYPE_CFG[k].categories.size > 0;
      });

      var transfCompPlanta = new Set();
      var transfCompNoPl   = new Set();
      var transfDistrib    = new Set();
      var transfUncatSet   = new Set();
      if (isTransferencia) {
        locfrRows.forEach(function(row) {
          if (!row.PRDID || !row.LOCID) return;
          if (psiCompByLocPrd[row.LOCID + '|' + row.PRDID]) return;
          var cats        = mattypeGetCategories(pm(row.PRDID));
          var isComp      = cats.indexOf('rawmat') >= 0 || cats.indexOf('semi') >= 0;
          var isDist      = cats.indexOf('finished') >= 0 || cats.indexOf('trading') >= 0;
          var isUncat     = cats.indexOf('uncategorized') >= 0;
          var destIsPlanta = (pshSidsByLoc[row.LOCID] || []).length > 0;
          if (isComp) {
            if (destIsPlanta) transfCompPlanta.add(row.PRDID);
            else              transfCompNoPl.add(row.PRDID);
          } else if (isDist) {
            transfDistrib.add(row.PRDID);
          } else if (isUncat) {
            transfUncatSet.add(row.PRDID);
          }
        });
      }

      var receptorSinLP = new Set();
      var receptorComp  = new Set();
      if (isReceptor) {
        locidRows.forEach(function(row) {
          if (!row.PRDID) return;
          if (!locPrdSet.has(locid + '|' + row.PRDID)) receptorSinLP.add(row.PRDID);
          var cats = mattypeGetCategories(pm(row.PRDID));
          if (cats.indexOf('rawmat') >= 0 || cats.indexOf('semi') >= 0) receptorComp.add(row.PRDID);
        });
      }

      var plantaPrdsWrongCat = new Set();
      if (isPlanta) {
        plantaPrds.forEach(function(prd) {
          var cats = mattypeGetCategories(pm(prd));
          if (cats.indexOf('rawmat') >= 0 || cats.indexOf('trading') >= 0) plantaPrdsWrongCat.add(prd);
        });
      }

      /* ── Validaciones ── */
      var obs   = [];
      var fills = [];

      if (isPlanta) {
        if (bomssinPSI.size)         { obs.push(bomssinPSI.size + ' SOURCEID(s) sin PSI');  fills.push('red');    }
        if (bomssinPSR.size)         { obs.push(bomssinPSR.size + ' SOURCEID(s) sin PSR');  fills.push('red');    }
        if (compSinCov.size)         { obs.push(compSinCov.size + ' componente(s) sin arco de abastecimiento'); fills.push('red'); }
        if (sidsSinPlt.size)         { obs.push(sidsSinPlt.size + ' SOURCEID(s) con PLEADTIME = 0'); fills.push('red'); }
        if (resOciosos.size)         { obs.push(resOciosos.size + ' recurso(s) asignados sin uso en PSR'); fills.push('yellow'); }
        if (plantaPrdsWrongCat.size) { obs.push(plantaPrdsWrongCat.size + ' producto(s) Mat. Prima/Mercadería con BOM de fabricación en esta planta — verificar categorización'); fills.push('yellow'); }
      }
      if (isProveedor) {
        if (sinConsumoPSI.size) { obs.push(sinConsumoPSI.size + ' producto(s) abastecidos sin consumo PSI en destino'); fills.push('yellow'); }
        if (sinLocProd.size)    { obs.push(sinLocProd.size + ' producto(s) sin Location Product en planta destino'); fills.push('red'); }
      }
      if (isTransferencia) {
        if (transfCompPlanta.size) {
          obs.push(transfCompPlanta.size + ' componente(s) Mat. Prima/Semiterminado transferido(s) a planta sin consumo PSI — verificar BOM');
          fills.push('red');
        }
        if (transfCompNoPl.size) {
          obs.push(transfCompNoPl.size + ' componente(s) Mat. Prima/Semiterminado transferido(s) a nodo sin producción');
          fills.push('yellow');
        }
        if (transfUncatSet.size && hasSomeCategorized) {
          obs.push(transfUncatSet.size + ' producto(s) sin categoría transferidos sin consumo PSI en destino');
          fills.push('yellow');
        }
      }
      if (isReceptor) {
        if (receptorSinLP.size) {
          obs.push(receptorSinLP.size + ' producto(s) recibidos sin cobertura en Location Product');
          fills.push('red');
        }
        if (receptorComp.size) {
          obs.push(receptorComp.size + ' componente(s) Mat. Prima/Semiterminado recibidos en ubicación sin producción asociada');
          fills.push('yellow');
        }
      }
      if (roles[0] === 'Sin actividad') { obs.push('Ubicación en maestro sin actividad en otros datos'); fills.push('info'); }
      if (!obs.length) {
        var okParts = [];
        if (isPlanta)        okParts.push('BOMs con PSI, PSR y lead time | Sin componentes sin cobertura | Sin recursos ociosos');
        if (isProveedor)     okParts.push('Abastecimiento con consumo PSI y cobertura LP en destino');
        if (isTransferencia) okParts.push(transfDistrib.size > 0
          ? 'Distribuye ' + transfDistrib.size + ' producto(s) terminado(s)/mercadería sin hallazgos'
          : 'Nodo de transferencia sin hallazgos');
        if (isReceptor)      okParts.push(prdRecibidos.size > 0
          ? 'Recibe ' + prdRecibidos.size + ' producto(s) | Location Product OK | Sin componentes sin producción'
          : 'Nodo receptor sin hallazgos');
        if (!okParts.length) okParts.push('Ubicación activa sin hallazgos');
        obs.push(okParts.join(' | '));
      }

      var _sevOrderLoc = ['none', 'info', 'yellow', 'red'];
      var _maxSevLoc = 'none';
      fills.forEach(function(f) {
        var s = f === 'red' ? 'red' : f === 'yellow' ? 'yellow' : f === 'info' ? 'info' : 'none';
        if (_sevOrderLoc.indexOf(s) > _sevOrderLoc.indexOf(_maxSevLoc)) _maxSevLoc = s;
      });
      var finalSev = fills.length ? _maxSevLoc : 'none';
      var fill = finalSev === 'red' ? C_RED : finalSev === 'yellow' ? C_YEL : null;

      var _s9Row = [
        statusLabel(fill), obs.join(' | '),
        locid, locdescr, loctype, rolStr,
        plantaPrds.size,    codes(plantaPrds),
        plantaSids.size,    codes(plantaSids),
        resAsignados.size,  codes(resAsignados),
        resActivos.size,    codes(resActivos),
        resOciosos.size,    codes(resOciosos),
        bomssinPSI.size,    codes(bomssinPSI),
        bomssinPSR.size,    codes(bomssinPSR),
        compExternos,       compSinCov.size, codes(compSinCov),
        sidsSinPlt.size,    codes(sidsSinPlt),
        prdAbastecidos.size, codes(prdAbastecidos),
        plantasAbast.size,   codes(plantasAbast),
        sinConsumoPSI.size,  codes(sinConsumoPSI),
        sinLocProd.size,     codes(sinLocProd),
        prdTransferidos.size, codes(prdTransferidos),
        destTransf.size,      codes(destTransf),
        prdRecibidos.size,  codes(prdRecibidos),
        origenes.size,      codes(origenes)
      ];
      efInjectRow(_s9Row, 'pa', 'location', 4, PA_LOC[locid]);
      S9.addRow(_s9Row, fill);
      track('Location', fill);
    });
    S9.finalize();
    setStatusPA('Hoja Location lista...', 84);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 3 — RESOURCE
     ════════════════════════════════════════════════════════════════ */
  if (ent.res) {
    initStat('Resource');
    var _s2Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'RESID','RESDESCR',
      'En PSR','En Resource Location',
      '# Plantas asignadas','Plantas asignadas (códigos)',
      '# Fuentes prod.','Fuentes prod. (SOURCEIDs)',
      '# Productos que fabrica','Productos que fabrica (códigos)'
    ];
    var _s2Notes = [
      _xnPA('Color de alerta: 🔴 Alerta = recurso completamente huérfano (sin PSR ni Resource Location) | 🟡 Advertencia = dato incompleto | ✅ OK = recurso activo y con planta asignada.'),
      _xnPA('Detalle de la validación. Ej 🔴: "Recurso huérfano: sin uso en producción ni planta asignada". Ej 🟡: "Sin uso en producción (no aparece en PSR)". Ej ✅: "En uso en PSR y con planta asignada en Resource Location".'),
      _xnPA('Código único del recurso productivo en SAP IBP (RESID). Ej: LINEA-01, HORNO-A, MAQUINA-03.'),
      _xnPA('Descripción del recurso del maestro de recursos. Ej: "Línea de envasado 1", "Horno túnel A".'),
      _xnPA('Si / No — ¿Este recurso está asignado a al menos una fuente de producción en PSR? Si No, IBP no lo usa para planificar capacidad. Ej: HORNO-B = No → nunca se considera en ninguna receta.'),
      _xnPA('Si / No — ¿Este recurso tiene al menos una planta configurada en Resource Location? Si No, IBP no sabe dónde opera físicamente. Ej: LINEA-01 = No → recurso sin ubicación conocida → 🟡.'),
      _xnPA('Número de plantas distintas donde este recurso tiene configuración en Resource Location. Ej: 2 = LINEA-01 opera en P001 y P002.'),
      _xnPA('Códigos de las plantas (LOCID) donde este recurso está configurado en Resource Location. Ej: P001, P002.'),
      _xnPA('Número de fuentes de producción (SOURCEIDs) a las que está asignado vía PSR. Ej: 3 = participa en SRC-001, SRC-002, SRC-003.'),
      _xnPA('Códigos de los SOURCEIDs a los que está asignado este recurso. Ej: SRC-001, SRC-002.'),
      _xnPA('Número de productos distintos que fabrica a través de sus SOURCEIDs. Ej: 2 = HORNO-A produce PROD-001 y PROD-002.'),
      _xnPA('Códigos de los productos fabricados por las fuentes donde participa este recurso. Ej: PROD-001, PROD-002.')
    ];
    var _s2Groups = [
      'control','control',
      'ibp','ibp',
      'flag','flag',
      'metric','detail',
      'metric','detail',
      'metric','detail'
    ];
    efInjectHeaders(_s2Hdrs, _s2Notes, _s2Groups, 'pa', 'resource', 3);
    var S2 = makeSheet(I18n.t('xls.sheet.resource'), 'FFa78bfa', _s2Hdrs, _s2Notes, _s2Groups);

    // Índice: RESID → Set<LOCID> (desde Resource Location)
    var resLocsByResid = {};
    Object.keys(PA_RES_LOC).forEach(function(resid) {
      resLocsByResid[resid] = new Set(PA_RES_LOC[resid].map(function(e){ return e.LOCID; }));
    });

    // Índice: RESID → Set<SOURCEID>
    var resSidsByResid = {};
    allPsr.forEach(function(r) {
      var resid = str(r.RESID || ''), sid = str(r.SOURCEID);
      if (!resid) return;
      if (!resSidsByResid[resid]) resSidsByResid[resid] = new Set();
      resSidsByResid[resid].add(sid);
    });

    // Índice: RESID → Set<PRDID>
    var resPrdsByResid = {};
    allPsr.forEach(function(r) {
      var resid = str(r.RESID || ''), sid = str(r.SOURCEID);
      if (!resid) return;
      var info = pshSidLocid[sid] || {};
      if (info.PRDID) {
        if (!resPrdsByResid[resid]) resPrdsByResid[resid] = new Set();
        resPrdsByResid[resid].add(info.PRDID);
      }
    });

    Object.keys(PA_RES).sort().forEach(function(resid) {
      var inPSR = psrResidSet.has(resid);
      var inRL  = resLocResidSet.has(resid);
      var locsSet = resLocsByResid[resid] || new Set();
      var sidsSet = resSidsByResid[resid] || new Set();
      var prdsSet = resPrdsByResid[resid] || new Set();
      var obs = [];
      if (!inPSR && !inRL) obs.push('Recurso huérfano: sin uso en producción ni planta asignada');
      else if (!inPSR)     obs.push('Sin uso en producción (no aparece en PSR)');
      else if (!inRL)      obs.push('Sin planta asignada en Resource Location');
      if (!obs.length)     obs.push('En uso en PSR y con planta asignada en Resource Location');
      var fill = (!inPSR && !inRL) ? C_RED : (!inPSR || !inRL) ? C_YEL : null;
      var _s2Row = [
        statusLabel(fill), obs.join(' | '),
        resid, rd(resid),
        yn(inPSR), yn(inRL),
        locsSet.size, codes(locsSet),
        sidsSet.size, codes(sidsSet),
        prdsSet.size, codes(prdsSet)
      ];
      efInjectRow(_s2Row, 'pa', 'resource', 3, PA_RES[resid]);
      S2.addRow(_s2Row, fill);
      track('Resource', fill);
    });
    S2.finalize();
    setStatusPA('Hoja Resource lista...', 84);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 3 — RESOURCE LOCATION
     ════════════════════════════════════════════════════════════════ */
  if (ent.resLoc) {
    initStat('Resource Location');
    var _s3Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'RESID','RESDESCR','LOCID','LOCDESCR',
      'RESID+LOCID usado en PSR'
    ];
    var _s3Notes = [
      _xnPA('Color de alerta: 🟡 Advertencia = recurso asignado a planta pero sin uso en ninguna receta | ✅ OK = recurso activo en PSR para esta planta.'),
      _xnPA('Detalle de la validación. Ej ✅: "Recurso activo en PSR para esta planta". Ej 🟡: "Recurso asignado a planta pero sin uso en PSR para esta planta" — significa que está en el maestro pero IBP nunca lo considera en esa planta.'),
      _xnPA('Código del recurso productivo (RESID). Ej: LINEA-01.'),
      _xnPA('Descripción del recurso del maestro de recursos. Ej: "Línea de envasado 1".'),
      _xnPA('Código de la planta donde está configurado este recurso (LOCID). Ej: P001.'),
      _xnPA('Descripción de la planta del maestro de ubicaciones. Ej: "Planta Santiago".'),
      _xnPA('Si / No — ¿Esta combinación RESID+LOCID aparece en al menos un PSR? Si No, el recurso está en el maestro de esa planta pero no participa en ninguna receta. Ej: HORNO-B en P002 = No → 🟡 configuración sin uso productivo.')
    ];
    var _s3Groups = [
      'control','control',
      'ibp','ibp','ibp','ibp',
      'flag'
    ];
    efInjectHeaders(_s3Hdrs, _s3Notes, _s3Groups, 'pa', 'resourceLocation', 5);
    var S3 = makeSheet(I18n.t('xls.sheet.resourceLocation'), 'FFFF9F43', _s3Hdrs, _s3Notes, _s3Groups);
    Object.keys(PA_RES_LOC).sort().forEach(function(resid) {
      PA_RES_LOC[resid].forEach(function(e) {
        var locid = e.LOCID;
        var used  = psrByResidLoc.has(resid + '|' + locid);
        var obs   = used ? 'Recurso activo en PSR para esta planta' : 'Recurso asignado a planta pero sin uso en PSR para esta planta';
        var fill  = used ? null : C_YEL;
        var _s3Row = [statusLabel(fill), obs, resid, rd(resid), locid, ld(locid), yn(used)];
        efInjectRow(_s3Row, 'pa', 'resourceLocation', 5, e);
        S3.addRow(_s3Row, fill);
        track('Resource Location', fill);
      });
    });
    S3.finalize();
    setStatusPA('Hoja Resource Location lista...', 85);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 4 — PRODUCTION SOURCE HEADER
     ════════════════════════════════════════════════════════════════ */
  if (ent.psh) {
    initStat('Prod Source Header');
    var _s6Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'SOURCEID',
      'PRDID output','PRDDESCR output','MATTYPEID output',
      'LOCID planta','LOCDESCR planta',
      'SOURCETYPE(s)','PLEADTIME','OUTPUTCOEFFICIENT','PRATIO',
      'PRDID+LOCID en Location Product',
      '# Componentes PSI','# Recursos PSR','Recursos PSR (códigos)',
      '# Componentes con alternativa',
      'Tiene PSR'
    ];
    var _s6Notes = [
      _xnPA('Color de alerta: 🔴 Alerta = BOM vacío, PLEADTIME=0, sin Location Product o sin PSR | 🟡 Advertencia = sin SOURCETYPE=P o múltiples fuentes sin cuota | ✅ OK = receta completa.'),
      _xnPA('Detalle de hallazgos. Ej 🔴: "BOM vacío: sin componentes PSI | PLEADTIME = 0 o no definido". Ej 🟡: "Múltiples SOURCEIDs para mismo PRDID+LOCID — verificar cuotas". Ej ✅: "BOM con PSI | Lead time definido | Habilitado en LP | SOURCETYPE=P presente | Recursos PSR asignados".'),
      _xnPA('Identificador único de la fuente de producción (SOURCEID) en SAP IBP. Ej: SRC-001.'),
      _xnPA('Código del producto terminado que produce esta receta (output). Ej: PROD-001.'),
      _xnPA('Descripción del producto output. Ej: "Aceite refinado 1L".'),
      _xnPA('Tipo de material del producto output. Ej: FERT = terminado, HALB = semielaborado.'),
      _xnPA('Código de la planta donde se ejecuta esta producción (LOCID). Ej: P001.'),
      _xnPA('Descripción de la planta de producción. Ej: "Planta Santiago".'),
      _xnPA('Tipo(s) de fuente en esta receta: P = producción primaria (el output principal) | C = co-producto (se obtiene en el mismo proceso). Ej: P/C = esta receta produce PROD-001 como primario y SEMI-X como co-producto.'),
      _xnPA('Lead time de producción en días. Indica cuánto tarda el proceso desde que se lanza la orden hasta tener el producto listo. PLEADTIME = 0 o vacío hace que IBP planifique como producción instantánea → 🔴. Ej: 5 = 5 días de fabricación.'),
      _xnPA('Unidades del producto terminado que se obtienen por corrida de producción. Afecta directamente el cálculo de cuántas corridas se necesitan. Ej: 100 = cada corrida produce 100 unidades.'),
      _xnPA('Proporción de producción asignada a esta fuente cuando existen múltiples SOURCEIDs para el mismo PRDID+LOCID. IBP usa PRATIO para distribuir la demanda planificada entre fuentes. Ej: 0.6 = esta fuente cubre el 60% de la demanda. Vacío = fuente única o sin cuota definida.'),
      _xnPA('Si / No — ¿La combinación PRDID+LOCID está habilitada en Location Product? Sin esto, IBP no planifica este producto en esta planta aunque exista la receta. Ej: PROD-001 en P001 = No → receta sin efecto.'),
      _xnPA('Número de componentes (PSI) definidos en el BOM de esta receta. 0 = BOM vacío → IBP no planifica compra de insumos. Ej: 4 = esta receta requiere 4 ingredientes.'),
      _xnPA('Número de recursos productivos (máquinas/líneas) asignados a esta receta vía PSR. 0 = sin capacidad modelada. Ej: 2 = LINEA-01 y HORNO-A.'),
      _xnPA('Códigos de los recursos (RESID) asignados a esta fuente de producción. Ej: LINEA-01, HORNO-A.'),
      _xnPA('Número de componentes PSI marcados como material de reemplazo alternativo (ISALTITEM=X). Ej: 1 = MAT-A-PREMIUM puede reemplazar a MAT-A en esta receta.'),
      _xnPA('Si / No — ¿Esta fuente tiene al menos un recurso asignado en Prod Source Resource? Si No, IBP no puede planificar la capacidad de esta receta. Ej: SRC-003 = No → sin restricción de capacidad modelada → 🔴.')
    ];
    var _s6Groups = [
      'control','control',
      'ibp',
      'ibp','ibp','ibp',
      'ibp','ibp',
      'ibp','ibp','ibp','ibp',
      'flag',
      'metric','metric','detail',
      'metric',
      'flag'
    ];
    efInjectHeaders(_s6Hdrs, _s6Notes, _s6Groups, 'pa', 'psh', 11);
    var S6 = makeSheet(I18n.t('xls.sheet.prodSrcHeader'), 'FFF7A800', _s6Hdrs, _s6Notes, _s6Groups);
    Object.keys(pshBySid).sort().forEach(function(sid) {
      var recs    = pshBySid[sid];
      var primary = recs.find(function(r){ return r.SOURCETYPE === 'P'; }) || recs[0];
      var outPrd  = primary.PRDID, outLoc = primary.LOCID;
      if (!pm(outPrd) || mattypeIsExcluded(pm(outPrd))) return;
      var plt     = primary.PLEADTIME || '', coeff = primary.OUTPUTCOEFFICIENT || '', pratio = primary.PRATIO || '';
      var stypes  = recs.map(function(r){ return r.SOURCETYPE; })
                        .filter(function(v,i,a){ return a.indexOf(v) === i; }).join('/');
      var inLP    = locPrdSet.has(outLoc + '|' + outPrd);
      var psiRows = psiBySourceid[sid] || [];
      var psrRows = psrBySourceid[sid] || [];
      var hasPSI  = psiRows.length > 0;
      var hasPSR  = psrRows.length > 0;
      var noLt    = !plt || plt === '0';
      var hasP    = pshSidHasP[sid];
      var multi   = (pshByPrdLoc[outPrd + '|' + outLoc] || []).length > 1;

      // Métricas
      var residsSet = new Set(psrRows.map(function(r){ return str(r.RESID || ''); }).filter(Boolean));
      var altCount  = psiRows.filter(function(r){ return str(r.ISALTITEM || '') === 'X'; }).length;

      var obs = [];
      if (!hasPSI) obs.push('BOM vacío: sin componentes PSI');
      if (noLt)    obs.push('PLEADTIME = 0 o no definido');
      if (!inLP)   obs.push('PRDID+LOCID sin cobertura en Location Product');
      if (!hasP)   obs.push('Sin registro SOURCETYPE=P');
      if (!hasPSR) obs.push('Sin recursos PSR asignados');
      if (multi)   obs.push('Múltiples SOURCEIDs para mismo PRDID+LOCID — verificar cuotas');
      if (!obs.length) obs.push('BOM con componentes PSI | Lead time definido | Habilitado en LP | SOURCETYPE=P presente | Recursos PSR asignados');
      var fill = (!hasPSI || noLt || !inLP || !hasPSR) ? C_RED : (!hasP || multi) ? C_YEL : null;
      var _s6Row = [
        statusLabel(fill), obs.join(' | '),
        sid,
        outPrd, pd(outPrd), pm(outPrd),
        outLoc, ld(outLoc),
        stypes, plt, coeff, pratio,
        yn(inLP),
        psiRows.length, residsSet.size, codes(residsSet),
        altCount,
        yn(hasPSR)
      ];
      efInjectRow(_s6Row, 'pa', 'psh', 11, primary);
      S6.addRow(_s6Row, fill);
      track('Prod Source Header', fill);
    });
    S6.finalize();
    setStatusPA('Hoja Prod Source Header lista...', 88);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 5 — PRODUCTION SOURCE ITEM
     ════════════════════════════════════════════════════════════════ */
  if (ent.psi) {
    initStat('Prod Source Item');
    var _s7Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'SOURCEID',
      'PRDID output','PRDDESCR output','MATTYPEID output',
      'LOCID planta','LOCDESCR planta',
      'PRDID componente','PRDDESCR comp','MATTYPEID comp',
      'COMPONENTCOEFFICIENT','Tipo componente',
      'PRDID comp+LOCID en Location Product',
      'En Location Source (insumo)',
      'LOCFR origen','LOCDESCR origen',
      '# Orígenes comp.','Orígenes comp. (códigos)',
      'Material de reemplazo (ISALTITEM)','Reemplaza a'
    ];
    var _s7Notes = [
      _xnPA('Color de alerta: 🔴 Alerta = coeficiente cero, insumo sin arco de abastecimiento o componente sin Location Product | 🟡 Advertencia = SOURCEID no encontrado o sustituto sin registro Item Sub | ✅ OK = componente bien configurado.'),
      _xnPA('Detalle de hallazgos. Ej 🔴: "Coeficiente = 0 o no definido | Insumo sin arco de abastecimiento en Location Source". Ej ✅: "SOURCEID válido | Coeficiente definido | Con arco de abastecimiento | Habilitado en Location Product".'),
      _xnPA('Fuente de producción (SOURCEID) a la que pertenece este componente. Ej: SRC-001 = este componente es ingrediente de la receta SRC-001.'),
      _xnPA('Código del producto terminado que se fabrica en esta receta (output). Ej: PROD-001.'),
      _xnPA('Descripción del producto output. Ej: "Aceite refinado 1L".'),
      _xnPA('Tipo de material del producto output. Ej: FERT.'),
      _xnPA('Planta donde se fabrica el producto output (LOCID). Ej: P001.'),
      _xnPA('Descripción de la planta de fabricación. Ej: "Planta Santiago".'),
      _xnPA('Código del material que se consume como ingrediente en esta receta (PRDID componente). Ej: MAT-A.'),
      _xnPA('Descripción del componente del maestro de materiales. Ej: "Aceite crudo a granel".'),
      _xnPA('Tipo de material del componente. Ej: ROH = materia prima, HALB = semielaborado.'),
      _xnPA('Unidades del componente consumidas por cada unidad del producto terminado. Si = 0, IBP no planifica la compra de este insumo. Ej: 2.5 = se consumen 2.5 kg de MAT-A por cada unidad de PROD-001 fabricada.'),
      _xnPA('Semielaborado = el componente tiene PSH propio en esta planta y se fabrica antes de usarse (trazabilidad en PSH). Insumo = no se fabrica aquí, debe llegar desde un proveedor u otra planta vía Location Source. Ej: SEMI-B = Semielaborado | MAT-A = Insumo.'),
      _xnPA('Si / No — ¿El componente está habilitado en Location Product para esta planta? Si No, IBP no puede planificar su consumo en esa planta. Ej: MAT-A en P001 = No → componente desconocido para IBP en esa planta → 🔴.'),
      _xnPA('Si / No — ¿Hay al menos un arco en Location Source que traiga este insumo a esta planta? Muestra N/A para semielaborados (se producen localmente, no se transfieren). Ej: MAT-A en P001 = No → no hay ruta de abastecimiento configurada → 🔴.'),
      _xnPA('Código(s) de la(s) ubicación(es) desde donde se transfiere este componente hacia la planta (LOCFR). Ej: PROV-01, PROV-02 si llega desde dos orígenes distintos.'),
      _xnPA('Descripción(es) de la(s) ubicación(es) origen del componente. Ej: "Proveedor Nacional 01".'),
      _xnPA('Número de nodos origen distintos que abastecen este componente hacia esta planta. Ej: 2 = llega desde PROV-01 y PROV-02 (doble fuente, mayor resiliencia).'),
      _xnPA('Códigos de los nodos origen del componente hacia esta planta. Ej: PROV-01, PROV-02.'),
      _xnPA('X = este componente es un material de reemplazo alternativo (ISALTITEM=X). Vacío = componente principal. Ej: MAT-A-PREMIUM con X = puede sustituir a MAT-A cuando no hay stock.'),
      _xnPA('Código del componente principal al que reemplaza este sustituto. Solo aplica cuando ISALTITEM=X. Ej: MAT-A = este sustituto reemplaza a MAT-A.')
    ];
    var _s7Groups = [
      'control','control',
      'ibp',
      'ibp','ibp','ibp',
      'ibp','ibp',
      'ibp','ibp','ibp',
      'ibp','metric',
      'flag',
      'flag',
      'detail','detail',
      'metric','detail',
      'ibp','detail'
    ];
    efInjectHeaders(_s7Hdrs, _s7Notes, _s7Groups, 'pa', 'psi', 11);
    var S7 = makeSheet(I18n.t('xls.sheet.prodSrcItem'), 'FF06B6D4', _s7Hdrs, _s7Notes, _s7Groups);

    // ¿Es excluido el componente?
    function _compExclNote(compMt) {
      return (compMt && mattypeIsExcluded(compMt)) ? ' [componente de tipo excluido]' : '';
    }

    var PSI_CHUNK = 300;
    for (var pii = 0; pii < allPsi.length; pii += PSI_CHUNK) {
      allPsi.slice(pii, pii + PSI_CHUNK).forEach(function(r) {
        var sid    = str(r.SOURCEID);
        var comp   = str(r.PRDID || '');
        var coeff  = str(r.COMPONENTCOEFFICIENT || '');
        var isAlt  = str(r.ISALTITEM || '');
        var info   = pshSidLocid[sid] || {};
        var locid  = info.LOCID || '';
        var outPrd = info.PRDID || '';
        if (!pm(outPrd) || mattypeIsExcluded(pm(outPrd))) return;
        var compMt = pm(comp);

        var noSrc         = !locid;
        var hasLocalPsh   = !!(locid && pshByPrdLoc[comp + '|' + locid]);
        var compCatIsSemi = (typeof mattypeGetCategories === 'function' && compMt)
          ? mattypeGetCategories(compMt).indexOf('semi') >= 0 : false;
        var hasAnyPsh     = !!(pshSidsByPrd[comp] && pshSidsByPrd[comp].length > 0);
        var isSemi        = hasLocalPsh || compCatIsSemi;
        var isSemiLocal   = hasLocalPsh;
        var isSemiRemote  = !hasLocalPsh && compCatIsSemi && hasAnyPsh;
        var isSemiNoRec   = !hasLocalPsh && compCatIsSemi && !hasAnyPsh;

        var tipo = noSrc ? 'No determinado'
          : isSemiLocal  ? 'Semielaborado'
          : isSemiRemote ? 'Semielaborado (ext.)'
          : isSemiNoRec  ? 'Semielaborado (sin receta)'
          : 'Insumo';
        var compInLP = locid ? locPrdSet.has(locid + '|' + comp) : false;
        var noCoeff  = !coeff || Number(coeff) === 0;

        // Local: no necesita LS. Sin receta: LS no aplica. Externo e insumo: verificar arco.
        var checkLS = !isSemiLocal && !isSemiNoRec && locid && !noSrc;
        var lsRows  = checkLS ? (locSrcByPrdLoc[comp + '|' + locid] || []) : [];
        var inLS    = lsRows.length > 0;
        var locfrVals  = inLS ? [...new Set(lsRows.map(function(x){ return x.LOCFR; }))] : [];
        var locfrCodes = locfrVals.join(', ');
        var locfrDescr = locfrVals.map(function(lf){ return ld(lf) || '?'; }).join(', ');

        // Orígenes del componente: LOCFR de LS + plantas productoras para semis
        var originsComp = new Set(lsRows.map(function(x){ return x.LOCFR; }).filter(Boolean));
        if (isSemi) {
          (pshSidsByPrd[comp] || []).forEach(function(sid2) {
            var l = (pshSidLocid[sid2] || {}).LOCID;
            if (l) originsComp.add(l);
          });
        }

        var replacedBy = '';
        if (isAlt === 'X') {
          var replaced = psiSubBySprdfr[comp] || [];
          replacedBy = replaced.join(', ');
        }

        var obs = [];
        var exclNote = _compExclNote(compMt);
        if (noSrc)         obs.push('SOURCEID no encontrado en PSH');
        if (noCoeff)       obs.push('Coeficiente = 0 o no definido');
        if (isSemiLocal) {
          obs.push('Semielaborado: trazabilidad en PSH');
        } else if (isSemiRemote) {
          if (!noSrc) obs.push(inLS
            ? 'Semiterminado producido en otra planta: transferencia configurada'
            : 'Semiterminado sin arco de transferencia hacia esta planta');
        } else if (isSemiNoRec) {
          obs.push('Semiterminado sin receta de produccion (PSH) en ninguna planta');
        } else if (!noSrc) {
          if (!inLS) obs.push('Insumo sin arco de abastecimiento en Location Source');
        }
        if (!compInLP && locid) obs.push('Componente no habilitado en Location Product para esta planta');
        if (isAlt === 'X' && !replacedBy && ent.psiSub) obs.push('Material de reemplazo sin registro en Item Sub');
        if (exclNote) obs.push('Componente de tipo excluido (' + compMt + ') — validado en contexto');
        if (!obs.length) obs.push('SOURCEID valido en PSH | Coeficiente definido | Con arco de abastecimiento en Location Source | Habilitado en Location Product');

        var fill = (noCoeff
          || (isSemiRemote  && !inLS && !noSrc)
          || (!isSemi       && !inLS && !noSrc)
          || (!compInLP && locid)) ? C_RED
          : (noSrc || isSemiNoRec || (isAlt === 'X' && !replacedBy && ent.psiSub)) ? C_YEL
          : null;

        var _s7Row = [
          statusLabel(fill), obs.join(' | '),
          sid,
          outPrd, pd(outPrd), pm(outPrd),
          locid, ld(locid),
          comp, pd(comp), compMt,
          coeff, tipo,
          yn(compInLP),
          (isSemiLocal || isSemiNoRec || noSrc) ? 'N/A' : yn(inLS),
          locfrCodes, locfrDescr,
          originsComp.size, codes(originsComp),
          isAlt || '', replacedBy
        ];
        efInjectRow(_s7Row, 'pa', 'psi', 11, r);
        S7.addRow(_s7Row, fill);
        track('Prod Source Item', fill);
      });
      await new Promise(function(r){ setTimeout(r, 0); });
      setStatusPA('Hoja Prod Source Item: ' + Math.min(pii + PSI_CHUNK, allPsi.length) + '/' + allPsi.length + '...',
        88 + Math.round((Math.min(pii + PSI_CHUNK, allPsi.length) / Math.max(allPsi.length, 1)) * 3));
    }
    S7.finalize();
    setStatusPA('Hoja Prod Source Item lista...', 91);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 6 — PRODUCTION SOURCE RESOURCE
     ════════════════════════════════════════════════════════════════ */
  if (ent.psr) {
    initStat('Prod Source Resource');
    var _s8Hdrs = [
      I18n.t('xls.col.status'), I18n.t('xls.col.obs'),
      'SOURCEID',
      'PRDID output','PRDDESCR output','MATTYPEID output',
      'LOCID planta','LOCDESCR planta',
      'RESID','RESDESCR',
      'RESID+LOCID en Resource Location',
      '# Plantas con este recurso asignado','Plantas recurso (códigos)'
    ];
    var _s8Notes = [
      _xnPA('Color de alerta: 🟡 Advertencia = recurso asignado a una receta pero sin Resource Location en esa planta | ✅ OK = asignación válida y consistente.'),
      _xnPA('Detalle de la validación. Ej ✅: "Recurso LINEA-01 asignado en Resource Location para planta P001 | Asociado a SOURCEID SRC-001". Ej 🟡: "Recurso en producción sin asignación en Resource Location para planta P001" — el recurso opera en una receta de P001 pero no figura en el maestro de esa planta.'),
      _xnPA('Fuente de producción (SOURCEID) a la que está asignado este recurso. Ej: SRC-001.'),
      _xnPA('Código del producto que fabrica esta fuente. Ej: PROD-001.'),
      _xnPA('Descripción del producto output. Ej: "Aceite refinado 1L".'),
      _xnPA('Tipo de material del producto output. Ej: FERT.'),
      _xnPA('Planta donde opera esta fuente de producción (LOCID). Ej: P001.'),
      _xnPA('Descripción de la planta. Ej: "Planta Santiago".'),
      _xnPA('Código del recurso asignado a esta fuente de producción (RESID). Ej: LINEA-01.'),
      _xnPA('Descripción del recurso del maestro de recursos. Ej: "Línea de envasado 1".'),
      _xnPA('Si / No — ¿La combinación RESID+LOCID aparece en Resource Location? Si No, el recurso está en la receta pero IBP no lo reconoce como ubicado en esa planta. Ej: LINEA-01 en P001 = No → 🟡 inconsistencia entre PSR y Resource Location.'),
      _xnPA('Número de plantas donde este recurso tiene configuración en Resource Location. Ej: 2 = LINEA-01 tiene Resource Location en P001 y P002.'),
      _xnPA('Códigos de las plantas donde este recurso tiene Resource Location configurado. Ej: P001, P002.')
    ];
    var _s8Groups = [
      'control','control',
      'ibp',
      'ibp','ibp','ibp',
      'ibp','ibp',
      'ibp','ibp',
      'flag',
      'metric','detail'
    ];
    efInjectHeaders(_s8Hdrs, _s8Notes, _s8Groups, 'pa', 'psr', 9);
    var S8 = makeSheet(I18n.t('xls.sheet.prodSrcResource'), 'FF6C63FF', _s8Hdrs, _s8Notes, _s8Groups);

    // RESID → plantas asignadas (Resource Location)
    var resLocMapByResid = {};
    Object.keys(PA_RES_LOC).forEach(function(resid) {
      resLocMapByResid[resid] = new Set(PA_RES_LOC[resid].map(function(e){ return e.LOCID; }));
    });

    allPsr.forEach(function(r) {
      var sid    = str(r.SOURCEID);
      var resid  = str(r.RESID || '');
      var info   = pshSidLocid[sid] || {};
      var locid  = info.LOCID || '';
      var outPrd = info.PRDID || '';
      if (mattypeIsExcluded(pm(outPrd))) return;
      var inRL   = !!(locid && resid && resLocSet.has(resid + '|' + locid));
      var noSrc  = !locid;
      var resPlants = resLocMapByResid[resid] || new Set();
      var obs    = noSrc ? 'SOURCEID no encontrado en PSH'
                 : inRL  ? 'Recurso ' + resid + ' asignado en Resource Location para planta ' + locid + ' | Asociado a SOURCEID ' + sid
                 :          'Recurso en producción sin asignación en Resource Location para planta ' + locid;
      var fill   = noSrc ? C_YEL : inRL ? null : C_YEL;
      var _s8Row = [
        statusLabel(fill), obs,
        sid,
        outPrd, pd(outPrd), pm(outPrd),
        locid, ld(locid),
        resid, rd(resid),
        yn(inRL),
        resPlants.size, codes(resPlants)
      ];
      efInjectRow(_s8Row, 'pa', 'psr', 9, r);
      S8.addRow(_s8Row, fill);
      track('Prod Source Resource', fill);
    });
    S8.finalize();
    setStatusPA('Hoja Prod Source Resource lista...', 93);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ════════════════════════════════════════════════════════════════
     HOJA 8 — TIPOS EXCLUIDOS
     ════════════════════════════════════════════════════════════════ */
  var excluidos = Object.keys(MATTYPE_CFG).filter(function(k){ return MATTYPE_CFG[k].excluded; });
  if (excluidos.length) {
    initStat('Tipos Excluidos');
    var SX = makeSheet(I18n.t('xls.sheet.excludedTypes'), 'FFFF6B6B', [
      'MATTYPEID','# Productos','Aparece como componente PSI en # SOURCEIDs',
      'SOURCEIDs donde es componente (códigos)',
      'Componentes con cobertura LocSrc','Componentes sin cobertura LocSrc',
      'Observacion'
    ], [
      _xnPA('Código del tipo de material excluido del análisis principal por configuración del usuario. Ej: VERP = embalajes, NLAG = no planificados.'),
      _xnPA('Número de productos del maestro que tienen este tipo de material. Ej: 45 = hay 45 productos de tipo VERP.'),
      _xnPA('Número de fuentes de producción (SOURCEIDs) que usan productos de este tipo como componente PSI. Aunque estén excluidos del análisis principal, se valida su presencia como insumo. Ej: 12 = 12 recetas distintas usan un VERP como ingrediente.'),
      _xnPA('Códigos de los SOURCEIDs donde productos de este tipo excluido aparecen como componente en un BOM. Ej: SRC-001, SRC-005.'),
      _xnPA('Número de combinaciones componente-planta (de este tipo excluido) con arco de abastecimiento configurado en Location Source. Ej: 8 = 8 pares producto-planta tienen ruta de abastecimiento.'),
      _xnPA('Número de combinaciones componente-planta SIN arco de abastecimiento. Si > 0, hay insumos de tipo excluido sin ruta de llegada a la planta que los consume. Ej: 3 = 3 pares sin cobertura → 🟡 aunque el tipo esté excluido del análisis principal.'),
      _xnPA('Detalle: indica si el tipo aparece como componente en BOMs activos y si hay gaps de abastecimiento detectados. Ej: "Excluido del análisis principal. Validado como componente en 12 fuente(s). ⚠️ 3 combinación(es) componente-planta sin arco de abastecimiento".')
    ], [
      'ibp',
      'metric',
      'metric','detail',
      'metric','metric',
      'control'
    ]);

    // Para cada tipo excluido, listar sus productos y dónde aparecen como componente
    excluidos.sort().forEach(function(mt) {
      var cfg = MATTYPE_CFG[mt] || {};

      // Productos de este tipo
      var prdsOfType = Object.keys(PA_PRD).filter(function(p){ return pm(p) === mt; });

      // SOURCEIDs donde estos productos aparecen como componente PSI
      var sidsAsComp = new Set();
      prdsOfType.forEach(function(prd) {
        allPsi.forEach(function(r) {
          if (str(r.PRDID || '') === prd) sidsAsComp.add(str(r.SOURCEID));
        });
      });

      // Cobertura LocSrc para cada producto excluido como componente
      var covCount = 0, noCovCount = 0;
      prdsOfType.forEach(function(prd) {
        var consPlants = consumedAtLoc[prd] || new Set();
        consPlants.forEach(function(loc) {
          var k = prd + '|' + loc;
          if (locSrcByPrdLoc[k] && locSrcByPrdLoc[k].length > 0) covCount++;
          else noCovCount++;
        });
      });

      var obs = sidsAsComp.size
        ? 'Excluido del análisis principal. Validado como componente en ' + sidsAsComp.size + ' fuente(s) de producción.'
        : 'Excluido del análisis principal. No aparece como componente en ninguna fuente de producción.';
      if (noCovCount > 0) obs += ' ⚠️ ' + noCovCount + ' combinación(es) componente-planta sin arco de abastecimiento.';

      SX.addRow([
        mt, cfg.count || 0,
        sidsAsComp.size, codes(sidsAsComp),
        covCount, noCovCount,
        obs
      ], noCovCount > 0 ? C_YEL : null);
      track('Tipos Excluidos', noCovCount > 0 ? C_YEL : null);
    });
    SX.finalize();
    setStatusPA('Hoja Tipos Excluidos lista...', 97);
    await new Promise(function(r){ setTimeout(r, 0); });
  }

  /* ── HOJA 0: RESUMEN ── */
  setStatusPA('Generando Resumen...', 98);
  var sheetDefs = [
    { key: 'Product',              num: 1 },
    { key: 'Location',             num: 2 },
    { key: 'Resource',             num: 3 },
    { key: 'Resource Location',    num: 4 },
    { key: 'Prod Source Header',   num: 5 },
    { key: 'Prod Source Item',     num: 6 },
    { key: 'Prod Source Resource', num: 7 },
    { key: 'Tipos Excluidos',      num: 8 }
  ];
  sheetDefs.forEach(function(d) {
    var s = STATS[d.key]; if (!s) return;
    var pct  = s.total > 0 ? Math.round((s.ok / s.total) * 100) : 100;
    var fill = s.red > 0 ? C_RED : s.yel > 0 ? C_YEL : null;
    S0.addRow([d.num, d.key, s.total, s.red, s.yel, s.ok, pct + '%'], fill);
  });
  S0.finalize();

  if (execMeta) {
    var prdStat = STATS['Product'] || {};
    buildResumenMeta(S0.ws, {
      analyzer: 'Production Hierarchy Analyzer',
      generatedAt: execMeta.generatedAt,
      fileName: 'ProductionHierarchyAnalysis_' + today + '.xlsx',
      cfg: CFG,
      paFilter: execMeta.paFilter,
      entities: execMeta.entities,
      mattypeCfg: MATTYPE_CFG,
      kpis: [
        { label: 'Total productos en maestro',         value: Object.keys(PA_PRD).length.toLocaleString('es-CL') },
        { label: 'Productos analizados (incluidos)',   value: (prdStat.total || 0).toLocaleString('es-CL') },
        { label: 'Productos sin hallazgos (OK)',       value: (prdStat.ok || 0).toLocaleString('es-CL') },
        { label: 'SOURCEIDs activos (PSH)',            value: Object.keys(pshBySid).length.toLocaleString('es-CL') }
      ]
    });
  }

  /* ── EXPORT ── */
  setStatusPA('Generando archivo Excel...', 99);
  var buf  = await wb.xlsx.writeBuffer();
  var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'ProductionHierarchyAnalysis_' + today + '.xlsx';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
