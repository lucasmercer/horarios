export interface Teacher {
  id: string;
  name: string;
  subjectIds: string[]; // Alterado para suportar múltiplas disciplinas
  availability?: string[]; // Legado: Array de slotIds DISPONÍVEIS
  unavailability?: string[]; // Novo: Array de slotIds INDISPONÍVEIS ("seg-1", "ter-6", etc)
  preferDoubleClasses?: boolean; // Preferência de aulas geminadas
  requireShiftInterval?: boolean; // Exigir intervalo entre turnos consecutivas
  turmaIds?: string[]; // Turmas que o professor é docente (opcional, vazio = todas)
  subjectTurmaMap?: Record<string, string[]>; // Mapeamento de quais turmas o professor leciona cada matéria
  schoolWorkload?: number; // Carga horária semanal neste colégio específico (opcional)
  schoolWorkloadManha?: number; // Carga horária específica de manhã
  schoolWorkloadTarde?: number; // Carga horária específica de tarde
  schoolWorkloadNoite?: number; // Carga horária específica de noite
}

export interface Subject {
  id: string;
  name: string;
  workload: number;
  useLabComp?: boolean;
  useLabTab?: boolean;
  useSalaMat?: boolean;
  labWorkload?: number;
  classWorkload?: number;
  preferDoubleClasses?: boolean;
  roomIds?: string[];
  customWorkloads?: Record<string, number>;
  levelConstraint?: 'ambos' | 'fundamental' | 'medio' | 'tecnico';
  gradeConstraint?: string;
  suffixConstraint?: string;
  allowedTurmaIds?: string[];
  workloadFundamental?: number;
  workloadMedio?: number;
  isTechnical?: boolean;
}

export interface Turma {
  id: string;
  name: string;
  shift?: 'manha' | 'tarde' | 'noite' | 'ambos';
  isRoom?: boolean;
  color?: string;
  icon?: string;
  dailyClassCount?: 5 | 6;
  isTechnical?: boolean;
}

export interface ScheduleSlot {
  teacherId: string;
  subjectId: string;
  associatedTurmaId?: string;
  associatedRoomId?: string;
}

export type Schedule = Record<string, ScheduleSlot>; // Key format: "day-period" e.g. "seg-1"
export type AllSchedules = Record<string, Schedule>; // Key format: classId -> Schedule

export interface LessonGroup {
  id: string;
  turmaId: string;
  subjectId: string;
  teacherId: string;
  isLab: boolean;
  allowedRooms: string[];
  shift: 'manha' | 'tarde' | 'noite';
  size: number; // 1 = simple, 2 = double/geminada
}
