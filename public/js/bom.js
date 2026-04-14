    /* ═══════════════════════════════════════════════════════════════
       LAZY BOM CACHE HELPERS
       Datos se cargan desde IDB sólo cuando se necesitan.
       BOM_SID_CACHE / BOM_PRD_CACHE / BOM_LOC_CACHE viven en state.js.
       ═══════════════════════════════════════════════════════════════ */

    function bomClearCaches() {
      BOM_SID_CACHE = {};
      BOM_PRD_CACHE = {};
      BOM_LOC_CACHE = {};
    }

    /* Carga (si no existe) todos los datos IDB de un SOURCEID:
       PSH by_sourceid, PSI by_sourceid, PSR by_sourceid. */
    async function bomCacheSid(sid) {
      if (BOM_SID_CACHE[sid]) return;
      var allHdrs  = await idbGetByIndex('bom_psh', 'by_sourceid', sid);
      var items    = await idbGetByIndex('bom_psi', 'by_sourceid', sid);
      var resList  = await idbGetByIndex('bom_psr', 'by_sourceid', sid);

      var hdr = null, coprods = [], resids = [];
      allHdrs.forEach(function (h) {
        var st = str(h.SOURCETYPE || 'P');
        if (!hdr || st !== 'C') hdr = h;          // prefiere P-type
        if (st === 'C') coprods.push({ prdid: str(h.PRDID), coefficient: h.OUTPUTCOEFFICIENT || '', sourcetype: 'C' });
      });
      resList.forEach(function (r) {
        var rid = str(r.RESID);
        if (rid && resids.indexOf(rid) < 0) resids.push(rid);
      });
      BOM_SID_CACHE[sid] = { hdr: hdr, coprods: coprods, hasItems: items.length > 0, items: items, resids: resids };
    }

    async function bomCachePrd(prdid) {
      if (BOM_PRD_CACHE[prdid] !== undefined) return;
      var p = await idbGet('bom_prd', prdid);
      BOM_PRD_CACHE[prdid] = p || {};
    }

    async function bomCacheLoc(locid) {
      if (BOM_LOC_CACHE[locid] !== undefined) return;
      var l = await idbGet('bom_loc', locid);
      BOM_LOC_CACHE[locid] = l ? str(l.LOCDESCR || '') : '';
    }

    /* ═══════════════════════════════════════════════════════════════
       LOAD ROOTS — solo nivel 1 para el producto seleccionado.
       No traversa hacia abajo; los hijos se cargan on-demand.
       ═══════════════════════════════════════════════════════════════ */
    async function loadBomRoots(prdid) {
      var hdrsForPrd = await idbGetByIndex('bom_psh', 'by_prdid', prdid);
      var seenSids = {}, sids = [];
      for (var i = 0; i < hdrsForPrd.length; i++) {
        var sid = str(hdrsForPrd[i].SOURCEID);
        if (!sid || seenSids[sid]) continue;
        seenSids[sid] = true;
        sids.push(sid);
        await bomCacheSid(sid);
      }

      // Recolecta PRDIDs y LOCIDs para pre-cachear maestros
      var prdSet = {}, locSet = {};
      prdSet[prdid] = true;
      sids.forEach(function (s) {
        var c = BOM_SID_CACHE[s];
        if (!c || !c.hdr) return;
        locSet[str(c.hdr.LOCID)] = true;
        c.coprods.forEach(function (cp) { prdSet[cp.prdid] = true; });
      });
      await Promise.all(
        Object.keys(prdSet).map(bomCachePrd).concat(Object.keys(locSet).map(bomCacheLoc))
      );

      var roots = [], nodeMap = {};
      sids.forEach(function (s) {
        var node = bomBuildShell(s, 1, prdid, null, [], '');
        if (node) { node.type = 'MAIN'; roots.push(node); nodeMap[node.id] = node; }
      });
      return { roots: roots, nodeMap: nodeMap };
    }

    /* ═══════════════════════════════════════════════════════════════
       BUILD SHELL — construye UN nodo sin recursión.
       Los hijos no se cargan aquí; childrenLoaded = false.
       ═══════════════════════════════════════════════════════════════ */
    function bomBuildShell(sid, level, displayPrdid, rootLocid, ancestorSids, inputCoeff) {
      var c = BOM_SID_CACHE[sid];
      if (!c || !c.hdr) return null;
      var h = c.hdr;
      var nodeLocid    = str(h.LOCID);
      var curRootLocid = rootLocid || nodeLocid;
      var pid          = displayPrdid || str(h.PRDID);
      var pInfo        = BOM_PRD_CACHE[pid] || {};

      // sourcetype para este nodo
      var hSourceType;
      if (str(h.PRDID) === pid) {
        hSourceType = str(h.SOURCETYPE || 'P');
      } else {
        var cpEntry = c.coprods.find(function (cp) { return cp.prdid === pid; });
        hSourceType = cpEntry ? str(cpEntry.sourcetype) : '';
      }

      // co-productos (excluye el pid principal)
      var coprods = c.coprods
        .filter(function (cp) { return cp.prdid !== pid; })
        .map(function (cp) {
          var cpInfo = BOM_PRD_CACHE[cp.prdid] || {};
          return {
            prdid: cp.prdid, coefficient: cp.coefficient, sourcetype: cp.sourcetype,
            prddescr: str(cpInfo.PRDDESCR || ''), mattypeid: str(cpInfo.MATTYPEID || ''),
            uomid: str(cpInfo.UOMDESCR || cpInfo.UOMID || '')
          };
        });
      // Si el P-type de la fuente es distinto al pid seleccionado, agrega P-type como co-prod
      var ptPrd = str(h.PRDID);
      if (ptPrd && ptPrd !== pid) {
        var ptInfo = BOM_PRD_CACHE[ptPrd] || {};
        coprods.unshift({
          prdid: ptPrd, coefficient: h.OUTPUTCOEFFICIENT || '', sourcetype: str(h.SOURCETYPE || ''),
          prddescr: str(ptInfo.PRDDESCR || ''), mattypeid: str(ptInfo.MATTYPEID || ''),
          uomid: str(ptInfo.UOMDESCR || ptInfo.UOMID || '')
        });
      }

      return {
        id: sid + '_L' + level,
        locid: nodeLocid,
        rootLocid: curRootLocid,
        sourceid: sid,
        prdid: pid,
        prddescr: str(pInfo.PRDDESCR || ''),
        mattypeid: str(pInfo.MATTYPEID || ''),
        uomid: str(pInfo.UOMDESCR || pInfo.UOMID || ''),
        coefficient: h.OUTPUTCOEFFICIENT || '',
        inputCoeff: inputCoeff || '',
        type: level === 1 ? 'MAIN' : 'COMPONENT',
        sourcetype: hSourceType,
        level: level,
        resids: c.resids.slice(),
        coprods: coprods,
        children: [],
        childrenLoaded: false,
        hasChildren: c.hasItems,
        ancestorSids: ancestorSids.slice()
      };
    }

    /* ═══════════════════════════════════════════════════════════════
       LOAD NODE CHILDREN — carga hijos de un nodo desde IDB.
       Llamado la primera vez que el usuario expande el nodo.
       ═══════════════════════════════════════════════════════════════ */
    async function loadNodeChildren(node) {
      if (node.childrenLoaded) return;
      var sid          = node.sourceid;
      var curRootLocid = node.rootLocid;
      var ancestors    = node.ancestorSids || [];
      var c            = BOM_SID_CACHE[sid];
      if (!c) { node.childrenLoaded = true; return; }

      var seenCompSids = {};

      for (var i = 0; i < c.items.length; i++) {
        var item     = c.items[i];
        var compPrd  = str(item.PRDID);
        if (!compPrd) continue;
        var compCoeff = item.COMPONENTCOEFFICIENT || '';

        await bomCachePrd(compPrd);
        var compInfo  = BOM_PRD_CACHE[compPrd] || {};
        var compDescr = str(compInfo.PRDDESCR || '');
        var compUom   = str(compInfo.UOMDESCR || compInfo.UOMID || '');

        // PSH para compPrd en la misma planta raíz
        var compHdrs = await idbGetByIndex('bom_psh', 'by_prdid', compPrd);
        var filtered = compHdrs.filter(function (ch) { return str(ch.LOCID) === curRootLocid; });
        var unique   = filtered.filter(function (ch) {
          var cSid = str(ch.SOURCEID);
          if (seenCompSids[cSid]) return false;
          seenCompSids[cSid] = true;
          return true;
        });

        var leafNode = {
          id: sid + '_leaf_' + compPrd + '_L' + (node.level + 1),
          locid: curRootLocid, rootLocid: curRootLocid,
          sourceid: '', prdid: compPrd, prddescr: compDescr,
          mattypeid: str(compInfo.MATTYPEID || ''), uomid: compUom,
          coefficient: '', inputCoeff: compCoeff, type: 'LEAF', sourcetype: '',
          level: node.level + 1, resids: [], coprods: [], children: [],
          childrenLoaded: true, hasChildren: false,
          ancestorSids: ancestors.concat([sid])
        };

        if (unique.length > 0) {
          var anyAdded = false;
          for (var j = 0; j < unique.length; j++) {
            var cSid = str(unique[j].SOURCEID);
            // Detección de ciclo
            if (ancestors.indexOf(cSid) >= 0 || cSid === sid) {
              node.children.push({
                id: cSid + '_cycle_L' + (node.level + 1),
                locid: curRootLocid, rootLocid: curRootLocid,
                sourceid: cSid, prdid: compPrd, prddescr: compDescr,
                mattypeid: str(compInfo.MATTYPEID || ''), uomid: compUom,
                coefficient: '', inputCoeff: compCoeff, type: 'CYCLE', sourcetype: '',
                level: node.level + 1, resids: [], coprods: [], children: [],
                childrenLoaded: true, hasChildren: false,
                ancestorSids: ancestors.concat([sid])
              });
              anyAdded = true;
              continue;
            }
            await bomCacheSid(cSid);
            await bomCacheLoc(str(unique[j].LOCID));
            // Pre-cachea co-productos del hijo
            var cc = BOM_SID_CACHE[cSid];
            if (cc) await Promise.all(cc.coprods.map(function (cp) { return bomCachePrd(cp.prdid); }));

            var childNode = bomBuildShell(cSid, node.level + 1, compPrd, curRootLocid, ancestors.concat([sid]), compCoeff);
            if (childNode) {
              childNode.uomid = compUom;
              childNode.type  = 'COMPONENT';
              node.children.push(childNode);
              anyAdded = true;
            }
          }
          if (!anyAdded) node.children.push(leafNode);
        } else {
          node.children.push(leafNode);
        }
      }
      node.childrenLoaded = true;
      // Actualiza hasChildren según los hijos reales
      node.hasChildren = node.children.length > 0;
    }

    /* ═══════════════════════════════════════════════════════════════
       EXPAND NODE ASYNC — maneja el click en ▶ de forma asíncrona.
       ═══════════════════════════════════════════════════════════════ */
    async function bomExpandNodeAsync(tabId, nodeId) {
      var tab = bomGetTab(tabId);
      if (!tab) return;
      var node = tab.nodeMap && tab.nodeMap[nodeId];
      if (!node) return;

      // Si ya está cargando, ignorar doble-click
      if (tab.loadingIds && tab.loadingIds[nodeId]) return;

      // Toggle: colapsar si ya estaba expandido
      if (tab.expandedIds[nodeId]) {
        delete tab.expandedIds[nodeId];
        bomRenderTable(tabId);
        return;
      }

      // Necesita carga desde IDB
      if (!node.childrenLoaded && node.hasChildren) {
        if (!tab.loadingIds) tab.loadingIds = {};
        tab.loadingIds[nodeId] = true;
        bomRenderTable(tabId);   // muestra spinner
        try {
          await loadNodeChildren(node);
          // Registra los nuevos nodos en nodeMap
          node.children.forEach(function (ch) { tab.nodeMap[ch.id] = ch; });
        } catch (e) {
          node.childrenLoaded = true;
          node.hasChildren    = false;
        }
        delete tab.loadingIds[nodeId];
      }

      tab.expandedIds[nodeId] = true;
      bomRenderTable(tabId);
    }

    /* ═══════════════════════════════════════════════════════════════
       MULTI-TAB SYSTEM — each tab has its own product search + table
       ═══════════════════════════════════════════════════════════════ */
    var BOM_TABS = [];       // [{id, prdid, rootNodes, nodeMap, loadingIds, expandedIds, inverted}]
    var BOM_ACTIVE_TAB = null;
    var BOM_TAB_SEQ = 0;
    var BOM_MAX_TABS = 5;

    function bomInitTabs() {
      document.getElementById('bomTabsBar').classList.remove('hidden');
      document.getElementById('bomTabsContent').classList.remove('hidden');
      if (!BOM_TABS.length) bomAddTab();
    }

    function bomAddTab() {
      if (BOM_TABS.length >= BOM_MAX_TABS) return;
      BOM_TAB_SEQ++;
      var tabId = 'bt_' + BOM_TAB_SEQ;
      var tab = {
        id: tabId, prdid: '', rootNodes: [], nodeMap: {}, loadingIds: {},
        expandedIds: {}, inverted: false
      };
      BOM_TABS.push(tab);
      bomBuildTabPane(tab);
      bomRenderTabBar();
      bomSwitchTab(tabId);
    }

    function bomBuildTabPane(tab) {
      var pane = document.createElement('div');
      pane.id = 'pane_' + tab.id;
      pane.className = 'bom-tab-pane';
      pane.innerHTML =
        '<div class="controls-bar" style="display:flex">' +
          '<div class="prod-search-group">' +
            '<label>Buscar producto</label>' +
            '<div class="ss-wrap prod-ss-wrap">' +
              '<input type="text" class="ss-input-vis bom-search-inp" data-tab="' + tab.id + '" placeholder="Código o descripción..." autocomplete="off">' +
              '<div class="ss-list bom-sugg-list"></div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-secondary btn-small" onclick="bomCollapseAll(\'' + tab.id + '\')">⊟ Colapsar</button>' +
          '<button class="btn btn-danger btn-small" onclick="bomClearSearch(\'' + tab.id + '\')">✕ Limpiar</button>' +
          '<div class="stats-row">' +
            '<span>Raíces: <strong class="bom-stat-roots">-</strong></span>' +
            '<span>Visibles: <strong class="bom-stat-visible">-</strong></span>' +
            '<span>Prof.máx: <strong class="bom-stat-depth">-</strong></span>' +
          '</div>' +
        '</div>' +
        '<div class="empty-state bom-prompt" style="display:block">' +
          '<div class="icon">🔍</div>' +
          'Busca un producto en el campo superior para visualizar su jerarquía BOM.<br>' +
          '<span style="font-size:11px;color:var(--text3)">Se mostrarán todos los SourceID del producto en cada planta y opción de producción.</span>' +
        '</div>' +
        '<div class="table-wrap hidden bom-table-wrap">' +
          '<table><thead><tr>' +
            '<th class="col-exp"></th>' +
            '<th class="col-lvl">Nivel</th>' +
            '<th class="col-loc">Planta</th>' +
            '<th class="col-src">ID de producción</th>' +
            '<th class="col-prd">Material</th>' +
            '<th class="col-coef">Coeficiente</th>' +
            '<th class="col-mat">Tipo de Material</th>' +
            '<th class="col-type">Tipo</th>' +
            '<th class="col-res">Puestos de trabajo</th>' +
          '</tr></thead><tbody class="bom-tbody"></tbody></table>' +
          '<div class="empty-state hidden bom-empty"><div class="icon">🔍</div>Producto no encontrado como raíz en la jerarquía BOM.</div>' +
        '</div>';
      document.getElementById('bomTabsContent').appendChild(pane);

      // Wire search
      var inp = pane.querySelector('.bom-search-inp');
      var list = pane.querySelector('.bom-sugg-list');
      inp.addEventListener('input', function () { bomOnSearch(tab.id); });
      inp.addEventListener('focus', function () { if (inp.value.trim()) bomOnSearch(tab.id); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Escape') list.classList.remove('open'); });
      list.addEventListener('mousedown', function (e) {
        var opt = e.target.closest('[data-prdid]');
        if (!opt) return;
        e.preventDefault();
        bomSelectProduct(tab.id, opt.dataset.prdid);
      });

      // Wire expand/collapse click delegation (async — carga hijos desde IDB on-demand)
      pane.querySelector('.bom-tbody').addEventListener('click', function (e) {
        var btn = e.target.closest('.exp-btn');
        if (btn && !btn.classList.contains('no-ch') && !btn.classList.contains('loading')) {
          var nid = btn.getAttribute('data-nodeid');
          if (nid) bomExpandNodeAsync(tab.id, nid);
        }
      });
    }

    function bomGetTab(tabId) {
      return BOM_TABS.find(function (t) { return t.id === tabId; });
    }

    function bomGetPane(tabId) {
      return document.getElementById('pane_' + tabId);
    }

    function bomRenderTabBar() {
      var scroll = document.getElementById('bomTabsScroll');
      scroll.innerHTML = '';
      BOM_TABS.forEach(function (tab) {
        var btn = document.createElement('button');
        btn.className = 'bom-tab-btn' + (BOM_ACTIVE_TAB === tab.id ? ' active' : '');
        var label = tab.prdid || 'Nueva búsqueda';
        btn.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;">' + escH(label) + '</span>';
        if (BOM_TABS.length > 1) {
          var closeBtn = document.createElement('span');
          closeBtn.className = 'bom-tab-close';
          closeBtn.textContent = '×';
          closeBtn.addEventListener('click', function (e) { e.stopPropagation(); bomCloseTab(tab.id); });
          btn.appendChild(closeBtn);
        }
        btn.addEventListener('click', function () { bomSwitchTab(tab.id); });
        scroll.appendChild(btn);
      });
      if (BOM_TABS.length < BOM_MAX_TABS) {
        var addBtn = document.createElement('button');
        addBtn.className = 'bom-tab-add';
        addBtn.title = 'Nueva pestaña (máx 15)';
        addBtn.textContent = '+';
        addBtn.addEventListener('click', function () { bomAddTab(); });
        scroll.appendChild(addBtn);
      }
    }

    function bomSwitchTab(tabId) {
      BOM_ACTIVE_TAB = tabId;
      BOM_TABS.forEach(function (t) {
        var pane = bomGetPane(t.id);
        if (pane) pane.classList.toggle('active', t.id === tabId);
      });
      bomRenderTabBar();
    }

    function bomCloseTab(tabId) {
      var idx = BOM_TABS.findIndex(function (t) { return t.id === tabId; });
      if (idx < 0) return;
      // Liberar referencias al árbol para que el GC pueda reclamar la memoria
      var tab = BOM_TABS[idx];
      tab.rootNodes = null;
      tab.nodeMap   = null;
      tab.loadingIds = null;
      tab.expandedIds = null;
      var pane = bomGetPane(tabId);
      if (pane) pane.remove();
      BOM_TABS.splice(idx, 1);
      if (BOM_ACTIVE_TAB === tabId) {
        var next = BOM_TABS[Math.min(idx, BOM_TABS.length - 1)];
        if (next) bomSwitchTab(next.id);
      }
      if (!BOM_TABS.length) bomAddTab();
      bomRenderTabBar();
    }

    /* ── Search within tab ── */
    function bomOnSearch(tabId) {
      var pane = bomGetPane(tabId);
      if (!pane) return;
      var inp = pane.querySelector('.bom-search-inp');
      var list = pane.querySelector('.bom-sugg-list');
      var val = inp.value.trim();
      if (!val) {
        list.classList.remove('open');
        var tab = bomGetTab(tabId);
        if (tab && tab.prdid) { tab.prdid = ''; tab.expandedIds = {}; bomRenderTable(tabId); bomRenderTabBar(); }
        return;
      }
      var f = val.toLowerCase();
      var matches = prodSuggestions.filter(function (p) {
        return p.prdid.toLowerCase().indexOf(f) >= 0 || p.prddescr.toLowerCase().indexOf(f) >= 0;
      }).slice(0, 30);
      list.innerHTML = '';
      if (!matches.length) {
        list.innerHTML = '<div class="ss-none">Sin coincidencias</div>';
      } else {
        matches.forEach(function (p) {
          var div = document.createElement('div');
          div.className = 'ss-opt';
          div.innerHTML = '<span style="color:var(--accent);font-weight:600">' + escH(p.prdid) + '</span>' +
            (p.prddescr ? ' <span style="color:var(--text3);font-size:10px">· ' + escH(p.prddescr) + '</span>' : '');
          div.dataset.prdid = p.prdid;
          list.appendChild(div);
        });
      }
      list.classList.add('open');
    }

    async function bomSelectProduct(tabId, prdid) {
      var tab = bomGetTab(tabId);
      var pane = bomGetPane(tabId);
      if (!tab || !pane) return;

      // Guard: evitar carga concurrente sobre el mismo tab
      if (tab._loading) return;
      tab._loading = true;

      // Libera árbol anterior de este tab
      tab.rootNodes   = [];
      tab.nodeMap     = {};
      tab.loadingIds  = {};
      tab.expandedIds = {};
      tab.inverted    = false;

      setStatus('info', 'Cargando raíces de BOM para ' + prdid + '...');
      try {
        var result = await loadBomRoots(prdid);
        tab.rootNodes = result.roots;
        tab.nodeMap   = result.nodeMap;
        tab.prdid     = prdid;
      } catch (e) {
        setStatus('err', 'Error cargando BOM: ' + e.message);
        tab._loading = false;
        return;
      }

      tab._loading = false;
      var p = prodSuggestions.find(function (x) { return x.prdid === prdid; });
      pane.querySelector('.bom-search-inp').value = prdid + (p && p.prddescr ? '  ·  ' + p.prddescr : '');
      pane.querySelector('.bom-sugg-list').classList.remove('open');
      selectedPrdid = prdid;
      expandedIds   = {};

      var rootCount = tab.rootNodes.length;
      setStatus('ok', rootCount + ' fuente' + (rootCount !== 1 ? 's' : '') + ' de producción. Expande los nodos para ver componentes.');
      bomRenderTable(tabId);
      bomRenderTabBar();
    }

    function bomExpandAll(tabId) {
      // Desactivado: la jerarquía se carga de forma incremental (lazy).
      // Expandir todo requeriría cargar todos los niveles desde IDB de forma recursiva.
    }

    function bomCollapseAll(tabId) {
      var tab = bomGetTab(tabId);
      if (!tab) return;
      tab.expandedIds = {};
      bomRenderTable(tabId);
    }

    function bomClearSearch(tabId) {
      var tab = bomGetTab(tabId);
      var pane = bomGetPane(tabId);
      if (!tab || !pane) return;
      pane.querySelector('.bom-search-inp').value = '';
      pane.querySelector('.bom-sugg-list').classList.remove('open');
      tab.prdid      = '';
      tab.rootNodes  = [];
      tab.nodeMap    = {};
      tab.loadingIds = {};
      tab.expandedIds = {};
      tab.inverted   = false;
      bomRenderTable(tabId);
      bomRenderTabBar();
    }

    function bomRestoreGlobals(tab) {
      selectedPrdid = tab.prdid || '';
      expandedIds   = tab.expandedIds || {};
    }

    function bomGetRoots(tab) {
      return tab.rootNodes || [];
    }

    /* ── Invert hierarchy ── */
    function bomToggleInvert(tabId) {
      var tab = bomGetTab(tabId);
      if (!tab || !tab.prdid) return;
      tab.inverted = !tab.inverted;
      tab.expandedIds = {};
      var pane = bomGetPane(tabId);
      if (pane) {
        var btn = pane.querySelector('.bom-invert-btn');
        if (btn) btn.style.background = tab.inverted ? 'var(--accent)' : '';
        if (btn) btn.style.color = tab.inverted ? '#000' : '';
      }
      bomRenderTable(tabId);
    }

    function bomInvertTree(roots) {
      // Invert hierarchy: keep same roots, but reverse the internal tree.
      // Each root stays as-is visually, but its deepest leaves become the first
      // expandable children, and the original root info appears at the bottom.
      return roots.map(function (root) {
        return invertNode(root, 1);
      });
    }

    function invertNode(node, level) {
      // Deep-clone the node preserving all fields
      var inv = {
        id: 'inv_' + node.id, locid: node.locid, sourceid: node.sourceid,
        prdid: node.prdid, prddescr: node.prddescr, mattypeid: node.mattypeid,
        uomid: node.uomid, coefficient: node.coefficient,
        inputCoeff: node.inputCoeff, type: node.type, sourcetype: node.sourcetype || '',
        level: level, resids: node.resids || [], coprods: node.coprods || [],
        children: []
      };

      if (!node.children || !node.children.length) {
        return inv; // leaf stays as leaf
      }

      // Collect all leaf-to-root paths within this subtree
      var leafPaths = [];
      function collectPaths(n, path) {
        var cur = path.concat([n]);
        if (!n.children || !n.children.length) {
          leafPaths.push(cur);
        } else {
          n.children.forEach(function (c) { collectPaths(c, cur); });
        }
      }
      node.children.forEach(function (c) { collectPaths(c, []); });

      // Build reversed children: leaves become direct children, parents below them
      var childMap = {};
      leafPaths.forEach(function (path) {
        var leaf = path[path.length - 1];
        var leafKey = leaf.prdid + '|' + leaf.locid + '|' + (leaf.sourceid || leaf.id);
        if (!childMap[leafKey]) {
          childMap[leafKey] = {
            id: 'inv_' + leaf.id + '_L' + (level + 1),
            locid: leaf.locid, sourceid: leaf.sourceid,
            prdid: leaf.prdid, prddescr: leaf.prddescr, mattypeid: leaf.mattypeid,
            uomid: leaf.uomid, coefficient: leaf.coefficient,
            inputCoeff: leaf.inputCoeff, type: leaf.type, sourcetype: leaf.sourcetype || '',
            level: level + 1, resids: leaf.resids || [], coprods: leaf.coprods || [],
            children: []
          };
        }
        // Build chain from leaf-1 up (reversed path towards root's direct child)
        var parent = childMap[leafKey];
        for (var i = path.length - 2; i >= 0; i--) {
          var orig = path[i];
          var childKey2 = orig.prdid + '|' + orig.locid + '|' + (orig.sourceid || orig.id);
          var existing = parent.children.find(function (c) {
            return (c.prdid + '|' + c.locid + '|' + (c.sourceid || '')) ===
                   (orig.prdid + '|' + orig.locid + '|' + (orig.sourceid || ''));
          });
          if (!existing) {
            existing = {
              id: 'inv_' + orig.id + '_L' + (parent.level + 1),
              locid: orig.locid, sourceid: orig.sourceid,
              prdid: orig.prdid, prddescr: orig.prddescr, mattypeid: orig.mattypeid,
              uomid: orig.uomid, coefficient: orig.coefficient,
              inputCoeff: orig.inputCoeff, type: orig.type, sourcetype: orig.sourcetype || '',
              level: parent.level + 1, resids: orig.resids || [], coprods: orig.coprods || [],
              children: []
            };
            parent.children.push(existing);
          }
          parent = existing;
        }
      });

      inv.children = Object.values(childMap);
      return inv;
    }


    /* ── Render table for a specific tab ── */
    function bomRenderTable(tabId) {
      var tab = bomGetTab(tabId);
      var pane = bomGetPane(tabId);
      if (!tab || !pane) return;

      var promptEl = pane.querySelector('.bom-prompt');
      var tableWrap = pane.querySelector('.bom-table-wrap');
      var tbody = pane.querySelector('.bom-tbody');

      if (!tab.prdid) {
        promptEl.style.display = 'block';
        tableWrap.classList.add('hidden');
        pane.querySelector('.bom-stat-roots').textContent = '-';
        pane.querySelector('.bom-stat-visible').textContent = '-';
        pane.querySelector('.bom-stat-depth').textContent = '-';
        return;
      }

      promptEl.style.display = 'none';
      tableWrap.classList.remove('hidden');

      // Restore globals
      bomRestoreGlobals(tab);
      var roots = bomGetRoots(tab);

      // Apply inversion if needed
      if (tab.inverted && roots.length) {
        roots = bomInvertTree(roots);
      }

      var rows = [];
      bomFlatten(roots, rows, tab.expandedIds);

      var maxDepthSeen = 0;
      var html = '';
      rows.forEach(function (r) {
        var n = r.node;
        if (n.level > maxDepthSeen) maxDepthSeen = n.level;
        var indent    = (n.level - 1) * 20;
        var hasKids   = n.hasChildren || (n.children && n.children.length > 0);
        var isLoading = !!(tab.loadingIds && tab.loadingIds[n.id]);
        var isExp     = !!tab.expandedIds[n.id];

        var rowClass = 'rt-leaf';
        if (n.type === 'MAIN') rowClass = 'rt-root';
        else if (n.type === 'CYCLE') rowClass = 'rt-cycle';
        else if (hasKids) rowClass = 'rt-subprod';

        var expHtml;
        if (isLoading) {
          expHtml = '<button class="exp-btn loading" data-nodeid="' + escH(n.id) + '" title="Cargando...">⟳</button>';
        } else if (hasKids) {
          expHtml = '<button class="exp-btn" data-nodeid="' + escH(n.id) + '">' + (isExp ? '▼' : '▶') + '</button>';
        } else {
          expHtml = '<button class="exp-btn no-ch">·</button>';
        }

        var stVal = n.sourcetype || '';
        var typeBadge = stVal
          ? '<span class="badge ' + (stVal === 'C' ? 'badge-coprod' : 'badge-psh') + '">' + escH(stVal) + '</span>'
          : '';

        var resHtml = '';
        if (n.resids && n.resids.length) {
          resHtml = n.resids.map(function (rid) {
            var rdesc = RES_DESCR[rid] || '';
            var title = rdesc ? ' title="' + escH(rdesc) + '"' : '';
            return '<span class="badge badge-res"' + title + '>' + escH(rid) + '</span>';
          }).join('');
        }

        var locDescr = BOM_LOC_CACHE[n.locid] || '';
        var locLabel = n.locid
          ? escH(n.locid) + (locDescr ? ' <span style="color:var(--text3);font-size:10px">— ' + escH(locDescr) + '</span>' : '')
          : '';
        var matLabel = escH(n.prdid) + (n.prddescr ? ' <span style="color:var(--text3);font-size:10px">— ' + escH(n.prddescr) + '</span>' : '');

        html += '<tr class="' + rowClass + '">';
        html += '<td style="padding-left:' + (indent + 6) + 'px">' + expHtml + '</td>';
        html += '<td>' + n.level + '</td>';
        html += '<td style="font-family:var(--mono);font-size:11px">' + locLabel + '</td>';
        html += '<td style="font-family:var(--mono);font-size:11px">' + escH(n.sourceid) + '</td>';
        html += '<td style="font-family:var(--mono);font-size:11px">' + matLabel + '</td>';
        html += '<td style="text-align:right;font-family:var(--mono)">' + fmtDualCoef(n) + '</td>';
        html += '<td style="font-family:var(--mono);font-size:11px">' + escH(n.mattypeid) + '</td>';
        html += '<td>' + typeBadge + '</td>';
        html += '<td>' + resHtml + '</td>';
        html += '</tr>';

        if (n.coprods && n.coprods.length > 0 && isExp) {
          n.coprods.forEach(function (cp) {
            var cpMatLabel = escH(cp.prdid) + (cp.prddescr ? ' <span style="color:var(--text3);font-size:10px">— ' + escH(cp.prddescr) + '</span>' : '');
            html += '<tr class="rt-coprod">';
            html += '<td style="padding-left:' + (indent + 28) + 'px"></td><td></td><td></td><td></td>';
            html += '<td style="font-family:var(--mono);font-size:11px">' + cpMatLabel + '</td>';
            html += '<td style="text-align:right;font-family:var(--mono)">' + fmtDualCoef(cp) + '</td>';
            html += '<td style="font-family:var(--mono);font-size:11px">' + escH(cp.mattypeid) + '</td>';
            html += '<td>' + (cp.sourcetype ? '<span class="badge ' + (cp.sourcetype === 'C' ? 'badge-coprod' : 'badge-psh') + '">' + escH(cp.sourcetype) + '</span>' : '') + '</td>';
            html += '<td></td></tr>';
          });
        }
        if (hasKids && isExp) {
          html += '<tr class="tr-comp-divider"><td style="padding-left:' + (indent + 28) + 'px"></td>';
          html += '<td colspan="8"><span class="divider-lbl">↓ Componentes PSI (' + n.children.length + ')</span></td></tr>';
        }
      });

      tbody.innerHTML = html;
      pane.querySelector('.bom-stat-roots').textContent = roots.length;
      pane.querySelector('.bom-stat-visible').textContent = rows.length;
      pane.querySelector('.bom-stat-depth').textContent = maxDepthSeen || '-';
      pane.querySelector('.bom-empty').classList.toggle('hidden', rows.length > 0);
    }

    function bomFlatten(roots, rows, expIds) {
      roots.forEach(function (node) {
        rows.push({ node: node });
        if (expIds[node.id] && node.children) {
          bomFlattenChildren(node.children, rows, expIds);
        }
      });
    }

    function bomFlattenChildren(children, rows, expIds) {
      sortedNodes(children).forEach(function (node) {
        rows.push({ node: node });
        if (expIds[node.id] && node.children) {
          bomFlattenChildren(node.children, rows, expIds);
        }
      });
    }

    /* ═══════════════════════════════════════════════════════════════
       LEGACY WRAPPERS — keep old functions working for initTableUI call
       ═══════════════════════════════════════════════════════════════ */
    function initTableUI() {
      bomInitTabs();
    }

    function getRoots() {
      if (BOM_ACTIVE_TAB) {
        var tab = bomGetTab(BOM_ACTIVE_TAB);
        if (tab) return bomGetRoots(tab);
      }
      return [];
    }

    function renderTable() {
      if (BOM_ACTIVE_TAB) bomRenderTable(BOM_ACTIVE_TAB);
    }

    function onProductSearch() {
      if (BOM_ACTIVE_TAB) bomOnSearch(BOM_ACTIVE_TAB);
    }

    async function selectProduct(prdid) {
      if (BOM_ACTIVE_TAB) await bomSelectProduct(BOM_ACTIVE_TAB, prdid);
    }

    function expandAll() {
      if (BOM_ACTIVE_TAB) bomExpandAll(BOM_ACTIVE_TAB);
    }

    function collapseAll() {
      if (BOM_ACTIVE_TAB) bomCollapseAll(BOM_ACTIVE_TAB);
    }

    function clearProductSearch() {
      if (BOM_ACTIVE_TAB) bomClearSearch(BOM_ACTIVE_TAB);
    }

    function sortedNodes(nodes) {
      return nodes.slice().sort(function (a, b) {
        var aHasKids = !!(a.hasChildren || (a.children && a.children.length));
        var bHasKids = !!(b.hasChildren || (b.children && b.children.length));
        if (aHasKids === bHasKids) return 0;
        return aHasKids ? 1 : -1;
      });
    }

    function flatten(roots, rows) {
      bomFlatten(roots, rows, expandedIds);
    }

    function flattenChildren(children, rows) {
      bomFlattenChildren(children, rows, expandedIds);
    }

