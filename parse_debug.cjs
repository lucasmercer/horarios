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
      // Remove from div matches if any overlap
      matches = matches.filter(m => !(m.type === 'open' && m.tag === 'div' && m.index === match.index + 7));
  }
  while ((match = closeRe.exec(line)) !== null) {
      matches.push({ type: 'close', index: match.index, tag: 'div' });
  }
  while ((match = closeMotionRe.exec(line)) !== null) {
      matches.push({ type: 'close', index: match.index, tag: 'motion.div' });
      // Remove from div matches if any overlap
      matches = matches.filter(m => !(m.type === 'close' && m.tag === 'div' && m.index === match.index + 8));
  }
  
  matches.sort((a,b) => a.index - b.index);
  
  for (let m of matches) {
      if (m.type === 'open') {
          stack.push({ line: i + 1, tag: m.tag });
      } else {
          if (stack.length === 0) {
              console.log(`Unmatched </${m.tag}> at line ${i + 1}`);
          } else {
              let popped = stack.pop();
              if (popped.tag !== m.tag) {
                 console.log(`Tag mismatch at ${i + 1}: expected </${popped.tag}> from line ${popped.line} but found </${m.tag}>`);
                 // to recover
                 stack.push(popped);
              }
          }
      }
  }
}
console.log("Unclosed opened at lines:", stack);
