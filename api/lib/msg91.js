const MSG91_URL =
  'https://api.msg91.com/api/v5/whatsapp/' +
  'whatsapp-outbound-message/';

const cleanPhone = (number) => {
  if (!number) throw new Error(
    'WhatsApp number missing'
  );
  const cleaned = String(number)
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .replace(/^91/, '');
  if (cleaned.length !== 10) throw new Error(
    `Invalid number: ${number}`
  );
  return `91${cleaned}`;
};

const sendTemplate = async (
  toNumber, templateName, variables
) => {
  const phone = cleanPhone(toNumber);

  // Ensure all variables are strings
  const params = variables.map(v =>
    String(v || '0')
  );

  const payload = {
    integrated_number:
      process.env.MSG91_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: params.map(p => ({
            type: 'text',
            text: p
          }))
        }]
      },
      to: phone
    }
  };

  console.log('MSG91 sending:', {
    template: templateName,
    to: phone,
    variables: params
  });

  const response = await fetch(
    MSG91_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authkey': process.env.MSG91_AUTH_KEY
      },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  console.log('MSG91 result:', result);

  return {
    success: result.status === 'success',
    response: result,
    phone,
    template: templateName
  };
};

// All 9 template functions:

export const sendWelcomeMessage = (
  phone, name, email, password, url
) => sendTemplate(phone, 'welcome_message',
  [name, email, password, url]);

export const sendTaskAssigned = (
  phone, name, task, project, deadline
) => sendTemplate(phone, 'task_assigned',
  [name, task, project, deadline]);

export const sendTaskOverdue = (
  phone, name, task, project, days
) => sendTemplate(phone, 'task_overdue',
  [name, task, project, String(days)]);

export const sendSalaryCredited = (
  phone, name, amount, month, date
) => sendTemplate(phone, 'salary_credited',
  [name, String(amount), month, date]);

export const sendToolReturn = (
  phone, name, tool, issuedDate, days
) => sendTemplate(phone, 'tool_return',
  [name, tool, issuedDate, String(days)]);

export const sendRgpReminder = (
  phone, name, docNo,
  fromCo, toCo, days
) => sendTemplate(phone, 'rgp_reminder',
  [name, docNo, fromCo, toCo, String(days)]);

export const sendPaymentReminder = (
  phone, name, customer, invoice, amount
) => sendTemplate(phone, 'payment_reminder',
  [name, customer, invoice, String(amount)]);

export const sendDailyReminder = (
  phone, name, pending, overdue
) => sendTemplate(phone, 'daily_reminder',
  [name, String(pending), String(overdue)]);

export const sendGeneralMessage = (
  phone, name, summary
) => sendTemplate(phone, 'general_message',
  [name, String(summary)]);

export default sendTemplate;
