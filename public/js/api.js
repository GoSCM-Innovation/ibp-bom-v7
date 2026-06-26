    /* ═══════════════════════════════════════════════════════════════
       INDEXEDDB HELPERS
       All large datasets stream into IDB — JS heap holds only small
       per-product subtrees (BOM) and lookup tables (SN).
       ═══════════════════════════════════════════════════════════════ */
    function openDB() {
      return new Promise(function (resolve, reject) {
        var req = indexedDB.open('ibp_data', 6);
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          // BOM stores
          if (!db.objectStoreNames.contains('bom_psh')) {
            var s = db.createObjectStore('bom_psh', { autoIncrement: true });
            s.createIndex('by_prdid', 'PRDID', { unique: false });
            s.createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('bom_psi')) {
            db.createObjectStore('bom_psi', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('bom_psr')) {
            db.createObjectStore('bom_psr', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('bom_prd')) {
            db.createObjectStore('bom_prd', { keyPath: 'PRDID' });
          }
          if (!db.objectStoreNames.contains('bom_psisub')) {
            db.createObjectStore('bom_psisub', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          // BOM Location master (lookup for LOCID→LOCDESCR in BOM tab)
          if (!db.objectStoreNames.contains('bom_loc')) {
            db.createObjectStore('bom_loc', { keyPath: 'LOCID' });
          }
          // BOM Production Source Item Validity — vigencias por SOURCEID+componente
          if (!db.objectStoreNames.contains('bom_psi_validity')) {
            db.createObjectStore('bom_psi_validity', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          // SN edge stores (SN lookup tables stay in SN_IDX JS object — they are small)
          if (!db.objectStoreNames.contains('sn_loc')) {
            db.createObjectStore('sn_loc', { autoIncrement: true })
              .createIndex('by_prdid', 'PRDID', { unique: false });
          }
          if (!db.objectStoreNames.contains('sn_cust')) {
            db.createObjectStore('sn_cust', { autoIncrement: true })
              .createIndex('by_prdid', 'PRDID', { unique: false });
          }
          if (!db.objectStoreNames.contains('sn_plant')) {
            db.createObjectStore('sn_plant', { autoIncrement: true })
              .createIndex('by_prdid', 'PRDID', { unique: false });
          }
          // SN PSI — Production Source Item for SN Analyzer
          if (!db.objectStoreNames.contains('sn_psi')) {
            var snPsi = db.createObjectStore('sn_psi', { autoIncrement: true });
            snPsi.createIndex('by_prdid', 'PRDID', { unique: false });
            snPsi.createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          // SN Location Product — large table, stored in IDB
          if (!db.objectStoreNames.contains('sn_loc_prod')) {
            var snLp = db.createObjectStore('sn_loc_prod', { autoIncrement: true });
            snLp.createIndex('by_prdid', 'PRDID', { unique: false });
            snLp.createIndex('by_locid', 'LOCID', { unique: false });
          }
          // SN Customer Product — large table, stored in IDB
          if (!db.objectStoreNames.contains('sn_cust_prod')) {
            var snCp = db.createObjectStore('sn_cust_prod', { autoIncrement: true });
            snCp.createIndex('by_prdid', 'PRDID', { unique: false });
            snCp.createIndex('by_custid', 'CUSTID', { unique: false });
          }
          // PA (Production Analyzer) stores
          if (!db.objectStoreNames.contains('pa_psh')) {
            var paPsh = db.createObjectStore('pa_psh', { autoIncrement: true });
            paPsh.createIndex('by_prdid', 'PRDID', { unique: false });
            paPsh.createIndex('by_locid', 'LOCID', { unique: false });
            paPsh.createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('pa_psi')) {
            var paPsi = db.createObjectStore('pa_psi', { autoIncrement: true });
            paPsi.createIndex('by_sourceid', 'SOURCEID', { unique: false });
            paPsi.createIndex('by_prdid', 'PRDID', { unique: false });
          }
          if (!db.objectStoreNames.contains('pa_psisub')) {
            db.createObjectStore('pa_psisub', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('pa_psr')) {
            db.createObjectStore('pa_psr', { autoIncrement: true })
              .createIndex('by_sourceid', 'SOURCEID', { unique: false });
          }
          if (!db.objectStoreNames.contains('pa_loc_prod')) {
            var paLp = db.createObjectStore('pa_loc_prod', { autoIncrement: true });
            paLp.createIndex('by_prdid', 'PRDID', { unique: false });
            paLp.createIndex('by_locid', 'LOCID', { unique: false });
          }
          if (!db.objectStoreNames.contains('pa_loc_src')) {
            var paLs = db.createObjectStore('pa_loc_src', { autoIncrement: true });
            paLs.createIndex('by_prdid', 'PRDID', { unique: false });
            paLs.createIndex('by_locfr', 'LOCFR', { unique: false });
          }
          // SN vista web — filas de display precomputadas (Location/Customer Source)
          // para paginar el 100% desde disco sin retenerlas en RAM. Registro: { c:[celdas], s:'red'|'yel'|'ok' }
          if (!db.objectStoreNames.contains('sn_loc_web')) {
            db.createObjectStore('sn_loc_web', { autoIncrement: true })
              .createIndex('by_severity', 's', { unique: false });
          }
          if (!db.objectStoreNames.contains('sn_cust_web')) {
            db.createObjectStore('sn_cust_web', { autoIncrement: true })
              .createIndex('by_severity', 's', { unique: false });
          }
        };
        req.onsuccess = function (e) {
          var db = e.target.result;
          // Cerrar esta conexión si una pestaña futura necesita un upgrade (evita bloqueos).
          db.onversionchange = function () { try { db.close(); } catch (_) {} };
          resolve(db);
        };
        req.onerror = function (e) { reject(e.target.error); };
        req.onblocked = function () { try { console.warn('[IDB] Actualización bloqueada: cierra otras pestañas de la app para actualizar la base local.'); } catch (_) {} };
      });
    }

    function idbClear(storeName) {
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = resolve;
        tx.onerror = function (e) { reject(e.target.error); };
      });
    }

    function idbBulkPut(storeName, records) {
      if (!records || !records.length) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(storeName, 'readwrite');
        var store = tx.objectStore(storeName);
        records.forEach(function (r) { store.put(r); });
        tx.oncomplete = resolve;
        tx.onerror = function (e) { reject(e.target.error); };
      });
    }

    function idbGetByIndex(storeName, indexName, key) {
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).index(indexName).getAll(key);
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    function idbGet(storeName, key) {
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(key);
        req.onsuccess = function (e) { resolve(e.target.result); };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    function idbGetAll(storeName) {
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function (e) { resolve(e.target.result || []); };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    /* Itera todos los registros de un store con cursor (bajo consumo de RAM).
       onRecord(row) es síncrono — no acumula array, cada registro se descarta
       tras el callback. */
    function idbCursorEach(storeName, onRecord) {
      return new Promise(function (resolve, reject) {
        var tx  = IDB.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).openCursor();
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) { resolve(); return; }
          onRecord(cursor.value);
          cursor.continue();
        };
        req.onerror   = function (e) { reject(e.target.error); };
        tx.onerror    = function (e) { reject(e.target.error); };
      });
    }

    /* Cuenta total de registros de un store. */
    function idbCount(storeName) {
      return new Promise(function (resolve, reject) {
        var req = IDB.transaction(storeName, 'readonly').objectStore(storeName).count();
        req.onsuccess = function (e) { resolve(e.target.result || 0); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    }

    /* Cuenta registros de un índice para una key exacta. */
    function idbCountByIndex(storeName, indexName, key) {
      return new Promise(function (resolve, reject) {
        var req = IDB.transaction(storeName, 'readonly').objectStore(storeName).index(indexName).count(IDBKeyRange.only(key));
        req.onsuccess = function (e) { resolve(e.target.result || 0); };
        req.onerror   = function (e) { reject(e.target.error); };
      });
    }

    /* Lee una página de registros (offset/limit) por cursor, opcionalmente por
       índice + key exacta. Memoria acotada: solo retiene la página pedida. */
    function idbCursorPage(storeName, indexName, key, offset, limit) {
      return new Promise(function (resolve, reject) {
        var out = [], skipped = false;
        var tx  = IDB.transaction(storeName, 'readonly');
        var src = indexName ? tx.objectStore(storeName).index(indexName) : tx.objectStore(storeName);
        var range = (key != null) ? IDBKeyRange.only(key) : null;
        var req = src.openCursor(range);
        req.onsuccess = function (e) {
          var cur = e.target.result;
          if (!cur) { resolve(out); return; }
          if (offset > 0 && !skipped) { skipped = true; cur.advance(offset); return; }
          out.push(cur.value);
          if (out.length >= limit) { resolve(out); return; }
          cur.continue();
        };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    /* Escanea por cursor recogiendo hasta maxMatches registros que cumplan test(),
       deteniéndose tras maxScan registros revisados. Devuelve { rows, truncated }.
       Memoria acotada por maxMatches. */
    function idbCursorScanMatch(storeName, indexName, key, test, maxMatches, maxScan) {
      return new Promise(function (resolve, reject) {
        var out = [], scanned = 0;
        var tx  = IDB.transaction(storeName, 'readonly');
        var src = indexName ? tx.objectStore(storeName).index(indexName) : tx.objectStore(storeName);
        var range = (key != null) ? IDBKeyRange.only(key) : null;
        var req = src.openCursor(range);
        req.onsuccess = function (e) {
          var cur = e.target.result;
          if (!cur) { resolve({ rows: out, truncated: false }); return; }
          scanned++;
          if (test(cur.value)) out.push(cur.value);
          if (out.length >= maxMatches) { resolve({ rows: out, truncated: true }); return; }
          if (scanned >= maxScan)       { resolve({ rows: out, truncated: true }); return; }
          cur.continue();
        };
        req.onerror = function (e) { reject(e.target.error); };
      });
    }

    /* Builds prodSuggestions by iterating unique PRDID keys from bom_psh
       and looking up descriptions from bom_prd — single transaction, no N+1. */
    function idbBuildProdSuggestions() {
      return new Promise(function (resolve, reject) {
        var tx = IDB.transaction(['bom_psh', 'bom_prd'], 'readonly');
        var pshIdx = tx.objectStore('bom_psh').index('by_prdid');
        var prdStore = tx.objectStore('bom_prd');
        var list = [];
        var curReq = pshIdx.openKeyCursor(null, 'nextunique');
        curReq.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) { resolve(list); return; }
          var pid = String(cursor.key);
          var gr = prdStore.get(pid);
          gr.onsuccess = function (e2) {
            var p = e2.target.result || {};
            list.push({ prdid: pid, prddescr: String(p.PRDDESCR || '').trim() });
            cursor.continue();
          };
        };
        curReq.onerror = function (e) { reject(e.target.error); };
      });
    }


    /* ═══════════════════════════════════════════════════════════════
       API HELPERS
       ═══════════════════════════════════════════════════════════════ */

    // Decomposes a full OData URL into structured components for the server proxy.
    // Prevents client-side manipulation of the OData path prefix and service name
    // from reaching the server as-is; the server validates each component separately.
    function decomposeODataUrl(fullUrl) {
      var parsed = new URL(fullUrl);
      var base  = parsed.origin;
      var parts = parsed.pathname.split('/');
      // pathname always: /sap/opu/odata/{NS}/{service}/{entity}
      // parts[0]='' parts[1]='sap' parts[2]='opu' parts[3]='odata' parts[4]=NS parts[5]=service parts[6+]=entity
      var ns      = parts[4] ? parts[4].toUpperCase() : '';
      var prefix  = ns === 'IBP' ? 'IBP' : 'SAP';
      var service = parts[5] || '';                           // may include ;v=0002
      var ePath   = parts.slice(6).join('/') || '$metadata';
      var query   = parsed.search ? parsed.search.substring(1) : '';
      return { base: base, service: service, path: ePath, query: query, prefix: prefix };
    }

    async function apiJson(url) {
      var d = decomposeODataUrl(url);
      var resp = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: d.base, service: d.service, path: d.path, query: d.query, prefix: d.prefix, user: CFG.user, password: CFG.pass })
      });
      if (!resp.ok) {
        var err = await resp.json().catch(function () { return { error: resp.statusText }; });
        throw new Error(err.error || resp.statusText);
      }
      return resp.json();
    }

    async function apiXml(url) {
      var d = decomposeODataUrl(url);
      var resp = await fetch('/api/proxy-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: d.base, service: d.service, prefix: d.prefix, user: CFG.user, password: CFG.pass })
      });
      if (!resp.ok) {
        var err = await resp.json().catch(function () { return { error: resp.statusText }; });
        throw new Error(err.error || resp.statusText);
      }
      return resp.text();
    }

    // Used exclusively for SAP-provided pagination links (__next / @odata.nextLink).
    // These are full URLs returned by the SAP server, not constructed by the client.
    async function apiJsonNext(url) {
      var resp = await fetch('/api/proxy-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, user: CFG.user, password: CFG.pass })
      });
      if (!resp.ok) {
        var err = await resp.json().catch(function () { return { error: resp.statusText }; });
        throw new Error(err.error || resp.statusText);
      }
      return resp.json();
    }


    // Extrae el nombre de la entidad del último segmento de la URL (antes del ?)
    function _entityNameFromUrl(entityUrl) {
      return (entityUrl || '').split('?')[0].split('/').pop();
    }

    async function fetchAllPages(entityUrl, logEl, pverFilter, selectFields) {
      var all = [];
      var PAGE_SIZE = 50000;
      var page = 0;
      var entityName = _entityNameFromUrl(entityUrl);
      // audit M-09: safety caps to prevent runaway pagination if a query
      // accidentally omits filters or the upstream returns an infinite chain.
      // 500 pages × 50000 = 25M rows ceiling; soft cap on rows at 10M.
      var MAX_PAGES = 500;
      var MAX_ROWS  = 10000000;

      // Aplicar mapeos de campos si existen
      var canonicalFields = selectFields ? selectFields.split(',') : [];
      var resolvedSelect = (typeof buildSelect === 'function' && canonicalFields.length)
        ? buildSelect(entityName, canonicalFields)
        : selectFields;

      var filterParam = pverFilter ? '&$filter=' + encodeURIComponent(pverFilter) : '';
      var selectParam = resolvedSelect ? '&$select=' + resolvedSelect : '';
      var url = entityUrl + '?$format=json&$top=' + PAGE_SIZE + filterParam + selectParam;
      var isNextLink = false;

      while (url) {
        page++;
        if (page > MAX_PAGES) {
          log(logEl, 'warn', '  ↳ Tope de páginas alcanzado (' + MAX_PAGES + '). Datos parciales: ' + all.length + ' filas.');
          break;
        }
        if (all.length >= MAX_ROWS) {
          log(logEl, 'warn', '  ↳ Tope de filas alcanzado (' + MAX_ROWS + '). Datos parciales.');
          break;
        }
        if (page > 1) {
          log(logEl, 'info', '  ↳ Pág.' + page + ' GET → ' + url);
        }

        var data;
        try {
          data = await (isNextLink ? apiJsonNext(url) : apiJson(url));
        } catch (fetchErr) {
          // 404 de entidad → tratar como sin datos y continuar
          var msg = fetchErr.message || '';
          if (msg.indexOf('404') >= 0 || msg.toLowerCase().indexOf('not found') >= 0) {
            log(logEl, 'warn', '  Entidad no encontrada (404): ' + entityName + ' — se omite, sin datos.');
            return [];
          }
          throw fetchErr;
        }

        var results = (data.d && data.d.results) ? data.d.results : (data.value || []);

        // Normalizar filas: añadir alias canónicos según FIELD_MAP
        if (typeof normalizeRows === 'function') {
          results = normalizeRows(entityName, results);
        }

        all = all.concat(results);

        if (page > 1) {
          log(logEl, 'info', '  ↳ Pág.' + page + ': +' + results.length + ' (acumulado: ' + all.length + ')');
        }

        // OData v2 __next  /  OData v4 @odata.nextLink
        var next = (data.d && data.d.__next) ? data.d.__next : null;
        if (!next && data['@odata.nextLink']) next = data['@odata.nextLink'];

        if (next) {
          url = (next.indexOf('http') === 0) ? next : (CFG.url + next);
          isNextLink = true;
        } else if (results.length === PAGE_SIZE) {
          // Página completa sin link → fallback $skip para no perder registros
          var skip = all.length;
          url = entityUrl + '?$format=json&$top=' + PAGE_SIZE + '&$skip=' + skip + filterParam + selectParam;
          isNextLink = false;
          log(logEl, 'warn', '  ↳ Sin __next, fallback $skip=' + skip + ' → ' + url);
        } else {
          // Página parcial → fin de datos
          url = null;
        }
      }

      return all;
    }


