// ─────────────────────────────────────────────────────────
// Shared storage + auth helpers for the admin API.
// Content (all edited text, image URLs, and events) lives in a
// single JSON blob in Vercel Blob storage at CONTENT_PATH.
// Files starting with "_" are NOT exposed as routes by Vercel.
// ─────────────────────────────────────────────────────────
import { put, list } from '@vercel/blob';

const CONTENT_PATH = 'content.json';

// Events shown by default until the owner edits them in /admin.
export const DEFAULT_EVENTS = [
  { id: 'def-1', date: '2026-07-07', title: 'Trivia Tuesday', desc: 'Weekly bar trivia. Teams of up to 6. Come early for a good spot!' },
  { id: 'def-2', date: '2026-07-14', title: 'Trivia Tuesday', desc: 'Weekly bar trivia. Teams of up to 6. Come early for a good spot!' },
  { id: 'def-3', date: '2026-07-21', title: 'Trivia Tuesday', desc: 'Weekly bar trivia. Teams of up to 6. Come early for a good spot!' },
  { id: 'def-4', date: '2026-07-28', title: 'Trivia Tuesday', desc: 'Weekly bar trivia. Teams of up to 6. Come early for a good spot!' },
];

const EMPTY = { texts: {}, images: {}, events: null };

// Read the saved content blob. Returns the stored object, or an
// empty shell if nothing has been saved yet.
export async function readContent() {
  try {
    const { blobs } = await list({ prefix: CONTENT_PATH });
    const found = blobs.find(b => b.pathname === CONTENT_PATH);
    if (!found) return { ...EMPTY };
    const res = await fetch(found.url, { cache: 'no-store' });
    if (!res.ok) return { ...EMPTY };
    const data = await res.json();
    return {
      texts: data.texts || {},
      images: data.images || {},
      events: Array.isArray(data.events) ? data.events : null,
    };
  } catch (err) {
    return { ...EMPTY };
  }
}

// Persist the full content object.
export async function writeContent(content) {
  const body = JSON.stringify({
    texts: content.texts || {},
    images: content.images || {},
    events: Array.isArray(content.events) ? content.events : null,
  });
  await put(CONTENT_PATH, body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

// What the public site consumes: events always resolves to a usable
// list (saved events, or the defaults if the owner hasn't set any).
export function withDefaults(content) {
  return {
    texts: content.texts || {},
    images: content.images || {},
    events: Array.isArray(content.events) ? content.events : DEFAULT_EVENTS,
  };
}

// Constant-time-ish password check against the ADMIN_PASSWORD env var.
export function checkPassword(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const given =
    (req.headers['x-admin-password'] || '') ||
    (req.body && req.body.password) || '';
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
