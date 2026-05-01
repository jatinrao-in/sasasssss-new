const fs = require('fs');

let c = fs.readFileSync('admin-panel/src/pages/ToolAssignPage.jsx', 'utf8');
c = c.replace(
  /import \{ formatDate \} from '\.\.\/lib\/formatters';/, 
  "import { formatDate } from '../lib/formatters';\nimport { notifyToolAssigned } from '../lib/notify';"
);
c = c.replace(
  /const handleAssign = async \(data\) => \{\s+try \{\s+await assignTool\(data\);\s+toast\.success\('Tool assigned!'\);\s+\} catch \(err\) \{ toast\.error\('Failed: ' \+ err\.message\); throw err; \}\s+\};/, 
  ` const handleAssign = async (data) => {\n try {\n await assignTool(data);\n if (data.assignedTo) {\n   const member = members.find(m => m.id === data.assignedTo);\n   if (member?.whatsapp) {\n     try {\n       await notifyToolAssigned(member, data);\n     } catch (e) {}\n   }\n }\n toast.success('Tool assigned!');\n } catch (err) { toast.error('Failed: ' + err.message); throw err; }\n };`
);
fs.writeFileSync('admin-panel/src/pages/ToolAssignPage.jsx', c);

let r = fs.readFileSync('admin-panel/src/pages/RgpChallanPage.jsx', 'utf8');
r = r.replace(
  /import \{ formatDate, formatCurrency \} from '\.\.\/lib\/formatters';/, 
  "import { formatDate, formatCurrency } from '../lib/formatters';\nimport { notifyRgpAssigned } from '../lib/notify';"
);
r = r.replace(
  /const handleAdd = async \(data\) => \{\s+try \{\s*await addRgpChallan\(data\);\s*toast\.success\('Record added!'\);\s*\}\s*catch \(err\) \{\s*toast\.error\('Failed: ' \+ err\.message\);\s*throw err;\s*\}\s*\};/, 
  ` const handleAdd = async (data) => {\n  try {\n   await addRgpChallan(data);\n   if (data.assignedTo) {\n     const member = members.find(m => m.id === data.assignedTo);\n     if (member?.whatsapp) {\n       try {\n         await notifyRgpAssigned(member, data);\n       } catch (e) { console.error('Notify error:', e); }\n     }\n   }\n   toast.success('Record added!');\n  } catch (err) {\n   toast.error('Failed: ' + err.message);\n   throw err;\n  }\n };`
);
fs.writeFileSync('admin-panel/src/pages/RgpChallanPage.jsx', r);
console.log('Fixed ToolAssignPage.jsx and RgpChallanPage.jsx');
