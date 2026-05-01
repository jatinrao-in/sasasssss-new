const fs = require('fs');
const path = require('path');

const basePath = path.join('admin-panel', 'src', 'pages');

const pages = [
  { file: 'EnquiryPage.jsx', fn: 'notifyEnquiryAssigned', addFn: 'addEnquiry' },
  { file: 'FollowupPage.jsx', fn: 'notifyFollowupAssigned', addFn: 'addFollowup' },
  { file: 'PaymentsPage.jsx', fn: 'notifyPaymentAssigned', addFn: 'addPayment' },
  { file: 'OutgoingPaymentsPage.jsx', fn: 'notifyPaymentAssigned', addFn: 'addOutgoingPayment' }, 
  { file: 'RgpChallanPage.jsx', fn: 'notifyRgpAssigned', addFn: 'addEntry' },
  { file: 'ToolAssignPage.jsx', fn: 'notifyToolAssigned', addFn: 'addTool' }
];

pages.forEach(page => {
  const filePath = path.join(basePath, page.file);
  if (!fs.existsSync(filePath)) {
    console.log('Not found:', filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Add import if not exists
  if (!content.includes(page.fn)) {
    const importStr = `import { ${page.fn} } from '../lib/notify';\n`;
    content = content.replace(
      /(import .*? from '..\/lib\/formatters';)/,
      `$1\n${importStr}`
    );
  }

  // Find the exact line: try { await addXXX(data); toast.success(...
  let regex = new RegExp(`try \\{ await ${page.addFn}\\(data\\); toast\\.success\\([^)]+\\); \\}`);
  if (!regex.test(content)) {
    // maybe OutgoingPaymentsPage uses different add function?
    if (page.file === 'OutgoingPaymentsPage.jsx') {
        regex = new RegExp(`try \\{ await addPayment\\(data\\); toast\\.success\\([^)]+\\); \\}`);
        if (regex.test(content)) page.addFn = 'addPayment';
    }
    if (page.file === 'RgpChallanPage.jsx') {
        regex = new RegExp(`try \\{ await addEntry\\(data\\); toast\\.success\\([^)]+\\); \\}`);
        if (regex.test(content)) page.addFn = 'addEntry';
    }
  }

  if (regex.test(content)) {
    const replacement = `try { 
    await ${page.addFn}(data); 
    if (data.assignedTo) {
      const member = members.find(m => m.id === data.assignedTo);
      if (member?.whatsapp) {
        try { await ${page.fn}(member, data); } catch (e) { console.error('Notify error:', e); }
      }
    }
    toast.success('${page.file.replace('Page.jsx', '')} added!'); 
  }`;
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Fixed', page.file);
  } else {
    console.log('Could not find match in', page.file, regex);
  }
});
