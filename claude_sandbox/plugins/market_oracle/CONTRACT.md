# market_oracle — Boundary Contract
# Version: 1.0.0 | Status: ACTIVE

## What this plugin does

6-1-6 financial cognitive substrate analysis.
Fetches historical market data via yfinance, builds temporal capsules
(6 prev + 1 anchor + 6 next positions), runs bidirectional causal
validation, detects pattern breaks and causal chains, classifies
behavioral regimes from rolling consistency bands, stores results
in SQLite. No ML models. No embeddings. Count-based deterministic analysis.

## What this plugin does NOT do

- NO machine learning models of any kind
- NO Neo4j or graph database
- NO hardcoded model names
- Does not stream live prices — batch analysis only
- Does not provide investment advice
- Does not touch wolf_engine (standalone — no CRSA-616 dependency at runtime)

## Architecture

```
MarketOraclePlugin (market_oracle.py)
  Orchestrates the full pipeline. All config overridable per-run.
  Standalone: works without Clearbox. Hybrid: mounts via bridge when Clearbox present.

Pipeline (in order):
  MarketFetcher.fetch(ticker, period)
    → list[{date, open, high, low, close, volume}]
  DataValidator.validate(market_data)
    → bool (min 10 days, required fields, high >= low, close > 0)
  CapsuleBuilder.build(market_data)
    → list[capsule]
    capsule = {index, date, anchor, prev_positions, next_positions,
               price_change, volume_change, ncv_73}
    ncv_73 populated by CausalAnalyzer
  CausalAnalyzer.analyze(capsules)
    → dict[index → {consistency, ncv_73, backward_score, forward_score}]
    NCV-73: 36 prev dims + 1 anchor dim + 36 next dims = 73 total
    consistency = (backward_score + forward_score) / 2
  PatternDetector.detect(capsules, causal_results)
    → {pattern_breaks: [{date, change, type}],
       causal_chains: [{start, end, length}],
       anomalies: [{date, consistency, price_change}]}
    pattern_breaks: |price_change| > pattern_break_threshold
    causal_chains: consistency >= causal_consistency_high for >= min_chain_length days
    anomalies: consistency < causal_consistency_low
  MetricsCalculator.calculate(capsules, causal_results, patterns)
    → {avg_consistency, avg_volatility, pattern_break_rate, anomaly_rate,
       num_pattern_breaks, num_causal_chains, num_anomalies,
       verdict, risk, grade}
    verdict/grade from consistency bands matching REGIME_BANDS
  RegimeDetector.detect(capsules, causal_results, patterns, ticker)
    → RegimeAnalysis
    Regime types: ORDERED (>0.6) | MODERATE (0.4-0.6) | VOLATILE (0.25-0.4) | CHAOTIC (<0.25)
    Regime risk:  LOW | MEDIUM | HIGH | EXTREME
    Change severity: MINOR (<0.1 delta) | MAJOR (0.1-0.2) | CRITICAL (>0.2)
  ReportGenerator.generate(...)
    → str (absolute path to .md report file)
  VisionChart.create(...)
    → str (absolute path to .png chart file)
  OracleStore.save_analysis(...) + save_trading_days(...)
    → int (analysis_id in SQLite)
```

## Config structure (DEFAULT_CONFIG in market_oracle.py)

```python
{
    "analysis": {
        "default_period": "2y",
        "pattern_break_threshold": 5.0,   # % price change = pattern break
        "causal_consistency_high": 0.7,   # threshold for causal chain detection
        "causal_consistency_low": 0.3,    # threshold for anomaly detection
        "min_chain_length": 5,            # min days to count as causal chain
        "capsule_prev_positions": 6,      # N in N-1-N (prev)
        "capsule_next_positions": 6,      # N in N-1-N (next)
    },
    "regime": {
        "regime_rolling_window": 10,      # days for rolling consistency average
        "min_regime_days": 5,             # min days before a regime is real
        "regime_change_lookback": 5,      # days before/after to measure delta
    },
    "output": {
        "reports_dir": "~/.clearbox/market_oracle/reports",  # absolute path
        "charts_dir":  "~/.clearbox/market_oracle/charts",   # absolute path
        "chart_dpi": 300,
        "chart_width": 16,
        "chart_height": 12,
    }
}
```

All values overridable per-run via `plugin.analyze(ticker, **overrides)`.

## API surface (Bridge port 5050)

```
POST /api/market_oracle/analyze
  Body: { "tickers": ["MSFT"], "config": { "period": "2y", ... } }
  Returns: single analysis result OR comparison result (2+ tickers)

POST /api/market_oracle/history
  Body: { "ticker": "MSFT", "limit": 20 }
  Returns: { "history": [analysis rows from SQLite] }

POST /api/market_oracle/regimes
  Body: { "analysis_id": 42 }
  Returns: { "regimes": [...], "changes": [...] }

GET  /api/market_oracle/config
  Returns: current DEFAULT_CONFIG + available periods + regime band definitions

GET  /api/market_oracle/help
  Returns: machine-readable API schema (all endpoints, params, return shapes)
```

## Storage (SQLite at ~/.clearbox/market_oracle.db)

Tables: analyses, regimes, regime_changes, trading_days
WAL mode. Foreign keys enforced. Indexes on ticker, analysis_id.
Safe to delete and rebuild — all data regenerable from yfinance.

## Invariants

1. No LLM calls. No model calls. Ever.
2. No Neo4j. SQLite only.
3. All file output paths are absolute (anchored to ~/.clearbox/market_oracle/)
4. Standalone: MarketOraclePlugin works without Clearbox bridge
5. Hybrid: api.py + ROUTES mounts it into Clearbox bridge
6. No mutation of input data — market_data is read-only after fetch
7. NCV-73 is always exactly 73 dimensions (padded with 0.0 if < 6 positions)
8. RegimeDetector requires >= regime_rolling_window capsules (raises ValueError if not)
9. analyze() returns {"error": "..."} on fetch failure or validation failure — never raises
10. compare() runs analyze() per ticker — errors isolated per ticker
