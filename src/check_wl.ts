import fs from 'fs';

const file = fs.readFileSync('public/backup_completo.json', 'utf-8');
const data = JSON.parse(file);

const classWl: Record<string, number> = {};

for (const t of data.turmas) {
  if (t.isRoom) continue;
  classWl[t.id] = 0;
}

for (const teacher of data.teachers) {
  for (const tId of (teacher.classesIds || [])) {
    if (classWl[tId] !== undefined) {
      // Find the subject
      const sIds = teacher.subjectIds || [];
      if (sIds.length > 0) {
        // Teacher might teach multiple subjects, but we assume the primary one for this constraint 
        // Or actually the system links them via allowedTurmaIds?
        // Let's just calculate how many schedules are distributed vs expected
        const schedules = data.schedules[tId] || {};
        const count = Object.keys(schedules).length;
        classWl[tId] = count;
      }
    }
  }
}

for (const t of data.turmas) {
  if (t.isRoom) continue;
  
  let required = 0;
  if(t.shift === 'manha') required = 5 * 6;
  if(t.shift === 'tarde') required = 5 * t.dailyClassCount;
  if(t.shift === 'noite') required = 5 * (data.enableNoiteAsynchronous ? 6 : 5);
  
  const schedules = data.schedules[t.id] || {};
  const count = Object.keys(schedules).length;
  
  if (count !== required) {
    console.log(t.name, t.shift, "has", count, "distributed but requires", required);
  }
}

