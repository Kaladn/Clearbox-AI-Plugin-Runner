"""
Regime Change Detector
Identifies behavioral regime shifts in financial assets using 6-1-6 causal consistency.

A "regime" is a sustained period where an asset's causal structure stays within a
consistent behavioral band. A "regime change" is the transition point where the
asset shifts from one behavioral state to another.

This layer sits ON TOP of the existing causal_analyzer + pattern_detector.
It does NOT replace them — it consumes their output.

Regime types (from causal consistency bands):
  ORDERED   : consistency > 0.6  — predictable, institutional behavior
  MODERATE  : 0.4 < consistency <= 0.6 — mixed signals, transitional
  VOLATILE  : 0.25 < consistency <= 0.4 — weak causal structure, reactive
  CHAOTIC   : consistency <= 0.25 — no causal structure, pure speculation

A regime change occurs when the rolling average consistency crosses a band boundary
and STAYS in the new band for at least `min_regime_days`.
"""

import numpy as np
from dataclasses import dataclass, field, asdict
from typing import List, Optional
from datetime import datetime


# --- Regime classification bands ---

REGIME_BANDS = {
    "ORDERED":  (0.6, 1.0),
    "MODERATE": (0.4, 0.6),
    "VOLATILE": (0.25, 0.4),
    "CHAOTIC":  (0.0, 0.25),
}

REGIME_COLORS = {
    "ORDERED":  "#06A77D",  # green
    "MODERATE": "#F77F00",  # orange
    "VOLATILE": "#D62828",  # red
    "CHAOTIC":  "#4A0E4E",  # purple
}

REGIME_RISK = {
    "ORDERED":  "LOW",
    "MODERATE": "MEDIUM",
    "VOLATILE": "HIGH",
    "CHAOTIC":  "EXTREME",
}


@dataclass
class Regime:
    """A sustained behavioral period."""
    regime_type: str          # ORDERED / MODERATE / VOLATILE / CHAOTIC
    start_date: str
    end_date: str
    start_index: int
    end_index: int
    duration_days: int
    avg_consistency: float
    avg_volatility: float
    pattern_breaks_in_regime: int
    anomalies_in_regime: int
    risk: str

    def to_dict(self):
        return asdict(self)


@dataclass
class RegimeChange:
    """A transition point between two regimes."""
    date: str
    index: int
    from_regime: str
    to_regime: str
    consistency_before: float   # avg consistency in the N days before
    consistency_after: float    # avg consistency in the N days after
    delta: float                # signed change in consistency
    severity: str               # MINOR / MAJOR / CRITICAL
    price_at_change: float
    volume_at_change: int
    nearest_pattern_break: Optional[str] = None  # date of closest pattern break

    def to_dict(self):
        return asdict(self)


@dataclass
class RegimeAnalysis:
    """Complete regime analysis result."""
    ticker: str
    period_start: str
    period_end: str
    total_days: int
    regimes: List[Regime]
    regime_changes: List[RegimeChange]
    current_regime: str
    regime_stability: float       # % of time in longest regime
    total_regime_changes: int
    avg_regime_duration: float
    dominant_regime: str           # most time spent
    regime_distribution: dict     # % time in each regime type

    def to_dict(self):
        d = asdict(self)
        return d


def classify_regime(consistency: float) -> str:
    """Classify a consistency value into a regime band."""
    for name, (lo, hi) in REGIME_BANDS.items():
        if lo < consistency <= hi or (name == "CHAOTIC" and consistency <= hi):
            return name
    return "CHAOTIC"


class RegimeDetector:
    """
    Detects regime changes from 6-1-6 causal analysis output.

    Consumes: capsules, causal_results, patterns (from existing modules).
    Produces: RegimeAnalysis with regimes, transitions, and statistics.
    """

    def __init__(self, config: dict):
        self.rolling_window = config.get("regime_rolling_window", 10)
        self.min_regime_days = config.get("min_regime_days", 5)
        self.change_lookback = config.get("regime_change_lookback", 5)

    def detect(self, capsules: list, causal_results: dict,
               patterns: dict, ticker: str) -> RegimeAnalysis:
        """
        Run full regime detection.

        Args:
            capsules: from CapsuleBuilder.build()
            causal_results: from CausalAnalyzer.analyze()
            patterns: from PatternDetector.detect()
            ticker: asset symbol

        Returns:
            RegimeAnalysis with all regimes and transitions
        """
        if len(capsules) < self.rolling_window:
            raise ValueError(f"Need at least {self.rolling_window} capsules for regime detection")

        # Step 1: compute rolling consistency
        raw_consistency = [causal_results[c["index"]]["consistency"] for c in capsules]
        rolling_avg = self._rolling_mean(raw_consistency, self.rolling_window)

        # Step 2: classify each day into a regime band
        regime_labels = [classify_regime(v) for v in rolling_avg]

        # Step 3: segment into regimes (merge short runs)
        regimes = self._segment_regimes(capsules, regime_labels, rolling_avg, patterns)

        # Step 4: identify regime change points
        regime_changes = self._find_regime_changes(
            regimes, capsules, rolling_avg, patterns
        )

        # Step 5: compute summary statistics
        analysis = self._build_analysis(ticker, capsules, regimes, regime_changes, regime_labels)
        return analysis

    # --- internal helpers ---

    def _rolling_mean(self, values: list, window: int) -> list:
        """Compute rolling mean, padding the front with expanding window."""
        result = []
        for i in range(len(values)):
            start = max(0, i - window + 1)
            result.append(float(np.mean(values[start:i + 1])))
        return result

    def _segment_regimes(self, capsules, labels, rolling_avg, patterns) -> List[Regime]:
        """Segment the timeline into contiguous regimes."""
        if not labels:
            return []

        # Build pattern break dates set for fast lookup
        pb_dates = {pb["date"] for pb in patterns.get("pattern_breaks", [])}
        anomaly_dates = {a["date"] for a in patterns.get("anomalies", [])}

        regimes = []
        seg_start = 0
        current_label = labels[0]

        for i in range(1, len(labels)):
            if labels[i] != current_label:
                # Close current segment
                regimes.append(self._make_regime(
                    capsules, seg_start, i - 1, current_label,
                    rolling_avg, pb_dates, anomaly_dates
                ))
                seg_start = i
                current_label = labels[i]

        # Close final segment
        regimes.append(self._make_regime(
            capsules, seg_start, len(labels) - 1, current_label,
            rolling_avg, pb_dates, anomaly_dates
        ))

        # Merge tiny regimes (< min_regime_days) into neighbors
        regimes = self._merge_tiny_regimes(regimes, capsules, rolling_avg, pb_dates, anomaly_dates)

        return regimes

    def _make_regime(self, capsules, start_i, end_i, label, rolling_avg,
                     pb_dates, anomaly_dates) -> Regime:
        """Create a Regime object for a contiguous segment."""
        duration = end_i - start_i + 1
        seg_consistency = rolling_avg[start_i:end_i + 1]
        seg_volatility = [abs(capsules[i]["price_change"]) for i in range(start_i, end_i + 1)]

        pb_count = sum(1 for i in range(start_i, end_i + 1)
                       if capsules[i]["date"] in pb_dates)
        anomaly_count = sum(1 for i in range(start_i, end_i + 1)
                            if capsules[i]["date"] in anomaly_dates)

        return Regime(
            regime_type=label,
            start_date=capsules[start_i]["date"],
            end_date=capsules[end_i]["date"],
            start_index=start_i,
            end_index=end_i,
            duration_days=duration,
            avg_consistency=float(np.mean(seg_consistency)),
            avg_volatility=float(np.mean(seg_volatility)) if seg_volatility else 0.0,
            pattern_breaks_in_regime=pb_count,
            anomalies_in_regime=anomaly_count,
            risk=REGIME_RISK.get(label, "UNKNOWN"),
        )

    def _merge_tiny_regimes(self, regimes, capsules, rolling_avg,
                            pb_dates, anomaly_dates) -> List[Regime]:
        """Absorb regimes shorter than min_regime_days into the preceding regime."""
        if len(regimes) <= 1:
            return regimes

        merged = [regimes[0]]
        for r in regimes[1:]:
            if r.duration_days < self.min_regime_days:
                # Extend previous regime to absorb this one
                prev = merged[-1]
                merged[-1] = self._make_regime(
                    capsules, prev.start_index, r.end_index, prev.regime_type,
                    rolling_avg, pb_dates, anomaly_dates
                )
            else:
                merged.append(r)

        return merged

    def _find_regime_changes(self, regimes, capsules, rolling_avg,
                             patterns) -> List[RegimeChange]:
        """Identify transition points between regimes."""
        if len(regimes) < 2:
            return []

        pb_dates = [pb["date"] for pb in patterns.get("pattern_breaks", [])]
        changes = []

        for i in range(1, len(regimes)):
            prev_r = regimes[i - 1]
            curr_r = regimes[i]

            change_idx = curr_r.start_index
            capsule = capsules[change_idx]

            # Consistency before/after
            lb = self.change_lookback
            before_slice = rolling_avg[max(0, change_idx - lb):change_idx]
            after_slice = rolling_avg[change_idx:change_idx + lb]
            c_before = float(np.mean(before_slice)) if before_slice else 0.0
            c_after = float(np.mean(after_slice)) if after_slice else 0.0
            delta = c_after - c_before

            # Severity
            abs_delta = abs(delta)
            if abs_delta > 0.2:
                severity = "CRITICAL"
            elif abs_delta > 0.1:
                severity = "MAJOR"
            else:
                severity = "MINOR"

            # Nearest pattern break
            nearest_pb = None
            change_date = capsule["date"]
            if pb_dates:
                nearest_pb = min(pb_dates, key=lambda d: abs(
                    _date_diff(d, change_date)
                ))
                if abs(_date_diff(nearest_pb, change_date)) > 10:
                    nearest_pb = None  # too far away to be related

            changes.append(RegimeChange(
                date=change_date,
                index=change_idx,
                from_regime=prev_r.regime_type,
                to_regime=curr_r.regime_type,
                consistency_before=c_before,
                consistency_after=c_after,
                delta=delta,
                severity=severity,
                price_at_change=capsule["anchor"]["close"],
                volume_at_change=capsule["anchor"]["volume"],
                nearest_pattern_break=nearest_pb,
            ))

        return changes

    def _build_analysis(self, ticker, capsules, regimes, regime_changes,
                        regime_labels) -> RegimeAnalysis:
        """Compile final RegimeAnalysis."""
        total_days = len(capsules)

        # Distribution: % time in each regime type
        dist = {}
        for rtype in REGIME_BANDS:
            days_in = sum(r.duration_days for r in regimes if r.regime_type == rtype)
            dist[rtype] = round(days_in / total_days * 100, 1) if total_days > 0 else 0

        # Dominant regime
        dominant = max(dist, key=dist.get) if dist else "UNKNOWN"

        # Longest regime
        longest = max(regimes, key=lambda r: r.duration_days) if regimes else None
        stability = (longest.duration_days / total_days * 100) if longest and total_days > 0 else 0

        # Average regime duration
        avg_duration = float(np.mean([r.duration_days for r in regimes])) if regimes else 0

        return RegimeAnalysis(
            ticker=ticker,
            period_start=capsules[0]["date"] if capsules else "",
            period_end=capsules[-1]["date"] if capsules else "",
            total_days=total_days,
            regimes=regimes,
            regime_changes=regime_changes,
            current_regime=regimes[-1].regime_type if regimes else "UNKNOWN",
            regime_stability=round(stability, 1),
            total_regime_changes=len(regime_changes),
            avg_regime_duration=round(avg_duration, 1),
            dominant_regime=dominant,
            regime_distribution=dist,
        )


def _date_diff(d1: str, d2: str) -> int:
    """Return signed difference in days between two date strings."""
    try:
        dt1 = datetime.strptime(d1, "%Y-%m-%d")
        dt2 = datetime.strptime(d2, "%Y-%m-%d")
        return (dt1 - dt2).days
    except (ValueError, TypeError):
        return 999
