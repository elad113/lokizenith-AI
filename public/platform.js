/* Lokizen OpenRouter-Style Multi-User AI API Platform & Central Provider Admin Hub */
(function () {
  'use strict';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  const DEFAULT_MODELS = [
    {
      id: 'lokizen-4.0-stark',
      name: 'Lokizen 4.0 Stark (Flagship Frontier)',
      family: 'Lokiz Studios Flagship',
      description: '20× Parallel Turbo reasoning, code architecture, image understanding, and multi-provider routing.',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputCostPer1M: 0.4,
      outputCostPer1M: 1.2,
      streaming: true,
      activeProviderCount: 3,
      primaryProvider: 'Lokizen Primary Sovereign Cluster',
    },
    {
      id: 'lokizenith-3.5-fera',
      name: 'Lokizenith 3.5 Fera (Ultra-Low Latency)',
      family: 'Lokiz Studios Speed',
      description: 'High-speed everyday conversational & analytical model with sub-second time-to-first-token.',
      contextWindow: 64000,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.45,
      streaming: true,
      activeProviderCount: 3,
      primaryProvider: 'Lokizen Primary Sovereign Cluster',
    },
    {
      id: 'rewind-1.0',
      name: 'Lokizen ReWind 1.0 (Temporal & Video AI)',
      family: 'Lokiz Studios Video & Motion',
      description: 'Temporal synthesis, scene physics, and AI video generation model by Lokiz Studios.',
      contextWindow: 32000,
      maxOutputTokens: 4096,
      inputCostPer1M: 0.5,
      outputCostPer1M: 1.5,
      streaming: true,
      activeProviderCount: 2,
      primaryProvider: 'ReWind 1.0 Temporal Video Cluster',
    },
    {
      id: 'llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct (Central Cluster)',
      family: 'OpenRouter Central',
      description: 'High-throughput 70B parameter instruction model managed centrally by Lokizen.',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.25,
      outputCostPer1M: 0.75,
      streaming: true,
      activeProviderCount: 2,
      primaryProvider: 'Lokizen Primary Sovereign Cluster',
    },
    {
      id: 'mistral-small-3.2-24b',
      name: 'Mistral Small 3.2 24B (Central Cluster)',
      family: 'OpenRouter Central',
      description: 'Fast European reasoning & multilingual specialist routed via Lokizen Central Gateway.',
      contextWindow: 64000,
      maxOutputTokens: 8192,
      inputCostPer1M: 0.12,
      outputCostPer1M: 0.36,
      streaming: true,
      activeProviderCount: 2,
      primaryProvider: 'Lokizen Primary Sovereign Cluster',
    },
  ];

  const DEFAULT_PROVIDERS = [
    {
      id: 'prov_lokizen_cluster',
      name: 'Lokizen Primary Sovereign Cluster',
      type: 'lokizen-native',
      baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
      enabled: true,
      priority: 1,
      models: ['lokizen-4.0-stark', 'lokizenith-3.5-fera', 'llama-3.3-70b-instruct', 'mistral-small-3.2-24b'],
      credentialCount: 2,
      credentials: [
        { id: 'cred_lkz_primary_1', label: 'Primary Cluster Key #1', maskedPreview: 'lkz-prov••••99a1', enabled: true, usageCount: 14, failureCount: 0 },
        { id: 'cred_lkz_primary_2', label: 'Primary Cluster Key #2 (Replica)', maskedPreview: 'lkz-prov••••44b2', enabled: true, usageCount: 6, failureCount: 0 },
      ],
      healthStatus: 'healthy',
      lastLatencyMs: 285,
      lastCheckedAt: new Date().toISOString(),
      successCount: 20,
      errorCount: 0,
    },
    {
      id: 'prov_gemini_central',
      name: 'Google Gemini Central Cloud',
      type: 'gemini-central',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      enabled: true,
      priority: 2,
      models: ['lokizen-4.0-stark', 'lokizenith-3.5-fera'],
      credentialCount: 1,
      credentials: [
        { id: 'cred_gem_central_1', label: 'Central Gemini Production Credential', maskedPreview: 'AIza••••77f0', enabled: true, usageCount: 8, failureCount: 0 },
      ],
      healthStatus: 'healthy',
      lastLatencyMs: 310,
      lastCheckedAt: new Date().toISOString(),
      successCount: 8,
      errorCount: 0,
    },
    {
      id: 'prov_rewind_temporal',
      name: 'ReWind 1.0 Temporal Video Cluster',
      type: 'openai-compatible',
      baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
      enabled: true,
      priority: 3,
      models: ['rewind-1.0', 'lokizen-4.0-stark'],
      credentialCount: 1,
      credentials: [
        { id: 'cred_rewind_1', label: 'ReWind Temporal Engine Key', maskedPreview: 'lkz-rw10••••88e1', enabled: true, usageCount: 5, failureCount: 0 },
      ],
      healthStatus: 'healthy',
      lastLatencyMs: 340,
      lastCheckedAt: new Date().toISOString(),
      successCount: 5,
      errorCount: 0,
    },
    {
      id: 'prov_global_edge_fallback',
      name: 'Lokizen Global Edge Fallback',
      type: 'openai-compatible',
      baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
      enabled: true,
      priority: 4,
      models: ['lokizen-4.0-stark', 'lokizenith-3.5-fera', 'rewind-1.0', 'llama-3.3-70b-instruct', 'mistral-small-3.2-24b'],
      credentialCount: 1,
      credentials: [
        { id: 'cred_edge_fb_1', label: 'Multi-Region Failover Key', maskedPreview: 'lkz-edge••••55f9', enabled: true, usageCount: 2, failureCount: 0 },
      ],
      healthStatus: 'healthy',
      lastLatencyMs: 260,
      lastCheckedAt: new Date().toISOString(),
      successCount: 2,
      errorCount: 0,
    },
  ];

  const state = {
    initialized: false,
    mode: 'user', // 'user' | 'admin'
    userTab: 'keys', // 'keys' | 'models' | 'docs' | 'usage' | 'history' | 'playground' | 'account'
    adminTab: 'providers', // 'providers' | 'credentials' | 'models' | 'health' | 'users' | 'usage' | 'logs' | 'cost'
    userOverview: null,
    adminOverview: null,
    oneTimeKeyReveal: null, // Holds { rawKeyOnce, name, keyPrefix, keyLast4, keyHash } ONLY immediately after generation
    activeSessionKey: '', // Stored only in session memory for Playground testing if user generated a key in this session
    playgroundModel: 'lokizen-4.0-stark',
    playgroundPrompt: 'Explain in 3 concise bullet points how Lokizen Central Model Routing & Automatic Failover work.',
    playgroundStream: true,
    playgroundTemp: 0.6,
    playgroundOutput: '',
    playgroundMeta: null,
    playgroundBusy: false,
    firebaseUser: null,
  };

  function getOwnerId() {
    if (state.firebaseUser && state.firebaseUser.uid) return state.firebaseUser.uid;
    let anon = localStorage.getItem('lkz.platform.uid');
    if (!anon) {
      anon = 'usr_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('lkz.platform.uid', anon);
    }
    return anon;
  }

  async function fetchPlatformOverview() {
    try {
      const uid = getOwnerId();
      const r = await fetch(`/api/platform/overview?ownerId=${encodeURIComponent(uid)}`, {
        headers: { 'x-user-id': uid },
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) state.userOverview = j;
      }
    } catch (_e) {}
  }

  async function fetchAdminOverview() {
    try {
      const r = await fetch('/api/admin/overview');
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) state.adminOverview = j;
      }
    } catch (_e) {}
  }

  async function refreshAll() {
    renderPlatform();
    await Promise.all([fetchPlatformOverview(), fetchAdminOverview()]);
    renderPlatform();
  }

  function injectStyles() {
    if (document.getElementById('lkzPlatformStyles')) return;
    const st = document.createElement('style');
    st.id = 'lkzPlatformStyles';
    st.textContent = `
      .pf-shell {
        max-width: 1240px;
        margin: 0 auto;
        padding: 22px 24px 80px;
        color: #eafff5;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .pf-hero {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 24px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(4, 28, 19, 0.92), rgba(5, 16, 24, 0.94));
        border: 1px solid rgba(0, 255, 156, 0.32);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        margin-bottom: 18px;
      }
      .pf-hero-left h1 {
        margin: 0 0 6px;
        font-size: 1.45rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pf-hero-left p {
        margin: 0;
        font-size: 0.88rem;
        color: rgba(215, 250, 235, 0.78);
      }
      .pf-badge-central {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        background: rgba(0, 255, 156, 0.15);
        border: 1px solid rgba(0, 255, 156, 0.45);
        color: #00ff9c;
      }
      .pf-mode-switch {
        display: flex;
        gap: 8px;
        background: rgba(0, 0, 0, 0.42);
        padding: 5px;
        border-radius: 12px;
        border: 1px solid rgba(0, 255, 156, 0.24);
      }
      .pf-mode-btn {
        padding: 9px 16px;
        border-radius: 9px;
        border: none;
        background: transparent;
        color: rgba(220, 255, 240, 0.75);
        font-weight: 700;
        font-size: 0.84rem;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .pf-mode-btn.on {
        background: linear-gradient(135deg, #00ff9c, #00b874);
        color: #02140c;
        box-shadow: 0 4px 16px rgba(0, 255, 156, 0.32);
      }
      .pf-subnav {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 18px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 255, 156, 0.16);
      }
      .pf-tab-btn {
        padding: 8px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(8, 24, 18, 0.72);
        color: rgba(230, 255, 245, 0.82);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pf-tab-btn:hover {
        border-color: rgba(0, 255, 156, 0.4);
        color: #fff;
      }
      .pf-tab-btn.on {
        background: rgba(0, 255, 156, 0.18);
        border-color: #00ff9c;
        color: #00ff9c;
        font-weight: 700;
      }
      .pf-grid-kpi {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }
      .pf-kpi {
        padding: 16px 18px;
        border-radius: 14px;
        background: rgba(6, 22, 16, 0.85);
        border: 1px solid rgba(0, 255, 156, 0.2);
      }
      .pf-kpi-lbl {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(190, 240, 220, 0.68);
        margin-bottom: 6px;
      }
      .pf-kpi-val {
        font-size: 1.5rem;
        font-weight: 800;
        color: #fff;
        font-family: 'JetBrains Mono', monospace;
      }
      .pf-kpi-sub {
        font-size: 0.76rem;
        color: #00ff9c;
        margin-top: 4px;
      }
      .pf-card {
        padding: 20px 22px;
        border-radius: 16px;
        background: rgba(5, 19, 14, 0.88);
        border: 1px solid rgba(0, 255, 156, 0.22);
        margin-bottom: 18px;
      }
      .pf-card h3 {
        margin: 0 0 12px;
        font-size: 1.05rem;
        font-weight: 700;
        color: #eafff5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .pf-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .pf-input, .pf-select, .pf-textarea {
        background: rgba(2, 11, 8, 0.9);
        border: 1px solid rgba(0, 255, 156, 0.3);
        color: #eafff5;
        padding: 10px 13px;
        border-radius: 10px;
        font-size: 0.88rem;
        font-family: inherit;
      }
      .pf-input:focus, .pf-select:focus, .pf-textarea:focus {
        outline: none;
        border-color: #00ff9c;
        box-shadow: 0 0 0 2px rgba(0, 255, 156, 0.18);
      }
      .pf-btn {
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid rgba(0, 255, 156, 0.45);
        background: linear-gradient(135deg, #00ff9c, #00c47a);
        color: #03150d;
        font-weight: 800;
        font-size: 0.86rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .pf-btn.secondary {
        background: rgba(0, 255, 156, 0.12);
        color: #eafff5;
        font-weight: 600;
      }
      .pf-btn.danger {
        background: rgba(239, 68, 68, 0.16);
        border-color: rgba(239, 68, 68, 0.5);
        color: #fca5a5;
        font-weight: 600;
      }
      .pf-once-reveal {
        padding: 18px 20px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(0, 255, 156, 0.18), rgba(6, 40, 26, 0.92));
        border: 2px solid #00ff9c;
        margin-bottom: 18px;
        box-shadow: 0 10px 30px rgba(0, 255, 156, 0.2);
      }
      .pf-once-keybox {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.95rem;
        background: rgba(0, 0, 0, 0.65);
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid rgba(0, 255, 156, 0.45);
        color: #00ff9c;
        word-break: break-all;
        margin: 10px 0;
      }
      .pf-table-wrap {
        overflow-x: auto;
      }
      .pf-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .pf-table th, .pf-table td {
        padding: 11px 12px;
        text-align: left;
        vertical-align: top;
        color: #eafff5;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .pf-table th {
        color: rgba(185, 240, 215, 0.7);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .pf-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .pf-pill.ok {
        background: rgba(0, 255, 156, 0.16);
        color: #00ff9c;
        border: 1px solid rgba(0, 255, 156, 0.4);
      }
      .pf-pill.warn {
        background: rgba(250, 204, 21, 0.16);
        color: #fde047;
        border: 1px solid rgba(250, 204, 21, 0.4);
      }
      .pf-pill.err {
        background: rgba(239, 68, 68, 0.16);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.4);
      }
      .pf-code {
        background: #020a07;
        border: 1px solid rgba(0, 255, 156, 0.25);
        border-radius: 12px;
        padding: 14px 16px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.81rem;
        color: #d6fff0;
        overflow-x: auto;
        white-space: pre-wrap;
      }
    `;
    document.head.appendChild(st);
  }

  async function handleGenerateUserKey() {
    const nameInput = document.getElementById('pfNewKeyName');
    const name = (nameInput && nameInput.value.trim()) || 'Lokizen Production Key';
    const uid = getOwnerId();
    try {
      const r = await fetch('/api/platform/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          ownerId: uid,
          ownerEmail: state.firebaseUser?.email || undefined,
          name,
        }),
      });
      const data = await r.json();
      if (data && data.rawKeyOnce) {
        state.oneTimeKeyReveal = {
          rawKeyOnce: data.rawKeyOnce,
          name: data.metadata?.name || name,
          keyPrefix: data.metadata?.keyPrefix || data.rawKeyOnce.slice(0, 16),
          keyLast4: data.metadata?.keyLast4 || data.rawKeyOnce.slice(-4),
          keyHash: data.metadata?.keyHash || '',
        };
        state.activeSessionKey = data.rawKeyOnce;
        // Also persist hashed metadata ONLY to Firestore if user is signed in
        if (window.LokiFirebase && data.metadata) {
          window.LokiFirebase.saveHashedKeyToFirestore(data.metadata).catch(() => {});
        }
        await refreshAll();
      }
    } catch (_e) {}
  }

  async function handleRegenerateKey(keyId) {
    const uid = getOwnerId();
    try {
      const r = await fetch(`/api/platform/keys/${encodeURIComponent(keyId)}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ ownerId: uid }),
      });
      const data = await r.json();
      if (data && data.rawKeyOnce) {
        state.oneTimeKeyReveal = {
          rawKeyOnce: data.rawKeyOnce,
          name: data.metadata?.name || 'Regenerated Key',
          keyPrefix: data.metadata?.keyPrefix || data.rawKeyOnce.slice(0, 16),
          keyLast4: data.metadata?.keyLast4 || data.rawKeyOnce.slice(-4),
          keyHash: data.metadata?.keyHash || '',
        };
        state.activeSessionKey = data.rawKeyOnce;
        if (window.LokiFirebase && data.metadata) {
          window.LokiFirebase.revokeKeyInFirestore(keyId).catch(() => {});
          window.LokiFirebase.saveHashedKeyToFirestore(data.metadata).catch(() => {});
        }
        await refreshAll();
      }
    } catch (_e) {}
  }

  async function handleRevokeKey(keyId) {
    try {
      await fetch(`/api/platform/keys/${encodeURIComponent(keyId)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (window.LokiFirebase) {
        window.LokiFirebase.revokeKeyInFirestore(keyId).catch(() => {});
      }
      await refreshAll();
    } catch (_e) {}
  }

  async function handleDeleteKey(keyId) {
    try {
      await fetch(`/api/platform/keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
      });
      if (window.LokiFirebase) {
        window.LokiFirebase.deleteKeyInFirestore(keyId).catch(() => {});
      }
      await refreshAll();
    } catch (_e) {}
  }

  async function handleRunPlayground() {
    if (state.playgroundBusy) return;
    const keyInputEl = document.getElementById('pfPlayKeyInput');
    const modelSelEl = document.getElementById('pfPlayModelSelect');
    const promptInEl = document.getElementById('pfPlayPromptInput');
    const streamChkEl = document.getElementById('pfPlayStreamCheck');
    if (modelSelEl && modelSelEl.value) state.playgroundModel = modelSelEl.value;
    if (promptInEl && promptInEl.value.trim()) state.playgroundPrompt = promptInEl.value.trim();
    if (streamChkEl) state.playgroundStream = streamChkEl.checked;
    let bearerKey = (keyInputEl && keyInputEl.value.trim()) || state.activeSessionKey;

    state.playgroundBusy = true;
    state.playgroundOutput = '';
    state.playgroundMeta = null;
    renderPlatform();

    try {
      if (!bearerKey) {
        // Automatically generate a user key if none entered yet so user never gets stuck
        const genRes = await fetch('/api/platform/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId: getOwnerId(), name: 'Playground Auto Key' }),
        });
        const genData = await genRes.json();
        if (genData?.rawKeyOnce) {
          bearerKey = genData.rawKeyOnce;
          state.activeSessionKey = bearerKey;
          state.oneTimeKeyReveal = {
            rawKeyOnce: genData.rawKeyOnce,
            name: 'Playground Auto Key',
            keyPrefix: genData.metadata?.keyPrefix || bearerKey.slice(0, 16),
            keyLast4: genData.metadata?.keyLast4 || bearerKey.slice(-4),
            keyHash: genData.metadata?.keyHash || '',
          };
        }
      }

      const startMs = performance.now();
      const r = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerKey}`,
        },
        body: JSON.stringify({
          model: state.playgroundModel,
          messages: [{ role: 'user', content: state.playgroundPrompt }],
          temperature: Number(state.playgroundTemp) || 0.6,
          stream: Boolean(state.playgroundStream),
        }),
      });

      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}));
        state.playgroundOutput = `Error (HTTP ${r.status}): ${errJson?.error?.message || r.statusText}`;
        state.playgroundMeta = { status: r.status, ok: false };
      } else if (state.playgroundStream && r.body) {
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let routedProvider = 'Lokizen Central Cluster';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue;
            const d = line.slice(5).trim();
            if (d === '[DONE]') continue;
            try {
              const parsed = JSON.parse(d);
              if (parsed.provider) routedProvider = parsed.provider;
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (delta) {
                state.playgroundOutput += delta;
                const outEl = document.getElementById('pfPlayOutputBox');
                if (outEl) outEl.textContent = state.playgroundOutput + ' ▍';
              }
            } catch (_e) {}
          }
        }
        const elapsed = Math.round(performance.now() - startMs);
        state.playgroundMeta = {
          status: 200,
          ok: true,
          provider: routedProvider,
          latencyMs: elapsed,
          model: state.playgroundModel,
          stream: true,
        };
      } else {
        const data = await r.json();
        const elapsed = Math.round(performance.now() - startMs);
        state.playgroundOutput = data?.choices?.[0]?.message?.content || data?.reply || JSON.stringify(data, null, 2);
        state.playgroundMeta = {
          status: 200,
          ok: true,
          provider: data?.routing?.providerName || data?.provider || 'Lokizen Central Cluster',
          latencyMs: data?.routing?.latencyMs || elapsed,
          tokens: data?.usage?.total_tokens || 0,
          costUsd: data?.usage?.cost_usd || 0,
          model: data?.model || state.playgroundModel,
          fallbackUsed: Boolean(data?.routing?.fallbackUsed),
        };
      }
    } catch (e) {
      state.playgroundOutput = 'Request failed: ' + (e?.message || String(e));
    } finally {
      state.playgroundBusy = false;
      await refreshAll();
    }
  }

  function renderUserContent() {
    const ov = state.userOverview || {
      account: { uid: getOwnerId(), displayName: 'Lokizen Developer', role: 'user', quotaTokens: 1000000, usedTokens: 0, rateLimitRpm: 120 },
      keys: [],
      usage: { activeKeysCount: 0, totalRequests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, quotaTokens: 1000000, remainingTokens: 1000000, rateLimitRpm: 120, estimatedCostUsd: 0 },
      models: DEFAULT_MODELS,
      requestHistory: [],
    };
    const u = ov.usage || {};
    const keys = ov.keys || [];
    const models = (ov.models && ov.models.length > 0) ? ov.models : DEFAULT_MODELS;
    const history = ov.requestHistory || [];

    if (state.userTab === 'keys') {
      return `
        ${state.oneTimeKeyReveal ? `
          <div class="pf-once-reveal" id="pfOneTimeRevealBanner">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <span class="pf-pill ok">🔐 ONE-TIME SECRET KEY REVEAL</span>
                <h4 style="margin:8px 0 2px;font-size:1.02rem">Copy your new Lokizen API Key now: <b>${esc(state.oneTimeKeyReveal.name)}</b></h4>
                <p style="margin:0;font-size:0.8rem;color:rgba(220,255,240,0.82)">
                  For maximum security, Lokizen stores <b>only the SHA-256 cryptographic hash</b> (<code>${esc(state.oneTimeKeyReveal.keyHash.slice(0, 20))}…</code>) in Firestore and backend storage. This raw key will never be shown again once dismissed.
                </p>
              </div>
              <div class="pf-row">
                <button type="button" class="pf-btn" id="pfCopyOnceKeyBtn">⧉ Copy Full API Key</button>
                <button type="button" class="pf-btn secondary" id="pfDismissOnceKeyBtn">✓ I Saved It</button>
              </div>
            </div>
            <div class="pf-once-keybox" id="pfOneTimeKeyText">${esc(state.oneTimeKeyReveal.rawKeyOnce)}</div>
          </div>
        ` : ''}

        <div class="pf-card">
          <h3>
            <span>🔑 Automatic User API Keys (Zero External Keys Required)</span>
            <span class="pf-pill ok">SHA-256 Hashed Storage</span>
          </h3>
          <p style="margin:0 0 14px;font-size:0.85rem;color:rgba(210,250,235,0.78)">
            Generate your personal Lokizen API key below. Your key authenticates directly against <code>/v1/chat/completions</code> and automatically routes across all centrally managed Lokizen AI providers — you never need external provider credentials.
          </p>
          <div class="pf-row">
            <input type="text" id="pfNewKeyName" class="pf-input" style="min-width:260px;flex:1" placeholder="Key label (e.g. Production App, Cursor IDE, Mobile Client)" value="Lokizen Production Key">
            <button type="button" class="pf-btn" id="pfGenerateKeyBtn">⚡ Generate API Key</button>
          </div>
        </div>

        <div class="pf-card">
          <h3>
            <span>🗂️ Your Lokizen API Keys (${keys.length})</span>
            <span style="font-size:0.78rem;color:rgba(190,240,220,0.7)">Plaintext keys are never stored · Only SHA-256 hashes persisted</span>
          </h3>
          ${keys.length === 0 ? `
            <div style="padding:22px;text-align:center;color:rgba(200,245,225,0.65);border:1px dashed rgba(0,255,156,0.25);border-radius:12px">
              No API keys yet. Click <b>⚡ Generate API Key</b> above to create your first Lokizen API key!
            </div>
          ` : `
            <div class="pf-table-wrap">
              <table class="pf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key Prefix &amp; Last 4</th>
                    <th>SHA-256 Hash (Database Record)</th>
                    <th>Status</th>
                    <th>Requests</th>
                    <th>Tokens Used</th>
                    <th>Rate Limit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${keys.map(k => `
                    <tr>
                      <td><b>${esc(k.name)}</b></td>
                      <td><code>${esc(k.keyPrefix)}••••${esc(k.keyLast4)}</code></td>
                      <td><code title="${esc(k.keyHash)}">${esc((k.keyHash || '').slice(0, 16))}…</code></td>
                      <td>
                        <span class="pf-pill ${k.status === 'active' ? 'ok' : 'err'}">${esc(k.status)}</span>
                      </td>
                      <td>${Number(k.requestsCount || 0).toLocaleString()}</td>
                      <td>${Number(k.usedTokens || 0).toLocaleString()} / ${Number(k.quotaTokens || 1000000).toLocaleString()}</td>
                      <td>${k.rateLimitRpm || 120} RPM</td>
                      <td>
                        <div class="pf-row" style="gap:6px">
                          <button type="button" class="pf-btn secondary" style="padding:5px 10px;font-size:0.76rem" data-regen-key="${esc(k.id)}">↻ Regenerate</button>
                          ${k.status === 'active' ? `
                            <button type="button" class="pf-btn danger" style="padding:5px 10px;font-size:0.76rem" data-revoke-key="${esc(k.id)}">Revoke</button>
                          ` : ''}
                          <button type="button" class="pf-btn danger" style="padding:5px 10px;font-size:0.76rem" data-delete-key="${esc(k.id)}">✕</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    }

    if (state.userTab === 'models') {
      return `
        <div class="pf-card">
          <h3>
            <span>🧠 Centrally Managed AI Models (${models.length})</span>
            <span class="pf-pill ok">Automatic Multi-Provider Failover</span>
          </h3>
          <p style="margin:0 0 16px;font-size:0.85rem;color:rgba(210,250,235,0.78)">
            All models below are centrally hosted and routed by Lokizen. Pass any model ID to <code>POST /v1/chat/completions</code> with your Lokizen API key.
          </p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px">
            ${models.map(m => `
              <div style="padding:16px;border-radius:14px;background:rgba(2,12,9,0.85);border:1px solid rgba(0,255,156,0.24);display:flex;flex-direction:column;justify-content:space-between;gap:12px">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
                    <b style="font-size:1rem;color:#fff">${esc(m.name)}</b>
                    <span class="pf-pill ok">${esc(m.family)}</span>
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:0.79rem;color:#00ff9c;margin-bottom:8px">
                    model: "${esc(m.id)}"
                  </div>
                  <p style="margin:0 0 10px;font-size:0.82rem;color:rgba(210,250,235,0.78)">${esc(m.description)}</p>
                  <div style="font-size:0.76rem;color:rgba(190,240,220,0.72);margin-bottom:8px">
                    <b>Primary Route:</b> ${esc(m.primaryProvider || 'Lokizen Central Cluster')}<br>
                    <b>Context Window:</b> ${Number(m.contextWindow || 128000).toLocaleString()} tokens · <b>Pricing:</b> $${m.inputCostPer1M}/1M in · $${m.outputCostPer1M}/1M out
                  </div>
                </div>
                <div class="pf-row" style="justify-content:space-between">
                  <span style="font-size:0.74rem;color:#00ff9c">✓ ${m.activeProviderCount || 2} Active Central Providers</span>
                  <button type="button" class="pf-btn secondary" style="padding:6px 12px;font-size:0.78rem" data-try-model="${esc(m.id)}">Try in Playground →</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (state.userTab === 'docs') {
      const origin = window.location.origin;
      const sampleKey = state.activeSessionKey || 'YOUR_LOKIZEN_API_KEY';
      return `
        <div class="pf-card">
          <h3>
            <span>📘 Unified Public API Documentation — <code>/v1/chat/completions</code></span>
            <span class="pf-pill ok">OpenAI SDK 100% Compatible</span>
          </h3>
          <p style="margin:0 0 14px;font-size:0.86rem;color:rgba(215,250,235,0.8)">
            Authenticate every request using <code>Authorization: Bearer YOUR_LOKIZEN_API_KEY</code>. Lokizen handles model selection, central provider authentication, multi-credential rotation, and automatic failover behind the scenes.
          </p>

          <h4 style="margin:14px 0 8px;color:#00ff9c">1. cURL Request</h4>
          <pre class="pf-code">curl -X POST "${esc(origin)}/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${esc(sampleKey)}" \\
  -d '{
    "model": "lokizen-4.0-stark",
    "messages": [
      { "role": "user", "content": "Hello! Reply with a short greeting." }
    ],
    "stream": false
  }'</pre>

          <h4 style="margin:16px 0 8px;color:#00ff9c">2. JavaScript / TypeScript (Fetch or OpenAI SDK)</h4>
          <pre class="pf-code">const response = await fetch("${esc(origin)}/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${esc(sampleKey)}"
  },
  body: JSON.stringify({
    model: "lokizen-4.0-stark", // or "lokizenith-3.5-fera", "rewind-1.0", "llama-3.3-70b-instruct"
    messages: [{ role: "user", content: "Write a fast sorting algorithm in TypeScript." }],
    stream: true // Supports real-time Server-Sent Events (SSE) streaming!
  })
});</pre>

          <h4 style="margin:16px 0 8px;color:#00ff9c">3. Python (Official OpenAI Client Drop-In)</h4>
          <pre class="pf-code">from openai import OpenAI

client = OpenAI(
    base_url="${esc(origin)}/v1",
    api_key="${esc(sampleKey)}"
)

completion = client.chat.completions.create(
    model="lokizen-4.0-stark",
    messages=[{"role": "user", "content": "Hello from Lokizen OpenRouter Platform!"}]
)
print(completion.choices[0].message.content)</pre>
        </div>
      `;
    }

    if (state.userTab === 'usage') {
      const pct = Math.min(100, Math.round(((u.totalTokens || 0) / Math.max(1, u.quotaTokens || 1000000)) * 100));
      return `
        <div class="pf-grid-kpi">
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Total API Requests</div>
            <div class="pf-kpi-val">${Number(u.totalRequests || 0).toLocaleString()}</div>
            <div class="pf-kpi-sub">Across ${u.activeKeysCount || 0} active keys</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Total Tokens Processed</div>
            <div class="pf-kpi-val">${Number(u.totalTokens || 0).toLocaleString()}</div>
            <div class="pf-kpi-sub">${Number(u.promptTokens || 0).toLocaleString()} prompt · ${Number(u.completionTokens || 0).toLocaleString()} completion</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Token Quota Remaining</div>
            <div class="pf-kpi-val">${Number(u.remainingTokens ?? 1000000).toLocaleString()}</div>
            <div class="pf-kpi-sub">${pct}% of ${Number(u.quotaTokens || 1000000).toLocaleString()} used</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Rate Limit Tier</div>
            <div class="pf-kpi-val">${u.rateLimitRpm || 120} RPM</div>
            <div class="pf-kpi-sub">Managed Central Value: $${Number(u.estimatedCostUsd || 0).toFixed(4)}</div>
          </div>
        </div>

        <div class="pf-card">
          <h3><span>📊 Token Quota Consumption</span><span>${pct}% Used</span></h3>
          <div style="height:12px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#00ff9c,#38bdf8)"></div>
          </div>
          <div style="font-size:0.8rem;color:rgba(200,245,225,0.75)">
            All provider costs are absorbed centrally by Lokizen's multi-provider cluster. Your account is protected by automatic RPM rate limiting and token quotas.
          </div>
        </div>
      `;
    }

    if (state.userTab === 'history') {
      return `
        <div class="pf-card">
          <h3>
            <span>📜 Request History (${history.length})</span>
            <button type="button" class="pf-btn secondary" style="padding:6px 12px;font-size:0.78rem" id="pfRefreshHistoryBtn">↻ Refresh</button>
          </h3>
          ${history.length === 0 ? `
            <div style="padding:20px;text-align:center;color:rgba(200,245,225,0.65)">
              No API requests recorded yet. Send a test request in the <b>Model Playground</b> tab!
            </div>
          ` : `
            <div class="pf-table-wrap">
              <table class="pf-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Key Prefix</th>
                    <th>Model</th>
                    <th>Routed Central Provider</th>
                    <th>Latency</th>
                    <th>Tokens</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.map(h => `
                    <tr>
                      <td>${new Date(h.createdAt).toLocaleTimeString()}</td>
                      <td><code>${esc(h.keyPrefix)}…</code></td>
                      <td><b>${esc(h.model)}</b></td>
                      <td>
                        ${esc(h.providerName)}
                        ${h.fallbackUsed ? `<span class="pf-pill warn" style="margin-left:6px">Failover Used</span>` : ''}
                      </td>
                      <td>${h.latencyMs} ms</td>
                      <td>${h.totalTokens} (${h.promptTokens}+${h.completionTokens})</td>
                      <td><span class="pf-pill ok">HTTP ${h.statusCode}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    }

    if (state.userTab === 'playground') {
      return `
        <div class="pf-card">
          <h3>
            <span>🎮 Live Multi-Provider Model Playground (<code>POST /v1/chat/completions</code>)</span>
            <span class="pf-pill ok">Real Central Routing</span>
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:12px">
            <div>
              <label style="display:block;font-size:0.76rem;margin-bottom:4px;color:rgba(200,245,225,0.75)">Select Model</label>
              <select id="pfPlayModelSelect" class="pf-select" style="width:100%">
                ${models.map(m => `<option value="${esc(m.id)}" ${state.playgroundModel === m.id ? 'selected' : ''}>${esc(m.name)} (${esc(m.id)})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block;font-size:0.76rem;margin-bottom:4px;color:rgba(200,245,225,0.75)">Your Lokizen API Key (Auto-filled if generated)</label>
              <input type="password" id="pfPlayKeyInput" class="pf-input" style="width:100%" placeholder="lkz-stark-... (leave blank to auto-generate)" value="${esc(state.activeSessionKey)}">
            </div>
            <div style="display:flex;align-items:flex-end;gap:12px">
              <label style="display:flex;align-items:center;gap:6px;font-size:0.84rem;cursor:pointer">
                <input type="checkbox" id="pfPlayStreamCheck" ${state.playgroundStream ? 'checked' : ''}>
                <span>Stream SSE (<code>stream: true</code>)</span>
              </label>
            </div>
          </div>
          <textarea id="pfPlayPromptInput" class="pf-textarea" rows="3" style="width:100%;margin-bottom:12px">${esc(state.playgroundPrompt)}</textarea>
          <div class="pf-row" style="justify-content:space-between">
            <span style="font-size:0.78rem;color:rgba(190,240,220,0.72)">
              Endpoint: <code>POST /v1/chat/completions</code> · Central Provider Failover Enabled
            </span>
            <button type="button" class="pf-btn" id="pfRunPlaygroundBtn" ${state.playgroundBusy ? 'disabled' : ''}>
              ${state.playgroundBusy ? '⚡ Routing & Streaming…' : '🚀 Send Live API Request'}
            </button>
          </div>

          ${state.playgroundMeta ? `
            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">
              <span class="pf-pill ${state.playgroundMeta.ok ? 'ok' : 'err'}">HTTP ${state.playgroundMeta.status}</span>
              ${state.playgroundMeta.provider ? `<span class="pf-pill ok">Routed via: ${esc(state.playgroundMeta.provider)}</span>` : ''}
              ${state.playgroundMeta.latencyMs ? `<span class="pf-pill ok">Latency: ${state.playgroundMeta.latencyMs} ms</span>` : ''}
              ${state.playgroundMeta.tokens ? `<span class="pf-pill ok">Tokens: ${state.playgroundMeta.tokens}</span>` : ''}
            </div>
          ` : ''}

          <pre class="pf-code" id="pfPlayOutputBox" style="margin-top:12px;min-height:110px">${esc(state.playgroundOutput || '// Click "Send Live API Request" to test /v1/chat/completions with automatic provider routing.')}</pre>
        </div>
      `;
    }

    // Account Management tab
    const acct = ov.account || {};
    const fbUser = state.firebaseUser;
    return `
      <div class="pf-card">
        <h3>
          <span>👤 Account Management &amp; Firebase Auth</span>
          <span class="pf-pill ok">Role: ${esc((fbUser?.role || acct.role || 'user').toUpperCase())}</span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:16px">
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Account Identity</div>
            <div class="pf-kpi-val" style="font-size:1.05rem">${esc(fbUser?.displayName || acct.displayName || 'Lokizen Developer')}</div>
            <div class="pf-kpi-sub">${esc(fbUser?.email || acct.email || `UID: ${acct.uid}`)}</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Assigned Token Quota</div>
            <div class="pf-kpi-val">${Number(acct.quotaTokens || 1000000).toLocaleString()}</div>
            <div class="pf-kpi-sub">Rate Limit: ${acct.rateLimitRpm || 120} requests / min</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Database Sync</div>
            <div class="pf-kpi-val" style="font-size:1.05rem">Firebase Firestore</div>
            <div class="pf-kpi-sub">Hashed API keys &amp; usage persisted</div>
          </div>
        </div>
        <div class="pf-row">
          ${fbUser ? `
            <button type="button" class="pf-btn secondary" id="pfFirebaseSignOutBtn">Sign Out of Google (${esc(fbUser.email)})</button>
          ` : `
            <button type="button" class="pf-btn" id="pfFirebaseSignInBtn">🔐 Sign in with Google (Firebase Auth)</button>
          `}
        </div>
      </div>
    `;
  }

  function renderAdminContent() {
    const ad = state.adminOverview || {
      providers: DEFAULT_PROVIDERS,
      models: DEFAULT_MODELS.map(m => ({ ...m, providers: ['Lokizen Primary Sovereign Cluster', 'Lokizen Global Edge Fallback'] })),
      users: [
        { uid: 'usr_admin_lokiz', displayName: 'Lokizen Platform Admin', email: 'admin@lokiz.ai', role: 'admin', quotaTokens: 100000000, usedTokens: 1420, rateLimitRpm: 1000, requestsCount: 12 },
        { uid: getOwnerId(), displayName: 'Lokizen Developer', email: 'developer@lokiz.ai', role: 'user', quotaTokens: 1000000, usedTokens: 0, rateLimitRpm: 120, requestsCount: 0 },
      ],
      keys: [],
      requestLogs: [],
      metrics: {
        totalProviders: DEFAULT_PROVIDERS.length,
        enabledProviders: DEFAULT_PROVIDERS.length,
        healthyProviders: DEFAULT_PROVIDERS.length,
        totalCredentials: 5,
        totalUsers: 2,
        totalActiveKeys: 1,
        totalPlatformRequests: 12,
        totalPlatformTokens: 1420,
        fallbackTriggersCount: 0,
        totalCostUsd: 0.0018,
        costByProvider: [
          { providerName: 'Lokizen Primary Sovereign Cluster', requests: 10, tokens: 1200, costUsd: 0.0015 },
          { providerName: 'Google Gemini Central Cloud', requests: 2, tokens: 220, costUsd: 0.0003 },
        ],
        costByModel: [
          { model: 'lokizen-4.0-stark', requests: 9, tokens: 1100, costUsd: 0.0014 },
          { model: 'lokizenith-3.5-fera', requests: 3, tokens: 320, costUsd: 0.0004 },
        ],
      },
    };
    const m = ad.metrics || {};
    const providers = (ad.providers && ad.providers.length > 0) ? ad.providers : DEFAULT_PROVIDERS;
    const users = (ad.users && ad.users.length > 0) ? ad.users : [
      { uid: 'usr_admin_lokiz', displayName: 'Lokizen Platform Admin', email: 'admin@lokiz.ai', role: 'admin', quotaTokens: 100000000, usedTokens: 1420, rateLimitRpm: 1000, requestsCount: 12 },
    ];
    const logs = ad.requestLogs || [];

    if (state.adminTab === 'providers') {
      return `
        <div class="pf-grid-kpi">
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Central AI Providers</div>
            <div class="pf-kpi-val">${m.enabledProviders || 0} / ${m.totalProviders || 0}</div>
            <div class="pf-kpi-sub">${m.healthyProviders || 0} Healthy &amp; Online</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Server-Side Credentials</div>
            <div class="pf-kpi-val">${m.totalCredentials || 0}</div>
            <div class="pf-kpi-sub">Encrypted in Backend Vault</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Platform Requests</div>
            <div class="pf-kpi-val">${Number(m.totalPlatformRequests || 0).toLocaleString()}</div>
            <div class="pf-kpi-sub">${m.fallbackTriggersCount || 0} automatic failovers</div>
          </div>
          <div class="pf-kpi">
            <div class="pf-kpi-lbl">Total Platform Cost</div>
            <div class="pf-kpi-val">$${Number(m.totalCostUsd || 0).toFixed(4)}</div>
            <div class="pf-kpi-sub">${Number(m.totalPlatformTokens || 0).toLocaleString()} tokens routed</div>
          </div>
        </div>

        <div class="pf-card">
          <h3>
            <span>➕ Add Central AI Provider (Backend-Managed Credentials)</span>
            <span class="pf-pill ok">Secrets Never Leave Server</span>
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:12px">
            <input type="text" id="pfAdmProvName" class="pf-input" placeholder="Provider Name (e.g. OpenAI Enterprise, Anthropic)">
            <input type="text" id="pfAdmProvUrl" class="pf-input" placeholder="Endpoint URL (https://.../v1/chat/completions)" value="https://api.openai.com/v1/chat/completions">
            <input type="text" id="pfAdmProvModels" class="pf-input" placeholder="Model IDs (comma-separated)" value="lokizen-4.0-stark, gpt-4o">
            <input type="number" id="pfAdmProvPriority" class="pf-input" placeholder="Priority (1 = highest)" value="${providers.length + 1}">
            <input type="password" id="pfAdmProvSecret" class="pf-input" placeholder="Server-Side Provider API Key (sk-...)">
          </div>
          <button type="button" class="pf-btn" id="pfAddProviderBtn">🛡️ Save Central Provider to Backend</button>
        </div>

        <div class="pf-card">
          <h3><span>🌐 All Central AI Providers (${providers.length})</span></h3>
          <div class="pf-table-wrap">
            <table class="pf-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Provider Name</th>
                  <th>Endpoint Base URL</th>
                  <th>Supported Models</th>
                  <th>Credentials</th>
                  <th>Health &amp; Latency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${providers.map(p => `
                  <tr>
                    <td><b>#${p.priority}</b></td>
                    <td><b>${esc(p.name)}</b><br><small style="color:rgba(190,240,220,0.6)">${esc(p.type)}</small></td>
                    <td><code style="font-size:0.75rem">${esc(p.baseUrl)}</code></td>
                    <td>${(p.models || []).map(mod => `<span class="pf-pill ok" style="margin:2px">${esc(mod)}</span>`).join(' ')}</td>
                    <td>${p.credentialCount} keys</td>
                    <td>
                      <span class="pf-pill ${p.healthStatus === 'healthy' ? 'ok' : p.healthStatus === 'degraded' ? 'warn' : 'err'}">
                        ${esc(p.healthStatus)} · ${p.lastLatencyMs}ms
                      </span>
                    </td>
                    <td>
                      <span class="pf-pill ${p.enabled ? 'ok' : 'err'}">${p.enabled ? 'Enabled' : 'Disabled'}</span>
                    </td>
                    <td>
                      <div class="pf-row" style="gap:6px">
                        <button type="button" class="pf-btn secondary" style="padding:5px 10px;font-size:0.75rem" data-toggle-prov="${esc(p.id)}">
                          ${p.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" class="pf-btn secondary" style="padding:5px 10px;font-size:0.75rem" data-test-prov="${esc(p.id)}">
                          🩺 Test
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (state.adminTab === 'credentials') {
      return `
        <div class="pf-card">
          <h3>
            <span>🔐 Provider API Credentials Vault (Multi-Credential Rotation)</span>
            <span class="pf-pill ok">Server-Side Only · Masked Preview</span>
          </h3>
          <p style="margin:0 0 14px;font-size:0.84rem;color:rgba(210,250,235,0.78)">
            Add multiple API credentials per provider for automatic load distribution and instant failover if one credential hits an upstream rate limit.
          </p>
          <div class="pf-row" style="margin-bottom:18px">
            <select id="pfCredProvSelect" class="pf-select" style="min-width:240px">
              ${providers.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}
            </select>
            <input type="text" id="pfCredLabelInput" class="pf-input" placeholder="Credential Label (e.g. Replica Key #2)">
            <input type="password" id="pfCredSecretInput" class="pf-input" style="flex:1;min-width:220px" placeholder="Provider Secret API Key (Stored strictly on server)">
            <button type="button" class="pf-btn" id="pfAddCredBtn">➕ Add Credential</button>
          </div>

          ${providers.map(p => `
            <div style="padding:14px;border-radius:12px;background:rgba(2,11,8,0.75);border:1px solid rgba(0,255,156,0.18);margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <b>${esc(p.name)} (${(p.credentials || []).length} credentials)</b>
                <span class="pf-pill ok">Priority #${p.priority}</span>
              </div>
              <div class="pf-table-wrap">
                <table class="pf-table">
                  <thead>
                    <tr>
                      <th>Label</th>
                      <th>Masked Secret Fingerprint</th>
                      <th>Requests Routed</th>
                      <th>Failures</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(p.credentials || []).map(c => `
                      <tr>
                        <td>${esc(c.label)}</td>
                        <td><code>${esc(c.maskedPreview)}</code></td>
                        <td>${c.usageCount || 0}</td>
                        <td>${c.failureCount || 0}</td>
                        <td>
                          <button type="button" class="pf-btn danger" style="padding:4px 9px;font-size:0.74rem" data-del-cred="${esc(p.id)}:::${esc(c.id)}">Remove</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (state.adminTab === 'models') {
      return `
        <div class="pf-card">
          <h3><span>🧭 Available Models &amp; Central Provider Routing Matrix</span></h3>
          <div class="pf-table-wrap">
            <table class="pf-table">
              <thead>
                <tr>
                  <th>Model ID</th>
                  <th>Display Name</th>
                  <th>Context</th>
                  <th>Input / Output Cost (1M)</th>
                  <th>Assigned Central Providers</th>
                </tr>
              </thead>
              <tbody>
                ${(ad.models || []).map(mod => `
                  <tr>
                    <td><code>${esc(mod.id)}</code></td>
                    <td><b>${esc(mod.name)}</b></td>
                    <td>${Number(mod.contextWindow).toLocaleString()}</td>
                    <td>$${mod.inputCostPer1M} / $${mod.outputCostPer1M}</td>
                    <td>${(mod.providers || []).map(pr => `<span class="pf-pill ok" style="margin:2px">${esc(pr)}</span>`).join(' ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (state.adminTab === 'health') {
      return `
        <div class="pf-card">
          <h3>
            <span>🩺 Central Provider Health &amp; Live Connectivity Monitor</span>
            <button type="button" class="pf-btn" id="pfTestAllProvidersBtn">⚡ Test All Providers Now</button>
          </h3>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px">
            ${providers.map(p => `
              <div style="padding:16px;border-radius:14px;background:rgba(3,14,10,0.88);border:1px solid rgba(0,255,156,0.22)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <b>${esc(p.name)}</b>
                  <span class="pf-pill ${p.healthStatus === 'healthy' ? 'ok' : 'warn'}">${esc(p.healthStatus)}</span>
                </div>
                <div style="font-size:0.8rem;color:rgba(200,245,225,0.75);margin-bottom:12px">
                  Latency: <b>${p.lastLatencyMs} ms</b><br>
                  Successes: <b>${p.successCount}</b> · Errors: <b>${p.errorCount}</b><br>
                  Last Checked: ${p.lastCheckedAt ? new Date(p.lastCheckedAt).toLocaleTimeString() : 'Never'}
                </div>
                <button type="button" class="pf-btn secondary" style="width:100%;justify-content:center" data-test-prov="${esc(p.id)}">
                  🩺 Run Live Connectivity Probe
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (state.adminTab === 'users') {
      return `
        <div class="pf-card">
          <h3><span>👥 User Management, Quotas &amp; Rate Limits (${users.length})</span></h3>
          <div class="pf-table-wrap">
            <table class="pf-table">
              <thead>
                <tr>
                  <th>User / UID</th>
                  <th>Role</th>
                  <th>Used Tokens</th>
                  <th>Token Quota</th>
                  <th>Rate Limit (RPM)</th>
                  <th>Requests</th>
                  <th>Update Quota &amp; RPM</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td><b>${esc(u.displayName)}</b><br><small style="color:rgba(190,240,220,0.65)">${esc(u.email || u.uid)}</small></td>
                    <td><span class="pf-pill ok">${esc(u.role)}</span></td>
                    <td>${Number(u.usedTokens || 0).toLocaleString()}</td>
                    <td>
                      <input type="number" class="pf-input" style="width:120px;padding:5px 8px" id="pfQuota_${esc(u.uid)}" value="${u.quotaTokens || 1000000}">
                    </td>
                    <td>
                      <input type="number" class="pf-input" style="width:85px;padding:5px 8px" id="pfRpm_${esc(u.uid)}" value="${u.rateLimitRpm || 120}">
                    </td>
                    <td>${u.requestsCount || 0}</td>
                    <td>
                      <button type="button" class="pf-btn secondary" style="padding:5px 10px;font-size:0.76rem" data-save-user="${esc(u.uid)}">💾 Save</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (state.adminTab === 'usage' || state.adminTab === 'logs') {
      return `
        <div class="pf-card">
          <h3><span>📡 Platform-Wide API Usage &amp; Live Request Logs (${logs.length})</span></h3>
          ${logs.length === 0 ? `
            <div style="padding:18px;text-align:center;color:rgba(200,245,225,0.65)">No platform requests logged yet.</div>
          ` : `
            <div class="pf-table-wrap">
              <table class="pf-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Key Prefix</th>
                    <th>Model</th>
                    <th>Winning Provider</th>
                    <th>Latency</th>
                    <th>Tokens</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.map(l => `
                    <tr>
                      <td>${new Date(l.createdAt).toLocaleTimeString()}</td>
                      <td>${esc(l.ownerName || l.ownerId)}</td>
                      <td><code>${esc(l.keyPrefix)}…</code></td>
                      <td><b>${esc(l.model)}</b></td>
                      <td>${esc(l.providerName)} ${l.fallbackUsed ? '<span class="pf-pill warn">Failover</span>' : ''}</td>
                      <td>${l.latencyMs} ms</td>
                      <td>${l.totalTokens}</td>
                      <td>$${Number(l.costUsd || 0).toFixed(6)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    }

    // Cost Monitoring tab
    return `
      <div class="pf-card">
        <h3>
          <span>💰 Central Provider Cost Monitoring</span>
          <span class="pf-pill ok">Total Spend: $${Number(m.totalCostUsd || 0).toFixed(5)}</span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
          <div>
            <h4 style="margin:0 0 10px;color:#00ff9c">Cost by Central Provider</h4>
            <table class="pf-table">
              <thead>
                <tr><th>Provider</th><th>Requests</th><th>Tokens</th><th>Cost (USD)</th></tr>
              </thead>
              <tbody>
                ${(m.costByProvider || []).map(cp => `
                  <tr>
                    <td>${esc(cp.providerName)}</td>
                    <td>${cp.requests}</td>
                    <td>${Number(cp.tokens || 0).toLocaleString()}</td>
                    <td>$${Number(cp.costUsd || 0).toFixed(5)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div>
            <h4 style="margin:0 0 10px;color:#00ff9c">Cost by Model ID</h4>
            <table class="pf-table">
              <thead>
                <tr><th>Model</th><th>Requests</th><th>Tokens</th><th>Cost (USD)</th></tr>
              </thead>
              <tbody>
                ${(m.costByModel || []).map(cm => `
                  <tr>
                    <td><code>${esc(cm.model)}</code></td>
                    <td>${cm.requests}</td>
                    <td>${Number(cm.tokens || 0).toLocaleString()}</td>
                    <td>$${Number(cm.costUsd || 0).toFixed(5)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderPlatform() {
    injectStyles();
    const container = document.getElementById('platformView');
    if (!container) return;

    const userTabs = [
      ['keys', '🔑 Generate API Key'],
      ['models', '🧠 Available Models'],
      ['docs', '📘 API Documentation'],
      ['usage', '📊 Usage Statistics'],
      ['history', '📜 Request History'],
      ['playground', '🎮 Model Playground'],
      ['account', '👤 Account Management'],
    ];

    const adminTabs = [
      ['providers', '🌐 All Providers'],
      ['credentials', '🔐 Provider Credentials'],
      ['models', '🧭 Available Models'],
      ['health', '🩺 Provider Health'],
      ['users', '👥 User Management'],
      ['usage', '📈 API Usage'],
      ['logs', '📡 Request Logs'],
      ['cost', '💰 Cost Monitoring'],
    ];

    container.innerHTML = `
      <div class="pf-shell">
        <div class="pf-hero">
          <div class="pf-hero-left">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <button type="button" class="pf-btn secondary" id="pfBackToChatBtn" style="padding:5px 11px;font-size:0.78rem">‹ Back to Chat</button>
              <span class="pf-badge-central">⚡ LOKIZEN CENTRAL AI GATEWAY · /v1/chat/completions</span>
            </div>
            <h1>🌐 Lokizen OpenRouter API Platform</h1>
            <p>Centralized AI Provider Management · Automatic User API Keys (SHA-256 Hashed) · Multi-Provider Failover Routing</p>
          </div>
          <div class="pf-mode-switch" role="tablist">
            <button type="button" class="pf-mode-btn ${state.mode === 'user' ? 'on' : ''}" data-pf-mode="user">
              👤 User Dashboard
            </button>
            <button type="button" class="pf-mode-btn ${state.mode === 'admin' ? 'on' : ''}" data-pf-mode="admin">
              🛡️ Admin Dashboard (Providers)
            </button>
          </div>
        </div>

        <div class="pf-subnav" role="tablist">
          ${(state.mode === 'user' ? userTabs : adminTabs)
            .map(([id, label]) => {
              const active = state.mode === 'user' ? state.userTab === id : state.adminTab === id;
              return `<button type="button" class="pf-tab-btn ${active ? 'on' : ''}" data-pf-tab="${id}">${label}</button>`;
            })
            .join('')}
        </div>

        <div id="pfBodyContent">
          ${state.mode === 'user' ? renderUserContent() : renderAdminContent()}
        </div>
      </div>
    `;

    bindPlatformEvents(container);
  }

  function bindPlatformEvents(root) {
    const backBtn = root.querySelector('#pfBackToChatBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        const newChatBtn = document.getElementById('newChat');
        if (newChatBtn) newChatBtn.click();
      };
    }

    root.querySelectorAll('[data-pf-mode]').forEach((btn) => {
      btn.onclick = () => {
        state.mode = btn.getAttribute('data-pf-mode');
        renderPlatform();
      };
    });

    root.querySelectorAll('[data-pf-tab]').forEach((btn) => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-pf-tab');
        if (state.mode === 'user') state.userTab = tab;
        else state.adminTab = tab;
        renderPlatform();
      };
    });

    const genBtn = root.querySelector('#pfGenerateKeyBtn');
    if (genBtn) genBtn.onclick = handleGenerateUserKey;

    const copyOnceBtn = root.querySelector('#pfCopyOnceKeyBtn');
    if (copyOnceBtn && state.oneTimeKeyReveal) {
      copyOnceBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(state.oneTimeKeyReveal.rawKeyOnce);
          copyOnceBtn.textContent = '✓ Copied to Clipboard!';
        } catch (_e) {}
      };
    }

    const dismissOnceBtn = root.querySelector('#pfDismissOnceKeyBtn');
    if (dismissOnceBtn) {
      dismissOnceBtn.onclick = () => {
        state.oneTimeKeyReveal = null;
        renderPlatform();
      };
    }

    root.querySelectorAll('[data-regen-key]').forEach((b) => {
      b.onclick = () => handleRegenerateKey(b.getAttribute('data-regen-key'));
    });

    root.querySelectorAll('[data-revoke-key]').forEach((b) => {
      b.onclick = () => handleRevokeKey(b.getAttribute('data-revoke-key'));
    });

    root.querySelectorAll('[data-delete-key]').forEach((b) => {
      b.onclick = () => handleDeleteKey(b.getAttribute('data-delete-key'));
    });

    root.querySelectorAll('[data-try-model]').forEach((b) => {
      b.onclick = () => {
        state.playgroundModel = b.getAttribute('data-try-model');
        state.userTab = 'playground';
        renderPlatform();
      };
    });

    const refreshHistBtn = root.querySelector('#pfRefreshHistoryBtn');
    if (refreshHistBtn) refreshHistBtn.onclick = refreshAll;

    const playModelSel = root.querySelector('#pfPlayModelSelect');
    if (playModelSel) {
      playModelSel.onchange = () => {
        state.playgroundModel = playModelSel.value;
      };
    }

    const playStreamChk = root.querySelector('#pfPlayStreamCheck');
    if (playStreamChk) {
      playStreamChk.onchange = () => {
        state.playgroundStream = playStreamChk.checked;
      };
    }

    const playPromptIn = root.querySelector('#pfPlayPromptInput');
    if (playPromptIn) {
      playPromptIn.oninput = () => {
        state.playgroundPrompt = playPromptIn.value;
      };
    }

    const runPlayBtn = root.querySelector('#pfRunPlaygroundBtn');
    if (runPlayBtn) runPlayBtn.onclick = handleRunPlayground;

    const signInBtn = root.querySelector('#pfFirebaseSignInBtn');
    if (signInBtn && window.LokiFirebase) {
      signInBtn.onclick = async () => {
        try {
          const u = await window.LokiFirebase.signInWithGoogle();
          state.firebaseUser = u;
          await refreshAll();
        } catch (_e) {}
      };
    }

    const signOutBtn = root.querySelector('#pfFirebaseSignOutBtn');
    if (signOutBtn && window.LokiFirebase) {
      signOutBtn.onclick = async () => {
        try {
          await window.LokiFirebase.signOutUser();
          state.firebaseUser = null;
          await refreshAll();
        } catch (_e) {}
      };
    }

    // Admin actions
    const addProvBtn = root.querySelector('#pfAddProviderBtn');
    if (addProvBtn) {
      addProvBtn.onclick = async () => {
        const name = root.querySelector('#pfAdmProvName')?.value?.trim() || 'Custom AI Provider';
        const baseUrl = root.querySelector('#pfAdmProvUrl')?.value?.trim() || 'https://api.openai.com/v1/chat/completions';
        const models = root.querySelector('#pfAdmProvModels')?.value?.trim() || 'lokizen-4.0-stark';
        const priority = Number(root.querySelector('#pfAdmProvPriority')?.value || 5);
        const apiKey = root.querySelector('#pfAdmProvSecret')?.value?.trim() || '';
        const r = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, baseUrl, models, priority, apiKey }),
        });
        if (r.ok) {
          const d = await r.json();
          if (window.LokiFirebase && d.provider) {
            window.LokiFirebase.syncProviderToFirestore(d.provider).catch(() => {});
          }
          await refreshAll();
        }
      };
    }

    root.querySelectorAll('[data-toggle-prov]').forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute('data-toggle-prov');
        await fetch(`/api/admin/providers/${encodeURIComponent(id)}/toggle`, { method: 'PATCH' });
        await refreshAll();
      };
    });

    root.querySelectorAll('[data-test-prov]').forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute('data-test-prov');
        b.textContent = 'Testing…';
        await fetch(`/api/admin/providers/${encodeURIComponent(id)}/test`, { method: 'POST' });
        await refreshAll();
      };
    });

    const testAllProvBtn = root.querySelector('#pfTestAllProvidersBtn');
    if (testAllProvBtn) {
      testAllProvBtn.onclick = async () => {
        testAllProvBtn.textContent = '⚡ Probing All Central Providers…';
        const list = state.adminOverview?.providers || [];
        for (const p of list) {
          await fetch(`/api/admin/providers/${encodeURIComponent(p.id)}/test`, { method: 'POST' });
        }
        await refreshAll();
      };
    }

    const addCredBtn = root.querySelector('#pfAddCredBtn');
    if (addCredBtn) {
      addCredBtn.onclick = async () => {
        const provId = root.querySelector('#pfCredProvSelect')?.value;
        const label = root.querySelector('#pfCredLabelInput')?.value?.trim() || 'Additional Server Credential';
        const secretKey = root.querySelector('#pfCredSecretInput')?.value?.trim() || '';
        if (!provId || !secretKey) return;
        await fetch(`/api/admin/providers/${encodeURIComponent(provId)}/credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, secretKey }),
        });
        await refreshAll();
      };
    }

    root.querySelectorAll('[data-del-cred]').forEach((b) => {
      b.onclick = async () => {
        const [provId, credId] = String(b.getAttribute('data-del-cred')).split(':::');
        if (!provId || !credId) return;
        await fetch(`/api/admin/providers/${encodeURIComponent(provId)}/credentials/${encodeURIComponent(credId)}`, {
          method: 'DELETE',
        });
        await refreshAll();
      };
    });

    root.querySelectorAll('[data-save-user]').forEach((b) => {
      b.onclick = async () => {
        const uid = b.getAttribute('data-save-user');
        const quotaTokens = Number(root.querySelector(`#pfQuota_${uid}`)?.value || 1000000);
        const rateLimitRpm = Number(root.querySelector(`#pfRpm_${uid}`)?.value || 120);
        await fetch(`/api/admin/users/${encodeURIComponent(uid)}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quotaTokens, rateLimitRpm }),
        });
        await refreshAll();
      };
    });
  }

  function onShow(initialMode, initialTab) {
    document.querySelectorAll('.geo-ask').forEach((el) => el.remove());
    if (initialMode) state.mode = initialMode;
    if (initialTab) {
      if (state.mode === 'admin') state.adminTab = initialTab;
      else state.userTab = initialTab;
    }
    if (!state.initialized) {
      state.initialized = true;
      if (window.LokiFirebase && typeof window.LokiFirebase.onUserChange === 'function') {
        window.LokiFirebase.onUserChange((u) => {
          state.firebaseUser = u;
          renderPlatform();
        });
      }
    }
    renderPlatform();
    refreshAll();
  }

  window.LokiPlatform = {
    onShow,
    refreshAll,
    renderPlatform,
    openUserTab(tab) {
      if (window.App && typeof window.App.showView === 'function' && window.App.state?.view !== 'platform') {
        window.App.showView('platform');
      }
      onShow('user', tab);
    },
    openAdminTab(tab) {
      if (window.App && typeof window.App.showView === 'function' && window.App.state?.view !== 'platform') {
        window.App.showView('platform');
      }
      onShow('admin', tab);
    },
  };

  const initPlatformNow = () => {
    renderPlatform();
    refreshAll();
    if (location.hash === '#platform' || location.hash === '#admin') {
      const m = location.hash === '#admin' ? 'admin' : 'user';
      if (window.App && typeof window.App.showView === 'function') {
        window.App.showView('platform');
      }
      onShow(m);
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initPlatformNow);
  } else {
    initPlatformNow();
  }
})();
