const fs = require('fs');
const lines = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf-8').split('\n');
const newLines = lines.filter((_, i) => i < 2280 || i > 3011);
fs.writeFileSync('src/components/ScheduleGenerator.tsx', newLines.join('\n'));
