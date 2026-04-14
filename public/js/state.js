/* ═══════════════════════════════════════════════════════════════
       GLOBAL STATE
       ═══════════════════════════════════════════════════════════════ */
    var IBP_SERVICE = 'MASTER_DATA_API_SRV'; // server-validated against ALLOWED_SERVICES
    var CFG = { url: '', user: '', pass: '', pa: '', service: '', pver: '', paEntities: [] };
    var IS_CONNECTED = false;
    var ENTITIES = [];       // [{name, fields:[]}]
    var RAW = {};            // legacy placeholder (no longer used for storage)
    var TREE = { locids: [], roots: {}, stats: {}, cycles: [] };
    var IDB = null;         // IndexedDB connection (opened lazily)
    // Supply Network indexes — edge tables live in IDB; only small lookups stay in JS
    var SN_IDX = {
      allPrds: {},   // prdid → true  (string keys only — tiny)
      prdLookup: {},   // prdid → { PRDID, PRDDESCR, MATTYPEID }
      locLookup: {},   // locid → { LOCID, LOCDESCR }
      custLookup: {}    // custid → { CUSTID, CUSTDESCR }
    };
    var expandedIds = {};
    var currentLoc = '';
    var searchTerm = '';
    var sourceFilter = '';
    var selectedPrdid = '';
    var prodSuggestions = [];
    var prdIndex = {};
    // BOM indexes — kept for legacy compat but no longer populated (lazy caches replace them)
    var HDR_BY_PRD = {};
    var HDR_BY_SID = {};
    var ITM_BY_SID = {};
    var RES_BY_SID = {};
    var CPR_BY_SID = {};
    var isCompAtLoc = {};
    var LOC_BY_ID = {};
    var RES_DESCR = {};   // resid → RESDESCR (still populated by doFetchAll)
    // Lazy BOM caches — populated on-demand as the user expands nodes
    var BOM_SID_CACHE = {}; // sourceid → { hdr, coprods, hasItems, items, resids }
    var BOM_PRD_CACHE = {}; // prdid   → product master record
    var BOM_LOC_CACHE = {}; // locid   → LOCDESCR string
    var PSISUB_BY_SID = {}; // SOURCEID -> [{PRDFR, SPRDFR}] (Production Source Item Sub)


