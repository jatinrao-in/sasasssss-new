import axios from 'axios';

const AUTH_KEY = process.env.MSG91_AUTH_KEY;

export async function sendViaMsg91(to, message) {
  if (!AUTH_KEY) {
    throw new Error('MSG91_AUTH_KEY not configured');
  }
  
  // Basic SMS/WhatsApp implementation
  // This is a placeholder for the actual MSG91 API call
  console.log(`Sending to ${to}: ${message}`);
  
  return {
    success: true,
    sent: true,
    to,
    result: { message: 'Placeholder success' }
  };
}

export function handleConfigError(res, error) {
  if (error.message?.includes('MSG91_AUTH_KEY')) {
    res.status(500).json({ error: 'Server configuration error: Missing MSG91 key' });
    return true;
  }
  return false;
}

// Add the other exports expected by notify.js
export const sendGeneralMessage = async (to, memberName, message) => sendViaMsg91(to, message);
export const sendTaskAssigned = async (to, memberName, taskName, projectName, deadline) => sendViaMsg91(to, `Task ${taskName} assigned`);
export const sendTaskOverdue = async (to, memberName, taskName, projectName, days) => sendViaMsg91(to, `Task ${taskName} overdue`);
export const sendSalaryCredited = async (to, memberName, amount, month, date) => sendViaMsg91(to, `Salary of ${amount} credited`);
export const sendPaymentReminder = async (to, memberName, customer, invoice, amount) => sendViaMsg91(to, `Payment reminder for ${customer}`);
export const sendRgpReminder = async (to, memberName, doc, from, toComp, days) => sendViaMsg91(to, `RGP reminder ${doc}`);
export const sendToolReturn = async (to, memberName, tool, date, days) => sendViaMsg91(to, `Tool return reminder ${tool}`);
export const sendDailyReminder = async (to, memberName, pending, overdue) => sendViaMsg91(to, `Daily reminder: ${pending} pending`);
