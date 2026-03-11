# netlog — Boundary Contract
# Version: 0.1.0 | Status: ACTIVE

## What this plugin does

Full internet connection tracking using psutil.net_connections().
Per-connection events with process name, PID, local/remote address, status.
Ring buffer (10K events) for live query.
Alerts: SUSPICIOUS_PORT, NEW_PROCESS_CONNECTION, HIGH_CONNECTION_COUNT.
Optional scapy packet capture (flip PACKET_CAPTURE_ENABLED=True in config).

## What this plugin does NOT do

- Does NOT read DPI / deep packet contents
- Does NOT require admin rights for connection-level logging
  (scapy packet capture DOES require elevation — disabled by default)

## API surface

```
GET  /api/netlog/status
POST /api/netlog/session/start
POST /api/netlog/session/stop
GET  /api/netlog/connections/live     ?limit=200
GET  /api/netlog/connections/alerts   ?limit=100
POST /api/netlog/connections/query    { proc, raddr_contains, alert_type, limit }
GET  /api/netlog/session/events       ?limit=200
GET  /api/netlog/help                — machine-readable API schema (AI + dev use)
```

## Hook

- plugin_post: surfaces SUSPICIOUS_PORT / HIGH_CONNECTION_COUNT alerts into chat

## Invariants

1. Imports WorkerBase from wolf_engine — does NOT re-implement it
2. psutil required: pip install psutil
3. scapy optional: pip install scapy (only needed for packet-level capture)
4. Ring buffer never grows past MAX_EVENTS_IN_MEMORY (10K default)
