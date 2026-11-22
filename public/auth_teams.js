/* ============================================================================
   Lokizenith AI — Accounts, 25k Live Usage Quota, Secret Gift/Dev Codes,
   Referral Invites (+25k), Admin Reset, WebSocket Team Chat & LokiCode Teams
   ============================================================================ */
(function(){
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const A = () => window.App;
const TOKEN_KEY = 'lz.authToken';
const USER_BACKUP_KEY = 'lz.authUserBackup';
const TAB_ID = 'tab_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
const INVITE_KEY = 'lz.pendingInvite';
const DAILY_LIMIT = 25000;
const RESET_MS = 6 * 3600 * 1000;

const INSPECT_BACKUP_KEY = 'lz.adminInspectBackup';

function readCookie(name){
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch(_){
    return '';
  }
}

function writeCookie(name, val, maxAgeSec = 31536000){
  try {
    document.cookie = `${name}=${encodeURIComponent(val || '')}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
  } catch(_){}
}

let savedInspectBackup = null;
try {
  const raw = sessionStorage.getItem(INSPECT_BACKUP_KEY);
  if (raw) savedInspectBackup = JSON.parse(raw);
} catch(_){}

let savedUserBackup = null;
try {
  const rawU = localStorage.getItem(USER_BACKUP_KEY) || readCookie('lz_user_backup');
  if (rawU) savedUserBackup = JSON.parse(rawU);
} catch(_){}

let initialToken = '';
try {
  initialToken = localStorage.getItem(TOKEN_KEY) || readCookie('lz_token') || '';
  if (!initialToken && savedUserBackup && (savedUserBackup.id || savedUserBackup.username)){
    initialToken = 'tok_restored_' + (savedUserBackup.id || savedUserBackup.username) + '_' + Date.now().toString(36);
  }
  if (initialToken) localStorage.setItem(TOKEN_KEY, initialToken);
} catch(_){}

const state = {
  token: initialToken,
  user: savedUserBackup || null,
  onlineUsers: [],
  teamChats: [],
  activeTeamChatId: null,
  lokiTeams: [],
  activeLokiTeamId: null,
  lokiCursors: {},
  sharedSnippets: [],
  notifications: [],
  typingMap: {},
  ws: null,
  wsRetryTimer: 0,
  wsPingTimer: 0,
  syncTimer: 0,
  bootData: null,
  authMode: 'login',
  pendingInvite: sessionStorage.getItem(INVITE_KEY) || '',
  pendingInviterName: '',
  adminOverview: null,
  activeBanInfo: null,
  banTimer: 0,
  presenceTimer: 0,
  inspectBackup: savedInspectBackup,
  platformConfig: null,
  guest: null
};

/* ---------------- Guest trial (7,500 tokens before sign up, enforced on the server) ---------------- */
const GUEST_LIMIT = 7500;
let guestRefreshTimer = 0;
function isGuest(){ return !state.user && !state.token; }
function applyGuestStatus(j){
  if (!j || typeof j !== 'object') return;
  const limit = Number(j.limit) || GUEST_LIMIT;
  const remaining = Math.max(0, Math.min(limit, Number(j.remaining)));
  state.guest = { limit, remaining: Number.isFinite(remaining) ? remaining : limit };
  renderGuestChrome();
  renderUsageBar();
}
function refreshGuestStatus(delay = 0){
  clearTimeout(guestRefreshTimer);
  guestRefreshTimer = setTimeout(() => {
    if (!isGuest()) return;
    fetch('/api/guest/status', { credentials: 'same-origin' }).then(r => r.json()).then(applyGuestStatus).catch(() => {});
  }, delay);
}
function renderGuestChrome(){
  const guest = isGuest();
  document.body.classList.toggle('lz-guest', guest);
  const box = $('#guestAuthBtns');
  if (box) box.hidden = !guest;
  const pill = $('#guestTokensPill');
  if (pill && guest){
    const rem = state.guest ? state.guest.remaining : GUEST_LIMIT;
    pill.textContent = rem > 0 ? `${rem.toLocaleString()} free tokens left` : 'Free trial used';
    pill.classList.toggle('empty', rem <= 0);
  }
  const close = $('#authCloseBtn');
  if (close) close.hidden = !guest;
}
function enterGuestMode(){
  state.guest = state.guest || { limit: GUEST_LIMIT, remaining: GUEST_LIMIT };
  hideAuthOverlay();
  renderGuestChrome();
  renderUsageBar();
  refreshGuestStatus(0);
}

function getClientDeviceHints(){
  try {
    return {
      platform: navigator.platform || '',
      screen: (window.screen && screen.width && screen.height) ? `${screen.width}x${screen.height}` : '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      language: navigator.language || ''
    };
  } catch(_){
    return {};
  }
}

/* ---------------- API Helper ---------------- */
async function api(url, opts = {}){
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (state.token) headers['x-lz-token'] = state.token;
  const uRef = state.user || savedUserBackup;
  if (uRef && (uRef.id || uRef.username || uRef.googleEmail)){
    try {
      headers['x-lz-user-backup'] = JSON.stringify({
        id: uRef.id || '',
        username: uRef.username || '',
        googleEmail: uRef.googleEmail || ''
      });
    } catch(_){}
  }
  if (url.includes('/api/auth/me')){
    try { headers['x-lz-device'] = JSON.stringify(getClientDeviceHints()); } catch(_){}
  }
  const r = await fetch(url, Object.assign({}, opts, { headers }));
  let j = {};
  try { j = await r.json(); } catch(_){}
  if (!r.ok){
    if (j.banned && j.banInfo && !url.includes('/api/auth/login')){
      showBannedModal(j.banInfo);
    }
    const err = new Error(j.message || j.error || `HTTP ${r.status}`);
    err.status = r.status;
    err.code = j.code || j.error;
    err.data = j;
    throw err;
  }
  return j;
}

function toast(msg, kind){
  if (A() && typeof A().toast === 'function') A().toast(msg, kind);
}

function fmtCountdown(ms){
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtTime(ts){
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(_){ return ''; }
}

/* ---------------- Usage & Quota Controller ---------------- */
const usage = {
  isUnlimited(){
    if (!state.user) return false;
    return Boolean(state.user.isUnlimited || String(state.user.username || '').trim().toLowerCase() === 'oron');
  },
  canUse(){
    if (!state.user) return state.guest ? state.guest.remaining > 0 : true;
    if (this.isUnlimited()) return true;
    this.checkAutoResetLocally();
    return (state.user.tokensRemaining ?? 0) > 0;
  },
  remaining(){
    if (!state.user) return state.guest ? state.guest.remaining : DAILY_LIMIT;
    if (this.isUnlimited()) return Number.MAX_SAFE_INTEGER;
    this.checkAutoResetLocally();
    return Math.max(0, Math.floor(state.user.tokensRemaining ?? DAILY_LIMIT));
  },
  limit(){
    if (!state.user) return state.guest ? state.guest.limit : DAILY_LIMIT;
    return state.user.tokenLimitEffective || state.user.tokenLimitBase || DAILY_LIMIT;
  },
  percent(){
    if (this.isUnlimited()) return 100;
    const rem = this.remaining();
    const lim = Math.max(1, this.limit());
    return Math.min(100, Math.max(0, Math.round((rem / lim) * 100)));
  },
  checkAutoResetLocally(){
    if (!state.user || !state.user.nextResetAt) return;
    if (Date.now() >= state.user.nextResetAt){
      const base = state.user.tokenLimitBase || DAILY_LIMIT;
      state.user.bonusTokens = 0;
      state.user.tokenLimitEffective = base;
      state.user.tokensRemaining = base;
      state.user.lastResetAt = Date.now();
      state.user.nextResetAt = state.user.lastResetAt + RESET_MS;
      renderUsageBar();
      if (state.token){
        api('/api/auth/me').then(res => {
          if (res.user) updateAccount(res.user);
        }).catch(()=>{});
      }
    }
  },
  consume(tokens){
    if (!state.user){
      if (state.guest){
        state.guest.remaining = Math.max(0, state.guest.remaining - Math.max(1, Math.floor(tokens || 80)));
        renderGuestChrome(); renderUsageBar();
        refreshGuestStatus(700);
      }
      return;
    }
    const amt = Math.max(1, Math.floor(tokens || 80));
    if (!this.isUnlimited()){
      state.user.tokensRemaining = Math.max(0, (state.user.tokensRemaining ?? DAILY_LIMIT) - amt);
      renderUsageBar();
    }
    if (state.token){
      api('/api/quota/consume', {
        method: 'POST',
        body: JSON.stringify({ tokens: amt })
      }).then(res => {
        if (res && res.account) updateAccount(res.account);
      }).catch(err => {
        if (err.data && err.data.account) updateAccount(err.data.account);
      });
    }
  }
};

function renderUsageBar(){
  const box = $('#lzUsageBox');
  if (!box) return;
  const pctEl = $('#lzUsagePct');
  const fillEl = $('#lzUsageBarFill');
  const trackEl = $('#lzUsageTrack');
  const tokEl = $('#lzUsageTokens');
  const rstEl = $('#lzUsageReset');

  if (usage.isUnlimited()){
    if (pctEl) pctEl.textContent = '∞';
    if (fillEl){
      fillEl.style.width = '100%';
      fillEl.classList.remove('warn', 'low');
      fillEl.classList.add('boosted');
    }
    if (trackEl) trackEl.setAttribute('aria-valuenow', '100');
    if (tokEl) tokEl.textContent = '∞ / Unlimited';
    if (rstEl) rstEl.textContent = 'Unlimited Plan ✨';
    return;
  }

  const rem = usage.remaining();
  const effectiveMax = usage.limit();
  const base = state.user?.tokenLimitBase || DAILY_LIMIT;
  const pct = usage.percent();

  if (pctEl) pctEl.textContent = `${pct}%`;
  if (!state.user){
    if (fillEl){ fillEl.style.width = `${pct}%`; fillEl.classList.remove('boosted', 'warn', 'low'); if (pct <= 15) fillEl.classList.add('low'); else if (pct <= 40) fillEl.classList.add('warn'); }
    if (trackEl) trackEl.setAttribute('aria-valuenow', String(pct));
    if (tokEl) tokEl.textContent = `${rem.toLocaleString()} / ${effectiveMax.toLocaleString()}`;
    if (rstEl) rstEl.textContent = 'Guest trial · sign up for 25k / 6h';
    return;
  }
  if (fillEl){
    fillEl.style.width = `${pct}%`;
    fillEl.classList.remove('warn', 'low', 'boosted');
    if (effectiveMax > base || rem > base) fillEl.classList.add('boosted');
    else if (pct <= 15) fillEl.classList.add('low');
    else if (pct <= 40) fillEl.classList.add('warn');
  }
  if (trackEl) trackEl.setAttribute('aria-valuenow', String(pct));
  if (tokEl) tokEl.textContent = `${rem.toLocaleString()} / ${effectiveMax.toLocaleString()}`;
  if (rstEl){
    const nextAt = state.user?.nextResetAt || (Date.now() + RESET_MS);
    const left = Math.max(0, nextAt - Date.now());
    rstEl.textContent = `Resets in ${fmtCountdown(left)}`;
  }
}

setInterval(() => {
  if (state.user){
    usage.checkAutoResetLocally();
    renderUsageBar();
  }
}, 1000);

function createGuestLimitBlock(message){
  const wrap = document.createElement('div');
  wrap.className = 'lz-limit-card lz-guest-limit';
  wrap.innerHTML = `
    <div class="lz-lim-head">
      <span class="lz-lim-ic">✨</span>
      <div>
        <b>Enjoying Lokizenith? Create your free account</b>
        <p>${esc(message || "You've used your 7,500 free guest tokens.")}</p>
      </div>
    </div>
    <div class="lz-lim-sub">Free accounts get 25,000 tokens every 6 hours, saved chats on every device, plugins, images and more.</div>
    <div class="lz-lim-btns">
      <button type="button" class="btn-primary lz-lim-btn" data-guest="register">🚀 Sign up free</button>
      <button type="button" class="btn-ghost lz-lim-btn" data-guest="login">Sign in</button>
    </div>
  `;
  wrap.querySelector('[data-guest="register"]').onclick = () => openAuthOverlay('register');
  wrap.querySelector('[data-guest="login"]').onclick = () => openAuthOverlay('login');
  return wrap;
}

function createLimitBlock(message){
  if (!state.user) return createGuestLimitBlock(/guest|sign up|account/i.test(String(message || '')) ? message : '');
  const wrap = document.createElement('div');
  wrap.className = 'lz-limit-card';
  wrap.innerHTML = `
    <div class="lz-lim-head">
      <span class="lz-lim-ic">⛔</span>
      <div>
        <b>Token Usage Limit Reached (0% left)</b>
        <p>${esc(message || "It's not possible because your limit has reached the maximum.")}</p>
      </div>
    </div>
    <div class="lz-lim-sub">Redeem a secret Gift Code, DEV CODE, or invite a friend (+25,000 tokens) to boost your limit immediately.</div>
    <div class="lz-lim-btns">
      <button type="button" class="btn-primary lz-lim-btn" data-code-tab="gift">🎁 Gift Code</button>
      <button type="button" class="btn-ghost lz-lim-btn dev" data-code-tab="dev">🛠 DEV CODE</button>
      <button type="button" class="btn-ghost lz-lim-btn inv" data-code-tab="invite">🔗 Invite (+25k)</button>
    </div>
  `;
  wrap.querySelector('[data-code-tab="gift"]').onclick = () => openCodesModal('gift');
  wrap.querySelector('[data-code-tab="dev"]').onclick = () => openCodesModal('dev');
  wrap.querySelector('[data-code-tab="invite"]').onclick = () => openInviteModal();
  return wrap;
}

/* ---------------- Gift Code & DEV CODE Modal (Codes Kept Secret) ---------------- */
function openCodesModal(initialTab = 'gift'){
  const modal = $('#codesModal');
  const body = $('#codesModalBody');
  const title = $('#codesModalTitle');
  if (!modal || !body) return;

  let activeTab = initialTab === 'dev' ? 'dev' : 'gift';

  function render(){
    if (title) title.textContent = activeTab === 'dev' ? '🛠 DEV CODE Redemption' : '🎁 Gift Code Redemption';
    const isUnlim = usage.isUnlimited();
    const rem = usage.remaining();
    const lim = usage.limit();
    const redeemedCount = (state.user?.usedGiftCodes || []).length;
    body.innerHTML = `
      <div class="lz-code-balance">
        ${isUnlim
          ? `<span>Current balance: <b>∞ Unlimited Tokens</b> ✨</span>`
          : `<span>Current balance: <b id="lzCodeCurBal">${rem.toLocaleString()} / ${lim.toLocaleString()}</b> tokens (${usage.percent()}%)</span>`}
      </div>
      <div class="lz-code-tabs" role="tablist">
        <button type="button" class="lz-code-tab ${activeTab === 'gift' ? 'on' : ''}" data-t="gift">🎁 Gift Code</button>
        <button type="button" class="lz-code-tab ${activeTab === 'dev' ? 'on' : ''}" data-t="dev">🛠 DEV CODE</button>
      </div>
      ${activeTab === 'gift' ? `
        <div class="lz-code-panel">
          <p class="lz-code-desc">Enter a secret Gift Code to receive bonus tokens and expand your limit for this 6-hour cycle. Each Gift Code can be used <b>1 time</b> per account${redeemedCount ? ` · Redeemed so far: <b>${redeemedCount}</b>` : ''}.</p>
          <form class="lz-code-form" id="lzCodeForm">
            <input type="text" id="lzCodeInput" placeholder="Enter your secret gift code…" autocomplete="off" required>
            <button type="submit" class="btn-primary" id="lzCodeSubmit">Submit Code</button>
          </form>
        </div>
      ` : `
        <div class="lz-code-panel">
          <p class="lz-code-desc">Developer access &amp; unlimited unlock code. Submit a valid DEV CODE for bonus tokens or permanent <b>Loki Ultimate Forever &amp; Infinite Access</b>.</p>
          <form class="lz-code-form" id="lzCodeForm">
            <input type="text" id="lzCodeInput" placeholder="Enter DEV CODE…" autocomplete="off" required>
            <button type="submit" class="btn-primary" id="lzCodeSubmit">Submit DEV CODE</button>
          </form>
        </div>
      `}
      <div class="lz-code-feedback" id="lzCodeFeedback" hidden></div>
    `;

    $$('.lz-code-tab', body).forEach(btn => {
      btn.onclick = () => { activeTab = btn.dataset.t; render(); };
    });
    const form = $('#lzCodeForm', body);
    const inp = $('#lzCodeInput', body);
    const fb = $('#lzCodeFeedback', body);
    if (form){
      form.onsubmit = async e => {
        e.preventDefault();
        const code = (inp?.value || '').trim();
        if (!code) return;
        const sub = $('#lzCodeSubmit', body);
        if (sub) sub.disabled = true;
        state.lastQuotaToastAt = Date.now();
        try {
          const res = await api('/api/quota/redeem', {
            method: 'POST',
            body: JSON.stringify({ code, kind: activeTab })
          });
          if (res.account) updateAccount(res.account);
          if (window.LokiPlans?.render) window.LokiPlans.render();
          if (window.LokiBenches?.render && $('#benchesView')?.classList.contains('active')) window.LokiBenches.render();
          if (fb){
            fb.hidden = false;
            fb.className = 'lz-code-feedback ok';
            fb.textContent = res.grantedUltimateForever
              ? '✦ DEV CODE ACCEPTED! Loki Ultimate Forever & Infinite Access unlocked for everything!'
              : `✓ Code accepted! +${Number(res.addedTokens || 0).toLocaleString()} tokens added.`;
          }
          toast(
            res.grantedUltimateForever
              ? '✦ Loki Ultimate Forever & Infinite Access unlocked for everything!'
              : `✓ +${Number(res.addedTokens || 0).toLocaleString()} tokens added!`,
            'ok'
          );
          setTimeout(() => {
            if (!$('#codesModal').hidden) render();
          }, 950);
        } catch(err){
          if (fb){
            fb.hidden = false;
            fb.className = 'lz-code-feedback err';
            fb.textContent = `⚠️ ${err.message}`;
          }
          toast(err.message, 'err');
        } finally {
          if (sub) sub.disabled = false;
        }
      };
    }
    setTimeout(() => inp && inp.focus(), 50);
  }

  render();
  if (A()?.openModal) A().openModal('codesModal');
  else modal.hidden = false;
}

/* ---------------- Invite & Earn (+25,000 Tokens Referral Modal) ---------------- */
const PROD_INVITE_ORIGIN = 'https://lokizenith.com';
function getInviteUrl(){
  const code = state.user?.inviteCode || '';
  return code ? `${PROD_INVITE_ORIGIN}/?invite=${encodeURIComponent(code)}` : `${PROD_INVITE_ORIGIN}/`;
}

function openInviteModal(){
  const modal = $('#shareTargetModal');
  const title = $('#shareTargetTitle');
  const body = $('#shareTargetBody');
  if (!modal || !body) return;
  if (title) title.textContent = '🎁 Invite Friends & Earn +25,000 Tokens';
  const link = getInviteUrl();
  const code = state.user?.inviteCode || '';
  const count = state.user?.referralCount || 0;
  const earned = state.user?.referralTokensEarned || 0;

  body.innerHTML = `
    <div class="lz-invite-box">
      <p class="lz-invite-lead">Share your personal <b>lokizenith.com</b> invite link or Invite Number below. The exact second a friend creates an account using it, you automatically receive <b>+25,000 bonus tokens</b> in real time!</p>
      <div class="lz-invite-link-row">
        <input type="text" id="lzInviteLinkInput" readonly value="${esc(link)}">
        <button type="button" class="btn-primary" id="lzCopyInviteBtn">⧉ Copy Link</button>
        <button type="button" class="btn-ghost" id="lzNativeShareBtn">📤 Share</button>
      </div>
      <div class="lz-invite-code-row">
        <span class="lz-inv-code-lbl">Invite Number:</span>
        <input type="text" id="lzInviteCodeInput" readonly value="${esc(code)}">
        <button type="button" class="btn-ghost" id="lzCopyCodeBtn">⧉ Copy Number</button>
      </div>
      <div class="lz-invite-stats">
        <div class="lz-inv-stat">
          <small>Friends Joined</small>
          <b>${count}</b>
        </div>
        <div class="lz-inv-stat">
          <small>Bonus Tokens Earned</small>
          <b>+${Number(earned).toLocaleString()}</b>
        </div>
      </div>
    </div>
  `;

  $('#lzCopyInviteBtn', body).onclick = async () => {
    const inp = $('#lzInviteLinkInput', body);
    try {
      await navigator.clipboard.writeText(link);
    } catch(_){
      inp?.select();
      try { document.execCommand('copy'); } catch(__){}
    }
    toast('✓ lokizenith.com invite link copied!', 'ok');
  };

  $('#lzCopyCodeBtn', body).onclick = async () => {
    const inp = $('#lzInviteCodeInput', body);
    try {
      await navigator.clipboard.writeText(code);
    } catch(_){
      inp?.select();
      try { document.execCommand('copy'); } catch(__){}
    }
    toast(`✓ Invite Number ${code} copied!`, 'ok');
  };

  $('#lzNativeShareBtn', body).onclick = async () => {
    if (navigator.share){
      try {
        await navigator.share({
          title: 'Join me on Lokizenith AI',
          text: `Try Lokizenith AI (Invite #${code}) — Chat, LokiCode & Formula Calculator!`,
          url: link
        });
        return;
      } catch(e){
        if (e?.name === 'AbortError') return;
      }
    }
    $('#lzCopyInviteBtn', body).click();
  };

  A()?.openModal ? A().openModal('shareTargetModal') : (modal.hidden = false);
}

/* ---------------- Account & UI Sync ---------------- */
function getAvatarHtml(u, size = 28, extraClass = ''){
  const uname = u?.username || 'U';
  const dname = u?.displayName || uname;
  const pic = u?.avatarUrl || u?.googlePicture || '';
  const initial = String(dname || uname || 'U').trim().charAt(0).toUpperCase();
  if (pic){
    return `<img src="${esc(pic)}" alt="${esc(dname)}" class="lz-user-av-img ${extraClass}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" referrerpolicy="no-referrer">`;
  }
  return `<span class="lz-user-av-fallback ${extraClass}" style="width:${size}px;height:${size}px;border-radius:50%;display:inline-grid;place-items:center;font-weight:800;font-size:${Math.max(10, Math.round(size * 0.44))}px;flex-shrink:0;">${esc(initial)}</span>`;
}

function updateAccount(acc){
  if (!acc) return;
  const prevAvatar = state.user?.avatarUrl || state.user?.googlePicture || '';
  const prevDisplay = state.user?.displayName || state.user?.username || '';
  state.user = acc;
  savedUserBackup = acc;
  try {
    const serialized = JSON.stringify(acc);
    localStorage.setItem(USER_BACKUP_KEY, serialized);
    writeCookie('lz_user_backup', JSON.stringify({
      id: acc.id,
      username: acc.username,
      displayName: acc.displayName || acc.username,
      googleEmail: acc.googleEmail || '',
      isAdmin: acc.isAdmin,
      isRootAdmin: acc.isRootAdmin,
      adminAccessLevel: acc.adminAccessLevel,
      adminPermissions: acc.adminPermissions,
      tokensRemaining: acc.tokensRemaining,
      tokenLimitBase: acc.tokenLimitBase,
      tokenLimitEffective: acc.tokenLimitEffective,
      isUnlimited: acc.isUnlimited,
      plan: acc.plan || acc.effectivePlan || acc.planTier || 'free',
      planTier: acc.plan || acc.planTier || 'free',
      effectivePlan: acc.effectivePlan || acc.plan || acc.planTier || 'free',
      planStatus: acc.planStatus || 'active',
      planSource: acc.planSource || 'free',
      planExpiresAt: acc.planExpiresAt || null,
      planDurationLabel: acc.planDurationLabel || null,
      adminPlanTestMode: Boolean(acc.adminPlanTestMode),
      usedUltimateTrial: Boolean(acc.usedUltimateTrial),
      paypalSubscriptionId: acc.paypalSubscriptionId || null,
      paypalStatus: acc.paypalStatus || null,
      starkAuthorized: Boolean(acc.starkAuthorized),
      bannerVideoUrl: acc.bannerVideoUrl || '',
      featureQuotas: acc.featureQuotas || null
    }));
    if (state.token){
      localStorage.setItem(TOKEN_KEY, state.token);
      writeCookie('lz_token', state.token);
    }
  } catch(_){}
  renderUsageBar();
  renderInspectBanner();

  const accBox = $('#lzAccountBox');
  const accName = $('#lzAccountName');
  const sidePlanTag = $('#lzSidebarPlanTag');
  const adminTag = $('#lzAdminTag');
  const adminBtn = $('#adminResetAllBtn');
  const adminPanelBtn = $('#adminPanelBtn');
  const topChip = $('#userTopChip');
  const topAv = $('#userTopAvatar');
  const topName = $('#userTopName');
  const topPlanTag = $('#userTopPlanTag');
  const notifBtn = $('#notifBtn');
  const inviteTopBtn = $('#inviteTopBtn');
  const inviteSideBtn = $('#lzInviteBtn');

  const isEffectiveAdmin = Boolean(acc.isAdmin || state.inspectBackup);
  const dispName = acc.displayName || acc.username || 'Account';
  const avatarSrc = acc.avatarUrl || acc.googlePicture || '';
  const effPlan = String(acc.plan || acc.effectivePlan || acc.planTier || 'free').toLowerCase();
  const lowOwner = String(acc.username || '').toLowerCase();

  if (accBox){
    accBox.hidden = false;
    const accIdWrap = accBox.querySelector('.lz-acc-id');
    if (accIdWrap){
      accIdWrap.style.cursor = 'pointer';
      accIdWrap.title = 'Click to view & edit your Profile';
      let sideAv = accIdWrap.querySelector('.lz-side-av');
      if (!sideAv){
        sideAv = document.createElement('span');
        sideAv.className = 'lz-side-av';
        accIdWrap.insertBefore(sideAv, accIdWrap.firstChild);
      }
      if (avatarSrc){
        sideAv.innerHTML = `<img src="${esc(avatarSrc)}" alt="${esc(dispName)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;border:1px solid rgba(0,255,156,.45);">`;
      } else {
        sideAv.innerHTML = `<span style="width:24px;height:24px;border-radius:50%;background:var(--acc,#00ff9c);color:#03150c;display:grid;place-items:center;font-size:.74rem;font-weight:900;">${esc(dispName.charAt(0).toUpperCase())}</span>`;
      }
    }
  }
  if (accName) accName.textContent = dispName + (usage.isUnlimited() ? ' · ∞' : '');
  if (sidePlanTag){
    sidePlanTag.dataset.planOwner = lowOwner;
    sidePlanTag.className = `lz-plan-tag ${effPlan} sm`;
    sidePlanTag.textContent = effPlan === 'ultimate' ? '✦ ULTIMATE' : effPlan === 'pro' ? 'PRO' : 'FREE';
  }
  if (adminTag){
    adminTag.hidden = !isEffectiveAdmin;
    if (isEffectiveAdmin){
      adminTag.textContent = acc.isRootAdmin
        ? '👑 OWNER'
        : acc.adminAccessLevel === 'partial'
        ? '⚡ PARTIAL ADMIN'
        : '🛡️ ADMIN';
    }
  }
  const hasDirPerm = Boolean(acc.isRootAdmin || acc.adminAccessLevel === 'full' || (acc.adminPermissions || []).includes('directory') || state.inspectBackup);
  if (adminBtn) adminBtn.hidden = !hasDirPerm;
  if (adminPanelBtn) adminPanelBtn.hidden = !isEffectiveAdmin;
  if (!isEffectiveAdmin && $('#adminDashboardModal') && !$('#adminDashboardModal').hidden){
    $('#adminDashboardModal').hidden = true;
  }
  if (topChip){
    topChip.hidden = false;
    topChip.title = `${dispName} (@${acc.username}) · ${effPlan.toUpperCase()} Plan — Click to edit Profile`;
  }
  if (topName) topName.textContent = dispName;
  if (topPlanTag){
    topPlanTag.dataset.planOwner = lowOwner;
    topPlanTag.className = `lz-plan-tag ${effPlan}`;
    topPlanTag.textContent = effPlan === 'ultimate' ? '✦ ULTIMATE' : effPlan === 'pro' ? 'PRO' : 'FREE';
  }
  if (topAv){
    if (avatarSrc){
      topAv.innerHTML = `<img src="${esc(avatarSrc)}" alt="${esc(dispName)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      topAv.textContent = dispName.trim().charAt(0).toUpperCase();
    }
  }
  if (notifBtn) notifBtn.hidden = false;
  if (inviteTopBtn) inviteTopBtn.hidden = false;
  if (inviteSideBtn) inviteSideBtn.hidden = false;

  syncAllPlanTagsInDom(acc);

  // Keep App greeting name personalized & refresh plan locks
  if (A() && A().settings){
    const s = A().settings();
    if (!s.name || s.name === acc.username || s.name === prevDisplay) s.name = dispName;
  }
  if (A()?.refreshPlanLocks){
    try { A().refreshPlanLocks(); } catch(_){}
  }
  if (A()?.renderSettings && $('#settings')?.classList.contains('open')){
    try { A().renderSettings(); } catch(_){}
  }
  if (window.LokiBenches && $('#benchesView')?.classList.contains('active')){
    try { window.LokiBenches.render(); } catch(_){}
  }
  const justFinishedAi = (Date.now() - Number(window.__lzLastTurnFinishedAt || 0)) < 8000;
  if ((prevAvatar !== avatarSrc || prevDisplay !== dispName) && A()?.renderMessages && !A()?.state?.busy && !justFinishedAi){
    try { A().renderMessages(); } catch(_){}
  }
  try { syncMaintenanceOverlay(); } catch(_){}
}

function syncAllPlanTagsInDom(acc){
  if (!acc || !acc.username) return;
  const lowOwner = String(acc.username || '').toLowerCase();
  const effPlan = String(acc.plan || acc.effectivePlan || acc.planTier || 'free').toLowerCase();
  const label = effPlan === 'ultimate' ? '✦ ULTIMATE' : effPlan === 'pro' ? 'PRO' : 'FREE';
  const durHint = acc.planDurationLabel && effPlan !== 'free' ? ` · ${acc.planDurationLabel}` : '';
  const title = effPlan === 'ultimate'
    ? `Loki Ultimate Subscription ($12.99/mo)${durHint}`
    : effPlan === 'pro'
    ? `Loki Pro Subscription ($7.99/mo)${durHint}`
    : 'Loki Free Plan';
  document.querySelectorAll(`[data-plan-owner="${lowOwner}"]`).forEach(el => {
    const isSm = el.classList.contains('sm');
    const isLg = el.classList.contains('lg');
    el.className = `lz-plan-tag ${effPlan}${isSm ? ' sm' : ''}${isLg ? ' lg' : ''}`;
    el.textContent = label;
    el.title = title;
  });
}

function getPlanTagHtml(tier = 'free', extraCls = '', ownerUsername = ''){
  const t = String(tier || 'free').toLowerCase();
  const ownerAttr = ownerUsername ? ` data-plan-owner="${esc(String(ownerUsername).toLowerCase())}"` : '';
  if (t === 'ultimate'){
    return `<span class="lz-plan-tag ultimate ${extraCls}"${ownerAttr} title="Loki Ultimate Subscription ($12.99/mo)">✦ ULTIMATE</span>`;
  }
  if (t === 'pro'){
    return `<span class="lz-plan-tag pro ${extraCls}"${ownerAttr} title="Loki Pro Subscription ($7.99/mo)">PRO</span>`;
  }
  return `<span class="lz-plan-tag free ${extraCls}"${ownerAttr} title="Loki Free Plan">FREE</span>`;
}

async function consumeFeatureQuota(feature, amount = 1, turnId = ''){
  const ac = (typeof AbortController === 'function') ? new AbortController() : null;
  const timer = setTimeout(() => { try { ac && ac.abort(); } catch(_){} }, 2500);
  try {
    const res = await api('/api/quota/track-feature', {
      method: 'POST',
      body: JSON.stringify({ feature, amount, ...(turnId ? { turnId } : {}) }),
      signal: ac ? ac.signal : undefined
    });
    if (res && res.account){
      updateAccount(res.account);
    }
    return res;
  } catch (err) {
    if (err?.name === 'AbortError' || /aborted|The operation was aborted/i.test(String(err?.message || ''))){
      return { ok: false, allowed: true, timedOut: true, error: 'Quota check timed out' };
    }
    if (err?.data?.account){
      updateAccount(err.data.account);
    }
    const locked = err?.status === 403 || ['LIMIT_REACHED', 'STARK_LIMIT_REACHED', 'IMAGE_LIMIT_REACHED'].includes(String(err?.code || err?.data?.code || ''));
    return {
      ok: false,
      allowed: !locked,
      code: err?.code || err?.data?.code || '',
      error: err?.message || 'Quota check failed',
      status: err?.data?.status || null,
      account: err?.data?.account || null
    };
  } finally {
    clearTimeout(timer);
  }
}

function clearSessionUI(){
  state.token = '';
  state.user = null;
  savedUserBackup = null;
  state.adminOverview = null;
  state.activeBanInfo = null;
  state.inspectBackup = null;
  state.teamChats = [];
  state.lokiTeams = [];
  state.notifications = [];
  state.activeTeamChatId = null;
  state.activeLokiTeamId = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_BACKUP_KEY);
  writeCookie('lz_token', '', 0);
  writeCookie('lz_user_backup', '', 0);
  try { sessionStorage.removeItem(INSPECT_BACKUP_KEY); } catch(_){}

  if (state.ws){
    try { state.ws.close(); } catch(_){}
    state.ws = null;
  }
  clearTimeout(state.wsRetryTimer);
  clearInterval(state.wsPingTimer);
  clearInterval(state.banTimer);
  clearInterval(state.presenceTimer);

  renderInspectBanner();
  const bm = $('#bannedUserModal');
  if (bm) bm.hidden = true;
  if ($('#lzAccountBox')) $('#lzAccountBox').hidden = true;
  if ($('#adminResetAllBtn')) $('#adminResetAllBtn').hidden = true;
  if ($('#adminPanelBtn')) $('#adminPanelBtn').hidden = true;
  if ($('#userTopChip')) $('#userTopChip').hidden = true;
  if ($('#notifBtn')) $('#notifBtn').hidden = true;
  if ($('#inviteTopBtn')) $('#inviteTopBtn').hidden = true;
  if ($('#lzInviteBtn')) $('#lzInviteBtn').hidden = true;
  enterGuestMode();
  openAuthOverlay('login');
}

function renderAuthInviteBanner(){
  const banner = $('#authInviteBanner');
  if (!banner) return;
  const typedCode = ($('#authInviteInput')?.value || '').trim();
  const activeCode = state.pendingInvite || typedCode;
  if (state.authMode === 'register' && activeCode){
    banner.hidden = false;
    banner.innerHTML = state.pendingInviterName
      ? `🎁 Invited by <b>${esc(state.pendingInviterName)}</b> (#${esc(activeCode)}) — sign up so they earn <b>+25,000 bonus tokens</b> immediately!`
      : `🎁 Invite Number <b>${esc(activeCode)}</b> active — inviter receives <b>+25,000 bonus tokens</b> on account creation!`;
  } else {
    banner.hidden = true;
  }
}

function syncAuthFieldCopy(){
  const login = state.authMode !== 'register';
  const userInp = $('#authUsername');
  const pw = $('#authPassword');
  if (userInp) userInp.placeholder = login ? 'Your username' : 'Choose a unique username';
  if (pw){
    pw.placeholder = login ? 'Your password' : 'At least 8 characters';
    pw.minLength = login ? 1 : 8;
    pw.setAttribute('minlength', login ? '1' : '8');
    pw.setAttribute('autocomplete', login ? 'current-password' : 'new-password');
  }
  const legal = $('#authLegalNote');
  if (legal) legal.hidden = login;
}

function lockAuthScroll(){
  document.documentElement.classList.add('lz-auth-lock');
  document.body.classList.add('lz-auth-lock');
  const code = $('#codeView');
  if (code) code.scrollTop = 0;
  const ov = $('#authOverlay');
  if (ov && !ov.dataset.scrollLock){
    ov.dataset.scrollLock = '1';
    ov.addEventListener('wheel', (e) => {
      if (!document.body.classList.contains('lz-auth-lock')) return;
      if (e.target.closest && e.target.closest('.lz-auth-card')) return;
      e.preventDefault();
    }, { passive: false });
    ov.addEventListener('touchmove', (e) => {
      if (!document.body.classList.contains('lz-auth-lock')) return;
      if (e.target.closest && e.target.closest('.lz-auth-card')) return;
      e.preventDefault();
    }, { passive: false });
  }
}

function unlockAuthScroll(){
  document.documentElement.classList.remove('lz-auth-lock');
  document.body.classList.remove('lz-auth-lock');
}

function openAuthOverlay(mode = 'login'){
  const ov = $('#authOverlay');
  if (!ov) return;
  state.authMode = mode === 'register' ? 'register' : 'login';
  ov.hidden = false;
  lockAuthScroll();
  $('#authTabLogin')?.classList.toggle('on', state.authMode === 'login');
  $('#authTabRegister')?.classList.toggle('on', state.authMode === 'register');
  $('#authTabLogin')?.setAttribute('aria-selected', String(state.authMode === 'login'));
  $('#authTabRegister')?.setAttribute('aria-selected', String(state.authMode === 'register'));
  const sub = $('#authSubmitBtn');
  if (sub) sub.textContent = state.authMode === 'login' ? 'Log In' : 'Create Account';
  const gText = $('#googleAuthBtnText');
  if (gText) gText.textContent = state.authMode === 'login' ? 'Continue with Google' : 'Sign up with Google';
  syncAuthFieldCopy();
  const invField = $('#authInviteField');
  const invInp = $('#authInviteInput');
  if (invField) invField.hidden = state.authMode !== 'register';
  if (invInp && state.pendingInvite && !invInp.value) invInp.value = state.pendingInvite;
  const err = $('#authError');
  if (err) err.hidden = true;
  renderAuthInviteBanner();
  setTimeout(() => $('#authUsername')?.focus(), 50);
}

function hideAuthOverlay(){
  const ov = $('#authOverlay');
  if (ov) ov.hidden = true;
  renderGuestChrome();
  unlockAuthScroll();
  if (window.LZRoute && typeof LZRoute.hydrate === 'function') LZRoute.hydrate();
}

/* ---------------- Google OAuth Popup Flow (Firebase Auth Popup + Server Token Verification) ---------------- */
async function startGoogleOAuthFlow(){
  const btn = $('#googleAuthBtn');
  const gText = $('#googleAuthBtnText');
  const errEl = $('#authError');
  if (errEl) errEl.hidden = true;
  if (btn) btn.disabled = true;
  const origLabel = gText ? gText.textContent : 'Continue with Google';
  if (gText) gText.textContent = 'Connecting to Google…';

  try {
    const typedInvite = ($('#authInviteInput')?.value || '').trim();
    const activeInvite = typedInvite || state.pendingInvite || '';

    // Ensure LZWorkspaceAuth is loaded from /src/main.tsx
    let googleAuthFn = window.LZWorkspaceAuth?.signInWithGoogleAccount;
    if (typeof googleAuthFn !== 'function'){
      for (let i = 0; i < 15; i++){
        await new Promise(r => setTimeout(r, 100));
        if (typeof window.LZWorkspaceAuth?.signInWithGoogleAccount === 'function'){
          googleAuthFn = window.LZWorkspaceAuth.signInWithGoogleAccount;
          break;
        }
      }
    }

    if (typeof googleAuthFn === 'function'){
      const gOut = await googleAuthFn();
      const verifyRes = await api('/api/auth/google/verify', {
        method: 'POST',
        body: JSON.stringify({
          firebaseIdToken: gOut.firebaseIdToken,
          googleIdToken: gOut.googleIdToken,
          googleAccessToken: gOut.googleAccessToken,
          profile: gOut.profile,
          inviteCode: activeInvite || undefined,
          device: getClientDeviceHints()
        })
      });

      if (verifyRes.banned && verifyRes.banInfo){
        showBannedModal(verifyRes.banInfo);
        return;
      }

      state.pendingInvite = '';
      state.pendingInviterName = '';
      if ($('#authInviteInput')) $('#authInviteInput').value = '';
      sessionStorage.removeItem(INVITE_KEY);
      try {
        const url = new URL(location.href);
        url.searchParams.delete('invite');
        history.replaceState({}, '', url.pathname + url.search);
      } catch(_){}

      applyPayloadAfterAuth(verifyRes);
      startPresenceHeartbeat();
      toast(
        verifyRes.isNewAccount
          ? `🎉 Created account & signed in with Google as @${verifyRes.user?.username}!`
          : `✓ Signed in with Google as @${verifyRes.user?.username}!`,
        'ok'
      );
      return;
    }

    // Fallback OAuth popup if module not available
    const res = await api('/api/auth/google/url?origin=' + encodeURIComponent(location.origin) + '&inviteCode=' + encodeURIComponent(activeInvite));
    if (!res.url) throw new Error('Could not generate Google OAuth URL.');
    const width = 520;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const popup = window.open(
      res.url,
      'lokizenith_google_oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    if (!popup){
      throw new Error('Popup was blocked by browser. Please allow popups for this site to sign in with Google.');
    }
  } catch(err){
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'){
      toast('Google sign-in popup was closed.', 'err');
      return;
    }
    const msg = err?.data?.error || err?.message || 'Google sign-in failed.';
    if (errEl){
      errEl.hidden = false;
      errEl.textContent = msg;
    }
    toast(msg, 'err');
  } finally {
    if (btn) btn.disabled = false;
    if (gText) gText.textContent = origLabel;
  }
}

window.addEventListener('message', ev => {
  const d = ev?.data;
  if (!d || typeof d !== 'object') return;
  const authPayload = d.payload || d.auth;
  if ((d.type === 'LZ_GOOGLE_AUTH_SUCCESS' || d.type === 'OAUTH_AUTH_SUCCESS') && authPayload){
    if (authPayload.banned && authPayload.banInfo){
      showBannedModal(authPayload.banInfo);
      return;
    }
    state.pendingInvite = '';
    state.pendingInviterName = '';
    sessionStorage.removeItem(INVITE_KEY);
    applyPayloadAfterAuth(authPayload);
    startPresenceHeartbeat();
    toast(`✓ Signed in with Google as @${authPayload.user?.username || 'Account'}!`, 'ok');
  } else if (d.type === 'LZ_GOOGLE_AUTH_ERROR' || d.type === 'OAUTH_AUTH_ERROR'){
    if (d.banned && d.banInfo){
      showBannedModal(d.banInfo);
      return;
    }
    const errEl = $('#authError');
    if (errEl){
      errEl.hidden = false;
      errEl.textContent = d.error || 'Google authentication failed.';
    }
    toast(d.error || 'Google authentication failed', 'err');
  }
});

function applyPayloadAfterAuth(res){
  if (res.token){
    state.token = res.token;
    localStorage.setItem(TOKEN_KEY, res.token);
  }
  if (res.platformConfig){
    state.platformConfig = res.platformConfig;
    renderPlatformMotd(res.platformConfig);
  }
  updateAccount(res.user);
  state.teamChats = Array.isArray(res.teamChats) ? res.teamChats : [];
  state.lokiTeams = Array.isArray(res.lokiTeams) ? res.lokiTeams : [];
  state.notifications = Array.isArray(res.notifications) ? res.notifications : [];
  state.onlineUsers = Array.isArray(res.onlineUsers) ? res.onlineUsers : [];
  state.bootData = res.data || null;

  hideAuthOverlay();
  connectWS();
  updateNotifBadge();
  updateTeamChatBadge();

  if (A() && typeof A().applyServerUserData === 'function'){
    A().applyServerUserData(res.data || {});
  }
  if (window.LokiCode && typeof window.LokiCode.applyServerCodeState === 'function'){
    window.LokiCode.applyServerCodeState(res.data || {});
  }
  if (res.activeEvent !== undefined && window.LZEvents?.setEvent){
    window.LZEvents.setEvent(res.activeEvent || null);
  }
  renderLokiTeamBar();
  renderInspectBanner();
  if ($('#teamChatView')?.classList.contains('active')) renderTeamChatView();
  if ($('#sharedHubView')?.classList.contains('active')) renderSharedHubView();
  if ($('#eventView')?.classList.contains('active') && window.LZEvents?.render) window.LZEvents.render();
}

const SYNC_OUTBOX_KEY = 'lz.syncOutbox';
let syncDirtyFlag = false;
let syncRetryTimer = 0;

function buildLiveSyncPayload(){
  const payload = {
    sourceTabId: TAB_ID,
    updatedAt: Date.now()
  };
  if (A()){
    payload.convs = (A().state?.convs || []).slice(0, 200);
    payload.deletedConvIds = A().getDeletedConvIds ? A().getDeletedConvIds() : {};
    payload.settings = A().settings ? A().settings() : undefined;
    payload.settingsUpdatedAt = Date.now();
  }
  try {
    const lcRaw = localStorage.getItem('lz.code');
    if (lcRaw) payload.lokicode = JSON.parse(lcRaw);
  } catch(_){}
  try {
    const histRaw = localStorage.getItem('lz.code.history');
    if (histRaw) payload.codeHistory = JSON.parse(histRaw);
  } catch(_){}
  return payload;
}

async function flushLiveSyncNow(useBeacon = false){
  if (!state.token || !state.user) return false;
  const payload = buildLiveSyncPayload();
  try {
    localStorage.setItem(SYNC_OUTBOX_KEY, JSON.stringify({ userId: state.user.id, payload, ts: Date.now() }));
  } catch(_){}

  if (useBeacon){
    try {
      const beaconBody = Object.assign({ _token: state.token }, payload);
      if (navigator.sendBeacon){
        navigator.sendBeacon('/api/user/sync', new Blob([JSON.stringify(beaconBody)], { type: 'application/json' }));
      } else {
        fetch('/api/user/sync', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', 'x-lz-token': state.token },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
      syncDirtyFlag = false;
      return true;
    } catch(_){ return false; }
  }

  try {
    // Push live immediately over open WebSocket if connected
    if (state.ws && state.ws.readyState === WebSocket.OPEN){
      sendWS({ type: 'user:sync', sourceTabId: TAB_ID, payload });
    }
    const res = await api('/api/user/sync', { method: 'POST', body: JSON.stringify(payload) });
    syncDirtyFlag = false;
    clearTimeout(syncRetryTimer);
    try { localStorage.removeItem(SYNC_OUTBOX_KEY); } catch(_){}
    if (res?.data && A()?.applyServerUserData && !A()?.state?.busy && !(A()?.state?.turns?.size > 0)){
      const justFinishedAi = (Date.now() - Number(window.__lzLastTurnFinishedAt || 0)) < 8000;
      const localConvs = A()?.state?.convs || [];
      const localMap = new Map(localConvs.map(c => [c.id, Number(c.updated || 0)]));
      const serverHasMore = Array.isArray(res.data.convs) && res.data.convs.some(sc => !localMap.has(sc.id) || Number(sc.updated || 0) > (localMap.get(sc.id) || 0));
      if (serverHasMore && !justFinishedAi){
        await A().applyServerUserData(res.data);
      }
    }
    try {
      if (window.LokiFirebase && typeof window.LokiFirebase.syncPersonalVaultToCloud === 'function' && window.LokiFirebase.getCurrentUser && window.LokiFirebase.getCurrentUser()) {
        const convsList = Array.isArray(payload.convs) ? payload.convs : [];
        window.LokiFirebase.syncPersonalVaultToCloud({
          username: state.user.username || 'User',
          plan: state.user.effectivePlan || state.user.plan || 'free',
          convsCount: convsList.length,
          schemaVersion: 3,
          settings: payload.settings || {},
          recentTitles: convsList.slice(0, 12).map(c => c?.title || 'Chat'),
        }).catch(() => {});
      }
    } catch(_){}
    return true;
  } catch(_){
    clearTimeout(syncRetryTimer);
    syncRetryTimer = setTimeout(() => { flushLiveSyncNow(false); }, 4000);
    return false;
  }
}

function flushOutboxIfNeeded(){
  if (!state.token || !state.user) return;
  try {
    const raw = localStorage.getItem(SYNC_OUTBOX_KEY);
    if (!raw) return;
    const queued = JSON.parse(raw);
    if (queued && queued.userId === state.user.id && queued.payload){
      api('/api/user/sync', { method: 'POST', body: JSON.stringify(queued.payload) })
        .then(res => {
          localStorage.removeItem(SYNC_OUTBOX_KEY);
          if (res?.data && A()?.applyServerUserData) A().applyServerUserData(res.data);
        })
        .catch(() => {});
    }
  } catch(_){}
}

function scheduleSync(immediate = false){
  if (!state.token || !state.user) return;
  syncDirtyFlag = true;
  try {
    const payload = buildLiveSyncPayload();
    localStorage.setItem(SYNC_OUTBOX_KEY, JSON.stringify({ userId: state.user.id, payload, ts: Date.now() }));
  } catch(_){}
  clearTimeout(state.syncTimer);
  if (immediate){
    flushLiveSyncNow(false);
    return;
  }
  state.syncTimer = setTimeout(() => {
    flushLiveSyncNow(false);
  }, 8000);
}

window.addEventListener('online', () => { flushOutboxIfNeeded(); if (syncDirtyFlag) flushLiveSyncNow(false); });
document.addEventListener('visibilitychange', () => { if (document.hidden && syncDirtyFlag) flushLiveSyncNow(true); });
window.addEventListener('pagehide', () => { if (syncDirtyFlag) flushLiveSyncNow(true); });
window.addEventListener('beforeunload', () => { if (syncDirtyFlag) flushLiveSyncNow(true); });

async function logout(){
  if (state.inspectBackup){
    await exitInspectAccount();
    return;
  }
  const tok = state.token;
  if (tok){
    try { await api('/api/auth/logout', { method: 'POST' }); } catch(_){}
  }
  if (A() && typeof A().clearLocalAccountState === 'function'){
    await A().clearLocalAccountState();
  }
  clearSessionUI();
  toast('Logged out');
}

/* ---------------- Platform Pinned MOTD Ribbon & Live Timed Maintenance Overlay ---------------- */
function resolveMaintenanceStateClient(cfg, now = Date.now()){
  const enabled = !!cfg?.maintenanceMode;
  const startedAt = Number(cfg?.maintenanceStartedAt || 0);
  const endsAt = Number(cfg?.maintenanceEndsAt || 0);
  const title = String(cfg?.maintenanceTitle || 'Scheduled Platform Upgrade').trim();
  const article = String(cfg?.maintenanceArticle || cfg?.maintenanceMessage || 'Platform maintenance is active. Workspace will reopen automatically when the countdown completes.').trim();
  if (!enabled){
    return { active: false, expired: false, title, article, endsAt: 0, remainingMs: 0, remainingLabel: '00s', progressPct: 100 };
  }
  if (endsAt > 0 && now >= endsAt){
    return { active: false, expired: true, title, article, endsAt, remainingMs: 0, remainingLabel: '00s', progressPct: 100 };
  }
  const isIndefinite = endsAt <= 0;
  const remainingMs = isIndefinite ? 0 : Math.max(0, endsAt - now);
  const totalMs = (!isIndefinite && startedAt > 0 && endsAt > startedAt) ? (endsAt - startedAt) : remainingMs;
  const elapsedMs = totalMs > 0 ? Math.max(0, totalMs - remainingMs) : 0;
  const progressPct = totalMs > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100))) : 0;
  const sec = Math.ceil(remainingMs / 1000);
  const w = Math.floor(sec / (7 * 86400));
  const remW = sec % (7 * 86400);
  const d = Math.floor(remW / 86400);
  const h = Math.floor((remW % 86400) / 3600);
  const m = Math.floor((remW % 3600) / 60);
  const s = sec % 60;
  const pad = v => String(v).padStart(2, '0');
  const parts = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0 || w > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0 || w > 0) parts.push(`${pad(h)}h`);
  if (m > 0 || h > 0 || d > 0 || w > 0) parts.push(`${pad(m)}m`);
  parts.push(`${pad(s)}s`);
  return {
    active: true,
    expired: false,
    title,
    article,
    endsAt,
    remainingMs,
    remainingLabel: isIndefinite ? 'Until Resumed' : parts.join(' '),
    progressPct,
    weeks: w,
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
    updatedBy: cfg?.maintenanceUpdatedBy || 'Admin'
  };
}

let clientMaintTicker = 0;
let adminMaintPreviewActive = false;

function syncMaintenanceOverlay(cfg){
  const c = cfg || state.platformConfig || {};
  state.platformConfig = c;
  const overlay = $('#maintenanceOverlay');
  const adminBar = $('#adminMaintLiveBar');
  const isViewerAdmin = !!(state.user?.isAdmin || state.user?.isRootAdmin || state.user?.adminAccessLevel === 'full' || state.user?.adminAccessLevel === 'partial');

  const mState = resolveMaintenanceStateClient(c, Date.now());

  // Floating Admin Bar for Admins
  if (adminBar){
    if (isViewerAdmin && mState.active){
      adminBar.hidden = false;
      const barTxt = $('#adminMaintBarText');
      if (barTxt) barTxt.textContent = `🚧 Maintenance Active (${mState.remainingLabel}) — Non-Admins Locked`;
      const prevBtn = $('#adminMaintPreviewBtn');
      if (prevBtn) prevBtn.textContent = adminMaintPreviewActive ? '✕ Close Preview' : '👁 Preview';
      const stopBtn = $('#adminMaintQuickStopBtn');
      if (stopBtn){
        stopBtn.onclick = async () => {
          try {
            await api('/api/admin/platform-config', { method: 'POST', body: JSON.stringify({ maintenanceMode: false }) });
            toast('⏹ Maintenance ended. Platform reopened to all users!', 'ok');
          } catch(e){ toast(e.message, 'err'); }
        };
      }
      if (prevBtn){
        prevBtn.onclick = () => {
          adminMaintPreviewActive = !adminMaintPreviewActive;
          syncMaintenanceOverlay(state.platformConfig);
        };
      }
    } else {
      adminBar.hidden = true;
    }
  }

  // Full-Screen Unclosable Maintenance Overlay for Non-Admins (or Admin Preview)
  if (!overlay) return;

  const shouldShow = mState.active && (!isViewerAdmin || adminMaintPreviewActive);

  if (!shouldShow){
    if (!overlay.hidden){
      overlay.hidden = true;
      clearInterval(clientMaintTicker);
      clientMaintTicker = 0;
      if (!isViewerAdmin && mState.expired){
        toast('✨ Platform upgrade complete! Welcome back to Lokizenith AI.', 'ok');
      }
    }
    return;
  }

  overlay.hidden = false;
  const titleEl = $('#maintOverlayTitle');
  if (titleEl) titleEl.textContent = mState.title;
  const byEl = $('#maintOverlayBy');
  if (byEl) byEl.textContent = `Scheduled by @${mState.updatedBy || 'Admin'}`;
  const artEl = $('#maintOverlayArticle');
  if (artEl){
    const rawArt = mState.article || 'Lokizenith AI is undergoing a quick scheduled upgrade.';
    const safeArt = esc(rawArt)
      .replace(/^###\s+(.+)$/gm, '<h3 style="color:#fde68a;font-size:1.05rem;margin:8px 0 4px;">$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2 style="color:#fde68a;font-size:1.15rem;margin:10px 0 6px;">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/^\s*[\-\•\*]\s+(.+)$/gm, '<div style="margin:4px 0 4px 12px;display:flex;gap:6px;"><span>•</span><span>$1</span></div>')
      .replace(/\n\n+/g, '<br><br>')
      .replace(/\n/g, '<br>');
    artEl.innerHTML = safeArt;
  }

  const previewFoot = $('#maintAdminPreviewFooter');
  if (previewFoot){
    previewFoot.hidden = !adminMaintPreviewActive;
    const exitBtn = $('#maintExitPreviewBtn');
    if (exitBtn){
      exitBtn.onclick = () => {
        adminMaintPreviewActive = false;
        syncMaintenanceOverlay(state.platformConfig);
      };
    }
  }

  const updateTicks = () => {
    const cur = resolveMaintenanceStateClient(state.platformConfig, Date.now());
    if (!cur.active){
      clearInterval(clientMaintTicker);
      clientMaintTicker = 0;
      overlay.hidden = true;
      if (!isViewerAdmin){
        toast('✨ Platform upgrade complete! Welcome back to Lokizenith AI.', 'ok');
      }
      if (adminBar) adminBar.hidden = true;
      return;
    }

    const pad = v => String(v).padStart(2, '0');
    const segW = $('#maintSegWeeks');
    if (segW){
      segW.hidden = cur.weeks <= 0;
      const vW = $('#maintValWeeks');
      if (vW) vW.textContent = String(cur.weeks);
    }
    const segD = $('#maintSegDays');
    if (segD){
      segD.hidden = cur.days <= 0 && cur.weeks <= 0;
      const vD = $('#maintValDays');
      if (vD) vD.textContent = String(cur.days);
    }
    const vH = $('#maintValHours');
    if (vH) vH.textContent = pad(cur.hours);
    const vM = $('#maintValMinutes');
    if (vM) vM.textContent = pad(cur.minutes);
    const vS = $('#maintValSeconds');
    if (vS) vS.textContent = pad(cur.seconds);

    const fill = $('#maintProgressFill');
    if (fill) fill.style.width = `${cur.progressPct}%`;

    const eta = $('#maintEndsAtLabel');
    if (eta){
      eta.textContent = cur.endsAt > 0
        ? `Closes automatically on ${new Date(cur.endsAt).toLocaleTimeString()} (${cur.remainingLabel} remaining)`
        : 'Closes automatically once maintenance is finished';
    }

    if (adminBar && !adminBar.hidden){
      const barTxt = $('#adminMaintBarText');
      if (barTxt) barTxt.textContent = `🚧 Maintenance Active (${cur.remainingLabel}) — Non-Admins Locked`;
    }
  };

  updateTicks();
  clearInterval(clientMaintTicker);
  clientMaintTicker = setInterval(updateTicks, 1000);
}

function renderPlatformMotd(cfg){
  state.platformConfig = cfg || state.platformConfig;
  syncMaintenanceOverlay(state.platformConfig);
  const ribbon = $('#platformMotdRibbon');
  const txt = $('#platformMotdText');
  if (!ribbon || !txt) return;
  const c = state.platformConfig;
  if (!c || !c.motdEnabled || !String(c.motdText || '').trim()){
    ribbon.hidden = true;
    document.body.classList.remove('has-motd-ribbon');
    return;
  }
  ribbon.hidden = false;
  ribbon.className = `lz-motd-ribbon theme-${c.motdTheme || 'emerald'}`;
  txt.textContent = c.motdText;
  document.body.classList.add('has-motd-ribbon');
}

/* ---------------- Built-in WebAudio Soundboard & Live Voice PA Engine ---------------- */
const SOUNDBOARD_LIBRARY = [
  { id: 'airhorn', icon: '📯', name: 'MLG Airhorn Blast', desc: 'Triple stadium airhorn hype blast', tag: 'HYPE', color: '#f59e0b' },
  { id: 'siren', icon: '🚨', name: 'Red Alert Siren', desc: 'Tactical command center emergency klaxon', tag: 'ALERT', color: '#ef4444' },
  { id: 'rimshot', icon: '🥁', name: 'Ba-Dum-Tss!', desc: 'Classic comedy punchline drum rimshot', tag: 'FUNNY', color: '#38bdf8' },
  { id: 'trombone', icon: '🎺', name: 'Sad Trombone', desc: 'Womp-womp-womp-waaaah fail horn', tag: 'FUNNY', color: '#a855f7' },
  { id: 'vineboom', icon: '💥', name: 'Vine Boom Drop', desc: 'Sub-bass cinematic shockwave thud', tag: 'MEME', color: '#ec4899' },
  { id: 'levelup', icon: '👾', name: '8-Bit Level Up', desc: 'Retro arcade power-up victory arpeggio', tag: 'GAMING', color: '#00ff9c' },
  { id: 'ufo', icon: '🛸', name: 'UFO Abduction Beam', desc: 'Sci-fi theremin tractor beam warble', tag: 'SCI-FI', color: '#22d3ee' },
  { id: 'glitch', icon: '⚡', name: 'Cyber Glitch Zaps', desc: 'High-voltage matrix circuit surge', tag: 'CYBER', color: '#eab308' },
  { id: 'boing', icon: '🦆', name: 'Cartoon Quack Boing', desc: 'Goofy spring bounce + duck quack', tag: 'FUNNY', color: '#fb923c' },
  { id: 'fanfare', icon: '👑', name: 'Royal Admin Fanfare', desc: 'Majestic brass trumpet announcement', tag: 'ROYAL', color: '#fcd34d' },
  { id: 'police', icon: '🚓', name: 'Cyber Police Whoop', desc: 'Double yelp cruiser siren sweep', tag: 'ALERT', color: '#60a5fa' },
  { id: 'jackpot', icon: '🎰', name: 'Jackpot Coin Cascade', desc: 'Casino slot machine winning chime', tag: 'WIN', color: '#34d399' }
];

let sharedAudioCtx = null;
let hudHideTimer = 0;
let currentVoiceSource = null;
let currentVoiceHtmlAudio = null;

function getAudioCtx(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new Ctx();
  if (sharedAudioCtx.state === 'suspended'){
    sharedAudioCtx.resume().catch(()=>{});
  }
  return sharedAudioCtx;
}

// Unlock WebAudio Context on any user interaction so incoming live WebSocket voice broadcasts play on all devices
(function setupGlobalAudioUnlocker(){
  const unlock = () => {
    try {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended'){
        ctx.resume().catch(()=>{});
      }
    } catch(_){}
  };
  ['pointerdown', 'mousedown', 'touchstart', 'keydown'].forEach(evName => {
    window.addEventListener(evName, unlock, { passive: true, capture: true });
  });
})();

function encodeAudioBufferToWavDataUrl(audioBuffer, targetSampleRate = 22050){
  const numChannels = 1;
  const srcRate = audioBuffer.sampleRate || 44100;
  const outRate = Math.min(srcRate, targetSampleRate);
  const ratio = srcRate / outRate;
  const srcLen = audioBuffer.length;
  const outLen = Math.max(1, Math.floor(srcLen / ratio));

  // Mix down channels to mono
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

  const buffer = new ArrayBuffer(44 + outLen * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + outLen * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, outRate, true);
  view.setUint32(28, outRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeStr(36, 'data');
  view.setUint32(40, outLen * 2, true);

  let offset = 44;
  for (let i = 0; i < outLen; i++){
    const srcIdx = Math.min(srcLen - 1, Math.floor(i * ratio));
    let sample = ch1 ? (ch0[srcIdx] + ch1[srcIdx]) * 0.5 : ch0[srcIdx];
    sample = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

async function convertBlobToWavDataUrl(blob){
  try {
    const ctx = getAudioCtx();
    if (ctx){
      const arrBuf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrBuf.slice(0));
      return encodeAudioBufferToWavDataUrl(decoded, 22050);
    }
  } catch(_){}
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToArrayBuffer(dataUrl){
  const commaIdx = String(dataUrl || '').indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : String(dataUrl || '');
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function showLiveAudioHud(title, sub, durationMs = 4200){
  const hud = $('#liveAudioTransmissionHud');
  const titleEl = $('#lahTitle');
  const subEl = $('#lahSub');
  if (!hud) return;
  if (titleEl) titleEl.textContent = title || '🎙 Lokizenith Live Audio Broadcast';
  if (subEl) subEl.textContent = sub || 'Playing across all online accounts…';
  hud.hidden = false;
  hud.classList.add('active');
  clearTimeout(hudHideTimer);
  hudHideTimer = setTimeout(() => {
    hud.classList.remove('active');
    hud.hidden = true;
  }, Math.max(1500, durationMs));
}

function playSynthesizedSound(soundId, caption = '', fromAdmin = 'Lokizenith', showHud = true){
  const item = SOUNDBOARD_LIBRARY.find(s => s.id === soundId) || SOUNDBOARD_LIBRARY[0];
  if (showHud){
    showLiveAudioHud(
      `${item.icon} ${item.name} — Live from @${fromAdmin}`,
      caption || `${item.desc} · Synchronized across all online screens`,
      3600
    );
  }
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const tone = (freq, type, startOffset, dur, peakGain = 0.28, endFreq = null) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + startOffset);
    if (endFreq !== null){
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + startOffset + dur);
    }
    g.gain.setValueAtTime(0.0001, now + startOffset);
    g.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + startOffset);
    osc.stop(now + startOffset + dur + 0.02);
  };

  const noiseBurst = (startOffset, dur, peakGain = 0.22, filterFreq = 1200) => {
    const bufSize = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peakGain, now + startOffset);
    g.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    src.start(now + startOffset);
  };

  switch (soundId){
    case 'airhorn':
      [0, 0.22, 0.44].forEach((st, idx) => {
        const d = idx === 2 ? 0.65 : 0.17;
        tone(466.16, 'sawtooth', st, d, 0.24, 455);
        tone(698.46, 'sawtooth', st, d, 0.2, 688);
        tone(932.33, 'square', st, d, 0.14, 918);
      });
      break;
    case 'siren':
      for (let i = 0; i < 4; i++){
        tone(440, 'sawtooth', i * 0.45, 0.22, 0.24, 880);
        tone(880, 'sawtooth', i * 0.45 + 0.22, 0.22, 0.24, 440);
      }
      break;
    case 'rimshot':
      tone(145, 'triangle', 0, 0.13, 0.35, 55);
      noiseBurst(0.18, 0.14, 0.28, 950);
      tone(190, 'triangle', 0.18, 0.11, 0.25, 95);
      noiseBurst(0.38, 0.55, 0.25, 5200);
      break;
    case 'trombone':
      tone(392.0, 'sawtooth', 0, 0.32, 0.24, 370.0);
      tone(369.99, 'sawtooth', 0.35, 0.32, 0.24, 349.2);
      tone(349.23, 'sawtooth', 0.70, 0.32, 0.24, 329.6);
      tone(329.63, 'sawtooth', 1.05, 0.85, 0.26, 235.0);
      break;
    case 'vineboom':
      tone(130, 'sine', 0, 1.15, 0.52, 26);
      tone(65, 'triangle', 0, 0.9, 0.32, 22);
      noiseBurst(0, 0.18, 0.18, 220);
      break;
    case 'levelup':
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => {
        tone(f, 'square', i * 0.11, i === 5 ? 0.38 : 0.1, 0.2);
      });
      break;
    case 'ufo':
      for (let i = 0; i < 12; i++){
        const f1 = 520 + (i % 2) * 380;
        const f2 = 900 - (i % 2) * 380;
        tone(f1, 'sine', i * 0.13, 0.13, 0.22, f2);
      }
      break;
    case 'glitch':
      [880, 190, 1760, 310, 1320, 120, 2400, 420].forEach((f, i) => {
        tone(f, 'sawtooth', i * 0.08, 0.07, 0.22, f * 0.6);
      });
      break;
    case 'boing':
      tone(320, 'sawtooth', 0, 0.12, 0.26, 780);
      tone(780, 'sawtooth', 0.12, 0.14, 0.24, 260);
      tone(150, 'sine', 0.28, 0.65, 0.32, 680);
      break;
    case 'fanfare':
      [523.25, 523.25, 523.25, 659.25, 587.33, 659.25, 783.99].forEach((f, i) => {
        const starts = [0, 0.14, 0.28, 0.42, 0.72, 0.88, 1.06];
        const durs = [0.12, 0.12, 0.12, 0.26, 0.14, 0.14, 0.62];
        tone(f, 'sawtooth', starts[i], durs[i], 0.24);
        tone(f * 0.5, 'triangle', starts[i], durs[i], 0.16);
      });
      break;
    case 'police':
      for (let i = 0; i < 6; i++){
        tone(620, 'square', i * 0.24, 0.12, 0.2, 1320);
        tone(1320, 'square', i * 0.24 + 0.12, 0.12, 0.2, 620);
      }
      break;
    case 'jackpot':
      [587.33, 739.99, 880, 1174.66, 987.77, 1174.66, 1479.98, 1760].forEach((f, i) => {
        tone(f, 'triangle', i * 0.09, 0.22, 0.22);
      });
      break;
  }
}

async function playVoiceBroadcast(audioDataUrl, voiceFilter = 'normal', label = 'Live Admin Voice PA', caption = '', fromAdmin = 'Lokizenith', audioId = null){
  let resolvedUrl = audioDataUrl;
  if (!resolvedUrl && audioId){
    try {
      const clipRes = await api('/api/admin/audio-clip/' + encodeURIComponent(audioId));
      if (clipRes?.clip?.audioDataUrl) resolvedUrl = clipRes.clip.audioDataUrl;
    } catch(_){}
  }
  if (!resolvedUrl) return;

  if (String(resolvedUrl).startsWith('tts:')){
    const spokenText = String(resolvedUrl).slice(4).trim() || caption || 'Attention all Lokizenith users!';
    showLiveAudioHud(
      `🎙 ${label} — @${fromAdmin} Speaking Live`,
      `"${spokenText}" (${voiceFilter.toUpperCase()})`,
      Math.min(60000, Math.max(4000, spokenText.length * 95))
    );
    try {
      if ('speechSynthesis' in window){
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(spokenText);
        if (voiceFilter === 'chipmunk'){ u.pitch = 1.85; u.rate = 1.25; }
        else if (voiceFilter === 'boss'){ u.pitch = 0.45; u.rate = 0.85; }
        else if (voiceFilter === 'robot'){ u.pitch = 0.8; u.rate = 0.95; }
        else if (voiceFilter === 'megaphone'){ u.pitch = 1.15; u.rate = 1.08; }
        window.speechSynthesis.speak(u);
      }
    } catch(_){}
    return;
  }

  // Stop any previously playing voice clip
  if (currentVoiceSource){
    try { currentVoiceSource.stop(); } catch(_){}
    currentVoiceSource = null;
  }
  if (currentVoiceHtmlAudio){
    try { currentVoiceHtmlAudio.pause(); } catch(_){}
    currentVoiceHtmlAudio = null;
  }

  showLiveAudioHud(
    `🎙 ${label} — @${fromAdmin} Speaking Live`,
    caption || `Voice Filter: ${voiceFilter.toUpperCase()} · Live Voice Broadcast`,
    10000
  );

  // 1. Primary Playback via WebAudio API (works reliably across all devices on live WebSocket messages!)
  try {
    const ctx = getAudioCtx();
    if (ctx){
      if (ctx.state === 'suspended'){
        try { await ctx.resume(); } catch(_){}
      }
      const arrBuf = dataUrlToArrayBuffer(resolvedUrl);
      const decodedBuffer = await ctx.decodeAudioData(arrBuf.slice(0));
      const rate = voiceFilter === 'chipmunk' ? 1.45
        : voiceFilter === 'boss' ? 0.76
        : voiceFilter === 'megaphone' ? 1.04
        : voiceFilter === 'robot' ? 0.94
        : 1.0;
      const durMs = Math.min(65000, Math.max(2500, Math.round((decodedBuffer.duration / rate) * 1000)));
      showLiveAudioHud(
        `🎙 ${label} — @${fromAdmin} Speaking Live`,
        caption || `Live Voice PA (${voiceFilter.toUpperCase()}) · ${Math.max(1, Math.round(decodedBuffer.duration))}s`,
        durMs + 600
      );

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.playbackRate.value = rate;

      const gainNode = ctx.createGain();
      gainNode.gain.value = voiceFilter === 'megaphone' ? 1.65 : 1.35;

      if (voiceFilter === 'megaphone'){
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        bp.Q.value = 0.9;
        source.connect(bp);
        bp.connect(gainNode);
      } else if (voiceFilter === 'robot'){
        const hp = ctx.createBiquadFilter();
        hp.type = 'peaking';
        hp.frequency.value = 650;
        hp.gain.value = 8;
        source.connect(hp);
        hp.connect(gainNode);
      } else {
        source.connect(gainNode);
      }
      gainNode.connect(ctx.destination);
      currentVoiceSource = source;
      source.start(0);
      return;
    }
  } catch(_){}

  // 2. Fallback to HTMLAudioElement if WebAudio decode failed
  try {
    const audio = new Audio(resolvedUrl);
    currentVoiceHtmlAudio = audio;
    if (voiceFilter === 'chipmunk'){
      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = 1.45;
    } else if (voiceFilter === 'boss'){
      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = 0.76;
    } else if (voiceFilter === 'megaphone'){
      audio.playbackRate = 1.04;
    } else if (voiceFilter === 'robot'){
      audio.playbackRate = 0.94;
    }
    audio.onloadedmetadata = () => {
      const durMs = Math.min(65000, Math.max(2500, Math.round((audio.duration || 5) * 1000)));
      showLiveAudioHud(`🎙 ${label} — @${fromAdmin} Speaking Live`, caption || `Live Voice PA (${voiceFilter})`, durMs);
    };
    await audio.play();
  } catch(_){}
}

/* ---------------- WebSocket Real-Time Client ---------------- */
function applyRoomSync(msg){
  if (msg.account) updateAccount(msg.account);
  if (msg.platformConfig) renderPlatformMotd(msg.platformConfig);
  if (msg.activeEvent !== undefined && window.LZEvents?.setEvent){
    window.LZEvents.setEvent(msg.activeEvent || null);
  }
  if (Array.isArray(msg.teamChats)) state.teamChats = msg.teamChats;
  if (Array.isArray(msg.lokiTeams)){
    state.lokiTeams = msg.lokiTeams;
    if (state.activeLokiTeamId){
      const t = getActiveLokiTeam();
      if (t && window.LokiCode?.onTeamUpdate) window.LokiCode.onTeamUpdate(t, t.updatedBy);
    }
  }
  if (Array.isArray(msg.notifications)){
    state.notifications = msg.notifications;
    updateNotifBadge();
  }
  if (Array.isArray(msg.onlineUsers)) state.onlineUsers = msg.onlineUsers;
  renderLokiTeamBar();
  if ($('#teamChatView')?.classList.contains('active')) renderTeamChatView();
}

function connectWS(){
  if (!state.token) return;
  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)){
    return;
  }
  clearTimeout(state.wsRetryTimer);
  clearInterval(state.wsPingTimer);
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws?token=${encodeURIComponent(state.token)}`);
  state.ws = ws;

  ws.onopen = () => {
    sendWS({ type: 'sync:request' });
    if (state.activeTeamChatId) sendWS({ type: 'room:join', chatId: state.activeTeamChatId });
    if (state.activeLokiTeamId) sendWS({ type: 'room:join', teamId: state.activeLokiTeamId });
    flushOutboxIfNeeded();
    clearInterval(state.wsPingTimer);
    state.wsPingTimer = setInterval(() => {
      sendWS({ type: 'ping' });
    }, 25000);
  };

  ws.onmessage = ev => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch(_){ return; }
    if (!msg || !msg.type) return;

    if (msg.type === 'auth:ok' || msg.type === 'sync:state'){
      applyRoomSync(msg);
    } else if (msg.type === 'chat:gen'){
      if (A() && typeof A().onGenEvent === 'function') A().onGenEvent(msg);
    } else if (msg.type === 'user:data_updated' && msg.data){
      if (msg.sourceTabId !== TAB_ID){
        if (A() && typeof A().applyServerUserData === 'function') A().applyServerUserData(msg.data);
        if (window.LokiCode && typeof window.LokiCode.applyServerCodeState === 'function') window.LokiCode.applyServerCodeState(msg.data);
      }
    } else if (msg.type === 'admin:banned'){
      showBannedModal(msg.banInfo || { banned: true, permanent: true, remainingText: 'Permanent (Forever)' });
    } else if (msg.type === 'admin:session_revoked'){
      toast(msg.message || 'Your session was signed out by Admin.', 'err');
      clearSessionUI();
    } else if (msg.type === 'admin:overview_update' && msg.overview && (state.user?.isAdmin || state.inspectBackup)){
      state.adminOverview = msg.overview;
      if (msg.overview.platformConfig) renderPlatformMotd(msg.overview.platformConfig);
      if (msg.overview.activeEvent !== undefined && window.LZEvents?.setEvent){
        window.LZEvents.setEvent(msg.overview.activeEvent || null);
      }
      refreshAdminLiveViews();
    } else if (msg.type === 'community:event_update'){
      if (window.LZEvents?.setEvent){
        window.LZEvents.setEvent(msg.event || null);
      }
      if (state.adminOverview && typeof state.adminOverview === 'object'){
        state.adminOverview.activeEvent = msg.event || null;
        if (adminActiveTab === 'platform' && !$('#adminDashboardModal')?.hidden){
          refreshAdminLiveViews();
        }
      }
    } else if (msg.type === 'platform:config' && msg.config){
      renderPlatformMotd(msg.config);
    } else if (msg.type === 'admin:broadcast'){
      // PURE GLOBAL MESSAGE — NEVER resets or modifies user tokens!
      const sfx = msg.soundEffect || msg.soundId;
      if (sfx && sfx !== 'none'){
        playSynthesizedSound(sfx, msg.title || 'Global Announcement', msg.from || msg.by || 'Lokizenith', false);
      }
      showAdminBroadcastModal(msg);
      fetchNotifications();
    } else if (msg.type === 'admin:audio_broadcast'){
      // Avoid double-playing on the exact browser tab that just played the broadcast locally
      if (msg.senderTabId && msg.senderTabId === TAB_ID){
        return;
      }
      const sender = msg.from || msg.by || 'Lokizenith';
      if ((msg.kind === 'sound' || msg.kind === 'sfx') && msg.soundId){
        playSynthesizedSound(msg.soundId, msg.caption || '', sender, true);
      } else if (msg.kind === 'voice' && (msg.audioDataUrl || msg.audioId)){
        playVoiceBroadcast(
          msg.audioDataUrl,
          msg.voiceFilter || 'normal',
          msg.label || msg.soundLabel || 'Live Admin Voice PA',
          msg.caption || '',
          sender,
          msg.audioId || null
        );
      }
    } else if (msg.type === 'presence:update'){
      state.onlineUsers = Array.isArray(msg.onlineUsers) ? msg.onlineUsers : [];
      renderLokiTeamBar();
      if ($('#teamChatView')?.classList.contains('active')) renderTeamChatHeaderAndMembers();
    } else if (msg.type === 'quota:update'){
      if (msg.account) updateAccount(msg.account);
      if (window.LokiPlans?.render) window.LokiPlans.render();
      if (window.LokiBenches?.render && $('#benchesView')?.classList.contains('active')) window.LokiBenches.render();
      if (msg.message && (Date.now() - (state.lastQuotaToastAt || 0) > 2000)) toast(`🎁 ${msg.message}`, 'ok');
    } else if (msg.type === 'referral:rewarded'){
      if (msg.notification){
        state.notifications.unshift(msg.notification);
        updateNotifBadge();
      } else {
        fetchNotifications();
      }
      toast(`🎉 ${msg.invitedUsername || 'A friend'} joined via your invite link! +${Number(msg.bonus || 25000).toLocaleString()} tokens earned!`, 'ok');
    } else if (msg.type === 'admin:usage_reset'){
      if (state.user){
        const base = state.user.tokenLimitBase || DAILY_LIMIT;
        state.user.bonusTokens = 0;
        state.user.tokenLimitEffective = base;
        state.user.tokensRemaining = base;
        state.user.lastResetAt = msg.at || Date.now();
        state.user.nextResetAt = state.user.lastResetAt + RESET_MS;
        renderUsageBar();
      }
      showAdminResetNotice(msg.message || 'Your usage has been reset by admin');
    } else if (msg.type === 'teamchat:room_sync' && msg.chat){
      upsertTeamChat(msg.chat);
      if ($('#teamChatView')?.classList.contains('active') && state.activeTeamChatId === msg.chat.id){
        renderTeamChatView();
      }
    } else if (msg.type === 'teamchat:invite' && msg.chat){
      upsertTeamChat(msg.chat);
      updateTeamChatBadge(true);
      toast(`💬 Added to Team Chat "${msg.chat.name}" by ${msg.fromUsername}`);
      fetchNotifications();
      if ($('#teamChatView')?.classList.contains('active')) renderTeamChatView();
    } else if (msg.type === 'teamchat:members_updated' && msg.chat){
      upsertTeamChat(msg.chat);
      if ($('#teamChatView')?.classList.contains('active')) renderTeamChatView();
    } else if (msg.type === 'teamchat:access_revoked'){
      state.teamChats = state.teamChats.filter(c => c.id !== msg.chatId);
      if (state.activeTeamChatId === msg.chatId){
        state.activeTeamChatId = state.teamChats[0]?.id || null;
      }
      toast(`Your access to Team Chat "${msg.chatName || 'room'}" was removed by ${msg.by || 'owner'}`, 'err');
      fetchNotifications();
      if ($('#teamChatView')?.classList.contains('active')) renderTeamChatView();
    } else if (msg.type === 'teamchat:message'){
      const room = state.teamChats.find(c => c.id === msg.chatId);
      if (room && msg.message){
        const dup = room.messages.some(m =>
          m.id === msg.message.id || (msg.message.clientMsgId && m.clientMsgId === msg.message.clientMsgId)
        );
        if (!dup){
          room.messages.push(msg.message);
          room.updatedAt = msg.updatedAt || Date.now();
          if (state.typingMap[room.id]) delete state.typingMap[room.id][msg.message.username];
          if (Array.isArray(msg.activity)) room.activity = msg.activity;
          if ($('#teamChatView')?.classList.contains('active') && state.activeTeamChatId === room.id){
            appendTeamChatMessage(msg.message);
            renderTypingIndicator();
            renderActivityFeed();
          } else {
            updateTeamChatBadge(true);
            if (msg.message.username !== state.user?.username){
              toast(`💬 ${msg.message.username} in ${room.name}`);
            }
          }
          renderTeamChatRoomList();
        }
      }
    } else if (msg.type === 'teamchat:error'){
      if (msg.code === 'LIMIT_REACHED'){
        const slot = $('#tcLimitSlot');
        if (slot){
          slot.innerHTML = '';
          slot.appendChild(createLimitBlock(msg.error));
        }
      } else if (msg.error){
        toast(msg.error, 'err');
      }
    } else if (msg.type === 'session:revoked'){
      toast('Signed out on this device.', 'err');
      logout();
    } else if (msg.type === 'teamchat:message_updated' && msg.message){
      const room = state.teamChats.find(c => c.id === msg.chatId);
      if (room){
        const idx = room.messages.findIndex(m => m.id === msg.message.id);
        if (idx >= 0) room.messages[idx] = msg.message;
        if (Array.isArray(msg.activity)) room.activity = msg.activity;
        if ($('#teamChatView')?.classList.contains('active') && state.activeTeamChatId === room.id){
          rerenderTeamFeed();
          renderActivityFeed();
          renderThreadPanel();
        }
      }
    } else if (msg.type === 'teamchat:activity' && msg.chatId){
      const room = state.teamChats.find(c => c.id === msg.chatId);
      if (room && Array.isArray(msg.activity)){
        room.activity = msg.activity;
        if ($('#teamChatView')?.classList.contains('active') && state.activeTeamChatId === room.id) renderActivityFeed();
      }
    } else if (msg.type === 'teamcall:signal'){
      handleTeamCallSignal(msg);
    } else if (msg.type === 'teamchat:typing'){
      if (!state.typingMap[msg.chatId]) state.typingMap[msg.chatId] = {};
      if (msg.typing) state.typingMap[msg.chatId][msg.username] = Date.now();
      else delete state.typingMap[msg.chatId][msg.username];
      if ($('#teamChatView')?.classList.contains('active') && state.activeTeamChatId === msg.chatId){
        renderTypingIndicator();
      }
    } else if (msg.type === 'lokiteam:invite' && msg.team){
      upsertLokiTeam(msg.team);
      renderLokiTeamBar();
      toast(`⚡ Added to LokiCode Team "${msg.team.name}" by ${msg.fromUsername}`);
      fetchNotifications();
    } else if (msg.type === 'lokiteam:members_updated' && msg.team){
      upsertLokiTeam(msg.team);
      renderLokiTeamBar();
    } else if (msg.type === 'lokiteam:access_revoked'){
      state.lokiTeams = state.lokiTeams.filter(t => t.id !== msg.teamId);
      if (state.activeLokiTeamId === msg.teamId) state.activeLokiTeamId = null;
      renderLokiTeamBar();
      toast(`Removed from LokiCode Team "${msg.teamName || ''}"`, 'err');
      fetchNotifications();
    } else if (msg.type === 'lokiteam:cursor' && msg.teamId){
      if (!state.lokiCursors[msg.teamId]) state.lokiCursors[msg.teamId] = {};
      if (msg.active) state.lokiCursors[msg.teamId][msg.username] = Date.now();
      else delete state.lokiCursors[msg.teamId][msg.username];
      if (state.activeLokiTeamId === msg.teamId) renderLokiTeamBar();
    } else if (msg.type === 'lokiteam:code_update' && msg.team){
      upsertLokiTeam(msg.team);
      if (state.activeLokiTeamId === msg.team.id){
        if (state.lokiCursors[msg.team.id]) delete state.lokiCursors[msg.team.id][msg.fromUsername];
        renderLokiTeamBar();
        if (msg.fromUsername !== state.user?.username && window.LokiCode?.onTeamUpdate){
          window.LokiCode.onTeamUpdate(msg.team, msg.fromUsername);
        }
      }
    } else if (msg.type === 'snippet:shared' && msg.snippet){
      if (!state.sharedSnippets.some(s => s.id === msg.snippet.id)){
        state.sharedSnippets.unshift(msg.snippet);
      }
      if ($('#sharedHubView')?.classList.contains('active')) renderSharedHubView();
      if (msg.snippet.authorUsername !== state.user?.username){
        toast(`🌐 ${msg.snippet.authorUsername} shared "${msg.snippet.title}"`);
        fetchNotifications();
      }
    } else if (msg.type === 'chat:shared'){
      toast(`📤 ${msg.fromUsername} shared a chat with you!`);
      fetchNotifications();
    } else if ((msg.type === 'user:profile_updated' || msg.type === 'profile:updated') && msg.profile){
      handleLiveProfileUpdated(msg.profile);
    } else if (msg.type === 'teamchat:mention'){
      playMentionNotificationSound();
      toast(`🔔 @${msg.fromDisplayName || msg.fromUsername} mentioned you in "${msg.chatName || 'Team Chat'}": "${String(msg.preview || '').slice(0, 65)}"`, 'ok');
      updateTeamChatBadge(true);
    } else if (msg.type === 'teamcall:incoming' && msg.call){
      handleIncomingTeamCall(msg.call);
    } else if (msg.type === 'teamcall:state' && msg.call){
      handleTeamCallStateUpdate(msg.call);
    } else if (msg.type === 'teamcall:ended'){
      handleTeamCallEnded(msg.chatId);
    } else if (msg.type === 'teamcall:volume'){
      handleTeamCallVolume(msg);
    } else if (msg.type === 'teamcall:audio'){
      handleTeamCallAudioChunk(msg);
    } else if (msg.type === 'teamcall:screenshare-start' || msg.type === 'teamcall:screenshare-frame' || msg.type === 'teamcall:screenshare-stop'){
      handleTeamCallScreenShareEvent(msg);
    }
  };

  ws.onclose = () => {
    state.ws = null;
    clearInterval(state.wsPingTimer);
    if (state.token){
      clearTimeout(state.wsRetryTimer);
      state.wsRetryTimer = setTimeout(connectWS, 1800);
    }
  };
}

function sendWS(payload){
  if (state.ws && state.ws.readyState === WebSocket.OPEN){
    try { state.ws.send(JSON.stringify(payload)); return true; } catch(_){}
  }
  return false;
}

/* ---------------- Banned User Blocking Pop-Up ---------------- */
function fmtBanCountdownClient(banInfo){
  if (!banInfo) return 'Banned';
  if (banInfo.permanent) return 'Permanent (Forever)';
  const until = Number(banInfo.bannedUntil || 0);
  const diffSec = Math.max(0, Math.floor((until - Date.now()) / 1000));
  if (diffSec <= 0) return 'Ban expired — click Log Out and sign back in';
  const y = Math.floor(diffSec / (365 * 86400));
  const mo = Math.floor((diffSec % (365 * 86400)) / (30 * 86400));
  const d = Math.floor((diffSec % (30 * 86400)) / 86400);
  const h = Math.floor((diffSec % 86400) / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  const parts = [];
  if (y) parts.push(`${y}y`);
  if (mo) parts.push(`${mo}mo`);
  if (d) parts.push(`${d}d`);
  parts.push(`${h}h`, `${m}m`, `${s}s`);
  const untilStr = new Date(until).toLocaleString();
  return `${parts.join(' ')} (Unbans: ${untilStr})`;
}

function showBannedModal(banInfo){
  state.activeBanInfo = banInfo || { banned: true, permanent: true };
  hideAuthOverlay();
  const modal = $('#bannedUserModal');
  if (!modal) return;
  const reasonEl = $('#banModalReason');
  const cdEl = $('#banModalCountdown');
  if (reasonEl){
    if (banInfo?.reason){
      reasonEl.hidden = false;
      reasonEl.textContent = `Reason: ${banInfo.reason}`;
    } else {
      reasonEl.hidden = true;
    }
  }
  const tickCd = () => {
    if (cdEl) cdEl.textContent = fmtBanCountdownClient(state.activeBanInfo);
  };
  tickCd();
  clearInterval(state.banTimer);
  state.banTimer = setInterval(tickCd, 1000);
  modal.hidden = false;
  modal.classList.remove('closing');
}

/* ---------------- Live Account Inspection ("Inspect an Account") ---------------- */
function renderInspectBanner(){
  const bar = $('#adminInspectBar');
  if (!bar) return;
  if (!state.inspectBackup){
    bar.hidden = true;
    document.body.classList.remove('is-inspecting-account');
    return;
  }
  bar.hidden = false;
  document.body.classList.add('is-inspecting-account');
  const nameEl = $('#adminInspectTargetName');
  const metaEl = $('#adminInspectMeta');
  if (nameEl) nameEl.textContent = `@${state.user?.username || state.inspectBackup.targetUsername || 'User'}`;
  if (metaEl){
    const convCount = Array.isArray(A()?.state?.convs) ? A().state.convs.length : 0;
    const tokStr = usage.isUnlimited() ? '∞ Unlimited' : `${usage.remaining().toLocaleString()} / ${usage.limit().toLocaleString()} tokens`;
    metaEl.textContent = `(${convCount} chats · ${tokStr})`;
  }
}

async function inspectAccountLive(username){
  const target = String(username || '').trim();
  if (!target) return;
  if (!state.user?.isAdmin && !state.inspectBackup){
    toast('Only Lokizenith can inspect accounts.', 'err');
    return;
  }
  try {
    // Save current account changes before switching
    scheduleSync();
    // Preserve original Lokizenith admin session if not already inspecting
    if (!state.inspectBackup){
      const backup = {
        adminToken: state.token,
        adminUsername: state.user?.username || 'Lokizenith',
        targetUsername: target,
        startedAt: Date.now()
      };
      state.inspectBackup = backup;
      try { sessionStorage.setItem(INSPECT_BACKUP_KEY, JSON.stringify(backup)); } catch(_){}
    } else {
      state.inspectBackup.targetUsername = target;
      try { sessionStorage.setItem(INSPECT_BACKUP_KEY, JSON.stringify(state.inspectBackup)); } catch(_){}
    }

    // Call /api/admin/inspect-user using the admin token
    const headers = { 'Content-Type': 'application/json', 'x-lz-token': state.inspectBackup.adminToken };
    const r = await fetch('/api/admin/inspect-user', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: target })
    });
    const res = await r.json();
    if (!r.ok || !res.ok){
      throw new Error(res.message || 'Could not inspect account');
    }

    // Close Admin Modal so admin is directly inside the inspected user's workspace
    const admModal = $('#adminDashboardModal');
    if (admModal){
      if (A()?.closeModal) A().closeModal('adminDashboardModal');
      else admModal.hidden = true;
    }

    // Close existing WS so connectWS reconnects as inspected user
    if (state.ws){
      try { state.ws.close(); } catch(_){}
      state.ws = null;
    }

    applyPayloadAfterAuth(res);
    renderInspectBanner();
    toast(`🕵️ Inspecting @${res.user?.username}'s live account! Click "← Back to Lokizenith" at the top anytime.`, 'ok');
  } catch(err){
    if (state.inspectBackup && state.token === state.inspectBackup.adminToken){
      state.inspectBackup = null;
      try { sessionStorage.removeItem(INSPECT_BACKUP_KEY); } catch(_){}
      renderInspectBanner();
    }
    toast(err.message || 'Failed to inspect account', 'err');
  }
}

async function exitInspectAccount(){
  const backup = state.inspectBackup;
  if (!backup || !backup.adminToken){
    state.inspectBackup = null;
    try { sessionStorage.removeItem(INSPECT_BACKUP_KEY); } catch(_){}
    renderInspectBanner();
    return;
  }
  try {
    // Sync any edits made while inside the inspected user's account
    try {
      const payload = {};
      if (A()){
        payload.convs = (A().state?.convs || []).slice(0, 80);
        payload.settings = A().settings ? A().settings() : undefined;
      }
      await api('/api/user/sync', { method: 'POST', body: JSON.stringify(payload) });
    } catch(_){}

    // Log out the temporary inspect token
    try { await api('/api/auth/logout', { method: 'POST' }); } catch(_){}

    // Restore Lokizenith's original admin token
    state.token = backup.adminToken;
    localStorage.setItem(TOKEN_KEY, backup.adminToken);
    state.inspectBackup = null;
    try { sessionStorage.removeItem(INSPECT_BACKUP_KEY); } catch(_){}

    if (state.ws){
      try { state.ws.close(); } catch(_){}
      state.ws = null;
    }

    const res = await api('/api/auth/me');
    applyPayloadAfterAuth(res);
    renderInspectBanner();
    toast('👑 Returned to Lokizenith Admin Account', 'ok');

    // Automatically re-open the Admin Command Suite right where we left off!
    await openAdminDashboardModal();
  } catch(err){
    toast(err.message || 'Could not restore admin session', 'err');
  }
}

/* ---------------- Admin Helpers & Reset Usages / 8-Module Command Suite (Lokizenith ONLY) ---------------- */
function fmtDurationLong(totalSec){
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtRelativeSeen(ts, online){
  if (online) return 'Online now';
  if (!ts) return 'Never';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  try { return new Date(ts).toLocaleString(); } catch(_){ return 'Earlier'; }
}

async function fetchAdminOverview(){
  if (!state.user?.isAdmin) return null;
  try {
    const res = await api('/api/admin/overview');
    if (res && res.ok){
      state.adminOverview = res;
      if (res.platformConfig) renderPlatformMotd(res.platformConfig);
      return res;
    }
  } catch(_){}
  return state.adminOverview;
}

let activeResetTab = 'all';
let selectedResetUsers = [];
let resetSearchFilter = '';

let adminActiveTab = 'directory'; // directory | access | xray | soundboard | broadcast | leaderboards | codes | security | platform
let adminDirSearch = '';
let adminDirFilter = 'all';
let adminDirSort = 'recent';
let adminBanTarget = null;
let adminTokenTarget = null;
let adminPasswordTarget = null;
let adminPlanTarget = null;
let adminPlanDurationMode = 'permanent';
let adminPlanDurationAmount = 7;
let adminPlanDurationUnit = 'days';
let adminRevealPasswords = false;
let adminRevealedIds = new Set();
let adminXrayUser = '';
let adminXrayData = null;
let adminXrayLoading = false;
let adminXrayConvIdx = 0;
let adminAuditFilter = 'all';

// AI Community Event Architect Draft state
let adminEventDraft = null;
let adminEventPromptText = '';
let adminEventAiBusy = false;
let adminEventApplyBusy = false;

// Data Vault & Power Tools state
let adminAnalystQuestion = '';
let adminAnalystReport = '';
let adminAnalystBusy = false;
let adminBulkBusy = false;
let adminCloudSyncBusy = false;
let adminMaintAiPrompt = '';
let adminMaintAiBusy = false;

// Admin Access & Permissions Control state
let adminAccessTarget = '';
let adminAccessLevelDraft = 'partial';
let adminAccessPermsDraft = ['directory', 'leaderboards'];
let adminReportsFilter = 'all';
let adminReportsSearch = '';
let adminKnowledgeSearch = '';

const ADMIN_MODULES_META = [
  { id: 'directory', icon: '👥', name: 'Accounts Directory', desc: 'View accounts, reset usage, gift tokens, and manage users' },
  { id: 'access', icon: '🔐', name: 'Access & Roles', desc: 'Grant or revoke Partial / Full Admin Panel access' },
  { id: 'xray', icon: '🔭', name: 'Account X-Ray & Inspect', desc: 'Live-inspect accounts and read AI chat transcripts' },
  { id: 'reports', icon: '🚩', name: 'AI Reports History', desc: 'Review user-submitted reports on AI messages, resolve or remove them' },
  { id: 'knowledge', icon: '🧠', name: 'AI Learned Knowledge', desc: 'Inspect, curate, and teach facts in the AI self-learning knowledge base' },
  { id: 'soundboard', icon: '🎙', name: 'Live Voice PA & Soundboard', desc: 'Record 60s voice PA and play sound effects to all users' },
  { id: 'broadcast', icon: '📢', name: 'Broadcast & Scheduler', desc: 'Send or schedule global system announcements' },
  { id: 'leaderboards', icon: '🏆', name: 'Analytics & Leaderboards', desc: 'View top token users, lifetime stats, and referrals' },
  { id: 'codes', icon: '🎟', name: 'Promo & Gift Code Studio', desc: 'Create and manage custom promo and gift codes' },
  { id: 'security', icon: '🛡', name: 'Security & Audit Radar', desc: 'Monitor security audit logs and force-logout sessions' },
  { id: 'platform', icon: '🎛', name: 'Platform, Rooms & Events', desc: 'AI Community Events with tier rewards, pinned MOTD banner, and Token Rain' },
  { id: 'vault', icon: '🗄', name: 'Data Vault & Power Tools', desc: 'Eternal persistence snapshots, Firebase Cloud Vault, Bulk Operations, AI Analyst & Direct Notices' },
];

// Voice PA Recording state inside Admin Soundboard tab
let voiceMediaRecorder = null;
let voiceChunks = [];
let voiceRecordedDataUrl = '';
let voiceRecordingActive = false;
let voiceRecordSec = 0;
let voiceRecordTimer = 0;
let voiceFilterSelected = 'normal';

function patchAdminModalInPlace(){
  const body = $('#adminDashboardBody');
  const ov = state.adminOverview;
  if (!body || !ov || !$('.adm-suite-kpis', body)) return false;
  const st = ov.stats || {};
  const allUsers = ov.users || [];
  const adminUsersCount = allUsers.filter(u => u.isAdmin).length;

  const setKpi = (key, val) => {
    const el = $(`[data-adm-kpi="${key}"]`, body);
    const next = String(val ?? '');
    if (el && el.textContent !== next) el.textContent = next;
  };
  setKpi('totalUsers', st.totalUsers ?? 0);
  setKpi('onlineUsers', st.onlineUsers ?? 0);
  setKpi('adminsCount', adminUsersCount);
  setKpi('googleVip', `${st.googleUsers ?? 0} / ${st.unlimitedUsers ?? 0}`);
  setKpi('tokensConsumed', Number(st.totalTokensConsumed || 0).toLocaleString());
  setKpi('bannedUsers', st.bannedUsers ?? 0);

  const badgeMap = {
    directory: allUsers.length,
    access: `${adminUsersCount} Staff`,
    reports: ov.openReportsCount ?? (ov.reports || []).filter(r => r.status !== 'resolved').length,
    knowledge: ov.knowledgeStats?.totalFacts ?? (ov.knowledgeEntries || []).length,
    broadcast: (ov.scheduledBroadcasts || []).length || '',
    codes: (ov.promoCodes?.customCodes || []).length + 5,
    security: (ov.auditLogs || []).length,
    platform: (st.teamChatsCount || 0) + (st.lokiTeamsCount || 0),
    vault: (ov.vaultStatus?.snapshots || []).length || 'v3',
  };
  Object.entries(badgeMap).forEach(([id, val]) => {
    const bEl = $(`[data-adm-badge="${id}"]`, body);
    const next = String(val ?? '');
    if (bEl && bEl.textContent !== next) bEl.textContent = next;
  });

  // Update online presence dots & pills smoothly without touching layout
  for (const u of allUsers){
    const key = (u.usernameLower || u.username || '').toLowerCase();
    const card = $(`.adm-acc-card[data-adm-card="${CSS.escape(key)}"]`, body);
    if (!card) continue;
    card.classList.toggle('is-online', !!u.online);
    const dot = $('.adm-presence-dot', card);
    if (dot){
      dot.classList.toggle('on', !!u.online);
      dot.classList.toggle('off', !u.online);
    }
    const pill = $('.adm-acc-seen-row span:first-child', card);
    if (pill){
      const nextCls = u.online ? 'adm-pill-online' : 'adm-pill-offline';
      if (pill.className !== nextCls) pill.className = nextCls;
      const nextTxt = u.online ? '● Online Live' : `○ ${fmtRelativeSeen(u.lastSeenAt, false)}`;
      if (pill.textContent !== nextTxt) pill.textContent = nextTxt;
    }
  }
  return true;
}

function refreshAdminLiveViews(){
  if (!$('#adminConfirmModal')?.hidden && !$('#adminResetUsagesBody .adm-tabs')){
    renderResetUsagesModal();
  }
  if (!$('#adminDashboardModal')?.hidden){
    // Patch live counters & presence in-place so the Admin Panel never blinks or loses scroll/focus
    if (patchAdminModalInPlace()) return;
    renderAdminDashboardModal();
  }
}

function renderResetUsagesModal(){
  const body = $('#adminResetUsagesBody');
  if (!body || !state.user?.isAdmin) return;
  const users = (state.adminOverview?.users || []).filter(u => {
    if (!resetSearchFilter.trim()) return true;
    return u.username.toLowerCase().includes(resetSearchFilter.trim().toLowerCase());
  });

  body.innerHTML = `
    <div class="adm-tabs" role="tablist">
      <button type="button" class="adm-tab ${activeResetTab === 'all' ? 'on' : ''}" data-rtab="all">⚡ Reset for All</button>
      <button type="button" class="adm-tab ${activeResetTab === 'users' ? 'on' : ''}" data-rtab="users">👥 Reset for Users (${selectedResetUsers.length})</button>
    </div>
    ${activeResetTab === 'all' ? `
      <div class="adm-reset-all-panel">
        <p style="line-height:1.6;margin:0 0 16px;">Are you sure you want to reset usage limits for <b>all accounts</b>? Everyone's remaining usage will return immediately to 25,000 tokens (removing temporary bonus ceilings) and online users will receive an instant notification popup.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" class="btn-ghost" id="admResetCancelBtn">Cancel</button>
          <button type="button" class="btn-primary" id="admResetAgreeBtn">⚡ Agree &amp; Reset All</button>
        </div>
      </div>
    ` : `
      <div class="adm-reset-users-panel">
        <div class="adm-user-add-row">
          <input type="text" id="admResetUserInput" placeholder="Type existing username or click a user in the table below…" value="${esc(resetSearchFilter)}" autocomplete="off">
          <button type="button" class="btn-primary" id="admAddUserResetBtn">+ Add</button>
        </div>
        <div class="adm-selected-queue">
          <div class="adm-q-head">
            <span>Selected Users List (<b>${selectedResetUsers.length}</b>)</span>
            ${selectedResetUsers.length ? `<button type="button" class="btn-ghost" id="admClearResetQueueBtn" style="padding:3px 9px;font-size:.75rem;">Clear list</button>` : ''}
          </div>
          <div class="adm-q-chips">
            ${selectedResetUsers.length
              ? selectedResetUsers.map(u => `<span class="adm-q-chip">${esc(u)} <button type="button" data-qrm="${esc(u)}" title="Remove">✕</button></span>`).join('')
              : `<span class="muted" style="font-size:.82rem;">No users added yet — click any user row below to auto-complete and add them.</span>`}
          </div>
        </div>
        <div class="adm-live-table-wrap">
          <div class="adm-lt-hdr"><span>Live Existing Users Directory (click row to auto-complete &amp; add)</span><span>${users.length} users</span></div>
          <table class="adm-table">
            <thead><tr><th>Username</th><th>Status</th><th>Current Usage</th><th>Action</th></tr></thead>
            <tbody>
              ${users.map(u => {
                const isAdded = selectedResetUsers.some(x => x.toLowerCase() === u.username.toLowerCase());
                const usageTxt = u.isUnlimited ? '∞ / Unlimited' : `${Number(u.tokensRemaining || 0).toLocaleString()} / ${Number(u.tokenLimitEffective || DAILY_LIMIT).toLocaleString()}`;
                return `<tr class="adm-row-pick ${isAdded ? 'picked' : ''}" data-pick="${esc(u.username)}">
                  <td><b>${esc(u.username)}</b>${u.isAdmin ? ' <span class="lz-admin-tag">ADMIN</span>' : ''}</td>
                  <td><span class="${u.online ? 'adm-pill-online' : 'adm-pill-offline'}">${u.online ? '● Online' : '○ Offline'}</span></td>
                  <td><code>${usageTxt}</code></td>
                  <td><button type="button" class="btn-ghost adm-pick-btn">${isAdded ? '✓ Added' : '+ Select'}</button></td>
                </tr>`;
              }).join('') || `<tr><td colspan="4" class="muted" style="text-align:center;">No matching users found.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;">
          <button type="button" class="btn-ghost" id="admResetCancelBtn">Close</button>
          <button type="button" class="btn-primary" id="admSubmitUsersResetBtn" ${selectedResetUsers.length ? '' : 'disabled'}>⚡ Reset ${selectedResetUsers.length || ''} Selected Users</button>
        </div>
      </div>
    `}
  `;

  $$('.adm-tab', body).forEach(b => {
    b.onclick = () => { activeResetTab = b.dataset.rtab; renderResetUsagesModal(); };
  });
  $('#admResetCancelBtn', body)?.addEventListener('click', () => {
    A()?.closeModal ? A().closeModal('adminConfirmModal') : ($('#adminConfirmModal').hidden = true);
  });
  $('#admResetAgreeBtn', body)?.addEventListener('click', triggerAdminResetAll);

  const inp = $('#admResetUserInput', body);
  if (inp){
    inp.oninput = () => {
      resetSearchFilter = inp.value;
      const pos = inp.selectionStart;
      renderResetUsagesModal();
      const nInp = $('#admResetUserInput', body);
      if (nInp){ nInp.focus(); try { nInp.setSelectionRange(pos, pos); } catch(_){} }
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter'){
        e.preventDefault();
        $('#admAddUserResetBtn', body)?.click();
      }
    };
  }

  const addUsername = rawName => {
    const clean = String(rawName || '').trim();
    if (!clean) return;
    const match = (state.adminOverview?.users || []).find(u => u.username.toLowerCase() === clean.toLowerCase())
      || (state.adminOverview?.users || []).find(u => u.username.toLowerCase().startsWith(clean.toLowerCase()));
    if (!match){
      toast(`User "${clean}" does not exist.`, 'err');
      return;
    }
    if (!selectedResetUsers.some(x => x.toLowerCase() === match.username.toLowerCase())){
      selectedResetUsers.push(match.username);
    }
    resetSearchFilter = '';
    renderResetUsagesModal();
  };

  $('#admAddUserResetBtn', body)?.addEventListener('click', () => addUsername(inp?.value || resetSearchFilter));
  $$('tr[data-pick]', body).forEach(tr => {
    tr.onclick = () => {
      const uname = tr.dataset.pick;
      if (!selectedResetUsers.some(x => x.toLowerCase() === uname.toLowerCase())){
        selectedResetUsers.push(uname);
      } else {
        selectedResetUsers = selectedResetUsers.filter(x => x.toLowerCase() !== uname.toLowerCase());
      }
      resetSearchFilter = '';
      renderResetUsagesModal();
    };
  });
  $$('button[data-qrm]', body).forEach(b => {
    b.onclick = () => {
      selectedResetUsers = selectedResetUsers.filter(x => x !== b.dataset.qrm);
      renderResetUsagesModal();
    };
  });
  $('#admClearResetQueueBtn', body)?.addEventListener('click', () => {
    selectedResetUsers = [];
    renderResetUsagesModal();
  });
  $('#admSubmitUsersResetBtn', body)?.addEventListener('click', async () => {
    if (!selectedResetUsers.length) return;
    const btn = $('#admSubmitUsersResetBtn', body);
    if (btn) btn.disabled = true;
    try {
      const res = await api('/api/admin/reset-users', {
        method: 'POST',
        body: JSON.stringify({ usernames: selectedResetUsers })
      });
      if (res.account) updateAccount(res.account);
      toast(`⚡ Reset usage for ${res.resetCount} user(s): ${(res.usernames || []).join(', ')}`, 'ok');
      selectedResetUsers = [];
      await fetchAdminOverview();
      renderResetUsagesModal();
    } catch(err){
      toast(err.message, 'err');
      if (btn) btn.disabled = false;
    }
  });
}

async function openResetUsagesModal(){
  if (!state.user?.isAdmin) return;
  await fetchAdminOverview();
  renderResetUsagesModal();
  if (A()?.openModal) A().openModal('adminConfirmModal');
  else $('#adminConfirmModal').hidden = false;
}

function fmtDeviceLine(d){
  if (!d) return 'No device logged yet';
  const icon = d.deviceType === 'Mobile' ? '📱' : d.deviceType === 'Tablet' ? '📲' : '💻';
  return `${icon} ${d.os || 'OS'} · ${d.browser || 'Browser'}${d.screen ? ` (${d.screen})` : ''}`;
}

async function loadAdminUserXray(username){
  const clean = String(username || '').trim();
  if (!clean) return;
  adminXrayUser = clean;
  adminXrayLoading = true;
  adminXrayConvIdx = 0;
  renderAdminDashboardModal();
  try {
    const res = await api('/api/admin/user-details/' + encodeURIComponent(clean));
    if (res && res.ok){
      adminXrayData = res;
    }
  } catch(err){
    toast(err.message || 'Could not load user X-Ray', 'err');
  } finally {
    adminXrayLoading = false;
    renderAdminDashboardModal();
  }
}

/* ---------------- 9-Module Lokizenith Admin Command & Intelligence Suite ---------------- */
function selectAdminAccessUser(username, allUsers){
  const u = (allUsers || state.adminOverview?.users || []).find(x => x.username.toLowerCase() === String(username || '').toLowerCase());
  adminAccessTarget = u ? u.username : String(username || '');
  if (u){
    adminAccessLevelDraft = u.adminAccessLevel || (u.isAdmin ? 'full' : 'none');
    adminAccessPermsDraft = Array.isArray(u.adminPermissions) && u.adminPermissions.length
      ? [...u.adminPermissions]
      : ['directory', 'leaderboards'];
  }
}

function renderAdminDashboardModal(){
  const body = $('#adminDashboardBody');
  if (!body || !state.user?.isAdmin) return;
  const ov = state.adminOverview || { stats: {}, users: [], promoCodes: {}, auditLogs: [], broadcastHistory: [], scheduledBroadcasts: [], platformConfig: {}, teamChats: [], lokiTeams: [], sharedSnippets: [] };
  const st = ov.stats || {};
  const allUsers = ov.users || [];

  const viewerAccess = ov.viewerAccess || {
    isAdmin: !!state.user?.isAdmin,
    isRootAdmin: !!state.user?.isRootAdmin,
    accessLevel: state.user?.adminAccessLevel || (state.user?.isRootAdmin ? 'full' : 'full'),
    permissions: state.user?.adminPermissions || ADMIN_MODULES_META.map(m => m.id)
  };
  const allowedPerms = new Set(
    viewerAccess.isRootAdmin || viewerAccess.accessLevel === 'full'
      ? ADMIN_MODULES_META.map(m => m.id)
      : (Array.isArray(viewerAccess.permissions) && viewerAccess.permissions.length ? viewerAccess.permissions : ['directory', 'leaderboards'])
  );

  const q = adminDirSearch.trim().toLowerCase();
  const filteredUsers = allUsers.filter(u => {
    if (q){
      const hay = [
        u.username,
        u.googleEmail,
        u.inviteCode,
        u.invitedBy,
        u.adminAccessLevel,
        u.deviceInfo?.os,
        u.deviceInfo?.browser,
        u.deviceInfo?.deviceType,
        u.deviceInfo?.ip,
        u.deviceInfo?.timezone
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (adminDirFilter === 'online' && !u.online) return false;
    if (adminDirFilter === 'admins' && !u.isAdmin) return false;
    if (adminDirFilter === 'google' && u.authProvider !== 'google' && !u.googleEmail) return false;
    if (adminDirFilter === 'unlimited' && !['pro', 'ultimate'].includes(String(u.plan || u.effectivePlan || u.planTier || 'free').toLowerCase()) && !u.isUnlimited) return false;
    if (adminDirFilter === 'banned' && !u.banInfo?.banned) return false;
    return true;
  }).sort((a, b) => {
    if (adminDirSort === 'tokens_used') return (b.totalTokensUsed || 0) - (a.totalTokensUsed || 0);
    if (adminDirSort === 'balance') return (b.tokensRemaining || 0) - (a.tokensRemaining || 0);
    if (adminDirSort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
    if (adminDirSort === 'az') return String(a.username || '').localeCompare(String(b.username || ''));
    // Default 'recent': Online first, then Root Admin, then most recently seen
    if (Boolean(b.online) !== Boolean(a.online)) return b.online ? 1 : -1;
    if (Boolean(b.isRootAdmin) !== Boolean(a.isRootAdmin)) return b.isRootAdmin ? 1 : -1;
    return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
  });

  const adminUsersCount = allUsers.filter(u => u.isAdmin).length;

  const pCfgNav = ov.platformConfig || state.platformConfig || {};
  const allNavItems = [
    { id: 'directory', icon: '👥', label: 'Accounts Directory', badge: allUsers.length },
    { id: 'access', icon: '🔐', label: 'Access & Roles', badge: `${adminUsersCount} Staff` },
    { id: 'xray', icon: '🔭', label: 'Account X-Ray & Chats', badge: adminXrayUser ? `@${adminXrayUser}` : 'Live' },
    { id: 'reports', icon: '🚩', label: 'AI Reports History', badge: ov.openReportsCount ?? (ov.reports || []).filter(r => r.status !== 'resolved').length },
    { id: 'knowledge', icon: '🧠', label: 'AI Learned Knowledge', badge: ov.knowledgeStats?.totalFacts ?? (ov.knowledgeEntries || []).length },
    { id: 'soundboard', icon: '🎙', label: 'Live Voice PA & Soundboard', badge: '12 FX' },
    { id: 'broadcast', icon: '📢', label: 'Broadcast & Scheduler', badge: (ov.scheduledBroadcasts || []).length || null },
    { id: 'leaderboards', icon: '🏆', label: 'Analytics & Leaderboards', badge: 'Top' },
    { id: 'codes', icon: '🎟', label: 'Promo & Gift Code Studio', badge: (ov.promoCodes?.customCodes || []).length + 5 },
    { id: 'security', icon: '🛡', label: 'Security & Audit Radar', badge: (ov.auditLogs || []).length },
    { id: 'platform', icon: '🎛', label: 'Platform, Rooms & Events', badge: (st.teamChatsCount || 0) + (st.lokiTeamsCount || 0) },
    { id: 'maintenance', icon: '🚧', label: 'Maintenance Studio', badge: pCfgNav.maintenanceMode ? '🟢 LIVE' : 'Off' },
    { id: 'vault', icon: '🗄', label: 'Data Vault & Power Tools', badge: (ov.vaultStatus?.snapshots || []).length || 'v3' }
  ];

  const navItems = allNavItems.filter(item => allowedPerms.has(item.id));
  if (navItems.length && !allowedPerms.has(adminActiveTab)){
    adminActiveTab = navItems[0].id;
  }

  const renderRoleBadge = (u) => {
    if (u.isRootAdmin) return `<span class="adm-role-badge root" title="Protected Root Owner (benczelelad@gmail.com)">👑 ROOT OWNER</span>`;
    if (u.adminAccessLevel === 'full') return `<span class="adm-role-badge full">🛡️ FULL ADMIN</span>`;
    if (u.adminAccessLevel === 'partial') return `<span class="adm-role-badge partial" title="Modules: ${(u.adminPermissions || []).join(', ')}">⚡ PARTIAL ADMIN (${(u.adminPermissions || []).length})</span>`;
    return `<span class="adm-role-badge user">👤 USER</span>`;
  };

  // Tab 1: Scrollable, Organized Accounts Directory
  const renderDirectoryTab = () => {
    const planTargetUser = adminPlanTarget ? allUsers.find(u => u.username.toLowerCase() === String(adminPlanTarget).toLowerCase()) : null;
    const planTargetEff = String(planTargetUser?.plan || planTargetUser?.effectivePlan || planTargetUser?.planTier || 'free').toLowerCase();
    return `
    ${adminBanTarget ? `
      <form class="adm-action-drawer ban" id="admBanForm">
        <div class="adm-drawer-head">
          <b>⛔ Configure Real-Time Ban for <u>@${esc(adminBanTarget)}</u></b>
          <button type="button" class="btn-ghost" id="admBanCancelForm">Cancel</button>
        </div>
        <div class="adm-ban-controls">
          <label class="lc-check"><input type="checkbox" id="admBanForever"> <span>Permanent / Forever (לנצח)</span></label>
          <div class="adm-ban-dur-row" id="admBanDurRow">
            <input type="number" id="admBanAmount" min="1" max="1000" value="1">
            <select id="admBanUnit">
              <option value="days">Days (ימים)</option>
              <option value="weeks">Weeks (שבועות)</option>
              <option value="months">Months (חודשים)</option>
              <option value="years">Years (שנים)</option>
            </select>
          </div>
          <input type="text" id="admBanReason" placeholder="Ban reason shown to user…" dir="auto">
          <button type="submit" class="btn-primary adm-ban-submit">🔨 Ban User Instantly</button>
        </div>
      </form>
    ` : ''}

    ${adminPlanTarget ? `
      <form class="adm-action-drawer plan" id="admPlanForm">
        <div class="adm-drawer-head">
          <b>💎 Subscription Plan &amp; Time Manager for <u>@${esc(adminPlanTarget)}</u> ${getPlanTagHtml(planTargetEff, 'sm', adminPlanTarget)}</b>
          <button type="button" class="btn-ghost" id="admPlanCancelForm">Cancel</button>
        </div>
        <div class="adm-ban-controls" style="flex-direction:column;align-items:stretch;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="font-size:.82rem;font-weight:700;color:var(--muted);">Assign Plan (No Payment Required):</span>
            <select id="admPlanSelect" class="adm-select">
              <option value="free" ${planTargetEff === 'free' ? 'selected' : ''}>FREE — Loki Free ($0/mo · 25k tokens · 8 imgs/16h · 10 Stark msgs)</option>
              <option value="pro" ${planTargetEff === 'pro' ? 'selected' : ''}>PRO — Loki Pro ($7.99/mo · 5× Usage 125k · 15 imgs/16h · 85 Stark msgs · Video Banner)</option>
              <option value="ultimate" ${planTargetEff === 'ultimate' ? 'selected' : ''}>✦ ULTIMATE — Loki Ultimate ($12.99/mo · ∞ Everything · Ultra Fast · AI Design)</option>
            </select>
          </div>
          <div class="adm-plan-duration-row">
            <span style="font-size:.8rem;font-weight:700;color:var(--muted);">Duration:</span>
            <label class="adm-dur-pill ${adminPlanDurationMode === 'permanent' ? 'on' : ''}">
              <input type="radio" name="admPlanDurMode" value="permanent" ${adminPlanDurationMode === 'permanent' ? 'checked' : ''}> ♾️ Permanent / Lifetime
            </label>
            <label class="adm-dur-pill ${adminPlanDurationMode === 'timed' ? 'on' : ''}">
              <input type="radio" name="admPlanDurMode" value="timed" ${adminPlanDurationMode === 'timed' ? 'checked' : ''}> ⏱ Limited Time
            </label>
            <div class="adm-plan-timed-inputs ${adminPlanDurationMode === 'timed' ? 'open' : ''}" id="admPlanTimedInputs">
              <input type="number" id="admPlanDurAmount" min="1" max="3650" value="${Number(adminPlanDurationAmount) || 7}" ${adminPlanDurationMode !== 'timed' ? 'disabled' : ''}>
              <select id="admPlanDurUnit" ${adminPlanDurationMode !== 'timed' ? 'disabled' : ''}>
                <option value="days" ${adminPlanDurationUnit === 'days' ? 'selected' : ''}>Days</option>
                <option value="weeks" ${adminPlanDurationUnit === 'weeks' ? 'selected' : ''}>Weeks</option>
                <option value="months" ${adminPlanDurationUnit === 'months' ? 'selected' : ''}>Months</option>
                <option value="years" ${adminPlanDurationUnit === 'years' ? 'selected' : ''}>Years</option>
              </select>
              <div class="adm-quick-gift-pills">
                <button type="button" class="adm-mini-btn" data-pdur="3:days">3d</button>
                <button type="button" class="adm-mini-btn" data-pdur="1:weeks">1w</button>
                <button type="button" class="adm-mini-btn" data-pdur="1:months">1mo</button>
                <button type="button" class="adm-mini-btn" data-pdur="1:years">1yr</button>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <label class="lc-check" style="background:rgba(0,255,156,.08);padding:6px 12px;border-radius:10px;border:1px solid rgba(0,255,156,.25);">
              <input type="checkbox" id="admStarkAuthCheck" ${planTargetUser?.starkAuthorized ? 'checked' : ''}>
              <span>⚡ Special Lokizen 4.0 Stark Authorization (Bypass 10-msg Free limit)</span>
            </label>
            <button type="submit" class="btn-primary">💎 Apply Plan &amp; Duration Instantly</button>
          </div>
        </div>
      </form>
    ` : ''}

    ${adminTokenTarget ? `
      <form class="adm-action-drawer tokens" id="admTokenForm">
        <div class="adm-drawer-head">
          <b>🎁 Token &amp; Unlimited Plan Manager for <u>@${esc(adminTokenTarget)}</u></b>
          <button type="button" class="btn-ghost" id="admTokenCancelForm">Cancel</button>
        </div>
        <div class="adm-ban-controls">
          <select id="admTokenAction">
            <option value="gift">🎁 Gift Bonus Tokens (+Expand Cycle Limit)</option>
            <option value="set">🎯 Set Exact Token Balance</option>
            <option value="unlimited">👑 Grant ∞ Unlimited Usage Plan</option>
            <option value="revoke_unlimited">🔄 Return to Standard 25,000 Plan</option>
          </select>
          <input type="number" id="admTokenAmount" min="100" step="1000" value="25000" placeholder="Tokens amount…">
          <div class="adm-quick-gift-pills">
            <button type="button" class="adm-mini-btn" data-qtok="25000">+25k</button>
            <button type="button" class="adm-mini-btn" data-qtok="50000">+50k</button>
            <button type="button" class="adm-mini-btn" data-qtok="100000">+100k</button>
            <button type="button" class="adm-mini-btn" data-qtok="500000">+500k</button>
          </div>
          <button type="submit" class="btn-primary">✨ Apply Token Update</button>
        </div>
      </form>
    ` : ''}

    ${adminPasswordTarget ? `
      <form class="adm-action-drawer pw" id="admPwForm">
        <div class="adm-drawer-head">
          <b>🔑 Override Password for <u>@${esc(adminPasswordTarget)}</u></b>
          <button type="button" class="btn-ghost" id="admPwCancelForm">Cancel</button>
        </div>
        <div class="adm-ban-controls">
          <input type="text" id="admNewPwInput" placeholder="Enter new password (min 4 chars)…" required minlength="4">
          <button type="submit" class="btn-primary">💾 Save New Password</button>
        </div>
      </form>
    ` : ''}

    <div class="adm-dir-bar">
      <div class="adm-dir-search-wrap">
        <input type="search" id="admDirSearch" placeholder="🔍 Search username, Gmail, plan (pro/ultimate), IP, OS…" value="${esc(adminDirSearch)}" autocomplete="off">
      </div>
      <div class="adm-filters">
        <button type="button" class="adm-fbtn ${adminDirFilter === 'all' ? 'on' : ''}" data-af="all">All (${allUsers.length})</button>
        <button type="button" class="adm-fbtn ${adminDirFilter === 'online' ? 'on' : ''}" data-af="online">🟢 Online (${st.onlineUsers ?? 0})</button>
        <button type="button" class="adm-fbtn ${adminDirFilter === 'admins' ? 'on' : ''}" data-af="admins">🛡️ Admins (${adminUsersCount})</button>
        <button type="button" class="adm-fbtn ${adminDirFilter === 'google' ? 'on' : ''}" data-af="google">🌐 Google (${st.googleUsers ?? 0})</button>
        <button type="button" class="adm-fbtn ${adminDirFilter === 'unlimited' ? 'on' : ''}" data-af="unlimited">💎 Pro/Ult (${allUsers.filter(u => ['pro', 'ultimate'].includes(String(u.plan || u.effectivePlan || u.planTier || 'free').toLowerCase()) || u.isUnlimited).length})</button>
        <button type="button" class="adm-fbtn ${adminDirFilter === 'banned' ? 'on' : ''}" data-af="banned">⛔ Banned (${st.bannedUsers ?? 0})</button>
      </div>
      <div class="adm-dir-right-tools">
        <select id="admDirSort" class="adm-sort-select" title="Sort accounts">
          <option value="recent" ${adminDirSort === 'recent' ? 'selected' : ''}>↕ Sort: Online &amp; Recent</option>
          <option value="tokens_used" ${adminDirSort === 'tokens_used' ? 'selected' : ''}>↕ Sort: Most Tokens Used</option>
          <option value="balance" ${adminDirSort === 'balance' ? 'selected' : ''}>↕ Sort: Highest Balance</option>
          <option value="newest" ${adminDirSort === 'newest' ? 'selected' : ''}>↕ Sort: Newest Joined</option>
          <option value="az" ${adminDirSort === 'az' ? 'selected' : ''}>↕ Sort: Username A–Z</option>
        </select>
        <button type="button" class="btn-ghost" id="admToggleAllPwBtn" title="Show or hide all user passwords">${adminRevealPasswords ? '🙈 Hide Passwords' : '👁 Passwords'}</button>
        <button type="button" class="btn-ghost" id="admRefreshBtn" title="Refresh live data">↻</button>
      </div>
    </div>

    <div class="adm-accounts-scroll-meta">
      <span>Showing <b>${filteredUsers.length}</b> of <b>${allUsers.length}</b> registered accounts · Admin can change any user's Plan (Free / Pro / Ultimate) including their own</span>
      <span>Root Owner: <b>@EladBenczel</b> (<code>benczelelad@gmail.com</code>)</span>
    </div>

    <div class="adm-accounts-scroll-viewport" role="region" aria-label="Scrollable Accounts List">
      ${filteredUsers.length ? filteredUsers.map(u => {
        const isBanned = !!u.banInfo?.banned;
        const uPlan = String(u.plan || u.effectivePlan || u.planTier || 'free').toLowerCase();
        const effLim = Math.max(1, Number(u.tokenLimitEffective || DAILY_LIMIT));
        const remTok = Math.max(0, Number(u.tokensRemaining || 0));
        const pct = u.isUnlimited ? 100 : Math.min(100, Math.round((remTok / effLim) * 100));
        const usageStr = u.isUnlimited ? '∞ / Unlimited Plan' : `${remTok.toLocaleString()} / ${effLim.toLocaleString()} (${pct}%)`;
        const hasPw = typeof u.adminPassword === 'string' && u.adminPassword.length > 0;
        const isPwVisible = adminRevealPasswords || adminRevealedIds.has(u.id);
        const pwDisplay = hasPw ? (isPwVisible ? u.adminPassword : '••••••••') : 'Google OAuth';
        const dev = u.deviceInfo;
        const devExtra = [dev?.ip, dev?.timezone, dev?.language].filter(Boolean).join(' · ');
        return `
          <div class="adm-acc-card ${u.online ? 'is-online' : ''} ${u.isRootAdmin ? 'is-root' : ''} ${isBanned ? 'is-banned' : ''} plan-${uPlan}" data-adm-card="${esc((u.usernameLower || u.username || '').toLowerCase())}">
            <div class="adm-acc-col identity">
              <div class="adm-acc-av-wrap" data-view-profile="${esc(u.username)}" style="cursor:pointer;" title="View @${esc(u.username)}'s Profile">
                ${(u.avatarUrl || u.googlePicture)
                  ? `<img src="${esc(u.avatarUrl || u.googlePicture)}" alt="${esc(u.displayName || u.username)}" class="adm-u-av" referrerpolicy="no-referrer">`
                  : `<span class="adm-u-av-txt">${esc((u.displayName || u.username || 'U').charAt(0).toUpperCase())}</span>`}
                <span class="adm-presence-dot ${u.online ? 'on' : 'off'}" title="${u.online ? 'Online now' : 'Offline'}"></span>
              </div>
              <div class="adm-acc-id-info">
                <div class="adm-acc-name-row">
                  <b class="adm-acc-uname" data-view-profile="${esc(u.username)}" style="cursor:pointer;" title="Click to open profile">${esc(u.displayName || u.username)}</b>
                  <span style="font-size:.75rem;color:var(--muted);">@${esc(u.username)}</span>
                  ${getPlanTagHtml(uPlan, 'sm', u.username)}
                  ${uPlan !== 'free' && u.planExpiresAt ? `<span class="adm-plan-exp-chip" title="Automatic expiration">${esc(u.planDurationLabel || 'Timed')} · til ${new Date(u.planExpiresAt).toLocaleDateString()}</span>` : uPlan !== 'free' ? `<span class="adm-plan-exp-chip perm">♾️ Permanent</span>` : ''}
                  ${renderRoleBadge(u)}
                  ${u.starkAuthorized ? '<span class="adm-tag-inf" title="Special Admin Authorization for Lokizen 4.0 Stark">⚡ STARK AUTH</span>' : ''}
                  ${isBanned ? `<span class="adm-pill-ban">⛔ BANNED (${esc(u.banInfo.remainingText)})</span>` : ''}
                </div>
                <div class="adm-acc-sub-row">
                  ${u.googleEmail ? `<span class="adm-gmail-chip" title="Google Verified Email">🌐 ${esc(u.googleEmail)}</span>` : `<span class="adm-auth-chip">🔑 Password Auth</span>`}
                  <span class="adm-inv-chip">Invite #<code>${esc(u.inviteCode || '—')}</code></span>
                  ${u.invitedBy ? `<span class="adm-inv-chip">Ref by <b>@${esc(u.invitedBy)}</b></span>` : ''}
                </div>
                <div class="adm-acc-seen-row">
                  <span class="${u.online ? 'adm-pill-online' : 'adm-pill-offline'}">${u.online ? '● Online Live' : `○ ${esc(fmtRelativeSeen(u.lastSeenAt, false))}`}</span>
                  <span>· Joined ${new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div class="adm-acc-col telemetry">
              <div class="adm-acc-tok-top">
                <span>Quota (${uPlan.toUpperCase()})</span>
                <code>${usageStr}</code>
              </div>
              <div class="adm-acc-prog"><i style="width:${pct}%" class="${u.isUnlimited ? 'inf' : pct < 20 ? 'low' : ''}"></i></div>
              <div class="adm-acc-metrics">
                <span>⚡ <b>${Number(u.totalTokensUsed || 0).toLocaleString()}</b> used</span>
                <span>💬 <b>${u.convCount ?? u.savedChatsCount ?? 0}</b> chats (${u.messageCount ?? u.totalMessagesCount ?? 0} msgs)</span>
                <span>⏱ <b>${fmtDurationLong(u.totalTimeSeconds)}</b></span>
              </div>
              <div class="adm-quick-plan-strip">
                <span class="aqp-lbl">Plan:</span>
                <button type="button" class="adm-qplan-btn ${uPlan === 'free' ? 'on free' : ''}" data-qplan-u="${esc(u.username)}" data-qplan-t="free" title="Set @${esc(u.username)} to Free Plan">FREE</button>
                <button type="button" class="adm-qplan-btn ${uPlan === 'pro' ? 'on pro' : ''}" data-qplan-u="${esc(u.username)}" data-qplan-t="pro" title="Grant @${esc(u.username)} Loki Pro Plan ($7.99 benefits for free)">PRO</button>
                <button type="button" class="adm-qplan-btn ${uPlan === 'ultimate' ? 'on ultimate' : ''}" data-qplan-u="${esc(u.username)}" data-qplan-t="ultimate" title="Grant @${esc(u.username)} Loki Ultimate Plan ($12.99 benefits for free)">✦ ULTIMATE</button>
              </div>
            </div>

            <div class="adm-acc-col sec-dev">
              <div class="adm-pw-cell">
                <span class="adm-sec-lbl">Pass:</span>
                <code class="adm-pw-val ${hasPw ? '' : 'muted'}">${esc(pwDisplay)}</code>
                ${hasPw ? `
                  <button type="button" class="adm-mini-btn adm-pw-eye" data-pwid="${esc(u.id)}" title="${isPwVisible ? 'Hide' : 'Show'}">${isPwVisible ? '🙈' : '👁'}</button>
                  <button type="button" class="adm-mini-btn adm-pw-copy" data-pw="${esc(u.adminPassword)}" title="Copy password">⧉</button>
                ` : ''}
                <button type="button" class="adm-mini-btn adm-pw-edit" data-pwu="${esc(u.username)}" title="Change user password">✎</button>
              </div>
              <div class="adm-dev-cell" title="${esc(dev?.userAgent || '')}">${esc(fmtDeviceLine(dev))}</div>
              ${devExtra ? `<small class="adm-subline">${esc(devExtra)}</small>` : ''}
            </div>

            <div class="adm-acc-col actions">
              <div class="adm-acc-act-grid">
                <button type="button" class="btn-primary adm-act-inspect" data-insp="${esc(u.username)}" title="Enter this account live and see all chats & workspace">🔍 Inspect</button>
                <button type="button" class="btn-ghost adm-act-plan" data-plu="${esc(u.username)}" title="Set Subscription Plan (Free / Pro / Ultimate) & Stark Auth">💎 Plan</button>
                <button type="button" class="btn-ghost adm-act-xray" data-xr="${esc(u.username)}" title="View chats & code in X-Ray">🔭 X-Ray</button>
                ${allowedPerms.has('access') ? `<button type="button" class="btn-ghost adm-act-access" data-accu="${esc(u.username)}" title="Manage Admin Panel Access (None / Partial / Full)">🔐 Access</button>` : ''}
                <button type="button" class="btn-ghost adm-act-tok" data-tk="${esc(u.username)}" title="Gift tokens or toggle ∞ Unlimited">🎁 Tokens</button>
                <button type="button" class="btn-ghost adm-act-reset" data-ru="${esc(u.username)}" title="Reset Usage & Quotas">⚡ Reset</button>
                ${!u.isRootAdmin ? (isBanned
                  ? `<button type="button" class="btn-ghost adm-act-unban" data-ubu="${esc(u.username)}">✓ Unban</button>`
                  : `<button type="button" class="btn-ghost adm-act-ban" data-bu="${esc(u.username)}">⛔ Ban</button>`
                ) : ''}
                ${!u.isRootAdmin ? `<button type="button" class="btn-ghost adm-act-del" data-du="${esc(u.username)}" title="Delete account">🗑</button>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('') : `<div class="adm-empty-state">No accounts match your current search or filter.</div>`}
    </div>
  `;
  };

  // Tab 2: Admin Access & Granular Permissions Studio
  const renderAccessTab = () => {
    if (!adminAccessTarget && allUsers.length){
      const firstCandidate = allUsers.find(u => !u.isRootAdmin) || allUsers[0];
      if (firstCandidate) selectAdminAccessUser(firstCandidate.username, allUsers);
    }
    const selUser = allUsers.find(u => u.username.toLowerCase() === String(adminAccessTarget || '').toLowerCase()) || null;
    const isSelRoot = !!selUser?.isRootAdmin;

    return `
      <div class="adm-access-shell">
        <div class="adm-access-owner-banner">
          <div class="adm-aob-left">
            <span class="adm-aob-crown">👑</span>
            <div>
              <div class="adm-aob-kicker">PRIMARY ROOT OWNER &amp; SUPER ADMIN</div>
              <h3>@EladBenczel · <code>benczelelad@gmail.com</code></h3>
              <p>Root Owner access is permanently locked to <b>EladBenczel</b> (<code>benczelelad@gmail.com</code>). Previous default access for <code>@Lokizenith</code> has been removed. Use the studio below to grant any user <b>Partial Admin Access</b> (selected tabs only) or <b>Full Admin Access</b>.</p>
            </div>
          </div>
          <div class="adm-aob-stats">
            <div><b>1</b><small>Root Owner</small></div>
            <div><b>${allUsers.filter(u => !u.isRootAdmin && u.adminAccessLevel === 'full').length}</b><small>Full Admins</small></div>
            <div><b>${allUsers.filter(u => u.adminAccessLevel === 'partial').length}</b><small>Partial Admins</small></div>
          </div>
        </div>

        <div class="adm-access-grid">
          <form class="adm-bcast-card adm-access-editor" id="admAccessSaveForm">
            <div class="adm-card-badge">🔐 GRANULAR ADMIN ACCESS &amp; ROLE ASSIGNER</div>
            <h3>Configure User Admin Panel Access</h3>
            <div class="adm-field" style="margin-top:10px;">
              <label>1. Select Account to Configure</label>
              <select id="admAccessUserSelect" class="adm-select" style="width:100%;">
                ${allUsers.map(u => `
                  <option value="${esc(u.username)}" ${u.username.toLowerCase() === String(adminAccessTarget || '').toLowerCase() ? 'selected' : ''}>
                    ${esc(u.displayName || u.username)} (@${esc(u.username)}) ${u.googleEmail ? `(${esc(u.googleEmail)})` : ''} — ${u.isRootAdmin ? '👑 ROOT OWNER' : u.adminAccessLevel === 'full' ? '🛡️ Full Admin' : u.adminAccessLevel === 'partial' ? `⚡ Partial Admin (${(u.adminPermissions || []).length} tabs)` : '👤 Standard User'}
                  </option>
                `).join('')}
              </select>
            </div>

            ${isSelRoot ? `
              <div class="adm-root-protected-note">
                👑 <b>@${esc(selUser.username)}</b> (<code>benczelelad@gmail.com</code>) is the Root Owner of Lokizenith AI and permanently holds Full Admin Access to all modules. Select another account above to grant or revoke Partial or Full Admin access.
              </div>
            ` : `
              <div class="adm-field" style="margin-top:14px;">
                <label>2. Choose Access Tier for <b>@${esc(selUser?.username || adminAccessTarget)}</b></label>
                <div class="adm-tier-cards">
                  <button type="button" class="adm-tier-card ${adminAccessLevelDraft === 'none' ? 'on none' : ''}" data-atier="none">
                    <span class="atc-ic">🚫</span>
                    <b>No Admin Access</b>
                    <small>Standard user account. Cannot open the Admin Suite.</small>
                  </button>
                  <button type="button" class="adm-tier-card ${adminAccessLevelDraft === 'partial' ? 'on partial' : ''}" data-atier="partial">
                    <span class="atc-ic">⚡</span>
                    <b>Partial Admin Access</b>
                    <small>Custom access! Only sees and uses the modules you check below.</small>
                  </button>
                  <button type="button" class="adm-tier-card ${adminAccessLevelDraft === 'full' ? 'on full' : ''}" data-atier="full">
                    <span class="atc-ic">🛡️</span>
                    <b>Full Admin Access</b>
                    <small>Complete access to all 9 Admin Suite tabs and commands.</small>
                  </button>
                </div>
              </div>

              ${adminAccessLevelDraft === 'partial' ? `
                <div class="adm-perms-box">
                  <div class="adm-perms-head">
                    <label>3. Select Allowed Admin Modules (${adminAccessPermsDraft.length} / ${ADMIN_MODULES_META.length} enabled)</label>
                    <div class="adm-perms-presets">
                      <button type="button" class="adm-mini-btn" data-apreset="mod">🛡 Moderator Pack</button>
                      <button type="button" class="adm-mini-btn" data-apreset="dj">🎙 Voice &amp; Events Pack</button>
                      <button type="button" class="adm-mini-btn" data-apreset="view">📊 Analytics &amp; X-Ray</button>
                      <button type="button" class="adm-mini-btn" data-apreset="all">✓ Check All</button>
                    </div>
                  </div>
                  <div class="adm-perms-grid">
                    ${ADMIN_MODULES_META.map(m => {
                      const checked = adminAccessPermsDraft.includes(m.id);
                      return `
                        <label class="adm-perm-item ${checked ? 'on' : ''}">
                          <input type="checkbox" class="adm-perm-chk" value="${esc(m.id)}" ${checked ? 'checked' : ''}>
                          <span class="api-ic">${m.icon}</span>
                          <div>
                            <b>${esc(m.name)}</b>
                            <small>${esc(m.desc)}</small>
                          </div>
                        </label>
                      `;
                    }).join('')}
                  </div>
                </div>
              ` : ''}

              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                <button type="submit" class="btn-primary">💾 Save Access for @${esc(selUser?.username || adminAccessTarget)}</button>
              </div>
            `}
          </form>

          <div class="adm-bcast-card adm-access-roster">
            <div class="adm-card-badge gold">🛡️ LIVE ACCESS ROSTER &amp; QUICK SWITCHER</div>
            <h3>All Accounts Access Levels (${allUsers.length})</h3>
            <div class="adm-access-roster-scroll">
              ${allUsers.map(u => `
                <div class="adm-roster-row ${u.isAdmin ? 'is-staff' : ''}">
                  <div class="adm-roster-user" data-view-profile="${esc(u.username)}" style="cursor:pointer;" title="Click to view profile">
                    ${(u.avatarUrl || u.googlePicture)
                      ? `<img src="${esc(u.avatarUrl || u.googlePicture)}" alt="" class="adm-u-av" referrerpolicy="no-referrer">`
                      : `<span class="adm-u-av-txt">${esc((u.displayName || u.username || 'U').charAt(0).toUpperCase())}</span>`}
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <b>${esc(u.displayName || u.username)}</b>
                        <small style="color:var(--muted);">@${esc(u.username)}</small>
                        ${renderRoleBadge(u)}
                      </div>
                      <small class="adm-subline">
                        ${u.googleEmail ? `${esc(u.googleEmail)} · ` : ''}
                        ${u.isRootAdmin
                          ? 'All 9 modules permanently unlocked'
                          : u.adminAccessLevel === 'full'
                          ? 'All 9 modules unlocked'
                          : u.adminAccessLevel === 'partial'
                          ? `Allowed: ${(u.adminPermissions || []).join(', ')}`
                          : 'No Admin Panel access'}
                      </small>
                    </div>
                  </div>
                  <div class="adm-roster-acts">
                    ${u.isRootAdmin ? `<span class="adm-mini-tag">🔒 Protected Owner</span>` : `
                      <button type="button" class="adm-mini-btn ${u.adminAccessLevel === 'full' ? 'on' : ''}" data-qacc-u="${esc(u.username)}" data-qacc-lvl="full" title="Grant Full Admin Access">🛡️ Full</button>
                      <button type="button" class="adm-mini-btn ${u.adminAccessLevel === 'partial' ? 'on' : ''}" data-qacc-edit="${esc(u.username)}" title="Configure Partial Access Modules">⚡ Partial…</button>
                      ${u.isAdmin ? `<button type="button" class="adm-mini-btn danger" data-qacc-u="${esc(u.username)}" data-qacc-lvl="none" title="Revoke Admin Access">🚫 Revoke</button>` : ''}
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderXrayTab = () => {
    const d = adminXrayData;
    const convs = Array.isArray(d?.data?.convs) ? d.data.convs : [];
    const activeConv = convs[adminXrayConvIdx] || convs[0] || null;
    const loki = d?.data?.lokicode || {};
    return `
      <div class="adm-xray-shell">
        <div class="adm-xray-top">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <label style="font-weight:800;font-size:.86rem;color:#c4b5fd;">🔭 Select User to X-Ray:</label>
            <select id="admXraySelect" class="adm-select">
              <option value="">— Choose an account (${allUsers.length}) —</option>
              ${allUsers.map(u => `<option value="${esc(u.username)}" ${u.username.toLowerCase() === adminXrayUser.toLowerCase() ? 'selected' : ''}>@${esc(u.username)} (${u.savedChatsCount || 0} chats · ${u.online ? '🟢 Online' : 'Offline'})</option>`).join('')}
            </select>
            ${adminXrayUser ? `<button type="button" class="btn-primary" id="admXrayInspectLiveBtn" data-insp="${esc(adminXrayUser)}">🚀 Enter @${esc(adminXrayUser)}'s Account Live (Inspect Mode)</button>` : ''}
          </div>
        </div>
        ${adminXrayLoading ? `<div class="adm-empty-state">⏳ Loading deep X-Ray telemetry for @${esc(adminXrayUser)}…</div>` : !d ? `
          <div class="adm-empty-state">
            <div style="font-size:2.2rem;margin-bottom:8px;">🔭</div>
            <b>Account Deep X-Ray &amp; Live Chat Reader</b>
            <p>Select any account above or click <b>🔭 X-Ray</b> / <b>🔍 Inspect</b> in the Directory to inspect their saved AI conversations, LokiCode workspace files, device history, and password.</p>
          </div>
        ` : `
          <div class="adm-xray-grid">
            <div class="adm-xray-card">
              <h4>👤 Account Profile &amp; Security</h4>
              <div class="adm-kv-list">
                <div><span>Username:</span><b>@${esc(d.user.username)}</b></div>
                <div><span>Password:</span><code>${esc(d.user.adminPassword || 'Google OAuth')}</code></div>
                <div><span>Auth Method:</span><b>${esc(d.user.authProvider || 'password')}${d.user.googleEmail ? ` (${esc(d.user.googleEmail)})` : ''}</b></div>
                <div><span>Invite Code:</span><code>#${esc(d.user.inviteCode || '—')}</code></div>
                <div><span>Token Balance:</span><b>${d.user.isUnlimited ? '∞ Unlimited' : `${Number(d.user.tokensRemaining || 0).toLocaleString()} / ${Number(d.user.tokenLimitEffective || 25000).toLocaleString()}`}</b></div>
                <div><span>Total Lifetime:</span><b>${fmtDurationLong(d.user.totalTimeSeconds || 0)} (${d.user.loginCount || 1} logins)</b></div>
                <div><span>Last Device:</span><b>${esc(fmtDeviceLine(d.user.deviceInfo))}</b></div>
              </div>
            </div>
            <div class="adm-xray-card">
              <h4>💻 LokiCode Workspace Snapshot</h4>
              <div style="font-size:.78rem;color:var(--muted);margin-bottom:6px;">Language: <b>${esc(loki.lang || 'none')}</b> · Prompt: ${esc(loki.prompt || '—')}</div>
              <pre class="adm-code-preview"><code>${esc(String(loki.code || '// No code saved in workspace yet').slice(0, 1200))}</code></pre>
            </div>
          </div>
          <div class="adm-xray-chats-box">
            <div class="adm-xray-chats-list">
              <h4>💬 Saved AI Conversations (${convs.length})</h4>
              ${convs.length ? convs.map((c, idx) => `
                <button type="button" class="adm-xray-conv-btn ${idx === adminXrayConvIdx ? 'on' : ''}" data-xconv="${idx}">
                  <b>${esc(c.title || 'Untitled Chat')}</b>
                  <small>${(c.messages || []).length} msgs · ${c.model || 'zenith'}</small>
                </button>
              `).join('') : `<div class="muted" style="padding:12px;font-size:.82rem;">No saved conversations yet.</div>`}
            </div>
            <div class="adm-xray-transcript">
              <h4>📜 Conversation Transcript ${activeConv ? `— "${esc(activeConv.title || 'Untitled')}"` : ''}</h4>
              <div class="adm-xray-msgs">
                ${activeConv && Array.isArray(activeConv.messages) && activeConv.messages.length ? activeConv.messages.map(m => `
                  <div class="adm-xmsg ${m.role === 'user' ? 'usr' : 'ai'}">
                    <div class="adm-xmsg-meta"><b>${m.role === 'user' ? `@${esc(d.user.username)}` : '⚡ Lokizenith AI'}</b></div>
                    <div class="adm-xmsg-txt" dir="auto">${esc(String(m.content || m.text || '').slice(0, 1500))}</div>
                  </div>
                `).join('') : `<div class="muted" style="padding:16px;">Select a conversation on the left to read its full transcript.</div>`}
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  };

  const renderSoundboardTab = () => `
    <div class="adm-soundboard-shell">
      <div class="adm-voice-pa-card">
        <div class="adm-vpa-left">
          <div class="adm-vpa-badge">🎙 LIVE VOICE PA TRANSMITTER · UP TO 60 SECONDS (1 FULL MINUTE)</div>
          <h3>Record Your Voice (Up to 1 Minute) &amp; Make All Online Accounts Hear You Live!</h3>
          <p>Record up to <b>60 seconds (1 full minute)</b> from your microphone, apply a funny or epic voice filter, preview it locally, or broadcast it simultaneously to every online user (${st.onlineUsers ?? 0} online now)!</p>
          <div class="adm-vpa-filters">
            <span style="font-size:.76rem;color:var(--muted);font-weight:700;">Voice Effect Filter:</span>
            ${[
              { id: 'normal', label: '🎙 Normal Studio' },
              { id: 'megaphone', label: '📢 Stadium Megaphone' },
              { id: 'chipmunk', label: '🐿 Funny Chipmunk (High Pitch)' },
              { id: 'boss', label: '👹 Deep Final Boss' },
              { id: 'robot', label: '🤖 Cyber Robot' }
            ].map(f => `<button type="button" class="adm-vfilter-btn ${voiceFilterSelected === f.id ? 'on' : ''}" data-vf="${f.id}">${f.label}</button>`).join('')}
          </div>
          <div class="adm-vpa-controls">
            <button type="button" class="btn-primary adm-rec-btn ${voiceRecordingActive ? 'recording' : ''}" id="admVoiceRecBtn">
              ${voiceRecordingActive ? `⏹ Stop Recording (${voiceRecordSec}s / 60s)` : '🔴 Record My Microphone (Max 60s)'}
            </button>
            <button type="button" class="btn-ghost" id="admVoicePreviewBtn" ${voiceRecordedDataUrl ? '' : 'disabled'}>🎧 Preview Recording</button>
            <input type="text" id="admVoiceCaptionInput" placeholder="Caption or spoken text (e.g. 'Lokizenith is speaking live to everyone!')…" style="flex:1;min-width:210px;">
            <button type="button" class="btn-primary adm-broadcast-voice-btn" id="admVoiceBroadcastBtn" ${voiceRecordedDataUrl ? '' : 'disabled'}>📡 Broadcast Recorded Voice Live!</button>
            <button type="button" class="btn-ghost" id="admVoiceTtsBroadcastBtn" title="Speak the typed text aloud on all online screens using the selected voice filter">🗣 Speak Text Live to All</button>
          </div>
          ${voiceRecordedDataUrl ? `<div class="adm-rec-ready">✓ Voice clip ready (${voiceRecordSec || 1}s / 60s recorded) — choose a voice filter above and click <b>📡 Broadcast Recorded Voice Live!</b></div>` : ''}
        </div>
      </div>

      <div class="adm-sb-header">
        <div>
          <h3>🔊 Built-In Funny &amp; Epic Soundboard Library (12 Live Sounds)</h3>
          <small>Click <b>🎧 Preview</b> to hear locally, or click <b>📡 Play to All Live</b> to trigger it on every online account simultaneously!</small>
        </div>
        <input type="text" id="admSoundCaption" placeholder="Optional funny caption to flash with the sound…" style="min-width:280px;">
      </div>

      <div class="adm-soundboard-grid">
        ${SOUNDBOARD_LIBRARY.map(s => `
          <div class="adm-sound-card" style="--sc-color:${s.color}">
            <div class="adm-sc-top">
              <span class="adm-sc-icon">${s.icon}</span>
              <span class="adm-sc-tag">${esc(s.tag)}</span>
            </div>
            <b>${esc(s.name)}</b>
            <small>${esc(s.desc)}</small>
            <div class="adm-sc-actions">
              <button type="button" class="btn-ghost adm-sc-prev" data-sprev="${esc(s.id)}">🎧 Preview</button>
              <button type="button" class="btn-primary adm-sc-cast" data-scast="${esc(s.id)}">📡 Play to All Live</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const renderBroadcastTab = () => {
    const schedList = ov.scheduledBroadcasts || [];
    const histList = ov.broadcastHistory || [];
    return `
      <div class="adm-bcast-grid">
        <form class="adm-bcast-card" id="admInstantBroadcastForm">
          <div class="adm-card-badge">📡 INSTANT GLOBAL POPUP MESSAGE (NO TOKEN RESET)</div>
          <h3>Send Live System Announcement Now</h3>
          <p class="muted" style="font-size:.82rem;margin:0 0 12px;">Displays a rich global announcement modal on all online users' screens and adds it to notifications. <b>Does NOT reset or alter user tokens.</b></p>
          <div class="adm-form-row">
            <div class="adm-field">
              <label>Announcement Title</label>
              <input type="text" id="admBcastTitle" value="📢 Official Lokizenith Announcement" required>
            </div>
            <div class="adm-field">
              <label>Visual Theme</label>
              <select id="admBcastLevel">
                <option value="info">💎 Cyber Info (Blue/Emerald)</option>
                <option value="celebration">🎉 Celebration &amp; Event (Gold/Emerald)</option>
                <option value="urgent">🚨 Urgent Alert (Crimson/Amber)</option>
                <option value="maintenance">🛠 System Update (Violet)</option>
              </select>
            </div>
            <div class="adm-field">
              <label>Attach Sound Effect</label>
              <select id="admBcastSound">
                <option value="none">🔇 Silent (Popup Only)</option>
                ${SOUNDBOARD_LIBRARY.map(s => `<option value="${esc(s.id)}">${s.icon} ${esc(s.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="adm-field" style="margin-top:10px;">
            <label>Global Message Body</label>
            <textarea id="admBcastMessage" rows="3" placeholder="Type your global announcement to all users…" required dir="auto"></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button type="submit" class="btn-primary">📢 Broadcast Global Message Now</button>
          </div>
        </form>

        <form class="adm-bcast-card" id="admScheduleBroadcastForm">
          <div class="adm-card-badge gold">⏰ SCHEDULE FUTURE ANNOUNCEMENT</div>
          <h3>Schedule Automated Global Announcement</h3>
          <p class="muted" style="font-size:.82rem;margin:0 0 12px;">Queue an announcement (with optional sound effect!) to fire automatically at a future countdown or exact time.</p>
          <div class="adm-form-row">
            <div class="adm-field">
              <label>Scheduled Title</label>
              <input type="text" id="admSchedTitle" value="⏰ Scheduled Lokizenith Event" required>
            </div>
            <div class="adm-field">
              <label>Deliver In (Quick Delay)</label>
              <select id="admSchedDelaySec">
                <option value="30">⚡ In 30 Seconds</option>
                <option value="60">⏱ In 1 Minute</option>
                <option value="300">⏱ In 5 Minutes</option>
                <option value="900">⏱ In 15 Minutes</option>
                <option value="1800">⏱ In 30 Minutes</option>
                <option value="3600">⏱ In 1 Hour</option>
              </select>
            </div>
            <div class="adm-field">
              <label>Sound Effect on Delivery</label>
              <select id="admSchedSound">
                <option value="fanfare">👑 Royal Admin Fanfare</option>
                <option value="none">🔇 Silent</option>
                ${SOUNDBOARD_LIBRARY.map(s => `<option value="${esc(s.id)}">${s.icon} ${esc(s.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="adm-field" style="margin-top:10px;">
            <label>Scheduled Message Content</label>
            <textarea id="admSchedMessage" rows="2" placeholder="Message to automatically broadcast when the timer hits 00:00…" required dir="auto"></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button type="submit" class="btn-primary">⏰ Add to Scheduled Queue</button>
          </div>
        </form>
      </div>

      <div class="adm-bcast-lists-grid">
        <div class="adm-bcast-list-box">
          <h4>⏳ Pending Scheduled Announcements (${schedList.length})</h4>
          ${schedList.length ? schedList.map(item => {
            const leftSec = Math.max(0, Math.ceil((item.scheduledFor - Date.now()) / 1000));
            return `
              <div class="adm-sched-item">
                <div>
                  <b>${esc(item.title)}</b> <span class="adm-mini-tag">${esc(item.level)} · 🔊 ${esc(item.soundEffect || 'none')}</span>
                  <p>${esc(item.message)}</p>
                  <small>Fires in <b>${fmtDurationLong(leftSec)}</b> (${new Date(item.scheduledFor).toLocaleTimeString()})</small>
                </div>
                <button type="button" class="btn-ghost adm-cancel-sched" data-csched="${esc(item.id)}">✕ Cancel</button>
              </div>
            `;
          }).join('') : `<div class="muted" style="padding:12px;font-size:.82rem;">No pending scheduled announcements.</div>`}
        </div>

        <div class="adm-bcast-list-box">
          <h4>📜 Recent Broadcast History (${histList.length})</h4>
          ${histList.length ? histList.slice(0, 12).map(h => `
            <div class="adm-sched-item">
              <div>
                <b>${esc(h.title)}</b> <span class="adm-mini-tag">${new Date(h.ts).toLocaleTimeString()}</span>
                <p>${esc(h.message)}</p>
              </div>
              <button type="button" class="btn-ghost adm-rebroadcast-btn" data-rb-title="${esc(h.title)}" data-rb-msg="${esc(h.message)}" data-rb-lvl="${esc(h.level || 'info')}">↻ Resend</button>
            </div>
          `).join('') : `<div class="muted" style="padding:12px;font-size:.82rem;">No broadcasts sent yet.</div>`}
        </div>
      </div>
    `;
  };

  const renderLeaderboardsTab = () => {
    const byTokens = [...allUsers].sort((a, b) => (b.totalTokensUsed || 0) - (a.totalTokensUsed || 0)).slice(0, 8);
    const byTime = [...allUsers].sort((a, b) => (b.totalTimeSeconds || 0) - (a.totalTimeSeconds || 0)).slice(0, 8);
    const byRefs = [...allUsers].sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0)).slice(0, 8);
    const maxTok = Math.max(1, byTokens[0]?.totalTokensUsed || 1);
    const maxTime = Math.max(1, byTime[0]?.totalTimeSeconds || 1);
    return `
      <div class="adm-leaderboards-grid">
        <div class="adm-lb-card">
          <h4>🔥 Top Token Power Users</h4>
          <div class="adm-lb-list">
            ${byTokens.map((u, i) => `
              <div class="adm-lb-row">
                <span class="adm-lb-rank">#${i + 1}</span>
                <div class="adm-lb-info">
                  <div style="display:flex;justify-content:space-between;">
                    <b>@${esc(u.username)}</b>
                    <code>${Number(u.totalTokensUsed || 0).toLocaleString()} tok</code>
                  </div>
                  <div class="adm-lb-bar"><i style="width:${Math.min(100, Math.round(((u.totalTokensUsed || 0) / maxTok) * 100))}%"></i></div>
                </div>
                <button type="button" class="adm-mini-btn adm-act-inspect" data-insp="${esc(u.username)}" title="Inspect">🔍</button>
                <button type="button" class="adm-mini-btn adm-lb-reward" data-rwd="${esc(u.username)}" title="Gift +25k Tokens">🎁 +25k</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="adm-lb-card">
          <h4>⏱ Most Dedicated Lifetime Users</h4>
          <div class="adm-lb-list">
            ${byTime.map((u, i) => `
              <div class="adm-lb-row">
                <span class="adm-lb-rank">#${i + 1}</span>
                <div class="adm-lb-info">
                  <div style="display:flex;justify-content:space-between;">
                    <b>@${esc(u.username)}</b>
                    <code>${fmtDurationLong(u.totalTimeSeconds || 0)}</code>
                  </div>
                  <div class="adm-lb-bar cyan"><i style="width:${Math.min(100, Math.round(((u.totalTimeSeconds || 0) / maxTime) * 100))}%"></i></div>
                </div>
                <button type="button" class="adm-mini-btn adm-act-inspect" data-insp="${esc(u.username)}" title="Inspect">🔍</button>
                <button type="button" class="adm-mini-btn adm-lb-reward" data-rwd="${esc(u.username)}" title="Gift +25k Tokens">🎁 +25k</button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="adm-lb-card">
          <h4>🔗 Top Referral Champions (+25k/Invite)</h4>
          <div class="adm-lb-list">
            ${byRefs.map((u, i) => `
              <div class="adm-lb-row">
                <span class="adm-lb-rank">#${i + 1}</span>
                <div class="adm-lb-info">
                  <div style="display:flex;justify-content:space-between;">
                    <b>@${esc(u.username)}</b>
                    <code>${u.referralCount || 0} invites (+${Number(u.referralTokensEarned || 0).toLocaleString()})</code>
                  </div>
                </div>
                <button type="button" class="adm-mini-btn adm-act-inspect" data-insp="${esc(u.username)}" title="Inspect">🔍</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  const renderCodesTab = () => {
    const builtInGifts = ov.promoCodes?.builtInGiftCodes || [];
    const builtInDevs = ov.promoCodes?.builtInDevCodes || [];
    const customCodes = ov.promoCodes?.customCodes || [];
    return `
      <div class="adm-codes-studio-grid">
        <form class="adm-bcast-card" id="admCreateCustomCodeForm">
          <div class="adm-card-badge">🎟 CREATE CUSTOM PROMO / GIFT CODE</div>
          <h3>Mint a New Secret Gift or Promo Code</h3>
          <div class="adm-form-row">
            <div class="adm-field">
              <label>Secret Code String</label>
              <div style="display:flex;gap:6px;">
                <input type="text" id="admNewCodeStr" placeholder="e.g. ZENITHVIP2025" required>
                <button type="button" class="btn-ghost" id="admGenRandomCodeBtn" title="Generate random code">🎲</button>
              </div>
            </div>
            <div class="adm-field">
              <label>Bonus Tokens Awarded</label>
              <input type="number" id="admNewCodeTokens" value="50000" min="500" step="1000" required>
            </div>
            <div class="adm-field">
              <label>Redemption Type</label>
              <select id="admNewCodeKind">
                <option value="gift">🎁 1x Per Account (Gift Code)</option>
                <option value="multi">♾ Unlimited Multi-Use (Dev/Promo)</option>
              </select>
            </div>
            <div class="adm-field">
              <label>Max Total Claims (0 = ∞)</label>
              <input type="number" id="admNewCodeMaxClaims" value="0" min="0">
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button type="submit" class="btn-primary">✨ Create Live Promo Code</button>
          </div>
        </form>

        <div class="adm-bcast-card">
          <div class="adm-card-badge gold">🔐 BUILT-IN SECRET CODES &amp; CLAIMERS</div>
          <h3>Built-In Gift &amp; Dev Codes Redemption Tracker</h3>
          <div class="adm-builtin-codes-list">
            ${builtInGifts.map(c => `
              <div class="adm-code-pill-row">
                <div>
                  <code>${esc(c.code)}</code> <span class="adm-mini-tag">+${Number(c.tokens).toLocaleString()} · 1x Gift</span>
                  <small class="adm-subline">Claimed by (${c.claimCount}): ${c.claimedBy?.length ? c.claimedBy.map(u => `@${esc(u)}`).join(', ') : 'None yet'}</small>
                </div>
                <button type="button" class="adm-mini-btn adm-pw-copy" data-pw="${esc(c.code)}">⧉ Copy</button>
              </div>
            `).join('')}
            ${builtInDevs.map(c => `
              <div class="adm-code-pill-row">
                <div>
                  <code>${esc(c.code)}</code> <span class="adm-mini-tag">+${Number(c.tokens).toLocaleString()} · DEV CODE</span>
                </div>
                <button type="button" class="adm-mini-btn adm-pw-copy" data-pw="${esc(c.code)}">⧉ Copy</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="adm-bcast-list-box" style="margin-top:14px;">
        <h4>✨ Custom Admin Promo Codes (${customCodes.length})</h4>
        ${customCodes.length ? customCodes.map(c => `
          <div class="adm-sched-item">
            <div>
              <code>${esc(c.code)}</code>
              <span class="adm-mini-tag">+${Number(c.tokens).toLocaleString()} tokens · ${c.kind === 'multi' ? '♾ Multi-Use' : '1x Gift'}</span>
              <small class="adm-subline">Claims: <b>${(c.claimedBy || []).length}${c.maxClaims ? ` / ${c.maxClaims}` : ''}</b> ${(c.claimedBy || []).length ? `(${c.claimedBy.map(u => `@${esc(u)}`).join(', ')})` : ''}</small>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" class="adm-mini-btn adm-pw-copy" data-pw="${esc(c.code)}">⧉ Copy</button>
              <button type="button" class="btn-ghost adm-del-code" data-dcode="${esc(c.code)}">🗑 Delete</button>
            </div>
          </div>
        `).join('') : `<div class="muted" style="padding:12px;font-size:.82rem;">No custom promo codes created yet. Use the form above to mint one!</div>`}
      </div>
    `;
  };

  const renderSecurityTab = () => {
    const logs = (ov.auditLogs || []).filter(l => adminAuditFilter === 'all' ? true : l.category === adminAuditFilter);
    return `
      <div class="adm-sec-header">
        <div class="adm-filters">
          ${['all', 'auth', 'admin', 'quota', 'security', 'broadcast'].map(cat => `
            <button type="button" class="adm-fbtn ${adminAuditFilter === cat ? 'on' : ''}" data-auditf="${cat}">${cat.toUpperCase()}</button>
          `).join('')}
        </div>
        <button type="button" class="btn-ghost" id="admClearAuditBtn">🧹 Clear Audit Log</button>
      </div>

      <div class="adm-sec-grid">
        <div class="adm-bcast-list-box">
          <h4>🛡 Real-Time Security &amp; Activity Stream (${logs.length})</h4>
          <div class="adm-audit-stream">
            ${logs.length ? logs.map(l => `
              <div class="adm-audit-row cat-${esc(l.category || 'info')}">
                <span class="adm-audit-cat">${esc((l.category || 'sys').toUpperCase())}</span>
                <div class="adm-audit-main">
                  <b>@${esc(l.actor || 'System')}</b> — ${esc(l.action)}
                  ${l.target ? `<span class="adm-mini-tag">Target: ${esc(l.target)}</span>` : ''}
                  ${l.details ? `<small>${esc(l.details)}</small>` : ''}
                </div>
                <time>${new Date(l.ts).toLocaleTimeString()}</time>
              </div>
            `).join('') : `<div class="muted" style="padding:16px;">No security events match this filter.</div>`}
          </div>
        </div>

        <div class="adm-bcast-list-box">
          <h4>🔐 Active Sessions &amp; Force-Logout Radar</h4>
          <div class="adm-audit-stream">
            ${allUsers.map(u => `
              <div class="adm-sched-item">
                <div>
                  <b>@${esc(u.username)}</b>
                  <span class="${u.online ? 'adm-pill-online' : 'adm-pill-offline'}">${u.online ? '● Online' : '○ Offline'}</span>
                  <small class="adm-subline">${esc(fmtDeviceLine(u.deviceInfo))} · IP: ${esc(u.deviceInfo?.ip || 'local')}</small>
                </div>
                <button type="button" class="btn-ghost adm-revoke-sess" data-revu="${esc(u.username)}">🔒 Force Logout</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  };

  const ensureEventDraft = () => {
    if (adminEventDraft) return adminEventDraft;
    const activeEv = ov.activeEvent || window.LZEvents?.getEvent?.() || null;
    if (activeEv){
      adminEventDraft = JSON.parse(JSON.stringify(activeEv));
      return adminEventDraft;
    }
    adminEventDraft = {
      name: 'Lokizenith Community Surge',
      buttonLabel: 'Community Surge',
      icon: '🚀',
      themeAccent: 'emerald',
      headline: '🚀 Lokizenith Community Surge — Shared Milestone Rewards',
      subtitle: 'Work together across every chat and creation! Unlock bonus tokens, Loki Pro, and Loki Ultimate for everyone.',
      storyMarkdown: 'Every prompt, AI image, and LokiCode build fills the shared progress meter. Click Claim Reward on unlocked milestone tiers to upgrade your account!',
      highlights: ['Every user action pushes the shared goal live', 'Tiered milestone rewards unlock for all accounts'],
      metric: 'combined_activity',
      goalTarget: 150,
      endsInDays: 7,
      tiers: [
        { id: 'tier_1', title: 'Wave 1 · Fuel Drop', description: 'Community reaches first milestone!', targetProgress: 40, rewardType: 'tokens', bonusTokens: 25000, badgeEmoji: '🎁' },
        { id: 'tier_2', title: 'Wave 2 · Pro Week', description: 'Everyone claims 5 Days of Loki Pro!', targetProgress: 90, rewardType: 'plan', rewardPlan: 'pro', durationMode: 'timed', durationAmount: 5, durationUnit: 'days', badgeEmoji: '⚡' },
        { id: 'tier_3', title: 'Grand Goal · Ultimate Pass', description: '100% Goal! Timed Loki Ultimate unlocked!', targetProgress: 150, rewardType: 'plan', rewardPlan: 'ultimate', durationMode: 'timed', durationAmount: 3, durationUnit: 'days', badgeEmoji: '👑' }
      ]
    };
    return adminEventDraft;
  };

  const renderPlatformTab = () => {
    const pCfg = ov.platformConfig || state.platformConfig || {};
    const liveEv = ov.activeEvent || window.LZEvents?.getEvent?.() || null;
    const evDraft = ensureEventDraft();
    const evTiers = Array.isArray(evDraft.tiers) ? evDraft.tiers : [];
    const endsDaysVal = evDraft.endsInDays || (evDraft.endsAt ? Math.max(1, Math.round((evDraft.endsAt - Date.now()) / 86400000)) : 7);

    return `
      <!-- AI-POWERED COMMUNITY EVENT ARCHITECT STUDIO -->
      <div class="adm-ev-studio">
        <div class="adm-ev-studio-head">
          <div>
            <div class="adm-card-badge">✨ AI COMMUNITY EVENT ARCHITECT &amp; TIER REWARDS</div>
            <h3>Prompt AI to Design a Live Community Event, Button &amp; Reward Tiers</h3>
            <p class="muted" style="font-size:.82rem;margin:4px 0 0;">Describe your event below — AI creates the theme, story, goals &amp; milestone tiers. Customize anything, then click <b>Apply &amp; Launch Event Live</b> to reveal the glowing Event Button in everyone's topbar!</p>
          </div>
          <div class="adm-ev-live-status ${liveEv && liveEv.active ? 'on' : ''}">
            ${liveEv && liveEv.active ? `
              <span class="adm-ev-live-dot"></span>
              <div>
                <b>LIVE: ${esc(liveEv.icon)} ${esc(liveEv.name)}</b>
                <small>${Number(liveEv.progress || 0).toLocaleString()} / ${Number(liveEv.goalTarget || 0).toLocaleString()} (${liveEv.progressPct || 0}%)</small>
              </div>
              <button type="button" class="btn-ghost" id="admEvOpenPageBtn">🌐 View Event Page</button>
              <button type="button" class="btn-ghost" id="admEvBoost10Btn" title="Boost live community progress by +10">+10</button>
              <button type="button" class="btn-ghost" id="admEvBoost50Btn" title="Boost live community progress by +50">+50</button>
              <button type="button" class="btn-ghost adm-ev-stop-btn" id="admEvStopBtn">⏹ Stop Event</button>
            ` : `<span>○ No Community Event Active Right Now</span>`}
          </div>
        </div>

        <div class="adm-ev-prompt-bar">
          <input type="text" id="admEvPromptInput" value="${esc(adminEventPromptText)}" placeholder="e.g. Make a Neon Galaxy Weekend event with goal 200 actions: Tier 1 gives 30k tokens, Tier 2 gives 3 days Pro, Tier 3 gives 5 days Ultimate">
          <button type="button" class="btn-primary" id="admEvAiBuildBtn" ${adminEventAiBusy ? 'disabled' : ''}>
            ${adminEventAiBusy ? '⏳ AI Designing Event…' : '✨ Generate Event with AI'}
          </button>
        </div>

        <form id="admEvConfigForm" class="adm-ev-config-grid">
          <div class="adm-field">
            <label>Event Name</label>
            <input type="text" id="admEvName" value="${esc(evDraft.name || '')}" required>
          </div>
          <div class="adm-field">
            <label>Topbar Button Label (Visible to All)</label>
            <input type="text" id="admEvBtnLabel" value="${esc(evDraft.buttonLabel || evDraft.name || '')}" maxlength="32" required>
          </div>
          <div class="adm-field">
            <label>Icon Emoji</label>
            <input type="text" id="admEvIcon" value="${esc(evDraft.icon || '🎉')}" maxlength="8">
          </div>
          <div class="adm-field">
            <label>Theme Accent</label>
            <select id="admEvAccent">
              <option value="emerald" ${evDraft.themeAccent === 'emerald' ? 'selected' : ''}>💚 Emerald Neon</option>
              <option value="gold" ${evDraft.themeAccent === 'gold' ? 'selected' : ''}>👑 Royal Gold</option>
              <option value="violet" ${evDraft.themeAccent === 'violet' ? 'selected' : ''}>🌌 Cosmic Violet</option>
              <option value="cyber" ${evDraft.themeAccent === 'cyber' ? 'selected' : ''}>💎 Cyber Blue</option>
              <option value="crimson" ${evDraft.themeAccent === 'crimson' ? 'selected' : ''}>🔥 Crimson Dragon</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Community Metric</label>
            <select id="admEvMetric">
              <option value="combined_activity" ${evDraft.metric === 'combined_activity' ? 'selected' : ''}>⚡ All Community Activity</option>
              <option value="messages_sent" ${evDraft.metric === 'messages_sent' ? 'selected' : ''}>💬 AI Messages Sent</option>
              <option value="images_created" ${evDraft.metric === 'images_created' ? 'selected' : ''}>🎨 AI Images Created</option>
              <option value="lokicode_runs" ${evDraft.metric === 'lokicode_runs' ? 'selected' : ''}>💻 LokiCode Builds</option>
            </select>
          </div>
          <div class="adm-field">
            <label>Total Goal Target</label>
            <input type="number" id="admEvGoal" min="1" max="10000000" value="${Number(evDraft.goalTarget || 150)}">
          </div>
          <div class="adm-field">
            <label>Event Duration (Days)</label>
            <input type="number" id="admEvDays" min="1" max="365" value="${endsDaysVal}">
          </div>
          <div class="adm-field adm-ev-span2">
            <label>Hero Headline</label>
            <input type="text" id="admEvHeadline" value="${esc(evDraft.headline || '')}">
          </div>
          <div class="adm-field adm-ev-span2">
            <label>Subtitle</label>
            <input type="text" id="admEvSubtitle" value="${esc(evDraft.subtitle || '')}">
          </div>
          <div class="adm-field adm-ev-spanfull">
            <label>Event Story &amp; Community Rules (Markdown)</label>
            <textarea id="admEvStory" rows="2">${esc(evDraft.storyMarkdown || '')}</textarea>
          </div>

          <div class="adm-ev-tiers-box adm-ev-spanfull">
            <div class="adm-ev-tiers-head">
              <b>🏆 Community Milestone Tiers &amp; Rewards (${evTiers.length})</b>
              <button type="button" class="btn-ghost" id="admEvAddTierBtn">+ Add Milestone Tier</button>
            </div>
            <div class="adm-ev-tiers-list">
              ${evTiers.map((t, idx) => `
                <div class="adm-ev-tier-row" data-tier-idx="${idx}">
                  <input type="text" class="adm-ev-t-emoji" value="${esc(t.badgeEmoji || '🏆')}" maxlength="6" title="Tier Emoji">
                  <input type="text" class="adm-ev-t-title" value="${esc(t.title || '')}" placeholder="Tier Title">
                  <input type="number" class="adm-ev-t-target" min="1" value="${Number(t.targetProgress || 50)}" title="Target Progress">
                  <select class="adm-ev-t-rtype">
                    <option value="plan" ${t.rewardType === 'plan' ? 'selected' : ''}>💎 Plan Subscription</option>
                    <option value="tokens" ${t.rewardType === 'tokens' ? 'selected' : ''}>🎁 Bonus Tokens</option>
                    <option value="custom" ${t.rewardType === 'custom' ? 'selected' : ''}>🏅 Profile Badge</option>
                  </select>
                  ${t.rewardType === 'plan' ? `
                    <select class="adm-ev-t-rplan">
                      <option value="pro" ${t.rewardPlan !== 'ultimate' ? 'selected' : ''}>Loki Pro</option>
                      <option value="ultimate" ${t.rewardPlan === 'ultimate' ? 'selected' : ''}>✦ Loki Ultimate</option>
                    </select>
                    <select class="adm-ev-t-dmode">
                      <option value="timed" ${t.durationMode !== 'permanent' ? 'selected' : ''}>Timed</option>
                      <option value="permanent" ${t.durationMode === 'permanent' ? 'selected' : ''}>Permanent</option>
                    </select>
                    ${t.durationMode !== 'permanent' ? `
                      <input type="number" class="adm-ev-t-damt" min="1" max="365" value="${Number(t.durationAmount || 3)}">
                      <select class="adm-ev-t-dunit">
                        <option value="days" ${t.durationUnit === 'days' ? 'selected' : ''}>Days</option>
                        <option value="weeks" ${t.durationUnit === 'weeks' ? 'selected' : ''}>Weeks</option>
                        <option value="months" ${t.durationUnit === 'months' ? 'selected' : ''}>Months</option>
                        <option value="years" ${t.durationUnit === 'years' ? 'selected' : ''}>Years</option>
                      </select>
                    ` : ''}
                  ` : t.rewardType === 'tokens' ? `
                    <input type="number" class="adm-ev-t-tok" min="1000" step="5000" value="${Number(t.bonusTokens || 25000)}" placeholder="Tokens">
                  ` : `
                    <input type="text" class="adm-ev-t-custom" value="${esc(t.customRewardText || t.title || '')}" placeholder="Badge / Perk name">
                  `}
                  <input type="text" class="adm-ev-t-desc" value="${esc(t.description || '')}" placeholder="Description shown to community">
                  ${evTiers.length > 1 ? `<button type="button" class="adm-mini-btn adm-ev-t-del" data-del-tier="${idx}" title="Remove tier">✕</button>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="adm-ev-launch-bar adm-ev-spanfull">
            <span class="muted" style="font-size:.8rem;">Applying launches the live button in every user's top bar and announces it across all connected screens.</span>
            <button type="submit" class="btn-primary" id="admEvApplyBtn" ${adminEventApplyBusy ? 'disabled' : ''}>
              ${adminEventApplyBusy ? '⏳ Launching Live…' : '🚀 Apply & Launch Event Live'}
            </button>
          </div>
        </form>
      </div>

      <div class="adm-bcast-grid" style="margin-top:14px;">
        <form class="adm-bcast-card" id="admMotdForm">
          <div class="adm-card-badge">📌 GLOBAL PINNED TOP RIBBON (MOTD)</div>
          <h3>Live Pinned Banner Across All Screens</h3>
          <div class="adm-form-row">
            <label class="lc-check"><input type="checkbox" id="admMotdEnabled" ${pCfg.motdEnabled ? 'checked' : ''}> <span>Enable Top Pinned Ribbon Live</span></label>
            <select id="admMotdTheme">
              <option value="emerald" ${pCfg.motdTheme === 'emerald' ? 'selected' : ''}>💚 Emerald Neon</option>
              <option value="gold" ${pCfg.motdTheme === 'gold' ? 'selected' : ''}>👑 Royal Gold</option>
              <option value="cyber" ${pCfg.motdTheme === 'cyber' ? 'selected' : ''}>💎 Cyber Blue</option>
              <option value="crimson" ${pCfg.motdTheme === 'crimson' ? 'selected' : ''}>🚨 Crimson Alert</option>
            </select>
          </div>
          <div class="adm-field" style="margin-top:10px;">
            <label>Ribbon Announcement Text</label>
            <input type="text" id="admMotdTextInput" value="${esc(pCfg.motdText || '')}" placeholder="e.g. 🚀 Lokizenith v4.0 Turbo is live! Use code LokizenAI for bonus tokens!">
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button type="submit" class="btn-primary">📌 Update Global Ribbon</button>
          </div>
        </form>

        <div class="adm-bcast-card">
          <div class="adm-card-badge gold">🎰 LIVE FUN EVENTS &amp; TOKEN RAIN</div>
          <h3>Trigger Global Token Rain or Lucky Mystery Drop</h3>
          <p class="muted" style="font-size:.82rem;margin:0 0 10px;">Reward a random online user or rain bonus tokens on every account simultaneously!</p>
          <div class="adm-form-row">
            <div class="adm-field">
              <label>Bonus Tokens Amount</label>
              <input type="number" id="admEventTokens" value="25000" min="1000" step="5000">
            </div>
            <div class="adm-field">
              <label>Mystery Drop Pool</label>
              <select id="admMysteryPool">
                <option value="online">🟢 Online Users Only</option>
                <option value="all">🌍 All Registered Accounts</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
            <button type="button" class="btn-primary" id="admTriggerMysteryBtn">🎰 Spin Lucky Mystery Drop</button>
            <button type="button" class="btn-ghost" id="admTriggerTokenRainBtn">🌧 Rain Tokens on Everyone</button>
          </div>
        </div>
      </div>

      <div class="adm-bcast-lists-grid" style="margin-top:14px;">
        <div class="adm-bcast-list-box">
          <h4>💬 Active Team Chats (${(ov.teamChats || []).length})</h4>
          ${(ov.teamChats || []).length ? (ov.teamChats || []).map(c => `
            <div class="adm-sched-item">
              <div>
                <b>${esc(c.name)}</b> <span class="adm-mini-tag">${c.messageCount} msgs</span>
                <small class="adm-subline">Owner: @${esc(c.ownerUsername)} · Members: ${(c.memberUsernames || []).join(', ')}</small>
              </div>
            </div>
          `).join('') : `<div class="muted" style="padding:12px;">No team chats created yet.</div>`}
        </div>
        <div class="adm-bcast-list-box">
          <h4>⚡ Active LokiCode Teams (${(ov.lokiTeams || []).length})</h4>
          ${(ov.lokiTeams || []).length ? (ov.lokiTeams || []).map(t => `
            <div class="adm-sched-item">
              <div>
                <b>${esc(t.name)}</b> <span class="adm-mini-tag">${esc(t.lang)}</span>
                <small class="adm-subline">Owner: @${esc(t.ownerUsername)} · Members: ${(t.memberUsernames || []).join(', ')}</small>
              </div>
            </div>
          `).join('') : `<div class="muted" style="padding:12px;">No LokiCode teams created yet.</div>`}
        </div>
      </div>
    `;
  };

  // Tab 10: Data Vault, Eternal Persistence & Admin Power Tools
  const fmtBytes = (b) => {
    const n = Number(b) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };
  const fmtMdLite = (md) => {
    const safe = esc(md || '');
    return safe
      .replace(/^###\s+(.+)$/gm, '<h4 style="margin:0 0 8px;color:#00ff9c;font-size:.95rem;">$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<b style="color:#fff;">$1</b>')
      .replace(/^\-\s+(.+)$/gm, '<div style="margin:4px 0 4px 10px;">• $1</div>')
      .replace(/\n/g, '<br>');
  };
  const renderMaintenanceTab = () => {
    const pCfg = ov.platformConfig || state.platformConfig || {};
    const curM = resolveMaintenanceStateClient(pCfg, Date.now());
    return `
      <div class="adm-maint-shell">
        <div class="adm-maint-hero ${curM.active ? 'is-active' : ''}">
          <div class="adm-maint-hero-top">
            <div>
              <div class="adm-card-badge" style="background:rgba(245,158,11,.18);border-color:rgba(245,158,11,.45);color:#fde68a;">
                🚧 DEDICATED MAINTENANCE STUDIO &amp; REAL-TIME PLATFORM LOCK
              </div>
              <h3>Lock Platform with Live Countdown &amp; Automated Release Notes</h3>
              <p class="muted" style="font-size:.84rem;margin:4px 0 0;">Non-admins see an unclosable full-screen maintenance overlay with live countdown (weeks, days, hours, mins, secs) and your release notes. <b>It closes automatically when the timer reaches 0</b>, even for offline accounts returning later! Admins bypass automatically.</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <button type="button" class="btn-ghost" id="admMaintPreviewInsideBtn">👁 Preview User Screen</button>
              ${curM.active ? `
                <button type="button" class="btn-primary" id="admMaintEndNowBtn" style="background:#ef4444;border-color:#f87171;">⏹ End Maintenance Now</button>
              ` : ''}
            </div>
          </div>

          <div class="adm-maint-hero-stats">
            <div class="adm-maint-stat">
              <small>Status</small>
              <b style="color:${curM.active ? '#fde68a' : '#00ff9c'}">${curM.active ? '🟢 ACTIVE LOCK' : '⚪ OFF (Normal Access)'}</b>
            </div>
            <div class="adm-maint-stat">
              <small>Remaining Time</small>
              <b style="color:#00ff9c;">${curM.active ? curM.remainingLabel : 'N/A'}</b>
            </div>
            <div class="adm-maint-stat">
              <small>Scheduled By</small>
              <b>@${esc(curM.updatedBy || 'Admin')}</b>
            </div>
            <div class="adm-maint-stat">
              <small>Auto-Close Target</small>
              <b>${curM.endsAt > 0 ? new Date(curM.endsAt).toLocaleTimeString() : 'Manual Stop'}</b>
            </div>
          </div>
        </div>

        <form class="adm-bcast-card adm-maint-card" id="admMaintForm">
          <div class="adm-card-badge" style="background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4);color:#fde68a;">
            ⚙ MAINTENANCE CONTROLS &amp; TIMER STUDIO
          </div>
          <h3>Configure Maintenance Lock &amp; Schedule</h3>

          <div class="adm-field" style="margin-top:10px;">
            <label>Maintenance Mode Switch</label>
            <label class="lc-check" style="background:rgba(245,158,11,.08);padding:10px 14px;border-radius:12px;border:1px solid rgba(245,158,11,.3);">
              <input type="checkbox" id="admMaintActiveChk" ${pCfg.maintenanceMode ? 'checked' : ''}>
              <span style="color:#fde68a;font-weight:700;font-size:.92rem;">🚧 Activate Maintenance Lock (Blocks non-admins platform-wide)</span>
            </label>
          </div>

          <div class="adm-field" style="margin-top:12px;">
            <label>Maintenance Title / Heading</label>
            <input type="text" id="admMaintTitleInput" value="${esc(pCfg.maintenanceTitle || 'Scheduled Platform Upgrade')}" placeholder="e.g. Lokizenith v4.9 Turbo Engine &amp; Data Vault Rollout" required>
          </div>

          <div class="adm-form-row" style="margin-top:12px;">
            <div class="adm-field">
              <label>Duration Amount</label>
              <input type="number" id="admMaintDurAmt" value="${Number(pCfg.maintenanceDurationAmount) || 15}" min="1" max="3650" required>
            </div>
            <div class="adm-field">
              <label>Duration Unit</label>
              <select id="admMaintDurUnit">
                <option value="minutes" ${(pCfg.maintenanceDurationUnit || 'minutes') === 'minutes' ? 'selected' : ''}>Minutes (דקות)</option>
                <option value="hours" ${pCfg.maintenanceDurationUnit === 'hours' ? 'selected' : ''}>Hours (שעות)</option>
                <option value="days" ${pCfg.maintenanceDurationUnit === 'days' ? 'selected' : ''}>Days (ימים)</option>
                <option value="weeks" ${pCfg.maintenanceDurationUnit === 'weeks' ? 'selected' : ''}>Weeks (שבועות)</option>
              </select>
            </div>
          </div>

          <div class="adm-dur-preset-pills" style="margin-top:8px;">
            <span style="font-size:.74rem;color:#94a3b8;font-weight:600;">Quick Presets:</span>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="15:minutes">15m</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="30:minutes">30m</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="1:hours">1h</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="2:hours">2h</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="6:hours">6h</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="1:days">1 Day</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="3:days">3 Days</button>
            <button type="button" class="adm-dur-preset-btn" data-mpreset="1:weeks">1 Week</button>
          </div>

          <div class="adm-field" style="margin-top:14px;">
            <label>✨ AI Changelog &amp; Release Article Drafter (Prompt what you are adding)</label>
            <div style="display:flex;gap:8px;margin-top:4px;">
              <input type="text" id="admMaintAiPrompt" value="${esc(adminMaintAiPrompt)}" placeholder="e.g. Adding new power tools, socket disconnects, faster streaming &amp; permanent data persistence" style="flex:1;">
              <button type="button" class="btn-primary" id="admMaintAiDraftBtn" ${adminMaintAiBusy ? 'disabled' : ''}>
                ${adminMaintAiBusy ? '⏳ AI Drafting…' : '✨ AI Write Article'}
              </button>
            </div>
          </div>

          <div class="adm-field" style="margin-top:12px;">
            <label>Article Body (What you are adding · Supports Markdown &amp; Bullets)</label>
            <textarea id="admMaintArticleInput" rows="6" placeholder="Write what you are adding in this update...&#10;• Faster AI streaming&#10;• New power tools in Admin Panel&#10;• Automatic data vault protection" required>${esc(pCfg.maintenanceArticle || '')}</textarea>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px;">
            <button type="button" class="btn-ghost" id="admMaintPreviewBtn2">👁 Preview What Users Will See</button>
            <button type="submit" class="btn-primary" style="background:#f59e0b;border-color:#fbbf24;color:#000;font-weight:800;padding:11px 22px;">
              🚀 Apply Maintenance Settings &amp; Timer Live
            </button>
          </div>
        </form>
      </div>
    `;
  };
  const renderVaultTab = () => {
    const vs = ov.vaultStatus || { schemaVersion: 3, locations: {}, totals: {}, snapshots: [] };
    const loc = vs.locations || {};
    const tot = vs.totals || {};
    const snaps = Array.isArray(vs.snapshots) ? vs.snapshots : [];
    const pCfg = ov.platformConfig || state.platformConfig || {};
    const fbUser = (window.LokiFirebase && window.LokiFirebase.getCurrentUser) ? window.LokiFirebase.getCurrentUser() : null;
    const savedStr = vs.lastSavedAt ? new Date(vs.lastSavedAt).toLocaleString() : 'Live';
    return `
      <div class="adm-vault-shell">
        <div class="adm-vault-hero">
          <div class="adm-vault-hero-top">
            <div>
              <div class="adm-card-badge">🗄 TRIPLE-LAYER ETERNAL DATA PERSISTENCE</div>
              <h3>Accounts, Conversations, Subscriptions &amp; Config Protected Across Updates</h3>
              <small class="muted">Schema <b>v${vs.schemaVersion || 3}</b> · Atomic Disk Writes: <b>${Number(vs.saveCount || 0).toLocaleString()}</b> · Last Flushed: <b>${esc(savedStr)}</b></small>
            </div>
            <div class="adm-vault-actions-bar">
              <button type="button" class="btn-ghost" id="admVaultExportBtn">⬇ Export Eternal JSON Backup</button>
              <label class="btn-ghost adm-file-upload-btn" title="Import a saved JSON backup">
                📥 Import JSON Backup
                <input type="file" id="admVaultImportInput" accept="application/json,.json">
              </label>
              <select id="admVaultImportMode" class="lct-select" style="min-height:36px;" title="Import strategy">
                <option value="merge">🛡 Merge Safely (Keep Existing + Restore Missing)</option>
                <option value="replace">⚠ Full Replace Snapshot</option>
              </select>
            </div>
          </div>

          <div class="adm-vault-loc-grid">
            <div class="adm-vault-loc-card ${loc.primaryExists ? 'ok' : ''}">
              <b><span>💾 Primary App Store + WAL Journal</span><span>${loc.primaryExists ? '🟢 Live' : '⚪ Pending'}</span></b>
              <code>${esc(loc.primaryPath || '.lz-data/store.json')}</code>
              <small>${fmtBytes(loc.primaryBytes)} · ${tot.usersCount || 0} accounts · ${tot.convsCount || 0} chats (${tot.messagesCount || 0} msgs) · WAL #${vs.walSeq || 0}</small>
            </div>
            <div class="adm-vault-loc-card ${loc.externalMirrorExists ? 'ok' : ''}">
              <b><span>🛡 Off-Workspace Survivor Mirror</span><span>${loc.externalMirrorExists ? '🟢 Mirrored' : '⚪ Pending'}</span></b>
              <code>${esc(loc.externalMirrorPath || '~/.lokizenith-vault/store.json')}</code>
              <small>${fmtBytes(loc.externalMirrorBytes)} · Survives workspace wipes &amp; code updates automatically</small>
            </div>
            <div class="adm-vault-loc-card ${fbUser ? 'ok' : ''}">
              <b><span>☁ Firebase Cloud Perpetual Vault</span><span>${fbUser ? '🟢 Connected' : '🔐 Sign In Needed'}</span></b>
              <code>${fbUser ? esc(fbUser.email || fbUser.uid) : 'platformVaultAccounts/* (Admin-only)'}</code>
              <small>${fbUser ? 'Ready for instant Cloud Push &amp; Cross-Device Restore' : 'Connect Google Admin popup on Push/Pull to sync to Firestore'}</small>
            </div>
          </div>
        </div>

        <div class="adm-vault-grid">
          <div class="adm-bcast-card">
            <div class="adm-card-badge">📸 SERVER SNAPSHOT TIME-MACHINE (${snaps.length})</div>
            <h3>Rolling Atomic &amp; Pre-Update Backups</h3>
            <div class="adm-form-row" style="margin-bottom:10px;">
              <input type="text" id="admVaultSnapLabel" placeholder="Snapshot label (e.g. before-v5-update)" style="flex:1;min-width:170px;">
              <button type="button" class="btn-primary" id="admVaultCreateSnapBtn">+ Create Snapshot Now</button>
            </div>
            <div class="adm-snap-list">
              ${snaps.length ? snaps.map(s => `
                <div class="adm-snap-row ${String(s.filename).includes('pre-update') ? 'pre-update' : ''}">
                  <div class="adm-snap-meta">
                    <b>${esc(s.filename)}</b>
                    <small>${new Date(s.createdAt).toLocaleString()} · ${fmtBytes(s.bytes)} · ${s.location === 'vault' ? '🛡 Mirror' : '💾 Primary'}</small>
                  </div>
                  <div class="adm-snap-acts">
                    <button type="button" class="adm-mini-btn adm-snap-restore" data-snap-file="${esc(s.filename)}" data-snap-mode="merge">🛡 Merge Restore</button>
                    <button type="button" class="adm-mini-btn adm-snap-restore" data-snap-file="${esc(s.filename)}" data-snap-mode="replace" style="border-color:rgba(251,191,36,.4);color:#fde68a;">↺ Full</button>
                  </div>
                </div>
              `).join('') : '<div class="muted" style="padding:12px;">No snapshots yet — click Create Snapshot Now above.</div>'}
            </div>
          </div>

          <div class="adm-bcast-card">
            <div class="adm-card-badge gold">☁ FIREBASE CLOUD PERPETUAL VAULT</div>
            <h3>Off-Site Encrypted Cloud Sync &amp; Recovery</h3>
            <p class="muted" style="font-size:.82rem;margin:0 0 12px;">Sync all user accounts, active subscriptions, Stark permissions, token balances, and chat archives into Firestore <code>platformVaultAccounts</code>.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn-primary" id="admVaultCloudPushBtn" ${adminCloudSyncBusy ? 'disabled' : ''}>
                ${adminCloudSyncBusy ? '⏳ Syncing Cloud Vault…' : '☁ Push All Accounts to Cloud Vault'}
              </button>
              <button type="button" class="btn-ghost" id="admVaultCloudPullBtn" ${adminCloudSyncBusy ? 'disabled' : ''}>
                ⬇ Restore From Cloud Vault (Merge)
              </button>
            </div>
            <div style="margin-top:12px;padding:10px 12px;border-radius:11px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);font-size:.78rem;color:#cbd5e1;">
              <b>Automatic Protection Active:</b>
              <div style="margin-top:4px;color:#94a3b8;line-height:1.45;">
                • <b>pre-update</b> snapshots run automatically on schema upgrades.<br>
                • Every save writes atomically to both workspace storage &amp; off-workspace mirror.<br>
                • Personal user workspace chats sync to <code>accountVaults/{uid}</code> on every chat save.
              </div>
            </div>
          </div>

          <form class="adm-bcast-card" id="admBulkForm">
            <div class="adm-card-badge">⚡ BULK USER OPERATIONS STUDIO</div>
            <h3>Mass-Apply Actions Across User Segments</h3>
            <div class="adm-form-row">
              <div class="adm-field">
                <label>Target Segment</label>
                <select id="admBulkSegment">
                  <option value="all">🌍 All Non-Banned Users</option>
                  <option value="free">🌱 Free Tier Users Only</option>
                  <option value="pro">💎 Pro Tier Users Only</option>
                  <option value="ultimate">✦ Ultimate Tier Users Only</option>
                  <option value="online">🟢 Online Users Right Now</option>
                  <option value="banned">⛔ Banned Users</option>
                </select>
              </div>
              <div class="adm-field">
                <label>Bulk Action</label>
                <select id="admBulkAction">
                  <option value="gift_tokens">🎁 Gift Bonus Tokens</option>
                  <option value="grant_plan">💎 Assign Plan (Timed / Permanent)</option>
                  <option value="reset_quotas">⚡ Reset 6h Usage Quotas</option>
                  <option value="stark_auth_on">✨ Grant Stark Authorization</option>
                  <option value="stark_auth_off">🔒 Revoke Stark Authorization</option>
                </select>
              </div>
            </div>
            <div class="adm-form-row" style="margin-top:10px;">
              <div class="adm-field">
                <label>Token Amount (if gifting)</label>
                <input type="number" id="admBulkAmount" value="25000" min="1000" step="5000">
              </div>
              <div class="adm-field">
                <label>Plan Tier (if assigning plan)</label>
                <select id="admBulkPlan">
                  <option value="pro">💎 Loki Pro</option>
                  <option value="ultimate">✦ Loki Ultimate</option>
                  <option value="free">🌱 Free</option>
                </select>
              </div>
            </div>
            <div class="adm-form-row" style="margin-top:10px;">
              <div class="adm-field">
                <label>Duration Mode</label>
                <select id="admBulkDurMode">
                  <option value="timed">⏱ Timed Duration</option>
                  <option value="permanent">♾ Permanent</option>
                </select>
              </div>
              <div class="adm-field">
                <label>Length &amp; Unit</label>
                <div style="display:flex;gap:6px;">
                  <input type="number" id="admBulkDurAmt" value="7" min="1" max="365" style="width:76px;">
                  <select id="admBulkDurUnit">
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
              <button type="submit" class="btn-primary" id="admBulkSubmitBtn" ${adminBulkBusy ? 'disabled' : ''}>
                ${adminBulkBusy ? '⏳ Applying…' : '⚡ Execute Bulk Operation'}
              </button>
            </div>
          </form>

          <form class="adm-bcast-card" id="admDirectNoticeForm">
            <div class="adm-card-badge">📩 DIRECT ADMIN NOTICE &amp; TOKEN DROP</div>
            <h3>Send Modal Pop-up &amp; Optional Bonus Tokens to One User</h3>
            <div class="adm-form-row">
              <div class="adm-field">
                <label>Recipient User</label>
                <select id="admDirectTarget">
                  ${allUsers.map(u => `<option value="${esc(u.username)}">@${esc(u.username)} (${u.online ? '🟢 Online' : 'Offline'})</option>`).join('')}
                </select>
              </div>
              <div class="adm-field">
                <label>Optional Bonus Tokens</label>
                <input type="number" id="admDirectTokens" value="0" min="0" step="5000">
              </div>
            </div>
            <div class="adm-field" style="margin-top:8px;">
              <label>Popup Title</label>
              <input type="text" id="admDirectTitle" value="📩 Direct Message from Root Admin" required>
            </div>
            <div class="adm-field" style="margin-top:8px;">
              <label>Message Body</label>
              <textarea id="admDirectMessage" rows="2" placeholder="Write a personal note or reward message..." required></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:10px;">
              <button type="submit" class="btn-primary">📩 Send Direct Notice Live</button>
            </div>
          </form>

          <form class="adm-bcast-card" id="admAnalystForm">
            <div class="adm-card-badge">🤖 AI ADMIN INTELLIGENCE ANALYST</div>
            <h3>Ask Live Questions About Platform Health, Growth &amp; Power Users</h3>
            <div class="adm-analyst-presets">
              <button type="button" class="adm-mini-btn adm-analyst-preset" data-aq="Summarize active users, top token consumers, subscription breakdown, and storage health.">📊 Full Health Digest</button>
              <button type="button" class="adm-mini-btn adm-analyst-preset" data-aq="Which free users are hitting limits most and might convert to Pro or Ultimate?">💎 Upgrade Candidates</button>
              <button type="button" class="adm-mini-btn adm-analyst-preset" data-aq="Review recent audit logs for suspicious logins, bans, or permission changes.">🛡 Security Review</button>
            </div>
            <div class="adm-form-row">
              <input type="text" id="admAnalystInput" value="${esc(adminAnalystQuestion)}" placeholder="Ask anything about your users, plans, tokens, or audit logs..." style="flex:1;min-width:200px;">
              <button type="submit" class="btn-primary" id="admAnalystSubmitBtn" ${adminAnalystBusy ? 'disabled' : ''}>
                ${adminAnalystBusy ? '⏳ Analyzing…' : '🤖 Analyze Live'}
              </button>
            </div>
            ${adminAnalystReport ? `<div class="adm-analyst-output" id="admAnalystOutput">${fmtMdLite(adminAnalystReport)}</div>` : ''}
          </form>

          <!-- 🚧 TIMED PLATFORM MAINTENANCE STUDIO & RELEASE ARTICLE BUILDER -->
          <form class="adm-bcast-card adm-maint-card" id="admMaintForm">
            <div class="adm-card-badge" style="background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.4);color:#fde68a;">
              🚧 TIMED PLATFORM MAINTENANCE STUDIO &amp; RELEASE ARTICLE BUILDER
            </div>
            <h3>Lock Platform for Non-Admins with Real-Time Countdown &amp; Feature Article</h3>
            <p class="muted" style="font-size:.82rem;margin:0 0 12px;">Non-admins see an unclosable full-screen maintenance overlay with live countdown (weeks, days, hours, mins, secs) and your release notes. <b>It closes automatically when the timer reaches 0</b>, even for offline accounts that come back online! Admins bypass automatically.</p>

            ${(() => {
              const curM = resolveMaintenanceStateClient(pCfg, Date.now());
              if (curM.active) {
                return `
                  <div class="adm-maint-live-banner">
                    <div>
                      <b style="color:#fde68a;">🟢 MAINTENANCE ACTIVE: ${esc(curM.title)}</b>
                      <div style="font-size:.76rem;color:#cbd5e1;margin-top:2px;">
                        Remaining: <b style="color:#00ff9c;">${curM.remainingLabel}</b> · Scheduled by @${esc(curM.updatedBy)} · Ends at ${curM.endsAt > 0 ? new Date(curM.endsAt).toLocaleTimeString() : 'Manual Stop'}
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;">
                      <button type="button" class="btn-ghost" id="admMaintPreviewInsideBtn">👁 Preview User Screen</button>
                      <button type="button" class="btn-primary" id="admMaintEndNowBtn" style="background:#ef4444;border-color:#f87171;">⏹ End Maintenance Now</button>
                    </div>
                  </div>
                `;
              }
              return `
                <div class="adm-maint-live-banner off">
                  <span>⚪ Maintenance Mode is currently <b>OFF</b> (All users have active access)</span>
                  <button type="button" class="btn-ghost" id="admMaintPreviewInsideBtn">👁 Preview User Screen</button>
                </div>
              `;
            })()}

            <div class="adm-field">
              <label>Maintenance Mode Status</label>
              <label class="lc-check" style="background:rgba(245,158,11,.08);padding:8px 12px;border-radius:10px;border:1px solid rgba(245,158,11,.25);">
                <input type="checkbox" id="admMaintActiveChk" ${pCfg.maintenanceMode ? 'checked' : ''}>
                <span style="color:#fde68a;font-weight:700;">🚧 Activate Maintenance Lock (Non-admins blocked until timer reaches 0)</span>
              </label>
            </div>

            <div class="adm-field" style="margin-top:10px;">
              <label>Maintenance Title</label>
              <input type="text" id="admMaintTitleInput" value="${esc(pCfg.maintenanceTitle || 'Scheduled Platform Upgrade')}" placeholder="e.g. Lokizenith v4.9 Turbo Engine &amp; Data Vault Rollout" required>
            </div>

            <div class="adm-form-row" style="margin-top:10px;">
              <div class="adm-field">
                <label>Duration Amount</label>
                <input type="number" id="admMaintDurAmt" value="${Number(pCfg.maintenanceDurationAmount) || 15}" min="1" max="3650" required>
              </div>
              <div class="adm-field">
                <label>Duration Unit</label>
                <select id="admMaintDurUnit">
                  <option value="minutes" ${(pCfg.maintenanceDurationUnit || 'minutes') === 'minutes' ? 'selected' : ''}>Minutes (דקות)</option>
                  <option value="hours" ${pCfg.maintenanceDurationUnit === 'hours' ? 'selected' : ''}>Hours (שעות)</option>
                  <option value="days" ${pCfg.maintenanceDurationUnit === 'days' ? 'selected' : ''}>Days (ימים)</option>
                  <option value="weeks" ${pCfg.maintenanceDurationUnit === 'weeks' ? 'selected' : ''}>Weeks (שבועות)</option>
                </select>
              </div>
            </div>

            <div class="adm-dur-preset-pills">
              <span style="font-size:.74rem;color:#94a3b8;font-weight:600;">Quick Presets:</span>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="15:minutes">15m</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="30:minutes">30m</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="1:hours">1h</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="2:hours">2h</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="6:hours">6h</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="1:days">1 Day</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="3:days">3 Days</button>
              <button type="button" class="adm-dur-preset-btn" data-mpreset="1:weeks">1 Week</button>
            </div>

            <div class="adm-field" style="margin-top:12px;">
              <label>✨ AI Changelog &amp; Release Article Drafter (Prompt what you are adding)</label>
              <div style="display:flex;gap:8px;">
                <input type="text" id="admMaintAiPrompt" value="${esc(adminMaintAiPrompt)}" placeholder="e.g. Adding new power tools, socket disconnects, faster streaming &amp; permanent data persistence" style="flex:1;">
                <button type="button" class="btn-primary" id="admMaintAiDraftBtn" ${adminMaintAiBusy ? 'disabled' : ''}>
                  ${adminMaintAiBusy ? '⏳ AI Drafting…' : '✨ AI Write Article'}
                </button>
              </div>
            </div>

            <div class="adm-field" style="margin-top:10px;">
              <label>Article Body (What you are adding · Supports Markdown &amp; Bullets)</label>
              <textarea id="admMaintArticleInput" rows="5" placeholder="Write what you are adding in this update...&#10;• Faster AI streaming&#10;• New power tools in Admin Panel&#10;• Automatic data vault protection" required>${esc(pCfg.maintenanceArticle || '')}</textarea>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;flex-wrap:wrap;gap:10px;">
              <button type="button" class="btn-ghost" id="admMaintPreviewBtn2">👁 Preview What Users Will See</button>
              <button type="submit" class="btn-primary" style="background:#f59e0b;border-color:#fbbf24;color:#000;font-weight:800;">
                🚀 Apply Maintenance Settings &amp; Timer Live
              </button>
            </div>
          </form>

          <!-- 🧠 GLOBAL AI DIRECTIVE & PLATFORM CONTROLS -->
          <form class="adm-bcast-card" id="admPlatformGuardsForm">
            <div class="adm-card-badge">🧠 GLOBAL AI DIRECTIVE &amp; PLATFORM CONTROLS</div>
            <h3>Direct AI Behavior Platform-Wide, Sign-Ups, Google OAuth &amp; Limits</h3>
            
            <div class="adm-field">
              <label>Global AI System Directive (Applies instantly to all AI Chat &amp; Coding responses)</label>
              <textarea id="admGlobalDirectiveInput" rows="2" placeholder="e.g. Provide concise executive bullet points first, cite mathematical proofs when relevant, and emphasize speed.">${esc(pCfg.globalAiDirective || '')}</textarea>
              <small class="muted">Injected dynamically into system instructions for all models without restarting the server.</small>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;margin:12px 0 10px;">
              <label class="lc-check" style="background:rgba(0,255,156,.08);padding:6px 12px;border-radius:10px;border:1px solid rgba(0,255,156,.25);">
                <input type="checkbox" id="admGlobalStarkChk" ${pCfg.globalStarkUnlocked ? 'checked' : ''}>
                <span style="color:#00ff9c;font-weight:700;">✨ Global Lokizen 4.0 Stark Free Pass (Temporarily unlock Stark for all Free users)</span>
              </label>
              <label class="lc-check"><input type="checkbox" id="admAllowRegChk" ${pCfg.allowRegistrations !== false ? 'checked' : ''}> <span>Allow New Account Registrations</span></label>
              <label class="lc-check"><input type="checkbox" id="admAllowGoogleChk" ${pCfg.allowGoogleOAuth !== false ? 'checked' : ''}> <span>Allow Google Sign-In</span></label>
            </div>

            <div class="adm-form-row" style="margin-top:8px;">
              <div class="adm-field">
                <label>Default 6h Token Limit</label>
                <input type="number" id="admDefLimitInput" value="${Number(pCfg.defaultDailyLimit || 25000)}" min="5000" step="5000">
              </div>
              <div class="adm-field">
                <label>Referral Invite Bonus</label>
                <input type="number" id="admRefBonusInput" value="${Number(pCfg.referralBonus || 25000)}" min="1000" step="5000">
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:12px;">
              <button type="submit" class="btn-primary">💾 Save Platform &amp; AI Directives</button>
            </div>
          </form>

          <!-- ⚡ LIVE ACTIVE SOCKETS, SESSIONS & SECURITY POWER TOOLS -->
          <div class="adm-bcast-card" id="admActiveSocketsCard">
            <div class="adm-card-badge">⚡ LIVE ACTIVE SOCKETS &amp; SECURITY POWER TOOLS</div>
            <h3>Real-Time Connected Sessions, Socket Killswitch &amp; Stale Session Purge</h3>
            
            ${(() => {
              const pb = ov.planBreakdown || {};
              return `
                <div class="adm-plan-breakdown-bar">
                  <div class="adm-pbreak-card"><small>Free Users</small><b>${pb.free ?? 0}</b></div>
                  <div class="adm-pbreak-card"><small>💎 Pro Users</small><b style="color:#00ff9c;">${pb.pro ?? 0}</b></div>
                  <div class="adm-pbreak-card"><small>✦ Ultimate</small><b style="color:#fde68a;">${pb.ultimate ?? 0}</b></div>
                  <div class="adm-pbreak-card"><small>PayPal Active</small><b>${pb.paypalActive ?? 0}</b></div>
                  <div class="adm-pbreak-card"><small>Admin Assigned</small><b>${pb.adminGranted ?? 0}</b></div>
                  <div class="adm-pbreak-card"><small>Stark Authorized</small><b style="color:#38bdf8;">${pb.starkAuthorized ?? 0}</b></div>
                </div>
              `;
            })()}

            <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 4px;">
              <b>Connected Sockets Right Now (${(ov.activeConnections || []).length}):</b>
              <small class="muted">Live WebSocket connections receiving real-time broadcasts</small>
            </div>

            <div class="adm-sockets-list">
              ${(ov.activeConnections || []).length ? (ov.activeConnections || []).map(conn => `
                <div class="adm-socket-row">
                  <div class="adm-socket-meta">
                    <span class="adm-presence-dot on"></span>
                    <b>@${esc(conn.username)}</b>
                    ${getPlanTagHtml(conn.plan, 'sm', conn.username)}
                    <span class="muted" style="font-size:.72rem;">${fmtDeviceLine(conn.deviceInfo)} · ${conn.socketsCount} tab(s) · Active ${fmtDurationLong((Date.now() - conn.connectedAt) / 1000)}</span>
                  </div>
                  <div class="adm-socket-actions">
                    <button type="button" class="adm-mini-btn adm-disc-btn" data-disc-user="${esc(conn.username)}" title="Force close socket connection">⚡ Disconnect</button>
                    <button type="button" class="adm-mini-btn adm-disc-btn" data-disc-user="${esc(conn.username)}" data-disc-revoke="1" style="color:#fca5a5;border-color:rgba(239,68,68,.3);" title="Disconnect and sign out account">🔒 Sign Out</button>
                  </div>
                </div>
              `).join('') : '<div class="muted" style="padding:10px 0;">No other users connected right now.</div>'}
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn-ghost" id="admPurgeSessionsBtn" title="Purge expired tokens and orphaned session records older than 14 days">
                  🧹 Purge Stale Sessions (>14d)
                </button>
                <button type="button" class="btn-ghost" id="admExportAuditBtn" title="Download the complete security audit trail as JSON">
                  📥 Export Full Audit Log (JSON)
                </button>
              </div>
              <small class="muted">Survives workspace restarts cleanly via triple-layer vault.</small>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const renderReportsTab = () => {
    const allReports = Array.isArray(ov.reports) ? ov.reports : [];
    const rq = adminReportsSearch.trim().toLowerCase();
    const filtered = allReports.filter(r => {
      if (adminReportsFilter === 'open' && r.status === 'resolved') return false;
      if (adminReportsFilter === 'resolved' && r.status !== 'resolved') return false;
      if (rq){
        const hay = `${r.reason || ''} ${r.category || ''} ${r.reporterUsername || ''} ${r.userPrompt || ''} ${r.aiResponse || ''}`.toLowerCase();
        if (!hay.includes(rq)) return false;
      }
      return true;
    });
    const openCnt = allReports.filter(r => r.status !== 'resolved').length;
    const resCnt = allReports.length - openCnt;
    return `
      <div class="adm-mod-wrap">
        <div class="adm-section-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <h3 style="margin:0;">🚩 AI Message Reports History</h3>
            <small class="muted">Every report submitted by users on AI answers — review reasons, mark resolved, or remove</small>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="search" id="admReportsSearch" value="${esc(adminReportsSearch)}" placeholder="Search reports…" style="min-width:190px;padding:7px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;">
            <button type="button" class="adm-fbtn ${adminReportsFilter === 'all' ? 'on' : ''}" data-rf="all">All (${allReports.length})</button>
            <button type="button" class="adm-fbtn ${adminReportsFilter === 'open' ? 'on' : ''}" data-rf="open">🔴 Open (${openCnt})</button>
            <button type="button" class="adm-fbtn ${adminReportsFilter === 'resolved' ? 'on' : ''}" data-rf="resolved">✅ Resolved (${resCnt})</button>
            <button type="button" class="btn-ghost" id="admReportsRefresh">↻ Refresh</button>
          </div>
        </div>
        ${filtered.length === 0 ? `
          <div class="adm-card" style="text-align:center;padding:34px 20px;">
            <div style="font-size:2rem;margin-bottom:8px;">🛡️</div>
            <b>No AI reports match this filter</b>
            <p class="muted" style="margin:6px 0 0;">When users click the Report button under an AI response, their report history will appear here live.</p>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${filtered.map(r => `
              <div class="adm-card" style="padding:14px 16px;border-left:3px solid ${r.status === 'resolved' ? '#10b981' : '#f43f5e'};">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="adm-role-badge ${r.status === 'resolved' ? 'full' : 'partial'}" style="${r.status === 'resolved' ? '' : 'background:rgba(244,63,94,.2);color:#fda4af;border-color:rgba(244,63,94,.4);'}">${r.status === 'resolved' ? '✅ RESOLVED' : '🚩 OPEN'}</span>
                    <span style="font-size:.78rem;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.08);color:#e2e8f0;font-weight:600;">${esc(r.category || 'other')}</span>
                    <b>@${esc(r.reporterUsername || 'Guest')}</b>
                    <small class="muted">· ${new Date(r.createdAt || Date.now()).toLocaleString()} · Model: ${esc(r.model || 'lokizenith')}</small>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button type="button" class="btn-ghost adm-rep-toggle" data-repid="${esc(r.id)}" data-next="${r.status === 'resolved' ? 'open' : 'resolved'}">
                      ${r.status === 'resolved' ? '↺ Reopen' : '✓ Mark Resolved'}
                    </button>
                    <button type="button" class="danger-btn adm-rep-del" data-repid="${esc(r.id)}" style="padding:5px 10px;font-size:.78rem;">🗑 Delete</button>
                  </div>
                </div>
                <div style="background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.22);border-radius:10px;padding:9px 12px;margin-bottom:8px;" dir="auto">
                  <small style="color:#fda4af;font-weight:700;display:block;margin-bottom:3px;">USER REPORT NOTE:</small>
                  <div style="color:#fff;white-space:pre-wrap;font-size:.9rem;">${esc(r.reason)}</div>
                </div>
                ${r.userPrompt ? `
                  <div style="font-size:.82rem;color:#cbd5e1;margin-bottom:6px;" dir="auto">
                    <b style="color:#7dffcf;">User Prompt:</b> ${esc(String(r.userPrompt).slice(0, 320))}
                  </div>
                ` : ''}
                ${r.aiResponse ? `
                  <details style="font-size:.82rem;color:#94a3b8;">
                    <summary style="cursor:pointer;color:#e2e8f0;font-weight:600;">View Reported AI Message (${String(r.aiResponse).length} chars)</summary>
                    <div style="margin-top:6px;padding:10px;background:rgba(0,0,0,.35);border-radius:8px;white-space:pre-wrap;max-height:220px;overflow:auto;color:#e2e8f0;" dir="auto">${esc(String(r.aiResponse).slice(0, 1500))}</div>
                  </details>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  };

  const renderKnowledgeTab = () => {
    const entries = Array.isArray(ov.knowledgeEntries) ? ov.knowledgeEntries : [];
    const ks = ov.knowledgeStats || { totalFacts: entries.length, totalUses: 0, topTopics: [] };
    const kq = adminKnowledgeSearch.trim().toLowerCase();
    const filtered = entries.filter(e => {
      if (!kq) return true;
      return `${e.topic || ''} ${e.fact || ''} ${(e.tags || []).join(' ')} ${e.sourceUser || ''}`.toLowerCase().includes(kq);
    });
    return `
      <div class="adm-mod-wrap">
        <div class="adm-section-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <h3 style="margin:0;">🧠 AI Self-Learning Knowledge Base</h3>
            <small class="muted">Lokizenith automatically learns verified non-personal insights from user chats and recalls them in future conversations</small>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <span class="adm-role-badge full">📚 ${ks.totalFacts || entries.length} Learned Facts</span>
            <span class="adm-role-badge partial">⚡ ${ks.totalUses || 0} AI Recalls</span>
            <input type="search" id="admKnowSearch" value="${esc(adminKnowledgeSearch)}" placeholder="Search knowledge…" style="min-width:180px;padding:7px 11px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;">
          </div>
        </div>
        <form class="adm-card" id="admTeachFactForm" style="padding:14px 16px;margin-bottom:14px;display:grid;gap:8px;">
          <b>➕ Teach AI a Verified Fact Manually</b>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input type="text" id="admTeachTopic" placeholder="Topic (e.g. Lokizenith AI, Physics, React…)" dir="auto" style="flex:1;min-width:180px;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;">
            <input type="text" id="admTeachTags" placeholder="Tags (comma-separated, optional)" dir="auto" style="flex:1;min-width:160px;padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;">
          </div>
          <textarea id="admTeachFact" rows="2" placeholder="Write a factual statement the AI should remember across all users…" dir="auto" style="padding:8px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);color:#fff;"></textarea>
          <div><button type="submit" class="btn-primary" style="padding:7px 14px;">🧠 Save to AI Knowledge Base</button></div>
        </form>
        ${filtered.length === 0 ? `
          <div class="adm-card" style="text-align:center;padding:28px 18px;">
            <div style="font-size:1.8rem;margin-bottom:6px;">🌱</div>
            <b>Knowledge base is ready and learning!</b>
            <p class="muted" style="margin:6px 0 0;">As users chat with Lokizenith, clean non-private insights will automatically be distilled and stored here.</p>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:10px;">
            ${filtered.map(k => `
              <div class="adm-card" style="padding:12px 14px;display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <b style="color:#7dffcf;" dir="auto">${esc(k.topic)}</b>
                  <button type="button" class="btn-ghost adm-know-del" data-kid="${esc(k.id)}" style="padding:3px 8px;font-size:.74rem;">🗑</button>
                </div>
                <div style="font-size:.86rem;color:#e2e8f0;line-height:1.45;" dir="auto">${esc(k.fact)}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:.74rem;color:#94a3b8;margin-top:auto;padding-top:4px;">
                  <span>Source: ${esc(k.sourceUser || 'Community')} · Recalled ${k.uses || 0}×</span>
                  <span>${new Date(k.updatedAt || k.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  };

  let activeModuleHtml = '';
  if (adminActiveTab === 'directory') activeModuleHtml = renderDirectoryTab();
  else if (adminActiveTab === 'access') activeModuleHtml = renderAccessTab();
  else if (adminActiveTab === 'xray') activeModuleHtml = renderXrayTab();
  else if (adminActiveTab === 'reports') activeModuleHtml = renderReportsTab();
  else if (adminActiveTab === 'knowledge') activeModuleHtml = renderKnowledgeTab();
  else if (adminActiveTab === 'soundboard') activeModuleHtml = renderSoundboardTab();
  else if (adminActiveTab === 'broadcast') activeModuleHtml = renderBroadcastTab();
  else if (adminActiveTab === 'leaderboards') activeModuleHtml = renderLeaderboardsTab();
  else if (adminActiveTab === 'codes') activeModuleHtml = renderCodesTab();
  else if (adminActiveTab === 'security') activeModuleHtml = renderSecurityTab();
  else if (adminActiveTab === 'platform') activeModuleHtml = renderPlatformTab();
  else if (adminActiveTab === 'maintenance') activeModuleHtml = renderMaintenanceTab();
  else if (adminActiveTab === 'vault') activeModuleHtml = renderVaultTab();

  const prevBodyScroll = body.scrollTop || 0;
  const prevDirScroll = $('.adm-dir-scroll', body)?.scrollTop || 0;

  body.innerHTML = `
    <div class="adm-suite-kpis">
      <div class="adm-kpi-card"><span class="adm-kpi-ic">👥</span><div><small>Real Accounts</small><b data-adm-kpi="totalUsers">${st.totalUsers ?? 0}</b></div></div>
      <div class="adm-kpi-card live"><span class="adm-kpi-ic">🟢</span><div><small>Online Live</small><b data-adm-kpi="onlineUsers">${st.onlineUsers ?? 0}</b></div></div>
      <div class="adm-kpi-card"><span class="adm-kpi-ic">🛡️</span><div><small>Admins / Staff</small><b data-adm-kpi="adminsCount">${adminUsersCount}</b></div></div>
      <div class="adm-kpi-card"><span class="adm-kpi-ic">🌐</span><div><small>Google / ∞ VIP</small><b data-adm-kpi="googleVip">${(st.googleUsers ?? 0)} / ${(st.unlimitedUsers ?? 0)}</b></div></div>
      <div class="adm-kpi-card"><span class="adm-kpi-ic">⚡</span><div><small>Tokens Consumed</small><b data-adm-kpi="tokensConsumed">${Number(st.totalTokensConsumed || 0).toLocaleString()}</b></div></div>
      <div class="adm-kpi-card ban"><span class="adm-kpi-ic">⛔</span><div><small>Banned Users</small><b data-adm-kpi="bannedUsers">${st.bannedUsers ?? 0}</b></div></div>
    </div>

    <div class="adm-suite-nav" role="tablist">
      ${navItems.map(item => `
        <button type="button" class="adm-suite-tab ${adminActiveTab === item.id ? 'on' : ''}" data-amtab="${item.id}">
          <span class="ast-ic">${item.icon}</span>
          <span class="ast-lbl">${esc(item.label)}</span>
          ${item.badge !== null && item.badge !== undefined ? `<span class="ast-badge" data-adm-badge="${item.id}">${esc(item.badge)}</span>` : ''}
        </button>
      `).join('')}
    </div>

    <div class="adm-suite-stage">
      ${activeModuleHtml}
    </div>
  `;

  if (prevBodyScroll > 0) body.scrollTop = prevBodyScroll;
  const newDirScroll = $('.adm-dir-scroll', body);
  if (newDirScroll && prevDirScroll > 0) newDirScroll.scrollTop = prevDirScroll;

  // Module tab switching
  $$('.adm-suite-tab', body).forEach(btn => {
    btn.onclick = () => {
      adminActiveTab = btn.dataset.amtab;
      renderAdminDashboardModal();
    };
  });

  // Shared inspect buttons across any tab
  $$('.adm-act-inspect', body).forEach(btn => {
    btn.onclick = () => inspectAccountLive(btn.dataset.insp);
  });

  // Shared copy buttons
  $$('.adm-pw-copy', body).forEach(b => {
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(b.dataset.pw || ''); } catch(_){}
      toast('✓ Copied to clipboard', 'ok');
    };
  });

  // Directory Tab bindings
  const sInp = $('#admDirSearch', body);
  if (sInp){
    sInp.oninput = () => {
      adminDirSearch = sInp.value;
      const pos = sInp.selectionStart;
      renderAdminDashboardModal();
      const nInp = $('#admDirSearch', body);
      if (nInp){ nInp.focus(); try { nInp.setSelectionRange(pos, pos); } catch(_){} }
    };
  }
  const sortSel = $('#admDirSort', body);
  if (sortSel){
    sortSel.onchange = () => {
      adminDirSort = sortSel.value || 'recent';
      renderAdminDashboardModal();
    };
  }
  $$('.adm-fbtn[data-af]', body).forEach(b => b.onclick = () => { adminDirFilter = b.dataset.af; renderAdminDashboardModal(); });
  $('#admToggleAllPwBtn', body)?.addEventListener('click', () => {
    adminRevealPasswords = !adminRevealPasswords;
    renderAdminDashboardModal();
  });
  $('#admRefreshBtn', body)?.addEventListener('click', async () => {
    await fetchAdminOverview();
    renderAdminDashboardModal();
    toast('✓ Live telemetry refreshed', 'ok');
  });

  $$('.adm-pw-eye', body).forEach(b => {
    b.onclick = () => {
      const id = b.dataset.pwid;
      if (adminRevealedIds.has(id)) adminRevealedIds.delete(id);
      else adminRevealedIds.add(id);
      renderAdminDashboardModal();
    };
  });

  $$('.adm-pw-edit', body).forEach(b => {
    b.onclick = () => {
      adminPasswordTarget = b.dataset.pwu;
      adminBanTarget = null;
      adminTokenTarget = null;
      renderAdminDashboardModal();
    };
  });

  $$('.adm-act-xray', body).forEach(b => {
    b.onclick = () => {
      adminActiveTab = 'xray';
      loadAdminUserXray(b.dataset.xr);
    };
  });

  $$('.adm-act-access', body).forEach(b => {
    b.onclick = () => {
      selectAdminAccessUser(b.dataset.accu, allUsers);
      adminActiveTab = 'access';
      renderAdminDashboardModal();
    };
  });

  // Access Tab bindings
  const accUserSel = $('#admAccessUserSelect', body);
  if (accUserSel){
    accUserSel.onchange = () => {
      selectAdminAccessUser(accUserSel.value, allUsers);
      renderAdminDashboardModal();
    };
  }
  $$('[data-atier]', body).forEach(b => {
    b.onclick = () => {
      adminAccessLevelDraft = b.dataset.atier;
      if (adminAccessLevelDraft === 'partial' && (!adminAccessPermsDraft || !adminAccessPermsDraft.length)){
        adminAccessPermsDraft = ['directory', 'leaderboards'];
      }
      renderAdminDashboardModal();
    };
  });
  $$('.adm-perm-chk', body).forEach(chk => {
    chk.onchange = () => {
      const val = chk.value;
      if (chk.checked){
        if (!adminAccessPermsDraft.includes(val)) adminAccessPermsDraft.push(val);
      } else {
        adminAccessPermsDraft = adminAccessPermsDraft.filter(x => x !== val);
      }
      renderAdminDashboardModal();
    };
  });
  $$('[data-apreset]', body).forEach(b => {
    b.onclick = () => {
      const p = b.dataset.apreset;
      if (p === 'mod') adminAccessPermsDraft = ['directory', 'xray', 'security'];
      else if (p === 'dj') adminAccessPermsDraft = ['soundboard', 'broadcast', 'platform'];
      else if (p === 'view') adminAccessPermsDraft = ['leaderboards', 'xray'];
      else if (p === 'all') adminAccessPermsDraft = ADMIN_MODULES_META.map(m => m.id);
      renderAdminDashboardModal();
    };
  });
  $('#admAccessSaveForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!adminAccessTarget) return;
    try {
      await api('/api/admin/user-access', {
        method: 'POST',
        body: JSON.stringify({
          username: adminAccessTarget,
          accessLevel: adminAccessLevelDraft,
          permissions: adminAccessPermsDraft
        })
      });
      toast(`🔐 Updated @${adminAccessTarget} access to ${adminAccessLevelDraft.toUpperCase()}!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });
  $$('[data-qacc-edit]', body).forEach(b => {
    b.onclick = () => {
      selectAdminAccessUser(b.dataset.qaccEdit, allUsers);
      adminAccessLevelDraft = 'partial';
      renderAdminDashboardModal();
    };
  });
  $$('[data-qacc-u]', body).forEach(b => {
    b.onclick = async () => {
      const targetU = b.dataset.qaccU;
      const lvl = b.dataset.qaccLvl;
      try {
        await api('/api/admin/user-access', {
          method: 'POST',
          body: JSON.stringify({
            username: targetU,
            accessLevel: lvl,
            permissions: lvl === 'full' ? ADMIN_MODULES_META.map(m => m.id) : []
          })
        });
        toast(`🔐 Updated @${targetU} access to ${lvl.toUpperCase()}!`, 'ok');
        await fetchAdminOverview();
        selectAdminAccessUser(targetU, state.adminOverview?.users || allUsers);
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $$('.adm-act-tok', body).forEach(b => {
    b.onclick = () => {
      adminTokenTarget = b.dataset.tk;
      adminBanTarget = null;
      adminPasswordTarget = null;
      adminPlanTarget = null;
      renderAdminDashboardModal();
    };
  });

  $$('.adm-act-plan', body).forEach(b => {
    b.onclick = () => {
      adminPlanTarget = b.dataset.plu;
      adminTokenTarget = null;
      adminBanTarget = null;
      adminPasswordTarget = null;
      renderAdminDashboardModal();
    };
  });

  $$('[data-qplan-u]', body).forEach(b => {
    b.onclick = async () => {
      const targetU = b.dataset.qplanU;
      const planTier = b.dataset.qplanT;
      b.disabled = true;
      try {
        const res = await api('/api/admin/user-plan', {
          method: 'POST',
          body: JSON.stringify({ username: targetU, plan: planTier, planTier })
        });
        if (res.user && state.adminOverview && Array.isArray(state.adminOverview.users)){
          state.adminOverview.users = state.adminOverview.users.map(u =>
            String(u.username).toLowerCase() === String(targetU).toLowerCase() ? res.user : u
          );
        }
        const selfUpdate = res.targetAccount && state.user && String(state.user.username).toLowerCase() === String(targetU).toLowerCase()
          ? res.targetAccount
          : (res.account && state.user && String(state.user.username).toLowerCase() === String(targetU).toLowerCase() ? res.account : null);
        if (selfUpdate) updateAccount(selfUpdate);
        toast(`💎 Set @${targetU}'s subscription to ${planTier.toUpperCase()} immediately!`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){
        b.disabled = false;
        toast(err.message, 'err');
      }
    };
  });

  $$('.adm-act-reset', body).forEach(b => {
    b.onclick = async () => {
      try {
        const res = await api('/api/admin/reset-users', { method: 'POST', body: JSON.stringify({ usernames: [b.dataset.ru] }) });
        if (res.account) updateAccount(res.account);
        toast(`⚡ Reset usage for @${b.dataset.ru}`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $$('.adm-act-ban', body).forEach(b => {
    b.onclick = () => {
      adminBanTarget = b.dataset.bu;
      adminTokenTarget = null;
      adminPasswordTarget = null;
      adminPlanTarget = null;
      renderAdminDashboardModal();
    };
  });

  $$('.adm-act-unban', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/unban', { method: 'POST', body: JSON.stringify({ username: b.dataset.ubu }) });
        toast(`✓ Unbanned @${b.dataset.ubu}`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $$('.adm-act-del', body).forEach(b => {
    b.onclick = async () => {
      const target = b.dataset.du;
      try {
        await api('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ username: target }) });
        toast(`🗑 Deleted account @${target}`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Plan drawer bindings (Supports Permanent or Timed Duration for Self or Any User)
  if (adminPlanTarget){
    $('#admPlanCancelForm', body)?.addEventListener('click', () => { adminPlanTarget = null; renderAdminDashboardModal(); });
    $$('input[name="admPlanDurMode"]', body).forEach(rad => {
      rad.onchange = () => {
        adminPlanDurationMode = rad.value === 'timed' ? 'timed' : 'permanent';
        const amt = $('#admPlanDurAmount', body);
        const unit = $('#admPlanDurUnit', body);
        const wrap = $('#admPlanTimedInputs', body);
        if (amt) amt.disabled = adminPlanDurationMode !== 'timed';
        if (unit) unit.disabled = adminPlanDurationMode !== 'timed';
        if (wrap) wrap.classList.toggle('open', adminPlanDurationMode === 'timed');
        $$('.adm-dur-pill', body).forEach(lbl => {
          const inp = lbl.querySelector('input');
          lbl.classList.toggle('on', Boolean(inp?.checked));
        });
      };
    });
    $$('[data-pdur]', body).forEach(btn => {
      btn.onclick = () => {
        const [amtStr, unitStr] = String(btn.dataset.pdur || '7:days').split(':');
        adminPlanDurationMode = 'timed';
        adminPlanDurationAmount = Number(amtStr) || 7;
        adminPlanDurationUnit = unitStr || 'days';
        const timedRad = $('input[name="admPlanDurMode"][value="timed"]', body);
        if (timedRad) timedRad.checked = true;
        const amtInp = $('#admPlanDurAmount', body);
        const unitSel = $('#admPlanDurUnit', body);
        if (amtInp){ amtInp.disabled = false; amtInp.value = adminPlanDurationAmount; }
        if (unitSel){ unitSel.disabled = false; unitSel.value = adminPlanDurationUnit; }
        $('#admPlanTimedInputs', body)?.classList.add('open');
        $$('.adm-dur-pill', body).forEach(lbl => {
          const inp = lbl.querySelector('input');
          lbl.classList.toggle('on', Boolean(inp?.checked));
        });
      };
    });
    $('#admPlanForm', body)?.addEventListener('submit', async e => {
      e.preventDefault();
      const targetUsername = adminPlanTarget;
      const subBtn = $('#admPlanForm button[type="submit"]', body);
      if (subBtn) subBtn.disabled = true;
      try {
        const planTier = $('#admPlanSelect', body)?.value || 'free';
        const starkAuthorized = Boolean($('#admStarkAuthCheck', body)?.checked);
        const durMode = $('input[name="admPlanDurMode"]:checked', body)?.value === 'timed' ? 'timed' : 'permanent';
        const durAmt = Number($('#admPlanDurAmount', body)?.value || adminPlanDurationAmount || 7);
        const durUnit = $('#admPlanDurUnit', body)?.value || adminPlanDurationUnit || 'days';
        adminPlanDurationMode = durMode;
        adminPlanDurationAmount = durAmt;
        adminPlanDurationUnit = durUnit;

        const res = await api('/api/admin/user-plan', {
          method: 'POST',
          body: JSON.stringify({
            username: targetUsername,
            plan: planTier,
            planTier,
            durationMode: durMode,
            durationAmount: durAmt,
            durationUnit: durUnit,
            starkAuthorized
          })
        });
        if (res.user && state.adminOverview && Array.isArray(state.adminOverview.users)){
          state.adminOverview.users = state.adminOverview.users.map(u =>
            String(u.username).toLowerCase() === String(targetUsername).toLowerCase() ? res.user : u
          );
        }
        const selfUpdate = res.targetAccount && state.user && String(state.user.username).toLowerCase() === String(targetUsername).toLowerCase()
          ? res.targetAccount
          : (res.account && state.user && String(state.user.username).toLowerCase() === String(targetUsername).toLowerCase() ? res.account : null);
        if (selfUpdate) updateAccount(selfUpdate);
        const durTxt = durMode === 'timed' && planTier !== 'free' ? ` for ${durAmt} ${durUnit}` : '';
        toast(`💎 Updated @${targetUsername} to ${planTier.toUpperCase()}${durTxt}${starkAuthorized ? ' + Stark Auth' : ''} immediately!`, 'ok');
        adminPlanTarget = null;
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){
        if (subBtn) subBtn.disabled = false;
        toast(err.message, 'err');
      }
    });
  }

  // Ban drawer bindings
  if (adminBanTarget){
    $('#admBanCancelForm', body)?.addEventListener('click', () => { adminBanTarget = null; renderAdminDashboardModal(); });
    const fChk = $('#admBanForever', body);
    const durRow = $('#admBanDurRow', body);
    if (fChk && durRow){
      fChk.onchange = () => { durRow.style.opacity = fChk.checked ? '.35' : '1'; durRow.style.pointerEvents = fChk.checked ? 'none' : ''; };
    }
    $('#admBanForm', body)?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await api('/api/admin/ban', {
          method: 'POST',
          body: JSON.stringify({
            username: adminBanTarget,
            permanent: !!$('#admBanForever', body)?.checked,
            amount: Number($('#admBanAmount', body)?.value || 1),
            unit: $('#admBanUnit', body)?.value || 'days',
            reason: $('#admBanReason', body)?.value || ''
          })
        });
        toast(`🔨 Banned @${adminBanTarget}`, 'ok');
        adminBanTarget = null;
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    });
  }

  // Token drawer bindings
  if (adminTokenTarget){
    $('#admTokenCancelForm', body)?.addEventListener('click', () => { adminTokenTarget = null; renderAdminDashboardModal(); });
    $$('[data-qtok]', body).forEach(b => {
      b.onclick = () => {
        const inp = $('#admTokenAmount', body);
        if (inp) inp.value = b.dataset.qtok;
      };
    });
    $('#admTokenForm', body)?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const action = $('#admTokenAction', body)?.value || 'gift';
        const amount = Number($('#admTokenAmount', body)?.value || 25000);
        await api('/api/admin/user-tokens', {
          method: 'POST',
          body: JSON.stringify({ username: adminTokenTarget, action, amount })
        });
        toast(`✨ Updated tokens for @${adminTokenTarget}`, 'ok');
        adminTokenTarget = null;
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    });
  }

  // Password drawer bindings
  if (adminPasswordTarget){
    $('#admPwCancelForm', body)?.addEventListener('click', () => { adminPasswordTarget = null; renderAdminDashboardModal(); });
    $('#admPwForm', body)?.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const newPassword = ($('#admNewPwInput', body)?.value || '').trim();
        await api('/api/admin/user-password', {
          method: 'POST',
          body: JSON.stringify({ username: adminPasswordTarget, newPassword })
        });
        toast(`🔑 Password updated for @${adminPasswordTarget}`, 'ok');
        adminPasswordTarget = null;
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    });
  }

  // X-Ray Tab bindings
  const xraySel = $('#admXraySelect', body);
  if (xraySel){
    xraySel.onchange = () => {
      if (xraySel.value) loadAdminUserXray(xraySel.value);
    };
  }
  $$('[data-xconv]', body).forEach(b => {
    b.onclick = () => {
      adminXrayConvIdx = Number(b.dataset.xconv || 0);
      renderAdminDashboardModal();
    };
  });

  // Reports Tab bindings
  const repSearch = $('#admReportsSearch', body);
  if (repSearch){
    repSearch.oninput = () => {
      adminReportsSearch = repSearch.value;
      const pos = repSearch.selectionStart;
      renderAdminDashboardModal();
      const nInp = $('#admReportsSearch', body);
      if (nInp){ nInp.focus(); try { nInp.setSelectionRange(pos, pos); } catch(_){} }
    };
  }
  $$('.adm-fbtn[data-rf]', body).forEach(b => {
    b.onclick = () => { adminReportsFilter = b.dataset.rf || 'all'; renderAdminDashboardModal(); };
  });
  $('#admReportsRefresh', body)?.addEventListener('click', async () => {
    await fetchAdminOverview();
    renderAdminDashboardModal();
    toast('✓ Reports refreshed', 'ok');
  });
  $$('.adm-rep-toggle', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api(`/api/admin/reports/${encodeURIComponent(b.dataset.repid)}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: b.dataset.next || 'resolved' })
        });
        toast(b.dataset.next === 'resolved' ? '✅ Report marked resolved' : '↺ Report reopened', 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });
  $$('.adm-rep-del', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api(`/api/admin/reports/${encodeURIComponent(b.dataset.repid)}`, { method: 'DELETE' });
        toast('🗑 Report deleted', 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Knowledge Base Tab bindings
  const knowSearch = $('#admKnowSearch', body);
  if (knowSearch){
    knowSearch.oninput = () => {
      adminKnowledgeSearch = knowSearch.value;
      const pos = knowSearch.selectionStart;
      renderAdminDashboardModal();
      const nInp = $('#admKnowSearch', body);
      if (nInp){ nInp.focus(); try { nInp.setSelectionRange(pos, pos); } catch(_){} }
    };
  }
  const teachForm = $('#admTeachFactForm', body);
  if (teachForm){
    teachForm.onsubmit = async (ev) => {
      ev.preventDefault();
      const topic = ($('#admTeachTopic', body)?.value || '').trim();
      const tags = ($('#admTeachTags', body)?.value || '').trim();
      const fact = ($('#admTeachFact', body)?.value || '').trim();
      if (!topic || fact.length < 15){
        toast('Please enter a topic and a fact (at least 15 chars).', 'err');
        return;
      }
      try {
        await api('/api/admin/knowledge', { method: 'POST', body: JSON.stringify({ topic, tags, fact }) });
        toast('🧠 Saved fact to AI Knowledge Base!', 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  }
  $$('.adm-know-del', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api(`/api/admin/knowledge/${encodeURIComponent(b.dataset.kid)}`, { method: 'DELETE' });
        toast('🗑 Knowledge entry removed', 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Soundboard & Live Voice PA Tab bindings
  $$('.adm-vfilter-btn', body).forEach(b => {
    b.onclick = () => {
      voiceFilterSelected = b.dataset.vf || 'normal';
      renderAdminDashboardModal();
    };
  });

  const recBtn = $('#admVoiceRecBtn', body);
  if (recBtn){
    recBtn.onclick = async () => {
      if (voiceRecordingActive && voiceMediaRecorder){
        try { voiceMediaRecorder.stop(); } catch(_){}
        voiceRecordingActive = false;
        clearInterval(voiceRecordTimer);
        renderAdminDashboardModal();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceChunks = [];
        voiceRecordSec = 0;
        voiceRecordingActive = true;
        const mr = new MediaRecorder(stream);
        voiceMediaRecorder = mr;
        mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) voiceChunks.push(ev.data); };
        mr.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(voiceChunks, { type: mr.mimeType || 'audio/webm' });
          try {
            voiceRecordedDataUrl = await convertBlobToWavDataUrl(blob);
          } catch(_){
            voiceRecordedDataUrl = '';
          }
          voiceRecordingActive = false;
          clearInterval(voiceRecordTimer);
          renderAdminDashboardModal();
          toast('🎙 Voice clip captured in universal WAV! Click Preview or Broadcast Live!', 'ok');
        };
        mr.start();
        clearInterval(voiceRecordTimer);
        voiceRecordTimer = setInterval(() => {
          voiceRecordSec++;
          if (voiceRecordSec >= 60 && voiceRecordingActive){
            try { mr.stop(); } catch(_){}
          } else {
            const btnEl = $('#admVoiceRecBtn');
            if (btnEl) btnEl.textContent = `⏹ Stop Recording (${voiceRecordSec}s / 60s)`;
          }
        }, 1000);
        renderAdminDashboardModal();
      } catch(err){
        toast('Microphone access could not be started: ' + (err.message || 'Permission denied'), 'err');
      }
    };
  }

  $('#admVoicePreviewBtn', body)?.addEventListener('click', () => {
    if (!voiceRecordedDataUrl) return;
    const cap = ($('#admVoiceCaptionInput', body)?.value || '').trim();
    playVoiceBroadcast(voiceRecordedDataUrl, voiceFilterSelected, 'Voice PA Preview', cap, state.user?.username || 'Lokizenith');
  });

  $('#admVoiceBroadcastBtn', body)?.addEventListener('click', async () => {
    if (!voiceRecordedDataUrl) return;
    const caption = ($('#admVoiceCaptionInput', body)?.value || '').trim();
    playVoiceBroadcast(voiceRecordedDataUrl, voiceFilterSelected, 'Live Admin Voice PA', caption, state.user?.username || 'Lokizenith');
    try {
      const res = await api('/api/admin/audio-broadcast', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'voice',
          audioDataUrl: voiceRecordedDataUrl,
          voiceFilter: voiceFilterSelected,
          label: 'Live Admin Voice PA',
          caption,
          senderTabId: TAB_ID
        })
      });
      toast(`📡 Voice PA broadcasted live to ${res.onlineDelivered ?? res.onlineReached ?? 0} online screen(s)!`, 'ok');
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admVoiceTtsBroadcastBtn', body)?.addEventListener('click', async () => {
    const caption = ($('#admVoiceCaptionInput', body)?.value || '').trim() || 'Attention all users! Lokizenith Admin is speaking live!';
    const ttsUrl = `tts:${caption}`;
    playVoiceBroadcast(ttsUrl, voiceFilterSelected, 'Live Spoken Voice PA', caption, state.user?.username || 'Lokizenith');
    try {
      const res = await api('/api/admin/audio-broadcast', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'voice',
          audioDataUrl: ttsUrl,
          voiceFilter: voiceFilterSelected,
          label: 'Live Spoken Voice PA',
          caption,
          senderTabId: TAB_ID
        })
      });
      toast(`🗣 Spoken Voice PA broadcasted live to ${res.onlineDelivered ?? res.onlineReached ?? 0} online screen(s)!`, 'ok');
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('[data-sprev]', body).forEach(b => {
    b.onclick = () => {
      const cap = ($('#admSoundCaption', body)?.value || '').trim();
      playSynthesizedSound(b.dataset.sprev, cap, state.user?.username || 'Lokizenith', true);
    };
  });

  $$('[data-scast]', body).forEach(b => {
    b.onclick = async () => {
      const soundId = b.dataset.scast;
      const item = SOUNDBOARD_LIBRARY.find(s => s.id === soundId);
      const caption = ($('#admSoundCaption', body)?.value || '').trim();
      playSynthesizedSound(soundId, caption, state.user?.username || 'Lokizenith', true);
      try {
        const res = await api('/api/admin/audio-broadcast', {
          method: 'POST',
          body: JSON.stringify({
            kind: 'sound',
            soundId,
            label: item ? `${item.icon} ${item.name}` : soundId,
            caption
          })
        });
        toast(`📡 Played "${item?.name || soundId}" across all ${res.onlineDelivered ?? 0} online user(s)!`, 'ok');
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Broadcast & Scheduler Tab bindings
  $('#admInstantBroadcastForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const title = ($('#admBcastTitle', body)?.value || '').trim();
      const message = ($('#admBcastMessage', body)?.value || '').trim();
      const level = $('#admBcastLevel', body)?.value || 'info';
      const soundEffect = $('#admBcastSound', body)?.value || 'none';
      await api('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message, level, soundEffect })
      });
      toast('📢 Global announcement broadcasted (without resetting tokens)!', 'ok');
      const msgInp = $('#admBcastMessage', body);
      if (msgInp) msgInp.value = '';
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admScheduleBroadcastForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const title = ($('#admSchedTitle', body)?.value || '').trim();
      const message = ($('#admSchedMessage', body)?.value || '').trim();
      const delaySeconds = Number($('#admSchedDelaySec', body)?.value || 60);
      const soundEffect = $('#admSchedSound', body)?.value || 'fanfare';
      await api('/api/admin/schedule-broadcast', {
        method: 'POST',
        body: JSON.stringify({ title, message, delaySeconds, level: 'celebration', soundEffect })
      });
      toast(`⏰ Scheduled "${title}" to broadcast in ${delaySeconds}s!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('.adm-cancel-sched', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/cancel-scheduled-broadcast', {
          method: 'POST',
          body: JSON.stringify({ id: b.dataset.csched })
        });
        toast('✕ Scheduled announcement canceled', 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $$('.adm-rebroadcast-btn', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            title: b.dataset.rbTitle,
            message: b.dataset.rbMsg,
            level: b.dataset.rbLvl || 'info'
          })
        });
        toast('📢 Re-broadcasted announcement live!', 'ok');
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Leaderboards quick reward
  $$('.adm-lb-reward', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/user-tokens', {
          method: 'POST',
          body: JSON.stringify({ username: b.dataset.rwd, action: 'gift', amount: 25000 })
        });
        toast(`🎁 Rewarded @${b.dataset.rwd} with +25,000 bonus tokens!`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Promo Codes Studio bindings
  $('#admGenRandomCodeBtn', body)?.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = 'LOKI-';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    const inp = $('#admNewCodeStr', body);
    if (inp) inp.value = s;
  });

  $('#admCreateCustomCodeForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const code = ($('#admNewCodeStr', body)?.value || '').trim();
      const tokens = Number($('#admNewCodeTokens', body)?.value || 50000);
      const kind = $('#admNewCodeKind', body)?.value || 'gift';
      const maxClaims = Number($('#admNewCodeMaxClaims', body)?.value || 0);
      await api('/api/admin/custom-codes', {
        method: 'POST',
        body: JSON.stringify({ code, tokens, kind, maxClaims })
      });
      toast(`✨ Created custom promo code "${code}" (+${tokens.toLocaleString()} tokens)!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('.adm-del-code', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/delete-custom-code', {
          method: 'POST',
          body: JSON.stringify({ code: b.dataset.dcode })
        });
        toast(`🗑 Deleted promo code "${b.dataset.dcode}"`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Security & Audit bindings
  $$('[data-auditf]', body).forEach(b => {
    b.onclick = () => {
      adminAuditFilter = b.dataset.auditf || 'all';
      renderAdminDashboardModal();
    };
  });

  $('#admClearAuditBtn', body)?.addEventListener('click', async () => {
    try {
      await api('/api/admin/clear-audit-logs', { method: 'POST' });
      toast('🧹 Security audit log cleared', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('.adm-revoke-sess', body).forEach(b => {
    b.onclick = async () => {
      try {
        await api('/api/admin/revoke-sessions', {
          method: 'POST',
          body: JSON.stringify({ username: b.dataset.revu })
        });
        toast(`🔒 Force-signed out @${b.dataset.revu}`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Platform & AI Community Events Tab bindings
  const collectAdminEventFormIntoDraft = () => {
    const form = $('#admEvConfigForm', body);
    if (!form || !adminEventDraft) return adminEventDraft;
    const g = id => form.querySelector(id);
    adminEventDraft.name = (g('#admEvName')?.value || adminEventDraft.name || 'Community Event').trim();
    adminEventDraft.buttonLabel = (g('#admEvBtnLabel')?.value || adminEventDraft.name).trim();
    adminEventDraft.icon = (g('#admEvIcon')?.value || '🎉').trim();
    adminEventDraft.themeAccent = g('#admEvAccent')?.value || 'emerald';
    adminEventDraft.metric = g('#admEvMetric')?.value || 'combined_activity';
    adminEventDraft.goalTarget = Math.max(1, Number(g('#admEvGoal')?.value || 100));
    adminEventDraft.endsInDays = Math.max(1, Number(g('#admEvDays')?.value || 7));
    adminEventDraft.headline = (g('#admEvHeadline')?.value || adminEventDraft.name).trim();
    adminEventDraft.subtitle = (g('#admEvSubtitle')?.value || '').trim();
    adminEventDraft.storyMarkdown = (g('#admEvStory')?.value || '').trim();
    adminEventDraft.aiPrompt = ($('#admEvPromptInput', body)?.value || adminEventPromptText || '').trim();

    const rows = $$('.adm-ev-tier-row', form);
    adminEventDraft.tiers = rows.map((row, idx) => {
      const old = (adminEventDraft.tiers || [])[idx] || {};
      const rtype = row.querySelector('.adm-ev-t-rtype')?.value || old.rewardType || 'plan';
      const dmode = row.querySelector('.adm-ev-t-dmode')?.value || old.durationMode || 'timed';
      return {
        id: old.id || `tier_${idx + 1}`,
        badgeEmoji: row.querySelector('.adm-ev-t-emoji')?.value || '🏆',
        title: row.querySelector('.adm-ev-t-title')?.value || `Tier ${idx + 1}`,
        description: row.querySelector('.adm-ev-t-desc')?.value || '',
        targetProgress: Math.max(1, Number(row.querySelector('.adm-ev-t-target')?.value || 50)),
        rewardType: rtype,
        rewardPlan: rtype === 'plan' ? (row.querySelector('.adm-ev-t-rplan')?.value || old.rewardPlan || 'pro') : undefined,
        durationMode: rtype === 'plan' ? dmode : undefined,
        durationAmount: rtype === 'plan' && dmode !== 'permanent' ? Math.max(1, Number(row.querySelector('.adm-ev-t-damt')?.value || old.durationAmount || 3)) : undefined,
        durationUnit: rtype === 'plan' && dmode !== 'permanent' ? (row.querySelector('.adm-ev-t-dunit')?.value || old.durationUnit || 'days') : undefined,
        bonusTokens: rtype === 'tokens' ? Math.max(1000, Number(row.querySelector('.adm-ev-t-tok')?.value || old.bonusTokens || 25000)) : undefined,
        customRewardText: rtype === 'custom' ? (row.querySelector('.adm-ev-t-custom')?.value || old.customRewardText || 'Exclusive Badge') : undefined
      };
    });
    return adminEventDraft;
  };

  $('#admEvAiBuildBtn', body)?.addEventListener('click', async () => {
    const pInp = $('#admEvPromptInput', body);
    const promptVal = (pInp?.value || '').trim();
    if (!promptVal){
      toast('Enter a prompt describing the community event you want AI to design.', 'err');
      return;
    }
    adminEventPromptText = promptVal;
    adminEventAiBusy = true;
    renderAdminDashboardModal();
    try {
      const res = await api('/api/admin/events/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: promptVal })
      });
      if (res.draft){
        adminEventDraft = res.draft;
        toast(`✨ AI generated "${res.draft.name}" (${res.source === 'gemini' ? 'Gemini AI' : 'Architect'}) — review & click Apply Live!`, 'ok');
      }
    } catch(err){
      toast(err.message || 'Could not generate event draft.', 'err');
    } finally {
      adminEventAiBusy = false;
      renderAdminDashboardModal();
    }
  });

  $('#admEvAddTierBtn', body)?.addEventListener('click', () => {
    collectAdminEventFormIntoDraft();
    const list = Array.isArray(adminEventDraft?.tiers) ? adminEventDraft.tiers : [];
    const nextIdx = list.length + 1;
    list.push({
      id: `tier_${Date.now().toString(36)}`,
      badgeEmoji: '🌟',
      title: `Milestone Tier ${nextIdx}`,
      description: 'Community unlocks extra bonus rewards!',
      targetProgress: Math.max(10, Number(adminEventDraft?.goalTarget || 100)),
      rewardType: 'plan',
      rewardPlan: 'pro',
      durationMode: 'timed',
      durationAmount: 3,
      durationUnit: 'days'
    });
    adminEventDraft.tiers = list;
    renderAdminDashboardModal();
  });

  $$('.adm-ev-t-del', body).forEach(btn => {
    btn.onclick = () => {
      collectAdminEventFormIntoDraft();
      const idx = Number(btn.dataset.delTier);
      if (Array.isArray(adminEventDraft?.tiers) && adminEventDraft.tiers.length > 1){
        adminEventDraft.tiers.splice(idx, 1);
        renderAdminDashboardModal();
      }
    };
  });

  $$('.adm-ev-t-rtype, .adm-ev-t-dmode', body).forEach(sel => {
    sel.onchange = () => {
      collectAdminEventFormIntoDraft();
      renderAdminDashboardModal();
    };
  });

  $('#admEvConfigForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    collectAdminEventFormIntoDraft();
    adminEventApplyBusy = true;
    renderAdminDashboardModal();
    try {
      const payload = {
        ...adminEventDraft,
        endsAt: undefined
      };
      const res = await api('/api/admin/events/apply', {
        method: 'POST',
        body: JSON.stringify({ event: payload })
      });
      if (res.event){
        adminEventDraft = JSON.parse(JSON.stringify(res.event));
        if (window.LZEvents?.setEvent) window.LZEvents.setEvent(res.event);
        if (state.adminOverview) state.adminOverview.activeEvent = res.event;
      }
      toast(`🚀 Community Event "${res.event?.name || ''}" is LIVE! Topbar button is visible to all users!`, 'ok');
      await fetchAdminOverview();
    } catch(err){
      toast(err.message || 'Could not apply community event.', 'err');
    } finally {
      adminEventApplyBusy = false;
      renderAdminDashboardModal();
    }
  });

  $('#admEvOpenPageBtn', body)?.addEventListener('click', () => {
    const admModal = $('#adminDashboardModal');
    if (admModal){
      if (A()?.closeModal) A().closeModal('adminDashboardModal');
      else admModal.hidden = true;
    }
    if (window.LZEvents?.open) window.LZEvents.open();
  });

  const handleBoostProgress = async (delta) => {
    try {
      const res = await api('/api/admin/events/adjust-progress', {
        method: 'POST',
        body: JSON.stringify({ delta })
      });
      if (res.event){
        adminEventDraft = JSON.parse(JSON.stringify(res.event));
        if (window.LZEvents?.setEvent) window.LZEvents.setEvent(res.event);
      }
      toast(`⚡ Boosted live event progress by +${delta}!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  };
  $('#admEvBoost10Btn', body)?.addEventListener('click', () => handleBoostProgress(10));
  $('#admEvBoost50Btn', body)?.addEventListener('click', () => handleBoostProgress(50));

  $('#admEvStopBtn', body)?.addEventListener('click', async () => {
    try {
      await api('/api/admin/events/deactivate', { method: 'POST' });
      if (window.LZEvents?.setEvent) window.LZEvents.setEvent(null);
      if (state.adminOverview) state.adminOverview.activeEvent = null;
      toast('⏹ Community Event ended and removed from topbar.', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admMotdForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const motdEnabled = !!$('#admMotdEnabled', body)?.checked;
      const motdTheme = $('#admMotdTheme', body)?.value || 'emerald';
      const motdText = ($('#admMotdTextInput', body)?.value || '').trim();
      const res = await api('/api/admin/platform-config', {
        method: 'POST',
        body: JSON.stringify({ motdEnabled, motdTheme, motdText })
      });
      if (res.config) renderPlatformMotd(res.config);
      toast('📌 Global pinned ribbon updated live!', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admTriggerMysteryBtn', body)?.addEventListener('click', async () => {
    try {
      const amount = Number($('#admEventTokens', body)?.value || 25000);
      const onlineOnly = ($('#admMysteryPool', body)?.value || 'online') === 'online';
      const res = await api('/api/admin/mystery-drop', {
        method: 'POST',
        body: JSON.stringify({ amount, onlineOnly })
      });
      playSynthesizedSound('jackpot', `Winner: @${res.winner}`, 'Lokizenith', true);
      toast(`🎰 Mystery Drop Winner: @${res.winner} (+${Number(res.amount).toLocaleString()} tokens)!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admTriggerTokenRainBtn', body)?.addEventListener('click', async () => {
    try {
      const amount = Number($('#admEventTokens', body)?.value || 25000);
      const res = await api('/api/admin/gift-all', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      playSynthesizedSound('fanfare', `+${amount.toLocaleString()} Token Rain!`, 'Lokizenith', true);
      toast(`🌧 Rained +${amount.toLocaleString()} tokens on all ${res.giftedCount || ''} accounts!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  // Tab 10: Data Vault & Admin Power Tools bindings
  $('#admVaultCreateSnapBtn', body)?.addEventListener('click', async () => {
    const label = ($('#admVaultSnapLabel', body)?.value || 'manual').trim();
    try {
      const res = await api('/api/admin/vault/snapshot', {
        method: 'POST',
        body: JSON.stringify({ label })
      });
      toast(`📸 Snapshot saved: ${res.filename}`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('.adm-snap-restore', body).forEach(btn => {
    btn.onclick = async () => {
      const filename = btn.dataset.snapFile;
      const mode = btn.dataset.snapMode === 'replace' ? 'replace' : 'merge';
      try {
        const res = await api('/api/admin/vault/restore', {
          method: 'POST',
          body: JSON.stringify({ filename, mode })
        });
        toast(`✅ Restored (${mode}) from ${filename}: ${res.summary?.usersAdded || 0} added, ${res.summary?.usersMerged || 0} merged!`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $('#admVaultExportBtn', body)?.addEventListener('click', async () => {
    try {
      const res = await api('/api/admin/vault/export');
      const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lokizenith-eternal-vault-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('⬇ Eternal JSON vault backup downloaded!', 'ok');
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#admVaultImportInput', body)?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = ($('#admVaultImportMode', body)?.value || 'merge') === 'replace' ? 'replace' : 'merge';
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const res = await api('/api/admin/vault/import', {
        method: 'POST',
        body: JSON.stringify({ mode, backup })
      });
      toast(`📥 Imported (${mode}): ${res.summary?.usersAdded || 0} added, ${res.summary?.usersMerged || 0} merged, ${res.summary?.convsRecovered || 0} chats recovered!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){
      toast(err.message || 'Invalid JSON backup file.', 'err');
    }
  });

  const ensureFirebaseAdmin = async () => {
    if (!window.LokiFirebase) throw new Error('Firebase Cloud Vault SDK not loaded.');
    if (!window.LokiFirebase.getCurrentUser()){
      await window.LokiFirebase.signInWithGoogle();
    }
    return window.LokiFirebase.getCurrentUser();
  };

  $('#admVaultCloudPushBtn', body)?.addEventListener('click', async () => {
    adminCloudSyncBusy = true;
    renderAdminDashboardModal();
    try {
      await ensureFirebaseAdmin();
      const res = await api('/api/admin/vault/cloud-payload');
      const cloudRes = await window.LokiFirebase.syncAdminVaultToCloud(res.payload);
      toast(`☁ Synced ${cloudRes.synced} accounts & conversation archives to Firebase Cloud Vault!`, 'ok');
    } catch(err){
      toast(err.message || 'Firebase Cloud sync failed.', 'err');
    } finally {
      adminCloudSyncBusy = false;
      renderAdminDashboardModal();
    }
  });

  $('#admVaultCloudPullBtn', body)?.addEventListener('click', async () => {
    adminCloudSyncBusy = true;
    renderAdminDashboardModal();
    try {
      await ensureFirebaseAdmin();
      const cloudData = await window.LokiFirebase.restoreAdminVaultFromCloud();
      const imp = await api('/api/admin/vault/import', {
        method: 'POST',
        body: JSON.stringify({ mode: 'merge', backup: { store: cloudData.store } })
      });
      toast(`⬇ Cloud Restore (${cloudData.count} cloud accounts): ${imp.summary?.usersAdded || 0} added, ${imp.summary?.usersMerged || 0} merged!`, 'ok');
      await fetchAdminOverview();
    } catch(err){
      toast(err.message || 'Could not restore from Firebase Cloud Vault.', 'err');
    } finally {
      adminCloudSyncBusy = false;
      renderAdminDashboardModal();
    }
  });

  $('#admBulkForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    adminBulkBusy = true;
    const segment = $('#admBulkSegment', body)?.value || 'all';
    const action = $('#admBulkAction', body)?.value || 'gift_tokens';
    const amount = Number($('#admBulkAmount', body)?.value || 25000);
    const plan = $('#admBulkPlan', body)?.value || 'pro';
    const durationMode = $('#admBulkDurMode', body)?.value || 'timed';
    const durationAmount = Number($('#admBulkDurAmt', body)?.value || 7);
    const durationUnit = $('#admBulkDurUnit', body)?.value || 'days';
    renderAdminDashboardModal();
    try {
      const res = await api('/api/admin/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ segment, action, amount, plan, durationMode, durationAmount, durationUnit })
      });
      if (res.account) updateAccount(res.account);
      toast(`⚡ ${res.summaryText || `Applied to ${res.count} user(s)!`}`, 'ok');
      await fetchAdminOverview();
    } catch(err){
      toast(err.message || 'Bulk operation failed.', 'err');
    } finally {
      adminBulkBusy = false;
      renderAdminDashboardModal();
    }
  });

  $('#admDirectNoticeForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const targetUsername = $('#admDirectTarget', body)?.value || '';
      const bonusTokens = Number($('#admDirectTokens', body)?.value || 0);
      const title = ($('#admDirectTitle', body)?.value || '').trim();
      const message = ($('#admDirectMessage', body)?.value || '').trim();
      const res = await api('/api/admin/direct-notice', {
        method: 'POST',
        body: JSON.stringify({ targetUsername, bonusTokens, title, message })
      });
      toast(`📩 Direct notice sent live to @${res.target}${res.addedTokens ? ` (+${Number(res.addedTokens).toLocaleString()} tokens)` : ''}!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('.adm-analyst-preset', body).forEach(btn => {
    btn.onclick = () => {
      adminAnalystQuestion = btn.dataset.aq || '';
      const inp = $('#admAnalystInput', body);
      if (inp) inp.value = adminAnalystQuestion;
      $('#admAnalystForm', body)?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };
  });

  $('#admAnalystForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    adminAnalystQuestion = ($('#admAnalystInput', body)?.value || '').trim();
    if (!adminAnalystQuestion) return;
    adminAnalystBusy = true;
    renderAdminDashboardModal();
    try {
      const res = await api('/api/admin/ai-analyst', {
        method: 'POST',
        body: JSON.stringify({ question: adminAnalystQuestion })
      });
      adminAnalystReport = res.report || '';
    } catch(err){
      toast(err.message || 'AI Admin Analyst failed.', 'err');
    } finally {
      adminAnalystBusy = false;
      renderAdminDashboardModal();
    }
  });

  // Timed Platform Maintenance Studio form submit
  $('#admMaintForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const maintenanceMode = !!$('#admMaintActiveChk', body)?.checked;
      const maintenanceTitle = ($('#admMaintTitleInput', body)?.value || '').trim() || 'Scheduled Platform Upgrade';
      const maintenanceDurationAmount = Math.max(1, Number($('#admMaintDurAmt', body)?.value || 15));
      const maintenanceDurationUnit = $('#admMaintDurUnit', body)?.value || 'minutes';
      const maintenanceArticle = ($('#admMaintArticleInput', body)?.value || '').trim();

      const res = await api('/api/admin/platform-config', {
        method: 'POST',
        body: JSON.stringify({
          maintenanceMode,
          maintenanceTitle,
          maintenanceDurationAmount,
          maintenanceDurationUnit,
          maintenanceArticle,
          maintenanceTimed: true
        })
      });
      if (res.config) {
        renderPlatformMotd(res.config);
        syncMaintenanceOverlay(res.config);
      }
      toast(maintenanceMode ? '🚧 Timed Maintenance activated live for all non-admins!' : '✅ Maintenance Mode turned off!', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  // Duration quick preset buttons
  $$('.adm-dur-preset-btn', body).forEach(btn => {
    btn.onclick = () => {
      const [amt, unit] = (btn.dataset.mpreset || '15:minutes').split(':');
      const amtEl = $('#admMaintDurAmt', body);
      const unitEl = $('#admMaintDurUnit', body);
      if (amtEl) amtEl.value = amt;
      if (unitEl) unitEl.value = unit;
      toast(`⏱ Set duration preset: ${amt} ${unit}`, 'info');
    };
  });

  // AI Release Article drafter button
  $('#admMaintAiDraftBtn', body)?.addEventListener('click', async () => {
    const prompt = ($('#admMaintAiPrompt', body)?.value || '').trim();
    if (!prompt) {
      toast('Please enter a brief description of what you are adding first!', 'warn');
      return;
    }
    adminMaintAiBusy = true;
    adminMaintAiPrompt = prompt;
    renderAdminDashboardModal();
    try {
      const res = await api('/api/admin/maintenance/ai-draft', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      const tInp = $('#admMaintTitleInput', body);
      const aInp = $('#admMaintArticleInput', body);
      if (tInp && res.title) tInp.value = res.title;
      if (aInp && res.article) aInp.value = res.article;
      toast('✨ AI created release article & title!', 'ok');
    } catch(err){
      toast(err.message || 'AI article drafting failed.', 'err');
    } finally {
      adminMaintAiBusy = false;
      renderAdminDashboardModal();
    }
  });

  // End Maintenance Now button
  $('#admMaintEndNowBtn', body)?.addEventListener('click', async () => {
    try {
      const res = await api('/api/admin/platform-config', {
        method: 'POST',
        body: JSON.stringify({ maintenanceMode: false })
      });
      if (res.config) {
        renderPlatformMotd(res.config);
        syncMaintenanceOverlay(res.config);
      }
      toast('⏹ Maintenance ended immediately!', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  // Preview buttons inside admin panel
  const triggerMaintPreview = () => {
    adminMaintPreviewActive = true;
    syncMaintenanceOverlay();
    toast('👁 Previewing Maintenance screen as seen by non-admins.', 'info');
  };
  $('#admMaintPreviewInsideBtn', body)?.addEventListener('click', triggerMaintPreview);
  $('#admMaintPreviewBtn2', body)?.addEventListener('click', triggerMaintPreview);

  // Global AI Directive & Platform Controls form
  $('#admPlatformGuardsForm', body)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const globalAiDirective = ($('#admGlobalDirectiveInput', body)?.value || '').trim();
      const globalStarkUnlocked = !!$('#admGlobalStarkChk', body)?.checked;
      const allowRegistrations = !!$('#admAllowRegChk', body)?.checked;
      const allowGoogleOAuth = !!$('#admAllowGoogleChk', body)?.checked;
      const defaultDailyLimit = Number($('#admDefLimitInput', body)?.value || 25000);
      const referralBonus = Number($('#admRefBonusInput', body)?.value || 25000);
      const res = await api('/api/admin/platform-config', {
        method: 'POST',
        body: JSON.stringify({ globalAiDirective, globalStarkUnlocked, allowRegistrations, allowGoogleOAuth, defaultDailyLimit, referralBonus })
      });
      if (res.config) renderPlatformMotd(res.config);
      toast('💾 Platform controls & Global AI Directive updated!', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  // Live Active Sockets: Disconnect & Sign Out buttons
  $$('.adm-disc-btn', body).forEach(btn => {
    btn.onclick = async () => {
      const targetUsername = btn.dataset.discUser;
      const revokeSessions = btn.dataset.discRevoke === '1';
      if (!targetUsername) return;
      try {
        const res = await api('/api/admin/disconnect-user', {
          method: 'POST',
          body: JSON.stringify({ targetUsername, revokeSessions })
        });
        toast(revokeSessions ? `🔒 Signed out & disconnected @${targetUsername} (${res.closedSockets || 0} socket(s))` : `⚡ Force disconnected @${targetUsername} (${res.closedSockets || 0} socket(s))`, 'ok');
        await fetchAdminOverview();
        renderAdminDashboardModal();
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  // Purge Stale Sessions button
  $('#admPurgeSessionsBtn', body)?.addEventListener('click', async () => {
    try {
      const res = await api('/api/admin/purge-sessions', { method: 'POST', body: JSON.stringify({}) });
      toast(`🧹 Purged ${res.purgedCount || 0} stale/orphaned sessions older than 14d!`, 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  // Export Full Audit Log as JSON
  $('#admExportAuditBtn', body)?.addEventListener('click', async () => {
    try {
      const res = await api('/api/admin/audit/export');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lokizenith-audit-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`⬇ Exported ${res.totalLogs || 0} security audit logs to JSON!`, 'ok');
    } catch(err){ toast(err.message, 'err'); }
  });

  $$('[data-view-profile]', body).forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const uname = el.dataset.viewProfile;
      if (uname) openUserProfileModal(uname);
    };
  });
}

async function openAdminDashboardModal(){
  if (!state.user?.isAdmin && state.inspectBackup){
    await exitInspectAccount();
    return;
  }
  if (!state.user?.isAdmin) return;
  await fetchAdminOverview();
  renderAdminDashboardModal();
  if (A()?.openModal) A().openModal('adminDashboardModal');
  else $('#adminDashboardModal').hidden = false;
}

/* ---------------- Admin Global Broadcast Notice (NEVER Resets Tokens) ---------------- */
function showAdminBroadcastModal(msg){
  const modal = $('#adminBroadcastNoticeModal');
  if (!modal) return;
  const titleEl = $('#adminBcastTitleText') || $('#adminBroadcastNoticeTitle');
  const txtEl = $('#adminBcastBodyText') || $('#adminBroadcastNoticeText');
  const fromEl = $('#adminBcastFrom') || $('#adminBroadcastNoticeFrom');
  const iconEl = $('#adminBcastIconOrb') || $('#adminBroadcastNoticeIcon');
  const headEl = $('#adminBcastModalHead') || $('#adminBroadcastNoticeBadge');
  const cardEl = $('#adminBroadcastCard');

  const level = msg.level || msg.style || 'info';
  const sender = msg.from || msg.by || 'Lokizenith';
  const iconChar = level === 'celebration' ? '🎉' : level === 'urgent' ? '🚨' : level === 'maintenance' ? '🛠' : '📢';
  const headText = level === 'celebration' ? '🎉 Global Celebration Announcement' : level === 'urgent' ? '🚨 Urgent Global Announcement' : level === 'maintenance' ? '🛠 System Update Announcement' : '📢 Global Admin Announcement';

  const rawTitle = String(msg.title || '').trim();
  const rawMessage = String(msg.message || '').trim();
  const isDefaultTitle = !rawTitle
    || rawTitle === '📢 Official Lokizenith Announcement'
    || rawTitle === 'Lokizenith Global Announcement'
    || rawTitle === 'System Announcement';

  if (isDefaultTitle && rawMessage){
    if (titleEl) titleEl.textContent = rawMessage;
    if (txtEl){
      txtEl.textContent = '';
      txtEl.style.display = 'none';
    }
  } else {
    if (titleEl) titleEl.textContent = rawTitle || rawMessage || '📢 Global Announcement';
    if (txtEl){
      txtEl.textContent = rawMessage;
      txtEl.style.display = rawMessage ? 'block' : 'none';
    }
  }

  if (fromEl) fromEl.textContent = `@${String(sender).replace(/^@/, '')}`;
  if (iconEl) iconEl.textContent = iconChar;
  if (headEl) headEl.textContent = headText;
  if (cardEl){
    cardEl.setAttribute('data-level', level);
  }

  const okBtn = $('#adminBcastOkBtn') || $('#adminBroadcastNoticeOkBtn');
  const closeX = $('#adminBcastCloseX') || $('#adminBroadcastNoticeCloseX');
  if (okBtn) okBtn.onclick = closeAdminBroadcastModal;
  if (closeX) closeX.onclick = closeAdminBroadcastModal;

  modal.hidden = false;
  modal.classList.remove('closing');
}

function closeAdminBroadcastModal(){
  const modal = $('#adminBroadcastNoticeModal');
  if (!modal) return;
  modal.hidden = true;
  modal.classList.remove('closing');
}

/* ---------------- Admin Global Reset Notice ---------------- */
function showAdminResetNotice(message){
  const modal = $('#adminResetNoticeModal');
  const txt = $('#adminNoticeText');
  if (txt) txt.textContent = message || 'Your usage has been reset by admin';
  if (!modal) return;
  const okBtn = $('#adminNoticeOkBtn');
  const closeX = $('#adminNoticeCloseX');
  if (okBtn) okBtn.onclick = closeAdminResetNotice;
  if (closeX) closeX.onclick = closeAdminResetNotice;
  modal.hidden = false;
  modal.classList.remove('closing');
}

function closeAdminResetNotice(){
  const modal = $('#adminResetNoticeModal');
  if (!modal) return;
  modal.hidden = true;
  modal.classList.remove('closing');
}

async function triggerAdminResetAll(){
  const agreeBtn = $('#admResetAgreeBtn') || $('#adminConfirmAgree');
  if (agreeBtn) agreeBtn.disabled = true;
  try {
    const res = await api('/api/admin/reset-all', { method: 'POST' });
    if (res.account) updateAccount(res.account);
    if (A()?.closeModal) A().closeModal('adminConfirmModal');
    else $('#adminConfirmModal').hidden = true;
    toast(`⚡ Reset usage for all ${res.resetCount || ''} accounts!`, 'ok');
    await fetchAdminOverview();
  } catch(err){
    toast(err.message, 'err');
  } finally {
    if (agreeBtn) agreeBtn.disabled = false;
  }
}

/* ============================================================================
   USER PROFILE STUDIO, INTERACTIVE IMAGE CROP SIZER & PUBLIC PROFILE VIEWER
   ============================================================================ */
const PROFILE_BACKGROUNDS = [
  { id: 'nebula', name: '🌌 Deep Nebula', desc: 'Cosmic indigo & emerald glow' },
  { id: 'matrix', name: '💻 Cyber Matrix', desc: 'Digital emerald pulse grid' },
  { id: 'aurora', name: '🌠 Northern Aurora', desc: 'Flowing teal & violet ribbons' },
  { id: 'starfield', name: '✨ Hyper Starfield', desc: 'Deep space starlight drift' },
  { id: 'cyberpunk', name: '🌆 Neon Cyberpunk', desc: 'Magenta & cyan synthwave night' },
  { id: 'gold', name: '👑 Royal Gold', desc: 'Obsidian & sovereign gold shimmer' }
];

const PROFILE_OVERLAYS = [
  { id: 'none', name: 'None', icon: '⊘' },
  { id: 'sparks', name: 'Floating Sparks', icon: '✨' },
  { id: 'scanlines', name: 'Holo Scanlines', icon: '📺' },
  { id: 'rain', name: 'Neon Rain', icon: '🌧' },
  { id: 'sakura', name: 'Starlight Petals', icon: '🌸' },
  { id: 'prism', name: 'Prism Flare', icon: '💎' },
  { id: 'pulse', name: 'Sonar Pulse', icon: '📡' }
];

const PROFILE_BADGE_CATALOG = [
  { id: 'pioneer', label: '🚀 Early Pioneer' },
  { id: 'coder', label: '⚡ LokiCode Architect' },
  { id: 'thinker', label: '🧠 Quantum Thinker' },
  { id: 'raider', label: '🌙 Late Night Raids' },
  { id: 'creator', label: '🎨 Creative Visionary' },
  { id: 'scientist', label: '🔬 Formula Master' },
  { id: 'vip', label: '💎 Zenith Elite' },
  { id: 'squad', label: '🎙 Squad Caller' }
];

const DEFAULT_BANNER_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="600" height="240">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050816"/>
      <stop offset="50%" stop-color="#0b1b3d"/>
      <stop offset="100%" stop-color="#042f2e"/>
    </linearGradient>
    <radialGradient id="glow" cx="72%" cy="42%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.42"/>
      <stop offset="60%" stop-color="#4facfe" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#050816" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="240" fill="url(#bg)"/>
  <rect width="600" height="240" fill="url(#glow)"/>
  <g fill="#ffffff" opacity="0.35">
    <circle cx="70" cy="48" r="1.5"/><circle cx="145" cy="82" r="1"/><circle cx="230" cy="36" r="1.8"/>
    <circle cx="320" cy="64" r="1.2"/><circle cx="480" cy="40" r="1.5"/><circle cx="540" cy="92" r="1.2"/>
  </g>
  <g fill="#0c192c" stroke="#38bdf8" stroke-opacity="0.28" stroke-width="1">
    <rect x="330" y="95" width="28" height="110"/>
    <rect x="364" y="70" width="34" height="135"/>
    <rect x="404" y="108" width="26" height="97"/>
    <rect x="436" y="48" width="38" height="157"/>
    <rect x="480" y="82" width="32" height="123"/>
    <rect x="518" y="62" width="40" height="143"/>
  </g>
  <rect y="195" width="600" height="45" fill="#030712" opacity="0.78"/>
</svg>`);

const userProfileCache = {};

function handleLiveProfileUpdated(prof){
  if (!prof || !prof.username) return;
  userProfileCache[prof.username.toLowerCase()] = prof;
  if (state.user && state.user.username.toLowerCase() === prof.username.toLowerCase()){
    updateAccount(Object.assign({}, state.user, prof));
  }
  state.teamChats.forEach(c => {
    if (Array.isArray(c.memberProfiles)){
      const idx = c.memberProfiles.findIndex(m => m.username.toLowerCase() === prof.username.toLowerCase());
      if (idx >= 0) c.memberProfiles[idx] = Object.assign({}, c.memberProfiles[idx], prof);
    }
    if (Array.isArray(c.messages)){
      c.messages.forEach(m => {
        if (m.username && m.username.toLowerCase() === prof.username.toLowerCase()){
          m.displayName = prof.displayName || prof.username;
          m.avatarUrl = prof.avatarUrl || '';
        }
      });
    }
  });
  if ($('#teamChatView')?.classList.contains('active')){
    renderTeamChatHeaderAndMembers();
    const feed = $('#tcMessages');
    if (feed){
      const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
      if (room){
        feed.innerHTML = '';
        (room.messages || []).forEach(m => feed.appendChild(renderTeamChatMessageEl(m)));
        feed.scrollTop = feed.scrollHeight;
      }
    }
  }
}

function getCachedMemberProfile(username){
  const low = String(username || '').toLowerCase();
  if (!low) return null;
  if (state.user && state.user.username.toLowerCase() === low) return state.user;
  if (userProfileCache[low]) return userProfileCache[low];
  for (const c of state.teamChats){
    const found = (c.memberProfiles || []).find(m => String(m.username || '').toLowerCase() === low);
    if (found){
      userProfileCache[low] = found;
      return found;
    }
  }
  return null;
}

function ensureProfileModalsInDom(){
  if (!$('#lzProfileStudioModal')){
    const m = document.createElement('div');
    m.className = 'modal';
    m.id = 'lzProfileStudioModal';
    m.hidden = true;
    m.innerHTML = `
      <div class="modal-card wide lz-prof-studio-card" id="lzProfileStudioCard">
        <div class="modal-head">
          <h2>🎨 Edit Your Profile</h2>
          <button type="button" class="icon-btn" id="lzProfileStudioCloseBtn" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" id="lzProfileStudioBody"></div>
      </div>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if (e.target === m) m.hidden = true;
    });
    $('#lzProfileStudioCloseBtn', m).onclick = () => { m.hidden = true; };
  }

  if (!$('#lzImageSizerModal')){
    const s = document.createElement('div');
    s.className = 'modal';
    s.id = 'lzImageSizerModal';
    s.hidden = true;
    s.style.zIndex = '1150';
    s.innerHTML = `
      <div class="modal-card lz-sizer-card">
        <div class="modal-head">
          <h2 id="lzSizerTitle">📐 Adjust Image Size &amp; Position</h2>
          <button type="button" class="icon-btn" id="lzSizerCloseBtn" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" id="lzSizerBody"></div>
      </div>
    `;
    document.body.appendChild(s);
    s.addEventListener('click', e => {
      if (e.target === s) s.hidden = true;
    });
    $('#lzSizerCloseBtn', s).onclick = () => { s.hidden = true; };
  }

  if (!$('#lzPublicProfileModal')){
    const p = document.createElement('div');
    p.className = 'modal';
    p.id = 'lzPublicProfileModal';
    p.hidden = true;
    p.style.zIndex = '1120';
    p.innerHTML = `
      <div class="modal-card lz-pub-prof-modal-card" id="lzPublicProfileCard">
        <div id="lzPublicProfileBody"></div>
      </div>
    `;
    document.body.appendChild(p);
    p.addEventListener('click', e => {
      if (e.target === p) p.hidden = true;
    });
  }
}

function openImageCropSizerModal(fileOrDataUrl, mode = 'avatar', onApply){
  ensureProfileModalsInDom();
  const modal = $('#lzImageSizerModal');
  const titleEl = $('#lzSizerTitle');
  const body = $('#lzSizerBody');
  if (!modal || !body) return;

  const isBanner = mode === 'banner';
  if (titleEl) titleEl.textContent = isBanner ? '🖼 Adjust Banner Image (600 × 240)' : '📷 Adjust Profile Picture Inside Circle';

  const loadImg = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const startWithSrc = async src => {
    let img;
    try {
      img = await loadImg(src);
    } catch(_){
      toast('Could not load selected image file.', 'err');
      return;
    }

    const cw = isBanner ? 600 : 260;
    const ch = isBanner ? 240 : 260;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    body.innerHTML = `
      <div class="lz-sizer-wrap">
        <p class="lz-sizer-hint">${isBanner
          ? 'Drag the picture to position it inside the <b>600 × 240</b> banner frame and use the slider to zoom.'
          : 'Drag the picture to center it inside the <b>round avatar</b> and choose the exact size with the slider below.'}</p>
        <div class="lz-sizer-stage ${isBanner ? 'banner-stage' : 'avatar-stage'}">
          <canvas id="lzSizerCanvas" width="${cw}" height="${ch}"></canvas>
          ${isBanner ? `<span class="lz-banner-dim-pill">600 × 240</span>` : `<div class="lz-avatar-circle-guide"></div>`}
        </div>
        <div class="lz-sizer-controls">
          <span>🔍 Size</span>
          <input type="range" id="lzSizerZoom" min="1" max="3.5" step="0.02" value="1">
          <b id="lzSizerZoomVal">100%</b>
        </div>
        <div class="lz-sizer-actions">
          <button type="button" class="btn-ghost" id="lzSizerCancelBtn">Cancel</button>
          <button type="button" class="btn-primary" id="lzSizerApplyBtn">✓ Apply ${isBanner ? 'Banner' : 'Profile Picture'}</button>
        </div>
      </div>
    `;

    const canvas = $('#lzSizerCanvas', body);
    const ctx = canvas.getContext('2d');
    const zoomInput = $('#lzSizerZoom', body);
    const zoomVal = $('#lzSizerZoomVal', body);

    const baseScale = Math.max(cw / Math.max(1, img.width), ch / Math.max(1, img.height));

    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cw, ch);

      const scale = baseScale * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (cw - dw) / 2 + panX;
      const dy = (ch - dh) / 2 + panY;

      ctx.save();
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      if (!isBanner){
        // Shade outside the circle so user clearly sees the round crop
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 12, 0.62)';
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.arc(cw / 2, ch / 2, (cw / 2) - 8, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.strokeStyle = '#00ff9c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, (cw / 2) - 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    draw();

    zoomInput.oninput = () => {
      zoom = parseFloat(zoomInput.value) || 1;
      if (zoomVal) zoomVal.textContent = `${Math.round(zoom * 100)}%`;
      draw();
    };

    const startDrag = (clientX, clientY) => {
      dragging = true;
      lastX = clientX;
      lastY = clientY;
    };
    const moveDrag = (clientX, clientY) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const factorX = cw / Math.max(1, rect.width);
      const factorY = ch / Math.max(1, rect.height);
      panX += (clientX - lastX) * factorX;
      panY += (clientY - lastY) * factorY;
      lastX = clientX;
      lastY = clientY;
      draw();
    };
    const endDrag = () => { dragging = false; };

    canvas.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    canvas.addEventListener('touchstart', e => {
      if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    canvas.addEventListener('touchend', endDrag);

    $('#lzSizerCancelBtn', body).onclick = () => { modal.hidden = true; };
    $('#lzSizerApplyBtn', body).onclick = () => {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = isBanner ? 600 : 240;
      outCanvas.height = isBanner ? 240 : 240;
      const octx = outCanvas.getContext('2d');

      const ratioX = outCanvas.width / cw;
      const ratioY = outCanvas.height / ch;
      const scale = baseScale * zoom;
      const dw = img.width * scale * ratioX;
      const dh = img.height * scale * ratioY;
      const dx = ((cw - img.width * scale) / 2 + panX) * ratioX;
      const dy = ((ch - img.height * scale) / 2 + panY) * ratioY;

      octx.fillStyle = '#090d16';
      octx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      if (!isBanner){
        octx.save();
        octx.beginPath();
        octx.arc(outCanvas.width / 2, outCanvas.height / 2, outCanvas.width / 2, 0, Math.PI * 2);
        octx.clip();
      }
      octx.drawImage(img, dx, dy, dw, dh);
      if (!isBanner) octx.restore();

      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.88);
      modal.hidden = true;
      if (typeof onApply === 'function') onApply(dataUrl);
    };

    modal.hidden = false;
  };

  if (typeof fileOrDataUrl === 'string'){
    startWithSrc(fileOrDataUrl);
  } else if (fileOrDataUrl instanceof Blob){
    const reader = new FileReader();
    reader.onload = () => startWithSrc(String(reader.result || ''));
    reader.readAsDataURL(fileOrDataUrl);
  }
}

function bindFourSecondLoopVideo(videoEl){
  if (!videoEl) return;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.playsInline = true;
  videoEl.addEventListener('timeupdate', () => {
    if (videoEl.currentTime >= 4.0){
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    }
  });
  videoEl.play().catch(() => {});
}

function openProfileStudioModal(){
  if (!state.user){
    openAuthOverlay('login');
    return;
  }
  ensureProfileModalsInDom();
  const modal = $('#lzProfileStudioModal');
  const body = $('#lzProfileStudioBody');
  if (!modal || !body) return;

  const u = state.user;
  const effPlan = String(u.plan || u.effectivePlan || u.planTier || 'free').toLowerCase();
  const canUseVideoBanner = effPlan === 'pro' || effPlan === 'ultimate';

  const draft = {
    displayName: u.displayName || u.username || '',
    avatarUrl: u.avatarUrl || u.googlePicture || '',
    bannerUrl: u.bannerUrl || '',
    bannerVideoUrl: u.bannerVideoUrl || '',
    bio: u.bio || '',
    customStatus: u.customStatus || 'Late night raids',
    pronouns: u.pronouns || '',
    profileBg: u.profileBg || 'nebula',
    profileOverlay: u.profileOverlay || 'sparks',
    profileAccent: u.profileAccent || '#00ff9c',
    profileBadges: Array.isArray(u.profileBadges) && u.profileBadges.length ? [...u.profileBadges] : ['pioneer', 'coder']
  };

  const changeCount = Number(u.displayNameChangeCount || 0);
  const cooldownMs = Number(u.displayNameCooldownMs || 0);
  const canEditDisplayName = changeCount === 0 || cooldownMs <= 0;

  function renderStudio(){
    const bannerSrc = draft.bannerUrl || DEFAULT_BANNER_SVG;
    const hasVideoBanner = Boolean(draft.bannerVideoUrl && canUseVideoBanner);
    const avatarInitial = String(draft.displayName || u.username || 'U').trim().charAt(0).toUpperCase();

    body.innerHTML = `
      <div class="lz-ps-layout">
        <!-- Live Nova-Style 600x240 Banner (Image or 4s Animated Video) + Overlapping Circular Avatar Preview -->
        <div class="lz-ps-preview-shell bg-${esc(draft.profileBg)} ov-${esc(draft.profileOverlay)}" style="--prof-acc:${esc(draft.profileAccent)}">
          <div class="lz-ps-banner-wrap" id="lzPsBannerTrigger" title="Click to upload & size Banner (600 × 240)">
            ${hasVideoBanner
              ? `<video src="${esc(draft.bannerVideoUrl)}" class="lz-ps-banner-img lz-ps-banner-video" autoplay muted loop playsinline></video>`
              : `<img src="${esc(bannerSrc)}" alt="Profile Banner" class="lz-ps-banner-img">`}
            <div class="lz-ps-hover-pencil banner-pencil">
              <span class="lz-pencil-ic">✏️</span>
              <b>Change Banner</b>
              <small>Click to pick image &amp; size (600 × 240)${canUseVideoBanner ? ' or use Animated Video below' : ''}</small>
            </div>
            <span class="lz-ps-dim-tag">${hasVideoBanner ? '🎬 4s LOOP VIDEO · 600 × 240' : '600 × 240'}</span>
          </div>

          <div class="lz-ps-identity-strip">
            <div class="lz-ps-avatar-wrap" id="lzPsAvatarTrigger" title="Click to upload & size Profile Picture">
              ${draft.avatarUrl
                ? `<img src="${esc(draft.avatarUrl)}" alt="${esc(draft.displayName)}" class="lz-ps-avatar-img">`
                : `<div class="lz-ps-avatar-fallback">${esc(avatarInitial)}</div>`}
              <div class="lz-ps-hover-pencil avatar-pencil">
                <span class="lz-pencil-ic">✏️</span>
              </div>
              <span class="lz-ps-online-dot" title="Online"></span>
            </div>

            <div class="lz-ps-name-block">
              <div class="lz-ps-dname-row">
                <h3 id="lzPsLiveDisplayName">${esc(draft.displayName || u.username)}</h3>
                ${getPlanTagHtml(effPlan, '', u.username)}
                ${draft.pronouns ? `<span class="lz-ps-pronouns">${esc(draft.pronouns)}</span>` : ''}
              </div>
              <div class="lz-ps-status-row">
                <span class="lz-ps-status-text">Online · <span id="lzPsLiveStatus">${esc(draft.customStatus || 'Ready to build')}</span></span>
                <span class="lz-ps-uname-pill">@${esc(u.username)}</span>
              </div>
            </div>

            <div class="lz-ps-quick-btns">
              <button type="button" class="btn-ghost" id="lzPsUploadVideoBannerBtn" title="${canUseVideoBanner ? 'Upload an animated video banner (plays first 4 seconds in silent loop)' : 'Upgrade to Pro or Ultimate to unlock Animated Video Banners'}">
                ${canUseVideoBanner ? '🎬 Animated Video Banner (4s)' : '🔒 Video Banner (Pro+)'}
              </button>
              <button type="button" class="btn-ghost" id="lzPsViewPublicBtn" title="See how others view your profile">👁 Preview Card</button>
              <button type="button" class="btn-ghost" id="lzPsOpenGiftFromProfBtn" title="Redeem Gift or DEV Codes">🎁 Codes</button>
            </div>
          </div>

          <div class="lz-ps-bio-preview" id="lzPsLiveBio">${draft.bio ? esc(draft.bio) : 'Add a personal description below so teammates and visitors know who you are…'}</div>
        </div>

        <input type="file" id="lzPsAvatarFileInput" accept="image/*" hidden>
        <input type="file" id="lzPsBannerFileInput" accept="image/*" hidden>
        <input type="file" id="lzPsBannerVideoInput" accept="video/mp4,video/webm,video/quicktime,video/*" hidden>

        <!-- Form Controls Grid -->
        <div class="lz-ps-form-grid">
          <div class="lz-ps-field">
            <div class="lz-ps-label-row">
              <label for="lzPsDisplayNameInput">Display Name</label>
              ${changeCount === 0
                ? `<span class="lz-ps-cooldown-tag free">✨ First change is FREE! (14d wait after)</span>`
                : canEditDisplayName
                ? `<span class="lz-ps-cooldown-tag ready">✓ Cooldown complete — Ready to change</span>`
                : `<span class="lz-ps-cooldown-tag locked">⏳ Wait ${esc(u.displayNameCooldownText || '14d')} before next change</span>`}
            </div>
            <input type="text" id="lzPsDisplayNameInput" maxlength="32" value="${esc(draft.displayName)}" ${canEditDisplayName ? '' : 'disabled'} placeholder="${esc(u.username)}">
            <small class="lz-ps-help">Default is your username. After your first free change, you must wait 14 days before changing your Display Name again.</small>
          </div>

          <div class="lz-ps-field">
            <div class="lz-ps-label-row">
              <label>Username (Permanent)</label>
              <span class="lz-ps-cooldown-tag perm">🔒 Unchangeable</span>
            </div>
            <input type="text" value="@${esc(u.username)}" disabled class="lz-ps-locked-input">
            <small class="lz-ps-help">Your unique @username handle identifies your account and cannot be changed.</small>
          </div>

          <div class="lz-ps-field">
            <label for="lzPsStatusInput">Custom Activity / Status Line</label>
            <input type="text" id="lzPsStatusInput" maxlength="60" value="${esc(draft.customStatus)}" placeholder="e.g. Late night raids, Coding in MATLAB…">
          </div>

          <div class="lz-ps-field">
            <label for="lzPsPronounsInput">Pronouns / Title Tag (optional)</label>
            <input type="text" id="lzPsPronounsInput" maxlength="24" value="${esc(draft.pronouns)}" placeholder="e.g. he/him, she/her, Builder, Founder">
          </div>

          <div class="lz-ps-field full">
            <label for="lzPsBioInput">Personal Description / About Me</label>
            <textarea id="lzPsBioInput" rows="3" maxlength="360" placeholder="Write a description about yourself, your projects, favorite languages, or interests…">${esc(draft.bio)}</textarea>
          </div>

          <div class="lz-ps-field">
            <label>Animated Profile Background</label>
            <div class="lz-ps-choice-grid">
              ${PROFILE_BACKGROUNDS.map(b => `
                <button type="button" class="lz-ps-choice-btn ${draft.profileBg === b.id ? 'on' : ''}" data-pbg="${esc(b.id)}">
                  <b>${b.name}</b>
                  <small>${esc(b.desc)}</small>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="lz-ps-field">
            <label>Animated Profile Overlay &amp; Accent</label>
            <div class="lz-ps-overlay-pills">
              ${PROFILE_OVERLAYS.map(o => `
                <button type="button" class="lz-ps-ov-pill ${draft.profileOverlay === o.id ? 'on' : ''}" data-pov="${esc(o.id)}">${o.icon} ${esc(o.name)}</button>
              `).join('')}
            </div>
            <div class="lz-ps-accent-row">
              <span>Profile Glow Color:</span>
              <input type="color" id="lzPsAccentColor" value="${esc(draft.profileAccent || '#00ff9c')}">
              ${draft.avatarUrl ? `<button type="button" class="adm-mini-btn" id="lzPsClearAvatarBtn">Reset Avatar</button>` : ''}
              ${(draft.bannerUrl || draft.bannerVideoUrl) ? `<button type="button" class="adm-mini-btn" id="lzPsClearBannerBtn">Reset Banner</button>` : ''}
            </div>
          </div>

          <div class="lz-ps-field full">
            <label>Showcase Profile Badges (Click to toggle on your public profile)</label>
            <div class="lz-ps-badges-row">
              ${PROFILE_BADGE_CATALOG.map(b => {
                const on = draft.profileBadges.includes(b.id);
                return `<button type="button" class="lz-ps-badge-chip ${on ? 'on' : ''}" data-pbadge="${esc(b.id)}">${b.label}</button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="lz-ps-footer">
          <span class="lz-ps-footer-note">All profile changes are staged above and saved together when you click <b>Apply Changes</b>.</span>
          <div class="lz-ps-footer-btns">
            <button type="button" class="btn-ghost" id="lzPsCancelBtn">Cancel</button>
            <button type="button" class="btn-primary" id="lzPsApplyAllBtn">✨ Apply Changes</button>
          </div>
        </div>
      </div>
    `;

    bindFourSecondLoopVideo($('.lz-ps-banner-video', body));

    // Bind Avatar & Banner Pencil Click -> File Picker -> Crop & Size Modal
    const avInp = $('#lzPsAvatarFileInput', body);
    const bnInp = $('#lzPsBannerFileInput', body);
    const vidInp = $('#lzPsBannerVideoInput', body);

    $('#lzPsAvatarTrigger', body).onclick = () => avInp?.click();
    $('#lzPsBannerTrigger', body).onclick = () => bnInp?.click();

    $('#lzPsUploadVideoBannerBtn', body).onclick = () => {
      if (!canUseVideoBanner){
        modal.hidden = true;
        toast('🔒 Animated Video Banners require Loki Pro or Loki Ultimate!', 'err');
        if (window.LokiPlans?.openPlansView) window.LokiPlans.openPlansView();
        else if (A()?.showView) A().showView('benches');
        return;
      }
      vidInp?.click();
    };

    vidInp.onchange = () => {
      const f = vidInp.files?.[0];
      if (!f) return;
      if (f.size > 4.2 * 1024 * 1024){
        toast('Video file is too large (max ~4MB recommended for fast profile sync).', 'err');
        vidInp.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        draft.bannerVideoUrl = String(reader.result || '');
        renderStudio();
        toast('🎬 Animated Video Banner staged (loops first 4s silently)! Click "Apply Changes" to save.', 'ok');
      };
      reader.readAsDataURL(f);
      vidInp.value = '';
    };

    avInp.onchange = () => {
      const f = avInp.files?.[0];
      if (!f) return;
      openImageCropSizerModal(f, 'avatar', croppedDataUrl => {
        draft.avatarUrl = croppedDataUrl;
        renderStudio();
        toast('📷 Avatar sized! Click "Apply Changes" to save.', 'ok');
      });
      avInp.value = '';
    };

    bnInp.onchange = () => {
      const f = bnInp.files?.[0];
      if (!f) return;
      openImageCropSizerModal(f, 'banner', croppedDataUrl => {
        draft.bannerUrl = croppedDataUrl;
        draft.bannerVideoUrl = '';
        renderStudio();
        toast('🖼 Banner sized (600 × 240)! Click "Apply Changes" to save.', 'ok');
      });
      bnInp.value = '';
    };

    $('#lzPsDisplayNameInput', body)?.addEventListener('input', e => {
      draft.displayName = e.target.value;
      const el = $('#lzPsLiveDisplayName', body);
      if (el) el.textContent = draft.displayName.trim() || u.username;
    });
    $('#lzPsStatusInput', body)?.addEventListener('input', e => {
      draft.customStatus = e.target.value;
      const el = $('#lzPsLiveStatus', body);
      if (el) el.textContent = draft.customStatus.trim() || 'Online';
    });
    $('#lzPsPronounsInput', body)?.addEventListener('input', e => {
      draft.pronouns = e.target.value;
    });
    $('#lzPsBioInput', body)?.addEventListener('input', e => {
      draft.bio = e.target.value;
      const el = $('#lzPsLiveBio', body);
      if (el) el.textContent = draft.bio.trim() || 'Add a personal description below…';
    });
    $('#lzPsAccentColor', body)?.addEventListener('input', e => {
      draft.profileAccent = e.target.value;
      const shell = $('.lz-ps-preview-shell', body);
      if (shell) shell.style.setProperty('--prof-acc', draft.profileAccent);
    });

    $$('[data-pbg]', body).forEach(btn => {
      btn.onclick = () => {
        draft.profileBg = btn.dataset.pbg;
        renderStudio();
      };
    });
    $$('[data-pov]', body).forEach(btn => {
      btn.onclick = () => {
        draft.profileOverlay = btn.dataset.pov;
        renderStudio();
      };
    });
    $$('[data-pbadge]', body).forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.pbadge;
        if (draft.profileBadges.includes(id)){
          draft.profileBadges = draft.profileBadges.filter(x => x !== id);
        } else {
          draft.profileBadges.push(id);
        }
        renderStudio();
      };
    });

    $('#lzPsClearAvatarBtn', body)?.addEventListener('click', () => {
      draft.avatarUrl = '';
      renderStudio();
    });
    $('#lzPsClearBannerBtn', body)?.addEventListener('click', () => {
      draft.bannerUrl = '';
      draft.bannerVideoUrl = '';
      renderStudio();
    });

    $('#lzPsViewPublicBtn', body)?.addEventListener('click', () => {
      openUserProfileModal(u.username, Object.assign({}, u, draft));
    });
    $('#lzPsOpenGiftFromProfBtn', body)?.addEventListener('click', () => {
      modal.hidden = true;
      openCodesModal('gift');
    });
    $('#lzPsCancelBtn', body)?.addEventListener('click', () => {
      modal.hidden = true;
    });

    $('#lzPsApplyAllBtn', body).onclick = async () => {
      const applyBtn = $('#lzPsApplyAllBtn', body);
      if (applyBtn) applyBtn.disabled = true;
      try {
        const res = await api('/api/profile/update', {
          method: 'POST',
          body: JSON.stringify(draft)
        });
        if (res.account) updateAccount(res.account);
        if (res.profile) handleLiveProfileUpdated(res.profile);
        modal.hidden = true;
        toast('✨ Profile updated & broadcasted live!', 'ok');
      } catch(err){
        toast(err.message || 'Could not update profile', 'err');
      } finally {
        if (applyBtn) applyBtn.disabled = false;
      }
    };
  }

  renderStudio();
  modal.hidden = false;
}

async function openUserProfileModal(username, previewOverride = null){
  const clean = String(username || '').trim().replace(/^@/, '');
  if (!clean) return;
  ensureProfileModalsInDom();
  const modal = $('#lzPublicProfileModal');
  const body = $('#lzPublicProfileBody');
  if (!modal || !body) return;

  let prof = previewOverride || getCachedMemberProfile(clean);
  if (!previewOverride){
    try {
      const res = await api('/api/profile/' + encodeURIComponent(clean));
      if (res && res.profile){
        prof = res.profile;
        userProfileCache[clean.toLowerCase()] = prof;
      }
    } catch(_){}
  }
  if (!prof){
    prof = {
      username: clean,
      displayName: clean,
      avatarUrl: '',
      bannerUrl: '',
      bannerVideoUrl: '',
      bio: '',
      customStatus: 'Online',
      profileBg: 'nebula',
      profileOverlay: 'sparks',
      profileAccent: '#00ff9c',
      profileBadges: ['pioneer'],
      effectivePlan: 'free',
      online: isOnline(clean)
    };
  }

  const dname = prof.displayName || prof.username || clean;
  const bannerSrc = prof.bannerUrl || DEFAULT_BANNER_SVG;
  const bannerVideo = prof.bannerVideoUrl || '';
  const avatarSrc = prof.avatarUrl || prof.googlePicture || '';
  const initial = dname.trim().charAt(0).toUpperCase();
  const online = previewOverride ? true : (prof.online ?? isOnline(prof.username));
  const isMe = state.user && String(state.user.username || '').toLowerCase() === String(prof.username || '').toLowerCase();
  const badges = (prof.profileBadges || []).map(id => PROFILE_BADGE_CATALOG.find(b => b.id === id)).filter(Boolean);
  const profPlan = String(prof.plan || prof.effectivePlan || prof.planTier || 'free').toLowerCase();
  const stats = prof.stats || {};
  const memberDays = prof.createdAt ? Math.max(1, Math.round((Date.now() - Number(prof.createdAt)) / 86400000)) : null;
  const hoursActive = stats.hoursActive != null ? stats.hoursActive : Math.round(Number(prof.totalTimeSeconds || 0) / 3600);
  const teamMessages = stats.teamMessages != null ? stats.teamMessages : 0;
  const badgeCount = stats.badgeCount != null ? stats.badgeCount : badges.length;

  body.innerHTML = `
    <div class="lz-pub-card lz-profile-v2 bg-${esc(prof.profileBg || 'nebula')} ov-${esc(prof.profileOverlay || 'sparks')}" style="--prof-acc:${esc(prof.profileAccent || '#00ff9c')}">
      <div class="lz-pub-banner">
        ${bannerVideo
          ? `<video src="${esc(bannerVideo)}" class="lz-pub-banner-img lz-pub-banner-video" autoplay muted loop playsinline></video>`
          : `<img src="${esc(bannerSrc)}" alt="${esc(dname)} banner" class="lz-pub-banner-img">`}
        <button type="button" class="lz-pub-close-x" id="lzPubCloseBtn" aria-label="Close">✕</button>
        <span class="lz-ps-dim-tag">${bannerVideo ? '🎬 4s LOOP · 600 × 240' : '600 × 240'}</span>
      </div>

      <div class="lz-pub-main">
        <div class="lz-pub-top-row">
          <div class="lz-pub-avatar-holder">
            ${avatarSrc
              ? `<img src="${esc(avatarSrc)}" alt="${esc(dname)}" class="lz-pub-avatar-img">`
              : `<div class="lz-pub-avatar-fallback">${esc(initial)}</div>`}
            <span class="lz-pub-status-dot ${online ? 'on' : 'off'}" title="${online ? 'Online' : 'Offline'}"></span>
          </div>
          <div class="lz-pub-top-actions">
            ${isMe ? `<button type="button" class="btn-primary" id="lzPubEditMeBtn">✏️ Edit My Profile</button>` : ''}
          </div>
        </div>

        <div class="lz-pub-identity">
          <div class="lz-pub-name-line">
            <h2>${esc(dname)}</h2>
            ${getPlanTagHtml(profPlan, '', prof.username)}
            ${prof.pronouns ? `<span class="lz-ps-pronouns">${esc(prof.pronouns)}</span>` : ''}
            ${prof.isRootAdmin ? `<span class="adm-role-badge root">👑 OWNER</span>` : prof.isAdmin ? `<span class="adm-role-badge full">🛡️ ADMIN</span>` : ''}
          </div>
          <div class="lz-pub-subline">
            <span class="lz-pub-online-text">${online ? 'Online' : 'Offline'}${prof.customStatus ? ` · ${esc(prof.customStatus)}` : ''}</span>
            <span class="lz-ps-uname-pill">@${esc(prof.username)}</span>
          </div>
        </div>

        <div class="lz-stat-grid">
          <div class="lz-stat"><b>${memberDays == null ? '—' : memberDays}</b><small>Days here</small></div>
          <div class="lz-stat"><b>${hoursActive}</b><small>Hours active</small></div>
          <div class="lz-stat"><b>${teamMessages}</b><small>Team messages</small></div>
          <div class="lz-stat"><b>${badgeCount}</b><small>Badges</small></div>
        </div>

        ${badges.length ? `
          <div class="lz-pub-badges">
            ${badges.map(b => `<span class="lz-pub-badge" title="${esc(b.label)}">${b.label}</span>`).join('')}
          </div>
        ` : `<div class="lz-pub-badges"><span class="lz-pub-badge">No badges yet</span></div>`}

        <div class="lz-pub-section">
          <h4>ABOUT ME</h4>
          <p dir="auto">${prof.bio ? esc(prof.bio).replace(/\n/g, '<br>') : `<span style="color:var(--muted);">No bio added yet.</span>`}</p>
        </div>

        ${prof.createdAt ? `
          <div class="lz-pub-section meta">
            <span>🗓 Member since ${new Date(prof.createdAt).toLocaleDateString()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  bindFourSecondLoopVideo($('.lz-pub-banner-video', body));

  $('#lzPubCloseBtn', body).onclick = () => { modal.hidden = true; };
  const editMe = $('#lzPubEditMeBtn', body);
  if (editMe){
    editMe.onclick = () => {
      modal.hidden = true;
      openProfileStudioModal();
    };
  }
  modal.hidden = false;
}

/* ============================================================================
   TEAM CHAT 1000x REDESIGN + ATTACHMENTS + @ MENTION AUTOCOMPLETE +
   VOICE RECORDER & PILL PLAYER + LIVE GROUP VOICE CALLS & 4-STEP SCREEN SHARE
   ============================================================================ */
let tcPendingAttachments = [];
let tcVoiceRecordingActive = false;
let tcVoiceMediaRecorder = null;
let tcVoiceChunks = [];
let tcVoiceStartTs = 0;
let tcVoiceTimer = 0;
let tcVoiceDurationSec = 0;
let tcVoiceWaveformSamples = [];
let tcMentionIndex = 0;
let tcMentionCandidates = [];
let sendTeamChatFromComposer = async () => {};

// Active Group Voice Call State
const teamCallState = {
  activeChatId: null,
  inCall: false,
  callData: null,
  incomingCall: null,
  localStream: null,
  localAudioCtx: null,
  localAnalyser: null,
  localMicMuted: false,
  locallyMutedUsers: new Set(),
  volumeMap: {},
  volLoopTimer: 0,
  screenShareActive: false,
  screenStream: null,
  screenFrameTimer: 0,
  remoteScreenFrames: {},
  peers: new Map(),
  remoteAnalysers: new Map()
};

const TEAM_CALL_ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function closeTeamCallPeers(){
  teamCallState.peers.forEach(rec => {
    try { rec.pc.close(); } catch(_){}
    try { rec.audio.pause(); rec.audio.srcObject = null; } catch(_){}
  });
  teamCallState.peers.clear();
  teamCallState.remoteAnalysers.clear();
}

function watchRemoteAudio(userId, stream){
  const ctx = getAudioCtx();
  if (!ctx || !stream) return;
  try {
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    teamCallState.remoteAnalysers.set(userId, analyser);
  } catch(_){}
}

function levelFromAnalyser(analyser){
  if (!analyser) return 0;
  const arr = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(arr);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return Math.min(1, (sum / Math.max(1, arr.length)) / 65);
}

async function flushIce(rec){
  if (!rec.pc.remoteDescription || !rec.pendingIce.length) return;
  const queued = rec.pendingIce.splice(0);
  for (const c of queued){
    try { await rec.pc.addIceCandidate(c); } catch(_){}
  }
}

function ensureCallPeer(remoteUserId){
  if (!remoteUserId || remoteUserId === state.user?.id) return null;
  if (teamCallState.peers.has(remoteUserId)) return teamCallState.peers.get(remoteUserId);
  const pc = new RTCPeerConnection(TEAM_CALL_ICE);
  const audio = new Audio();
  audio.autoplay = true;
  const rec = { pc, audio, pendingIce: [], offered: false };
  teamCallState.peers.set(remoteUserId, rec);
  const stream = teamCallState.localStream;
  if (stream) stream.getAudioTracks().forEach(t => pc.addTrack(t, stream));
  else pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.onicecandidate = ev => {
    if (!ev.candidate || !teamCallState.activeChatId) return;
    sendWS({
      type: 'teamcall:signal',
      chatId: teamCallState.activeChatId,
      toUserId: remoteUserId,
      signal: { kind: 'ice', candidate: ev.candidate }
    });
  };
  pc.ontrack = ev => {
    const remote = ev.streams && ev.streams[0];
    if (!remote) return;
    audio.srcObject = remote;
    audio.muted = teamCallState.locallyMutedUsers.has(remoteUserId);
    audio.play().catch(() => {});
    watchRemoteAudio(remoteUserId, remote);
  };
  return rec;
}

async function offerCallTo(remoteUserId){
  const rec = ensureCallPeer(remoteUserId);
  if (!rec || rec.offered || rec.pc.signalingState !== 'stable') return;
  try {
    const offer = await rec.pc.createOffer();
    await rec.pc.setLocalDescription(offer);
    rec.offered = true;
    sendWS({
      type: 'teamcall:signal',
      chatId: teamCallState.activeChatId,
      toUserId: remoteUserId,
      signal: { kind: 'offer', sdp: rec.pc.localDescription }
    });
  } catch(_){
    rec.offered = false;
  }
}

function syncCallPeers(call){
  if (!teamCallState.inCall || !call || call.chatId !== teamCallState.activeChatId) return;
  const people = Array.isArray(call.participants) ? call.participants : [];
  const ids = new Set(people.map(p => p.userId));
  teamCallState.peers.forEach((rec, id) => {
    if (!ids.has(id)){
      try { rec.pc.close(); } catch(_){}
      teamCallState.peers.delete(id);
      teamCallState.remoteAnalysers.delete(id);
    }
  });
  const me = people.find(p => p.userId === state.user?.id);
  if (!me) return;
  people.forEach(p => {
    if (p.userId === me.userId) return;
    const later = (p.joinedAt || 0) < (me.joinedAt || 0) || ((p.joinedAt || 0) === (me.joinedAt || 0) && String(me.userId) > String(p.userId));
    if (later) offerCallTo(p.userId).catch(() => {});
    else ensureCallPeer(p.userId);
  });
}

async function handleTeamCallSignal(msg){
  if (!msg || msg.toUserId && msg.toUserId !== state.user?.id) return;
  if (!teamCallState.inCall || teamCallState.activeChatId !== msg.chatId) return;
  const from = msg.fromUserId;
  const sig = msg.signal || {};
  const rec = ensureCallPeer(from);
  if (!rec) return;
  try {
    if (sig.kind === 'offer' && sig.sdp){
      const polite = String(state.user.id) > String(from);
      if (rec.pc.signalingState !== 'stable'){
        if (!polite) return;
        await rec.pc.setLocalDescription({ type: 'rollback' });
      }
      await rec.pc.setRemoteDescription(sig.sdp);
      await flushIce(rec);
      const answer = await rec.pc.createAnswer();
      await rec.pc.setLocalDescription(answer);
      sendWS({
        type: 'teamcall:signal',
        chatId: msg.chatId,
        toUserId: from,
        signal: { kind: 'answer', sdp: rec.pc.localDescription }
      });
    } else if (sig.kind === 'answer' && sig.sdp){
      if (rec.pc.signalingState === 'have-local-offer'){
        await rec.pc.setRemoteDescription(sig.sdp);
        await flushIce(rec);
      }
    } else if (sig.kind === 'ice' && sig.candidate){
      if (rec.pc.remoteDescription) await rec.pc.addIceCandidate(sig.candidate);
      else rec.pendingIce.push(sig.candidate);
    }
  } catch(_){}
}

function playMentionNotificationSound(){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.001, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.28);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.3);
    });
  } catch(_){}
}

function playIncomingCallRingtone(){
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.001, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.32);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.35);
    });
  } catch(_){}
}

function upsertTeamChat(chat){
  const idx = state.teamChats.findIndex(c => c.id === chat.id);
  if (idx >= 0) state.teamChats[idx] = chat;
  else state.teamChats.unshift(chat);
  if (Array.isArray(chat.memberProfiles)){
    chat.memberProfiles.forEach(mp => {
      if (mp && mp.username) userProfileCache[mp.username.toLowerCase()] = mp;
    });
  }
  if (!state.activeTeamChatId) state.activeTeamChatId = chat.id;
}

function updateTeamChatBadge(hasUnread){
  const b = $('#teamChatBadge');
  if (!b) return;
  b.hidden = !hasUnread;
}

function isOnline(username){
  const low = String(username || '').toLowerCase();
  return state.onlineUsers.some(u => u.toLowerCase() === low);
}

function getRoomMemberProfile(room, username){
  const low = String(username || '').toLowerCase();
  const fromRoom = (room?.memberProfiles || []).find(p => String(p.username || '').toLowerCase() === low);
  if (fromRoom) return fromRoom;
  return getCachedMemberProfile(username) || { username, displayName: username, avatarUrl: '' };
}

function renderTeamChatRoomList(){
  const listEl = $('#tcRoomList');
  if (!listEl) return;
  if (!state.teamChats.length){
    listEl.innerHTML = `<div class="tc-empty-list">No team chats yet.<br>Create a room above to chat, share files &amp; start live voice calls!</div>`;
    return;
  }
  const sorted = [...state.teamChats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  listEl.innerHTML = sorted.map(c => {
    const active = c.id === state.activeTeamChatId;
    const last = c.messages?.[c.messages.length - 1];
    const lastAuthor = last ? (last.displayName || last.username) : '';
    const lastText = last
      ? (last.voiceRecording ? '🎤 Voice message' : (last.attachments?.length ? `📎 ${last.attachments.length} attachment(s)` : last.content))
      : 'No messages yet';
    const preview = last ? `${lastAuthor}: ${lastText}`.slice(0, 48) : 'Ready for collaboration';
    const hasCall = teamCallState.callData && teamCallState.callData.chatId === c.id && (teamCallState.callData.participants || []).length > 0;
    const avatars = (c.memberUsernames || []).slice(0, 4).map(u => {
      const mp = getRoomMemberProfile(c, u);
      return getAvatarHtml(mp, 20, 'tc-mini-stack-av');
    }).join('');
    return `<button type="button" class="tc-room-item ${active ? 'on' : ''}" data-cid="${esc(c.id)}">
      <div class="tc-ri-top">
        <b>${esc(c.name)}</b>
        <div class="tc-ri-badges">
          ${hasCall ? `<span class="tc-live-call-pill">🔊 LIVE</span>` : ''}
          <span class="tc-ri-cnt">${(c.memberUsernames || []).length} 👥</span>
        </div>
      </div>
      <small dir="auto">${esc(preview)}</small>
      <div class="tc-ri-av-stack">${avatars}</div>
    </button>`;
  }).join('');

  $$('.tc-room-item', listEl).forEach(btn => {
    btn.onclick = () => {
      state.activeTeamChatId = btn.dataset.cid;
      sendWS({ type: 'room:join', chatId: state.activeTeamChatId });
      renderTeamChatView();
    };
  });
}

function renderTypingIndicator(){
  const el = $('#tcTyping');
  if (!el) return;
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  if (!room){ el.innerHTML = ''; return; }
  const now = Date.now();
  const map = state.typingMap[room.id] || {};
  const active = Object.keys(map).filter(u => u !== state.user?.username && now - map[u] < 5000);
  if (!active.length){
    el.innerHTML = '';
    return;
  }
  const names = active.map(u => getRoomMemberProfile(room, u)?.displayName || u);
  el.innerHTML = `<span class="tc-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(names.join(', '))} ${active.length > 1 ? 'are' : 'is'} typing</span>`;
}

const TC_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '✅', '👀'];
let tcOpenThreadId = null;
let tcActivityOpen = false;
let tcEmojiFor = null;

function roomActivityItems(room){
  if (!room) return [];
  if (Array.isArray(room.activity) && room.activity.length) return room.activity;
  return (room.messages || []).slice(-12).reverse().map(m => ({
    id: 'd_' + m.id,
    kind: m.role === 'assistant' ? 'ai' : 'message',
    text: `${m.displayName || m.username} ${m.role === 'assistant' ? 'replied in the room' : 'sent a message'}`,
    ts: m.ts
  }));
}

function renderPinnedBar(){
  const bar = $('#tcPinnedBar');
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  if (!bar || !room) return;
  const pinned = (room.messages || []).filter(m => m.pinned && !m.threadParentId);
  if (!pinned.length){ bar.hidden = true; bar.innerHTML = ''; return; }
  const top = pinned[pinned.length - 1];
  bar.hidden = false;
  bar.innerHTML = `<span>📌 Pinned</span><button type="button" data-jump-pin="${esc(top.id)}">${esc(String(top.content || 'Attachment').slice(0, 80))}</button><small>${pinned.length}</small>`;
  bar.querySelector('[data-jump-pin]')?.addEventListener('click', () => {
    const node = document.querySelector(`.tc-msg[data-mid="${CSS.escape(top.id)}"]`);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function renderActivityFeed(){
  const panel = $('#tcActivity');
  if (!panel) return;
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  panel.hidden = !tcActivityOpen;
  if (!tcActivityOpen || !room) return;
  const items = roomActivityItems(room);
  panel.innerHTML = `<div class="tc-drawer-head"><b>Team activity</b><button type="button" class="icon-btn" id="tcActivityClose">✕</button></div>
    <div class="tc-drawer-body">${items.length ? items.map(a => `<div class="tc-activity-item"><span>${esc(a.text || '')}</span><small>${a.ts ? fmtTime(a.ts) : ''}${a.kind ? ' · ' + esc(a.kind) : ''}</small></div>`).join('') : '<div class="tc-empty-list">No activity yet.</div>'}</div>`;
  $('#tcActivityClose', panel).onclick = () => { tcActivityOpen = false; panel.hidden = true; };
}

function renderThreadPanel(){
  const panel = $('#tcThread');
  if (!panel) return;
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  if (!tcOpenThreadId || !room){ panel.hidden = true; panel.innerHTML = ''; return; }
  const parent = (room.messages || []).find(m => m.id === tcOpenThreadId);
  if (!parent){ tcOpenThreadId = null; panel.hidden = true; return; }
  const replies = (room.messages || []).filter(m => m.threadParentId === parent.id);
  panel.hidden = false;
  panel.innerHTML = `<div class="tc-drawer-head"><b>Thread</b><button type="button" class="icon-btn" id="tcThreadClose">✕</button></div>
    <div class="tc-drawer-body" id="tcThreadBody"></div>
    <form class="tc-thread-compose" id="tcThreadForm">
      <input id="tcThreadInput" placeholder="Reply in thread… @Loki asks the AI" autocomplete="off">
      <button class="btn-primary" type="submit">Reply</button>
    </form>`;
  const body = $('#tcThreadBody', panel);
  body.appendChild(renderTeamChatMessageEl(parent, null, { inThread: true }));
  let prev = parent;
  replies.forEach(m => { body.appendChild(renderTeamChatMessageEl(m, prev, { inThread: true })); prev = m; });
  $('#tcThreadClose', panel).onclick = () => { tcOpenThreadId = null; panel.hidden = true; };
  $('#tcThreadForm', panel).onsubmit = e => {
    e.preventDefault();
    const input = $('#tcThreadInput', panel);
    const text = input?.value || '';
    if (input) input.value = '';
    sendTeamChatFromComposer({ content: text, parentId: parent.id });
  };
}

function fmtVoiceSec(sec){
  const s = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

function highlightMentionsHtml(escapedHtml){
  return String(escapedHtml || '').replace(/(^|\s)(@[A-Za-z0-9_.\u0590-\u05FF-]+)/g, (m, pre, tag) => {
    const isAi = /^@(ai|lokizenith|loki)$/i.test(tag);
    return `${pre}<span class="tc-mention-chip ${isAi ? 'ai' : 'user'}">${tag}</span>`;
  });
}

// Inline Dark Pill Voice Message Player (Matches Screenshot 4: circular purple Play/Pause on left, vertical waveform bars, duration on right)
function buildVoiceMessagePillEl(v){
  const wrap = document.createElement('div');
  wrap.className = 'tc-voice-pill-player';
  const durSec = Math.max(1, Math.round(Number(v.durationSec || 4)));
  const waveform = Array.isArray(v.waveform) && v.waveform.length
    ? v.waveform.slice(0, 18)
    : [0.35, 0.72, 0.55, 0.9, 0.64, 0.82, 0.48, 0.95, 0.6, 0.75, 0.5, 0.4];

  wrap.innerHTML = `
    <button type="button" class="tc-vp-play-btn" aria-label="Play or Pause Voice Message">
      <svg class="tc-vp-icon-play" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.55.83l10.29-6.86a1 1 0 0 0 0-1.66L9.55 4.31A1 1 0 0 0 8 5.14z"/></svg>
      <svg class="tc-vp-icon-pause" viewBox="0 0 24 24" width="18" height="18" hidden><path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>
    </button>
    <div class="tc-vp-bars">
      ${waveform.map(h => `<span class="tc-vp-bar" style="height:${Math.max(24, Math.min(100, Math.round(Number(h) * 100)))}%"></span>`).join('')}
    </div>
    <span class="tc-vp-time">${fmtVoiceSec(durSec)}</span>
  `;

  let audio = null;
  let synthTimer = 0;
  let synthElapsed = 0;
  let isPlaying = false;

  const btn = wrap.querySelector('.tc-vp-play-btn');
  const playIc = wrap.querySelector('.tc-vp-icon-play');
  const pauseIc = wrap.querySelector('.tc-vp-icon-pause');
  const bars = [...wrap.querySelectorAll('.tc-vp-bar')];
  const timeEl = wrap.querySelector('.tc-vp-time');

  const updateVisual = (playing, progressRatio = 0, remainingSec = durSec) => {
    isPlaying = playing;
    wrap.classList.toggle('playing', playing);
    if (playIc) playIc.hidden = playing;
    if (pauseIc) pauseIc.hidden = !playing;
    const activeCount = Math.round(progressRatio * bars.length);
    bars.forEach((b, i) => b.classList.toggle('played', i < activeCount));
    if (timeEl) timeEl.textContent = fmtVoiceSec(remainingSec);
  };

  btn.onclick = async e => {
    e.stopPropagation();
    if (v.audioDataUrl && !String(v.audioDataUrl).startsWith('synth:')){
      if (!audio){
        audio = new Audio(v.audioDataUrl);
        audio.ontimeupdate = () => {
          const total = (audio.duration && isFinite(audio.duration)) ? audio.duration : durSec;
          const cur = audio.currentTime || 0;
          const rem = Math.max(0, Math.ceil(total - cur));
          updateVisual(!audio.paused, Math.min(1, cur / Math.max(0.1, total)), rem);
        };
        audio.onended = () => {
          audio.currentTime = 0;
          updateVisual(false, 0, durSec);
        };
      }
      if (isPlaying){
        audio.pause();
        updateVisual(false, audio.currentTime / Math.max(0.1, audio.duration || durSec), Math.max(0, Math.ceil((audio.duration || durSec) - audio.currentTime)));
      } else {
        try {
          await audio.play();
          updateVisual(true, audio.currentTime / Math.max(0.1, audio.duration || durSec), Math.max(0, Math.ceil((audio.duration || durSec) - audio.currentTime)));
        } catch(_){
          // Fallback if audio decode blocked
          playMentionNotificationSound();
        }
      }
    } else {
      // Synthesized fallback voice clip playback with pause/resume support
      if (isPlaying){
        clearInterval(synthTimer);
        updateVisual(false, synthElapsed / durSec, Math.max(0, Math.ceil(durSec - synthElapsed)));
      } else {
        playMentionNotificationSound();
        updateVisual(true, synthElapsed / durSec, Math.max(0, Math.ceil(durSec - synthElapsed)));
        clearInterval(synthTimer);
        synthTimer = setInterval(() => {
          synthElapsed += 0.2;
          if (synthElapsed >= durSec){
            clearInterval(synthTimer);
            synthElapsed = 0;
            updateVisual(false, 0, durSec);
          } else {
            updateVisual(true, synthElapsed / durSec, Math.max(0, Math.ceil(durSec - synthElapsed)));
          }
        }, 200);
      }
    }
  };

  return wrap;
}

function renderTeamChatMessageEl(m, prev, opts = {}){
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  const row = document.createElement('div');
  const mine = m.username === state.user?.username;
  const isAi = m.role === 'assistant';
  const grouped = !!(prev && prev.username === m.username && prev.role === m.role && Math.abs((m.ts || 0) - (prev.ts || 0)) < 5 * 60 * 1000);
  row.className = `tc-msg ${mine ? 'mine' : ''} ${isAi ? 'ai' : ''} ${grouped ? 'grouped' : ''} ${m.pinned ? 'pinned' : ''}`;
  row.dataset.mid = m.id;

  const mp = isAi ? null : getRoomMemberProfile(room, m.username);
  const dispName = isAi ? 'Loki' : (m.displayName || mp?.displayName || m.username);
  const avatarUrl = isAi ? '' : (m.avatarUrl || mp?.avatarUrl || mp?.googlePicture || '');
  const initial = String(dispName || 'U').trim().charAt(0).toUpperCase();
  const replies = opts.inThread ? 0 : (room?.messages || []).filter(x => x.threadParentId === m.id).length;

  let bodyHtml = '';
  if (m.content && m.content !== '🎤 Voice Message'){
    if (isAi && A()?.mdToHtml){
      bodyHtml = A().mdToHtml(m.content);
    } else {
      bodyHtml = highlightMentionsHtml(esc(m.content).replace(/\n/g, '<br>'));
    }
  }

  const attachments = Array.isArray(m.attachments) ? m.attachments : [];
  const attHtml = attachments.length ? `
    <div class="tc-msg-attachments">
      ${attachments.map(a => (a.kind === 'image' || a.isImage) && a.dataUrl
        ? `<div class="tc-att-img-wrap"><img src="${esc(a.dataUrl)}" alt="${esc(a.name)}" class="tc-att-img"></div>`
        : `<a href="${esc(a.dataUrl || '#')}" download="${esc(a.name || 'file')}" class="tc-att-file-card">
             <span class="tc-att-ic">📄</span>
             <div><b>${esc(a.name || 'Attachment')}</b><small>${esc(a.mime || 'File')}</small></div>
           </a>`
      ).join('')}
    </div>
  ` : '';

  const reactions = m.reactions && typeof m.reactions === 'object' ? m.reactions : {};
  const reactHtml = Object.keys(reactions).filter(k => (reactions[k] || []).length).map(k => {
    const mineReact = (reactions[k] || []).includes(state.user?.username);
    return `<button type="button" class="tc-react-chip ${mineReact ? 'on' : ''}" data-emoji="${esc(k)}" data-mid="${esc(m.id)}">${k} ${(reactions[k] || []).length}</button>`;
  }).join('');

  row.innerHTML = `
    <div class="tc-msg-head-row">
      <div class="tc-msg-author-trigger ${isAi ? '' : 'clickable'}" ${isAi ? '' : `data-prof-u="${esc(m.username)}" title="View profile"`}>
        ${isAi
          ? `<span class="tc-msg-av ai-av">⚡</span>`
          : avatarUrl
          ? `<img src="${esc(avatarUrl)}" alt="${esc(dispName)}" class="tc-msg-av-img" referrerpolicy="no-referrer">`
          : `<span class="tc-msg-av">${esc(initial)}</span>`}
        <span class="tc-msg-author">${esc(dispName)}</span>
        ${isAi ? `<small class="tc-msg-handle">AI</small>` : (!isAi && dispName !== m.username ? `<small class="tc-msg-handle">@${esc(m.username)}</small>` : '')}
      </div>
      <span class="tc-msg-time">${m.pinned ? '📌 ' : ''}${fmtTime(m.ts)}</span>
    </div>
    <div class="tc-msg-bubble" dir="auto">
      ${bodyHtml ? `<div class="tc-msg-text">${bodyHtml}</div>` : ''}
      ${attHtml}
      <div class="tc-msg-voice-slot"></div>
      ${reactHtml ? `<div class="tc-react-row">${reactHtml}</div>` : ''}
      <div class="tc-msg-actions">
        <button type="button" class="tc-act" data-pick-emoji="${esc(m.id)}">☺ React</button>
        ${opts.inThread ? '' : `<button type="button" class="tc-act" data-open-thread="${esc(m.id)}">${replies ? replies + ' replies' : 'Thread'}</button>`}
        <button type="button" class="tc-act" data-pin-msg="${esc(m.id)}">${m.pinned ? 'Unpin' : 'Pin'}</button>
      </div>
    </div>
  `;

  if (!isAi){
    const trig = row.querySelector('.tc-msg-author-trigger');
    if (trig) trig.onclick = () => openUserProfileModal(m.username);
  }

  if (m.voiceRecording){
    const slot = row.querySelector('.tc-msg-voice-slot');
    if (slot) slot.appendChild(buildVoiceMessagePillEl(m.voiceRecording));
  }

  $$('.tc-att-img', row).forEach(img => {
    img.onclick = () => {
      if (window.Features?.openImageLightbox) window.Features.openImageLightbox(img.src, img.alt);
    };
  });

  row.querySelectorAll('[data-emoji]').forEach(btn => {
    btn.onclick = e => { e.stopPropagation(); sendTeamChatAction('react', { messageId: m.id, emoji: btn.dataset.emoji }); };
  });
  const pick = row.querySelector('[data-pick-emoji]');
  if (pick) pick.onclick = e => {
    e.stopPropagation();
    const pop = document.createElement('div');
    pop.className = 'tc-emoji-pop';
    pop.innerHTML = TC_EMOJIS.map(em => `<button type="button" data-em="${em}">${em}</button>`).join('');
    pick.parentElement.style.position = 'relative';
    pick.parentElement.appendChild(pop);
    pop.onclick = ev => {
      const b = ev.target.closest('[data-em]');
      if (!b) return;
      sendTeamChatAction('react', { messageId: m.id, emoji: b.dataset.em });
      pop.remove();
    };
    setTimeout(() => document.addEventListener('click', () => pop.remove(), { once: true }), 0);
  };
  const threadBtn = row.querySelector('[data-open-thread]');
  if (threadBtn) threadBtn.onclick = e => { e.stopPropagation(); tcOpenThreadId = m.id; tcActivityOpen = false; renderThreadPanel(); renderActivityFeed(); };
  const pinBtn = row.querySelector('[data-pin-msg]');
  if (pinBtn) pinBtn.onclick = e => { e.stopPropagation(); sendTeamChatAction('pin', { messageId: m.id, pinned: !m.pinned }); };

  return row;
}

function sendTeamChatAction(kind, extra){
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  if (!room) return;
  sendWS({ type: kind === 'pin' ? 'teamchat:pin' : 'teamchat:react', chatId: room.id, ...extra });
}

function rerenderTeamFeed(){
  const feed = $('#tcMessages');
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  if (!feed || !room) return;
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
  feed.innerHTML = '';
  let prev = null;
  (room.messages || []).forEach(m => {
    if (m.threadParentId) return;
    feed.appendChild(renderTeamChatMessageEl(m, prev));
    prev = m;
  });
  if (nearBottom) feed.scrollTop = feed.scrollHeight;
  renderPinnedBar();
}

function appendTeamChatMessage(){
  rerenderTeamFeed();
  renderThreadPanel();
}

function renderTeamChatHeaderAndMembers(){
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  const head = $('#tcRoomHead');
  if (!head || !room) return;
  const isOwner = room.ownerId === state.user?.id;
  const members = room.memberUsernames || [];
  const activeCallHere = teamCallState.inCall && teamCallState.activeChatId === room.id;

  head.innerHTML = `
    <div class="tc-head-info">
      <div class="tc-head-title-row">
        <h3>💬 ${esc(room.name)}</h3>
        <span class="tc-online-count-badge">${members.filter(u => isOnline(u)).length} / ${members.length} Online</span>
      </div>
      <div class="tc-member-pills">
        ${members.map(u => {
          const online = isOnline(u);
          const mp = getRoomMemberProfile(room, u);
          const dname = mp?.displayName || u;
          const ownerTag = u === room.ownerUsername ? ' 👑' : '';
          return `<span class="tc-mpill ${online ? 'on' : ''}" data-prof="${esc(u)}" title="Click to view ${esc(dname)}'s profile">
            ${getAvatarHtml(mp, 20, 'tc-mpill-av')}
            <i class="tc-mpill-dot"></i>
            <b>${esc(dname)}</b>${ownerTag}
            ${isOwner && u !== room.ownerUsername ? `<button type="button" class="tc-mremove" data-rm="${esc(u)}" title="Remove access">✕</button>` : ''}
          </span>`;
        }).join('')}
      </div>
    </div>
    <div class="tc-head-actions">
      <button type="button" class="btn-primary tc-voice-call-btn ${activeCallHere ? 'in-call' : ''}" id="tcStartVoiceCallBtn">
        ${activeCallHere ? '🔊 In Voice Call' : '📞 Voice Call'}
      </button>
      ${isOwner ? `
        <form class="tc-add-form" id="tcAddMemberForm">
          <input type="text" id="tcAddUsername" list="lzUserSuggest" placeholder="Add member username…" autocomplete="off">
          <button type="submit" class="btn-ghost">+ Invite</button>
        </form>
      ` : `<span class="tc-shared-note">Host: <b>${esc(room.ownerUsername)}</b></span>`}
    </div>
  `;

  $$('.tc-mpill', head).forEach(pill => {
    pill.onclick = e => {
      if (e.target.closest('.tc-mremove')) return;
      openUserProfileModal(pill.dataset.prof);
    };
  });

  $$('.tc-mremove', head).forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const target = btn.dataset.rm;
      try {
        const res = await api(`/api/team-chats/${encodeURIComponent(room.id)}/members/${encodeURIComponent(target)}`, { method: 'DELETE' });
        if (res.chat) upsertTeamChat(res.chat);
        renderTeamChatHeaderAndMembers();
        renderTeamChatRoomList();
        toast(`Removed access for ${target}`);
      } catch(err){
        toast(err.message, 'err');
      }
    };
  });

  const callBtn = $('#tcStartVoiceCallBtn', head);
  if (callBtn){
    callBtn.onclick = () => {
      if (teamCallState.inCall && teamCallState.activeChatId === room.id){
        const stage = $('#tcActiveCallStage');
        if (stage) stage.scrollIntoView({ behavior: 'smooth' });
      } else {
        startOrJoinTeamVoiceCall(room.id, true);
      }
    };
  }

  const addForm = $('#tcAddMemberForm', head);
  const addInp = $('#tcAddUsername', head);
  if (addInp) attachUserSuggestions(addInp);
  if (addForm){
    addForm.onsubmit = async e => {
      e.preventDefault();
      const uname = (addInp?.value || '').trim();
      if (!uname) return;
      try {
        const res = await api(`/api/team-chats/${encodeURIComponent(room.id)}/members`, {
          method: 'POST',
          body: JSON.stringify({ username: uname })
        });
        if (res.chat) upsertTeamChat(res.chat);
        if (addInp) addInp.value = '';
        renderTeamChatHeaderAndMembers();
        renderTeamChatRoomList();
        toast(res.alreadyMember ? `${uname} already has access` : `✓ Added ${uname} to ${room.name}!`, 'ok');
      } catch(err){
        toast(err.message, 'err');
      }
    };
  }
}

/* ---------------- Group Voice Call + Screen Share Engine ---------------- */
function ensureIncomingCallOverlayInDom(){
  if ($('#lzIncomingCallOverlay')) return $('#lzIncomingCallOverlay');
  const ov = document.createElement('div');
  ov.className = 'lz-incoming-call-overlay';
  ov.id = 'lzIncomingCallOverlay';
  ov.hidden = true;
  document.body.appendChild(ov);
  return ov;
}

function handleIncomingTeamCall(call){
  if (!call || !call.chatId) return;
  teamCallState.callData = call;
  // If user is already in this call, don't show incoming popup
  if (teamCallState.inCall && teamCallState.activeChatId === call.chatId) return;

  teamCallState.incomingCall = call;
  playIncomingCallRingtone();

  const ov = ensureIncomingCallOverlayInDom();
  const participants = Array.isArray(call.participants) ? call.participants : [];

  ov.innerHTML = `
    <div class="lz-inc-card">
      <div class="lz-inc-pulse-rings">
        <div class="lz-inc-caller-av">
          ${call.callerAvatarUrl
            ? `<img src="${esc(call.callerAvatarUrl)}" alt="${esc(call.callerDisplayName || call.callerUsername)}">`
            : `<span>${esc(String(call.callerDisplayName || call.callerUsername || 'U').charAt(0).toUpperCase())}</span>`}
        </div>
      </div>
      <div class="lz-inc-badge">📞 INCOMING GROUP VOICE CALL</div>
      <h2>${esc(call.callerDisplayName || call.callerUsername)} is calling…</h2>
      <p class="lz-inc-group">in <b>💬 ${esc(call.chatName || 'Team Chat')}</b></p>

      <div class="lz-inc-joined-box">
        <small>Already in call (${participants.length}):</small>
        <div class="lz-inc-joined-list">
          ${participants.map(p => `
            <span class="lz-inc-pchip">
              ${p.avatarUrl ? `<img src="${esc(p.avatarUrl)}" alt="">` : `<i>${esc((p.displayName || p.username || 'U').charAt(0).toUpperCase())}</i>`}
              <b>${esc(p.displayName || p.username)}</b>
            </span>
          `).join('')}
        </div>
      </div>

      <div class="lz-inc-actions">
        <button type="button" class="lz-inc-btn decline" id="lzIncDeclineBtn">✕ Decline</button>
        <button type="button" class="lz-inc-btn accept" id="lzIncJoinBtn">📞 Join Call</button>
      </div>
    </div>
  `;

  $('#lzIncDeclineBtn', ov).onclick = () => {
    ov.hidden = true;
    teamCallState.incomingCall = null;
    toast('Call declined — you can join anytime from the Team Chat header.');
  };

  $('#lzIncJoinBtn', ov).onclick = () => {
    ov.hidden = true;
    teamCallState.incomingCall = null;
    state.activeTeamChatId = call.chatId;
    if (A()?.showView) A().showView('teamchat');
    startOrJoinTeamVoiceCall(call.chatId, false);
  };

  ov.hidden = false;
}

function handleTeamCallStateUpdate(call){
  if (!call || !call.chatId) return;
  teamCallState.callData = call;
  // Update incoming overlay if visible for this chat
  const ov = $('#lzIncomingCallOverlay');
  if (ov && !ov.hidden && teamCallState.incomingCall?.chatId === call.chatId){
    handleIncomingTeamCall(call);
  }
  renderTeamChatRoomList();
  if (teamCallState.inCall && teamCallState.activeChatId === call.chatId){
    syncCallPeers(call);
    renderActiveTeamCallStage();
  }
}

function handleTeamCallEnded(chatId){
  if (teamCallState.callData?.chatId === chatId){
    teamCallState.callData = null;
  }
  const ov = $('#lzIncomingCallOverlay');
  if (ov && !ov.hidden && teamCallState.incomingCall?.chatId === chatId){
    ov.hidden = true;
    teamCallState.incomingCall = null;
  }
  if (teamCallState.inCall && teamCallState.activeChatId === chatId){
    cleanupLocalTeamCallMedia();
    teamCallState.inCall = false;
    teamCallState.activeChatId = null;
    renderActiveTeamCallStage();
    renderTeamChatHeaderAndMembers();
  }
  renderTeamChatRoomList();
}

function handleTeamCallVolume(msg){
  if (!msg || !msg.userId) return;
  if (teamCallState.locallyMutedUsers.has(msg.userId)) return;
  teamCallState.volumeMap[msg.userId] = Number(msg.volume) || 0;
  updateCallTileVolumeDOM(msg.userId, teamCallState.volumeMap[msg.userId]);
}

function handleTeamCallAudioChunk(msg){
  if (!msg || !msg.userId || !msg.audioDataUrl) return;
  if (msg.userId === state.user?.id) return;
  if (teamCallState.locallyMutedUsers.has(msg.userId)) return;
  try {
    const a = new Audio(msg.audioDataUrl);
    a.volume = 0.9;
    a.play().catch(()=>{});
  } catch(_){}
}

function handleTeamCallScreenShareEvent(msg){
  if (!msg || !msg.chatId) return;
  if (msg.type === 'teamcall:screenshare-stop'){
    delete teamCallState.remoteScreenFrames[msg.userId];
    renderActiveTeamCallStage();
    return;
  }
  if (msg.type === 'teamcall:screenshare-frame' && msg.frameDataUrl){
    teamCallState.remoteScreenFrames[msg.userId] = {
      frameDataUrl: msg.frameDataUrl,
      username: msg.username,
      displayName: msg.displayName || msg.username
    };
    const imgEl = document.querySelector(`[data-remote-screen-uid="${CSS.escape(msg.userId)}"]`);
    if (imgEl){
      imgEl.src = msg.frameDataUrl;
    } else {
      renderActiveTeamCallStage();
    }
  } else if (msg.type === 'teamcall:screenshare-start'){
    renderActiveTeamCallStage();
  }
}

function updateCallTileVolumeDOM(userId, vol){
  const tile = document.querySelector(`.tc-call-tile[data-uid="${CSS.escape(userId)}"]`);
  if (!tile) return;
  const avWrap = tile.querySelector('.tc-call-av-orb');
  const norm = Math.max(0, Math.min(1, Number(vol) || 0));
  const scale = (1 + norm * 0.28).toFixed(3);
  tile.classList.toggle('speaking', norm > 0.08);
  if (avWrap){
    avWrap.style.transform = `scale(${scale})`;
  }
}

async function startOrJoinTeamVoiceCall(chatId, isStarter = false){
  if (!chatId) return;
  teamCallState.activeChatId = chatId;
  teamCallState.inCall = true;

  // Start microphone capture & live volume analyser (with graceful fallback if no mic in headless)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    teamCallState.localStream = stream;
    const ctx = getAudioCtx();
    if (ctx){
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      teamCallState.localAnalyser = analyser;
    }
  } catch(_){
    // Continues in call even if browser has no physical microphone attached
  }

  clearInterval(teamCallState.volLoopTimer);
  teamCallState.volLoopTimer = setInterval(() => {
    if (!teamCallState.inCall || !teamCallState.activeChatId || !state.user) return;
    let vol = 0;
    if (!teamCallState.localMicMuted && teamCallState.localAnalyser){
      const arr = new Uint8Array(teamCallState.localAnalyser.frequencyBinCount);
      teamCallState.localAnalyser.getByteFrequencyData(arr);
      let sum = 0;
      for (let i = 0; i < arr.length; i++) sum += arr[i];
      vol = Math.min(1, (sum / Math.max(1, arr.length)) / 65);
    }
    teamCallState.volumeMap[state.user.id] = vol;
    updateCallTileVolumeDOM(state.user.id, vol);
    teamCallState.remoteAnalysers.forEach((analyser, uid) => {
      const rv = levelFromAnalyser(analyser);
      teamCallState.volumeMap[uid] = rv;
      updateCallTileVolumeDOM(uid, rv);
    });
    if (vol > 0.05){
      sendWS({ type: 'teamcall:volume', chatId: teamCallState.activeChatId, volume: vol });
    }
  }, 160);

  sendWS({
    type: isStarter ? 'teamcall:start' : 'teamcall:join',
    chatId
  });

  // Optimistic local participant list while WS syncs
  if (!teamCallState.callData || teamCallState.callData.chatId !== chatId){
    const room = state.teamChats.find(c => c.id === chatId);
    teamCallState.callData = {
      chatId,
      chatName: room?.name || 'Team Call',
      callerUsername: state.user?.username || 'You',
      callerDisplayName: state.user?.displayName || state.user?.username || 'You',
      participants: state.user ? [{
        userId: state.user.id,
        username: state.user.username,
        displayName: state.user.displayName || state.user.username,
        avatarUrl: state.user.avatarUrl || state.user.googlePicture || '',
        isSharingScreen: false
      }] : []
    };
  }

  renderTeamChatHeaderAndMembers();
  renderActiveTeamCallStage();
}

function leaveTeamVoiceCall(){
  const cid = teamCallState.activeChatId;
  cleanupLocalTeamCallMedia();
  teamCallState.inCall = false;
  teamCallState.activeChatId = null;
  if (cid){
    sendWS({ type: 'teamcall:leave', chatId: cid });
  }
  renderActiveTeamCallStage();
  renderTeamChatHeaderAndMembers();
}

function cleanupLocalTeamCallMedia(){
  stopLocalScreenShare(false);
  closeTeamCallPeers();
  clearInterval(teamCallState.volLoopTimer);
  if (teamCallState.localStream){
    try { teamCallState.localStream.getTracks().forEach(t => t.stop()); } catch(_){}
    teamCallState.localStream = null;
  }
  teamCallState.localAnalyser = null;
  teamCallState.localMicMuted = false;
}

// 4-Step Screen Share Implementation using navigator.mediaDevices.getDisplayMedia()
async function startLocalScreenShare(){
  const errBanner = $('#tcCallErrorBanner');
  if (errBanner) errBanner.hidden = true;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function'){
    showScreenShareError('Screen sharing is not supported by this browser.');
    return;
  }

  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });
    } catch(firstErr){
      // If system audio isn't supported on this OS/tab, retry with video-only if not user-canceled
      if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'AbortError'){
        throw firstErr;
      }
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    }

    teamCallState.screenStream = stream;
    teamCallState.screenShareActive = true;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack){
      videoTrack.onended = () => {
        stopLocalScreenShare(true);
      };
    }

    if (teamCallState.activeChatId){
      sendWS({ type: 'teamcall:screenshare-start', chatId: teamCallState.activeChatId });
    }

    renderActiveTeamCallStage();
    attachLocalScreenStreamToVideo();

    // Stream compressed canvas snapshots over WebSocket so remote call members see the live shared screen
    clearInterval(teamCallState.screenFrameTimer);
    teamCallState.screenFrameTimer = setInterval(() => {
      if (!teamCallState.screenShareActive || !teamCallState.screenStream || !teamCallState.activeChatId) return;
      const vid = $('#tcLocalScreenShareVideo');
      if (!vid || !vid.videoWidth) return;
      try {
        const c = document.createElement('canvas');
        c.width = 480;
        c.height = Math.max(240, Math.round((vid.videoHeight / Math.max(1, vid.videoWidth)) * 480));
        const ctx = c.getContext('2d');
        ctx.drawImage(vid, 0, 0, c.width, c.height);
        const frameDataUrl = c.toDataURL('image/jpeg', 0.55);
        sendWS({
          type: 'teamcall:screenshare-frame',
          chatId: teamCallState.activeChatId,
          frameDataUrl
        });
      } catch(_){}
    }, 900);

    toast('🖥 Screen sharing started live!', 'ok');
  } catch(err){
    const denied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.name === 'AbortError';
    const msg = denied
      ? 'Screen share was canceled or screen-recording permission was denied.'
      : `Could not start screen share: ${err?.message || 'Unknown error'}`;
    showScreenShareError(msg);
  }
}

function stopLocalScreenShare(notifyWs = true){
  clearInterval(teamCallState.screenFrameTimer);
  if (teamCallState.screenStream){
    try {
      teamCallState.screenStream.getTracks().forEach(track => track.stop());
    } catch(_){}
    teamCallState.screenStream = null;
  }
  const wasSharing = teamCallState.screenShareActive;
  teamCallState.screenShareActive = false;

  const vid = $('#tcLocalScreenShareVideo');
  if (vid){
    try { vid.srcObject = null; } catch(_){}
  }

  if (wasSharing && notifyWs && teamCallState.activeChatId){
    sendWS({ type: 'teamcall:screenshare-stop', chatId: teamCallState.activeChatId });
    toast('⏹ Stopped screen sharing.');
  }
  if (teamCallState.inCall){
    renderActiveTeamCallStage();
  }
}

function attachLocalScreenStreamToVideo(){
  const vid = $('#tcLocalScreenShareVideo');
  if (vid && teamCallState.screenStream){
    vid.srcObject = teamCallState.screenStream;
    vid.play().catch(()=>{});
  }
}

function showScreenShareError(message){
  const errBanner = $('#tcCallErrorBanner');
  if (errBanner){
    errBanner.hidden = false;
    errBanner.textContent = `⚠️ ${message}`;
  }
  toast(message, 'err');
}

function renderActiveTeamCallStage(){
  const slot = $('#tcActiveCallStage');
  if (!slot) return;
  if (!teamCallState.inCall || teamCallState.activeChatId !== state.activeTeamChatId){
    slot.hidden = true;
    slot.innerHTML = '';
    return;
  }

  const room = state.teamChats.find(c => c.id === state.activeTeamChatId);
  const participants = Array.isArray(teamCallState.callData?.participants) && teamCallState.callData.participants.length
    ? teamCallState.callData.participants
    : (state.user ? [{
        userId: state.user.id,
        username: state.user.username,
        displayName: state.user.displayName || state.user.username,
        avatarUrl: state.user.avatarUrl || state.user.googlePicture || '',
        isSharingScreen: teamCallState.screenShareActive
      }] : []);

  slot.hidden = false;
  slot.innerHTML = `
    <div class="tc-call-stage-box">
      <div class="tc-call-stage-head">
        <div class="tc-call-stage-title">
          <span class="tc-live-call-dot"></span>
          <b>Voice room — ${esc(room?.name || 'Team')}</b>
          <span class="tc-call-pcount">${participants.length} here · live audio</span>
        </div>
        <div class="tc-call-stage-controls">
          <button type="button" class="btn-ghost tc-call-ctl-btn ${teamCallState.localMicMuted ? 'muted' : ''}" id="tcToggleLocalMicBtn">
            ${teamCallState.localMicMuted ? 'Unmute' : 'Mute'}
          </button>
          ${!teamCallState.screenShareActive ? `
            <button type="button" class="btn-primary tc-call-ctl-btn" id="tcStartScreenShareBtn">
              🖥 Start Screen Share
            </button>
          ` : `
            <button type="button" class="btn-ghost tc-call-ctl-btn stop-share" id="tcStopScreenShareBtn">
              ⏹ Stop Sharing
            </button>
          `}
          <button type="button" class="btn-ghost tc-call-ctl-btn leave" id="tcLeaveCallBtn">
            Leave
          </button>
        </div>
      </div>

      <div class="tc-call-error-banner" id="tcCallErrorBanner" hidden></div>

      <div class="tc-call-grid">
        ${participants.map(p => {
          const isMe = p.userId === state.user?.id;
          const dname = p.displayName || p.username;
          const initial = String(dname || 'U').trim().charAt(0).toUpperCase();
          const isLocallyMuted = teamCallState.locallyMutedUsers.has(p.userId);
          const isSharing = isMe ? teamCallState.screenShareActive : (p.isSharingScreen || !!teamCallState.remoteScreenFrames[p.userId]);
          const remoteFrame = teamCallState.remoteScreenFrames[p.userId]?.frameDataUrl || '';

          if (isSharing){
            // Replaces profile picture & name tile with centered live screen preview + small white-on-black name in bottom-left!
            return `
              <div class="tc-call-tile screen-sharing-tile" data-uid="${esc(p.userId)}">
                <div class="tc-screen-preview-box">
                  ${isMe
                    ? `<video id="tcLocalScreenShareVideo" autoplay playsinline muted class="tc-screen-video"></video>`
                    : remoteFrame
                    ? `<img src="${esc(remoteFrame)}" data-remote-screen-uid="${esc(p.userId)}" alt="${esc(dname)}'s screen" class="tc-screen-video">`
                    : `<div class="tc-screen-waiting">🖥 Connecting to ${esc(dname)}'s screen stream…</div>`}
                  <span class="tc-screen-sharer-label">${esc(dname)}</span>
                </div>
              </div>
            `;
          }

          return `
            <div class="tc-call-tile ${isLocallyMuted ? 'locally-muted' : ''}" data-uid="${esc(p.userId)}">
              <div class="tc-call-av-orb" data-prof-u="${esc(p.username)}" title="Click to view ${esc(dname)}'s profile">
                ${p.avatarUrl
                  ? `<img src="${esc(p.avatarUrl)}" alt="${esc(dname)}" class="tc-call-av-img">`
                  : `<span class="tc-call-av-fallback">${esc(initial)}</span>`}
              </div>
              <div class="tc-call-tile-name">
                <b>${esc(dname)}</b>
                ${isMe ? `<small>You</small>` : ''}
                <span class="tc-speak-label">Speaking</span>
              </div>
              <div class="tc-call-tile-actions">
                ${!isMe ? `
                  <button type="button" class="tc-local-mute-btn ${isLocallyMuted ? 'on' : ''}" data-lmute="${esc(p.userId)}" title="Locally mute ${esc(dname)} for yourself only (others still hear them)">
                    ${isLocallyMuted ? '🔇 Locally Muted' : '🔊 Mute for Me'}
                  </button>
                ` : `<span class="tc-mic-state-tag">${teamCallState.localMicMuted ? '🔇 Mic Muted' : '🎙 Live Audio'}</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (teamCallState.screenShareActive){
    attachLocalScreenStreamToVideo();
  }

  $('#tcToggleLocalMicBtn', slot)?.addEventListener('click', () => {
    teamCallState.localMicMuted = !teamCallState.localMicMuted;
    if (teamCallState.localStream){
      teamCallState.localStream.getAudioTracks().forEach(t => { t.enabled = !teamCallState.localMicMuted; });
    }
    if (teamCallState.activeChatId){
      sendWS({ type: 'teamcall:mute', chatId: teamCallState.activeChatId, muted: teamCallState.localMicMuted });
    }
    renderActiveTeamCallStage();
  });

  $('#tcStartScreenShareBtn', slot)?.addEventListener('click', startLocalScreenShare);
  $('#tcStopScreenShareBtn', slot)?.addEventListener('click', () => stopLocalScreenShare(true));
  $('#tcLeaveCallBtn', slot)?.addEventListener('click', leaveTeamVoiceCall);

  $$('[data-lmute]', slot).forEach(btn => {
    btn.onclick = () => {
      const uidTarget = btn.dataset.lmute;
      if (teamCallState.locallyMutedUsers.has(uidTarget)){
        teamCallState.locallyMutedUsers.delete(uidTarget);
        toast('Unmuted for you');
      } else {
        teamCallState.locallyMutedUsers.add(uidTarget);
        toast('Muted for you only');
      }
      const rec = teamCallState.peers.get(uidTarget);
      if (rec?.audio) rec.audio.muted = teamCallState.locallyMutedUsers.has(uidTarget);
      renderActiveTeamCallStage();
    };
  });

  $$('[data-prof-u]', slot).forEach(el => {
    el.onclick = () => openUserProfileModal(el.dataset.profU);
  });
}

/* ---------------- Team Chat View, Attachments, @ Mentions & Voice Recording ---------------- */
async function renderTeamChatView(){
  const view = $('#teamChatView');
  if (!view) return;
  updateTeamChatBadge(false);
  if (state.token && !state.teamChats.length){
    try {
      const res = await api('/api/team-chats');
      state.teamChats = res.teamChats || [];
    } catch(_){}
  }
  if (!state.activeTeamChatId && state.teamChats.length){
    state.activeTeamChatId = state.teamChats[0].id;
  }
  const room = state.teamChats.find(c => c.id === state.activeTeamChatId) || null;

  view.innerHTML = `
    <div class="tc-shell ${room ? 'room-open' : ''}" id="tcShell">
      <aside class="tc-sidebar">
        <div class="tc-sb-head">
          <div>
            <h2>Team Chat</h2>
            <small>Rooms, threads, and live voice</small>
          </div>
          <button type="button" class="back-btn" id="tcBackBtn">‹ Chat</button>
        </div>
        <form class="tc-create-box" id="tcCreateForm">
          <input type="text" id="tcNewName" placeholder="New Team Chat name…" required>
          <input type="text" id="tcNewMembers" list="lzUserSuggest" placeholder="Invite usernames (comma separated)">
          <button type="submit" class="btn-primary">+ Create Team Chat</button>
        </form>
        <div class="tc-room-list" id="tcRoomList"></div>
      </aside>
      <div class="tc-main">
        ${room ? `
          <div class="tc-room-head" id="tcRoomHead"></div>
          <div class="tc-pinned-bar" id="tcPinnedBar" hidden></div>
          <div id="tcActiveCallStage" hidden></div>
          <div class="tc-messages" id="tcMessages"></div>
          <div class="tc-typing" id="tcTyping"></div>
          <div id="tcLimitSlot"></div>

          <div class="tc-composer-wrap">
            <div class="tc-ai-reach">
              <button type="button" class="tc-loki-chip" id="tcLokiChip">@Loki · ask the AI here</button>
              <button type="button" class="btn-ghost" id="tcActivityBtn">Activity</button>
              <button type="button" class="btn-ghost tc-rooms-toggle" id="tcRoomsToggle">Rooms</button>
            </div>
            <div class="tc-mention-popup" id="tcMentionPopup" hidden></div>

            <!-- Pending Photo & File Attachments Tray -->
            <div class="tc-att-tray" id="tcAttTray" hidden></div>

            <!-- Active Voice Recording Bar (Matches Screenshot 3: Purple bar, Trash left, red dot + timer + waveform center, white Send right) -->
            <div class="tc-voice-rec-bar" id="tcVoiceRecBar" hidden>
              <div class="tc-vrb-top-hint">Release or Click Send</div>
              <div class="tc-vrb-controls">
                <button type="button" class="tc-vrb-trash-btn" id="tcVoiceCancelBtn" title="Cancel recording" aria-label="Cancel voice recording">🗑</button>
                <div class="tc-vrb-pill">
                  <span class="tc-vrb-red-dot"></span>
                  <span class="tc-vrb-timer" id="tcVoiceTimerText">0:00</span>
                  <div class="tc-vrb-wave" id="tcVoiceWaveBars">
                    ${Array.from({ length: 28 }, (_, i) => `<span class="tc-vrb-bar" style="height:${22 + ((i * 17) % 65)}%"></span>`).join('')}
                  </div>
                </div>
                <button type="button" class="tc-vrb-send-btn" id="tcVoiceSendBtn" title="Send voice message" aria-label="Send voice message">➤</button>
              </div>
            </div>

            <form class="tc-composer" id="tcComposer">
              <input type="file" id="tcFileInput" multiple accept="image/*,.pdf,.txt,.md,.py,.js,.ts,.json,.csv,.html,.css" hidden>
              <button type="button" class="tc-icon-btn" id="tcAttachBtn" title="Attach photos or files">📎</button>
              <button type="button" class="tc-icon-btn" id="tcMentionBtn" title="Mention @Loki or a teammate">@</button>
              <textarea id="tcInput" rows="1" dir="auto" placeholder="Message ${esc(room.name)}…  @Loki asks the AI" autocomplete="off"></textarea>
              <button type="button" class="tc-icon-btn mic-btn" id="tcVoiceStartBtn" title="Record voice message">🎤</button>
              <button type="button" class="tc-ask-loki" id="tcAskAiBtn" title="Send this message to Loki">Ask Loki</button>
              <button type="submit" class="btn-primary" id="tcSendBtn">Send</button>
            </form>
          </div>
        ` : `
          <div class="tc-empty-main">
            <div style="font-size:2.8rem">💬</div>
            <h3>Start a Real-Time Team Chat</h3>
            <p>Create a shared room on the left and invite teammates by username. Enjoy live @mentions with notification chimes, photo/file attachments, voice notes, and group voice calls with live screen sharing!</p>
          </div>
        `}
        <aside class="tc-thread" id="tcThread" hidden></aside>
        <aside class="tc-activity" id="tcActivity" hidden></aside>
      </div>
    </div>
    <datalist id="lzUserSuggest"></datalist>
  `;

  $('#tcBackBtn').onclick = () => A()?.showView('chat');
  attachUserSuggestions($('#tcNewMembers'));

  $('#tcCreateForm').onsubmit = async e => {
    e.preventDefault();
    const name = ($('#tcNewName')?.value || '').trim();
    const rawMembers = ($('#tcNewMembers')?.value || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!name) return;
    try {
      const res = await api('/api/team-chats', {
        method: 'POST',
        body: JSON.stringify({ name, members: rawMembers })
      });
      if (res.chat){
        upsertTeamChat(res.chat);
        state.activeTeamChatId = res.chat.id;
      }
      renderTeamChatView();
      toast(`✓ Created Team Chat "${name}"`, 'ok');
    } catch(err){
      toast(err.message, 'err');
    }
  };

  renderTeamChatRoomList();

  if (room){
    renderTeamChatHeaderAndMembers();
    renderActiveTeamCallStage();
    rerenderTeamFeed();
    renderActivityFeed();
    renderThreadPanel();
    const feed = $('#tcMessages');
    if (feed) feed.scrollTop = feed.scrollHeight;
    $('#tcLokiChip')?.addEventListener('click', () => {
      const inp = $('#tcInput');
      if (!inp) return;
      inp.value = (inp.value && !inp.value.endsWith(' ') ? inp.value + ' ' : inp.value) + '@Loki ';
      inp.focus();
    });
    $('#tcActivityBtn')?.addEventListener('click', () => {
      tcActivityOpen = !tcActivityOpen;
      if (tcActivityOpen) tcOpenThreadId = null;
      renderThreadPanel();
      renderActivityFeed();
    });
    $('#tcRoomsToggle')?.addEventListener('click', () => {
      $('#tcShell')?.classList.remove('room-open');
    });

    const inp = $('#tcInput');
    const attTray = $('#tcAttTray');
    const fileInp = $('#tcFileInput');
    const mentionPopup = $('#tcMentionPopup');

    const renderAttTray = () => {
      if (!attTray) return;
      if (!tcPendingAttachments.length){
        attTray.hidden = true;
        attTray.innerHTML = '';
        return;
      }
      attTray.hidden = false;
      attTray.innerHTML = tcPendingAttachments.map((a, idx) => `
        <div class="tc-pending-att">
          ${a.kind === 'image' ? `<img src="${esc(a.dataUrl)}" alt="">` : `<span>📄</span>`}
          <small>${esc(a.name)}</small>
          <button type="button" data-rm-att="${idx}" aria-label="Remove">✕</button>
        </div>
      `).join('');
      $$('[data-rm-att]', attTray).forEach(b => {
        b.onclick = () => {
          tcPendingAttachments.splice(Number(b.dataset.rmAtt), 1);
          renderAttTray();
        };
      });
    };

    $('#tcAttachBtn').onclick = () => fileInp?.click();
    fileInp.onchange = async () => {
      const files = [...(fileInp.files || [])];
      for (const f of files.slice(0, 4)){
        const isImg = f.type.startsWith('image/');
        const dataUrl = await new Promise(resolve => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => resolve('');
          r.readAsDataURL(f);
        });
        if (dataUrl){
          tcPendingAttachments.push({
            id: uid('att'),
            name: f.name,
            mime: f.type || 'application/octet-stream',
            kind: isImg ? 'image' : 'file',
            dataUrl
          });
        }
      }
      fileInp.value = '';
      renderAttTray();
    };

    // @ Mention Autocomplete Logic Above Prompt Bar
    const updateMentionAutocomplete = () => {
      if (!mentionPopup || !inp) return;
      const val = inp.value;
      const caret = inp.selectionStart ?? val.length;
      const before = val.slice(0, caret);
      const m = before.match(/(?:^|\s)@([A-Za-z0-9_.\u0590-\u05FF-]*)$/);
      if (!m){
        mentionPopup.hidden = true;
        tcMentionCandidates = [];
        return;
      }
      const query = (m[1] || '').toLowerCase();
      const candidates = [
        {
          handle: 'Loki',
          displayName: 'Loki',
          sub: 'Ask the AI in this chat',
          isAi: true,
          avatarHtml: `<span class="tc-men-ai-av">⚡</span>`
        },
        {
          handle: 'AI',
          displayName: 'Lokizenith AI',
          sub: 'Same as @Loki',
          isAi: true,
          avatarHtml: `<span class="tc-men-ai-av">🤖</span>`
        },
        ...(room.memberUsernames || []).map(u => {
          const mp = getRoomMemberProfile(room, u);
          return {
            handle: u,
            displayName: mp?.displayName || u,
            sub: `@${u} · ${isOnline(u) ? '🟢 Online (plays chime)' : 'Member'}`,
            isAi: false,
            avatarHtml: getAvatarHtml(mp, 26, 'tc-men-u-av')
          };
        })
      ].filter(c =>
        !query ||
        c.handle.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query)
      );

      if (!candidates.length){
        mentionPopup.hidden = true;
        tcMentionCandidates = [];
        return;
      }

      tcMentionCandidates = candidates;
      if (tcMentionIndex >= candidates.length) tcMentionIndex = 0;

      mentionPopup.hidden = false;
      mentionPopup.innerHTML = `
        <div class="tc-men-head">Tag in ${esc(room.name)}</div>
        ${candidates.map((c, idx) => `
          <button type="button" class="tc-men-item ${idx === tcMentionIndex ? 'on' : ''}" data-mhandle="${esc(c.handle)}">
            ${c.avatarHtml}
            <div class="tc-men-info">
              <b>@${esc(c.handle)} ${c.displayName !== c.handle ? `· ${esc(c.displayName)}` : ''}</b>
              <small>${esc(c.sub)}</small>
            </div>
          </button>
        `).join('')}
      `;

      $$('.tc-men-item', mentionPopup).forEach(btn => {
        btn.onclick = () => insertMentionHandle(btn.dataset.mhandle);
      });
    };

    const insertMentionHandle = handle => {
      if (!inp || !handle) return;
      const val = inp.value;
      const caret = inp.selectionStart ?? val.length;
      const before = val.slice(0, caret);
      const after = val.slice(caret);
      const replaced = before.replace(/(^|\s)@([A-Za-z0-9_.\u0590-\u05FF-]*)$/, `$1@${handle} `);
      inp.value = replaced + after;
      if (mentionPopup) mentionPopup.hidden = true;
      tcMentionCandidates = [];
      inp.focus();
    };

    $('#tcMentionBtn').onclick = () => {
      const v = inp.value;
      inp.value = (v && !v.endsWith(' ') ? v + ' @' : v + '@');
      inp.focus();
      updateMentionAutocomplete();
    };

    let typingSentAt = 0;
    inp.addEventListener('input', () => {
      updateMentionAutocomplete();
      const now = Date.now();
      if (now - typingSentAt > 1800){
        typingSentAt = now;
        sendWS({ type: 'teamchat:typing', chatId: room.id, typing: !!inp.value.trim() });
      }
    });

    inp.addEventListener('keydown', e => {
      if (tcMentionCandidates.length && mentionPopup && !mentionPopup.hidden){
        if (e.key === 'ArrowDown'){
          e.preventDefault();
          tcMentionIndex = (tcMentionIndex + 1) % tcMentionCandidates.length;
          updateMentionAutocomplete();
          return;
        }
        if (e.key === 'ArrowUp'){
          e.preventDefault();
          tcMentionIndex = (tcMentionIndex - 1 + tcMentionCandidates.length) % tcMentionCandidates.length;
          updateMentionAutocomplete();
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && tcMentionCandidates[tcMentionIndex])){
          e.preventDefault();
          insertMentionHandle(tcMentionCandidates[tcMentionIndex].handle);
          return;
        }
        if (e.key === 'Escape'){
          mentionPopup.hidden = true;
          tcMentionCandidates = [];
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        $('#tcComposer')?.requestSubmit();
      }
    });

    // Voice Recording in Team Chat (Matches Screenshot 3 & 4)
    const recBar = $('#tcVoiceRecBar');
    const composerForm = $('#tcComposer');
    const timerTxt = $('#tcVoiceTimerText');
    const waveWrap = $('#tcVoiceWaveBars');

    const startTeamVoiceRecording = async () => {
      if (tcVoiceRecordingActive) return;
      tcVoiceRecordingActive = true;
      tcVoiceChunks = [];
      tcVoiceStartTs = Date.now();
      tcVoiceDurationSec = 0;
      tcVoiceWaveformSamples = [];
      if (recBar) recBar.hidden = false;
      if (composerForm) composerForm.hidden = true;
      if (timerTxt) timerTxt.textContent = '0:00';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        tcVoiceMediaRecorder = mr;
        mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) tcVoiceChunks.push(ev.data); };
        mr.start();
      } catch(_){
        tcVoiceMediaRecorder = null;
      }

      clearInterval(tcVoiceTimer);
      tcVoiceTimer = setInterval(() => {
        tcVoiceDurationSec = Math.max(1, Math.round((Date.now() - tcVoiceStartTs) / 1000));
        if (timerTxt) timerTxt.textContent = fmtVoiceSec(tcVoiceDurationSec);
        const sample = +(0.28 + Math.random() * 0.68).toFixed(2);
        tcVoiceWaveformSamples.push(sample);
        if (waveWrap){
          const bars = [...waveWrap.querySelectorAll('.tc-vrb-bar')];
          bars.forEach(b => {
            b.style.height = `${Math.round(20 + Math.random() * 76)}%`;
          });
        }
        if (tcVoiceDurationSec >= 60){
          finishTeamVoiceRecording(true);
        }
      }, 250);
    };

    const finishTeamVoiceRecording = async (shouldSend = true) => {
      if (!tcVoiceRecordingActive) return;
      tcVoiceRecordingActive = false;
      clearInterval(tcVoiceTimer);
      const durSec = Math.max(1, Math.round((Date.now() - tcVoiceStartTs) / 1000));

      let audioDataUrl = `synth:${durSec}`;
      if (tcVoiceMediaRecorder){
        const mr = tcVoiceMediaRecorder;
        tcVoiceMediaRecorder = null;
        try {
          await new Promise(resolve => {
            mr.onstop = resolve;
            mr.stop();
          });
          if (mr.stream) mr.stream.getTracks().forEach(t => t.stop());
          if (tcVoiceChunks.length){
            const blob = new Blob(tcVoiceChunks, { type: mr.mimeType || 'audio/webm' });
            audioDataUrl = await convertBlobToWavDataUrl(blob);
          }
        } catch(_){}
      }

      if (recBar) recBar.hidden = true;
      if (composerForm) composerForm.hidden = false;

      if (!shouldSend) return;

      const waveform = tcVoiceWaveformSamples.length >= 6
        ? tcVoiceWaveformSamples.slice(0, 18)
        : [0.35, 0.78, 0.6, 0.92, 0.52, 0.84, 0.68, 0.9, 0.45, 0.72, 0.58, 0.4];

      await sendTeamChatPayload({
        content: '',
        forceAi: false,
        voiceRecording: {
          audioDataUrl,
          durationSec: durSec,
          waveform
        }
      });
    };

    $('#tcVoiceStartBtn').onclick = startTeamVoiceRecording;
    $('#tcVoiceCancelBtn').onclick = () => finishTeamVoiceRecording(false);
    $('#tcVoiceSendBtn').onclick = () => finishTeamVoiceRecording(true);

    const sendTeamChatPayload = async ({ content = '', forceAi = false, voiceRecording = null, parentId = null } = {}) => {
      const text = String(content || '').trim();
      const attachments = [...tcPendingAttachments];
      if (!text && !attachments.length && !voiceRecording) return;

      const wantAi = forceAi || /(?:^|\s)(@ai|@lokizenith|@loki|\/ai)\b/i.test(text);
      if (wantAi && !usage.canUse()){
        const slot = $('#tcLimitSlot');
        if (slot){
          slot.innerHTML = '';
          slot.appendChild(createLimitBlock());
        }
        return;
      }

      inp.value = '';
      tcPendingAttachments = [];
      renderAttTray();
      if (mentionPopup) mentionPopup.hidden = true;
      sendWS({ type: 'teamchat:typing', chatId: room.id, typing: false });
      const clientMsgId = uid('cmsg');
      const slot = $('#tcLimitSlot');
      if (slot) slot.innerHTML = '';

      const sentViaWs = sendWS({
        type: 'teamchat:send',
        chatId: room.id,
        content: text,
        askAi: wantAi,
        attachments,
        voiceRecording,
        clientMsgId,
        parentId: parentId || undefined
      });
      if (sentViaWs) return;

      try {
        const res = await api(`/api/team-chats/${encodeURIComponent(room.id)}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: text, askAi: wantAi, attachments, voiceRecording, clientMsgId, parentId: parentId || undefined })
        });
        if (res.account) updateAccount(res.account);
        if (res.message && !room.messages.some(m => m.id === res.message.id || (clientMsgId && m.clientMsgId === clientMsgId))){
          room.messages.push(res.message);
          appendTeamChatMessage(res.message);
        }
        if (res.aiMessage && !room.messages.some(m => m.id === res.aiMessage.id)){
          room.messages.push(res.aiMessage);
          appendTeamChatMessage(res.aiMessage);
        }
      } catch(err){
        if (err.code === 'LIMIT_REACHED'){
          if (slot){
            slot.innerHTML = '';
            slot.appendChild(createLimitBlock(err.message));
          }
        } else {
          toast(err.message, 'err');
        }
      }
    };

    sendTeamChatFromComposer = sendTeamChatPayload;
    $('#tcComposer').onsubmit = e => {
      e.preventDefault();
      sendTeamChatPayload({ content: inp.value, forceAi: false });
    };
    $('#tcAskAiBtn').onclick = () => {
      const cur = inp.value.trim();
      sendTeamChatPayload({ content: cur ? (/(?:^|\s)@loki\b/i.test(cur) ? cur : '@Loki ' + cur) : '@Loki ', forceAi: true });
    };
  }
}

/* ---------------- LokiCode Team Collaboration ---------------- */
function upsertLokiTeam(team){
  const idx = state.lokiTeams.findIndex(t => t.id === team.id);
  if (idx >= 0) state.lokiTeams[idx] = team;
  else state.lokiTeams.unshift(team);
}

function getActiveLokiTeam(){
  if (!state.activeLokiTeamId) return null;
  return state.lokiTeams.find(t => t.id === state.activeLokiTeamId) || null;
}

function renderLokiTeamBar(){
  const bar = $('#lcTeamBar');
  if (!bar) return;
  const active = getActiveLokiTeam();
  const isOwner = active && active.ownerId === state.user?.id;
  const cursorNow = Date.now();
  const activeEditors = active && state.lokiCursors[active.id]
    ? Object.keys(state.lokiCursors[active.id]).filter(u => u !== state.user?.username && cursorNow - state.lokiCursors[active.id][u] < 4500)
    : [];

  bar.innerHTML = `
    <div class="lct-left">
      <span class="lct-label">👥 Team Mode:</span>
      <select class="lct-select" id="lctTeamSelect" aria-label="Select LokiCode Team">
        <option value="">Personal Workspace</option>
        ${state.lokiTeams.map(t => `<option value="${esc(t.id)}" ${t.id === state.activeLokiTeamId ? 'selected' : ''}>${esc(t.name)} (${t.memberUsernames.length} members)</option>`).join('')}
      </select>
      <button type="button" class="lc-btn-subtle" id="lctCreateBtn">+ Create Team</button>
    </div>
    ${active ? `
      <div class="lct-center">
        <span class="lct-live-dot"></span>
        <span>${activeEditors.length ? `✎ <b>${esc(activeEditors.join(', '))}</b> editing live…` : `WS Live · Updated by <b>${esc(active.updatedBy || active.ownerUsername)}</b>`}</span>
        <div class="lct-members-row">
          ${active.memberUsernames.map(u => {
            const mp = getCachedMemberProfile(u) || { username: u, displayName: u };
            return `
              <span class="lct-mpill ${isOnline(u) ? 'on' : ''}" data-prof="${esc(u)}" style="cursor:pointer;">
                ${getAvatarHtml(mp, 16)}
                <i></i>${esc(mp.displayName || u)}${u === active.ownerUsername ? ' 👑' : ''}
                ${isOwner && u !== active.ownerUsername ? `<button type="button" class="lct-rm" data-rm="${esc(u)}" title="Remove member">✕</button>` : ''}
              </span>
            `;
          }).join('')}
        </div>
      </div>
      <div class="lct-right">
        ${isOwner ? `
          <form class="lct-add-form" id="lctAddForm">
            <input type="text" id="lctAddInput" list="lctUserSuggest" placeholder="Add member…">
            <button type="submit" class="lc-btn-subtle">+ Add</button>
          </form>
        ` : ''}
      </div>
    ` : `
      <div class="lct-center"><small>Switch to a Team to share code &amp; AI edits instantaneously across members.</small></div>
    `}
    <datalist id="lctUserSuggest"></datalist>
  `;

  $$('.lct-mpill', bar).forEach(el => {
    el.onclick = e => {
      if (e.target.closest('.lct-rm')) return;
      openUserProfileModal(el.dataset.prof);
    };
  });

  const sel = $('#lctTeamSelect', bar);
  if (sel){
    sel.onchange = () => {
      state.activeLokiTeamId = sel.value || null;
      const t = getActiveLokiTeam();
      renderLokiTeamBar();
      if (state.activeLokiTeamId){
        sendWS({ type: 'room:join', teamId: state.activeLokiTeamId });
      }
      if (t && window.LokiCode?.onTeamUpdate){
        window.LokiCode.onTeamUpdate(t, t.updatedBy);
        toast(`Switched to Team "${t.name}"`, 'ok');
      }
    };
  }

  const createBtn = $('#lctCreateBtn', bar);
  if (createBtn){
    createBtn.onclick = () => openCreateLokiTeamModal();
  }

  $$('.lct-rm', bar).forEach(btn => {
    btn.onclick = async () => {
      const target = btn.dataset.rm;
      try {
        const res = await api(`/api/lokiteams/${encodeURIComponent(active.id)}/members/${encodeURIComponent(target)}`, { method: 'DELETE' });
        if (res.team) upsertLokiTeam(res.team);
        renderLokiTeamBar();
        toast(`Removed ${target} from team`);
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  const addForm = $('#lctAddForm', bar);
  const addInp = $('#lctAddInput', bar);
  if (addInp) attachUserSuggestions(addInp, 'lctUserSuggest');
  if (addForm){
    addForm.onsubmit = async e => {
      e.preventDefault();
      const uname = (addInp?.value || '').trim();
      if (!uname) return;
      try {
        const res = await api(`/api/lokiteams/${encodeURIComponent(active.id)}/members`, {
          method: 'POST',
          body: JSON.stringify({ username: uname })
        });
        if (res.team) upsertLokiTeam(res.team);
        if (addInp) addInp.value = '';
        renderLokiTeamBar();
        toast(`✓ Added ${uname} to ${active.name}!`, 'ok');
      } catch(err){ toast(err.message, 'err'); }
    };
  }
}

function openCreateLokiTeamModal(){
  const modal = $('#shareTargetModal');
  const title = $('#shareTargetTitle');
  const body = $('#shareTargetBody');
  if (!modal || !body) return;
  if (title) title.textContent = '⚡ Create LokiCode Team';
  const curState = (() => {
    try { return JSON.parse(localStorage.getItem('lz.code') || '{}'); } catch(_){ return {}; }
  })();
  body.innerHTML = `
    <form class="lz-share-form" id="lctModalForm">
      <div class="lz-auth-field">
        <label>Team Name</label>
        <input type="text" id="lctModalName" required placeholder="e.g. Core Devs, Hackathon Squad">
      </div>
      <div class="lz-auth-field">
        <label>Add Members (usernames, comma separated)</label>
        <input type="text" id="lctModalMembers" list="lzShareSuggest" placeholder="e.g. alice, bob">
      </div>
      <datalist id="lzShareSuggest"></datalist>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px;">
        <button type="button" class="btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn-primary">Create &amp; Enter Team</button>
      </div>
    </form>
  `;
  attachUserSuggestions($('#lctModalMembers', body), 'lzShareSuggest');
  $('#lctModalForm', body).onsubmit = async e => {
    e.preventDefault();
    const name = ($('#lctModalName', body)?.value || '').trim();
    const members = ($('#lctModalMembers', body)?.value || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!name) return;
    try {
      const res = await api('/api/lokiteams', {
        method: 'POST',
        body: JSON.stringify({
          name,
          members,
          lang: curState.lang || 'python',
          code: curState.code || ''
        })
      });
      if (res.team){
        upsertLokiTeam(res.team);
        state.activeLokiTeamId = res.team.id;
        renderLokiTeamBar();
      }
      A()?.closeModal ? A().closeModal('shareTargetModal') : (modal.hidden = true);
      toast(`✓ LokiCode Team "${name}" created!`, 'ok');
    } catch(err){ toast(err.message, 'err'); }
  };
  A()?.openModal ? A().openModal('shareTargetModal') : (modal.hidden = false);
}

function broadcastLokiTeamSync(patch){
  const active = getActiveLokiTeam();
  if (!active || !state.user) return;
  Object.assign(active, patch, { updatedBy: state.user.username, updatedAt: Date.now() });
  const sent = sendWS(Object.assign({ type: 'lokiteam:sync', teamId: active.id }, patch));
  if (!sent){
    api(`/api/lokiteams/${encodeURIComponent(active.id)}/state`, {
      method: 'POST',
      body: JSON.stringify(patch)
    }).catch(()=>{});
  }
}

/* ---------------- Shared Hub, Direct Share, Share Conversation Link & Notifications ---------------- */
async function renderSharedHubView(){
  const view = $('#sharedHubView');
  if (!view) return;
  if (!state.token){
    state.sharedSnippets = state.sharedSnippets || [];
  } else {
    try {
      const [snipsRes, notifsRes] = await Promise.all([
        api('/api/shared-snippets'),
        api('/api/notifications')
      ]);
      state.sharedSnippets = snipsRes.snippets || [];
      state.notifications = notifsRes.notifications || [];
      updateNotifBadge();
    } catch(_){}
  }

  const sharedChats = (state.notifications || []).filter(n => n.type === 'shared_chat' && n.payload);

  view.innerHTML = `
    <div class="sh-wrap">
      <div class="sh-head">
        <div>
          <h2>🌐 Shared Hub</h2>
          <small>Community code snippets, direct user shares &amp; 1-click Forks into LokiCode</small>
        </div>
        <div class="sh-head-acts">
          <button type="button" class="btn-primary" id="shShareCurCode">📤 Share Current Code</button>
          <button type="button" class="back-btn" id="shBackBtn">‹ Back to Chat</button>
        </div>
      </div>

      ${sharedChats.length ? `
        <section class="sh-section">
          <h3>💬 Chats Shared With You (${sharedChats.length})</h3>
          <div class="sh-grid">
            ${sharedChats.map(n => {
              const mp = getCachedMemberProfile(n.fromUsername) || { username: n.fromUsername, displayName: n.fromUsername };
              return `
                <div class="sh-card">
                  <div class="sh-card-top">
                    <span class="sh-tag">Shared Chat</span>
                    <small data-prof-u="${esc(n.fromUsername)}" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                      ${getAvatarHtml(mp, 18)} <b>${esc(mp.displayName || n.fromUsername)}</b>
                    </small>
                  </div>
                  <h4>${esc(n.payload.title || 'Conversation')}</h4>
                  <p>${esc(n.message)}</p>
                  <div class="sh-card-acts">
                    <button type="button" class="btn-primary" data-open-chat="${esc(n.id)}">Open in My Chats</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <section class="sh-section">
        <h3>⚡ Shared Code Snippets (${state.sharedSnippets.length})</h3>
        ${state.sharedSnippets.length ? `
          <div class="sh-grid">
            ${state.sharedSnippets.map(s => {
              const liked = (s.likes || []).includes(state.user?.id);
              const mp = getCachedMemberProfile(s.authorUsername) || { username: s.authorUsername, displayName: s.authorUsername };
              return `
                <article class="sh-card" data-sid="${esc(s.id)}">
                  <div class="sh-card-top">
                    <span class="sh-tag">${esc(s.lang)}</span>
                    <span class="sh-vis">${s.visibility === 'direct' ? '🔒 Direct Share' : '🌍 Public'}</span>
                    <small data-prof-u="${esc(s.authorUsername)}" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
                      ${getAvatarHtml(mp, 18)} <b>${esc(mp.displayName || s.authorUsername)}</b>
                    </small>
                  </div>
                  <h4 dir="auto">${esc(s.title)}</h4>
                  ${s.desc ? `<p dir="auto">${esc(s.desc)}</p>` : ''}
                  <pre class="sh-preview"><code>${esc(String(s.code || '').slice(0, 320))}</code></pre>
                  <div class="sh-card-acts">
                    <button type="button" class="btn-ghost" data-like="${esc(s.id)}">${liked ? '❤️' : '🤍'} ${(s.likes || []).length}</button>
                    <button type="button" class="btn-primary" data-fork="${esc(s.id)}">⚡ Fork in LokiCode (${s.forks || 0})</button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        ` : `<div class="tc-empty-list">No snippets shared yet. Open LokiCode and click <b>📤 Share</b> to publish or send code to a teammate!</div>`}
      </section>
    </div>
  `;

  $('#shBackBtn', view).onclick = () => A()?.showView('chat');
  $('#shShareCurCode', view).onclick = () => {
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem('lz.code') || '{}'); } catch(_){}
    openShareSnippetModal({ title: cur.prompt || 'LokiCode Snippet', lang: cur.lang || 'python', code: cur.code || '' });
  };

  $$('[data-prof-u]', view).forEach(el => {
    el.onclick = () => openUserProfileModal(el.dataset.profU);
  });

  $$('[data-open-chat]', view).forEach(btn => {
    btn.onclick = () => {
      const n = sharedChats.find(x => x.id === btn.dataset.openChat);
      if (n && n.payload && A()?.importSharedConversation){
        A().importSharedConversation(n.payload);
      }
    };
  });

  $$('[data-like]', view).forEach(btn => {
    btn.onclick = async () => {
      try {
        const res = await api(`/api/shared-snippets/${encodeURIComponent(btn.dataset.like)}/like`, { method: 'POST' });
        if (res.snippet){
          const idx = state.sharedSnippets.findIndex(x => x.id === res.snippet.id);
          if (idx >= 0) state.sharedSnippets[idx] = res.snippet;
          renderSharedHubView();
        }
      } catch(err){ toast(err.message, 'err'); }
    };
  });

  $$('[data-fork]', view).forEach(btn => {
    btn.onclick = async () => {
      const snip = state.sharedSnippets.find(x => x.id === btn.dataset.fork);
      if (!snip) return;
      try { await api(`/api/shared-snippets/${encodeURIComponent(snip.id)}/fork`, { method: 'POST' }); } catch(_){}
      if (window.LokiCode?.open){
        window.LokiCode.open({ code: snip.code, lang: snip.lang });
        toast(`⚡ Forked "${snip.title}" into LokiCode!`, 'ok');
      }
    };
  });
}

async function openShareChatModal(conv){
  if (!conv) return;
  const modal = $('#shareTargetModal');
  const title = $('#shareTargetTitle');
  const body = $('#shareTargetBody');
  if (!modal || !body) return;
  if (title) title.textContent = '📤 Share Conversation';

  body.innerHTML = `
    <div class="lz-share-conv-modal">
      <div class="lz-share-link-box">
        <div class="lz-sl-head">
          <b>🔗 Share via Unique Conversation Link</b>
          <small>Anyone who opens this link will be asked if they want an independent copy of <b>"${esc(conv.title || 'Conversation')}"</b> (${(conv.messages || []).length} messages) added to their chat history.</small>
        </div>
        <div class="lz-invite-link-row" style="margin-top:8px;">
          <input type="text" id="lzShareConvUrlInput" readonly value="Generating unique link…">
          <button type="button" class="btn-primary" id="lzCopyShareConvUrlBtn">⧉ Copy Link</button>
        </div>
      </div>

      <hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:16px 0;">

      <form class="lz-share-form" id="lzShareChatForm">
        <p style="margin:0 0 8px;color:var(--dim);font-size:.86rem;">Or send a direct copy to a specific Lokizenith username:</p>
        <div class="lz-auth-field">
          <label>Recipient Username</label>
          <input type="text" id="lzShareChatUser" list="lzShareChatList" required placeholder="Type username…">
        </div>
        <datalist id="lzShareChatList"></datalist>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
          <button type="button" class="btn-ghost" data-close>Close</button>
          <button type="submit" class="btn-primary">Send Direct Copy</button>
        </div>
      </form>
    </div>
  `;

  A()?.openModal ? A().openModal('shareTargetModal') : (modal.hidden = false);

  // Generate unique conversation link on server
  try {
    const res = await api('/api/shared/conv-link', {
      method: 'POST',
      body: JSON.stringify({ conv })
    });
    const urlInp = $('#lzShareConvUrlInput', body);
    const fullLink = `${location.origin}/?shareConv=${encodeURIComponent(res.shareId)}`;
    if (urlInp) urlInp.value = fullLink;
    $('#lzCopyShareConvUrlBtn', body).onclick = async () => {
      try {
        await navigator.clipboard.writeText(fullLink);
      } catch(_){
        urlInp?.select();
        try { document.execCommand('copy'); } catch(__){}
      }
      toast('🔗 Unique conversation link copied to clipboard!', 'ok');
    };
  } catch(err){
    const urlInp = $('#lzShareConvUrlInput', body);
    if (urlInp) urlInp.value = 'Could not generate link';
  }

  attachUserSuggestions($('#lzShareChatUser', body), 'lzShareChatList');
  $('#lzShareChatForm', body).onsubmit = async e => {
    e.preventDefault();
    const targetUsername = ($('#lzShareChatUser', body)?.value || '').trim();
    if (!targetUsername) return;
    try {
      await api('/api/share/chat', { method: 'POST', body: JSON.stringify({ targetUsername, conv }) });
      A()?.closeModal ? A().closeModal('shareTargetModal') : (modal.hidden = true);
      toast(`✓ Shared chat copy with ${targetUsername}!`, 'ok');
    } catch(err){ toast(err.message, 'err'); }
  };
}

async function resolveSharedConvFromUrl(){
  try {
    const p = new URLSearchParams(location.search);
    const shareId = (p.get('shareConv') || '').trim();
    if (!shareId) return;

    const res = await api('/api/shared/conv-link/' + encodeURIComponent(shareId));
    if (!res || !res.shared) return;

    const shared = res.shared;
    const modal = $('#shareTargetModal');
    const title = $('#shareTargetTitle');
    const body = $('#shareTargetBody');
    if (!modal || !body) return;
    if (title) title.textContent = '📥 Shared Conversation Copy';

    const authorDisp = shared.authorDisplayName || shared.authorUsername || 'A user';
    const msgCount = (shared.messages || []).length;

    body.innerHTML = `
      <div class="lz-shared-conv-prompt">
        <div class="lz-scp-author">
          ${shared.authorAvatarUrl
            ? `<img src="${esc(shared.authorAvatarUrl)}" alt="${esc(authorDisp)}" class="lz-scp-av">`
            : `<span class="lz-scp-av-fallback">${esc(authorDisp.charAt(0).toUpperCase())}</span>`}
          <div>
            <b>${esc(authorDisp)}</b> <small>@${esc(shared.authorUsername || 'user')}</small>
            <div><small style="color:var(--muted);">Shared a conversation link with you</small></div>
          </div>
        </div>
        <h3 style="margin:12px 0 6px;">Do you want to have a copy of this conversation?</h3>
        <div class="lz-scp-card">
          <b>💬 ${esc(shared.title || 'Conversation')}</b>
          <span>${msgCount} message${msgCount === 1 ? '' : 's'}</span>
        </div>
        <p class="lz-scp-note">If you agree, an independent copy of this conversation will be added to your personal chat history. Anything you or ${esc(authorDisp)} write afterwards stays private to your own copy and will not update the other person.</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
          <button type="button" class="btn-ghost" id="lzDeclineConvCopyBtn">No, Thanks</button>
          <button type="button" class="btn-primary" id="lzAcceptConvCopyBtn">✓ Yes, Add Copy to My Chats</button>
        </div>
      </div>
    `;

    const cleanUrl = () => {
      try {
        const u = new URL(location.href);
        u.searchParams.delete('shareConv');
        history.replaceState({}, '', u.pathname + u.search);
      } catch(_){}
    };

    $('#lzDeclineConvCopyBtn', body).onclick = () => {
      cleanUrl();
      A()?.closeModal ? A().closeModal('shareTargetModal') : (modal.hidden = true);
    };

    $('#lzAcceptConvCopyBtn', body).onclick = () => {
      cleanUrl();
      A()?.closeModal ? A().closeModal('shareTargetModal') : (modal.hidden = true);
      if (A()?.importSharedConversation){
        A().importSharedConversation({
          title: shared.title,
          messages: shared.messages
        });
      }
    };

    A()?.openModal ? A().openModal('shareTargetModal') : (modal.hidden = false);
  } catch(_){}
}

function openShareSnippetModal({ title: initTitle = '', lang = 'python', code = '' } = {}){
  if (!String(code || '').trim()){
    toast('Write or generate some code in LokiCode first!', 'err');
    return;
  }
  const modal = $('#shareTargetModal');
  const title = $('#shareTargetTitle');
  const body = $('#shareTargetBody');
  if (!modal || !body) return;
  if (title) title.textContent = '📤 Share Code Snippet';
  body.innerHTML = `
    <form class="lz-share-form" id="lzShareSnipForm">
      <div class="lz-auth-field">
        <label>Snippet Title</label>
        <input type="text" id="lzSnipTitle" required value="${esc(initTitle || `${lang.toUpperCase()} Snippet`)}">
      </div>
      <div class="lz-auth-field">
        <label>Description (optional)</label>
        <input type="text" id="lzSnipDesc" placeholder="What does this code do?">
      </div>
      <div class="lz-auth-field">
        <label>Visibility</label>
        <select id="lzSnipVis">
          <option value="public">🌍 Publish to Shared Hub (Everyone)</option>
          <option value="direct">🔒 Send Directly to a Specific Username</option>
        </select>
      </div>
      <div class="lz-auth-field" id="lzSnipTargetWrap" hidden>
        <label>Target Username</label>
        <input type="text" id="lzSnipTarget" list="lzShareSnipList" placeholder="Type recipient username…">
      </div>
      <datalist id="lzShareSnipList"></datalist>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;">
        <button type="button" class="btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn-primary">Share Snippet</button>
      </div>
    </form>
  `;
  const visSel = $('#lzSnipVis', body);
  const tgtWrap = $('#lzSnipTargetWrap', body);
  visSel.onchange = () => { tgtWrap.hidden = visSel.value !== 'direct'; };
  attachUserSuggestions($('#lzSnipTarget', body), 'lzShareSnipList');

  $('#lzShareSnipForm', body).onsubmit = async e => {
    e.preventDefault();
    try {
      await api('/api/shared-snippets', {
        method: 'POST',
        body: JSON.stringify({
          title: ($('#lzSnipTitle', body)?.value || '').trim(),
          desc: ($('#lzSnipDesc', body)?.value || '').trim(),
          lang,
          code,
          visibility: visSel.value,
          targetUsername: visSel.value === 'direct' ? ($('#lzSnipTarget', body)?.value || '').trim() : ''
        })
      });
      A()?.closeModal ? A().closeModal('shareTargetModal') : (modal.hidden = true);
      toast('✓ Snippet shared!', 'ok');
      if ($('#sharedHubView')?.classList.contains('active')) renderSharedHubView();
    } catch(err){ toast(err.message, 'err'); }
  };
  A()?.openModal ? A().openModal('shareTargetModal') : (modal.hidden = false);
}

async function fetchNotifications(){
  if (!state.token) return;
  try {
    const res = await api('/api/notifications');
    state.notifications = res.notifications || [];
    updateNotifBadge();
  } catch(_){}
}

function updateNotifBadge(){
  const badge = $('#notifBadge');
  if (!badge) return;
  const unread = (state.notifications || []).filter(n => !n.read).length;
  badge.hidden = unread <= 0;
  badge.textContent = String(unread);
}

async function openNotifModal(){
  await fetchNotifications();
  const modal = $('#notifModal');
  const body = $('#notifModalBody');
  if (!modal || !body) return;
  if (!state.notifications.length){
    body.innerHTML = `<div class="tc-empty-list">No notifications yet. Shared chats, team invites, and code shares appear here live.</div>`;
  } else {
    body.innerHTML = `<div class="lz-notif-list">${state.notifications.map(n => `
      <div class="lz-notif-item ${n.read ? '' : 'unread'}">
        <div class="lz-notif-top"><b>${esc(n.title)}</b><small>${fmtTime(n.ts)}</small></div>
        <p>${esc(n.message)}</p>
        ${n.type === 'shared_chat' && n.payload ? `<button type="button" class="btn-primary" data-imp="${esc(n.id)}">Open Shared Chat</button>` : ''}
        ${n.type === 'teamchat_invite' ? `<button type="button" class="btn-ghost" data-gtc="${esc(n.refId)}">Open Team Chat</button>` : ''}
        ${n.type === 'lokiteam_invite' ? `<button type="button" class="btn-ghost" data-glt="${esc(n.refId)}">Open LokiCode Team</button>` : ''}
      </div>
    `).join('')}</div>`;

    $$('[data-imp]', body).forEach(b => b.onclick = () => {
      const n = state.notifications.find(x => x.id === b.dataset.imp);
      if (n?.payload && A()?.importSharedConversation){
        A().importSharedConversation(n.payload);
        A().closeModal('notifModal');
      }
    });
    $$('[data-gtc]', body).forEach(b => b.onclick = () => {
      state.activeTeamChatId = b.dataset.gtc;
      A()?.closeModal('notifModal');
      A()?.showView('teamchat');
    });
    $$('[data-glt]', body).forEach(b => b.onclick = () => {
      state.activeLokiTeamId = b.dataset.glt;
      renderLokiTeamBar();
      A()?.closeModal('notifModal');
      A()?.showView('code');
    });
  }
  A()?.openModal ? A().openModal('notifModal') : (modal.hidden = false);
  api('/api/notifications/read', { method: 'POST' }).then(() => {
    state.notifications.forEach(n => { n.read = true; });
    updateNotifBadge();
  }).catch(()=>{});
}

function attachUserSuggestions(input, datalistId = 'lzUserSuggest'){
  if (!input) return;
  let t = 0;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      try {
        const raw = input.value.split(',').pop().trim();
        const res = await api('/api/users/search?q=' + encodeURIComponent(raw));
        const dl = document.getElementById(datalistId);
        if (dl && Array.isArray(res.users)){
          dl.innerHTML = res.users
            .filter(u => u.username !== state.user?.username)
            .map(u => `<option value="${esc(u.username)}">${esc(u.displayName || u.username)} · ${u.online ? '🟢 Online' : 'Offline'}</option>`)
            .join('');
        }
      } catch(_){}
    }, 180);
  });
}

/* ---------------- DOM Bindings & Boot ---------------- */
function bindStaticUI(){
  const tabLogin = $('#authTabLogin');
  const tabReg = $('#authTabRegister');
  if (tabLogin) tabLogin.onclick = () => openAuthOverlay('login');
  const gIn = $('#guestSignInBtn'), gUp = $('#guestSignUpBtn'), aClose = $('#authCloseBtn');
  if (gIn) gIn.onclick = () => openAuthOverlay('login');
  if (gUp) gUp.onclick = () => openAuthOverlay('register');
  if (aClose) aClose.onclick = () => { if (isGuest()) hideAuthOverlay(); };
  const aOv = $('#authOverlay');
  if (aOv && !aOv.dataset.guestClose){
    aOv.dataset.guestClose = '1';
    aOv.addEventListener('mousedown', (e) => { if (isGuest() && e.target === aOv) hideAuthOverlay(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isGuest() && !aOv.hidden) hideAuthOverlay(); });
  }
  if (tabReg) tabReg.onclick = () => openAuthOverlay('register');

  const invInp = $('#authInviteInput');
  if (invInp){
    let invLookTimer = 0;
    invInp.addEventListener('input', () => {
      clearTimeout(invLookTimer);
      const val = invInp.value.trim();
      state.pendingInvite = val;
      if (!val){
        state.pendingInviterName = '';
        renderAuthInviteBanner();
        return;
      }
      invLookTimer = setTimeout(async () => {
        try {
          const info = await api('/api/invite/info?code=' + encodeURIComponent(val));
          state.pendingInviterName = info?.valid ? (info.inviterUsername || '') : '';
        } catch(_){
          state.pendingInviterName = '';
        }
        renderAuthInviteBanner();
      }, 220);
    });
  }

  const form = $('#authForm');
  if (form){
    form.onsubmit = async e => {
      e.preventDefault();
      const username = ($('#authUsername')?.value || '').trim();
      const password = ($('#authPassword')?.value || '');
      const typedInvite = ($('#authInviteInput')?.value || '').trim();
      const activeInvite = typedInvite || state.pendingInvite || '';
      const errEl = $('#authError');
      const subBtn = $('#authSubmitBtn');
      if (state.authMode === 'register' && password.length < 8){
        if (errEl){ errEl.hidden = false; errEl.textContent = 'Password must be at least 8 characters.'; }
        return;
      }
      if (errEl) errEl.hidden = true;
      if (subBtn) subBtn.disabled = true;
      try {
        const endpoint = state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const device = getClientDeviceHints();
        const payload = state.authMode === 'register'
          ? { username, password, device, ...(activeInvite ? { inviteCode: activeInvite } : {}) }
          : { username, password, device };
        const res = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
        if (state.authMode === 'register' && activeInvite){
          state.pendingInvite = '';
          state.pendingInviterName = '';
          if ($('#authInviteInput')) $('#authInviteInput').value = '';
          sessionStorage.removeItem(INVITE_KEY);
          try {
            const url = new URL(location.href);
            url.searchParams.delete('invite');
            history.replaceState({}, '', url.pathname + url.search);
          } catch(_){}
        }
        applyPayloadAfterAuth(res);
        startPresenceHeartbeat();
        toast(state.authMode === 'register' ? `✓ Welcome, ${res.user.displayName || res.user.username}!` : `✓ Signed in as ${res.user.displayName || res.user.username}`, 'ok');
        await resolveSharedConvFromUrl();
      } catch(err){
        if (errEl){ errEl.hidden = false; errEl.textContent = err.message; }
      } finally {
        if (subBtn) subBtn.disabled = false;
      }
    };
  }

  $('#googleAuthBtn')?.addEventListener('click', startGoogleOAuthFlow);
  $('#lzOpenGiftBtn')?.addEventListener('click', () => openCodesModal('gift'));
  $('#lzOpenDevBtn')?.addEventListener('click', () => openCodesModal('dev'));
  $('#lzLogoutBtn')?.addEventListener('click', logout);
  // Clicking the user top chip or sidebar account identity opens the User Profile Studio Modal!
  $('#userTopChip')?.addEventListener('click', openProfileStudioModal);
  $('#lzAccountBox .lz-acc-id')?.addEventListener('click', openProfileStudioModal);
  $('#notifBtn')?.addEventListener('click', openNotifModal);
  $('#inviteTopBtn')?.addEventListener('click', openInviteModal);
  $('#lzInviteBtn')?.addEventListener('click', openInviteModal);

  $('#adminResetAllBtn')?.addEventListener('click', openResetUsagesModal);
  $('#adminPanelBtn')?.addEventListener('click', openAdminDashboardModal);
  $('#bannedLogoutBtn')?.addEventListener('click', logout);
  $('#adminNoticeOkBtn')?.addEventListener('click', closeAdminResetNotice);
  $('#adminNoticeCloseX')?.addEventListener('click', closeAdminResetNotice);
  $('#adminBcastOkBtn')?.addEventListener('click', closeAdminBroadcastModal);
  $('#adminBcastCloseX')?.addEventListener('click', closeAdminBroadcastModal);
  $('#adminBroadcastNoticeOkBtn')?.addEventListener('click', closeAdminBroadcastModal);
  $('#adminBroadcastNoticeCloseX')?.addEventListener('click', closeAdminBroadcastModal);
  $('#adminBroadcastNoticeModal')?.addEventListener('click', e => {
    if (e.target === $('#adminBroadcastNoticeModal') || e.target.closest('[data-close]')){
      closeAdminBroadcastModal();
    }
  });
  $('#adminResetNoticeModal')?.addEventListener('click', e => {
    if (e.target === $('#adminResetNoticeModal') || e.target.closest('[data-close]')){
      closeAdminResetNotice();
    }
  });

  $('#adminExitInspectBtn')?.addEventListener('click', exitInspectAccount);
  $('#adminInspectSyncNowBtn')?.addEventListener('click', () => {
    scheduleSync();
    renderInspectBanner();
    toast('💾 Synced inspected account state', 'ok');
  });

  $('#platformMotdCloseBtn')?.addEventListener('click', () => {
    const r = $('#platformMotdRibbon');
    if (r) r.hidden = true;
    document.body.classList.remove('has-motd-ribbon');
  });

  $('#lahStopBtn')?.addEventListener('click', () => {
    const hud = $('#liveAudioTransmissionHud');
    if (hud){
      hud.classList.remove('active');
      hud.hidden = true;
    }
  });

  // Floating Admin Maintenance Bar controls
  $('#adminMaintEndBtn')?.addEventListener('click', async () => {
    try {
      const res = await api('/api/admin/platform-config', {
        method: 'POST',
        body: JSON.stringify({ maintenanceMode: false })
      });
      if (res.config) {
        state.platformConfig = res.config;
        renderPlatformMotd(res.config);
        syncMaintenanceOverlay(res.config);
      }
      toast('⏹ System Maintenance ended!', 'ok');
      await fetchAdminOverview();
      renderAdminDashboardModal();
    } catch(err){ toast(err.message, 'err'); }
  });

  $('#adminMaintPreviewBtn')?.addEventListener('click', () => {
    adminMaintPreviewActive = !adminMaintPreviewActive;
    syncMaintenanceOverlay();
    if (adminMaintPreviewActive) {
      toast('👁 Previewing Maintenance screen as seen by non-admins.', 'info');
    }
  });

  $('#maintExitPreviewBtn')?.addEventListener('click', () => {
    adminMaintPreviewActive = false;
    syncMaintenanceOverlay();
    toast('Exited maintenance preview.', 'ok');
  });
}

async function fetchAndApplyPlatformConfig(){
  try {
    const res = await fetch('/api/platform/config', { credentials: 'same-origin' }).then(r => r.json());
    if (res?.config) {
      state.platformConfig = res.config;
      renderPlatformMotd(res.config);
      syncMaintenanceOverlay(res.config);
    }
  } catch(_){}
}

function startPresenceHeartbeat(){
  clearInterval(state.presenceTimer);
  if (state.token && state.user && !state.activeBanInfo){
    api('/api/presence/ping', { method: 'POST', body: JSON.stringify({ seconds: 0, device: getClientDeviceHints() }) }).catch(() => {});
  }
  state.presenceTimer = setInterval(() => {
    if (!state.token || !state.user || state.activeBanInfo || document.hidden) return;
    api('/api/presence/ping', { method: 'POST', body: JSON.stringify({ seconds: 30, device: getClientDeviceHints() }) }).catch(() => {});
  }, 30000);
}

async function resolveInviteFromUrl(){
  try {
    const p = new URLSearchParams(location.search);
    const inv = (p.get('invite') || '').trim();
    if (inv){
      state.pendingInvite = inv;
      sessionStorage.setItem(INVITE_KEY, inv);
    }
    if (state.pendingInvite){
      const info = await api('/api/invite/info?code=' + encodeURIComponent(state.pendingInvite)).catch(() => null);
      if (info && info.valid){
        state.pendingInviterName = info.inviterUsername || '';
      } else {
        state.pendingInvite = '';
        sessionStorage.removeItem(INVITE_KEY);
      }
    }
  } catch(_){}
}

async function boot(){
  bindStaticUI();
  fetchAndApplyPlatformConfig();
  if (state.token && savedUserBackup){
    hideAuthOverlay();
    updateAccount(savedUserBackup);
  }
  renderUsageBar();
  renderInspectBanner();
  await resolveInviteFromUrl();

  if (!state.token && !savedUserBackup){
    // Guests can try the chat right away (7,500 tokens, enforced server-side).
    enterGuestMode();
    if (state.pendingInvite) openAuthOverlay('register');
    return;
  }
  const syncSessionWithServer = async (attempt = 0) => {
    try {
      const res = await api('/api/auth/me');
      if (res.banned && res.banInfo){
        showBannedModal(res.banInfo);
        return;
      }
      applyPayloadAfterAuth(res);
      startPresenceHeartbeat();
      await resolveSharedConvFromUrl();
    } catch(err){
      if (savedUserBackup && state.token){
        hideAuthOverlay();
        updateAccount(savedUserBackup);
        connectWS();
        if (attempt < 5){
          setTimeout(() => syncSessionWithServer(attempt + 1), 2500);
        }
        return;
      }
      clearSessionUI();
      if (state.pendingInvite) openAuthOverlay('register');
      else hideAuthOverlay();
    }
  };
  await syncSessionWithServer(0);
}

window.LZAuth = {
  get state(){ return state; },
  isGuest,
  openAuth: openAuthOverlay,
  refreshGuestStatus,
  getToken: () => state.token,
  getUser: () => state.user,
  getAccount: () => state.user,
  updateAccountState: updateAccount,
  consumeFeatureQuota,
  getPlanTagHtml,
  getBootData: () => state.bootData,
  usage,
  openCodesModal,
  openInviteModal,
  openProfileStudioModal,
  openUserProfileModal,
  createLimitBlock,
  scheduleSync,
  logout,
  renderUsageBar,
  inspectAccountLive,
  exitInspectAccount,
  playSynthesizedSound,
  playVoiceBroadcast
};

window.LZTeams = {
  renderView: renderTeamChatView,
  onShow: renderTeamChatView,
  startVoiceCall: startOrJoinTeamVoiceCall,
  leaveVoiceCall: leaveTeamVoiceCall,
  startScreenShare: startLocalScreenShare,
  stopScreenShare: stopLocalScreenShare
};

window.LZCodeTeams = {
  get activeTeam(){ return getActiveLokiTeam(); },
  renderBar: renderLokiTeamBar,
  broadcastSync: broadcastLokiTeamSync,
  broadcastCursor: (field = 'code', active = true) => {
    const t = getActiveLokiTeam();
    if (t) sendWS({ type: 'lokiteam:cursor', teamId: t.id, field, active });
  }
};

window.LZShared = {
  renderView: renderSharedHubView,
  onShow: renderSharedHubView,
  openShareChatModal,
  openShareSnippetModal
};

if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();

