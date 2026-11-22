/* Lokizenith AI — Plugins (Settings library, @ picker, confirm-to-write). */
(function(){
'use strict';

const DARK_LOGOS = new Set(['github', 'notion', 'wikipedia', 'discord']);
let catalog = [];
let loaded = false;
let menuEl = null;
let menuIdx = 0;
let menuItems = [];
const attached = new Set();

function t(s){ return (window.t ? window.t(s) : s); }
function A(){ return window.App; }
function authHeaders(){
  const h = { 'Content-Type': 'application/json' };
  const tok = localStorage.getItem('lz.authToken');
  if (tok) h['x-lz-token'] = tok;
  return h;
}
function signedIn(){
  try { return !!(localStorage.getItem('lz.authToken') || (window.LZAuth && LZAuth.user && LZAuth.user())); }
  catch(_){ return false; }
}
function toast(msg, kind){ if (A() && A().toast) A().toast(msg, kind); }

function ensureCss(){
  if (document.getElementById('lz-plugins-css')) return;
  const l = document.createElement('link');
  l.id = 'lz-plugins-css';
  l.rel = 'stylesheet';
  l.href = '/plugins.css';
  document.head.appendChild(l);
}

async function loadCatalog(force){
  if (loaded && !force) return catalog;
  try {
    const r = await fetch('/api/plugins/catalog', { headers: authHeaders() });
    const j = await r.json();
    catalog = Array.isArray(j.plugins) ? j.plugins : [];
    loaded = true;
  } catch(_){
    catalog = catalog || [];
  }
  return catalog;
}

function logoClass(id){ return DARK_LOGOS.has(id) ? 'dark' : ''; }

function statusPill(p){
  if (p.auth === 'none') return '<span class="lz-plug-pill on">Ready</span>';
  if (!p.configured) return '<span class="lz-plug-pill setup">Setup needed</span>';
  if (p.connected) return '<span class="lz-plug-pill on">Connected</span>';
  return '<span class="lz-plug-pill off">Not connected</span>';
}

function renderGrid(host){
  if (!host) return;
  host.innerHTML = `
    <h3>🔌 ${t('Plugins')}</h3>
    <p class="lz-plug-intro">${t('Connect real accounts so Lokizenith can act for you. In chat, type')} <kbd>@</kbd> ${t('to pick a connected plugin — then ask it to search mail, list repos, check the weather, and more. Sending email, creating issues, or posting messages always asks you to confirm first.')}</p>
    <div class="lz-plug-grid">
      ${catalog.map(p => `
        <article class="lz-plug-card" data-plugin="${p.id}" style="--plug-color:${p.color}">
          <div class="lz-plug-top">
            <div class="lz-plug-logo ${logoClass(p.id)}"><img src="${p.logo}" alt="${p.name}" class="${logoClass(p.id)}"></div>
            <div class="lz-plug-id"><b>${p.name}</b><small>${p.connected && p.accountLabel ? p.accountLabel : (p.auth === 'none' ? t('No account needed') : '@' + p.id)}</small></div>
            ${statusPill(p)}
          </div>
          <div class="lz-plug-desc">${p.description}</div>
          ${!p.configured && p.setupHint ? `<div class="lz-plug-setup">${p.setupHint}</div>` : ''}
          <div class="lz-plug-actions">
            ${p.auth === 'none' ? '' : (
              !p.configured
                ? `<button type="button" class="lz-plug-btn connect" disabled>${t('Setup needed')}</button>`
                : p.connected
                  ? `<button type="button" class="lz-plug-btn disconnect" data-act="disconnect">${t('Disconnect')}</button>`
                  : `<button type="button" class="lz-plug-btn connect" data-act="connect">${t('Connect')}</button>`
            )}
          </div>
        </article>
      `).join('')}
    </div>
  `;
  host.querySelectorAll('[data-act=connect]').forEach(btn => {
    btn.onclick = () => connectPlugin(btn.closest('[data-plugin]').dataset.plugin, btn);
  });
  host.querySelectorAll('[data-act=disconnect]').forEach(btn => {
    btn.onclick = () => disconnectPlugin(btn.closest('[data-plugin]').dataset.plugin, btn);
  });
}

async function refreshSettings(){
  await loadCatalog(true);
  const host = document.querySelector('#settingsBody [data-xsec="plugins"]');
  if (host) renderGrid(host);
}

function openPopup(url){
  const w = 560, h = 720;
  const left = Math.max(0, (screen.width - w) / 2);
  const top = Math.max(0, (screen.height - h) / 2);
  return window.open(url, 'lz-plugin-oauth', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
}

async function connectPlugin(id, btn){
  if (!signedIn()){
    toast(t('Sign in first to connect plugins.'), 'err');
    return;
  }
  if (btn) { btn.disabled = true; btn.textContent = t('Opening…'); }
  try {
    const origin = location.origin;
    const r = await fetch(`/api/plugins/connect/${encodeURIComponent(id)}?origin=${encodeURIComponent(origin)}`, { headers: authHeaders() });
    const j = await r.json();
    if (!r.ok || !j.url){
      toast(j.message || j.error || t('Could not start the connection.'), 'err');
      return;
    }
    const popup = openPopup(j.url);
    const onMsg = async (ev) => {
      const data = ev.data || {};
      if (data.type !== 'LZ_PLUGIN_AUTH_SUCCESS' && data.type !== 'LZ_PLUGIN_AUTH_ERROR') return;
      if (data.pluginId && data.pluginId !== id) return;
      window.removeEventListener('message', onMsg);
      try { if (popup && !popup.closed) popup.close(); } catch(_){}
      if (data.type === 'LZ_PLUGIN_AUTH_SUCCESS'){
        toast((data.name || id) + ' ' + t('connected') + (data.accountLabel ? ' · ' + data.accountLabel : ''));
        await refreshSettings();
      } else {
        toast(data.error || t('Could not connect the plugin.'), 'err');
      }
    };
    window.addEventListener('message', onMsg);
    const tick = setInterval(async () => {
      if (!popup || popup.closed){
        clearInterval(tick);
        window.removeEventListener('message', onMsg);
        await refreshSettings();
      }
    }, 600);
  } catch(e){
    toast(t('Could not start the connection.'), 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('Connect'); }
  }
}

async function disconnectPlugin(id, btn){
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(`/api/plugins/disconnect/${encodeURIComponent(id)}`, { method: 'POST', headers: authHeaders() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) toast(j.error || t('Could not disconnect.'), 'err');
    else toast(t('Disconnected'));
    await refreshSettings();
  } catch(_){
    toast(t('Could not disconnect.'), 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function ensureMenu(){
  if (menuEl && menuEl.isConnected) return menuEl;
  const wrap = document.querySelector('.composer-wrap');
  menuEl = document.createElement('div');
  menuEl.id = 'pluginMenu';
  menuEl.className = 'plugin-menu';
  menuEl.hidden = true;
  menuEl.setAttribute('role', 'listbox');
  menuEl.setAttribute('aria-label', 'Plugins');
  if (wrap){
    const slash = document.getElementById('slashMenu');
    if (slash) wrap.insertBefore(menuEl, slash);
    else wrap.prepend(menuEl);
  } else {
    document.body.appendChild(menuEl);
  }
  return menuEl;
}

function hideMenu(){
  const m = ensureMenu();
  m.hidden = true;
  menuItems = [];
}

function connectedOrReady(p){
  return p.auth === 'none' || (p.configured && p.connected);
}

function mentionContext(value, caret){
  const left = String(value || '').slice(0, caret);
  const m = left.match(/(^|[\s([{\u201c\u2018])@([A-Za-z0-9_-]*)$/);
  if (!m) return null;
  return { start: left.length - m[2].length - 1, query: m[2].toLowerCase() };
}

function showMenu(items){
  const m = ensureMenu();
  const slash = document.getElementById('slashMenu');
  if (slash) slash.hidden = true;
  menuItems = items;
  if (!items.length){
    m.hidden = true;
    return;
  }
  if (menuIdx >= items.length) menuIdx = 0;
  if (menuIdx < 0) menuIdx = items.length - 1;
  m.innerHTML = `<div class="plugin-menu-head">${t('Plugins — type @ to use a connected account')}</div>
    <div class="plugin-menu-list">
      ${items.map((p, i) => `
        <button type="button" class="plugin-opt${i === menuIdx ? ' active' : ''}" data-id="${p.id}">
          ${p.virtual ? `<span class="plugin-virt-ico">${p.icon || '🖥️'}</span>` : `<img src="${p.logo}" alt="" class="${logoClass(p.id)}">`}
          <span><b>${p.name}</b><small>${p.connected && p.accountLabel ? p.accountLabel : p.description}</small></span>
          <span class="tag ${connectedOrReady(p) ? '' : 'off'}">${p.virtual ? t(p.tag || 'Ready') : connectedOrReady(p) ? (p.auth === 'none' ? t('Ready') : t('Connected')) : (!p.configured ? t('Setup needed') : t('Connect'))}</span>
        </button>
      `).join('')}
    </div>`;
  m.hidden = false;
  m.querySelectorAll('.plugin-opt').forEach(btn => {
    btn.onmouseenter = () => { menuIdx = items.findIndex(p => p.id === btn.dataset.id); };
    btn.onclick = () => pickPlugin(btn.dataset.id);
  });
}

function pickPlugin(id){
  const extra = (menuItems || []).find(x => x.id === id && x.virtual);
  if (extra && typeof extra.onPick === 'function'){
    const ta0 = document.getElementById('prompt');
    hideMenu();
    const ctx0 = ta0 ? mentionContext(ta0.value, ta0.selectionStart || ta0.value.length) : null;
    const insert = extra.onPick();
    if (ta0 && ctx0){
      const caret0 = ta0.selectionStart || ta0.value.length;
      ta0.value = ta0.value.slice(0, ctx0.start) + (insert ? '@' + id + ' ' : '') + ta0.value.slice(caret0);
      ta0.focus();
      const pos0 = insert ? ctx0.start + id.length + 2 : ctx0.start;
      try { ta0.setSelectionRange(pos0, pos0); } catch(_){}
      if (A() && A().grow) A().grow(ta0);
    }
    return;
  }
  const p = catalog.find(x => x.id === id);
  const ta = document.getElementById('prompt');
  if (!ta) return;
  if (p && !connectedOrReady(p)){
    hideMenu();
    if (!p.configured){
      toast(p.name + ' — ' + t('Setup needed. An OAuth app still has to be added on the server.'), 'err');
      return;
    }
    if (A() && A().renderSettings && A().openModal){
      A().openModal('settings');
      // Plugins is an extra tab; open Settings and let the user click Plugins.
      toast(t('Connect') + ' ' + p.name + ' ' + t('in Settings → Plugins first.'));
    }
    connectPlugin(p.id);
    return;
  }
  const caret = ta.selectionStart || ta.value.length;
  const ctx = mentionContext(ta.value, caret);
  if (ctx){
    ta.value = ta.value.slice(0, ctx.start) + '@' + id + ' ' + ta.value.slice(caret);
  } else {
    ta.value = (ta.value ? ta.value + ' ' : '') + '@' + id + ' ';
  }
  attached.add(id);
  hideMenu();
  ta.focus();
  const pos = ta.value.length;
  try { ta.setSelectionRange(pos, pos); } catch(_){}
  if (A() && A().grow) A().grow(ta);
}

function onComposerUpdate(){
  const ta = document.getElementById('prompt');
  if (!ta) return false;
  const ctx = mentionContext(ta.value, ta.selectionStart || ta.value.length);
  if (!ctx){
    if (menuEl && !menuEl.hidden) hideMenu();
    return false;
  }
  const q = ctx.query;
  const extras = (window.LZPluginExtras && typeof window.LZPluginExtras.items === 'function') ? (window.LZPluginExtras.items() || []) : [];
  const items = extras.concat(catalog).filter(p => !q || p.id.includes(q) || p.name.toLowerCase().includes(q) || (p.alias || '').includes(q));
  // Built-in desktop abilities first, then connected plugins
  items.sort((a, b) => (Number(!!b.virtual) - Number(!!a.virtual)) || (Number(connectedOrReady(b)) - Number(connectedOrReady(a))));
  menuIdx = 0;
  showMenu(items);
  return true;
}

function onKeyDown(e){
  if (!menuEl || menuEl.hidden) return;
  if (e.key === 'ArrowDown'){
    e.preventDefault(); e.stopPropagation();
    menuIdx = (menuIdx + 1) % Math.max(1, menuItems.length);
    showMenu(menuItems);
  } else if (e.key === 'ArrowUp'){
    e.preventDefault(); e.stopPropagation();
    menuIdx = (menuIdx - 1 + menuItems.length) % Math.max(1, menuItems.length);
    showMenu(menuItems);
  } else if (e.key === 'Enter' || e.key === 'Tab'){
    if (menuItems[menuIdx]){
      e.preventDefault(); e.stopPropagation();
      pickPlugin(menuItems[menuIdx].id);
    }
  } else if (e.key === 'Escape'){
    e.preventDefault(); e.stopPropagation();
    hideMenu();
  }
}

function attachedForRequest(){
  const ta = document.getElementById('prompt');
  const text = (ta && ta.value) || '';
  const ids = new Set(attached);
  const re = /(^|[\s([{\u201c\u2018])@([A-Za-z][A-Za-z0-9_-]{1,32})/g;
  let m;
  while ((m = re.exec(text))) ids.add(m[2].toLowerCase());
  return [...ids];
}

async function confirmAction(ticket, card){
  const okBtn = card.querySelector('.lpc-ok');
  const noBtn = card.querySelector('.lpc-no');
  if (okBtn) okBtn.disabled = true;
  try {
    const r = await fetch('/api/plugins/execute', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ticket }) });
    const j = await r.json();
    card.classList.add('done');
    if (j.ok){
      const pre = card.querySelector('pre');
      if (pre) pre.textContent = j.summary || t('Done.');
      if (okBtn) okBtn.textContent = t('Done');
      if (noBtn) noBtn.remove();
      toast(j.summary || t('Done'));
    } else {
      if (okBtn) { okBtn.disabled = false; okBtn.textContent = t('Try again'); }
      toast(j.error || t('The action failed.'), 'err');
    }
  } catch(_){
    if (okBtn) okBtn.disabled = false;
    toast(t('The action failed.'), 'err');
  }
}

function hydrateActionBlocks(root){
  if (!root) return;
  const blocks = root.querySelectorAll('pre, code');
  blocks.forEach(node => {
    const text = node.textContent || '';
    const fence = node.parentElement && node.parentElement.tagName === 'PRE' ? node.parentElement : (node.tagName === 'PRE' ? node : null);
    const host = fence || (text.trim().startsWith('{') && text.includes('loki-plugin-action') ? node : null);
    const raw = (fence ? fence.textContent : text) || '';
    if (!/"plugin"\s*:/.test(raw) || !/"ticket"\s*:/.test(raw)) return;
    let data;
    try {
      const json = raw.replace(/^```loki-plugin-action\s*/,'').replace(/```$/,'').trim();
      data = JSON.parse(json);
    } catch(_){ return; }
    if (!data || !data.ticket) return;
    const card = document.createElement('div');
    card.className = 'loki-plugin-card';
    const plug = catalog.find(p => p.id === data.plugin);
    card.innerHTML = `
      <div class="lpc-top">${plug ? `<img src="${plug.logo}" alt="">` : ''}<h4>${t('Confirm')} ${plug ? plug.name : data.plugin} · ${data.action}</h4></div>
      <pre></pre>
      <div class="lpc-btns">
        <button type="button" class="lpc-ok">${t('Confirm and run')}</button>
        <button type="button" class="lpc-no">${t('Cancel')}</button>
      </div>`;
    card.querySelector('pre').textContent = data.preview || data.summary || '';
    card.querySelector('.lpc-ok').onclick = () => confirmAction(data.ticket, card);
    card.querySelector('.lpc-no').onclick = () => { card.classList.add('done'); card.querySelector('.lpc-btns').innerHTML = '<em>' + t('Cancelled') + '</em>'; };
    const replace = fence || node;
    replace.replaceWith(card);
  });
}

function hookEnhance(){
  const app = A();
  if (!app || !app.enhance || app.enhance.__lzPlugins) return;
  const orig = app.enhance.bind(app);
  function wrapped(root, sources, light){
    const out = orig(root, sources, light);
    try { hydrateActionBlocks(root); } catch(_){}
    return out;
  }
  wrapped.__lzPlugins = true;
  app.enhance = wrapped;
}

function hookComposer(){
  const ta = document.getElementById('prompt');
  if (!ta || ta.__lzPlugins) return;
  ta.__lzPlugins = true;
  ta.addEventListener('input', () => { onComposerUpdate(); });
  ta.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', (e) => {
    if (menuEl && !menuEl.hidden && !e.target.closest('#pluginMenu,#prompt')) hideMenu();
  });
  if (ta.placeholder && !/@ for plugins/i.test(ta.placeholder)){
    ta.placeholder = ta.placeholder.replace('… (type / for tools)', '… (type / for tools or @ for plugins)');
  }
  const hint = document.querySelector('.composer-hint');
  if (hint && !hint.dataset.plugHint){
    hint.dataset.plugHint = '1';
    hint.innerHTML = hint.innerHTML.replace('Type <kbd>/</kbd> as the first character to launch any Lab tool', 'Type <kbd>/</kbd> for tools or <kbd>@</kbd> for plugins');
  }
}

function hookSlash(){
  // If app.js exposes no hook, composer listeners already handle @.
}

function registerSettingsSection(){
  const app = A();
  if (!app || !app.registerSettings || app.__lzPluginsRegistered) return;
  app.__lzPluginsRegistered = true;
  app.registerSettings({
    id: 'plugins',
    title: 'Plugins',
    icon: '🔌',
    sub: 'Connect Gmail, GitHub and more',
    async render(sec){
      ensureCss();
      sec.innerHTML = `<h3>🔌 ${t('Plugins')}</h3><p class="lz-plug-intro">${t('Loading plugins…')}</p>`;
      await loadCatalog(true);
      renderGrid(sec);
    }
  });
}

function boot(){
  ensureCss();
  registerSettingsSection();
  hookEnhance();
  hookComposer();
  hookSlash();
  loadCatalog(false);
  if (!A() || !A().registerSettings){
    setTimeout(boot, 40);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.LZPlugins = {
  loadCatalog,
  refreshSettings,
  connectPlugin,
  attachedForRequest,
  onComposerUpdate,
  hydrateActionBlocks,
  catalog: () => catalog
};
})();
