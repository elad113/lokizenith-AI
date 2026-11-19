// ============================================================================
// GROK BOT (Cursor + Grok 4.7 Engine) — Bridge to React <GrokBotApp />
// Replaces the legacy LokiBot view completely with the new Grok Bot Studio
// ============================================================================
(function () {
  'use strict';

  // Ensure #lbGrokStudioShell and /api/lokibot/chat integration via React mount
  // Workspace mode support: data-wmode="composer" | Cursor + Grok 4.7
  function activateGrokBotStudio() {
    document.querySelectorAll('.geo-ask, .whatsnew').forEach(function (el) {
      el.remove();
    });
    if (typeof window.__mountGrokBotStudio === 'function') {
      window.__mountGrokBotStudio();
    }
  }

  window.LokiBot = {
    onShow: function () {
      activateGrokBotStudio();
    },
    renderMascot: function () {
      return '';
    },
  };
})();
