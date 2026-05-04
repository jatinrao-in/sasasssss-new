import { generateText, generateJson } from '../server/ai.js';
import { handleConfigError } from '../server/config.js';
import { handleCors } from '../server/cors.js';
import { requireAdmin, verifyFirebaseRequest } from '../server/auth.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Determine action from URL path if possible (Vercel routes) or body
  const action = req.query.action || req.body?.action;

  try {
    const authContext = await verifyFirebaseRequest(req);
    requireAdmin(authContext);

    if (action === 'business-summary') {
      const { data } = req.body || {};
      if (!data) return res.status(400).json({ error: 'data is required' });
      const summary = await generateText(
        `You are an experienced business operations advisor. Review this dashboard snapshot and give a concise operational summary. Focus on urgent issues, trends, and clear next actions. Keep it under 180 words.
        Data: ${JSON.stringify(data, null, 2)}`,
        { temperature: 0.3, maxOutputTokens: 512 }
      );
      return res.status(200).json({ success: true, summary });
    }

    if (action === 'suggest-deadline') {
      const { taskDescription, projectId, projectName } = req.body || {};
      if (!taskDescription) return res.status(400).json({ error: 'taskDescription is required' });
      const today = new Date().toISOString().slice(0, 10);
      const suggestion = await generateJson(
        `Today's date: ${today}. Task: ${taskDescription}. Project: ${projectName || 'N/A'}. Recommend a practical deadline.`,
        `{ "suggestedDate": "YYYY-MM-DD", "estimatedDays": "integer", "reason": "short explanation" }`,
        { temperature: 0.2, maxOutputTokens: 512 }
      );
      return res.status(200).json({ success: true, suggestion });
    }

    if (action === 'suggest-task') {
      const { taskDescription, teamMembers = [] } = req.body || {};
      if (!taskDescription || !teamMembers.length) return res.status(400).json({ error: 'Description and members required' });
      const suggestion = await generateJson(
        `Task: ${taskDescription}. Members: ${JSON.stringify(teamMembers)}. Choose the best assignee.`,
        `{ "suggestedMemberId": "string", "suggestedMember": "string", "reason": "explanation", "confidence": "low|medium|high" }`,
        { temperature: 0.2, maxOutputTokens: 512 }
      );
      return res.status(200).json({ success: true, suggestion });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (error) {
    console.error('AI API Error:', error.message);
    if (handleConfigError(res, error)) return;
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}
