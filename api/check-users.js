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
  const usersSnap = await db.collection('users')
      .where('status', '==', 'active')
      .where('isHidden', '!=', true)
      .get();
      
  const allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
  
  console.log(`Total Active Users Found: ${allUsers.length}`);
  
  const roles = {};
  allUsers.forEach(u => {
      roles[u.role] = (roles[u.role] || 0) + 1;
  });
  console.log('Roles breakdown:', roles);
  
  const members = allUsers.filter(u => u.role === 'member');
  console.log(`\nUsers with role === 'member': ${members.length}`);
  
  if (members.length > 0) {
      members.forEach(m => {
          console.log(`- ${m.name} | WhatsApp: ${m.whatsapp ? m.whatsapp : 'MISSING'}`);
      });
  } else {
      console.log("\nLet's check what roles exist in the DB for other users:");
      allUsers.slice(0, 5).forEach(u => {
          console.log(`- ${u.name} | Role: ${u.role} | WhatsApp: ${u.whatsapp}`);
      });
  }
}

checkUsers().catch(console.error);
