# visual_io — Boundary Contract
# Version: 0.1.0 | Status: ACTIVE

## What this plugin does

Continuous screen capture worker using Lee's Screen Vector Engine (SVE).
Captures frames via mss, downsamples to 32×32 symbolic grid (ARC-style 0-9 palette),
builds ScreenVectorState (entropy, symmetry, directional vectors, anomaly flags),
emits EvidenceEvents as JSONL via wolf_engine WorkerBase pattern.

## What this plugin does NOT do

- NO YOLO
- NO OpenCV
- NO external vision libraries
- Does not process audio (see audio_io)
- Does not do AV correlation (see av_security)

## Architecture

```
VisualWorker (WorkerBase subclass)
  └── runs in daemon thread at configured FPS
  └── captures via mss (cross-platform screen capture)
  └── downsamples to 32x32 grid via numpy 2D average pooling
  └── quantizes to 0-9 discrete palette
  └── builds ScreenVectorState:
        CoreBlock (2x2 center crosshair)
        4 directional sectors (UP/DOWN/LEFT/RIGHT)
        8-direction ray vectors (gradient_change, entropy)
        AnomalyMetrics (global_entropy, symmetry, anomaly_flags)
  └── emits EvidenceEvent → JSONL via write_safe()
  └── Operators registered per session:
        VectorOperator — directional anomaly detection
        EntropyOperator — entropy spike detection

Operators extend wolf_engine WolfModule (category="operator")
Workers extend wolf_engine WorkerBase
Session lifecycle via wolf_engine EvidenceSessionManager
```

## API surface (Bridge port 5050)

```
GET  /api/visual_io/status         — worker status, event count, fps
POST /api/visual_io/session/start  { "label": "..." }
POST /api/visual_io/session/stop
GET  /api/visual_io/session/events { "limit": 50 }
GET  /api/visual_io/frame/latest   — most recent ScreenVectorState
GET  /api/visual_io/operators      — registered operator list
GET  /api/visual_io/help           — machine-readable API schema (AI + dev use)
POST /api/visual_io/config         — update fps, grid_size, capture_region
```

## Invariants

1. Only writes to session JSONL via write_safe() — never direct file writes
2. No hardcoded model names
3. No network calls — fully local
4. Worker stops cleanly on plugin stop (daemon thread joins)
5. Plugin can run with no active session — returns empty state, not error
