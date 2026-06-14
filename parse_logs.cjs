const fs = require('fs');

const logPath = "C:/Users/RAO JATIN/.gemini/antigravity-ide/brain/d1d71e75-a33a-45e2-8a05-ae15047f38db/.system_generated/logs/transcript.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

let output = [];

lines.forEach((line, index) => {
  if (line.toLowerCase().includes('execute_browser_javascript') || line.toLowerCase().includes('console') || line.toLowerCase().includes('capture_browser_console_logs')) {
    output.push(`--- MATCH AT LINE ${index} ---`);
    output.push(line);
  }
});

fs.writeFileSync('C:/Users/RAO JATIN/OneDrive/sasasssss/scratch_logs.txt', output.join('\n\n'), 'utf8');
console.log('Done writing scratch_logs.txt');
