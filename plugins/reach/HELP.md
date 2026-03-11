# Reach — Channel Gateway Help

## What is Reach?

Reach lets you control your Clearbox AI workbench from wherever you are —
Discord, Telegram, Slack, X, webhooks, or custom WebSocket clients.

Your workbench stays local. Your data stays sovereign. Reach is just the remote control.

## Quick Start

1. Enable a channel in `clearbox.config.json`:
   ```json
   { "reach": { "channels": { "discord": { "enabled": true } } } }
   ```

2. Set the channel token as an environment variable:
   ```
   set REACH_DISCORD_TOKEN=your-bot-token
   ```

3. Start Clearbox — Reach starts automatically with the bridge.

4. Send a message to your bot on Discord. You'll get a pairing code.

5. Enter the pairing code at `https://127.0.0.1:5050` or via:
   ```
   POST /api/reach/pair { "code": "ABC123", "identity": "lee" }
   ```

6. You're paired. Messages now route through to your workbench.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reach/status | Channel status and pairing counts |
| GET | /api/reach/channels | List configured channels |
| POST | /api/reach/pair | Confirm a pairing code |
| DELETE | /api/reach/pair/{id} | Revoke a pairing |
| GET | /api/reach/audit | Recent audit entries |
| GET | /api/reach/help | This help (machine-readable) |

## Supported Channels

| Channel | Adapter | Token Env Var |
|---------|---------|---------------|
| Discord | discord_bot.py | REACH_DISCORD_TOKEN |
| Telegram | telegram_bot.py | REACH_TELEGRAM_TOKEN |
| Webhook (Slack/X/custom) | webhook.py | REACH_WEBHOOK_SECRET |
| WebSocket | built-in | N/A (pairing only) |

## Security

- **Pairing required by default** — unknown users get a 6-char code, must confirm locally
- **No auto-pair** — you must approve every connection from the local UI
- **Audit trail** — every message in/out logged as JSONL (content logging opt-in)
- **No cloud** — Reach forwards to your local bridge only. Nothing leaves your network.

## Config Reference

```json
{
  "reach": {
    "enabled": true,
    "bridge_url": "https://127.0.0.1:5050",
    "pairing_required": true,
    "audit_all_messages": true,
    "max_message_length": 4000,
    "channels": {
      "discord": {
        "enabled": false,
        "token_env": "REACH_DISCORD_TOKEN",
        "allowed_guilds": [],
        "pairing_required": true
      },
      "telegram": {
        "enabled": false,
        "token_env": "REACH_TELEGRAM_TOKEN",
        "allowed_chats": [],
        "pairing_required": true
      },
      "webhook": {
        "enabled": false,
        "secret_env": "REACH_WEBHOOK_SECRET",
        "allowed_origins": []
      },
      "websocket": {
        "enabled": false,
        "port": 5053,
        "pairing_required": true
      }
    }
  }
}
```
