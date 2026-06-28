// POST /api/upload — password-protected. Accepts a single image as
// base64 JSON ({ filename, contentType, dataBase64 }) and stores it
// in Vercel Blob. Returns the public URL to drop into the content map.
import { put } from '@vercel/blob';
import { checkPassword } from './_store.js';

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkPassword(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const { filename, contentType, dataBase64 } = req.body || {};
  if (!dataBase64) {
    return res.status(400).json({ error: 'No image data received.' });
  }

  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    const safeName = (filename || 'photo')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-60) || 'photo';
    const blob = await put(`uploads/${Date.now()}-${safeName}`, buffer, {
      access: 'public',
      contentType: contentType || 'image/jpeg',
      addRandomSuffix: true,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed: ' + (err.message || 'unknown error') });
  }
}
