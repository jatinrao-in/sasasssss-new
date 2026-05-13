import { getAdminApp } from './lib/firebaseAdmin.js';
import fs from 'fs';
import path from 'path';

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
}

async function checkLogs() {
  const { db } = getAdminApp();
  const logsSnap = await db.collection('whatsapp_logs')
    .orderBy('sentAt', 'desc')
    .limit(5)
    .get();

  if (logsSnap.empty) {
    console.log("No logs found in whatsapp_logs collection.");
  } else {
    logsSnap.forEach(doc => {
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
}

checkLogs().catch(console.error);
