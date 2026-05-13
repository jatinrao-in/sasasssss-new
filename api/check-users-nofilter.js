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

async function checkUsers() {
  const { db } = getAdminApp();
  const usersSnap = await db.collection('users').get();
      
  const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
  
  console.log(`Total Users in DB (No filters): ${allUsers.length}`);
  
  const activeUsers = allUsers.filter(u => u.status === 'active');
  console.log(`Total Active Users (manual filter): ${activeUsers.length}`);
  
  const activeAndNotHidden = activeUsers.filter(u => u.isHidden !== true);
  console.log(`Active & Not Hidden (manual filter): ${activeAndNotHidden.length}`);
  
  console.log("\nSample 3 users:");
  activeAndNotHidden.slice(0, 3).forEach(u => {
      console.log(`- ${u.name} | Role: ${u.role} | WhatsApp: ${u.whatsapp} | isHidden: ${u.isHidden}`);
  });
}

checkUsers().catch(console.error);
