/**
 * session_store.js — Multi-AI Orchestrator Session Persistence
 *
 * Append-only JSONL storage. Every turn written to disk immediately on
 * completion. Never rewrites. Never summarizes. Never truncates.
 *
 * Storage layout:
 *   {base}/
 *     index.jsonl              — one record per session (fast listing)
 *     {session_id}/
 *       meta.json              — node config snapshot at session start
 *       turns.jsonl            — every turn, append-only, one JSON per line
 *       config_changes.jsonl   — node config changes mid-session
 *       session_notes.md       — Lee-written notes only, never auto-written
 *
 * Default base: ~/.clearbox/multi_ai/sessions/
 * Override:     clearboxMultiAi.sessionStoragePath in VSCode settings
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { v4: uuidv4 } = require('uuid');

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBasePath(overridePath) {
  if (overridePath && overridePath.trim()) {
    return overridePath.trim();
  }
  return path.join(os.homedir(), '.clearbox', 'multi_ai', 'sessions');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendJsonl(filePath, record) {
  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(l => l.trim());
  const records = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); } catch (_) { /* skip malformed */ }
  }
  return records;
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 32);
}

function nowIso() {
  return new Date().toISOString();
}

function sessionTimestampId(label) {
  const now    = new Date();
  const ts     = now.toISOString().replace(/[-:T]/g, '').substring(0, 15); // YYYYMMDDHHmmss
  const slug   = slugify(label || 'session');
  return `${ts}_${slug}`;
}

// ─── Session Lifecycle ───────────────────────────────────────────────────────

/**
 * initSession — creates session directory, writes meta.json, appends to index.
 *
 * @param {object} opts
 * @param {string} opts.label          — human label for this session
 * @param {object[]} opts.nodeConfigs  — snapshot of all nodes at session start
 * @param {string} opts.mode           — 'hub' | 'chain'
 * @param {string} [opts.overridePath] — custom base path from settings
 * @returns {object} { session_id, session_dir, turns_file }
 */
function initSession({ label, nodeConfigs, mode, overridePath }) {
  const base       = getBasePath(overridePath);
  const session_id = sessionTimestampId(label);
  const session_dir = path.join(base, session_id);

  ensureDir(session_dir);

  const meta = {
    session_id,
    label:        label || 'Untitled Session',
    mode:         mode  || 'hub',
    started_at:   nowIso(),
    ended_at:     null,
    turn_count:   0,
    node_configs: nodeConfigs,
    version:      '1.0.0',
  };

  // Write meta.json
  fs.writeFileSync(
    path.join(session_dir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  );

  // Append to index.jsonl
  appendJsonl(path.join(base, 'index.jsonl'), {
    session_id,
    label:      meta.label,
    mode:       meta.mode,
    started_at: meta.started_at,
    ended_at:   null,
    turn_count: 0,
    node_count: nodeConfigs.length,
  });

  const turns_file = path.join(session_dir, 'turns.jsonl');

  return { session_id, session_dir, turns_file };
}

/**
 * appendTurn — writes one turn to turns.jsonl immediately.
 * Called on every turn completion — never batch, never delayed.
 *
 * @param {object} opts
 * @param {string} opts.session_id
 * @param {string} opts.turns_file      — absolute path to turns.jsonl
 * @param {number} opts.seq             — incrementing sequence number
 * @param {number} opts.node_id
 * @param {string} opts.node_label
 * @param {string} opts.slot_type       — 'LLM' | 'HUMAN'
 * @param {string} opts.provider_tier   — 'lm_api' | 'ext_export' | 'local_http' | 'none'
 * @param {string} opts.provider_display — human-readable provider name
 * @param {string} opts.role            — 'user' | 'assistant'
 * @param {string} opts.content         — FULL message content, never truncated
 * @param {string} opts.source          — 'manual' | 'hub_dispatch' | 'chain_from_{id}' | 'human'
 * @param {number|null} opts.chain_from_node
 */
function appendTurn({
  session_id,
  turns_file,
  seq,
  node_id,
  node_label,
  slot_type,
  provider_tier,
  provider_display,
  role,
  content,
  source,
  chain_from_node,
}) {
  const record = {
    session_id,
    turn_id:          uuidv4(),
    seq,
    timestamp:        nowIso(),
    node_id,
    node_label,
    slot_type,
    provider_tier:    provider_tier    || 'none',
    provider_display: provider_display || '',
    role,
    content,           // full content — never truncated
    source,
    chain_from_node:  chain_from_node  || null,
    char_count:       content.length,
  };

  appendJsonl(turns_file, record);
  return record;
}

/**
 * appendConfigChange — records node config changes mid-session.
 *
 * @param {string} session_dir
 * @param {object} change — { node_id, field, old_value, new_value }
 */
function appendConfigChange(session_dir, change) {
  appendJsonl(path.join(session_dir, 'config_changes.jsonl'), {
    timestamp: nowIso(),
    ...change,
  });
}

/**
 * closeSession — marks session ended in meta.json and updates index.jsonl.
 * Safe to call multiple times (idempotent on ended_at).
 *
 * @param {string} session_id
 * @param {string} session_dir
 * @param {number} turn_count — final turn count
 * @param {string} [overridePath]
 */
function closeSession(session_id, session_dir, turn_count, overridePath) {
  const meta_path = path.join(session_dir, 'meta.json');
  if (!fs.existsSync(meta_path)) return;

  const meta      = JSON.parse(fs.readFileSync(meta_path, 'utf8'));
  meta.ended_at   = nowIso();
  meta.turn_count = turn_count;

  fs.writeFileSync(meta_path, JSON.stringify(meta, null, 2), 'utf8');

  // Rewrite the index entry — only this session's line changes
  const base       = getBasePath(overridePath);
  const index_path = path.join(base, 'index.jsonl');
  const sessions   = readJsonl(index_path);

  const updated = sessions.map(s =>
    s.session_id === session_id
      ? { ...s, ended_at: meta.ended_at, turn_count }
      : s
  );

  // Rewrite index — this is the only file we allow rewriting
  fs.writeFileSync(
    index_path,
    updated.map(s => JSON.stringify(s)).join('\n') + '\n',
    'utf8'
  );
}

// ─── Session Reading ─────────────────────────────────────────────────────────

/**
 * listSessions — reads index.jsonl, returns array of session summaries.
 * Fast — does not read individual session directories.
 *
 * @param {string} [overridePath]
 * @returns {object[]}
 */
function listSessions(overridePath) {
  const base       = getBasePath(overridePath);
  const index_path = path.join(base, 'index.jsonl');
  const sessions   = readJsonl(index_path);
  // newest first
  return sessions.slice().reverse();
}

/**
 * getSession — reads full session: meta + all turns.
 *
 * @param {string} session_id
 * @param {string} [overridePath]
 * @returns {{ meta: object, turns: object[], config_changes: object[] } | null}
 */
function getSession(session_id, overridePath) {
  const base        = getBasePath(overridePath);
  const session_dir = path.join(base, session_id);

  if (!fs.existsSync(session_dir)) return null;

  const meta           = JSON.parse(fs.readFileSync(path.join(session_dir, 'meta.json'), 'utf8'));
  const turns          = readJsonl(path.join(session_dir, 'turns.jsonl'));
  const config_changes = readJsonl(path.join(session_dir, 'config_changes.jsonl'));

  return { meta, turns, config_changes };
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * exportSessionJsonl — returns full turns.jsonl content as string.
 * Exactly what's on disk. Nothing removed.
 */
function exportSessionJsonl(session_id, overridePath) {
  const base      = getBasePath(overridePath);
  const turns_file = path.join(base, session_id, 'turns.jsonl');
  if (!fs.existsSync(turns_file)) return null;
  return fs.readFileSync(turns_file, 'utf8');
}

/**
 * exportSessionMarkdown — renders session as readable markdown handoff log.
 * Full content preserved. Every turn included. Source and metadata in headers.
 */
function exportSessionMarkdown(session_id, overridePath) {
  const session = getSession(session_id, overridePath);
  if (!session) return null;

  const { meta, turns } = session;

  let md = `# Session: ${meta.label}\n`;
  md += `**ID:** ${meta.session_id}  \n`;
  md += `**Mode:** ${meta.mode}  \n`;
  md += `**Started:** ${meta.started_at}  \n`;
  if (meta.ended_at) md += `**Ended:** ${meta.ended_at}  \n`;
  md += `**Turns:** ${turns.length}  \n\n`;

  md += `## Node Configuration at Start\n\n`;
  for (const n of meta.node_configs) {
    md += `- **Node ${n.id} — ${n.label}** | Slot: ${n.slot_type} | Role: ${n.role}\n`;
  }
  md += '\n---\n\n';

  // Group turns by node for readability, preserving seq order
  const sorted = turns.slice().sort((a, b) => a.seq - b.seq);

  for (const t of sorted) {
    const who    = t.role === 'user' ? 'USER' : 'ASSISTANT';
    const origin = t.source === 'human'
      ? '✎ LEE'
      : t.source === 'manual'
        ? '⌨ manual'
        : t.source.startsWith('chain_from_')
          ? `⛓ chain←Node${t.chain_from_node}`
          : `⊞ ${t.source}`;

    md += `### Node ${t.node_id} (${t.node_label}) — ${who} [${origin}]\n`;
    md += `*${t.timestamp} | seq:${t.seq} | ${t.char_count} chars | provider: ${t.provider_display || t.slot_type}*\n\n`;
    md += `${t.content}\n\n`;
  }

  return md;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * sessionExists — check if a session_id directory exists.
 */
function sessionExists(session_id, overridePath) {
  const base = getBasePath(overridePath);
  return fs.existsSync(path.join(base, session_id));
}

/**
 * getSessionNotesPath — returns path to session_notes.md.
 * Never auto-written. Lee opens this in an editor himself.
 */
function getSessionNotesPath(session_id, overridePath) {
  const base = getBasePath(overridePath);
  return path.join(base, session_id, 'session_notes.md');
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  initSession,
  appendTurn,
  appendConfigChange,
  closeSession,
  listSessions,
  getSession,
  exportSessionJsonl,
  exportSessionMarkdown,
  sessionExists,
  getSessionNotesPath,
  getBasePath,
};
