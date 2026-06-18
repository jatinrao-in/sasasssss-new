const MSG91_API_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

export function normalizeIndianWhatsAppNumber(toNumber) {
  if (!toNumber) {
    throw new Error('No WhatsApp number');
  }
  const cleaned = String(toNumber)
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^91/, '');
  
  console.log('Original:', toNumber);
  console.log('Cleaned:', cleaned);

  if (cleaned.length !== 10) {
    const error = new Error(`Invalid number: ${toNumber} cleaned: ${cleaned} length: ${cleaned.length}`);
    error.statusCode = 400;
    throw error;
  }

  return `91${cleaned}`;
}

export function isMsg91Success(result) {
  if (result?.status === 'success' || result?.hasError === false) return true;
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

export async function sendTemplate(toNumber, templateName, variables) {
  const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
  const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER;

  if (!MSG91_AUTH_KEY) {
    throw new Error('MSG91_AUTH_KEY not configured');
  }
  if (!MSG91_INTEGRATED_NUMBER) {
    throw new Error('MSG91_INTEGRATED_NUMBER not configured');
  }

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

  console.log('Sending template:', templateName);
  console.log('To number:', phone);
  console.log('Variables:', variables);

  const response = await fetch(MSG91_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: MSG91_AUTH_KEY,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log('MSG91 raw response:', JSON.stringify(result));

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

export function handleConfigError(res, error) {
  if (error.message?.includes('MSG91_AUTH_KEY') || error.message?.includes('MSG91_INTEGRATED_NUMBER')) {
    res.status(500).json({ error: 'Server configuration error: Missing MSG91 config' });
    return true;
  }
  return false;
}

const S = (val) => String(val ?? '') || 'N/A';

export async function sendWelcomeMessage(toNumber, memberName, email, password, appURL) {
  console.log('sendWelcomeMessage skipped (welcome message disabled)');
  return {
    to: toNumber,
    template: 'welcome_message_v2',
    payload: {},
    result: { status: 'success', message: 'skipped' },
    sent: true
  };
}

export async function sendToolReturn(toNumber, memberName, toolName, issuedDate, daysSinceIssue) {
  return sendTemplate(toNumber, 'saya_tool_return', [S(memberName), S(toolName), S(issuedDate), S(daysSinceIssue)]);
}

export async function sendRgpReminder(toNumber, memberName, docNumber, fromCompany, toCompany, daysOpen) {
  return sendTemplate(toNumber, 'saya_rgp_reminder', [S(memberName), S(docNumber), S(fromCompany), S(toCompany), S(daysOpen)]);
}

export async function sendPaymentReminder(toNumber, memberName, clientName, invoiceNumber, pendingAmount) {
  return sendTemplate(toNumber, 'saya_payment_reminder', [S(memberName), S(clientName), S(invoiceNumber), S(pendingAmount)]);
}

export async function sendTaskAssigned(toNumber, memberName, taskName, projectName, deadline) {
  return sendTemplate(toNumber, 'saya_task_assigned', [S(memberName), S(taskName), S(projectName), S(deadline)]);
}

export async function sendTaskOverdue(toNumber, memberName, taskName, projectName, overdueDays) {
  return sendTemplate(toNumber, 'saya_task_overdue', [S(memberName), S(taskName), S(projectName), S(overdueDays)]);
}

export async function sendSalaryCredited(toNumber, memberName, netSalary, month, paidDate) {
  return sendTemplate(toNumber, 'saya_salary_credited', [S(memberName), S(netSalary), S(month), S(paidDate)]);
}

export async function sendDailyReminder(toNumber, memberName, pendingTasks, overdueTasks) {
  const pt = pendingTasks ?? 0;
  const ot = overdueTasks ?? 0;
  return sendTemplate(toNumber, 'saya_daily_reminder', [S(memberName), String(pt), String(ot)]);
}

export async function sendGeneralMessage(toNumber, memberName, summary) {
  return sendTemplate(toNumber, 'saya_general_message', [S(memberName), S(summary)]);
}

export async function sendToolAssigned(toNumber, memberName, toolName, issuedDate) {
  return sendTemplate(toNumber, 'saya_task_assigned', [S(memberName), S(toolName), 'Tool Department', S(issuedDate)]);
}

export async function sendViaMsg91(toNumber, message) {
  return sendGeneralMessage(toNumber, '', message);
}
