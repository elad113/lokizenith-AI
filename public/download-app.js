/* Lokizenith AI — Download App studio + native shell bridge. Made by Lokiz Studios. */
(function(){
'use strict';

const t = (s) => (window.I18N ? I18N.t(s) : s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function detectNative(){
  const d = window.LokizenithDesktop;
  const a = window.LokizenithAndroid || window.LokizenithApp;
  const ua = navigator.userAgent || '';
  if (d && typeof d === 'object') return { kind: 'desktop', bridge: d, version: d.version || '', features: d.features || [] };
  if (a && typeof a === 'object') return { kind: 'android', bridge: a, version: a.version || a.getVersion?.() || '', features: a.features || [] };
  if (/LokizenithAI-Desktop\//i.test(ua)) return { kind: 'desktop', bridge: null, version: (ua.match(/LokizenithAI-Desktop\/([\d.]+)/)||[])[1]||'', features: [] };
  if (/LokizenithAI-Android\//i.test(ua)) return { kind: 'android', bridge: null, version: (ua.match(/LokizenithAI-Android\/([\d.]+)/)||[])[1]||'', features: [] };
  return null;
}

function formatBytes(n){
  const v = Number(n) || 0;
  if (v <= 0) return '';
  if (v < 1024) return v + ' B';
  if (v < 1024 * 1024) return (v / 1024).toFixed(0) + ' KB';
  return (v / (1024 * 1024)).toFixed(1) + ' MB';
}

function attachNativeFiles(list){
  const input = document.getElementById('fileInput');
  if (!input || !list || !list.length) return 0;
  try {
    const dt = new DataTransfer();
    for (const f of list){
      const raw = f.base64 || f.data || '';
      const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      dt.items.add(new File([bin], f.name || 'file', { type: f.type || 'application/octet-stream' }));
    }
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return list.length;
  } catch (err) {
    console.warn('[Lokizenith] could not attach native files', err);
    return 0;
  }
}

async function openDesktopFiles(){
  const d = window.LokizenithDesktop;
  if (!d || typeof d.openLocalFiles !== 'function') return;
  const files = await d.openLocalFiles();
  if (files && files.length) attachNativeFiles(files);
}

async function fetchManifest(){
  try {
    const r = await fetch('/api/app-version', { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch (_) {}
  try {
    const r = await fetch('/app-version.json', { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch (_) {}
  return {
    version: '1.0.0',
    releasedAt: '2026-11-19',
    downloads: {
      windows: { label: 'Download for Windows', url: 'https://storage.googleapis.com/lokizenith-ai-app-downloads/Lokizenith-AI-Setup-1.1.0.exe', file: 'Lokizenith-AI-Setup-1.1.0.exe', sizeBytes: 0, sha256: '' },
      android: { label: 'Download for Android (APK)', url: '/downloads/Lokizenith-AI-1.0.0.apk', file: 'Lokizenith-AI-1.0.0.apk', sizeBytes: 0, sha256: '' }
    },
    desktopFeatures: []
  };
}

function render(root, manifest){
  const native = detectNative();
  const win = manifest.downloads.windows;
  const and = manifest.downloads.android;
  const winMeta = [formatBytes(win.sizeBytes), win.file, win.sha256 ? 'SHA-256 ' + win.sha256.slice(0, 12) + '…' : ''].filter(Boolean).join(' · ');
  const andMeta = [formatBytes(and.sizeBytes), and.file, and.sha256 ? 'SHA-256 ' + and.sha256.slice(0, 12) + '…' : ''].filter(Boolean).join(' · ');
  const pcFeatures = (manifest.desktopFeatures && manifest.desktopFeatures.length)
    ? manifest.desktopFeatures
    : [
        'System tray with quick New Chat, Show/Hide, and Quit',
        'Global hotkey Ctrl+Shift+L to show or hide the window',
        'Open local files from disk and attach them to chat',
        'Offline cache so the last session can reopen without a connection',
        'Native Windows notifications',
        'Automatic update check against lokizenith.com'
      ];
  const inApp = native
    ? `<div class="da-inapp">${esc(t("You're using the"))} ${native.kind === 'desktop' ? esc(t('Windows app')) : esc(t('Android app'))}${native.version ? ' v' + esc(native.version) : ''}. ${esc(t('The website and both apps share the same accounts, chats, and admin user list.'))}</div>`
    : '';

  root.innerHTML = `
    <div class="da-hero">
      <div class="da-kicker">${esc(t('Lokiz Studios'))} · ${esc(t('Independent apps'))}</div>
      <h1>${esc(t('Download Lokizenith AI'))}</h1>
      <p>${esc(t('Install a standalone Windows or Android app. Each app can be updated separately from the website. Sign in with the same Lokizenith account — a new user on mobile or PC appears in the website admin users list, and chats stay in sync.'))}</p>
      <div class="da-ver">
        <span class="da-chip">${esc(t('App version'))} ${esc(manifest.version || '1.0.0')}</span>
        <span class="da-chip">${esc(t('Same accounts as'))} lokizenith.com</span>
        <span class="da-chip">${esc(t('Auto-update check'))}</span>
      </div>
    </div>
    ${inApp}
    <div class="da-grid">
      <article class="da-card win">
        <h2><span class="da-logo" aria-hidden="true">🪟</span> ${esc(t('Windows'))}</h2>
        <p>${esc(t('A native PC app with a system tray, a global hotkey, local file access, offline cache, notifications, and auto-update — abilities the website and the Android app do not have.'))}</p>
        <div class="da-meta">${esc(winMeta || t('Windows 10 or later · 64-bit installer'))}</div>
        <div class="da-dl-wrap">
          <a class="da-dl" id="daWinBtn" href="${esc(win.url)}" download="${esc(win.file)}">⬇ ${esc(t('Download for Windows'))}</a>
        </div>
      </article>
      <article class="da-card and">
        <h2><span class="da-logo" aria-hidden="true">🤖</span> ${esc(t('Android'))}</h2>
        <p>${esc(t('A signed release APK that opens Lokizenith AI as its own app. Use the same account as the website and the Windows app. Chats, settings, and LokiCode stay in sync.'))}</p>
        <div class="da-meta">${esc(andMeta || t('Android 8.0 or later · signed APK'))}</div>
        <div class="da-dl-wrap">
          <a class="da-dl" id="daAndBtn" href="${esc(and.url)}" download="${esc(and.file)}">⬇ ${esc(t('Download for Android (APK)'))}</a>
        </div>
      </article>
    </div>
    <section class="da-features">
      <h3>${esc(t('PC-only abilities'))}</h3>
      <ul>${pcFeatures.map((f) => `<li class="da-pc"><span aria-hidden="true">✦</span><span>${esc(t(f))}</span></li>`).join('')}</ul>
    </section>
    <section class="da-sync">
      <h3>${esc(t('Shared data across website, PC, and Android'))}</h3>
      <p>${esc(t('Both apps load your Lokizenith account through the same secure backend as the website. If you create an account in the Windows or Android app, it is added to the admin users list on the website, and the other app can sign in with it. Conversations, settings, usage, and LokiCode workspaces stay in sync because they live on the server — not only on one device.'))}</p>
    </section>
    <section class="da-safety">
      <h3>${esc(t('About “unknown app” and safety warnings'))}</h3>
      <p><strong>Windows:</strong> ${esc(t('The installer is published by Lokiz Studios with a proper name, icon, and version info. It is not yet Authenticode-signed, so Windows SmartScreen may show “Windows protected your PC.” Click More info, then Run anyway. A paid Organization Validation (OV) code-signing certificate (typically $150–300/year from DigiCert, Sectigo or similar) or Azure Artifact Signing (formerly Trusted Signing, $9.99/month — currently for organizations in the US, Canada, EU and UK, and individuals in the US and Canada) lets Windows show the publisher name and lets reputation build across versions. EV certificates (about $400+/year) no longer skip SmartScreen on first download. Listing the app in the Microsoft Store is what removes the warning completely. A self-signed certificate does not help.'))}</p>
      <p style="margin-top:10px"><strong>Android:</strong> ${esc(t('Sideloaded APKs always show the system “install unknown apps” prompt unless the app is installed from Google Play. This APK is a signed release build with a stable Lokiz Studios key, current target Android API, and only the permissions the app needs. Play Protect warnings are reduced by that signing, and they go away after the $25 Play Console listing and Play Protect / Play Store review.'))}</p>
    </section>
  `;
}

async function onShow(){
  const root = document.getElementById('downloadAppView');
  if (!root) return;
  if (!root.dataset.ready){
    root.innerHTML = `<div class="da-hero"><h1>${esc(t('Download Lokizenith AI'))}</h1><p>${esc(t('Loading download details…'))}</p></div>`;
  }
  try {
    const manifest = await fetchManifest();
    render(root, manifest);
    root.dataset.ready = '1';
  } catch (err) {
    root.innerHTML = `<div class="da-hero"><h1>${esc(t('Download Lokizenith AI'))}</h1><p>${esc(t('The download catalog could not be loaded. Please try again in a moment.'))}</p></div>`;
  }
}

function applyNativeChrome(){
  const native = detectNative();
  document.body.classList.toggle('lz-native-app', !!native);
  document.body.classList.toggle('lz-native-desktop', !!(native && native.kind === 'desktop'));
  document.body.classList.toggle('lz-native-android', !!(native && native.kind === 'android'));
  if (native && native.kind === 'desktop' && window.LokizenithDesktop){
    const bar = document.querySelector('.composer .attach-row, #composerActions, .prompt-actions, .composer-tools');
    // Offer a local-file button near the existing attach control if missing
    if (!document.getElementById('daNativeFileBtn')){
      const host = document.getElementById('fileInput') && document.getElementById('fileInput').parentElement;
      if (host){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'daNativeFileBtn';
        btn.className = 'icon-btn da-native-file';
        btn.title = t('Open local files (Windows app)');
        btn.textContent = '📂';
        btn.style.display = 'inline-flex';
        btn.onclick = () => { openDesktopFiles(); };
        host.appendChild(btn);
      }
    }
    if (typeof window.LokizenithDesktop.onUpdate === 'function'){
      window.LokizenithDesktop.onUpdate((info) => {
        if (window.App && App.toast) App.toast(t('A new Lokizenith AI app is available: v') + (info && info.version ? info.version : ''), 'ok');
      });
    }
  }
}

function init(){
  applyNativeChrome();
  const btn = document.getElementById('openDownloadApp');
  if (btn && !btn.dataset.bound){
    btn.dataset.bound = '1';
  }
}

window.LZDownloadApp = { onShow, init, detectNative, attachNativeFiles, openDesktopFiles, fetchManifest };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
