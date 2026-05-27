const turmas = [
    {
      "id": "t-6b-tarde",
      "name": "6º B",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-6c-tarde",
      "name": "6º C",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-7b-tarde",
      "name": "7º B",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-7c-tarde",
      "name": "7º C",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-8b-tarde",
      "name": "8º B",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-9b-tarde",
      "name": "9º B",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "t-9c-tarde",
      "name": "9º C",
      "shift": "tarde",
      "dailyClassCount": 6
    },
    {
      "id": "lab-info-comp-id",
      "name": "LABORATÓRIO 1",
      "isRoom": true,
      "shift": "ambos",
      "color": "#9333ea"
    },
    {
      "id": "lab-info-tab-id",
      "name": "LABORATÓRIO 2",
      "isRoom": true,
      "shift": "ambos",
      "color": "#2563eb"
    },
    {
      "id": "sala-mat-id",
      "name": "SALA DE MATEMÁTICA",
      "isRoom": true,
      "shift": "ambos",
      "color": "#f97316"
    }
  ];

const fs = require('fs');
const code = fs.readFileSync('countClasses.js', 'utf8');
const match = code.match(/const schedules = (\{[\s\S]*?\});/);
let schedules;
try {
  schedules = eval('(' + match[1] + ')');
} catch(e) {
  console.log(e);
}

let distTarde = 0;
let distLabs = 0;

Object.keys(schedules).forEach((turmaId) => {
    const turmaObj = turmas.find(t => t.id === turmaId);
    
    // Check if finding works
    if (!turmaObj) {
      console.log('Cant find turmaObj for: ', turmaId);
      return; 
    }

    const isRoom = turmaObj?.isRoom;
    const tName = (turmaObj?.name || '').toLowerCase();
    const tShift = turmaObj?.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');

    const turmaSchedule = schedules[turmaId];
    Object.keys(turmaSchedule).forEach((slotKey) => {
        const slot = turmaSchedule[slotKey];
        if (slot && slot.teacherId && slot.subjectId) {
            if (isRoom) {
               distLabs++;
            } else {
               if (tShift === 'tarde') distTarde++;
            }
        }
    });
});

console.log('distTarde:', distTarde);
