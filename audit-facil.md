# Hallazgos de seguridad explicados en lenguaje claro

Este documento traduce los hallazgos técnicos del archivo `audit.md` a un lenguaje que cualquier persona del equipo pueda leer, aunque no programe. Cada sección sigue la misma estructura:

1. **Qué pasa hoy** (la falla en palabras simples)
2. **Por qué importa** (qué podría salir mal en la práctica)
3. **Cómo lo arreglamos**
4. **Te va a afectar?** (vos como usuario o nosotros como equipo)

Al final hay un resumen ejecutivo para quien quiera ver solo el bottom line.

---

## 1. Problemas graves (resolver primero)

### 1.1 La conexión a CI-DS no valida a dónde se conecta

**Dónde está:** archivo `server.js`, los endpoints `/api/cids-login` y `/api/cids-soap`.

**Qué pasa hoy:**
Cuando alguien usa el Explorer de integraciones y se conecta a CI-DS, escribe la URL de su CI-DS en un campo del modal. Esa URL viaja al servidor y el servidor la usa tal cual, sin verificar nada. Es como si tuvieras una recepcionista en la oficina que cuando un visitante dice "mandame el sobre a esta dirección" lo manda sin chequear si la dirección existe o si es legítima.

**Por qué importa:**
Alguien con conocimiento podría escribir cualquier dirección, incluso una controlada por un atacante. El servidor le mandaría las credenciales de CI-DS (usuario y contraseña) en texto plano a esa dirección. El atacante se queda con la contraseña.

Ejemplo concreto: alguien manda a la app a conectarse a `https://atacante.com/captura` en vez de a su CI-DS real. La app envía el usuario y la contraseña ahí. Punto.

**Cómo lo arreglamos:**
Le ponemos a la recepcionista una lista corta de direcciones a las que sí puede mandar correspondencia (los dominios oficiales de SAP CI-DS: `*.kyma.ondemand.com`, `*.hana.ondemand.com`, `*.hcs.cloud.sap`). Cualquier otra dirección la rechaza.

**Te va a afectar?**
**Casi seguro que no.** Los CI-DS reales de SAP siempre viven en esos dominios. Necesitamos solo confirmar con el equipo qué URLs están usando hoy. Si alguien usa un sandbox raro, ese sí podría quedar bloqueado y habría que sumarlo a la lista.

---

### 1.2 Se puede engañar al validador de servicios SAP para alcanzar URLs prohibidas

**Dónde está:** archivo `server.js`, función `validateService` (línea 75).

**Qué pasa hoy:**
La app tiene una lista blanca de servicios SAP permitidos (`MASTER_DATA_API_SRV`, `PLANNING_DATA_API_SRV`, etc.). El validador toma el nombre que mandó el cliente, le corta el final, y compara con la lista.

El problema: corta el final pero después usa el nombre **completo** (con todo lo que viene después). Esto deja una grieta. Un atacante manda algo como `MASTER_DATA_API_SRV;v=0002/../../../foo`. El validador ve "MASTER_DATA_API_SRV" en la lista, dice "OK", y la app termina pidiendo `/sap/opu/foo/...` en SAP en vez del servicio legítimo.

**Por qué importa:**
Esto permite saltarse la lista blanca de servicios. Quien lo explote llega con las credenciales del usuario a cualquier endpoint del servidor SAP que esas credenciales puedan ver. La lista blanca queda anulada.

**Cómo lo arreglamos:**
Cambiamos el validador para que rechace cualquier cosa que no tenga exactamente el formato `NOMBRE_DEL_SERVICIO` (opcionalmente seguido de `;v=NUMERO`). Si tiene barras, puntos o cualquier otro caracter, lo bloquea.

**Te va a afectar?**
**No.** Los tres servicios que la app usa siguen ese formato exacto. El fix es invisible para vos.

---

### 1.3 La lista de dominios SAP permitidos es demasiado amplia

**Dónde está:** archivo `server.js`, función `validateProxyUrl` (línea 67).

**Qué pasa hoy:**
La app permite conectarse a cualquier servidor cuyo dominio termine en `.ondemand.com`. El problema es que `.ondemand.com` es el dominio público de SAP BTP, donde **cualquier persona puede crear una cuenta trial gratis en 5 minutos** y obtener un subdominio.

**Por qué importa:**
Un atacante crea una cuenta trial gratis, le da un nombre tipo `mi-empresa-sap.ondemand.com`, y monta ahí un servidor. Después arma una página falsa o un link de phishing que apunta la app a su servidor. Cuando el usuario entra sus credenciales reales de SAP IBP, el proxy las manda directo al servidor del atacante. La app no se da cuenta porque el dominio "termina en .ondemand.com".

**Cómo lo arreglamos:**
Restringimos a un patrón mucho más específico: solo dominios que tengan la forma `<nombre>-api.scmibp.ondemand.com`, que es el formato real de los tenants de SAP IBP. Así un atacante no puede registrar uno trivialmente.

**Te va a afectar?**
**Probablemente no**, siempre que tu URL real de SAP IBP siga ese patrón estándar. Conviene confirmarlo: si conectás a una URL como `https://miempresa-api.scmibp.ondemand.com`, todo OK. Si conectás a algo distinto (algún sandbox o región rara), nos avisás antes y lo agregamos a la lista.

---

### 1.4 Un archivo malicioso puede colgar el navegador de quien lo abre

**Dónde está:** archivo `public/js/docs.js`, función `expandExpr` (línea 234).

**Qué pasa hoy:**
Cuando subís un ZIP con integraciones CI-DS, la app analiza expresiones del estilo "Transform1.Campo se convierte en Transform2.Campo2". Hace esto recursivamente: si Transform1 referencia a Transform2, expande, y si Transform2 referencia a Transform3, sigue.

El problema: si cada nivel referencia al siguiente **dos veces o más**, el resultado se duplica en cada nivel. Pasados 20 niveles ya estamos hablando de millones de copias. El navegador intenta procesarlas todas y se cuelga.

**Por qué importa:**
Alguien (o algo accidental) que arme un ZIP con esa estructura crashea cualquier navegador que lo abra. No roba datos, pero deja la app inutilizable para esa persona. Si pasa con un ZIP compartido en SharePoint entre varios, cuelga a todos.

**Cómo lo arreglamos:**
Le ponemos un "presupuesto" al proceso: si después de 10 000 operaciones de expansión no terminó, para y deja la expresión como estaba. Los ZIPs legítimos hoy usan 1 a 5 niveles, así que el límite no se nota.

**Te va a afectar?**
**No.** Tus ZIPs reales siguen funcionando igual. Solo ZIPs intencionalmente maliciosos o con estructuras absurdamente anidadas se ven cortados (y mejor que se corten a que crasheen el navegador).

---

### 1.5 La lista de IPs prohibidas tiene huecos en formato moderno (IPv6)

**Dónde está:** archivo `server.js`, líneas 62-64.

**Qué pasa hoy:**
La app bloquea conexiones a IPs internas (`127.0.0.1`, `192.168.x.x`, `10.x.x.x`, etc.). Pero solo en formato IPv4 viejo. No bloquea las equivalencias en formato IPv6, ni rangos modernos como CGNAT, ni IPv4 escrito como IPv6 (`[::ffff:127.0.0.1]`).

**Por qué importa:**
Hoy esto está mitigado porque la lista de dominios permitidos no acepta IPs literales. Pero si en algún momento se afloja esa lista (por ejemplo para hacer pruebas), el bloqueo de IPs queda como única defensa y tiene agujeros.

**Cómo lo arreglamos:**
Ampliamos las reglas para cubrir IPv6, IPv4 mapeado, CGNAT, link-local. Idealmente usamos una librería estándar (`ipaddr.js`) que ya tiene todos esos casos cubiertos.

**Te va a afectar?**
**No.** Ningún SAP IBP corre en esas IPs.

---

## 2. Problemas medios (resolver en un segundo pase)

### 2.1 El formulario de feedback se puede usar para spam

**Dónde está:** `server.js`, endpoint `/api/send-feedback` (línea 238).

**Qué pasa hoy:**
Cualquiera puede mandar 60 correos por minuto al equipo a través del botón de feedback. No hay límite de longitud del mensaje, ni chequeo de desde dónde se manda. Cualquier sitio web puede pegarle a ese endpoint desde el navegador de la víctima.

**Por qué importa:**
Si alguien decide molestar, llena el buzón del equipo de spam, y además gasta los créditos de EmailJS pagos.

**Cómo lo arreglamos:**
Tres cosas:
- Un límite más estricto: máximo 5 mensajes por minuto por IP.
- Tope al largo del mensaje (5000 caracteres es más que suficiente).
- Verificar que el feedback viene desde nuestra app (`ibp-bom-v7.vercel.app`) y no desde un sitio externo.

**Te va a afectar?**
**No.** Un mensaje normal de feedback son 200 a 1000 caracteres y se manda una vez.

---

### 2.2 Los parámetros de las consultas a SAP no tienen límite de tamaño

**Dónde está:** `server.js`, endpoint `/api/proxy`.

**Qué pasa hoy:**
La app reenvía a SAP todo lo que el cliente ponga en el campo "query" (filtros, ordenamientos, etc.) sin chequear si es razonable.

**Por qué importa:**
Alguien podría mandar parámetros gigantescos o con caracteres raros que confunden al servidor. No es robo de datos, pero abre la puerta a abuso.

**Cómo lo arreglamos:**
Aceptamos consultas de hasta 60 KB (el tope real medido hoy es 25 KB, así que dejamos margen 2x) y rechazamos algunos caracteres que la app nunca manda.

**Te va a afectar?**
**No.** Las consultas reales más grandes (un BOM completo con miles de productos) miden 20 a 25 KB. Tenemos el doble de margen.

---

### 2.3 Las conexiones a SAP no tienen tope claro de tiempo ni de conexiones simultáneas

**Dónde está:** `server.js`, todos los endpoints que llaman a SAP.

**Qué pasa hoy:**
Cada conexión a SAP puede durar hasta 2 minutos y no hay un límite global de cuántas conexiones pueden estar abiertas al mismo tiempo. Si alguien decide saturar, abre muchas conexiones lentas y consume todos los recursos del servidor.

**Por qué importa:**
La app puede quedar inaccesible para usuarios legítimos. En Vercel también significa más costo.

**Cómo lo arreglamos:**
Bajamos el timeout a 90 segundos (con margen para las páginas grandes de master data que sí pueden tardar) y ponemos un máximo de 50 conexiones simultáneas.

**Te va a afectar?**
**No.** Una página de 50 000 productos hoy tarda 5 a 30 segundos. 90 segundos sigue siendo holgura.

---

### 2.4 Subir un ZIP gigantesco puede colgar el navegador

**Dónde está:** `public/js/docs.js` y `public/js/explorer.js`.

**Qué pasa hoy:**
La app abre cualquier ZIP que arrastres sin verificar el tamaño descomprimido. Un ZIP malicioso de 1 KB puede expandirse a 5 GB (es una técnica vieja llamada "zip bomb"). Tu navegador se queda sin memoria y se cuelga.

**Por qué importa:**
Hoy es un problema solo si alguien te pasa un ZIP malicioso. Es realista en entornos donde se comparten archivos entre equipos.

**Cómo lo arreglamos:**
Antes de descomprimir, miramos cuánto pesa total. Si supera 200 MB descomprimido o el archivo en sí supera 50 MB, lo rechazamos con un mensaje claro.

**Te va a afectar?**
**No.** Los ZIPs reales de CI-DS son menores a 10 MB.

---

### 2.5 La detección de cadenas de integración es lenta con muchos archivos

**Dónde está:** `public/js/explorer.js`, función `detectChains`.

**Qué pasa hoy:**
Cuando subís muchos ZIPs al Explorer, la app compara cada integración con cada otra para detectar cadenas. Si tenés 1000 integraciones, hace un millón de comparaciones, repitiendo trabajo.

**Por qué importa:**
No es un agujero de seguridad, es una optimización. Con 100 integraciones tarda segundos. Con 5000 puede tardar minutos y congelar la UI.

**Cómo lo arreglamos:**
Calculamos los datos una vez y los reutilizamos en vez de recalcular en cada comparación.

**Te va a afectar?**
**Sí, positivamente.** Vas a notar que el Explorer carga más rápido.

---

### 2.6 La paginación de SAP no tiene un freno de seguridad

**Dónde está:** `public/js/api.js`, función `fetchAllPages`.

**Qué pasa hoy:**
La app sigue pidiéndole páginas a SAP "mientras haya". Si por error mandás una consulta sin filtros sobre una tabla de millones de filas, la app intenta cargar todo y revienta el navegador por memoria.

**Por qué importa:**
Un click descuidado puede dejarte sin sesión por minutos.

**Cómo lo arreglamos:**
Ponemos un tope de 10 millones de filas o 500 páginas y mostramos un warning en el log si lo alcanza. Para casos extremos te avisamos antes de continuar.

**Te va a afectar?**
**Casi nunca.** La mayoría de cargas reales son de cientos de miles, no millones. Si alguna vez se alcanza, vas a ver un warning claro en el log.

---

## 3. Mejoras de defensa profunda (cuando haya tiempo)

### 3.1 La función que escapa caracteres especiales tiene un hueco

**Dónde está:** `public/js/utils.js`, función `escH`.

**Qué pasa hoy:**
La app tiene una función que limpia caracteres especiales antes de mostrar texto que vino de afuera (de SAP, de un ZIP, etc.). Está bien hecha excepto que no limpia las comillas (`"` y `'`).

**Por qué importa:**
Hoy nada se rompe porque ningún ID de SAP tiene comillas. Pero el día que algo las tenga (un nombre de producto raro, una descripción copy/paste), puede romper la página visualmente.

**Cómo lo arreglamos:**
Cambiamos cinco líneas en un solo archivo para que también escape comillas. Cierra una clase entera de problemas potenciales.

**Te va a afectar?**
**No notás nada.** El navegador automáticamente las decodifica al mostrar el texto.

---

### 3.2 Faltan headers de seguridad modernos (CSP, HSTS)

**Dónde está:** `server.js` (donde se setean los headers).

**Qué pasa hoy:**
La app tiene tres headers de seguridad básicos pero le faltan los dos más importantes hoy: CSP (controla qué scripts pueden correr en la página) y HSTS (fuerza a usar HTTPS siempre).

**Por qué importa:**
Si alguien lograra inyectar código malicioso en la página (por ejemplo aprovechando un bug futuro), un CSP estricto lo bloquearía aunque el bug existiera. HSTS impide que un atacante en una WiFi pública te redirija a una versión sin HTTPS.

**Cómo lo arreglamos:**
Agregamos los headers en dos pasos:
1. **Ahora**: una versión permisiva que NO rompe nada. Da más protección que cero.
2. **Después** (un sprint dedicado): refactor de 144 handlers `onclick` que están en el HTML para poder tener la versión estricta.

**Te va a afectar?**
**No.** Cero impacto visible en cualquiera de los dos pasos.

---

### 3.3 Las dependencias de Node están desactualizadas

**Dónde está:** `package.json`.

**Qué pasa hoy:**
La app usa Express 4.18.2, que es de octubre 2022. La versión actual (4.21) tiene parches de seguridad.

**Por qué importa:**
Los parches cubren bugs conocidos. No están siendo explotados activamente en la app, pero es buena higiene.

**Cómo lo arreglamos:**
Actualizar a Express 4.21, commitear el lockfile (`package-lock.json`) para que las dependencias se instalen siempre igual, y fijar Node 20+.

**Te va a afectar?**
**No.** Express 4.21 es 100% compatible con 4.18.

---

### 3.4 Los mensajes de error de CI-DS revelan información interna

**Dónde está:** `server.js`, endpoint `/api/cids-soap` (línea 378).

**Qué pasa hoy:**
Cuando algo falla en CI-DS, el servidor le devuelve al usuario el mensaje técnico completo del error, que puede incluir nombres internos, fragmentos de SQL, IPs, etc.

**Por qué importa:**
Esa información puede ayudar a un atacante a mapear la infraestructura. Pequeño riesgo, pero gratis de cerrar.

**Cómo lo arreglamos:**
Mostramos un mensaje genérico al usuario (`Error interno del servidor`) y guardamos el detalle técnico solo en los logs del servidor para que el equipo pueda diagnosticar.

**Te va a afectar?**
**Levemente.** Vas a ver mensajes menos detallados cuando algo falle en CI-DS. Si necesitás diagnosticar, el detalle queda en los logs de Vercel.

---

### 3.5 Hallazgos menores (lista corta)

Hay 12 hallazgos adicionales de baja severidad. Todos son mejoras de robustez sin impacto en el uso normal:

- Validar que las variables de entorno de EmailJS estén configuradas al arrancar (hoy fallan silente).
- Validar el formato de la variable `ALLOWED_HOST_SUFFIX` al arrancar.
- Cubrir el caso de paginación que cruce a otro tenant (mitigado una vez que arreglemos 1.3).
- Escapar comillas también en el helper XML del servidor.
- Limpiar valores no esperados en varios componentes (visualizador, tooltips, logs).
- Cap de tamaño de archivo ATL.
- Servir los assets estáticos directo desde Vercel para no gastar invocaciones lambda.

Ninguna requiere acción del usuario.

---

## 4. Resumen ejecutivo

### Lo que te pedimos como usuario actual de la app

**Nada urgente.** Podés seguir usando la app exactamente igual mientras aplicamos los fixes. No vas a tener que:

- Volver a cargar tus credenciales SAP IBP.
- Limpiar caché del navegador.
- Reinstalar nada.
- Reconfigurar el tenant.
- Reabrir conexiones a CI-DS.

### Lo único que necesitamos confirmar antes de aplicar

1. **Lista de URLs reales de SAP IBP que estás usando hoy.** Si todas siguen el patrón `https://<algo>-api.scmibp.ondemand.com`, no hacés nada. Si alguna no, nos avisás para sumarla.
2. **Lista de URLs reales de CI-DS que estás usando hoy.** Para asegurar que el filtro nuevo no las bloquee.

Con esas dos confirmaciones, el resto es invisible para vos.

### Lo que vas a notar en positivo

- El Explorer va a cargar más rápido con muchos ZIPs.
- Si subís un ZIP malicioso o muy grande, te lo avisa en vez de colgarse.
- Si una consulta a SAP devuelve datos enormes, te muestra un warning en vez de quedar pegada.

### Lo que NO te va a impactar (aclaraciones frecuentes)

- **Tus permisos en SAP**: no se tocan, son tuyos.
- **Tus consultas guardadas**: no hay nada guardado del lado servidor, todo vive en tu navegador.
- **El idioma**: no cambia.
- **Las exportaciones a Excel**: no se tocan.
- **El visualizador de red**: no se toca.

### Plan de trabajo del equipo

- **Sprint 1** (1 a 2 días): los 5 problemas graves de la sección 1.
- **Sprint 2** (2 a 3 días): los 6 problemas medios de la sección 2.
- **Sprint 3** (un sprint dedicado, opcional): las mejoras de defensa profunda de la sección 3, incluyendo el refactor para CSP estricto.

---

## Archivos referenciados (para el equipo técnico)

- Reporte técnico completo: `audit.md` (en la raíz del repo)
- Backend: `server.js`
- Frontend de parseo: `public/js/docs.js`, `public/js/explorer.js`
- Frontend de utilitarios: `public/js/utils.js`, `public/js/api.js`
- HTML principal: `public/index.html`
- Configuración de deploy: `vercel.json`, `package.json`
- Variables de entorno: `.env.example` (referencia)
