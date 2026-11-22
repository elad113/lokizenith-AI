/* Lokizenith AI — Screen share + Computer use (Windows app) and website fallbacks. Made by Lokiz Studios. */
(function(){
'use strict';
const t = (s) => (window.I18N ? I18N.t(s) : s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CU_RE = /(^|\s)@computer(?:[ -]use)?\b/i;
const SCREEN_RE = /(^|\s)@screen\b/i;

function native(){
  try { if (window.LZDownloadApp && LZDownloadApp.detectNative) return LZDownloadApp.detectNative(); } catch(_){}
  const ua = navigator.userAgent || '';
  if (window.LokizenithDesktop || /LokizenithAI-Desktop\//i.test(ua)) return { kind: 'desktop', bridge: window.LokizenithDesktop || null };
  if (/LokizenithAI-Android\//i.test(ua) || window.LokizenithAndroid) return { kind: 'android' };
  return null;
}
const isAndroidApp = () => { const n = native(); return !!(n && n.kind === 'android'); };
const desk = () => window.LokizenithDesktop || null;
const hasAgent = () => !!(desk() && desk().computerUse && desk().screen);
const isDesktopApp = () => { const n = native(); return !!(n && n.kind === 'desktop'); };
function toast(m, k){ if (window.App && App.toast) App.toast(m, k); }

/* ---------- "needs the Windows app" popup ---------- */
let winUrl = 'https://storage.googleapis.com/lokizenith-ai-app-downloads/Lokizenith-AI-Setup-1.1.0.exe';
let winFile = 'Lokizenith-AI-Setup-1.1.0.exe';
let winVer = '1.1.0';
async function loadManifest(){
  try {
    const m = window.LZDownloadApp && LZDownloadApp.fetchManifest ? await LZDownloadApp.fetchManifest() : null;
    const w = m && m.downloads && m.downloads.windows;
    if (w && w.url){ winUrl = w.url; winFile = w.file || winFile; }
    if (m && m.version) winVer = m.version;
  } catch(_){}
}
function popup(kind){
  const old = document.getElementById('lzWinNeed'); if (old) old.remove();
  const outdated = kind === 'outdated';
  const feature = kind === 'screen' ? t('Screen share') : t('Computer use');
  const el = document.createElement('div');
  el.id = 'lzWinNeed';
  el.className = 'lz-winneed';
  el.innerHTML = `
    <div class="lz-winneed-card" role="dialog" aria-modal="true" aria-labelledby="lzWinNeedT">
      <div class="lz-winneed-ico">🖥️</div>
      <h3 id="lzWinNeedT">${outdated ? esc(t('Update the Windows app')) : esc(feature) + ' ' + esc(t('needs the Windows app'))}</h3>
      <p>${outdated
        ? esc(t('Screen share and Computer use need Lokizenith AI for Windows v')) + esc(winVer) + esc(t(' or newer. Download the new installer and run it — your chats and account stay the same.'))
        : esc(t('Screen share and Computer use (Lokizenith controls your PC with its own blue mouse and keyboard) only work in the Lokizenith AI app for Windows. Download it, sign in with the same account, then type @ and pick Computer use.'))}</p>
      <div class="lz-winneed-btns">
        <a class="lz-winneed-dl" href="${esc(winUrl)}" download="${esc(winFile)}">⬇ ${esc(t('Download for Windows'))}</a>
        <button type="button" class="lz-winneed-close">${esc(t('Not now'))}</button>
      </div>
      <small>${esc(t('Windows 10 or 11 · 64-bit'))}</small>
    </div>`;
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.lz-winneed-close')) el.remove(); });
  document.addEventListener('keydown', function onEsc(e){ if (e.key === 'Escape'){ el.remove(); document.removeEventListener('keydown', onEsc); } });
  document.body.appendChild(el);
}
function needApp(kind){
  if (isDesktopApp() && !hasAgent()) popup('outdated');
  else popup(kind);
}

/* ---------- actions ---------- */
async function startShare(){
  if (!hasAgent()){ needApp('screen'); return false; }
  await desk().screen.start();
  toast(t('Screen share on — use the floating bar to ask about your screen. Stop with the button at the top or Ctrl+Alt+S.'), 'ok');
  return true;
}
let card = null;
function chatCard(goal){
  const box = document.getElementById('messages');
  if (!box) return null;
  const c = document.createElement('div');
  c.className = 'lz-cu-card';
  c.innerHTML = `<div class="lz-cu-head"><span class="lz-cu-dot"></span><b>${esc(t('Lokizenith is in control'))}</b><button type="button" class="lz-cu-stop">■ ${esc(t('Stop'))}</button></div>
    <div class="lz-cu-goal">🖱️ ${esc(goal)}</div><ol class="lz-cu-log"></ol><div class="lz-cu-res"></div>`;
  c.querySelector('.lz-cu-stop').onclick = () => desk() && desk().computerUse.stop();
  box.appendChild(c);
  c.scrollIntoView({ block: 'end', behavior: 'smooth' });
  return c;
}
async function startComputerUse(goal, source){
  goal = String(goal || '').trim();
  if (!hasAgent()){ needApp('computer'); return false; }
  if (!goal){ toast(t('Type what Lokizenith should do on your PC after @computer'), 'err'); return false; }
  const st = await desk().computerUse.status().catch(() => ({}));
  if (st && st.running){ await desk().computerUse.say(goal); toast(t('Added to the running task')); return true; }
  card = chatCard(goal);
  const r = await desk().computerUse.start(goal, { source: source || 'chat' });
  if (r && r.ok === false){ toast(r.error || t('Computer use could not start'), 'err'); if (card) card.querySelector('.lz-cu-res').textContent = r.error || ''; }
  return true;
}
function onCuEvent(e){
  if (!card || !e) return;
  const log = card.querySelector('.lz-cu-log');
  if (e.kind === 'step'){
    const li = document.createElement('li'); li.textContent = e.desc + (e.thought ? ' — ' + e.thought.slice(0, 120) : ''); log.appendChild(li);
    while (log.children.length > 40) log.firstChild.remove();
  } else if (e.kind === 'ask'){
    const li = document.createElement('li'); li.textContent = '❓ ' + e.text + ' — ' + t('reply in the floating bar or here with @computer'); log.appendChild(li);
  } else if (e.kind === 'error'){
    const li = document.createElement('li'); li.className = 'err'; li.textContent = '⚠ ' + e.text; log.appendChild(li);
  } else if (e.kind === 'done' || e.kind === 'stopped'){
    card.classList.add('done');
    card.querySelector('.lz-cu-head b').textContent = e.kind === 'stopped' ? t('Stopped') : (e.ok ? t('Done') : t('Finished with a problem'));
    card.querySelector('.lz-cu-res').textContent = e.text || '';
    const s = card.querySelector('.lz-cu-stop'); if (s) s.remove();
    card = null;
  }
}

/* ---------- @ picker entries ---------- */
window.LZPluginExtras = {
  items(){
    if (isAndroidApp()) return []; // not an option in the Android app
    const app = isDesktopApp() && hasAgent();
    return [
      { id: 'computer', alias: 'computer use control mouse pc', name: t('Computer use'), icon: '🖱️', virtual: true, auth: 'none', configured: true,
        description: app ? t('Lokizenith takes control of your PC with its own blue mouse and keyboard') : t('Windows app only — Lokizenith controls your PC'),
        tag: app ? 'Windows' : 'Windows app', onPick(){ if (!hasAgent()){ needApp('computer'); return false; } return true; } },
      { id: 'screen', alias: 'screen share sharing', name: t('Screen share'), icon: '🖥️', virtual: true, auth: 'none', configured: true,
        description: app ? t('Share your screen and ask from a floating bar in any app') : t('Windows app only — the AI sees your screen live'),
        tag: app ? 'Windows' : 'Windows app', onPick(){ startShare(); return false; } },
    ];
  }
};

/* ---------- intercept send of @computer / @screen ---------- */
function promptText(){ const ta = document.getElementById('prompt'); return ta ? ta.value : ''; }
function clearPrompt(){
  const ta = document.getElementById('prompt'); if (!ta) return;
  ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true }));
  if (window.App && App.grow) App.grow(ta);
}
function handleSend(e){
  const text = promptText();
  if (!CU_RE.test(text) && !SCREEN_RE.test(text)) return;
  const menu = document.getElementById('pluginMenu');
  if (menu && !menu.hidden) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (isAndroidApp()) { toast(t('Computer use is only available in the Windows app.'), 'err'); return; }
  if (CU_RE.test(text)){
    const goal = text.replace(CU_RE, ' ').replace(SCREEN_RE, ' ').trim();
    if (!hasAgent()){ needApp('computer'); return; }
    clearPrompt();
    startComputerUse(goal, 'chat');
  } else {
    const q = text.replace(SCREEN_RE, ' ').trim();
    if (!hasAgent()){ needApp('screen'); return; }
    clearPrompt();
    startShare().then((ok) => { if (ok && q) desk().screen.ask(q); });
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  if (!e.target || e.target.id !== 'prompt') return;
  handleSend(e);
}, true);
document.addEventListener('submit', (e) => { if (e.target && e.target.id === 'composer') handleSend(e); }, true);

/* ---------- composer "Share screen" button ---------- */
function addShareButton(){
  if (isAndroidApp() || document.getElementById('lzShareBtn')) return;
  const call = document.getElementById('callBtn');
  if (!call) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'lzShareBtn'; b.className = 'tool-btn lz-share-btn';
  b.title = t('Share screen / Computer use (Windows app)'); b.setAttribute('aria-label', b.title);
  b.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
  b.onclick = async () => {
    if (!hasAgent()) { needApp('screen'); return; }
    const st = await desk().screen.status().catch(() => ({}));
    if (st && st.sharing) { await desk().screen.stop(); b.classList.remove('on'); toast(t('Screen share stopped')); }
    else if (await startShare()) b.classList.add('on');
  };
  call.parentNode.insertBefore(b, call);
}

function boot(){
  loadManifest();
  addShareButton();
  document.body.classList.toggle('lz-has-agent', hasAgent());
  if (hasAgent()){
    desk().computerUse.onEvent(onCuEvent);
    if (desk().call && desk().call.onCommand){
      desk().call.onCommand(async (c) => {
        if (!window.Call && window.LZ && LZ.loadScript){ try { await LZ.loadScript('/call.js'); } catch(_){} }
        if (!window.Call) return;
        if (c && c.cmd === 'start') Call.open();
        else if (c && c.cmd === 'end') Call.end();
        else if (c && c.cmd === 'mute' && Call.toggleMute) Call.toggleMute();
      });
    }
    desk().computerUse.onState((s) => { const b = document.getElementById('lzShareBtn'); if (b) b.classList.toggle('on', !!(s && (s.sharing || s.control))); });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

window.LZDesktopAgent = { startComputerUse, startShare, popup: needApp, hasAgent, isDesktopApp, isAndroidApp };
})();
