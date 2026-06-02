const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');

let attempts = 0;
while (attempts < 10) {
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    console.log("Success with", attempts, "extra divs removed!");
    fs.writeFileSync('src/components/ScheduleGenerator.tsx', code);
    process.exit(0);
  } catch (e) {
    if (e.message.includes('Expected corresponding JSX closing tag for <motion.div>')) {
      const lineMatch = e.message.match(/\((\d+):\d+\)/);
      if (lineMatch) {
         let lineNum = parseInt(lineMatch[1]) - 1;
         let lines = code.split('\n');
         console.log("Removing token at line", lineNum + 1, ":", lines[lineNum]);
         lines.splice(lineNum, 1);
         code = lines.join('\n');
         attempts++;
         continue;
      }
    }
    console.error("Different error:", e.message);
    break;
  }
}
