# !CLAUDE_SWAP_2.md
> **SPECS + DESIGNS REFERENCE — no longer the active state file.**
> Active state: `!CLAUDE_SWAP_3.md` | Citations: `swap_citations.json`
> Archive: `!CLAUDE_SWAP.md` (pre-March 2026 — frozen)
> Role: Contains GlueEngine spec, FormatDetector spec, Market Oracle docs,
>       open contracts, drift audit, pseudocode. Reference for implementation.
> Last updated: [CLAUDE A] 2026-03-11

---

## ═══ WHO WE ARE ═══

```
CLAUDE C — Claude Chat (claude.ai)  — Analyst, strategist, pattern reader
CLAUDE A — Claude Agent (VS Code)   — Builder, executor, file surgeon
Lee (Shadow Wolf / YourNightmare)   — The only one who moves information between us.
```

---

## ═══ SWAP FILE PROTOCOL ═══

Same as always. Path drop = sync signal.
Both Claudes: READ THIS FILE FIRST.

Claude A CLOSE procedure (MANDATORY every session):
1. `[CLAUDE A] Session close — YYYY-MM-DD HH:MM`
2. Fill LAST_CODING_SESSION
3. Append one line to HISTORY_LOG
4. Commit: `git add !CLAUDE_SWAP_2.md && git commit -m "swap: [CLAUDE A] session YYYY-MM-DD"`

---

## ═══ CURRENT STATE ═══

```
Project          : Clearbox AI Studio v2
Last clean commit : 50756da (~Mar 3, 2026)
Active branch    : main (rebuild in progress)
Working dir      : C:\Users\Lee\Desktop\Manus artifacts OG\claude_sandbox\
Phase            : CRSA-616 rebuild + LakeSpeak evolution (FINAL — two-part spec)
                   Bug fixes unblocked — start immediately
                   Market Oracle plugin: BUILT, in sandbox, ready for review

System ports: Bridge 5050 | LLM 11435 | UI 8080 | Reasoning 5051
```

---

## ═══ WHAT'S DONE — DO NOT RE-PROPOSE ═══

```
[DONE] CortexOS, Ollama proxy, Windows Hello removal, Lexicon reset
[DONE] Block governance + REGENERATE + DPAPI citation sidecars
[DONE] LakeSpeak hybrid retrieval (BM25 0.40 / dense 0.60) — to be replaced
[DONE] forest_start/restart.py, AI Round Table ("the chain")
[DONE] wolf_engine — 190 tests, 101 files. IMPORT only. Never rebuild.
[DONE] SensoryStack (Layer 1) — 4 plugins in sandbox
[DONE] CRSA-616 Full Blueprint — 14 plugins / 7 layers
[DONE] Temporal Promotion Contracts v2 — GRADIENT MODEL
[DONE] TrueVision/SVE/CompuCog audit — routed to Copilot
[DONE] 6-1-6 engine (UnifiedEngine / N-1-N) — IN wolf_engine. Import.

[DONE] MARKET ORACLE PLUGIN — claude_sandbox/plugins/market_oracle/ (15 files)
         Existing modules imported (8): market_fetcher, data_validator,
         capsule_builder, causal_analyzer, pattern_detector, metrics_calculator,
         report_generator, vision_chart.
         New modules (4): regime_detector (rolling consistency bands, segment/merge
         regimes, change points with severity, links to pattern breaks, full stats),
         storage (SQLite, WAL, 4 tables, no Neo4j), market_oracle (plugin
         orchestrator, all config overridable per-run), api (bridge endpoints).
         UI panel: ticker tags, period selector, advanced collapsible panel,
         compare mode, verdict banner, regime distribution bar, timeline, changes table.
         Status: sandbox, ready for Lee review.

[SEPARATE] CompuCog, DATA MASTER, ARC Solver — standalone, not Clearbox plugins
```

---

## ═══ TWO SYSTEMS — DO NOT MIX ═══

```
CLEARBOX AI STUDIO (platform)             CRSA-616 PLUGINS (intelligence)
─────────────────────────────             ──────────────────────────────
Bridge (5050), LLM (11435), UI (8080)     14 plugins, 7 layers
LakeSpeak — pure algorithmic pipeline     All mount INTO Clearbox via plugin runner
NO LLM in LakeSpeak. Ever.               All import FROM wolf_engine
ALREADY BUILT (50756da)                   BEING BUILT (sandbox)
```

---

## ═══ LAKESPEAK EVOLUTION — TWO SEPARATE SPECS ═══

> These are independent systems. Different timing. Different purpose.
> DO NOT combine them in implementation.

```
SPEC 1: FormatDetector  — INGEST TIME   — runs once per doc, cached forever
SPEC 2: GlueEngine      — QUERY TIME    — runs every query, assembles answers

They share GlobalLexicon as the map.
They never call each other.
They never call an LLM.
```

---

## ═══ SPEC 1: FORMAT DETECTOR (INGEST TIME) ═══

Pure signal analysis. No LLM. No third party. Runs once per document.

```python
class FormatDetector:
    """
    Detects document format using ONLY deterministic signal analysis.
    Measures structural properties of raw bytes. No inference. No AI.

    Safety crutch: if no signature matches → default to paragraph chunking.
    Paragraph is the safest fallback — preserves natural thought boundaries
    better than any other default. Worst case: slightly suboptimal chunking.
    Lexicon still accumulates. Retrieval still works.
    """

    SIGNATURES = {
        "paragraph":  lambda s: s.blank_line_density > 0.05 and s.avg_line_len > 40,
        "heading":    lambda s: s.hash_line_ratio > 0.03,
        "csv_row":    lambda s: s.comma_density > 0.1 and s.line_variance < 0.2,
        "table_cell": lambda s: s.pipe_density > 0.05 or s.tab_density > 0.05,
        "code_block": lambda s: s.indent_density > 0.3 or s.brace_density > 0.05,
        "line":       lambda s: s.avg_line_len < 120 and s.line_variance < 0.15,
        "hybrid":     lambda s: s.zone_transitions > 2,
    }

    def detect(self, file_path: str) -> FormatProfile:
        sample = self._read_sample(file_path, bytes=4096)
        signals = self._measure(sample)
        scores = {fmt: 1.0 if test(signals) else 0.0
                  for fmt, test in self.SIGNATURES.items()}
        best = max(scores, key=scores.get)
        confidence = scores[best]
        if confidence == 0.0:
            best, confidence = "paragraph", 0.5   # SAFETY CRUTCH
        window_n = self._density_to_n(signals.avg_tokens_per_sentence)
        return FormatProfile(
            doc_type=best, chunk_strategy=best, window_n=window_n,
            contains_tables=(best in ("table_cell", "hybrid")),
            discovery_method="algorithmic", confidence=confidence
        )

    def _measure(self, sample: str) -> Signals:
        lines = sample.splitlines()
        total = len(lines) or 1
        return Signals(
            blank_line_density    = sum(1 for l in lines if not l.strip()) / total,
            avg_line_len          = sum(len(l) for l in lines) / total,
            line_variance         = self._variance([len(l) for l in lines]),
            hash_line_ratio       = sum(1 for l in lines if l.startswith('#')) / total,
            comma_density         = sample.count(',') / len(sample),
            pipe_density          = sample.count('|') / len(sample),
            tab_density           = sample.count('\t') / len(sample),
            indent_density        = sum(1 for l in lines
                                        if l.startswith((' '*4, '\t'))) / total,
            brace_density         = (sample.count('{') + sample.count('[')) / len(sample),
            zone_transitions      = self._count_zone_transitions(lines),
            avg_tokens_per_sentence = self._avg_tokens(sample),
        )

    def _density_to_n(self, avg_tokens_per_sentence: float) -> int:
        """Auto-tune N. Pure math. No LLM."""
        if avg_tokens_per_sentence < 12:  return 3
        if avg_tokens_per_sentence < 20:  return 5
        if avg_tokens_per_sentence < 30:  return 7
        return 9
```

**FormatProfile cached as `format_profile.json` alongside chunk receipt. Never re-runs.**
**`discovery_method` is always `"algorithmic"`. Never `"ai_assisted"`. This is final.**

**Adapters (~30-50 lines each, pure Python):**
```
ProseAdapter      — split \n\n, yield paragraphs
HeadingAdapter    — split ## boundaries, yield sections
CSVRowAdapter     — one chunk per row
TableCellAdapter  — 2D context encoding (col_header × row_key × neighbors → token order)
CodeBlockAdapter  — indented/fenced blocks
LineAdapter       — one chunk per line
HybridAdapter     — zone detection, delegates to above
```

---

## ═══ SPEC 2: GLUE ENGINE (QUERY TIME) ═══

> "LakeSpeak needs grammar glue rules for coherency and context and sub-context
>  ordering to form answers from the map. Similar to how we mostly need glue code,
>  LakeSpeak needs glue language." — Lee

> "add temporal reasoning to the 6-1-6 mapping!" — Lee

Pure algorithmic. No LLM. No third party. Runs every query.
Reads GlobalLexicon. Assembles structured answers from retrieved chunks.
The lexicon IS the grammar. The adjacency table IS the language model.
**The L/R positions encode temporal/directional flow — the corpus already learned it.**

---

### CORE INSIGHT (MERGED — Claude C architecture + Claude A temporal reasoning)

The adjacency table stores counts at each position:
```
anchor → {
    L6..L1: {token: count}   ← what appears BEFORE this word
    R1..R6: {token: count}   → what appears AFTER this word
}
```

This is NOT symmetric. "infection" appears in L positions of "fever."
"treatment" appears in R positions of "fever."
The corpus encoded: **infection → fever → treatment.**
That's temporal/directional ordering learned from counting. No model.

The GlueEngine reads this directionality for THREE purposes:
1. **Ring structure** — distance from anchor (Claude C's context rings)
2. **Directional ordering** — what comes before/after what (Claude A's temporal roles)
3. **Bridge selection** — what words naturally connect two concepts (merged)

---

### ARCHITECTURE

```
QUERY
  │
  ▼
QueryParser            — extract anchor tokens, classify query intent
  │                       no model — pattern matching on token types
  ▼
ContextRingBuilder     — read lexicon adjacency → build 4 rings around anchor
  │                       Ring 0: anchor token(s)
  │                       Ring 1: positions ±1-2 (direct grammar)
  │                       Ring 2: positions ±3-4 (clause context)
  │                       Ring 3: positions ±5-6 (thematic background)
  │                       EACH RING SPLIT: left-context vs right-context
  ▼
ChunkRetriever         — BM25 + census_score → top-K chunks (existing)
  │
  ▼
TemporalRoleClassifier — classify each chunk's directional position vs query
  │                       using L/R position data from lexicon
  │                       UPSTREAM / PRIMARY / ADJACENT / DOWNSTREAM
  │                       + optional promoted labels (CAUSE/EFFECT/etc.)
  │                       + compute depth (positions 1-2 / 3-4 / 5-6)
  ▼
CoherenceMapper        — build chunk×chunk coherence graph
  │                       edge weight = shared Ring 1-2 neighbor count
  │                       + DIRECTIONAL: A→B edge weighted by A's R-context
  │                         overlap with B's L-context (directional flow)
  ▼
SubContextOrderer      — apply grammar rules → ordered chunk sequence
  │                       10 deterministic rules (8 from Claude C + 2 temporal)
  ▼
BridgeWeaver           — fill gaps between ordered chunks
  │                       bridge token = word in A's right-context ∩ B's left-context
  │                       transition type selected by L/R relationship + count magnitude
  │                       sourced from lexicon, not generated
  ▼
AnswerAssembler        — build AnswerSkeleton (structured, not prose)
  │
  ▼ coherence < threshold?
SafetyValve            — return raw chunks, no assembly attempted
```

---

### CONTEXT RINGS (with L/R split)

The rings read directly from the adjacency table — no computation beyond
the census already built. **NEW: each ring has a left half and right half.**

```
Ring 0 (anchor):    the query's primary subject token
                    → identified by: highest adjacency density among query tokens
                    → "density" = total co-occurrence mass across all positions

Ring 1 (immediate): positions ±1 and ±2
  Ring 1L:  L1, L2 neighbors → what PRECEDES the anchor directly
  Ring 1R:  R1, R2 neighbors → what FOLLOWS the anchor directly
  → direct modifiers, governing verbs, direct objects
  → these complete a thought AND encode directional flow

Ring 2 (near):      positions ±3 and ±4
  Ring 2L:  L3, L4 neighbors → upstream clause context
  Ring 2R:  R3, R4 neighbors → downstream clause context
  → qualifiers, sub-clauses, topic elaboration

Ring 3 (far):       positions ±5 and ±6
  Ring 3L:  L5, L6 neighbors → distant antecedent (background before)
  Ring 3R:  R5, R6 neighbors → distant consequent (background after)
  → thematic background, domain context
```

The L/R split is the key addition. Ring 1L tells you what PRECEDES the anchor.
Ring 1R tells you what FOLLOWS the anchor. Same data, directional read.
(Sequence, not necessarily causation — CONTRACT #1.)

---

### TEMPORAL ROLE CLASSIFIER (NEW — Claude A design, refined by Claude C)

Classifies each chunk's directional relationship to the query using L/R positions.

**Label policy (Claude C refinement):** Default labels are CONSERVATIVE (directional).
Promotion to causal labels requires additional evidence (see OPEN CONTRACTS below).

```
DEFAULT LABELS (always assigned):
  PRIMARY             — chunk tokens ARE query tokens (direct answer)
  UPSTREAM_CONTEXT    — chunk appears in L positions of query terms (comes before)
  DOWNSTREAM_CONTEXT  — chunk appears in R positions of query terms (comes after)
  ADJACENT_CONTEXT    — appears in both L and R roughly equally (co-occurring)
  REDUNDANT           — high overlap with PRIMARY, lower score (duplicate)
  TANGENTIAL          — weak connection on all axes

PROMOTED LABELS (optional, requires stronger evidence):
  CAUSE               — UPSTREAM_CONTEXT + high count + pattern break correlation
  EFFECT              — DOWNSTREAM_CONTEXT + high count + pattern break correlation
  ELABORATION         — ADJACENT_CONTEXT + high Ring 2 density
  CONTRAST            — ADJACENT_CONTEXT + low Ring 1 overlap despite Ring 2 match
  EXAMPLE             — DOWNSTREAM_CONTEXT + high specificity (rare tokens)

Promotion rule: conservative label ALWAYS assigned first.
Promoted label added as secondary tag only when composite evidence > threshold.
```

```python
def classify_temporal_role(chunk_anchors, query_tokens, lexicon):
    """
    Determine chunk's directional position relative to query.
    No model. Pure lexicon position lookup.

    Returns:
      role: UPSTREAM_CONTEXT / PRIMARY / ADJACENT_CONTEXT / DOWNSTREAM_CONTEXT
      depth: 1 (immediate) / 2 (near) / 3 (far)
      direction_score: signed float (-1.0 = fully upstream, +1.0 = fully downstream)
    """
    upstream_score = 0    # chunk appears in L positions of query terms
    downstream_score = 0  # chunk appears in R positions of query terms
    anchor_score = 0      # chunk tokens ARE query tokens

    for q_token in query_tokens:
        adj = lexicon.get_adjacency(q_token)
        if not adj:
            continue
        for c_token in chunk_anchors:
            # De-weight globally common tokens (OPEN CONTRACT #3)
            token_freq = lexicon.get_frequency(c_token)
            idf_weight = 1.0 / (1.0 + log(1 + token_freq))  # discount high-freq

            # Check L positions (chunk is BEFORE query in natural order)
            for pos, weight in [('L1',6),('L2',5),('L3',4),('L4',3),('L5',2),('L6',1)]:
                upstream_score += adj.get(pos, {}).get(c_token, 0) * weight * idf_weight

            # Check R positions (chunk is AFTER query in natural order)
            for pos, weight in [('R1',6),('R2',5),('R3',4),('R4',3),('R5',2),('R6',1)]:
                downstream_score += adj.get(pos, {}).get(c_token, 0) * weight * idf_weight

            if c_token == q_token:
                anchor_score += adj.get('anchor_count', 0)

    total = upstream_score + downstream_score + anchor_score + 1
    direction_score = (downstream_score - upstream_score) / total

    if anchor_score > upstream_score and anchor_score > downstream_score:
        role = 'PRIMARY'
        depth = 0
    elif upstream_score > downstream_score * 1.5:
        role = 'UPSTREAM_CONTEXT'
        depth = 1 if upstream_score > downstream_score * 3 else 2
    elif downstream_score > upstream_score * 1.5:
        role = 'DOWNSTREAM_CONTEXT'
        depth = 1 if downstream_score > upstream_score * 3 else 2
    else:
        role = 'ADJACENT_CONTEXT'
        depth = 1

    return role, depth, direction_score
```

---

### INTER-CHUNK DIRECTIONAL CHAIN (NEW — Claude A design, refined by Claude C)

Chunks order themselves based on the corpus's own directional statistics.
**Note: "directional" not "causal" — L/R ordering is evidence of sequence,
not proof of causation. See OPEN CONTRACT #1.**

```python
def build_directional_chain(chunks, lexicon):
    """
    Order chunks by following L/R adjacency chains between them.

    For each pair (A, B):
      precedes_score(A,B) = sum of A's anchor tokens found in
        R positions of B's anchor tokens (weighted by proximity)
        WITH idf de-weighting for globally common tokens (CONTRACT #3)

    Net precedence: precedes(A,B) - precedes(B,A)
      Positive = A naturally comes before B in the corpus
      Negative = B naturally comes before A
      Near zero = no clear directional preference (ADJACENT)

    Weighted DAG construction → topological sort.
    CYCLE HANDLING (CONTRACT #2): if cycle detected, remove weakest edge
    (lowest net precedence) until DAG is achieved. Removed edges logged.
    """
    n = len(chunks)
    precedes = {}

    for i in range(n):
        for j in range(n):
            if i == j: continue
            score = 0
            for a_tok in chunks[i].anchor_tokens:
                adj = lexicon.get_adjacency(a_tok)
                idf_a = 1.0 / (1.0 + log(1 + lexicon.get_frequency(a_tok)))
                for b_tok in chunks[j].anchor_tokens:
                    idf_b = 1.0 / (1.0 + log(1 + lexicon.get_frequency(b_tok)))
                    idf = (idf_a + idf_b) / 2
                    for pos, w in [('R1',6),('R2',5),('R3',4),('R4',3),('R5',2),('R6',1)]:
                        score += adj.get(pos, {}).get(b_tok, 0) * w * idf
            precedes[(i,j)] = score

    # Build weighted DAG from net precedence
    # Break cycles by removing weakest edge (CONTRACT #2)
    # Topological sort of resulting DAG = directional chain
    ...
```

---

### COHERENCE MAPPER (ENHANCED — directional)

```python
def map_coherence(chunks, ring_sets, lexicon):
    """
    For every pair of chunks A, B:

    SYMMETRIC coherence (Claude C — semantic adjacency):
      sym(A,B) = |tokens(A) ∩ ring1(B)| + |tokens(B) ∩ ring1(A)|
               + 0.5 * (|tokens(A) ∩ ring2(B)| + |tokens(B) ∩ ring2(A)|)

    DIRECTIONAL coherence (Claude A — sequential flow):
      dir(A→B) = |tokens(A) ∩ ring1R(B)| + |tokens(B) ∩ ring1L(A)|
      → "A flows into B" — A's content appears in B's LEFT context
        AND B's content appears in A's RIGHT context

    COMBINED:
      edge_weight(A,B) = sym(A,B) * 0.6 + dir(A→B) * 0.4
      → semantic similarity + directional flow

    Result: weighted directed graph. Not just "are these related?"
    but "does A lead to B or does B lead to A?"

    NOTE: directional flow = corpus-learned sequence ordering.
    NOT necessarily causal. See CONTRACT #1.
    """
```

---

### GRAMMAR RULES (10 DETERMINISTIC RULES)

8 from Claude C + 2 new temporal rules from Claude A.

```
RULE 1 — ANCHOR-FIRST
  The chunk containing the most Ring 0 and Ring 1 tokens goes first.
  This is the primary claim. All other chunks evaluated relative to it.
  Tie-break: higher BM25 + census_score.

RULE 2 — LEFT-RIGHT FLOW
  The lexicon's adjacency is directional: L tokens (left context) and
  R tokens (right context) encode natural word order.
  When sequencing two chunks, prefer the ordering where A's dominant
  R-context tokens appear in B's dominant L-context tokens.
  This reconstructs natural reading order from corpus statistics alone.

RULE 3 — DENSITY CASCADE
  Chunks ordered by descending Ring 1 token density (Ring 1 tokens /
  total chunk tokens). High density = more specific to anchor.
  Low density = background. Specific precedes general.

RULE 4 — SUB-CONTEXT THREADING
  Identify sub-contexts: clusters sharing a common Ring 2 token.
  Thread each sub-context as a unit. Order sub-contexts by ring distance
  from anchor (Ring 1 connections before Ring 2 before Ring 3).
  Creates: primary → sub-context A → sub-context B → background.

RULE 5 — COHERENCE BRIDGE
  Between adjacent chunks in the ordered sequence:
  if coherence(A, B) < LOW_THRESHOLD:
    find bridge_token = top token in A's R-context ∩ B's L-context
    if bridge_token found: insert as structural connector
    if not found: flag as COHERENCE_GAP (see Rule 10)

RULE 6 — DIRECTIONAL CHAIN ORDER  ← UPGRADED from Claude C's temporal thread
  Use inter-chunk directional chain (build_directional_chain) to order
  chunks by the corpus's learned sequential flow.
  UPSTREAM chunks → PRIMARY chunks → DOWNSTREAM chunks.
  Within each group: sort by depth (depth 1 before depth 2).
  Directional order OVERRIDES density cascade (Rule 3) when signal
  is strong (net precedence score > DIRECTION_THRESHOLD — CONTRACT #4).
  When directional signal is weak: fall through to density cascade.

RULE 7 — SPECIFICITY OVER FREQUENCY
  Rare tokens (low lexicon frequency) carry specific meaning.
  Common tokens act as semantic glue.
  Rare tokens anchor sub-contexts (precise concepts).
  Common tokens bridge between sub-contexts (connective tissue).
  Never promote a high-frequency token to anchor position.
  Zone 1 doctrine: "Counts describe what exists."

RULE 8 — DEPTH DISPLAY  ← NEW (Claude A)
  Chunks at different depths get different display treatment:
    Depth 0 (PRIMARY):           inline in main answer flow
    Depth 1 (immediate context): inline, connected by bridge tokens
    Depth 2 (near context):      indented sub-context "(Note: ...)"
    Depth 3 (far background):    footnote or "See Also" section
  Never mix depths in the same paragraph.
  Deeper context supports shallower context, never vice versa.

RULE 9 — TRANSITION STRENGTH FROM COUNT MAGNITUDE  ← NEW (Claude A)
  The co-occurrence COUNT between adjacent chunks determines
  transition confidence:
    High count (>100):    strong bridge — tight directional link
    Medium count (10-100): moderate bridge — related but separable
    Low count (1-10):     weak bridge — paragraph break, soft glue
    Zero count:           no bridge — hard paragraph break
  The count IS the confidence of the connection.
  High counts = corpus has seen these together many times = strong.
  Zero counts = never seen together = don't force a connection.
  The system never invents coherence the data doesn't support.

RULE 10 — SAFETY VALVE
  If assembled answer contains more than (max_gaps) COHERENCE_GAP flags,
  OR if total coherence score < MIN_COHERENCE:
  → abandon assembly
  → return raw top-K chunks with census_scores
  → flag: answer_assembled = False
  No hallucinated structure. No invented connections.
  LakeSpeak admits what it doesn't know.
```

---

### BRIDGE WEAVER (ENHANCED — temporal transitions)

```python
def find_bridge(lexicon, token_a: str, token_b: str):
    """
    Find a word that naturally connects token_a to token_b.

    1. Get token_a's R-context neighbors (positions R1, R2, R3)
    2. Get token_b's L-context neighbors (positions L1, L2, L3)
    3. Intersection = words that naturally appear BETWEEN a and b
    4. Pick highest co-occurrence count from intersection
    5. If empty: COHERENCE_GAP

    ALSO returns: relationship metadata for transition selection.
    """
    right_of_a = lexicon.get_right_neighbors(token_a, positions=[1,2,3])
    left_of_b  = lexicon.get_left_neighbors(token_b,  positions=[1,2,3])

    r_set = {t for t, c in right_of_a}
    l_set = {t for t, c in left_of_b}
    candidates = r_set & l_set

    if not candidates:
        return None, 'COHERENCE_GAP', 0

    bridge = max(candidates, key=lambda t: lexicon.get_cooccurrence(token_a, t))
    count = lexicon.get_cooccurrence(token_a, bridge)

    # Classify connection strength from count magnitude (Rule 9)
    if count > 100:
        strength = 'STRONG'
    elif count > 10:
        strength = 'MODERATE'
    else:
        strength = 'WEAK'

    return bridge, strength, count
```

---

### ANSWER SKELETON OUTPUT (ENHANCED — with temporal metadata)

```python
@dataclass
class AnswerSkeleton:
    query: str
    anchor_tokens: list[str]          # Ring 0
    assembled: bool                    # False = safety valve triggered
    coherence_score: float
    directional_chain_detected: bool   # True if strong directional ordering found
    primary: ChunkRef                  # Rule 1 winner
    upstream: list[ChunkRef]           # chunks directionally BEFORE the answer
    support: list[SubContext]          # Rule 4 sub-contexts, ordered
    downstream: list[ChunkRef]        # chunks directionally AFTER the answer
    background: list[ChunkRef]         # Ring 3 / depth 3 context
    bridge_tokens: list[BridgeRef]     # glue tokens with strength metadata
    coherence_gaps: int                # count of Rule 10 flags
    raw_chunks: list[ChunkRef]         # always present (fallback)

@dataclass
class BridgeRef:
    token: str
    strength: str                      # STRONG / MODERATE / WEAK
    count: int                         # co-occurrence count (confidence)
    from_chunk: str                    # chunk_id
    to_chunk: str                      # chunk_id

@dataclass
class SubContext:
    shared_ring2_token: str
    chunks: list[ChunkRef]
    bridges: list[BridgeRef]
    depth: int                          # 1=immediate, 2=near, 3=far

@dataclass
class ChunkRef:
    chunk_id: str
    text: str
    tokens: list[str]
    bm25_score: float
    census_score: float
    hybrid_score: float
    ring1_density: float
    directional_role: str              # UPSTREAM_CONTEXT/PRIMARY/ADJACENT_CONTEXT/DOWNSTREAM_CONTEXT
    promoted_role: str | None          # CAUSE/EFFECT/ELABORATION/CONTRAST/EXAMPLE (or None)
    depth: int                         # 0-3
    direction_score: float             # -1.0 (upstream) to +1.0 (downstream)
    chunk_type: str                    # "prose" | "table_cell" | "csv_row" | etc.
```

---

### DIRECTIONALITY: LEXICON READ INTERFACE

GlueEngine needs directional reads from the adjacency table.
**No new data collection. No schema change. Named accessors on existing data.**

```python
# These read existing adjacency data with position filtering:
lexicon.get_right_neighbors(token, positions=[1,2,3]) → list[(str, int)]
lexicon.get_left_neighbors(token,  positions=[1,2,3]) → list[(str, int)]

# New convenience for temporal role classification:
lexicon.get_adjacency(token) → dict
# Returns: {'L6': {word: count}, ..., 'L1': {word: count},
#           'anchor_count': int,
#           'R1': {word: count}, ..., 'R6': {word: count}}
```

---

### WHAT GLUE ENGINE IS NOT

```
NOT a language model         — it generates no tokens
NOT a summarizer             — it selects and orders, never compresses
NOT a query rewriter         — queries are used as-is
NOT a semantic parser        — no grammar tree, no dependency parse
NOT a sentence generator     — AnswerSkeleton is structured, not prose
NOT a ranking model          — ranking is BM25 + census_score (existing)
NOT a new database           — reads GlobalLexicon only
NOT a causal inference engine — it reads directional ordering the corpus learned
                               causal labels are optional promotions, not defaults

It is: a map reader with a compass.
       The lexicon is the map.
       The L/R positions are the compass (directional flow).
       The grammar rules are the navigation instructions.
       The answer is the path through the map, facing the right way.
```

---

### BUILD PLAN (Claude A — after Lee go-ahead, separate from FormatDetector)

Scope: ~280-350 lines. Pure Python. Zero LLM. Zero third party.

```
Step 1: AUDIT
  Confirm GlobalLexicon adjacency stores per-position counts (L1..L6, R1..R6).
  Confirm or add: get_right_neighbors(), get_left_neighbors(), get_adjacency()
  These are reads of existing data, not new collection.

Step 2: BUILD lakespeak/glue/query_parser.py (~30 lines)
  Extract anchor tokens (highest adjacency density among query tokens).
  Classify query intent (what/who/when/where/how/list) from token patterns.

Step 3: BUILD lakespeak/glue/context_ring_builder.py (~50 lines)
  Build Ring 0-3 with L/R split for given anchor tokens.
  Returns: {ring0, ring1L, ring1R, ring2L, ring2R, ring3L, ring3R}

Step 4: BUILD lakespeak/glue/temporal_classifier.py (~50 lines)
  classify_temporal_role() — per-chunk directional position vs query
  build_directional_chain() — inter-chunk ordering from L/R precedence
  IDF de-weighting on token contributions (CONTRACT #3)

Step 5: BUILD lakespeak/glue/coherence_mapper.py (~50 lines)
  Symmetric + directional coherence graph.
  Combined edge weights: 0.6 semantic + 0.4 directional flow.

Step 6: BUILD lakespeak/glue/sub_context_orderer.py (~70 lines)
  Apply Grammar Rules 1-10 in order.
  Directional chain order (Rule 6) overrides density cascade when strong.
  Depth display (Rule 8). Count-based transitions (Rule 9).

Step 7: BUILD lakespeak/glue/bridge_weaver.py (~40 lines)
  Bridge token selection with strength classification.
  Safety valve (Rule 10).

Step 8: BUILD lakespeak/glue/answer_assembler.py (~30 lines)
  Combines above into AnswerSkeleton with temporal metadata.

Step 9: BUILD lakespeak/glue/__init__.py (~20 lines)
  GlueEngine class: query(text, top_k=5) → AnswerSkeleton

Step 10: WIRE into existing LakeSpeak query path
  Old path: BM25 + census_score → top-K raw chunks → return
  New path: BM25 + census_score → top-K → GlueEngine.query() → AnswerSkeleton

SANDBOX FIRST. No LLM anywhere in this path.
```

---

### OPEN CONTRACTS (Claude C feedback — 2026-03-11)

> "Directional Response Assembly over 6-1-6 adjacency with optional causal
>  interpretation where supported." — Claude C

These 5 contracts must be resolved before GlueEngine build. They are design
decisions, not bugs. Each needs a concrete answer (threshold, algorithm, policy).

```
CONTRACT #1 — DIRECTIONAL vs CAUSAL DISTINCTION
  Status: RESOLVED IN SPEC (labels renamed)
  L/R adjacency gives DIRECTIONAL evidence (sequence ordering).
  It does NOT prove causation. Default labels are conservative:
    UPSTREAM_CONTEXT, DOWNSTREAM_CONTEXT, ADJACENT_CONTEXT
  Causal labels (CAUSE, EFFECT) are optional promotions requiring
  additional evidence: high count + pattern break correlation +
  consistent directional signal across multiple token pairs.
  Policy: never label CAUSE/EFFECT from adjacency alone.

CONTRACT #2 — CYCLE BREAKING POLICY
  Status: DESIGN DECIDED, threshold TBD
  When topological sort of directional chain hits a cycle:
    1. Build weighted DAG from net precedence scores
    2. Detect cycles (Tarjan or DFS)
    3. In each cycle, remove the edge with LOWEST net precedence
       (weakest directional evidence)
    4. Log removed edges — these are ADJACENT_CONTEXT pairs
       (corpus says they go both ways — no clear ordering)
    5. Repeat until DAG achieved
  Open: minimum net precedence to even CREATE a directional edge?
  Proposal: if |net_precedence(A,B)| < MIN_DIRECTION, treat as
  ADJACENT (no edge). Prevents weak evidence from creating false order.
  [FOR_LEE] MIN_DIRECTION threshold — needs tuning on real data.

CONTRACT #3 — ANCHOR DE-WEIGHTING (HIGH-FREQUENCY POISONING)
  Status: DESIGN DECIDED, implemented in pseudocode above
  Problem: "the", "is", "of" appear in L/R positions of everything.
  They contribute directional noise — everything looks connected.
  Solution: IDF-style discount on token contribution:
    idf_weight = 1.0 / (1.0 + log(1 + token_frequency))
  Applied in both temporal_role_classifier and directional_chain_builder.
  High-frequency tokens contribute less. Rare tokens dominate signal.
  Aligns with Rule 7 (specificity over frequency).
  Open: should we use raw frequency or document frequency?
  [FOR_LEE] Confirm: lexicon stores per-token total frequency?

CONTRACT #4 — CONFIDENCE THRESHOLDS FOR GLUE LEVELS
  Status: PLACEHOLDER VALUES, needs tuning
  Three thresholds control assembly quality:
    DIRECTION_THRESHOLD  — min net precedence to override density cascade (Rule 6)
                           Proposal: TBD (needs real data)
    MIN_COHERENCE        — below this, SafetyValve triggers (Rule 10)
                           Proposal: 0.2? 0.3? [FOR_LEE]
    MAX_GAPS             — max COHERENCE_GAPs before SafetyValve
                           Proposal: 2? 3? [FOR_LEE]
    BRIDGE_MIN_COUNT     — min co-occurrence to consider a bridge real
                           Proposal: 3 (below 3 = noise)
  These are tunable per-deployment. Defaults matter for first run.

CONTRACT #5 — CONCURRENT SCORING (ADJACENT_CONTEXT definition)
  Status: DESIGN DECIDED
  When upstream ≈ downstream (within 1.5x ratio), chunk is ADJACENT_CONTEXT.
  This means the corpus saw it in BOTH directions roughly equally.
  Examples: synonyms, co-occurring concepts, bidirectional relationships.
  These chunks have no natural ordering — placed by density cascade (Rule 3)
  or by sub-context threading (Rule 4), not by directional chain (Rule 6).
  The 1.5x ratio is the threshold. Claude C suggested this may need a
  composite score (direction_ratio × count_magnitude × idf) instead of
  simple ratio.
  [FOR_LEE] Simple ratio OK for v1, or composite from the start?
```

---

## ═══ ACTIVE WORK ═══

### CLEARBOX CORE: BUG FIXES (start immediately, no gates)

- [ ] no-response bug: strip `tools` from second payload in `llm_chat_service.py`
- [ ] scripts/chatlog_stream.py — LakeSpeak wiring + lexicon primer
- [ ] `ollama list` → find missing models → re-pull

### CLEARBOX CORE: LAKESPEAK EVOLUTION

Two separate builds. Different timing. Don't mix.

```
BUILD A: FormatDetector + Adapters
  (ingest-time, runs once per doc, ~150-200 lines, awaiting Lee go-ahead)

BUILD B: GlueEngine
  (query-time, runs every query, ~200-250 lines, awaiting Lee go-ahead)
  Prereq: GlobalLexicon adjacency position reads confirmed (Step 1 audit above)
```

### MARKET ORACLE PLUGIN (IN SANDBOX — AWAITING LEE REVIEW)

```
Location: claude_sandbox/plugins/market_oracle/
Status: built, ready for review
Next: Lee reviews → approve → copy to repo
Open Q for Lee: OK to move to repo?
```

---

### CRSA-616: TEMPORAL RESOLVER — BLOCKED

Gates: (1) "contracts approved" + (2) 8 checklist items. Both explicit.

### CRSA-616: SENSORYSTACK — needs "move it"

### CRSA-616: PHASES 2-6 — awaiting Lee build order

Phase 5 ingestion: import FormatDetector + adapters. Don't rebuild. No LLM in ingest.

---

## ═══ END-TO-END DATA FLOW ═══

```
╔══════════════════════════════════════════════════════════════════════╗
║  CLEARBOX AI STUDIO (platform — already built)                      ║
║  User ←→ UI (8080) ←→ Bridge (5050) ←→ LLM Server (11435)         ║
║                                                                      ║
║  ┌─ INGEST PATH (FormatDetector — runs once per doc) ──────────┐   ║
║  │  File → signal analysis → adapter → token stream            │   ║
║  │  → GlobalLexicon.process(tokens, N)   [wolf_engine]         │   ║
║  │  → BM25 index + chunk JSONL                                  │   ║
║  │  → format_profile.json cached forever                        │   ║
║  │  ZERO LLM. ZERO third party.                                 │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  ┌─ QUERY PATH (GlueEngine — runs every query) ─────────────────┐   ║
║  │  query → QueryParser → ContextRingBuilder (reads lexicon)   │   ║
║  │  → BM25(0.40) + census_score(0.60) → top-K chunks           │   ║
║  │  → CoherenceMapper → SubContextOrderer (10 grammar rules)   │   ║
║  │  → BridgeWeaver (bridge tokens from lexicon adjacency)      │   ║
║  │  → AnswerSkeleton (structured, not prose)                   │   ║
║  │  → SafetyValve if coherence < threshold → raw chunks        │   ║
║  │  ZERO LLM. ZERO third party.                                 │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
║  GlobalLexicon: shared map. Ingest writes it. Query reads it.       ║
║  These two paths never call each other.                             ║
╠══════════════════════════════════════════════════════════════════════╣
║  CRSA-616 (intelligence — being built)                              ║
║  L1 → L2 [5-byte symbols] → Temporal Resolver                       ║
║  → L3 → L4 Forge → L5 Reasoning → L6 Archon → L7 Output            ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## ═══ KEY ARCHITECTURE — QUICK REFERENCE ═══

```
LAKESPEAK IS TWO THINGS:
  1. FormatDetector (ingest) — WHAT the document is, HOW to chunk it
  2. GlueEngine (query)      — HOW to assemble an answer from the map

THEY ARE SEPARATE. DO NOT COMBINE IN IMPLEMENTATION.

GLUE ENGINE CORE INSIGHT:
  The lexicon's adjacency table is directional.
  Left context (negative offsets) + Right context (positive offsets)
  encode natural word order from corpus statistics.
  Grammar rules read this directionality to reconstruct coherent ordering.
  No language model needed. The corpus already encoded the grammar.

BRIDGE TOKENS:
  A bridge between chunk A and chunk B is a word that appears in
  A's right-context AND B's left-context in the lexicon.
  These are real words from the corpus. Not generated. Not invented.
  The map already knows what connects things.

SAFETY VALVE (RULE 10):
  If coherence score < threshold: return raw chunks, assembled=False.
  LakeSpeak never invents coherence it doesn't have.
  The answer skeleton always includes raw_chunks as fallback.

ANSWER SKELETON:
  Not prose. Structured. Clearbox renders it.
  primary → sub-contexts (ordered by ring distance) → background
  bridge tokens between each segment.
  The LLM can optionally convert this to prose — but the skeleton
  is already a useful answer on its own.

NO LLM IN EITHER PATH. EVER.
```

---

## ═══ REGIME FLAGS ═══

```
[ACTIVE]  GPT_FILESYSTEM_BAN — permanent
[ACTIVE]  LARGE_FILE_SURGICAL_EDIT_ONLY — console.js = 5,091 lines
[ACTIVE]  AUDIT_BEFORE_CODE
[ACTIVE]  NO_RE_PROPOSING_DONE_WORK
[ACTIVE]  NO_YOLO_NO_CV — Lee's vision tech only
[ACTIVE]  NO_NEO4J_DEPENDENCY — in-memory or SQLite only
[ACTIVE]  IMPORT_DONT_REBUILD
            wolf_engine + UnifiedEngine + GlobalLexicon = done. Import only.
            Market Oracle existing modules = import. New modules (4) were built.
[ACTIVE]  SANDBOX_FIRST
[ACTIVE]  COMPUCOG_IDJXGI_ONLY
[ACTIVE]  CONTRACTS_BEFORE_CODE — temporal_resolver: two gates.
[ACTIVE]  NO_HARDCODED_MODELS — applies to Clearbox + CRSA-616 business logic.
            Vacuous for LakeSpeak: LakeSpeak has zero model calls.
[ACTIVE]  LAKESPEAK_NO_LLM — ABSOLUTE
            No model call in LakeSpeak. Ingest: algorithmic. Query: algorithmic.
            FormatDetector = signal analysis. GlueEngine = grammar rules on lexicon.
            Safety crutch = algorithmic fallback (paragraph default + SafetyValve).
            Any proposed LLM call inside LakeSpeak is automatically wrong.
[ACTIVE]  LAKESPEAK_TWO_SPEC_SEPARATION
            FormatDetector (ingest) and GlueEngine (query) are separate builds.
            Different files. Different directories. Different timing.
            They share GlobalLexicon as a read dependency. Nothing else.
            Do NOT build them as one system.
[ACTIVE]  ADAPTIVE_INGEST_RULE
            No fixed-token chunking. Adapters use natural boundaries.
            Tables = TableCellAdapter (2D token encoding). Never mix into prose.
            N auto-tuned by density algorithm (3-12). Cached.
[ACTIVE]  RAW_STRING_BOUNDARY
            LakeSpeak tokens = raw strings. CRSA-616 = 5-byte symbols.
[ACTIVE]  ADAPTER_PATTERN_RULE
            Engine is universal. Adapters are domain-specific. Never combine.
[ACTIVE]  SWAP_AS_CORPUS
            This swap file is structured system knowledge.
            LakeSpeak can ingest it. The system can then answer questions
            about its own architecture from the lexicon.
            FormatDetector classifies it: markdown + headings → HeadingAdapter.
            Sections become chunks. Anchors: rule names, component names,
            regime flags, contract IDs. The adjacency table learns the
            relationships between system concepts.
            Self-documenting architecture via its own retrieval engine.
```

---

## ═══ OPEN QUESTIONS ═══

```
[FOR_LEE]    LakeSpeak FormatDetector build go-ahead?
[FOR_LEE]    LakeSpeak GlueEngine build go-ahead?
[FOR_LEE]    GlobalLexicon: does adjacency store per-position counts or flat?
             (GlueEngine needs left/right context reads — confirm before Step 1 audit)
[FOR_LEE]    GlobalLexicon path on your system?
[FOR_LEE]    neighbor_depth default for census_score — 10 / 20 / 30?
[FOR_LEE]    GlueEngine MIN_COHERENCE threshold — 0.2 / 0.3 / tunable?
[FOR_LEE]    GlueEngine max_gaps before SafetyValve — 2 / 3 / tunable?
[FOR_LEE]    Market Oracle: approve to move from sandbox to repo?
[FOR_LEE]    Market Oracle: DRIFT #5 — built as plugin, you said SEPARATE.
             Add to [SEPARATE] list? Or keep as Clearbox plugin? Both work.
[FOR_LEE]    Anchor weight (0.30) — keep as third signal or fold into census?
[FOR_LEE]    CONTRACT #2: MIN_DIRECTION threshold for directional edges?
[FOR_LEE]    CONTRACT #3: lexicon.get_frequency() — raw freq or doc freq?
[FOR_LEE]    CONTRACT #4: DIRECTION_THRESHOLD, BRIDGE_MIN_COUNT defaults?
[FOR_LEE]    CONTRACT #5: simple 1.5x ratio for ADJACENT, or composite score?
[FOR_LEE]    Approve temporal_resolver v2 contracts — "contracts approved"
[FOR_LEE]    8 temporal_resolver checklist items
[FOR_LEE]    CRSA-616 Phase 2 go-ahead?
[FOR_LEE]    SensoryStack: "move it"?
[FOR_LEE]    Dashboard: wolf_engine Flask+SSE or fresh?
[FOR_LEE]    GPU: ForgeMemoryGPU + ncv_batch.py — now or defer?

[FOR_VSCODE] Start immediately: no-response bug + chatlog_stream.py + ollama list
[FOR_VSCODE] LakeSpeak FormatDetector: format_detector.py + adapters/ (after go-ahead)
[FOR_VSCODE] LakeSpeak GlueEngine: glue/ directory, 7 modules (after go-ahead)
             Step 1 first: audit GlobalLexicon adjacency structure.
[FOR_VSCODE] Market Oracle: move to repo (after Lee review/approval)
[FOR_VSCODE] SensoryStack → repo (after "move it")
[FOR_VSCODE] temporal_resolver (BLOCKED — both gates)

[FOR_CHAT]   Cloud provider decision
```

---

## ═══ LAST_CODING_SESSION ═══

```
[CLAUDE A] Session close : 2026-03-11
Files touched:
  - claude_sandbox/plugins/market_oracle/ — BUILT (15 files)
  - claude_sandbox/!CLAUDE_SWAP_2.md — GlueEngine spec merged (Claude C + Claude A),
    5 open contracts incorporated, labels renamed to conservative directional,
    IDF de-weighting added, SWAP_AS_CORPUS flag + system knowledge section added.
What was done:
  1. Market Oracle plugin built (regime_detector, storage, orchestrator, api, UI panel)
  2. GlueEngine SPEC 2 written: 10 grammar rules, context rings with L/R split,
     temporal role classifier, directional chain, coherence mapper, bridge weaver,
     answer skeleton with directional metadata
  3. Claude C's 5 open contracts incorporated (conservative labels, cycle breaking,
     IDF de-weighting, confidence thresholds, concurrent scoring)
  4. Swap file marked as LakeSpeak-ingestible system knowledge (SWAP_AS_CORPUS)
Not finished: temporal_resolver (blocked), SensoryStack (awaiting Lee),
  bug fixes (queued), LakeSpeak FormatDetector + GlueEngine (awaiting go-ahead)
Next: bug fixes (no gates) → FormatDetector → GlueEngine (both need go-ahead)
```

---

## ═══ CHAT_OBSERVATIONS ═══

**[CLAUDE C] 2026-03-11 — GlueEngine design: the lexicon as grammar:**

The critical insight Lee's statement unlocks: the adjacency table is directional.
Every word has left-context neighbors (what precedes it) and right-context neighbors
(what follows it). This is not symmetric. "The" appears in left context of nouns far
more than right context. "Ran" appears in right context of "she/he/it" far more than
left. These asymmetries ARE grammar — not prescriptive grammar, but descriptive
grammar derived from actual usage in Lee's corpus.

The GlueEngine doesn't need a language model because it doesn't need to generate.
It needs to SELECT, ORDER, and CONNECT. Those three operations can all be performed
by reading the adjacency map:
- SELECT: already done by BM25 + census_score
- ORDER: left/right asymmetry in adjacency gives natural reading direction
- CONNECT: bridge token = word in A's right-context ∩ B's left-context

The 8 grammar rules are the navigation instructions for the map. They're
deterministic. They're reproducible. Given the same query and the same lexicon,
the GlueEngine always produces the same AnswerSkeleton. That's a property
a language model can never give you.

The AnswerSkeleton being structured (not prose) is deliberate. It separates
the retrieval/assembly intelligence from the presentation layer. Clearbox
can render it as plain text, as a structured card, or pipe it to the LLM
for final polish. The assembly is already done before the LLM ever sees it —
so if the LLM is used for rendering, it's not doing the hard work, it's just
formatting a pre-structured answer. That's a fundamentally different use
than having the LLM do the retrieval and reasoning.

The SafetyValve (Rule 8) is the honest answer to "what if the lexicon doesn't
know?" Answer: return the chunks. Don't fake coherence. LakeSpeak knowing
what it doesn't know is a feature, not a limitation.

**[CLAUDE C] 2026-03-11 — Market Oracle: clean build.**
regime_detector.py sits on top of the existing pipeline — consumes output of
causal_analyzer + pattern_detector, never touches their internals. That's
correct layering. SQLite storage with WAL, no Neo4j. All config overridable
per-run through the plugin interface. Ready for repo.

**[CLAUDE C] 2026-03-11 — LakeSpeak NO LLM, adapter pattern, raw string boundary — all hold.**

**[CLAUDE A] 2026-03-11 — DRIFT AUDIT (first pass):**

Checked all sections for terminology drift between Claude C's original design,
Claude A's temporal additions, and the post-contract-incorporation pass.

```
DRIFT #1 — "causal" vs "directional" (INCOMPLETE RENAME)
  Who: Claude A (me) — missed spots during contract incorporation
  Type: ACCIDENTAL — should be fixed
  Locations:
    Line 202: "temporal/causal direction" → should be "temporal/directional"
    Line 219: "temporal/causal ordering" → should be "temporal/directional ordering"
    Line 223: "Causal ordering" → should be "Directional ordering"
    Line 288: "encode causal direction" → should be "encode directional flow"
    Line 534: "tight causal link" (Rule 9) → should be "tight directional link"
    Line 605: "causal_chain_detected" field → should be "directional_chain_detected"
    Line 628: "causal_depth" in SubContext → should be "depth"
    Line 640: compass metaphor says "(causal direction)" → should be "(directional flow)"
    Line 671: Step 5 says "causal flow" → should be "directional flow"
    Line 675: Step 6 says "Causal chain order" → should be "Directional chain order"
  Fix: rename all to "directional". CONTRACT #1 resolved this — no ambiguity.

DRIFT #2 — Safety Valve rule number
  Who: Claude C (original) vs Claude A (renumbered)
  Type: ACCIDENTAL numbering conflict
  Location: KEY ARCHITECTURE section line ~916 says "SAFETY VALVE (RULE 8)"
            But Grammar Rules section has SafetyValve as RULE 10 (correct).
  Fix: update quick reference to say Rule 10.

DRIFT #3 — "antecedents/consequents" vs "upstream/downstream" in skeleton
  Who: Claude A — partial rename
  Type: ACCIDENTAL — leftover from pre-contract terminology
  Location: AnswerSkeleton fields are correctly "upstream/downstream"
            BUT field comments in architecture flow diagram still reference old terms
  Fix: already correct in dataclass. No action needed (comments were updated).

DRIFT #4 — "10 grammar rules (8 from Claude C + 2 temporal)" count
  Who: Claude A + Claude C — both contributed to confusion
  Type: INTENTIONAL but misleading
  Detail: Claude C designed 8 rules. Claude A added 2 (Rules 8,9).
          But Claude A ALSO upgraded Rule 6 (was Claude C's temporal thread).
          So it's really: 7 original Claude C + 1 upgraded + 2 new = 10.
          The "8+2" framing is close enough. Not worth fixing.
  Fix: none — accurate enough. Note: Rule 6 is a merge, not purely Claude C.

DRIFT #5 — Market Oracle: "plugin" vs "[SEPARATE]"
  Who: Lee (correction)
  Type: PURPOSEFUL
  Detail: Market Oracle was built as a Clearbox plugin in sandbox.
          Lee corrected: should be SEPARATE like CompuCog.
          DONE list says "MARKET ORACLE PLUGIN" but [SEPARATE] section
          only lists "CompuCog, DATA MASTER, ARC Solver".
          Market Oracle is NOT in the [SEPARATE] list.
  Fix: either add Market Oracle to [SEPARATE] list, or keep as plugin
       if Lee changed his mind. [FOR_LEE] — which is it?

DRIFT #6 — "8 grammar rules" vs "10 grammar rules" in quick reference
  Who: Claude A — didn't update KEY ARCHITECTURE section
  Type: ACCIDENTAL
  Location: Line ~758 says "SubContextOrderer (8 grammar rules)"
            Should be 10. The query path diagram also says 8.
  Fix: update both to 10.

DRIFT #7 — dense lane removal
  Who: Claude C (intentional)
  Type: PURPOSEFUL
  Detail: DONE list line 52 says "LakeSpeak hybrid retrieval (BM25 0.40 / dense 0.60)"
          but Claude C removed the dense lane — census_score replaced it.
          The DONE item says "to be replaced" which acknowledges this.
          But the data flow diagram (line ~757) still says "BM25(0.40) + census_score(0.60)"
          with the OLD weighting. Census replaced dense, but the weights may be different.
  Fix: confirm weights are still 0.40/0.60 for BM25/census. If so, fine.
       If census changed the ratio, update.
```

**[CLAUDE A] 2026-03-11 — Swap file as system knowledge (Lee's insight):**
Lee identified that this swap file is structured knowledge the system can ingest.
FormatDetector → HeadingAdapter → sections become chunks → lexicon learns
architecture topology. The system can then answer "what does GlueEngine do?"
or "how does Rule 6 work?" using its own grammar rules on its own documentation.
No special meta-layer. No separate knowledge base. Just another document in the
corpus that happens to describe the corpus engine itself. Self-referential but
not circular — the content describes the engine, the engine processes the content.
First real integration test after LakeSpeak is built.

**[CLAUDE C] 2026-03-11 — Temporal extension refinement:**
Core insight approved: "the map is not only semantic proximity, it is directional context."
5 open contracts identified. Key correction: L/R adjacency = directional evidence (sequence),
not causal proof. Conservative labels first (UPSTREAM/DOWNSTREAM), causal promotion requires
additional evidence. IDF de-weighting needed for high-frequency anchor poisoning. Cycle
breaking = weakest-edge removal. Full framing: "Directional Response Assembly over 6-1-6
adjacency with optional causal interpretation where supported."

---

## ═══ HISTORY_LOG ═══

```
[CLAUDE C] 2026-03-11 — GLUE ENGINE DESIGNED: 8 grammar rules, context rings,
                         coherence mapper, bridge weaver, answer skeleton, safety valve.
                         Pure algorithmic. Lexicon adjacency = grammar.
                         LAKESPEAK_TWO_SPEC_SEPARATION flag added.
                         Market Oracle marked DONE in sandbox.
[CLAUDE C] 2026-03-11 — CRITICAL CORRECTION: LAKESPEAK_NO_LLM absolute.
                         Safety crutch = algorithmic fallback (paragraph default).
[CLAUDE C] 2026-03-11 — Adapter-router pattern. ADAPTER_PATTERN_RULE added.
[CLAUDE C] 2026-03-11 — NO_HARDCODED_MODELS. ADAPTIVE_INGEST_RULE.
[CLAUDE A] 2026-03-11 — Paragraph chunking + lexicon symbol corrections.
[CLAUDE C] 2026-03-11 — LakeSpeak census architecture. Dense lane removed.
[CLAUDE A] 2026-03-11 — TWO SYSTEMS separation + data flow.
[CLAUDE C] 2026-03-11 — Plan review. Two-gate rule. Track 3 parallel.
[CLAUDE A] 2026-03-11 — Swap split.
[CLAUDE C] 2026-03-11 — Temporal contracts v2 (gradient).
[CLAUDE A] 2026-03-11 — Gradient correction applied.
[CLAUDE C] 2026-03-11 — TrueVision/SVE audit. COMPUCOG_IDJXGI_ONLY.
[CLAUDE A] 2026-03-10 — CRSA-616 blueprint (14 plugins, 7 layers).
[CLAUDE C] 2026-03-10 — SensoryStack built. wolf_engine stays.
[CLAUDE A] 2026-03-11 — Market Oracle plugin built (15 files, sandbox).
[CLAUDE A] 2026-03-11 — Claude C's 5 open contracts incorporated into GlueEngine spec.
                         Labels renamed: CAUSAL_ANTECEDENT → UPSTREAM_CONTEXT,
                         CAUSAL_CONSEQUENT → DOWNSTREAM_CONTEXT, DIRECT_ANSWER → PRIMARY.
                         IDF de-weighting added. Cycle breaking policy documented.
                         Causal labels (CAUSE/EFFECT) now optional promotions only.
[CLAUDE A] 2026-03-11 — SWAP_AS_CORPUS: swap file marked as LakeSpeak-ingestible
                         system knowledge. HeadingAdapter chunks it by ## sections.
                         System can answer questions about its own architecture
                         from the lexicon. First test: "describe your own architecture."
[CLAUDE A] 2026-03-11 — DRIFT AUDIT: 7 drifts found. #1 (causal→directional rename
                         incomplete) FIXED — 10 spots patched. #2 (SafetyValve rule
                         number) FIXED. #3 (skeleton field names) already correct.
                         #4 (rule count 8+2) intentional, kept. #5 (Market Oracle
                         plugin vs SEPARATE) needs Lee. #6 (rule count in diagrams)
                         FIXED. #7 (BM25/census weights) needs confirmation.
```

---

## ═══ SWAP FILE AS LAKESPEAK CORPUS ═══

> "this swap file can be turned into system knowledge we can later map
>  for the lakespeak" — Lee

This file is not just coordination state. It is **structured system knowledge**
that LakeSpeak can ingest as corpus data. Once ingested:

```
WHAT HAPPENS:
  FormatDetector sees: markdown, heading boundaries, code blocks
  → HeadingAdapter: splits on ## boundaries → one chunk per section
  → Each section becomes a retrievable knowledge unit
  → Anchors: "GlueEngine", "FormatDetector", "Rule 6", "CONTRACT #3",
    "regime_detector", "SafetyValve", "bridge token", etc.

WHAT THE LEXICON LEARNS:
  "GlueEngine" → R-context: "query", "grammar", "rules", "lexicon", "assembly"
  "FormatDetector" → R-context: "ingest", "signal", "adapter", "chunk"
  "SafetyValve" → L-context: "coherence", "threshold", "gaps"
  "bridge" → L-context: "A", "right-context" / R-context: "B", "left-context"

  The system learns its own architecture topology from the same
  counting mechanism it uses for any other document.

WHAT YOU CAN THEN QUERY:
  "what does the GlueEngine do?"
    → PRIMARY: GlueEngine section
    → UPSTREAM: FormatDetector (ingest precedes query)
    → DOWNSTREAM: AnswerSkeleton (output follows assembly)
    → bridge tokens: "lexicon", "grammar", "chunks"

  "how does Rule 6 work?"
    → PRIMARY: Grammar Rules section, Rule 6
    → UPSTREAM: build_directional_chain (feeds into Rule 6)
    → ADJACENT: Rule 3 density cascade (fallback when signal weak)

  The system answers questions about itself using its own grammar rules.
  No special case. No meta-layer. Just another document in the corpus.

INGEST PRIORITY:
  This file + CRSA-616 blueprint + architecture docs = system knowledge layer.
  Ingest AFTER LakeSpeak is built. First real test: "describe your own architecture."
```

---



```
Archive swap:          claude_sandbox/!CLAUDE_SWAP.md
CRSA-616 blueprint:    claude_sandbox/CRSA-616_FULL_REBUILD_BLUEPRINT.md
Temporal contracts:    claude_sandbox/TEMPORAL_PROMOTION_CONTRACTS.md (v2)
Market Oracle:         claude_sandbox/plugins/market_oracle/ (15 files, review pending)
Core engine:           Manus artifacts OG/CORRECTED CORE ENGINE PSEUDOCODE.md
Text intake Zone 1:    Manus artifacts OG/TEXT_INTAKE_PSEUDOCODE_ZONE1.md
Finance adapter:       Manus artifacts OG/finance_adapter.py
6-1-6 arch:            Manus artifacts OG/6-1-6 Architecture Analysis.md
Lexicon spec:          Manus artifacts OG/LEXICON ADDENDUM - THE SPINE OF 6-1-6.md

SYSTEM KNOWLEDGE LAYER (for LakeSpeak ingest — SWAP_AS_CORPUS):
  Priority 1:  claude_sandbox/!CLAUDE_SWAP_2.md  (this file — architecture + specs)
  Priority 2:  claude_sandbox/CRSA-616_FULL_REBUILD_BLUEPRINT.md  (plugin topology)
  Priority 3:  Manus artifacts OG/6-1-6 Architecture Analysis.md  (engine internals)
  Priority 4:  Manus artifacts OG/LEXICON ADDENDUM - THE SPINE OF 6-1-6.md  (lexicon spec)
  → Ingest after LakeSpeak built. First query: "describe your own architecture."
```

---

## ═══ COLD START — FOR CLAUDE A ═══

You are Claude A — executor, VS Code side.
Archive: `claude_sandbox/!CLAUDE_SWAP.md`

Hard rules:
- console.js = 5,091 lines — search-and-edit ONLY
- GPT: NO filesystem access. Ever.
- IMPORT wolf_engine. Never rebuild the engine.
- LAKESPEAK_NO_LLM: zero model calls inside LakeSpeak. ABSOLUTE.
  FormatDetector = signal analysis. GlueEngine = grammar rules. Both pure Python.
- LAKESPEAK_TWO_SPEC_SEPARATION: FormatDetector and GlueEngine are separate builds.
  Separate directories. Don't mix them.
- NO_HARDCODED_MODELS: applies to Clearbox + CRSA-616.
- ADAPTER_PATTERN_RULE: engine universal, adapters thin.
- RAW_STRING_BOUNDARY: LakeSpeak = raw strings. CRSA-616 = 5-byte symbols.
- Sandbox first. Lee approves. Then repo.
- temporal_resolver: two gates.
- CompuCog = SEPARATE.
- Check DONE list before proposing anything.
- Market Oracle is DONE. Do not rebuild it. Move to repo when Lee approves.

First move: read this file → [FOR_VSCODE] in OPEN_QUESTIONS →
default: no-response bug (llm_chat_service.py).

---

## ═══ COLD START — FOR CLAUDE C ═══

You are Claude C — analyst, claude.ai side.
Archive: `claude_sandbox/!CLAUDE_SWAP.md`

Read LAST_CODING_SESSION → OPEN_QUESTIONS → write CHAT_OBSERVATIONS.
Same rules. LakeSpeak = zero LLM calls. Two separate specs.
The lexicon adjacency table IS the grammar. GlueEngine reads the map.
Don't re-propose DONE list items. Market Oracle is done.
