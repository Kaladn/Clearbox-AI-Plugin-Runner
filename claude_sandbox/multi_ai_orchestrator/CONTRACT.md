# multi_ai_orchestrator — Boundary Contract
# Version: 1.0.0 | Status: ACTIVE | Location: claude_sandbox/multi_ai_orchestrator/

## What this plugin does

VSCode WebviewPanel extension. Up to 10 conversation nodes, each assigned a
slot type (HUMAN or LLM). Two orchestration modes: HUB (Lee dispatches manually)
and CHAIN (sequential auto-handoff between nodes). Every turn written to disk
immediately on completion — append-only JSONL, full fidelity, no summarization.

LLM calls go through VSCode's vscode.lm API, user-configured extension exports,
or user-configured local HTTP endpoints only. Zero direct company API calls.
No API keys stored or injected by this plugin.

## What this plugin does NOT do

- NO direct calls to OpenAI, Anthropic, Google, or any external API
- NO API key storage or injection
- NO model names hardcoded anywhere
- NO summarization or compacting of conversation history
- Does NOT require Clearbox bridge to run (standalone VSCode extension)
- Does NOT make any turn record immutable by rewriting — append-only only
- Does NOT cross-sync nodes automatically unless Lee sets chain_target

## Architecture

```
VSCode Extension (extension.js)
  └── WebviewPanel → ui/multi_ai_panel.html
        WebView ↔ Extension via postMessage protocol (see HELP.md)

  Provider tiers (tried in order per node):
    TIER 1: vscode.lm API     — any registered VSCode LM provider (Copilot, etc.)
    TIER 2: Extension exports — user-configured extension ID + method
    TIER 3: Local HTTP only   — localhost/LAN only, hard-guarded by isLocalUrl()
    HUMAN:  No LLM call       — Lee types the assistant response

  Session storage (storage/session_store.js):
    ~/.clearbox/multi_ai/sessions/
      index.jsonl                  — one line per session, fast listing
      {session_id}/
        meta.json                  — node config snapshot at session start
        turns.jsonl                — append-only, one JSON per line, every turn
        config_changes.jsonl       — node config changes mid-session
        session_notes.md           — optional Lee-written notes (never auto-written)

  Optional Clearbox bridge mount (api/multi_ai_api.py):
    POST /api/multi_ai/chat
    GET  /api/multi_ai/sessions
    GET  /api/multi_ai/session/{id}
    GET  /api/multi_ai/help
```

## Node slot types

```
HUMAN  — Lee types the assistant response. No LLM fired. Chain pauses here always.
LLM    — Provider selected from discovered list. vscode.lm, ext export, or local HTTP.
```

## Orchestration modes

```
HUB    — Lee dispatches from orchestrator bar. No auto-wiring between nodes.
CHAIN  — Nodes have chain_target. Output of node N → input of node chain_target.
         PREVIEW_FIRST (default): injects text, waits for Lee to confirm.
         AUTO: fires next node immediately on completion.
         HUMAN nodes always pause chain regardless of chain_mode setting.
```

## Session turn record (full fidelity — every field always written)

```json
{
  "session_id":       "20260311_143022_strategist_run",
  "turn_id":          "uuid-v4",
  "seq":              1,
  "timestamp":        "2026-03-11T14:30:22.451Z",
  "node_id":          1,
  "node_label":       "Strategist",
  "slot_type":        "LLM",
  "provider_tier":    "lm_api",
  "provider_display": "Copilot / gpt-4o",
  "role":             "user",
  "content":          "full message text — never truncated",
  "source":           "manual",
  "chain_from_node":  null,
  "char_count":       142,
  "context_prefix_hash": "sha256-first8"
}
```

## Invariants

1.  turns.jsonl is append-only — never rewritten, never truncated
2.  Every turn written to disk BEFORE chain propagates to next node
3.  HUMAN slot: chain_mode forced to PREVIEW_FIRST — chain never skips a human turn
4.  isLocalUrl() hard guard on Tier 3 — rejects any non-localhost/LAN URL
5.  No model names hardcoded — discovered via vscode.lm at activation
6.  GET /api/multi_ai/help returns machine-readable schema (AI + human usable)
7.  Max 10 nodes — enforced in extension.js and UI
8.  source field on every turn: manual | hub_dispatch | chain_from_{id} | human
9.  session_notes.md is never auto-written — Lee-only file
10. Sessions are never deleted by this plugin — only Lee deletes manually
11. SANDBOX_FIRST — Lee approves before repo move
12. Standalone: works without Clearbox bridge (no import from Clearbox required)
