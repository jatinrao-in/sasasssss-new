import { useState, useCallback } from 'react';
import { generateJSON } from '../lib/gemini';
import { useAIContext } from '../context/AIContext';

/**
 * Hook to provide smart auto-fill suggestions for forms.
 * @param {string} formName - The name of the form (e.g. 'EnquiryForm')
 * @returns {Object} { getPredictions, suggestions, isPredicting, clearSuggestions }
 */
export function useAIPredict(formName) {
  const [suggestions, setSuggestions] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const { pageContext } = useAIContext();

  /**
   * Generates field predictions based on current form state.
   * @param {Object} currentFormState - The partial form data the user has typed so far
   * @param {string} targetFieldsSchema - Schema of what we want predicted
   */
  const getPredictions = useCallback(async (currentFormState, targetFieldsSchema) => {
    // Only predict if there is enough data to guess from
    const values = Object.values(currentFormState).filter(v => typeof v === 'string' && v.trim().length > 0);
    if (values.length === 0) return;

    setIsPredicting(true);
    
    const prompt = `
      Context: User is filling out ${formName}.
      Current Page Data: ${JSON.stringify(pageContext.data || {})}
      Current Form State: ${JSON.stringify(currentFormState)}
    `;

    const schemaInstruction = `
      Based on the current form state, predict the most likely values for remaining fields.
      Output an array of suggestion objects.
      Schema:
      [
        {
          "field_name": "string (key from form state)",
          "suggested_value": "string or number",
          "confidence": "number (0 to 1, e.g. 0.95)"
        }
      ]
      Only suggest fields present in this target schema: ${targetFieldsSchema}
      Provide maximum 3 high-confidence suggestions.
    `;

    try {
      const result = await generateJSON(prompt, schemaInstruction);
      if (Array.isArray(result)) {
        // Filter out low confidence suggestions
        const highConfidence = result.filter(r => r.confidence >= 0.7);
        setSuggestions(highConfidence);
      }
    } catch (err) {
      console.error("[useAIPredict] Failed:", err);
    } finally {
      setIsPredicting(false);
    }
  }, [formName, pageContext]);

  const clearSuggestions = () => setSuggestions([]);

  return { getPredictions, suggestions, isPredicting, clearSuggestions };
}
