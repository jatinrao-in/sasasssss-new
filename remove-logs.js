import fs from 'fs';
import path from 'path';

const files = [
  'admin-panel/src/App.jsx',
  'admin-panel/src/hooks/useAuth.jsx',
  'admin-panel/src/lib/notify.js',
  'admin-panel/src/lib/secureApi.js',
  'admin-panel/src/pages/SettingsPage.jsx',
  'admin-panel/src/pages/WhatsAppAutomationPage.jsx',
  'api/admin/cleanup-users.js',
  'api/cron/send-reminders.js',
  'api/delete-member.js',
  'api/notify.js',
  'team-member-pwa/src/hooks/useTools.js',
  'team-member-pwa/src/lib/firestoreDebug.js',
  'team-member-pwa/src/lib/notify.js',
  'team-member-pwa/src/lib/secureApi.js',
  'team-member-pwa/src/lib/soundPlayer.js'
];

files.forEach(f => {
  const filePath = path.resolve(f);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/console\.log/g, '(function(){})');
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned ${f}`);
  }
});
