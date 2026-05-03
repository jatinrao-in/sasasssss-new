const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function normalizeOrigin(value) {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function addOrigin(target, value) {
  const normalized = normalizeOrigin(value);

  if (normalized) {
    target.add(normalized);
  }
}

function addOriginsFromList(target, value) {
  String(value ?? '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => addOrigin(target, entry));
}

function getRequestHostOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();

  if (!host) {
    return null;
  }

  const protocol = String(req.headers['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim()
    .toLowerCase();

  return normalizeOrigin(`${protocol}://${host}`);
}

function getAllowedOrigins(req) {
  const allowedOrigins = new Set(DEFAULT_ALLOWED_ORIGINS);

  addOriginsFromList(allowedOrigins, process.env.CORS_ALLOWED_ORIGINS);

  [
    process.env.VITE_ADMIN_URL,
    process.env.VITE_PWA_URL,
    process.env.VITE_API_BASE_URL,
    process.env.VITE_BACKEND_URL,
  ].forEach((value) => addOrigin(allowedOrigins, value));

  addOrigin(allowedOrigins, getRequestHostOrigin(req));

  if (process.env.VERCEL_URL) {
    addOrigin(allowedOrigins, `https://${process.env.VERCEL_URL}`);
  }

  return allowedOrigins;
}

function resolveAllowedOrigin(req) {
  const requestOrigin = normalizeOrigin(req.headers.origin);

  if (!requestOrigin) {
    return null;
  }

  return getAllowedOrigins(req).has(requestOrigin) ? requestOrigin : null;
}

export function setCorsHeaders(req, res, methods = 'POST, OPTIONS') {
  const allowedOrigin = resolveAllowedOrigin(req);

  if (!allowedOrigin) {
    return !req.headers.origin;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

export function handleCors(req, res, methods = 'POST, OPTIONS') {
  const allowed = setCorsHeaders(req, res, methods);

  if (req.method === 'OPTIONS') {
    if (!allowed) {
      res.status(403).json({ error: 'Origin not allowed' });
      return true;
    }

    res.status(200).end();
    return true;
  }

  if (req.headers.origin && !allowed) {
    res.status(403).json({ error: 'Origin not allowed' });
    return true;
  }

  return false;
}

export function handlePreflight(req, res, methods = 'POST, OPTIONS') {
  return handleCors(req, res, methods);
}
