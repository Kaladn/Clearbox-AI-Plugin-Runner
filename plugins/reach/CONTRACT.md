# Reach Plugin Boundary Contract

**Version:** reach_message@1
**Status:** FROZEN. Reach is a gateway, not a processor.

## What Reach Is

Reach is the channel gateway for Clearbox AI Studio. It lets you control
your sovereign local workbench from wherever you are comfortable —
Discord, Telegram, Slack, X, webhooks, or custom WebSocket clients.

Reach is NOT the product. Clearbox is the product. Reach is the remote control.

## Architecture

```
External Channel (Discord/Telegram/Webhook/WebSocket)
    │
    ▼
Channel Adapter (thin protocol handler)
    │
    ▼
Message Bus (normalize → authenticate → dispatch)
    │
    ▼
Clearbox Bridge API (159 endpoints, HTTPS, existing infrastructure)
    │
    ▼
Response flows back through same path
    │
    ▼
Channel Adapter (format → send)
```

## Message Envelope (reach_message@1)

Canonical format for all inbound messages, regardless of channel:

```json
{
  "schema_version": "reach_message@1",
  "message_id": "rm_<hex16>",
  "timestamp_utc": "2026-03-11T08:46:00Z",
  "channel": "discord|telegram|webhook|websocket",
  "channel_message_id": "<platform-native-id>",
  "channel_user_id": "<platform-native-user-id>",
  "clearbox_identity": "<paired-clearbox-user-id or null>",
  "paired": true,
  "text": "user message text",
  "attachments": [],
  "session_id": "<clearbox-session-id or null>"
}
```

## Response Envelope (reach_response@1)

```json
{
  "schema_version": "reach_response@1",
  "message_id": "rm_<hex16>",
  "in_reply_to": "<original reach_message_id>",
  "timestamp_utc": "2026-03-11T08:46:01Z",
  "channel": "discord",
  "text": "response text",
  "grounded": true,
  "citations": [],
  "bridge_endpoint": "/api/chat/send",
  "bridge_status": 200
}
```

## Security Model

### Pairing (default: required)

1. Unknown user sends message on any channel
2. Reach replies with a 6-character pairing code
3. User enters code in Clearbox UI (localhost:8080) or via bridge API
4. Pairing record stored locally with channel_user_id → clearbox_identity mapping
5. All future messages from that channel_user_id are authenticated

### What Reach Must NEVER Do

1. Reach never processes queries itself — it forwards to the bridge
2. Reach never stores conversation history — the bridge owns sessions
3. Reach never exposes bridge credentials to channel APIs
4. Reach never sends messages without audit logging
5. Reach never auto-pairs — user must confirm via local UI
6. Reach never forwards to external services — sovereign local only

## Audit Trail

Every message in and every response out is logged as JSONL:

```
reach_audit_{YYYY-MM-DD}.jsonl
```

Fields: message_id, channel, channel_user_id, clearbox_identity,
direction (inbound|outbound), timestamp_utc, bridge_endpoint, bridge_status.

No message content is logged by default. Content logging is opt-in
via `audit_content: true` in config.

## Channel Adapters

Each adapter is a thin protocol handler. It knows:
- How to receive messages from its platform
- How to send messages back
- How to format responses for its platform (markdown, embeds, etc.)
- Nothing else

Adapters do NOT make decisions. The bridge makes decisions.

## Kill Switches (clearbox.config.json)

```json
{
  "reach": {
    "enabled": true,
    "channels": {
      "discord": { "enabled": false },
      "telegram": { "enabled": false },
      "webhook": { "enabled": false },
      "websocket": { "enabled": false }
    }
  }
}
```

Any channel can be killed independently. `reach.enabled: false` kills all channels.

## API Endpoints

```
GET  /api/reach/status          — Channel status and pairing counts
GET  /api/reach/channels        — List configured channels
POST /api/reach/pair            — Confirm a pairing code
DELETE /api/reach/pair/{id}     — Revoke a pairing
GET  /api/reach/audit           — Recent audit entries
GET  /api/reach/help            — Machine-readable API schema
```

## Implementation Files

```
reach/
  __init__.py                   Package init, VERSION
  manifest.json                 Plugin manifest
  config.py                     Config loader
  CONTRACT.md                   This file
  HELP.md                       Human + AI readable help

  bus/
    message.py                  Canonical message/response envelopes
    dispatcher.py               Normalize → authenticate → forward to bridge
    audit.py                    JSONL audit writer

  channels/
    base.py                     Abstract channel adapter
    discord_bot.py              Discord bot adapter
    telegram_bot.py             Telegram bot adapter
    webhook.py                  Generic webhook (Slack, X, custom)

  security/
    pairing.py                  Pairing code generation and verification
    identity.py                 Channel user → Clearbox identity mapping

  api/
    router.py                   FastAPI management routes
    models.py                   Pydantic request/response models
```

## Frozen IDs

- `message_id` format: `rm_{uuid4.hex[:16]}` — FROZEN
- `pairing_code` format: 6 uppercase alphanumeric chars — FROZEN
- Audit filename: `reach_audit_{YYYY-MM-DD}.jsonl` — FROZEN
- Schema versions: `reach_message@1`, `reach_response@1` — FROZEN
