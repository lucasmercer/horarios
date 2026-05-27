const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/components/test_backup.json', 'utf8'));

const rawTurmas = data.turmas;
const parsedSchedules = data.schedules;

let distributed = 0;
let distManha = 0;
let distTarde = 0;
let distNoite = 0;

Object.keys(parsedSchedules).forEach((turmaId) => {
  const turmaObj = rawTurmas.find((t) => t.id === turmaId);
  if (!turmaObj) return;

  const isRoom = turmaObj.isRoom;
  const turmaSchedule = parsedSchedules[turmaId];
  
  Object.keys(turmaSchedule).forEach((slotKey) => {
    const slot = turmaSchedule[slotKey];
    if (slot && slot.teacherId && slot.subjectId) {
      if (isRoom) {
         if (slot.associatedTurmaId) {
           const assocTurma = rawTurmas.find((t) => t.id === slot.associatedTurmaId);
           if (assocTurma) {
             const isSameClass = parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.teacherId === slot.teacherId && 
                                 parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.subjectId === slot.subjectId;
             if (!isSameClass) {
               const tName = (assocTurma.name || '').toLowerCase();
               const tShift = assocTurma.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
               
               distributed++;
               if (tShift === 'manha') distManha++;
               else if (tShift === 'tarde') distTarde++;
               else if (tShift === 'noite') distNoite++;
             }
           }
         }
      } else {
         const tName = (turmaObj.name || '').toLowerCase();
         const tShift = turmaObj.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
         
         distributed++;
         if (tShift === 'manha') distManha++;
         else if (tShift === 'tarde') distTarde++;
         else if (tShift === 'noite') distNoite++;
      }
    }
  });
});

console.log('Manha:', distManha);
console.log('Tarde:', distTarde);
