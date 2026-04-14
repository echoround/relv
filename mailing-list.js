(function mailingListBootstrap() {
  const SUBSCRIBED_KEY = 'relv-mailing-list-subscribed';
  const QUIZ_IGNORED_KEY = 'relv-mailing-list-quiz-ignored';
  const QUIZ_ENGAGED_KEY = 'relv-mailing-list-quiz-engaged';

  function getApiUrl(path) {
    if (typeof window.relvApiUrl === 'function') {
      return window.relvApiUrl(path);
    }

    const base = String(window.RELV_CONFIG?.apiBase || '').replace(/\/$/, '');
    return base ? `${base}${path}` : '';
  }

  function isSubscribed() {
    return window.localStorage.getItem(SUBSCRIBED_KEY) === 'true';
  }

  function markSubscribed() {
    window.localStorage.setItem(SUBSCRIBED_KEY, 'true');
    window.document.documentElement.dataset.mailingListSubscribed = 'true';
  }

  function setFeedback(widget, type, message) {
    const feedback = widget.querySelector('[data-mailing-feedback]');
    if (!feedback) return;

    feedback.hidden = false;
    feedback.textContent = message;
    feedback.classList.remove('is-error', 'is-success');
    feedback.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }

  function setWidgetSuccess(widget, message) {
    setFeedback(widget, 'success', message);
    widget.classList.add('is-success');

    const form = widget.querySelector('[data-mailing-list-form]');
    if (!form) return;

    form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = true;
    });
  }

  function revealQuizWidget() {
    const widget = document.querySelector('[data-mailing-widget="quiz"]');
    if (!widget) return;

    widget.hidden = false;
    widget.classList.add('is-visible');
  }

  function hideQuizWidget() {
    const widget = document.querySelector('[data-mailing-widget="quiz"]');
    if (!widget) return;

    widget.hidden = true;
    widget.classList.remove('is-visible');
  }

  function updateQuizWidget(answeredCount) {
    const widget = document.querySelector('[data-mailing-widget="quiz"]');
    if (!widget) return;

    if (isSubscribed()) {
      hideQuizWidget();
      return;
    }

    const engaged = window.sessionStorage.getItem(QUIZ_ENGAGED_KEY) === 'true';
    const ignored = window.sessionStorage.getItem(QUIZ_IGNORED_KEY) === 'true';

    if (!engaged && answeredCount >= 7) {
      window.sessionStorage.setItem(QUIZ_IGNORED_KEY, 'true');
      hideQuizWidget();
      return;
    }

    if (ignored && !engaged) {
      hideQuizWidget();
      return;
    }

    if (answeredCount >= 5) {
      revealQuizWidget();
      return;
    }

    hideQuizWidget();
  }

  function rememberQuizEngagement(widget) {
    if (widget.dataset.mailingWidget !== 'quiz') return;
    window.sessionStorage.setItem(QUIZ_ENGAGED_KEY, 'true');
    window.sessionStorage.removeItem(QUIZ_IGNORED_KEY);
  }

  function hydrateSubscribedWidgets() {
    if (!isSubscribed()) return;

    document.querySelectorAll('[data-mailing-widget]').forEach((widget) => {
      setWidgetSuccess(widget, 'Aitäh! Oled meie uudiskirjaga liitunud.');
    });

    hideQuizWidget();
  }

  function initWidget(widget) {
    const form = widget.querySelector('[data-mailing-list-form]');
    if (!form) return;

    const emailInput = form.querySelector('input[name="email"]');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!emailInput || !submitButton) return;

    if (widget.dataset.mailingWidget === 'quiz') {
      form.querySelectorAll('input').forEach((input) => {
        input.addEventListener('focus', () => rememberQuizEngagement(widget));
        input.addEventListener('input', () => rememberQuizEngagement(widget));
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = emailInput.value.trim();
      const honeypot = form.querySelector('input[name="website"]')?.value || '';
      const extraTrap = form.querySelector('input[name="company"]')?.value || '';
      const sourcePage = form.dataset.sourcePage || widget.dataset.mailingWidget || 'unknown';
      const endpoint = getApiUrl('/mailing-list/subscribe');

      rememberQuizEngagement(widget);

      if (!endpoint) {
        setFeedback(widget, 'error', 'Liitumine ei ole hetkel saadaval.');
        return;
      }

      submitButton.disabled = true;
      submitButton.dataset.loading = 'true';
      setFeedback(widget, 'success', 'Liitun...');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            sourcePage,
            website: honeypot,
            company: extraTrap
          })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Liitumine ebaõnnestus.');
        }

        markSubscribed();
        setWidgetSuccess(widget, payload.message || 'Aitäh! Oled nüüd meililistis.');

        if (widget.dataset.mailingWidget === 'quiz') {
          window.setTimeout(() => {
            hideQuizWidget();
          }, 1800);
        }
      } catch (error) {
        setFeedback(widget, 'error', error.message || 'Liitumine ebaõnnestus.');
      } finally {
        submitButton.dataset.loading = 'false';
        if (!widget.classList.contains('is-success')) {
          submitButton.disabled = false;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-mailing-widget]').forEach(initWidget);
    hydrateSubscribedWidgets();

    if (document.querySelector('[data-mailing-widget="quiz"]')) {
      updateQuizWidget(Number(window.RELV_QUIZ_ANSWERED_COUNT || 0));
    }
  });

  window.addEventListener('relv:quiz-answered-count', (event) => {
    updateQuizWidget(Number(event.detail?.answered || 0));
  });
})();
