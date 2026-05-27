const fs = require('fs');

const data = JSON.parse(fs.readFileSync('schedules.json', 'utf8'));

const getConflicts = (dayId, period, teacherId, excludeTurmaId, schedules, teachers) => {
    if (!teacherId) return [];
    const slotId = `${dayId}-${period}`;
    const conflicts = [];

    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher && teacher.unavailability && teacher.unavailability.length > 0) {
      if (teacher.unavailability.includes(slotId)) {
        conflicts.push('INDISPONÍVEL');
      }
    } else if (teacher && teacher.availability && teacher.availability.length > 0) {
      if (!teacher.availability.includes(slotId)) {
        conflicts.push('INDISPONÍVEL');
      }
    }

    if (teacher && teacher.requireShiftInterval) {
      if (period === 6) {
        const nextSlotId = `${dayId}-7`;
        if (Object.keys(schedules).some(tid => schedules[tid]?.[nextSlotId]?.teacherId === teacherId)) {
          conflicts.push('TRANS_TURNO');
        }
      }
      // ... more but I will skip for now since it's false for all teachers in this payload.
    }

    Object.entries(schedules).forEach(([turmaId, schedule]) => {
      if (turmaId !== excludeTurmaId && schedule[slotId]?.teacherId === teacherId) {
        const assocClass1 = excludeTurmaId; // simplistic
        const assocClass2 = turmaId;
        if (assocClass1 && assocClass2 && assocClass1 === assocClass2) return;
        conflicts.push(turmaId);
      }
    });

    return conflicts;
};

const conflictsList = [];

Object.entries(data.schedules).forEach(([turmaId, schedule]) => {
    Object.entries(schedule).forEach(([slotId, info]) => {
        const [day, period] = slotId.split('-');
        if (!info.teacherId) return;
        const confs = getConflicts(day, parseInt(period), info.teacherId, turmaId, data.schedules, data.teachers);
        if (confs.length > 0) {
            conflictsList.push(`Turma: ${turmaId}, Slot: ${slotId}, Teacher: ${info.teacherId}, Conflicts: ${confs.join(', ')}`);
        }
    });
});

console.log('Total Conflicts:', conflictsList.length);
conflictsList.forEach(c => console.log(c));
