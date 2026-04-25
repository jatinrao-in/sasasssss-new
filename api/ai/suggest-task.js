import { generateJson } from '../../server/ai.js';
import { handleConfigError } from '../../server/config.js';
import { handlePreflight, setCorsHeaders } from '../../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../../server/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskDescription, teamMembers = [] } = req.body || {};

  if (!taskDescription || String(taskDescription).trim().length < 3) {
    return res.status(400).json({ error: 'taskDescription is required' });
  }

  if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
    return res.status(400).json({ error: 'teamMembers must be a non-empty array' });
  }

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    const suggestion = await generateJson(
      `You are helping an ERP admin assign work fairly and accurately.

Task description:
${taskDescription}

Available team members:
${JSON.stringify(teamMembers, null, 2)}

Choose the single best assignee based on role fit, designation, likely workload, and task relevance.
If the input lacks enough detail, still choose the best available option and explain the tradeoff.`,
      `{
  "suggestedMemberId": "string",
  "suggestedMember": "string",
  "reason": "short plain-English explanation",
  "confidence": "low | medium | high"
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
