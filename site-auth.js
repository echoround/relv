(function siteAuthBootstrap() {
  const AUTH_TOKEN_KEY = 'relv:forum:auth-token';
  const EMPTY_PREFERENCES = {
    newsletterSubscribed: false,
    avatarId: ''
  };
  const EMPTY_QUIZ_STATS = {
    answeredCount: 0,
    correctCount: 0,
    partialCount: 0,
    incorrectCount: 0,
    currentCorrectStreak: 0,
    bestCorrectStreak: 0,
    lastQuestionId: '',
    lastResultType: '',
    lastAnsweredAt: '',
    questionProgress: []
  };

  const state = {
    authConfig: {
      googleAuthEnabled: false,
      notificationsEnabled: false,
      googleClientId: '',
      status: 'loading'
    },
    user: null,
    preferences: { ...EMPTY_PREFERENCES },
    quizStats: { ...EMPTY_QUIZ_STATS }
  };

  const uiState = {
    newsletterSaving: false,
    newsletterMessage: '',
    newsletterTone: 'muted',
    newsletterMessageTimer: 0,
    avatarSaving: false,
    avatarMessage: '',
    avatarTone: 'muted',
    avatarMessageTimer: 0,
    avatarPickerOpen: false
  };

  const subscribers = new Set();
  let googleIdentityPromise = null;
  let avatarModulePromise = null;
  let googleIdentityInitialized = false;
  let readyPromise = null;
  let booted = false;
  let placeholderBindingsReady = false;

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

  function shouldEagerBoot() {
    if (document.body?.classList?.contains('theme-forum')) {
      return true;
    }

    if (document.body?.classList?.contains('theme-quiz') && readAuthToken()) {
      return true;
    }

    return false;
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

  function normalizePreferences(value) {
    return {
      newsletterSubscribed: Boolean(value?.newsletterSubscribed),
      avatarId: String(value?.avatarId || '').trim().toLowerCase()
    };
  }

  function normalizeQuizStats(value) {
    return {
      answeredCount: Math.max(0, Number(value?.answeredCount) || 0),
      correctCount: Math.max(0, Number(value?.correctCount) || 0),
      partialCount: Math.max(0, Number(value?.partialCount) || 0),
      incorrectCount: Math.max(0, Number(value?.incorrectCount) || 0),
      currentCorrectStreak: Math.max(0, Number(value?.currentCorrectStreak) || 0),
      bestCorrectStreak: Math.max(0, Number(value?.bestCorrectStreak) || 0),
      lastQuestionId: String(value?.lastQuestionId || ''),
      lastResultType: String(value?.lastResultType || ''),
      lastAnsweredAt: String(value?.lastAnsweredAt || ''),
      questionProgress: Array.isArray(value?.questionProgress)
        ? value.questionProgress.map((entry) => ({
            questionId: String(entry?.questionId || ''),
            resultType: String(entry?.resultType || ''),
            attemptCount: Math.max(0, Number(entry?.attemptCount) || 0),
            selectedCorrectCount: Math.max(0, Number(entry?.selectedCorrectCount) || 0),
            missedCorrectCount: Math.max(0, Number(entry?.missedCorrectCount) || 0),
            incorrectSelectedCount: Math.max(0, Number(entry?.incorrectSelectedCount) || 0),
            updatedAt: String(entry?.updatedAt || '')
          }))
        : []
    };
  }

  function applyAccountState(payload = {}) {
    if (Object.prototype.hasOwnProperty.call(payload, 'user')) {
      state.user = payload.user
        ? {
            ...payload.user
          }
        : null;
    }

    if (payload.preferences) {
      state.preferences = normalizePreferences(payload.preferences);
    } else if (!state.user) {
      state.preferences = { ...EMPTY_PREFERENCES };
    }

    if (payload.quizStats) {
      state.quizStats = normalizeQuizStats(payload.quizStats);
    } else if (!state.user) {
      state.quizStats = { ...EMPTY_QUIZ_STATS };
    }
  }

  function clearNewsletterMessageTimer() {
    if (uiState.newsletterMessageTimer) {
      window.clearTimeout(uiState.newsletterMessageTimer);
      uiState.newsletterMessageTimer = 0;
    }
  }

  function clearAvatarMessageTimer() {
    if (uiState.avatarMessageTimer) {
      window.clearTimeout(uiState.avatarMessageTimer);
      uiState.avatarMessageTimer = 0;
    }
  }

  function setNewsletterUiState({ saving = false, message = '', tone = 'muted', autoClearMs = 0 } = {}) {
    clearNewsletterMessageTimer();

    uiState.newsletterSaving = Boolean(saving);
    uiState.newsletterMessage = String(message || '');
    uiState.newsletterTone = String(tone || 'muted');

    if (autoClearMs > 0 && uiState.newsletterMessage) {
      uiState.newsletterMessageTimer = window.setTimeout(() => {
        uiState.newsletterMessage = '';
        uiState.newsletterTone = 'muted';
        updateNewsletterControls();
      }, autoClearMs);
    }
  }

  function setAvatarUiState({ saving = false, message = '', tone = 'muted', autoClearMs = 0 } = {}) {
    clearAvatarMessageTimer();

    uiState.avatarSaving = Boolean(saving);
    uiState.avatarMessage = String(message || '');
    uiState.avatarTone = String(tone || 'muted');

    if (autoClearMs > 0 && uiState.avatarMessage) {
      uiState.avatarMessageTimer = window.setTimeout(() => {
        uiState.avatarMessage = '';
        uiState.avatarTone = 'muted';
        updateAvatarControls();
      }, autoClearMs);
    }
  }

  function resetAccountState() {
    applyAccountState({
      user: null,
      preferences: EMPTY_PREFERENCES,
      quizStats: EMPTY_QUIZ_STATS
    });
    setNewsletterUiState();
    setAvatarUiState({
      saving: false,
      message: '',
      tone: 'muted'
    });
    uiState.avatarPickerOpen = false;
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
        : null,
      preferences: {
        ...state.preferences
      },
      quizStats: {
        ...state.quizStats
      }
    };
  }

  function closeAllPanels() {
    document.querySelectorAll('[data-site-auth-panel]').forEach((panel) => {
      panel.hidden = true;
    });

    document.querySelectorAll('[data-site-auth-trigger]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });

    if (uiState.avatarPickerOpen) {
      uiState.avatarPickerOpen = false;
      updateAvatarControls();
    }
  }

  function updatePlaceholderTriggersFromToken() {
    const hasToken = Boolean(readAuthToken());

    document.querySelectorAll('[data-site-auth-lazy-trigger]').forEach((button) => {
      const label = button.querySelector('.site-auth-trigger-label');
      if (label) {
        label.textContent = hasToken ? 'Konto' : 'Logi sisse';
      }

      button.classList.toggle('is-connected', hasToken);
    });
  }

  function activatePlaceholderTriggers() {
    document.querySelectorAll('.site-auth-trigger--placeholder').forEach((button) => {
      button.classList.remove('site-auth-trigger--placeholder');
      button.dataset.siteAuthLazyTrigger = 'true';
      button.removeAttribute('aria-hidden');
      button.removeAttribute('tabindex');
      button.disabled = false;
    });
  }

  function setTriggerLoading(button, loading) {
    if (!button) return;

    button.classList.toggle('is-loading', Boolean(loading));
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
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

  function updateNewsletterControls() {
    document.querySelectorAll('[data-site-auth-newsletter-toggle]').forEach((input) => {
      input.checked = Boolean(state.preferences.newsletterSubscribed);
      input.disabled = uiState.newsletterSaving;
    });

    document.querySelectorAll('[data-site-auth-newsletter-status]').forEach((statusEl) => {
      const hasMessage = Boolean(uiState.newsletterMessage);
      statusEl.hidden = !hasMessage;
      statusEl.textContent = uiState.newsletterMessage;
      statusEl.dataset.tone = uiState.newsletterTone;
    });
  }

  async function loadAvatarModule() {
    if (!avatarModulePromise) {
      avatarModulePromise = import('./forum-animal-avatars.js').catch((error) => {
        avatarModulePromise = null;
        throw error;
      });
    }

    return avatarModulePromise;
  }

  function getResolvedAvatarId(module) {
    return module.resolveForumAnimalAvatarId(
      state.user?.sub || state.user?.email || 'anon',
      state.preferences.avatarId
    );
  }

  function renderAvatarMarkup(host, module, options = {}) {
    if (!host || !state.user) return;

    const size = Number(options.size || host.dataset.avatarSize) || 52;
    const avatarId = getResolvedAvatarId(module);
    host.innerHTML = module.renderForumAnimalAvatarSvg(state.user.name || 'konto', {
      size,
      seedKey: state.user.sub || state.user.email || state.user.name || 'konto',
      avatarId,
      label: 'konto'
    });
  }

  function updateAvatarControls() {
    const pickerHosts = [...document.querySelectorAll('[data-site-auth-avatar-picker]')];
    const toggleButtons = [...document.querySelectorAll('[data-site-auth-avatar-toggle]')];
    const statusHosts = [...document.querySelectorAll('[data-site-auth-avatar-status]')];

    toggleButtons.forEach((button) => {
      button.disabled = uiState.avatarSaving;
      button.setAttribute('aria-expanded', String(uiState.avatarPickerOpen));
    });

    pickerHosts.forEach((picker) => {
      picker.hidden = !uiState.avatarPickerOpen;
    });

    statusHosts.forEach((statusEl) => {
      const hasMessage = Boolean(uiState.avatarMessage);
      statusEl.hidden = !hasMessage;
      statusEl.textContent = uiState.avatarMessage;
      statusEl.dataset.tone = uiState.avatarTone;
    });

    if (!state.user) {
      document.querySelectorAll('[data-site-auth-avatar-preview], [data-site-auth-avatar-choice-preview]').forEach((host) => {
        host.innerHTML = '';
      });
      document.querySelectorAll('[data-site-auth-avatar-grid]').forEach((grid) => {
        grid.innerHTML = '';
      });
      return;
    }

    loadAvatarModule()
      .then((module) => {
        const resolvedAvatarId = getResolvedAvatarId(module);

        document.querySelectorAll('[data-site-auth-avatar-preview]').forEach((host) => {
          renderAvatarMarkup(host, module, {
            size: Number(host.dataset.avatarSize) || 52
          });
        });

        document.querySelectorAll('[data-site-auth-avatar-grid]').forEach((grid) => {
          if (!uiState.avatarPickerOpen && grid.dataset.avatarHydrated === 'true') {
            return;
          }

          grid.dataset.avatarHydrated = 'true';
          grid.innerHTML = '';

          module.listForumAnimalAvatars().forEach((avatar) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'site-auth-avatar-choice';
            button.dataset.avatarId = avatar.id;
            button.setAttribute('aria-label', `Vali avatar: ${avatar.label}`);
            button.setAttribute('title', avatar.label);
            button.dataset.active = String(avatar.id === resolvedAvatarId);
            button.disabled = uiState.avatarSaving;

            const preview = document.createElement('span');
            preview.className = 'site-auth-avatar-choice-preview';
            preview.dataset.siteAuthAvatarChoicePreview = '';
            preview.dataset.avatarSize = '40';
            preview.innerHTML = module.renderForumAnimalAvatarSvg(state.user.name || avatar.label, {
              size: 40,
              seedKey: state.user.sub || state.user.email || state.user.name || 'konto',
              avatarId: avatar.id,
              label: avatar.label
            });

            button.appendChild(preview);
            button.addEventListener('click', async (event) => {
              event.stopPropagation();
              if (uiState.avatarSaving || avatar.id === resolvedAvatarId) {
                return;
              }

              setAvatarUiState({
                saving: true,
                message: 'Salvestan avatari...',
                tone: 'muted'
              });
              updateAvatarControls();

              try {
                const payload = await saveAccountPreferences({
                  avatarId: avatar.id
                });
                applyAccountState(payload);
                setAvatarUiState({
                  saving: false,
                  message: 'Avatar salvestatud.',
                  tone: 'success',
                  autoClearMs: 1800
                });
                updateAvatarControls();
                notifySubscribers();
              } catch (error) {
                setAvatarUiState({
                  saving: false,
                  message: error.message || 'Avatari salvestamine ebaõnnestus.',
                  tone: 'error'
                });
                updateAvatarControls();
              }
            });

            grid.appendChild(button);
          });
        });
      })
      .catch(() => {
        document.querySelectorAll('[data-site-auth-avatar-preview]').forEach((host) => {
          host.innerHTML = '<span class="site-auth-avatar-fallback"></span>';
        });
      });
  }

  function ingestAccountData(payload, options = {}) {
    const shouldRender = Boolean(options.render);
    const shouldNotify = options.notify !== false;

    applyAccountState(payload);

    if (shouldRender) {
      renderSiteAuthHosts();
    } else {
      updateNewsletterControls();
      updateAvatarControls();
    }

    if (shouldNotify) {
      notifySubscribers();
    }

    return getStateSnapshot();
  }

  async function waitForGoogleIdentity(timeoutMs = 6000) {
    if (googleIdentityPromise) {
      return googleIdentityPromise;
    }

    googleIdentityPromise = (async () => {
      if (!window.google?.accounts?.id) {
        await loadGoogleIdentityScript();
      }

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

  function loadGoogleIdentityScript() {
    if (window.google?.accounts?.id) {
      return Promise.resolve(window.google.accounts.id);
    }

    const existingScript = document.querySelector('script[data-site-auth-google-script]');
    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(window.google?.accounts?.id || null), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google Identity laadimine ebaõnnestus.')), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.siteAuthGoogleScript = 'true';
      script.addEventListener('load', () => resolve(window.google?.accounts?.id || null), { once: true });
      script.addEventListener('error', () => reject(new Error('Google Identity laadimine ebaõnnestus.')), { once: true });
      document.head.appendChild(script);
    });
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
    setNewsletterUiState();
    closeAllPanels();
    ingestAccountData(payload, { render: true });
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

  async function saveAccountPreferences(updates) {
    const endpoint = getApiUrl('/forum/auth/preferences');
    if (!endpoint) {
      throw new Error('Eelistuste teenus ei ole praegu saadaval.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(updates || {})
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      logout();
      throw new Error('Sessioon aegus. Logi uuesti sisse.');
    }

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Salvestamine ebaõnnestus.');
    }

    return payload;
  }

  function logout() {
    writeAuthToken('');
    resetAccountState();
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

  function openRenderedPanel(isMobileHost) {
    const host = isMobileHost
      ? document.querySelector('[data-site-auth-mobile]')
      : document.querySelector('[data-site-auth]');

    const trigger = host?.querySelector('[data-site-auth-trigger]');
    const panel = host?.querySelector('[data-site-auth-panel]');
    if (!trigger || !panel) return;

    closeAllPanels();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }

  function bindLazyPlaceholderTriggers() {
    if (placeholderBindingsReady) return;
    placeholderBindingsReady = true;

    document.addEventListener('click', (event) => {
      const placeholderTrigger = event.target.closest('[data-site-auth-lazy-trigger]');
      if (!placeholderTrigger) return;

      event.preventDefault();
      event.stopPropagation();

      const isMobileHost = Boolean(placeholderTrigger.closest('[data-site-auth-mobile]'));
      placeholderTrigger.disabled = true;
      setTriggerLoading(placeholderTrigger, true);

      ready()
        .then(() => {
          openRenderedPanel(isMobileHost);
        })
        .catch((error) => {
          console.error('Site auth lazy init error:', error);
        })
        .finally(() => {
          setTriggerLoading(placeholderTrigger, false);
          placeholderTrigger.disabled = false;
        });
    });
  }

  function bindSignedInControls(host) {
    host.querySelector('[data-site-auth-logout]')?.addEventListener('click', () => {
      logout();
    });

    host.querySelector('[data-site-auth-avatar-toggle]')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      uiState.avatarPickerOpen = !uiState.avatarPickerOpen;
      updateAvatarControls();

      if (uiState.avatarPickerOpen) {
        window.requestAnimationFrame(() => {
          host.querySelector('[data-site-auth-avatar-picker]')?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        });
      }
    });

    const newsletterToggle = host.querySelector('[data-site-auth-newsletter-toggle]');
    if (!newsletterToggle) return;

    newsletterToggle.addEventListener('change', async () => {
      const nextValue = newsletterToggle.checked;

      setNewsletterUiState({
        saving: true,
        message: 'Salvestan...',
        tone: 'muted'
      });
      updateNewsletterControls();

      try {
        const payload = await saveAccountPreferences({
          newsletterSubscribed: nextValue
        });
        applyAccountState(payload);
        setNewsletterUiState({
          saving: false,
          message: nextValue ? 'Uudiskiri on sisse lülitatud.' : 'Uudiskiri on välja lülitatud.',
          tone: 'success',
          autoClearMs: 1800
        });
        updateNewsletterControls();
        notifySubscribers();
      } catch (error) {
        newsletterToggle.checked = !nextValue;
        setNewsletterUiState({
          saving: false,
          message: error.message || 'Salvestamine ebaõnnestus.',
          tone: 'error'
        });
        updateNewsletterControls();
      }
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
                  <div class="site-auth-panel-note">Foorumis kasutad enda valitud kasutajanime. Google profiili ja e-posti me teistele ei näita.</div>
                </div>
                <div class="site-auth-avatar-wrap">
                  <button type="button" class="site-auth-avatar-toggle" data-site-auth-avatar-toggle aria-expanded="${uiState.avatarPickerOpen ? 'true' : 'false'}" aria-label="Vali avatar">
                    <span class="site-auth-avatar-preview" data-site-auth-avatar-preview data-avatar-size="54" aria-hidden="true"></span>
                  </button>
                  <div class="site-auth-avatar-picker" data-site-auth-avatar-picker ${uiState.avatarPickerOpen ? '' : 'hidden'}>
                    <div class="site-auth-avatar-grid" data-site-auth-avatar-grid></div>
                    <div class="site-auth-avatar-status" data-site-auth-avatar-status hidden></div>
                  </div>
                </div>
                <div class="site-auth-consent-wrap">
                  <label class="site-auth-consent">
                    <input type="checkbox" class="site-auth-consent-checkbox" data-site-auth-newsletter-toggle ${state.preferences.newsletterSubscribed ? 'checked' : ''}>
                    <span class="site-auth-consent-copy">
                      <span class="site-auth-consent-title">Saada mulle ka uudiskiri</span>
                      <span class="site-auth-consent-note">Valikuline. Kasutame sinu Google e-posti ainult siis, kui selle lubad.</span>
                    </span>
                  </label>
                  <div class="site-auth-consent-status" data-site-auth-newsletter-status hidden></div>
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

    if (isSignedIn) {
      bindSignedInControls(host);
    }
  }

  function renderSiteAuthHosts() {
    const hosts = [
      ...document.querySelectorAll('[data-site-auth]'),
      ...document.querySelectorAll('[data-site-auth-mobile]')
    ];

    hosts.forEach(renderHost);
    updateNewsletterControls();
    updateAvatarControls();
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
      resetAccountState();
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
          applyAccountState(sessionPayload);
        } else {
          writeAuthToken('');
          resetAccountState();
        }
      } catch (error) {
        writeAuthToken('');
        resetAccountState();
      }
    } else {
      resetAccountState();
    }

    renderSiteAuthHosts();
    notifySubscribers();
    return getStateSnapshot();
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = initSiteAuth();
    }

    return readyPromise.then(() => getStateSnapshot());
  }

  window.RELV_SITE_AUTH = {
    getAuthHeaders,
    getState: getStateSnapshot,
    ingestAccountData,
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
    activatePlaceholderTriggers();
    bindLazyPlaceholderTriggers();
    updatePlaceholderTriggersFromToken();

    if (shouldEagerBoot()) {
      ready().catch((error) => {
        console.error('Site auth init error:', error);
      });
    }
  }

  boot();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  }
})();
