// POST /api/login — checks the admin password so the portal can
// unlock its editing UI. The password is also re-checked on every
// save/upload, so this is just a gate, not the only protection.
import { checkPassword } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
  }
  if (!checkPassword(req)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  return res.status(200).json({ ok: true });
}
