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
    replyTargetId: '',
    authConfig: {
      googleAuthEnabled: false,
      notificationsEnabled: false,
      googleClientId: '',
      status: 'loading'
    },
    authUser: null
  };

  const FORUM_AUTHOR_PALETTE = [
    '#9fd8ff', '#ffd29a', '#baf59a', '#ffb7df', '#c8bcff', '#9ef2d5',
    '#ffd8b2', '#f7ee9e', '#8fd0ff', '#ffc3b6', '#c8ffb1', '#f6c2ff',
    '#a8f4ff', '#e0c0ff', '#ffe59d', '#b4f5c6', '#ffb1c9', '#b6cbff',
    '#ffd3f6', '#a9ffd9', '#ffd0a6', '#d5f6a3', '#c4d7ff', '#ffcaeb',
    '#9ce6ff', '#ffe0b8', '#c6f0ff', '#e7d2ff', '#c9ffbe', '#ffc8a0'
  ];

  const shuffledAuthorPalette = [...FORUM_AUTHOR_PALETTE];
  for (let index = shuffledAuthorPalette.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledAuthorPalette[index], shuffledAuthorPalette[randomIndex]] = [
      shuffledAuthorPalette[randomIndex],
      shuffledAuthorPalette[index]
    ];
  }

  const authorColorByName = new Map();
  const FORUM_DRAFT_KEY_PREFIX = 'relv:forum:draft';
  const FORUM_AUTH_TOKEN_KEY = 'relv:forum:auth-token';
  const FORUM_USERNAME_KEY = 'relv:forum:display-name';
  let avatarModulePromise = null;

  function getDraftStorage() {
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        return null;
      }

      return window.localStorage;
    } catch (error) {
      return null;
    }
  }

  function readPreferredDisplayName() {
    const storage = getDraftStorage();
    if (!storage) return '';

    try {
      return normalizeDisplayName(storage.getItem(FORUM_USERNAME_KEY) || '');
    } catch (error) {
      return '';
    }
  }

  function writePreferredDisplayName(value) {
    const storage = getDraftStorage();
    if (!storage) return;

    try {
      const normalized = normalizeDisplayName(value);
      if (!normalized || isAnonymousDisplayName(normalized)) {
        return;
      }

      storage.setItem(FORUM_USERNAME_KEY, normalized);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function buildDraftKey(scope, suffix = '') {
    return [FORUM_DRAFT_KEY_PREFIX, scope, suffix].filter(Boolean).join(':');
  }

  function getThreadDraftKey() {
    return buildDraftKey('thread');
  }

  function getCommentDraftKey(threadSlug, parentCommentId = '') {
    return buildDraftKey('comment', `${String(threadSlug || 'thread')}:${String(parentCommentId || 'root')}`);
  }

  function readDraft(key) {
    const storage = getDraftStorage();
    if (!storage || !key) return null;

    try {
      const raw = storage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeDraft(key, draft) {
    const storage = getDraftStorage();
    if (!storage || !key) return;

    const snapshot = {};
    let hasContent = false;

    Object.entries(draft || {}).forEach(([field, value]) => {
      const safeValue = typeof value === 'string' ? value : '';
      snapshot[field] = safeValue;

      if (safeValue.trim()) {
        hasContent = true;
      }
    });

    try {
      if (!hasContent) {
        storage.removeItem(key);
        return;
      }

      storage.setItem(key, JSON.stringify(snapshot));
    } catch (error) {
      // Ignore storage failures in privacy mode or when quota is full.
    }
  }

  function clearDraft(key) {
    const storage = getDraftStorage();
    if (!storage || !key) return;

    try {
      storage.removeItem(key);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function syncFormDraft(form, draftKey, fieldNames) {
    const snapshot = {};

    fieldNames.forEach((fieldName) => {
      const field = form.elements.namedItem(fieldName);
      if (!field) {
        snapshot[fieldName] = '';
        return;
      }

      if (field.type === 'checkbox') {
        snapshot[fieldName] = field.checked ? 'true' : '';
        return;
      }

      snapshot[fieldName] = typeof field.value === 'string' ? field.value : '';
    });

    writeDraft(draftKey, snapshot);
  }

  function bindFormDraftPersistence(form, draftKey, fieldNames) {
    const savedDraft = readDraft(draftKey);

    if (savedDraft) {
      fieldNames.forEach((fieldName) => {
        const field = form.elements.namedItem(fieldName);
        if (!field || typeof savedDraft[fieldName] !== 'string') {
          return;
        }

        if (field.type === 'checkbox') {
          field.checked = savedDraft[fieldName] === 'true';
          return;
        }

        if (typeof field.value === 'string') {
          field.value = savedDraft[fieldName];
        }
      });
    }

    if (!savedDraft || !Object.prototype.hasOwnProperty.call(savedDraft, 'displayName')) {
      seedDisplayNameField(form);
    }

    const persistDraft = () => {
      syncFormDraft(form, draftKey, fieldNames);
      writePreferredDisplayName(form.elements?.namedItem?.('displayName')?.value || '');
    };

    fieldNames.forEach((fieldName) => {
      const field = form.elements.namedItem(fieldName);
      if (field && typeof field.addEventListener === 'function') {
        field.addEventListener('input', persistDraft);
        if (fieldName === 'displayName') {
          field.addEventListener('input', () => {
            syncFormAuthState(form);
          });
        }
        if (field.type === 'checkbox') {
          field.addEventListener('change', persistDraft);
        }
      }
    });
  }

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

  function getAuthStorage() {
    return getDraftStorage();
  }

  function readAuthToken() {
    const storage = getAuthStorage();
    if (!storage) return '';

    try {
      return String(storage.getItem(FORUM_AUTH_TOKEN_KEY) || '');
    } catch (error) {
      return '';
    }
  }

  function writeAuthToken(token) {
    const storage = getAuthStorage();
    if (!storage) return;

    try {
      if (token) {
        storage.setItem(FORUM_AUTH_TOKEN_KEY, token);
      } else {
        storage.removeItem(FORUM_AUTH_TOKEN_KEY);
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

  async function waitForGoogleIdentity(timeoutMs = 6000) {
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

  function formatCommentCount(count) {
    const safeCount = Number(count) || 0;
    return safeCount === 1 ? '1 kommentaar' : `${safeCount} kommentaari`;
  }

  function formatCommentsHeading(count) {
    const safeCount = Number(count) || 0;
    return safeCount === 1 ? 'Kommentaar (1)' : `Kommentaarid (${safeCount})`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createAvatarHost(className, size = 38) {
    const host = document.createElement('span');
    host.className = className;
    host.dataset.avatarSize = String(size);
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = `<span class="forum-avatar-fallback">${size >= 36 ? '...' : ''}</span>`;
    return host;
  }

  function loadAnimalAvatarModule() {
    if (!avatarModulePromise) {
      avatarModulePromise = import('./forum-animal-avatars.js')
        .catch((error) => {
          avatarModulePromise = null;
          throw error;
        });
    }

    return avatarModulePromise;
  }

  function warmAnimalAvatarModule() {
    const warm = () => {
      loadAnimalAvatarModule().catch(() => {
        // Ignore warm-up failures and fall back to on-demand loading.
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(warm, { timeout: 1200 });
      return;
    }

    window.setTimeout(warm, 180);
  }

  function mountAnimalAvatar(host, displayName) {
    if (!host) return;

    const safeName = normalizeDisplayName(displayName);
    const size = Number(host.dataset.avatarSize) || 38;
    host.dataset.avatarSeed = safeName;
    host.innerHTML = `<span class="forum-avatar-fallback">${safeName.slice(0, 1).toUpperCase()}</span>`;

    loadAnimalAvatarModule()
      .then((module) => {
        if (!host.isConnected) return;
        if (host.dataset.avatarSeed !== safeName) return;

        host.innerHTML = module.renderForumAnimalAvatarSvg(safeName, {
          size,
          anonymous: isAnonymousDisplayName(safeName),
          label: safeName
        });
      })
      .catch(() => {
        host.innerHTML = `<span class="forum-avatar-fallback">${safeName.slice(0, 1).toUpperCase()}</span>`;
      });
  }

  function seedDisplayNameField(form) {
    const field = form?.elements?.namedItem?.('displayName');
    if (!field || typeof field.value !== 'string' || field.value.trim()) {
      return;
    }

    const preferredDisplayName = readPreferredDisplayName();
    if (preferredDisplayName && !isAnonymousDisplayName(preferredDisplayName)) {
      field.value = preferredDisplayName;
    }
  }

  function getCurrentFormDisplayName(form) {
    const value = form?.elements?.namedItem?.('displayName')?.value;
    return normalizeDisplayName(value);
  }

  function ensureFormAuthElements(form) {
    const authContext = form.querySelector('[data-forum-auth-context]');

    let authHint = form.querySelector('[data-forum-auth-hint]');
    if (!authHint) {
      authHint = document.createElement('p');
      authHint.className = 'forum-auth-hint';
      authHint.dataset.forumAuthHint = '';

      const actions = form.querySelector('.forum-form-actions');
      if (actions) {
        actions.before(authHint);
      } else {
        form.appendChild(authHint);
      }
    }

    let notifyControl = form.querySelector('[data-forum-notify-control]');
    if (!notifyControl) {
      notifyControl = document.createElement('div');
      notifyControl.className = 'forum-notify-control';
      notifyControl.dataset.forumNotifyControl = '';
      notifyControl.hidden = true;
      notifyControl.innerHTML = `
        <label class="forum-notify-check">
          <input type="checkbox" name="notifyReplies" value="true" />
          <span class="forum-notify-text">
            <span class="forum-notify-title">Teavita mind vastustest</span>
            <span class="forum-notify-copy" data-forum-notify-copy></span>
          </span>
        </label>
      `;

      const note = form.querySelector('.forum-form-note');
      if (note) {
        note.before(notifyControl);
      } else {
        const actions = form.querySelector('.forum-form-actions');
        if (actions) {
          actions.before(notifyControl);
        } else {
          form.appendChild(notifyControl);
        }
      }
    }

    return {
      authContext,
      authHint,
      notifyControl,
      notifyCheckbox: form.elements.namedItem('notifyReplies'),
      notifyCopy: notifyControl.querySelector('[data-forum-notify-copy]')
    };
  }

  function syncFormAuthState(form) {
    const parts = ensureFormAuthElements(form);
    const publicDisplayName = getCurrentFormDisplayName(form);

    if (state.authUser) {
      const authContext = parts.authContext || document.createElement('div');
      authContext.className = 'forum-auth-context';
      authContext.dataset.forumAuthContext = '';
      authContext.hidden = false;
      authContext.innerHTML = `
        <div class="forum-auth-context-copy">
          <span class="forum-auth-context-kicker">Sinu avalik fooruminimi</span>
          <div class="forum-auth-context-identity">
            <span class="forum-auth-context-avatar" data-forum-public-avatar data-avatar-size="38" aria-hidden="true"></span>
            <span class="forum-auth-context-name">${escapeHtml(publicDisplayName)}</span>
          </div>
          <span class="forum-auth-context-note">Muuda allolevat kasutajanime välja, kui tahad postitada teise nimega. Google konto ja e-post jäävad privaatseks.</span>
        </div>
      `;
      if (!authContext.parentElement) {
        form.prepend(authContext);
      }

      mountAnimalAvatar(authContext.querySelector('[data-forum-public-avatar]'), publicDisplayName);

      parts.authHint.hidden = true;
      parts.authHint.textContent = '';

      parts.notifyControl.hidden = !state.authConfig.notificationsEnabled;
      if (parts.notifyCopy) {
        parts.notifyCopy.textContent = 'Teavitused saadetakse sinu ühendatud Google kontole, kuid aadressi foorumis ei näidata.';
      }

      if (parts.notifyCheckbox && !parts.notifyCheckbox.checked) {
        const savedDraft = readDraft(form.dataset.forumDraftKey || '');
        if (!savedDraft || !Object.prototype.hasOwnProperty.call(savedDraft, 'notifyReplies')) {
          parts.notifyCheckbox.checked = true;
        }
      }

      return;
    }

    parts.authContext?.remove();

    if (parts.notifyCheckbox) {
      parts.notifyCheckbox.checked = false;
    }

    parts.notifyControl.hidden = true;
    parts.authHint.hidden = !state.authConfig.googleAuthEnabled;
    parts.authHint.textContent = state.authConfig.googleAuthEnabled
      ? 'Soovi korral logi ülal sisse, kui tahad hiljem vastuste teavitusi. Avaliku kasutajanime valid ikka ise.'
      : '';
  }

  function syncAllFormsAuthState() {
    document.querySelectorAll('.forum-form, .forum-comment-form').forEach((form) => {
      syncFormAuthState(form);
    });
  }

  function applySharedAuthState(nextState) {
    if (!nextState || typeof nextState !== 'object') {
      return;
    }

    if (nextState.authConfig) {
      state.authConfig = {
        googleAuthEnabled: Boolean(nextState.authConfig.googleAuthEnabled),
        notificationsEnabled: Boolean(nextState.authConfig.notificationsEnabled),
        googleClientId: String(nextState.authConfig.googleClientId || ''),
        status: String(nextState.authConfig.status || state.authConfig.status || 'loading')
      };
    }

    state.authUser = nextState.user || null;
    renderForumAuthCard();
  }

  async function signInWithGoogleCredential(credential) {
    const endpoint = getApiUrl('/forum/auth/google');
    if (!endpoint) {
      setStatus('Google sisselogimine ei ole hetkel saadaval.', 'error');
      return;
    }

    try {
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
      state.authUser = payload.user;
      clearStatus();
      renderForumAuthCard();
    } catch (error) {
      setStatus(error.message || 'Google sisselogimine ebaõnnestus.', 'error');
    }
  }

  function logoutForumAuth() {
    writeAuthToken('');
    state.authUser = null;

    if (window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }

    renderForumAuthCard();
  }

  async function renderGoogleButton(buttonHost) {
    if (!buttonHost || !state.authConfig.googleAuthEnabled) return;

    const googleIdentity = await waitForGoogleIdentity();
    if (!googleIdentity) {
      buttonHost.textContent = 'Google sisselogimise nuppu ei õnnestunud laadida.';
      return;
    }

    buttonHost.innerHTML = '';
    googleIdentity.initialize({
      client_id: state.authConfig.googleClientId,
      callback: (response) => {
        if (response?.credential) {
          signInWithGoogleCredential(response.credential);
        }
      }
    });
    googleIdentity.renderButton(buttonHost, {
      theme: 'outline',
      size: 'medium',
      shape: 'pill',
      text: 'signin_with',
      logo_alignment: 'left',
      width: 240
    });
  }

  function renderForumAuthCard() {
    const card = document.querySelector('[data-forum-auth-card]');
    if (card) {
      card.hidden = true;
      card.innerHTML = '';
    }
    syncAllFormsAuthState();
  }

  async function initForumAuth() {
    if (window.RELV_SITE_AUTH?.ready) {
      const sharedState = await window.RELV_SITE_AUTH.ready();
      applySharedAuthState(sharedState);
      return;
    }

    const endpoint = getApiUrl('/forum/auth/config');
    if (!endpoint) return;

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
      state.authUser = null;
      renderForumAuthCard();
      return;
    }

    const token = readAuthToken();
    if (token) {
      try {
        const sessionResponse = await fetch(getApiUrl('/forum/auth/session'), {
          headers: getAuthHeaders()
        });
        const sessionPayload = await sessionResponse.json().catch(() => ({}));

        if (sessionResponse.ok && sessionPayload.ok && sessionPayload.user) {
          state.authUser = sessionPayload.user;
        } else {
          writeAuthToken('');
          state.authUser = null;
        }
      } catch (error) {
        writeAuthToken('');
        state.authUser = null;
      }
    }

    renderForumAuthCard();
  }

  function normalizeDisplayName(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return 'anon';

    const lowered = normalized.toLocaleLowerCase('et-EE');
    if (lowered === 'anonüümne' || lowered === 'anon') {
      return 'anon';
    }

    return normalized;
  }

  function isAnonymousDisplayName(displayName) {
    return normalizeDisplayName(displayName) === 'anon';
  }

  function getAuthorColor(displayName) {
    const safeName = normalizeDisplayName(displayName);
    if (isAnonymousDisplayName(safeName)) return '';
    const key = safeName.toLocaleLowerCase('et-EE');

    if (!authorColorByName.has(key)) {
      authorColorByName.set(key, shuffledAuthorPalette[authorColorByName.size % shuffledAuthorPalette.length]);
    }

    return authorColorByName.get(key);
  }

  function appendMetaWithAuthor(container, displayName, ...parts) {
    const safeName = normalizeDisplayName(displayName);
    const authorChip = document.createElement('span');
    authorChip.className = 'forum-author-chip';

    const avatar = createAvatarHost('forum-author-avatar', 34);
    mountAnimalAvatar(avatar, safeName);

    const author = document.createElement('span');
    author.className = 'forum-author-name';
    if (isAnonymousDisplayName(safeName)) {
      author.classList.add('is-anonymous');
    } else {
      author.style.setProperty('--forum-author-color', getAuthorColor(safeName));
    }
    author.textContent = safeName;
    authorChip.append(avatar, author);
    container.appendChild(authorChip);

    parts
      .filter((part) => part !== undefined && part !== null && part !== '')
      .forEach((part) => {
        const separator = document.createElement('span');
        separator.className = 'forum-meta-separator';
        separator.textContent = '•';

        const value = document.createElement('span');
        value.className = 'forum-meta-text';
        value.textContent = String(part);

        container.append(separator, value);
      });
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
    const draftKey = getCommentDraftKey(thread.slug, parentComment?.id || '');

    const form = document.createElement('form');
    form.className = 'forum-comment-form';
    form.dataset.forumDraftKey = draftKey;
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

    ensureFormAuthElements(form);
    bindFormDraftPersistence(form, draftKey, ['displayName', 'body', 'notifyReplies']);
    syncFormAuthState(form);

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
            ...getAuthHeaders({
              'Content-Type': 'application/json'
            })
          },
          body: JSON.stringify({
            threadSlug: thread.slug,
            parentCommentId: parentComment?.id || '',
            displayName: formData.get('displayName'),
            body: formData.get('body'),
            notifyReplies: formData.get('notifyReplies') === 'true',
            website: formData.get('website'),
            company: formData.get('company')
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Kommentaari saatmine ebaõnnestus.');
        }

        clearDraft(draftKey);
        form.reset();
        seedDisplayNameField(form);
        syncFormAuthState(form);
        setStatus(
          [parentComment ? 'Vastus lisatud.' : 'Kommentaar lisatud.', payload.notificationMessage].filter(Boolean).join(' '),
          'success'
        );
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
    appendMetaWithAuthor(itemMeta, comment.displayName, formatDate(comment.createdAt));

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
      appendMetaWithAuthor(meta, thread.displayName, formatCommentCount(thread.commentsCount), formatDate(thread.lastActivityAt));

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
    appendMetaWithAuthor(meta, thread.displayName, formatDate(thread.createdAt), formatCommentCount(thread.commentsCount));

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
    commentsHeading.textContent = formatCommentsHeading(thread.commentsCount);
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
    const draftKey = getThreadDraftKey();
    form.dataset.forumDraftKey = draftKey;

    ensureFormAuthElements(form);
    bindFormDraftPersistence(form, draftKey, ['title', 'displayName', 'body', 'notifyReplies']);
    syncFormAuthState(form);

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
            ...getAuthHeaders({
              'Content-Type': 'application/json'
            })
          },
          body: JSON.stringify({
            title: formData.get('title'),
            displayName: formData.get('displayName'),
            body: formData.get('body'),
            notifyReplies: formData.get('notifyReplies') === 'true',
            website: formData.get('website'),
            company: formData.get('company')
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'Teema loomine ebaõnnestus.');
        }

        clearDraft(draftKey);
        form.reset();
        seedDisplayNameField(form);
        syncFormAuthState(form);
        setStatus(['Uus teema lisatud.', payload.notificationMessage].filter(Boolean).join(' '), 'success');
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

    const eventPathMatches = (event, selector) => {
      if (typeof event.composedPath !== 'function') return false;

      return event.composedPath().some((node) => {
        return node instanceof Element && typeof node.matches === 'function' && node.matches(selector);
      });
    };

    page.addEventListener('click', (event) => {
      if (!state.activeSlug && !state.loadingDetail) return;

      const clickedThreadCard = eventPathMatches(event, '.forum-thread-card') || event.target.closest('.forum-thread-card');
      const clickedThreadDetail = eventPathMatches(event, '[data-forum-thread-detail]') || event.target.closest('[data-forum-thread-detail]');
      const clickedFormPanel = eventPathMatches(event, '.forum-panel--form') || event.target.closest('.forum-panel--form');

      if (clickedThreadCard) return;
      if (clickedThreadDetail) return;
      if (clickedFormPanel) return;

      clearStatus();
      clearThreadSelection();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.body.classList.contains('theme-forum')) return;

    if (window.RELV_SITE_AUTH?.subscribe) {
      window.RELV_SITE_AUTH.subscribe((nextState) => {
        applySharedAuthState(nextState);
      });
    }

    initCreateThreadForm();
    initThreadDismiss();
    renderThreadDetail();
    warmAnimalAvatarModule();

    const authInit = initForumAuth();
    const threadsInit = loadThreads();
    await Promise.allSettled([authInit, threadsInit]);

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
