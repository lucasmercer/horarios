const fs = require('fs');
const schedules = {
  "t-6b-tarde": {},
  "sala-mat-id": {}
}

const turmas = [
    {
      "id": "t-6b-tarde",
      "name": "6º B",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "sala-mat-id",
      "name": "SALA DE MATEMÁTICA",
      "isRoom": true,
      "shift": "ambos"
    }
]

let distTarde = 0;
let distributed = 0;

for(let i=0; i<30; i++) {
   schedules["t-6b-tarde"][`slot-${i}`] = { teacherId: "x", subjectId: "y" };
}
schedules["t-6b-tarde"][`slot-1`].associatedRoomId = "sala-mat-id";
schedules["sala-mat-id"][`slot-1`] = { teacherId: "x", subjectId: "y", associatedTurmaId: "t-6b-tarde" };

let parsedSchedules = schedules;
let rawTurmas = turmas;
let distLabs = 0;

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
         if (slot.associatedTurmaId) {
           const assocTurma = rawTurmas.find((t) => t.id === slot.associatedTurmaId);
           if (assocTurma) {
             const directlyHasSlot = parsedSchedules[slot.associatedTurmaId]?.[slotKey];
             if (!directlyHasSlot) {
                distributed++;
             }
           }
         }
      } else {
         distributed++;
      }
    }
  });
});
console.log('distributed:', distributed, 'distLabs:', distLabs);
