/**
 * extension.js — Clearbox Multi-AI Orchestrator
 *
 * VSCode extension entry point. Manages:
 *   - WebviewPanel lifecycle
 *   - Provider discovery (vscode.lm, extension exports, local HTTP)
 *   - Node state (up to 10 nodes, HUMAN or LLM slot)
 *   - HUB and CHAIN orchestration
 *   - Session persistence via storage/session_store.js
 *   - Message protocol with WebviewPanel (multi_ai_panel.html)
 *
 * Zero direct company API calls. No API keys stored or injected.
 * All LLM calls go through vscode.lm, user-configured extension exports,
 * or verified-local HTTP only.
 *
 * See CONTRACT.md for full boundary contract.
 * See HELP.md for message protocol and settings reference.
 */

'use strict';

const vscode = require('vscode');
const path   = require('path');
const fs     = require('fs');
const store  = require('./storage/session_store');

// ─── Constants ───────────────────────────────────────────────────────────────

const PANEL_TITLE    = 'Multi-AI Orchestrator';
const PANEL_VIEW_ID  = 'clearboxMultiAi';
const MAX_NODES      = 10;

const NODE_ROLES = ['STRATEGIST', 'EXECUTOR', 'CODER', 'VALIDATOR', 'CUSTOM'];

const CONTEXT_PREFIXES = {
  STRATEGIST: 'You are a system architect and planner. Break down the goal into clear modules and tasks. Assign responsibilities. Be concise and structured.',
  EXECUTOR:   'You are an execution specialist. Take the plan and describe exactly what file operations, commands, or tool steps are needed. Be precise.',
  CODER:      'You are a senior developer. Write clean, working code. Follow the established patterns. Review for correctness before responding.',
  VALIDATOR:  'You are a critical reviewer. Examine the previous output for errors, gaps, and misalignments with the original goal. Be direct.',
  CUSTOM:     '',
};

// ─── State ───────────────────────────────────────────────────────────────────

let panel       = null;   // WebviewPanel
let nodeIdSeq   = 0;      // monotonic, never reused even after remove
let nodes       = [];     // AINode[]
let mode        = 'hub';  // 'hub' | 'chain'
let sessionCtx  = null;   // { session_id, session_dir, turns_file, seq }
let turnSeq     = 0;      // global turn sequence for this session

// HUMAN response resolvers: nodeId → Promise resolve function
const humanResolvers = new Map();

// Cancellation tokens: nodeId → vscode.CancellationTokenSource
const cancelTokens = new Map();

// ─── Activation ──────────────────────────────────────────────────────────────

function activate(context) {
  // Open/focus panel
  context.subscriptions.push(
    vscode.commands.registerCommand('clearbox.multiAi.open', () => openPanel(context))
  );

  // Add node
  context.subscriptions.push(
    vscode.commands.registerCommand('clearbox.multiAi.addNode', () => {
      if (panel) addNode({ label: 'Node', role: 'CUSTOM', slot_type: 'LLM' });
    })
  );

  // Export session
  context.subscriptions.push(
    vscode.commands.registerCommand('clearbox.multiAi.exportSession', async () => {
      if (!sessionCtx) {
        vscode.window.showWarningMessage('No active session to export.');
        return;
      }
      const fmt = await vscode.window.showQuickPick(['JSONL (raw turns)', 'Markdown (handoff log)'], {
        placeHolder: 'Select export format',
      });
      if (!fmt) return;
      const format = fmt.startsWith('JSONL') ? 'jsonl' : 'markdown';
      doExportSession(format);
    })
  );

  // List sessions
  context.subscriptions.push(
    vscode.commands.registerCommand('clearbox.multiAi.listSessions', () => {
      if (panel) postToWebview({ type: 'sessions_list', sessions: getSessions() });
      else openPanel(context);
    })
  );

  // New session
  context.subscriptions.push(
    vscode.commands.registerCommand('clearbox.multiAi.newSession', () => {
      if (panel) startNewSession();
    })
  );

  // Refresh provider list when installed AI extensions change
  context.subscriptions.push(
    vscode.lm.onDidChangeChatModels(() => {
      if (panel) discoverProviders().then(p => postToWebview({ type: 'providers_ready', providers: p }));
    })
  );
}

function deactivate() {
  if (sessionCtx) {
    store.closeSession(sessionCtx.session_id, sessionCtx.session_dir, turnSeq, getOverridePath());
  }
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function openPanel(context) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One);
    return;
  }

  panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_ID,
    PANEL_TITLE,
    vscode.ViewColumn.One,
    {
      enableScripts:          true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, 'ui')),
      ],
    }
  );

  panel.webview.html = getWebviewHtml(context);

  panel.webview.onDidReceiveMessage(msg => handleWebviewMessage(msg, context), null, context.subscriptions);

  panel.onDidDispose(() => {
    if (sessionCtx) {
      store.closeSession(sessionCtx.session_id, sessionCtx.session_dir, turnSeq, getOverridePath());
    }
    panel = null;
    nodes = [];
    nodeIdSeq = 0;
    turnSeq   = 0;
    sessionCtx = null;
    humanResolvers.clear();
    cancelTokens.forEach(cts => cts.cancel());
    cancelTokens.clear();
  }, null, context.subscriptions);
}

function postToWebview(message) {
  if (panel) panel.webview.postMessage(message);
}

// ─── Message Handler ─────────────────────────────────────────────────────────

async function handleWebviewMessage(msg, context) {
  switch (msg.type) {

    case 'ready':
      // Webview loaded — send current state
      await discoverProviders().then(p => postToWebview({ type: 'providers_ready', providers: p }));
      initDefaultNodes();
      startNewSession();
      postToWebview({ type: 'sessions_list', sessions: getSessions() });
      break;

    case 'discover_providers':
      discoverProviders().then(p => postToWebview({ type: 'providers_ready', providers: p }));
      break;

    case 'add_node':
      addNode({ label: msg.label, role: msg.role, slot_type: msg.slot_type || 'LLM' });
      break;

    case 'remove_node':
      removeNode(msg.node_id);
      break;

    case 'update_node':
      // Generic field update (label, role, slot_type, provider, context_prefix, chain_target, chain_mode)
      updateNode(msg.node_id, msg.updates);
      break;

    case 'set_mode':
      mode = msg.mode; // 'hub' | 'chain'
      postToWebview({ type: 'mode_changed', mode });
      break;

    case 'send': {
      const node = getNode(msg.node_id);
      if (!node) break;
      await runNode(node, msg.user_message, msg.source || 'manual');
      break;
    }

    case 'submit_human': {
      const resolver = humanResolvers.get(msg.node_id);
      if (resolver) {
        resolver(msg.response_text);
        humanResolvers.delete(msg.node_id);
      }
      break;
    }

    case 'hub_dispatch': {
      // target: 'all' or node_id number
      const dispatchMsg = msg.message;
      if (!dispatchMsg) break;
      if (msg.target === 'all') {
        // Fire all nodes in parallel
        await Promise.all(nodes.map(n => runNode(n, dispatchMsg, 'hub_dispatch')));
      } else {
        const target = getNode(Number(msg.target));
        if (target) await runNode(target, dispatchMsg, 'hub_dispatch');
      }
      break;
    }

    case 'cancel_node': {
      const cts = cancelTokens.get(msg.node_id);
      if (cts) { cts.cancel(); cancelTokens.delete(msg.node_id); }
      break;
    }

    case 'export_session':
      doExportSession(msg.format || 'jsonl');
      break;

    case 'new_session':
      startNewSession();
      break;

    case 'list_sessions':
      postToWebview({ type: 'sessions_list', sessions: getSessions() });
      break;

    case 'load_session': {
      const s = store.getSession(msg.session_id, getOverridePath());
      if (s) postToWebview({ type: 'session_loaded', session: s });
      else   postToWebview({ type: 'error', node_id: null, message: `Session ${msg.session_id} not found` });
      break;
    }

    case 'open_notes': {
      if (!sessionCtx) break;
      const notesPath = store.getSessionNotesPath(sessionCtx.session_id, getOverridePath());
      // Create stub if it doesn't exist
      if (!fs.existsSync(notesPath)) {
        fs.writeFileSync(notesPath, `# Session Notes — ${sessionCtx.session_id}\n\n`, 'utf8');
      }
      vscode.workspace.openTextDocument(vscode.Uri.file(notesPath)).then(doc =>
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
      );
      break;
    }
  }
}

// ─── Node Management ─────────────────────────────────────────────────────────

function addNode({ label, role, slot_type }) {
  if (nodes.length >= MAX_NODES) {
    postToWebview({ type: 'error', node_id: null, message: `Maximum ${MAX_NODES} nodes reached.` });
    return;
  }
  nodeIdSeq++;
  const cfg = getConfig();
  const node = {
    id:              nodeIdSeq,
    label:           label   || `Node ${nodeIdSeq}`,
    role:            role    || 'CUSTOM',
    slot_type:       slot_type || 'LLM',
    provider:        null,                     // set by user in UI
    context_prefix:  CONTEXT_PREFIXES[role] || '',
    history:         [],
    chain_target:    null,
    chain_mode:      cfg.get('clearboxMultiAi.defaultChainMode') || 'PREVIEW_FIRST',
    status:          'IDLE',
    locked:          false,
    current_input:   '',
    last_response:   '',
  };
  nodes.push(node);
  postToWebview({ type: 'node_added', node: serializeNode(node) });

  // Log to session config if session active
  if (sessionCtx) {
    store.appendConfigChange(sessionCtx.session_dir, {
      action: 'add_node',
      node_id: node.id,
      node_label: node.label,
      slot_type: node.slot_type,
    });
  }
}

function removeNode(node_id) {
  const idx = nodes.findIndex(n => n.id === node_id);
  if (idx === -1) return;

  // Cancel any in-flight request
  const cts = cancelTokens.get(node_id);
  if (cts) { cts.cancel(); cancelTokens.delete(node_id); }

  // Resolve any waiting human prompt with empty string
  const hr = humanResolvers.get(node_id);
  if (hr) { hr(''); humanResolvers.delete(node_id); }

  nodes.splice(idx, 1);
  postToWebview({ type: 'node_removed', node_id });

  if (sessionCtx) {
    store.appendConfigChange(sessionCtx.session_dir, {
      action: 'remove_node',
      node_id,
    });
  }
}

function updateNode(node_id, updates) {
  const node = getNode(node_id);
  if (!node) return;

  const prev = { ...node };

  // Apply allowed updates
  const allowed = ['label', 'role', 'slot_type', 'provider', 'context_prefix', 'chain_target', 'chain_mode'];
  for (const key of allowed) {
    if (key in updates) node[key] = updates[key];
  }

  // If role changed, offer to reset context_prefix
  if ('role' in updates && updates.role !== prev.role) {
    const newPrefix = CONTEXT_PREFIXES[updates.role];
    if (newPrefix !== undefined && newPrefix !== node.context_prefix) {
      node.context_prefix = newPrefix;
    }
  }

  postToWebview({ type: 'node_updated', node_id, updates: serializeNode(node) });

  if (sessionCtx) {
    store.appendConfigChange(sessionCtx.session_dir, {
      action: 'update_node',
      node_id,
      changed_fields: Object.keys(updates),
      updates,
    });
  }
}

function getNode(node_id) {
  return nodes.find(n => n.id === node_id) || null;
}

function serializeNode(node) {
  // Never send history[] to webview in bulk — send only last_response for display
  return {
    id:             node.id,
    label:          node.label,
    role:           node.role,
    slot_type:      node.slot_type,
    provider:       node.provider,
    context_prefix: node.context_prefix,
    chain_target:   node.chain_target,
    chain_mode:     node.chain_mode,
    status:         node.status,
    locked:         node.locked,
    current_input:  node.current_input,
    last_response:  node.last_response,
    history_count:  node.history.length,
  };
}

// ─── Run Node ────────────────────────────────────────────────────────────────

async function runNode(node, userMessage, source, chainFromNodeId = null) {
  node.current_input = userMessage;
  node.status        = node.slot_type === 'HUMAN' ? 'AWAITING_HUMAN' : 'THINKING';
  postToWebview({ type: 'node_updated', node_id: node.id, updates: serializeNode(node) });

  // ── Write USER turn to disk immediately ──
  const userTurn = writeTurn({
    node,
    role:            'user',
    content:         userMessage,
    source,
    chain_from_node: chainFromNodeId,
  });

  let assistantContent = '';

  try {
    if (node.slot_type === 'HUMAN') {
      // Pause — wait for Lee to type and submit
      postToWebview({ type: 'awaiting_human', node_id: node.id, user_message: userMessage });
      assistantContent = await awaitHumanResponse(node.id);
    } else {
      // LLM call
      const cts = new vscode.CancellationTokenSource();
      cancelTokens.set(node.id, cts);

      assistantContent = await sendToLLM(node, userMessage, cts.token);
      cancelTokens.delete(node.id);
    }
  } catch (err) {
    node.status = 'ERROR';
    postToWebview({ type: 'node_updated', node_id: node.id, updates: serializeNode(node) });
    postToWebview({ type: 'error', node_id: node.id, message: err.message });
    return;
  }

  // ── Update node state ──
  node.last_response = assistantContent;
  node.history.push({ role: 'user',      content: userMessage });
  node.history.push({ role: 'assistant', content: assistantContent });
  node.status = 'DONE';

  postToWebview({
    type:         'turn_complete',
    node_id:      node.id,
    response:     assistantContent,
    source:       node.slot_type === 'HUMAN' ? 'human' : source,
    node_state:   serializeNode(node),
  });

  // ── Write ASSISTANT turn to disk ──
  writeTurn({
    node,
    role:            'assistant',
    content:         assistantContent,
    source:          node.slot_type === 'HUMAN' ? 'human' : source,
    chain_from_node: chainFromNodeId,
  });

  // ── Chain propagation ──
  if (node.chain_target !== null && mode === 'chain') {
    const targetNode = getNode(node.chain_target);
    if (targetNode) {
      await propagateChain(node, targetNode, assistantContent);
    }
  }
}

async function propagateChain(fromNode, toNode, injectedText) {
  if (toNode.chain_mode === 'AUTO' && toNode.slot_type !== 'HUMAN') {
    // Fire immediately
    postToWebview({
      type:          'chain_fired',
      from_node_id:  fromNode.id,
      to_node_id:    toNode.id,
      injected_text: injectedText,
    });
    await runNode(toNode, injectedText, `chain_from_${fromNode.id}`, fromNode.id);
  } else {
    // PREVIEW_FIRST — inject text, notify webview, wait for user [Send]
    toNode.current_input = injectedText;
    toNode.locked        = true;
    postToWebview({
      type:          'chain_preview',
      from_node_id:  fromNode.id,
      to_node_id:    toNode.id,
      injected_text: injectedText,
      node_state:    serializeNode(toNode),
    });
    // User clicks [Send] on target node → triggers a 'send' message → runNode again
  }
}

// ─── LLM Send ────────────────────────────────────────────────────────────────

async function sendToLLM(node, userMessage, cancelToken) {
  const p = node.provider;
  if (!p) throw new Error(`Node ${node.id}: no provider configured`);

  const messages = buildMessages(node.history, node.context_prefix, userMessage);

  if (p.tier === 'lm_api') {
    return await sendViaLmApi(p, messages, node, cancelToken);
  } else if (p.tier === 'ext_export') {
    return await sendViaExtension(p, messages);
  } else if (p.tier === 'local_http') {
    return await sendViaLocalHttp(p, messages);
  } else {
    throw new Error(`Node ${node.id}: unknown provider tier "${p.tier}"`);
  }
}

async function sendViaLmApi(p, messages, node, cancelToken) {
  // vscode.lm API — goes through VSCode's provider layer, no direct company call
  const models = await vscode.lm.selectChatModels({ id: p.lm_model_id });
  if (!models || models.length === 0) {
    throw new Error(`vscode.lm: model "${p.lm_model_id}" not available. Is the AI extension active?`);
  }
  const model = models[0];

  const lmMessages = messages.map(m =>
    m.role === 'user'
      ? vscode.LanguageModelChatMessage.User(m.content)
      : vscode.LanguageModelChatMessage.Assistant(m.content)
  );

  const request = await model.sendRequest(lmMessages, {}, cancelToken);

  let output = '';
  for await (const chunk of request.text) {
    output += chunk;
    postToWebview({ type: 'stream_chunk', node_id: node.id, chunk });
  }
  return output;
}

async function sendViaExtension(p, messages) {
  const ext = vscode.extensions.getExtension(p.ext_id);
  if (!ext) throw new Error(`Extension "${p.ext_id}" not found`);
  if (!ext.isActive) await ext.activate();
  if (!ext.exports || typeof ext.exports[p.ext_method] !== 'function') {
    throw new Error(`Extension "${p.ext_id}" does not export method "${p.ext_method}"`);
  }
  const result = await ext.exports[p.ext_method](messages);
  // Handle different return shapes
  if (typeof result === 'string') return result;
  if (result && typeof result.content === 'string') return result.content;
  if (result && typeof result.text === 'string') return result.text;
  return JSON.stringify(result);
}

async function sendViaLocalHttp(p, messages) {
  if (!isLocalUrl(p.local_url)) {
    throw new Error(`Local HTTP: URL must be localhost or LAN. Rejected: ${p.local_url}`);
  }
  const response = await fetch(p.local_url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:    p.local_model,
      messages: messages,
      stream:   false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Local HTTP ${p.local_url}: HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? JSON.stringify(data);
}

function isLocalUrl(url) {
  if (!url) return false;
  return /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0)(:\d+)?/.test(url);
}

function buildMessages(history, contextPrefix, newUserMessage) {
  const messages = [];
  // Context prefix injected as first user message if set
  if (contextPrefix && contextPrefix.trim()) {
    messages.push({ role: 'user',      content: contextPrefix.trim() });
    messages.push({ role: 'assistant', content: 'Understood.' });
  }
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: 'user', content: newUserMessage });
  return messages;
}

// ─── HUMAN Response ──────────────────────────────────────────────────────────

function awaitHumanResponse(nodeId) {
  return new Promise((resolve) => {
    humanResolvers.set(nodeId, resolve);
  });
}

// ─── Provider Discovery ──────────────────────────────────────────────────────

async function discoverProviders() {
  const cfg       = getConfig();
  const available = [];

  // Tier 1: vscode.lm
  try {
    const models = await vscode.lm.selectChatModels();
    for (const m of models) {
      available.push({
        tier:        'lm_api',
        display:     `${m.vendor || 'AI'} / ${m.family || ''} — ${m.id}`,
        lm_model_id: m.id,
        vendor:      m.vendor,
        family:      m.family,
      });
    }
  } catch (_) {
    // vscode.lm unavailable — skip
  }

  // Tier 2: known extension exports (user-configured)
  const knownExts = cfg.get('clearboxMultiAi.knownExtensions') || [];
  for (const ext of knownExts) {
    try {
      const loaded = vscode.extensions.getExtension(ext.id);
      if (loaded && loaded.exports && typeof loaded.exports[ext.method] === 'function') {
        available.push({
          tier:       'ext_export',
          display:    ext.label || ext.id,
          ext_id:     ext.id,
          ext_method: ext.method,
        });
      }
    } catch (_) { /* skip */ }
  }

  // Tier 3: local endpoints (user-configured)
  const localEps = cfg.get('clearboxMultiAi.localEndpoints') || [];
  for (const ep of localEps) {
    if (ep.url && ep.model && isLocalUrl(ep.url)) {
      available.push({
        tier:        'local_http',
        display:     ep.label || `Local: ${ep.model}`,
        local_url:   ep.url,
        local_model: ep.model,
      });
    }
  }

  return available;
}

// ─── Session Management ──────────────────────────────────────────────────────

function startNewSession() {
  // Close previous session if open
  if (sessionCtx) {
    store.closeSession(sessionCtx.session_id, sessionCtx.session_dir, turnSeq, getOverridePath());
  }

  turnSeq   = 0;
  const cfg = getConfig();

  const ctx = store.initSession({
    label:       `Session ${new Date().toISOString().substring(0, 10)}`,
    nodeConfigs: nodes.map(n => ({
      id:        n.id,
      label:     n.label,
      role:      n.role,
      slot_type: n.slot_type,
    })),
    mode,
    overridePath: getOverridePath(),
  });

  sessionCtx = { ...ctx, seq: 0 };
  postToWebview({ type: 'session_started', session_id: ctx.session_id });
}

function writeTurn({ node, role, content, source, chain_from_node }) {
  if (!sessionCtx) return null;
  turnSeq++;
  return store.appendTurn({
    session_id:       sessionCtx.session_id,
    turns_file:       sessionCtx.turns_file,
    seq:              turnSeq,
    node_id:          node.id,
    node_label:       node.label,
    slot_type:        node.slot_type,
    provider_tier:    node.provider?.tier    || (node.slot_type === 'HUMAN' ? 'none' : 'unknown'),
    provider_display: node.provider?.display || (node.slot_type === 'HUMAN' ? 'HUMAN' : ''),
    role,
    content,
    source,
    chain_from_node:  chain_from_node || null,
  });
}

function getSessions() {
  try {
    return store.listSessions(getOverridePath());
  } catch (_) {
    return [];
  }
}

function doExportSession(format) {
  if (!sessionCtx) {
    postToWebview({ type: 'error', node_id: null, message: 'No active session.' });
    return;
  }

  let content, ext;
  if (format === 'jsonl') {
    content = store.exportSessionJsonl(sessionCtx.session_id, getOverridePath());
    ext     = 'jsonl';
  } else {
    content = store.exportSessionMarkdown(sessionCtx.session_id, getOverridePath());
    ext     = 'md';
  }

  if (!content) {
    postToWebview({ type: 'error', node_id: null, message: 'Export failed — session data not found.' });
    return;
  }

  const filename = `${sessionCtx.session_id}.${ext}`;
  postToWebview({ type: 'export_ready', content, filename });
}

// ─── Default Nodes ───────────────────────────────────────────────────────────

function initDefaultNodes() {
  const cfg      = getConfig();
  const defaults = cfg.get('clearboxMultiAi.defaultNodes') || [];
  nodes    = [];
  nodeIdSeq = 0;

  for (const d of defaults) {
    if (nodeIdSeq >= MAX_NODES) break;
    addNode({
      label:     d.label     || 'Node',
      role:      d.role      || 'CUSTOM',
      slot_type: d.slot_type || 'LLM',
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfig()       { return vscode.workspace.getConfiguration(); }
function getOverridePath() { return getConfig().get('clearboxMultiAi.sessionStoragePath') || ''; }

function getWebviewHtml(context) {
  const htmlPath = path.join(context.extensionPath, 'ui', 'multi_ai_panel.html');
  if (fs.existsSync(htmlPath)) {
    return fs.readFileSync(htmlPath, 'utf8');
  }
  // Fallback minimal HTML if UI file missing
  return `<!DOCTYPE html><html><body>
    <h2>Multi-AI Orchestrator</h2>
    <p style="color:red">UI file not found: ui/multi_ai_panel.html</p>
  </body></html>`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { activate, deactivate };
