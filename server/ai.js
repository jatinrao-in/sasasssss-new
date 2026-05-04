import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateText(prompt, options = {}) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateJson(prompt, schema, options = {}) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });
  const finalPrompt = `${prompt}\n\nRespond strictly with JSON matching this schema: ${schema}`;
  const result = await model.generateContent(finalPrompt);
  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('JSON Parse Error:', text);
    throw new Error('Failed to generate valid JSON response from AI');
  }
}
