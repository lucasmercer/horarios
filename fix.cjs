const fs = require('fs');
const code = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

// Remove extra </div> at 9798 (which is index 9797)
lines.splice(9797, 1);

// Add <AnimatePresence> before {isShowingMissingClasses && ( at 9803 (now index 9802 because 9798 was removed)
lines.splice(9802, 0, '      <AnimatePresence>');

fs.writeFileSync('src/components/ScheduleGenerator.tsx', lines.join('\n'));
