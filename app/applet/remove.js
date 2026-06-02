const fs = require('fs');
const path = './src/components/ScheduleGenerator.tsx';
let data = fs.readFileSync(path, 'utf8');
const startMatch = '  const handleLoadHealedBackup = async () => {\n';
const endMatch = '  interface LessonGroup {\n';
const startIndex = data.indexOf(startMatch);
const endIndex = data.indexOf(endMatch);
if (startIndex !== -1 && endIndex !== -1) {
  fs.writeFileSync(path, data.substring(0, startIndex) + endMatch + data.substring(endIndex + endMatch.length));
}
