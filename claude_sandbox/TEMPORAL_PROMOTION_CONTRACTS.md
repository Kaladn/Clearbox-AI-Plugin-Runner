# TEMPORAL_PROMOTION_CONTRACTS.md
> **Phase 0 Implementation Contracts — Temporal Resolver Plugin**
> Written by: [CLAUDE C] 2026-03-11 (v1 — binary model)
> Revised by: [CLAUDE C] 2026-03-11 (v2 — GRADIENT MODEL — replaces v1 entirely)
> Status: LOCKED — no code written until all 6 contracts pass Lee review
> Plugin name: `temporal_resolver`
> Position in CRSA-616: Between Layer 2 (Symbolization) and Layer 5 (Reasoning)

---

## ⚠️ V1 → V2 REVISION NOTICE

The original v1 contracts treated promotion as BINARY: either an event has 6-before
AND 6-after (resolvable) or it doesn't (skip it). That model caused the previous
failure — session boundaries thrown away, edge data lost, short sessions gutted.

Lee's correction: **context is a gradient, not a switch.**

Every event is always promotable. Depth grows from 0-1-0 at intake toward 6-1-6 as
the stream continues. Multiple artifacts per event. Consumers declare their minimum
acceptable maturity. Nothing is ever skipped.

These contracts govern the gradient model. v1 contracts are superseded entirely.

---

## HOW TO USE THIS DOCUMENT

These are not guidelines. They are executable contracts.
Each contract defines:
- The invariant (what must always be true)
- The enforcement mechanism (how the code guarantees it)
- The violation behavior (what happens when it breaks)
- The test oracle (how you verify it in tests)

Before Claude A writes a single line of `temporal_resolver`, every contract
below must be either ACCEPTED or AMENDED by Lee. No partial compliance.
The implementation must satisfy all 6 or the build does not proceed.

---

## THE GRADIENT MODEL — CORE RULES (read before any contract)

```
depth_before(e_i) = min(6, position_i)
    where position_i = number of non-quarantined events before e_i in the entity stream

depth_after(e_i, t) = min(6, count_after_i_at_time_t)
    where count_after_i_at_time_t = non-quarantined events after e_i known at time t

maturity(e_i, t) = (depth_before(e_i) + depth_after(e_i, t)) / 12.0
    range: [0.0, 1.0]
    1.0 = 6-1-6 = maximum maturity

An event at stream position 0 has depth_before=0 at intake. This is valid.
An event at the current tail has depth_after=0 at intake. This is also valid.
Both produce real artifacts with real partial context.
Maturity grows forward in time. It NEVER decreases.
```

**Key consequence:** 37,531 events → 37,531 artifacts at intake, all at varying
maturity. As the stream continues, each event's maturity increases. The first
event in a session starts at 0-1-0 and eventually reaches 0-1-6 (it can never
have before-context — that's not a failure, that's its natural truth).

---

## CONTRACT 1: ORDERING & COLLISION

### Invariant
Events within a single entity partition are processed in `ts_utc` ascending order.
The resolver computes depth using positional ordering in this sorted sequence.
Timestamp collisions (two events sharing ts_utc) are quarantined — their position
is ambiguous and their contribution to neighbor context is undefined.

### Why Collisions Still Matter Under Gradient Model
Even though no events are "unresolvable," a collision creates a positional ambiguity:
which of the two tied events comes first? This ambiguity would make depth_before
and depth_after nondeterministic for ALL events in the collision window (up to 12
events). The collision pair is quarantined to preserve the integrity of their neighbors.

### Formal Definition

**Sorted sequence:** For entity E, `events_E = sort(events, key=ts_utc, stable=True)`

**Collision:** Two events `e_i`, `e_j` where `ts_utc(e_i) == ts_utc(e_j)` and `i ≠ j`

**Collision effect:** Both `e_i` and `e_j` are quarantined. The sequence is "healed"
by removing them, and depth is computed on the healed sequence. Neighbors of the
removed events experience reduced depth (their window shrinks by the number of
removed events near them).

**Healed sequence:** `events_E_clean = events_E with all collision pairs removed`

**depth_before(e_i) in healed sequence:** `min(6, position_i_in_healed_sequence)`

**depth_after(e_i, t) in healed sequence:** `min(6, count_of_healed_events_after_e_i_at_time_t)`

### Enforcement Mechanism
```python
def load_sort_and_heal(symbols_file: Path, entity: str) -> tuple[list[SymbolEvent], list[str]]:
    """
    Returns (healed_events, quarantined_ids).
    Healed events are ordered and collision-free.
    """
    events = [e for e in load_jsonl(symbols_file) if e.entity == entity]
    events.sort(key=lambda e: e.ts_utc)  # stable sort preserves intake order for ties
    
    # Find all timestamps with duplicates
    from collections import Counter
    ts_counts = Counter(e.ts_utc for e in events)
    collision_ts = {ts for ts, count in ts_counts.items() if count > 1}
    
    healed = []
    quarantined_ids = []
    for e in events:
        if e.ts_utc in collision_ts:
            quarantined_ids.append(e.event_id)
        else:
            healed.append(e)
    
    return healed, quarantined_ids
```

### Violation Behavior
- Collision pair → both quarantined to `quarantined_events.jsonl`
- Healed sequence used for all depth calculations
- WARNING log: entity, both event_ids, shared ts_utc, count of neighbors affected

### Test Oracle
```python
def test_collision_quarantines_both_not_neighbors():
    events = [
        make_event(entity="X", ts="T01", id="A"),
        make_event(entity="X", ts="T02", id="B"),
        make_event(entity="X", ts="T02", id="C"),  # collision with B
        make_event(entity="X", ts="T03", id="D"),
        make_event(entity="X", ts="T04", id="E"),
    ]
    healed, quarantined = load_sort_and_heal(events, "X")
    
    assert "B" in quarantined
    assert "C" in quarantined
    assert "A" not in quarantined
    assert "D" not in quarantined
    assert "E" not in quarantined
    assert len(healed) == 3  # A, D, E remain

def test_healed_sequence_depth_is_correct():
    # After removing B and C, A is at position 0, D at position 1, E at position 2
    # depth_before(A) = 0, depth_before(D) = 1, depth_before(E) = 2
    healed, _ = load_sort_and_heal(events_above, "X")
    assert compute_depth_before(healed, 0) == 0  # A
    assert compute_depth_before(healed, 1) == 1  # D
    assert compute_depth_before(healed, 2) == 2  # E
```

---

## CONTRACT 2: ENTITY PARTITION

### Invariant
Resolution is ALWAYS scoped to a single entity. Context windows NEVER
cross entity boundaries. An event from entity "PLAYER_A" is never used
as context for an event from entity "PLAYER_B", even if they share a
session and have interleaved timestamps.

### Formal Definition
The entity partition key is: `SymbolEvent.entity` (string, exact match, case-sensitive)

The full event corpus loaded from `symbols.jsonl` MUST be split into
independent partitions before any resolution begins:

```
partition(events) → Dict[str, List[SymbolEvent]]
  where key = event.entity
  and   ∀ e in partition[k]: e.entity == k
  and   ∀ k1 ≠ k2: partition[k1] ∩ partition[k2] == ∅
```

Each partition is resolved independently. Order of partition processing
is undefined (can be parallelized).

### Enforcement Mechanism
```python
def resolve_all(symbols_file: Path) -> ResolutionResult:
    events = load_jsonl(symbols_file)
    
    # Partition — entity key is EXACT STRING, no normalization
    partitions: dict[str, list[SymbolEvent]] = defaultdict(list)
    for e in events:
        partitions[e.entity].append(e)
    
    results = []
    for entity, entity_events in partitions.items():
        results.append(resolve_partition(entity, entity_events))
    
    return merge_results(results)
```

`build_window()` receives only the healed entity partition — it has NO access
to the full corpus. Cross-partition access is a programming error.

### Violation Behavior
`build_window()` called with events from multiple entities → raises
`EntityPartitionViolation`. Hard crash. Not a warning, not logged-and-continued.

### Test Oracle
```python
def test_entity_partition_no_cross_contamination():
    events = [
        *[make_event(entity="A", ts=f"T{i:02d}") for i in range(15)],
        *[make_event(entity="B", ts=f"T{i:02d}") for i in range(15)],
    ]
    result = resolve_all(events)
    
    for artifact in result.resolved_artifacts:
        original_entity = get_entity(events, artifact.original_event_id)
        for symbol in artifact.context_before + artifact.context_after:
            source_event = get_event_by_symbol(events, symbol)
            assert source_event.entity == original_entity
```

---

## CONTRACT 3: IDEMPOTENCY (GRADIENT MODEL)

### Invariant
Running the resolution engine N times on the same input at the same stream
position produces exactly the same set of artifacts. No duplicate artifacts
for the same (event_id, depth_before, depth_after) combination. No state
corruption on re-run.

### Key Change from v1
In the gradient model, an event has MULTIPLE valid artifacts — one per maturity
level reached. This is expected and correct behavior. The idempotency guarantee
is per maturity level: the same maturity level for the same event is never
emitted twice.

```
Uniqueness key: (original_event_id, depth_before, depth_after)

A (event_id="A", depth_before=0, depth_after=3) artifact
  does NOT block
A (event_id="A", depth_before=0, depth_after=4) artifact
  — these are DIFFERENT maturity levels, both valid.

But:
A SECOND (event_id="A", depth_before=0, depth_after=3) artifact
  IS BLOCKED — same maturity level, duplicate.
```

### SQLite Schema (REVISED)
```python
# Schema — composite PRIMARY KEY enforces per-maturity-level uniqueness
CREATE TABLE promoted_events (
    event_id        TEXT NOT NULL,    -- FK to symbols.jsonl event_id
    depth_before    INTEGER NOT NULL, -- 0-6
    depth_after     INTEGER NOT NULL, -- 0-6
    resolution_id   TEXT NOT NULL,    -- UUID of the ResolvedSymbolEvent artifact
    promoted_at     TEXT NOT NULL,    -- ISO UTC timestamp of this promotion
    maturity        REAL NOT NULL,    -- (depth_before + depth_after) / 12.0
    latency_ms      REAL NOT NULL,    -- ms from original event ts_utc to promoted_at
    PRIMARY KEY (event_id, depth_before, depth_after)
);

-- Index for fast lookup of all artifacts for an event
CREATE INDEX idx_event_id ON promoted_events(event_id);

-- Index for consumers filtering by maturity threshold
CREATE INDEX idx_maturity ON promoted_events(maturity);
```

### Idempotency Gate
```python
def try_promote_at_depth(
    event_id: str,
    depth_before: int,
    depth_after: int,
    db: sqlite3.Connection
) -> bool:
    """Returns True if this (event_id, depth_before, depth_after) should be promoted."""
    row = db.execute(
        """SELECT resolution_id FROM promoted_events
           WHERE event_id=? AND depth_before=? AND depth_after=?""",
        (event_id, depth_before, depth_after)
    ).fetchone()
    
    if row is not None:
        return False  # Already promoted at this maturity — skip silently
    return True

def get_max_depth_after(event_id: str, db: sqlite3.Connection) -> int:
    """Returns the highest depth_after achieved so far for this event."""
    row = db.execute(
        "SELECT MAX(depth_after) FROM promoted_events WHERE event_id=?",
        (event_id,)
    ).fetchone()
    return row[0] if row[0] is not None else -1

def should_emit_new_artifact(event_id: str, new_depth_after: int, db) -> bool:
    """Only emit if this depth_after is strictly higher than any previous."""
    current_max = get_max_depth_after(event_id, db)
    return new_depth_after > current_max
```

### WAL Mode Requirement (unchanged from v1)
```python
db.execute("PRAGMA journal_mode=WAL")
db.execute("PRAGMA synchronous=NORMAL")
```
Write JSONL artifact first, then insert SQLite row. Crash between them → orphaned
JSONL entry detected on restart → SQLite insert replayed (safe, content is deterministic).

### Test Oracle
```python
def test_no_duplicate_at_same_maturity():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(10)]
    
    # First run — stream has 10 events
    result1 = resolve_all(events)
    
    # Second run — same input
    result2 = resolve_all(events)
    
    # Total artifact count must be the same — no duplicates
    assert count_artifacts(result1) == count_artifacts(result2)
    assert count_sqlite() == count_artifacts(result1)  # SQLite is authoritative

def test_different_maturity_levels_allowed():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(10)]
    result_pass1 = resolve_all(events)
    
    # Add 3 more events — event at index 0 now has higher depth_after possible
    more_events = events + [make_event(entity="X", ts=f"T{i:02d}") for i in range(10, 13)]
    result_pass2 = resolve_all(more_events)
    
    # Pass 2 should have MORE total artifacts (new maturity levels unlocked)
    assert count_artifacts(result_pass2) > count_artifacts(result_pass1)
    
    # But no artifact from pass1 was duplicated
    pass1_keys = get_composite_keys(result_pass1)
    pass2_keys = get_composite_keys(result_pass2)
    assert len(pass1_keys & pass2_keys) == len(pass1_keys)  # all pass1 keys in pass2
    assert len(pass2_keys) > len(pass1_keys)  # pass2 has new keys

def test_max_maturity_blocks_further_promotion():
    # Event at position 6 (depth_before=6) with 6 after (depth_after=6) = FULL
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(20)]
    resolve_all(events)
    
    full_event_id = get_event_at_position(7, events)  # first possible FULL event
    assert get_max_depth_after(full_event_id) == 6
    
    # Add 10 more events — should not add new artifact for already-FULL event
    more_events = events + [make_event(entity="X", ts=f"T{i:02d}") for i in range(20, 30)]
    resolve_all(more_events)
    
    # Max depth_after for full_event_id is still 6 — no new artifact
    assert count_artifacts_for_event(full_event_id) == 1  # only one at depth 6-1-6
```

---

## CONTRACT 4: MATURITY PROGRESSION & QUARANTINE

### Invariant
Every event in the corpus transitions through maturity levels in strict
ascending order of depth_after. No event regresses. No maturity level
is skipped IF the resolver processes the stream in order (streaming mode
may skip levels if events arrive in batches). Quarantined events are
never promoted at any maturity level.

### Key Change from v1 — No "UNRESOLVABLE" State
Under the gradient model, the concepts of "MISSING_BEFORE" and "MISSING_AFTER"
as blocking states are eliminated. These are not failures — they are natural
properties of edge events:

- First event in stream: depth_before=0. Valid. Emits a 0-1-N artifact.
- Last event in stream: depth_after=0 (until more events arrive). Valid. Emits an M-1-0 artifact.
- Sequence gap (events deleted): reduces depth of neighbors. Still valid at reduced depth.

The only events that are BLOCKED from promotion are those with data integrity problems:

### Quarantine Classification (simplified from v1)
```python
class QuarantineReason(str, Enum):
    TIMESTAMP_COLLISION  = "TIMESTAMP_COLLISION"  # Ambiguous position
    LATE_ARRIVAL         = "LATE_ARRIVAL"         # Arrived after stream advanced past it
    CORRUPT_EVENT        = "CORRUPT_EVENT"        # Fails schema validation
    MISSING_SYMBOLS      = "MISSING_SYMBOLS"      # Empty symbols list — no signal to resolve
```

All four reasons → event goes to `quarantined_events.jsonl`. Never promoted.
No "UNRESOLVABLE" category. No "SEQUENCE_GAP" as a gap type — sequence gaps
are handled by naturally lower depth in neighbors, not by any special classification.

### How Sequence Gaps Are Handled
```
Normal stream:    e0  e1  e2  e3  e4  e5  e6  e7  e8  e9
depth_before(e6) = 6  (6 events before it)

With gap at e3 deleted:
                  e0  e1  e2  [gap]  e4  e5  e6  e7  e8  e9
depth_before(e6) = 5  (only 5 non-quarantined events before it)
```
The gap reduces depth. There is NO special handling needed. The depth computation
naturally accounts for the reduced count. e6 still emits a 5-1-N artifact.

### Maturity Threshold for Downstream Consumers
Consumers MUST declare the minimum maturity they will accept:
```python
@dataclass
class CRSA616Input:
    event_id: str
    ts_utc: datetime
    entity: str
    context_before: list[str]   # depth_before × 6 symbols = 0-36 symbols
    current_symbols: list[str]  # always 6 symbols
    context_after: list[str]    # depth_after × 6 symbols = 0-36 symbols
    depth_before: int           # 0-6
    depth_after: int            # 0-6
    maturity: float             # 0.0-1.0

# Consumer declares minimum threshold
MIN_MATURITY_REALTIME = 0.0     # Accept everything (0-1-0 and up)
MIN_MATURITY_ANALYSIS = 0.5     # Accept ≥ 6-1-6 half-full = 3-1-3 or better
MIN_MATURITY_FULL     = 1.0     # Accept only 6-1-6
```

### Enforcement Mechanism
```python
def classify_quarantine(event: SymbolEvent) -> QuarantineReason | None:
    """Returns None if event is clean, QuarantineReason if it should be quarantined."""
    # Schema validation
    if not is_valid_schema(event):
        return QuarantineReason.CORRUPT_EVENT
    
    # Empty symbols — no signal
    if not event.symbols:
        return QuarantineReason.MISSING_SYMBOLS
    
    # Note: TIMESTAMP_COLLISION and LATE_ARRIVAL are detected during
    # load_sort_and_heal() and late_arrival_check() — not here.
    # classify_quarantine() is for per-event integrity only.
    return None

def late_arrival_check(event: SymbolEvent, stream_horizon: datetime) -> bool:
    """
    Returns True if this event arrived after the stream moved past it.
    stream_horizon = ts_utc of the last event already promoted.
    If event.ts_utc < stream_horizon: late arrival.
    """
    return event.ts_utc < stream_horizon
```

### Test Oracle
```python
def test_edge_events_always_emit_artifacts():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(10)]
    result = resolve_all(events)
    
    # Event 0 should emit an artifact (depth_before=0, depth_after=6)
    e0_artifacts = get_artifacts_for_event(result, events[0].event_id)
    assert len(e0_artifacts) > 0
    assert e0_artifacts[-1].depth_before == 0
    assert e0_artifacts[-1].depth_after == min(6, 9)  # 9 events after it
    
    # Event 9 (tail) should emit an artifact (depth_before=6, depth_after=0)
    e9_artifacts = get_artifacts_for_event(result, events[9].event_id)
    assert len(e9_artifacts) > 0
    assert e9_artifacts[-1].depth_after == 0  # nothing after it yet

def test_sequence_gap_reduces_depth_not_skips():
    # 10 events, delete event at position 3
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(10)]
    events_with_gap = [e for e in events if e.ts_utc != "T03"]  # 9 events
    result = resolve_all(events_with_gap)
    
    # Event at what was position 6 (now position 5 in healed seq)
    e6 = events[6]
    artifacts = get_artifacts_for_event(result, e6.event_id)
    # depth_before = 5 (not 6 — gap reduced it)
    best_artifact = max(artifacts, key=lambda a: a.maturity)
    assert best_artifact.depth_before == 5

def test_corrupt_event_quarantined_not_resolved():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(10)]
    events[5].symbols = []  # corrupt: empty symbols
    result = resolve_all(events)
    
    assert events[5].event_id in result.quarantined
    artifacts = get_artifacts_for_event(result, events[5].event_id)
    assert len(artifacts) == 0
```

---

## CONTRACT 5: MATURITY STATE MACHINE

### Invariant
An event's maturity level only increases. Maturity never decreases.
A FULL event (depth_after=6) is never re-promoted. A QUARANTINED event
is never promoted at any maturity level.

### State Machine (GRADIENT MODEL)
```
                 stream advances
                     │
INTAKE ─────────────────────────────────────► MATURING ─────────────► FULL
(written to          │ emit artifact           (emit new artifact      (emit
symbols.jsonl,       │ at depth 0-1-0          each time depth_after   artifact
depth_after=0)       │                         increases by 1)         at depth
                     │                                                  6-1-6,
                     │                                                  done)
                     │
                     ▼ (data integrity problem)
                QUARANTINED
                (never promoted)
```

**Allowed transitions (per event):**
```
INTAKE → emit(depth_after=0)            ← first artifact, immediate
MATURING → emit(depth_after=D+1)        ← when D+1 events arrive after it
MATURING → FULL via emit(depth_after=6) ← when 6 events after confirmed
```

**Forbidden:**
```
emit at depth_after=D when D < current_max_depth_after   ← blocked by idempotency gate
emit when QUARANTINED                                     ← raises PromotionStateError
emit at depth_after > 6                                   ← impossible (min(6,...))
```

**Progression skip:** In batch mode, if a stream suddenly has 10 events after
an event (e.g., loading historical data), the resolver emits ONLY the artifact
at the current maximum depth_after (not all intermediate levels). This is valid —
intermediate levels carry less information than the current maximum.

```python
# Batch mode: only emit at current achievable depth
def get_depth_after_for_event(event_idx: int, entity_events: list) -> int:
    events_after = len(entity_events) - event_idx - 1
    return min(6, events_after)

# Streaming mode: emit each increment as it arrives
# (captured by the streaming resolver's watch loop)
```

### Enforcement Mechanism
```python
def promote_event(
    event: SymbolEvent,
    depth_before: int,
    depth_after: int,
    entity_events: list[SymbolEvent],
    db: sqlite3.Connection,
    resolved_file: Path
) -> ResolvedSymbolEvent | None:
    """
    Promotes event at the specified depth. Returns artifact or None if skipped.
    """
    # Gate 1: quarantine check
    if is_quarantined(event.event_id, db):
        raise PromotionStateError(f"Event {event.event_id} is QUARANTINED")
    
    # Gate 2: max maturity check (FULL events don't get re-promoted)
    current_max = get_max_depth_after(event.event_id, db)
    if current_max >= 6:
        return None  # Already FULL — not an error, just skip
    
    # Gate 3: idempotency (exact depth already promoted)
    if not try_promote_at_depth(event.event_id, depth_before, depth_after, db):
        return None  # Already at this exact depth — skip silently
    
    # Build window at this depth
    context_before = build_context_before(event, depth_before, entity_events)
    context_after  = build_context_after(event, depth_after, entity_events)
    
    # Create artifact
    artifact = ResolvedSymbolEvent(
        resolution_id   = new_uuid(),
        original_event_id = event.event_id,
        resolved_at_ts  = now_utc(),
        latency_ms      = elapsed_ms(event.ts_utc),
        context_before  = context_before,
        current_symbols = event.symbols,
        context_after   = context_after,
        depth_before    = depth_before,
        depth_after     = depth_after,
        maturity        = (depth_before + depth_after) / 12.0
    )
    
    # Write atomically: JSONL first, then SQLite
    append_jsonl(resolved_file, artifact)
    insert_promoted_events(event.event_id, depth_before, depth_after,
                           artifact.resolution_id, db)
    
    return artifact
```

### Test Oracle
```python
def test_maturity_only_increases():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(30)]
    
    # Simulate streaming: add events one at a time
    for i in range(1, 31):
        partial_events = events[:i]
        resolve_incremental(partial_events)
    
    # For any event, its artifacts should have strictly increasing depth_after
    for event in events:
        artifacts = get_artifacts_for_event_ordered(event.event_id)
        depths = [a.depth_after for a in artifacts]
        assert depths == sorted(depths)
        assert depths == list(dict.fromkeys(depths))  # no duplicates

def test_full_event_not_re_promoted():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(20)]
    resolve_all(events)
    
    # Event at position 6 should be FULL (6-1-6)
    e6 = events[6]
    initial_count = count_artifacts_for_event(e6.event_id)
    assert get_max_depth_after(e6.event_id) == 6
    
    # Add 10 more events — e6 should NOT gain new artifacts
    more_events = events + [make_event(entity="X", ts=f"T{i:02d}") for i in range(20, 30)]
    resolve_all(more_events)
    
    assert count_artifacts_for_event(e6.event_id) == initial_count
```

---

## CONTRACT 6: STREAMING RESILIENCE (GRADIENT MODEL)

### Invariant
The streaming resolver can crash at any point and resume without data loss,
duplicate artifacts, or maturity regression. After restart, it resumes from
the correct position and continues emitting artifacts as maturity increases.

### Key Change from v1
In v1, `compute_safe_horizon()` returned -1 for <13 events, meaning nothing
could be emitted for small streams. That's wrong under the gradient model.

Under the gradient model, the first event can emit an artifact at depth 0-1-0
the moment it arrives. We emit at whatever depth is currently safe:

```python
def compute_depth_after_safe(event_idx: int, entity_events: list[SymbolEvent]) -> int:
    """
    Returns the depth_after that is SAFE to emit for entity_events[event_idx].
    
    "Safe" means: depth_after events AFTER event_idx are confirmed durably written.
    In streaming mode, we can emit depth_after=D when D events after are flushed.
    """
    events_after = len(entity_events) - event_idx - 1
    return min(6, events_after)
    # Note: returns 0 for the tail event — that's valid (0-1-0 artifact)
    # Note: returns 6 for event with 6+ confirmed-flushed events after it
```

The resolver no longer waits for 13 events before emitting anything.
Every intake event gets an immediate 0-depth_after artifact. More artifacts follow
as the stream grows.

### Late-Arrival Policy (STRICT REJECT)
An event is a "late arrival" if its ts_utc is earlier than the stream horizon:

```python
stream_horizon = max(ts_utc) of all events already promoted
```

If `incoming_event.ts_utc < stream_horizon`:
- Event is QUARANTINED as `QuarantineReason.LATE_ARRIVAL`
- Existing artifacts are NOT re-evaluated (no retroactive depth changes)
- Late arrival goes to `quarantined_events.jsonl`
- WARNING log: event_id, ts_utc, stream_horizon, delta_ms

This matches Lee's decision: strict reject. The benefit of the late arrival as
potential context for its neighbors is sacrificed to preserve stream integrity.
Retroactive resolution is only possible via manual batch re-run on the full corpus.

### Checkpoint Protocol
```json
// data/resolver_checkpoint.json
{
  "checkpoint_id": "uuid",
  "entity": "str",
  "stream_horizon_ts": "datetime",     // max ts_utc promoted so far
  "last_event_id_promoted": "str",     // event_id of last promoted event
  "total_artifacts_emitted": "int",    // cumulative artifacts written
  "total_quarantined": "int",
  "checkpoint_at": "datetime"
}
```

SQLite is authoritative. Checkpoint is advisory. If they disagree, SQLite wins.

### Crash Recovery Sequence
```
1. Crash at any point during promotion batch
2. Restart triggered
3. Read checkpoint (advisory: last known stream_horizon)
4. Scan promoted_events for actual state (authoritative)
5. Compute true stream_horizon from SQLite
6. Re-run resolver from events with ts_utc >= stream_horizon
7. Idempotency gates (Contract 3) skip already-promoted maturity levels
8. Orphaned JSONL entries → SQLite inserts replayed (content is deterministic)
9. Resume normal streaming from tail
```

### File Watch Implementation
```python
def watch_and_resolve(symbols_file: Path, poll_interval_ms: int = 500):
    stream_horizon = load_stream_horizon(db)  # resume from SQLite
    entity_buffer: dict[str, list[SymbolEvent]] = defaultdict(list)
    
    while True:
        new_events = load_new_events(symbols_file, after_horizon=stream_horizon)
        
        for event in new_events:
            entity = event.entity
            
            # Late arrival check
            if is_late_arrival(event, stream_horizon):
                quarantine(event, QuarantineReason.LATE_ARRIVAL, db)
                continue
            
            entity_buffer[entity].append(event)
            entity_buffer[entity].sort(key=lambda e: e.ts_utc)
        
        # For each affected entity, emit artifacts at current safe depth
        for entity, buff in entity_buffer.items():
            healed, collision_ids = heal_collisions(buff)
            for collision_id in collision_ids:
                quarantine_by_id(collision_id, QuarantineReason.TIMESTAMP_COLLISION, db)
            
            for idx, event in enumerate(healed):
                d_before = compute_depth_before(healed, idx)
                d_after  = compute_depth_after_safe(idx, healed)
                
                # Only emit if this depth_after is higher than current max
                if should_emit_new_artifact(event.event_id, d_after, db):
                    promote_event(event, d_before, d_after, healed, db, resolved_file)
            
            # Update stream horizon
            if healed:
                new_horizon = max(e.ts_utc for e in healed)
                stream_horizon = max(stream_horizon, new_horizon)
                update_stream_horizon(new_horizon, db)
        
        time.sleep(poll_interval_ms / 1000)
```

### Test Oracle
```python
def test_first_event_emits_immediately():
    """Single event → 0-1-0 artifact emitted immediately, no waiting."""
    events = [make_event(entity="X", ts="T01")]
    result = resolve_all(events)
    
    artifacts = get_artifacts_for_event(result, events[0].event_id)
    assert len(artifacts) == 1
    assert artifacts[0].depth_before == 0
    assert artifacts[0].depth_after == 0
    assert artifacts[0].maturity == 0.0

def test_crash_recovery_no_regression():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(30)]
    
    # Partial run — first 15 events
    write_to_symbols(events[:15])
    resolver = StreamingResolver()
    resolver.run()
    
    # Record state before crash
    pre_crash_max_depths = {e.event_id: get_max_depth_after(e.event_id)
                             for e in events[:15]}
    
    # Simulate crash
    resolver.crash()
    
    # Add remaining events
    write_to_symbols(events[15:30])
    
    # Restart + resume
    resolver2 = StreamingResolver()
    resolver2.run()
    
    # Post-crash depths should be >= pre-crash depths (never regress)
    for event_id, pre_depth in pre_crash_max_depths.items():
        post_depth = get_max_depth_after(event_id)
        assert post_depth >= pre_depth

def test_late_arrival_quarantined_no_retroactive_change():
    events = [make_event(entity="X", ts=f"T{i:02d}") for i in range(20)]
    resolve_all(events)
    
    # Record current artifact counts for events in positions 5-10
    pre_counts = {events[i].event_id: count_artifacts_for_event(events[i].event_id)
                  for i in range(5, 11)}
    
    # Inject a late arrival between T05 and T06 — arrives after stream passed T19
    late_event = make_event(entity="X", ts="T055", id="LATE")
    inject_late(late_event, symbols_file)
    
    resolve_incremental([late_event])
    
    # Late arrival quarantined
    assert is_quarantined(late_event.event_id)
    
    # Neighbors NOT retroactively changed
    for event_id, pre_count in pre_counts.items():
        assert count_artifacts_for_event(event_id) == pre_count
```

---

## CONTRACT SUMMARY TABLE (GRADIENT MODEL)

| # | Contract | Invariant | Mechanism | Violation |
|---|---|---|---|---|
| 1 | Ordering & Collision | ts_utc ascending; collisions quarantine pair, heal sequence, reduce neighbor depth | Stable sort + collision detection + sequence healing | Both colliders quarantined, neighbors get reduced depth |
| 2 | Entity Partition | Context never crosses entity boundary | Partition-first, window builder entity-scoped | Hard crash (EntityPartitionViolation) |
| 3 | Idempotency (Gradient) | No duplicate at same (event_id, depth_before, depth_after) | Composite PRIMARY KEY in SQLite | Silently skipped |
| 4 | Maturity & Quarantine | Quarantined = never promoted; edge events emit at available depth; gaps = lower depth, not skipped | classify_quarantine() + late_arrival_check() + natural depth computation | Quarantined → quarantined_events.jsonl |
| 5 | State Machine | Maturity never decreases; FULL not re-promoted; QUARANTINED not promoted | should_emit_new_artifact() gate; is_quarantined() gate | PromotionStateError |
| 6 | Streaming Resilience | Crash-safe; late arrivals strictly rejected; maturity resumes without regression | stream_horizon tracking + SQLite authority + idempotency + late_arrival_check | Recovery sequence on startup; strict quarantine for late arrivals |

---

## THE ResolvedSymbolEvent DATACLASS (REVISED)

```python
@dataclass
class ResolvedSymbolEvent:
    resolution_id:      str           # UUID — unique per (event_id, depth_before, depth_after)
    original_event_id:  str           # FK to symbols.jsonl event_id
    resolved_at_ts:     datetime      # when this artifact was created
    latency_ms:         float         # elapsed since original event ts_utc
    
    context_before:     list[str]     # depth_before × 6 symbols (0-36 total)
    current_symbols:    list[str]     # always 6 (the event's own symbols)
    context_after:      list[str]     # depth_after × 6 symbols (0-36 total)
    
    depth_before:       int           # 0-6 — how many events of before-context
    depth_after:        int           # 0-6 — how many events of after-context
    maturity:           float         # (depth_before + depth_after) / 12.0
```

A single event produces at most `6 + 1 = 7` artifacts (depth_after 0 through 6),
assuming depth_before reaches 6. Stream head events produce at most `position + 1`
artifacts for the before side plus `7` for the after side.

For 37,531 events, total artifacts across all maturity levels: roughly
37,531 × 7 (average 3.5 after-depth levels) ≈ ~130K artifacts.
At ~1KB per artifact: ~130MB for resolved_symbols.jsonl. Manageable.

---

## WHAT CLAUDE A BUILDS (after Lee approves contracts)

### Plugin: `temporal_resolver`

```
temporal_resolver/
  __init__.py             VERSION = "0.2.0"  (v2 = gradient model)
  manifest.json           mount /api/temporal_resolver
  CONTRACT.md             (points to this file, v2)
  config.py               POLL_INTERVAL_MS, WINDOW_SIZE=6, MODE, MIN_MATURITY
  
  api/
    models.py             SymbolEvent, ResolvedSymbolEvent, QuarantineReason,
                          PromotionState, ResolutionResult, Checkpoint,
                          CRSA616Input (with maturity field)
    router.py             /status /health
                          /resolve/batch           (POST — full batch resolve)
                          /resolve/status          (GET — stats: promoted, quarantined, etc)
                          /resolve/maturity-report (GET — distribution of maturity scores)
                          /quarantine              (GET — list quarantined events)
                          /checkpoint              (GET — last checkpoint)
  
  core/
    resolution_engine.py  resolve_all(), resolve_partition(),
                          load_sort_and_heal(), promote_event(),
                          compute_depth_before(), compute_depth_after_safe(),
                          should_emit_new_artifact(), build_context_before(),
                          build_context_after()
    streaming_resolver.py watch_and_resolve(), late_arrival_check(),
                          update_stream_horizon(), heal_collisions()
    quarantine.py         QuarantineReason enum, classify_quarantine(),
                          quarantine(), is_quarantined()
    state_machine.py      PromotionState, PromotionStateError,
                          try_promote_at_depth(), get_max_depth_after()
    checkpoint.py         write_checkpoint(), read_checkpoint(),
                          recover_from_crash(), load_stream_horizon()
    storage/
      jsonl_writer.py     append_resolved(), append_quarantined()
      sqlite_store.py     init_db(), try_promote_at_depth(), get_max_depth_after(),
                          should_emit_new_artifact(), update_stream_horizon(),
                          get_promotion_stats(), get_maturity_distribution()
  
  tests/
    test_contract_1_ordering.py
    test_contract_2_partition.py
    test_contract_3_idempotency_gradient.py
    test_contract_4_maturity_quarantine.py
    test_contract_5_state_machine_gradient.py
    test_contract_6_streaming_resilience_gradient.py
```

**wolf_engine imports:**
```python
# Only pattern imports — temporal_resolver owns its own SQLite DB
# IMPORT_DONT_REBUILD: use wolf_engine patterns, not wolf_engine tables
from wolf_engine.sql.sqlite_writer import SQLiteWriter   # base pattern only
```

---

## PRE-BUILD CHECKLIST (Claude A reads before writing first file)

- [ ] Lee has approved or amended all 6 contracts (v2 gradient model)
- [ ] Sandbox directory: `claude_sandbox/plugins/temporal_resolver/`
- [ ] `symbols.jsonl` actual path confirmed (Lee provides)
- [ ] `promoted_events.db` location confirmed
- [ ] `quarantined_events.jsonl` location confirmed
- [ ] `resolved_symbols.jsonl` location confirmed
- [ ] Default mode confirmed: BATCH | STREAMING | HYBRID
- [ ] Default MIN_MATURITY for CRSA-616 adapter confirmed (0.0? 0.5? 1.0?)
- [ ] Tests written BEFORE implementation (contracts are the spec)
- [ ] Window size confirmed: 6 (default) — or different?

---

*Written by [CLAUDE C] 2026-03-11*
*v1 (binary model) superseded. v2 (gradient model) is canonical.*
*These contracts are Phase 0. No code until contracts are accepted.*
