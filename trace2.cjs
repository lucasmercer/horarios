const code = require('fs').readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
for (let i = 9384; i <= 9801; i++) {
  const line = lines[i] || '';
  
  let matches = [];
  const openRe = /<div[\s>]/g;
  const closeRe = /<\/div>/g;
  
  let match;
  while ((match = openRe.exec(line)) !== null) {
      matches.push({ type: 'open', index: match.index });
  }
  while ((match = closeRe.exec(line)) !== null) {
      matches.push({ type: 'close', index: match.index });
  }
  
  matches.sort((a,b) => a.index - b.index);
  
  for (let m of matches) {
      if (m.type === 'open') {
          stack.push(i);
      } else {
          if (stack.length === 0) {
              console.log(`Unmatched </div> at line ${i}`);
          } else {
              stack.pop();
          }
      }
  }
}
console.log("Unclosed divs opened at lines:", stack);
