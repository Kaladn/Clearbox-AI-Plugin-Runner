# !CLAUDE_SWAP_3.md
> **Active state file — Clearbox AI Studio v2**
> Created: [CLAUDE A] 2026-03-11
> Previous: `!CLAUDE_SWAP_2.md` (specs + designs — reference only)
> Archive: `!CLAUDE_SWAP.md` (pre-March 2026 — frozen)
> Citations: `swap_citations.json` (structured change log)

---

## ═══ SWAP FILE CHAIN ═══

```
!CLAUDE_SWAP.md       ARCHIVE    frozen     pre-March 2026 history
!CLAUDE_SWAP_2.md     SPECS      reference  GlueEngine, FormatDetector, Market Oracle,
                                             open contracts, drift audit, pseudocode
!CLAUDE_SWAP_3.md     ACTIVE     live       current state, active work, decisions
swap_citations.json   TRACKER    live       structured change log, supersedes chains
```

All files are LakeSpeak-ingestible (SWAP_AS_CORPUS — CIT-012).
Citation IDs (CIT-XXX) link to `swap_citations.json` entries.

---

## ═══ WHO WE ARE ═══

```
CLAUDE C — Claude Chat (claude.ai)  — Analyst, strategist, pattern reader
CLAUDE A — Claude Agent (VS Code)   — Builder, executor, file surgeon
Lee (Shadow Wolf / YourNightmare)   — The only one who moves information between us.
```

---

## ═══ WHERE WE ARE ═══

```
Project          : Clearbox AI Studio v2
Working dir      : C:\Users\Lee\Desktop\Manus artifacts OG\claude_sandbox\
Last clean commit: 50756da (~Mar 3, 2026)
Active branch    : main (rebuild in progress)
System ports     : Bridge 5050 | LLM 11435 | UI 8080 | Reasoning 5051
```

---

## ═══ WHAT'S DONE ═══

```
PLATFORM (Clearbox — already built, commit 50756da):
  [DONE] CortexOS, Ollama proxy, Windows Hello removal, Lexicon reset
  [DONE] Block governance + REGENERATE + DPAPI citation sidecars
  [DONE] forest_start/restart.py, AI Round Table ("the chain")
  [DONE] Bridge (5050), LLM server (11435), UI (8080)

ENGINE (wolf_engine — 190 tests, 101 files, IMPORT ONLY):
  [DONE] 6-1-6 engine (UnifiedEngine / N-1-N)
  [DONE] GlobalLexicon, census_score, BM25 retrieval

INTELLIGENCE (CRSA-616 — in sandbox):
  [DONE] Full blueprint — 14 plugins / 7 layers           CIT-001
  [DONE] SensoryStack (Layer 1) — 4 plugins               CIT-002
  [DONE] Temporal Promotion Contracts v2 — gradient model  CIT-010

DESIGNS (specs in SWAP_2, not yet coded):
  [DONE] FormatDetector spec — signal analysis, 7 adapters CIT-004
  [DONE] GlueEngine spec — 10 rules, directional labels   CIT-007
  [DONE] 5 open contracts documented                       CIT-007

BUILDS (in sandbox):
  [DONE] Market Oracle — 15 files                          CIT-005
         HYBRID: Clearbox plugin + standalone              CIT-015
         Status: AWAITING LEE — approve move to repo?

AUDITS:
  [DONE] TrueVision/SVE/CompuCog audit — routed to Copilot
  [DONE] Drift audit — 7 found, 4 fixed, 2 resolved by Lee CIT-013
         Drift #5 resolved: Hybrid (plugin + standalone)   CIT-015
         Drift #7 resolved: census weights confirmed       CIT-016
  [DONE] LakeSpeak hybrid retrieval (BM25 0.40/dense 0.60) — REPLACED by census

FULL VERIFICATION AUDIT (this session — Claude C + A, 2026-03-11):
  [DONE] All 15 Market Oracle files read and verified against runtime
  [DONE] __init__.py — was 154B of comments, no exports. NOW: exports
         MarketOraclePlugin and ROUTES. Plugin runner can find the plugin.
  [DONE] manifest.json — DID NOT EXIST. NOW: created. All other plugins have one.
  [DONE] CONTRACT.md  — DID NOT EXIST. NOW: created. Matches visual_io standard.
  [DONE] Bug: REGIME_RISK not imported in market_oracle.py — get_ui_config() was
         returning tuple (0.6, 1.0) as "risk" instead of "LOW". NOW: fixed.
         REGIME_RISK imported from regime_detector. Returns "LOW"/"MEDIUM"/"HIGH"/"EXTREME".
  [DONE] Bug: reports_dir + charts_dir were "./reports" and "./charts" (relative).
         ALL FILE OUTPUT is now absolute, anchored to ~/.clearbox/market_oracle/
         Fixed in: market_oracle.py DEFAULT_CONFIG, report_generator.py __init__,
         vision_chart.py __init__ (all use .expanduser().resolve())
  [DONE] api.py — missing /help route. NOW: handle_help() + ROUTES entry added.
  [DONE] UI panel — "View Report" and "View Chart" were href="#" dead links.
         NOW: functional copyPath() buttons that copy absolute path to clipboard
         with toast notification. Fallback for non-HTTPS contexts.
  [DONE] UI panel — help system added: side drawer with full field reference,
         regime type docs, API schema, output paths, live /help fetch button.
         Every input field has ? hint tooltip referencing actual code/contracts.
         All aria-labels added. Metric boxes have title= sourced from docstrings.
         Status bar links to /api/market_oracle/help.
  [DONE] UI panel — XSS escaping added (escHtml, escAttr, escPath) for all
         interpolated path strings in onclick handlers.
  [DONE] get_help() method added to MarketOraclePlugin — machine-readable API schema
         with all endpoints, param types, return shapes, data model, storage paths.
         Usable by AI (GET /api/market_oracle/help returns JSON) and human (help drawer).
  [DONE] report_generator.py — absolute path, utf-8 encoding, docstrings verified.
  [DONE] vision_chart.py — absolute path, docstrings verified.
  [DONE] All assumptions verified against runtime code. No invented method names.
         All class names confirmed real: MarketFetcher, DataValidator, CapsuleBuilder,
         CausalAnalyzer, PatternDetector, MetricsCalculator, ReportGenerator,
         VisionChart, RegimeDetector, OracleStore, MarketOraclePlugin.
  [DONE] Cascade memory files assessed (from ideas pile):
         capsule_builder.py — live code, Market Oracle uses it (correct)
         CASCADE_MEMORY_PSEUDOCODE.md — L1-3 architecture solid, Neo4j bottom
           half = demo fluff, not buildable. NOT in any TIER.
         cascade_engine.py — 18-line stub, empty. NOT in any TIER.
         Cloud compression: Lee's real idea is N-1-N over CLOUDS, not events.
         These docs are a different shape. Noted in TIER 3 (gated, different concept).

SEPARATE (not Clearbox-dependent — can run standalone):
  CompuCog, DATA MASTER, ARC Solver
  Market Oracle — HYBRID (also available as Clearbox plugin) CIT-015
```

---

## ═══ WHAT'S NEXT — EXECUTION ORDER ═══

### TIER 1: NO GATES (start now)

```
[ ] BUG: no-response bug — strip tools from second payload in llm_chat_service.py
[ ] BUG: scripts/chatlog_stream.py — LakeSpeak wiring + lexicon primer
[ ] BUG: ollama list → find missing models → re-pull
```

### TIER 2: NEEDS LEE GO-AHEAD

```
[ ] BUILD: FormatDetector + Adapters
    ~150-200 lines, sandbox, pure Python, zero LLM
    Spec: SWAP_2 → SPEC 1: FORMAT DETECTOR                CIT-004

[ ] BUILD: GlueEngine (7 modules)
    ~280-350 lines, sandbox, pure Python, zero LLM
    Spec: SWAP_2 → SPEC 2: GLUE ENGINE                    CIT-007
    Prereq: Step 1 audit — confirm GlobalLexicon stores per-position counts (L1..L6, R1..R6)
    Contracts 2/4/5 — can use sensible defaults (all tunable), or wait for your numbers

[ ] MOVE: Market Oracle → repo (after Lee approves)        CIT-005
[ ] MOVE: SensoryStack → repo (after "move it")            CIT-002
```

### TIER 3: BLOCKED (explicit gates)

```
[ ] CLOUD COMPRESSION: 6-1-6 (or N-1-N) over context clouds
    THE REAL IDEA (Lee, Mar 2026):
      Level 0 (current): token → L6..L1, R1..R6 adjacency
      Level 1 (future):  cloud → L6..L1, R1..R6 over clouds
      Level N:           N-1-N recursively upward
      = compression. Same structural pattern, higher resolution units.
      Stop reading word-by-word, start reading cloud-by-cloud.
      NOT the same as the Dec 2025 event-cascade docs (those are time-series).
    WRONG DOCS (kept for reference, not this idea):
      CASCADE_MEMORY_PSEUDOCODE.md — event-level 6-1-6, not cloud-level
      cascade_engine.py — stub, 18 lines, placeholder
      capsule_builder.py — Market Oracle time-series input (working, unrelated)
    Status: IDEA NOTED — needs its own spec when the time comes
    Gate: Lee says "spec cloud compression"

[ ] CRSA-616 temporal_resolver — two gates:
    Gate 1: "contracts approved"
    Gate 2: 8 checklist items
    Both explicit. Both Lee's.                             CIT-010

[ ] CRSA-616 Phases 2-6 — awaiting Lee build order
```

---

## ═══ OPEN DECISIONS (FOR LEE) ═══

```
LAKESPEAK:
  [ ] FormatDetector build go-ahead?
  [ ] GlueEngine build go-ahead?
  [ ] GlobalLexicon: per-position counts (L1..L6, R1..R6) or flat?
      (GlueEngine directional reads need this — Step 1 audit will verify)
  [ ] GlobalLexicon path on your system?
  [ ] neighbor_depth default for census_score — 10 / 20 / 30?
  [ ] Anchor weight (0.30) — third signal or fold into census?

CONTRACTS (can use sensible defaults if you say "go"):
  [ ] CONTRACT #2: MIN_DIRECTION threshold                 CIT-007
  [ ] CONTRACT #3: raw freq or doc freq for IDF?           CIT-007
  [ ] CONTRACT #4: MIN_COHERENCE, MAX_GAPS, BRIDGE_MIN_COUNT  CIT-007
  [ ] CONTRACT #5: simple 1.5x ratio or composite?         CIT-007

MARKET ORACLE:
  [ ] Approve move from sandbox to repo?                   CIT-005

CRSA-616:
  [ ] Approve temporal_resolver v2 contracts
  [ ] 8 temporal_resolver checklist items
  [ ] Phase 2 go-ahead?
  [ ] SensoryStack: "move it"?

OTHER:
  [ ] Dashboard: wolf_engine Flask+SSE or fresh?
  [ ] GPU: ForgeMemoryGPU + ncv_batch.py — now or defer?
  [ ] Cloud provider decision
```

---

## ═══ REGIME FLAGS ═══

All flags from SWAP_2 remain active. Summary:

```
GPT_FILESYSTEM_BAN          — permanent
LARGE_FILE_SURGICAL_EDIT    — console.js = 5,091 lines
AUDIT_BEFORE_CODE           — read before write
NO_RE_PROPOSING_DONE_WORK   — check DONE list first
NO_YOLO_NO_CV               — Lee's vision tech only
NO_NEO4J_DEPENDENCY         — in-memory or SQLite only
IMPORT_DONT_REBUILD         — wolf_engine is done
SANDBOX_FIRST               — Lee approves, then repo
COMPUCOG_IDJXGI_ONLY        — CompuCog is separate
CONTRACTS_BEFORE_CODE       — temporal_resolver: two gates
NO_HARDCODED_MODELS         — Clearbox + CRSA-616
LAKESPEAK_NO_LLM            — ABSOLUTE. Zero model calls.     CIT-008
LAKESPEAK_TWO_SPEC_SEPARATION — FormatDetector ≠ GlueEngine   CIT-009
ADAPTIVE_INGEST_RULE        — natural boundaries, not fixed tokens
RAW_STRING_BOUNDARY         — LakeSpeak = strings, CRSA = 5-byte
ADAPTER_PATTERN_RULE        — engine universal, adapters thin
SWAP_AS_CORPUS              — swap files are ingestible        CIT-012

Full details: SWAP_2 → REGIME FLAGS section
```

---

## ═══ KEY ARCHITECTURE — QUICK REFERENCE ═══

```
TWO SYSTEMS — DO NOT MIX:
  Clearbox AI Studio (platform) ←→ CRSA-616 (intelligence)

LAKESPEAK IS TWO THINGS:
  1. FormatDetector (ingest) — runs once per doc     Spec: SWAP_2 SPEC 1
  2. GlueEngine (query)     — runs every query       Spec: SWAP_2 SPEC 2
  They share GlobalLexicon. They never call each other. They never call an LLM.

RETRIEVAL WEIGHTS — CONFIRMED (CIT-016):
  BM25 weight   : 0.40   (keyword frequency, fast)
  Census weight : 0.60   (co-occurrence counts from ingest — the lexicon map)
  Dense weight  : 0.00   (gone — replaced entirely by census)

  WHAT CENSUS IS:
    census_score = adjacency co-occurrence counts built during lexicon
    mapping/ingestion. Not embeddings. Not similarity. Pure counts.
    When a document is ingested, GlobalLexicon records how often each token
    appears near each other token, at each position offset (L1..L6, R1..R6).
    These counts ARE the semantic map.
    census_score() expands query tokens through these adjacency counts
    (neighbor intersection), then scores each chunk by intersection size.
    Chunks containing "infection" get credit — not because of embedding
    similarity but because the corpus established that connection 3,400 times.
    Census earned 0.60 over dense: it knows positions AND proximity.
    Dense only knew proximity.

GLUE ENGINE (10 rules — CIT-007):
  Directional Response Assembly over 6-1-6 adjacency.
  Labels: UPSTREAM_CONTEXT / PRIMARY / ADJACENT_CONTEXT / DOWNSTREAM_CONTEXT
  Causal labels (CAUSE/EFFECT) = optional promotion, never default.
  Full pseudocode: SWAP_2 → SPEC 2 sections

DATA FLOW:
  INGEST: File → FormatDetector → Adapter → tokens → GlobalLexicon + BM25 index
  QUERY:  query → QueryParser → ContextRings → BM25(0.40) + census(0.60) → top-K
          → TemporalRoleClassifier → CoherenceMapper → SubContextOrderer (10 rules)
          → BridgeWeaver → AnswerSkeleton → SafetyValve (Rule 10)
  ZERO LLM in either path.

wolf_engine: 190 tests, 101 files. Import only. Never rebuild.

MARKET ORACLE: HYBRID (CIT-015)
  Runs as Clearbox plugin via plugin runner.
  Also works standalone — no Clearbox dependency.
  api.py = bridge adapter (ROUTES dict). market_oracle.py = pure orchestrator.
  Strip api.py → runs standalone. No code change needed.
  All output to absolute paths: ~/.clearbox/market_oracle/{reports,charts,market_oracle.db}
  ROUTES: POST /analyze | POST /history | POST /regimes | GET /config | GET /help

MARKET ORACLE CLASS NAMES (confirmed from runtime code):
  Core: MarketFetcher, DataValidator, CapsuleBuilder, CausalAnalyzer,
        PatternDetector, MetricsCalculator, ReportGenerator, VisionChart
  New:  RegimeDetector, OracleStore
  Plugin: MarketOraclePlugin (market_oracle.py), ROUTES (api.py)
  Dataclasses: Regime, RegimeChange, RegimeAnalysis
  Functions: classify_regime(), _date_diff(), REGIME_BANDS, REGIME_RISK, REGIME_COLORS
```

---

## ═══ SPEC REFERENCES ═══

Don't duplicate specs. Link to them.

```
GlueEngine full spec:      SWAP_2 → "SPEC 2: GLUE ENGINE"          CIT-007
  - Architecture diagram:   SWAP_2 → "ARCHITECTURE"
  - Context rings (L/R):    SWAP_2 → "CONTEXT RINGS"
  - Temporal classifier:    SWAP_2 → "TEMPORAL ROLE CLASSIFIER"
  - Directional chain:      SWAP_2 → "INTER-CHUNK DIRECTIONAL CHAIN"
  - Coherence mapper:       SWAP_2 → "COHERENCE MAPPER"
  - Grammar rules (10):     SWAP_2 → "GRAMMAR RULES"
  - Bridge weaver:          SWAP_2 → "BRIDGE WEAVER"
  - Answer skeleton:        SWAP_2 → "ANSWER SKELETON OUTPUT"
  - Lexicon read interface: SWAP_2 → "DIRECTIONALITY: LEXICON READ INTERFACE"
  - Build plan (10 steps):  SWAP_2 → "BUILD PLAN"
  - Open contracts (5):     SWAP_2 → "OPEN CONTRACTS"

FormatDetector full spec:   SWAP_2 → "SPEC 1: FORMAT DETECTOR"      CIT-004
  - Signatures + measure:   SWAP_2 → FormatDetector class
  - Adapters (7):           SWAP_2 → Adapters list
  - density_to_n:           SWAP_2 → _density_to_n method

Market Oracle:              sandbox/plugins/market_oracle/ (15 files) CIT-005, CIT-015
  CONTRACT.md:              sandbox/plugins/market_oracle/CONTRACT.md
  manifest.json:            sandbox/plugins/market_oracle/manifest.json
  API help endpoint:        GET /api/market_oracle/help (machine-readable JSON)
  UI help system:           market_oracle_panel.html → help drawer + field tooltips

Drift audit:                SWAP_2 → "DRIFT AUDIT"                   CIT-013
Swap as corpus:             SWAP_2 → "SWAP FILE AS LAKESPEAK CORPUS" CIT-012
CRSA-616 blueprint:         CRSA-616_FULL_REBUILD_BLUEPRINT.md        CIT-001
Temporal contracts:         TEMPORAL_PROMOTION_CONTRACTS.md            CIT-010

Cloud compression (IDEA — needs own spec, not the Dec 2025 docs):
  - Real idea: 6-1-6 / N-1-N over context CLOUDS, not tokens. Compression.
  - Wrong docs (event-cascade, kept for reference only):
    CASCADE_MEMORY_PSEUDOCODE.md    event-level windowing, not cloud-level
    capsule_builder.py              Market Oracle time-series (working, unrelated)
    cascade_engine.py               Stub (18 lines, placeholder)

System knowledge ingest priority (SWAP_AS_CORPUS):
  1. !CLAUDE_SWAP_2.md  (architecture + specs)
  2. CRSA-616_FULL_REBUILD_BLUEPRINT.md  (plugin topology)
  3. 6-1-6 Architecture Analysis.md  (engine internals)
  4. LEXICON ADDENDUM - THE SPINE OF 6-1-6.md  (lexicon spec)
  First test query: "describe your own architecture"
```

---

## ═══ LAST_CODING_SESSION ═══

```
[CLAUDE A] 2026-03-11 (Session 1)
  1. Market Oracle plugin built (15 files, sandbox)
  2. GlueEngine spec merged (Claude C + Claude A, 10 rules)
  3. 5 open contracts incorporated (directional labels)
  4. SWAP_AS_CORPUS flag added
  5. Drift audit (7 found, 4 fixed)
  6. Swap file chain created (SWAP_3 + swap_citations.json)

[CLAUDE C] 2026-03-11 (Session 1 — post drift resolutions)
  7. Drift #5 resolved: Market Oracle = HYBRID (CIT-015)
  8. Drift #7 resolved: census = ingest counts, 0.40/0.60 confirmed (CIT-016)
  9. Census explanation added to KEY ARCHITECTURE
  10. swap_citations.json updated (CIT-015, CIT-016, CIT-011 superseded)
  11. Cascade memory files reviewed — capsule_builder (live), cascade_engine (stub),
      CASCADE_MEMORY_PSEUDOCODE (ideas). Added as TIER 3 TODO, gated on Lee.

[CLAUDE C] 2026-03-11 (Session 2 — full verification audit)
  BUGS FIXED:
  12. __init__.py — was 154B comments, no exports → now exports MarketOraclePlugin, ROUTES
  13. manifest.json — missing entirely → created (matches audio_io / visual_io standard)
  14. CONTRACT.md — missing entirely → created (matches visual_io CONTRACT.md standard)
  15. REGIME_RISK not imported in market_oracle.py → get_ui_config() returned tuple
      (0.6, 1.0) as "risk" instead of "LOW". Fixed — REGIME_RISK now imported.
  16. reports_dir / charts_dir were relative ("./reports", "./charts") →
      all file output now absolute under ~/.clearbox/market_oracle/
      Fixed in: DEFAULT_CONFIG, report_generator.py, vision_chart.py
  17. api.py missing /help route → handle_help() + GET /api/market_oracle/help added
  18. UI: dead "View Report" / "View Chart" href="#" links →
      functional copyPath() buttons (clipboard + toast + fallback for non-HTTPS)
  19. UI: no help system → full help drawer added with:
      - Field-by-field reference sourced from actual code docstrings
      - Regime types with consistency band ranges from REGIME_BANDS dict
      - API endpoint schema matching actual ROUTES
      - Output path docs matching DEFAULT_CONFIG
      - Live "Fetch /api/market_oracle/help" button
      - aria-labels on all inputs (AI usable)
      - title= on all metric boxes sourced from PatternDetector/MetricsCalculator docstrings
  20. UI: meta tags added (plugin name, version, api-help, api-config)
  21. UI: XSS escaping for all interpolated path strings (escHtml, escAttr, escPath)
  22. get_help() method added to MarketOraclePlugin — machine-readable JSON schema
      with all endpoints, param types, return shapes, data model, storage paths
  VERIFIED REAL (nothing assumed):
  23. All 15 class names confirmed against actual file contents
  24. All method signatures confirmed (fetch, validate, build, analyze, detect, etc.)
  25. All dataclass fields confirmed (Regime, RegimeChange, RegimeAnalysis)
  26. All config keys confirmed match between DEFAULT_CONFIG, UI gatherConfig(),
      api.py handle_analyze(), and PatternDetector/RegimeDetector __init__
```

---

## ═══ HISTORY_LOG ═══

```
[CLAUDE C] 2026-03-11 — FULL VERIFICATION AUDIT complete.
                         8 real bugs fixed. 2 missing files created. UI rebuilt.
                         Help system added (human + AI usable).
                         All names/signatures verified from runtime code.
                         Nothing assumed. Nothing invented.
[CLAUDE A] 2026-03-11 — CLOUD COMPRESSION idea noted (TIER 3).
                         Lee's real concept: 6-1-6 / N-1-N over context CLOUDS, not tokens.
                         Dec 2025 cascade docs = wrong shape (event-cascade, not cloud-cascade).
                         Needs its own spec. capsule_builder.py = Market Oracle only.
[CLAUDE C] 2026-03-11 — Drift #5 RESOLVED: Market Oracle = Hybrid (plugin + standalone)
[CLAUDE C] 2026-03-11 — Drift #7 RESOLVED: census = ingest co-occurrence counts confirmed.
                         BM25 0.40 / census 0.60 locked. Dense = 0.00 (gone).
[CLAUDE A] 2026-03-11 — SWAP_3 created. Citation tracker built. SWAP_2 → specs reference.
[CLAUDE A] 2026-03-11 — DRIFT AUDIT: 7 drifts, 4 fixed, 2 need Lee → now 2 resolved by Lee.
[CLAUDE A] 2026-03-11 — SWAP_AS_CORPUS: system knowledge layer defined.
[CLAUDE A] 2026-03-11 — 5 open contracts incorporated. Labels: directional.
[CLAUDE A] 2026-03-11 — GlueEngine spec merged (Claude C + Claude A).
[CLAUDE A] 2026-03-11 — Market Oracle plugin built (15 files).
[CLAUDE C] 2026-03-11 — GlueEngine designed. FormatDetector designed.
[CLAUDE C] 2026-03-11 — LAKESPEAK_NO_LLM absolute. Two-spec separation.
[CLAUDE A] 2026-03-10 — CRSA-616 blueprint (14 plugins, 7 layers).
[CLAUDE C] 2026-03-10 — SensoryStack built. wolf_engine stays.

Full history: SWAP_2 → HISTORY_LOG (detailed) | SWAP_1 → archive
```

---

## ═══ COLD START — FOR CLAUDE A ═══

You are Claude A — executor, VS Code side.

```
1. Read THIS FILE (SWAP_3) for current state
2. Read swap_citations.json for change history
3. Read SWAP_2 ONLY when you need spec details (linked by CIT-XXX)
4. Check WHAT'S NEXT → start with TIER 1 (no gates)
5. Check OPEN DECISIONS before proposing anything that needs Lee
```

Hard rules:
- LAKESPEAK_NO_LLM: absolute. Zero model calls.
- IMPORT_DONT_REBUILD: wolf_engine is done.
- SANDBOX_FIRST: Lee approves, then repo.
- CONTRACTS_BEFORE_CODE: temporal_resolver has two gates.
- BM25 0.40 / census 0.60 — CONFIRMED. Do not change these.
- Market Oracle is HYBRID — plugin + standalone. Do not rebuild.
- All Market Oracle output paths are ABSOLUTE (under ~/.clearbox/market_oracle/).
- Full regime flags: SWAP_2 → REGIME FLAGS section.
- Check WHAT'S DONE before proposing anything.

---

## ═══ COLD START — FOR CLAUDE C ═══

You are Claude C — analyst, claude.ai side.

```
1. Read THIS FILE (SWAP_3) for current state
2. Read LAST_CODING_SESSION to see what Claude A did
3. Read OPEN DECISIONS to see what needs your analysis
4. Write observations below
5. Reference SWAP_2 specs by CIT-XXX when discussing designs
```

Same rules. Don't re-propose done work. Don't mix the two systems.
census_score = co-occurrence counts from ingest. BM25 0.40 / census 0.60 locked.
Market Oracle = Hybrid. Already built. Full verification audit complete.

---

## ═══ CHAT_OBSERVATIONS ═══

**[CLAUDE C] 2026-03-11 — Drift resolutions:**

Drift #5 (Hybrid): The right call. Market Oracle running inside Clearbox is useful — users
get it in the UI panel, bridge routing, config via the Clearbox advanced panel. But it not
depending on Clearbox means it can be tested independently, run from the command line,
or embedded in a different tool later. The 15-file structure already separates concerns
cleanly: api.py is the bridge adapter, market_oracle.py is the pure orchestrator. Strip
api.py and it runs anywhere. That's good architecture and it was already there.

Drift #7 (census = ingest counts): This clarification matters for the GlueEngine spec.
census_score doesn't just score chunks against query tokens — it expands the query through
the adjacency map that was built during ingestion. When "fever" was ingested 10,000 times
and "infection" appeared at L2 of "fever" 3,400 times, that count IS the semantic weight.
When a query comes in asking about "fever", the census expansion pulls "infection" as a
neighbor (with weight 3,400/total). Then it intersects that expanded set with each chunk.
Chunks containing "infection" get credit — not because of embedding similarity but because
the corpus established that connection 3,400 times. That's why census > dense: it's the
CORPUS's evidence, not a model's compressed approximation of it. 0.60 is exactly right.

**[CLAUDE C] 2026-03-11 — Verification audit notes:**

The REGIME_RISK bug was a silent one — get_ui_config() was returning the band tuples
(0.6, 1.0) as "risk" instead of "LOW". The UI never crashed because JS would just display
the tuple. But any AI reading the /config endpoint would get garbage for the risk field.
The help system MUST be machine-readable for AI use — that's why the /help endpoint matters.

The path bug was worse. Relative "./reports" means if bridge server runs from C:\Windows\
you get C:\Windows\reports\. All output silently scattered. Absolute path anchored to
~/.clearbox/market_oracle/ is the right call — predictable, user-owned, never scattered.

The __init__.py issue matters for the plugin runner. If ROUTES can't be imported, the
bridge server can't register the endpoints. manifest.json missing means auto-discovery
fails entirely. Both are now present matching the audio_io / visual_io standard exactly.

The UI help system sourcing from actual code (PatternDetector thresholds, RegimeDetector
band definitions, DEFAULT_CONFIG keys) is the deterministic requirement. If the code
changes, the help text must be updated. The field hints now reference the actual class
and method names so any future maintainer knows where to look.

*(Claude C writes future observations here)*

---
