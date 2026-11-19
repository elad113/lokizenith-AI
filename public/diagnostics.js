/* ============================================================================
   Lokizenith AI — Real API Connection Testing & Diagnostics Suite (/public/diagnostics.js)
   - Integrates seamlessly into the Lokizen 4.0 Stark Developer API Gateway
   - 100% Real HTTP Requests (no simulated responses)
   - Zero API key exposure in frontend console logs; redacts keys in all UI inspectors
   - Tests:
     1. Gateway Health Check: GET /api/v1/chat/completions
     2. API Authentication Test: Authorization: Bearer USER_API_KEY
     3. Model Testing (Individual & TEST ALL MODELS):
        • lokizen-4.0-stark
        • lokizenith-3.5-fera
        • rewind-1.0
     4. Real Chat Test: POST https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app/api/v1/chat/completions
   ============================================================================ */
(function () {
  const A = window.App || window._Loki;
  if (!A) return;
  const { $, $$, esc, toast, showView } = A;

  const CLOUD_RUN_ENDPOINT =
    'https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app/api/v1/chat/completions';
  const RELATIVE_ENDPOINT = '/api/v1/chat/completions';

  const DEFAULT_REAL_CHAT_BODY = JSON.stringify(
    {
      model: 'lokizen-4.0-stark',
      messages: [
        {
          role: 'user',
          content: 'Hello! Reply with a short greeting.'
        }
      ]
    },
    null,
    2
  );

  const MODELS_TO_TEST = [
    {
      id: 'lokizen-4.0-stark',
      name: 'lokizen-4.0-stark',
      title: 'Lokizen 4.0 Stark',
      badge: 'Flagship Frontier',
      color: '#00ff9c',
      desc: 'Primary multimodal reasoning & synthesis model by Lokiz Studios.',
      prompt: 'Hello! Confirm lokizen-4.0-stark is online with a short 1-sentence greeting.'
    },
    {
      id: 'lokizenith-3.5-fera',
      name: 'lokizenith-3.5-fera',
      title: 'Lokizenith 3.5 Fera',
      badge: 'High-Speed Engine',
      color: '#38bdf8',
      desc: 'Low-latency, high-efficiency reasoning model by Lokiz Studios.',
      prompt: 'Hello! Confirm lokizenith-3.5-fera is online with a short 1-sentence greeting.'
    },
    {
      id: 'rewind-1.0',
      name: 'rewind-1.0',
      title: 'ReWind 1.0',
      badge: 'Temporal & Video AI',
      color: '#a855f7',
      desc: 'Lokizen temporal & video generation model by Lokiz Studios.',
      prompt: 'Hello! Confirm rewind-1.0 is online with a short 1-sentence greeting.'
    }
  ];

  // Runtime-only state (never persisted in plain text logs, never hardcoded)
  const diagState = {
    enteredKey: '',
    keyVisible: false,
    vaultSynced: false,
    vaultMaskedKey: null,
    health: {
      tested: false,
      running: false,
      connectionStatus: 'UNTESTED',
      httpStatus: '—',
      responseTimeMs: null,
      gatewayInfo: 'Not tested yet. Click "Run Gateway Health Check" to send a real GET /api/v1/chat/completions request.',
      authError: 'None',
      detailedError: 'None',
      rawJson: null
    },
    auth: {
      tested: false,
      running: false,
      connectionStatus: 'UNTESTED',
      httpStatus: '—',
      responseTimeMs: null,
      modelResponse: '—',
      authError: 'None',
      detailedError: 'None'
    },
    models: {
      'lokizen-4.0-stark': createInitialModelState(),
      'lokizenith-3.5-fera': createInitialModelState(),
      'rewind-1.0': createInitialModelState()
    },
    realChat: {
      tested: false,
      running: false,
      jsonBody: DEFAULT_REAL_CHAT_BODY,
      connectionStatus: 'UNTESTED',
      httpStatus: '—',
      responseTimeMs: null,
      modelResponse: '—',
      authError: 'None',
      detailedError: 'None',
      rawRequest: null,
      rawResponse: null
    }
  };

  function createInitialModelState() {
    return {
      tested: false,
      running: false,
      verifiedWorking: false,
      connectionStatus: 'UNTESTED',
      httpStatus: '—',
      responseTimeMs: null,
      modelResponse: '— (Run test to verify real model response)',
      authError: 'None',
      detailedError: 'None'
    };
  }

  function redactKey(rawKey) {
    const k = String(rawKey || '').trim();
    if (!k) return '[NO_KEY_ENTERED]';
    if (k.length <= 12) return '••••••••[REDACTED]';
    return k.slice(0, 10) + '••••••••••••' + k.slice(-4);
  }

  /**
   * Resolves the target URL so that when running on the Cloud Run origin
   * (https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app)
   * it sends the request directly to that full URL, and when running on a local
   * dev port or preview mirror it routes to the active origin's /api/v1/chat/completions
   * without triggering cross-origin Cloud Run login redirects.
   */
  function resolveActiveGatewayPostUrl() {
    try {
      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.location.origin === 'https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app'
      ) {
        return CLOUD_RUN_ENDPOINT;
      }
    } catch (_e) {}
    return RELATIVE_ENDPOINT;
  }

  function parseHttpResult(status, statusText, latencyMs, data) {
    const ms = Math.max(1, Math.round(latencyMs));
    if (status === 401 || status === 403) {
      const errObj = data && data.error;
      const errMsg =
        typeof errObj === 'object' && errObj && errObj.message
          ? String(errObj.message)
          : typeof errObj === 'string'
          ? errObj
          : 'Authentication rejected by gateway (HTTP ' + status + ').';
      const errCode =
        typeof errObj === 'object' && errObj && errObj.code ? String(errObj.code) : 'invalid_api_key';
      return {
        verifiedWorking: false,
        connectionStatus: 'AUTH ERROR (HTTP ' + status + ')',
        httpStatus: status + ' ' + (statusText || 'Unauthorized'),
        responseTimeMs: ms,
        modelResponse: '— (Blocked due to authentication error)',
        authError: '[' + errCode + '] ' + errMsg,
        detailedError: 'HTTP ' + status + ' ' + (statusText || 'Unauthorized') + ': ' + errMsg
      };
    }

    if (status < 200 || status >= 300) {
      const errObj = data && data.error;
      const errMsg =
        typeof errObj === 'object' && errObj && errObj.message
          ? String(errObj.message)
          : typeof errObj === 'string'
          ? errObj
          : 'HTTP ' + status + ' returned by endpoint.';
      const errCode =
        typeof errObj === 'object' && errObj && errObj.code ? String(errObj.code) : 'request_error';
      return {
        verifiedWorking: false,
        connectionStatus: 'ERROR (HTTP ' + status + ')',
        httpStatus: status + ' ' + (statusText || 'Error'),
        responseTimeMs: ms,
        modelResponse: '—',
        authError: 'None',
        detailedError: '[' + errCode + '] HTTP ' + status + ': ' + errMsg
      };
    }

    const reply =
      (data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      (data && data.reply) ||
      (data && data.text) ||
      '';

    const cleanReply = String(reply || '').trim();
    if (!cleanReply) {
      return {
        verifiedWorking: false,
        connectionStatus: 'EMPTY RESPONSE',
        httpStatus: status + ' ' + (statusText || 'OK'),
        responseTimeMs: ms,
        modelResponse: '— (Empty response body)',
        authError: 'None',
        detailedError: 'Gateway returned HTTP 200 but choices[0].message.content was empty.'
      };
    }

    return {
      verifiedWorking: true,
      connectionStatus: 'CONNECTED (VERIFIED)',
      httpStatus: status + ' ' + (statusText || 'OK'),
      responseTimeMs: ms,
      modelResponse: cleanReply,
      authError: 'None',
      detailedError: 'None'
    };
  }

  async function checkServerVaultStatus() {
    try {
      const r = await fetch('/api/v1/diagnostics/vault', { method: 'GET' });
      if (r.ok) {
        const d = await r.json();
        diagState.vaultSynced = Boolean(d.hasServerKey);
        diagState.vaultMaskedKey = d.maskedKey || null;
      }
    } catch (_e) {}
  }

  async function generateNewDiagnosticKey(rootEl) {
    try {
      const r = await fetch('/api/v1/diagnostics/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', name: 'API Diagnostics Key' })
      });
      const d = await r.json();
      if (r.ok && d.generatedKey) {
        diagState.enteredKey = d.generatedKey;
        diagState.vaultSynced = true;
        diagState.vaultMaskedKey = d.maskedKey;
        toast('✓ Generated fresh API key & stored in server vault');
        renderDiagnosticsUI(rootEl);
      } else {
        toast('⚠️ Could not generate key');
      }
    } catch (_e) {
      toast('⚠️ Network error generating key');
    }
  }

  async function syncKeyToVault(rootEl) {
    const key = String(diagState.enteredKey || '').trim();
    if (!key) {
      toast('⚠️ Enter an API key first or click Generate New API Key');
      return;
    }
    try {
      const r = await fetch('/api/v1/diagnostics/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        diagState.vaultSynced = true;
        diagState.vaultMaskedKey = d.maskedKey;
        toast('✓ Key validated & stored securely on server');
      } else {
        diagState.vaultSynced = false;
        toast('⚠️ ' + ((d.error && d.error.message) || 'Invalid key format'));
      }
      renderDiagnosticsUI(rootEl);
    } catch (_e) {
      toast('⚠️ Failed to reach server vault');
    }
  }

  // 1. Gateway Health Check: GET /api/v1/chat/completions
  async function runGatewayHealthCheck(rootEl) {
    diagState.health.running = true;
    diagState.health.connectionStatus = 'TESTING...';
    renderDiagnosticsUI(rootEl);

    const t0 = performance.now();
    try {
      const headers = { Accept: 'application/json' };
      if (diagState.enteredKey.trim()) {
        headers['Authorization'] = 'Bearer ' + diagState.enteredKey.trim();
      }
      const res = await fetch('/api/v1/chat/completions', {
        method: 'GET',
        headers
      });
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        data = null;
      }

      diagState.health.tested = true;
      diagState.health.running = false;
      diagState.health.responseTimeMs = elapsed;
      diagState.health.httpStatus = res.status + ' ' + (res.statusText || (res.ok ? 'OK' : 'Error'));

      if (res.ok && data && data.status === 'online') {
        diagState.health.connectionStatus = 'ONLINE (200 OK)';
        diagState.health.gatewayInfo =
          (data.gateway || 'Lokizen 4.0 Stark Developer API Gateway') +
          ' · Models: ' +
          ((data.models || []).join(', ') || 'lokizen-4.0-stark, lokizenith-3.5-fera, rewind-1.0');
        diagState.health.authError = 'None';
        diagState.health.detailedError = 'None';
        diagState.health.rawJson = data;
      } else {
        diagState.health.connectionStatus = 'DEGRADED / ERROR';
        diagState.health.gatewayInfo = 'Unexpected response from GET /api/v1/chat/completions';
        diagState.health.authError = res.status === 401 ? 'Unauthorized (401)' : 'None';
        diagState.health.detailedError =
          (data && data.error && (data.error.message || data.error)) ||
          'HTTP ' + res.status + ' returned.';
        diagState.health.rawJson = data;
      }
    } catch (err) {
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      diagState.health.tested = true;
      diagState.health.running = false;
      diagState.health.connectionStatus = 'NETWORK ERROR';
      diagState.health.httpStatus = '0 Network Failure';
      diagState.health.responseTimeMs = elapsed;
      diagState.health.gatewayInfo = 'Failed to reach /api/v1/chat/completions';
      diagState.health.authError = 'None';
      diagState.health.detailedError = String((err && err.message) || 'Network request failed');
    }
    renderDiagnosticsUI(rootEl);
  }

  // 2. API Authentication Test: Authorization: Bearer USER_API_KEY
  async function runAuthTest(rootEl, overrideKey) {
    const keyToUse = overrideKey !== undefined ? overrideKey : diagState.enteredKey.trim();
    diagState.auth.running = true;
    diagState.auth.connectionStatus = 'TESTING...';
    renderDiagnosticsUI(rootEl);

    const t0 = performance.now();
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (keyToUse) {
        headers['Authorization'] = 'Bearer ' + keyToUse;
      }
      const res = await fetch(resolveActiveGatewayPostUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'lokizen-4.0-stark',
          messages: [{ role: 'user', content: 'Verify API key authentication status in 1 short sentence.' }]
        })
      });
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        data = null;
      }

      const parsed = parseHttpResult(res.status, res.statusText, elapsed, data);
      diagState.auth.tested = true;
      diagState.auth.running = false;
      diagState.auth.connectionStatus = parsed.verifiedWorking
        ? 'AUTHENTICATED (200 OK)'
        : parsed.connectionStatus;
      diagState.auth.httpStatus = parsed.httpStatus;
      diagState.auth.responseTimeMs = parsed.responseTimeMs;
      diagState.auth.modelResponse = parsed.modelResponse;
      diagState.auth.authError = parsed.authError;
      diagState.auth.detailedError = parsed.detailedError;
    } catch (err) {
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      diagState.auth.tested = true;
      diagState.auth.running = false;
      diagState.auth.connectionStatus = 'NETWORK ERROR';
      diagState.auth.httpStatus = '0 Network Error';
      diagState.auth.responseTimeMs = elapsed;
      diagState.auth.modelResponse = '—';
      diagState.auth.authError = 'Network connection interrupted';
      diagState.auth.detailedError = String((err && err.message) || 'Network error');
    }
    renderDiagnosticsUI(rootEl);
  }

  // 3. Individual Model Test
  async function runSingleModelTest(modelId, rootEl) {
    const spec = MODELS_TO_TEST.find(m => m.id === modelId);
    if (!spec) return;
    const mState = diagState.models[modelId];
    mState.running = true;
    mState.connectionStatus = 'TESTING...';
    renderDiagnosticsUI(rootEl);

    const keyToUse = diagState.enteredKey.trim();
    const t0 = performance.now();
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (keyToUse) {
        headers['Authorization'] = 'Bearer ' + keyToUse;
      }
      const res = await fetch(resolveActiveGatewayPostUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: spec.id,
          messages: [{ role: 'user', content: spec.prompt }]
        })
      });
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        data = null;
      }

      const parsed = parseHttpResult(res.status, res.statusText, elapsed, data);
      mState.tested = true;
      mState.running = false;
      mState.verifiedWorking = parsed.verifiedWorking;
      mState.connectionStatus = parsed.connectionStatus;
      mState.httpStatus = parsed.httpStatus;
      mState.responseTimeMs = parsed.responseTimeMs;
      mState.modelResponse = parsed.modelResponse;
      mState.authError = parsed.authError;
      mState.detailedError = parsed.detailedError;
    } catch (err) {
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      mState.tested = true;
      mState.running = false;
      mState.verifiedWorking = false;
      mState.connectionStatus = 'NETWORK ERROR';
      mState.httpStatus = '0 Network Error';
      mState.responseTimeMs = elapsed;
      mState.modelResponse = '—';
      mState.authError = 'None';
      mState.detailedError = String((err && err.message) || 'Failed to connect to gateway');
    }
    renderDiagnosticsUI(rootEl);
  }

  // TEST ALL MODELS button handler
  async function runTestAllModels(rootEl) {
    for (const m of MODELS_TO_TEST) {
      await runSingleModelTest(m.id, rootEl);
    }
  }

  // 4. Real Chat Test: POST https://ais-dev-yfgctzjufolvqag6zyfmx2-895326589665.europe-west2.run.app/api/v1/chat/completions
  async function runRealChatTest(rootEl) {
    const rc = diagState.realChat;
    const textarea = $('#diagRealChatJson', rootEl);
    if (textarea) {
      rc.jsonBody = textarea.value;
    }

    let parsedBody = null;
    try {
      parsedBody = JSON.parse(rc.jsonBody);
    } catch (jsonErr) {
      rc.tested = true;
      rc.running = false;
      rc.connectionStatus = 'INVALID JSON';
      rc.httpStatus = 'Client Validation Error';
      rc.responseTimeMs = 0;
      rc.modelResponse = '—';
      rc.authError = 'None';
      rc.detailedError = 'Invalid JSON request body: ' + String(jsonErr.message || jsonErr);
      renderDiagnosticsUI(rootEl);
      return;
    }

    rc.running = true;
    rc.connectionStatus = 'TESTING...';
    renderDiagnosticsUI(rootEl);

    const keyToUse = diagState.enteredKey.trim();
    const t0 = performance.now();
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (keyToUse) {
        headers['Authorization'] = 'Bearer ' + keyToUse;
      }

      rc.rawRequest = {
        method: 'POST',
        url: CLOUD_RUN_ENDPOINT,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + redactKey(keyToUse)
        },
        body: parsedBody
      };

      const res = await fetch(resolveActiveGatewayPostUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify(parsedBody)
      });
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      let data = null;
      try {
        data = await res.json();
      } catch (_e) {
        data = null;
      }

      const parsed = parseHttpResult(res.status, res.statusText, elapsed, data);
      rc.tested = true;
      rc.running = false;
      rc.connectionStatus = parsed.connectionStatus;
      rc.httpStatus = parsed.httpStatus;
      rc.responseTimeMs = parsed.responseTimeMs;
      rc.modelResponse = parsed.modelResponse;
      rc.authError = parsed.authError;
      rc.detailedError = parsed.detailedError;
      rc.rawResponse = data;
    } catch (err) {
      const elapsed = Math.max(1, Math.round(performance.now() - t0));
      rc.tested = true;
      rc.running = false;
      rc.connectionStatus = 'NETWORK ERROR';
      rc.httpStatus = '0 Network Error';
      rc.responseTimeMs = elapsed;
      rc.modelResponse = '—';
      rc.authError = 'None';
      rc.detailedError = String((err && err.message) || 'Network request failed');
      rc.rawResponse = { error: rc.detailedError };
    }
    renderDiagnosticsUI(rootEl);
  }

  async function runFullDiagnosticsSuite(rootEl) {
    await runGatewayHealthCheck(rootEl);
    await runAuthTest(rootEl);
    await runTestAllModels(rootEl);
    await runRealChatTest(rootEl);
  }

  function statusBadgeStyle(statusText) {
    const s = String(statusText || '').toUpperCase();
    if (s.includes('CONNECTED') || s.includes('ONLINE') || s.includes('AUTHENTICATED')) {
      return 'background:rgba(0,255,156,.16);color:#00ff9c;border:1px solid rgba(0,255,156,.45);';
    }
    if (s.includes('TESTING')) {
      return 'background:rgba(56,189,248,.16);color:#38bdf8;border:1px solid rgba(56,189,248,.45);';
    }
    if (s.includes('AUTH ERROR') || s.includes('ERROR') || s.includes('INVALID')) {
      return 'background:rgba(255,90,110,.16);color:#ff8a9a;border:1px solid rgba(255,90,110,.45);';
    }
    return 'background:rgba(255,255,255,.06);color:#9cc7b4;border:1px solid rgba(255,255,255,.14);';
  }

  function renderResultGrid(item) {
    const hasAuthErr = item.authError && item.authError !== 'None';
    const hasDetailErr = item.detailedError && item.detailedError !== 'None';
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:10px;">
        <div style="padding:9px 11px;border-radius:9px;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.08);">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.65;">Connection Status</div>
          <div style="margin-top:4px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;${statusBadgeStyle(item.connectionStatus)}">${esc(item.connectionStatus)}</span></div>
        </div>
        <div style="padding:9px 11px;border-radius:9px;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.08);">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.65;">HTTP Status Code</div>
          <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#eafff5;">${esc(String(item.httpStatus))}</div>
        </div>
        <div style="padding:9px 11px;border-radius:9px;background:rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.08);">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.65;">Response Time</div>
          <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#38bdf8;">${item.responseTimeMs !== null ? esc(item.responseTimeMs + ' ms') : '—'}</div>
        </div>
      </div>

      ${item.modelResponse !== undefined ? `
      <div style="margin-top:8px;padding:10px 12px;border-radius:9px;background:rgba(0,18,12,.55);border:1px solid rgba(0,255,156,.2);">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#7dffcf;font-weight:700;margin-bottom:4px;">Model Response</div>
        <div style="font-size:13px;line-height:1.5;color:#eafff5;white-space:pre-wrap;word-break:break-word;" dir="auto">${esc(String(item.modelResponse))}</div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px;">
        <div style="padding:9px 11px;border-radius:9px;background:${hasAuthErr ? 'rgba(255,70,90,.12)' : 'rgba(0,0,0,.3)'};border:1px solid ${hasAuthErr ? 'rgba(255,90,110,.45)' : 'rgba(255,255,255,.07)'};">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;color:${hasAuthErr ? '#ff9aa8' : 'inherit'};">Authentication Errors</div>
          <div style="margin-top:3px;font-size:12px;font-family:'JetBrains Mono',monospace;color:${hasAuthErr ? '#ffb3be' : '#9cc7b4'};word-break:break-word;">${esc(String(item.authError || 'None'))}</div>
        </div>
        <div style="padding:9px 11px;border-radius:9px;background:${hasDetailErr ? 'rgba(255,140,60,.11)' : 'rgba(0,0,0,.3)'};border:1px solid ${hasDetailErr ? 'rgba(255,150,70,.42)' : 'rgba(255,255,255,.07)'};">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;color:${hasDetailErr ? '#ffc288' : 'inherit'};">Detailed Error Messages</div>
          <div style="margin-top:3px;font-size:12px;font-family:'JetBrains Mono',monospace;color:${hasDetailErr ? '#ffd4a8' : '#9cc7b4'};word-break:break-word;">${esc(String(item.detailedError || 'None'))}</div>
        </div>
      </div>
    `;
  }

  function renderDiagnosticsUI(targetContainer) {
    const root = targetContainer || $('#diagnosticsView');
    if (!root) return;

    const isEmbeddedModal = root.id !== 'diagnosticsView';
    const verifiedModelsCount = MODELS_TO_TEST.filter(m => diagState.models[m.id].verifiedWorking).length;

    root.innerHTML = `
      <div class="diag-page-wrap" style="max-width:1180px;margin:0 auto;padding:${isEmbeddedModal ? '4px' : '22px 20px 60px'};display:flex;flex-direction:column;gap:18px;color:#eafff5;">
        
        <!-- Top Hero Banner -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-radius:16px;background:linear-gradient(135deg,rgba(0,255,156,.13),rgba(56,189,248,.08),rgba(4,16,12,.92));border:1px solid rgba(0,255,156,.38);box-shadow:0 12px 34px rgba(0,0,0,.35);">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            ${!isEmbeddedModal ? `<button type="button" class="back-btn" id="diagBackBtn" aria-label="Back to Chat">‹ Back to Chat</button>` : ''}
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:#eafff5;">🩺 Lokizen 4.0 Stark · API Diagnostics &amp; Live Connection Tester</h1>
                <span style="padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(0,255,156,.18);color:#00ff9c;border:1px solid rgba(0,255,156,.4);">REAL HTTP REQUESTS</span>
              </div>
              <div style="font-size:12.5px;opacity:.82;margin-top:4px;">
                Live verification for <code style="color:#00ff9c">/api/v1/chat/completions</code> · Bearer Authentication · Individual Model Probes (${verifiedModelsCount}/3 Verified) · Zero Frontend Key Logging
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-primary" id="diagTestAllModelsTopBtn" style="padding:10px 18px;font-weight:800;background:linear-gradient(135deg,#00ff9c,#00c978);color:#03150d;border-radius:10px;">
              ⚡ TEST ALL MODELS
            </button>
            <button type="button" class="btn-ghost" id="diagRunFullSuiteBtn" style="padding:10px 15px;font-weight:700;border-color:rgba(56,189,248,.45);color:#e0f2fe;">
              🩺 Run Full Diagnostics
            </button>
          </div>
        </div>

        <!-- Security & API Key Input Bar -->
        <section aria-label="API Key & Security Configuration" style="padding:16px 18px;border-radius:14px;background:rgba(5,18,13,.88);border:1px solid rgba(0,255,156,.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <div>
              <div style="font-weight:800;font-size:14px;color:#00ff9c;">🔐 API Key &amp; Secure Bearer Header Configuration</div>
              <div style="font-size:12px;opacity:.78;">Enter your newly generated API key below or generate a fresh one. Keys are never logged to the browser console and are masked in all telemetry views.</div>
            </div>
            <span id="diagVaultBadge" style="padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;${diagState.vaultSynced ? 'background:rgba(0,255,156,.16);color:#00ff9c;border:1px solid rgba(0,255,156,.4);' : 'background:rgba(255,255,255,.07);color:#9cc7b4;border:1px solid rgba(255,255,255,.15);'}">
              ${diagState.vaultSynced ? '🔒 Server Vault Active (' + esc(diagState.vaultMaskedKey || 'Masked') + ')' : '🔓 Enter or Generate Key'}
            </span>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <label for="diagApiKeyInput" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">Enter your Lokizen API Key</label>
            <input
              id="diagApiKeyInput"
              type="${diagState.keyVisible ? 'text' : 'password'}"
              value="${esc(diagState.enteredKey)}"
              placeholder="Paste your newly created lkz-stark-... API key here"
              autocomplete="off"
              spellcheck="false"
              style="flex:1;min-width:250px;padding:10px 13px;border-radius:10px;background:rgba(0,0,0,.55);border:1px solid rgba(0,255,156,.38);color:#00ff9c;font-family:'JetBrains Mono',monospace;font-size:12.5px;"
            >
            <button type="button" class="btn-ghost" id="diagToggleKeyVisBtn" style="padding:10px 12px;font-size:12px;">
              ${diagState.keyVisible ? '🙈 Hide Key' : '👁 Show Key'}
            </button>
            <button type="button" class="btn-primary" id="diagGenerateKeyBtn" style="padding:10px 15px;font-weight:800;">
              ⚡ Generate New API Key
            </button>
            <button type="button" class="btn-ghost" id="diagSyncVaultBtn" style="padding:10px 13px;font-size:12px;border-color:rgba(0,255,156,.35);">
              🔒 Store in Server Vault
            </button>
          </div>

          <div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px;">
            <div>
              <span style="opacity:.7;">Active Request Header:</span>
              <code style="margin-left:6px;color:#7dffcf;font-family:'JetBrains Mono',monospace;">Authorization: Bearer ${esc(redactKey(diagState.enteredKey))}</code>
            </div>
            <span style="font-size:11px;color:#9cc7b4;">✓ Frontend console logging disabled for credentials</span>
          </div>
        </section>

        <!-- 1. Gateway Health Check & 2. API Authentication Test (2-Column Grid) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;">
          
          <!-- 1. Gateway Health Check -->
          <section aria-label="Gateway Health Check" style="padding:16px 18px;border-radius:14px;background:rgba(5,18,13,.84);border:1px solid rgba(0,255,156,.24);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div>
                  <span style="font-size:11px;font-weight:800;color:#00ff9c;text-transform:uppercase;letter-spacing:.06em;">1. Gateway Health Check</span>
                  <h2 style="margin:3px 0 0;font-size:16px;font-weight:800;">GET /api/v1/chat/completions</h2>
                </div>
                <button type="button" class="btn-primary" id="diagRunHealthBtn" style="padding:8px 14px;font-size:12.5px;font-weight:800;" ${diagState.health.running ? 'disabled' : ''}>
                  ${diagState.health.running ? '⏳ Checking...' : '📡 Run Health Check'}
                </button>
              </div>
              <div style="font-size:12px;opacity:.75;margin-top:4px;">
                Sends a live HTTP <code>GET /api/v1/chat/completions</code> probe and measures gateway status &amp; round-trip latency.
              </div>
              ${renderResultGrid({
                connectionStatus: diagState.health.connectionStatus,
                httpStatus: diagState.health.httpStatus,
                responseTimeMs: diagState.health.responseTimeMs,
                modelResponse: diagState.health.gatewayInfo,
                authError: diagState.health.authError,
                detailedError: diagState.health.detailedError
              })}
            </div>
          </section>

          <!-- 2. API Authentication Test -->
          <section aria-label="API Authentication Test" style="padding:16px 18px;border-radius:14px;background:rgba(5,18,13,.84);border:1px solid rgba(56,189,248,.28);display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div>
                  <span style="font-size:11px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:.06em;">2. API Authentication Test</span>
                  <h2 style="margin:3px 0 0;font-size:16px;font-weight:800;">Authorization: Bearer USER_API_KEY</h2>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" class="btn-primary" id="diagRunAuthBtn" style="padding:8px 14px;font-size:12.5px;font-weight:800;" ${diagState.auth.running ? 'disabled' : ''}>
                    ${diagState.auth.running ? '⏳ Verifying...' : '🔐 Test API Key Auth'}
                  </button>
                  <button type="button" class="btn-ghost" id="diagTestInvalidAuthBtn" style="padding:8px 11px;font-size:11.5px;border-color:rgba(255,90,110,.4);color:#ff9aa8;" title="Send an invalid Bearer token to verify HTTP 401 error reporting">
                    🧪 Test 401 Error
                  </button>
                </div>
              </div>
              <div style="font-size:12px;opacity:.75;margin-top:4px;">
                Tests your entered API key via <code>Authorization: Bearer USER_API_KEY</code> against the live completions gateway.
              </div>
              ${renderResultGrid({
                connectionStatus: diagState.auth.connectionStatus,
                httpStatus: diagState.auth.httpStatus,
                responseTimeMs: diagState.auth.responseTimeMs,
                modelResponse: diagState.auth.modelResponse,
                authError: diagState.auth.authError,
                detailedError: diagState.auth.detailedError
              })}
            </div>
          </section>
        </div>

        <!-- 3. Model Testing (Individual Models + TEST ALL MODELS) -->
        <section aria-label="Model Testing" style="padding:18px 20px;border-radius:15px;background:rgba(5,18,13,.88);border:1px solid rgba(0,255,156,.3);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
            <div>
              <span style="font-size:11px;font-weight:800;color:#00ff9c;text-transform:uppercase;letter-spacing:.06em;">3. Individual Model Testing</span>
              <h2 style="margin:3px 0 0;font-size:18px;font-weight:800;">Test Gateway Models Individually or All at Once</h2>
              <div style="font-size:12px;opacity:.78;margin-top:2px;">
                Models are never marked working until a real HTTP POST request returns HTTP 200 OK with a verified response.
              </div>
            </div>
            <button type="button" class="btn-primary" id="diagTestAllModelsBtn" style="padding:11px 22px;font-size:13.5px;font-weight:800;background:linear-gradient(135deg,#00ff9c,#00b86b);color:#03150d;border-radius:10px;box-shadow:0 6px 20px rgba(0,255,156,.25);">
              TEST ALL MODELS
            </button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">
            ${MODELS_TO_TEST.map(spec => {
              const mState = diagState.models[spec.id];
              return `
                <div class="diag-model-card" data-testid="model-card-${esc(spec.id)}" style="padding:15px 16px;border-radius:13px;background:rgba(0,0,0,.42);border:1px solid ${mState.verifiedWorking ? 'rgba(0,255,156,.5)' : 'rgba(255,255,255,.11)'};display:flex;flex-direction:column;justify-content:space-between;">
                  <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                      <div>
                        <div style="display:flex;align-items:center;gap:7px;">
                          <code style="font-size:14px;font-weight:800;color:${spec.color};">${esc(spec.id)}</code>
                          <span style="font-size:10px;padding:2px 7px;border-radius:999px;background:rgba(255,255,255,.08);color:#d5f5e8;font-weight:700;">${esc(spec.badge)}</span>
                        </div>
                        <div style="font-size:11.5px;opacity:.72;margin-top:3px;">${esc(spec.desc)}</div>
                      </div>
                      <button
                        type="button"
                        class="btn-ghost diag-test-single-model"
                        data-model="${esc(spec.id)}"
                        style="padding:7px 13px;font-size:12px;font-weight:800;border-color:${spec.color};color:#eafff5;"
                        ${mState.running ? 'disabled' : ''}
                      >
                        ${mState.running ? '⏳ Testing...' : '▶ Test ' + esc(spec.id)}
                      </button>
                    </div>
                    ${renderResultGrid(mState)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- 4. Real Chat Test -->
        <section aria-label="Real Chat Test" style="padding:18px 20px;border-radius:15px;background:rgba(5,18,13,.9);border:1px solid rgba(56,189,248,.34);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <div>
              <span style="font-size:11px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:.06em;">4. Real Chat Test</span>
              <h2 style="margin:3px 0 0;font-size:17px;font-weight:800;">POST ${esc(CLOUD_RUN_ENDPOINT)}</h2>
              <div style="font-size:12px;opacity:.78;margin-top:3px;">
                Sends a live HTTP <code>POST</code> request with the JSON payload below and <code>Authorization: Bearer USER_API_KEY</code>.
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-ghost" id="diagResetJsonBtn" style="padding:9px 13px;font-size:12px;">
                ↺ Reset Default JSON
              </button>
              <button type="button" class="btn-primary" id="diagRunRealChatBtn" style="padding:9px 18px;font-size:13px;font-weight:800;" ${diagState.realChat.running ? 'disabled' : ''}>
                ${diagState.realChat.running ? '⏳ Sending POST...' : '🚀 Send Real Chat POST Request'}
              </button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start;">
            <div>
              <label for="diagRealChatJson" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#7dffcf;margin-bottom:6px;">
                Request JSON Payload (POST Body)
              </label>
              <textarea
                id="diagRealChatJson"
                rows="10"
                spellcheck="false"
                style="width:100%;padding:12px;border-radius:10px;background:rgba(0,0,0,.6);border:1px solid rgba(0,255,156,.3);color:#eafff5;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5;resize:vertical;"
              >${esc(diagState.realChat.jsonBody)}</textarea>
            </div>

            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#38bdf8;margin-bottom:6px;">
                5. Live Diagnostic Results
              </div>
              ${renderResultGrid(diagState.realChat)}
            </div>
          </div>

          ${diagState.realChat.rawRequest || diagState.realChat.rawResponse ? `
          <div style="margin-top:14px;padding:12px 14px;border-radius:11px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.09);">
            <div style="font-size:11px;font-weight:800;color:#9cc7b4;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
              🔍 Redacted HTTP Wire Inspector (API Keys Redacted)
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;">
              <pre style="margin:0;padding:10px;border-radius:8px;background:rgba(0,0,0,.6);font-family:'JetBrains Mono',monospace;font-size:11px;color:#7dffcf;overflow-x:auto;max-height:220px;">${esc(JSON.stringify(diagState.realChat.rawRequest || {}, null, 2))}</pre>
              <pre style="margin:0;padding:10px;border-radius:8px;background:rgba(0,0,0,.6);font-family:'JetBrains Mono',monospace;font-size:11px;color:#e0f2fe;overflow-x:auto;max-height:220px;">${esc(JSON.stringify(diagState.realChat.rawResponse || {}, null, 2))}</pre>
            </div>
          </div>` : ''}
        </section>

      </div>
    `;

    // Wire event listeners
    const backBtn = $('#diagBackBtn', root);
    if (backBtn) {
      backBtn.onclick = () => showView('chat');
    }

    const keyInput = $('#diagApiKeyInput', root);
    if (keyInput) {
      keyInput.oninput = () => {
        diagState.enteredKey = keyInput.value;
      };
    }

    const toggleVisBtn = $('#diagToggleKeyVisBtn', root);
    if (toggleVisBtn) {
      toggleVisBtn.onclick = () => {
        diagState.keyVisible = !diagState.keyVisible;
        renderDiagnosticsUI(root);
      };
    }

    const genKeyBtn = $('#diagGenerateKeyBtn', root);
    if (genKeyBtn) {
      genKeyBtn.onclick = () => generateNewDiagnosticKey(root);
    }

    const syncVaultBtn = $('#diagSyncVaultBtn', root);
    if (syncVaultBtn) {
      syncVaultBtn.onclick = () => syncKeyToVault(root);
    }

    const healthBtn = $('#diagRunHealthBtn', root);
    if (healthBtn) {
      healthBtn.onclick = () => runGatewayHealthCheck(root);
    }

    const authBtn = $('#diagRunAuthBtn', root);
    if (authBtn) {
      authBtn.onclick = () => runAuthTest(root);
    }

    const invalidAuthBtn = $('#diagTestInvalidAuthBtn', root);
    if (invalidAuthBtn) {
      invalidAuthBtn.onclick = () => runAuthTest(root, 'invalid_key_test_401');
    }

    $$('.diag-test-single-model', root).forEach(btn => {
      btn.onclick = () => runSingleModelTest(btn.dataset.model, root);
    });

    const testAllBtn = $('#diagTestAllModelsBtn', root);
    if (testAllBtn) {
      testAllBtn.onclick = () => runTestAllModels(root);
    }

    const testAllTopBtn = $('#diagTestAllModelsTopBtn', root);
    if (testAllTopBtn) {
      testAllTopBtn.onclick = () => runTestAllModels(root);
    }

    const fullSuiteBtn = $('#diagRunFullSuiteBtn', root);
    if (fullSuiteBtn) {
      fullSuiteBtn.onclick = () => runFullDiagnosticsSuite(root);
    }

    const resetJsonBtn = $('#diagResetJsonBtn', root);
    if (resetJsonBtn) {
      resetJsonBtn.onclick = () => {
        diagState.realChat.jsonBody = DEFAULT_REAL_CHAT_BODY;
        renderDiagnosticsUI(root);
      };
    }

    const realChatBtn = $('#diagRunRealChatBtn', root);
    if (realChatBtn) {
      realChatBtn.onclick = () => runRealChatTest(root);
    }

    const jsonArea = $('#diagRealChatJson', root);
    if (jsonArea) {
      jsonArea.oninput = () => {
        diagState.realChat.jsonBody = jsonArea.value;
      };
    }
  }

  window.LokiDiagnostics = {
    onShow: async function () {
      const geoAsk = $('.geo-ask');
      if (geoAsk) geoAsk.remove();
      renderDiagnosticsUI($('#diagnosticsView'));
      await checkServerVaultStatus();
      renderDiagnosticsUI($('#diagnosticsView'));
    },
    renderInto: async function (container, initialKey) {
      if (initialKey && !diagState.enteredKey) {
        diagState.enteredKey = initialKey;
      }
      renderDiagnosticsUI(container);
      await checkServerVaultStatus();
      renderDiagnosticsUI(container);
    },
    setKey: function (key) {
      if (key && typeof key === 'string') {
        diagState.enteredKey = key.trim();
      }
    }
  };

  if ($('#diagnosticsView')) {
    renderDiagnosticsUI($('#diagnosticsView'));
  }
  if (location.hash === '#diagnostics' || document.body.dataset.view === 'diagnostics') {
    window.LokiDiagnostics.onShow();
  }
})();

