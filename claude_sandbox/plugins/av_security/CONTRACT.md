# av_security — Boundary Contract
# Version: 0.1.0 | Status: ACTIVE

## What this plugin does

Consumes fused JSONL event streams from visual_io and audio_io sessions.
Runs Operator #18 (AV Correlation Detector) + SilentVisualOperator.
Detects: PHANTOM_AUDIO, SILENT_VISUAL, DELAYED_CORRELATION (>70ms), DIRECTION_MISMATCH.

## What this plugin does NOT do

- Does NOT capture audio or video itself (see audio_io, visual_io)
- Does NOT run in a continuous worker loop
- Analysis is on-demand via POST /correlate

## API surface

```
GET  /api/av_security/status
POST /api/av_security/correlate     { visual_session_dir, audio_session_dir }
GET  /api/av_security/findings
GET  /api/av_security/findings/summary
GET  /api/av_security/help             — machine-readable API schema (AI + dev use)
```

## Hooks

- plugin_pre:  injects high-confidence findings (>=0.75) into LLM context
- plugin_post: adds finding count to contributions

## Invariants

1. Requires wolf_engine.evidence.fusion.read_fused_events — does NOT re-implement it
2. No capture workers — analysis only
3. Correlation window: 100ms (configurable in config.py)
