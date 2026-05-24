const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');

// Replace incrementVersion();
content = content.replace(/[ \t]*incrementVersion\(\);\n/g, '');

// Replace the definition
content = content.replace(/[ \t]*const incrementVersion = \(\) => setVersion\(v => v \+ 1\);\n/, '');

// Fix version to 74 on init
content = content.replace(/useState<number>\(73\);/g, 'useState<number>(74);');
content = content.replace(/setVersion\(v <= 72 \? 73 : v\);/g, 'setVersion(74);');
content = content.replace(/setVersion\(73\);/g, 'setVersion(74);');
content = content.replace(/setVersion\(v <= 71 \? 72 : v\);/g, 'setVersion(74);');
content = content.replace(/setVersion\(72\);/g, 'setVersion(74);');

content = content.replace(/setVersion\(prev => \(data\.version \|\| prev\) \+ 1\);/g, 'setVersion(74);');

fs.writeFileSync('src/components/ScheduleGenerator.tsx', content);
