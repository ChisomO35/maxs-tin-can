// POST /api/save — password-protected. Saves the full content
// object (texts, images map, events) edited in the admin portal.
import { writeContent, checkPassword } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkPassword(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const body = req.body || {};
  const incoming = body.content;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Missing content.' });
  }

  try {
    // The admin always sends the complete intended state, so we
    // replace the override maps wholesale (no stale leftovers).
    await writeContent({
      texts: incoming.texts || {},
      images: incoming.images || {},
      events: Array.isArray(incoming.events) ? incoming.events : null,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Could not save: ' + (err.message || 'unknown error') });
  }
}
