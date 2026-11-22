/* ============================================================================
   Lokizenith AI — Subscription Plans Studio (/public/benches.js)
   - Replaces "Benches" with the animated emerald "Plans" studio:
     1. Loki Free ($0/Month) — Basic starter plan
     2. Loki Pro ($7.99/Month) — 5× More Usage (125k tokens), 15 Images/16h,
        52 LokiCode/4h, 85 Stark msgs/6h, 25 Attachments/4h, 12 Shared Chats/wk,
        Animated Backgrounds (Pro+), Animated Video Banner (up to 4s loop)
     3. Loki Ultimate ($12.99/Month or $5.00/Month Upgrade from Pro + 3-Day Free Trial) —
        Unlimited Usage, Unlimited Images, Full LokiCode Access, Unlimited Attachments,
        Full Lokizen 4.0 Stark Access, Ultra Thinking Mode Unlocked (Turbo Speed + Extra-High),
        AI Design Studio Unlocked
   ============================================================================ */
(function () {
  const A = window.App || window._Loki;
  if (!A) return;
  const { $, esc, toast, showView } = A;

  const PAYPAL_PRO_PLAN_ID = 'P-7T529484K52614831NL4C7WQ';
  const PAYPAL_ULTIMATE_PLAN_ID = 'P-41V408833G792383GNL4DSEY';

  function getAuthAccount() {
    return window.LZAuth?.getAccount?.() || window.LZAuth?.getUser?.() || null;
  }

  function getAuthToken() {
    return (
      localStorage.getItem('lz.authToken') ||
      localStorage.getItem('lz_token') ||
      window.LZAuth?.getToken?.() ||
      ''
    );
  }

  function formatRemainingMs(ms) {
    const safe = Math.max(0, Number(ms) || 0);
    const totalMinutes = Math.ceil(safe / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  function renderPlanBadgeHTML(tier, extraClass = '') {
    const t = String(tier || 'free').toLowerCase();
    if (t === 'ultimate') {
      return `<span class="lz-plan-tag ultimate ${extraClass}" title="Loki Ultimate Plan">✦ ULTIMATE</span>`;
    }
    if (t === 'pro') {
      return `<span class="lz-plan-tag pro ${extraClass}" title="Loki Pro Plan">PRO</span>`;
    }
    return `<span class="lz-plan-tag free ${extraClass}" title="Free Plan">FREE</span>`;
  }

  const PLAN_SECTIONS = {
    free: {
      tier: 'free',
      name: 'Loki Free',
      priceText: '$0/Month',
      subTitle: 'Starter access to Lokizenith AI & core tools',
      compareBanner: 'Baseline Free Tier',
      sections: [
        {
          title: 'AI Benefits',
          items: [
            { icon: '🤖', title: 'Lokizenith 3.5 Fera', sub: 'Standard daily chat responses', badge: 'Included' },
            { icon: '⚡', title: 'Lokizen 4.0 Stark (Limited)', sub: 'Max 10 messages every 6 hours (unless Admin authorized)', badge: '10 / 6h' },
            { icon: '🎨', title: 'AI Image Generation', sub: 'Up to 8 images per day (Daily = 16 hours)', badge: '8 / 16h' },
            { icon: '🔒', title: 'Ultra Thinking Mode', sub: 'Locked on Free plan', locked: true },
            { icon: '🔒', title: 'Priority Multi-Agent Deep Research', sub: 'Locked on Free plan', locked: true }
          ]
        },
        {
          title: 'App & Studio Benefits',
          items: [
            { icon: '🔋', title: 'Standard Token Usage', sub: '25,000 tokens every 6 hours', badge: '1× Base' },
            { icon: '💻', title: 'LokiCode Studio Access', sub: '12 code generations every 8 hours', badge: '12 / 8h' },
            { icon: '📎', title: 'Photo & File Attachments', sub: '8 file/photo uploads every 4 hours', badge: '8 / 4h' },
            { icon: '🔒', title: 'AI Design Section', sub: 'Locked on Free plan', locked: true }
          ]
        },
        {
          title: 'Profile & Sharing Benefits',
          items: [
            { icon: '🏷️', title: 'Basic FREE Tag', sub: 'Standard plain gray tag next to your username', badge: 'FREE' },
            { icon: '🔗', title: 'Weekly Shared Chats', sub: 'Share up to 4 chats/week (resets Friday 3:00 PM EST)', badge: '4 / week' },
            { icon: '🔒', title: 'Animated Backgrounds', sub: 'Requires Loki Pro+', locked: true },
            { icon: '🔒', title: 'Animated Video Banner (4s Loop)', sub: 'Requires Loki Pro+', locked: true }
          ]
        }
      ]
    },
    pro: {
      tier: 'pro',
      name: 'Loki Pro',
      priceText: '$7.99/Month',
      subTitle: 'Supercharged limits, animated customization & 5× usage',
      compareBanner: 'Everything in Free, plus:',
      bigHeroHighlight: '⚡ 5× MORE USAGE COMPARED TO FREE PLAN (125,000 TOKENS / 6H)',
      sections: [
        {
          title: 'AI Benefits',
          items: [
            { icon: '🚀', title: 'More Access to Lokizen 4.0 Stark', sub: '85 messages every 6 hours (8.5× more than Free)', badge: '85 / 6h', highlight: true },
            { icon: '🎨', title: 'More Daily Image Generations', sub: '15 AI images every 16 hours (Daily = 16h)', badge: '15 / 16h', highlight: true },
            { icon: '⚡', title: 'Priority Multi-Modal Vision', sub: 'Faster photo & document insight synthesis', badge: 'Pro Speed' },
            { icon: '🎙️', title: 'Enhanced Voice & Team Calls', sub: 'HD voice call ring & priority room streaming', badge: 'Unlocked' },
            { icon: '🔒', title: 'Ultra Thinking Mode & AI Designer', sub: 'Exclusive to Loki Ultimate', locked: true }
          ]
        },
        {
          title: 'App & Studio Benefits',
          items: [
            { icon: '🔋', title: '5× More Usage Quota', sub: 'Default balance upgraded from 25k to 125,000 tokens', badge: '125,000', highlight: true },
            { icon: '💻', title: 'More Access to LokiCode', sub: '52 code generations resetting every 4 hours', badge: '52 / 4h', highlight: true },
            { icon: '📎', title: 'More Photo & File Attachments', sub: '25 file & image attachments every 4 hours', badge: '25 / 4h', highlight: true },
            { icon: '🌌', title: 'Animated Backgrounds Unlocked', sub: 'Full access to Aurora, Matrix, Particles & Cyber Grid', badge: 'Pro+ Exclusive', highlight: true }
          ]
        },
        {
          title: 'Profile & Sharing Benefits',
          items: [
            { icon: '🎬', title: 'Animated Video Profile Banner', sub: 'Upload a video banner (plays first 4s in silent loop)', badge: '4s Video Loop', highlight: true },
            { icon: '💚', title: 'Neon Emerald PRO Tag', sub: 'Glowing green PRO badge in Topbar, Chat & Profile', badge: 'PRO' },
            { icon: '🔗', title: '3× More Weekly Shared Chats', sub: 'Share up to 12 chats per week (resets Friday 3:00 PM EST)', badge: '12 / week', highlight: true },
            { icon: '✨', title: 'Pro Profile Overlays & Accents', sub: 'Custom glowing borders & animated profile effects', badge: 'Included' }
          ]
        }
      ]
    },
    ultimate: {
      tier: 'ultimate',
      name: 'Loki Ultimate',
      priceText: '$12.99/Month',
      subTitle: 'Zero limits, Ultra speed thinking, Full Stark & AI Designer',
      compareBanner: 'Everything in Loki Pro, plus:',
      bigHeroHighlight: '👑 UNLIMITED USAGE · ULTRA MODE · FULL STARK · AI DESIGNER',
      sections: [
        {
          title: 'AI Benefits',
          items: [
            { icon: '♾️', title: 'Full Access to Lokizen 4.0 Stark', sub: 'Unlimited Stark messages with zero 6-hour lockouts', badge: '∞ Unlimited', highlight: true },
            { icon: '⚡', title: 'Ultra Thinking Mode Unlocked', sub: 'Remade to be as fast as Turbo + Extra-High intelligence', badge: 'Ultimate Only', highlight: true },
            { icon: '🔭', title: 'Unlimited Deep Research Synthesis', sub: '240+ source multi-engine research & instant verification', badge: 'Ultimate Only', highlight: true },
            { icon: '🎨', title: 'Unlimited Image Generation', sub: 'Generate unlimited AI artworks with zero daily cap', badge: '∞ Unlimited', highlight: true }
          ]
        },
        {
          title: 'App & Studio Benefits',
          items: [
            { icon: '♾️', title: 'Unlimited Token Usage', sub: 'Never run out of usage tokens in Chat, Vision, or Labs', badge: '∞ Unlimited', highlight: true },
            { icon: '💻', title: 'Full LokiCode Access', sub: 'Unlimited code generation, verification & 9-language compiling', badge: '∞ Unlimited', highlight: true },
            { icon: '📎', title: 'Unlimited File & Image Attachments', sub: 'Attach unlimited photos, PDFs, and code files', badge: '∞ Unlimited', highlight: true },
            { icon: '🎭', title: 'Access to AI Design Section', sub: 'Unlock the live AI UI/Theme Designer in Settings', badge: 'Ultimate Only', highlight: true }
          ]
        },
        {
          title: 'Profile & Sharing Benefits',
          items: [
            { icon: '👑', title: 'Animated Holographic ULTIMATE Tag', sub: '100× more beautiful animated shimmer badge everywhere', badge: '✦ ULTIMATE', highlight: true },
            { icon: '🎬', title: 'Animated 4s Video Banner + Exclusive FX', sub: 'Looping silent 4s video banner + cosmic profile overlays', badge: 'Unlocked', highlight: true },
            { icon: '🔗', title: 'Unlimited Weekly Shared Chats', sub: 'Share unlimited conversation links & copies', badge: '∞ Unlimited', highlight: true }
          ]
        }
      ]
    }
  };

  let _paypalRestConfigured = null;

  async function verifyPayPalCheckoutSubscription(subscriptionID) {
    try {
      const token = getAuthToken();
      const r = await fetch('/api/plans/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}`, 'x-lz-token': token } : {})
        },
        body: JSON.stringify({ subscriptionID })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast(j.error || 'Could not verify PayPal subscription.', 'err');
        return false;
      }
      if (j.account) {
        if (window.LZAuth?.updateAccountState) {
          window.LZAuth.updateAccountState(j.account);
        } else if (window.LZAuth?.refreshMe) {
          await window.LZAuth.refreshMe();
        }
      }
      toast(j.message || 'PayPal subscription verified & activated!', 'ok');
      render();
      return true;
    } catch (e) {
      toast(e?.message || 'Network error while verifying PayPal subscription.', 'err');
      return false;
    }
  }

  async function syncWithPayPal(silent = false) {
    try {
      const token = getAuthToken();
      if (!token) return false;
      const r = await fetch('/api/plans/paypal-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-lz-token': token
        },
        body: JSON.stringify({})
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (!silent) toast(j.error || 'Could not sync with PayPal.', 'err');
        return false;
      }
      if (j.account && window.LZAuth?.updateAccountState) {
        window.LZAuth.updateAccountState(j.account);
      }
      if (!silent) toast(j.message || 'Synced with PayPal!', 'ok');
      render();
      return true;
    } catch (e) {
      if (!silent) toast(e?.message || 'PayPal sync error.', 'err');
      return false;
    }
  }

  let _lastStatusSyncAt = 0;
  async function refreshPlansStatusFromServer(force = false) {
    const token = getAuthToken();
    if (!token) return;
    if (!force && Date.now() - _lastStatusSyncAt < 8000) return;
    _lastStatusSyncAt = Date.now();
    try {
      const r = await fetch('/api/plans/status', {
        headers: { Authorization: `Bearer ${token}`, 'x-lz-token': token }
      });
      const j = await r.json();
      if (typeof j.paypalRestConfigured === 'boolean') {
        _paypalRestConfigured = j.paypalRestConfigured;
      }
      if (r.ok && j.ok && j.account && window.LZAuth?.updateAccountState) {
        window.LZAuth.updateAccountState(j.account);
      } else {
        render();
      }
    } catch (_e) {}
  }

  async function cancelCurrentPlan() {
    try {
      const token = getAuthToken();
      const r = await fetch('/api/plans/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}`, 'x-lz-token': token } : {})
        }
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        toast(j.error || 'Could not cancel plan.', 'err');
        return false;
      }
      if (j.account && window.LZAuth?.updateAccountState) {
        window.LZAuth.updateAccountState(j.account);
      }
      toast(j.message || 'Subscription auto-renewal canceled.', 'ok');
      render();
      return true;
    } catch (e) {
      toast(e?.message || 'Error canceling plan.', 'err');
      return false;
    }
  }

  function normalizePurchaseOptions(acc) {
    const currentPlan = acc?.plan || 'free';
    const raw = acc?.purchaseOptions;
    const tiers = raw?.tiers || raw || {};
    return {
      free: {
        obtainable: tiers.free ? Boolean(tiers.free.obtainable) : false,
        isCurrent: currentPlan === 'free',
        priceDisplay: '$0/Month'
      },
      pro: {
        obtainable: tiers.pro ? Boolean(tiers.pro.obtainable) : currentPlan === 'free',
        isCurrent: currentPlan === 'pro',
        priceDisplay: '$7.99/Month'
      },
      ultimate: {
        obtainable: tiers.ultimate ? Boolean(tiers.ultimate.obtainable) : currentPlan !== 'ultimate',
        isCurrent: currentPlan === 'ultimate',
        isUpgradeFromPro: currentPlan === 'pro',
        priceUsd: currentPlan === 'pro' ? 5.0 : 12.99,
        priceDisplay: currentPlan === 'pro' ? '$5.00/Month' : '$12.99/Month',
        trialEligible:
          tiers.ultimate && typeof tiers.ultimate.trialAvailable === 'boolean'
            ? tiers.ultimate.trialAvailable
            : !acc?.usedUltimateTrial && currentPlan !== 'ultimate'
      }
    };
  }

  let _renderSeq = 0;
  let _mountPayPalTimer = null;

  const PAYPAL_SDK_URL = 'https://www.paypal.com/sdk/js?client-id=BAAX2U_UunOALXjCFc5_ByUQ-Z41HINtiJNFrJYiIZImn34v7OtTrwFlPGw7Zrb1oJ4uy5n5KX0Qq73UxU&vault=true&intent=subscription';
  function ensurePayPalSdk(){
    if (window.paypal && typeof window.paypal.Buttons === 'function') return Promise.resolve();
    if (!window.LZ || !LZ.loadScript) return Promise.resolve();
    return LZ.loadScript(PAYPAL_SDK_URL);
  }
  function mountPayPalButtons(purchaseOpts, renderSeq) {
    if (renderSeq !== _renderSeq) return;
    if (!window.paypal || typeof window.paypal.Buttons !== 'function'){
      ensurePayPalSdk().then(() => {
        if (renderSeq !== _renderSeq) return;
        if (window.paypal && typeof window.paypal.Buttons === 'function') mountPayPalButtons(purchaseOpts, renderSeq);
      }).catch(() => {});
      return;
    }
    const acc = getAuthAccount();

    // 1. Mount Pro PayPal Button if obtainable
    const proContainer = document.getElementById(`paypal-button-container-${PAYPAL_PRO_PLAN_ID}`);
    if (
      proContainer &&
      document.body.contains(proContainer) &&
      purchaseOpts?.pro?.obtainable &&
      proContainer.dataset.ppMounted !== '1'
    ) {
      proContainer.dataset.ppMounted = '1';
      proContainer.innerHTML = '';
      try {
        const res = window.paypal
          .Buttons({
            style: {
              shape: 'pill',
              color: 'black',
              layout: 'vertical',
              label: 'subscribe'
            },
            createSubscription: function (_data, actions) {
              localStorage.setItem('lz.pendingPaypalPlan', 'pro');
              const customTag = acc ? `${acc.id || ''}|${acc.username || ''}`.slice(0, 127) : '';
              return actions.subscription.create({
                plan_id: PAYPAL_PRO_PLAN_ID,
                ...(customTag ? { custom_id: customTag } : {})
              });
            },
            onApprove: async function (data) {
              const subId = data?.subscriptionID || '';
              await verifyPayPalCheckoutSubscription(subId);
            },
            onError: function () {}
          })
          .render(`#paypal-button-container-${PAYPAL_PRO_PLAN_ID}`);
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (_e) {}
    }

    // 2. Mount Ultimate PayPal Button if obtainable (includes PayPal 3-Day Free Trial)
    const ultContainer = document.getElementById(`paypal-button-container-${PAYPAL_ULTIMATE_PLAN_ID}`);
    if (
      ultContainer &&
      document.body.contains(ultContainer) &&
      purchaseOpts?.ultimate?.obtainable &&
      ultContainer.dataset.ppMounted !== '1'
    ) {
      ultContainer.dataset.ppMounted = '1';
      ultContainer.innerHTML = '';
      try {
        const resUlt = window.paypal
          .Buttons({
            style: {
              shape: 'rect',
              color: 'gold',
              layout: 'vertical',
              label: 'subscribe'
            },
            createSubscription: function (_data, actions) {
              const customTag = acc ? `${acc.id || ''}|${acc.username || ''}`.slice(0, 127) : '';
              return actions.subscription.create({
                plan_id: PAYPAL_ULTIMATE_PLAN_ID,
                ...(customTag ? { custom_id: customTag } : {})
              });
            },
            onApprove: async function (data) {
              const subId = data?.subscriptionID || '';
              await verifyPayPalCheckoutSubscription(subId);
            },
            onError: function () {}
          })
          .render(`#paypal-button-container-${PAYPAL_ULTIMATE_PLAN_ID}`);
        if (resUlt && typeof resUlt.catch === 'function') resUlt.catch(() => {});
      } catch (_e) {}
    }
  }

  function renderPayBoxHTML(cardTier, acc, purchaseOpts) {
    const currentPlan = acc?.plan || 'free';
    const isCanceled = Boolean(acc?.planCanceledAt || acc?.isCanceledButActive);
    const expiresAt = acc?.planExpiresAt;
    const expStr = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    if (cardTier === 'free') {
      const fOpt = purchaseOpts?.free || { obtainable: false, isCurrent: currentPlan === 'free' };
      if (fOpt.isCurrent) {
        return `
          <div class="lplan-pay-box is-current">
            <div class="lplan-status-pill current">✓ Current Active Plan</div>
            <small class="lplan-pay-note">Standard limits active · Upgrade anytime for 5× usage or Unlimited</small>
          </div>
        `;
      }
      return `
        <div class="lplan-pay-box is-locked">
          <button type="button" class="lplan-cta-btn disabled" disabled>🔒 Unobtainable — Higher Plan Active</button>
          <small class="lplan-pay-note">You have ${currentPlan.toUpperCase()} active${expStr ? ` until ${esc(expStr)}` : ''}</small>
        </div>
      `;
    }

    if (cardTier === 'pro') {
      const pOpt = purchaseOpts?.pro || {
        obtainable: currentPlan === 'free',
        isCurrent: currentPlan === 'pro',
        priceDisplay: '$7.99/Month'
      };
      if (pOpt.isCurrent) {
        return `
          <div class="lplan-pay-box is-current">
            <div class="lplan-status-pill current pro">✓ Current Active Plan ${isCanceled && expStr ? `(Active until ${esc(expStr)})` : ''}</div>
            <small class="lplan-pay-note">Enjoying 5× usage (125k tokens), 15 images/16h &amp; 52 LokiCode/4h</small>
          </div>
        `;
      }
      if (!pOpt.obtainable) {
        return `
          <div class="lplan-pay-box is-locked">
            <button type="button" class="lplan-cta-btn disabled" disabled>🔒 Unobtainable — Loki Ultimate Active</button>
            <small class="lplan-pay-note">Lower tiers cannot be purchased while Loki Ultimate is active</small>
          </div>
        `;
      }
      return `
        <div class="lplan-pay-box">
          <div class="lplan-pay-note" style="font-weight:700;color:#d6ffef;text-align:center;">
            ⚡ Real PayPal Subscription · $7.99/Month (Auto-Synced)
          </div>
          <div class="lplan-paypal-wrap">
            <div id="paypal-button-container-${PAYPAL_PRO_PLAN_ID}" class="lplan-paypal-slot"></div>
          </div>
        </div>
      `;
    }

    // Ultimate tier
    const uOpt = purchaseOpts?.ultimate || {
      obtainable: currentPlan !== 'ultimate',
      isCurrent: currentPlan === 'ultimate',
      isUpgradeFromPro: currentPlan === 'pro',
      priceUsd: currentPlan === 'pro' ? 5.0 : 12.99,
      priceDisplay: currentPlan === 'pro' ? '$5.00/Month' : '$12.99/Month',
      trialEligible: !acc?.usedUltimateTrial && currentPlan !== 'ultimate'
    };

    if (uOpt.isCurrent) {
      return `
        <div class="lplan-pay-box is-current">
          <div class="lplan-status-pill current ultimate">
            ✦ ${acc?.isTrialing || acc?.isTrialActive ? '3-Day PayPal Trial Active' : 'Current Active Plan'}
            ${expStr ? ` · Until ${esc(expStr)}` : ''}
          </div>
          <small class="lplan-pay-note">All Ultimate benefits, Ultra mode, Full Stark &amp; AI Designer unlocked</small>
        </div>
      `;
    }

    return `
      <div class="lplan-pay-box">
        ${uOpt.trialEligible ? `
          <div class="lplan-trial-badge-pp">
            🎁 PayPal Subscription Includes <b>3-Day Free Trial</b> · $0 Today, then $12.99/mo
          </div>
        ` : `
          <div class="lplan-trial-used">✓ 3-Day Free Trial previously claimed · PayPal bills standard rate</div>
        `}
        ${uOpt.isUpgradeFromPro ? `
          <div class="lplan-prorate-pill">✨ Pro Member Upgrade Difference: $5.00/mo ($12.99 − $7.99)</div>
        ` : ''}
        <div class="lplan-paypal-wrap">
          <div id="paypal-button-container-${PAYPAL_ULTIMATE_PLAN_ID}" class="lplan-paypal-slot"></div>
        </div>
      </div>
    `;
  }

  function renderQuotaSummaryStrip(acc) {
    const fq = acc?.featureQuotas || {};
    const currentPlan = acc?.plan || 'free';
    const isUlt = currentPlan === 'ultimate';
    const isPro = currentPlan === 'pro';

    const fmtQ = (item, fallbackLim, fallbackWindow) => {
      if (isUlt || item?.unlimited) return `<b class="q-inf">∞ Unlimited</b>`;
      if (!item) return `<b>${fallbackLim} / ${fallbackLim}</b> <small>(${fallbackWindow})</small>`;
      const remTime = formatRemainingMs((item.resetAt || Date.now() + 3600000) - Date.now());
      return `<b>${item.remaining} / ${item.limit}</b> <small>(resets in ${remTime})</small>`;
    };

    return `
      <div class="lplan-quota-strip">
        <div class="lplan-q-item">
          <span class="q-ic">🎨</span>
          <div>
            <small>Daily Images (16h)</small>
            <div>${fmtQ(fq.image || fq.image_gen, isPro ? 15 : 8, '16h cycle')}</div>
          </div>
        </div>
        <div class="lplan-q-item">
          <span class="q-ic">💻</span>
          <div>
            <small>LokiCode Access</small>
            <div>${fmtQ(fq.lokicode, isPro ? 52 : 12, isPro ? '4h cycle' : '8h cycle')}</div>
          </div>
        </div>
        <div class="lplan-q-item">
          <span class="q-ic">⚡</span>
          <div>
            <small>Lokizen 4.0 Stark (6h)</small>
            <div>${fmtQ(fq.stark || fq.stark_msg, isPro ? 85 : 10, '6h cycle')}</div>
          </div>
        </div>
        <div class="lplan-q-item">
          <span class="q-ic">📎</span>
          <div>
            <small>Files &amp; Photos (4h)</small>
            <div>${fmtQ(fq.attachment || fq.file_attach, isPro ? 25 : 8, '4h cycle')}</div>
          </div>
        </div>
        <div class="lplan-q-item">
          <span class="q-ic">🔗</span>
          <div>
            <small>Weekly Shared Chats</small>
            <div>${fmtQ(fq.share_chat, isPro ? 12 : 4, 'Fri 3PM EST')}</div>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const root = $('#benchesView');
    if (!root) return;

    const acc = getAuthAccount();
    const currentPlan = acc?.plan || 'free';
    const purchaseOpts = normalizePurchaseOptions(acc);

    const ultPriceHeader =
      currentPlan === 'pro'
        ? `<span class="lplan-old-price">$12.99</span> $5.00<span>/Month</span>`
        : `$12.99<span>/Month</span>`;

    const hasPaidPlan = currentPlan === 'pro' || currentPlan === 'ultimate';
    const expStr = acc?.planExpiresAt
      ? new Date(acc.planExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'the end of your billing period';

    root.innerHTML = `
      <div class="lplans-shell">
        <div class="lplans-orbs" aria-hidden="true">
          <span class="orb-1"></span>
          <span class="orb-2"></span>
          <span class="orb-3"></span>
        </div>

        <header class="lplans-hero">
          <div class="lplans-hero-top">
            <button type="button" class="back-btn" id="lplansBackBtn">‹ Back to Chat</button>
            <div class="lplans-active-pill">
              <span>Your Active Plan:</span>
              ${renderPlanBadgeHTML(currentPlan)}
              ${acc?.isTrialing || acc?.isTrialActive ? `<span class="lplans-trial-chip">⏳ 3-Day Trial Active</span>` : ''}
              ${acc?.planCanceledAt || acc?.isCanceledButActive ? `<span class="lplans-canceled-chip">Canceled · Active until ${esc(expStr)}</span>` : ''}
            </div>
          </div>

          <div class="lplans-hero-center">
            <span class="lplans-eyebrow">💎 LOKIZENITH SUBSCRIPTION PLANS</span>
            <h1>Choose Your Loki Power Tier</h1>
            <p>Unlock 5× more usage with <b>Loki Pro</b> or go limitless with <b>Loki Ultimate</b> — featuring Ultra Thinking Mode (at Turbo speed), Animated Video Banners, AI Design Studio, and Full Lokizen 4.0 Stark access.</p>
          </div>

          ${renderQuotaSummaryStrip(acc)}

          ${acc ? `
            <div class="lplans-sync-bar" id="lplansSyncBar">
              <div class="lplans-sync-info">
                <span class="lplans-sync-dot ${acc.paypalSubscriptionId || currentPlan !== 'free' ? 'live' : ''}"></span>
                <div>
                  <b>${acc.paypalSubscriptionId
                    ? `PayPal Subscription Active · ID: <code>${esc(acc.paypalSubscriptionId)}</code> (${esc(acc.paypalStatus || (acc.isTrialing ? 'TRIALING' : 'ACTIVE'))})`
                    : acc.planSource === 'event' && currentPlan !== 'free'
                    ? `🏆 Unlocked via Community Event (${esc(currentPlan.toUpperCase())}${acc.planDurationLabel ? ` · ${esc(acc.planDurationLabel)}` : ''}${acc.planExpiresAt ? ` · Until ${esc(expStr)}` : ''})`
                    : acc.planSource === 'admin' && currentPlan !== 'free'
                    ? `Granted by Admin (${esc(currentPlan.toUpperCase())}${acc.planDurationLabel ? ` · ${esc(acc.planDurationLabel)}` : ''}${acc.planExpiresAt ? ` · Until ${esc(expStr)}` : ' · Permanent'})`
                    : _paypalRestConfigured === false
                    ? 'PayPal Checkout Active · Live PayPal server verification awaits PAYPAL_CLIENT_SECRET'
                    : 'Verified PayPal Checkout — Subscriptions unlock strictly after PayPal payment or Admin grant'}</b>
                  <small>${acc.paypalLastSyncedAt ? `Last verified with PayPal at ${new Date(acc.paypalLastSyncedAt).toLocaleTimeString()}` : acc.planExpiresAt && currentPlan !== 'free' ? `Active benefits expire automatically on ${esc(expStr)}.` : 'Loki Ultimate on PayPal includes PayPal’s real 3-Day Free Trial.'}</small>
                </div>
              </div>
              <div class="lplans-sync-actions">
                ${acc.paypalSubscriptionId ? `<button type="button" class="lplans-sync-btn" id="lplansSyncBtn">🔄 Sync PayPal Status</button>` : ''}
              </div>
            </div>
          ` : ''}
        </header>

        <div class="lplans-grid">
          ${['free', 'pro', 'ultimate'].map((tierKey) => {
            const p = PLAN_SECTIONS[tierKey];
            const isCurrent = currentPlan === tierKey;
            const priceHtml =
              tierKey === 'free'
                ? `$0<span>/Month</span>`
                : tierKey === 'pro'
                ? `$7.99<span>/Month</span>`
                : ultPriceHeader;

            return `
              <article class="lplan-card tier-${tierKey} ${isCurrent ? 'is-active-plan' : ''}" data-tier-card="${tierKey}">
                <div class="lplan-card-glow" aria-hidden="true"></div>

                <div class="lplan-card-head">
                  <div class="lplan-title-row">
                    <div>
                      <span class="lplan-tier-kicker">${tierKey === 'ultimate' ? '👑 MOST POWERFUL · 3-DAY PAYPAL FREE TRIAL' : tierKey === 'pro' ? '⚡ POPULAR UPGRADE' : '🌱 STARTER PLAN'}</span>
                      <h2>${esc(p.name)}</h2>
                    </div>
                    ${renderPlanBadgeHTML(tierKey, 'lg')}
                  </div>

                  <div class="lplan-price-row">
                    <div class="lplan-price">${priceHtml}</div>
                    ${tierKey === 'ultimate' && currentPlan === 'pro' ? `<span class="lplan-upgrade-save">Save $7.99/mo with Pro Proration</span>` : ''}
                  </div>
                  <p class="lplan-sub">${esc(p.subTitle)}</p>
                </div>

                <!-- PayPal Payment Buttons Below Plan Name and Above Benefits List -->
                ${renderPayBoxHTML(tierKey, acc, purchaseOpts)}

                ${p.bigHeroHighlight ? `
                  <div class="lplan-big-banner ${tierKey}">
                    ${esc(p.bigHeroHighlight)}
                  </div>
                ` : ''}

                <div class="lplan-compare-lbl">${esc(p.compareBanner)}</div>

                <div class="lplans-sections lplan-sections">
                  ${p.sections.map((sec) => `
                    <div class="lplan-sec">
                      <h3 class="lplan-sec-title">${esc(sec.title)}</h3>
                      <ul class="lplan-feat-list">
                        ${sec.items.map((it) => `
                          <li class="lplan-feat-item ${it.locked ? 'is-locked' : ''} ${it.highlight ? 'is-highlight' : ''}">
                            <span class="lplan-feat-ic">${it.icon}</span>
                            <div class="lplan-feat-body">
                              <div class="lplan-feat-top">
                                <b>${esc(it.title)}</b>
                                ${it.badge ? `<span class="lplan-feat-badge">${esc(it.badge)}</span>` : ''}
                              </div>
                              <small>${esc(it.sub)}</small>
                            </div>
                          </li>
                        `).join('')}
                      </ul>
                    </div>
                  `).join('')}
                </div>
              </article>
            `;
          }).join('')}
        </div>

        ${hasPaidPlan ? `
          <footer class="lplans-cancel-footer" id="lplansCancelFooter">
            <div class="lplans-cancel-card">
              <div class="lplans-cancel-info">
                <b>Manage Your ${esc(acc?.planName || currentPlan.toUpperCase())} Subscription</b>
                <p>
                  ${acc?.planCanceledAt || acc?.isCanceledButActive
                    ? `Your auto-renewal is already canceled. You will keep all ${esc(acc?.planName || 'paid')} benefits until <b>${esc(expStr)}</b>.`
                    : `If you cancel your subscription, auto-renewal stops on PayPal and you keep all ${esc(acc?.planName || 'paid')} benefits until <b>${esc(expStr)}</b>.`}
                </p>
              </div>
              ${!(acc?.planCanceledAt || acc?.isCanceledButActive) ? `
                <button type="button" class="lplans-cancel-btn" id="lplansCancelBtn">
                  ✕ Cancel Plan
                </button>
              ` : `
                <span class="lplans-canceled-pill">✓ Auto-Renewal Canceled (Active until ${esc(expStr)})</span>
              `}
            </div>
          </footer>
        ` : ''}
      </div>
    `;

    const backBtn = $('#lplansBackBtn');
    if (backBtn) backBtn.onclick = () => showView('chat');

    const syncBtn = $('#lplansSyncBtn');
    if (syncBtn) {
      syncBtn.onclick = async () => {
        syncBtn.disabled = true;
        const orig = syncBtn.textContent;
        syncBtn.textContent = '⏳ Verifying with PayPal…';
        await syncWithPayPal(false);
        syncBtn.disabled = false;
        syncBtn.textContent = orig;
      };
    }

    const cancelBtn = $('#lplansCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = async () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Canceling…';
        await cancelCurrentPlan();
      };
    }

    const seq = ++_renderSeq;
    if (_mountPayPalTimer) {
      clearTimeout(_mountPayPalTimer);
      _mountPayPalTimer = null;
    }
    _mountPayPalTimer = setTimeout(() => {
      _mountPayPalTimer = null;
      mountPayPalButtons(purchaseOpts, seq);
    }, 120);
  }

  function open() {
    const seqBefore = _renderSeq;
    showView('benches');
    if (_renderSeq === seqBefore) {
      render();
    }
    refreshPlansStatusFromServer(true);
  }

  function onShow() {
    render();
    refreshPlansStatusFromServer();
  }

  function init() {
    const topBtn = $('#benchesBtn');
    if (topBtn) {
      topBtn.onclick = () => open();
    }
  }

  window.LokiBenches = { open, onShow, render, renderPlanBadgeHTML, cancelCurrentPlan };
  window.LokiPlans = window.LokiBenches;
  init();
})();
