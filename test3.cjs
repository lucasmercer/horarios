const fs = require('fs');
const data = fs.readFileSync('src/components/DashboardCentral.tsx', 'utf8');

// I will mock this just to check
const rawTurmas = [
    { "id": "t-6b-tarde", "shift": "tarde" },
    { "id": "sala-mat-id", "isRoom": true }
];

const parsedSchedules = {
    "t-6b-tarde": {
        "sex-8": {
            "teacherId": "t-allana",
            "subjectId": "sub-mat",
            "associatedRoomId": "sala-mat-id"
        }
    },
    "sala-mat-id": {
        "sex-8": {
            "teacherId": "t-allana",
            "subjectId": "sub-mat",
            "associatedTurmaId": "t-6b-tarde"
        }
    }
};

let distTarde = 0;
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
             const isSameClass = parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.teacherId === slot.teacherId && 
                                 parsedSchedules[slot.associatedTurmaId]?.[slotKey]?.subjectId === slot.subjectId;
             if (!isSameClass) {
               console.log('counted from lab');
               distTarde++;
             }
           }
         }
      } else {
         console.log('counted from turma');
         distTarde++;
      }
    }
  });
});
console.log('Tarde:', distTarde, 'Labs:', distLabs);
