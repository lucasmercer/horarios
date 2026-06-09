import { Teacher, Subject, Turma, AllSchedules, ScheduleSlot, LessonGroup, Schedule } from './src/types';

const DAYS = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça' },
  { id: 'qua', label: 'Quarta' },
  { id: 'qui', label: 'Quinta' },
  { id: 'sex', label: 'Sexta' },
];

const PERIODS_MANHA = [1, 2, 3, 4, 5, 6];
const PERIODS_TARDE = [7, 8, 9, 10, 11, 12];
const PERIODS_NOITE = [13, 14, 15, 16, 17, 18];

interface SolverPayload {
  mode: 'empty' | 'all';
  shift: 'both' | 'manha' | 'tarde' | 'noite' | 'labs';
  turmasArray: Turma[];
  teachersArray: Teacher[];
  subjectsArray: Subject[];
  schedules: AllSchedules;
  overrideTurmaId?: string | string[];
  enableNoiteAsynchronous?: boolean;
  enableNoite?: boolean;
  disableDoubleClassesGlobally?: boolean;
  autoGenForceConflicts?: boolean;
}

const getTurmaShift = (T: Turma): 'manha' | 'tarde' | 'noite' => {
  if (T.shift === 'noite') return 'noite';
  if (T.shift === 'tarde') return 'tarde';
  if (T.shift === 'manha') return 'manha';
  const nameL = T.name.toLowerCase();
  if (nameL.includes('noite')) return 'noite';
  if (nameL.includes('tarde')) return 'tarde';
  return 'manha';
};

const getSubjectWorkloadsForTurma = (subject: Subject, turmaId: string) => {
  let w = subject.workload;
  if (subject.customWorkloads && subject.customWorkloads[turmaId] !== undefined) {
    w = subject.customWorkloads[turmaId];
  }
  if (w <= 0) return { workload: w, labWorkload: 0, classWorkload: 0 };
  const labW = subject.labWorkload || 0;
  const classW = subject.classWorkload !== undefined ? subject.classWorkload : Math.max(0, w - labW);
  return { workload: w, labWorkload: labW, classWorkload: classW };
};

const isTeacherEligibleForSubjectInTurma = (t: Teacher, SId: string, TId: string) => {
  if (!t.subjectIds.includes(SId)) return false;
  if (t.subjectTurmaMap && t.subjectTurmaMap[SId] && t.subjectTurmaMap[SId].length > 0) {
    if (!t.subjectTurmaMap[SId].includes(TId)) return false;
  }
  const teachesTurma = !t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(TId);
  return teachesTurma;
};

const getEligibleTeachers = (SId: string, TId: string, allTeachers: Teacher[]) => {
  return allTeachers.filter(t => isTeacherEligibleForSubjectInTurma(t, SId, TId));
};

const getCompatibleSpecialRooms = (S: Subject, specialRooms: Turma[]) => {
  return specialRooms.filter(r => {
    if (S.roomIds && S.roomIds.length > 0) return S.roomIds.includes(r.id);
    return false;
  }).map(r => r.id);
};

export const runSolver = async (payload: SolverPayload) => {
  const { 
    mode, 
    shift, 
    turmasArray, 
    teachersArray, 
    subjectsArray, 
    schedules, 
    overrideTurmaId,
    enableNoiteAsynchronous,
    enableNoite,
    disableDoubleClassesGlobally,
    autoGenForceConflicts
  } = payload;

  const errors: string[] = [];
  const pendingLessons: any[] = [];
  
  const activeTurmas = turmasArray.filter(t => {
    if (t.isRoom) return false;
    if (overrideTurmaId && (Array.isArray(overrideTurmaId) ? !overrideTurmaId.includes(t.id) : t.id !== overrideTurmaId)) return false;
    
    const detectedShift = getTurmaShift(t);
    if (shift === 'manha') return detectedShift === 'manha';
    if (shift === 'tarde') return detectedShift === 'tarde';
    if (shift === 'noite') return detectedShift === 'noite';
    return true; 
  });

  const specialRooms = turmasArray.filter(t => t.isRoom);
  const newSchedules: AllSchedules = JSON.parse(JSON.stringify(schedules));

  const targetPeriods = new Set<number>();
  if (shift === 'both' || shift === 'labs' || shift === 'manha') {
    [1, 2, 3, 4, 5, 6].forEach(p => targetPeriods.add(p));
  }
  if (shift === 'both' || shift === 'labs' || shift === 'tarde') {
    [7, 8, 9, 10, 11, 12].forEach(p => targetPeriods.add(p));
  }
  if ((shift === 'both' && enableNoite) || shift === 'labs' || shift === 'noite') {
    PERIODS_NOITE.forEach(p => targetPeriods.add(p));
  }
  
  const clearSchedulesForMode = () => {
    Object.keys(newSchedules).forEach(tid => {
      const isRoom = turmasArray.find(t => t.id === tid)?.isRoom;
      if (overrideTurmaId && !isRoom && (Array.isArray(overrideTurmaId) ? !overrideTurmaId.includes(tid) : tid !== overrideTurmaId)) return;

      Object.keys(newSchedules[tid]).forEach(slotId => {
        const [_, pStr] = slotId.split('-');
        const p = parseInt(pStr);
        
        if (overrideTurmaId && isRoom) {
          const associatedId = newSchedules[tid][slotId]?.associatedTurmaId;
          if (associatedId && (Array.isArray(overrideTurmaId) ? !overrideTurmaId.includes(associatedId) : associatedId !== overrideTurmaId)) return;
        }

        if (newSchedules[tid][slotId]?.isFixed) return;

        if (shift === 'labs') {
          if (isRoom) delete newSchedules[tid][slotId];
        } else {
          if (targetPeriods.has(p)) delete newSchedules[tid][slotId];
        }
      });
    });
  };

  if (mode === 'all') clearSchedulesForMode();

  const teacherAllocatedLoad: Record<string, number> = {};
  
  // Initialize workloads with remaining fixed classes
  Object.keys(newSchedules).forEach(tid => {
    Object.values(newSchedules[tid]).forEach(slot => {
      if (slot?.teacherId) {
        teacherAllocatedLoad[slot.teacherId] = (teacherAllocatedLoad[slot.teacherId] || 0) + 1;
      }
    });
  });

  const requirements: any[] = [];
  activeTurmas.forEach(T => {
    const classShift = getTurmaShift(T);
    subjectsArray.forEach(S => {
      const { classWorkload, labWorkload } = getSubjectWorkloadsForTurma(S, T.id);
      if (classWorkload === 0 && labWorkload === 0) return;

      const eligible = getEligibleTeachers(S.id, T.id, teachersArray);
      if (eligible.length === 0) {
        errors.push(`Nenhum professor cadastrado leciona '${S.name}' para a turma '${T.name}'`);
        return;
      }

      let assignedTeacher = eligible[0];
      const originalScheduleOfTurma = schedules[T.id] || {};
      const existingSlot = (Object.values(originalScheduleOfTurma) as ScheduleSlot[]).find(slot => slot?.subjectId === S.id);
      if (existingSlot) {
        assignedTeacher = eligible.find(t => t.id === existingSlot.teacherId) || eligible[0];
      } else {
        let bestTeacher = eligible[0];
        let minWorkload = Infinity;
        eligible.forEach(tea => {
          const count = teacherAllocatedLoad[tea.id] || 0;
          if (count < minWorkload) {
            minWorkload = count;
            bestTeacher = tea;
          }
        });
        assignedTeacher = bestTeacher;
      }

      let cWorkloadToAlloc = shift === 'labs' ? 0 : classWorkload;
      let lWorkloadToAlloc = labWorkload;

      const classUsage = Object.values(newSchedules[T.id] || {}).filter(slot => slot.subjectId === S.id && !slot.associatedRoomId).length;
      cWorkloadToAlloc = Math.max(0, cWorkloadToAlloc - classUsage);

      let labUsage = 0;
      specialRooms.forEach(room => {
        labUsage += Object.values(newSchedules[room.id] || {}).filter(slot => slot.subjectId === S.id && slot.associatedTurmaId === T.id).length;
      });
      lWorkloadToAlloc = Math.max(0, labWorkload - labUsage);

      for (let u = 0; u < cWorkloadToAlloc; u++) {
        requirements.push({ turmaId: T.id, subjectId: S.id, teacherId: assignedTeacher.id, isLab: false, allowedRooms: [], shift: classShift });
        teacherAllocatedLoad[assignedTeacher.id] = (teacherAllocatedLoad[assignedTeacher.id] || 0) + 1;
      }

      if (lWorkloadToAlloc > 0) {
        const allowedRooms = getCompatibleSpecialRooms(S, specialRooms);
        if (allowedRooms.length === 0) {
          errors.push(`A matéria "${S.name}" exige laboratório para a turma "${T.name}", mas nenhuma das salas especiais possui essa matéria associada.`);
          return;
        }
        for (let u = 0; u < lWorkloadToAlloc; u++) {
          requirements.push({ turmaId: T.id, subjectId: S.id, teacherId: assignedTeacher.id, isLab: true, allowedRooms, shift: classShift });
          teacherAllocatedLoad[assignedTeacher.id] = (teacherAllocatedLoad[assignedTeacher.id] || 0) + 1;
        }
      }
    });
  });

  const groups: LessonGroup[] = [];
  const keyMap = new Map<string, typeof requirements>();
  requirements.forEach(req => {
    const key = `${req.turmaId}_${req.subjectId}_${req.teacherId}_${req.isLab}`;
    if (!keyMap.has(key)) keyMap.set(key, []);
    keyMap.get(key)!.push(req);
  });

  keyMap.forEach((reqs, key) => {
    const first = reqs[0];
    const teacherObj = teachersArray.find(t => t.id === first.teacherId);
    const subjectObj = subjectsArray.find(s => s.id === first.subjectId);
    const wantsDouble = disableDoubleClassesGlobally ? false : (teacherObj?.preferDoubleClasses || false);
    
    let count = reqs.length;
    let idx = 0;
    
    if (wantsDouble) {
      while (count >= 2) {
        groups.push({ id: `${key}-group2-${idx}`, size: 2, ...first });
        count -= 2; idx++;
      }
    }
    while (count >= 1) {
      groups.push({ id: `${key}-group1-${idx}`, size: 1, ...first });
      count -= 1; idx++;
    }
  });

  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  const getTurmaTeacherInSlot = (turmaId: string, d: string, pr: number, currentSchedules: AllSchedules) => {
    const slotId = `${d}-${pr}`;
    const s = currentSchedules[turmaId]?.[slotId];
    if (s && s.teacherId) return s.teacherId;
    return null;
  };

  const canPlacePeriod = (g: LessonGroup, day: string, p: number, roomId: string, currentSchedules: AllSchedules) => {
    const slotId = `${day}-${p}`;
    const targetTurma = turmasArray.find(t => t.id === g.turmaId);
    if (targetTurma && targetTurma.dailyClassCount === 5) {
      if (g.shift === 'manha' && p === 6) return false;
      if (g.shift === 'tarde' && p === 12) return false;
      if (g.shift === 'noite' && p === 18 && !enableNoiteAsynchronous) return false;
    }
    
    const teacher = teachersArray.find(t => t.id === g.teacherId);
    if (teacher?.unavailability?.includes(slotId)) return false;
    if (teacher?.availability && teacher.availability.length > 0) {
      if (!teacher.availability.includes(slotId)) return false;
    }
    
    for (const tid in currentSchedules) {
      const slot = currentSchedules[tid]?.[slotId];
      if (slot && slot.teacherId === g.teacherId) return false;
    }
    
    const existingSlot = currentSchedules[g.turmaId]?.[slotId];
    if (existingSlot && (existingSlot.teacherId || existingSlot.subjectId)) return false;
    
    if (g.isLab) {
      const existingRoomSlot = currentSchedules[roomId]?.[slotId];
      if (existingRoomSlot && (existingRoomSlot.teacherId || existingRoomSlot.subjectId)) return false;
    }

    const wantsDouble = disableDoubleClassesGlobally ? false : (teacher?.preferDoubleClasses || false);

    if (!wantsDouble) {
      if (getTurmaTeacherInSlot(g.turmaId, day, p - 1, currentSchedules) === g.teacherId) return false;
      if (getTurmaTeacherInSlot(g.turmaId, day, p + 1, currentSchedules) === g.teacherId) return false;
    } else {
      if (g.size === 1) {
        if (getTurmaTeacherInSlot(g.turmaId, day, p - 1, currentSchedules) === g.teacherId) return false;
        if (getTurmaTeacherInSlot(g.turmaId, day, p + 1, currentSchedules) === g.teacherId) return false;
      }
    }
    
    return true;
  };

    const getPossiblePlacementsForGroup = (g: LessonGroup) => {
      const list: { day: string; periods: number[] }[] = [];
      
      const targetTurmaId = g.isLab && g.turmaId ? g.turmaId : g.turmaId;
      const targetTurma = turmasArray.find(t => t.id === targetTurmaId);
      const effectiveClassShift = targetTurma ? getTurmaShift(targetTurma) : g.shift;
      const pList = effectiveClassShift === 'noite' ? PERIODS_NOITE : effectiveClassShift === 'tarde' ? PERIODS_TARDE : PERIODS_MANHA;
      
      const teacher = teachersArray.find(t => t.id === g.teacherId);
      const hasAvailability = teacher?.availability && teacher.availability.length > 0;
      
      DAYS.forEach(day => {
        if (g.size === 1) {
          pList.forEach(p => {
            if (targetTurma && targetTurma.dailyClassCount === 5) {
              if (effectiveClassShift === 'manha' && p === 6) return;
              if (effectiveClassShift === 'tarde' && p === 12) return;
              if (effectiveClassShift === 'noite' && p === 18 && !enableNoiteAsynchronous) return;
            }
            const slotId = `${day.id}-${p}`;
            if ((!hasAvailability || teacher?.availability?.includes(slotId)) && !teacher?.unavailability?.includes(slotId)) {
              list.push({ day: day.id, periods: [p] });
            }
          });
        } else {
          let pairs = effectiveClassShift === 'noite' ? [[13,14],[14,15],[15,16],[16,17]] : effectiveClassShift === 'tarde' ? [[7,8],[8,9],[9,10],[10,11],[11,12]] : [[1,2],[2,3],[3,4],[4,5],[5,6]];
          if (targetTurma && targetTurma.dailyClassCount === 5) {
             pairs = pairs.filter(pair => {
                if (effectiveClassShift === 'manha' && pair.includes(6)) return false;
                if (effectiveClassShift === 'tarde' && pair.includes(12)) return false;
                if (effectiveClassShift === 'noite' && pair.includes(18) && !enableNoiteAsynchronous) return false;
                return true;
             });
          }
          pairs.forEach(pair => {
            const s1 = `${day.id}-${pair[0]}`, s2 = `${day.id}-${pair[1]}`;
            if ((!hasAvailability || (teacher?.availability?.includes(s1) && teacher?.availability?.includes(s2))) && !teacher?.unavailability?.includes(s1) && !teacher?.unavailability?.includes(s2)) {
              list.push({ day: day.id, periods: pair });
            }
          });
        }
      });
      return list;
    };

    // GREEDY ALLOCATION (FAST FOR NODE BACKEND)
    let bestSchedules: AllSchedules | null = null;
    let minFails = Infinity;
    let bestPending: any[] = [];
    const maxIters = 120; // Increased to allow more random permutations for dense bottlenecks

    for (let iter = 0; iter < maxIters; iter++) {
      let tempSchedules: AllSchedules = JSON.parse(JSON.stringify(schedules));
      if (mode === 'all') {
        Object.keys(tempSchedules).forEach(tid => {
          const isRoom = turmasArray.find(t => t.id === tid)?.isRoom;
          if (overrideTurmaId && !isRoom && (Array.isArray(overrideTurmaId) ? !overrideTurmaId.includes(tid) : tid !== overrideTurmaId)) return;
          
          Object.keys(tempSchedules[tid]).forEach(slotId => {
            const [_, pStr] = slotId.split('-');
            const p = parseInt(pStr);
            
            if (overrideTurmaId && isRoom) {
              const associatedId = tempSchedules[tid][slotId]?.associatedTurmaId;
              if (associatedId && (Array.isArray(overrideTurmaId) ? !overrideTurmaId.includes(associatedId) : associatedId !== overrideTurmaId)) return;
            }

            if (shift === 'labs') {
              if (isRoom) delete tempSchedules[tid][slotId];
            } else {
              if (targetPeriods.has(p)) delete tempSchedules[tid][slotId];
            }
          });
        });
      }

      let failsIter = 0;
      let pendingIter: any[] = [];

      // Calculate total global teacher workloads internally inside solver for heuristics
      const teacherWorkloads: Record<string, number> = {};
      groups.forEach(g => {
        teacherWorkloads[g.teacherId] = (teacherWorkloads[g.teacherId] || 0) + g.size;
      });

      // Sort groups logically: bigger constraints first randomly perturbed
      groups.sort((a, b) => {
        if (a.size !== b.size) return b.size - a.size;
        
        // Priority 2: Bottleneck teachers with the MOST overall classes globally must be placed first
        const twA = teacherWorkloads[a.teacherId] || 0;
        const twB = teacherWorkloads[b.teacherId] || 0;
        
        if (twA !== twB) {
            // Apply a slight random perturbation to avoid identical loops
            const perturbedA = twA + (Math.random() * 2);
            const perturbedB = twB + (Math.random() * 2);
            return perturbedB - perturbedA;
        }

        // Prioritize rooms if lab
        if (a.isLab !== b.isLab) return a.isLab ? -1 : 1;
        return 0;
      });

      // Fisher-Yates shuffle for groups that are tied
      for (let i = groups.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Only shuffle if they have the same size and exactly equal workloads (rare but possible)
        if (groups[i].size === groups[j].size && teacherWorkloads[groups[i].teacherId] === teacherWorkloads[groups[j].teacherId]) {
            [groups[i], groups[j]] = [groups[j], groups[i]];
        }
      }

      groups.forEach(g => {
        const placements = getPossiblePlacementsForGroup(g);
        // Fisher-Yates shuffle for placements to ensure unbiased period selection
        for (let i = placements.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [placements[i], placements[j]] = [placements[j], placements[i]];
        }
        
        const roomsToTry = g.isLab ? g.allowedRooms : [g.turmaId];
        let placed = false;
        for (const placement of placements) {
          for (const rid of roomsToTry) {
            let ok = true;
            for (const p of placement.periods) {
              if (!canPlacePeriod(g, placement.day, p, rid, tempSchedules)) {
                ok = false; break;
              }
            }
            if (ok) {
              placement.periods.forEach(p => {
                const slotId = `${placement.day}-${p}`;
                if (!tempSchedules[rid]) tempSchedules[rid] = {};
                tempSchedules[rid][slotId] = { teacherId: g.teacherId, subjectId: g.subjectId, associatedTurmaId: g.isLab ? g.turmaId : undefined };
                if (g.isLab) {
                  if (!tempSchedules[g.turmaId]) tempSchedules[g.turmaId] = {};
                  tempSchedules[g.turmaId][slotId] = { teacherId: g.teacherId, subjectId: g.subjectId, associatedRoomId: rid };
                }
              });
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
        if (!placed) {
          failsIter += g.size;
          pendingIter.push({
            turmaName: turmasArray.find(t => t.id === g.turmaId)?.name || 'Vazia',
            subjectName: subjectsArray.find(s => s.id === g.subjectId)?.name || 'Desconhecida',
            teacherName: teachersArray.find(t => t.id === g.teacherId)?.name || 'Desconhecido',
            reason: `${g.size} aula(s): Conflito.`,
            turmaId: g.turmaId, subjectId: g.subjectId, teacherId: g.teacherId, isDouble: g.size > 1
          });
        }
      });

      if (failsIter < minFails) {
        minFails = failsIter;
        bestSchedules = JSON.parse(JSON.stringify(tempSchedules));
        bestPending = [...pendingIter];
      }

      if (failsIter === 0) break;
    }

    if (bestSchedules) {
      if (autoGenForceConflicts && bestPending.length > 0) {
        bestPending.forEach(pending => {
          const turma = turmasArray.find(t => t.id === pending.turmaId);
          if (!turma) return;
          const classShift = getTurmaShift(turma);
          const shiftP = classShift === 'noite' ? PERIODS_NOITE : classShift === 'tarde' ? PERIODS_TARDE : PERIODS_MANHA;
          let slotsNeeded = pending.isDouble ? 2 : 1;
          for (const day of DAYS) {
            if (slotsNeeded <= 0) break;
            for (const p of shiftP) {
              if (turma.dailyClassCount === 5) {
                if (classShift === 'manha' && p === 6) continue;
                if (classShift === 'tarde' && p === 12) continue;
                if (classShift === 'noite' && p === 18 && !enableNoiteAsynchronous) continue;
              }
              const slotId = `${day.id}-${p}`;
              if (!bestSchedules![pending.turmaId]) bestSchedules![pending.turmaId] = {};
              if (!bestSchedules![pending.turmaId][slotId] || !bestSchedules![pending.turmaId][slotId].teacherId || !bestSchedules![pending.turmaId][slotId].subjectId) {
                if (slotsNeeded > 0) {
                  bestSchedules![pending.turmaId][slotId] = { subjectId: pending.subjectId, teacherId: pending.teacherId };
                  slotsNeeded--;
                  if (slotsNeeded <= 0) break;
                }
              }
            }
          }
          
          if (slotsNeeded > 0) {
            for (const day of DAYS) {
              if (slotsNeeded <= 0) break;
              for (const p of shiftP) {
                if (turma.dailyClassCount === 5) {
                  if (classShift === 'manha' && p === 6) continue;
                  if (classShift === 'tarde' && p === 12) continue;
                  if (classShift === 'noite' && p === 18 && !enableNoiteAsynchronous) continue;
                }
                const slotId = `${day.id}-${p}`;
                if (!bestSchedules![pending.turmaId]) bestSchedules![pending.turmaId] = {};
                if (slotsNeeded > 0) {
                  bestSchedules![pending.turmaId][slotId] = { subjectId: pending.subjectId, teacherId: pending.teacherId };
                  slotsNeeded--;
                  if (slotsNeeded <= 0) break;
                }
              }
            }
          }
        });
        bestPending.length = 0;
      }

      return {
        solved: bestPending.length === 0,
        scannedCount: requirements.length,
        placedCount: autoGenForceConflicts ? requirements.length : requirements.length - minFails,
        pending: bestPending,
        errors,
        computedSchedules: bestSchedules
      };
    }

    return { solved: true, computedSchedules: newSchedules, errors, pending: [], scannedCount: 0, placedCount: 0 };
  };
