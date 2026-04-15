(function forumBootstrap() {
  const state = {
    threads: [],
    activeSlug: '',
    activeThread: null,
    threadRequestId: 0,
    loadingThreads: false,
    loadingDetail: false,
    detailExpanded: false,
    commentFormOpen: false,
    replyTargetId: ''
  };

  function getLoadingMarkup(message) {
    return `
      <div class="forum-loading" role="status" aria-live="polite">
        <span class="forum-loading-spinner" aria-hidden="true"></span>
        <span class="forum-loading-label">${message}</span>
      </div>
    `;
  }

  function getApiUrl(path) {
    if (typeof window.relvApiUrl === 'function') {
      return window.relvApiUrl(path);
    }

    const base = String(window.RELV_CONFIG?.apiBase || '').replace(/\/$/, '');
    return base ? `${base}${path}` : '';
  }

  function formatDate(value) {
    if (!value) return '';

    try {
      return new Intl.DateTimeFormat('et-EE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  }

  function excerpt(value, max = 180) {
    const plain = String(value || '').replace(/\s+/g, ' ').trim();
    if (plain.length <= max) return plain;
    return `${plain.slice(0, max).trim()}...`;
  }

  function setStatus(message, type = 'info') {
    const element = document.querySelector('[data-forum-status]');
    if (!element) return;

    element.hidden = false;
    element.textContent = message;
    element.classList.remove('is-error', 'is-success');

    if (type === 'error') element.classList.add('is-error');
    if (type === 'success') element.classList.add('is-success');
  }

  function clearStatus() {
    const element = document.querySelector('[data-forum-status]');
    if (!element) return;

    element.hidden = true;
    element.textContent = '';
    element.classList.remove('is-error', 'is-success');
  }

  function setDetailExpanded(expanded) {
    state.detailExpanded = Boolean(expanded);

    if (!state.detailExpanded) {
      state.commentFormOpen = false;
      state.replyTargetId = '';
    }
  }

  function clearThreadSelection(updateHash = true) {
    state.threadRequestId += 1;
    state.activeSlug = '';
    state.activeThread = null;
    state.loadingDetail = false;
    setDetailExpanded(false);

    if (updateHash && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    renderThreadList();
    renderThreadDetail();
  }

  function toggleCommentComposer(parentCommentId = '') {
    const targetId = String(parentCommentId || '');
    const shouldClose = state.commentFormOpen && state.replyTargetId === targetId;

    setDetailExpanded(true);
    state.commentFormOpen = !shouldClose;
    state.replyTargetId = shouldClose ? '' : targetId;
    renderThreadDetail();

    if (!shouldClose) {
      requestAnimationFrame(() => {
        document.querySelector('[data-forum-comment-body]')?.focus();
      });
    }
  }

  function appendMultilineContent(container, paragraphClassName, value) {
    const paragraphs = String(value || '')
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const lines = paragraphs.length ? paragraphs : [String(value || '').trim()].filter(Boolean);

    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.className = paragraphClassName;
      paragraph.textContent = line;
      container.appendChild(paragraph);
    });
  }

  function createCommentForm(thread, parentComment = null) {
    const wrapper = document.createElement('div');
    wrapper.className = parentComment ? 'forum-comment-reply-wrap' : 'forum-comment-form-wrap';

    const form = document.createElement('form');
    form.className = 'forum-comment-form';
    form.innerHTML = `
      <div class="forum-form-head">
        <h3 class="forum-form-title">${parentComment ? 'Vasta kommentaarile' : 'Lisa kommentaar'}</h3>
        <p class="forum-form-note">${
          parentComment
            ? `Vastus lisatakse kasutajale ${parentComment.displayName}.`
            : 'Kui nime ei lisa, kuvatakse sind anonüümsena.'
        }</p>
      </div>
      <label class="forum-field">
        <span>Kasutajanimi</span>
        <input type="text" name="displayName" maxlength="40" placeholder="Anonüümne" />
      </label>
      <label class="forum-field">
        <span>${parentComment ? 'Vastus' : 'Kommentaar'}</span>
        <textarea name="body" rows="4" maxlength="2500" placeholder="${
          parentComment ? 'Kirjuta vastus siia...' : 'Kirjuta oma kommentaar siia...'
        }" required data-forum-comment-body></textarea>
      </label>
      <input class="forum-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" />
      <input class="forum-honeypot" type="text" name="company" tabindex="-1" autocomplete="off" />
      <div class="forum-form-actions">
        <button type="submit" class="btn btn-primary">${parentComment ? 'Saada vastus' : 'Saada kommentaar'}</button>
      </div>
    `;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearStatus();

      const endpoint = getApiUrl('/forum/comments');
      if (!endpoint) {
        setStatus('Foorum ei ole hetkel saadaval.', 'error');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      try {
        const formData = new FormData(form);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            threadSlug: thread.slug,
            parentCommentId: parentComment?.id || '',
            displayName: formData.get('displayName'),
            body: formData.get('body'),
            website: formData.get('website'),
            company: formData.get('company')
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Kommentaari saatmine ebaõnnestus.');
        }

        form.reset();
        setStatus(parentComment ? 'Vastus lisatud.' : 'Kommentaar lisatud.', 'success');
        setDetailExpanded(true);
        state.commentFormOpen = false;
        state.replyTargetId = '';
        await loadThread(thread.slug, false, true);
      } catch (error) {
        setStatus(error.message || 'Kommentaari saatmine ebaõnnestus.', 'error');
      } finally {
        submitButton.disabled = false;
      }
    });

    wrapper.appendChild(form);
    return wrapper;
  }

  function renderCommentNode(thread, comment) {
    const item = document.createElement('article');
    item.className = 'forum-comment';

    const itemMeta = document.createElement('div');
    itemMeta.className = 'forum-comment-meta';
    itemMeta.textContent = `${comment.displayName} • ${formatDate(comment.createdAt)}`;

    const itemBody = document.createElement('div');
    itemBody.className = 'forum-comment-body';
    appendMultilineContent(itemBody, 'forum-comment-body-paragraph', comment.body);

    const itemActions = document.createElement('div');
    itemActions.className = 'forum-comment-actions';

    const replyButton = document.createElement('button');
    replyButton.type = 'button';
    replyButton.className = 'forum-inline-action';
    replyButton.setAttribute('aria-expanded', String(state.commentFormOpen && state.replyTargetId === comment.id));
    replyButton.textContent = state.commentFormOpen && state.replyTargetId === comment.id ? 'Sulge vastus' : 'Vasta';
    replyButton.addEventListener('click', () => {
      toggleCommentComposer(comment.id);
    });

    itemActions.appendChild(replyButton);
    item.append(itemMeta, itemBody, itemActions);

    if (state.commentFormOpen && state.replyTargetId === comment.id) {
      item.appendChild(createCommentForm(thread, comment));
    }

    if (Array.isArray(comment.replies) && comment.replies.length > 0) {
      const children = document.createElement('div');
      children.className = 'forum-comment-children';

      comment.replies.forEach((reply) => {
        children.appendChild(renderCommentNode(thread, reply));
      });

      item.appendChild(children);
    }

    return item;
  }

  function renderThreadList() {
    const list = document.querySelector('[data-forum-thread-list]');
    if (!list) return;

    if (state.loadingThreads) {
      list.innerHTML = getLoadingMarkup('Laen teemasid...');
      return;
    }

    if (state.threads.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = '';

    state.threads.forEach((thread) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'forum-thread-card';
      button.dataset.active = String(thread.slug === state.activeSlug);

      const title = document.createElement('span');
      title.className = 'forum-thread-card-title';
      title.textContent = thread.title;

      const meta = document.createElement('span');
      meta.className = 'forum-thread-card-meta';
      meta.textContent = `${thread.displayName} • ${thread.commentsCount} kommentaari • ${formatDate(thread.lastActivityAt)}`;

      const preview = document.createElement('span');
      preview.className = 'forum-thread-card-preview';
      preview.textContent = excerpt(thread.body);

      button.append(title, meta, preview);
      button.addEventListener('click', () => {
        if (thread.slug === state.activeSlug && (state.activeThread || state.loadingDetail)) {
          clearThreadSelection();
          return;
        }

        selectThread(thread.slug);
      });

      list.appendChild(button);
    });
  }

  function renderThreadDetail() {
    const detail = document.querySelector('[data-forum-thread-detail]');
    if (!detail) return;

    const panel = detail.closest('.forum-panel');
    const showPanel = state.loadingDetail || Boolean(state.activeThread);

    if (panel) {
      panel.hidden = !showPanel;
    }

    if (!showPanel) {
      detail.innerHTML = '';
      return;
    }

    if (state.loadingDetail) {
      detail.innerHTML = getLoadingMarkup('Laen teemat...');
      return;
    }

    if (!state.activeThread) {
      detail.innerHTML = '';
      return;
    }

    const thread = state.activeThread;
    detail.innerHTML = '';

    const shell = document.createElement('section');
    shell.className = 'forum-detail-shell';

    const header = document.createElement('div');
    header.className = 'forum-detail-toggle';

    const title = document.createElement('h2');
    title.className = 'forum-detail-title';
    title.textContent = thread.title;

    const meta = document.createElement('p');
    meta.className = 'forum-detail-meta';
    meta.textContent = `${thread.displayName} • ${formatDate(thread.createdAt)} • ${thread.commentsCount} kommentaari`;

    header.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'forum-detail-actions';

    const commentToggle = document.createElement('button');
    commentToggle.type = 'button';
    commentToggle.className = 'forum-inline-action forum-inline-action--accent';
    commentToggle.setAttribute('aria-expanded', String(state.commentFormOpen && !state.replyTargetId));
    commentToggle.textContent = state.commentFormOpen && !state.replyTargetId ? 'Sulge kommentaar' : 'Kommenteeri';
    commentToggle.addEventListener('click', () => {
      toggleCommentComposer('');
    });

    actions.appendChild(commentToggle);

    const detailPanel = document.createElement('div');
    detailPanel.className = 'forum-detail-panel';

    const body = document.createElement('div');
    body.className = 'forum-detail-body';
    appendMultilineContent(body, 'forum-detail-body-paragraph', thread.body);

    detailPanel.appendChild(body);

    if (state.commentFormOpen && !state.replyTargetId) {
      detailPanel.appendChild(createCommentForm(thread));
    }

    const commentsWrap = document.createElement('div');
    commentsWrap.className = 'forum-comments';

    const commentsHeading = document.createElement('h3');
    commentsHeading.className = 'forum-comments-title';
    commentsHeading.textContent = `Kommentaarid (${thread.commentsCount})`;
    commentsWrap.appendChild(commentsHeading);

    if (thread.commentsCount === 0) {
      const empty = document.createElement('p');
      empty.className = 'forum-empty';
      empty.textContent = 'Kommentaare veel ei ole.';
      commentsWrap.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'forum-comment-list';

      thread.comments.forEach((comment) => {
        list.appendChild(renderCommentNode(thread, comment));
      });

      commentsWrap.appendChild(list);
    }

    detailPanel.appendChild(commentsWrap);
    shell.append(header, actions, detailPanel);
    detail.appendChild(shell);
  }

  async function loadThread(slug, updateHash = true, preserveUi = false) {
    if (!slug) {
      clearThreadSelection(updateHash);
      return;
    }

    const endpoint = getApiUrl(`/forum/threads/${encodeURIComponent(slug)}`);
    if (!endpoint) {
      setStatus('Foorum ei ole hetkel saadaval.', 'error');
      return;
    }

    const requestId = ++state.threadRequestId;

    if (!preserveUi) {
      state.commentFormOpen = false;
      state.replyTargetId = '';
    }

    setDetailExpanded(true);
    state.loadingDetail = true;
    state.activeSlug = slug;
    state.activeThread = null;
    renderThreadList();
    renderThreadDetail();

    try {
      const response = await fetch(endpoint);
      const payload = await response.json().catch(() => ({}));

      if (requestId !== state.threadRequestId) return;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Teema laadimine ebaõnnestus.');
      }

      state.activeThread = payload.thread;
      setDetailExpanded(true);

      if (updateHash) {
        window.location.hash = `#${payload.thread.slug}`;
      }
    } catch (error) {
      if (requestId !== state.threadRequestId) return;

      state.activeSlug = '';
      state.activeThread = null;
      setStatus(error.message || 'Teema laadimine ebaõnnestus.', 'error');
    } finally {
      if (requestId !== state.threadRequestId) return;

      state.loadingDetail = false;
      renderThreadList();
      renderThreadDetail();
    }
  }

  function selectThread(slug) {
    clearStatus();
    loadThread(slug, true);
  }

  async function loadThreads() {
    const endpoint = getApiUrl('/forum/threads');
    if (!endpoint) {
      setStatus('Foorum ei ole hetkel saadaval.', 'error');
      return;
    }

    state.loadingThreads = true;
    renderThreadList();
    renderThreadDetail();

    try {
      const response = await fetch(endpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Teemade laadimine ebaõnnestus.');
      }

      state.threads = payload.threads || [];
      const hashSlug = window.location.hash.replace(/^#/, '').trim();

      if (hashSlug) {
        await loadThread(hashSlug, false);
      } else {
        clearThreadSelection(false);
      }
    } catch (error) {
      setStatus(error.message || 'Teemade laadimine ebaõnnestus.', 'error');
    } finally {
      state.loadingThreads = false;
      renderThreadList();
      renderThreadDetail();
    }
  }

  function initCreateThreadForm() {
    const form = document.querySelector('[data-forum-create-form]');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearStatus();

      const endpoint = getApiUrl('/forum/threads');
      if (!endpoint) {
        setStatus('Foorum ei ole hetkel saadaval.', 'error');
        return;
      }

      const formData = new FormData(form);
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: formData.get('title'),
            displayName: formData.get('displayName'),
            body: formData.get('body'),
            website: formData.get('website'),
            company: formData.get('company')
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Teema loomine ebaõnnestus.');
        }

        form.reset();
        setStatus('Uus teema lisatud.', 'success');
        await loadThreads();
        await loadThread(payload.thread.slug, true);
      } catch (error) {
        setStatus(error.message || 'Teema loomine ebaõnnestus.', 'error');
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  function initThreadDismiss() {
    const page = document.querySelector('.forum-page');
    if (!page) return;

    page.addEventListener('click', (event) => {
      if (!state.activeSlug && !state.loadingDetail) return;
      if (event.target.closest('.forum-thread-card')) return;
      if (event.target.closest('[data-forum-thread-detail]')) return;
      if (event.target.closest('.forum-panel--form')) return;

      clearStatus();
      clearThreadSelection();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('theme-forum')) return;

    initCreateThreadForm();
    initThreadDismiss();
    renderThreadDetail();
    loadThreads();

    window.addEventListener('hashchange', () => {
      const slug = window.location.hash.replace(/^#/, '').trim();

      if (!slug) {
        clearThreadSelection(false);
        return;
      }

      if (slug !== state.activeSlug) {
        loadThread(slug, false);
      }
    });
  });
})();
