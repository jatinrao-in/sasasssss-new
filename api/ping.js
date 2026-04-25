import { handleCors } from '../server/cors.js';

export default function handler(req, res) {
  if (handleCors(req, res, 'GET, OPTIONS')) {
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: `Method ${req.method} not allowed. Use GET.`,
    });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  return res.status(200).json({
    success: true,
    message: 'API is working',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
}
