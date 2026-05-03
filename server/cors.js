/**
 * cors.js — simplified: always allow all origins.
 * Security is enforced by Bearer token verification, not Origin checking.
 */

export function setCorsHeaders(req, res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

export function handleCors(req, res, methods = 'GET, POST, OPTIONS') {
  setCorsHeaders(req, res, methods);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

export function handlePreflight(req, res, methods = 'GET, POST, OPTIONS') {
  return handleCors(req, res, methods);
}
