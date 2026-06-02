const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');

let attempts = 0;
while (attempts < 10) {
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    console.log("Success with", attempts, "fixes!");
    fs.writeFileSync('src/components/ScheduleGenerator.tsx', code);
    process.exit(0);
  } catch (e) {
    const lineMatch = e.message.match(/\((\d+):\d+\)/);
    if (!lineMatch) { console.error("No line:", e.message); break; }
    let lineNum = parseInt(lineMatch[1]) - 1;
    let lines = code.split('\n');

    if (e.message.includes('Expected corresponding JSX closing tag for <motion.div>')) {
         console.log("Removing token at line", lineNum + 1, ":", lines[lineNum]);
         lines.splice(lineNum, 1);
         code = lines.join('\n');
         attempts++;
         continue;
    } else if (e.message.includes('Expected corresponding JSX closing tag for <div>')) {
         console.log("Adding </div> at line", lineNum + 1);
         lines.splice(lineNum, 0, "</div>");
         code = lines.join('\n');
         attempts++;
         continue;
    } else if (e.message.includes('JSX value should be either an expression or a quoted JSX text')) {
         break;
    }
    
    console.error("Different error:", e.message);
    break;
  }
}
