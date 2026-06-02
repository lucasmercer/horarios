const fs = require('fs');
const code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
for (let i = 9383; i <= 9801; i++) {
  const line = lines[i] || '';
  
  let matches = [];
  const openRe = /<div[\s>]/g;
  const openMotionRe = /<motion\.div[\s>]/g;
  const closeRe = /<\/div>/g;
  const closeMotionRe = /<\/motion\.div>/g;
  
  let match;
  while ((match = openRe.exec(line)) !== null) {
      matches.push({ type: 'open', index: match.index, tag: 'div' });
  }
  while ((match = openMotionRe.exec(line)) !== null) {
      matches.push({ type: 'open', index: match.index, tag: 'motion.div' });
      matches = matches.filter(m => !(m.type === 'open' && m.tag === 'div' && m.index === match.index + 7));
  }
  while ((match = closeRe.exec(line)) !== null) {
      matches.push({ type: 'close', index: match.index, tag: 'div' });
  }
  while ((match = closeMotionRe.exec(line)) !== null) {
      matches.push({ type: 'close', index: match.index, tag: 'motion.div' });
      matches = matches.filter(m => !(m.type === 'close' && m.tag === 'div' && m.index === match.index + 8));
  }
  
  matches.sort((a,b) => a.index - b.index);
  
  for (let m of matches) {
      if (m.type === 'open') {
          stack.push({ line: i + 1, tag: m.tag });
      } else {
          if (stack.length > 0) {
              let popped = stack.pop();
              if (popped.line === 9386) console.log("9386 (motion.div) closed at", i + 1, "by tag", m.tag);
              if (popped.line === 9385) console.log("9385 (modal wrapper div) closed at", i + 1, "by tag", m.tag);
              if (popped.line === 9432) console.log("9432 (flex-1 flex) closed at", i + 1, "by tag", m.tag);
              if (popped.line === 9470) console.log("9470 (Form side) closed at", i + 1, "by tag", m.tag);
          }
      }
  }
}
