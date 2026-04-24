/**
 * Centralized Google Gemini AI Engine
 * Handles prompt formatting, retries, and structured JSON generation.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Fallback chain: If the newest model is overloaded (503), gracefully degrade to previous fast models
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest'
];

const getApiUrl = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

/**
 * Standard delay function for retries
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Core function to call Gemini API with model fallback
 * @param {string} prompt - The natural language prompt
 * @param {Object} options - Options including schema, temperature, etc.
 * @returns {Promise<string>} The raw text response
 */
export async function generateContent(prompt, options = {}) {
  if (!API_KEY) throw new Error("Gemini API Key is missing. Check .env.local");

  const {
    systemInstruction = "",
    temperature = 0.7,
    maxOutputTokens = 8192,
    responseMimeType = "text/plain",
    retries = 2
  } = options;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let lastError = null;

  // Try each model in the fallback chain
  for (const model of FALLBACK_MODELS) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await fetch(getApiUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const status = response.status;
          
          // If 503 (Overloaded) or 429 (Rate Limit), we should break the retry loop for this model
          // and immediately fall back to the next model in the chain.
          if (status === 503 || status === 429) {
             console.warn(`[Gemini] Model ${model} is overloaded (${status}). Falling back to next model...`);
             throw new Error(`OVERLOADED`);
          }
          
          throw new Error(errorData?.error?.message || `API Error: ${status}`);
        }

        const data = await response.json();
        
        // Handle blocked or empty responses
        if (data.candidates?.[0]?.finishReason !== 'STOP' && !data.candidates?.[0]?.content) {
           throw new Error(`Generation blocked or incomplete. Reason: ${data.candidates?.[0]?.finishReason}`);
        }

        return data.candidates[0].content.parts[0].text;
      } catch (error) {
        lastError = error;
        
        // If overloaded, break immediately to try the next model
        if (error.message === 'OVERLOADED') break;

        attempt++;
        if (attempt > retries) break; // Break to try next model
        console.warn(`[Gemini] ${model} attempt ${attempt} failed. Retrying...`, error.message);
        await delay(1000 * attempt); // Exponential backoff
      }
    }
  }

  // If we exhaust all models and retries
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
}

/**
 * Generates structured JSON from unstructured text.
 * @param {string} prompt - The raw input
 * @param {object} schemaInstruction - Description of the expected JSON structure
 */
export async function generateJSON(prompt, schemaInstruction) {
  const fullPrompt = `
You are an expert data extractor. Convert the following text into a STRICT JSON object.
Follow this schema/instruction exactly:
${schemaInstruction}

Raw Text:
${prompt}

Output ONLY valid JSON. No markdown wrappers, no explanations.
`;

  try {
    const rawOutput = await generateContent(fullPrompt, {
      temperature: 0.1, // Low temp for deterministic output
      responseMimeType: "application/json" // Force JSON output
    });

    return JSON.parse(rawOutput.trim());
  } catch (error) {
    console.error("JSON Generation Error:", error);
    throw new Error("Failed to parse AI response into structured data.");
  }
}

/**
 * Chat Session class to maintain memory/context.
 */
export class ChatSession {
  constructor(systemPrompt = "") {
    this.history = [];
    this.systemPrompt = systemPrompt;
  }

  async sendMessage(message) {
    // Add user message to history
    this.history.push({ role: "user", parts: [{ text: message }] });

    const payload = {
      contents: this.history,
      generationConfig: { temperature: 0.7 },
      systemInstruction: this.systemPrompt ? { parts: [{ text: this.systemPrompt }] } : undefined
    };

    let lastError = null;

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await fetch(getApiUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
           if (response.status === 503 || response.status === 429) {
               console.warn(`[Gemini Chat] Model ${model} is overloaded. Falling back...`);
               throw new Error('OVERLOADED');
           }
           throw new Error(`Chat request failed with status: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        // Add AI response to history
        this.history.push({ role: "model", parts: [{ text: aiText }] });

        return aiText;
      } catch (error) {
        lastError = error;
        if (error.message !== 'OVERLOADED') {
           // For non-overload errors, we don't necessarily fallback to other models immediately,
           // but for resilience, we try the next model anyway.
        }
      }
    }

    // Revert history if all models failed
    this.history.pop();
    throw new Error(`Chat failed across all models. Last error: ${lastError?.message}`);
  }

  getHistory() {
    return this.history;
  }

  clear() {
    this.history = [];
  }
}

/**
 * Parses natural language into an actionable Intent JSON for the UI.
 * @param {string} prompt - User command (e.g., "Create an enquiry for John")
 * @param {object} context - Current page state from AIContext
 * @returns {Promise<Object>} Intent JSON { action, route, prefill }
 */
export async function analyzeActionIntent(prompt, context) {
  const schemaInstruction = `
You are an AI Router for a CRM. Parse the user's intent and return a JSON object with this schema:
{
  "action": "navigate" | "prefill" | "explain" | "unknown",
  "route": "/enquiry" | "/projects" | "/tasks" | "/payments" | null,
  "prefill": { "field1": "value", ... } | null
}
If the user wants to create an enquiry, route to /enquiry. If they want to create a task, route to /projects.
Current Page Context: ${JSON.stringify(context)}
  `;

  return await generateJSON(prompt, schemaInstruction);
}

/**
 * Generates an executive business summary. Optimized for free tier tokens by focusing on anomalies.
 * @param {object} rawData - Minimal data dump from Firestore (e.g. counts, sums)
 */
export async function generateBusinessSummary(rawData) {
  const prompt = `
You are an expert Business Analyst. Review this data and provide a concise, high-impact summary.
Do not use generic fluff. Focus purely on anomalies, trends, and action items.

Data:
${JSON.stringify(rawData)}

Format your response as a professional markdown report with clear headings and bullet points. Keep it under 200 words.
  `;
  
  return await generateContent(prompt, { temperature: 0.3 });
}
