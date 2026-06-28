// GET /api/content — public. Returns the live site content
// (admin-edited text + image overrides, and the event list).
import { readContent, withDefaults } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const content = await readContent();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(withDefaults(content));
  } catch (err) {
    // Never break the public site — return empty content on error.
    return res.status(200).json({ texts: {}, images: {}, events: [] });
  }
}
