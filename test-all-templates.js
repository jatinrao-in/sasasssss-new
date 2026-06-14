import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

import {
  sendWelcomeMessage,
  sendTaskAssigned,
  sendTaskOverdue,
  sendSalaryCredited,
  sendToolReturn,
  sendRgpReminder,
  sendPaymentReminder,
  sendDailyReminder,
  sendGeneralMessage
} from './api/lib/msg91.js';

async function testAll() {
  const phone = '9306018924';
  const name = 'Test User';
  const responses = [];

  console.log('Starting template test to:', phone);

  try {
    responses.push(await sendWelcomeMessage(phone, name, 'test@example.com', 'ask admin', 'sasasssss-one.vercel.app'));
    responses.push(await sendTaskAssigned(phone, name, 'Test Task', 'Test Project', '31 Dec 2026'));
    responses.push(await sendTaskOverdue(phone, name, 'Test Task', 'Test Project', 5));
    responses.push(await sendSalaryCredited(phone, name, 50000, 'December', '01 Jan 2027'));
    responses.push(await sendToolReturn(phone, name, 'Drill Machine', '01 Dec 2026', 31));
    responses.push(await sendRgpReminder(phone, name, 'RGP-123', 'MyCompany', 'TheirCompany', 16));
    responses.push(await sendPaymentReminder(phone, name, 'Test Client', 'INV-001', 25000));
    responses.push(await sendDailyReminder(phone, name, 3, 1));
    responses.push(await sendGeneralMessage(phone, name, 'Test Summary string goes here'));

    console.log('\n--- Test Results ---');
    responses.forEach((res, index) => {
      console.log(`Template ${res.template}: ${res.success ? 'SUCCESS' : 'FAILED'} - MSG91 Status: ${res.response?.status || 'Unknown'}`);
    });

  } catch (e) {
    console.error('Error running test:', e.message);
  }
}

testAll();
