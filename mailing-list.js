(function mailingListBootstrap() {
  const state = {
    subscribedThisView: false,
    quizEngaged: false,
    quizIgnored: false,
    quizClosed: false
  };

  function getApiUrl(path) {
    if (typeof window.relvApiUrl === 'function') {
      return window.relvApiUrl(path);
    }

    const base = String(window.RELV_CONFIG?.apiBase || '').replace(/\/$/, '');
    return base ? `${base}${path}` : '';
  }

  function setFeedback(widget, type, message) {
    const feedback = widget.querySelector('[data-mailing-feedback]');
    if (!feedback) return;

    feedback.hidden = false;
    feedback.textContent = message;
    feedback.classList.remove('is-error', 'is-success');
    feedback.classList.add(type === 'success' ? 'is-success' : 'is-error');
  }

  function hideWidget(widget) {
    if (!widget) return;

    widget.hidden = true;
    widget.classList.remove('is-visible');
  }

  function showWidget(widget) {
    if (!widget) return;

    widget.hidden = false;
    widget.classList.add('is-visible');
  }

  function dismissWidget(widget) {
    if (!widget) return;

    widget.dataset.dismissed = 'true';
    hideWidget(widget);
  }

  function dismissAllWidgets() {
    document.querySelectorAll('[data-mailing-widget]').forEach((widget) => {
      dismissWidget(widget);
    });
  }

  function disableControls(form, disabled) {
    form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = disabled;
    });
  }

  function rememberQuizEngagement(widget) {
    if (widget.dataset.mailingWidget !== 'quiz') return;

    state.quizEngaged = true;
    state.quizIgnored = false;
  }

  function ensureCloseButton(widget) {
    if (widget.querySelector('[data-mailing-dismiss]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mailing-widget-close';
    button.setAttribute('data-mailing-dismiss', '');
    button.setAttribute('aria-label', 'Sulge uudiskirja vorm');
    button.textContent = 'Sulge';

    button.addEventListener('click', () => {
      if (widget.dataset.mailingWidget === 'quiz') {
        state.quizClosed = true;
        state.quizIgnored = true;
      }

      dismissWidget(widget);
    });

    widget.prepend(button);
  }

  function updateQuizWidget(answeredCount) {
    const widget = document.querySelector('[data-mailing-widget="quiz"]');
    if (!widget) return;

    if (state.subscribedThisView || state.quizClosed) {
      dismissWidget(widget);
      return;
    }

    if (!state.quizEngaged && answeredCount >= 7) {
      state.quizIgnored = true;
      hideWidget(widget);
      return;
    }

    if (state.quizIgnored && !state.quizEngaged) {
      hideWidget(widget);
      return;
    }

    if (answeredCount >= 5) {
      showWidget(widget);
      return;
    }

    hideWidget(widget);
  }

  function handleSuccess(widget, message) {
    const form = widget.querySelector('[data-mailing-list-form]');

    state.subscribedThisView = true;
    widget.classList.add('is-success');
    setFeedback(widget, 'success', message || 'Aitäh! Oled nüüd meililistis.');

    if (form) {
      disableControls(form, true);
    }

    window.setTimeout(() => {
      dismissAllWidgets();
    }, 1400);
  }

  function initWidget(widget) {
    ensureCloseButton(widget);

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

        handleSuccess(widget, payload.message || 'Aitäh! Oled nüüd meililistis.');
      } catch (error) {
        setFeedback(widget, 'error', error.message || 'Liitumine ebaõnnestus.');
      } finally {
        submitButton.dataset.loading = 'false';

        if (!state.subscribedThisView) {
          submitButton.disabled = false;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const widgets = document.querySelectorAll('[data-mailing-widget]');
    if (widgets.length === 0) return;

    widgets.forEach(initWidget);

    if (document.querySelector('[data-mailing-widget="quiz"]')) {
      updateQuizWidget(Number(window.RELV_QUIZ_ANSWERED_COUNT || 0));
    }
  });

  window.addEventListener('relv:quiz-answered-count', (event) => {
    updateQuizWidget(Number(event.detail?.answered || 0));
  });
})();
