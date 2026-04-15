(function mailingListBootstrap() {
  const POINTER_CYCLE_MS = 1600;
  const POINTER_CYCLE_GAP_MS = 2000;
  const POINTER_FOLLOWUP_DELAY_MS = 10000;
  const DEFAULT_POINTER_CYCLES = 2;
  const DEFAULT_POINTER_FOLLOWUP_CYCLES = 0;

  const state = {
    subscribedThisView: false,
    quizEngaged: false,
    quizIgnored: false,
    quizClosed: false,
    homeMobileInteracted: false
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

  function getPointer(widget) {
    return widget?.querySelector('[data-mailing-pointer]') || null;
  }

  function clearPointerTimers(pointer) {
    if (!pointer || !Array.isArray(pointer._mailingTimers)) return;

    pointer._mailingTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });

    pointer._mailingTimers = [];
  }

  function hidePointer(widget) {
    const pointer = getPointer(widget);
    if (!pointer) return;

    clearPointerTimers(pointer);
    pointer.classList.remove('is-animating', 'is-visible');
    pointer.hidden = true;
  }

  function queuePointerStep(pointer, delayMs, callback) {
    const timerId = window.setTimeout(callback, delayMs);
    pointer._mailingTimers = pointer._mailingTimers || [];
    pointer._mailingTimers.push(timerId);
  }

  function getPositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function isMobileViewport() {
    return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 720px)').matches;
  }

  function isHomeWidget(widget) {
    return widget?.dataset.mailingWidget === 'home';
  }

  function isMobileHomeWidget(widget) {
    return isHomeWidget(widget) && isMobileViewport();
  }

  function setHomeMobileCollapsed(widget, collapsed) {
    if (!isHomeWidget(widget)) return;

    widget.dataset.mobileCollapsed = collapsed ? 'true' : 'false';
    widget.setAttribute('aria-expanded', String(!collapsed));

    if (collapsed) {
      widget.setAttribute('tabindex', '0');
    } else {
      widget.removeAttribute('tabindex');
    }
  }

  function expandHomeMobileWidget(widget) {
    if (!isMobileHomeWidget(widget)) return;
    if (widget.dataset.mobileCollapsed !== 'true') return;

    setHomeMobileCollapsed(widget, false);
  }

  function bindHomeMobileExpand(widget) {
    if (!isHomeWidget(widget) || widget._homeMobileExpandBound) return;

    widget._homeMobileExpandBound = true;

    widget.addEventListener('click', (event) => {
      if (!isMobileHomeWidget(widget)) return;
      if (widget.dataset.mobileCollapsed !== 'true') return;
      if (event.target.closest('[data-mailing-dismiss]')) return;

      expandHomeMobileWidget(widget);
    });

    widget.addEventListener('keydown', (event) => {
      if (!isMobileHomeWidget(widget)) return;
      if (widget.dataset.mobileCollapsed !== 'true') return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      expandHomeMobileWidget(widget);
    });
  }

  function waitForHomeMobileInteraction(widget) {
    if (!isHomeWidget(widget) || widget._homeMobileInteractionBound || !isMobileViewport()) return;

    widget._homeMobileInteractionBound = true;

    const listeners = [];
    const cleanup = () => {
      listeners.forEach(({ target, type, handler, options }) => {
        target.removeEventListener(type, handler, options);
      });
      widget._homeMobileInteractionBound = false;
    };

    const reveal = () => {
      cleanup();

      if (state.subscribedThisView || widget.dataset.dismissed === 'true') return;

      state.homeMobileInteracted = true;
      setHomeMobileCollapsed(widget, true);
      showWidget(widget);
    };

    const bind = (target, type, handler, options) => {
      listeners.push({ target, type, handler, options });
      target.addEventListener(type, handler, options);
    };

    bind(window, 'scroll', reveal, { passive: true });
    bind(document, 'pointerdown', reveal, { passive: true });
    bind(document, 'keydown', reveal, false);
  }

  function runPointerCycle(pointer) {
    if (!pointer) return;

    pointer.hidden = false;
    pointer.classList.add('is-visible');
    pointer.classList.remove('is-animating');
    void pointer.offsetWidth;
    pointer.classList.add('is-animating');

    queuePointerStep(pointer, POINTER_CYCLE_MS, () => {
      pointer.classList.remove('is-animating');
    });
  }

  function playPointerAnimation(widget) {
    const pointer = widget.querySelector('[data-mailing-pointer]');
    if (!pointer) return;

    if (isMobileViewport()) {
      hidePointer(widget);
      return;
    }

    const baseCycles = getPositiveNumber(widget.dataset.mailingPointerCycles, DEFAULT_POINTER_CYCLES);
    const followupCycles = getPositiveNumber(widget.dataset.mailingPointerFollowupCycles, widget.dataset.mailingWidget === 'quiz' ? 1 : DEFAULT_POINTER_FOLLOWUP_CYCLES);
    const followupDelayMs = getPositiveNumber(widget.dataset.mailingPointerFollowupDelayMs, POINTER_FOLLOWUP_DELAY_MS);
    const repeatDelayMs = getPositiveNumber(widget.dataset.mailingPointerRepeatDelayMs, 0);

    clearPointerTimers(pointer);
    pointer.classList.remove('is-animating', 'is-visible');
    pointer.hidden = true;

    for (let cycleIndex = 0; cycleIndex < baseCycles; cycleIndex += 1) {
      const cycleAt = cycleIndex * (POINTER_CYCLE_MS + POINTER_CYCLE_GAP_MS);
      queuePointerStep(pointer, cycleAt, () => runPointerCycle(pointer));
    }

    const initialHideAt = Math.max(0, (baseCycles - 1) * (POINTER_CYCLE_MS + POINTER_CYCLE_GAP_MS)) + POINTER_CYCLE_MS;
    queuePointerStep(pointer, initialHideAt, () => {
      pointer.classList.remove('is-visible');
      pointer.hidden = true;
    });

    let finalHideAt = initialHideAt;

    if (followupCycles > 0) {
      const followupStartAt = initialHideAt + followupDelayMs;

      for (let cycleIndex = 0; cycleIndex < followupCycles; cycleIndex += 1) {
        const cycleAt = followupStartAt + cycleIndex * (POINTER_CYCLE_MS + POINTER_CYCLE_GAP_MS);
        queuePointerStep(pointer, cycleAt, () => runPointerCycle(pointer));
      }

      finalHideAt = Math.max(0, followupStartAt + (followupCycles - 1) * (POINTER_CYCLE_MS + POINTER_CYCLE_GAP_MS)) + POINTER_CYCLE_MS;
      queuePointerStep(pointer, finalHideAt, () => {
        pointer.classList.remove('is-visible');
        pointer.hidden = true;
      });
    }

    if (repeatDelayMs > 0) {
      const repeatAt = finalHideAt + repeatDelayMs;
      queuePointerStep(pointer, repeatAt, () => {
        if (widget.hidden || widget.dataset.dismissed === 'true' || !widget.classList.contains('is-visible')) return;
        playPointerAnimation(widget);
      });
    }
  }

  function hideWidget(widget) {
    if (!widget) return;

    hidePointer(widget);
    widget.hidden = true;
    widget.classList.remove('is-visible');
  }

  function showWidget(widget) {
    if (!widget) return;

    const wasHidden = widget.hidden || !widget.classList.contains('is-visible');

    if (isMobileHomeWidget(widget)) {
      if (!state.homeMobileInteracted) return;
      if (!widget.dataset.mobileCollapsed) {
        setHomeMobileCollapsed(widget, true);
      }
    }

    widget.hidden = false;
    widget.classList.add('is-visible');

    if (wasHidden) {
      playPointerAnimation(widget);
    }
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

    const isolateDismissInteraction = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    button.addEventListener('pointerdown', isolateDismissInteraction);
    button.addEventListener('touchstart', isolateDismissInteraction, { passive: false });

    button.addEventListener('click', (event) => {
      isolateDismissInteraction(event);

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
    bindHomeMobileExpand(widget);

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

    const homeWidget = document.querySelector('[data-mailing-widget="home"]');
    if (homeWidget) {
      if (isMobileViewport()) {
        setHomeMobileCollapsed(homeWidget, true);
        hideWidget(homeWidget);
        waitForHomeMobileInteraction(homeWidget);
      } else {
        setHomeMobileCollapsed(homeWidget, false);
        window.requestAnimationFrame(() => {
          showWidget(homeWidget);
        });
      }
    }

    if (document.querySelector('[data-mailing-widget="quiz"]')) {
      updateQuizWidget(Number(window.RELV_QUIZ_ANSWERED_COUNT || 0));
    }
  });

  window.addEventListener('relv:quiz-answered-count', (event) => {
    updateQuizWidget(Number(event.detail?.answered || 0));
  });
})();
