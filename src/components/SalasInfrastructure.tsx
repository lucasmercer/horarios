import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Users,
  BookOpen,
  MapPin,
  Info,
  AlertTriangle,
  Check,
  Search,
  Filter,
  CalendarDays,
  LayoutGrid,
  ChevronRight,
  ShieldAlert,
  X,
  Layers,
  Wrench,
  MoveLeft,
  MoveRight,
  Sliders,
  Sparkles,
  HelpCircle,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Turma {
  id: string;
  name: string;
  shift?: "manha" | "tarde" | "noite" | "ambos";
  isRoom?: boolean;
  color?: string;
  icon?: string;
  assignedTurmas?: { manha?: string; tarde?: string; noite?: string };
}

interface Teacher {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  color?: string;
}

interface ScheduleSlot {
  teacherId: string;
  subjectId: string;
  associatedTurmaId?: string;
  associatedRoomId?: string;
}

type Schedule = Record<string, ScheduleSlot>;
type AllSchedules = Record<string, Schedule>;

interface RoomReservation {
  id: string;
  roomId: string;
  dayId: string;
  period: number; // 1 to 18
  teacherName: string;
  reason: string;
  shift: "manha" | "tarde" | "noite";
}

interface RoomPhysicalSettings {
  block: string; // e.g. "Bloco A", "Bloco B", "Anexo"
  floor: string; // e.g. "Térreo", "1º Andar", "2º Andar"
  position: number; // Horizontal ordering index
}

type RoomLayoutMap = Record<string, RoomPhysicalSettings>;

const DAYS = [
  { id: "seg", label: "Segunda-feira", short: "Seg" },
  { id: "ter", label: "Terça-feira", short: "Ter" },
  { id: "qua", label: "Quarta-feira", short: "Qua" },
  { id: "qui", label: "Quinta-feira", short: "Qui" },
  { id: "sex", label: "Sexta-feira", short: "Sex" },
];

const GREGORIO_WING_1_LEFT: any[] = [];
const GREGORIO_WING_1 = [
  { id: "cantina", label: "Cantina", subLabels: ["Alimentação"], type: "service" },
  { id: "s1", label: "Sala 1", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s2", label: "Sala 2", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s3", label: "Sala 3", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s4", label: "Sala 4", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
];

const GREGORIO_WING_2 = [
  {
    type: "stacked" as const,
    top: { label: "W.C. Prof Masc" },
    bottom: { label: "W.C. Prof Fem" }
  },
  { id: "refeitorio", label: "Refeitório", subLabels: ["Alimentação"], type: "service" },
  { id: "cozinha", label: "Cozinha", subLabels: ["Serviço em Nutrição"], type: "service" },
  { id: "sala_aula_b2", label: "Sala de Aula", subLabels: ["Ensino"], type: "classroom" },
  { id: "informatica1", label: "Lab. Informática 1", subLabels: ["Tecnologia I"], type: "tech" },
  { type: "spacer" as const, label: "Corredor" },
  {
    type: "stacked" as const,
    top: { label: "W.C. Masc (Alunos)" },
    bottom: { label: "W.C. Fem (Alunas)" }
  },
  { id: "s5", label: "Sala 5", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s6", label: "Sala 6", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s7", label: "Sala 7", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
  { id: "s8", label: "Sala 8", subLabels: ["Ensino Médio / Fund."], type: "classroom" },
];

const GREGORIO_WING_3 = [
  { id: "almoxarifado", label: "Almox.", subLabels: ["Apoio"], type: "admin", isVertical: true },
  { id: "ref_professores", label: "Ref. Prof.", subLabels: ["Nutrição"], type: "service" },
  { id: "informatica2", label: "Lab. Inf. 2", subLabels: ["Tecnologia"], type: "tech" },
  { type: "spacer" as const, label: "Hall de Entrada" },
  { id: "secretaria", label: "Secretaria", subLabels: ["Atend."], type: "admin", isVertical: true },
  { id: "direcao", label: "Direção", subLabels: ["Diretoria"], type: "admin", isVertical: true },
  { id: "pedagogas", label: "Pedagogas", subLabels: ["Pedag."], type: "admin", isVertical: true },
  { id: "militar", label: "Militar", subLabels: ["Superv."], type: "militar", isVertical: true },
  { id: "recurso", label: "Recursos", subLabels: ["A.E.E."], type: "culture", isVertical: true },
  { id: "professores", label: "Professores", subLabels: ["Docentes"], type: "admin" },
  { id: "biblioteca_wrapper", label: "Biblioteca / Cinema / Ciências", subLabels: ["Complexo Leitura"], type: "culture", isWrapper: true },
];

export default function SalasInfrastructure() {
  // Core application data (from LocalStorage)
  const [rooms, setRooms] = useState<Turma[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<AllSchedules>({});
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // Custom reservations
  const [reservations, setReservations] = useState<RoomReservation[]>([]);

  // Room Alignment Map (Room Physical Positioning settings)
  const [roomLayouts, setRoomLayouts] = useState<RoomLayoutMap>({});

  // Custom visual states for plant drawing & safe iframe deletion
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [mapViewStyle, setMapViewStyle] = useState<"gregorio" | "dynamic">("gregorio");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // Active component logic removed (only map is rendered now)
  const [inspectRoomId, setInspectRoomId] = useState<string | null>(null);

  // Interactive View settings
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedDayId, setSelectedDayId] = useState<string>("seg");
  const [activeShift, setActiveShift] = useState<"manha" | "tarde" | "noite">(
    "manha",
  );
  const [visualMode, setVisualMode] = useState<"sala" | "panorama">("sala");

  // Interactive Simulation Time/Period slider (1 to 6)
  const [simulationPeriod, setSimulationPeriod] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isMapDesignMode, setIsMapDesignMode] = useState<boolean>(false);

  // Modal for creating reservation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newResRoomId, setNewResRoomId] = useState("");
  const [newResDayId, setNewResDayId] = useState("seg");
  const [newResShift, setNewResShift] = useState<"manha" | "tarde" | "noite">(
    "manha",
  );
  const [newResPeriod, setNewResPeriod] = useState<number>(1);
  const [newResTeacher, setNewResTeacher] = useState("");
  const [newResReason, setNewResReason] = useState("");

  // Time ranges for display
  const [timeRangesManha, setTimeRangesManha] = useState<string[]>([]);
  const [timeRangesTarde, setTimeRangesTarde] = useState<string[]>([]);
  const [timeRangesNoite, setTimeRangesNoite] = useState<string[]>([]);

  // Layout Editing state
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [editBlockName, setEditBlockName] = useState<string>("");
  const [editFloorName, setEditFloorName] = useState<string>("");
  const [editOrderNum, setEditOrderNum] = useState<number>(1);

  // Room Inspector Edit States
  const [editRoomName, setEditRoomName] = useState<string>("");
  const [editAssignedTurmas, setEditAssignedTurmas] = useState<{manha?: string, tarde?: string, noite?: string}>({});


  useEffect(() => {
    if (inspectRoomId && !inspectRoomId.startsWith("unregistered_")) {
      const target = rooms.find(r => r.id === inspectRoomId);
      if (target) {
        setEditRoomName(target.name);
        setEditAssignedTurmas(target.assignedTurmas || {});
      }
    } else if (inspectRoomId && inspectRoomId.startsWith("unregistered_")) {
       setEditRoomName(inspectRoomId.substring("unregistered_".length));
       setEditAssignedTurmas({});
    }
  }, [inspectRoomId, rooms]);

  // Core initialization & LocalStorage loader
  useEffect(() => {
    try {
      const storedTurmas = JSON.parse(
        localStorage.getItem("cecm_turmas") || "[]",
      ) as Turma[];
      const storedTeachers = JSON.parse(
        localStorage.getItem("cecm_teachers") || "[]",
      ) as Teacher[];
      const storedSubjects = JSON.parse(
        localStorage.getItem("cecm_subjects") || "[]",
      ) as Subject[];
      const storedSchedules = JSON.parse(
        localStorage.getItem("cecm_schedules") || "{}",
      ) as AllSchedules;
      const storedReservations = JSON.parse(
        localStorage.getItem("cecm_room_reservations") || "[]",
      ) as RoomReservation[];

      // Load or bootstrap room layouts setting
      const storedLayouts = JSON.parse(
        localStorage.getItem("cecm_room_layout") || "{}",
      ) as RoomLayoutMap;

      const specialRooms = storedTurmas.filter((t) => t.isRoom);
      const regularTurmas = storedTurmas.filter((t) => !t.isRoom);

      setRooms(specialRooms);
      setTurmas(regularTurmas);
      setTeachers(storedTeachers);
      setSubjects(storedSubjects);
      setSchedules(storedSchedules);
      setReservations(storedReservations);

      // Auto boot alignment layouts if empty or incomplete
      const bootstrappedLayouts = { ...storedLayouts };
      let updated = false;

      specialRooms.forEach((room, idx) => {
        if (!bootstrappedLayouts[room.id]) {
          // Attempt logical guess based on typical names
          let guessedBlock = "Bloco Principal";
          let guessedFloor = "Térreo";

          const lowerName = room.name.toLowerCase();
          if (
            lowerName.includes("quadra") ||
            lowerName.includes("campo") ||
            lowerName.includes("ginásio")
          ) {
            guessedBlock = "Espaço Esportivo";
            guessedFloor = "Térreo";
          } else if (
            lowerName.includes("computador") ||
            lowerName.includes("informática") ||
            lowerName.includes("lab") ||
            lowerName.includes("química") ||
            lowerName.includes("física")
          ) {
            guessedBlock = "Bloco Tecnológico";
            guessedFloor = "1º Andar";
          } else if (
            lowerName.includes("biblioteca") ||
            lowerName.includes("auditorio") ||
            lowerName.includes("auditório")
          ) {
            guessedBlock = "Bloco Administrativo";
            guessedFloor = "Térreo";
          }

          bootstrappedLayouts[room.id] = {
            block: guessedBlock,
            floor: guessedFloor,
            position: idx + 1,
          };
          updated = true;
        }
      });

      setRoomLayouts(bootstrappedLayouts);
      if (updated) {
        localStorage.setItem(
          "cecm_room_layout",
          JSON.stringify(bootstrappedLayouts),
        );
      }

      if (specialRooms.length > 0) {
        setSelectedRoomId(specialRooms[0].id);
      }

      // Time ranges loading
      const trManha = JSON.parse(
        localStorage.getItem("cecm_time_ranges_senha") ||
          localStorage.getItem("cecm_time_ranges_manha") ||
          '["07:30-08:15", "08:15-09:00", "09:00-09:45", "10:00-10:45", "10:45-11:30", "11:30-12:15"]',
      );
      const trTarde = JSON.parse(
        localStorage.getItem("cecm_time_ranges_tarde") ||
          '["13:00-13:45", "13:45-14:30", "14:30-15:15", "15:30-16:15", "16:15-17:00", "17:00-17:45"]',
      );
      const trNoite = JSON.parse(
        localStorage.getItem("cecm_time_ranges_noite") ||
          '["18:30-19:15", "19:15-20:00", "20:15-21:00", "21:00-21:45", "21:45-22:30"]',
      );

      setTimeRangesManha(trManha);
      setTimeRangesTarde(trTarde);
      setTimeRangesNoite(trNoite);
    } catch (e) {
      console.error("Error loading localStorage data", e);
    }
  }, []);

  // Save manual adjustments
  const saveLayoutMapSetting = (newLayouts: RoomLayoutMap) => {
    setRoomLayouts(newLayouts);
    localStorage.setItem("cecm_room_layout", JSON.stringify(newLayouts));
  };

  const handleUpdateRoomPlacement = (
    roomId: string,
    block: string,
    floor: string,
    position: number,
  ) => {
    const updated = {
      ...roomLayouts,
      [roomId]: {
        block: block.trim() || "Bloco Principal",
        floor: floor.trim() || "Térreo",
        position: isNaN(position) ? 1 : Math.max(1, position),
      },
    };
    saveLayoutMapSetting(updated);
    setEditRoomId(null);
  };

  // Switch physical alignment horizontal indexing
  const handleShiftRoomPosition = (
    roomId: string,
    direction: "left" | "right",
  ) => {
    const current = roomLayouts[roomId];
    if (!current) return;

    const shiftAmount = direction === "left" ? -1 : 1;
    const newPosition = Math.max(1, current.position + shiftAmount);

    const updated = {
      ...roomLayouts,
      [roomId]: {
        ...current,
        position: newPosition,
      },
    };
    saveLayoutMapSetting(updated);
  };

  // Add reservation modal helpers
  const saveReservations = (newRes: RoomReservation[]) => {
    setReservations(newRes);
    localStorage.setItem("cecm_room_reservations", JSON.stringify(newRes));
  };

  const handleAddReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResRoomId) {
      alert("Selecione uma sala/laboratório especial.");
      return;
    }
    if (!newResTeacher.trim()) {
      alert("Informe o nome do professor responsável pelo uso.");
      return;
    }
    if (!newResReason.trim()) {
      alert("Informe o motivo ou atividade da reserva.");
      return;
    }

    // Determine absolute period ID (1st to 18th)
    let periodIndex = newResPeriod;
    if (newResShift === "tarde") {
      periodIndex = newResPeriod + 6;
    } else if (newResShift === "noite") {
      periodIndex = newResPeriod + 12;
    }

    // Conflict validations
    const hasManualConflict = reservations.some(
      (r) =>
        r.roomId === newResRoomId &&
        r.dayId === newResDayId &&
        r.period === periodIndex,
    );

    const officialRoomSchedule = schedules[newResRoomId] || {};
    const officialSlotKey = `${newResDayId}-${periodIndex}`;
    const hasOfficialConflict = !!officialRoomSchedule[officialSlotKey];

    if (hasManualConflict || hasOfficialConflict) {
      alert(
        "Conflito Físico: Este espaço eletivo já se encontra ocupado neste dia e período por outra classe ou reserva.",
      );
      return;
    }

    const item: RoomReservation = {
      id: Math.random().toString(36).substr(2, 9),
      roomId: newResRoomId,
      dayId: newResDayId,
      period: periodIndex,
      teacherName: newResTeacher.trim(),
      reason: newResReason.trim(),
      shift: newResShift,
    };

    saveReservations([...reservations, item]);
    setIsModalOpen(false);
    setNewResTeacher("");
    setNewResReason("");
  };

  const handleDeleteReservation = (id: string) => {
    const updated = reservations.filter((r) => r.id !== id);
    saveReservations(updated);
    setSuccessToast("Agendamento excluído com sucesso!");
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Helper matching function for Gregório Szeremeta plant drawing
  const findMatchingRoom = (label: string) => {
    const rawLabel = label.toLowerCase().trim().replace(/[\s-]/g, "");
    return rooms.find((r) => {
      const rawName = r.name.toLowerCase().trim().replace(/[\s-]/g, "");
      return rawName === rawLabel || rawName.includes(rawLabel) || rawLabel.includes(rawName);
    });
  };

  // Autobuilt register for rooms right from clicking a vacant plan card
  const handleQuickAddRoom = (label: string) => {
    try {
      const storedTurmas = JSON.parse(
        localStorage.getItem("cecm_turmas") || "[]",
      ) as Turma[];
      
      const exists = storedTurmas.some(
        (t) => t.isRoom && t.name.toLowerCase().trim() === label.toLowerCase().trim()
      );
      if (exists) return;

      const newRoom: Turma = {
        id: "room_" + Math.random().toString(36).substr(2, 9),
        name: label,
        isRoom: true,
        color: "#657c36",
      };

      const updated = [...storedTurmas, newRoom];
      localStorage.setItem("cecm_turmas", JSON.stringify(updated));
      
      // Update state live
      setRooms(updated.filter((t) => t.isRoom));
      setTurmas(updated.filter((t) => !t.isRoom));
      setSuccessToast(`A instalação "${label}" foi cadastrada com sucesso e vinculada ao mapa escolar!`);
    } catch (e) {
      console.error("Error quick adding room:", e);
    }
  };

  const handleSaveRoomEdits = () => {
    try {
      const storedTurmas = JSON.parse(
        localStorage.getItem("cecm_turmas") || "[]",
      ) as Turma[];

      let updated = [...storedTurmas];

      if (inspectRoomId?.startsWith("unregistered_")) {
        const newRoom: Turma = {
          id: "room_" + Math.random().toString(36).substr(2, 9),
          name: editRoomName || inspectRoomId.substring("unregistered_".length),
          isRoom: true,
          color: "#657c36",
          assignedTurmas: editAssignedTurmas,
        };
        updated.push(newRoom);
      } else {
        updated = updated.map((t) => {
          if (t.id === inspectRoomId) {
            return {
              ...t,
              name: editRoomName || t.name,
              assignedTurmas: editAssignedTurmas,
            };
          }
          return t;
        });
      }

      localStorage.setItem("cecm_turmas", JSON.stringify(updated));
      setRooms(updated.filter((t) => t.isRoom));
      setTurmas(updated.filter((t) => !t.isRoom));
      setSuccessToast(`Configurações da sala foram atualizadas!`);
      setInspectRoomId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    // Clear selection so the highlighted amber state is not passed to the printed map
    setInspectRoomId(null);
    
    // Give it a tiny tick for state updates, then grab the fresh DOM
    setTimeout(() => {
      const printContent = document.getElementById("print-school-map-container");
      if (!printContent) return;
  
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("O navegador bloqueou a abertura da janela de impressão. Permita pop-ups para este site.");
        return;
      }
  
      // Extract all styles from parent to ensure Tailwind and other styles compile correctly inside print window
      let styleContent = "";
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (rules) {
              for (const rule of Array.from(rules)) {
                styleContent += rule.cssText + "\n";
              }
            }
          } catch (e) {
            if (sheet.ownerNode) {
              styleContent += `@import url("${(sheet.ownerNode as any).href || ''}");\n`;
            }
          }
        }
      } catch (err) {
        console.error("Failed to read stylesheets directly:", err);
      }

      const parentStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mapa Escolar - Impressão</title>
          <base href="${window.location.origin}/" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
          ${parentStyles}
          ${styleContent ? `<style>${styleContent}</style>` : ""}
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Inter', sans-serif;
              padding: 20px;
              margin: 0;
              background: white;
              color: #1e293b;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              box-sizing: border-box;
            }
            .map-wrapper {
               width: 100%;
               margin: 0 auto;
            }
            .no-print { display: none !important; }
            @media print {
              body { padding: 0; margin: 0; display: block; overflow: visible; background: white; }
              @page { margin: 5mm; size: landscape A4; }
              
              .map-wrapper {
                width: 100% !important;
                page-break-inside: avoid;
              }

              /* Hide all interactive action buttons, inputs, icons and tools on printed layout */
              button, input, select, textarea, .no-print {
                display: none !important;
              }

              /* For dynamic layout */
              #print-school-map-container {
                width: 100% !important;
                overflow: visible !important;
              }

              /* Force floor items horizontally side-by-side on print */
              .print-floor-row {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-start !important;
                width: 100% !important;
                gap: 16px !important;
                border-top: 1px dashed #cbd5e1 !important;
                padding-top: 12px !important;
                margin-bottom: 12px !important;
              }

              /* Force horizontal layout mapping of rooms next to the floor level text */
              .print-rooms-list {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: wrap !important;
                gap: 10px !important;
                flex: 1 !important;
              }

              /* Specific scaling for the Gregorio map to fit strictly on 1 A4 page */
              .print-gregorio-map {
                 overflow: hidden !important;
                 width: 1400px !important;
                 height: 980px !important;
                 zoom: 0.72;
                 margin: 0 auto !important;
                 padding: 24px !important;
                 page-break-inside: avoid !important;
                 break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="map-wrapper text-center">
            ${mapViewStyle !== "gregorio" ? `<h2 style="margin-bottom: 20px; font-weight: 900; color: #50622a; font-size: 24px; text-transform: uppercase;">PLANTA DE AMBIENTES FÍSICOS - MAPA ESCOLAR</h2>` : ""}
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 800);
          </script>
        </body>
        </html>
      `;
  
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }, 400);
  };

  // Get active lists
  const getPeriodListForShift = (shift: "manha" | "tarde" | "noite") => {
    const timeArray =
      shift === "manha"
        ? timeRangesManha
        : shift === "tarde"
          ? timeRangesTarde
          : timeRangesNoite;
    const startOffset = shift === "manha" ? 1 : shift === "tarde" ? 7 : 13;
    return timeArray.map((time, idx) => ({
      periodNum: startOffset + idx,
      shortLabel: `${idx + 1}ª Aula`,
      time,
    }));
  };

  const currentShiftPeriods = getPeriodListForShift(activeShift);

  // Search what occupies a space
  const getCellOccupancy = (roomId: string, dayId: string, period: number) => {
    const roomSchedule = schedules[roomId] || {};
    const slotKey = `${dayId}-${period}`;
    const officialSlot = roomSchedule[slotKey];

    if (officialSlot) {
      const subject = subjects.find((s) => s.id === officialSlot.subjectId);
      const teacher = teachers.find((t) => t.id === officialSlot.teacherId);
      const associatedTurma = turmas.find(
        (t) => t.id === officialSlot.associatedTurmaId,
      );

      return {
        type: "official" as const,
        title: associatedTurma
          ? `Turma: ${associatedTurma.name}`
          : "Aula Curricular",
        detail: `${subject?.name || "Disciplina"} • Prof. ${teacher?.name || "Docente"}`,
        color: subject?.color || "#a1a1aa",
      };
    }

    const manualRes = reservations.find(
      (r) => r.roomId === roomId && r.dayId === dayId && r.period === period,
    );
    if (manualRes) {
      return {
        type: "reserved" as const,
        title: `Reservado: ${manualRes.teacherName}`,
        detail: manualRes.reason,
        color: "#3b82f6",
        resId: manualRes.id,
      };
    }

    return null;
  };

  // Maps which Turmas frequently use the room (Global view instead of real-time period view)
  const getRoomHomeTurmasLabel = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return null;

    if (room.assignedTurmas) {
      const parts = [];
      const getTurmaName = (tId: string) => turmas.find(t => t.id === tId)?.name;
      const mName = room.assignedTurmas.manha ? getTurmaName(room.assignedTurmas.manha) : null;
      const tName = room.assignedTurmas.tarde ? getTurmaName(room.assignedTurmas.tarde) : null;
      const nName = room.assignedTurmas.noite ? getTurmaName(room.assignedTurmas.noite) : null;
      if (mName) parts.push(`Manhã: ${mName}`);
      if (tName) parts.push(`Tarde: ${tName}`);
      if (nName) parts.push(`Noite: ${nName}`);

      return parts.length > 0 ? parts.join(" | ") : null;
    }

    const roomSchedule = schedules[roomId] || {};
    const turmasUsingRoom = new Set<string>();

    Object.values(roomSchedule).forEach((slot: any) => {
      if (slot && slot.associatedTurmaId) {
        turmasUsingRoom.add(slot.associatedTurmaId);
      }
    });

    if (turmasUsingRoom.size === 0) return null;

    const usedTurmas = turmas.filter((t) => turmasUsingRoom.has(t.id));

    const manha = usedTurmas.filter((t) => t.shift === "manha").map((t) => t.name).join(", ");
    const tarde = usedTurmas.filter((t) => t.shift === "tarde").map((t) => t.name).join(", ");
    const noite = usedTurmas.filter((t) => t.shift === "noite").map((t) => t.name).join(", ");

    const parts = [];
    if (manha) parts.push(`Manhã: ${manha}`);
    if (tarde) parts.push(`Tarde: ${tarde}`);
    if (noite) parts.push(`Noite: ${noite}`);

    return parts.length > 0 ? parts.join(" | ") : null;
  };

  // Groups rooms by configured Block and Floor
  const getGroupedPhysicalMap = () => {
    const blocks: Record<string, Record<string, typeof rooms>> = {};

    rooms.forEach((room) => {
      const layout = roomLayouts[room.id] || {
        block: "Bloco Principal",
        floor: "Térreo",
        position: 1,
      };

      if (!blocks[layout.block]) {
        blocks[layout.block] = {};
      }
      if (!blocks[layout.block][layout.floor]) {
        blocks[layout.block][layout.floor] = [];
      }

      blocks[layout.block][layout.floor].push(room);
    });

    // Sort room layout by order/position index
    Object.keys(blocks).forEach((blockKey) => {
      Object.keys(blocks[blockKey]).forEach((floorKey) => {
        blocks[blockKey][floorKey].sort((a, b) => {
          const lA = roomLayouts[a.id]?.position || 0;
          const lB = roomLayouts[b.id]?.position || 0;
          return lA - lB;
        });
      });
    });

    return blocks;
  };

  const groupedBlocks = getGroupedPhysicalMap();
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // List of active unique block names and floor names for drop downs
  const uniqueBlocks = Array.from(
    new Set(Object.keys(roomLayouts).map((k) => roomLayouts[k].block)),
  ).filter(Boolean);
  const uniqueFloors = Array.from(
    new Set(Object.keys(roomLayouts).map((k) => roomLayouts[k].floor)),
  ).filter(Boolean);

  if (uniqueBlocks.length === 0)
    uniqueBlocks.push(
      "Bloco Principal",
      "Pavilhão Técnico",
      "Espaço Esportivo",
      "Anexo",
    );
  if (uniqueFloors.length === 0)
    uniqueFloors.push("Térreo", "1º Andar", "2º Andar", "Subsolo");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#657c36]/10 flex items-center justify-center text-[#657c36]">
              <Building2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Infraestrutura & Visualização de Mapa
            </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-relaxed">
            Organize a planta física da escola, alinhe salas por Blocos/Andares
            e monitore o fluxo de uso letivo
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-450 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-slate-50">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
            Nenhuma Sala Especial / Laboratório Cadastrado
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Você ainda não possui salas ou laboratórios nas tabelas. Vá ao
            gerenciador de <b>Turmas/Instalações</b> clicando no ícone do chapéu
            ou de engrenagem para adicionar espaços de infraestrutura do
            colégio.
          </p>
        </div>
      ) : (
        <>
            <div className="space-y-6">
              {/* Feedback toast banner inside layout */}
              {successToast && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successToast}</span>
                </div>
              )}

              {/* Map Layout Style selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#657c36]/10 flex items-center justify-center text-[#657c36]">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Estilo da Planta Escolar:</span>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={handlePrint}
                    className="flex flex-row items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer text-slate-500 hover:text-slate-800"
                    title="Imprimir Mapa Escolar"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setMapViewStyle("gregorio")}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                      mapViewStyle === "gregorio"
                        ? "bg-white text-[#50622a] shadow-xs border border-slate-200/50 font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Planta Física (Colégio Gregório) 🗺️
                  </button>
                  <button
                    onClick={() => setMapViewStyle("dynamic")}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                      mapViewStyle === "dynamic"
                        ? "bg-white text-slate-850 shadow-xs border border-slate-200/50 font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Layout por Blocos (Dinâmico) 🏢
                  </button>
                </div>
              </div>

              {/* Help alert for custom drawing (when in dynamic blocks style) */}
              {isMapDesignMode && mapViewStyle === "dynamic" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-left">
                  <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-900 uppercase">
                      Modo Desenho de Planta Ativo
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-snug font-medium font-sans">
                      Navegue abaixo e clique sobre as engrenagens de qualquer
                      sala para modificar o seu <b>Bloco de Alinhamento</b> ou{" "}
                      <b>Andar físico</b>. Use os botões de seta{" "}
                      <MoveLeft className="w-3 h-3 inline align-middle text-slate-500 mx-0.5" />{" "}
                      <MoveRight className="w-3 h-3 inline align-middle text-slate-500 mx-0.5" />{" "}
                      para mudar o sequenciamento horizontal na planta.
                    </p>
                  </div>
                </div>
              )}

              <div id="print-school-map-container" className="print:w-full w-full">
              {mapViewStyle === "gregorio" ? (
                /* HIGH FIDELITY PHYSICAL SCHOOL PLAN MAP */
                <div className="print-gregorio-map p-6 md:p-8 rounded-3xl border-[3px] border-[#50622a] shadow-md relative flex flex-col gap-6 transition-all duration-300 overflow-x-auto bg-[#faf9f5]"
                  style={{
                    backgroundImage: "radial-gradient(#d5d4bc 1.5px, transparent 1.5px)",
                    backgroundSize: "24px 24px"
                  }}
                >
                  {/* Historic school logo header block exactly like photograph */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#50622a]/30 pb-4 mb-2 gap-4">
                    <div className="flex items-center gap-4 text-left">
                      {/* Shield seal badge logo */}
                      <div className="w-16 h-16 rounded-full border-4 border-[#50622a] bg-[#657c36] flex items-center justify-center text-white shrink-0 relative shadow-xs">
                        <div className="absolute inset-0.5 rounded-full border border-dashed border-white/20 flex flex-col items-center justify-center">
                          <BookOpen className="w-5 h-5 text-yellow-200" />
                          <span className="text-[5px] font-black tracking-widest text-[#e2e8f0] uppercase mt-0.5">ESTADUAL</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-2xl font-extrabold text-[#50622a] font-sans uppercase tracking-tight flex items-center gap-1">
                          MAPA ESCOLAR
                        </div>
                        <h2 className="text-xs font-black text-slate-700 uppercase leading-tight">
                          Colégio Estadual Cívico-Militar Gregório Szeremeta
                        </h2>
                        <span className="text-[9px] font-semibold text-slate-550 block font-mono">
                          📞 (42) 3276-1592 / 99914-0356 • PLANTA DE AMBIENTES FÍFICOS
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[9px] font-mono text-[#50622a] font-bold select-none bg-[#f1f2e8] px-3.5 py-1.5 rounded-xl border border-[#50622a]/20">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/50" />
                        <span>SALA ATRIBUÍDA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600/50" />
                        <span>SALA LIVRE</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#50622a]/70 font-black uppercase tracking-widest text-left font-mono">
                    MAPA GERAL DE OCUPAÇÃO DAS SALAS
                  </p>

                  <div className="flex flex-col gap-8 min-w-[750px] font-sans relative z-0">
                    <div className="absolute inset-y-0 top-[20px] bottom-0 left-0 right-0 grid grid-cols-[minmax(430px,1fr)_45px_minmax(480px,1.15fr)] gap-1.5 w-full pointer-events-none -z-10">
                      <div className="col-start-2 border-l border-r border-[#50622a]/15 bg-transparent border-dashed"></div>
                    </div>
                    {/* TOP WING (Wing 1) */}
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[9px] font-black text-[#50622a] w-full text-right uppercase tracking-widest mb-1 select-none pr-1">
                        ▲ ALA SUPERIOR (BLOCO LETIVO)
                      </span>
                      <div className="grid grid-cols-[minmax(430px,1fr)_45px_minmax(480px,1.15fr)] gap-1.5 w-full items-stretch">
                        <div className="flex flex-row gap-1.5 justify-end content-stretch">
                          {GREGORIO_WING_1_LEFT.map((slot) => {
                            const matchedRoom = findMatchingRoom(slot.label);
                            const occupancyLabel = matchedRoom
                              ? getRoomHomeTurmasLabel(matchedRoom.id)
                              : null;

                            return (
                              <div
                                key={slot.id}
                                onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${slot.label}`)}
                                className={`w-36 h-28 rounded-xl border-[3px] flex flex-col justify-between p-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${
                                  inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${slot.label}`)
                                    ? "border-amber-500 scale-[1.02] shadow-md "
                                    : occupancyLabel
                                      ? "border-[#50622a] bg-[#f2f4ee]"
                                      : "border-[#50622a]/30 bg-[#f8f9f5]"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-extrabold text-[#3a471f] uppercase tracking-tight text-left">
                                      {slot.label}
                                    </span>
                                    {occupancyLabel && (
                                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    )}
                                  </div>
                                  <div className="mt-2 text-left">
                                    {occupancyLabel ? (
                                      <div className="space-y-0.5">
                                        <p className="text-[9.5px] font-black text-slate-850 leading-tight">
                                          {occupancyLabel}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400">
                                          {slot.subLabels.join(" / ")}
                                        </p>
                                        <p className="text-[8px] font-semibold text-slate-500 font-mono">
                                          LIVRE
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[7.5px] font-black uppercase text-left tracking-wider">
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-[30px] sm:w-[45px] shrink-0 flex items-center justify-center relative select-none h-28">
                          <span className="text-[7.5px] font-mono text-[#50622a]/40 font-semibold uppercase tracking-widest leading-none text-center block" style={{ writingMode: "vertical-rl" }}>CORREDOR</span>
                        </div>
                        <div className="flex flex-row gap-1.5 justify-start content-stretch">
                          {GREGORIO_WING_1.map((slot) => {
                            const matchedRoom = findMatchingRoom(slot.label);
                            const occupancyLabel = matchedRoom
                              ? getRoomHomeTurmasLabel(matchedRoom.id)
                              : null;

                            const isCantina = slot.id === "cantina";

                            return (
                              <div
                                key={slot.id}
                                onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${slot.label}`)}
                                className={`${isCantina ? "w-16" : "w-28"} h-28 rounded-xl border-[3px] flex flex-col justify-between p-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${
                                  inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${slot.label}`)
                                    ? "border-amber-500 scale-[1.02] shadow-md "
                                    : occupancyLabel
                                      ? "border-[#50622a] bg-[#f2f4ee]"
                                      : "border-[#50622a]/30 bg-[#f8f9f5]"
                                }`}
                              >
                                <div>
                                  <div className={`flex ${isCantina ? "flex-col-reverse gap-2 items-start" : "items-center justify-between"}`}>
                                    <span className={`${isCantina ? "text-[9px]" : "text-[11px]"} font-extrabold text-[#3a471f] uppercase tracking-tight text-left ${isCantina ? "break-words" : ""}`}>
                                      {slot.label}
                                    </span>
                                    {occupancyLabel && (
                                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                    )}
                                  </div>
                                  <div className="mt-2 text-left">
                                    {occupancyLabel ? (
                                      <div className="space-y-0.5">
                                        <p className={`${isCantina ? "text-[8px]" : "text-[9.5px]"} font-black text-slate-850 leading-tight ${isCantina ? "break-words" : ""}`}>
                                          {occupancyLabel}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <p className={`${isCantina ? "text-[7.5px]" : "text-[10px]"} font-bold text-slate-400 ${isCantina ? "hidden" : ""}`}>
                                          {slot.subLabels.join(" / ")}
                                        </p>
                                        <p className="text-[8px] font-semibold text-slate-500 font-mono">
                                          LIVRE
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-[7.5px] font-black uppercase text-left tracking-wider">
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE WING (Wing 2) - Full width */}
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[9px] font-black text-[#50622a] uppercase tracking-widest mb-1 select-none pl-1">
                        ◄► ALA CENTRAL (SETOR ADMINISTRATIVO / SALAS DE AULA)
                      </span>
                      <div className="grid grid-cols-[minmax(430px,1fr)_45px_minmax(480px,1.15fr)] gap-1.5 w-full items-stretch">
                        <div className="flex flex-row gap-1.5 justify-end content-stretch">
                          {GREGORIO_WING_2.slice(0, 5).map((slot, sIdx) => {
                            if ("type" in slot && slot.type === "stacked") {
                              const topMatched = findMatchingRoom(slot.top.label);
                              const topOccupancyLabel = topMatched ? getRoomHomeTurmasLabel(topMatched.id) : null;
                              const bottomMatched = findMatchingRoom(slot.bottom.label);
                              const bottomOccupancyLabel = bottomMatched ? getRoomHomeTurmasLabel(bottomMatched.id) : null;
                              return (
                                <div key={`w2l_${sIdx}`} className="w-[72px] h-28 flex flex-col gap-1 shrink-0 select-none">
                                  <div onClick={() => setInspectRoomId(topMatched ? topMatched.id : `unregistered_${slot.top.label}`)} className={`flex-1 rounded-lg border-2 flex flex-col justify-between p-1.5 cursor-pointer transition-all overflow-hidden ${inspectRoomId === (topMatched ? topMatched.id : `unregistered_${slot.top.label}`) ? "border-amber-500 scale-[1.03] shadow-xs" : topMatched ? topOccupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a] bg-[#f2f4ee]" : "border-dashed border-slate-350 bg-slate-50 text-slate-400"}`}>
                                    <div className="text-left text-[7px] xl:text-[8px] font-extrabold text-slate-800 uppercase leading-tight line-clamp-2">{slot.top.label}</div>
                                    <div className="text-[6.5px] text-slate-500 leading-none text-left mt-0.5 truncate">{topOccupancyLabel || (topMatched ? "SALA LIVRE" : "")}</div>
                                  </div>
                                  <div onClick={() => setInspectRoomId(bottomMatched ? bottomMatched.id : `unregistered_${slot.bottom.label}`)} className={`flex-1 rounded-lg border-2 flex flex-col justify-between p-1.5 cursor-pointer transition-all overflow-hidden ${inspectRoomId === (bottomMatched ? bottomMatched.id : `unregistered_${slot.bottom.label}`) ? "border-amber-500 scale-[1.03] shadow-xs" : bottomMatched ? bottomOccupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a] bg-[#f2f4ee]" : "border-dashed border-slate-350 bg-slate-50 text-slate-400"}`}>
                                    <div className="text-left text-[7px] xl:text-[8px] font-extrabold text-slate-800 uppercase leading-tight line-clamp-2">{slot.bottom.label}</div>
                                    <div className="text-[6.5px] text-slate-500 leading-none text-left mt-0.5 truncate">{bottomOccupancyLabel || (bottomMatched ? "SALA LIVRE" : "")}</div>
                                  </div>
                                </div>
                              );
                            }
                            const singleSlot = slot as { id: string; label: string; subLabels: string[]; type: string };
                            const matchedRoom = findMatchingRoom(singleSlot.label);
                            const occupancyLabel = matchedRoom ? getRoomHomeTurmasLabel(matchedRoom.id) : null;
                            return (
                              <div key={`w2l_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`flex-1 h-28 rounded-xl border-[3px] flex flex-col justify-between p-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none min-w-[75px] max-w-[140px] ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 scale-[1.02] shadow-md " : occupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a]/30 bg-[#f8f9f5]"}`}>
                                <div>
                                  <div className="flex items-center justify-between"><span className="text-[10.5px] font-extrabold text-[#3a471f] uppercase tracking-tight text-left truncate">{singleSlot.label}</span>{matchedRoom && <span className="w-2 h-2 rounded-full bg-[#50622a]" />}</div>
                                  <div className="mt-2 text-left">{occupancyLabel ? <p className="text-[9.5px] font-black text-slate-850 leading-tight">{occupancyLabel}</p> : <div className="space-y-0.5"><p className="text-[9.5px] font-bold text-slate-400 leading-tight">{singleSlot.subLabels.join(" / ")}</p>{matchedRoom && <p className="text-[8px] font-semibold text-slate-500 font-mono">SALA LIVRE</p>}</div>}</div>
                                </div>
                                <div className="text-[7.5px] font-black uppercase text-left tracking-wider">{!matchedRoom && <span className="text-red-400">+ VINCULAR</span>}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-[30px] sm:w-[45px] shrink-0 flex items-center justify-center relative select-none h-28">
                          <span className="text-[7.5px] font-mono text-[#50622a]/40 font-semibold uppercase tracking-widest leading-none text-center block" style={{ writingMode: "vertical-rl" }}>CORREDOR</span>
                        </div>
                        <div className="flex flex-row gap-1.5 justify-start content-stretch">
                          {GREGORIO_WING_2.slice(6).map((slot, sIdx) => {
                            if ("type" in slot && slot.type === "stacked") {
                              const topMatched = findMatchingRoom(slot.top.label);
                              const topOccupancyLabel = topMatched ? getRoomHomeTurmasLabel(topMatched.id) : null;
                              const bottomMatched = findMatchingRoom(slot.bottom.label);
                              const bottomOccupancyLabel = bottomMatched ? getRoomHomeTurmasLabel(bottomMatched.id) : null;
                              return (
                                <div key={`w2r_${sIdx}`} className="w-[72px] h-28 flex flex-col gap-1 shrink-0 select-none">
                                  <div onClick={() => setInspectRoomId(topMatched ? topMatched.id : `unregistered_${slot.top.label}`)} className={`flex-1 rounded-lg border-2 flex flex-col justify-between p-1.5 cursor-pointer transition-all overflow-hidden ${inspectRoomId === (topMatched ? topMatched.id : `unregistered_${slot.top.label}`) ? "border-amber-500 scale-[1.03] shadow-xs" : topMatched ? topOccupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a] bg-[#f2f4ee]" : "border-dashed border-slate-350 bg-slate-50 text-slate-400"}`}>
                                    <div className="text-left text-[7px] xl:text-[8px] font-extrabold text-slate-800 uppercase leading-tight line-clamp-2">{slot.top.label}</div>
                                    <div className="text-[6.5px] text-slate-500 leading-none text-left mt-0.5 truncate">{topOccupancyLabel || (topMatched ? "SALA LIVRE" : "")}</div>
                                  </div>
                                  <div onClick={() => setInspectRoomId(bottomMatched ? bottomMatched.id : `unregistered_${slot.bottom.label}`)} className={`flex-1 rounded-lg border-2 flex flex-col justify-between p-1.5 cursor-pointer transition-all overflow-hidden ${inspectRoomId === (bottomMatched ? bottomMatched.id : `unregistered_${slot.bottom.label}`) ? "border-amber-500 scale-[1.03] shadow-xs" : bottomMatched ? bottomOccupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a] bg-[#f2f4ee]" : "border-dashed border-slate-350 bg-slate-50 text-slate-400"}`}>
                                    <div className="text-left text-[7px] xl:text-[8px] font-extrabold text-slate-800 uppercase leading-tight line-clamp-2">{slot.bottom.label}</div>
                                    <div className="text-[6.5px] text-slate-500 leading-none text-left mt-0.5 truncate">{bottomOccupancyLabel || (bottomMatched ? "SALA LIVRE" : "")}</div>
                                  </div>
                                </div>
                              );
                            }
                            const singleSlot = slot as { id: string; label: string; subLabels: string[]; type: string };
                            const matchedRoom = findMatchingRoom(singleSlot.label);
                            const occupancyLabel = matchedRoom ? getRoomHomeTurmasLabel(matchedRoom.id) : null;
                            return (
                              <div key={`w2r_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`flex-1 h-28 rounded-xl border-[3px] flex flex-col justify-between p-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none min-w-[75px] max-w-[140px] ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 scale-[1.02] shadow-md " : occupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a]/30 bg-[#f8f9f5]"}`}>
                                <div>
                                  <div className="flex items-center justify-between"><span className="text-[10.5px] font-extrabold text-[#3a471f] uppercase tracking-tight text-left truncate">{singleSlot.label}</span>{matchedRoom && <span className="w-2 h-2 rounded-full bg-[#50622a]" />}</div>
                                  <div className="mt-2 text-left">{occupancyLabel ? <p className="text-[9.5px] font-black text-slate-850 leading-tight">{occupancyLabel}</p> : <div className="space-y-0.5"><p className="text-[9.5px] font-bold text-slate-400 leading-tight">{singleSlot.subLabels.join(" / ")}</p>{matchedRoom && <p className="text-[8px] font-semibold text-slate-500 font-mono">SALA LIVRE</p>}</div>}</div>
                                </div>
                                <div className="text-[7.5px] font-black uppercase text-left tracking-wider">{!matchedRoom && <span className="text-red-400">+ VINCULAR</span>}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM WING (Wing 3) - Full width containing many vertical tiles */}
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-[9px] font-black text-[#50622a] uppercase tracking-widest mb-1 select-none pl-1">
                        ▼ ALA INFERIOR (SECRETARIA, ADMINISTRAÇÃO, LABORATÓRIOS E BIBLIOTECA)
                      </span>
                      <div className="grid grid-cols-[minmax(430px,1fr)_45px_minmax(480px,1.15fr)] gap-1.5 w-full items-stretch h-36">
                        <div className="flex flex-row gap-1.5 justify-end content-stretch">
                          {GREGORIO_WING_3.slice(0, 3).map((slotObj, sIdx) => {
                            const singleSlot = slotObj as { id: string; label: string; subLabels: string[]; type: string; isVertical?: boolean; isSmall?: boolean };
                            const matchedRoom = findMatchingRoom(singleSlot.label);
                            const occupancyLabel = matchedRoom ? getRoomHomeTurmasLabel(matchedRoom.id) : null;
                            if (singleSlot.isVertical) {
                              return (
                                <div key={`w3l_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`w-9 h-full rounded-md border-2 flex flex-col items-center justify-between py-2 cursor-pointer transition-all hover:-translate-y-0.5 select-none shrink-0 ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 shadow-md scale-[1.02] bg-amber-50" : occupancyLabel ? "border-[#50622a]/50 bg-[#f2f4ee]" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
                                  {matchedRoom && <span className={`w-1.5 h-1.5 rounded-full ${occupancyLabel ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                  <div style={{ writingMode: "vertical-rl", textOrientation: "mixed" }} className="font-sans font-extrabold text-[8px] leading-tight tracking-widest text-[#3d4b20] uppercase text-center py-1 mt-1 shrink-0">{singleSlot.label}</div>
                                </div>
                              );
                            }
                            return (
                              <div key={`w3l_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`${singleSlot.isSmall ? 'flex-none w-[72px]' : 'flex-1 min-w-[70px] max-w-[110px]'} h-full rounded-xl border-[3px] flex flex-col justify-between p-2 sm:p-3 cursor-pointer transition-all hover:-translate-y-0.5 select-none overflow-hidden ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 bg-amber-50 shadow-md scale-[1.02]" : occupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a]/30 bg-[#f8f9f5]"}`}>
                                <div><span className="text-[9px] sm:text-[10px] font-extrabold text-[#3a471f] uppercase tracking-tight block text-left truncate">{singleSlot.label}</span><div className="text-left mt-1">{occupancyLabel ? <span className="text-[8.5px] sm:text-[9.5px] font-black text-slate-850 leading-none block line-clamp-2">{occupancyLabel}</span> : <span className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 block tracking-tight line-clamp-2 leading-snug">{singleSlot.subLabels?.join("/") || ("LIVRE")}</span>}</div></div>
                                <span className="text-[7px] font-black text-slate-500 text-left">{""}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-[30px] sm:w-[45px] flex items-center justify-center relative select-none">
                          <span className="text-[7.5px] font-mono text-[#50622a]/40 font-semibold uppercase tracking-widest hidden sm:inline" style={{ writingMode: "vertical-rl" }}>HALL DE ENTRADA</span>
                        </div>
                        <div className="flex flex-row gap-1.5 justify-start content-stretch">
                          {GREGORIO_WING_3.slice(4).map((slotObj, sIdx) => {
                            const singleSlot = slotObj as { id: string; label: string; subLabels: string[]; type: string; isVertical?: boolean; isSmall?: boolean; isWrapper?: boolean };
                            
                            if (singleSlot.isWrapper) {
                              const bMatched = findMatchingRoom("Biblioteca");
                              const cMatched = findMatchingRoom("Sala de Cinema");
                              const ciMatched = findMatchingRoom("Sala de Ciências");
                              
                              const rLib = bMatched ? getRoomHomeTurmasLabel(bMatched.id) : null;
                              const rCin = cMatched ? getRoomHomeTurmasLabel(cMatched.id) : null;
                              const rCie = ciMatched ? getRoomHomeTurmasLabel(ciMatched.id) : null;
                              
                              return (
                                <div key={`w3w_${sIdx}`} className="h-full rounded-xl border-[3px] border-[#50622a] bg-[#f2f4ee] flex flex-row p-1.5 gap-1.5 overflow-hidden">
                                  {/* Cinema and Ciencias stacked or sideways  (Vertical styling) */}
                                  <div className="flex flex-row gap-1.5 shrink-0">
                                    <div onClick={() => setInspectRoomId(cMatched ? cMatched.id : `unregistered_Cinema`)} className={`w-9 h-full rounded-md border-2 flex flex-col items-center justify-between py-2 cursor-pointer transition-all hover:-translate-y-0.5 select-none shrink-0 ${inspectRoomId === (cMatched ? cMatched.id : `unregistered_Cinema`) ? "border-amber-500 shadow-md scale-[1.02] bg-amber-50" : cMatched ? "border-[#50622a]/50 bg-white" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
                                      {cMatched && <span className={`w-1.5 h-1.5 rounded-full ${rCin ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                      <div style={{ writingMode: "vertical-rl", textOrientation: "mixed" }} className="font-sans font-extrabold text-[8px] leading-tight tracking-widest text-[#3d4b20] uppercase text-center py-1 mt-1 shrink-0">Cinema</div>
                                    </div>
                                    <div onClick={() => setInspectRoomId(ciMatched ? ciMatched.id : `unregistered_Ciencias`)} className={`w-9 h-full rounded-md border-2 flex flex-col items-center justify-between py-2 cursor-pointer transition-all hover:-translate-y-0.5 select-none shrink-0 ${inspectRoomId === (ciMatched ? ciMatched.id : `unregistered_Ciencias`) ? "border-amber-500 shadow-md scale-[1.02] bg-amber-50" : ciMatched ? "border-[#50622a]/50 bg-white" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
                                      {ciMatched && <span className={`w-1.5 h-1.5 rounded-full ${rCie ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                      <div style={{ writingMode: "vertical-rl", textOrientation: "mixed" }} className="font-sans font-extrabold text-[8px] leading-tight tracking-widest text-[#3d4b20] uppercase text-center py-1 mt-1 shrink-0">Ciências</div>
                                    </div>
                                  </div>
                                  {/* Biblioteca main */}
                                  <div onClick={() => setInspectRoomId(bMatched ? bMatched.id : `unregistered_Biblioteca`)} className={`flex-1 min-w-[70px] max-w-[120px] rounded-lg border-2 flex flex-col justify-between p-2 cursor-pointer transition-all hover:-translate-y-0.5 select-none ${inspectRoomId === (bMatched ? bMatched.id : `unregistered_Biblioteca`) ? "border-amber-500 shadow-md scale-[1.02] bg-amber-50" : bMatched ? "border-[#50622a]/50 bg-white" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
                                    <div><span className="text-[10px] font-extrabold text-[#3a471f] uppercase tracking-tight block text-left">Biblioteca</span><div className="text-left mt-1">{rLib ? <span className="text-[8px] font-black text-slate-850 leading-none block">{rLib}</span> : <span className="text-[7.5px] font-bold text-slate-400 block tracking-tight line-clamp-2 leading-snug">Leitura e Pesquisa</span>}</div></div>
                                    <div className="flex justify-between items-end">
                                      <span className="text-[7px] font-black text-slate-500 text-left">{bMatched ? "" : "+ VINCULAR"}</span>
                                      {bMatched && <span className={`w-2 h-2 rounded-full ${rLib ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const matchedRoom = findMatchingRoom(singleSlot.label);
                            const occupancyLabel = matchedRoom ? getRoomHomeTurmasLabel(matchedRoom.id) : null;
                            if (singleSlot.isVertical) {
                              return (
                                <div key={`w3r_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`w-9 h-full rounded-md border-2 flex flex-col items-center justify-between py-2 cursor-pointer transition-all hover:-translate-y-0.5 select-none shrink-0 ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 shadow-md scale-[1.02] bg-amber-50" : occupancyLabel ? "border-[#50622a]/50 bg-[#f2f4ee]" : "border-dashed border-slate-300 bg-slate-50 text-slate-400"}`}>
                                  {matchedRoom && <span className={`w-1.5 h-1.5 rounded-full ${occupancyLabel ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                  <div style={{ writingMode: "vertical-rl", textOrientation: "mixed" }} className="font-sans font-extrabold text-[8px] leading-tight tracking-widest text-[#3d4b20] uppercase text-center py-1 mt-1 shrink-0">{singleSlot.label}</div>
                                </div>
                              );
                            }
                            const isSm = singleSlot.isSmall;
                            return (
                              <div key={`w3r_${sIdx}`} onClick={() => setInspectRoomId(matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`)} className={`flex-1 h-full rounded-xl border-[3px] flex flex-col justify-between ${isSm ? 'p-2' : 'p-3'} cursor-pointer transition-all hover:-translate-y-0.5 select-none ${isSm ? 'min-w-[50px] max-w-[70px]' : 'min-w-[70px] max-w-[110px]'} ${inspectRoomId === (matchedRoom ? matchedRoom.id : `unregistered_${singleSlot.label}`) ? "border-amber-500 bg-amber-50 shadow-md scale-[1.02]" : occupancyLabel ? "border-[#50622a] bg-[#f2f4ee]" : "border-[#50622a]/30 bg-[#f8f9f5]"}`}>
                                <div><span className={`${isSm ? 'text-[8px] sm:text-[9px]' : 'text-[10px]'} font-extrabold text-[#3a471f] uppercase tracking-tight block text-left truncate`}>{singleSlot.label}</span><div className="text-left mt-1">{occupancyLabel ? <span className="text-[8px] font-black text-slate-850 leading-none block line-clamp-2">{occupancyLabel}</span> : <span className={`${isSm ? 'text-[7px]' : 'text-[8px]'} font-bold text-slate-400 block tracking-tight line-clamp-1 leading-snug`}>{singleSlot.subLabels?.join("/") || (matchedRoom ? "LIVRE" : "LIVRE")}</span>}</div></div>
                                <div className="flex justify-between items-end">
                                  <span className="text-[7px] font-black text-slate-500 text-left">{matchedRoom ? "" : "+ LINCAR"}</span>
                                  {matchedRoom && <span className={`w-2 h-2 rounded-full ${occupancyLabel ? "bg-amber-500" : "bg-emerald-500"}`} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Blueprint visual footer details */}
                  <div className="text-[8px] font-mono text-[#50622a] border-t border-[#50622a]/20 pt-3 flex justify-between items-center select-none">
                    <span>
                      PLANO DE ALINHAMENTO FÍSICO COM ALOCADOR DE SINAL LETIVO
                    </span>
                    <span>SALA_ESTATUTO_TOTAL: {rooms.length}</span>
                  </div>
                </div>
              ) : (
                /* CLEAN MODERN DYNAMIC LAYOUT BLOCKS RENDERER */
                <div
                  className="p-6 md:p-8 rounded-3xl border border-slate-200 min-h-[500px] shadow-sm relative flex flex-col gap-8 transition-colors duration-300 overflow-x-auto"
                  style={{
                    backgroundColor: "#fcfcf9",
                    backgroundImage:
                      "radial-gradient(#e2e8f0 1.5px, transparent 1.5px)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  {/* Blueprint Header HUD details */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping font-extrabold" />
                      <div>
                        <span className="text-[9px] font-black text-[#50622a] uppercase tracking-widest block font-mono">
                          PAINEL ATIVO DE LAYOUT
                        </span>
                        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          PLANTA DE IMPACTO DA INFRAESTRUTURA FÍSICA •{" "}
                          {DAYS.find((d) => d.id === selectedDayId)?.label}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-550 border border-emerald-600/30" />
                        <span>SALA LIVRE</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/30" />
                        <span>SALA ATRIBUÍDA</span>
                      </div>
                    </div>
                  </div>

                  {/* Loops over blocks to draw pavilions */}
                  <div className="flex flex-col gap-10 min-w-[800px]">
                    {Object.keys(groupedBlocks).length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-sans">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Nenhum Bloco Cadastrado ou Desenhado
                        </p>
                      </div>
                    ) : (
                      Object.keys(groupedBlocks).map((blockName) => {
                        const floors = groupedBlocks[blockName];

                        // Sort floors typical bottom -> top representation
                        const sortedFloorKeys = Object.keys(floors).sort(
                          (a, b) => {
                            if (
                              a.toLowerCase().includes("térreo") ||
                              a.toLowerCase().includes("terreo")
                            )
                              return 1;
                            if (
                              b.toLowerCase().includes("térreo") ||
                              b.toLowerCase().includes("terreo")
                            )
                              return -1;
                            return b.localeCompare(a); // Standard string sort reversely
                          },
                        );

                        return (
                          <div
                            key={blockName}
                            className="bg-white border border-slate-200/80 rounded-2xl p-5 relative overflow-hidden shadow-xs transition"
                          >
                            {/* Block Outer Labeled Border */}
                            <div className="absolute top-3 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                              BLOCO: {blockName}
                            </div>

                            <div className="mb-4">
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-sans bg-slate-50 border border-slate-200 w-max px-3 py-1.5 rounded-xl shadow-xs">
                                🏢 {blockName}
                              </span>
                            </div>

                            {/* Stack layouts in block */}
                            <div className="flex flex-col gap-4">
                              {sortedFloorKeys.map((floorName) => {
                                const floorRooms = floors[floorName];
                                return (
                                  <div
                                    key={floorName}
                                    className="border-t border-dashed border-slate-200 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 print-floor-row"
                                  >
                                    {/* Floor Level Name Plate */}
                                    <div className="w-24 text-left font-sans shrink-0 border-r border-slate-150 pr-2">
                                      <span className="text-[8.5px] font-black text-slate-400 uppercase block font-mono">
                                        ANDAR
                                      </span>
                                      <span className="text-xs font-black text-slate-650 uppercase truncate block">
                                        {floorName}
                                      </span>
                                    </div>

                                    {/* Sequence layout of rooms in floor */}
                                    <div className="flex-1 flex flex-wrap gap-3 print-rooms-list">
                                      {floorRooms.map((room) => {
                                        // Get active coordinates offset mapping
                                        const occupancyLabel = getRoomHomeTurmasLabel(room.id);
                                        const isEditingLayout =
                                          editRoomId === room.id;

                                        return (
                                          <div
                                            key={room.id}
                                            className={`relative rounded-xl p-3 flex flex-col justify-between font-sans border min-w-[140px] max-w-[200px] flex-1 min-h-[90px] transition-all group ${
                                              occupancyLabel
                                                ? "bg-amber-50/30 border-amber-250 text-amber-900 shadow-xs"
                                                : "bg-emerald-50/10 border-emerald-250 text-emerald-900 shadow-xs"
                                            }`}
                                          >
                                            {/* Quick Edit Positioning form inline */}
                                            {isEditingLayout ? (
                                              <div className="space-y-1.5 text-xs text-left bg-slate-900 p-2.5 rounded-xl border border-slate-700 z-20 absolute inset-0 text-white">
                                                <div className="flex justify-between items-center bg-slate-800 px-1.5 py-1 rounded-md text-[8px] font-black uppercase text-cyan-300">
                                                  <span>Ajustes Físicos</span>
                                                  <button
                                                    onClick={() =>
                                                      setEditRoomId(null)
                                                    }
                                                    className="text-red-400 hover:text-red-300 font-bold"
                                                  >
                                                    FECHAR
                                                  </button>
                                                </div>
                                                <div className="space-y-1">
                                                  <input
                                                    type="text"
                                                    value={editBlockName}
                                                    onChange={(e) =>
                                                      setEditBlockName(
                                                        e.target.value,
                                                      )
                                                    }
                                                    placeholder="Bloco"
                                                    className="w-full text-[9px] font-bold px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none"
                                                    list="blocks-datalist"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={editFloorName}
                                                    onChange={(e) =>
                                                      setEditFloorName(
                                                        e.target.value,
                                                      )
                                                    }
                                                    placeholder="Andar"
                                                    className="w-full text-[9px] font-bold px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none"
                                                    list="floors-datalist"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      handleUpdateRoomPlacement(
                                                        room.id,
                                                        editBlockName,
                                                        editFloorName,
                                                        editOrderNum,
                                                      )
                                                    }
                                                    className="w-full text-[8.5px] font-black bg-[#657c36] hover:bg-[#50622a] text-white rounded py-1 uppercase transition-colors"
                                                  >
                                                    Salvar Alinhamento
                                                  </button>
                                                </div>
                                              </div>
                                            ) : null}

                                            {/* Room Card content */}
                                            <div className="space-y-1">
                                              <div className="flex justify-between items-start gap-1">
                                                <span className="text-[10.5px] font-extrabold uppercase tracking-tight truncate max-w-[85%] text-slate-800">
                                                  {room.name}
                                                </span>

                                                {/* Action controls based on editor state */}
                                                {isMapDesignMode ? (
                                                  <div className="flex items-center gap-1 z-10 w-max shrink-0">
                                                    <button
                                                      onClick={() =>
                                                        handleShiftRoomPosition(
                                                          room.id,
                                                          "left",
                                                        )
                                                      }
                                                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                      title="Mover para Esquerda"
                                                    >
                                                      <MoveLeft className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        const current =
                                                          roomLayouts[
                                                            room.id
                                                          ] || {
                                                            block:
                                                              "Bloco Principal",
                                                            floor: "Térreo",
                                                            position: 1,
                                                          };
                                                        setEditRoomId(room.id);
                                                        setEditBlockName(
                                                          current.block,
                                                        );
                                                        setEditFloorName(
                                                          current.floor,
                                                        );
                                                        setEditOrderNum(
                                                          current.position,
                                                        );
                                                      }}
                                                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                      title="Editar Detalhes"
                                                    >
                                                      <Wrench className="w-2.5 h-2.5" />
                                                    </button>
                                                    <button
                                                      onClick={() =>
                                                        handleShiftRoomPosition(
                                                          room.id,
                                                          "right",
                                                        )
                                                      }
                                                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                      title="Mover para Direita"
                                                    >
                                                      <MoveRight className="w-2.5 h-2.5" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                                      occupancyLabel
                                                        ? "bg-amber-500"
                                                        : "bg-[#10b981]"
                                                    }`}
                                                  />
                                                )}
                                              </div>

                                              <p className="text-[9px] font-semibold text-slate-600 line-clamp-2 leading-snug mt-1 font-mono">
                                                {occupancyLabel
                                                  ? occupancyLabel
                                                  : "Vago / Sem Aula Registrada"}
                                              </p>
                                            </div>

                                            <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[7px] font-black uppercase tracking-wider">
                                              <span
                                                className={
                                                  occupancyLabel
                                                    ? "text-amber-600 font-bold"
                                                    : "text-emerald-600 font-bold"
                                                }
                                              >
                                                {occupancyLabel
                                                  ? "SALA ATRIBUÍDA"
                                                  : "LIVRE"}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Foot indicators and info details */}
                  <div className="text-[8.5px] font-mono text-slate-450 border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span>
                      SISTEMA DE PLANTA FÍSICA E IMPACTO DE SALAS DE INFRAESTRUTURA
                    </span>
                    <span>TOTAL MONITORADO: {rooms.length}</span>
                  </div>
                </div>
              )}
              </div>

              {/* FLOATING INSPECTOR CONTROL BOX BELOW FLOOR PLAN */}
              {inspectRoomId && (
                (() => {
                  const isUnregistered = inspectRoomId.startsWith("unregistered_");
                  const rawLabel = isUnregistered
                    ? inspectRoomId.substring("unregistered_".length)
                    : "";
                  
                  const activeRoom = isUnregistered
                    ? null
                    : rooms.find((r) => r.id === inspectRoomId);

                  if (!activeRoom && !isUnregistered) return null;

                  const roomName = activeRoom ? activeRoom.name : rawLabel;
                  
                  let periodIndex = simulationPeriod;
                  if (activeShift === "tarde") periodIndex = simulationPeriod + 6;
                  if (activeShift === "noite") periodIndex = simulationPeriod + 12;

                  const occupancy = activeRoom
                    ? getCellOccupancy(activeRoom.id, selectedDayId, periodIndex)
                    : null;

                  return (
                    <div className="bg-white text-slate-850 rounded-2xl border border-slate-200 p-5 shadow-lg text-left animate-in slide-in-from-bottom duration-350">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#657c36]/10 border border-[#657c36]/25 flex items-center justify-center text-[#50622a]">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[8px] font-black tracking-wider text-[#50622a] block font-mono uppercase">
                              INSPECTOR DE ESPAÇO ATIVO
                            </span>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                              {roomName}
                            </h3>
                          </div>
                        </div>
                        <button
                          onClick={() => setInspectRoomId(null)}
                          className="px-2.5 py-1 text-[8.5px] font-black bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-md uppercase tracking-wider transition cursor-pointer"
                        >
                          Fechar Painel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Nome */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-2">Nome da Instalação</label>
                            <input type="text" value={editRoomName} onChange={e => setEditRoomName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#657c36] transition-colors" placeholder="Ex: Sala 1, Lab 2" />
                          </div>
                        </div>

                        {/* Turma Manha */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-2">Turma Base (Manhã)</label>
                            <select value={editAssignedTurmas.manha || ""} onChange={e => setEditAssignedTurmas(prev => ({...prev, manha: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#657c36] transition-colors cursor-pointer">
                              <option value="">-- Livre / S.D. --</option>
                              {turmas.filter(t => !t.isRoom && (t.shift === "manha" || t.shift === "ambos")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Turma Tarde */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-2">Turma Base (Tarde)</label>
                            <select value={editAssignedTurmas.tarde || ""} onChange={e => setEditAssignedTurmas(prev => ({...prev, tarde: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#657c36] transition-colors cursor-pointer">
                              <option value="">-- Livre / S.D. --</option>
                              {turmas.filter(t => !t.isRoom && (t.shift === "tarde" || t.shift === "ambos")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Turma Noite */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block tracking-wider mb-2">Turma Base (Noite)</label>
                            <select value={editAssignedTurmas.noite || ""} onChange={e => setEditAssignedTurmas(prev => ({...prev, noite: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#657c36] transition-colors cursor-pointer">
                              <option value="">-- Livre / S.D. --</option>
                              {turmas.filter(t => !t.isRoom && (t.shift === "noite" || t.shift === "ambos")).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Panel bottom actions and fast links */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3.5">
                        <button
                          type="button"
                          onClick={() => setInspectRoomId(null)}
                          className="bg-transparent hover:bg-slate-100 text-slate-500 font-bold text-[10px] uppercase py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRoomEdits}
                          className="bg-[#657c36] hover:bg-[#50622a] text-white font-black text-[10px] uppercase py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          Salvar Configurações
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Data lists helper for dropdowns input */}
              <datalist id="blocks-datalist">
                {uniqueBlocks.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              <datalist id="floors-datalist">
                {uniqueFloors.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
        </>
      )}

      {/* Reservation Drawer Modal Box */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-900/65 z-[100] backdrop-blur-sm flex items-center justify-center p-4 font-sans print:hidden"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]-custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 uppercase tracking-tight text-sm">
                      Reserva de Infraestrutura
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1 animate-pulse">
                      Agendamento de atividade extraordinária
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleAddReservation}
                className="space-y-4 text-left"
              >
                {/* Space Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Selecione qual Instalação Física:
                  </label>
                  <select
                    value={newResRoomId}
                    onChange={(e) => setNewResRoomId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition bg-white cursor-pointer"
                  >
                    <option value="" disabled>
                      -- escolha a sala especial --
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Day */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                      Dia da Semana:
                    </label>
                    <select
                      value={newResDayId}
                      onChange={(e) => setNewResDayId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition bg-white cursor-pointer"
                    >
                      {DAYS.map((day) => (
                        <option key={day.id} value={day.id}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Shift */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                      Turno:
                    </label>
                    <select
                      value={newResShift}
                      onChange={(e) => {
                        setNewResShift(e.target.value as any);
                        setNewResPeriod(1);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition bg-white cursor-pointer"
                    >
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                    </select>
                  </div>
                </div>

                {/* Period Select */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Selecione qual Período / Aula:
                  </label>
                  <select
                    value={newResPeriod}
                    onChange={(e) => setNewResPeriod(parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition bg-white cursor-pointer"
                  >
                    {newResShift === "manha" &&
                      timeRangesManha.map((t, idx) => (
                        <option key={idx} value={idx + 1}>
                          {idx + 1}ª Aula ({t})
                        </option>
                      ))}
                    {newResShift === "tarde" &&
                      timeRangesTarde.map((t, idx) => (
                        <option key={idx} value={idx + 1}>
                          {idx + 1}ª Aula ({t})
                        </option>
                      ))}
                    {newResShift === "noite" &&
                      timeRangesNoite.map((t, idx) => (
                        <option key={idx} value={idx + 1}>
                          {idx + 1}ª Aula ({t})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Teacher Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Professor Responsável:
                  </label>
                  <input
                    type="text"
                    value={newResTeacher}
                    onChange={(e) => setNewResTeacher(e.target.value)}
                    placeholder="Ex: Prof. Carlos Santana"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 transition bg-white"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                    Atividade / Finalidade:
                  </label>
                  <textarea
                    rows={3}
                    value={newResReason}
                    onChange={(e) => setNewResReason(e.target.value)}
                    placeholder="Ex: Reforço de Física com simuladores, Palestra motivacional para 3º ano médio, Conselho de Classe extraordinário..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 focus:outline-none focus:border-slate-900 transition bg-white resize-none"
                  />
                </div>

                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[9.5px] font-medium leading-snug text-blue-700">
                    Ao confirmar, esta instalação estará temporariamente ocupada
                    nesta coordenada de tempo, sendo omitida de agendamento em
                    cascata.
                  </p>
                </div>

                {/* Submit footer links */}
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase hover:bg-slate-150 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 font-sans transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 text-xs font-black uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-sans hover:shadow-lg transition cursor-pointer"
                  >
                    Confirmar Reserva
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
