/* ============================================================================
   Lokizenith AI — Community Events & AI-Powered Milestone Showcase
   ============================================================================ */
(() => {
  'use strict';

  let currentEvent = null;
  let countdownTimer = null;
  let isClaimingTierId = null;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function getAuthToken() {
    try {
      return window.LZAuth?.getToken?.() || localStorage.getItem('lz.auth.token') || '';
    } catch (_) {
      return '';
    }
  }

  function showToast(msg, kind = 'ok') {
    if (typeof window.toast === 'function') {
      window.toast(msg, kind);
      return;
    }
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function formatCountdown(ms) {
    const clean = Math.max(0, Math.floor(Number(ms) || 0));
    if (clean <= 0) return 'Ended';
    const totalSec = Math.floor(clean / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (days > 0) return `${days}d ${hrs}h ${mins}m ${secs}s`;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function renderMarkdownSafe(md) {
    const raw = String(md || '');
    try {
      if (window.marked && window.DOMPurify) {
        const html = window.marked.parse(raw, { breaks: true, gfm: true });
        return window.DOMPurify.sanitize(html);
      }
    } catch (_) {}
    return `<p>${esc(raw).replace(/\n+/g, '</p><p>')}</p>`;
  }

  function syncTopButton() {
    const btn = $('#communityEventTopBtn');
    if (!btn) return;
    const ev = currentEvent;
    const visible = Boolean(ev && ev.active && !ev.ended);
    btn.hidden = !visible;
    if (!visible) {
      btn.removeAttribute('data-accent');
      return;
    }
    const label = ev.buttonLabel || ev.name || 'Live Event';
    const icon = ev.icon || '🎉';
    const pct = Math.min(100, Math.max(0, Number(ev.progressPct) || 0));
    btn.dataset.accent = ev.themeAccent || 'emerald';
    btn.title = `${ev.name} — ${pct}% Complete · Click to open Community Event`;
    btn.innerHTML = `
      <span class="ev-top-ic">${esc(icon)}</span>
      <span class="ev-top-lbl">${esc(label)}</span>
      <span class="ev-top-pct">${pct}%</span>
    `;
  }

  function startCountdownLoop() {
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      const view = $('#eventView');
      if (!view || !view.classList.contains('active')) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        return;
      }
      const el = $('#levCountdownValue');
      if (!el || !currentEvent) return;
      const rem = Math.max(0, Number(currentEvent.endsAt || 0) - Date.now());
      el.textContent = formatCountdown(rem);
      if (rem <= 0 && !currentEvent.ended) {
        currentEvent.ended = true;
        syncTopButton();
        render();
      }
    }, 1000);
  }

  function setEvent(ev) {
    currentEvent = ev || null;
    syncTopButton();
    if ($('#eventView')?.classList.contains('active')) {
      render();
    }
  }

  function getEvent() {
    return currentEvent;
  }

  async function refresh() {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/events/active', {
        headers: token ? { Authorization: `Bearer ${token}`, 'x-lz-token': token } : {},
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setEvent(j.event || null);
      }
    } catch (_) {}
    return currentEvent;
  }

  async function claimTier(eventId, tierId) {
    if (!eventId || !tierId || isClaimingTierId) return false;
    const token = getAuthToken();
    if (!token) {
      showToast('Please sign in to claim community milestone rewards.', 'err');
      return false;
    }
    isClaimingTierId = tierId;
    render();
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-lz-token': token,
        },
        body: JSON.stringify({ tierId }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        showToast(j.error || 'Could not claim reward.', 'err');
        return false;
      }
      if (j.event) currentEvent = j.event;
      if (j.account && window.LZAuth?.updateAccountState) {
        window.LZAuth.updateAccountState(j.account);
      }
      syncTopButton();
      showToast(`🏆 Reward Claimed: ${j.rewardSummary || 'Unlocked!'}`, 'ok');
      return true;
    } catch (err) {
      showToast(err?.message || 'Could not claim milestone reward.', 'err');
      return false;
    } finally {
      isClaimingTierId = null;
      render();
    }
  }

  function render() {
    const root = $('#eventView');
    if (!root) return;
    const ev = currentEvent;

    if (!ev) {
      root.innerHTML = `
        <div class="lev-shell">
          <div class="lev-empty-card">
            <div class="lev-empty-ic">🎉</div>
            <h2>No Active Community Event Right Now</h2>
            <p>When an Admin launches a live community challenge, its glowing event button will appear automatically in your top bar with shared goals and milestone rewards!</p>
            <div class="lev-empty-actions">
              <button type="button" class="btn-primary" id="levEmptyBackBtn">‹ Back to Chat</button>
              <button type="button" class="btn-ghost" id="levEmptyRefreshBtn">↻ Check Again</button>
            </div>
          </div>
        </div>
      `;
      $('#levEmptyBackBtn')?.addEventListener('click', () => {
        if (typeof window.showView === 'function') window.showView('chat');
      });
      $('#levEmptyRefreshBtn')?.addEventListener('click', () => refresh());
      return;
    }

    const accent = esc(ev.themeAccent || 'emerald');
    const goalTarget = Math.max(1, Number(ev.goalTarget) || 100);
    const progress = Math.max(0, Number(ev.progress) || 0);
    const pct = Math.min(100, Math.round((progress / goalTarget) * 100));
    const remMs = Math.max(0, Number(ev.endsAt || 0) - Date.now());
    const ended = Boolean(ev.ended || !ev.active || remMs <= 0);
    const tiers = Array.isArray(ev.tiers) ? ev.tiers : [];
    const highlights = Array.isArray(ev.highlights) ? ev.highlights : [];
    const unlockedCount = tiers.filter((t) => t.unlocked || progress >= t.targetProgress).length;

    root.innerHTML = `
      <div class="lev-shell" data-accent="${accent}">
        <div class="lev-ambient" aria-hidden="true"></div>

        <header class="lev-hero">
          <div class="lev-hero-nav">
            <button type="button" class="back-btn" id="levBackBtn">‹ Back to Chat</button>
            <div class="lev-hero-pills">
              <span class="lev-live-pill ${ended ? 'ended' : 'live'}">
                <i></i>${ended ? 'EVENT ENDED' : 'LIVE COMMUNITY EVENT'}
              </span>
              <span class="lev-meta-pill">Launched by <b>@${esc(ev.createdBy || 'Admin')}</b></span>
              <button type="button" class="btn-ghost lev-refresh-btn" id="levRefreshBtn" title="Refresh live progress">↻ Sync</button>
            </div>
          </div>

          <div class="lev-hero-main">
            <div class="lev-hero-icon">${esc(ev.icon || '🎉')}</div>
            <div class="lev-hero-copy">
              <span class="lev-kicker">${esc(ev.name)} · ${esc(ev.metricLabel || 'Community Activity')}</span>
              <h1>${esc(ev.headline || ev.name)}</h1>
              <p>${esc(ev.subtitle || '')}</p>
            </div>
          </div>

          <div class="lev-kpi-strip">
            <div class="lev-kpi">
              <small>COMMUNITY PROGRESS</small>
              <b>${progress.toLocaleString()} / ${goalTarget.toLocaleString()}</b>
              <span>${pct}% of final goal</span>
            </div>
            <div class="lev-kpi">
              <small>MILESTONES UNLOCKED</small>
              <b>${unlockedCount} / ${tiers.length}</b>
              <span>Tiers available for everyone</span>
            </div>
            <div class="lev-kpi">
              <small>PARTICIPANTS</small>
              <b>👥 ${Number(ev.participantsCount || 0).toLocaleString()}</b>
              <span>Active contributors</span>
            </div>
            <div class="lev-kpi">
              <small>TIME REMAINING</small>
              <b id="levCountdownValue">${ended ? 'Ended' : esc(formatCountdown(remMs))}</b>
              <span>Ends ${new Date(ev.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          <div class="lev-progress-card">
            <div class="lev-prog-head">
              <span>⚡ Global Progression Meter (${esc(ev.metricLabel || 'Combined Activity')})</span>
              <b>${pct}% · ${progress.toLocaleString()} / ${goalTarget.toLocaleString()}</b>
            </div>
            <div class="lev-prog-track">
              <div class="lev-prog-fill" style="width:${pct}%"></div>
              ${tiers
                .map((t) => {
                  const pos = Math.min(99, Math.max(4, Math.round((t.targetProgress / goalTarget) * 100)));
                  const hit = progress >= t.targetProgress;
                  return `<span class="lev-prog-pin ${hit ? 'hit' : ''}" style="left:${pos}%" title="${esc(t.title)} (${t.targetProgress.toLocaleString()})">${esc(t.badgeEmoji || '★')}</span>`;
                })
                .join('')}
            </div>
          </div>
        </header>

        <section class="lev-tiers-section">
          <div class="lev-section-head">
            <h2>🏆 Community Milestone Tiers &amp; Rewards</h2>
            <p>Everyone on Lokizenith contributes to the shared progress bar. Once a tier hits 100%, claim its reward right here!</p>
          </div>

          <div class="lev-tiers-grid">
            ${tiers
              .map((tier, idx) => {
                const hit = Boolean(tier.unlocked || progress >= tier.targetProgress);
                const claimed = Boolean(tier.claimed);
                const claimable = Boolean(hit && !claimed && !ended);
                const tPct = Math.min(100, Math.round((progress / Math.max(1, tier.targetProgress)) * 100));
                const remaining = Math.max(0, Number(tier.targetProgress) - progress);
                const isBusy = isClaimingTierId === tier.id;
                return `
                  <article class="lev-tier-card ${hit ? 'is-unlocked' : 'is-locked'} ${claimed ? 'is-claimed' : ''}">
                    <div class="lev-tier-top">
                      <span class="lev-tier-step">TIER ${idx + 1}</span>
                      <span class="lev-tier-emoji">${esc(tier.badgeEmoji || '🏆')}</span>
                    </div>
                    <h3>${esc(tier.title)}</h3>
                    <p class="lev-tier-desc">${esc(tier.description || '')}</p>
                    <div class="lev-tier-reward-pill">🎁 ${esc(tier.rewardSummary || tier.title)}</div>

                    <div class="lev-tier-prog-meta">
                      <span>Goal: <b>${Number(tier.targetProgress).toLocaleString()}</b></span>
                      <span>${tPct}%</span>
                    </div>
                    <div class="lev-tier-bar"><i style="width:${tPct}%"></i></div>

                    <div class="lev-tier-action">
                      ${claimed
                        ? `<div class="lev-claim-done">✓ Reward Claimed on Your Account</div>`
                        : claimable
                        ? `<button type="button" class="lev-claim-btn" data-claim-tier="${esc(tier.id)}" ${isBusy ? 'disabled' : ''}>${isBusy ? '⏳ Claiming Reward…' : '🎁 Claim Reward Now'}</button>`
                        : ended
                        ? `<div class="lev-claim-locked">⌛ Event Ended Before Milestone</div>`
                        : `<div class="lev-claim-locked">🔒 ${remaining.toLocaleString()} more needed to unlock</div>`}
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
        </section>

        <section class="lev-story-grid">
          <article class="lev-story-card">
            <h3>📜 Event Briefing &amp; Community Rules</h3>
            <div class="lev-story-md md">${renderMarkdownSafe(ev.storyMarkdown)}</div>
          </article>
          ${highlights.length
            ? `
              <aside class="lev-highlights-card">
                <h3>✨ Key Event Highlights</h3>
                <ul>
                  ${highlights.map((h) => `<li><span>⚡</span><span>${esc(h)}</span></li>`).join('')}
                </ul>
              </aside>
            `
            : ''}
        </section>
      </div>
    `;

    $('#levBackBtn')?.addEventListener('click', () => {
      if (typeof window.showView === 'function') window.showView('chat');
    });
    $('#levRefreshBtn')?.addEventListener('click', () => refresh());
    root.querySelectorAll('[data-claim-tier]').forEach((btn) => {
      btn.addEventListener('click', () => claimTier(ev.id, btn.dataset.claimTier));
    });

    if (!ended) startCountdownLoop();
  }

  function open() {
    if (typeof window.showView === 'function') {
      window.showView('event');
    }
    onShow();
  }

  function onShow() {
    render();
    refresh();
  }

  window.LZEvents = {
    setEvent,
    getEvent,
    open,
    onShow,
    render,
    claimTier,
    refresh,
    syncTopButton,
  };
})();
