const fs = require('fs');
const backup = JSON.parse(fs.readFileSync('./src/backup_completo.txt', 'utf8'));

const turmaId = 't-6b-tarde';
const schedule = backup.schedules[turmaId] || {};

let count = 0;
const subjectsCount = {};

Object.keys(schedule).forEach(slotKey => {
    const slot = schedule[slotKey];
    if (slot && slot.teacherId && slot.subjectId) {
        count++;
        subjectsCount[slot.subjectId] = (subjectsCount[slot.subjectId] || 0) + 1;
    }
});

console.log('Total scheduled classes for 6b:', count);
console.log('Scheduled:', subjectsCount);

let expectedClassesCount = 0;
const expectedSubjects = {};

backup.subjects.forEach(sub => {
    const custom = sub.customWorkloads || {};
    let work = 0;
    if (custom[turmaId] !== undefined) {
        work = custom[turmaId];
    } else if (!sub.allowedTurmaIds || sub.allowedTurmaIds.length === 0 || sub.allowedTurmaIds.includes(turmaId)) {
        let isAllowedLevel = true;
        if (sub.levelConstraint === 'fundamental') isAllowedLevel = true; // 6b is fundamental
        if (sub.levelConstraint === 'medio') isAllowedLevel = false;

        if (isAllowedLevel) {
            work = sub.classWorkload + (sub.labWorkload || 0);
        }
    }
    
    if (work > 0) {
        expectedClassesCount += work;
        expectedSubjects[sub.id] = work;
    }
});

console.log('Total expected classes:', expectedClassesCount);

console.log('\n--- Missing ---');
let missingTotal = 0;
Object.keys(expectedSubjects).forEach(subId => {
    const exp = expectedSubjects[subId];
    const act = subjectsCount[subId] || 0;
    if (act < exp) {
        const subObj = backup.subjects.find(s => s.id === subId);
        console.log(`Missing ${exp - act} class(es) for ${subObj.name} (${subId})`);
        missingTotal += (exp - act);
    } else if (act > exp) {
        const subObj = backup.subjects.find(s => s.id === subId);
        console.log(`EXCESS ${act - exp} class(es) for ${subObj.name} (${subId})`);
    }
});
if (missingTotal === 0) console.log('None missing!');
