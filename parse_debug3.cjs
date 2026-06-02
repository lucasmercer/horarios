const fs = require('fs');
const code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
for (let i = 0; i <= lines.length; i++) {
  const line = lines[i] || '';
  
  if (line.includes('<AnimatePresence>')) {
      stack.push(i+1);
  }
  if (line.includes('</AnimatePresence>')) {
      let popped = stack.pop();
      console.log(`AnimatePresence opened at ${popped} closed at ${i+1}`);
  }
}
if(stack.length > 0) console.log("Unclosed AnimatePresence:", stack);
