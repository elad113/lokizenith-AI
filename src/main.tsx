import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import './firebase';
import './index.css';
import { GrokBotApp } from './grokbot/GrokBotApp';
import {
  SCOPES,
  initAuth,
  googleSignIn,
  signInWithGoogleAccount,
  getAccessToken,
  getCurrentUser,
  logout,
  listGmailMessages,
  sendGmailMessage,
} from './workspaceAuth';

declare global {
  interface Window {
    LZWorkspaceAuth?: {
      SCOPES: string[];
      initAuth: typeof initAuth;
      googleSignIn: typeof googleSignIn;
      signInWithGoogleAccount: typeof signInWithGoogleAccount;
      getAccessToken: typeof getAccessToken;
      getCurrentUser: typeof getCurrentUser;
      logout: typeof logout;
      listGmailMessages: typeof listGmailMessages;
      sendGmailMessage: typeof sendGmailMessage;
    };
    LokiBot?: {
      onShow: () => void;
      renderMascot: (color?: string, styleId?: string, size?: number) => string;
    };
    __mountGrokBotStudio?: () => void;
  }
}

window.LZWorkspaceAuth = {
  SCOPES,
  initAuth,
  googleSignIn,
  signInWithGoogleAccount,
  getAccessToken,
  getCurrentUser,
  logout,
  listGmailMessages,
  sendGmailMessage,
};

let grokBotRoot: Root | null = null;

function mountGrokBotIntoLokiBotView() {
  const container = document.getElementById('lokibotView');
  if (!container) return;
  try {
    if (!localStorage.getItem('lz.location')) {
      localStorage.setItem('lz.location', JSON.stringify({ choice: 'deny' }));
    }
  } catch (_e) {}
  document.querySelectorAll('.geo-ask, .whatsnew').forEach((el) => el.remove());
  if (!grokBotRoot) {
    container.innerHTML = '';
    grokBotRoot = createRoot(container);
    grokBotRoot.render(
      <React.StrictMode>
        <GrokBotApp />
      </React.StrictMode>
    );
  }
}

window.__mountGrokBotStudio = mountGrokBotIntoLokiBotView;

window.LokiBot = {
  onShow: () => {
    mountGrokBotIntoLokiBotView();
  },
  renderMascot: () => '',
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lokibotView')) mountGrokBotIntoLokiBotView();
  });
} else {
  if (document.getElementById('lokibotView')) mountGrokBotIntoLokiBotView();
}

initAuth();
