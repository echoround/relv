(function siteAuthLazyBootstrap() {
  const AUTH_TOKEN_KEY = 'relv:forum:auth-token';
  const subscribers = new Set();
  let fullAuthPromise = null;
  let bridgedToFullAuth = false;

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

  function readAuthToken() {
    const storage = getStorage();
    if (!storage) return '';

    try {
      return String(storage.getItem(AUTH_TOKEN_KEY) || '');
    } catch (error) {
      return '';
    }
  }

  function getLazySnapshot() {
    return {
      authConfig: {
        googleAuthEnabled: true,
        notificationsEnabled: false,
        googleClientId: '',
        status: readAuthToken() ? 'loading' : 'not-loaded'
      },
      user: null,
      preferences: {
        newsletterSubscribed: false,
        avatarId: ''
      },
      quizStats: {
        answeredCount: 0,
        correctCount: 0,
        partialCount: 0,
        incorrectCount: 0,
        currentCorrectStreak: 0,
        bestCorrectStreak: 0,
        questionProgress: []
      }
    };
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

    updatePlaceholderTriggersFromToken();
  }

  function bridgeSubscribersToFullAuth(fullAuth) {
    if (bridgedToFullAuth || !fullAuth?.subscribe || !fullAuth?.getState) return;
    bridgedToFullAuth = true;

    subscribers.forEach((callback) => {
      try {
        callback(fullAuth.getState());
        fullAuth.subscribe(callback);
      } catch (error) {
        console.error('Site auth lazy subscriber error:', error);
      }
    });
  }

  function loadFullAuth() {
    if (window.RELV_SITE_AUTH && window.RELV_SITE_AUTH !== lazyAuth) {
      return window.RELV_SITE_AUTH.ready?.().then(() => {
        bridgeSubscribersToFullAuth(window.RELV_SITE_AUTH);
        return window.RELV_SITE_AUTH;
      });
    }

    if (!fullAuthPromise) {
      fullAuthPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'site-auth.min.js';
        script.async = true;
        script.addEventListener('load', () => {
          const fullAuth = window.RELV_SITE_AUTH;
          fullAuth?.ready?.()
            .then(() => {
              bridgeSubscribersToFullAuth(fullAuth);
              resolve(fullAuth);
            })
            .catch(reject);
        }, { once: true });
        script.addEventListener('error', () => {
          fullAuthPromise = null;
          reject(new Error('Site auth laadimine ebaonnestus.'));
        }, { once: true });
        document.head.appendChild(script);
      });
    }

    return fullAuthPromise;
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

  const lazyAuth = {
    getState: getLazySnapshot,
    readAuthToken,
    ready: () => loadFullAuth().then((auth) => auth?.getState?.() || getLazySnapshot()),
    setNewsletterSubscribed: (value) => loadFullAuth().then((auth) => auth.setNewsletterSubscribed(value)),
    subscribe
  };

  function bindLazyAuthClicks() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-site-auth-lazy-trigger]');
      if (!trigger) return;

      event.preventDefault();
      event.stopPropagation();

      const isMobileHost = Boolean(trigger.closest('[data-site-auth-mobile]'));
      trigger.disabled = true;
      trigger.classList.add('is-loading');
      trigger.setAttribute('aria-busy', 'true');

      loadFullAuth()
        .then(() => {
          const host = document.querySelector(isMobileHost ? '[data-site-auth-mobile]' : '[data-site-auth]');
          host?.querySelector('[data-site-auth-trigger]')?.click();
        })
        .catch((error) => {
          console.error('Site auth lazy load error:', error);
        })
        .finally(() => {
          trigger.disabled = false;
          trigger.classList.remove('is-loading');
          trigger.setAttribute('aria-busy', 'false');
        });
    });
  }

  window.RELV_SITE_AUTH = lazyAuth;
  activatePlaceholderTriggers();
  bindLazyAuthClicks();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activatePlaceholderTriggers, { once: true });
  }
})();
