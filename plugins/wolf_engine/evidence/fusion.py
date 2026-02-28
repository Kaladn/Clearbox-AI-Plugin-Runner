"""
Telemetry Fusion — Merges JSONL streams from multiple workers into a
single time-ordered fused event stream.

Reads all *_events.jsonl files in a session directory, sorts by
wall_clock timestamp (with monotonic_ns tiebreaker for same-node events),
and writes fused_events.jsonl.

Can run as a one-shot merge or as a live watcher that re-merges
periodically.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any

from wolf_engine.evidence.timebase import EvidenceEvent

logger = logging.getLogger(__name__)


def fuse_session(session_dir: str) -> list[EvidenceEvent]:
    """
    One-shot fusion: read all *_events.jsonl in session_dir,
    sort by timestamp, write fused_events.jsonl.

    Returns the sorted list of EvidenceEvents.
    """
    session_path = Path(session_dir)
    all_events: list[EvidenceEvent] = []

    # Read all worker JSONL files (skip fused output itself)
    for jsonl_file in session_path.glob("*_events.jsonl"):
        if jsonl_file.name == "fused_events.jsonl":
            continue
        try:
            with open(jsonl_file, "r", encoding="utf-8") as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        event = EvidenceEvent.from_dict(data)
                        all_events.append(event)
                    except (json.JSONDecodeError, KeyError) as exc:
                        logger.warning(
                            "Skipping malformed line %d in %s: %s",
                            line_num, jsonl_file.name, exc,
                        )
        except OSError as exc:
            logger.error("Failed to read %s: %s", jsonl_file, exc)

    # Sort by timestamp (wall_clock primary, monotonic_ns tiebreaker)
    all_events.sort(key=lambda e: e.timestamp)

    # Write fused output
    fused_path = session_path / "fused_events.jsonl"
    with open(fused_path, "w", encoding="utf-8") as f:
        for event in all_events:
            f.write(json.dumps(event.to_dict(), default=str) + "\n")

    logger.info(
        "Fused %d events from %s into fused_events.jsonl",
        len(all_events), session_dir,
    )
    return all_events


def read_fused_events(session_dir: str) -> list[EvidenceEvent]:
    """Read the fused_events.jsonl from a session directory."""
    fused_path = Path(session_dir) / "fused_events.jsonl"
    if not fused_path.exists():
        return []

    events = []
    with open(fused_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    events.append(EvidenceEvent.from_dict(json.loads(line)))
                except (json.JSONDecodeError, KeyError):
                    continue
    return events


class FusionWatcher:
    """
    Periodically re-fuses a session directory as new events arrive.

    Runs in a background thread. Stops when stop() is called.
    """

    def __init__(self, session_dir: str, interval_sec: float = 10.0):
        self.session_dir = session_dir
        self.interval_sec = interval_sec
        self._running = False
        self._thread: threading.Thread | None = None
        self._last_fuse_count = 0

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(
            target=self._loop, name="fusion-watcher", daemon=True
        )
        self._thread.start()
        logger.info("FusionWatcher started for %s", self.session_dir)

    def stop(self) -> int:
        """Stop the watcher. Returns total fused events from last run."""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=self.interval_sec + 2)
        return self._last_fuse_count

    def _loop(self) -> None:
        while self._running:
            try:
                events = fuse_session(self.session_dir)
                self._last_fuse_count = len(events)
            except Exception as exc:
                logger.error("FusionWatcher error: %s", exc)
            time.sleep(self.interval_sec)

    @property
    def last_fuse_count(self) -> int:
        return self._last_fuse_count
