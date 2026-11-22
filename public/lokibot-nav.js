/* Show the LokiBot nav button only to signed-in (non-guest) users. */
(function(){
  const btn = document.getElementById('openLokiBot'); if (!btn) return;
  const sync = () => { let tok = ''; try { tok = localStorage.getItem('lz.authToken') || ''; } catch (_) {} btn.hidden = !tok || document.body.classList.contains('lz-guest'); };
  sync();
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('storage', sync);
  setInterval(sync, 3000);
})();
