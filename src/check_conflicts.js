const fs = require('fs');

const data = JSON.parse(fs.readFileSync('backup.json', 'utf8'));

let conflicts = [];
const slotTeacherMap = {};
const turmas = data.turmas;
Object.keys(data.schedules).forEach(turmaId => {
  const isRoom = turmas.find(t => t.id === turmaId)?.isRoom;
  if (isRoom) return;

  const turmaSchedule = data.schedules[turmaId];
  Object.keys(turmaSchedule).forEach((slotKey) => {
    const slot = turmaSchedule[slotKey];
    if (slot && slot.teacherId && slot.subjectId) {
       if (!slotTeacherMap[slotKey]) slotTeacherMap[slotKey] = [];
       slotTeacherMap[slotKey].push({ teacherId: slot.teacherId, turmaId });
    }
  });
});

Object.keys(slotTeacherMap).forEach(slotKey => {
   const classes = slotTeacherMap[slotKey];
   const distinctTeachers = new Set();
   classes.forEach(c => {
     if (distinctTeachers.has(c.teacherId)) {
        conflicts.push(`Slot: ${slotKey}, Teacher: ${c.teacherId}, Turma: ${c.turmaId}`);
     }
     distinctTeachers.add(c.teacherId);
   });
});

console.log("Conflicts:", conflicts);
