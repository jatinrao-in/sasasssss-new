import { createPrivateKey } from 'node:crypto';

function normalizeMultilineEnv(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function hasEnv(keys) {
  return keys.every((key) => String(process.env[key] ?? '').trim());
}

function hasValidFirebasePrivateKey() {
  const privateKey = normalizeMultilineEnv(process.env.FIREBASE_PRIVATE_KEY);

  if (!privateKey) {
    return false;
  }

  try {
    createPrivateKey(privateKey);
    return true;
  } catch {
    return false;
  }
}

export default function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const healthy = hasEnv([
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'GEMINI_API_KEY',
    'MSG91_AUTH_KEY',
    'MSG91_INTEGRATED_NUMBER',
    'CRON_SECRET',
  ]) && hasValidFirebasePrivateKey();

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'HEAD') {
    return res.status(healthy ? 200 : 503).end();
  }

  return res.status(healthy ? 200 : 503).json({
    ok: healthy,
    environment: process.env.VERCEL_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
