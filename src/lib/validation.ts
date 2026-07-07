import { z } from "zod";

const TeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  subjectIds: z.array(z.string()),
  availability: z.array(z.string()).optional(),
  unavailability: z.array(z.string()).optional(),
  preferDoubleClasses: z.boolean().optional(),
  requireShiftInterval: z.boolean().optional(),
  turmaIds: z.array(z.string()).optional(),
  subjectTurmaMap: z.record(z.string(), z.array(z.string())).optional(),
  schoolWorkload: z.number().optional(),
  schoolWorkloadManha: z.number().optional(),
  schoolWorkloadTarde: z.number().optional(),
  schoolWorkloadNoite: z.number().optional(),
}).passthrough();

const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  workload: z.number(),
  useLabComp: z.boolean().optional(),
  useLabTab: z.boolean().optional(),
  useSalaMat: z.boolean().optional(),
  labWorkload: z.number().optional(),
  classWorkload: z.number().optional(),
  preferDoubleClasses: z.boolean().optional(),
  roomIds: z.array(z.string()).optional(),
  customWorkloads: z.record(z.string(), z.number()).optional(),
  levelConstraint: z.enum(["ambos", "fundamental", "medio", "tecnico"]).optional(),
  gradeConstraint: z.string().optional(),
  suffixConstraint: z.string().optional(),
  allowedTurmaIds: z.array(z.string()).optional(),
}).passthrough();

const TurmaSchema = z.object({
  id: z.string(),
  name: z.string(),
  shift: z.enum(["manha", "tarde", "noite", "ambos"]).optional(),
  isRoom: z.boolean().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  dailyClassCount: z.union([z.literal(5), z.literal(6)]).optional(),
  isTechnical: z.boolean().optional(),
}).passthrough();

const ScheduleSlotSchema = z.object({
  teacherId: z.string(),
  subjectId: z.string(),
  associatedTurmaId: z.string().optional(),
  associatedRoomId: z.string().optional(),
}).passthrough();

const ScheduleSchema = z.record(z.string(), ScheduleSlotSchema);
const AllSchedulesSchema = z.record(z.string(), ScheduleSchema);

export const BackupSchema = z.object({
  appName: z.literal("GE-Scheduler"),
  version: z.union([z.string(), z.number()]).optional(),
  exportDate: z.string().optional(),
  teachers: z.array(TeacherSchema).optional(),
  subjects: z.array(SubjectSchema).optional(),
  turmas: z.array(TurmaSchema).optional(),
  schedules: AllSchedulesSchema.optional(),
  substitutions: z.array(z.any()).optional(),
  notices: z.array(z.any()).optional(),
  roomReservations: z.array(z.any()).optional(),
  roomLayout: z.record(z.string(), z.any()).optional(),
  certificatePresets: z.record(z.string(), z.any()).optional(),
  logoUrl: z.string().optional(),
  schoolName: z.string().optional(),
  enableNoite: z.boolean().optional(),
  enableNoiteAsynchronous: z.boolean().optional(),
  isCivicoMilitar: z.boolean().optional(),
  techCourseName: z.string().optional(),
  academicSystem: z.enum(["Bimestral", "Trimestral"]).optional(),
  academicDates: z.record(z.string(), z.object({ start: z.string().optional(), end: z.string().optional() })).optional(),
  timeRangesManha: z.array(z.string()).nullable().optional(),
  timeRangesTarde: z.array(z.string()).nullable().optional(),
  timeRangesNoite: z.array(z.string()).nullable().optional(),
}).passthrough();

