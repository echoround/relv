(function siteAuthBootstrap() {
  const AUTH_TOKEN_KEY = 'relv:forum:auth-token';
  const state = {
    authConfig: {
      googleAuthEnabled: false,
      notificationsEnabled: false,
      googleClientId: '',
      status: 'loading'
    },
    user: null
  };
  const subscribers = new Set();
  let googleIdentityPromise = null;
  let googleIdentityInitialized = false;
  let readyPromise = null;
  let booted = false;

  function getStorage() {
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return null;
      }

      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function getApiUrl(path) {
    if (typeof window.relvApiUrl === 'function') {
      return window.relvApiUrl(path);
    }

    const base = String(window.RELV_CONFIG?.apiBase || '').replace(/\/$/, '');
    return base ? `${base}${String(path || '').startsWith('/') ? path : `/${path || ''}`}` : '';
  }

  function readAuthToken() {
    const storage = getStorage();
    if (!storage) return '';

    try {
      return String(storage.getItem(AUTH_TOKEN_KEY) || '');
    } catch (error) {
      return '';
    }
  }

  function writeAuthToken(token) {
    const storage = getStorage();
    if (!storage) return;

    try {
      if (token) {
        storage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        storage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function getAuthHeaders(extraHeaders = {}) {
    const token = readAuthToken();
    return token
      ? {
          ...extraHeaders,
          Authorization: `Bearer ${token}`
        }
      : extraHeaders;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getStateSnapshot() {
    return {
      authConfig: {
        ...state.authConfig
      },
      user: state.user
        ? {
            ...state.user
          }
        : null
    };
  }

  function closeAllPanels() {
    document.querySelectorAll('[data-site-auth-panel]').forEach((panel) => {
      panel.hidden = true;
    });

    document.querySelectorAll('[data-site-auth-trigger]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function notifySubscribers() {
    const snapshot = getStateSnapshot();
    subscribers.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Site auth subscriber error:', error);
      }
    });

    window.dispatchEvent(new CustomEvent('relv-site-auth-change', { detail: snapshot }));
  }

  function subscribe(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }

  async function waitForGoogleIdentity(timeoutMs = 6000) {
    if (googleIdentityPromise) {
      return googleIdentityPromise;
    }

    googleIdentityPromise = (async () => {
      const start = Date.now();

      while (Date.now() - start < timeoutMs) {
        if (window.google?.accounts?.id) {
          return window.google.accounts.id;
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 120);
        });
      }

      return null;
    })().catch((error) => {
      googleIdentityPromise = null;
      throw error;
    });

    return googleIdentityPromise;
  }

  async function signInWithGoogleCredential(credential) {
    const endpoint = getApiUrl('/forum/auth/google');
    if (!endpoint) {
      return;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credential })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.token || !payload.user) {
      throw new Error(payload.error || 'Google sisselogimine ebaõnnestus.');
    }

    writeAuthToken(payload.token);
    state.user = payload.user;
    closeAllPanels();
    renderSiteAuthHosts();
    notifySubscribers();
  }

  async function ensureGoogleButtonReady() {
    if (!state.authConfig.googleAuthEnabled || !state.authConfig.googleClientId) {
      return null;
    }

    const googleIdentity = await waitForGoogleIdentity();
    if (!googleIdentity) {
      return null;
    }

    if (!googleIdentityInitialized) {
      googleIdentity.initialize({
        client_id: state.authConfig.googleClientId,
        callback: (response) => {
          if (response?.credential) {
            signInWithGoogleCredential(response.credential).catch((error) => {
              console.error('Site auth sign-in error:', error);
            });
          }
        }
      });

      googleIdentityInitialized = true;
    }

    return googleIdentity;
  }

  function logout() {
    writeAuthToken('');
    state.user = null;
    closeAllPanels();

    if (window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }

    renderSiteAuthHosts();
    notifySubscribers();
  }

  function bindPanelDismissal() {
    document.addEventListener('click', (event) => {
      const insideAuth = event.target.closest('[data-site-auth-root]');
      if (!insideAuth) {
        closeAllPanels();
      }
    });
  }

  async function renderGoogleButtons() {
    const googleIdentity = await ensureGoogleButtonReady();
    if (!googleIdentity || state.user) {
      return;
    }

    const buttonHosts = [...document.querySelectorAll('[data-site-auth-google-button]')];
    buttonHosts.forEach((host) => {
      host.innerHTML = '';
      googleIdentity.renderButton(host, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        width: Math.min(Math.max(host.clientWidth || 220, 220), 240)
      });
    });
  }

  function renderHost(host) {
    const isSignedIn = Boolean(state.user);
    host.hidden = !state.authConfig.googleAuthEnabled;
    if (host.hidden) {
      host.innerHTML = '';
      return;
    }

    host.innerHTML = `
      <div class="site-auth-root" data-site-auth-root>
        <button type="button" class="site-auth-trigger${isSignedIn ? ' is-connected' : ''}" data-site-auth-trigger aria-expanded="false">
          <span class="site-auth-trigger-label">${isSignedIn ? 'Konto' : 'Logi sisse'}</span>
        </button>
        <div class="site-auth-panel" data-site-auth-panel hidden>
          ${
            isSignedIn
              ? `
                <div class="site-auth-panel-copy">
                  <div class="site-auth-panel-title">Google konto on ühendatud</div>
                  <div class="site-auth-panel-text">${escapeHtml(state.user.name || 'Google')}</div>
                  <div class="site-auth-panel-text site-auth-panel-text--muted">${escapeHtml(state.user.email || '')}</div>
                  <div class="site-auth-panel-note">Foorumis kasutad enda valitud kasutajanime, mitte Google profiili.</div>
                </div>
                <div class="site-auth-panel-actions">
                  <button type="button" class="site-auth-action" data-site-auth-logout>Logi välja</button>
                </div>
              `
              : `
                <div class="site-auth-panel-copy">
                  <div class="site-auth-panel-title">Logi Google kontoga sisse</div>
                  <div class="site-auth-panel-note">Üks konto kogu saidi jaoks. Foorumis jäävad sinu e-post ja Google pilt teiste eest peidetuks.</div>
                </div>
                <div class="site-auth-google-button" data-site-auth-google-button></div>
              `
          }
        </div>
      </div>
    `;

    const trigger = host.querySelector('[data-site-auth-trigger]');
    const panel = host.querySelector('[data-site-auth-panel]');

    trigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = panel.hidden;
      closeAllPanels();
      panel.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    host.querySelector('[data-site-auth-logout]')?.addEventListener('click', () => {
      logout();
    });
  }

  function renderSiteAuthHosts() {
    const hosts = [
      ...document.querySelectorAll('[data-site-auth]'),
      ...document.querySelectorAll('[data-site-auth-mobile]')
    ];

    hosts.forEach(renderHost);
    renderGoogleButtons().catch((error) => {
      console.error('Site auth Google button error:', error);
    });
  }

  async function initSiteAuth() {
    const endpoint = getApiUrl('/forum/auth/config');
    if (!endpoint) {
      renderSiteAuthHosts();
      notifySubscribers();
      return getStateSnapshot();
    }

    try {
      const response = await fetch(endpoint);
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload.ok) {
        state.authConfig = {
          googleAuthEnabled: Boolean(payload.googleAuthEnabled),
          notificationsEnabled: Boolean(payload.notificationsEnabled),
          googleClientId: String(payload.googleClientId || ''),
          status: payload.googleClientId ? 'ready' : 'not-configured'
        };
      } else {
        state.authConfig = {
          googleAuthEnabled: false,
          notificationsEnabled: false,
          googleClientId: '',
          status: 'backend-unavailable'
        };
      }
    } catch (error) {
      state.authConfig = {
        googleAuthEnabled: false,
        notificationsEnabled: false,
        googleClientId: '',
        status: 'backend-unavailable'
      };
    }

    if (!state.authConfig.googleAuthEnabled) {
      writeAuthToken('');
      state.user = null;
      renderSiteAuthHosts();
      notifySubscribers();
      return getStateSnapshot();
    }

    const token = readAuthToken();
    if (token) {
      try {
        const sessionResponse = await fetch(getApiUrl('/forum/auth/session'), {
          headers: getAuthHeaders()
        });
        const sessionPayload = await sessionResponse.json().catch(() => ({}));

        if (sessionResponse.ok && sessionPayload.ok && sessionPayload.user) {
          state.user = sessionPayload.user;
        } else {
          writeAuthToken('');
          state.user = null;
        }
      } catch (error) {
        writeAuthToken('');
        state.user = null;
      }
    } else {
      state.user = null;
    }

    renderSiteAuthHosts();
    notifySubscribers();
    return getStateSnapshot();
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = initSiteAuth();
    }

    return readyPromise;
  }

  window.RELV_SITE_AUTH = {
    getAuthHeaders,
    getState: getStateSnapshot,
    logout,
    readAuthToken,
    ready,
    subscribe
  };

  function boot() {
    if (booted) {
      return;
    }

    booted = true;

    if (!document.querySelector('[data-site-auth], [data-site-auth-mobile]')) {
      return;
    }

    bindPanelDismissal();
    ready().catch((error) => {
      console.error('Site auth init error:', error);
    });
  }

  boot();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
