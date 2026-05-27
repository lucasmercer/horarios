const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backup.json', 'utf8'));

const rawTurmas = data.turmas || [];
const parsedSchedules = data.schedules || {};

let expected = 0;
let expectedManha = 0;
let expectedTarde = 0;
let expectedNoite = 0;

rawTurmas.forEach((t) => {
  if (t.isRoom) return;
  const expectedCount = (t.dailyClassCount || 5) * 5;
  expected += expectedCount;
  
  const tName = (t.name || '').toLowerCase();
  const tShift = t.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
  
  if (tShift === 'manha') expectedManha += expectedCount;
  else if (tShift === 'tarde') expectedTarde += expectedCount;
  else if (tShift === 'noite') expectedNoite += expectedCount;
});

let distributed = 0;
let distManha = 0;
let distTarde = 0;
let distNoite = 0;
let distLabs = 0;

const teacherLoads = {};
const slotTeacherMap = {};
let conflictsCount = 0;

Object.keys(parsedSchedules).forEach((turmaId) => {
  const turmaObj = rawTurmas.find((t) => t.id === turmaId);
  if (!turmaObj) return;

  const isRoom = turmaObj.isRoom;
  const turmaSchedule = parsedSchedules[turmaId];
  
  Object.keys(turmaSchedule).forEach((slotKey) => {
    const slot = turmaSchedule[slotKey];
    if (slot && slot.teacherId && slot.subjectId) {
      
      if (isRoom) {
         distLabs++;
         
         // Fallback: Se a aula está apenas no laboratório mas pertence a uma turma, contamos para a turma
         if (slot.associatedTurmaId) {
           const assocTurma = rawTurmas.find((t) => t.id === slot.associatedTurmaId);
           if (assocTurma) {
             const isSameClass = parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.teacherId === slot.teacherId && 
                                 parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.subjectId === slot.subjectId;
             if (!isSameClass) {
               console.log("FALLBACK USED FOR ROOM SLOT", slotKey, slot);
               const tName = (assocTurma.name || '').toLowerCase();
               const tShift = assocTurma.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
               
               distributed++;
               if (tShift === 'manha') distManha++;
               else if (tShift === 'tarde') distTarde++;
               else if (tShift === 'noite') distNoite++;

               teacherLoads[slot.teacherId] = (teacherLoads[slot.teacherId] || 0) + 1;
               if (!slotTeacherMap[slotKey]) slotTeacherMap[slotKey] = new Set();
               if (slotTeacherMap[slotKey].has(slot.teacherId)) {
                 conflictsCount++;
               } else {
                 slotTeacherMap[slotKey].add(slot.teacherId);
               }
             }
           }
         }
         // --- Fim Fallback
         
      } else {
         const tName = (turmaObj.name || '').toLowerCase();
         const tShift = turmaObj.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');

         distributed++;
         if (tShift === 'manha') distManha++;
         else if (tShift === 'tarde') distTarde++;
         else if (tShift === 'noite') distNoite++;

         teacherLoads[slot.teacherId] = (teacherLoads[slot.teacherId] || 0) + 1;
        
         if (!slotTeacherMap[slotKey]) slotTeacherMap[slotKey] = new Set();
         if (slotTeacherMap[slotKey].has(slot.teacherId)) {
           conflictsCount++;
         } else {
           slotTeacherMap[slotKey].add(slot.teacherId);
         }
      }
    }
  });
});

console.log('Manha: exp', expectedManha, 'dist', distManha);
console.log('Tarde: exp', expectedTarde, 'dist', distTarde);
console.log('Noite: exp', expectedNoite, 'dist', distNoite);
let totalTardeSlots = 0;
// Lets count directly from tarde turmas
rawTurmas.filter(t => t.shift === 'tarde' && !t.isRoom).forEach(t => {
  const sched = parsedSchedules[t.id] || {};
  let count = Object.keys(sched).filter(key => sched[key] && sched[key].teacherId).length;
  console.log(t.name, count);
  totalTardeSlots += count;
});
console.log('totalTardeSlots (direct counts):', totalTardeSlots);

