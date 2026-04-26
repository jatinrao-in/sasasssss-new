import { generateText } from '../../server/ai.js';
import { handleConfigError } from '../../server/config.js';
import { handleCors } from '../../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data } = req.body || {};

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'data is required' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const summary = await generateText(
      `You are an experienced business operations advisor for a manufacturing and service company.

Review this dashboard snapshot and give a concise operational summary.
Focus on urgent issues, trends, and clear next actions.
Keep it under 180 words and use plain text bullets.

Data:
${JSON.stringify(data, null, 2)}`,
      { temperature: 0.3, maxOutputTokens: 512 },
    );

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('Critical:', error.message);

    if (handleConfigError(res, error)) {
      return;
    }

    const statusCode = error.statusCode
      || (String(error.code || '').startsWith('auth/') ? 401 : 0)
      || 500;

    return res.status(statusCode).json({ error: statusCode === 401 ? 'Unauthorized' : error.message });
  }
}
