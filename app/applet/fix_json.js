import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./src/backup_completo.txt', 'utf8'));

const fundTurmas = data.turmas.filter(t => t.name.includes('6') || t.name.includes('7') || t.name.includes('8') || t.name.includes('9'));

const tIds = {
    6: fundTurmas.filter(t => t.name.includes('6')).map(t => t.id),
    7: fundTurmas.filter(t => t.name.includes('7')).map(t => t.id),
    8: fundTurmas.filter(t => t.name.includes('8')).map(t => t.id),
    9: fundTurmas.filter(t => t.name.includes('9')).map(t => t.id)
};

const allFundIds = [...tIds[6], ...tIds[7], ...tIds[8], ...tIds[9]];

const fundPlan = {
   'sub-art': {6: 2, 7: 2, 8: 2, 9: 2},
   'sub-cien': {6: 2, 7: 3, 8: 3, 9: 2},
   'sub-robot': {6: 2, 7: 2, 8: 2, 9: 2},
   'sub-ef': {6: 2, 7: 2, 8: 2, 9: 2},
   'sub-ensr': {6: 1, 7: 1, 8: 0, 9: 0},
   'sub-geo': {6: 2, 7: 3, 8: 2, 9: 3},
   'sub-his': {6: 2, 7: 2, 8: 3, 9: 2},
   'sub-ing': {6: 2, 7: 2, 8: 2, 9: 2},
   'sub-port': {6: 4, 7: 3, 8: 4, 9: 3},
   'sub-mat': {6: 4, 7: 5, 8: 5, 9: 5},
   'sub-cid': {6: 1, 7: 1, 8: 1, 9: 1},
   'sub-edfin': {6: 2, 7: 2, 8: 2, 9: 2},
   'sub-leitpt': {6: 2, 7: 0, 8: 0, 9: 2},
   'sub-redl': {6: 0, 7: 2, 8: 2, 9: 0},
   'sub-recmat': {6: 2, 7: 0, 8: 0, 9: 2}
};

data.subjects = data.subjects.filter(s => !s.name.toLowerCase().includes('espanhol'));

if (!data.subjects.find(s => s.id === 'sub-recmat')) {
   data.subjects.push({
      id: 'sub-recmat',
      name: 'Rec Aprend Matematica',
      workload: 2,
      classWorkload: 2,
      labWorkload: 0,
      customWorkloads: {},
      levelConstraint: 'ambos'
   });
}

const subEf = data.subjects.find(s => s.id === 'sub-ef');
if (subEf) subEf.levelConstraint = 'ambos';

const leitpt = data.subjects.find(s => s.id === 'sub-leitpt');
if (leitpt) leitpt.name = 'Leitura Rec Aprend Lingua Port';
const redl = data.subjects.find(s => s.id === 'sub-redl');
if (redl) redl.name = 'Redacao e Leitura';
const robot = data.subjects.find(s => s.id === 'sub-robot');
if (robot) robot.name = 'Ed Dig Comp Prog e Robotica';
const ensr = data.subjects.find(s => s.id === 'sub-ensr');
if (ensr) { ensr.gradeConstraint = ''; ensr.levelConstraint = 'ambos'; }

data.subjects.forEach(s => {
   if (!s.customWorkloads) s.customWorkloads = {};
   
   allFundIds.forEach(tid => {
       s.customWorkloads[tid] = 0;
   });

   if (fundPlan[s.id]) {
      allFundIds.forEach(tid => {
         let grade = 6;
         if (tIds[7].includes(tid)) grade = 7;
         else if (tIds[8].includes(tid)) grade = 8;
         else if (tIds[9].includes(tid)) grade = 9;
         
         s.customWorkloads[tid] = fundPlan[s.id][grade];
         
         if (s.allowedTurmaIds) {
             if (s.customWorkloads[tid] > 0 && !s.allowedTurmaIds.includes(tid)) {
                 s.allowedTurmaIds.push(tid);
             } else if (s.customWorkloads[tid] === 0) {
                 s.allowedTurmaIds = s.allowedTurmaIds.filter(id => id !== tid);
             }
         }
      });
   }
});

fs.writeFileSync('resultado.txt', JSON.stringify(data, null, 2), 'utf8');
