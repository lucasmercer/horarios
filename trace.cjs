const code = require('fs').readFileSync('src/components/ScheduleGenerator.tsx', 'utf8');
const lines = code.split('\n');

let stack = [];
for (let i = 9384; i <= 9801; i++) {
  const line = lines[i] || '';
  
  let temp = line;
  while(true) {
     let openMatch = temp.indexOf('<div');
     let closeMatch = temp.indexOf('</div');
     
     if (openMatch === -1 && closeMatch === -1) break;
     
     if (openMatch !== -1 && (closeMatch === -1 || openMatch < closeMatch)) {
         stack.push(i);
         temp = temp.slice(openMatch + 4);
     } else {
         if (stack.length === 0) {
            console.log(`Unmatched </div> at line ${i}`);
         } else {
            stack.pop();
         }
         temp = temp.slice(closeMatch + 5);
     }
  }
}
console.log("Unclosed divs opened at lines:", stack);
