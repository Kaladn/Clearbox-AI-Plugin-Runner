# audio_io — Boundary Contract
# Version: 0.1.0 | Status: ACTIVE

## What this plugin does

Live mic/speaker capture with MFCC fingerprinting, heuristic sound classification,
and ILD (Interaural Level Difference) stereo direction analysis.
Captures stereo audio via sounddevice, computes 13-coefficient MFCC fingerprints
via librosa, classifies sound type (footstep/gunshot/hitmarker/speech/misc) using
threshold-based heuristics, measures direction from stereo level difference.
Emits EvidenceEvents as JSONL via wolf_engine WorkerBase pattern.

## What this plugin does NOT do

- NO machine learning models of any kind
- NO speech-to-text or transcription
- NO external audio AI services
- Does not capture screen (see visual_io)
- Does not do AV correlation (see av_security)

## Architecture

```
AudioWorker (WorkerBase subclass)
  └── runs in daemon thread, one chunk per interval (~93ms at 44.1kHz)
  └── captures stereo via sounddevice InputStream
  └── computes MFCC fingerprint (13 coefficients via librosa, fallback to basic RMS)
  └── classifies sound_type via threshold heuristics:
        footstep:  50-150ms duration, 500-2000Hz centroid, 0.1-0.6 RMS
        gunshot:   10-60ms duration, 2000-8000Hz centroid, 0.4-1.0 RMS
        hitmarker: 20-80ms duration, 4000-12000Hz centroid, 0.3-0.8 RMS
        speech:    100-2000ms duration, 300-3000Hz centroid, 0.05-0.5 RMS
  └── computes ILD direction: -90° (left) to +90° (right)
  └── emits EvidenceEvent → JSONL via write_safe()
  └── Operators registered per session:
        FootstepDirectionOperator (Op#17) — ILD vs visual direction mismatch
        SoundClassifierOperator — surfaces gunshot/hitmarker detections

Operators extend wolf_engine WolfModule (category="operator")
Workers extend wolf_engine WorkerBase
Session lifecycle via wolf_engine EvidenceSessionManager
```

## Config (config.py)

```
SAMPLE_RATE:    44100
CHANNELS:       2 (stereo required for ILD)
CHUNK_SAMPLES:  4096 (~93ms per chunk)
N_MFCC:         13
DEVICE_INDEX:   None (system default)
SIMILARITY_THRESHOLD: 0.95 (cosine sim for duplicate detection)
DIRECTION_MISMATCH_THRESHOLD_DEG: 60.0
```

## API surface (Bridge port 5050)

```
GET  /api/audio_io/status          — worker status, event count
GET  /api/audio_io/health          — health check
POST /api/audio_io/session/start   { "label": "...", "device_index": null }
POST /api/audio_io/session/stop
GET  /api/audio_io/session/events  ?limit=50
GET  /api/audio_io/latest          — most recent audio event
GET  /api/audio_io/operators       — registered operator list
GET  /api/audio_io/help            — machine-readable API schema (AI + dev use)
```

## Hook

- plugin_post: injects gunshot/hitmarker/footstep detections into chat contributions

## Invariants

1. Only writes to session JSONL via write_safe() — never direct file writes
2. No hardcoded model names — no models at all
3. No network calls — fully local
4. Worker stops cleanly on plugin stop (daemon thread, stream closed)
5. librosa optional — falls back to basic RMS if not installed
6. sounddevice required — errors logged if not installed, no crash
7. Near-silence chunks (RMS < 0.001) are silently skipped
