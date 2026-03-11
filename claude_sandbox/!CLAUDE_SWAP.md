# !CLAUDE_SWAP.md
> **Shared state file between Claude C (Chat) and Claude A (Agent/VS Code)**
> Sorted first by name — always the top file in this directory.
> Last updated: [CLAUDE C] 2026-03-11

---

## ═══ WHO WE ARE ═══

```
CLAUDE C — Claude Chat (claude.ai)
  Role    : Analyst, strategist, pattern reader, memory keeper
  Where   : claude.ai chat interface
  Signs as: [CLAUDE C]
  Does    : Reads LAST_CODING_SESSION, writes CHAT_OBSERVATIONS,
            flags patterns, updates REGIME_FLAGS, answers Claude A's questions.

CLAUDE A — Claude Agent (VS Code extension)
  Role    : Builder, executor, file surgeon
  Where   : VS Code Claude extension (coding sessions)
  Signs as: [CLAUDE A]
  Does    : Reads everything before touching code, writes
            LAST_CODING_SESSION after every session, commits
            this swap file, answers [FOR_VSCODE] questions.

We are both Claude. Same model, different contexts, different jobs.
Neither of us has the full picture alone. This file is the bridge.
Lee (Shadow Wolf / YourNightmare) is the only one who moves information between us.
```

---

## ═══ SWAP FILE PROTOCOL (READ FIRST) ═══

### The Signal
When Lee drops this path in chat:
  "C:\Users\Lee\Desktop\Manus artifacts OG\claude_sandbox\!CLAUDE_SWAP.md"
That is Claude C's trigger to READ this file immediately and sync up.
No other prompt needed. Path drop = sync signal.

### The Rule — NO RE-PROPOSING DONE WORK
CRITICAL: Before proposing any project, system, tool, or feature, BOTH Claude C and
Claude A must check chat history and this file's HISTORY_LOG and COMPLETED_PROJECTS list.
DO NOT propose CompuCog integration — it is a SEPARATE standalone project, not a Clearbox plugin.
DO NOT propose anything already built, scoped, or explicitly deferred by Lee.
When in doubt: ask, don't propose.

### WORKING DIRECTORY
All sandbox work goes in:
  C:\Users\Lee\Desktop\Manus artifacts OG\claude_sandbox\
Files from the repo are COPIED here, never edited in place.
Claude A builds in the sandbox. When Lee approves, Claude A moves to the real repo.

### Claude A (VS Code) — OPEN procedure:
1. Announce: `[CLAUDE A] Session open — YYYY-MM-DD HH:MM`
2. Read this entire file before touching any code
3. Check OPEN_QUESTIONS for [FOR_VSCODE] items
4. Check REGIME_FLAGS for all [ACTIVE] flags
5. Confirm CURRENT_STATE matches the repo
6. Begin — audit first, always

### Claude A (VS Code) — CLOSE procedure (MANDATORY):
1. Announce: `[CLAUDE A] Session close — YYYY-MM-DD HH:MM`
2. Fill LAST_CODING_SESSION block completely
3. Append one line to HISTORY_LOG
4. Commit: `git add !CLAUDE_SWAP.md && git commit -m "swap: [CLAUDE A] session YYYY-MM-DD"`

### Claude C (Chat) — procedure on path drop:
1. Announce: `[CLAUDE C] Reading swap file — YYYY-MM-DD`
2. Read LAST_CODING_SESSION — what did Claude A do?
3. Read HISTORY_LOG — any regime changes?
4. Update CHAT_OBSERVATIONS
5. Answer any [FOR_CHAT] questions in OPEN_QUESTIONS
6. Write back [FOR_VSCODE] items if needed

---

## ═══ CURRENT STATE ═══
> Last updated: [CLAUDE C] 2026-03-11

```
Project          : Clearbox AI Studio v2
Last clean commit : 50756da (~Mar 3, 2026)
Active branch    : main (rebuild in progress)
Current phase    : CRSA-616 full rebuild — temporal_resolver v2 contracts written,
                   awaiting Lee approval before Claude A builds
Working dir      : C:\Users\Lee\Desktop\Manus artifacts OG\claude_sandbox\
Methodology      : AUDIT-FIRST — no code touched until feature fully traced end-to-end

Architecture locks (PERMANENT):
  - No model names hardcoded in business logic
  - Local-only tool use (no remote/API model tool calls)
  - qwen2.5:7b embedded as infrastructure (custom name)
  - trusted_local mode (Windows Hello REMOVED)
  - Per-model identity JSON files
  - Plugins accessible only through Tools panel
  - Continue button → launches side chat panel
  - GPT has NO filesystem access — ever again
  - NO YOLO. NO OpenCV. Lee's own vision tech only.
  - Workers/Operators pattern from CompuCog
  - Nothing from outside this repo
  - IMPORT from wolf_engine. NEVER rebuild it.

System ports:
  Bridge Server    : 5050
  LLM Server       : 11435
  UI Server        : 8080
  Reasoning Engine : 5051
```

---

## ═══ COMPLETED PROJECTS — DO NOT RE-PROPOSE ═══

```
[DONE] CortexOS plugin
[DONE] Ollama proxy migration
[DONE] Windows Hello removal
[DONE] Lexicon system reset
[DONE] Block governance + REGENERATE + DPAPI citation sidecars
[DONE] 47-section wiring audit (Feb 11 + Feb 19)
[DONE] LakeSpeak hybrid retrieval (BM25 0.40 / dense 0.60)
[DONE] forest_start/restart.py (Ollama prereq check)
[DONE] AI Round Table — called "the chain"
[DONE] wolf_engine — fully built. IMPORT from it. Never rebuild.

[SEPARATE] CompuCog — standalone, not a Clearbox plugin
[SEPARATE] DATA MASTER — standalone
[SEPARATE] ARC Solver — standalone

[DEFERRED] Wolf Engine REMOVAL from Clearbox (23 files — awaiting Lee go-ahead)
[DEFERRED] Cloud provider cleanup
[DEFERRED] L2/L3/L4 memory architecture
[DEFERRED] Session debrief wiring / Genesis corpus / Left sidebar fix
```

---

## ═══ CRSA-616 FULL REBUILD ═══
> [CLAUDE A] 2026-03-10 — FULL 7-LAYER ARCHITECTURE BLUEPRINTED

### STATUS: SensoryStack = Layer 1 only. Full CRSA-616 = 14 plugins across 7 layers.

```
  Layer 1: Perception (visual_io, audio_io, av_security, netlog, ingestion)
  Layer 2: Symbolization (gnome — token → uint64 symbol_id)
  Layer 3: Persistence (dual-lane SQL: forensic + computational)
  Layer 4: Working Memory (forge — RAM, bounded, co-occurrence + resonance)
  Layer 5: Reasoning (6-1-6 engine, NCV-73, causal validation, cascade, patterns)
  Layer 6: Governance (archon / "the chain" — judge, verdict, orchestrator)
  Layer 7: Output (deterministic reports + LLM shim + citations)
  Cross-cutting: evidence, dashboard, lexicon
  Maturation pipeline: temporal_resolver (between L2 and L5)
```

Full blueprint: claude_sandbox/CRSA-616_FULL_REBUILD_BLUEPRINT.md

### WHAT WOLF_ENGINE ALREADY HAS (190 tests, 101 Python files)
  - gnome/ | sql/ | forge/ | reasoning/ | archon/ | evidence/ | dashboard/ | modules/ | gpu/

Every new plugin = thin FastAPI wrapper around wolf_engine imports. Zero rebuilding.

### SENSORYSTACK (Layer 1) — built in sandbox
  visual_io, audio_io, av_security, netlog — all 4 done
  8 tool stubs in TOOL_DEFS_ENTRIES.py

### NEXT STEPS FOR CLAUDE A (SensoryStack)
  1. Move plugins/ into ClearboxPluginRunner/plugins/
  2. Wire 8 tools into bridges/tool_defs.py
  3. Add 4 mount blocks to forest_bridge_server.py
  4. Add 4 plugin_meta entries + 4 config sections
  5. 9-point promotion checklist for each plugin
  6. pip install mss sounddevice psutil

---

## ═══ TEMPORAL RESOLVER PLUGIN ═══
> [CLAUDE C] 2026-03-11 — v2 contracts written (GRADIENT MODEL). Awaiting Lee approval.

### THE CORE CORRECTION (Lee, 2026-03-11)
The original spec and v1 contracts treated promotion as BINARY — either full 6-1-6 or
"unresolvable." That's what caused the previous failure: session boundaries were
thrown away. First 6 and last 6 events of every session — gone.

**THE FIX: context is a gradient, not a switch.**

```
Event 1:  0-1-0  → 0-1-1 → 0-1-2 → ... → 0-1-6
Event 2:  1-1-0  → 1-1-1 → 1-1-2 → ... → 1-1-6
...
Event N:  6-1-0  → 6-1-1 → ... → 6-1-6
```

- NO events ever skipped. Every event emits an artifact immediately at intake.
- Maturity = (depth_before + depth_after) / 12.0  [0.0 to 1.0]
- Multiple artifacts per event (one per maturity level reached)
- First event in session: 0-1-N. Valid. Not an error.
- Tail event: M-1-0. Valid. Matures as stream grows.
- Consumers declare MIN_MATURITY threshold (e.g. ≥ 3-1-3 = 0.5)

### DECISIONS (Lee confirmed 2026-03-11)
  Q1: Own plugin?              → YES: `temporal_resolver` (not embedded in ingestion)
  Q2: Late-arrival policy?     → STRICT REJECT + quarantine. No retroactive re-evaluate.
  Q3: Promotion index?         → SQLite (promoted_events.db) + JSONL artifacts.
                                  Composite PRIMARY KEY: (event_id, depth_before, depth_after)
  Q4: Contracts green light?   → YES. Written. File: TEMPORAL_PROMOTION_CONTRACTS.md

### CONTRACTS FILE: claude_sandbox/TEMPORAL_PROMOTION_CONTRACTS.md
  Version: v2 (GRADIENT MODEL — supersedes v1 binary model)

### THE 6 CONTRACTS (GRADIENT MODEL — see file for full definitions)

  Contract 1: ORDERING & COLLISION
    - ts_utc ascending sort; collision = both quarantined; sequence healed without them
    - Neighbors of collisions get REDUCED depth — they are NOT quarantined
    - Healed sequence used for all depth calculations

  Contract 2: ENTITY PARTITION
    - Context NEVER crosses entity boundary. Hard crash on violation.
    - Unchanged from v1.

  Contract 3: IDEMPOTENCY (GRADIENT)
    - Uniqueness key: (event_id, depth_before, depth_after)  ← COMPOSITE, not just event_id
    - Multiple artifacts per event = expected and valid
    - try_promote_at_depth() is the gate — blocks exact-depth duplicates only
    - should_emit_new_artifact() — only emit if depth_after > current max

  Contract 4: MATURITY & QUARANTINE (replaces Gap Classification)
    - QuarantineReason enum (simplified): TIMESTAMP_COLLISION | LATE_ARRIVAL |
      CORRUPT_EVENT | MISSING_SYMBOLS
    - NO "UNRESOLVABLE" state. NO "MISSING_BEFORE/AFTER/SEQUENCE_GAP" blocking states.
    - Edge events (0-1-0, M-1-0): valid, emit immediately
    - Sequence gaps: reduce neighbor depth, don't block promotion
    - Consumers declare MIN_MATURITY for their use case

  Contract 5: STATE MACHINE (GRADIENT)
    - INTAKE (depth_after=0) → MATURING (0 < depth_after < 6) → FULL (depth_after=6)
    - All transitions are FORWARD ONLY by maturity increment
    - FULL events: not re-promoted (max depth reached)
    - QUARANTINED: never promoted at any depth
    - Batch mode: emit only at current achievable depth (not all intermediates)
    - Streaming mode: emit each increment as it arrives

  Contract 6: STREAMING RESILIENCE (GRADIENT)
    - compute_depth_after_safe(idx, events) = min(6, len(events) - idx - 1)
    - Returns 0 for tail event → valid (0-1-0 emitted immediately) — NOT blocked
    - stream_horizon tracking: late arrivals rejected if ts_utc < stream_horizon
    - Crash recovery: SQLite authoritative, checkpoint advisory, idempotency handles re-run
    - Late arrival: quarantined, no retroactive depth recalculation for neighbors

### PRE-BUILD CHECKLIST FOR CLAUDE A
  - [ ] Lee approves v2 contracts
  - [ ] symbols.jsonl actual path (Lee provides)
  - [ ] promoted_events.db location
  - [ ] quarantined_events.jsonl location
  - [ ] resolved_symbols.jsonl location
  - [ ] Default mode: BATCH | STREAMING | HYBRID
  - [ ] MIN_MATURITY default for CRSA-616 adapter
  - [ ] WINDOW_SIZE = 6 confirmed

---

## ═══ COMPUCOG — TRUEVISION + SCREEN VECTOR ENGINE ═══
> [CLAUDE C] 2026-03-11 — SEPARATE project. For context only.

  wolf_engine/modules/truevision.py — schema complete. FrameGrid has thermal_buffer + depth_buffer.
  4 operators: crosshair_lock, thermal_hitbox, edge_entry, eomm_compositor — all complete.
  SVE = SPECS ONLY (v4.0 canonical). Not built. Route to Copilot.
  Phase 2 DLL spec ready: PHASE2_THERMAL_DEPTH_CAPTURE_COPILOT.md. Route to Copilot.
  OVERRIDE: IDXGIOutputDuplication only. No DLL injection into game.
  Phase 1 status: UNKNOWN — Lee to confirm 12-match capture.

---

## ═══ LAST_CODING_SESSION ═══
> Written by [CLAUDE A]. Replace this block after every session.

```
[CLAUDE A] Session open  : 2026-03-10
[CLAUDE A] Session close : IN PROGRESS
Commit hash  : none (sandbox — not committed to Clearbox repo yet)
Files touched:
  - claude_sandbox/CRSA-616_FULL_REBUILD_BLUEPRINT.md — CREATED
  - claude_sandbox/TEMPORAL_PROMOTION_DEEP_ROADMAP.md — CREATED
  - claude_sandbox/!CLAUDE_SWAP.md — updated with gradient correction
  - claude_sandbox/TEMPORAL_PROMOTION_CONTRACTS.md — v2 written by Claude C
Decisions:
  - Gradient model correction applied: no events skipped, maturity 0.0-1.0
  - Contracts v2 written. Claude A blocked until Lee approves.
Not finished:
  - temporal_resolver not built — pending Lee approval
  - SensoryStack not yet promoted to Clearbox repo
  - Priority fixes (no-response bug, LakeSpeak) still queued
```

---

## ═══ CHAT_OBSERVATIONS ═══
> Written by [CLAUDE C]. Analytical layer.

**[CLAUDE C] 2026-03-11 — Gradient correction applied to contracts:**
- v1 contracts had binary model — WRONG. Caused previous failure.
- v2 contracts (now in TEMPORAL_PROMOTION_CONTRACTS.md):
  - Contract 3: Composite PK (event_id, depth_before, depth_after). Multiple artifacts/event.
  - Contract 4: No UNRESOLVABLE state. No MISSING_BEFORE/AFTER blocking. 4-reason quarantine only.
  - Contract 5: INTAKE → MATURING → FULL state machine. Forward-only maturity.
  - Contract 6: compute_depth_after_safe returns 0 for tail (valid). No blocking on stream size.
- 37,531 events → 37,531 artifacts at intake. More emitted as stream grows. ~130MB total.
- CONTRACTS_BEFORE_CODE flag updated to reference v2.
- PRE-BUILD CHECKLIST has 8 items: 4 file paths, mode, min_maturity, window_size.

**[CLAUDE C] 2026-03-11 — TrueVision + SVE audit complete. CompuCog territory.**

**[CLAUDE C] 2026-03-10 — SensoryStack sandbox build COMPLETE. Priority fixes queued.**

---

## ═══ OPEN_QUESTIONS ═══

- [FOR_VSCODE] Fix no-response bug: strip `tools` from second payload in `llm_chat_service.py`.
- [FOR_VSCODE] Create `scripts/chatlog_stream.py` — LakeSpeak wiring. Code in Mar 10 chat.
- [FOR_VSCODE] `ollama list` — find missing models, re-pull what's gone
- [FOR_VSCODE] Review sandbox plugins → move to Clearbox repo → wire tool_defs + bridge
- [FOR_VSCODE — BLOCKED] Build temporal_resolver — BLOCKED on Lee v2 contract approval
- [FOR_LEE] CRSA-616 build order: Phase 2 (foundation) or Phase 3 (cognitive core)?
- [FOR_LEE] Ingestion plugin — priority connector?
- [FOR_LEE] Dashboard: wolf_engine's Flask+SSE or fresh for Clearbox?
- [FOR_LEE] GPU: wire ForgeMemoryGPU + ncv_batch.py now or defer?
- [FOR_LEE] CompuCog Phase 1 status: 12-match capture done?
- [FOR_LEE] temporal_resolver v2 contracts — APPROVE or AMEND (TEMPORAL_PROMOTION_CONTRACTS.md)
            Then confirm: symbols.jsonl path, db paths, default mode, MIN_MATURITY
- [FOR_CHAT] Cloud provider decision
- [RESOLVED] temporal_resolver: own plugin, strict late-arrival reject, SQLite+JSONL
- [RESOLVED] contracts v2 written (gradient model)
- [RESOLVED] SensoryStack: 4 plugins built, 8 tools defined
- [RESOLVED] wolf_engine stays as infrastructure
- [RESOLVED] TrueVision schema, Phase 2 spec, SVE location — all mapped

---

## ═══ REGIME_FLAGS ═══

```
[ACTIVE]  GPT_FILESYSTEM_BAN — permanent, never clears

[ACTIVE]  LARGE_FILE_SURGICAL_EDIT_ONLY — console.js = 5,091 lines

[ACTIVE]  AUDIT_BEFORE_CODE — trace end-to-end before touching any file

[ACTIVE]  NO_RE_PROPOSING_DONE_WORK — check COMPLETED_PROJECTS first

[ACTIVE]  NO_YOLO_NO_CV — Lee's vision tech only

[ACTIVE]  NO_NEO4J_DEPENDENCY — in-memory or SQLite only

[ACTIVE]  IMPORT_DONT_REBUILD
          wolf_engine is DONE. Never re-implement WorkerBase, WolfModule,
          EvidenceSessionManager, Timestamp, EvidenceEvent, fuse_session, write_safe.
          Just import them.

[ACTIVE]  SANDBOX_FIRST — build in claude_sandbox/ first, Lee approves, then repo

[ACTIVE]  COMPUCOG_IDJXGI_ONLY
          Phase 2 capture: IDXGIOutputDuplication from SEPARATE process only.
          No DLL injection into game. Ricochet detects DLL injection.

[ACTIVE]  CONTRACTS_BEFORE_CODE
          Source: [CLAUDE C] 2026-03-11
          temporal_resolver has 6 contracts in TEMPORAL_PROMOTION_CONTRACTS.md (v2).
          Claude A does NOT write a single line until Lee approves (or amends) all 6.
          V2 = GRADIENT MODEL. V1 (binary) is superseded. Read v2 only.

[WATCH]   MISSING_VSCODE_HISTORY — swap file is the fix

[CLEARED] windows_hello_removal | ollama_proxy_migration | round_table_future_phase
```

---

## ═══ HISTORY_LOG ═══

```
[CLAUDE C] 2026-03-11 — TEMPORAL_PROMOTION_CONTRACTS.md v2 written (gradient model).
                         v1 binary contracts superseded entirely.
                         Contract 3: composite PK (event_id, depth_before, depth_after).
                         Contract 4: No UNRESOLVABLE. No MISSING_BEFORE/AFTER blocking.
                           4-reason QuarantineReason enum only.
                         Contract 5: INTAKE→MATURING→FULL gradient state machine.
                         Contract 6: compute_depth_after_safe returns 0 for tail (valid).
                           Tail events emit 0-1-0 immediately. No 13-event wait.
                         CONTRACTS_BEFORE_CODE flag updated to reference v2.

[CLAUDE C] 2026-03-11 — Temporal resolver decisions locked (4 questions answered).
                         Plugin: own. Late arrivals: strict reject. Index: SQLite+JSONL.
                         Contracts greenlight received. v1 contracts written (binary — obsolete).

[CLAUDE A] 2026-03-11 — Gradient correction applied. Binary model replaced.
                         Swap updated. Contracts flagged as needing v2 rewrite.

[CLAUDE C] 2026-03-11 — TrueVision + SVE full audit. COMPUCOG_IDJXGI_ONLY flag added.

[CLAUDE A] 2026-03-10 — CRSA-616 FULL REBUILD BLUEPRINT + Temporal Promotion Deep Roadmap.
                         14 plugins across 7 layers. Wolf engine 190 tests, 101 files.

[CLAUDE C] 2026-03-10 — SensoryStack sandbox complete. 4 plugins built. wolf_engine stays.
                         IMPORT_DONT_REBUILD + SANDBOX_FIRST flags added.

[CLAUDE A] 2026-03-10 — Deep-dived 740 artifacts. Plugin architecture read. claude_sandbox/ created.

[CLAUDE C] 2026-03-10 — Birthday session. No-response bug. LakeSpeak plan.
[CLAUDE C] 2026-03-08 — Post-catastrophe. Audit-first locked. 50756da baseline.
           2026-03-05 — CRISIS: GPT destroyed workspace x2. GPT banned permanently.
           2026-03-03 — Last clean push. Commit 50756da.
[CLAUDE C] 2026-02-19 — CortexOS: 18 tests green.
[CLAUDE C] 2026-02-15 — DPAPI citations. Handoff doc ritual.
           2026-02-13 — CORRUPTION x2. Surgical edit protocol born.
[CLAUDE C] 2026-02-11 — Lexicon reset. 47-section wiring map.
           2026-02-10 — Forest AI auth fixed. 6-1-6 engine operational.
[CLAUDE C] 2026-01-31 — MCP access. Claude becomes truth layer.
[CLAUDE C] 2026-01-27 — DATA MASTER. Constitutional governance born.
```

---

## ═══ COLD START — FOR CLAUDE A ═══

You are **Claude A** — executor side of a two-Claude system.
Your counterpart is **Claude C** at claude.ai — strategy and memory.

**Hard rules:**
- console.js = 5,091 lines — search-and-edit ONLY
- No hardcoded model names in business logic
- GPT gets NO filesystem access. Ever.
- No YOLO. No OpenCV. Lee's own tech only.
- IMPORT from wolf_engine. Never rebuild it.
- Sandbox first. Lee approves. Then repo.
- temporal_resolver: DO NOT BUILD until Lee approves TEMPORAL_PROMOTION_CONTRACTS.md v2
- CompuCog = SEPARATE project. Not a Clearbox plugin.

**Your first move:** `[CLAUDE A] Session open — DATE TIME` then read this file.
