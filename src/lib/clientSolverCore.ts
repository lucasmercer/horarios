import {
  Teacher,
  Subject,
  Turma,
  ScheduleSlot,
  AllSchedules,
  LessonGroup,
} from "../types";

export const runSolverClient = async (payload: any) => {
  const {
    mode,
    shift,
    overrideTurmaId,
    turmasArray,
    teachersArray,
    subjectsArray,
    schedules: existingSchedules,
    enableNoiteAsynchronous,
    enableNoite,
    disableDoubleClassesGlobally,
    autoGenForceConflicts,
  } = payload;

  const turmas: Turma[] = turmasArray;
  const teachers: Teacher[] = teachersArray;
  const subjects: Subject[] = subjectsArray;

  let baseSchedules: AllSchedules = JSON.parse(
    JSON.stringify(existingSchedules || {}),
  );

  let targetTurmas = turmas.filter((t) => !t.isRoom);
  if (overrideTurmaId) {
    if (Array.isArray(overrideTurmaId)) {
      targetTurmas = targetTurmas.filter((t) => overrideTurmaId.includes(t.id));
    } else {
      targetTurmas = targetTurmas.filter((t) => t.id === overrideTurmaId);
    }
  }

  if (shift && shift !== "both" && shift !== "labs") {
    targetTurmas = targetTurmas.filter((t) => t.shift === shift);
  }

  // Define period indices
  const getPeriodsArrayForTurma = (t: Turma): number[] => {
    const shift = t.shift || "manha";
    const count = shift === "noite" ? 5 : t.dailyClassCount || 6;
    let base = 1;
    if (shift === "tarde") base = 7;
    if (shift === "noite") base = 13;
    return Array.from({ length: count }, (_, i) => base + i);
  };

  const DAYS = ["seg", "ter", "qua", "qui", "sex"];

  // Handle generation modes
  if (mode === "all" || mode === "shuffle") {
    targetTurmas.forEach((t) => {
      if (!baseSchedules[t.id]) baseSchedules[t.id] = {};
      Object.keys(baseSchedules[t.id]).forEach((key) => {
        if (mode === "all") {
          // 'all' mode: Delete everything (true reset)
          delete baseSchedules[t.id][key];
        } else if (mode === "shuffle") {
          // 'shuffle' mode: Delete only non-fixed slots
          if (!baseSchedules[t.id][key].isFixed) {
            delete baseSchedules[t.id][key];
          }
        }
      });
    });
  }

  // Create demands
  let initialDemands: any[] = [];
  let baseErrors: string[] = [];
  let totalScannedClasses = 0;

  targetTurmas.forEach((t) => {
    if (!baseSchedules[t.id]) baseSchedules[t.id] = {};

    // Check existing counts
    let existingCounts: Record<string, number> = {};
    Object.values(baseSchedules[t.id]).forEach((slot) => {
      if (slot && slot.subjectId) {
        existingCounts[slot.subjectId] =
          (existingCounts[slot.subjectId] || 0) + 1;
      }
    });

    subjects.forEach((s) => {
      const workload = s.customWorkloads?.[t.id] || 0;
      if (workload > 0) {
        let remaining = workload - (existingCounts[s.id] || 0);

        // Find suitable teachers
        const eligibleTeachers = teachers.filter((teacher) => {
          if (!teacher.subjectIds.includes(s.id)) return false;
          if (
            teacher.turmaIds &&
            teacher.turmaIds.length > 0 &&
            !teacher.turmaIds.includes(t.id)
          )
            return false;
          if (
            teacher.subjectTurmaMap &&
            teacher.subjectTurmaMap[s.id] &&
            teacher.subjectTurmaMap[s.id].length > 0 &&
            !teacher.subjectTurmaMap[s.id].includes(t.id)
          )
            return false;
          return true;
        });

        if (eligibleTeachers.length > 0) {
          const teacher = eligibleTeachers[0]; // simplistic

          while (remaining > 0) {
            const wantDouble =
              !disableDoubleClassesGlobally &&
              remaining >= 2 &&
              (s.preferDoubleClasses || teacher.preferDoubleClasses);
            const size = wantDouble ? 2 : 1;

            initialDemands.push({
              turmaId: t.id,
              subjectId: s.id,
              teacherId: teacher.id,
              size: size,
              shift: t.shift || "manha",
            });
            remaining -= size;
            totalScannedClasses += size;
          }
        } else if (remaining > 0) {
          initialDemands.push({
            turmaId: t.id,
            subjectId: s.id,
            teacherId: null,
            size: 1,
            shift: t.shift || "manha",
          });
          remaining -= 1;
          totalScannedClasses += 1;
        }
      }
    });
  });

  const isAvailable = (
    teacherId: string,
    day: string,
    period: number,
    shift: string,
    currentSchedules: AllSchedules,
  ) => {
    if (!teacherId) return false;
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return false;

    const slotKey = `${day}-${period}`;
    if (teacher.unavailability && teacher.unavailability.includes(slotKey))
      return false;

    for (const tid of Object.keys(currentSchedules)) {
      const slot = currentSchedules[tid]?.[slotKey];
      if (slot && slot.teacherId === teacherId) return false;
    }

    return true;
  };

  const teacherWorkload: Record<string, number> = {};
  initialDemands.forEach((d) => {
    if (d.teacherId) {
      teacherWorkload[d.teacherId] =
        (teacherWorkload[d.teacherId] || 0) + d.size;
    }
  });

  let bestResult: any = null;
  const iterations = 100; // Run 100 iterations

  for (let i = 0; i < iterations; i++) {
    let computedSchedules = JSON.parse(JSON.stringify(baseSchedules));
    let demands = [...initialDemands];

    // Sort demands: most constrained first (higher workload), then size, then random
    demands.sort((a, b) => {
      const wa = a.teacherId ? teacherWorkload[a.teacherId] : 0;
      const wb = b.teacherId ? teacherWorkload[b.teacherId] : 0;
      if (wa !== wb) return wb - wa; // Descending workload
      if (a.size !== b.size) return b.size - a.size; // Double classes first
      return Math.random() - 0.5;
    });

    let placedCount = 0;
    let pending: any[] = [];
    let errors = [...baseErrors];

    demands.forEach((demand) => {
      if (!demand.teacherId) {
        pending.push({
          ...demand,
          turmaName: turmas.find((t) => t.id === demand.turmaId)?.name,
          subjectName: subjects.find((s) => s.id === demand.subjectId)?.name,
          teacherName: "Sem Professor",
          reason: "Sem professor elegível cadastrado para esta disciplina/turma",
        });
        if (i === 0) {
          // Only log missing teacher errors on first iteration to avoid spam
          errors.push(
            `Sem professor elegível para ${subjects.find((s) => s.id === demand.subjectId)?.name || demand.subjectId} na turma ${turmas.find((t) => t.id === demand.turmaId)?.name || demand.turmaId}`,
          );
        }
        return;
      }

      const t = turmas.find((turma) => turma.id === demand.turmaId);
      if (!t) return;

      const periodsList = getPeriodsArrayForTurma(t);
      let remainingToPlace = demand.size;

      // Randomize days for better distribution
      const randomDays = [...DAYS].sort(() => Math.random() - 0.5);

      for (const day of randomDays) {
        if (remainingToPlace <= 0) break;

        if (demand.size === 2 && remainingToPlace === 2) {
          for (let i = 0; i < periodsList.length - 1; i++) {
            const p1 = periodsList[i];
            const p2 = periodsList[i + 1];
            const k1 = `${day}-${p1}`;
            const k2 = `${day}-${p2}`;

            if (!computedSchedules[t.id][k1] && !computedSchedules[t.id][k2]) {
              if (
                isAvailable(demand.teacherId, day, p1, demand.shift, computedSchedules) &&
                isAvailable(demand.teacherId, day, p2, demand.shift, computedSchedules)
              ) {
                computedSchedules[t.id][k1] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                computedSchedules[t.id][k2] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                remainingToPlace -= 2;
                placedCount += 2;
                break;
              }
            }
          }
        } 
        
        if (remainingToPlace > 0 && demand.size !== 2) {
          const randomPeriodsList = [...periodsList].sort(() => Math.random() - 0.5);
          for (const p of randomPeriodsList) {
            if (remainingToPlace <= 0) break;
            const k1 = `${day}-${p}`;
            if (!computedSchedules[t.id][k1]) {
              if (isAvailable(demand.teacherId, day, p, demand.shift, computedSchedules)) {
                computedSchedules[t.id][k1] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                remainingToPlace -= 1;
                placedCount += 1;
                break;
              }
            }
          }
        }
      }

      if (remainingToPlace > 0 && demand.size === 2) {
        // Fallback: try to place as single classes
        for (const day of randomDays) {
          if (remainingToPlace <= 0) break;
          const randomPeriodsList = [...periodsList].sort(() => Math.random() - 0.5);
          for (const p of randomPeriodsList) {
            if (remainingToPlace <= 0) break;
            const k1 = `${day}-${p}`;
            if (!computedSchedules[t.id][k1] && isAvailable(demand.teacherId, day, p, demand.shift, computedSchedules)) {
              computedSchedules[t.id][k1] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
              remainingToPlace--;
              placedCount += 1;
            }
          }
        }
      }

      if (remainingToPlace > 0 && autoGenForceConflicts) {
        if (remainingToPlace === 2) {
          for (const day of randomDays) {
            if (remainingToPlace <= 0) break;
            for (let i = 0; i < periodsList.length - 1; i++) {
              const p1 = periodsList[i];
              const p2 = periodsList[i + 1];
              const k1 = `${day}-${p1}`;
              const k2 = `${day}-${p2}`;
              if (!computedSchedules[t.id][k1] && !computedSchedules[t.id][k2]) {
                computedSchedules[t.id][k1] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                computedSchedules[t.id][k2] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                remainingToPlace -= 2;
                placedCount += 2;
                break;
              }
            }
          }
        }

        // If still not placed force single slots anywhere
        if (remainingToPlace > 0) {
          for (const day of randomDays) {
            if (remainingToPlace <= 0) break;
            for (const p of periodsList) {
              if (remainingToPlace <= 0) break;
              const k1 = `${day}-${p}`;
              if (!computedSchedules[t.id][k1]) {
                computedSchedules[t.id][k1] = { subjectId: demand.subjectId, teacherId: demand.teacherId };
                remainingToPlace -= 1;
                placedCount += 1;
              }
            }
          }
        }
      }

      const placed = remainingToPlace === 0;

      if (!placed) {
        pending.push({
          ...demand,
          turmaName: turmas.find((t) => t.id === demand.turmaId)?.name,
          subjectName: subjects.find((s) => s.id === demand.subjectId)?.name,
          teacherName: teachers.find((t) => t.id === demand.teacherId)?.name,
          isDouble: demand.size === 2,
          reason: "Conflito de horários (Professor indisponível ou turma cheia)",
        });
      }
    });

    const currentResult = {
      success: true,
      solved: pending.length === 0,
      scannedCount: totalScannedClasses,
      placedCount,
      pending,
      errors,
      computedSchedules,
    };

    if (!bestResult || currentResult.placedCount > bestResult.placedCount) {
      bestResult = currentResult;
    }

    if (bestResult.solved) {
      break; // Found a perfect schedule
    }
  }

  return bestResult;
};
