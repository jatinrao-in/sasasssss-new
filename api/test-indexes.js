import fs from 'fs';
import path from 'path';

// Parse .env.production.local manually
const envPath = path.resolve('../.env.production.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      val = val.replace(/\\r\\n/g, '').replace(/\\n/g, '\n');
      process.env[key] = val;
    }
  });
} else {
  console.log("Could not find .env.production.local");
}

import { getAdminApp } from './lib/firebaseAdmin.js';

async function testIndexes() {
  console.log("Testing Firestore Indexes...");
  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch (e) {
    console.error('Firebase init:', e.message);
    return;
  }
  const { db } = adminApp;
  const dummyUid = "test_user_id";

  const tests = [
    {
      name: "users (active, isHidden!=true)",
      query: db.collection('users').where('status', '==', 'active').where('isHidden', '!=', true)
    },
    {
      name: "tasks (assignedTo)",
      query: db.collection('tasks').where('assignedTo', '==', dummyUid)
    },
    {
      name: "followups (assignedTo, status)",
      query: db.collection('followups').where('assignedTo', '==', dummyUid).where('status', '==', 'open')
    },
    {
      name: "enquiries (assignedTo, status)",
      query: db.collection('enquiries').where('assignedTo', '==', dummyUid).where('status', '==', 'open')
    },
    {
      name: "payments (assignedTo, paymentStatus!=received)",
      query: db.collection('payments').where('assignedTo', '==', dummyUid).where('paymentStatus', '!=', 'received')
    },
    {
      name: "rgp (assignedTo, status)",
      query: db.collection('rgp').where('assignedTo', '==', dummyUid).where('status', '==', 'open')
    }
  ];

  for (const t of tests) {
    try {
      await t.query.limit(1).get();
      console.log(`✅ ${t.name}: SUCCESS`);
    } catch (e) {
      if (e.message.includes('requires an index')) {
        console.log(`❌ ${t.name}: MISSING INDEX`);
        const linkMatch = e.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        if (linkMatch) {
          console.log(`\nLINK: ${linkMatch[0]}\n`);
        } else {
          console.log(`Error: ${e.message}`);
        }
      } else {
        console.log(`❌ ${t.name}: OTHER ERROR: ${e.message}`);
      }
    }
  }
  console.log("Done testing.");
}

testIndexes();
