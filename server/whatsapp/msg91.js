import { handleConfigError, requireEnv } from '../config.js';

const MSG91_API_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

// ─── Phone normalisation ────────────────────────────────────────────────────

export function normalizeIndianWhatsAppNumber(toNumber) {
  const digits = String(toNumber ?? '')
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^91/, '');

  if (digits.length !== 10) {
    const error = new Error(`Invalid phone number: ${toNumber} (must be 10 digits after stripping country code)`);
    error.statusCode = 400;
    throw error;
  }

  return `91${digits}`;
}

// ─── Success detection ──────────────────────────────────────────────────────

export function isMsg91Success(result) {
  // MSG91 v5 API returns { status: 'success', hasError: false, data: {...} }
  if (result?.status === 'success' || result?.hasError === false) return true;
  // Legacy fallback: { type: 'success' } or { message: '...success...' }
  const type = String(result?.type || '').toLowerCase();
  const message = String(result?.message || '').toLowerCase();
  return type === 'success' || message.includes('success');
}

function isMsg91ApiSecurityError(result) {
  return String(result?.apiError || '').trim() === '418';
}

function resolveMsg91ErrorMessage(result) {
  if (isMsg91ApiSecurityError(result)) {
    return 'MSG91 API security blocked the request. Whitelist the Vercel egress IP in MSG91 Authkey settings or disable API Security for this auth key.';
  }
  const providerMessage = String(result?.errors || result?.message || '').trim();
  return providerMessage ? `MSG91 request failed: ${providerMessage}` : 'MSG91 request failed';
}

// ─── Core template sender ───────────────────────────────────────────────────

async function sendTemplate(toNumber, templateName, variables) {
  const { MSG91_AUTH_KEY, MSG91_INTEGRATED_NUMBER } = requireEnv(['MSG91_AUTH_KEY', 'MSG91_INTEGRATED_NUMBER']);

  const phone = normalizeIndianWhatsAppNumber(toNumber);

  const payload = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: variables.map((v) => ({ type: 'text', text: String(v ?? '') })),
          },
        ],
      },
      to: phone,
    },
  };

  console.log('MSG91 sending:', { template: templateName, to: phone, variables });

  const response = await fetch(MSG91_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: MSG91_AUTH_KEY,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log('MSG91 response:', result);

  if (!response.ok) {
    const error = new Error(resolveMsg91ErrorMessage(result));
    error.statusCode = isMsg91ApiSecurityError(result) ? 502 : (response.status || 502);
    error.providerResponse = result;
    error.providerStatus = response.status || 502;
    throw error;
  }

  return {
    to: phone,
    template: templateName,
    payload,
    result,
    sent: isMsg91Success(result),
  };
}

// ─── Template-specific helpers ──────────────────────────────────────────────

const S = (val) => String(val ?? '') || 'N/A';

/**
 * 1. welcome_message — {{1}}name {{2}}email {{3}}password {{4}}appURL
 */
export async function sendWelcomeMessage(toNumber, memberName, email, password, appURL) {
  return sendTemplate(toNumber, 'welcome_message', [S(memberName), S(email), S(password), S(appURL)]);
}

/**
 * 2. tool_return — {{1}}name {{2}}toolName {{3}}issuedDate {{4}}daysSinceIssue
 */
export async function sendToolReturn(toNumber, memberName, toolName, issuedDate, daysSinceIssue) {
  return sendTemplate(toNumber, 'tool_return', [S(memberName), S(toolName), S(issuedDate), S(daysSinceIssue)]);
}

/**
 * 3. rgp_reminder — {{1}}name {{2}}docNumber {{3}}fromCompany {{4}}toCompany {{5}}daysOpen
 */
export async function sendRgpReminder(toNumber, memberName, docNumber, fromCompany, toCompany, daysOpen) {
  return sendTemplate(toNumber, 'rgp_reminder', [S(memberName), S(docNumber), S(fromCompany), S(toCompany), S(daysOpen)]);
}

/**
 * 4. payment_reminder — {{1}}name {{2}}clientName {{3}}invoiceNumber {{4}}pendingAmount
 */
export async function sendPaymentReminder(toNumber, memberName, clientName, invoiceNumber, pendingAmount) {
  return sendTemplate(toNumber, 'payment_reminder', [S(memberName), S(clientName), S(invoiceNumber), S(pendingAmount)]);
}

/**
 * 5. task_assigned — {{1}}name {{2}}taskName {{3}}projectName {{4}}deadline
 */
export async function sendTaskAssigned(toNumber, memberName, taskName, projectName, deadline) {
  return sendTemplate(toNumber, 'task_assigned', [S(memberName), S(taskName), S(projectName), S(deadline)]);
}

/**
 * 6. task_overdue — {{1}}name {{2}}taskName {{3}}projectName {{4}}overdueDays
 */
export async function sendTaskOverdue(toNumber, memberName, taskName, projectName, overdueDays) {
  return sendTemplate(toNumber, 'task_overdue', [S(memberName), S(taskName), S(projectName), S(overdueDays)]);
}

/**
 * 7. salary_credited — {{1}}name {{2}}netSalary {{3}}month {{4}}paidDate
 */
export async function sendSalaryCredited(toNumber, memberName, netSalary, month, paidDate) {
  return sendTemplate(toNumber, 'salary_credited', [S(memberName), S(netSalary), S(month), S(paidDate)]);
}

/**
 * 8. daily_reminder — {{1}}name {{2}}pendingTasks {{3}}overdueTasks
 */
export async function sendDailyReminder(toNumber, memberName, pendingTasks, overdueTasks) {
  // Never send null/undefined. Default to "0" if falsy but allow "0".
  const pt = pendingTasks ?? 0;
  const ot = overdueTasks ?? 0;
  return sendTemplate(toNumber, 'daily_reminder', [S(memberName), String(pt), String(ot)]);
}

/**
 * 9. general_message — {{1}}name {{2}}summary
 */
export async function sendGeneralMessage(toNumber, memberName, summary) {
  return sendTemplate(toNumber, 'general_message', [S(memberName), S(summary)]);
}

export { handleConfigError };
