function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMultiline(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function stripSoftSpam(value) {
  return value.replace(/\u200B/g, '');
}

function sanitizeDisplayName(value) {
  const cleaned = collapseWhitespace(stripSoftSpam(value));
  if (!cleaned) return 'Anonüümne';
  return cleaned.slice(0, 40);
}

function slugify(value) {
  const base = collapseWhitespace(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return base || `teema-${Date.now().toString(36)}`;
}

function countLinks(value) {
  return (String(value || '').match(/https?:\/\/|www\./gi) || []).length;
}

function validateEmail(email) {
  const normalized = collapseWhitespace(email).toLowerCase();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  if (!isValid) {
    throw new Error('Sisesta korrektne e-posti aadress.');
  }

  return normalized.slice(0, 254);
}

function validateThreadInput(input) {
  if (input.website || input.company) {
    throw new Error('Kahtlane päring blokeeriti.');
  }

  const title = collapseWhitespace(stripSoftSpam(input.title));
  const body = normalizeMultiline(stripSoftSpam(input.body));
  const displayName = sanitizeDisplayName(input.displayName);

  if (title.length < 4 || title.length > 140) {
    throw new Error('Teema pealkiri peab olema 4–140 tähemärki.');
  }

  if (body.length < 10 || body.length > 5000) {
    throw new Error('Teema sisu peab olema 10–5000 tähemärki.');
  }

  if (countLinks(`${title}\n${body}`) > 3) {
    throw new Error('Liiga palju linke ühes postituses.');
  }

  return {
    title,
    body,
    displayName,
    slugBase: slugify(title)
  };
}

function validateCommentInput(input) {
  if (input.website || input.company) {
    throw new Error('Kahtlane päring blokeeriti.');
  }

  const body = normalizeMultiline(stripSoftSpam(input.body));
  const displayName = sanitizeDisplayName(input.displayName);
  const threadSlug = collapseWhitespace(input.threadSlug);

  if (!threadSlug) {
    throw new Error('Kommentaari lisamiseks puudub teema.');
  }

  if (body.length < 2 || body.length > 2500) {
    throw new Error('Kommentaar peab olema 2–2500 tähemärki.');
  }

  if (countLinks(body) > 2) {
    throw new Error('Liiga palju linke kommentaaris.');
  }

  return {
    threadSlug,
    body,
    displayName
  };
}

function validateSubscriptionInput(input) {
  if (input.website || input.company) {
    throw new Error('Kahtlane päring blokeeriti.');
  }

  const email = validateEmail(input.email);
  const sourcePage = collapseWhitespace(input.sourcePage).slice(0, 120);

  return {
    email,
    sourcePage: sourcePage || 'unknown'
  };
}

module.exports = {
  sanitizeDisplayName,
  slugify,
  validateThreadInput,
  validateCommentInput,
  validateSubscriptionInput
};
