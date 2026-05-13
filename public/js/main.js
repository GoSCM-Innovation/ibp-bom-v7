    /* ═══════════════════════════════════════════════════════════════
       CONNECTION WIZARD CACHE
       ═══════════════════════════════════════════════════════════════ */
    var CONN_CACHE      = { metaText: null, vsmt: [] };
    var CONN_SAVED_CFG  = null; // snapshot de la conexión previa al iniciar una reconexión

    /* ═══════════════════════════════════════════════════════════════
       TAB NAVIGATION
       ═══════════════════════════════════════════════════════════════ */
    var TAB_BANNERS = { bom: 'infoBannerBom', network: 'infoBannerNetwork', visualizer: 'infoBannerVisualizer', pa: 'infoBannerPA', docs: 'infoBannerDocs', explorer: 'infoBannerExplorer' };

    function switchTab(tabId) {
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      document.getElementById('tab-' + tabId).classList.add('active');
      document.getElementById('tabBtn-' + tabId).classList.add('active');
      // Close sidebar on mobile after selecting a tab
      if (window.innerWidth <= 900) closeSidebar();
      // Show banner for active tab only
      Object.keys(TAB_BANNERS).forEach(function (t) {
        var el = document.getElementById(TAB_BANNERS[t]);
        if (el) el.classList.toggle('visible', t === tabId);
      });
      if (typeof updateTabLocks === 'function') {
          updateTabLocks();
      }
    }

    function updateTabLocks() {
      var isConn = (typeof IS_CONNECTED !== 'undefined' && IS_CONNECTED);
      document.querySelectorAll('.tab-panel').forEach(function(panel) {
          var tabId = panel.id.replace('tab-', '');
          var btn = document.getElementById('tabBtn-' + tabId);
          if (btn && btn.classList.contains('req-conn')) {
              var lockMsg = panel.querySelector('.locked-message');
              Array.from(panel.children).forEach(function(child) {
                  if (!child.classList.contains('tab-info-banner') && !child.classList.contains('locked-message')) {
                      if (!isConn) {
                          child.classList.add('locked-hidden');
                      } else {
                          child.classList.remove('locked-hidden');
                      }
                  }
              });
              if (lockMsg) {
                  lockMsg.style.display = isConn ? 'none' : 'block';
              }
          }
      });
    }

    function toggleMappingBody(bodyId, arrId, forceState) {
      var body = document.getElementById(bodyId);
      var arr = document.getElementById(arrId);
      if (!body || !arr) return;
      var isHidden = body.style.display === 'none';
      var newState = typeof forceState !== 'undefined' ? forceState : isHidden;
      body.style.display = newState ? 'block' : 'none';
      arr.textContent = newState ? '▼' : '▶';
    }

    /* ═══════════════════════════════════════════════════════════════
       STEP 1: CONNECT — Fetch $metadata, parse entities
       ═══════════════════════════════════════════════════════════════ */
    function setConnStatus(type, msg) {
      var el = document.getElementById('connStatusText');
      if (!el) return;
      var colors = { ok: 'var(--accent)', err: 'var(--red)', warn: 'var(--amber)', info: 'var(--text2)' };
      el.style.color = colors[type] || 'var(--text2)';
      el.textContent = msg;
    }

    function toggleConnLogs() {
      var logEl = document.getElementById('logConnect');
      var btn = document.getElementById('btnToggleConnLogs');
      var hidden = logEl.classList.toggle('hidden');
      btn.textContent = hidden ? 'Ver logs técnicos' : 'Ocultar logs';
    }

    async function doConnect(event) {
      if (event && event.preventDefault) event.preventDefault();
      var logEl = document.getElementById('logConnect');
      logEl.classList.add('hidden');
      logEl.innerHTML = '';
      var connStatusEl = document.getElementById('connStatus');
      connStatusEl.style.cssText = 'display:flex;font-size:12px;margin-top:6px;align-items:center;gap:8px;';
      setConnStatus('info', 'Conectando a SAP IBP...');
      log(logEl, 'info', 'Conectando a SAP IBP...');

      CFG.url  = document.getElementById('inpUrl').value.replace(/\/+$/, '') || CFG.url;
      CFG.user = document.getElementById('inpUser').value || CFG.user;
      // Los navegadores pueden borrar campos password ocultos — preservar el valor ya fijado por el wizard
      CFG.pass = document.getElementById('inpPass').value || CFG.pass;
      CFG.pa   = document.getElementById('inpPA').value.toUpperCase().trim();
      CFG.pver = document.getElementById('inpPver').value.toUpperCase().trim();
      CFG.service = IBP_SERVICE;

      if (!CFG.url || !CFG.user || !CFG.pass || !CFG.pa) {
        log(logEl, 'err', 'Completa URL, usuario, contraseña y Planning Area');
        return;
      }

      function addHist(key, val) {
        if (!val) return;
        try {
          var arr = JSON.parse(localStorage.getItem(key) || '[]');
          var i = arr.indexOf(val);
          if (i !== -1) arr.splice(i, 1);
          arr.unshift(val);
          if (arr.length > 5) arr.pop();
          localStorage.setItem(key, JSON.stringify(arr));
        } catch(e) {}
      }
      addHist('ibp_h_url', CFG.url);
      addHist('ibp_h_pa', CFG.pa);
      addHist('ibp_h_pver', CFG.pver);

      document.getElementById('btnConnect').disabled = true;

      try {
        // Fetch $metadata — usa cache del wizard si está disponible
        var resp;
        if (CONN_CACHE.metaText) {
          resp = CONN_CACHE.metaText;
          log(logEl, 'info', 'Usando $metadata en caché (' + resp.length + ' bytes)');
        } else {
          setConnStatus('info', 'Leyendo metadatos OData...');
          var metaUrl = CFG.url + '/sap/opu/odata/IBP/' + CFG.service + '/$metadata';
          log(logEl, 'info', 'GET $metadata → ' + metaUrl);
          resp = await apiXml(metaUrl);
          log(logEl, 'ok', '$metadata recibido (' + resp.length + ' bytes)');
        }

        // Parse XML to find EntityTypes
        setConnStatus('info', 'Detectando entidades...');
        var parser = new DOMParser();
        var xml = parser.parseFromString(resp, 'text/xml');
        var entityTypes = xml.querySelectorAll('EntityType');
        ENTITIES = [];

        entityTypes.forEach(function (et) {
          var name = et.getAttribute('Name') || '';
          var fields = [];
          var fieldMeta = {};
          et.querySelectorAll('Property').forEach(function (p) {
            var id = p.getAttribute('Name') || '';
            if (!id) return;
            var label = p.getAttributeNS('http://www.sap.com/Protocols/SAPData', 'label')
                        || p.getAttribute('sap:label') || '';
            fields.push(id);
            if (label) fieldMeta[id] = label;
          });
          if (fields.length > 0) ENTITIES.push({ name: name, fields: fields, fieldMeta: fieldMeta });
        });

        log(logEl, 'ok', ENTITIES.length + ' entidades encontradas');

        // Fetch VersionSpecificMasterDataTypes for this PA+Version to derive entity prefix
        setConnStatus('info', 'Derivando prefijo de entidades para ' + CFG.pa + '...');
        var mdtFilter = CFG.pver
          ? "PlanningAreaID eq '" + CFG.pa + "' and VersionID eq '" + CFG.pver + "'"
          : "PlanningAreaID eq '" + CFG.pa + "'";
        var vsmtUrl = CFG.url + '/sap/opu/odata/IBP/' + CFG.service
          + '/VersionSpecificMasterDataTypes?$format=json&$top=50000&$filter=' + encodeURIComponent(mdtFilter);
        var vsmtData = await apiJson(vsmtUrl);
        var vsmtItems = (vsmtData.d && vsmtData.d.results) ? vsmtData.d.results : (vsmtData.value || []);
        var mdtIds = vsmtItems.map(function (it) { return it.MasterDataTypeID; }).filter(Boolean);
        var prefix = derivePrefix(mdtIds);
        log(logEl, 'info', 'Prefijo detectado: "' + (prefix || '(ninguno)') + '" — ' + mdtIds.length + ' MDTs');

        // Build prefix-filtered entity pool for the search dropdowns
        CFG.paEntities = prefix
          ? ENTITIES.filter(function (e) { return e.name.toUpperCase().indexOf(prefix.toUpperCase()) === 0; })
          : ENTITIES;
        if (CFG.paEntities.length === 0) CFG.paEntities = ENTITIES;

        // Auto-detect MDTs and populate BOM panel
        var detected = autoDetectMDTs(ENTITIES, prefix);
        log(logEl, 'info', 'Auto-detección BOM: Header=' + (detected.header || '?') + ', Item=' + (detected.item || '?')
          + ', Resource=' + (detected.resource || '?') + ', Product=' + (detected.product || '?')
          + ', LocMaster=' + (detected.locMaster || '?') + ', ResMaster=' + (detected.resMaster || '?'));
        populateMDTPanel(detected);

        // Auto-detect MDTs and populate Supply Network panel
        var detectedSN = autoDetectSNMDTs(ENTITIES, prefix);
        log(logEl, 'info', 'Auto-detección SN: Location=' + (detectedSN.location || '?') + ', Customer=' + (detectedSN.customer || '?')
          + ', Product=' + (detectedSN.product || '?') + ', SourceProd=' + (detectedSN.sourceProd || '?')
          + ', LocMaster=' + (detectedSN.locMaster || '?') + ', CustMaster=' + (detectedSN.custMaster || '?')
          + ', SourceItem=' + (detectedSN.sourceItem || '?') + ', LocProd=' + (detectedSN.locProd || '?')
          + ', CustProd=' + (detectedSN.custProd || '?'));
        populateSNMDTPanel(detectedSN);

        // Populate Visualizer MDT panel (same auto-detection as SN)
        populateVizMDTPanel(detectedSN);
        document.getElementById('panelVizMDT').style.display = 'block';

        // Populate Production Hierarchy Analyzer MDT panel
        populatePAMDTPanel(detected, detectedSN);
        document.getElementById('panelPAMDT').classList.remove('hidden');

        // Limpiar snapshot ANTES de setConnected — setConnected llama closeConnectDialog
        // internamente, y closeConnectDialog restauraría el CFG anterior si el snapshot existe.
        CONN_SAVED_CFG = null;
        CONN_CACHE.metaText = null;
        CONN_CACHE.vsmt = [];

        // Cargar mapeos de campos guardados para este PA
        if (typeof fmLoad === 'function') fmLoad();


        setConnected(true);
        setConnStatus('ok', 'Conectado — ' + ENTITIES.length + ' entidades · PA: ' + CFG.pa + (CFG.pver ? ' / ' + CFG.pver : ' (Baseline)'));
        document.getElementById('panelMDT').classList.remove('hidden');
        document.getElementById('panelSNMDT').classList.remove('hidden');
        Object.keys(TAB_BANNERS).forEach(function (t) {
          var el = document.getElementById(TAB_BANNERS[t]);
          var btn = document.getElementById('tabBtn-' + t);
          if (el) el.classList.toggle('visible', btn && btn.classList.contains('active'));
        });
      } catch (e) {
        log(logEl, 'err', 'Error: ' + e.message);
        setConnStatus('err', 'Error: ' + e.message);
        setConnected(false);
      }

      document.getElementById('btnConnect').disabled = false;
    }

    /* ═══════════════════════════════════════════════════════════════
       CONNECTION WIZARD — STEPS 1 / 2 / 3
       ═══════════════════════════════════════════════════════════════ */

    function showConnStep(n) {
      // n=0: panel de conexión activa  |  n=1/2/3: pasos del wizard
      var isWizard = n > 0;

      // Stepper: visible solo en modo wizard
      var stepper = document.querySelector('.conn-wizard-stepper');
      if (stepper) stepper.style.display = isWizard ? '' : 'none';

      // Panel de conexión activa
      var activePanel = document.getElementById('connPanelActive');
      if (activePanel) activePanel.classList.toggle('active', n === 0);

      // Paneles del wizard
      [1, 2, 3].forEach(function (i) {
        var panel = document.getElementById('connStep' + i);
        if (panel) panel.classList.toggle('active', i === n);

        var dot = document.getElementById('connStepDot' + i);
        if (dot) {
          dot.classList.remove('active', 'completed');
          if (i < n) dot.classList.add('completed');
          else if (i === n) dot.classList.add('active');
        }

        if (i < 3) {
          var conn = document.getElementById('connStepConn' + i);
          if (conn) conn.classList.toggle('completed', i < n);
        }
      });

      // Al volver al paso 1 (desde wizard), limpiar status y logs
      if (n === 1) {
        var st = document.getElementById('connStatus');
        if (st) st.style.display = 'none';
        var lg = document.getElementById('logConnect');
        if (lg) { lg.classList.add('hidden'); lg.innerHTML = ''; }
      }
    }

    function showConnectedPanel() {
      document.getElementById('connInfoUrl').textContent  = CFG.url  || '-';
      document.getElementById('connInfoUser').textContent = CFG.user || '-';
      document.getElementById('connInfoPA').textContent   = CFG.pa   || '-';
      document.getElementById('connInfoPver').textContent = CFG.pver || 'Baseline';
      showConnStep(0);
    }

    function startNewConnection() {
      // Guardar snapshot para restaurar si el usuario cancela
      CONN_SAVED_CFG = { url: CFG.url, user: CFG.user, pass: CFG.pass,
                         pa: CFG.pa, pver: CFG.pver, service: CFG.service };
      // Precargar campos con datos actuales para comodidad (contraseña no por seguridad)
      document.getElementById('inpUrl').value  = CFG.url  || '';
      document.getElementById('inpUser').value = CFG.user || '';
      document.getElementById('inpPass').value = '';
      showConnStep(1);
    }

    async function doConnStep1() {
      var logEl = document.getElementById('logConnect');
      logEl.classList.add('hidden');
      logEl.innerHTML = '';
      var connStatusEl = document.getElementById('connStatus');
      connStatusEl.style.cssText = 'display:flex;font-size:12px;margin-top:6px;align-items:center;gap:8px;';

      var url  = document.getElementById('inpUrl').value.replace(/\/+$/, '').trim();
      var user = document.getElementById('inpUser').value.trim();
      var pass = document.getElementById('inpPass').value;

      if (!url || !user || !pass) {
        setConnStatus('err', 'Completa URL, usuario y contraseña');
        return;
      }

      CFG.url  = url;
      CFG.user = user;
      CFG.pass = pass;

      var btn = document.getElementById('btnConnStep1');
      btn.disabled = true;
      btn.textContent = 'Verificando...';

      CONN_CACHE.metaText = null;
      CONN_CACHE.vsmt = [];

      try {
        setConnStatus('info', 'Verificando credenciales...');
        var metaUrl = url + '/sap/opu/odata/IBP/' + IBP_SERVICE + '/$metadata';
        log(logEl, 'info', 'GET $metadata → ' + metaUrl);
        CONN_CACHE.metaText = await apiXml(metaUrl);
        log(logEl, 'ok', '$metadata OK (' + CONN_CACHE.metaText.length + ' bytes)');

        setConnStatus('info', 'Cargando Planning Areas...');
        var vsmtUrl = url + '/sap/opu/odata/IBP/' + IBP_SERVICE + '/VersionSpecificMasterDataTypes';
        CONN_CACHE.vsmt = await fetchAllPages(vsmtUrl, logEl, '', 'PlanningAreaID,VersionID');
        log(logEl, 'ok', CONN_CACHE.vsmt.length + ' registros VSMT recibidos');

        var seen = {};
        var pas  = [];
        CONN_CACHE.vsmt.forEach(function (r) {
          var pa = (r.PlanningAreaID || '').trim();
          if (pa && !seen[pa]) { seen[pa] = true; pas.push(pa); }
        });
        pas.sort();

        if (pas.length === 0) throw new Error('No se encontraron Planning Areas para este usuario');

        var sel = document.getElementById('selPA');
        sel.innerHTML = pas.map(function (pa) {
          return '<option value="' + escH(pa) + '">' + escH(pa) + '</option>';
        }).join('');

        try {
          var arr = JSON.parse(localStorage.getItem('ibp_h_url') || '[]');
          var idx = arr.indexOf(url);
          if (idx !== -1) arr.splice(idx, 1);
          arr.unshift(url);
          if (arr.length > 5) arr.pop();
          localStorage.setItem('ibp_h_url', JSON.stringify(arr));
          var dl = document.getElementById('urlsList');
          if (dl) dl.innerHTML = arr.map(function (v) { return '<option value="' + escH(v) + '">'; }).join('');
        } catch (e) {}

        setConnStatus('ok', pas.length + ' Planning Areas encontradas');
        showConnStep(2);

      } catch (e) {
        log(logEl, 'err', 'Error: ' + e.message);
        setConnStatus('err', 'Error: ' + e.message);
      }

      btn.disabled = false;
      btn.textContent = 'Continuar →';
    }

    function doConnStep2() {
      var pa = document.getElementById('selPA').value;
      if (!pa) { setConnStatus('err', 'Selecciona una Planning Area'); return; }

      var seen    = {};
      var versions = [];
      CONN_CACHE.vsmt.forEach(function (r) {
        if ((r.PlanningAreaID || '').trim() !== pa) return;
        var v = (r.VersionID || '').trim();
        if (v && !seen[v]) { seen[v] = true; versions.push(v); }
      });
      versions.sort();

      var sel = document.getElementById('selPver');
      var opts = '<option value="">Baseline (vacío)</option>';
      opts += versions.map(function (v) {
        return '<option value="' + escH(v) + '">' + escH(v) + '</option>';
      }).join('');
      sel.innerHTML = opts;

      showConnStep(3);
    }

    function doConnStep3() {
      var pa   = document.getElementById('selPA').value;
      var pver = document.getElementById('selPver').value;
      document.getElementById('inpPA').value   = pa;
      document.getElementById('inpPver').value = pver;
      doConnect(null);
    }

    function derivePrefix(mdtIds) {
      if (!mdtIds || mdtIds.length === 0) return '';

      // 1. Common-prefix algorithm — works when all MDTs share the same prefix
      var prefix = mdtIds[0];
      for (var i = 1; i < mdtIds.length; i++) {
        var id = mdtIds[i];
        var j = 0;
        while (j < prefix.length && j < id.length && prefix[j] === id[j]) j++;
        prefix = prefix.substring(0, j);
        if (!prefix) break;
      }
      if (prefix) return prefix;

      // 2. Voting fallback — used when MDTs from multiple versions are mixed (e.g. Baseline)
      //    Counts how many IDs start with each candidate prefix (lengths 2–6).
      //    Score = count × length: rewards longer, more specific prefixes.
      //    Example: ['AS1PRODUCT','AS1SOURCEPRODUCTION','PI3PRODUCTIONSOURCEITM'] →
      //             AS1 scores 2×3=6, PI3 scores 1×3=3 → returns 'AS1'
      var votes = {};
      mdtIds.forEach(function (id) {
        for (var len = 2; len <= Math.min(6, id.length - 1); len++) {
          var p = id.substring(0, len);
          votes[p] = (votes[p] || 0) + 1;
        }
      });

      var best = '';
      var bestScore = 0;
      Object.keys(votes).forEach(function (p) {
        if (votes[p] < 2) return;            // ignore singletons
        var score = votes[p] * p.length;
        if (score > bestScore) { best = p; bestScore = score; }
      });

      return best;
    }

    function autoDetectMDTs(sets, paPrefix) {
      var prefix = (paPrefix || '').toUpperCase();

      // Restrict candidates to entities whose name starts with the derived prefix
      var paSets = prefix ? sets.filter(function (s) { return s.name.toUpperCase().indexOf(prefix) === 0; }) : [];
      var pool = paSets.length > 0 ? paSets : sets;

      // Penalise IBP translation/text tables (*Trans, *Texts, *Text, *Lang).
      function isTransTable(name) { return /(?:Trans|Texts?|Lang)$/i.test(name); }

      function scoreFields(s, mustHave, nice) {
        if (!s.fields.length) return 0;
        var ok = mustHave.every(function (m) { return s.fields.indexOf(m) >= 0; });
        if (!ok) return 0;
        var sc = 1 + nice.filter(function (n) { return s.fields.indexOf(n) >= 0; }).length;
        if (isTransTable(s.name)) sc -= 1;
        return sc > 0 ? sc : 0;
      }

      function nameScore(s, keywords) {
        var lower = s.name.toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
          if (lower.indexOf(keywords[i]) >= 0) {
            var sc = keywords.length - i;
            if (isTransTable(s.name)) sc -= 1;
            return sc > 0 ? sc : 0;
          }
        }
        return 0;
      }

      function sortByScoreAndFields(arr) {
        arr.sort(function (a, b) {
          if (b.sc !== a.sc) return b.sc - a.sc;
          return b.fieldCount - a.fieldCount;
        });
      }

      // Two-pass: field-matched entities ALWAYS beat name-only matches.
      // This prevents an entity with no key fields (e.g. *Message, *Log) from winning
      // simply because it has a higher nameScore than a correctly field-matched entity.
      function best(must, nice, nameKw) {
        // Pass 1 — field match: entity must contain ALL mustHave fields
        var fieldMatched = [];
        pool.forEach(function (s) {
          var sc = scoreFields(s, must, nice);
          if (sc > 0) fieldMatched.push({ name: s.name, sc: sc, fieldCount: s.fields.length });
        });
        if (fieldMatched.length) {
          sortByScoreAndFields(fieldMatched);
          return fieldMatched[0].name;
        }
        // Pass 2 — name match: fallback when no entity satisfies mustHave
        var nameMatched = [];
        pool.forEach(function (s) {
          var sc = nameScore(s, nameKw);
          if (sc > 0) nameMatched.push({ name: s.name, sc: sc, fieldCount: s.fields.length });
        });
        if (!nameMatched.length) return '';
        sortByScoreAndFields(nameMatched);
        return nameMatched[0].name;
      }

      // Key fields per entity type (always present — used as strict mustHave):
      //   SOURCEPRODUCTION    : LOCID, PRDID, SOURCEID
      //   PRODUCTIONSOURCEITM : PRDID, SOURCEID  (+COMPONENTCOEFFICIENT to disambiguate from header)
      //   PRODUCTIONRESOURCE  : RESID, SOURCEID
      //   PRODUCT             : PRDID
      //   LOCATION (master)   : LOCID — exclude entities with LOCFR+PRDID (=SOURCELOCATION) or SOURCEID
      //   RESOURCE (master)   : RESID — exclude entities with SOURCEID (=PRODUCTIONRESOURCE)
      return {
        header: best(['LOCID', 'PRDID', 'SOURCEID'], ['SOURCETYPE', 'OUTPUTCOEFFICIENT'], ['sourceprod', 'sourceproduction', 'prodhead']),
        item: best(['PRDID', 'SOURCEID', 'COMPONENTCOEFFICIENT'], [], ['sourceitem', 'proditem', 'sourceproditem', 'productionsourceitm']),
        itemSub: best(['SOURCEID', 'PRDFR', 'SPRDFR'], [], ['sourceitemsub', 'proditemsub', 'itemsub', 'productionsourceitmsubstitution', 'itmsubstitution']),
        resource: best(['RESID', 'SOURCEID'], [], ['sourceres', 'prodres', 'sourceresource', 'productionresource']),
        product: best(['PRDID'], ['PRDDESCR', 'MATTYPEID'], ['product', 'material']),
        locMaster: best(['LOCID'], ['LOCDESCR', 'LOCTYPE'], ['location', 'loc'], ['LOCFR', 'PRDID', 'SOURCEID']),
        resMaster: best(['RESID'], ['RESDESCR'], ['resource', 'res'], ['SOURCEID']),
        resLoc:    best(['RESID', 'LOCID'], [], ['resourcelocation', 'reslocation', 'resloc', 'locationresource'])
      };
    }

    function populateMDTPanel(detected) {
      var pairs = [
        { id: 'selHeader', fields: 'fieldsHeader', val: detected.header },
        { id: 'selItem', fields: 'fieldsItem', val: detected.item },
        { id: 'selItemSub', fields: 'fieldsItemSub', val: detected.itemSub },
        { id: 'selResource', fields: 'fieldsResource', val: detected.resource },
        { id: 'selProduct', fields: 'fieldsProduct', val: detected.product },
        { id: 'selBomLocMaster', fields: 'fieldsBomLocMaster', val: detected.locMaster },
        { id: 'selBomResMaster', fields: 'fieldsBomResMaster', val: detected.resMaster }
      ];
      pairs.forEach(function (p) { initSearchSelect(p.id, p.fields, p.val); });
    }

    function autoDetectSNMDTs(sets, paPrefix) {
      var prefix = (paPrefix || '').toUpperCase();
      var paSets = prefix ? sets.filter(function (s) { return s.name.toUpperCase().indexOf(prefix) === 0; }) : [];
      var pool = paSets.length > 0 ? paSets : sets;

      function isTransTable(name) { return /(?:Trans|Texts?|Lang)$/i.test(name); }

      function scoreFields(s, mustHave, nice) {
        if (!s.fields.length) return 0;
        var ok = mustHave.every(function (m) { return s.fields.indexOf(m) >= 0; });
        if (!ok) return 0;
        var sc = 1 + nice.filter(function (n) { return s.fields.indexOf(n) >= 0; }).length;
        if (isTransTable(s.name)) sc -= 1;
        return sc > 0 ? sc : 0;
      }

      function nameScore(s, keywords) {
        var lower = s.name.toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
          if (lower.indexOf(keywords[i]) >= 0) {
            var sc = keywords.length - i;
            if (isTransTable(s.name)) sc -= 1;
            return sc > 0 ? sc : 0;
          }
        }
        return 0;
      }

      function sortByScoreAndFields(arr) {
        arr.sort(function (a, b) {
          if (b.sc !== a.sc) return b.sc - a.sc;
          return b.fieldCount - a.fieldCount;
        });
      }

      // Two-pass: field-matched entities ALWAYS beat name-only matches.
      // notAll: exclude entities that have ALL of these fields (they are a more-specific entity).
      // Example: when detecting LOCATION master (mustHave=['LOCID']), use notAll=['LOCFR','PRDID']
      // so that SOURCELOCATION (which has LOCFR+PRDID+LOCID) is excluded from matching.
      function best(must, nice, nameKw, notAll) {
        function excluded(s) {
          return notAll && notAll.every(function (f) { return s.fields.indexOf(f) >= 0; });
        }
        // Pass 1 — field match
        var fieldMatched = [];
        pool.forEach(function (s) {
          if (excluded(s)) return;
          var sc = scoreFields(s, must, nice);
          if (sc > 0) fieldMatched.push({ name: s.name, sc: sc, fieldCount: s.fields.length });
        });
        if (fieldMatched.length) {
          sortByScoreAndFields(fieldMatched);
          return fieldMatched[0].name;
        }
        // Pass 2 — name match fallback
        var nameMatched = [];
        pool.forEach(function (s) {
          if (excluded(s)) return;
          var sc = nameScore(s, nameKw);
          if (sc > 0) nameMatched.push({ name: s.name, sc: sc, fieldCount: s.fields.length });
        });
        if (!nameMatched.length) return '';
        sortByScoreAndFields(nameMatched);
        return nameMatched[0].name;
      }

      // Key fields per entity type (always present — used as strict mustHave):
      //   SOURCELOCATION     : LOCID, LOCFR, PRDID
      //   SOURCECUSTOMER     : LOCID, PRDID, CUSTID
      //   PRODUCT            : PRDID
      //   SOURCEPRODUCTION   : LOCID, PRDID, SOURCEID
      //   PRODUCTIONSOURCEITM: PRDID, SOURCEID, COMPONENTCOEFFICIENT
      //   LOCATION (master)  : LOCID  — exclude entities with LOCFR+PRDID (=SOURCELOCATION)
      //   CUSTOMER (master)  : CUSTID — exclude entities with LOCID+PRDID  (=SOURCECUSTOMER)
      //   LOCATIONPRODUCT    : LOCID, PRDID — exclude entities with LOCFR (=SOURCELOCATION)
      //   CUSTOMERPRODUCT    : CUSTID, PRDID — exclude entities with LOCID (=SOURCECUSTOMER)
      return {
        location: best(['LOCID', 'LOCFR', 'PRDID'], ['TLEADTIME'], ['sourcelocation']),
        customer: best(['LOCID', 'PRDID', 'CUSTID'], ['CLEADTIME'], ['sourcecustomer', 'customer']),
        product: best(['PRDID'], ['PRDDESCR', 'MATTYPEID'], ['product', 'material']),
        sourceProd: best(['LOCID', 'PRDID', 'SOURCEID'], ['SOURCETYPE', 'OUTPUTCOEFFICIENT'], ['sourceproduction', 'sourceprod', 'prodhead']),
        locMaster: best(['LOCID'], ['LOCTYPE', 'LOCDESCR'], ['location', 'loc'], ['LOCFR', 'PRDID']),
        custMaster: best(['CUSTID'], ['CUSTDESCR'], ['customer', 'cust'], ['LOCID', 'PRDID']),
        sourceItem: best(['PRDID', 'SOURCEID', 'COMPONENTCOEFFICIENT'], ['UOMID'], ['sourceitem', 'proditem', 'sourceproditem', 'productionsourceitm']),
        locProd: best(['LOCID', 'PRDID'], [], ['locationproduct', 'locproduct', 'locprod'], ['LOCFR']),
        custProd: best(['CUSTID', 'PRDID'], [], ['customerproduct', 'custproduct', 'custprod'], ['LOCID'])
      };
    }

    function populateSNMDTPanel(detected) {
      var pairs = [
        { id: 'selSNLocation', fields: 'fieldsSNLocation', val: detected.location },
        { id: 'selSNCustomer', fields: 'fieldsSNCustomer', val: detected.customer },
        { id: 'selSNProduct', fields: 'fieldsSNProduct', val: detected.product },
        { id: 'selSNSourceProd', fields: 'fieldsSNSourceProd', val: detected.sourceProd },
        { id: 'selSNLocMaster', fields: 'fieldsSNLocMaster', val: detected.locMaster },
        { id: 'selSNCustMaster', fields: 'fieldsSNCustMaster', val: detected.custMaster },
        { id: 'selSNSourceItem', fields: 'fieldsSNSourceItem', val: detected.sourceItem },
        { id: 'selSNLocProd', fields: 'fieldsSNLocProd', val: detected.locProd },
        { id: 'selSNCustProd', fields: 'fieldsSNCustProd', val: detected.custProd }
      ];
      pairs.forEach(function (p) { initSearchSelect(p.id, p.fields, p.val); });
    }

    function populateVizMDTPanel(detected) {
      var pairs = [
        { id: 'selVizLocation', fields: 'fieldsVizLocation', val: detected.location },
        { id: 'selVizCustomer', fields: 'fieldsVizCustomer', val: detected.customer },
        { id: 'selVizProduct', fields: 'fieldsVizProduct', val: detected.product },
        { id: 'selVizSourceProd', fields: 'fieldsVizSourceProd', val: detected.sourceProd },
        { id: 'selVizLocMaster', fields: 'fieldsVizLocMaster', val: detected.locMaster },
        { id: 'selVizCustMaster', fields: 'fieldsVizCustMaster', val: detected.custMaster },
        { id: 'selVizSourceItem', fields: 'fieldsVizSourceItem', val: detected.sourceItem },
        { id: 'selVizLocProd', fields: 'fieldsVizLocProd', val: detected.locProd },
        { id: 'selVizCustProd', fields: 'fieldsVizCustProd', val: detected.custProd }
      ];
      pairs.forEach(function (p) { initSearchSelect(p.id, p.fields, p.val); });
    }

    function populatePAMDTPanel(detectedBom, detectedSN) {
      var pairs = [
        { id: 'selPAHeader', fields: 'fieldsPAHeader', val: detectedBom.header },
        { id: 'selPAItem', fields: 'fieldsPAItem', val: detectedBom.item },
        { id: 'selPAItemSub', fields: 'fieldsPAItemSub', val: detectedBom.itemSub },
        { id: 'selPAResource', fields: 'fieldsPAResource', val: detectedBom.resource },
        { id: 'selPAProduct', fields: 'fieldsPAProduct', val: detectedBom.product },
        { id: 'selPALocMaster', fields: 'fieldsPALocMaster', val: detectedBom.locMaster },
        { id: 'selPAResMaster', fields: 'fieldsPAResMaster', val: detectedBom.resMaster },
        { id: 'selPAResLoc',    fields: 'fieldsPAResLoc',    val: detectedBom.resLoc },
        { id: 'selPALocProd', fields: 'fieldsPALocProd', val: detectedSN.locProd },
        { id: 'selPALocSrc', fields: 'fieldsPALocSrc', val: detectedSN.location }
      ];
      pairs.forEach(function (p) { initSearchSelect(p.id, p.fields, p.val); });
    }

    function showFields(containerId, entityName) {
      var el = document.getElementById(containerId);
      var ent = ENTITIES.find(function (e) { return e.name === entityName; });
      if (!ent) { el.textContent = '—'; return; }
      el.textContent = ent.fields.join(', ');
    }

    var _ssGlobalListenerAdded = false;

    function initSearchSelect(hiddenId, fieldsId, defaultVal) {
      var hidden = document.getElementById(hiddenId);
      var visInput = document.getElementById('ssVis-' + hiddenId);
      var list = document.getElementById('ssList-' + hiddenId);

      function labelFor(val) {
        if (!val) return '';
        var ent = ENTITIES.find(function (e) { return e.name === val; });
        return ent ? val + ' (' + ent.fields.length + ' campos)' : val;
      }

      function renderList(filter) {
        var f = (filter || '').toLowerCase();
        list.innerHTML = '';

        // "(ninguna)" always first
        var noneDiv = document.createElement('div');
        noneDiv.className = 'ss-opt' + (hidden.value === '' ? ' active' : '');
        noneDiv.textContent = '(ninguna)';
        noneDiv.dataset.val = '';
        list.appendChild(noneDiv);

        // Use prefix-filtered list; fall back to all entities if user types something not found there
        var pool = (CFG.paEntities && CFG.paEntities.length > 0) ? CFG.paEntities : ENTITIES;
        var matched = 0;
        pool.forEach(function (e) {
          if (f && e.name.toLowerCase().indexOf(f) < 0) return;
          var div = document.createElement('div');
          div.className = 'ss-opt' + (hidden.value === e.name ? ' active' : '');
          div.textContent = e.name + ' (' + e.fields.length + ' campos)';
          div.dataset.val = e.name;
          list.appendChild(div);
          matched++;
        });

        // If nothing matched in filtered pool, fall back to full ENTITIES
        if (f && matched === 0 && pool !== ENTITIES) {
          ENTITIES.forEach(function (e) {
            if (e.name.toLowerCase().indexOf(f) < 0) return;
            var div = document.createElement('div');
            div.className = 'ss-opt' + (hidden.value === e.name ? ' active' : '');
            div.textContent = e.name + ' (' + e.fields.length + ' campos)';
            div.dataset.val = e.name;
            list.appendChild(div);
            matched++;
          });
        }

        if (f && matched === 0) {
          var noRes = document.createElement('div');
          noRes.className = 'ss-none';
          noRes.textContent = 'Sin resultados para "' + filter + '"';
          list.appendChild(noRes);
        }
      }

      function selectVal(val) {
        hidden.value = val;
        visInput.value = labelFor(val);
        list.classList.remove('open');
        showFields(fieldsId, val);
      }

      selectVal(defaultVal || '');

      visInput.addEventListener('focus', function () {
        visInput.select();
        renderList('');
        list.classList.add('open');
        requestAnimationFrame(function () {
          var active = list.querySelector('.ss-opt.active');
          if (active) active.scrollIntoView({ block: 'nearest' });
        });
      });

      visInput.addEventListener('input', function () {
        renderList(visInput.value);
        list.classList.add('open');
      });

      list.addEventListener('mousedown', function (e) {
        var opt = e.target.closest('.ss-opt');
        if (!opt) return;
        e.preventDefault();
        selectVal(opt.dataset.val);
      });

      if (!_ssGlobalListenerAdded) {
        _ssGlobalListenerAdded = true;
        document.addEventListener('click', function (e) {
          document.querySelectorAll('.ss-list.open').forEach(function (openList) {
            var wrap = openList.closest('.ss-wrap');
            if (wrap && !wrap.contains(e.target)) {
              openList.classList.remove('open');
              var hid = openList.id.replace('ssList-', '');
              var h = document.getElementById(hid);
              var vi = document.getElementById('ssVis-' + hid);
              if (h && vi) {
                var ent = ENTITIES.find(function (e2) { return e2.name === h.value; });
                vi.value = h.value ? h.value + (ent ? ' (' + ent.fields.length + ' campos)' : '') : '';
              }
            }
          });
        });
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       STEP 2: FETCH ALL DATA
       ═══════════════════════════════════════════════════════════════ */
    async function doFetchAll() {
      var logEl = document.getElementById('logFetch');
      logEl.innerHTML = '';
      logEl.classList.add('hidden');
      document.getElementById('progBar').classList.remove('hidden');
      var progStatusEl = document.getElementById('progStatus');
      progStatusEl.style.cssText = 'display:flex;font-size:12px;color:var(--text2);margin-top:4px;align-items:center;gap:8px;';
      document.getElementById('btnFetch').disabled = true;

      var headerEntity = document.getElementById('selHeader').value;
      var itemEntity = document.getElementById('selItem').value;
      var itemSubEntity = document.getElementById('selItemSub').value;
      var resourceEntity = document.getElementById('selResource').value;
      var productEntity = document.getElementById('selProduct').value;
      var bomLocEntity = document.getElementById('selBomLocMaster').value;
      var bomResEntity = document.getElementById('selBomResMaster').value;

      if (!headerEntity || !itemEntity) {
        setStatus('err', 'Selecciona al menos Header e Item');
        log(logEl, 'err', 'Selecciona al menos Header e Item');
        document.getElementById('btnFetch').disabled = false;
        return;
      }

      var baseOData = CFG.url + '/sap/opu/odata/IBP/' + CFG.service + '/';
      var paFilter = CFG.pa
        ? (CFG.pver
          ? "PlanningAreaID eq '" + CFG.pa + "' and VersionID eq '" + CFG.pver + "'"
          : "PlanningAreaID eq '" + CFG.pa + "'")
        : '';
      var andF = function(b, c) { return b ? b + ' and ' + c : c; };
      var pshFilter = paFilter;
      var locFilter = paFilter;
      var bomValidSids = {};

      // Pre-validar entidades y campos contra schema antes de fetch
      if (typeof validateEntityFields === 'function') {
        var _bomChecks = [
          { role: 'Production Source Header',   entityName: headerEntity,  required: true,  selectorId: 'selHeader',       fields: ['PRDID','SOURCEID','LOCID','SOURCETYPE','OUTPUTCOEFFICIENT','PINVALID'] },
          { role: 'Production Source Item',     entityName: itemEntity,    required: true,  selectorId: 'selItem',         fields: ['SOURCEID','PRDID','COMPONENTCOEFFICIENT','ISALTITEM'] },
          { role: 'Production Source Item Sub', entityName: itemSubEntity, required: true,  selectorId: 'selItemSub',      fields: ['SOURCEID','PRDFR','SPRDFR'] },
          { role: 'Production Source Resource', entityName: resourceEntity, required: true, selectorId: 'selResource',     fields: ['SOURCEID','RESID'] },
          { role: 'Producto',                   entityName: productEntity, required: true,  selectorId: 'selProduct',      fields: ['PRDID','PRDDESCR','MATTYPEID','UOMID','UOMDESCR'] },
          { role: 'Ubicación maestra',          entityName: bomLocEntity,  required: true,  selectorId: 'selBomLocMaster', fields: ['LOCID','LOCDESCR','LOCVALID'] },
        ];
        var _bomResult = validateEntityFields(_bomChecks);
        if (_bomResult.issues.length || _bomResult.applied.length) {
          document.getElementById('btnFetch').disabled = false;
          toggleMappingBody('bodyMDT', 'arrMDT', true);
          await fmShowCorrectionPanel(_bomResult.issues, _bomResult.applied, 'fmPanelBOM', _bomChecks);
          document.getElementById('btnFetch').disabled = true;
          headerEntity   = document.getElementById('selHeader').value;
          itemEntity     = document.getElementById('selItem').value;
          itemSubEntity  = document.getElementById('selItemSub').value;
          resourceEntity = document.getElementById('selResource').value;
          productEntity  = document.getElementById('selProduct').value;
          bomLocEntity   = document.getElementById('selBomLocMaster').value;
          bomResEntity   = document.getElementById('selBomResMaster').value;
        }
      }

      try {
        setProgress(0);

        // Open IDB and wipe previous BOM data
        if (!IDB) IDB = await openDB();
        setStatus('info', 'Preparando base de datos local...');
        await Promise.all(['bom_psh', 'bom_psi', 'bom_psisub', 'bom_psr', 'bom_prd', 'bom_loc'].map(idbClear));
        RES_DESCR = {};

        // ── Header → IDB ───────────────────────────────────────────────────────
        setStatus('info', 'Descargando Production Source Header...');
        log(logEl, 'info', 'GET → ' + baseOData + headerEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
        var nHdr = await fetchAndIndex(baseOData + headerEntity, logEl, pshFilter,
          buildSelect(headerEntity, ['PRDID','SOURCEID','LOCID','SOURCETYPE','OUTPUTCOEFFICIENT','PINVALID']),
          function (rows) {
            rows = rows.filter(function(r) { return r.PINVALID !== 'X'; });
            rows.forEach(function(r) { var s = str(r.SOURCEID); if (s) bomValidSids[s] = true; });
            return idbBulkPut('bom_psh', rows);
          });
        log(logEl, 'ok', 'Header: ' + nHdr + ' registros → IDB');
        setProgress(25);

        // ── Item → IDB ─────────────────────────────────────────────────────────
        setStatus('info', 'Descargando Production Source Item...');
        log(logEl, 'info', 'GET → ' + baseOData + itemEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
        var nItm = await fetchAndIndex(baseOData + itemEntity, logEl, paFilter,
          buildSelect(itemEntity, ['SOURCEID','PRDID','COMPONENTCOEFFICIENT','ISALTITEM']),
          function (rows) {
            var validRows = rows.filter(function(r) { return !!bomValidSids[str(r.SOURCEID)]; });
            return idbBulkPut('bom_psi', validRows);
          });
        log(logEl, 'ok', 'Item: ' + nItm + ' registros → IDB');
        setProgress(45);

        // ── Item Sub → IDB ────────────────────────────────────────────────────
        if (itemSubEntity) {
          setStatus('info', 'Descargando Production Source Item Sub...');
          log(logEl, 'info', 'GET → ' + baseOData + itemSubEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
          var nItmSub = await fetchAndIndex(baseOData + itemSubEntity, logEl, paFilter,
            buildSelect(itemSubEntity, ['SOURCEID','PRDFR','SPRDFR']),
            function (rows) { return idbBulkPut('bom_psisub', rows); });
          log(logEl, 'ok', 'Item Sub: ' + nItmSub + ' registros → IDB');
        } else {
          log(logEl, 'warn', 'Item Sub: sin entidad configurada');
        }
        setProgress(50);

        // ── Resource → IDB ─────────────────────────────────────────────────────
        if (resourceEntity) {
          setStatus('info', 'Descargando Production Source Resource...');
          log(logEl, 'info', 'GET → ' + baseOData + resourceEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
          var nRes = await fetchAndIndex(baseOData + resourceEntity, logEl, paFilter,
            'SOURCEID,RESID',
            function (rows) {
              var validRows = rows.filter(function(r) { return !!bomValidSids[str(r.SOURCEID)]; });
              return idbBulkPut('bom_psr', validRows);
            });
          log(logEl, 'ok', 'Resource: ' + nRes + ' registros → IDB');
        } else {
          log(logEl, 'warn', 'Resource: sin entidad configurada');
        }
        setProgress(70);

        // ── Product → IDB ──────────────────────────────────────────────────────
        if (productEntity) {
          setStatus('info', 'Descargando Product (maestro)...');
          log(logEl, 'info', 'GET → ' + baseOData + productEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
          var nPrd = await fetchAndIndex(baseOData + productEntity, logEl, paFilter,
            buildSelect(productEntity, ['PRDID','PRDDESCR','MATTYPEID','UOMID','UOMDESCR']),
            function (rows) { return idbBulkPut('bom_prd', rows); });
          log(logEl, 'ok', 'Product: ' + nPrd + ' registros → IDB');
        } else {
          log(logEl, 'warn', 'Product: sin entidad configurada');
        }
        setProgress(85);

        // ── Location Master → IDB ──────────────────────────────────────────────
        if (bomLocEntity) {
          setStatus('info', 'Descargando Location (maestro)...');
          log(logEl, 'info', 'GET → ' + baseOData + bomLocEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
          var nLoc = await fetchAndIndex(baseOData + bomLocEntity, logEl, locFilter,
            buildSelect(bomLocEntity, ['LOCID','LOCDESCR','LOCVALID']),
            function (rows) {
              rows = rows.filter(function(r) { return r.LOCVALID !== 'X'; });
              return idbBulkPut('bom_loc', rows);
            });
          log(logEl, 'ok', 'Location: ' + nLoc + ' registros → IDB');
        } else {
          log(logEl, 'warn', 'Location: sin entidad configurada');
        }

        // ── Resource Master → memoria (tabla pequeña) ──────────────────────────
        if (bomResEntity) {
          setStatus('info', 'Descargando Resource (maestro)...');
          log(logEl, 'info', 'GET → ' + baseOData + bomResEntity + (paFilter ? ' [filtro PA/Ver]' : ''));
          var nResM = await fetchAndIndex(baseOData + bomResEntity, logEl, paFilter,
            'RESID,RESDESCR',
            function (rows) {
              rows.forEach(function (r) { var k = str(r.RESID); if (k) RES_DESCR[k] = str(r.RESDESCR || ''); });
              return Promise.resolve();
            });
          log(logEl, 'ok', 'Resource master: ' + nResM + ' registros → memoria');
        } else {
          log(logEl, 'warn', 'Resource master: sin entidad configurada');
        }
        setProgress(90);

        // Build product suggestion list from IDB (unique PRDIDs + descriptions)
        setStatus('info', 'Indexando lista de productos...');
        prodSuggestions = await idbBuildProdSuggestions();
        prodSuggestions.sort(function (a, b) { return a.prdid.localeCompare(b.prdid); });
        setProgress(100);

        var summary = '¡Listo! ' + prodSuggestions.length + ' productos en caché local. Selecciona uno para ver su BOM.';
        log(logEl, 'ok', summary);
        setStatus('ok', summary);

        // Show UI (TREE is empty until user selects a product)
        TREE = { locids: [], roots: {}, stats: {}, cycles: [] };
        initTableUI();
        var _bb = document.getElementById('bodyMDT'); if (_bb) _bb.style.display = 'none';
        var _ba = document.getElementById('arrMDT');  if (_ba) _ba.textContent = '▶';
      } catch (e) {
        log(logEl, 'err', 'Error: ' + e.message);
        setStatus('err', 'Error: ' + e.message);
      }

      document.getElementById('btnFetch').disabled = false;
    }

    function setStatus(type, msg) {
      var el = document.getElementById('progStatusText');
      if (!el) return;
      var colors = { ok: 'var(--accent)', err: 'var(--red)', warn: 'var(--amber)', info: 'var(--text2)' };
      el.style.color = colors[type] || 'var(--text2)';
      el.textContent = msg;
    }

    function toggleFetchLogs() {
      var logEl = document.getElementById('logFetch');
      var btn = document.getElementById('btnToggleLogs');
      var hidden = logEl.classList.toggle('hidden');
      btn.textContent = hidden ? 'Ver logs técnicos' : 'Ocultar logs';
    }


    /* ── Feedback tooltip ── */
    function dismissFeedbackTip() {
      var tip = document.getElementById('feedbackTooltip');
      if (tip) tip.style.display = 'none';
      try { localStorage.setItem('fbTipDismissed', '1'); } catch(e) {}
    }
    (function showFeedbackTip() {
      try { if (localStorage.getItem('fbTipDismissed')) return; } catch(e) {}
      setTimeout(function() {
        var tip = document.getElementById('feedbackTooltip');
        if (tip) tip.style.display = 'block';
      }, 1500);
    })();

    /* ── Feedback ── */
    function openFeedback() {
      dismissFeedbackTip();
      document.getElementById('feedbackOverlay').style.display = 'block';
      document.getElementById('feedbackPanel').style.transform = 'translateX(0)';
      document.getElementById('fbName').focus();
    }
    function closeFeedback() {
      document.getElementById('feedbackOverlay').style.display = 'none';
      document.getElementById('feedbackPanel').style.transform = 'translateX(100%)';
    }
    function sendFeedback() {
      var name = document.getElementById('fbName').value.trim();
      var app = document.getElementById('fbApp').value;
      var type = document.getElementById('fbType').value;
      var desc = document.getElementById('fbDesc').value.trim();
      var btn = document.getElementById('fbSendBtn');
      var msg = document.getElementById('fbMsg');
      if (!name || !desc) { msg.style.color = '#EF4444'; msg.textContent = 'Nombre y descripción son obligatorios.'; return; }
      btn.disabled = true; btn.textContent = 'Enviando…'; msg.textContent = '';
      fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, app: app, type: type, description: desc })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok) {
            msg.style.color = '#10B981';
            msg.textContent = '✓ Enviado correctamente. ¡Gracias!';
            btn.textContent = 'Enviar';
            btn.disabled = false;
            document.getElementById('fbName').value = '';
            document.getElementById('fbDesc').value = '';
            setTimeout(closeFeedback, 1800);
          } else {
            throw new Error(data.error || 'Error desconocido');
          }
        })
        .catch(function () {
          msg.style.color = '#EF4444';
          msg.textContent = '✕ Error al enviar. Intenta de nuevo.';
          btn.textContent = 'Enviar';
          btn.disabled = false;
        });
    }

    /* ── Connection & TechReq Dialogs ── */
    function openConnectDialog() {
      var d = document.getElementById('connectDialog');
      if (d) d.showModal();
      closeTechReqDialog();
      if (IS_CONNECTED) {
        showConnectedPanel();
      } else {
        showConnStep(1);
      }
    }

    function closeConnectDialog() {
      var d = document.getElementById('connectDialog');
      if (d && d.open) d.close();
      // Si había una reconexión en curso (con o sin éxito parcial), restaurar la conexión anterior
      if (CONN_SAVED_CFG) {
        CFG.url     = CONN_SAVED_CFG.url;
        CFG.user    = CONN_SAVED_CFG.user;
        CFG.pass    = CONN_SAVED_CFG.pass;
        CFG.pa      = CONN_SAVED_CFG.pa;
        CFG.pver    = CONN_SAVED_CFG.pver;
        CFG.service = CONN_SAVED_CFG.service || IBP_SERVICE;
        setConnected(true);
        CONN_SAVED_CFG = null;
      }
    }

    function openTechReqDialog() {
      var d = document.getElementById('techReqDialog');
      if (d) d.showModal();
      closeConnectDialog();
    }

    function closeTechReqDialog() {
      var d = document.getElementById('techReqDialog');
      if (d && d.open) d.close();
    }

    function switchTechTab(tab) {
      var tabs = ['conexion', 'usuario', 'comm', 'entidades', 'red'];
      tabs.forEach(function (t) {
        document.getElementById('treqContent-' + t).style.display = t === tab ? 'block' : 'none';
        var btn = document.getElementById('treqTab-' + t);
        btn.style.borderBottom = t === tab ? '2px solid var(--accent)' : '2px solid transparent';
        btn.style.color = t === tab ? 'var(--text)' : 'var(--text2)';
        btn.style.fontWeight = t === tab ? '600' : '400';
      });
    }

    /* ── Sidebar mobile toggle ── */
    function toggleSidebar() {
      var sidebar  = document.getElementById('sidebar');
      var backdrop = document.getElementById('sidebarBackdrop');
      if (!sidebar) return;
      var isOpen = sidebar.classList.contains('open');
      sidebar.classList.toggle('open', !isOpen);
      if (backdrop) backdrop.classList.toggle('visible', !isOpen);
    }

    function closeSidebar() {
      var sidebar  = document.getElementById('sidebar');
      var backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
    }

    try {
      function popList(key, listId) {
        var arr = JSON.parse(localStorage.getItem(key) || '[]');
        var dl = document.getElementById(listId);
        if (dl) dl.innerHTML = arr.map(function(v) { return '<option value="' + escH(v) + '">'; }).join('');
      }
      popList('ibp_h_url', 'urlsList');
      popList('ibp_h_pa', 'paList');
      popList('ibp_h_pver', 'pverList');
    } catch(e) {}

    // Interceptar Escape para que la restauración del snapshot siempre pase por closeConnectDialog
    (function () {
      var dlg = document.getElementById('connectDialog');
      if (dlg) {
        dlg.addEventListener('cancel', function (e) {
          e.preventDefault();
          closeConnectDialog();
        });
      }
    }());

    // Default tab on load
    switchTab('bom');

  /* ── Excel Guide Panel accordion ── */
  function guideToggle(header) {
    var body = header.nextElementSibling;
    var arr  = header.querySelector('.guide-arr');
    if (!body) return;
    var opening = body.classList.contains('hidden');
    body.classList.toggle('hidden', !opening);
    if (arr) arr.classList.toggle('open', opening);
  }
  window.guideToggle = guideToggle;

  /* ── Guide Panel minimize/expand ── */
  function guideMinimize(panelId, btn) {
    var body = document.getElementById(panelId + 'Body');
    if (!body) return;
    var minimized = body.classList.toggle('hidden');
    btn.textContent = minimized ? '▼ Expandir' : '▲ Minimizar';
  }
  window.guideMinimize = guideMinimize;

