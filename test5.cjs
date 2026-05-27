const backup = require('./src/components/test_backup.json');

const rawTurmas = backup.turmas;
const parsedSchedules = backup.schedules;
const fs = require('fs');

let distTarde = 0;
rawTurmas.forEach(t => {
   if (t.shift === 'tarde') {
      const sched = parsedSchedules[t.id] || {};
      const count = Object.keys(sched).length;
      console.log(t.name, count);
      distTarde += count;
   }
});
console.log('Total Tarde classes in backup:', distTarde);
