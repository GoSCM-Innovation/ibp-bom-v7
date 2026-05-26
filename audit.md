# Auditoría de seguridad — GoSCM IBP-BOM-v7

**Fecha:** 2026-05-26
**Alcance acordado:** Backend (`server.js`) + entradas externas (parsers de ZIP/ATL/XML, proxy OData/SOAP) + insertions HTML del frontend que reciben datos externos. Frontend revisado únicamente bajo el lente de XSS/innerHTML.
**Skills aplicadas:** `insecure-defaults`, `sharp-edges`, `variant-analysis` (sobre los hallazgos críticos), análisis manual con lente `static-analysis` (semgrep/codeql no instalados — ver §7).
**Método:** 4 lentes de análisis en paralelo sobre 6011 LOC frontend + 391 LOC backend, cruzados con verificación de explotabilidad real (no sólo pattern-match).

---

## Resumen ejecutivo

| Severidad | # Hallazgos | Categorías principales |
|-----------|-------------|------------------------|
| **High**  | 5           | SSRF, credential forwarding, path traversal, DoS por parser exponencial |
| **Medium**| 9           | Validación de input, body limits, abuso de feedback, ZIP-bomb, O(N²) en explorer |
| **Low**   | 12          | CSP/HSTS faltantes, escapado incompleto, tamaño de archivo sin tope |
| **Info**  | 5           | Helpers frágiles, deps caret-pinned, parsing por regex |

**Top 5 a corregir ya:**

1. `H-01` SSRF total en `/api/cids-login` y `/api/cids-soap` — `hciUrl` sin validación alguna
2. `H-02` Path traversal vía `;v=...` en `validateService` (explotabilidad confirmada en prueba)
3. `H-03` Allowlist `.ondemand.com` demasiado amplia — cualquier tenant BTP es destino válido y recibe credenciales del usuario
4. `H-04` `expandExpr` con crecimiento exponencial (hasta 5 GB en 6 s desde un XML legítimo en estructura)
5. `H-05` Denylist de IPs privadas no cubre IPv6, IPv4-mapped, CGNAT — sólo importa si se relaja la suffix, pero es la única defensa profunda

---

## 1. Hallazgos HIGH

### H-01 · SSRF + exfiltración de credenciales en endpoints CI-DS
**Archivo:** `server.js:335-380` (`/api/cids-login`, `/api/cids-soap`)
**Evidencia:**
```js
app.post('/api/cids-login', async (req, res) => {
  const { hciUrl, orgName, user, password, isProduction } = req.body || {};
  if (!hciUrl || !orgName || !user || !password) return res.status(400)...
  // → SIN validateProxyUrl, SIN allowlist, SIN bloqueo de IPs privadas
  const { ok, status, text } = await cidsRawSoap(hciUrl, 'function=logon', buildCidsEnvelope(loginBody, null));
```
A diferencia de `/api/proxy*`, `hciUrl` no pasa por ningún validador. Un cliente puede:
- Hacer SSRF a `http://169.254.169.254/...`, `http://localhost:6379`, redes internas Vercel.
- Exfiltrar `orgName/userName/password` cleartext a `https://attacker.com/collect`.
- Encadenar respuestas SOAP crafted para feed al parser (`xmlVal`/`xmlAll`) — ver L-13.

**Fix:**
```js
function validateHciUrl(rawUrl) {
  const err = validateProxyUrl(rawUrl);
  if (err) return err;
  const host = new URL(rawUrl).hostname;
  const suffix = process.env.ALLOWED_HCI_SUFFIX || '.hana.ondemand.com';
  if (!host.endsWith(suffix)) return 'Host CI-DS no permitido';
  return null;
}
```
Aplicar al inicio de ambos endpoints. Considerar mover `hciUrl` a env var server-side si todo el deploy habla con un único CI-DS.

---

### H-02 · Path traversal vía `;v=...` en `validateService` (exploit verificado)
**Archivo:** `server.js:75-80` y uso en `:109`
**Evidencia:**
```js
function validateService(service) {
  if (!service) return 'Servicio no permitido';
  const baseName = service.split(';')[0];          // ← split, pero...
  if (!ALLOWED_SERVICES.includes(baseName)) return 'Servicio no permitido';
  return null;
}
// ... luego:
const url = `${base}${odataPrefix}${service}/${entityPath}${query ? '?' + query : ''}`;
//                                  ^^^^^^^^ usa el service ORIGINAL, no baseName
```
**Prueba concreta** (verificada por el agente sharp-edges):
- Input: `service = "MASTER_DATA_API_SRV;v=0002/../../../foo"`
- `split(';')[0]` = `"MASTER_DATA_API_SRV"` → pasa el allowlist
- URL final normalizada por `new URL`: `https://foo.ondemand.com/sap/opu/foo/Product`
- Resultado: cualquier path del host SAP queda alcanzable con la Basic Auth del usuario (incluye `/sap/bc/*`, ICF, gateway). Anula completamente `ALLOWED_SERVICES`.

**Fix:**
```js
function validateService(service) {
  if (!service) return 'Servicio no permitido';
  if (!/^[A-Z_]+(?:;v=\d+)?$/.test(service)) return 'Servicio no permitido';
  const baseName = service.split(';')[0];
  if (!ALLOWED_SERVICES.includes(baseName)) return 'Servicio no permitido';
  return null;
}
```
Variant-check: el patrón "split, valida la parte izquierda, usa raw" no aparece en ningún otro punto del repo (grep confirmó única ocurrencia).

---

### H-03 · Allowlist `.ondemand.com` permite cualquier tenant SAP BTP
**Archivo:** `server.js:67-68`
**Evidencia:** `host.endsWith('.ondemand.com')`. SAP BTP es multi-tenant: una cuenta trial gratis genera un host bajo ese sufijo. Un atacante puede:
1. Registrar trial `*.ondemand.com` y servir Basic Auth realm o capturar headers.
2. Tendría DNS rebinding sobre cualquier `*.ondemand.com` que controle vía CNAME.
3. Recibir la `Authorization: Basic` del usuario (líneas 112-119, 159-166, 208-215) — credenciales SAP IBP reales en cleartext base64.

Patrón ataque realista: phishing — la víctima entra creds SAP en una landing que apunta `base` a un trial atacante. El servidor proxy le entrega la creds sin reparos.

**Fix:** Restringir a la forma real de tenant IBP:
```js
const TENANT_RE = /^[a-z0-9-]+-api\.scmibp\.ondemand\.com$/i;
if (!TENANT_RE.test(host)) return 'Host no permitido';
```
o leer una lista explícita de hostnames desde env. Para DNS rebinding completo, resolver una vez y hacer fetch por IP con `Host:` header.

---

### H-04 · DoS por crecimiento exponencial en `expandExpr`
**Archivo:** `public/js/docs.js:234-256`
**Evidencia:** la profundidad se topa en 30 pero el contenido se duplica en cada nivel:
```js
function expandExpr(expr, ts, depth) {
  if (depth > 30 || !expr) return expr || '';
  return expr.replace(_REF, function() { ...
    return expandExpr(f.proj, ts, depth + 1);
  });
}
```
Si cada projection contiene K=2 refs a la siguiente transform, la salida crece como K^depth. Mediciones del agente:
- N=15 → 163 KB / 181 ms
- N=20 → 5.2 MB / 6.7 s
- N=22 → 20.9 MB / 24.6 s
- N≥25 → tab cuelga

Un XML legítimo en formato CI-DS con esa estructura crashea cualquier navegador que abra el ZIP.

**Fix:** budget global por llamada:
```js
function expandExpr(expr, ts, depth, budget) {
  budget = budget || { ops: 0 };
  if (depth > 30 || !expr || budget.ops > 10000) return expr || '';
  return expr.replace(_REF, function() {
    if (++budget.ops > 10000) return arguments[0];
    /* ...lógica existente, pasar budget... */
  });
}
```

---

### H-05 · Denylist de IPs privadas incompleto
**Archivo:** `server.js:62-64`
**Evidencia:**
```js
if (/^(localhost|127\.|10\.|169\.254\.|::1$)/.test(host)) return 'Host no permitido';
if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return 'Host no permitido';
if (/^192\.168\./.test(host)) return 'Host no permitido';
```
Faltan: `0.0.0.0`, `::`, `[::ffff:127.0.0.1]` (IPv4-mapped IPv6), `fc00::/7` (ULA), `fe80::/10` (link-local v6), `100.64.0.0/10` (CGNAT). Hoy el suffix `.ondemand.com` impide que un IP literal pase, pero **el denylist es la única defensa si se relaja `ALLOWED_HOST_SUFFIX`** (env var sin validación — ver L-09).

**Fix:** usar `ipaddr.js` para clasificar correctamente, o extender:
```js
if (/^(localhost|0\.0\.0\.0|127\.|10\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host)) return 'Host no permitido';
if (/^\[?(::1|::|fc|fd|fe80|::ffff:)/i.test(host)) return 'Host no permitido';
```

---

## 2. Hallazgos MEDIUM

### M-01 · `query` reenviado raw sin validación ni cota
**`server.js:94, 109`** — `query` viaja directo a la URL. Permite inyección de `#` (fragmento → URL fetched ≠ URL "log"), payloads enormes y, dependiendo de cómo SAP parsea, posible bypass adicional. **Fix:** `if (typeof query !== 'string' || query.length > 4096 || /[\s#]/.test(query)) return 400;`

### M-02 · CI-DS devuelve `e.message` y `faultString` al cliente
**`server.js:373, 378-379`** — incompatible con la política de "mensajes genéricos" del resto. Filtra hostnames upstream, fragmentos SQL/tablas. **Fix:** devolver `'Error interno del servidor'`.

### M-03 · `/api/send-feedback` sin protección anti-abuso
**`server.js:238-266`** — sin origin check, sin CSRF, sin per-route limiter, sin cota de longitud. 60 req/min/IP × cualquier sitio puede mandar correos a la cuenta del proyecto. **Fix:** limiter dedicado `max: 5/min`, `Origin` check contra `ibp-bom-v7.vercel.app`, caps `name<200`, `description<5000`.

### M-04 · `express.json()` sin `limit` explícito
**`server.js:36`** — usa default 100 KB; aceptable hoy, pero documentarlo es defensa profunda. **Fix:** `app.use(express.json({ limit: '64kb' }));`

### M-05 · `timeout: 120000` + sockets ilimitados → DoS amplificador
**`server.js:113-121, 160-167, 209-217, 295-300`** — `node-fetch` v2 con agente default tiene `maxSockets: Infinity` en HTTPS. 60 conexiones lentas por IP atacante × N IPs = FD exhaustion en despliegue long-lived. Más grave en `/api/cids-*` (sin allowlist). **Fix:** bajar timeout a 30 s; `new https.Agent({ maxSockets: 50, timeout: 30000 })` y pasarlo vía `agent:`.

### M-06 · ZIP-bomb / sin tope de tamaño descomprimido
**`docs.js:80-87`, `explorer.js:110-115`** — `JSZip.loadAsync` sin chequear `_data.uncompressedSize`. Un ZIP 1 KB puede expandir a GB. Self-DoS en tab del usuario; también afecta a compañeros si circulan ZIPs por SharePoint. **Fix:** sumar uncompressedSize antes de leer, rechazar > 200 MB; cap por archivo input a 50 MB.

### M-07 · `extractLookupPairs` se re-ejecuta en bucle O(N²) de cadenas
**`explorer.js:296` + `detectChains` 307-409`** — para cada par (a,b) de integraciones, se re-corre el regex sobre los `lookups` de `b`. 1000 integrations × 1000 = 1 M ejecuciones. Combinado con M-06 amplifica patológicamente. **Fix:** memoizar `extractLookupPairs(p.lookups)` por integración (cómputo único).

### M-08 · `detectChains` O(N²) sin usar índices invertidos ya existentes
**`explorer.js:307-409`** — doble `forEach` sobre `integrations`. Ya existe `indexes.bySourceKey` que se podría usar para O(N·k). **Fix:** rebuild loop para iterar sólo candidatos vía el índice.

### M-09 · `fetchAllPages` sin máximo de páginas ni filas
**`api.js:263-332`** — `while (url)` corre indefinidamente. Hoy depende de que SAP termine correctamente; una entity sin `$filter` carga todo (50M filas, OOM). **Fix:** `if (page > 1000 || all.length > 5_000_000) break;`

---

## 3. Hallazgos LOW

### L-01 · `escH()` no escapa `"` ni `'` — footgun de atributos
**`public/js/utils.js`** — `escH` usa el truco `textContent → innerHTML` que sólo escapa `& < >`. Pero la convención del repo es usar `escH` también para valores dentro de atributos `onclick='${escH(x)}'`, `id="${escH(y)}"`. Hoy no hay XSS activo porque las fuentes son IDs SAP alfanuméricos, pero **una sola entrada con `'` o `"` rompe todo handler `onclick=` inline**. Múltiples call-sites afectados (`extraFields.js:158-159`, `fieldmap.js:444-537`, `explorer.js:587, 612, 680`). **Fix unico que cierra toda la clase:**
```js
function escH(s) {
  return String(str(s))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

### L-02 · `fmtCoef` NaN fallback no escapado
**`utils.js:25` → `bom.js:951, 964`** — si `Number(v)` es NaN, devuelve `str(v)` sin escapar. Origen: `OUTPUTCOEFFICIENT`/`COMPONENTCOEFFICIENT` de PSH. **Fix:** `return isNaN(n) ? escH(str(v)) : ...`.

### L-03 · `visualizer.js:702-704` — fallback de `node._type` sin escapar
Hoy `_type` es constante interna; futuras extensiones podrían tomarlo de SAP. **Fix:** `escH(typeLabels[node._type] || node._type)`.

### L-04 · `explorer.js:1527` — `makeTooltip(lines)` acepta HTML crudo
Los tres callers actuales pre-escapan, pero el contrato del helper invita errores. **Fix:** renombrar el parámetro, agregar JSDoc, o cambiar firma a `{label, value}` con escape interno.

### L-05 · `utils.js:51` — `log(el, cls, msg)` interpola `cls` sin escapar
Hoy todos los call-sites pasan literales hardcoded (`'ok'`, `'err'`, etc.). **Fix:** validar contra allowlist o `escH(cls)`.

### L-06 · `explorer.js:1153` — `style="background:${st.color};"` con fallback constante
Safe hoy; si la fuente se vuelve externa, permite escape de atributo. **Fix:** `setAttribute('style', ...)` con valor parseado.

### L-07 · `xe()` (server.js:277-280) no escapa `'`
Correcto para los usos actuales (sólo element text), pero nombre genérico invita reusos en atributos. **Fix:** agregar `'` → `&apos;` o renombrar `escapeXmlText`.

### L-08 · EmailJS env vars sin validar al arranque
**`server.js:250-253`** — si falta una, EmailJS devuelve error genérico y operador no sabe que falta config. **Fix:** validar `REQUIRED_ENVS` al arranque, devolver 503 si falta.

### L-09 · `ALLOWED_HOST_SUFFIX` env var sin validación de formato
**`server.js:67`** — un typo a `'.com'` o `' '` amplía el SSRF. **Fix:** `if (!/^\.[a-z0-9.-]{3,}$/i.test(RAW_SUFFIX)) throw new Error(...)`.

### L-10 · `/api/proxy-next` puede ser dirigido a otro tenant `.ondemand.com`
**`server.js:189-205`** — sólo valida path prefix, no que `origin` coincida con un `base` legítimo. Riesgo bajo (requiere que un tenant SAP devuelva `__next` malicioso), pero defensa profunda. **Fix:** pasar `base` junto a `url` y comparar `new URL(url).origin === new URL(base).origin`. Limpiar `parsed.username/password` antes del fetch.

### L-11 · Sin CSP, sin HSTS, sin Permissions-Policy
**`server.js:29-34`** — sólo `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. CDN scripts cargan sin SRI (CLAUDE.md lo manda). **Fix:** agregar `Strict-Transport-Security` y `Content-Security-Policy` con script-src estricto + SRI en `index.html`.

### L-12 · Dependencias caret-pinned + Express 4.18.2 stale
**`package.json:11-14`** — Express 4.18.2 (Oct 2022); current 4.21+ con fixes CVE-2024-29041 y CVE-2024-43796. No hay `package-lock.json` en repo. **Fix:** subir Express a `^4.21.2`, commitear lockfile, agregar `"engines": { "node": ">=20" }`, considerar `fetch` nativo en lugar de `node-fetch` v2.

### L-13 · `xmlAll` cuadrático sobre respuesta SOAP malicioso (mitigado por H-01)
**`server.js:269-276`** — 100 MB con 1M elementos genera 1M slices; sólo explotable si H-01 sigue abierto. **Fix:** corregir H-01; opcionalmente capear `text.length` en `cidsRawSoap`.

---

## 4. Hallazgos INFO (deja anotado)

| ID | Archivo | Nota |
|----|---------|------|
| I-01 | `server.js:269-276` | `xmlVal`/`xmlAll` por regex — sin ReDoS real, pero frágil; un cambio de namespace SAP devuelve `null` silente. Considerar `fast-xml-parser` o `sax`. |
| I-02 | `server.js:75-80` | `ALLOWED_SERVICES.includes(baseName)` case-sensitive; SAP gateway es case-insensitive — irrelevante hoy pero anotar si se migra a regex. |
| I-03 | `public/js/i18n.js:83` | `data-i18n-html` renderiza traducciones con `innerHTML`. JSON de i18n hoy es estático y trust-equivalente a código. Si en el futuro se agregan placeholders `{x}` en claves HTML, hay XSS — documentar en CLAUDE.md o forzar escape en `interpolate()`. |
| I-04 | `public/js/docs.js:591` | `DOMParser` en browser mitiga XXE y billion-laughs por defecto. Anotar si el parsing migra a server-side. |
| I-05 | `vercel.json:6` | `/(.*)` routea todo a la lambda; los assets estáticos no cachean en CDN. Sin riesgo de seguridad pero amplifica el costo de DoS. **Fix opcional:** servir `public/**` como static. |

---

## 5. Variant-analysis sobre H-02 (split-validate-use-raw)

**Patrón buscado:** un input se split y se valida sólo una parte, pero el código downstream usa el original sin reconstruir.

**Búsqueda:** `grep -rn "\.split\(['\"][;:&]['\"]\)\[0\]"` en todo el repo.

**Resultado:** una sola ocurrencia — `server.js:77`. El patrón **no se repite**. Otras validaciones (`validateProxyUrl`, `validateEntityPath`) usan el input completo en el chequeo, así que el bypass es local a `validateService`.

**Conclusión:** el fix de H-02 cierra completamente la clase, sin instancias ocultas.

---

## 6. Lo que se verificó y se descartó (no findings)

- IDN/punycode contra `.ondemand.com`: `URL().hostname` devuelve forma ASCII, no se puede engañar.
- `https://attacker.com#.ondemand.com`: `hostname=attacker.com` → bloqueado.
- `https://sap-real.ondemand.com@attacker.com`: WHATWG strip userinfo correctamente.
- Trailing dot `foo.ondemand.com.`: `endsWith` falla → bloqueado (frágil si se quita el dot del suffix — ver L-09).
- `expandExpr` con `[^A-Za-z0-9_]`-style char-classes: lazy quantifiers usados → sin catastrophic backtracking (verificado con stress en agente ReDoS).
- `xmlVal`/`xmlAll`: no hay ReDoS real (lazy + char-class atómico).
- `node-fetch` v2 redirect: no reenvía `Authorization` cross-origin por default — pero recomendado `redirect: 'manual'` para hacer explícito.
- `validateEntityPath`: regex suficiente para los entity-set names que usa la app.
- CSRF en `/api/proxy*`: mitigado porque cada request lleva creds explícitas — no hay sesión que un atacante CSRF pueda secuestrar.
- 15 archivos `public/js/*.js` con `innerHTML`: 200+ líneas inspeccionadas, sólo 5 escapadas incompletas (todas en LOW).

---

## 7. Limitaciones de esta auditoría

- **Sin escaneo automatizado:** ni `semgrep` ni `codeql` están instalados en este entorno (`semgrep --version` → not found). Recomendado para próximo ciclo:
  ```bash
  pip install semgrep
  semgrep --config p/javascript --config p/nodejs --config p/owasp-top-ten .
  ```
- **Sin DAST/runtime testing:** no se levantó la app (CLAUDE.md prohíbe servidor local). Vulnerabilidades dependientes de runtime/timing no probadas.
- **Dependencias transitivas no auditadas:** `npm audit` no corrido. Recomendado en CI.
- **SAP IBP visto como confiable:** los flujos asumen que respuestas OData son benignas; un tenant SAP comprometido puede degradar al cliente vía `__next` malicioso (mitigado parcialmente por validación).

---

## 8. Plan de remediación sugerido (orden recomendado)

### Sprint 1 — bloqueantes (1 día)
1. **H-01** allowlist en `validateHciUrl` para `/api/cids-*`
2. **H-02** regex estricto en `validateService` + reconstruir service desde baseName
3. **L-01** hardening de `escH()` (cambia 1 archivo, cierra clase entera)
4. **M-02** generalizar mensajes de error CIDS

### Sprint 2 — defensa profunda (2-3 días)
5. **H-03** restringir suffix a `^[a-z0-9-]+-api\.scmibp\.ondemand\.com$`
6. **H-04** budget en `expandExpr`
7. **H-05** ampliar denylist IP (o usar `ipaddr.js`)
8. **M-01** validar `query` (longitud, caracteres)
9. **M-03** rate limiter dedicado + Origin check en `/api/send-feedback`
10. **M-06** tope ZIP descomprimido + tamaño de archivo

### Sprint 3 — calidad (1 sprint)
11. **L-11** CSP + HSTS + SRI en CDN
12. **L-12** bump deps + lockfile + Node 20+
13. **M-07/M-08** optimizar `detectChains` con índices
14. **M-09** cap en `fetchAllPages`
15. Resto de LOW.

---

## Apéndice — referencias por archivo

| Archivo | Hallazgos |
|---------|-----------|
| `server.js` | H-01, H-02, H-03, H-05, M-01, M-02, M-03, M-04, M-05, L-07, L-08, L-09, L-10, L-11, L-13, I-01, I-02 |
| `package.json` | L-12 |
| `vercel.json` | I-05 |
| `public/js/docs.js` | H-04, M-06, L-?? (parser de ATL/CSV en LOW vía agente ReDoS) |
| `public/js/explorer.js` | M-06, M-07, M-08, L-04, L-06 |
| `public/js/api.js` | M-09 |
| `public/js/utils.js` | L-01, L-02, L-05 |
| `public/js/visualizer.js` | L-03 |
| `public/js/i18n.js` | I-03 |
