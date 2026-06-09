import fs from 'fs';
console.log(fs.readdirSync('.'));
if (fs.existsSync('./src')) console.log(fs.readdirSync('./src'));
if (fs.existsSync('./src/components')) console.log(fs.readdirSync('./src/components'));
if (fs.existsSync('./src/layouts')) console.log(fs.readdirSync('./src/layouts'));
if (fs.existsSync('./src/lib')) console.log(fs.readdirSync('./src/lib'));
