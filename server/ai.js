import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireEnv } from './config.js';

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function getClient() {
  const { GEMINI_API_KEY } = requireEnv(['GEMINI_API_KEY']);
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function generateText(prompt, {
  model = FALLBACK_MODELS[0],
  temperature = 0.4,
  maxOutputTokens = 1024,
} = {}) {
  const client = getClient();
  const models = [model, ...FALLBACK_MODELS.filter((candidate) => candidate !== model)];
  let lastError = null;

  for (const candidate of models) {
    try {
      const generativeModel = client.getGenerativeModel({ model: candidate });
      const result = await generativeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: 'text/plain',
        },
      });

      return result.response.text().trim();
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      if (status !== 429 && status !== 503) {
        break;
      }
    }
  }

  throw lastError || new Error('AI request failed');
}

export async function generateJson(prompt, schemaInstruction, options = {}) {
  const responseText = await generateText(
    `${prompt}\n\nReturn ONLY valid JSON.\nSchema / instructions:\n${schemaInstruction}`,
    options,
  );

  return JSON.parse(stripCodeFence(responseText));
}
