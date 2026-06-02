const code = require('fs').readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
for (let i = 9383; i <= 9801; i++) {
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
          stack.push(i + 1);
      } else {
          if (stack.length > 0) {
              let popped = stack.pop();
              if (i + 1 === 9467) console.log(`Line 9467 closed: ${popped}`);
          }
      }
  }
}
