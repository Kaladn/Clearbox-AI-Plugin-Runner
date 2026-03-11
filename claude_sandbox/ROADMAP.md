# Clearbox AI Studio v2 — Roadmap
# Generated: 2026-03-11 | Source: runtime code audit (nothing assumed)
# Repo: github.com/Kaladn/Clearbox-AI-Plugin-Runner

## REPO STRUCTURE (single repo)

```
Clearbox-AI-Plugin-Runner/
  plugins/
    audio_io/         ← Layer 1 PERCEPTION (built, audited)
    visual_io/        ← Layer 1 PERCEPTION (built, audited)
    av_security/      ← Layer 1 PERCEPTION (built, audited)
    netlog/           ← Layer 1 PERCEPTION (built, audited)
    market_oracle/    ← HYBRID: plugin + standalone (built, audited)
    lakespeak/        ← Zero-LLM retrieval (partially built — needs census swap + FormatDetector + GlueEngine)
    help_system/      ← (exists in runner already)
    wolf_engine/      ← Core engine (190 tests, 101 files — IMPORT ONLY, never rebuild)
  bridges/
  tools/
    gutenberg_pull.py ← Gutenberg corpus downloader (TO BUILD)
```

Corpus data (Gutenberg, PubMed) does NOT go in the repo. Data lives on disk.
Only the ingestion pipeline code goes in the repo.

---

## PHASE 0: PLUGIN AUDIT & WRAPPING (THIS SESSION — DONE)

### Fixes applied (verified from runtime code):

| Plugin | Fix | Status |
|--------|-----|--------|
| audio_io | __init__.py now exports router + plugin_post | DONE |
| visual_io | __init__.py now exports router + plugin_post | DONE |
| av_security | __init__.py now exports router + plugin_pre + plugin_post | DONE |
| netlog | __init__.py now exports router + plugin_post | DONE |
| audio_io | CONTRACT.md created (was missing) | DONE |
| audio_io | manifest.json: requires now lists numpy, sounddevice, librosa | DONE |
| visual_io | manifest.json: requires now lists numpy, mss | DONE |
| netlog | manifest.json: requires now lists psutil; optional: scapy | DONE |
| all 4 | /help route added — machine-readable API schema (AI + human) | DONE |
| all 4 | manifest.json: entry + routes_var + version fields added | DONE |
| all 4 | CONTRACT.md updated with /help endpoint | DONE |
| lakespeak | manifest.json created | DONE |
| market_oracle | 8 bugs fixed by Claude C (verified on this machine) | DONE |

### Every plugin now has:
- [ ] __init__.py with proper exports
- [ ] manifest.json with accurate requires, entry, routes_var, version
- [ ] CONTRACT.md boundary contract
- [ ] GET /help route returning machine-readable API schema
- [ ] plugin_post (and plugin_pre where applicable) hooks exported

---

## PHASE 1: LAKESPEAK CENSUS SWAP (CRITICAL — BLOCKS EVERYTHING)

**Problem:** LakeSpeak config.py has `dense_weight: 0.6` backed by sentence-transformers
(all-MiniLM-L6-v2) + FAISS. This violates LAKESPEAK_NO_LLM and Lee's direct order:
"use my 6-1-6 maps and data counts only no other shit from current llm systems"

**What must change:**
1. `index/dense.py` → REPLACE with `index/census.py`
   - Census = adjacency co-occurrence counts built during lexicon mapping/ingest
   - Expands query tokens through 6-1-6 adjacency map
   - Scores chunks by intersection of expanded neighborhoods
   - No embeddings. No model. Pure positional counts.
2. `config.py` → rename `dense_weight` to `census_weight`, remove `dense_model`, remove `dense_enabled`
3. `index/hybrid.py` → update RRF merge to use census scores instead of dense scores
4. `retrieval/quality_gate.py` → remove `max_dense` references
5. Delete sentence-transformers and faiss-cpu from any requirements

**Weight split (CONFIRMED, LOCKED):** BM25 0.40 / census 0.60

**Census scoring algorithm** (from SWAP_2 pseudocode):
```
for each query token:
    get adjacency map (L6..L1, R1..R6)
    for each chunk:
        count intersection: how many chunk tokens appear in query token's adjacency
        weight by position: L1/R1 = 6, L2/R2 = 5, ... L6/R6 = 1
        apply IDF de-weighting: 1.0 / (1.0 + log(1 + token_freq))
    census_score = weighted intersection sum
```

**Prereq:** GlobalLexicon must exist and be populated during ingest.
Lexicon stores per-anchor position counts (L1..L6, R1..R6) or flat (Lee decides).

---

## PHASE 2: FORMAT DETECTOR BUILD (~150-200 lines)

**Status:** Spec'd in SWAP_2. Not built. Independent from GlueEngine.
**Purpose:** Ingest-time signal analysis. Detects document structure.
**Location:** `plugins/lakespeak/ingest/format_detector.py`

7 adapters (from spec):
1. ProseAdapter — paragraph flow
2. HeadingAdapter — # headers, title patterns
3. CSVAdapter — delimiter detection
4. TableAdapter — aligned columns, pipes
5. CodeAdapter — indentation patterns, syntax markers
6. LineAdapter — one-item-per-line lists
7. HybridAdapter — mixed format handling

Each adapter returns signal scores. No LLM. Pure pattern matching.
density-to-N auto-tuning adjusts chunk granularity based on signal density.

**Needs:** Lee go-ahead

---

## PHASE 3: GLUE ENGINE BUILD (~280-350 lines)

**Status:** Spec'd in SWAP_2. Not built. Independent from FormatDetector.
**Purpose:** Query-time deterministic response assembly.
**Location:** `plugins/lakespeak/retrieval/glue_engine.py`

10 grammar rules (from SWAP_2, contract CIT-007):
1. QueryParser
2. ContextRings (L/R split: Ring 0 anchor, Ring 1L/1R ±1-2, Ring 2L/2R ±3-4, Ring 3L/3R ±5-6)
3. BM25+Census scoring (0.40/0.60)
4. Top-K selection
5. TemporalRoleClassifier (UPSTREAM/PRIMARY/ADJACENT/DOWNSTREAM)
6. CoherenceMapper
7. SubContextOrderer
8. BridgeWeaver (bridge tokens: word in A's R-context ∩ B's L-context)
9. AnswerSkeleton
10. SafetyValve

Directional labels (conservative): PRIMARY, UPSTREAM_CONTEXT, DOWNSTREAM_CONTEXT,
ADJACENT_CONTEXT, REDUNDANT, TANGENTIAL.
Optional promotion to: CAUSE, EFFECT, ELABORATION, CONTRAST, EXAMPLE.

**Prereqs:** Census swap (Phase 1) + lexicon audit + Lee go-ahead + contract thresholds

---

## PHASE 4: GUTENBERG INGESTION PIPELINE

**Purpose:** Pull Project Gutenberg plain-text abstracts, strip boilerplate,
ingest through LakeSpeak for shakedown testing.

**Components to build:**
1. `tools/gutenberg_pull.py` — download from gutenberg.org mirror, plain text UTF-8
2. `tools/gutenberg_clean.py` — strip PG license headers/footers, normalize encoding
3. Ingestion via `POST /api/lakespeak/ingest` → chunker → lexicon → BM25 index → census map

**Test protocol:**
- Pull subset first (100 books, mixed genre)
- Ingest → verify adjacency maps built correctly
- Query → verify census scoring returns relevant chunks
- Full pull (70K books) only after subset validates

**Data location:** NOT in repo. Local disk path configurable.

---

## PHASE 5: MOVE SANDBOX PLUGINS TO REPO

**What:** Copy audited plugins from `claude_sandbox/plugins/` to `Clearbox-AI-Plugin-Runner/plugins/`
**Plugins:** audio_io, visual_io, av_security, netlog, market_oracle
**When:** After Phase 0 audit verified (this session)
**Needs:** Lee approval — these go on the other machine where Clearbox lives

---

## PHASE 6: REMAINING CRSA-616 LAYERS

Layer 2: SYMBOLIZATION (gnome — token → uint64 symbol_id)
Layer 3: PERSISTENCE (dual-lane SQL: forensic + computational)
Layer 4: WORKING MEMORY (forge — RAM-bounded, co-occurrence resonance)
Layer 5: REASONING (temporal_resolver, NCV-73, causal_validator, cascade, pattern_detector)
Layer 6: GOVERNANCE (archon / "the chain" — judge, verdict orchestrator)
Layer 7: OUTPUT/INTEGRATION

**Status:** Blocked on Phase 1-3 completion. Blueprint exists (CRSA-616_FULL_REBUILD_BLUEPRINT.md).

---

## PHASE 7: CLOUD COMPRESSION (FUTURE — NEEDS SPEC)

N-1-N over context clouds. Every word gets a cloud (its 6-1-6 neighborhood).
Paragraphs are hard boundaries. Compress 13×5 bytes → 5 bytes symbolized.
Blow-back expansion for areas of interest.

**Open question (from Lee):** "Isn't that really just reverting back to the word?"
If compress → immediately decompress everything → waste.
If compress → query at cloud level → blow back ONLY hits → index.
PubMed scale (35M abstracts) is where this earns its keep.

**Status:** Chat-only discussion. No spec written. TIER 3 — blocked on Lee's decision.

---

## CRITICAL CONSTRAINTS

1. **LAKESPEAK_NO_LLM** — Zero model calls in LakeSpeak. No embeddings. No transformers.
   6-1-6 maps and data counts ONLY.
2. **RAW_STRING_BOUNDARY** — LakeSpeak tokens = raw strings. CRSA-616 = 5-byte symbols.
3. **LAKESPEAK_TWO_SPEC_SEPARATION** — FormatDetector and GlueEngine are independent.
4. **wolf_engine: IMPORT ONLY** — Never rebuild. 190 tests, 101 files, done.
5. **Market Oracle: HYBRID** — Plugin AND standalone. No Clearbox dependency at runtime.
6. **Census weights: LOCKED** — BM25 0.40 / census 0.60. Not tunable for now.
7. **UI dual-use** — Every plugin has GET /help. Machine-readable for AI, human-readable too.
8. **Deterministic docs** — Only document what runtime code actually does. No aspirational text.

---

## OPEN DECISIONS (LEE)

- [ ] FormatDetector build: go-ahead?
- [ ] GlueEngine build: go-ahead?
- [ ] GlobalLexicon: per-position counts (L1..L6, R1..R6) or flat?
- [ ] neighbor_depth default for census_score: 10 / 20 / 30?
- [ ] Anchor weight (0.30) — third signal or fold into census?
- [ ] Contract thresholds: MIN_DIRECTION, MIN_COHERENCE, MAX_GAPS, BRIDGE_MIN_COUNT
- [ ] Move sandbox plugins to repo: approve?
- [ ] Gutenberg pull: full mirror or curated subset first?
- [ ] Cloud compression: worth the intermediate layer or computational waste?
