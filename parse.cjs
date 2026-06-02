const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("No syntax errors found by Babel!");
} catch (e) {
  console.error("Syntax Error:", e.message);
  console.error("Line:", e.loc.line, "Column:", e.loc.column);
}
