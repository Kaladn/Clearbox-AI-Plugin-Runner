# Wolf Engine Introspection Report

**Generated:** 2026-02-16 (updated with Rounds 1-4)
**Codebase:** 54 Python files, 227 tests passing
**Status:** All 25 endpoints verified end-to-end

---

## 1. What It Really Does

### Launchers (Start / Stop)

| Feature | Trigger | Inputs | Outputs | Side Effects | Evidence |
|---------|---------|--------|---------|--------------|----------|
| **Start (foreground)** | `python start.py` | `--host` `--port` `--db-dir` | Flask on `:5000`, banner to stdout | Creates `.wolf.pid`, SQLite DBs (`wolf.db`, `verdicts.db`, `metrics.db`) in temp dir | `start.py:39 main()` |
| **Start (background)** | `python start.py --bg` | same + `--bg` flag | PID printed to stdout | Detached subprocess, `.wolf.pid` written | `start.py:51-85` |
| **Stop** | `python stop.py` | none | "Stopped" message | Kills PID from `.wolf.pid`, removes PID file | `stop.py:17 main()` |
| **Restart** | `python restart.py` | forwards all to start.py | same as start | Runs stop then start via `os.execv` | `restart.py:19 main()` |
| **Direct module** | `python -m wolf_engine.dashboard.app` | `--host` `--port` `--db-dir` | Same as start foreground | Same as start foreground | `dashboard/app.py:520 main()` |

### Live Actions (User-Triggerable)

| Feature | Trigger Type | Exact Trigger | Inputs | Outputs | Side Effects | Evidence |
|---------|-------------|---------------|--------|---------|--------------|----------|
| **Analyze text** | API + UI | `POST /api/analyze` / "ANALYZE" button | `{text, session_id?}` | Verdict (status, confidence, flags), patterns (breaks, chains, anomalies) | Tokenizes, ingests to Forge+SQLite, runs reasoning engine, Archon governance, writes verdict to DB | `dashboard/app.py:351 api_analyze()` |
| **Ingest text** | API + UI | `POST /api/ingest` / "INGEST ONLY" button | `{text, session_id?}` | Token count, anchors ingested, forge stats | Tokenizes, creates session, ingests anchors to Forge+SQLite | `dashboard/app.py:336 api_ingest()` |
| **Query symbol** | API + UI | `GET /api/query/<id>` / "QUERY" button | symbol_id (uint64) | Resonance, neighbors, chains, raw event | Read-only Forge lookup | `dashboard/app.py:364 api_query()` |
| **Cascade trace** | API + UI | `POST /api/cascade` / "TRACE" button | `{symbol_id, direction, max_depth}` | Node tree with depth + strength | Read-only BFS on Forge co-occurrence graph | `dashboard/app.py:371 api_cascade()` |
| **Top symbols** | API + UI | `GET /api/symbols/top` / "TOP SYMBOLS" button | `?limit=N` | Array of top-resonance symbols with neighbors | Read-only Forge query | `dashboard/app.py:385 api_top_symbols()` |
| **Clear input** | UI only | "CLEAR" button | none | Clears textarea + session field | No server call | `dashboard/web.py` JS `clearInput()` |

### Introspection (Read-Only)

| Feature | Trigger | Outputs | Evidence |
|---------|---------|---------|----------|
| **Health check** | `GET /health` | `{status, engine, forge_symbols, uptime_sec}` | `dashboard/app.py:455` |
| **System snapshot** | `GET /api/snapshot` | Forge stats, verdict counts, counters, activity log | `dashboard/app.py:392` |
| **Metrics** | `GET /api/metrics` | Node metrics + summary (verdicts, forge, ingests) | `dashboard/app.py:396` |
| **Recent verdicts** | `GET /api/verdicts/recent` | Last N verdicts with confidence + flags | `dashboard/app.py:414` |
| **Verdict counts** | `GET /api/verdicts/counts` | `{approved, adjusted, quarantined, penalized}` | `dashboard/app.py:422` |
| **Session verdicts** | `GET /api/verdicts/session/<id>` | All verdicts for a session | `dashboard/app.py:429` |
| **List sessions** | `GET /api/sessions` | All sessions with last verdict | `dashboard/app.py:436` |
| **SSE live stream** | `GET /api/stream` | metrics + verdicts + activity events every 3s | `dashboard/app.py:467` |
| **Dashboard HTML** | `GET /` or `GET /dashboard` | Full interactive UI (66KB HTML) | `dashboard/app.py:327` |

---

## 2. Complete API Inventory

Verified by dumping `app.url_map` at runtime:

```
GET    /                              → Dashboard HTML
GET    /dashboard                     → Dashboard HTML
GET    /favicon.ico                   → Wolf SVG icon
GET    /health                        → Health check JSON
GET    /api/snapshot                  → System state JSON
GET    /api/metrics                   → Node metrics JSON
GET    /api/symbols/top               → Top symbols JSON array
GET    /api/query/<int:symbol_id>     → Symbol detail JSON (or 404)
GET    /api/verdicts/recent           → Recent verdicts JSON array
GET    /api/verdicts/counts           → Verdict status counts JSON
GET    /api/verdicts/session/<id>     → Session verdicts JSON array
GET    /api/sessions                  → Session list JSON array
GET    /api/stream                    → SSE event stream
GET    /api/session/status            → Recording status (Round 2)
GET    /api/evidence/status           → Worker status (Round 3)
GET    /api/export                    → Download data JSON (Round 4)
POST   /api/ingest                    → Ingest text, return stats JSON
POST   /api/analyze                   → Full pipeline, return verdict JSON
POST   /api/cascade                   → Cascade trace, return node tree JSON
POST   /api/debug/push                → Inject synthetic verdict (Round 1)
POST   /api/session/start             → Start recording session (Round 2)
POST   /api/session/stop              → Stop recording session (Round 2)
POST   /api/evidence/start            → Start evidence workers (Round 3)
POST   /api/evidence/stop             → Stop evidence workers (Round 3)
POST   /api/reset                     → Reset forge + counters (Round 4)
```

**Total: 25 routes (16 GET, 9 POST)**
**State-changing: 8** (ingest, analyze, debug/push, session start/stop, evidence start/stop, reset)
**Read-only: 16**
**Streaming: 1** (`/api/stream`)

### Request/Response Schemas

**POST /api/ingest**
```
Request:  {"text": "string", "session_id": "string?"}
Response: {"session_id": "...", "tokens": 9, "anchors_ingested": 9,
           "forge": {"total_symbols": 13, "total_chains": 5, "avg_resonance": 2.3},
           "errors": []}
```

**POST /api/analyze**
```
Request:  {"text": "string?", "session_id": "string?"}
Response: {"verdict": {"status": "approved", "original_confidence": 0.56,
            "adjusted_confidence": 0.56, "flags": []},
           "patterns": {"breaks": 0, "chains": 1, "anomalies": 0,
            "break_details": [], "chain_details": [...], "anomaly_details": []},
           "session_id": "...", "ingest": {...}}
```

**POST /api/cascade**
```
Request:  {"symbol_id": 12345, "direction": "both|forward|backward", "max_depth": 5}
Response: {"root": 12345, "direction": "both", "depth": 3, "total_nodes": 24,
           "nodes": [{"symbol_id": ..., "depth": 0, "strength": 0.95, "parent": null}, ...]}
```

---

## 3. CLI Inventory

| Script | Module Path | `--help` Summary | Evidence |
|--------|------------|------------------|----------|
| `start.py` | `wolf_engine.start` | `--host 0.0.0.0` `--port 5000` `--db-dir PATH` `--bg` | `start.py:39` |
| `stop.py` | `wolf_engine.stop` | (no args) | `stop.py:17` |
| `restart.py` | `wolf_engine.restart` | (forwards all args to start.py) | `restart.py:19` |
| `dashboard/app.py` | `wolf_engine.dashboard.app` | `--host 0.0.0.0` `--port 5000` `--db-dir PATH` | `dashboard/app.py:520` |

**No console_scripts in pyproject.toml** — all entrypoints are script files.

---

## 4. ZMQ Inventory

The ZMQ layer is built but **NOT started by the dashboard**. The dashboard runs everything in-process. ZMQ services are for the distributed 3-node deployment.

| Service | File | Pattern | Bind/Connect | Port | Actions | Status |
|---------|------|---------|--------------|------|---------|--------|
| **Forge Service** | `services/forge_service.py` | REP | `tcp://*:5001` | 5001 | ingest, query, stats, health | Built, not auto-started |
| **Perception Service** | `services/perception_service.py` | REP | `tcp://*:5004` | 5004 | perceive, health | Built, not auto-started |
| **Reasoning Service** | `reasoning/reasoning_service.py` | REP | `tcp://*:5002` | 5002 | analyze_session, detect_patterns, trace_cascade, get_windows, health | Built, not auto-started |
| **API Gateway** | `services/gateway.py` | REQ | connects to 5001, 5004 | 5000 (HTTP) | /think, /query, /stats, /health | Built, not auto-started |
| **Health Monitor** | `services/health.py` | REQ | connects to all services | N/A | periodic health pings | Built, not auto-started |
| **Metrics Exporter** | `dashboard/metrics_exporter.py` | PUB | `tcp://*:5020` | 5020 | publishes NodeMetrics every 5s | **Started by dashboard** (self-feeding mode) |
| **Metrics Collector** | `dashboard/metrics_collector.py` | SUB | connects to PUB endpoints | N/A | aggregates to `metrics.db` | **Started by dashboard** (self-feeding mode) |

**Message Protocol:** JSON over ZMQ, `{action, payload}` → `{status, data}` (see `services/protocol.py`)

**What's actually running when you do `python start.py`:**
- Flask HTTP server (in-process, no ZMQ)
- MetricsExporter PUB on :5020 (self-feeding to local collector)
- MetricsCollector SUB (subscribes to local exporter)
- Everything else runs in-process via `WolfEngine` class

---

## 5. Logging / Telemetry

### Logging

| Component | Output | Format | Config | Evidence |
|-----------|--------|--------|--------|----------|
| **Structured logger** | stdout | JSON or text | `WOLF_LOG_FORMAT=json\|text`, `WOLF_LOG_LEVEL=INFO` | `logging_config.py` |
| **Start.py banner** | stdout | ASCII art | Always on | `start.py:96-106` |

### Evidence Workers (Built but NOT auto-started)

| Worker | Event Type | Data Collected | Interval | Evidence |
|--------|-----------|----------------|----------|----------|
| `SystemPerfWorker` | `system_perf` | CPU, RAM, disk, GPU via psutil | 5s | `evidence/workers.py` |
| `NetworkLoggerWorker` | `network_ping` | Ping latency to cluster nodes | 5s | `evidence/workers.py` |
| `ProcessLoggerWorker` | `process_snapshot` | Top N processes by CPU | 5s | `evidence/workers.py` |
| `InputLoggerWorker` | `input_activity` | Idle time, active window (Windows) | 5s | `evidence/workers.py` |

**Output:** `<session_dir>/<worker>_events.jsonl` (one JSON line per event)

### Metrics Pipeline (Auto-started)

| Component | Output | Retention | Evidence |
|-----------|--------|-----------|----------|
| **MetricsExporter** | ZMQ PUB on :5020 | Real-time stream | `dashboard/metrics_exporter.py` |
| **MetricsCollector** | `metrics.db` SQLite | 7-day auto-prune | `dashboard/metrics_collector.py` |
| **SSE Stream** | `/api/stream` to browser | In-memory only | `dashboard/app.py:467` |

### No TrueVision references found in codebase.

---

## 6. UI Controls Surface

### Tab: COMMAND

| Control | Type | Handler | API Call | Result Display |
|---------|------|---------|----------|----------------|
| Textarea | `<textarea>` | User types text | N/A | Input field |
| Session ID | `<input text>` | Optional override | N/A | Input field |
| **ANALYZE** button | `<button>` | `doAnalyze()` | `POST /api/analyze` | Verdict badge, confidence bar, pattern counts, flags |
| **INGEST ONLY** button | `<button>` | `doIngest()` | `POST /api/ingest` | Token count, anchors, forge stats |
| **CLEAR** button | `<button>` | `clearInput()` | none | Clears inputs |
| **Ctrl+Enter** | keyboard | `doAnalyze()` | `POST /api/analyze` | Same as ANALYZE |
| Activity Log | live display | SSE `activity` event | auto | Scrolling log of actions |

### Tab: SYMBOLS

| Control | Type | Handler | API Call | Result Display |
|---------|------|---------|----------|----------------|
| Symbol ID input | `<input number>` | Enter key | N/A | Input field |
| **QUERY** button | `<button>` | `querySymbol()` | `GET /api/query/{id}` | Symbol detail: resonance, neighbors, chains |
| **TOP SYMBOLS** button | `<button>` | `loadTopSymbols()` | `GET /api/symbols/top` | Table: ID, resonance, co-occur count, neighbors |
| Table row click | `<tr onclick>` | `querySymbolById()` | `GET /api/query/{id}` | Updates detail panel |
| Neighbor chip click | `<span onclick>` | `querySymbolById()` | `GET /api/query/{id}` | Jumps to that symbol |
| **Cascade Trace** button | `<button>` | `startCascadeFrom()` | N/A | Pre-fills cascade input |
| Cascade ID input | `<input number>` | Enter key | N/A | Input field |
| Direction select | `<select>` | N/A | N/A | both / forward / backward |
| Depth input | `<input number>` | N/A | N/A | 1-20, default 5 |
| **TRACE** button | `<button>` | `traceCascade()` | `POST /api/cascade` | Tree view: depth, symbol ID, strength bars |
| Cascade node click | `<span onclick>` | `querySymbolById()` | `GET /api/query/{id}` | Jumps to symbol explorer |

### Tab: MONITOR (All display-only, live-updating)

| Panel | Data Source | Update Interval |
|-------|------------|-----------------|
| Node Health grid | SSE `metrics` | 3s |
| CPU & RAM chart | SSE `metrics` | 3s |
| GPU status | SSE `metrics` | 3s |
| Forge Memory stats | SSE `metrics` | 3s |
| Throughput chart | SSE `metrics` | 3s |
| Verdict doughnut | SSE `metrics` | 3s |
| Recent verdicts table | SSE `verdicts` | 3s |

### Header (Global)

| Element | Behavior |
|---------|----------|
| Connection indicator | "LIVE" (green) / "RECONNECTING" (amber) |
| Uptime counter | JS timer, updates every 1s |
| Summary bar (7 stats) | SSE `activity` event updates |

---

## 7. Controls Surface Audit

| Control | Exists? | Trigger | Evidence |
|---------|---------|---------|----------|
| **Start** | YES | `python start.py` | `start.py:39` |
| **Stop** | YES | `python stop.py` | `stop.py:17` |
| **Restart** | YES | `python restart.py` | `restart.py:19` |
| **Self-test / inject sample** | YES | `POST /api/debug/push` + UI button | `app.py` Round 1 |
| **Session/recording toggle** | YES | `POST /api/session/start\|stop` + UI toggle | `app.py` Round 2 |
| **Reset/clear state** | YES | `POST /api/reset` + UI button | `app.py` Round 4 |
| **Export/backup data** | YES | `GET /api/export?what=verdicts\|forge\|sessions\|snapshot` + UI buttons | `app.py` Round 4 |
| **Prune/maintenance** | PARTIAL | Auto-prune only (metrics 7-day) | `metrics_collector.py` |
| **Start evidence workers** | YES | `POST /api/evidence/start` + UI checkboxes | `app.py` Round 3 |
| **Start ZMQ distributed mode** | NO | -- | GAP (code exists, no trigger) |

---

## 8. Claims vs Reality

| Claimed Feature | Actually Triggerable? | Trigger | Evidence | Notes |
|-----------------|----------------------|---------|----------|-------|
| Analyze text | YES | POST /api/analyze + UI button | `app.py:351` | Full pipeline: tokenize -> ingest -> reason -> govern -> verdict |
| Ingest text | YES | POST /api/ingest + UI button | `app.py:336` | Tokenize -> SHA-256 -> Forge + SQLite |
| Symbol query | YES | GET /api/query/{id} + UI | `app.py:364` | Resonance, neighbors, chains |
| Cascade trace | YES | POST /api/cascade + UI | `app.py:371` | BFS on co-occurrence graph, forward/backward/both |
| Top symbols | YES | GET /api/symbols/top + UI | `app.py:385` | Sorted by resonance |
| Archon governance | YES | Runs inside /api/analyze | `archon/orchestrator.py` | Confidence calibration, TCM, Citadel isolation |
| Live metrics (SSE) | YES | GET /api/stream + auto-connect | `app.py:467` | CPU, RAM, GPU, Forge stats, verdicts every 3s |
| GPU telemetry | YES | Auto (MetricsExporter) | `metrics_exporter.py` | Reads GPU stats via gpu_backend: name, util%, VRAM, temp (ROCm/CUDA) |
| Verdict audit trail | YES | GET /api/verdicts/* | `app.py:414-436` | SQLite-backed, queryable by session |
| Health check | YES | GET /health | `app.py:455` | Returns status + uptime + forge count |
| Evidence workers | YES | POST /api/evidence/start + UI | `app.py` Round 3 | All 4 workers triggerable, checkbox selection |
| Session recording | YES | POST /api/session/start\|stop + UI | `app.py` Round 2 | Full lifecycle exposed via API + UI toggle |
| Telemetry fusion | NO | Code exists, no trigger | `evidence/fusion.py` | Merges JSONL streams, no trigger surface |
| ZMQ distributed mode | NO | Code exists, no trigger | `services/forge_service.py` etc. | Forge/Perception/Reasoning services built, no launcher |
| Health monitor (cross-node) | NO | Code exists, no trigger | `services/health.py` | Periodic ping loop, no launcher |
| GPU-accelerated Forge | NO | Code exists, no trigger | `gpu/forge_memory_gpu.py` | ForgeMemoryGPU class, not wired to dashboard |
| Debug/test injection | YES | POST /api/debug/push + UI | `app.py` Round 1 | Injects synthetic verdict, proves liveness |
| Data export | YES | GET /api/export?what=... + UI | `app.py` Round 4 | Verdicts, forge, sessions, snapshot as JSON |
| State reset | YES | POST /api/reset + UI | `app.py` Round 4 | Clears forge + counters, preserves verdict audit |

---

## 9. File Tree (54 files)

```
wolf_engine/
  __init__.py
  config.py                          # Env vars: WOLF_LOG_FORMAT, WOLF_LOG_LEVEL, etc.
  contracts.py                       # RawAnchor, SymbolEvent, ForgeStats dataclasses
  logging_config.py                  # JSON/text structured logging
  pipeline.py                        # Dual-write ingest pipeline
  start.py                           # CLI launcher
  stop.py                            # CLI stop
  restart.py                         # CLI restart
  archon/
    orchestrator.py                  # Dispatches to reasoning, applies governance
    judge.py                         # Confidence, TCM, Citadel modules
    schemas.py                       # EngineResponse, Verdict dataclasses
    verdict.py                       # VerdictStore (SQLite)
    cam_stub.py                      # Dormant multi-engine consensus stub
  dashboard/
    app.py                           # WolfEngine class + Flask routes (MAIN ENTRY)
    web.py                           # DASHBOARD_HTML (~2200 lines)
    metrics_exporter.py              # ZMQ PUB :5020
    metrics_collector.py             # ZMQ SUB + metrics.db
  evidence/
    timebase.py                      # Monotonic + wall-clock timestamps
    session_manager.py               # Session lifecycle (NOT exposed)
    worker_base.py                   # Abstract worker with JSONL output
    workers.py                       # 4 concrete workers (NOT exposed)
    fusion.py                        # Multi-stream JSONL merge (NOT exposed)
  forge/
    forge_memory.py                  # RAM co-occurrence + resonance
  gnome/
    config.py                        # GENOME_VERSION, context window
    gnome_service.py                 # Symbol genome processing
    symbolizer.py                    # SHA-256 -> uint64 symbolization
    symbol_genome_loader.py          # Load genome dictionary
    integrity.py                     # Genome integrity checks
  gpu/
    device.py                        # GPU auto-detection (ROCm/CUDA, fail-hard)
    forge_memory_gpu.py              # GPU ForgeMemory (NOT wired)
    ncv_batch.py                     # Batch NCV-73 generation
    window_engine.py                 # GPU 6-1-6 co-occurrence
  reasoning/
    engine.py                        # 6-1-6 windowed reasoning
    cascade_engine.py                # BFS cascade trace
    causal_analyzer.py               # Causal validation
    pattern_detector.py              # Pattern break/chain/anomaly detection
    reasoning_service.py             # ZMQ REP :5002 (NOT auto-started)
  services/
    forge_service.py                 # ZMQ REP :5001 (NOT auto-started)
    perception_service.py            # ZMQ REP :5004 (NOT auto-started)
    gateway.py                       # ZMQ->HTTP gateway (NOT auto-started)
    health.py                        # Cross-node health pings (NOT auto-started)
    protocol.py                      # ZMQ JSON message encoding
  sql/
    sqlite_writer.py                 # Dual-write SQLite (sessions, raw_events, symbol_events)
    sqlite_reader.py                 # Read-back queries
  tests/
    conftest.py                      # Shared fixtures
    test_acceptance.py               # 6 core acceptance tests
    test_archon.py                   # Archon governance tests
    test_dashboard.py                # 56 dashboard + WolfEngine tests
    test_evidence.py                 # Evidence worker tests
    test_gpu.py                      # GPU module tests
    test_reasoning.py                # Reasoning engine tests
    test_services.py                 # ZMQ service tests
    test_stress.py                   # 100K+ ingest stress tests
```

---

## 10. Round-1 Acceptance Test

From repo root:

```bash
# 1. Start
python start.py --port 5000

# 2. Ingest some text
curl -X POST http://localhost:5000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"text": "the wolf runs through the dark forest at night"}'
# Expected: {"tokens": 9, "anchors_ingested": 9, "forge": {"total_symbols": ...}}

# 3. Analyze
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "the wolf hunts in the shadows of the deep forest"}'
# Expected: {"verdict": {"status": "approved", "adjusted_confidence": 0.56, ...}, "patterns": {...}}

# 4. Check dashboard
# Open http://localhost:5000 in browser
# Expected: summary bar shows symbols, ingested count, verdict count
# Expected: Monitor tab shows CPU/RAM chart moving, node online

# 5. Stop
python stop.py
# Expected: "Wolf Engine stopped."
```

**Verified:** All 5 steps pass as of 2026-02-16.

---

## 11. GAPS Summary (Updated after Rounds 1-4)

**CLOSED gaps (now triggerable):**
- ~~Evidence workers~~ → `POST /api/evidence/start` + UI (Round 3)
- ~~Session recording~~ → `POST /api/session/start|stop` + UI (Round 2)
- ~~Debug injection~~ → `POST /api/debug/push` + UI (Round 1)
- ~~Data export~~ → `GET /api/export` + UI (Round 4)
- ~~State reset~~ → `POST /api/reset` + UI (Round 4)

**Remaining gaps:**
1. **Telemetry fusion** (`evidence/fusion.py`) — Merges JSONL streams, no trigger surface
2. **ZMQ distributed services** (`services/*.py`) — Forge/Perception/Reasoning services, no launcher
3. **GPU-accelerated Forge** (`gpu/forge_memory_gpu.py`) — ForgeMemoryGPU, not wired to WolfEngine
4. **Cross-node health** (`services/health.py`) — Health ping loop, no launcher

---

*This report was generated by auditing every `if __name__`, `@app.route`, `<button`, `zmq.`, and `logging.` reference in the codebase. Every "YES" in the Claims table was verified by executing the actual endpoint against a running instance.*
