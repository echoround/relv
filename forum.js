(function forumBootstrap() {
  const state = {
    threads: [],
    activeSlug: '',
    activeThread: null,
    loadingDetail: false
  };

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

  function renderThreadList() {
    const list = document.querySelector('[data-forum-thread-list]');
    if (!list) return;

    if (state.threads.length === 0) {
      list.innerHTML = '<p class="forum-empty">Teemasid veel ei ole. Alusta esimesena.</p>';
      return;
    }

    list.innerHTML = '';

    state.threads.forEach((thread) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'forum-thread-card';
      button.dataset.active = String(thread.slug === state.activeSlug);

      const title = document.createElement('div');
      title.className = 'forum-thread-card-title';
      title.textContent = thread.title;

      const meta = document.createElement('div');
      meta.className = 'forum-thread-card-meta';
      meta.textContent = `${thread.displayName} • ${thread.commentsCount} kommentaari • ${formatDate(thread.lastActivityAt)}`;

      const preview = document.createElement('div');
      preview.className = 'forum-thread-card-preview';
      preview.textContent = excerpt(thread.body);

      button.append(title, meta, preview);
      button.addEventListener('click', () => {
        selectThread(thread.slug);
      });

      list.appendChild(button);
    });
  }

  function renderThreadDetail() {
    const detail = document.querySelector('[data-forum-thread-detail]');
    if (!detail) return;

    if (state.loadingDetail) {
      detail.innerHTML = '<p class="forum-empty">Laen teemat...</p>';
      return;
    }

    if (!state.activeThread) {
      detail.innerHTML = '<p class="forum-empty">Vali vasakult teema või loo uus arutelu.</p>';
      return;
    }

    const thread = state.activeThread;
    detail.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'forum-detail-header';

    const title = document.createElement('h2');
    title.className = 'forum-detail-title';
    title.textContent = thread.title;

    const meta = document.createElement('p');
    meta.className = 'forum-detail-meta';
    meta.textContent = `${thread.displayName} • ${formatDate(thread.createdAt)}`;

    header.append(title, meta);

    const body = document.createElement('div');
    body.className = 'forum-detail-body';
    thread.body.split('\n').filter(Boolean).forEach((paragraphText) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = paragraphText;
      body.appendChild(paragraph);
    });

    const commentsWrap = document.createElement('div');
    commentsWrap.className = 'forum-comments';

    const commentsHeading = document.createElement('h3');
    commentsHeading.className = 'forum-comments-title';
    commentsHeading.textContent = `Kommentaarid (${thread.comments.length})`;
    commentsWrap.appendChild(commentsHeading);

    if (thread.comments.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'forum-empty';
      empty.textContent = 'Kommentaare veel ei ole.';
      commentsWrap.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'forum-comment-list';

      thread.comments.forEach((comment) => {
        const item = document.createElement('article');
        item.className = 'forum-comment';

        const itemMeta = document.createElement('div');
        itemMeta.className = 'forum-comment-meta';
        itemMeta.textContent = `${comment.displayName} • ${formatDate(comment.createdAt)}`;

        const itemBody = document.createElement('p');
        itemBody.className = 'forum-comment-body';
        itemBody.textContent = comment.body;

        item.append(itemMeta, itemBody);
        list.appendChild(item);
      });

      commentsWrap.appendChild(list);
    }

    const form = document.createElement('form');
    form.className = 'forum-comment-form';
    form.innerHTML = `
      <div class="forum-form-head">
        <h3 class="forum-form-title">Lisa kommentaar</h3>
        <p class="forum-form-note">Kui nime ei lisa, kuvatakse sind anonüümsena.</p>
      </div>
      <label class="forum-field">
        <span>Kasutajanimi</span>
        <input type="text" name="displayName" maxlength="40" placeholder="Anonüümne" />
      </label>
      <label class="forum-field">
        <span>Kommentaar</span>
        <textarea name="body" rows="4" maxlength="2500" placeholder="Kirjuta oma kommentaar siia..." required></textarea>
      </label>
      <input class="forum-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" />
      <input class="forum-honeypot" type="text" name="company" tabindex="-1" autocomplete="off" />
      <div class="forum-form-actions">
        <button type="submit" class="btn btn-primary">Saada kommentaar</button>
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
        setStatus('Kommentaar lisatud.', 'success');
        await loadThread(thread.slug, false);
      } catch (error) {
        setStatus(error.message || 'Kommentaari saatmine ebaõnnestus.', 'error');
      } finally {
        submitButton.disabled = false;
      }
    });

    detail.append(header, body, commentsWrap, form);
  }

  async function loadThread(slug, updateHash = true) {
    const endpoint = getApiUrl(`/forum/threads/${encodeURIComponent(slug)}`);
    if (!endpoint) {
      setStatus('Foorum ei ole hetkel saadaval.', 'error');
      return;
    }

    state.loadingDetail = true;
    state.activeSlug = slug;
    renderThreadList();
    renderThreadDetail();

    try {
      const response = await fetch(endpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Teema laadimine ebaõnnestus.');
      }

      state.activeThread = payload.thread;
      if (updateHash) {
        window.location.hash = `#${payload.thread.slug}`;
      }
    } catch (error) {
      state.activeThread = null;
      setStatus(error.message || 'Teema laadimine ebaõnnestus.', 'error');
    } finally {
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

    try {
      const response = await fetch(endpoint);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Teemade laadimine ebaõnnestus.');
      }

      state.threads = payload.threads || [];
      renderThreadList();

      const hashSlug = window.location.hash.replace(/^#/, '').trim();
      const initialSlug = hashSlug || state.threads[0]?.slug || '';

      if (initialSlug) {
        await loadThread(initialSlug, false);
      } else {
        renderThreadDetail();
      }
    } catch (error) {
      setStatus(error.message || 'Teemade laadimine ebaõnnestus.', 'error');
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

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('theme-forum')) return;

    initCreateThreadForm();
    renderThreadDetail();
    loadThreads();

    window.addEventListener('hashchange', () => {
      const slug = window.location.hash.replace(/^#/, '').trim();
      if (slug && slug !== state.activeSlug) {
        loadThread(slug, false);
      }
    });
  });
})();
