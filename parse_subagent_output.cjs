const fs = require('fs');

const logPath = "C:/Users/RAO JATIN/.gemini/antigravity-ide/brain/d1d71e75-a33a-45e2-8a05-ae15047f38db/.system_generated/logs/transcript.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 839) {
      console.log('Found Step 839!');
      fs.writeFileSync('C:/Users/RAO JATIN/OneDrive/sasasssss/subagent_full_log.txt', data.content, 'utf8');
      console.log('Wrote subagent log to subagent_full_log.txt');
    }
  } catch (err) {
    // ignore
  }
}
