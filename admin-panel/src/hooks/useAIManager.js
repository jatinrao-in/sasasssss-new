import { useState, useCallback, useRef } from 'react';
import { generateContent, generateJSON, ChatSession } from '../lib/gemini';
import { useToast } from './useToast';

/**
 * Global AI Manager Hook
 * Provides high-level automated functions to React components.
 */
export function useAIManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  
  // Keep chat session persistent across re-renders but tied to component lifecycle
  const chatSessionRef = useRef(new ChatSession(
    "You are an intelligent AI assistant built into an ERP/CRM admin panel. Be concise, helpful, and professional. Always prioritize structured and actionable advice."
  ));

  /**
   * Smart Extract: Converts raw text (WhatsApp, Email) into structured form data.
   */
  const extractDataFromText = useCallback(async (rawText, expectedSchemaStr) => {
    setIsProcessing(true);
    try {
      const data = await generateJSON(rawText, expectedSchemaStr);
      toast.success("AI successfully extracted data!");
      return data;
    } catch (error) {
      toast.error("AI Extraction failed: " + error.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Generate AI Insights: Summarizes complex dashboard data into actionable bullets.
   */
  const generateInsights = useCallback(async (dashboardData) => {
    setIsProcessing(true);
    try {
      const prompt = `
Analyze the following system metrics and provide 3 short, actionable bullet points for the business owner. Focus on urgent issues (like pending tasks, overdue payments).

Data:
${JSON.stringify(dashboardData, null, 2)}
      `;
      const response = await generateContent(prompt, { temperature: 0.4 });
      return response;
    } catch (error) {
      console.error("Insight generation failed:", error);
      return "Unable to generate insights at this moment.";
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Draft Message: Generates professional follow-up messages based on context.
   */
  const draftMessage = useCallback(async (context, tone = "professional") => {
    setIsProcessing(true);
    try {
      const prompt = `
Draft a ${tone} WhatsApp/Email message based on this context:
${context}

Keep it concise, polite, and actionable. Do not include subject lines if it's for WhatsApp.
      `;
      const response = await generateContent(prompt, { temperature: 0.6 });
      return response.trim();
    } catch (error) {
      toast.error("Drafting failed: " + error.message);
      return "";
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Global Chat: Handles interactions with the AI assistant panel.
   */
  const askAssistant = useCallback(async (message) => {
    setIsProcessing(true);
    try {
      const reply = await chatSessionRef.current.sendMessage(message);
      return reply;
    } catch (error) {
      toast.error("Assistant error: " + error.message);
      return "Sorry, I encountered an error processing your request.";
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  /**
   * Clears the current chat session memory.
   */
  const clearChatMemory = useCallback(() => {
    chatSessionRef.current.clear();
  }, []);

  return {
    isProcessing,
    extractDataFromText,
    generateInsights,
    draftMessage,
    askAssistant,
    clearChatMemory
  };
}
