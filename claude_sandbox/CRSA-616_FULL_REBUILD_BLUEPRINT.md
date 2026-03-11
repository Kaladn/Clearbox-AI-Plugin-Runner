# CRSA-616 FULL REBUILD BLUEPRINT
## Causal Relational State Automaton — Complete Clearbox Plugin Architecture
> [CLAUDE A] 2026-03-10 — Built from deep survey of ALL 740+ artifacts
> This is NOT 4 sensory plugins. This is the entire cognitive engine.

---

## THE PROBLEM WITH WHAT WE SCOPED

SensoryStack (visual_io, audio_io, av_security, netlog) = **Layer 1 only**.
That's the eyes and ears. No brain, no memory, no judgment, no output.

The CRSA-616 is a **7-layer architecture** with cross-cutting systems.
Wolf engine already has most of it built (190 tests, 101 Python files).
The rebuild wires wolf_engine's internals into Clearbox's plugin architecture
so every layer is a first-class plugin with endpoints, tools, and hooks.

---

## FULL ARCHITECTURE MAP

```
╔══════════════════════════════════════════════════════════════════╗
║                    CRSA-616 CLEARBOX PLUGIN SUITE                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  LAYER 7: OUTPUT                                                 ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ report_engine plugin                                        │ ║
║  │ Deterministic JSON reports + optional LLM styling shim      │ ║
║  │ Citations, confidence scores, causal paths — explainable AI │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 6: GOVERNANCE (ALREADY BUILT — "The Chain")               ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ archon plugin                                               │ ║
║  │ Judge (Confidence + TCM + Citadel + OperatorGov)            │ ║
║  │ Orchestrator (engine → judge → verdict)                     │ ║
║  │ VerdictStore (SQLite audit trail, append-only)              │ ║
║  │ CAM stub (multi-engine comparison, dormant until needed)    │ ║
║  │ 38 tests passing                                            │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 5: REASONING (CRSA-616 CORE)                              ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ reasoning plugin                                            │ ║
║  │ 6-1-6 Streaming Engine (two-pass, lifetime counts)          │ ║
║  │ NCV-73 Builder (73-dim causal vectors: 36+1+36)             │ ║
║  │ Window Builder (co-occurrence counting, sliding window)     │ ║
║  │ Causal Analyzer (bidirectional validation — anti-hallucin.) │ ║
║  │ Cascade Engine (BFS on co-occurrence graph, fwd+bwd)        │ ║
║  │ Pattern Detector (breaks, chains, anomalies, z-score)       │ ║
║  │ 30 tests passing                                            │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 4: WORKING MEMORY                                         ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ forge plugin                                                │ ║
║  │ ForgeMemory — RAM-only, bounded, symbol-keyed               │ ║
║  │   symbols: dict[uint64, SymbolEvent]                        │ ║
║  │   co_occurrence: dict[uint64, Counter]                      │ ║
║  │   resonance: dict[uint64, float]                            │ ║
║  │   chains: dict[str, list[uint64]]                           │ ║
║  │ Eviction: old events leave, resonance/co-occurrence stays   │ ║
║  │ "Forge is thinking, not forgetting"                         │ ║
║  │ ForgeMemoryGPU — optional GPU-accelerated variant           │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 3: PERSISTENCE (DUAL-LANE)                                ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ persistence plugin                                          │ ║
║  │ RAW LANE — forensic truth (immutable, audit, replay)        │ ║
║  │   SQLiteWriter → raw_events table                           │ ║
║  │ SYMBOL LANE — computational truth (optimized for reasoning) │ ║
║  │   SQLiteWriter → symbol_events table                        │ ║
║  │ Global Lexicon — lifetime word frequency + adjacency        │ ║
║  │   lexicon.bin + contexts.bin (NCV-73 vectors on disk)       │ ║
║  │ Evidence Sessions — JSONL per worker, fusion merge          │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 2: SYMBOLIZATION                                          ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ gnome plugin                                                │ ║
║  │ GNOME Symbolizer — token → uint64 symbol_id (SHA-256 trunc) │ ║
║  │ Symbol Genome Loader — lookup tables (genome JSON)          │ ║
║  │ Context Window — 6-1-6 (6 symbols before + token + 6 after) │ ║
║  │ Integrity Hash — SHA-256 per token for verification         │ ║
║  │ Collision Detection — same symbol_id, different token       │ ║
║  │ Output: SymbolEvent (symbol_id, context_symbols, integrity) │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                           ▲                                      ║
║  LAYER 1: PERCEPTION (SENSORY INPUT)                             ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ visual_io    — Screen capture, SVE, frame-to-grid, entropy  │ ║
║  │ audio_io     — Mic capture, MFCC, ILD direction, classify   │ ║
║  │ av_security  — AV correlation, Op#18, phantom/silent detect │ ║
║  │ netlog       — Connection-level traffic, psutil + scapy opt │ ║
║  │ [NEW] ingestion — File watcher + network tap adapters       │ ║
║  │               Normalizer → RawAnchor (UUID, hash, timestamp)│ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  CROSS-CUTTING SYSTEMS                                           ║
║  ┌────────────────────┐ ┌──────────────────┐ ┌────────────────┐ ║
║  │ evidence plugin    │ │ dashboard plugin │ │ lexicon plugin │ ║
║  │ EvidenceSession    │ │ MetricsExporter  │ │ GlobalLexicon  │ ║
║  │ WorkerBase ABC     │ │ MetricsCollector │ │ Word → Symbol  │ ║
║  │ Fusion (JSONL)     │ │ Flask+SSE+Charts │ │ Freq + Adj     │ ║
║  │ Timestamp (dual)   │ │ 42 tests passing │ │ Persistent     │ ║
║  └────────────────────┘ └──────────────────┘ └────────────────┘ ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## LAYER-BY-LAYER DETAIL

### LAYER 1: PERCEPTION (Sensory Input)
**Status:** 4 plugins BUILT in sandbox (visual_io, audio_io, av_security, netlog)
**Missing:** Ingestion adapter plugin (file watcher + network tap)

**What exists in wolf_engine:**
- evidence/workers.py — SystemPerfWorker, NetworkLoggerWorker, ProcessLoggerWorker, InputLoggerWorker
- modules/loggers/ — 8 loggers (ads, camera, input, movement, network, process, system_perf, trigger)

**What exists in artifacts:**
- Ingestion Engine spec (CANONICAL PSEUDOCODE) — FileWatcherAdapter, NetworkTapAdapter, Normalizer
- Perception Service (ZMQ REP :5004) — tokenization + 6-1-6 context windows

**New plugin needed: `ingestion`**
```
plugins/ingestion/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/ingestion
  config.py            adapter paths, normalizer settings
  api/router.py        /status /health /ingest /adapters /session
  core/normalizer.py   → imports wolf_engine patterns
  core/adapters/       file_watcher.py, network_tap.py
```

**Data flow:**
```
Raw Input (files, network, sensors, screen, mic)
    ↓
Adapters emit RawInput
    ↓
Normalizer → RawAnchor (UUID, SHA-256 hash, monotonic timestamp)
    ↓
Hands off to Layer 2 (GNOME) and Layer 3 (Persistence raw lane)
```

---

### LAYER 2: SYMBOLIZATION (GNOME)
**Status:** BUILT in wolf_engine (gnome/ directory)
**What exists:**
- wolf_engine/gnome/gnome_service.py — main symbolization service
- wolf_engine/gnome/symbolizer.py — token → uint64 via SHA-256 truncation
- wolf_engine/gnome/symbol_genome_loader.py — lookup tables from genome JSON

**New plugin needed: `gnome`**
```
plugins/gnome/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/gnome, requires: [ingestion]
  config.py            genome_path, context_window_size (6)
  api/router.py        /status /health /symbolize /genome/stats /collisions
                        plugin_post hook (annotates chat with symbol stats)
  api/models.py        SymbolizeRequest, SymbolizeResponse
  core/engine.py       → from wolf_engine.gnome.gnome_service import GnomeService
```

**Data flow:**
```
RawAnchor (from Layer 1)
    ↓
GnomeService.process_anchor()
    ↓
Token lookup in Symbol Genome (genome JSON)
    ├── Found: use genome symbol_id
    └── Not found: SHA-256 truncate → new symbol_id (mark unreviewed)
    ↓
Build 6-1-6 context window (6 symbols before + token + 6 after)
    ↓
Compute integrity hash (SHA-256 of raw token)
    ↓
Detect collisions (different token → same symbol_id)
    ↓
Output: SymbolEvent (event_id, session_id, pulse_id, symbol_id,
                     context_symbols, integrity_hash, genome_version)
    ↓
Hands off to Layer 3 (symbol lane) and Layer 4 (Forge)
```

---

### LAYER 3: PERSISTENCE (Dual-Lane SQL + Lexicon)
**Status:** BUILT in wolf_engine (sql/ directory)
**What exists:**
- wolf_engine/sql/sqlite_writer.py — dual-write (raw + symbol lanes)
- wolf_engine/sql/sqlite_reader.py — query interface
- evidence/session_manager.py — JSONL session lifecycle
- evidence/fusion.py — multi-worker JSONL merge

**Artifacts with unbuilt specs:**
- lexicon.py — GlobalLexicon (lifetime frequency + adjacency)
- persistence_writer.py — lexicon.bin + contexts.bin + doc_index.db
- context_retriever.py — loads NCV-73 vectors from disk

**New plugin needed: `persistence`**
```
plugins/persistence/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/persistence, requires: [gnome]
  config.py            db_path, lexicon_path, sessions_dir
  api/router.py        /status /health /raw_events /symbol_events
                        /sessions /lexicon/stats /lexicon/lookup
  core/engine.py       → from wolf_engine.sql.sqlite_writer import SQLiteWriter
                        → from wolf_engine.sql.sqlite_reader import SQLiteReader
  core/lexicon.py      → GlobalLexicon (word→symbol, lifetime freq, adjacency)
  core/binary_store.py → lexicon.bin, contexts.bin persistence
```

**Dual-lane guarantee (CRITICAL):**
```
1. write_raw_event() ALWAYS succeeds (forensic truth)
2. write_symbol_event() succeeds IF GNOME succeeds
3. forge.ingest() succeeds IF BOTH SQL writes succeed
4. Raw lane never depends on downstream success
```

**Schema (4 tables):**
- sessions — session metadata, genome version
- raw_events — forensic lane (event_id, pulse_id, raw_json)
- symbol_events — compute lane (symbol_id, context_symbols JSON, integrity_hash)
- symbol_collisions — collision audit (symbol_id, token, genome_version)

---

### LAYER 4: WORKING MEMORY (Forge)
**Status:** BUILT in wolf_engine (forge/ directory, 6 acceptance + 6 stress tests)
**What exists:**
- wolf_engine/forge/forge_memory.py — RAM-only ForgeMemory
- wolf_engine/services/forge_service.py — ZMQ REP :5001
- wolf_engine/gpu/forge_memory_gpu.py — GPU variant (ROCm/CUDA)

**New plugin needed: `forge`**
```
plugins/forge/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/forge, requires: [persistence]
  config.py            window_size (10000), gpu_enabled, top_k
  api/router.py        /status /health /query/{symbol_id} /stats
                        /symbols/top /chains /ingest
                        /reset (clears forge, preserves verdicts)
                        plugin_pre hook (injects top resonance symbols into LLM context)
  api/models.py        IngestRequest, QueryResponse, ForgeStats
  core/engine.py       → from wolf_engine.forge.forge_memory import ForgeMemory
```

**ForgeMemory internals (LOCKED — do not modify):**
```python
symbols:        dict[uint64, SymbolEvent]   # current events in RAM
co_occurrence:  dict[uint64, Counter]        # neighbor counts
resonance:      dict[uint64, float]          # frequency/importance scores
chains:         dict[str, list[uint64]]      # symbol chains (MD5 keyed)
event_queue:    deque[uint64]                # FIFO for eviction
window_size:    int                          # bounded memory limit
```

**Eviction policy (LOCKED):**
- Old events leave RAM when window exceeded
- Resonance and co-occurrence history STAYS
- "Forge is thinking, not forgetting"

**MUST NOT:** Load genome, hash strings, touch raw tokens, write to disk, expand meaning
**MUST:** Accept only SymbolEvents, use uint64 keys, maintain bounded window

---

### LAYER 5: REASONING (CRSA-616 Core)
**Status:** BUILT in wolf_engine (reasoning/ directory, 30 tests passing)
**What exists:**
- wolf_engine/reasoning/engine.py — 6-1-6 streaming engine (two-pass)
- wolf_engine/reasoning/causal_analyzer.py — bidirectional validation
- wolf_engine/reasoning/cascade_engine.py — BFS on co-occurrence graph
- wolf_engine/reasoning/pattern_detector.py — breaks, chains, anomalies
- wolf_engine/services/reasoning_service.py — ZMQ REP :5002
- wolf_engine/modules/reasoning/ncv73_builder.py — 73-dim vector generation
- wolf_engine/modules/reasoning/window_builder.py — sliding window co-occurrence
- wolf_engine/modules/reasoning/causal.py, cascade.py, pattern.py — WolfModule wrappers
- wolf_engine/gpu/ncv_batch.py — GPU-accelerated NCV-73

**New plugin needed: `reasoning`**
```
plugins/reasoning/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/reasoning, requires: [forge]
  config.py            window_size (6), max_possibilities (6), distance_threshold
  api/router.py        /status /health
                        /analyze (full pipeline: ingest → reason → verdict)
                        /query (anchor extraction → NCV lookup → cascade → validate)
                        /cascade (BFS trace forward/backward/both)
                        /patterns (detect breaks, chains, anomalies)
                        /ncv/{word} (inspect NCV-73 vector for a term)
                        /windows (get 6-1-6 windows for a session)
                        plugin_pre hook (injects causal context into LLM queries)
  api/models.py        AnalyzeRequest, QueryRequest, CascadeRequest, PatternResult
  core/engine.py       → from wolf_engine.reasoning.engine import ReasoningEngine
                        → from wolf_engine.reasoning.causal_analyzer import CausalAnalyzer
                        → from wolf_engine.reasoning.cascade_engine import CascadeEngine
                        → from wolf_engine.reasoning.pattern_detector import PatternDetector
```

**The Query Pipeline (Question → Deterministic Report):**
```
User Question
    ↓
1. Anchor Extraction — meaningful words from query
    ↓
2. NCV-73 Retrieval — load 73-dim vectors for each anchor
    ↓
3. Nearest Neighbors — Euclidean distance in 73-dim space
    ↓
4. 6×6-1-6×6 Cascade — branching causal paths
   (6 positions × 6 possibilities = 36 dims before, 36 after)
   (6^6 = 46,656 possible paths per direction)
    ↓
5. Bidirectional Causal Validation
   Forward:  Does next state follow from anchor's top patterns?
   Backward: Does anchor follow from previous patterns?
   BOTH must pass → "hallucination kill-switch"
    ↓
6. Deterministic Report (structured JSON)
```

**NCV-73 vector structure:**
```
[position -6: 6 possibilities] = dims 0-5
[position -5: 6 possibilities] = dims 6-11
[position -4: 6 possibilities] = dims 12-17
[position -3: 6 possibilities] = dims 18-23
[position -2: 6 possibilities] = dims 24-29
[position -1: 6 possibilities] = dims 30-35
[anchor]                        = dim 36
[position +1: 6 possibilities] = dims 37-42
[position +2: 6 possibilities] = dims 43-48
[position +3: 6 possibilities] = dims 49-54
[position +4: 6 possibilities] = dims 55-60
[position +5: 6 possibilities] = dims 61-66
[position +6: 6 possibilities] = dims 67-72
```
**This is NOT a simple embedding. It's a 73-dimensional causal probability manifold.**

---

### LAYER 6: GOVERNANCE (Archon / "The Chain")
**Status:** BUILT in wolf_engine (archon/ directory, 38 tests passing)
**ALREADY DONE — Lee confirmed. Do not rebuild or re-scope.**

**What exists:**
- wolf_engine/archon/judge.py — 4 governance modules:
  - ConfidenceGovernance — calibrates confidence vs historical accuracy
  - TemporalCoherence (TCM) — penalizes verdict flip-flopping
  - CitadelIsolation — quarantines anomalous results
  - OperatorGovernance — evaluates TrueVision operator flags
- wolf_engine/archon/orchestrator.py — engine → judge → verdict pipeline
- wolf_engine/archon/verdict.py — VerdictStore (SQLite audit trail)
- wolf_engine/archon/cam_stub.py — multi-engine comparison (dormant)

**Plugin approach: `archon`**
```
plugins/archon/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/archon, requires: [reasoning]
  config.py            verdict_db_path, governance_modules
  api/router.py        /status /health
                        /analyze (full pipeline: ingest → reason → govern → verdict)
                        /verdicts/recent /verdicts/counts /verdicts/session/{id}
                        /audit (full genealogy ledger)
                        plugin_post hook (surfaces verdict confidence into chat)
  core/engine.py       → from wolf_engine.archon.orchestrator import Orchestrator
                        → from wolf_engine.archon.judge import Judge
                        → from wolf_engine.archon.verdict import VerdictStore
```

**Archon Judgment Protocol:**
```
1. Detect consensus: FULL / PARTIAL / DEADLOCK
2. Full:    amplify confidence (+25%)
3. Partial: average confidence
4. Deadlock: tie-breaking ladder
   Level 1: Confidence-Weighted Voting
   Level 2: Causal Alignment (CAM scores)
   Level 3: Reality Anchor (RAM scores)
   Level 4: Operator Preference (learned overrides)
   Level 5: Default to Safety
```

---

### LAYER 7: OUTPUT (Report Engine)
**Status:** Partially exists in artifacts (report_builder.py, llm_shim concept)
**What exists in artifacts:**
- report_builder.py — formats analysis results
- llm_shim.py concept — optional LLM styling (<1% GPU)
- causal_validator.py — forward/backward validation results

**New plugin needed: `report_engine`**
```
plugins/report_engine/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/reports, requires: [archon]
  config.py            llm_shim_enabled, llm_model, citation_depth
  api/router.py        /status /health
                        /generate (verdict → deterministic JSON report)
                        /explain/{verdict_id} (trace causal path for a verdict)
                        /cite (document citations for evidence chain)
                        plugin_post hook (appends structured report to chat response)
  core/report_builder.py   → structured JSON report from verdict
  core/llm_shim.py         → optional LLM styling pass
  core/citation_engine.py  → traces evidence back to source documents
```

**Report structure (every query returns):**
```json
{
  "anchors": [...],
  "nearest_terms": [...],
  "forward_cascades": [...],
  "backward_validations": [...],
  "causal_paths": [...],
  "citations": [...],
  "confidence": 0.87,
  "verdict": "APPROVED|ADJUSTED|QUARANTINED",
  "governance_flags": [...],
  "llm_summary": "optional human-readable text"
}
```
**Every step is traceable. This is explainable AI.**

---

### CROSS-CUTTING: EVIDENCE PLUGIN
**Status:** BUILT in wolf_engine (evidence/ directory, 26 tests passing)
```
plugins/evidence/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/evidence
  config.py            sessions_dir, fusion_interval
  api/router.py        /status /health
                        /session/start|stop|list
                        /workers/start|stop (toggle 4 evidence workers)
                        /fusion/{session_id} (merge all JSONL → fused output)
                        /export/{session_id} (download session data)
  core/engine.py       → from wolf_engine.evidence.session_manager import EvidenceSessionManager
                        → from wolf_engine.evidence.fusion import fuse_session
                        → from wolf_engine.evidence.worker_base import WorkerBase
```

### CROSS-CUTTING: DASHBOARD PLUGIN
**Status:** BUILT in wolf_engine (dashboard/ directory, 42 tests passing)
```
plugins/dashboard/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/dashboard
  config.py            metrics_port (5020), metrics_db_path
  api/router.py        /status /health
                        /metrics (CPU/RAM/GPU/Forge/Archon)
                        /stream (SSE live updates)
                        /snapshot (full system state)
                        /ui (HTML dashboard)
  core/engine.py       → from wolf_engine.dashboard.app import ...
```

### CROSS-CUTTING: LEXICON PLUGIN
**Status:** Exists in artifacts (lexicon.py, specs), not in wolf_engine
```
plugins/lexicon/
  __init__.py          VERSION = "0.1.0"
  manifest.json        mount /api/lexicon
  config.py            lexicon_path, window_size (6)
  api/router.py        /status /health
                        /lookup/{word} (frequency, adjacency, symbol_id)
                        /stats (total words, total symbols, avg frequency)
                        /process (ingest document into lexicon)
  core/engine.py       → GlobalLexicon (word→symbol, lifetime freq+adj)
```

---

## COMPLETE DATA FLOW — END TO END

```
═══ RAW INPUT ═══
Screen frames, mic audio, network connections, files, text, any data source
         │
         ▼
═══ LAYER 1: PERCEPTION ═══
visual_io ──┐
audio_io ───┤
av_security─┤──→ RawInput (source_id, channel, payload, metadata)
netlog ─────┤
ingestion ──┘
         │
         ▼
═══ LAYER 2: SYMBOLIZATION (GNOME) ═══
RawInput → Normalizer → RawAnchor (UUID, SHA-256, monotonic ts)
RawAnchor → Symbolizer → SymbolEvent (uint64 symbol_id, 6-1-6 context)
         │
         ├──────────────────────────────┐
         ▼                              ▼
═══ LAYER 3: PERSISTENCE ═══     ═══ LAYER 4: FORGE ═══
RAW LANE:                        ForgeMemory.ingest(SymbolEvent)
  raw_events table               Update co_occurrence graph
  (forensic, immutable)          Update resonance scores
SYMBOL LANE:                     Build chains (top-k neighbors)
  symbol_events table            Bounded window (evict old, keep stats)
  (computational, indexed)
LEXICON:                              │
  lexicon.bin (word→freq+adj)         ▼
  contexts.bin (NCV-73 on disk)  ═══ LAYER 5: REASONING (CRSA-616 CORE) ═══
                                 6-1-6 Engine → Windows with resonance
                                 NCV-73 Builder → 73-dim causal vectors
                                 Causal Analyzer → bidirectional validation
                                 Cascade Engine → BFS forward/backward paths
                                 Pattern Detector → breaks, chains, anomalies
                                      │
                                      ▼
                                 ═══ LAYER 6: GOVERNANCE (ARCHON) ═══
                                 Orchestrator: engine → judge → verdict
                                 Judge: Confidence + TCM + Citadel + OperatorGov
                                 VerdictStore: SQLite audit trail
                                 Consensus → FULL / PARTIAL / DEADLOCK
                                 Tie-breaker ladder (5 levels → safe default)
                                      │
                                      ▼
                                 ═══ LAYER 7: OUTPUT ═══
                                 Deterministic JSON report
                                 Causal paths + citations + confidence
                                 Optional LLM shim (styling only, <1% GPU)
                                 Every claim traceable to source evidence
```

---

## PLUGIN COUNT: WHAT WE ACTUALLY NEED

### Already built in sandbox (Layer 1 — sensory):
1. `visual_io`      — screen capture + SVE
2. `audio_io`       — mic capture + MFCC + ILD
3. `av_security`    — AV correlation + Op#18
4. `netlog`         — network connection logging

### New plugins needed (Layers 2-7 + cross-cutting):
5. `ingestion`      — file watcher + network tap adapters + normalizer
6. `gnome`          — GNOME symbolization (token → uint64 symbol_id)
7. `persistence`    — dual-lane SQL (raw + symbol) + evidence sessions
8. `forge`          — ForgeMemory working memory (RAM, bounded)
9. `reasoning`      — 6-1-6 engine + NCV-73 + causal + cascade + patterns
10. `archon`        — governance / "the chain" (judge + verdict + orchestrator)
11. `report_engine` — deterministic reports + LLM shim + citations
12. `evidence`      — session lifecycle + worker framework + JSONL fusion
13. `dashboard`     — metrics + SSE + web UI
14. `lexicon`       — global lexicon (lifetime word freq + adjacency)

### Total: 14 plugins forming the complete CRSA-616

---

## WHAT'S ALREADY BUILT IN WOLF_ENGINE (190 tests)

| Layer | Wolf Engine Module | Tests | Status |
|-------|-------------------|-------|--------|
| 1 | evidence/workers.py | 26 | BUILT |
| 2 | gnome/ (service, symbolizer, genome_loader) | 11 | BUILT |
| 3 | sql/ (sqlite_writer, sqlite_reader) | 11 | BUILT |
| 4 | forge/forge_memory.py + gpu variant | 12 | BUILT |
| 5 | reasoning/ (engine, causal, cascade, pattern) | 30 | BUILT |
| 6 | archon/ (judge, orchestrator, verdict, cam) | 38 | BUILT |
| 7 | (report_builder exists as artifact only) | — | SPEC |
| X | dashboard/ (metrics, collector, web) | 42 | BUILT |
| X | modules/ (8 loggers, 4 operators, 5 reasoning) | 20 | BUILT |

**The point: We don't rebuild ANY of this. Every plugin does
`from wolf_engine.<module> import <Class>` and wraps it with a
FastAPI router + Clearbox plugin contract.**

---

## TOOL DEFINITIONS (for tool_defs.py)

### Layer 1 (already defined — 8 tools):
visual_io_start, visual_io_latest, audio_io_start, audio_io_latest,
av_correlate, av_findings, netlog_start, netlog_query

### Layer 2-7 (new — 14 tools):
```
gnome_symbolize        — Symbolize raw text into SymbolEvents
gnome_genome_stats     — Symbol Genome statistics

forge_query            — Query symbol by ID (resonance, neighbors, chains)
forge_stats            — Forge working memory statistics
forge_top_symbols      — Top-N resonance symbols

reasoning_analyze      — Full pipeline: ingest → reason → verdict
reasoning_query        — Query with anchor extraction + causal validation
reasoning_cascade      — BFS trace forward/backward causal paths
reasoning_patterns     — Detect pattern breaks, chains, anomalies

archon_verdict         — Get latest verdict with confidence
archon_audit           — Full governance audit trail

report_generate        — Generate deterministic report from verdict
report_explain         — Trace causal path for a specific claim

lexicon_lookup         — Look up word frequency, adjacency, NCV-73
```

### Total: 22 tools across 14 plugins

---

## BUILD ORDER (dependency chain)

```
Phase 1: DONE ✓
  visual_io, audio_io, av_security, netlog (sandbox)

Phase 2: FOUNDATION (no external deps)
  evidence → persistence → lexicon
  (these have no plugin dependencies, just wolf_engine imports)

Phase 3: COGNITIVE CORE
  gnome (requires: persistence)
  forge (requires: persistence)
  reasoning (requires: forge)

Phase 4: GOVERNANCE + OUTPUT
  archon (requires: reasoning)
  report_engine (requires: archon)

Phase 5: INTEGRATION
  ingestion (requires: gnome, persistence — ties perception to cognition)
  dashboard (requires: all — aggregates metrics from everything)

Phase 6: WIRE IT ALL
  Add 22 tool entries to tool_defs.py
  Add 14 mount blocks to forest_bridge_server.py
  Add 14 entries to _PLUGIN_META
  Add 14 config sections to forest.config.json
  Verify 9-point promotion checklist × 14 plugins
```

---

## ARCHITECTURAL LOCKS (CARRIED FORWARD)

```
[PERMANENT] No model names hardcoded in business logic
[PERMANENT] Local-only tool use
[PERMANENT] IMPORT from wolf_engine. Never rebuild.
[PERMANENT] NO YOLO. NO OpenCV. Lee's own tech only.
[PERMANENT] Nothing from outside this repo.
[PERMANENT] GPT has NO filesystem access.
[PERMANENT] Workers/Operators pattern from CompuCog.
[PERMANENT] Sandbox first — build in claude_sandbox/, Lee approves.
[PERMANENT] 6-1-6 is the universal pattern (adjustable N-1-N).
[PERMANENT] Dual-lane persistence (forensic + computational).
[PERMANENT] Forge is thinking, not forgetting (resonance survives eviction).
[PERMANENT] Bidirectional causal validation = hallucination kill-switch.
[PERMANENT] Every claim traceable to source evidence = explainable AI.
```

---

## FOR CLAUDE C

This blueprint maps the COMPLETE CRSA-616 architecture into 14 Clearbox plugins.
Not 4. Fourteen.

The SensoryStack was Layer 1 — the eyes and ears.
The CRSA-616 is the full cognitive engine:
perception → symbolization → persistence → memory → reasoning → governance → output.

Wolf engine has 190 passing tests across 101 Python files.
Every plugin is a thin FastAPI wrapper around wolf_engine imports.
Zero rebuilding. Pure wiring.

Questions for Lee:
1. Build order — start at Phase 2 (foundation) or Phase 3 (cognitive core)?
2. The ingestion plugin ties perception to cognition — is that the priority connector?
3. Dashboard — use wolf_engine's existing Flask+SSE dashboard or build fresh for Clearbox?
4. GPU acceleration — wire ForgeMemoryGPU and ncv_batch.py now or defer?

---

*"This is not RAG. This is not a transformer. This is a Causal Relational State Automaton
inside a Euclidean meaning manifold, wrapped in an LLM mouthpiece."*

*"This is the first system that thinks before it speaks."*

🐺💨
