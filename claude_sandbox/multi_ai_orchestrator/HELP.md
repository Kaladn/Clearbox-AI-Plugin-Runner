# Multi-AI Orchestrator — Help Reference
# For AI systems and developers. Machine-readable version: GET /api/multi_ai/help
# Version: 1.0.0 | See CONTRACT.md for boundary contract

---

## What it is

VSCode extension. Up to 10 conversation nodes, each a HUMAN or LLM slot.
Two orchestration modes: HUB (manual dispatch) and CHAIN (sequential handoff).
Full-fidelity append-only session storage — every turn written to disk immediately.
Zero direct company API calls. No API keys stored or injected.

---

## Files

```
multi_ai_orchestrator/
  package.json                 VSCode extension manifest + settings schema
  extension.js                 Activation, commands, provider discovery,
                               send logic, chain orchestration, webview management
  storage/
    session_store.js           Session persistence — append-only JSONL
  ui/
    multi_ai_panel.html        WebviewPanel UI — all CSS+JS inline, fully self-contained
  api/
    multi_ai_api.py            Optional Clearbox bridge routes
  CONTRACT.md                  Boundary contract — what it does / doesn't do
  manifest.json                Clearbox plugin registration
  __init__.py                  Clearbox plugin runner exports (optional)
  HELP.md                      This file
```

---

## Settings

### clearboxMultiAi.knownExtensions
AI extensions to probe for exported APIs. Empty by default — fill in yours.

```json
"clearboxMultiAi.knownExtensions": [
  {
    "id":     "continue.continue",
    "method": "chat",
    "label":  "Continue"
  },
  {
    "id":     "sourcegraph.cody-ai",
    "method": "chat",
    "label":  "Cody"
  }
]
```

The extension must be installed and active. `method` must be the name of a
function on the extension's `exports` object that accepts a messages array.
The method can return a string, `{ content: string }`, or `{ text: string }`.

### clearboxMultiAi.localEndpoints
Local HTTP endpoints (localhost/LAN only — external URLs hard-rejected).

```json
"clearboxMultiAi.localEndpoints": [
  {
    "url":   "http://localhost:11434/v1/chat/completions",
    "model": "qwen2.5:7b",
    "label": "Ollama qwen2.5:7b"
  },
  {
    "url":   "http://localhost:1234/v1/chat/completions",
    "model": "local-model",
    "label": "LM Studio"
  }
]
```

Format is OpenAI-compatible chat completions (the de facto local standard).
Ollama, LM Studio, llama.cpp server all work with this format.

### clearboxMultiAi.defaultChainMode
`"PREVIEW_FIRST"` (default) or `"AUTO"`.
HUMAN nodes always force PREVIEW_FIRST regardless of this setting.

### clearboxMultiAi.sessionStoragePath
Override default `~/.clearbox/multi_ai/sessions/`.
Leave empty to use default.

### clearboxMultiAi.defaultNodes
Nodes created when opening a new panel. Default:
```json
[
  { "label": "Strategist", "role": "STRATEGIST", "slot_type": "LLM" },
  { "label": "Executor",   "role": "EXECUTOR",   "slot_type": "LLM" },
  { "label": "Coder",      "role": "CODER",       "slot_type": "LLM" },
  { "label": "Validator",  "role": "VALIDATOR",   "slot_type": "LLM" }
]
```
Set to `[]` to open with a blank panel and add nodes manually.

---

## Provider Tiers

Tried in this order per node when LLM slot is selected:

### Tier 1: vscode.lm API
Any VSCode extension that calls `vscode.lm.registerChatModelProvider()`.
The model list is auto-discovered at activation and refreshes when you
install new AI extensions (via `vscode.lm.onDidChangeChatModels`).
Works with GitHub Copilot and any future extension that adopts the API.
No configuration needed — they appear automatically in the provider dropdown.

### Tier 2: Extension exports
User-configured in `clearboxMultiAi.knownExtensions`.
Extension must be installed, active, and export the named method.
Useful for extensions that haven't adopted vscode.lm yet.

### Tier 3: Local HTTP
User-configured in `clearboxMultiAi.localEndpoints`.
Hard guard: `isLocalUrl()` rejects any non-localhost/LAN URL.
Accepted patterns: localhost, 127.x.x.x, 192.168.x.x, 10.x.x.x, 172.16-31.x.x
OpenAI-compatible chat completions format.
No auth headers injected — if your local server needs auth, configure it there.

---

## Slot Types

### LLM
Calls the provider configured on this node.
The ASSISTANT field shows streaming output as it arrives.
On completion, turn written to disk, chain propagates if chain_target is set.

### HUMAN ✎
No LLM call. Lee types the assistant response in the ASSISTANT field.
Click [Submit Response] to record the turn and optionally propagate the chain.
Chain ALWAYS pauses at a HUMAN node — AUTO mode is overridden to PREVIEW_FIRST.
Turn recorded with `source: "human"` — distinguishable in exports.

---

## Orchestration Modes

### HUB (default)
Lee dispatches from the orchestrator bar.
`[→ All]` fires the same message to all active nodes in parallel.
`[→ Node N]` fires to one specific node.
No auto-wiring. Lee reads responses and decides what to pass where.

### CHAIN
Each node has a `chain_target` setting: which node receives its output.
When node N completes, its assistant output goes to node chain_target's input.
`PREVIEW_FIRST`: injects the text, shows a banner, waits for Lee to confirm.
`AUTO`: fires next node immediately.
Hub dispatch still works in chain mode — hub and chain coexist.
`[Stop Chain]` in orchestrator bar cancels in-flight chain propagation.

---

## Session Storage

### Structure
```
~/.clearbox/multi_ai/sessions/
  index.jsonl                   One record per session — fast listing
  {session_id}/
    meta.json                   Node config snapshot at session start
    turns.jsonl                 Every turn — append-only, full fidelity
    config_changes.jsonl        Mid-session node config changes
    session_notes.md            Lee-written only — never auto-written
```

### turns.jsonl record — every field
```json
{
  "session_id":       "20260311_143022_strategist_run",
  "turn_id":          "550e8400-e29b-41d4-a716-446655440000",
  "seq":              1,
  "timestamp":        "2026-03-11T14:30:22.451Z",
  "node_id":          1,
  "node_label":       "Strategist",
  "slot_type":        "LLM",
  "provider_tier":    "lm_api",
  "provider_display": "Copilot / gpt-4o — copilot:gpt-4o",
  "role":             "user",
  "content":          "Full message content — never truncated, never summarized",
  "source":           "manual",
  "chain_from_node":  null,
  "char_count":       142
}
```

### source field values
| Value | Meaning |
|---|---|
| `manual` | Lee typed the user message directly |
| `hub_dispatch` | Came from the orchestrator dispatch bar |
| `chain_from_{N}` | Auto-injected by node N's chain_target |
| `human` | HUMAN slot — Lee wrote the assistant response |

### Why append-only matters
Every session is a permanent training record. The fine procedural detail in
how Lee orchestrates nodes — what he passes where, what he corrects, what
chain sequences work — is only in the full turn-by-turn history.
Compacting loses the decision trace. Summarizing loses the exact wording.
turns.jsonl is never rewritten. Every turn is the truth.

---

## Export Formats

### JSONL (raw turns)
Exactly what's in turns.jsonl. One JSON record per line.
wolf_engine compatible — ingest directly as a corpus document.
File: `{session_id}.jsonl`

### Markdown (handoff log)
Human-readable. Every turn with node label, source, timestamp, char count.
Good for reviewing sessions, sharing handoff context, or archiving.
File: `{session_id}.md`

---

## API Endpoints (when mounted in Clearbox)

### POST /api/multi_ai/chat
Proxy a pre-built message array to a user-configured local endpoint only.
External URLs hard-rejected by `_is_local_url()`.
```
Body: {
  local_url:   string — must be localhost or LAN
  local_model: string — passed to local endpoint
  messages:    [{ role, content }]
  node_id:     int
  session_id:  string
}
Returns: {
  node_id:   int
  response:  string
  model:     string
  raw:       object — full response from local endpoint
}
```

### GET /api/multi_ai/sessions
List all saved sessions from index.jsonl, newest first.

### GET /api/multi_ai/session
Full session: meta + all turns. No truncation.
Body: `{ "session_id": "..." }`

### GET /api/multi_ai/config
Storage path and session counts.

### GET /api/multi_ai/help
Machine-readable JSON schema of this document. AI-usable.

---

## Commands

| Command | Keybinding | Description |
|---|---|---|
| `clearbox.multiAi.open` | Ctrl+Shift+M | Open / focus the orchestrator panel |
| `clearbox.multiAi.addNode` | — | Add a new node |
| `clearbox.multiAi.exportSession` | — | Export current session |
| `clearbox.multiAi.listSessions` | — | Open sessions drawer |
| `clearbox.multiAi.newSession` | — | Start a new session |

---

## Invariants (non-negotiable)

1.  turns.jsonl is append-only — never rewritten, never truncated
2.  Every turn written to disk before chain propagates to next node
3.  HUMAN slot forces PREVIEW_FIRST — chain never skips a human turn
4.  isLocalUrl() hard guard — no external URLs accepted anywhere
5.  No model names hardcoded — discovered at runtime via vscode.lm
6.  No API keys stored or injected by this plugin
7.  Max 10 nodes enforced in extension.js and UI
8.  source field on every turn — every turn is traceable
9.  session_notes.md is never auto-written — Lee-only file
10. Sessions never deleted by this plugin — Lee deletes manually
11. GET /api/multi_ai/help returns machine-readable schema
12. Standalone: runs without Clearbox bridge (no Clearbox import required)

---

## Open Questions for Lee

```
[ ] Default layout on open: 4 pre-populated nodes (Strategist/Executor/Coder/Validator)
    or blank panel? Currently: 4 nodes (change via clearboxMultiAi.defaultNodes)
[ ] Node layout: horizontal scroll (current) or vertical stack with tab-switching?
[ ] Chain preview: diff-style view or just fill the textarea?
[ ] Does this mount in Clearbox as a panel, or purely standalone VSCode extension?
[ ] Any AI extensions you want pre-listed in knownExtensions docs?
    (Continue? Cody? Something else on your machines?)
[ ] JSONL export: should it include meta.json fields at the top of the file
    so each export is fully self-contained without the meta.json sidecar?
```

---

## For AI Systems Reading This

This file is the human-readable companion to GET /api/multi_ai/help.
The machine-readable version has the same information in structured JSON.
To understand the full session data model, read the turn_record schema above.
To understand what the plugin does and doesn't do, read CONTRACT.md.
To understand the storage layout, the base path is ~/.clearbox/multi_ai/sessions/.
