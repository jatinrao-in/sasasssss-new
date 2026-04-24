import { useState } from 'react';
import { suggestTaskAssignment, suggestDeadline, draftWhatsAppMessage } from '../lib/api';

/**
 * Hook for calling Gemini AI for Task assignments and deadlines.
 * Replaced Cloud Functions and client-side Gemini to use Vercel Serverless.
 */
export function useAI() {
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [deadlineLoading, setDeadlineLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  /**
   * Get AI suggestion for best team member to assign a task to.
   * @param {string} taskDescription - Description or title of the task
   * @param {Array} teamMembers - Array of active team members
   * @returns {{ suggestedMember: string, reason: string, confidence: string } | null}
   */
  const getAssignmentSuggestion = async (taskDescription, teamMembers) => {
    if (!taskDescription || taskDescription.trim().length < 3) return null;
    setAssignmentLoading(true);
    try {
      const response = await suggestTaskAssignment(taskDescription, teamMembers);
      return response.suggestion;
    } catch (err) {
      console.error('[useAI] Assignment suggestion error:', err.message);
      return null;
    } finally {
      setAssignmentLoading(false);
    }
  };

  /**
   * Get AI suggestion for a realistic task deadline.
   * @param {string} taskDescription - Description or title of the task
   * @param {string} projectId - Project ID for context
   * @returns {{ suggestedDate: string, estimatedDays: number, reason: string } | null}
   */
  const getDeadlineSuggestion = async (taskDescription, projectId) => {
    if (!taskDescription || taskDescription.trim().length < 3) return null;
    setDeadlineLoading(true);
    try {
      const response = await suggestDeadline(taskDescription, projectId);
      return response.suggestion;
    } catch (err) {
      console.error('[useAI] Deadline suggestion error:', err.message);
      return null;
    } finally {
      setDeadlineLoading(false);
    }
  };

  /**
   * Get AI-drafted WhatsApp message for a given context.
   */
  const getDraftMessage = async (context) => {
    setDraftLoading(true);
    try {
      const response = await draftWhatsAppMessage(context);
      return response;
    } catch (err) {
      console.error('[useAI] Draft message error:', err.message);
      return null;
    } finally {
      setDraftLoading(false);
    }
  };

  return {
    getAssignmentSuggestion,
    getDeadlineSuggestion,
    getDraftMessage,
    assignmentLoading,
    deadlineLoading,
    draftLoading,
  };
}
