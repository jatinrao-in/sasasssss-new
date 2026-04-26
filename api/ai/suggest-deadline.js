import { generateJson } from '../../server/ai.js';
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

  const { taskDescription, projectId, projectName } = req.body || {};

  if (!taskDescription || String(taskDescription).trim().length < 3) {
    return res.status(400).json({ error: 'taskDescription is required' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const today = new Date().toISOString().slice(0, 10);
    const suggestion = await generateJson(
      `You are estimating a realistic internal task deadline for a small business operations team.

Today's date: ${today}
Task description:
${taskDescription}

Project context:
${JSON.stringify({ projectId: projectId || null, projectName: projectName || null }, null, 2)}

Recommend a practical deadline. Favor realistic execution over optimism.`,
      `{
  "suggestedDate": "YYYY-MM-DD",
  "estimatedDays": "integer",
  "reason": "short plain-English explanation"
}`,
      { temperature: 0.2, maxOutputTokens: 512 },
    );

    return res.status(200).json({ success: true, suggestion });
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
