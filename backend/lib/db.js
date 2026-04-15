const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const { databaseUrl } = require('./config');

if (!databaseUrl) {
  console.warn('DATABASE_URL is not configured for relv-backend.');
}

const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaPromise = null;

async function ensureDb() {
  if (!sql) {
    throw new Error('DATABASE_URL puudub.');
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS forum_threads (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          display_name TEXT NOT NULL,
          comments_count INTEGER NOT NULL DEFAULT 0,
          is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_hash TEXT,
          user_agent TEXT
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS forum_comments (
          id TEXT PRIMARY KEY,
          thread_id TEXT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          display_name TEXT NOT NULL,
          is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_hash TEXT,
          user_agent TEXT
        )
      `;

      await sql`
        ALTER TABLE forum_comments
        ADD COLUMN IF NOT EXISTS parent_comment_id TEXT REFERENCES forum_comments(id) ON DELETE CASCADE
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          source_page TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_hash TEXT,
          user_agent TEXT
        )
      `;

      await sql`CREATE INDEX IF NOT EXISTS forum_threads_last_activity_idx ON forum_threads (last_activity_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS forum_comments_thread_created_idx ON forum_comments (thread_id, created_at ASC)`;
      await sql`CREATE INDEX IF NOT EXISTS forum_comments_parent_created_idx ON forum_comments (parent_comment_id, created_at ASC)`;
      await sql`CREATE INDEX IF NOT EXISTS forum_threads_ip_hash_idx ON forum_threads (ip_hash, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS forum_comments_ip_hash_idx ON forum_comments (ip_hash, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS mailing_list_ip_hash_idx ON mailing_list_subscribers (ip_hash, created_at DESC)`;
    })();
  }

  return schemaPromise;
}

async function listThreads(limit = 25) {
  await ensureDb();

  return sql`
    SELECT
      slug,
      title,
      body,
      display_name AS "displayName",
      comments_count AS "commentsCount",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      last_activity_at AS "lastActivityAt"
    FROM forum_threads
    WHERE is_hidden = FALSE
    ORDER BY last_activity_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 50))}
  `;
}

function buildCommentTree(comments) {
  const commentsById = new Map();
  const roots = [];

  comments.forEach((comment) => {
    commentsById.set(comment.id, {
      ...comment,
      replies: []
    });
  });

  comments.forEach((comment) => {
    const node = commentsById.get(comment.id);

    if (node.parentCommentId && commentsById.has(node.parentCommentId)) {
      commentsById.get(node.parentCommentId).replies.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

async function getThreadBySlug(slug) {
  await ensureDb();

  const rows = await sql`
    SELECT
      id,
      slug,
      title,
      body,
      display_name AS "displayName",
      comments_count AS "commentsCount",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      last_activity_at AS "lastActivityAt"
    FROM forum_threads
    WHERE slug = ${slug} AND is_hidden = FALSE
    LIMIT 1
  `;

  const thread = rows[0];
  if (!thread) return null;

  const comments = await sql`
    SELECT
      id,
      body,
      display_name AS "displayName",
      parent_comment_id AS "parentCommentId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM forum_comments
    WHERE thread_id = ${thread.id} AND is_hidden = FALSE
    ORDER BY created_at ASC
  `;

  return {
    ...thread,
    comments: buildCommentTree(comments)
  };
}

async function createUniqueSlug(slugBase) {
  await ensureDb();

  const base = slugBase || `teema-${Date.now().toString(36)}`;

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${base}${suffix}`;

    const existing = await sql`
      SELECT slug
      FROM forum_threads
      WHERE slug = ${candidate}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function createThread({ title, body, displayName, slugBase, ipHash, userAgent }) {
  await ensureDb();

  const id = crypto.randomUUID();
  const slug = await createUniqueSlug(slugBase);

  await sql`
    INSERT INTO forum_threads (
      id,
      slug,
      title,
      body,
      display_name,
      ip_hash,
      user_agent
    )
    VALUES (
      ${id},
      ${slug},
      ${title},
      ${body},
      ${displayName},
      ${ipHash},
      ${userAgent}
    )
  `;

  return getThreadBySlug(slug);
}

async function addComment({ threadSlug, parentCommentId, body, displayName, ipHash, userAgent }) {
  await ensureDb();

  const threadRows = await sql`
    SELECT id
    FROM forum_threads
    WHERE slug = ${threadSlug} AND is_hidden = FALSE
    LIMIT 1
  `;

  const thread = threadRows[0];
  if (!thread) {
    throw new Error('Teemat ei leitud.');
  }

  let parentComment = null;

  if (parentCommentId) {
    const parentRows = await sql`
      SELECT id, thread_id
      FROM forum_comments
      WHERE id = ${parentCommentId} AND is_hidden = FALSE
      LIMIT 1
    `;

    parentComment = parentRows[0] || null;

    if (!parentComment || parentComment.thread_id !== thread.id) {
      throw new Error('Kommentaarile vastamine ebaõnnestus.');
    }
  }

  const id = crypto.randomUUID();

  await sql`
    INSERT INTO forum_comments (
      id,
      thread_id,
      parent_comment_id,
      body,
      display_name,
      ip_hash,
      user_agent
    )
    VALUES (
      ${id},
      ${thread.id},
      ${parentComment ? parentComment.id : null},
      ${body},
      ${displayName},
      ${ipHash},
      ${userAgent}
    )
  `;

  await sql`
    UPDATE forum_threads
    SET
      comments_count = comments_count + 1,
      updated_at = NOW(),
      last_activity_at = NOW()
    WHERE id = ${thread.id}
  `;

  return getThreadBySlug(threadSlug);
}

async function upsertSubscriber({ email, sourcePage, ipHash, userAgent }) {
  await ensureDb();

  const id = crypto.randomUUID();

  const rows = await sql`
    INSERT INTO mailing_list_subscribers (
      id,
      email,
      source_page,
      ip_hash,
      user_agent
    )
    VALUES (
      ${id},
      ${email},
      ${sourcePage},
      ${ipHash},
      ${userAgent}
    )
    ON CONFLICT (email)
    DO UPDATE SET
      source_page = EXCLUDED.source_page,
      ip_hash = EXCLUDED.ip_hash,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
    RETURNING
      email,
      source_page AS "sourcePage",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  return rows[0];
}

async function countRecentThreadsByIp(ipHash, hours) {
  await ensureDb();

  const rows = await sql`
    SELECT COUNT(*)::INT AS count
    FROM forum_threads
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - (${String(hours)} || ' hours')::INTERVAL
  `;

  return rows[0]?.count || 0;
}

async function countRecentCommentsByIp(ipHash, hours) {
  await ensureDb();

  const rows = await sql`
    SELECT COUNT(*)::INT AS count
    FROM forum_comments
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - (${String(hours)} || ' hours')::INTERVAL
  `;

  return rows[0]?.count || 0;
}

async function countRecentSubscriptionsByIp(ipHash, hours) {
  await ensureDb();

  const rows = await sql`
    SELECT COUNT(*)::INT AS count
    FROM mailing_list_subscribers
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - (${String(hours)} || ' hours')::INTERVAL
  `;

  return rows[0]?.count || 0;
}

module.exports = {
  ensureDb,
  listThreads,
  getThreadBySlug,
  createThread,
  addComment,
  upsertSubscriber,
  countRecentThreadsByIp,
  countRecentCommentsByIp,
  countRecentSubscriptionsByIp
};
