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
          if (stack.length === 0) {
          } else {
              let popped = stack.pop();
              if (popped === 9432) console.log("9432 (flex-1 flex) closed at", i + 1);
              if (popped === 9470) console.log("9470 (Form side) closed at", i + 1);
              if (popped === 9471) console.log("9471 (Grid) closed at", i + 1);
          }
      }
  }
}
