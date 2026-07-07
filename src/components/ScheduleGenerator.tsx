import React, { useState, useEffect } from "react";
import { renderToString } from "react-dom/server";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleGenAI } from "@google/genai";
import {
  Users,
  BookOpen,
  Plus,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Printer,
  FileText,
  Loader2,
  Upload,
  AlertCircle,
  Pencil,
  Image as ImageIcon,
  X,
  DoorClosed,
  ChevronDown,
  ChevronUp,
  Menu,
  Sliders,
  School,
  Shuffle,
  Sparkles,
  Wand2,
  AlertTriangle,
  HelpCircle,
  Info,
  Minimize2,
  Maximize2,
  Eye,
  Clock,
  Lock,
  Sun,
  Moon,
  CloudSun,
  Key,
  Check,
  BarChart2,
  Clipboard,
  Monitor,
  TabletIcon,
  Calculator,
  FlaskConical,
  Palette,
  Activity,
  Music,
  Globe,
  Microscope,
  Library,
  Dumbbell,
  Code,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ValidationPanel } from "./ValidationPanel";
import { runSolverClient } from "../lib/clientSolver";

interface Teacher {
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

interface Subject {
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
  levelConstraint?: "ambos" | "fundamental" | "medio" | "tecnico";
  gradeConstraint?: string;
  suffixConstraint?: string;
  allowedTurmaIds?: string[];
  workloadFundamental?: number;
  workloadMedio?: number;
  isTechnical?: boolean;
  color?: string;
}

interface Turma {
  id: string;
  name: string;
  shift?: "manha" | "tarde" | "noite" | "ambos";
  isRoom?: boolean;
  color?: string;
  icon?: string;
  dailyClassCount?: 5 | 6;
  isTechnical?: boolean;
  isCCM?: boolean;
}

interface ScheduleSlot {
  teacherId: string;
  subjectId: string;
  associatedTurmaId?: string;
  associatedRoomId?: string;
}

type Schedule = Record<string, ScheduleSlot>; // Key format: "day-period" e.g. "seg-1"
type AllSchedules = Record<string, Schedule>; // Key format: classId -> Schedule

const DAYS = [
  {
    id: "seg",
    label: "Segunda",
    screenBg: "bg-sky-900",
    printBg: "#e0f2fe",
    printText: "#0369a1",
  },
  {
    id: "ter",
    label: "Terça",
    screenBg: "bg-emerald-950",
    printBg: "#d1fae5",
    printText: "#047857",
  },
  {
    id: "qua",
    label: "Quarta",
    screenBg: "bg-amber-950",
    printBg: "#fef3c7",
    printText: "#b45309",
  },
  {
    id: "qui",
    label: "Quinta",
    screenBg: "bg-violet-950",
    printBg: "#ede9fe",
    printText: "#6d28d9",
  },
  {
    id: "sex",
    label: "Sexta",
    screenBg: "bg-rose-950",
    printBg: "#ffe4e6",
    printText: "#be123c",
  },
];

const ID_LAB_INFO_COMP = "lab-info-comp-id";
const ID_LAB_INFO_TAB = "lab-info-tab-id";
const ID_SALA_MAT = "sala-mat-id";

const getDisplayPeriod = (p: number) => (p > 12 ? p - 12 : p > 6 ? p - 6 : p);
const getShift = (p: number) => (p > 12 ? "noite" : p > 6 ? "tarde" : "manha");

const normalizeGenericName = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s+/g, " "); // replace multiple spaces with a single space
};

const normalizeTurmaName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[º°]/g, "o") // replace masculine ordinal indicator with o
    .replace(/ª/g, "a") // replace feminine ordinal indicator with a
    .replace(/[^a-z0-9]/g, ""); // remove everything else (spaces, dashes, dots, etc.)
};

const formatTurmaName = (name: string): string => {
  let cleaned = name.trim();
  if (!cleaned) return "";

  // Handle case like "6 ano A" or "1 ano C" or "6o ano a" or "6º ano A" or "6anoA" or "6ºA" or "6a" or "6oA"
  const regex = /^(\d+)\s*(?:ano|anos|º|ª|°|o|a|\.|\-|\s)*\s*([a-zA-Z])$/i;
  const match = cleaned.match(regex);
  if (match) {
    const num = match[1];
    const letter = match[2].toUpperCase();
    return `${num}º ${letter}`;
  }

  // General capitalizations/formatting for other patterns
  cleaned = cleaned.replace(
    /\s+([a-zA-Z])$/,
    (_, letter) => ` ${letter.toUpperCase()}`,
  );
  cleaned = cleaned.replace(/([a-zA-Z])$/, (letter) => letter.toUpperCase());

  cleaned = cleaned.replace(
    /(\d+)\s*[º°oªa]\s*([A-Z])$/i,
    (_, num, letter) => `${num}º ${letter.toUpperCase()}`,
  );
  cleaned = cleaned.replace(
    /(\d+)\s*([A-Z])$/i,
    (_, num, letter) => `${num}º ${letter.toUpperCase()}`,
  );

  cleaned = cleaned
    .split(/\s+/)
    .map((word) => {
      if (word.toLowerCase() === "ano") return "Ano";
      if (word.toLowerCase() === "anos") return "Anos";
      if (word.toLowerCase() === "medio") return "Médio";
      if (word.toLowerCase() === "médio") return "Médio";
      if (word.toLowerCase() === "fundamental") return "Fundamental";

      const ordinalMatch = word.match(/^(\d+)[oO]$/);
      if (ordinalMatch) return `${ordinalMatch[1]}º`;
      const ordinalMatch2 = word.match(/^(\d+)[aA]$/);
      if (ordinalMatch2) return `${ordinalMatch2[1]}º`;
      return word;
    })
    .join(" ");

  return cleaned;
};

export const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return (
      Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    );
  }
};

export const generateDistinctColor = (subjects: any[]) => {
  const existingHues = subjects.map(s => {
    const hex = s.color?.replace('#', '') || '000000';
    const r = parseInt(hex.substring(0,2), 16) / 255;
    const g = parseInt(hex.substring(2,4), 16) / 255;
    const b = parseInt(hex.substring(4,6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else if (max === b) h = (r - g) / d + 4;
      h /= 6;
    }
    return h * 360;
  });

  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  let bestHue = Math.floor(Math.random() * 360);
  let maxDist = -1;
  
  if (existingHues.length === 0) {
    return hslToHex(bestHue, 70, 60);
  }

  for (let i = 0; i < 50; i++) {
    const testHue = Math.floor(Math.random() * 360);
    let minDist = 360;
    for (const h of existingHues) {
      let dist = Math.abs(testHue - h);
      if (dist > 180) dist = 360 - dist;
      if (dist < minDist) minDist = dist;
    }
    if (minDist > maxDist) {
      maxDist = minDist;
      bestHue = testHue;
    }
  }

  const s = 65 + (Math.random() * 25);
  const l = 60 + (Math.random() * 20);
  return hslToHex(bestHue, s, l);
};

export const getDeterministicColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  const h = Math.abs(hash) % 360;
  const s = 65 + (Math.abs(hash) % 25);
  const l = 60 + (Math.abs(hash) % 20);
  return hslToHex(h, s, l);
};

const applyParanaCivicoMilitarMatrix = (
  currentSubjects: Subject[],
  currentTurmas: Turma[],
) => {
  let nextSubjects = currentSubjects.map((s) => ({ ...s }));
  let changed = false;

  // Ordered by 6º, 7º, 8º, 9º, 1ª, 2ª, 3ª, 1ª(Mark), 2ª(Mark)
  const grid: Record<string, number[]> = {
    Arte: [2, 2, 2, 2, 2, 2, 0, 2, 0],
    "Arte II": [0, 0, 0, 0, 0, 0, 2, 0, 0],
    Biologia: [0, 0, 0, 0, 2, 0, 2, 2, 0],
    "Cidadania e Civismo": [1, 1, 1, 1, 1, 1, 1, 1, 1],
    Ciências: [2, 3, 3, 2, 0, 0, 0, 0, 0],
    "Educação Física": [2, 2, 2, 2, 2, 2, 2, 2, 2],
    "Educação Financeira": [2, 2, 2, 2, 2, 2, 2, 0, 1],
    "Ensino Religioso": [1, 1, 0, 0, 0, 0, 0, 0, 0],
    Filosofia: [0, 0, 0, 0, 0, 2, 0, 0, 2],
    "Filosofia Análise de Textos Filosóficos": [0, 0, 0, 0, 0, 2, 0, 0, 0],
    Física: [0, 0, 0, 0, 0, 2, 2, 0, 2],
    Geografia: [2, 3, 2, 3, 0, 0, 0, 2, 0],
    "Geografia do Paraná": [0, 0, 0, 0, 2, 0, 0, 0, 0],
    "Geografia I": [0, 0, 0, 0, 0, 0, 2, 0, 0],
    História: [2, 2, 3, 2, 0, 2, 0, 0, 2],
    "História do Paraná": [0, 0, 0, 0, 2, 0, 0, 0, 0],
    "História I": [0, 0, 0, 0, 0, 0, 2, 0, 0],
    "Língua Portuguesa": [4, 3, 4, 3, 4, 4, 4, 2, 3],
    "Redação e Leitura": [0, 2, 2, 0, 0, 0, 0, 0, 0],
    "Literatura e Produção de Texto": [0, 0, 0, 0, 0, 2, 0, 0, 0],
    "Língua Inglesa": [2, 2, 2, 2, 2, 2, 0, 2, 2],
    "Ling. Inglesa I": [0, 0, 0, 0, 0, 0, 2, 0, 0],
    "Língua Espanhola": [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Matemática: [4, 5, 5, 5, 4, 4, 4, 3, 2],
    "Educação Digital Comp Prog e Robótica": [2, 2, 2, 2, 0, 0, 0, 0, 0],
    "Educação Digital e Computação: Programação e IA": [
      0, 0, 0, 0, 2, 0, 0, 2, 1,
    ],
    "Leitura Rec. Aprend. Língua Portuguesa": [2, 0, 0, 2, 2, 0, 0, 0, 0],
    "Rec. Aprend. Matemática": [2, 0, 0, 2, 0, 0, 0, 0, 0],
    "DOCÊNCIA II - LP": [0, 0, 0, 0, 0, 0, 0, 0, 0],
    "DOCÊNCIA II - MAT.": [0, 0, 0, 0, 0, 0, 0, 0, 0],
    Química: [0, 0, 0, 0, 2, 0, 2, 2, 0],
    Sociologia: [0, 0, 0, 0, 0, 2, 0, 0, 1],
    "Sociologia Gov Cid Sociedade": [0, 0, 0, 0, 0, 1, 0, 0, 0],
    "Sociologia I": [0, 0, 0, 0, 0, 0, 2, 0, 0],
    "Projeto De Vida": [0, 0, 0, 0, 0, 0, 1, 0, 0],
    "Arte Paranaense": [0, 0, 0, 0, 1, 0, 0, 0, 0],
    "Fundamentos do Marketing": [0, 0, 0, 0, 0, 0, 0, 2, 0],
    "Tecnologias Digitais Aplicadas ao Marketing": [0, 0, 0, 0, 0, 0, 0, 1, 1],
    "Análise de mercado e comportamento do consumidor": [
      0, 0, 0, 0, 0, 0, 0, 0, 2,
    ],
    "Comunicação de marketing": [0, 0, 0, 0, 0, 0, 0, 1, 2],
    "Técnicas de vendas e marketing de varejo": [0, 0, 0, 0, 0, 0, 0, 2, 1],
    "Planejamento de marketing": [0, 0, 0, 0, 0, 0, 0, 1, 2],
    "Segmentação e posicionamento de marketing": [0, 0, 0, 0, 0, 0, 0, 1, 0],
    "Marketing de conteúdo": [0, 0, 0, 0, 0, 0, 0, 2, 0],
    "Relações Interpessoais": [0, 0, 0, 0, 0, 0, 0, 0, 1],
    "Pesquisa de Marketing": [0, 0, 0, 0, 0, 0, 0, 0, 1],
    "Legislação aplicada ao marketing": [0, 0, 0, 0, 0, 0, 0, 0, 1],
    "Cultura e Arte": [0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  const gradeIndices = [
    ["6º"],
    ["7º"],
    ["8º"],
    ["9º"],
    ["1ª", "não mark"],
    ["2ª", "não mark"],
    ["3ª"],
    ["1ª", "mark"],
    ["2ª", "mark"],
  ];

  Object.keys(grid).forEach((subjName) => {
    let subj = nextSubjects.find(
      (s) => s.name.toLowerCase().trim() === subjName.toLowerCase().trim(),
    );
    if (!subj) {
      subj = {
        id: generateId(),
        name: subjName,
        levelConstraint: "ambos",
        workload: 0,
        classWorkload: 0,
        customWorkloads: {},
      };
      nextSubjects.push(subj);
      changed = true;
    }
    if (!subj.customWorkloads) subj.customWorkloads = {};

    currentTurmas.forEach((t) => {
      if (t.isRoom) return;
      const nameL = t.name.toLowerCase();
      let idx = -1;

      if (nameL.includes("6º") || nameL.includes("6°")) idx = 0;
      else if (nameL.includes("7º") || nameL.includes("7°")) idx = 1;
      else if (nameL.includes("8º") || nameL.includes("8°")) idx = 2;
      else if (nameL.includes("9º") || nameL.includes("9°")) idx = 3;
      else if (
        nameL.includes("3ª") ||
        nameL.includes("3°") ||
        nameL.includes("3a")
      )
        idx = 6;
      else if (
        nameL.includes("1ª") ||
        nameL.includes("1°") ||
        nameL.includes("1a")
      ) {
        idx = nameL.includes("marketing") || nameL.includes("mark") ? 7 : 4;
      } else if (
        nameL.includes("2ª") ||
        nameL.includes("2°") ||
        nameL.includes("2a")
      ) {
        idx = nameL.includes("marketing") || nameL.includes("mark") ? 8 : 5;
      }

      if (idx >= 0) {
        const targetWL = grid[subjName][idx];
        if (subj.customWorkloads![t.id] !== targetWL) {
          subj.customWorkloads![t.id] = targetWL;
          changed = true;
        }
      }
    });
  });

  return { nextSubjects, changed };
};

const SUBJECT_ID_MAP: Record<string, string> = {
  "sub-port": "Língua Portuguesa",
  "sub-mat": "Matemática",
  "sub-cien": "Ciências",
  "sub-his": "História",
  "sub-geo": "Geografia",
  "sub-ing": "Língua Inglesa",
  "sub-art": "Arte",
  "sub-ef": "Educação Física",
  "sub-ensr": "Ensino Religioso",
  "sub-cid": "Cidadania e Civismo",
  "sub-edfin": "Educação Financeira",
  "sub-robot": "Educação Digital Comp Prog e Robótica",
  "sub-eddigc": "Educação Digital e Computação: Programação e IA",
  "sub-pvida": "Projeto De Vida",
  "sub-fil": "Filosofia",
  "sub-soc": "Sociologia",
  "sub-bio": "Biologia",
  "sub-fis": "Física",
  "sub-quim": "Química"
};

const getSubjectCanonicalIdKey = (sName: string): string | null => {
  const norm = sName.toLowerCase().trim();
  for (const [id, canonicalName] of Object.entries(SUBJECT_ID_MAP)) {
    const normCanonical = canonicalName.toLowerCase().trim();
    if (norm === normCanonical) return id;
    
    // Add common aliases
    if (id === "sub-port" && (norm === "português" || norm === "portugues")) return id;
    if (id === "sub-ing" && (norm === "inglês" || norm === "ingles" || norm === "língua inglesa" || norm === "ling. inglesa" || norm === "língua inglesa i" || norm === "ling. inglesa i")) return id;
    if (id === "sub-art" && (norm === "artes" || norm === "arte ii")) return id;
    if (id === "sub-ef" && (norm === "ed. física" || norm === "educação física" || norm === "educacao fisica")) return id;
    if (id === "sub-ensr" && (norm === "religião" || norm === "ens. religioso" || norm === "ensino religioso")) return id;
    if (id === "sub-cid" && (norm === "cidadania" || norm === "cidadania e civismo")) return id;
    if (id === "sub-edfin" && (norm === "ed. financeira" || norm === "educação financeira" || norm === "financeira")) return id;
    if (id === "sub-robot" && (norm.includes("robótica") || norm.includes("computacional") || norm.includes("digital comp prog"))) return id;
    if (id === "sub-eddigc" && (norm.includes("computação: programação") || norm.includes("digital e computação") || norm.includes("programação e ia"))) return id;
  }
  return null;
};

const applyMatrixFix = (currentSubjects: Subject[], turmas: Turma[]) => {
  return applyParanaCivicoMilitarMatrix(currentSubjects, turmas);

  let changed = false;
  let nextSubjects = currentSubjects.map((s) => {
    let copy = { ...s };
    if (s.customWorkloads) copy.customWorkloads = { ...s.customWorkloads };
    return copy;
  });

  const ensureSubject = (
    name: string,
    isFundamental: boolean,
    isMedio: boolean,
    defaultId?: string,
  ) => {
    const aliasMap: Record<string, string[]> = {
      "língua portuguesa": ["português", "portugues", "língua portuguesa"],
      "língua inglesa": ["inglês", "ingles", "ling. inglesa"],
      "educação digital / robótica": [
        "educação digital / pens. computacional",
        "pensamento computacional",
        "robótica",
        "educação digital",
        "educação digital comp prog e robótica",
        "educação digital e computação: programação e ia",
      ],
      "educação digital comp prog e robótica": [
        "educação digital / robótica",
        "educação digital / pens. computacional",
        "educação digital",
      ],
      arte: ["artes"],
      "educação física": ["ed. física", "educacao fisica"],
      "ensino religioso": ["religião", "ens. religioso"],
      "cidadania e civismo": ["cidadania"],
      "educação financeira": ["ed. financeira", "financeira"],
    };

    // Explicit forced rewrites to prevent split subjects (user request)
    let searchName = name.toLowerCase().trim();
    if (searchName === "educação digital / robótica") {
      searchName = "educação digital / pens. computacional";
    }

    let found = nextSubjects.find(
      (s) => s.name.toLowerCase().trim() === searchName,
    );

    if (!found && searchName !== name.toLowerCase().trim()) {
      found = nextSubjects.find(
        (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim(),
      );
    }

    if (!found) {
      const aliases = aliasMap[searchName] || [];

      found = nextSubjects.find((s) => {
        const subjectName = s.name.toLowerCase().trim();
        if (
          aliases.includes(subjectName) ||
          aliases.some((alias) => subjectName.includes(alias))
        )
          return true;
        return (
          subjectName.includes(searchName) || searchName.includes(subjectName)
        );
      });
    }

    if (!found) {
      found = {
        id: defaultId || generateId(),
        name: name,
        levelConstraint:
          isFundamental && isMedio
            ? "ambos"
            : isFundamental
              ? "fundamental"
              : "medio",
        workload: 0,
        classWorkload: 0,
        customWorkloads: {},
      };
      nextSubjects.push(found);
      changed = true;
    } else {
      // Adjust level constraint to be more permissive if needed
      if (found.levelConstraint !== "ambos") {
        if (isFundamental && found.levelConstraint === "medio") {
          found.levelConstraint = "ambos";
          changed = true;
        }
        if (isMedio && found.levelConstraint === "fundamental") {
          found.levelConstraint = "ambos";
          changed = true;
        }
      }
    }
    return found;
  };

  const fundMatrix: Record<string, number> = {
    "Língua Portuguesa": 4,
    Matemática: 4,
    Ciências: 3,
    História: 3,
    Geografia: 3,
    "Educação Digital / Robótica": 2,
    "Educação Física": 2,
    "Língua Inglesa": 2,
    Arte: 2,
    "Cidadania e Civismo": 2,
    "Educação Financeira": 2,
    "Ensino Religioso": 1,
  };

  const emMatrix: Record<string, number> = {
    "Língua Portuguesa": 4,
    Matemática: 4,
    Biologia: 2,
    Física: 2,
    Química: 2,
    História: 2,
    Geografia: 2,
    "Educação Digital / Pens. Computacional": 2,
    "Educação Física": 2,
    "Língua Inglesa": 2,
    "Cidadania e Civismo": 2,
    Arte: 1,
    Filosofia: 1,
    Sociologia: 1,
    "Projeto de Vida": 1,
  };

  const matchedFundIds: Record<string, string> = {};
  Object.keys(fundMatrix).forEach((name) => {
    const subj = ensureSubject(name, true, false);
    matchedFundIds[name] = subj.id;
    if (subj.workloadFundamental !== fundMatrix[name]) {
      subj.workloadFundamental = fundMatrix[name];
      changed = true;
    }
    if (!subj.workload || subj.workload === 0) {
      subj.workload = fundMatrix[name];
      changed = true;
    }
  });

  const matchedEmIds: Record<string, string> = {};
  Object.keys(emMatrix).forEach((name) => {
    const subj = ensureSubject(name, false, true);
    matchedEmIds[name] = subj.id;
    if (subj.workloadMedio !== emMatrix[name]) {
      subj.workloadMedio = emMatrix[name];
      changed = true;
    }
    if (!subj.workload || subj.workload === 0) {
      subj.workload = emMatrix[name];
      changed = true;
    }
  });

  // Apply to all active turmas
  turmas.forEach((T) => {
    if (T.isRoom) return;
    const isEF =
      /\b(6|7|8|9)\b|\b(6|7|8|9)º/i.test(T.name) ||
      T.name.toLowerCase().includes("fundamental") ||
      T.name.toLowerCase().includes("sexto") ||
      T.name.toLowerCase().includes("sétimo") ||
      T.name.toLowerCase().includes("oitavo") ||
      T.name.toLowerCase().includes("nono");
    const isMedio =
      (/\b(1|2|3)\b|\b(1|2|3)º|\b(1|2|3)ª/i.test(T.name) ||
        T.name.toLowerCase().includes("médio")) &&
      !isEF;

    if (isEF || isMedio) {
      nextSubjects.forEach((S) => {
        if (!S.customWorkloads) S.customWorkloads = {};
        // Keep existing custom workloads for non-standard subjects
        let isStandardSubject = false;
        let targetWL = S.customWorkloads[T.id] || 0; // fallback but not strict zero

        if (isEF) {
          const matchedKey = Object.keys(matchedFundIds).find(
            (k) => matchedFundIds[k] === S.id,
          );
          if (matchedKey) {
            targetWL = fundMatrix[matchedKey];
            isStandardSubject = true;
          } else if (
            Object.values(matchedEmIds).includes(S.id) &&
            !Object.values(matchedFundIds).includes(S.id)
          ) {
            targetWL = 0;
            isStandardSubject = true;
          }
        } else if (isMedio) {
          const matchedKey = Object.keys(matchedEmIds).find(
            (k) => matchedEmIds[k] === S.id,
          );
          if (matchedKey) {
            targetWL = emMatrix[matchedKey];
            isStandardSubject = true;
          } else if (
            Object.values(matchedFundIds).includes(S.id) &&
            !Object.values(matchedEmIds).includes(S.id)
          ) {
            targetWL = 0;
            isStandardSubject = true;
          }
        }

        if (isStandardSubject && S.customWorkloads[T.id] !== targetWL) {
          S.customWorkloads[T.id] = targetWL;
          changed = true;
        }
      });
    }
  });

  return { nextSubjects, changed };
};

const applyTeachersFix = (
  currentTeachers: Teacher[],
  currentSubjects: Subject[],
  currentTurmas: Turma[],
) => {
  let changedTeachers = false;
  let changedSubjects = false;
  let nextTeachers = currentTeachers.map((t) => ({
    ...t,
    subjectIds: [...(t.subjectIds || [])],
  }));
  let nextSubjects = currentSubjects.map((s) => ({ ...s }));

  const renameRules: Record<string, string> = {
    leo: "Ana Paula Hornung",
    dani: "Danielly P.",
    "dany p.": "Danielly P.",
    "dani p.": "Danielly P.",
    "dani s": "Dani Setti",
    "danielle s.": "Dani Setti",
    mc: "Marcia Calixto",
    marcia: "Marcia Calixto",
    "dani carles": "Danielly C.",
    cris: "Cristiane",
    "luiz ad.": "L. Aderson",
    "luiz ad": "L. Aderson",
    isabela: "Isabella",
    "maria e.": "Maria Emilia",
    kati: "Katiane",
    "ana p.s.": "Ana Paula S.",
    edu: "Eduardo",
    suzi: "Suzelaine",
    nicole: "Nicolle",
  };

  nextTeachers.forEach((t) => {
    const lowerName = t.name.toLowerCase().trim();
    if (renameRules[lowerName] && t.name !== renameRules[lowerName]) {
      t.name = renameRules[lowerName];
      changedTeachers = true;
    }
  });

  const getOrCreateSubject = (
    name: string,
    isFund: boolean,
    isMedio: boolean,
  ) => {
    let lookup = name.toLowerCase().trim();
    let found = nextSubjects.find(
      (s) => s.name.toLowerCase().trim() === lookup,
    );
    if (!found) {
      found = nextSubjects.find(
        (s) =>
          s.name.toLowerCase().includes(lookup) ||
          lookup.includes(s.name.toLowerCase()),
      );
    }
    if (!found) {
      found = {
        id: generateId(),
        name: name,
        levelConstraint:
          isFund && isMedio ? "ambos" : isFund ? "fundamental" : "medio",
        workload: 1, // Default 1 so it's not 0
        classWorkload: 1,
        customWorkloads: {},
      };
      nextSubjects.push(found);
      changedSubjects = true;
    }
    return found;
  };

  const teacherMap: Record<string, string[]> = {
    Allana: ["Matemática"],
    "Dani Setti": [
      "Rec. Aprend. Matemática",
      "Recomposição de Aprendizagem Matemática",
      "Matemática",
    ],
    Suzelaine: ["Língua Portuguesa", "Leitura Rec. Aprend. Língua Portuguesa"],
    Bernadete: ["Arte"],
    Eliane: ["Língua Inglesa", "Ling. Inglesa I"],
    Joana: ["Educação Física"],
    "Marcia Calixto": [
      "Filosofia",
      "Cidadania e Civismo",
      "Ensino Religioso",
      "Filosofia Análise de Textos Filosóficos",
    ],
    Nicolle: ["Biologia"],
    Rosmarina: ["Matemática"],
    "Ana Paula S.": ["Geografia", "Geografia do Paraná", "Geografia I"],
    "Ana Paula": [
      "Geografia",
      "História",
      "Geografia do Paraná",
      "Geografia I",
    ],
    Meire: ["Leitura e Produção de Texto", "Redação e Leitura", "Redação"],
    Matheus: ["Matemática"],
    Cristiane: ["Educação Financeira"],
    "L. Aderson": ["História", "História I", "História do Paraná"],
    "Luiz Agnaldo": ["História", "Ensino Religioso"],
    Nathan: [
      "Física",
      "Matemática",
      "DOCÊNCIA II - MAT.",
      "Rec. Aprend. Matemática",
    ],
    Eduardo: ["Química"],
    Bruna: ["Ciências"],
    Valdemar: ["Ciências"],
    Adriano: ["Ciências"],
    Janete: ["Ensino Religioso", "Geografia"],
    Katiane: [
      "Leitura Rec. Aprend. Língua Portuguesa",
      "DOCÊNCIA II - LP",
      "Língua Portuguesa",
    ],
    "Maria Emilia": ["Língua Portuguesa"],
    Tamires: ["Língua Portuguesa"],
    Laize: ["Língua Portuguesa"],
    Matilde: ["Sociologia", "Sociologia Gov Cid Sociedade", "Sociologia I"],
    Regiane: ["Sociologia"],
    "Ana Paula Hornung": [
      "Marketing",
      "Análise de Mercado",
      "Fundamentos de Marketing",
      "Comunicação e Marketing",
      "Segmentação de Mercado",
      "Relações Interpessoais",
      "Tecnologias Digitais Aplicadas ao Marketing",
      "Análise de mercado e comportamento do consumidor",
      "Técnicas de vendas e marketing de varejo",
      "Planejamento de marketing",
      "Marketing de conteúdo",
      "Pesquisa de Marketing",
      "Legislação aplicada ao marketing",
    ],
    "Danielly P.": [
      "Educação Digital / Pens. Computacional",
      "Matemática",
      "Robótica",
      "Educação Digital e Computação: Programação e IA",
      "Educação Digital Comp Prog e Robótica",
    ],
    "Danielly C.": ["Matemática"],
    "Maria Regina": ["Matemática"],
    Gabrielle: ["Língua Inglesa"],
    Miguel: ["Educação Física"],
    Kelly: [
      "Projeto de Vida",
      "Arte II",
      "Arte Paranaense",
      "Cultura e Arte",
      "Arte",
    ],
    Lucineia: ["Ciências"],
    Valdeci: ["Geografia"],
    Isabella: ["Língua Portuguesa"],
  };

  const teacherTurmaMap: Record<string, Record<string, string[]>> = {
    Allana: {
      Matemática: ["6º A"],
    },
    Rosmarina: {
      Matemática: ["7º A", "8º A", "7º B", "7º C"],
    },
    Matheus: {
      Matemática: ["9º A", "1ª A", "2ª A", "3ª A"],
    },
    "Danielly C.": {
      Matemática: ["8º B", "9º B", "9º C"],
    },
    "Maria Regina": {
      Matemática: ["6º B", "6º C"],
    },
    "Danielly P.": {
      Matemática: ["1ª B", "2ª B"],
      "Educação Digital / Pens. Computacional": [
        "6º A",
        "6º B",
        "6º C",
        "7º A",
        "7º B",
        "7º C",
        "8º A",
        "8º B",
        "9º A",
        "9º B",
        "9º C",
        "1ª A",
        "2ª A",
        "3ª A",
        "1ª B",
        "2ª B",
      ],
      "Educação Digital Comp Prog e Robótica": [
        "6º A",
        "6º B",
        "6º C",
        "7º A",
        "7º B",
        "7º C",
        "8º A",
        "8º B",
        "9º A",
        "9º B",
        "9º C",
      ],
      "Educação Digital e Computação: Programação e IA": [
        "1ª A",
        "1ª B",
        "2ª B",
      ], // added 2B
    },
    Suzelaine: {
      "Língua Portuguesa": [
        "6º A",
        "7º A",
        "8º A",
        "6º B",
        "6º C",
        "7º B",
        "7º C",
      ],
      "Leitura Rec. Aprend. Língua Portuguesa": ["6º A", "6º B", "6º C"],
    },
    Tamires: {
      "Língua Portuguesa": ["9º A", "2ª A"],
    },
    Laize: {
      "Língua Portuguesa": ["1ª A", "3ª A"],
    },
    Isabella: {
      "Língua Portuguesa": ["2ª B", "8º B"],
    },
    "Maria Emilia": {
      "Língua Portuguesa": ["1ª B"],
    },
    Meire: {
      Redação: ["7º A", "8º A", "7º B", "7º C", "8º B"],
      "Redação e Leitura": ["7º A", "8º A", "7º B", "7º C", "8º B"],
      "Literatura e Produção de Texto": ["2ª A", "3ª A", "9º B", "9º C"], // Wait
      "Leitura e Produção de Texto": ["2ª A", "3ª A", "9º B", "9º C"],
    },
    Katiane: {
      "Leitura Rec. Aprend. Língua Portuguesa": [
        "9º A",
        "2ª A",
        "8º B",
        "9º B",
        "9º C",
      ],
      "DOCÊNCIA II - LP": ["6º A", "6º B", "6º C"],
    },
    "Dani Setti": {
      "Rec. Aprend. Matemática": [
        "6º A",
        "9º A",
        "2ª A",
        "6º B",
        "6º C",
        "9º B",
        "9º C",
      ],
    },
    Nathan: {
      Física: ["2ª A", "3ª A", "2ª B"],
      "DOCÊNCIA II - MAT.": ["6º A", "9º A", "6º B", "6º C", "9º B", "9º C"],
    },
    Eduardo: {
      Química: ["1ª A", "1ª B", "2ª B"],
    },
    Valdemar: {
      Ciências: ["6º A", "7º A", "6º B", "7º B"],
    },
    Bruna: {
      Ciências: ["8º A", "9º A"],
    },
    Adriano: {
      Ciências: ["7º C", "8º B", "9º B", "9º C"],
    },
    Joana: {
      "Educação Física": [
        "6º A",
        "7º A",
        "8º A",
        "9º A",
        "1ª A",
        "2ª A",
        "3ª A",
        "1ª B",
        "2ª B",
        "6º B",
        "7º B",
        "7º C",
        "8º B",
        "9º B",
        "9º C",
      ],
    },
    Cristiane: {
      "Educação Financeira": [
        "6º A",
        "7º A",
        "8º A",
        "9º A",
        "1ª A",
        "2ª A",
        "3ª A",
        "1ª B",
        "2ª B",
        "6º B",
        "7º B",
        "7º C",
        "8º B",
        "9º B",
        "9º C",
      ],
    },
    "Marcia Calixto": {
      "Cidadania e Civismo": [
        "6º A",
        "7º A",
        "8º A",
        "9º A",
        "1ª A",
        "2ª A",
        "3ª A",
        "1ª B",
        "2ª B",
        "6º B",
        "6º C",
        "7º B",
        "7º C",
        "8º B",
        "9º B",
        "9º C",
      ],
      "Ensino Religioso": ["6º A", "7º A"],
      Filosofia: ["2ª A", "2ª B"],
      "Filosofia Análise de Textos Filosóficos": ["2ª A"],
    },
    Valdeci: {
      Geografia: ["6º A", "7º A", "8º A", "9º A", "6º B", "6º C"],
    },
    "Ana Paula S.": {
      "Geografia I": ["3ª A"],
      "Geografia do Paraná": ["1ª A"],
    },
    "Ana Paula": {
      Geografia: ["1ª A", "1ª B"],
      História: ["8º B", "9º B", "9º C"],
    },
    Janete: {
      Geografia: ["7º B", "7º C", "8º B", "9º B", "9º C"],
      "Ensino Religioso": ["6º B"],
    },
    "L. Aderson": {
      História: ["6º A", "7º A", "8º A", "9º A", "2ª A", "2ª B"],
      "História do Paraná": ["1ª A"],
      "História I": ["3ª A"],
    },
    "Luiz Agnaldo": {
      História: ["6º B", "6º C", "7º B", "7º C"],
      "Ensino Religioso": ["6º C", "7º B", "7º C"],
    },
    Eliane: {
      "Língua Inglesa": [
        "6º A",
        "7º A",
        "8º A",
        "9º A",
        "1ª A",
        "2ª A",
        "1ª B",
        "2ª B",
      ],
      "Ling. Inglesa I": ["3ª A"],
    },
    Gabrielle: {
      "Língua Inglesa": [
        "6º B",
        "6º C",
        "7º B",
        "7º C",
        "8º B",
        "9º B",
        "9º C",
      ],
    },
    Regiane: {
      Sociologia: ["2ª A", "2ª B"],
    },
    Matilde: {
      "Sociologia Gov Cid Sociedade": ["1ª A", "2ª A"],
      "Sociologia I": ["3ª A"],
    },
    Nicolle: {
      Biologia: ["1ª A", "1ª B"],
    },
    Kelly: {
      Arte: ["1ª B", "2ª B", "7º B", "7º C", "8º B", "9º B", "9º C"],
      "Arte II": ["3ª A"],
      "Projeto de Vida": ["3ª A"],
      "Arte Paranaense": ["1ª A"],
    },
    Bernadete: {
      Arte: ["6º A", "7º A", "8º A", "9º A", "1ª A", "2ª A", "6º B", "6º C"],
    },
    "Ana Paula Hornung": {
      Marketing: ["1ª B", "2ª B"],
      "Fundamentos do Marketing": ["1ª B"],
      "Tecnologias Digitais Aplicadas ao Marketing": ["1ª B", "2ª B"],
      "Análise de mercado e comportamento do consumidor": ["2ª B"],
      "Comunicação de marketing": ["1ª B", "2ª B"],
      "Técnicas de vendas e marketing de varejo": ["1ª B", "2ª B"],
      "Planejamento de marketing": ["1ª B", "2ª B"],
      "Segmentação e posicionamento de marketing": ["1ª B"],
      "Marketing de conteúdo": ["1ª B"],
      "Relações Interpessoais": ["2ª B"],
      "Pesquisa de Marketing": ["2ª B"],
      "Legislação aplicada ao marketing": ["2ª B"],
    },
  };

  Object.entries(teacherMap).forEach(([teacherName, expectedSubjects]) => {
    let teacher = nextTeachers.find(
      (t) => t.name.toLowerCase().trim() === teacherName.toLowerCase().trim(),
    );
    if (!teacher) {
      teacher = {
        id: generateId(),
        name: teacherName,
        subjectIds: [],
        unavailability: [],
      };
      nextTeachers.push(teacher);
      changedTeachers = true;
    }

    expectedSubjects.forEach((subjectName) => {
      const subject = getOrCreateSubject(subjectName, true, true);
      if (!teacher.subjectIds.includes(subject.id)) {
        teacher.subjectIds.push(subject.id);
        changedTeachers = true;
      }
    });

    const specificTurmas = teacherTurmaMap[teacherName];
    if (specificTurmas) {
      if (!teacher.subjectTurmaMap) teacher.subjectTurmaMap = {};
      Object.entries(specificTurmas).forEach(([subName, turmaNames]) => {
        const subject = getOrCreateSubject(subName, true, true);
        const matchedTurmas = currentTurmas.filter((t) =>
          turmaNames.some((tn) => t.name.includes(tn)),
        );
        if (matchedTurmas.length > 0) {
          teacher.subjectTurmaMap![subject.id] = matchedTurmas.map((t) => t.id);
          changedTeachers = true;
        }
      });
    }
  });

  return { nextTeachers, nextSubjects, changedTeachers, changedSubjects };
};

const healSubjectConstraints = (
  currentSubjects: Subject[],
  currentSchedules: AllSchedules,
  currentTurmas: Turma[],
) => {
  if (!currentSubjects || currentSubjects.length === 0)
    return { updatedSubjects: currentSubjects, changed: false };

  let changed = false;
  const updatedSubjects = currentSubjects.map((subject) => {
    let s = { ...subject };

    // 1. Detect level constraint (fundamental vs. medio) if not set or if it is 'ambos'
    const subjectNameLower = s.name.toLowerCase().trim();
    if (!s.levelConstraint || s.levelConstraint === "ambos") {
      if (
        subjectNameLower.includes("ciências") ||
        subjectNameLower.includes("ciencias") ||
        subjectNameLower.includes("ensino religioso") ||
        subjectNameLower.includes("religioso") ||
        subjectNameLower.includes("cidadania")
      ) {
        s.levelConstraint = "fundamental";
        changed = true;
      } else if (
        subjectNameLower.includes("biologia") ||
        subjectNameLower.includes("física") ||
        subjectNameLower.includes("fisica") ||
        subjectNameLower.includes("química") ||
        subjectNameLower.includes("quimica") ||
        subjectNameLower.includes("filosofia") ||
        subjectNameLower.includes("sociologia") ||
        subjectNameLower.includes("relação interpessoal") ||
        subjectNameLower.includes("relacoes interpessoais") ||
        subjectNameLower.includes("relações interpessoais")
      ) {
        s.levelConstraint = "medio";
        changed = true;
      }
    }

    // 2. Scan schedules to discover which turmas this subject is actually scheduled in
    const turmasWithThisSubject = new Set<string>();
    let totalScheduledInSystem = 0;
    if (currentSchedules) {
      Object.entries(currentSchedules).forEach(([turmaId, schedule]) => {
        if (schedule && typeof schedule === "object") {
          Object.values(schedule).forEach((slot: any) => {
            if (slot && slot.subjectId === s.id) {
              turmasWithThisSubject.add(turmaId);
            }
            if (slot && slot.subjectId) {
              totalScheduledInSystem++;
            }
          });
        }
      });
    }

    // 2b. If the system has existing scheduled classes, synchronize custom workloads per turma
    // to match actual scheduled counts so that no artificial "pendências" appear.
    if (totalScheduledInSystem > 0 && currentSchedules) {
      if (!s.customWorkloads) {
        s.customWorkloads = {};
      }

      const tIds = Object.keys(currentSchedules).filter((tid) => {
        const t = currentTurmas.find((x: any) => x.id === tid);
        return t && !t.isRoom;
      });

      tIds.forEach((tid) => {
        const classroomSchedule = currentSchedules[tid] || {};
        const classroomUsage = Object.values(classroomSchedule).filter(
          (slot: any) =>
            slot && slot.subjectId === s.id && !slot.associatedRoomId,
        ).length;

        let labUsage = 0;
        Object.entries(currentSchedules).forEach(([rid, sRoom]) => {
          const roomT = currentTurmas.find((x: any) => x.id === rid);
          if (roomT && roomT.isRoom) {
            if (sRoom && typeof sRoom === "object") {
              labUsage += Object.values(sRoom).filter(
                (slot: any) =>
                  slot &&
                  slot.subjectId === s.id &&
                  slot.associatedTurmaId === tid,
              ).length;
            }
          }
        });

        const totalUsage = classroomUsage + labUsage;

        if (totalUsage > 0) {
          if (s.customWorkloads[tid] !== totalUsage) {
            s.customWorkloads[tid] = totalUsage;
            changed = true;
          }
        } else {
          const hasAnySchedulesInThisTurma =
            Object.keys(currentSchedules[tid] || {}).length > 0;
          if (hasAnySchedulesInThisTurma) {
            if (s.customWorkloads[tid] !== 0) {
              s.customWorkloads[tid] = 0;
              changed = true;
            }
          }
        }
      });
    }

    // 3. For specialized subjects (non-universal), restrict active turmas to only where they are actually scheduled
    const universalSubjects = [
      "matemática",
      "matematica",
      "português",
      "portugues",
      "língua portuguesa",
      "lingua portuguesa",
      "portugués",
      "história",
      "historia",
      "geografia",
      "ciências",
      "ciencias",
      "biologia",
      "física",
      "fisica",
      "química",
      "quimica",
      "educação física",
      "educacao fisica",
      "arte",
      "artes",
      "inglês",
      "ingles",
      "língua inglesa",
      "lingua inglesa",
      "espanhol",
    ];

    const isUniversal = universalSubjects.some((u) =>
      subjectNameLower.includes(u),
    );

    // If NOT universal, and has NO allowedTurmaIds, and was actually scheduled somewhere:
    if (
      !isUniversal &&
      (!s.allowedTurmaIds || s.allowedTurmaIds.length === 0) &&
      turmasWithThisSubject.size > 0
    ) {
      s.allowedTurmaIds = Array.from(turmasWithThisSubject);
      changed = true;
    }

    return s;
  });

  return { updatedSubjects, changed };
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const getRoomIcon = (iconName?: string, className?: string) => {
  const cls = className || "w-3 h-3 text-emerald-100 shrink-0";
  switch (iconName) {
    case "Monitor":
      return <Monitor className={cls} />;
    case "Tablet":
      return <TabletIcon className={cls} />;
    case "Calculator":
      return <Calculator className={cls} />;
    case "Percent":
      return <Percent className={cls} />;
    case "Code":
      return <Code className={cls} />;
    case "FlaskConical":
      return <FlaskConical className={cls} />;
    case "Palette":
      return <Palette className={cls} />;
    case "Activity":
      return <Activity className={cls} />;
    case "Music":
      return <Music className={cls} />;
    case "Globe":
      return <Globe className={cls} />;
    case "Microscope":
      return <Microscope className={cls} />;
    case "Library":
      return <Library className={cls} />;
    case "Dumbbell":
      return <Dumbbell className={cls} />;
    default:
      return <DoorClosed className={cls} />;
  }
};

export const getRoomIconHtml = (iconName?: string) => {
  if (!iconName) return "";
  const svgString = renderToString(getRoomIcon(iconName, ""));
  let html = svgString.replace(
    "<svg ",
    '<svg style="width: 100%;  color: inherit;" ',
  );
  if (!html.includes("xmlns=")) {
    html = html.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  return html;
};

export const predefinedIcons = [
  { id: "Monitor", label: "Computadores" },
  { id: "Tablet", label: "Tablets" },
  { id: "Percent", label: "Matemática" },
  { id: "Code", label: "Programação" },
  { id: "FlaskConical", label: "Química" },
  { id: "Palette", label: "Artes" },
  { id: "Activity", label: "Laboratório Geral" },
  { id: "Music", label: "Música" },
  { id: "Globe", label: "Geografia" },
  { id: "Microscope", label: "Biologia" },
  { id: "Library", label: "Biblioteca" },
  { id: "Dumbbell", label: "Esportes" },
  { id: "DoorClosed", label: "Padrão" },
];

const formatTeacherName = (name: string | undefined): string => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first} ${last.charAt(0)}.`;
  };

  const formatSubjectName = (
    name: string | undefined,
    maxLength = 16,
  ): string => {
    if (!name) return "";
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + "...";
  };

  const formatRoomBadgeName = (name: string | undefined): string => {
    if (!name) return "LAB";
    const upper = name.toUpperCase();
    if (upper.includes("LABORATÓRIO 1") || upper.includes("LAB INFO COMP"))
      return "LAB INF.";
    if (upper.includes("LABORATÓRIO 2") || upper.includes("TABLET"))
      return "TABLET";
    if (upper.includes("MATEMÁTICA") || upper.includes("MATEMATICA"))
      return "SL. MAT.";
    if (upper.includes("LABORATÓRIO")) return "LAB.";
    return name.split(" ")[0] || "LAB";
  };

export const getEffectiveDailyClassCount = (turma: any, isCCM?: boolean) => {
  if (!turma) return 5;
  const nameUpper = (turma.name || "").toUpperCase();
  
  // Se for cívico-militar, obrigatoriamente 6
  if (isCCM || turma.isCCM || nameUpper.includes("CÍVICO") || nameUpper.includes("CIVICO") || nameUpper.includes("CCM")) {
    return 6;
  }
  
  // Se for técnico ou profissional, obrigatoriamente 6
  const isProf = /técnico|tec\.|formação|profissional|magistério/i.test(turma.name.trim()) || turma.isTechnical;
  if (isProf) {
    return 6;
  }
  
  // Se contiver REGULAR, é 5
  if (nameUpper.includes("REGULAR")) {
    return 5;
  }
  
  // Se for Ensino Médio, geralmente tem 6
  const isEnsinoMedio = /médio|medio/i.test(turma.name.trim()) && !/6|7|8|9/i.test(turma.name.trim());
  if (isEnsinoMedio) {
    return 6;
  }
  
  // Se for Ensino Fundamental, tem 5
  const isEF = /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(turma.name.trim());
  if (isEF) {
    return 5;
  }
  
  // Por padrão, se não for nenhum dos anteriores, assume 5
  return 5;
};

export default function ScheduleGenerator() {
  const location = useLocation();
  const navigate = useNavigate();
  const isProfessoresRoute = location.pathname === "/professores";
  const isAlunosRoute = location.pathname === "/alunos";
  const isDisciplinasRoute = location.pathname === "/disciplinas";
  const isHorariosRoute = true;

  

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schedules, setSchedules] = useState<AllSchedules>({});
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [schedulesHistory, setSchedulesHistory] = useState<AllSchedules[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const skipNextHistoryRef = React.useRef(false);

  const schedulesHistoryRef = React.useRef(schedulesHistory);
  const historyIndexRef = React.useRef(historyIndex);

  React.useEffect(() => {
    schedulesHistoryRef.current = schedulesHistory;
    historyIndexRef.current = historyIndex;
  }, [schedulesHistory, historyIndex]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [version, setVersion] = useState<number>(74);
  const [logoUrl, setLogoUrl] = useState<string>(
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIkG3YW1IlvK8UKgpoK67sl2ozdj_YidxNKg&s",
  );
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState("");
  const [schoolName, setSchoolName] = useState<string>("CE LUCAS LENIAR");
  const [showSchoolInput, setShowSchoolInput] = useState(false);
  const [tempSchoolName, setTempSchoolName] = useState("");
  const [isCivicoMilitar, setIsCivicoMilitar] = useState<boolean>(() => {
    return localStorage.getItem("cecm_is_civico_militar") === "true";
  });

  const [academicSystem, setAcademicSystem] = useState<
    "Bimestral" | "Trimestral"
  >(() => {
    return (localStorage.getItem("cecm_academic_system") as any) || "Bimestral";
  });
  const [academicPeriod, setAcademicPeriod] = useState<number>(() => {
    return Number(localStorage.getItem("cecm_academic_period")) || 1;
  });
  const [academicStartDate, setAcademicStartDate] = useState<string>(() => {
    return localStorage.getItem("cecm_academic_start") || "";
  });
  const [academicEndDate, setAcademicEndDate] = useState<string>(() => {
    return localStorage.getItem("cecm_academic_end") || "";
  });
  const [academicDates, setAcademicDates] = useState<
    Record<string, { start: string; end: string }>
  >(() => {
    try {
      const saved = localStorage.getItem("cecm_academic_dates");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isAcademicConfigOpen, setIsAcademicConfigOpen] = useState(false);

  const getTurmaShift = (t: Turma): "manha" | "tarde" | "noite" => {
    if (t.shift && t.shift !== "ambos") return t.shift;
    const nameLower = t.name.toLowerCase();
    const idLower = t.id.toLowerCase();
    if (
      nameLower.includes("noite") ||
      nameLower.includes("noturno") ||
      idLower.includes("noite") ||
      /\bnoite\b/.test(nameLower) ||
      /\bnot\b/.test(nameLower)
    ) {
      return "noite";
    }
    if (
      nameLower.includes("tarde") ||
      nameLower.includes("vespertino") ||
      idLower.includes("tarde") ||
      /\btarde\b/.test(nameLower) ||
      /\bvesp\b/.test(nameLower)
    ) {
      return "tarde";
    }
    return "manha";
  };

  const [waPhone, setWaPhone] = useState<string>("");
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isEditingWaPhone, setIsEditingWaPhone] = useState(false);
  const [tempWaPhone, setTempWaPhone] = useState("");
  const [showSecurityToast, setShowSecurityToast] = useState(false);

  const [selectedTurmasToPrint, setSelectedTurmasToPrint] = useState<string[]>(
    [],
  );
  const [draggedOverCell, setDraggedOverCell] = useState<{
    turmaId: string;
    slotId: string;
  } | null>(null);
  const [draggingSource, setDraggingSource] = useState<{
    turmaId: string;
    slotId: string;
    teacherId: string;
    subjectId: string;
    isLab: boolean;
  } | null>(null);
  const [errorCell, setErrorCell] = useState<{
    turmaId: string;
    slotId: string;
  } | null>(null);
  const [dragErrorMsg, setDragErrorMsg] = useState<string | null>(null);
  const [isClickMoveModeActive, setIsClickMoveModeActive] = useState(false);
  const [clickMoveSource, setClickMoveSource] = useState<{ turmaId: string; slotId: string } | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isConfiguringTimeRanges, setIsConfiguringTimeRanges] = useState(false);
  const [timeRangesManha, setTimeRangesManha] = useState<string[]>(() => {
    const saved = localStorage.getItem("cecm_time_ranges_manha");
    try {
      return saved
        ? JSON.parse(saved)
        : [
            "7h30 às 8h20",
            "8h20 às 9h10",
            "9h10 às 10h",
            "10h20 às 11h10",
            "11h10 às 12h",
            "12h às 12h50",
          ];
    } catch {
      return [
        "7h30 às 8h20",
        "8h20 às 9h10",
        "9h10 às 10h",
        "10h20 às 11h10",
        "11h10 às 12h",
        "12h às 12h50",
      ];
    }
  });
  const [timeRangesTarde, setTimeRangesTarde] = useState<string[]>(() => {
    const saved = localStorage.getItem("cecm_time_ranges_tarde");
    try {
      return saved
        ? JSON.parse(saved)
        : [
            "13h às 13h50",
            "13h50 às 14h40",
            "14h40 às 15h30",
            "15h50 às 16h40",
            "16h40 às 17h30",
            "17h30 às 18h20",
          ];
    } catch {
      return [
        "13h às 13h50",
        "13h50 às 14h40",
        "14h40 às 15h30",
        "15h50 às 16h40",
        "16h40 às 17h30",
        "17h30 às 18h20",
      ];
    }
  });
  const [timeRangesNoite, setTimeRangesNoite] = useState<string[]>(() => {
    const saved = localStorage.getItem("cecm_time_ranges_noite");
    try {
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0 && parsed[0]?.includes("19h")) {
          return [
            "18h45 às 19h35",
            "19h35 às 20h25",
            "20h25 às 21h15",
            "21h30 às 22h20",
            "22h20 às 23h10",
            "23h10 às 23h55",
          ];
        }
        return parsed;
      }
      return [
        "18h45 às 19h35",
        "19h35 às 20h25",
        "20h25 às 21h15",
        "21h30 às 22h20",
        "22h20 às 23h10",
        "23h10 às 23h55",
      ];
    } catch {
      return [
        "18h45 às 19h35",
        "19h35 às 20h25",
        "20h25 às 21h15",
        "21h30 às 22h20",
        "22h20 às 23h10",
        "23h10 às 23h55",
      ];
    }
  });

  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"turmas" | "rooms">("turmas");
  const [importShift, setImportShift] = useState<"manha" | "tarde" | "noite">(
    "manha",
  );
  const [enableNoite, setEnableNoite] = useState<boolean>(() => {
    return localStorage.getItem("enable_noite_period") === "true";
  });
  const [enableNoiteAsynchronous, setEnableNoiteAsynchronous] =
    useState<boolean>(() => {
      return localStorage.getItem("enable_noite_asynchronous") === "true";
    });
  const [techCourseName, setTechCourseName] = useState<string>(() => {
    return localStorage.getItem("cecm_tech_course_name") || "Marketing";
  });
  const [disableDoubleClassesGlobally, setDisableDoubleClassesGlobally] =
    useState<boolean>(() => {
      return localStorage.getItem("disable_double_classes_globally") === "true";
    });

  const PERIODS_MANHA = React.useMemo(() => {
    return Array.from({ length: timeRangesManha.length }, (_, i) => i + 1);
  }, [timeRangesManha]);

  const PERIODS_TARDE = React.useMemo(() => {
    return Array.from({ length: timeRangesTarde.length }, (_, i) => i + 7);
  }, [timeRangesTarde]);

  const PERIODS_NOITE = React.useMemo(() => {
    return Array.from({ length: timeRangesNoite.length }, (_, i) => i + 13);
  }, [timeRangesNoite]);

  const [newTeacherName, setNewTeacherName] = useState("");
  const [teacherLetterFilter, setTeacherLetterFilter] = useState<string | null>(
    null,
  );
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string | null>(
    null,
  );
  const [newTeacherSubjectIds, setNewTeacherSubjectIds] = useState<string[]>(
    [],
  );
  const [newTeacherUnavailability, setNewTeacherUnavailability] = useState<
    string[]
  >([]);
  const [newTeacherPreferDouble, setNewTeacherPreferDouble] = useState(false);
  const [newTeacherRequireShiftInterval, setNewTeacherRequireShiftInterval] =
    useState(false);
  const [newTeacherTurmaIds, setNewTeacherTurmaIds] = useState<string[]>([]);
  const [newTeacherSubjectTurmaMap, setNewTeacherSubjectTurmaMap] = useState<
    Record<string, string[]>
  >({});
  const [newTeacherSchoolWorkload, setNewTeacherSchoolWorkload] =
    useState<string>("");
  const [newTeacherSchoolWorkloadManha, setNewTeacherSchoolWorkloadManha] =
    useState<string>("");
  const [newTeacherSchoolWorkloadTarde, setNewTeacherSchoolWorkloadTarde] =
    useState<string>("");
  const [newTeacherSchoolWorkloadNoite, setNewTeacherSchoolWorkloadNoite] =
    useState<string>("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState<string>(() =>
    generateDistinctColor(subjects),
  );
  const [newSubjectWorkload, setNewSubjectWorkload] = useState<number>(5);
  const [newSubjectWorkloadFundamental, setNewSubjectWorkloadFundamental] =
    useState<number | "">("");
  const [newSubjectWorkloadMedio, setNewSubjectWorkloadMedio] = useState<
    number | ""
  >("");
  const [newSubjectIsTechnical, setNewSubjectIsTechnical] = useState(false);
  const [newSubjectUseLabComp, setNewSubjectUseLabComp] = useState(false);
  const [newSubjectUseLabTab, setNewSubjectUseLabTab] = useState(false);
  const [newSubjectUseSalaMat, setNewSubjectUseSalaMat] = useState(false);
  const [newSubjectRoomIds, setNewSubjectRoomIds] = useState<string[]>([]);
  const [newSubjectLabWorkload, setNewSubjectLabWorkload] = useState<number>(0);
  const [newSubjectCustomWorkloads, setNewSubjectCustomWorkloads] = useState<
    Record<string, number>
  >({});
  const [showCustomWorkloads, setShowCustomWorkloads] = useState(false);
  const [newSubjectClassWorkload, setNewSubjectClassWorkload] =
    useState<number>(0);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubjectLevelConstraint, setNewSubjectLevelConstraint] = useState<
    "ambos" | "fundamental" | "medio" | "tecnico"
  >("ambos");
  const [newSubjectGradeConstraint, setNewSubjectGradeConstraint] =
    useState("");
  const [newSubjectSuffixConstraint, setNewSubjectSuffixConstraint] =
    useState("");
  const [newSubjectAllowedTurmaIds, setNewSubjectAllowedTurmaIds] = useState<
    string[]
  >([]);
  const [newSubjectPreferDouble, setNewSubjectPreferDouble] =
    useState<boolean>(false);
  const [showMassImportModal, setShowMassImportModal] = useState(false);
  const [csvData, setCsvData] = useState("");

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [tempTeacher, setTempTeacher] = useState("");
  const [tempSubject, setTempSubject] = useState("");
  const [tempAssociatedTurmaId, setTempAssociatedTurmaId] = useState("");
  const [tempAssociatedRoomId, setTempAssociatedRoomId] = useState("");
  const [allocateConsecutive, setAllocateConsecutive] = useState(false);
  const [manuallyToggledConsecutive, setManuallyToggledConsecutive] =
    useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [pendingLabConflict, setPendingLabConflict] = useState<{
    roomId: string;
    consecSlot: string | null;
  } | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [hoveredTeacherId, setHoveredTeacherId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Skeleton loading state

  const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
  const [isMudancasModalOpen, setIsMudancasModalOpen] = useState(false);
  const [mudancasMode, setMudancasMode] = useState<
    "manha" | "tarde" | "noite" | "especificas"
  >(importShift);
  const [mudancasSelectedTurmas, setMudancasSelectedTurmas] = useState<
    string[]
  >([]);
  const [autoGenMode, setAutoGenMode] = useState<"all" | "shuffle" | "empty">("shuffle");
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);
  const [autoGenForceConflicts, setAutoGenForceConflicts] = useState(false);
  const [autoGenShift, setAutoGenShift] = useState<
    "both" | "manha" | "tarde" | "noite" | "labs"
  >("both");
  const [isAutoGenerateResultsModalOpen, setIsAutoGenerateResultsModalOpen] =
    useState(false);
  const [autoGenResults, setAutoGenResults] = useState<{
    solved: boolean;
    scannedCount: number;
    placedCount: number;
    pending: {
      turmaName: string;
      subjectName: string;
      teacherName: string;
      reason: string;
      turmaId: string;
      subjectId: string;
      teacherId: string;
      isDouble: boolean;
    }[];
    errors: string[];
  } | null>(null);

  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState("");
  const [aiAnalysisActions, setAiAnalysisActions] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const requestGeminiAnalysis = async () => {
    const apiKey = localStorage.getItem("GEMINI_API_KEY");
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    if (!autoGenResults || autoGenResults.pending.length === 0) return;

    setIsAiAnalyzing(true);
    setAiAnalysisText(null);
    setAiAnalysisActions([]);

    try {
      const emptySlotsPerTurma: Record<string, string[]> = {};
      autoGenResults.pending.forEach((p) => {
        if (!p.turmaId) return;
        if (!emptySlotsPerTurma[p.turmaId]) {
          const occupied = new Set(Object.keys(schedules[p.turmaId] || {}));
          const empty: string[] = [];
          ["seg", "ter", "qua", "qui", "sex"].forEach((day) => {
            [...Array(17)].forEach((_, i) => {
              const pNum = i + 1;
              const slotId = `${day}-${pNum}`;
              if (!occupied.has(slotId)) empty.push(slotId);
            });
          });
          emptySlotsPerTurma[p.turmaId] = empty;
        }
      });

      const promptData = `
Você é um assistente especialista em alocação escolar.
O algoritmo tentou gerar a grade mas não conseguiu alocar ${autoGenResults.pending.length} aulas. 
Pendências:
${autoGenResults.pending
  .slice(0, 30)
  .map((p) => {
    const emptyStr =
      p.turmaId && emptySlotsPerTurma[p.turmaId]
        ? emptySlotsPerTurma[p.turmaId].join(", ")
        : "N/A";
    return `- Turma ${p.turmaName}: ${p.subjectName} (Prof. ${p.teacherName}). TurmaId: ${p.turmaId}, SubjectId: ${p.subjectId}, TeacherId: ${p.teacherId}, Geminada: ${p.isDouble}. Motivo: ${p.reason}. \n  -> Horários vazios da turma: [${emptyStr}]`;
  })
  .join("\n")}

Seja conciso. Forneça primeiro um conselho textual de como o orientador pode ajustar os cadastros.
Depois, no FINAL da sua resposta, forneça um bloco JSON (e apenas UM bloco JSON) no formato:
\`\`\`json
{
  "actions": [
    { "type": "assign", "turmaId": "...", "subjectId": "...", "teacherId": "...", "day": "seg", "period": 1, "isDouble": false }
  ]
}
\`\`\`
Onde day é um de ["seg", "ter", "qua", "qui", "sex"] e period de 1 a 6 (Manhã) ou 7 a 12 (Tarde) ou 13 a 17 (Noite).
Escolha horários (day e period) que estejam listados nos "Horários vazios da turma" para essa pendência.
`;

      const ai = new GoogleGenAI({
        apiKey,
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptData,
      });

      const fullText = response.text || "Sem recomendações.";

      let finalAnalysisText = fullText;
      let parsedActions: any[] = [];
      const jsonMatch = fullText.match(/\`\`\`json\s*(\{[\s\S]*?\})\s*\`\`\`/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.actions) {
            parsedActions = parsed.actions;
          }
        } catch (e) {}
        finalAnalysisText = fullText
          .replace(/\`\`\`json\s*\{[\s\S]*?\}\s*\`\`\`/, "")
          .trim();
      }

      setAiAnalysisText(finalAnalysisText);
      setAiAnalysisActions(parsedActions);
    } catch (e: any) {
      setAiAnalysisText(`Erro ao contatar IA: ${e.message}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const saveAndRunGemini = () => {
    if (!geminiApiKeyInput.trim()) return;
    localStorage.setItem("GEMINI_API_KEY", geminiApiKeyInput.trim());
    setIsApiKeyModalOpen(false);
    requestGeminiAnalysis();
  };

  const applyGeminiActions = () => {
    setSchedules((prevSchedules) => {
      const newSchedules = JSON.parse(JSON.stringify(prevSchedules));
      let changesApplied = 0;

      aiAnalysisActions.forEach((action) => {
        if (action.type === "assign") {
          if (
            !action.day ||
            !action.period ||
            !action.turmaId ||
            !action.subjectId ||
            !action.teacherId
          )
            return;

          if (!newSchedules[action.turmaId]) newSchedules[action.turmaId] = {};

          const periodNum = parseInt(action.period);
          const slotId = `${action.day}-${periodNum}`;
          const newLesson = {
            id: generateId(),
            turmaId: action.turmaId,
            subjectId: action.subjectId,
            teacherId: action.teacherId,
            isDouble: !!action.isDouble,
          };

          newSchedules[action.turmaId][slotId] = newLesson;

          if (action.isDouble) {
            const nextSlotId = `${action.day}-${periodNum + 1}`;
            const newDoubleLesson = { ...newLesson, id: generateId() };
            newSchedules[action.turmaId][nextSlotId] = newDoubleLesson;
          }
          changesApplied++;
        }
      });

      if (changesApplied > 0) {
        setIsSaved(false);
        setAiAnalysisActions([]);
        setIsAutoGenerateResultsModalOpen(false);
        return newSchedules;
      }
      return prevSchedules;
    });
  };

  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [teacherModalTab, setTeacherModalTab] = useState<"geral" | "vinculos" | "disponibilidade">("geral");
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [subjectModalTab, setSubjectModalTab] = useState<"geral" | "vinculos">(
    "geral",
  );
  const [vinculosShiftFilter, setVinculosShiftFilter] =
    useState<string>("todas");
  const [paintingMode, setPaintingMode] = useState<"enable" | "disable" | null>(
    null,
  );
  const [isAddingTurma, setIsAddingTurma] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomColor, setNewRoomColor] = useState("#6366f1");
  const [newRoomIcon, setNewRoomIcon] = useState("DoorClosed");
  const [isPrintingTurmaSelection, setIsPrintingTurmaSelection] =
    useState(false);
  const [isClearingSelection, setIsClearingSelection] = useState(false);

  const openSidebarModal = (
    modalName: "turma" | "disciplina" | "professor" | "sala" | "none",
  ) => {
    setIsAddingTurma(modalName === "turma");
    setIsAddingSubject(modalName === "disciplina");
    setIsAddingTeacher(modalName === "professor");
    setIsAddingRoom(modalName === "sala");
    setIsConfiguringTimeRanges(false);
    setIsPrintingTurmaSelection(false);
    setIsClearingSelection(false);
    setSelectedSlot(null);
  };

  useEffect(() => {
    setIsAddingTeacher(false);
    setIsAddingRoom(false);
    setIsAddingSubject(false);
    setIsAddingTurma(false);
    setIsConfiguringTimeRanges(false);
    setIsPrintingTurmaSelection(false);
    setIsClearingSelection(false);
    setEditingTeacherId(null);
    setEditingSubjectId(null);
    setEditingTurmaId(null);
  }, [location.pathname]);
  const [clearMode, setClearMode] = useState<
    | "tudo"
    | "manha"
    | "tarde"
    | "noite"
    | "Labs - Manhã"
    | "Labs - Tarde"
    | "Labs - Noite"
    | "especificas"
  >("tudo");
  const [clearSelectedTurmas, setClearSelectedTurmas] = useState<string[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);
  const [isShowingMissingClasses, setIsShowingMissingClasses] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState("geral");
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    if (location.search.includes("wizard=true")) {
      setIsWizardOpen(true);
      setWizardStep(1);
    }
    if (
      location.search.includes("visaoGeral=true") ||
      (location.state && (location.state as any).showMissingClasses)
    ) {
      setIsShowingMissingClasses(true);
      setMissingClassesFilter("faltantes");
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.search, location.state, navigate]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const handleWizardStepClick = (targetStep: number) => {
    setWizardError(null);
    if (targetStep < wizardStep) {
      setWizardStep(targetStep);
      return;
    }

    for (let i = 1; i < targetStep; i++) {
      if (i === 1) {
        continue;
      }
      if (i === 2) {
        const hasTurmas = turmas.filter((t) => !t.isRoom).length > 0;
        if (!hasTurmas) {
          setWizardError(
            "⚠️ Etapa pendente: Cadastre pelo menos uma Turma no Passo 2 para liberar as próximas etapas!",
          );
          return;
        }
      }
      if (i === 3) {
        if (subjects.length === 0) {
          setWizardError(
            "⚠️ Etapa pendente: Cadastre pelo menos uma Disciplina no Passo 3 para liberar as próximas etapas!",
          );
          return;
        }
      }
      if (i === 4) {
        if (teachers.length === 0) {
          setWizardError(
            "⚠️ Etapa pendente: Cadastre pelo menos um Professor no Passo 4 para liberar as próximas etapas!",
          );
          return;
        }
      }
      if (i === 5) {
        const roomsList = turmas.filter((t) => t.isRoom);
        if (roomsList.length === 0) {
          setWizardError(
            "⚠️ Etapa pendente: Cadastre pelo menos uma Sala Especial no Passo 5 para liberar as próximas etapas!",
          );
          return;
        }
      }
      if (i === 6) {
        if (!autoGenResults) {
          setWizardError(
            "⚠️ Etapa pendente: Execute o algoritmo de Geração Inteligente no Passo 6 antes de ir à homologação!",
          );
          return;
        }
      }
    }
    setWizardStep(targetStep);
  };
  const [isAutoGenerateResultsMinimized, setIsAutoGenerateResultsMinimized] =
    useState(false);
  const [missingClassesSearch, setMissingClassesSearch] = useState("");
  const [missingClassesShift, setMissingClassesShift] = useState<
    "todos" | "manha" | "tarde" | "noite"
  >("todos");
  const [missingClassesFilter, setMissingClassesFilter] = useState<
    "todos" | "faltantes" | "excesso" | "ok"
  >("faltantes");
  const [printIndividualShift, setPrintIndividualShift] = useState<
    "todos" | "manha" | "tarde" | "noite"
  >("todos");
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newTurmaShift, setNewTurmaShift] = useState<
    "manha" | "tarde" | "noite" | "todas"
  >("todas");
  const [newTurmaDailyClassCount, setNewTurmaDailyClassCount] = useState<5 | 6>(
    6,
  );

  const [newTurmaIsTechnical, setNewTurmaIsTechnical] =
    useState<boolean>(false);
  const [newTurmaIsCCM, setNewTurmaIsCCM] =
    useState<boolean>(false);

  useEffect(() => {
    // Automatically set daily class count based on profile and class name
    if (!newTurmaName) return;
    const isEF =
      /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(
        newTurmaName.trim(),
      );
    const isProf = /técnico|tec\.|formação|profissional|magistério/i.test(newTurmaName.trim()) || newTurmaIsTechnical;
    const isCCMSpecific = isCivicoMilitar || newTurmaIsCCM;
    
    if (isCCMSpecific || isProf || !isEF) {
      setNewTurmaDailyClassCount(6);
    } else {
      setNewTurmaDailyClassCount(5);
    }
  }, [newTurmaName, isCivicoMilitar, newTurmaIsTechnical, newTurmaIsCCM]);


  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);

  // Filter turmas for the interactive grid - let's show all by default unless we really need filtering
  // The user complained about missing "middle" classes, so showing all might be safer
  // or at least ensure the ones without shift show up correctly.

  const getTurmaSortWeight = (name: string) => {
    const formatted = formatTurmaName(name);
    const n = formatted.toUpperCase();
    const match = n.match(/(\d+)/);
    if (!match) return 9999;

    const num = parseInt(match[1]);
    let base = num * 100;

    // Prioridade: 6, 7, 8, 9, depois 1, 2, 3
    if (num >= 6 && num <= 9) {
      base = num * 100; // 600 - 900
    } else if (num >= 1 && num <= 3) {
      base = (num + 9) * 100; // 1000 - 1200
    }

    const suffix = n.split(match[1])[1] || "";
    const firstLetterMatch = suffix.match(/[A-Z]/);
    const letterWeight = firstLetterMatch
      ? firstLetterMatch[0].charCodeAt(0)
      : 0;

    return base + letterWeight;
  };

  const sortTurmasList = (list: Turma[]) => {
    return [...list].sort((a, b) => {
      const wa = getTurmaSortWeight(a.name);
      const wb = getTurmaSortWeight(b.name);
      if (wa !== wb) return wa - wb;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  };

  const displayedTurmas = sortTurmasList(
    turmas.filter((t) => {
      // Excluir as turmas virtuais das salas das listagens normais
      if (t.isRoom) return false;

      let baseFilter = false;
      if (t.shift) {
        baseFilter = t.shift === importShift;
      } else {
        // Fallback for older data or implicitly named turmas
        const isNamedTarde =
          t.name.toLowerCase().includes("tarde") ||
          t.id.toLowerCase().includes("tarde");
        const isNamedNoite =
          t.name.toLowerCase().includes("noite") ||
          t.id.toLowerCase().includes("noite");
        if (importShift === "noite") baseFilter = isNamedNoite;
        else if (importShift === "tarde") baseFilter = isNamedTarde;
        else baseFilter = !isNamedTarde && !isNamedNoite;
      }

      if (baseFilter && showOnlyConflicts) {
        return turmaHasConflicts(t.id);
      }
      return baseFilter;
    }),
  );

  // Initialize version, logo and school name on mount
  useEffect(() => {
    const savedLogo = localStorage.getItem("cecm_logo_url");
    if (savedLogo) setLogoUrl(savedLogo);

    const savedSchoolName = localStorage.getItem("cecm_school_name");
    if (savedSchoolName) setSchoolName(savedSchoolName);

    const savedWaPhone = localStorage.getItem("cecm_whatsapp_phone");
    if (savedWaPhone) {
      setWaPhone(savedWaPhone);
      setTempWaPhone(savedWaPhone);
    }

    const sys =
      (localStorage.getItem("cecm_academic_system") as any) || "Bimestral";

    let currentPeriod =
      Number(localStorage.getItem("cecm_academic_period")) || 1;
    let currentStart = localStorage.getItem("cecm_academic_start") || "";
    let currentEnd = localStorage.getItem("cecm_academic_end") || "";

    const savedAcademicDates = localStorage.getItem("cecm_academic_dates");
    if (savedAcademicDates) {
      try {
        const parsedDates = JSON.parse(savedAcademicDates);

        // Auto-detect current period based on dates
        const today = new Date();
        const numPeriods = sys === "Bimestral" ? 4 : 3;

        let foundActivePeriod = false;
        for (let p = 1; p <= numPeriods; p++) {
          const key = `${sys}-${p}`;
          const dates = parsedDates[key];
          if (dates && dates.start && dates.end) {
            const parseStr = (s: string) => {
              const parts = s.split("/");
              if (parts.length !== 2) return null;
              return new Date(
                today.getFullYear(),
                parseInt(parts[1]) - 1,
                parseInt(parts[0]),
              );
            };
            const start = parseStr(dates.start);
            const end = parseStr(dates.end);

            if (start && end) {
              if (end < start) end.setFullYear(end.getFullYear() + 1);
              start.setHours(0, 0, 0, 0);
              end.setHours(23, 59, 59, 999);

              if (today >= start && today <= end) {
                currentPeriod = p;
                currentStart = dates.start;
                currentEnd = dates.end;
                foundActivePeriod = true;
                break;
              }
            }
          }
        }

        if (foundActivePeriod) {
          setAcademicPeriod(currentPeriod);
          setAcademicStartDate(currentStart);
          setAcademicEndDate(currentEnd);
        }
      } catch (e) {
        console.error("Failed to parse academic dates", e);
      }
    }

    const savedVersion = localStorage.getItem("cecm_version");
    if (savedVersion) {
      const v = parseInt(savedVersion);
      // Elevate minimum version to 73 and auto-increase if it's currently at 72 or below
      setVersion(74);
    } else {
      setVersion(74);
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddingTeacher(false);
        setIsAddingRoom(false);
        setIsAddingSubject(false);
        setIsAddingTurma(false);
        setIsPrintingTurmaSelection(false);
        setIsClearingSelection(false);
        setIsShowingMissingClasses(false);
        setIsWhatsAppModalOpen(false);
        setSelectedSlot(null);
        setEditingTeacherId(null);
        setEditingSubjectId(null);
        setEditingTurmaId(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // History tracking
  useEffect(() => {
    if (!dataLoaded) return;
    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false;
      return;
    }
    setSchedulesHistory((prev) => {
      const newHistory = prev.slice(0, historyIndexRef.current + 1);
      newHistory.push(schedules);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [schedules, dataLoaded]);

  const undo = () => {
    if (historyIndexRef.current > 0) {
      skipNextHistoryRef.current = true;
      const previousState =
        schedulesHistoryRef.current[historyIndexRef.current - 1];
      setSchedules(previousState);
      setHistoryIndex((prev) => prev - 1);
      setIsSaved(false);
    }
  };

  const redo = () => {
    if (historyIndexRef.current < schedulesHistoryRef.current.length - 1) {
      skipNextHistoryRef.current = true;
      const nextState =
        schedulesHistoryRef.current[historyIndexRef.current + 1];
      setSchedules(nextState);
      setHistoryIndex((prev) => prev + 1);
      setIsSaved(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevenção de botão direito e atalhos de inspeção (segurança de dados)
  useEffect(() => {
    let toastTimeout: NodeJS.Timeout;

    const blockMenu = (e: MouseEvent) => {
      e.preventDefault();
      setShowSecurityToast(true);
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => setShowSecurityToast(false), 2500);
    };

    const blockInspectKeys = (e: KeyboardEvent) => {
      const isF12 = e.key === "F12";
      // Ctrl + Shift + I / J / C
      const isInspectCombo =
        e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" ||
          e.key === "i" ||
          e.key === "J" ||
          e.key === "j" ||
          e.key === "C" ||
          e.key === "c");
      // Ctrl + U (exibir código fonte)
      const isSourceCombo = e.ctrlKey && (e.key === "U" || e.key === "u");
      // Ctrl + S (salvar página)
      const isSaveCombo = e.ctrlKey && (e.key === "S" || e.key === "s");

      if (isF12 || isInspectCombo || isSourceCombo || isSaveCombo) {
        e.preventDefault();
        setShowSecurityToast(true);
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => setShowSecurityToast(false), 2500);
        return false;
      }
    };

    const handleMouseUp = () => {
      setPaintingMode(null);
    };

    document.addEventListener("contextmenu", blockMenu);
    window.addEventListener("keydown", blockInspectKeys);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("contextmenu", blockMenu);
      window.removeEventListener("keydown", blockInspectKeys);
      window.removeEventListener("mouseup", handleMouseUp);
      clearTimeout(toastTimeout);
    };
  }, []);

  // Synchronize selected turma when shift changes or list changes
  useEffect(() => {
    if (displayedTurmas.length > 0) {
      const isSelectedStillVisible = displayedTurmas.some(
        (t) => t.id === selectedTurmaId,
      );
      if (!isSelectedStillVisible) {
        setSelectedTurmaId(displayedTurmas[0].id);
      }
    } else {
      setSelectedTurmaId("");
    }
  }, [importShift, turmas.length]);

  // Load data
  useEffect(() => {
    try {
      const savedTeachers = localStorage.getItem("cecm_teachers");
      const savedSubjects = localStorage.getItem("cecm_subjects");
      const savedTurmas = localStorage.getItem("cecm_turmas");
      const savedSchedules = localStorage.getItem("cecm_schedules");

      if (savedTeachers) {
        let parsed = JSON.parse(savedTeachers);
        // Migration: convert subjectId string to subjectIds array
        parsed = parsed.map((t: any) => ({
          ...t,
          subjectIds: t.subjectIds || (t.subjectId ? [t.subjectId] : []),
        }));
        setTeachers(parsed);
      }
      if (savedSubjects) {
        let parsedSubjects = JSON.parse(savedSubjects);
        // Migração: Se não houver roomIds, criar a partir dos booleanos antigos
        parsedSubjects = parsedSubjects.map((s: any) => {
          if (!s.roomIds) {
            const roomIds = [];
            if (s.useLabComp) roomIds.push(ID_LAB_INFO_COMP);
            if (s.useLabTab) roomIds.push(ID_LAB_INFO_TAB);
            if (s.useSalaMat) roomIds.push(ID_SALA_MAT);
            return { ...s, roomIds };
          }
          return s;
        });
        setSubjects(parsedSubjects);
      }

      const savedLogo = localStorage.getItem("cecm_logo_url");
      if (savedLogo) setLogoUrl(savedLogo);

      const savedSchoolName = localStorage.getItem("cecm_school_name");
      if (savedSchoolName) setSchoolName(savedSchoolName);

      const savedVersion = localStorage.getItem("cecm_version");
      if (savedVersion) {
        const v = parseInt(savedVersion);
        setVersion(74);
      } else {
        setVersion(74);
      }

      const savedSubs = localStorage.getItem("cecm_substitutions");
      if (savedSubs) {
        setSubstitutions(JSON.parse(savedSubs));
      }

      if (savedTurmas) {
        let parsedTurmas = JSON.parse(savedTurmas);
        const specialRooms = [
          {
            id: ID_LAB_INFO_COMP,
            name: "LABORATÓRIO 1",
            shift: "ambos",
            isRoom: true,
            color: "#9333ea",
            icon: "Monitor",
          },
          {
            id: ID_LAB_INFO_TAB,
            name: "LABORATÓRIO 2",
            shift: "ambos",
            isRoom: true,
            color: "#2563eb",
            icon: "Tablet",
          },
          {
            id: ID_SALA_MAT,
            name: "SALA DE MATEMÁTICA",
            shift: "ambos",
            isRoom: true,
            color: "#f97316",
            icon: "Percent",
          },
        ];

        let updated = false;
        specialRooms.forEach((room) => {
          const existing = parsedTurmas.find((t: any) => t.id === room.id);
          if (!existing) {
            parsedTurmas.push(room);
            updated = true;
          } else if (
            !existing.isRoom ||
            !existing.icon ||
            existing.icon === "Calculator"
          ) {
            existing.isRoom = true;
            if (!existing.color) existing.color = room.color;
            existing.icon = room.icon;
            updated = true;
          }
        });

        // Migrate normal turmas that have no shift
        parsedTurmas = parsedTurmas.map((t: any) => {
          if (!t.isRoom && !t.shift) {
            const isNamedTarde =
              t.name.toLowerCase().includes("tarde") ||
              t.id.toLowerCase().includes("tarde");
            t.shift = isNamedTarde ? "tarde" : "manha";
            updated = true;
          }
          // Healing: If an afternoon user got corrupted and stored with 'manha' shift, restore it to 'tarde'
          if (
            !t.isRoom &&
            t.shift === "manha" &&
            (t.id.toLowerCase().includes("tarde") ||
              t.name.toLowerCase().includes("tarde"))
          ) {
            t.shift = "tarde";
            updated = true;
          }

          if (!t.isRoom) {
            if (t.dailyClassCount !== 6) {
              t.dailyClassCount = 6;
              updated = true;
            }
          }

          return t;
        });

        setTurmas(parsedTurmas);

        let loadedSchedules = {};
        if (savedSchedules) {
          try {
            loadedSchedules = JSON.parse(savedSchedules);
          } catch (e) {
            console.error("Error parsing saved schedules", e);
          }
        }

        // Remap schedules if we migrated any turma shift
        const migratedSchedules: AllSchedules = {};
        let schedulesMutated = false;
        Object.keys(loadedSchedules).forEach((tid) => {
          const turma = parsedTurmas.find((t: any) => t.id === tid);
          if (turma) {
            const remapped = remapScheduleIfNecessary(
              turma,
              loadedSchedules[tid],
              parsedTurmas,
            );
            migratedSchedules[tid] = remapped;
            if (remapped !== loadedSchedules[tid]) {
              schedulesMutated = true;
            }
          } else {
            migratedSchedules[tid] = loadedSchedules[tid];
          }
        });

        // HEAL ORPHANED LAB CLASSES: Ensure any room slot specifies the teacher/subject in the base Turma too
        Object.entries(migratedSchedules).forEach(([tid, schedule]) => {
          const turma = parsedTurmas.find((t: any) => t.id === tid);
          if (turma?.isRoom) {
            Object.entries(schedule).forEach(([slotId, slot]) => {
              if (
                slot &&
                slot.associatedTurmaId &&
                slot.teacherId &&
                slot.subjectId
              ) {
                const assocTurmaId = slot.associatedTurmaId;
                if (!migratedSchedules[assocTurmaId])
                  migratedSchedules[assocTurmaId] = {};
                const baseSlot = migratedSchedules[assocTurmaId][slotId];
                if (
                  !baseSlot ||
                  !baseSlot.teacherId ||
                  !baseSlot.associatedRoomId
                ) {
                  migratedSchedules[assocTurmaId][slotId] = {
                    ...baseSlot,
                    teacherId: slot.teacherId,
                    subjectId: slot.subjectId,
                    associatedRoomId: tid,
                  };
                  schedulesMutated = true;
                }
              }
            });
          }
        });

        setSchedules(migratedSchedules);

        if (savedSubjects) {
          let parsedSubjects = JSON.parse(savedSubjects);
          parsedSubjects = parsedSubjects.map((s: any) => {
            if (!s.roomIds) {
              const roomIds = [];
              if (s.useLabComp) roomIds.push(ID_LAB_INFO_COMP);
              if (s.useLabTab) roomIds.push(ID_LAB_INFO_TAB);
              if (s.useSalaMat) roomIds.push(ID_SALA_MAT);
              return { ...s, roomIds };
            }
            return s;
          });
          const { updatedSubjects, changed: subjectsHealed } =
            healSubjectConstraints(
              parsedSubjects,
              migratedSchedules,
              parsedTurmas,
            );
          setSubjects(updatedSubjects);
          if (subjectsHealed) {
            localStorage.setItem(
              "cecm_subjects",
              JSON.stringify(updatedSubjects),
            );
          }
        }

        if (updated) {
          localStorage.setItem("cecm_turmas", JSON.stringify(parsedTurmas));
        }

        if (updated || schedulesMutated) {
          localStorage.setItem(
            "cecm_schedules",
            JSON.stringify(migratedSchedules),
          );
        }

        if (parsedTurmas.length > 0) {
          setSelectedTurmaId(parsedTurmas[0].id);
          const firstTurma =
            parsedTurmas.find((t: any) => !t.isRoom) || parsedTurmas[0];
          if (firstTurma.shift && firstTurma.shift !== "ambos") {
            setImportShift(firstTurma.shift);
          } else if (
            firstTurma.name?.toLowerCase().includes("tarde") ||
            firstTurma.id?.toLowerCase().includes("tarde")
          ) {
            setImportShift("tarde");
          } else if (
            firstTurma.name?.toLowerCase().includes("noite") ||
            firstTurma.id?.toLowerCase().includes("noite")
          ) {
            setImportShift("noite");
          } else {
            setImportShift("manha");
          }

          const hasNoiteTurma = parsedTurmas.some(
            (t: any) =>
              t.shift === "noite" ||
              t.name?.toLowerCase().includes("noite") ||
              t.id?.toLowerCase().includes("noite"),
          );
          if (hasNoiteTurma) {
            setEnableNoite(true);
            localStorage.setItem("enable_noite_period", "true");
          }
        }
      } else {
        const specialRooms = [
          {
            id: ID_LAB_INFO_COMP,
            name: "LABORATÓRIO 1",
            shift: "ambos",
            isRoom: true,
            color: "#9333ea",
            icon: "Monitor",
          },
          {
            id: ID_LAB_INFO_TAB,
            name: "LABORATÓRIO 2",
            shift: "ambos",
            isRoom: true,
            color: "#2563eb",
            icon: "Tablet",
          },
          {
            id: ID_SALA_MAT,
            name: "SALA DE MATEMÁTICA",
            shift: "ambos",
            isRoom: true,
            color: "#f97316",
            icon: "Percent",
          },
        ];
        const defaultTurmas = Array.from({ length: 12 }, (_, i) => ({
          id: generateId(),
          name: `${Math.floor(i / 3) + 6}º Ano ${String.fromCharCode(65 + (i % 3))}`,
          shift: "manha" as const,
        }));
        const initialTurmas = [...specialRooms, ...defaultTurmas];
        setTurmas(initialTurmas);
        localStorage.setItem("cecm_turmas", JSON.stringify(initialTurmas));
        if (initialTurmas.length > 0) setSelectedTurmaId(initialTurmas[0].id);

        if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
      }
    } catch (err) {
      console.error("Error loading data from localStorage:", err);
      // Reset corrupted data
      localStorage.clear();
    } finally {
      setDataLoaded(true);
    }
  }, []);

  // Force Apply Curricular Matrix & Teachers Mapping
  useEffect(() => {
    if (!dataLoaded) return;

    // Check version to run one-off
    const applied = localStorage.getItem("cecm_matrix_lucas_v16_fix");
    if (applied === "true") return;

    // Create copies and apply both fixes
    let currentSubjects = subjects;
    let currentTeachers = teachers;
    let didChange = false;

    const matrixFixResult = applyMatrixFix(currentSubjects, turmas);
    if (matrixFixResult.changed) {
      currentSubjects = matrixFixResult.nextSubjects;
      didChange = true;
    }

    const teacherFixResult = applyTeachersFix(
      currentTeachers,
      currentSubjects,
      turmas,
    );
    if (teacherFixResult.changedTeachers || teacherFixResult.changedSubjects) {
      currentTeachers = teacherFixResult.nextTeachers;
      currentSubjects = teacherFixResult.nextSubjects;
      didChange = true;
    }

    // Deduplicate teachers
    const uniqueTeachers: Teacher[] = [];
    const teacherIdMap: Record<string, string> = {};
    let deduplicated = false;

    currentTeachers.forEach((t) => {
      const existing = uniqueTeachers.find(
        (u) => u.name.toLowerCase().trim() === t.name.toLowerCase().trim(),
      );
      if (existing) {
        teacherIdMap[t.id] = existing.id;
        existing.subjectIds = Array.from(
          new Set([...(existing.subjectIds || []), ...(t.subjectIds || [])]),
        );
        existing.turmaIds = Array.from(
          new Set([...(existing.turmaIds || []), ...(t.turmaIds || [])]),
        );
        const newSubjectTurmaMap: Record<string, string[]> = {
          ...(existing.subjectTurmaMap || {}),
        };
        if (t.subjectTurmaMap) {
          for (const [sId, tIds] of Object.entries(t.subjectTurmaMap)) {
            const arr1 = newSubjectTurmaMap[sId] || [];
            const arr2 = (tIds as string[]) || [];
            newSubjectTurmaMap[sId] = Array.from(new Set([...arr1, ...arr2]));
          }
        }
        existing.subjectTurmaMap = newSubjectTurmaMap;
        deduplicated = true;
        didChange = true;
      } else {
        uniqueTeachers.push(t);
      }
    });

    if (deduplicated) {
      currentTeachers = uniqueTeachers;
      setSchedules((prevSchedules) => {
        let changedSchedules = false;
        const nextSchedules = JSON.parse(JSON.stringify(prevSchedules));
        for (const tId in nextSchedules) {
          const turmaSched = nextSchedules[tId];
          for (const slotKey in turmaSched) {
            const slotData = turmaSched[slotKey];
            if (slotData.teacherId && teacherIdMap[slotData.teacherId]) {
              slotData.teacherId = teacherIdMap[slotData.teacherId];
              changedSchedules = true;
            }
          }
        }
        if (changedSchedules) {
          localStorage.setItem("cecm_schedules", JSON.stringify(nextSchedules));
          return nextSchedules;
        }
        return prevSchedules;
      });
    }

    if (didChange) {
      setSubjects(currentSubjects);
      setTeachers(currentTeachers);

      localStorage.setItem("cecm_subjects", JSON.stringify(currentSubjects));
      localStorage.setItem("cecm_teachers", JSON.stringify(currentTeachers));
    }

    localStorage.setItem("cecm_matrix_lucas_v16_fix", "true");
  }, [dataLoaded, turmas, subjects, teachers]);

  // Conflict Detection
  const getConflicts = (
    dayId: string,
    period: number,
    teacherId: string,
    excludeTurmaId: string,
    optAssociatedTurmaId?: string,
  ) => {
    if (!teacherId) return [];
    const slotId = `${dayId}-${period}`;
    const conflicts: string[] = [];

    // Verificação de Indisponibilidade
    const teacher = teachers.find((t) => t.id === teacherId);
    if (
      teacher &&
      teacher.unavailability &&
      teacher.unavailability.length > 0
    ) {
      if (teacher.unavailability.includes(slotId)) {
        conflicts.push("INDISPONÍVEL");
      }
    } else if (
      teacher &&
      teacher.availability &&
      teacher.availability.length > 0
    ) {
      // Suporte legado
      if (!teacher.availability.includes(slotId)) {
        conflicts.push("INDISPONÍVEL");
      }
    }

    // Validação de intervalo exigido entre turnos (fim da manhã e início da tarde, ou fim da tarde e início da noite)
    if (teacher && teacher.requireShiftInterval) {
      if (period === 6) {
        const nextSlotId = `${dayId}-7`;
        const hasNextClass = Object.keys(schedules).some(
          (tid) => schedules[tid]?.[nextSlotId]?.teacherId === teacherId,
        );
        if (hasNextClass) {
          conflicts.push("TRANS_TURNO (1-Tarde)");
        }
      } else if (period === 7) {
        const prevSlotId = `${dayId}-6`;
        const hasPrevClass = Object.keys(schedules).some(
          (tid) => schedules[tid]?.[prevSlotId]?.teacherId === teacherId,
        );
        if (hasPrevClass) {
          conflicts.push("TRANS_TURNO (6-Manhã)");
        }
      } else if (period === 12) {
        const nextSlotId = `${dayId}-13`;
        const hasNextClass = Object.keys(schedules).some(
          (tid) => schedules[tid]?.[nextSlotId]?.teacherId === teacherId,
        );
        if (hasNextClass) {
          conflicts.push("TRANS_TURNO (1-Noite)");
        }
      } else if (period === 13) {
        const prevSlotId = `${dayId}-12`;
        const hasPrevClass = Object.keys(schedules).some(
          (tid) => schedules[tid]?.[prevSlotId]?.teacherId === teacherId,
        );
        if (hasPrevClass) {
          conflicts.push("TRANS_TURNO (6-Tarde)");
        }
      }
    }

    Object.entries(schedules).forEach(([turmaId, schedule]) => {
      if (
        turmaId !== excludeTurmaId &&
        schedule[slotId]?.teacherId === teacherId
      ) {
        // Ignorar conflito se for o mesmo professor cuidando da mesma turma em sala e laboratório/sala especial ao mesmo tempo
        const currentIsRoom = turmas.find(
          (t) => t.id === excludeTurmaId,
        )?.isRoom;
        const otherIsRoom = turmas.find((t) => t.id === turmaId)?.isRoom;

        const assocClass1 = currentIsRoom
          ? optAssociatedTurmaId || tempAssociatedTurmaId
          : excludeTurmaId;
        const assocClass2 = otherIsRoom
          ? schedule[slotId]?.associatedTurmaId
          : turmaId;

        if (assocClass1 && assocClass2 && assocClass1 === assocClass2) {
          return; // É a mesma turma e mesmo professor em ambiente compartilhado. Não sinaliza conflito.
        }

        const turmaName =
          turmas.find((t) => t.id === turmaId)?.name || "Outra Turma";
        conflicts.push(turmaName);
      }
    });

    return conflicts;
  };

  const turmaHasConflicts = (turmaId: string) => {
    if (!schedules[turmaId]) return false;
    return Object.keys(schedules[turmaId]).some((slotId) => {
      const slot = schedules[turmaId][slotId];
      if (!slot || !slot.teacherId) return false;
      const [dayId, pStr] = slotId.split("-");
      const period = parseInt(pStr);
      const conflicts = getConflicts(
        dayId,
        period,
        slot.teacherId,
        turmaId,
        slot.associatedTurmaId,
      );
      return conflicts.length > 0;
    });
  };

  // Save data
  const handlePrint = () => {
    window.print();
  };

  // Auto-save to localStorage whenever data changes
  const [isAutosaving, setIsAutosaving] = useState(false);

  useEffect(() => {
    if (!dataLoaded) return;
    setIsAutosaving(true);
    localStorage.setItem("cecm_teachers", JSON.stringify(teachers));
    localStorage.setItem("cecm_subjects", JSON.stringify(subjects));
    localStorage.setItem("cecm_turmas", JSON.stringify(turmas));
    localStorage.setItem("cecm_schedules", JSON.stringify(schedules));
    localStorage.setItem("cecm_version", version.toString());
    localStorage.setItem("cecm_logo_url", logoUrl);
    localStorage.setItem("cecm_school_name", schoolName);
    localStorage.setItem("cecm_academic_system", academicSystem);
    localStorage.setItem("cecm_academic_period", academicPeriod.toString());
    localStorage.setItem("cecm_academic_start", academicStartDate);
    localStorage.setItem("cecm_academic_end", academicEndDate);
    localStorage.setItem("cecm_academic_dates", JSON.stringify(academicDates));
    localStorage.setItem(
      "cecm_is_civico_militar",
      isCivicoMilitar ? "true" : "false",
    );

    const timeoutDesc = setTimeout(() => {
      setIsAutosaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 500);
    return () => clearTimeout(timeoutDesc);
  }, [
    teachers,
    subjects,
    turmas,
    schedules,
    version,
    logoUrl,
    schoolName,
    academicSystem,
    academicPeriod,
    academicStartDate,
    academicEndDate,
    academicDates,
    isCivicoMilitar,
    dataLoaded,
  ]);

  const handleModalidadeChange = (isCCM: boolean) => {
    setIsCivicoMilitar(isCCM);
    // Apply default matrices to existing turmas automatically based on the new modality profile
    setSubjects((prev) => {
      let updatedSubjects = [...prev];
      turmas.forEach((t) => {
        if (t.isRoom) return;
        const isEF =
          /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(
            t.name,
          );

        const targetWorkloads: Record<string, number> = {};
        if (isEF) {
          if (isCCM) {
            Object.assign(targetWorkloads, {
              "sub-port": 5,
              "sub-mat": 5,
              "sub-cien": 4,
              "sub-his": 3,
              "sub-geo": 3,
              "sub-ing": 2,
              "sub-art": 2,
              "sub-ef": 2,
              "sub-ensr": 1,
              "sub-cid": 2,
              "sub-edfin": 1,
            });
          } else {
            Object.assign(targetWorkloads, {
              "sub-port": 4,
              "sub-mat": 4,
              "sub-cien": 3,
              "sub-his": 3,
              "sub-geo": 3,
              "sub-robot": 2,
              "sub-ef": 2,
              "sub-ing": 2,
              "sub-art": 2,
              "sub-cid": 2,
              "sub-edfin": 2,
              "sub-ensr": 1,
            });
          }
        } else {
          // Ensino Médio
          if (isCCM) {
            Object.assign(targetWorkloads, {
              "sub-port": 4,
              "sub-mat": 4,
              "sub-bio": 2,
              "sub-fis": 2,
              "sub-quim": 2,
              "sub-his": 2,
              "sub-geo": 2,
              "sub-ing": 2,
              "sub-art": 1,
              "sub-ef": 1,
              "sub-fil": 1,
              "sub-soc": 1,
              "sub-cid": 2,
              "sub-eddigc": 2,
              "sub-edfin": 1,
              "sub-pvida": 1,
            });
          } else {
            Object.assign(targetWorkloads, {
              "sub-port": 4,
              "sub-mat": 4,
              "sub-bio": 2,
              "sub-fis": 2,
              "sub-quim": 2,
              "sub-his": 2,
              "sub-geo": 2,
              "sub-eddigc": 2,
              "sub-edfin": 0, // Not requested? Wait, let me check. 'sub-cid' = 2, 'sub-ef' = 2, 'sub-ing' = 2...
              "sub-ing": 2,
              "sub-ef": 2,
              "sub-art": 1,
              "sub-fil": 1,
              "sub-soc": 1,
              "sub-pvida": 1,
              "sub-cid": 2,
            });
          }
        }

        // Reset workloads for this turma
        updatedSubjects = updatedSubjects.map((s) => {
          const canonicalKey = getSubjectCanonicalIdKey(s.name) || s.id;
          const defaultW = targetWorkloads[canonicalKey] || 0;
          const isCurrentlyAllowed =
            s.allowedTurmaIds && s.allowedTurmaIds.includes(t.id);
          const hasCustom =
            s.customWorkloads && s.customWorkloads[t.id] !== undefined;

          if (defaultW > 0 || hasCustom || isCurrentlyAllowed) {
            const allowedIds = s.allowedTurmaIds
              ? new Set(s.allowedTurmaIds)
              : new Set<string>();
            const cw = { ...(s.customWorkloads || {}) };

            if (defaultW > 0) {
              allowedIds.add(t.id);
              cw[t.id] = defaultW;
            } else {
              delete cw[t.id]; // Remove from customWorkloads if it should be 0
              allowedIds.delete(t.id); // FIX: properly remove from allowed list
            }

            return {
              ...s,
              allowedTurmaIds: Array.from(allowedIds),
              customWorkloads: cw,
              workload: Math.max(
                ...Object.values(cw).map((v) => Number(v) || 0),
                0,
              ),
            };
          }
          return s;
        });
      });
      return updatedSubjects;
    });

    // Also adjust daily classes rules across all turmas
    setTurmas((prev) =>
      prev.map((t) => {
        if (t.isRoom) return t;
        const isEF =
          /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(
            t.name.trim(),
          );
        const isProf = /técnico|tec\.|formação|profissional|magistério/i.test(t.name.trim()) || t.isTechnical;
        const autoDailyClassCount = (isCCM || isProf || !isEF) ? 6 : 5;
        return { ...t, dailyClassCount: autoDailyClassCount as 5 | 6 };
      }),
    );

    // Optionally cleanup 6th periods in schedules when converting to 5
    // But since it can be heavy and we already have logic to hide 6th periods from standard display if classCount=5, it's ok not to delete strictly yet, or we can just run the cleaner.
    // Cleanup is removed to preserve 6th periods for 30 workload curriculums
    /* setSchedules(prev => {
      const next = { ...prev };
      turmas.forEach(t => {
        const isEF = /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(t.name);
        if (!isCCM && isEF && next[t.id]) {
          const copy = { ...next[t.id] };
          const periodsToRemove = t.shift === 'noite' ? [18] : t.shift === 'tarde' ? [12] : [6];
          const days = ['seg', 'ter', 'qua', 'qui', 'sex'];
          let changed = false;
          days.forEach(day => {
            periodsToRemove.forEach(p => {
              if (copy[`${day}-${p}`]) {
                delete copy[`${day}-${p}`];
                changed = true;
              }
            });
          });
          if (changed) next[t.id] = copy;
        }
      });
      return next;
    }); */
  };

  // Backup functions
  useEffect(() => {
    if (location.state?.highlightConflicts && dataLoaded) {
      let foundConflictTurma = "";
      const days = ["seg", "ter", "qua", "qui", "sex"];
      for (const t of turmas) {
        if (foundConflictTurma) break;
        if (t.isRoom) continue;
        const s = schedules[t.id];
        if (!s) continue;
        for (const day of days) {
          if (foundConflictTurma) break;
          // Check morning, afternoon, night
          for (let pNum = 1; pNum <= 17; pNum++) {
            const slot = s[`${day}-${pNum}`];
            if (slot && slot.teacherId) {
              const confs = getConflicts(
                day,
                pNum,
                slot.teacherId,
                t.id,
                slot.associatedTurmaId,
              );
              if (confs.length > 0) {
                foundConflictTurma = t.id;
                break;
              }
            }
          }
        }
      }

      if (foundConflictTurma) {
        const t = turmas.find((x) => x.id === foundConflictTurma);
        if (t && t.shift) {
          setImportShift(t.shift as any);
          setViewMode("turmas");
          // Wait momentarily for shift state to apply so displayedTurmas updates, or just force selectedTurmaId
          setTimeout(() => {
            setSelectedTurmaId(t.id);
          }, 100);
        }
      }

      // Clear the location state so it doesn't trigger again continuously on re-renders,
      // and navigate correctly via React Router
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.highlightConflicts, dataLoaded]);

  const handleExportData = () => {
    const lsData: Record<string, string> = {};
    Object.keys(localStorage).forEach(key => {
      lsData[key] = localStorage.getItem(key) || '';
    });

    const exportObject = {
      appName: "GE-Scheduler",
      exportDate: new Date().toISOString(),
      localStorageData: lsData
    };

    const blob = new Blob([JSON.stringify(exportObject)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    link.download = `backup_horarios_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppExport = () => {
    // 1. Export standard text file (Download format) so it's ready in browser downloads
    handleExportData();

    // 2. Format phone number to numbers only
    const cleanPhone = tempWaPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Por favor, insira um número de telefone válido com DDD.");
      return;
    }

    // Save number to localStorage and state
    setWaPhone(cleanPhone);
    localStorage.setItem("cecm_whatsapp_phone", cleanPhone);

    // 3. Build WhatsApp message text (simple and compact referring to the downloaded .json file)
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const timeStr = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const messageText =
      `Olá! Segue o arquivo de backup do Gerador de Horários - ${schoolName}.\n\n` +
      `📅 Gerado em: ${dateStr} às ${timeStr}\n\n` +
      `📝 TUTORIAL PARA RESTAURAR ESTE BACKUP:\n` +
      `1. Baixe o arquivo de backup (.json) que foi baixado automaticamente no seu dispositivo ou computador.\n` +
      `2. No sistema, clique na opção de "Restaurar Backup" (ícone com folha de papel com seta apontando para cima no menu superior).\n` +
      `3. Selecione o arquivo .json baixado.\n\n` +
      `Pronto! Todos os professores, matérias e grades serão atualizados e restaurados instantaneamente.\n\n` +
      `Gerador de Horários - ${schoolName}`;

    // 4. Open WhatsApp via universal deep link api.whatsapp.com
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank");

    // Close modal
    setIsWhatsAppModalOpen(false);
  };

  // Helper to remap schedule if shift changes
  const remapScheduleIfNecessary = (
    turma: Turma,
    schedule: Schedule,
    allTurmas: Turma[],
  ): Schedule => {
    const newSchedule: Schedule = {};
    let changed = false;

    Object.entries(schedule).forEach(([slotId, slot]) => {
      const [day, periodStr] = slotId.split("-");
      const period = parseInt(periodStr);

      let targetPeriod = period;

      let effectiveShift = turma.shift;
      if (turma.shift === "ambos" && slot.associatedTurmaId) {
        const assocTurma = allTurmas.find(
          (t) => t.id === slot.associatedTurmaId,
        );
        if (assocTurma) effectiveShift = assocTurma.shift;
      }

      if (effectiveShift === "manha" && period > 6) {
        targetPeriod = period - 6;
        changed = true;
      } else if (effectiveShift === "tarde" && period <= 6) {
        targetPeriod = period + 6;
        changed = true;
      }

      newSchedule[`${day}-${targetPeriod}`] = slot;
    });

    return changed ? newSchedule : schedule;
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rawData = JSON.parse(content);

        import("../lib/validation")
          .then(({ BackupSchema }) => {
            const validation = BackupSchema.safeParse(rawData);
            if (!validation.success) {
              console.error(
                "Backup schema validation failed:",
                validation.error,
              );
              alert(
                "O arquivo de backup é inválido ou está corrompido de acordo com a validação de segurança.",
              );
              return;
            }

            const data = validation.data;

            // Basic validation: check if it's a JSON with at least one expected key
            const hasSomeData =
              data.localStorageData || data.teachers || data.subjects || data.turmas || data.schedules;

            if (hasSomeData) {
              if (data.localStorageData) {
                // If it's a full localStorage backup, set it and reload directly
                Object.keys(data.localStorageData).forEach(key => {
                  localStorage.setItem(key, data.localStorageData[key]);
                });
                alert("Backup restaurado com sucesso! A página será recarregada.");
                window.location.reload();
                return;
              }

              const isCurrentAppEmpty =
                teachers.length === 0 && subjects.length === 0;

              const proceedWithImport = () => {
                // Ensure all data is set, providing defaults for older backups
                setTeachers(data.teachers || []);

                // Migração de subjects no import
                let importedSubjects = (data.subjects || []).map((s: any) => {
                  if (!s.roomIds) {
                    const roomIds = [];
                    if (s.useLabComp) roomIds.push(ID_LAB_INFO_COMP);
                    if (s.useLabTab) roomIds.push(ID_LAB_INFO_TAB);
                    if (s.useSalaMat) roomIds.push(ID_SALA_MAT);
                    return { ...s, roomIds };
                  }
                  return s;
                });
                setSubjects(importedSubjects);

                let importedTurmas = (data.turmas || []).map((t: any) => {
                  // Migração: Se for um dos IDs antigos, garantir que isRoom: true
                  if (
                    [ID_LAB_INFO_COMP, ID_LAB_INFO_TAB, ID_SALA_MAT].includes(
                      t.id,
                    )
                  ) {
                    return {
                      ...t,
                      isRoom: true,
                      shift: "ambos",
                      color:
                        t.color ||
                        (t.id === ID_LAB_INFO_COMP
                          ? "#9333ea"
                          : t.id === ID_LAB_INFO_TAB
                            ? "#2563eb"
                            : "#f97316"),
                      icon:
                        (t.icon && t.icon !== "Calculator"
                          ? t.icon
                          : undefined) ||
                        (t.id === ID_LAB_INFO_COMP
                          ? "Monitor"
                          : t.id === ID_LAB_INFO_TAB
                            ? "Tablet"
                            : "Percent"),
                    };
                  }
                  // Normal turmas shift migration
                  if (!t.isRoom) {
                    t.name = formatTurmaName(t.name);
                    if (!t.shift) {
                      const isNamedTarde =
                        t.name?.toLowerCase().includes("tarde") ||
                        t.id?.toLowerCase().includes("tarde");
                      t.shift = isNamedTarde ? "tarde" : "manha";
                    } else if (
                      t.shift === "manha" &&
                      (t.id?.toLowerCase().includes("tarde") ||
                        t.name?.toLowerCase().includes("tarde"))
                    ) {
                      // Heal shift if it is incorrectly stored in the raw backup as 'manha'
                      t.shift = "tarde";
                    }
                    // Enforce 6 classes per day (30 weekly slots) for all standard turmas to support the 30-class matrix
                    if (t.dailyClassCount !== 6) {
                      t.dailyClassCount = 6;
                    }
                  }
                  return t;
                });

                const specialRooms = [
                  {
                    id: ID_LAB_INFO_COMP,
                    name: "LABORATÓRIO 1",
                    shift: "ambos",
                    isRoom: true,
                    color: "#9333ea",
                    icon: "Monitor",
                  },
                  {
                    id: ID_LAB_INFO_TAB,
                    name: "LABORATÓRIO 2",
                    shift: "ambos",
                    isRoom: true,
                    color: "#2563eb",
                    icon: "Tablet",
                  },
                  {
                    id: ID_SALA_MAT,
                    name: "SALA DE MATEMÁTICA",
                    shift: "ambos",
                    isRoom: true,
                    color: "#f97316",
                    icon: "Percent",
                  },
                ];

                specialRooms.forEach((room) => {
                  const existing = importedTurmas.find(
                    (t: any) => t.id === room.id,
                  );
                  if (!existing) {
                    importedTurmas.push(room);
                  } else {
                    if (!existing.isRoom) existing.isRoom = true;
                    if (!existing.shift) existing.shift = "ambos";
                    if (!existing.color) existing.color = room.color;
                  }
                });

                setTurmas(importedTurmas);

                // Normalização de schedules no import
                const rawSchedules = (data.schedules as AllSchedules) || {};
                const normalizedSchedules: AllSchedules = {};

                Object.keys(rawSchedules).forEach((tid) => {
                  const turma = importedTurmas.find((t: any) => t.id === tid);
                  if (turma) {
                    normalizedSchedules[tid] = remapScheduleIfNecessary(
                      turma,
                      rawSchedules[tid],
                      importedTurmas,
                    );
                  } else {
                    normalizedSchedules[tid] = rawSchedules[tid];
                  }
                });

                setSchedules(normalizedSchedules);

                // Apply subject constraints healing post import
                const { updatedSubjects } = healSubjectConstraints(
                  importedSubjects,
                  normalizedSchedules,
                  importedTurmas,
                );
                const { nextSubjects: finalSubjects } = applyMatrixFix(
                  updatedSubjects,
                  importedTurmas,
                );
                setSubjects(finalSubjects);
                localStorage.setItem(
                  "cecm_subjects",
                  JSON.stringify(finalSubjects),
                );
                localStorage.setItem(
                  "cecm_substitutions",
                  JSON.stringify(data.substitutions || []),
                );

                if (data.notices)
                  localStorage.setItem(
                    "cecm_notices",
                    JSON.stringify(data.notices),
                  );
                if (data.roomReservations)
                  localStorage.setItem(
                    "cecm_room_reservations",
                    JSON.stringify(data.roomReservations),
                  );
                if (data.roomLayout)
                  localStorage.setItem(
                    "cecm_room_layout",
                    JSON.stringify(data.roomLayout),
                  );
                if (data.certificatePresets) {
                  Object.keys(data.certificatePresets).forEach((k) => {
                    localStorage.setItem(
                      k,
                      JSON.stringify(data.certificatePresets[k]),
                    );
                  });
                }

                setLogoUrl(data.logoUrl || "");
                setSchoolName(data.schoolName || "CE LUCAS LENIAR");

                if (data.timeRangesManha)
                  setTimeRangesManha(data.timeRangesManha);
                if (data.timeRangesTarde)
                  setTimeRangesTarde(data.timeRangesTarde);
                if (data.timeRangesNoite)
                  setTimeRangesNoite(data.timeRangesNoite);

                if (data.enableNoite !== undefined) {
                  setEnableNoite(data.enableNoite);
                  localStorage.setItem(
                    "enable_noite_period",
                    data.enableNoite ? "true" : "false",
                  );
                }
                if (data.enableNoiteAsynchronous !== undefined) {
                  setEnableNoiteAsynchronous(data.enableNoiteAsynchronous);
                  localStorage.setItem(
                    "enable_noite_asynchronous",
                    data.enableNoiteAsynchronous ? "true" : "false",
                  );
                }

                if (data.academicSystem) {
                  setAcademicSystem(data.academicSystem);
                  localStorage.setItem(
                    "cecm_academic_system",
                    data.academicSystem,
                  );
                }
                if (data.academicDates) {
                  setAcademicDates(data.academicDates);
                  localStorage.setItem(
                    "cecm_academic_dates",
                    JSON.stringify(data.academicDates),
                  );

                  // auto detect period
                  const sys = data.academicSystem || "Bimestral";
                  const today = new Date();
                  const numPeriods = sys === "Bimestral" ? 4 : 3;
                  for (let p = 1; p <= numPeriods; p++) {
                    const key = `${sys}-${p}`;
                    const dates = data.academicDates[key];
                    if (dates && dates.start && dates.end) {
                      const parts = dates.start.split("/");
                      if (parts.length === 2) {
                        const start = new Date(
                          today.getFullYear(),
                          parseInt(parts[1]) - 1,
                          parseInt(parts[0]),
                        );
                        const endParts = dates.end.split("/");
                        const end = new Date(
                          today.getFullYear(),
                          parseInt(endParts[1]) - 1,
                          parseInt(endParts[0]),
                        );
                        if (end < start) end.setFullYear(end.getFullYear() + 1);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 59, 999);

                        if (today >= start && today <= end) {
                          setAcademicPeriod(p);
                          setAcademicStartDate(dates.start);
                          setAcademicEndDate(dates.end);
                          localStorage.setItem(
                            "cecm_academic_period",
                            p.toString(),
                          );
                          localStorage.setItem(
                            "cecm_academic_start",
                            dates.start,
                          );
                          localStorage.setItem("cecm_academic_end", dates.end);
                          break;
                        }
                      }
                    }
                  }
                }

                if (data.certificatePresets) {
                  Object.keys(data.certificatePresets).forEach((k) => {
                    localStorage.setItem(
                      k,
                      JSON.stringify(data.certificatePresets[k]),
                    );
                  });
                }

                if (data.roomReservations) {
                  localStorage.setItem(
                    "cecm_room_reservations",
                    JSON.stringify(data.roomReservations),
                  );
                }

                if (data.roomLayout) {
                  localStorage.setItem(
                    "cecm_room_layout",
                    JSON.stringify(data.roomLayout),
                  );
                }

                setVersion(74);

                if (importedTurmas.length > 0) {
                  setSelectedTurmaId(importedTurmas[0].id);
                  const firstTurma =
                    importedTurmas.find((t: any) => !t.isRoom) ||
                    importedTurmas[0];
                  if (firstTurma.shift && firstTurma.shift !== "ambos") {
                    setImportShift(firstTurma.shift);
                  } else if (
                    firstTurma.name?.toLowerCase().includes("tarde") ||
                    firstTurma.id?.toLowerCase().includes("tarde")
                  ) {
                    setImportShift("tarde");
                  } else if (
                    firstTurma.name?.toLowerCase().includes("noite") ||
                    firstTurma.id?.toLowerCase().includes("noite")
                  ) {
                    setImportShift("noite");
                  } else {
                    setImportShift("manha");
                  }

                  // Auto-enable Noite if any imported class has the Noite shift
                  const hasNoiteTurma = importedTurmas.some(
                    (t: any) =>
                      t.shift === "noite" ||
                      t.name?.toLowerCase().includes("noite") ||
                      t.id?.toLowerCase().includes("noite"),
                  );
                  if (hasNoiteTurma) {
                    setEnableNoite(true);
                    localStorage.setItem("enable_noite_period", "true");
                  }
                }

                alert(
                  "Backup restaurado com sucesso! Todos os dados foram atualizados.",
                );
              };

              if (isCurrentAppEmpty) {
                proceedWithImport();
              } else {
                setConfirmConfig({
                  title: "Substituir Dados Atuais",
                  message:
                    "ATENÇÃO: A importação de backup irá substituir TODOS os dados atuais (professores, matérias e horários). Deseja continuar?",
                  confirmText: "Importar",
                  cancelText: "Cancelar",
                  onConfirm: proceedWithImport,
                });
              }
            } else {
              alert(
                "Arquivo de backup de formato desconhecido. Certifique-se de usar um arquivo .json gerado por este sistema.",
              );
            }

            // Finalize Zod validation promise handling
          })
          .catch((err) => {
            console.error("Zod schema load error:", err);
            alert("Erro interno ao carregar validador de arquivo.");
          });
      } catch (err) {
        alert(
          "Erro crítico ao processar o backup. O arquivo pode estar corrompido.",
        );
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  interface LessonGroup {
    id: string;
    turmaId: string;
    subjectId: string;
    teacherId: string;
    isLab: boolean;
    allowedRooms: string[];
    shift: "manha" | "tarde" | "noite";
    size: number;
  }

  const getActiveSubstitution = (
    dayId: string,
    actualPeriod: number,
    slotTeacherId: string,
  ) => {
    return substitutions.find((sub) => {
      if (slotTeacherId === sub.absentTeacherId && sub.date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(sub.date + "T00:00:00");
        const end = sub.endDate
          ? new Date(sub.endDate + "T23:59:59")
          : new Date(sub.date + "T23:59:59");

        if (today > end) return false;

        let isDayCovered = false;
        const diffDays = Math.floor(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 7) {
          isDayCovered = true;
        } else {
          const map: Record<number, string> = {
            1: "seg",
            2: "ter",
            3: "qua",
            4: "qui",
            5: "sex",
          };
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (map[d.getDay()] === dayId) {
              isDayCovered = true;
              break;
            }
          }
        }

        if (isDayCovered) {
          if (sub.periods && sub.periods.length > 0) {
            return sub.periods.includes(actualPeriod);
          }
          return true;
        }
      }
      return false;
    });
  };

  const getSubjectWorkloadsForTurma = (S: Subject, TId: string) => {
    const T = turmas.find((t) => t.id === TId);
    if (!T || T.isRoom)
      return { workload: 0, classWorkload: 0, labWorkload: 0 };

    const subjectNameLower = S.name.toLowerCase().trim();
    const turmaNameUpper = T.name.toUpperCase().replace(/\s+/g, "");

    // Level detection: Ensino Fundamental vs. Ensino Médio
    // Standard Brazilian Fundamental II classes: 6º, 7º, 8º, 9º
    const isFundamental =
      /\b(6|7|8|9)\b|\b(6|7|8|9)º/i.test(T.name) ||
      T.name.toLowerCase().includes("fundamental") ||
      T.name.toLowerCase().includes("6º") ||
      T.name.toLowerCase().includes("7º") ||
      T.name.toLowerCase().includes("8º") ||
      T.name.toLowerCase().includes("9º");

    // High School (Ensino Médio) groups standardly: 1º, 2º, 3º of secondary education
    const isMedio =
      (/\b(1|2|3)\b|\b(1|2|3)º|\b(1|2|3)ª/i.test(T.name) ||
        T.name.toLowerCase().includes("médio") ||
        T.name.toLowerCase().includes("medio") ||
        T.name.toLowerCase().includes("e.m.") ||
        T.name.toLowerCase().includes("em")) &&
      !isFundamental;

    // --- DYNAMIC/CONFIGURABLE CONSTRAINTS ---

    // 0. EXPLICIT CUSTOM WORKLOAD CHECK (Highest Priority)
    if (S.customWorkloads && S.customWorkloads[TId] !== undefined) {
      const w = S.customWorkloads[TId];
      if (w >= 0) {
        let labW = S.labWorkload ?? 0;
        if (labW > w) labW = w;
        let classW = Math.max(0, w - labW);
        return { workload: w, classWorkload: classW, labWorkload: labW };
      }
    }

    // 1. Direct whitelist of specific Turmas (if populated)
    if (S.allowedTurmaIds && S.allowedTurmaIds.length > 0) {
      if (!S.allowedTurmaIds.includes(TId)) {
        // Bypass for 6th grade redação and leitura
        const is6thGrade = T.name.includes("6") || T.name.includes("6º");
        const isRedacaoLeitura =
          subjectNameLower.includes("redação") ||
          subjectNameLower.includes("redacao") ||
          subjectNameLower.includes("leitura");
        if (!(isFundamental && is6thGrade && isRedacaoLeitura)) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // 2. School Level Constraint (Fundamental vs. Médio vs. Técnico)
    if (S.levelConstraint && S.levelConstraint !== "ambos") {
      if (S.levelConstraint === "fundamental" && !isFundamental) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
      if (
        (S.levelConstraint === "medio" || S.levelConstraint === "tecnico") &&
        !isMedio
      ) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
    } else {
      // Fallback rule for standard unconfigured legacy courses: Filosofia and Sociologia are ONLY for Ensino Médio
      if (
        subjectNameLower.includes("filosofia") ||
        subjectNameLower.includes("sociologia")
      ) {
        if (
          isFundamental ||
          (!isMedio && T.name.startsWith("6")) ||
          T.name.startsWith("7") ||
          T.name.startsWith("8") ||
          T.name.startsWith("9")
        ) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // 3. Series / Grade Constraint (e.g. "6", "6º", "1º")
    if (S.gradeConstraint && S.gradeConstraint.trim()) {
      const terms = S.gradeConstraint
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean);
      if (terms.length > 0) {
        const normTName = normalizeTurmaName(T.name);
        const hasMatch = terms.some((term) => {
          const normTerm = normalizeTurmaName(term);
          return normTName.includes(normTerm);
        });
        if (!hasMatch) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    } else {
      // Fallback rule for standard unconfigured legacy courses: Ensino Religioso / Religião is strictly for 6º Ano only
      if (
        subjectNameLower.includes("ensino religioso") ||
        subjectNameLower.includes("religioso") ||
        subjectNameLower.includes("religião") ||
        subjectNameLower.includes("religiao")
      ) {
        const is6th = T.name.includes("6") || T.name.includes("6º");
        if (!is6th) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    }

    // 4. Class Suffix Constraint (e.g. "B", "A", "Integral")
    if (S.suffixConstraint && S.suffixConstraint.trim()) {
      const terms = S.suffixConstraint
        .split(",")
        .map((term) => term.trim().toUpperCase())
        .filter(Boolean);
      if (terms.length > 0) {
        const upperTName = T.name.toUpperCase();
        const hasMatch = terms.some((term) => {
          if (upperTName.endsWith(term)) return true;
          if (upperTName.replace(/\s+/g, "").endsWith(term.replace(/\s+/g, "")))
            return true;
          return upperTName.includes(term);
        });
        if (!hasMatch) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }
    } else {
      // Fallback rule for technical courses: Technical subjects are strictly for specialized classes if not explicitly overridden
      const isTechnicalSubject =
        S.isTechnical ||
        (techCourseName.trim() &&
          subjectNameLower.includes(techCourseName.toLowerCase().trim())) ||
        subjectNameLower.includes("marketing") ||
        subjectNameLower.includes("análise de mercado") ||
        subjectNameLower.includes("analise de mercado") ||
        subjectNameLower.includes("mkt") ||
        subjectNameLower.includes("vendas") ||
        S.id === "sub-anmerc" ||
        S.id === "sub-mktcont" ||
        S.id === "sub-tecdigmak" ||
        S.id === "sub-tecdigmark" ||
        S.id === "sub-segmark" ||
        S.id === "sub-tecvend";

      if (isTechnicalSubject) {
        let isAllowed = false;
        if (T.isTechnical !== undefined) {
          isAllowed = T.isTechnical;
        } else {
          // Backward-compatible check if isTechnical is not set yet
          const isAllowedTechnicalTurma =
            /1.*B/i.test(turmaNameUpper) ||
            /2.*B/i.test(turmaNameUpper) ||
            /3.*B/i.test(turmaNameUpper) ||
            turmaNameUpper.includes("1B") ||
            turmaNameUpper.includes("2B") ||
            turmaNameUpper.includes("3B");
          isAllowed = isAllowedTechnicalTurma;
        }

        const hasExplicitConfig =
          S.customWorkloads?.[TId] !== undefined && S.customWorkloads[TId] > 0;

        if (!isAllowed && !hasExplicitConfig) {
          return { workload: 0, classWorkload: 0, labWorkload: 0 };
        }
      }

      if (
        subjectNameLower.includes("história do paraná") ||
        subjectNameLower.includes("historia do parana")
      ) {
        return { workload: 0, classWorkload: 0, labWorkload: 0 };
      }
    }

    // Identify universal subjects to bypass certain checks
    const universalSubjects = [
      "matemática",
      "matematica",
      "português",
      "portugues",
      "língua portuguesa",
      "lingua portuguesa",
      "portugués",
      "história",
      "historia",
      "geografia",
      "ciências",
      "ciencias",
      "biologia",
      "física",
      "fisica",
      "química",
      "quimica",
      "educação física",
      "educacao fisica",
      "arte",
      "artes",
      "inglês",
      "ingles",
      "língua inglesa",
      "lingua inglesa",
      "espanhol",
    ];

    const isUniversal = universalSubjects.some((u) =>
      subjectNameLower.includes(u),
    );
    const custom = S.customWorkloads?.[TId];

    let defaultWorkload = S.workload;
    if (
      isFundamental &&
      S.workloadFundamental !== undefined &&
      S.workloadFundamental > 0
    ) {
      defaultWorkload = S.workloadFundamental;
    } else if (
      isMedio &&
      S.workloadMedio !== undefined &&
      S.workloadMedio > 0
    ) {
      defaultWorkload = S.workloadMedio;
    }

    const workload = custom ?? defaultWorkload;

    let finalClassWorkload = S.classWorkload ?? 0;

    // Proportional down-scale for lab workload if workload changed
    let labWorkload = S.labWorkload ?? 0;

    if (labWorkload > workload) {
      labWorkload = workload;
    }

    let classWorkload = Math.max(0, workload - labWorkload);

    return { workload, classWorkload, labWorkload };
  };

  const getCompatibleSpecialRooms = (S: Subject, allRooms: Turma[]) => {
    const roomIds = new Set<string>();
    if (S.roomIds) {
      S.roomIds.forEach((id) => roomIds.add(id));
    }
    if (S.useLabComp) roomIds.add(ID_LAB_INFO_COMP);
    if (S.useLabTab) roomIds.add(ID_LAB_INFO_TAB);
    if (S.useSalaMat) roomIds.add(ID_SALA_MAT);

    return allRooms
      .filter((r) => r.isRoom && roomIds.has(r.id))
      .map((r) => r.id);
  };

  const isTeacherEligibleForSubjectInTurma = (
    t: Teacher,
    SId: string,
    TId: string,
  ) => {
    const teachesSubject = t.subjectIds && t.subjectIds.includes(SId);
    if (!teachesSubject) return false;

    // Se houver mapeamento específico por disciplina para esse professor
    if (
      t.subjectTurmaMap &&
      t.subjectTurmaMap[SId] &&
      t.subjectTurmaMap[SId].length > 0
    ) {
      return t.subjectTurmaMap[SId].includes(TId);
    }

    const teachesTurma =
      !t.turmaIds || t.turmaIds.length === 0 || t.turmaIds.includes(TId);
    return teachesTurma;
  };

  const getEligibleTeachers = (
    SId: string,
    TId: string,
    allTeachers: Teacher[],
  ) => {
    return allTeachers.filter((t) =>
      isTeacherEligibleForSubjectInTurma(t, SId, TId),
    );
  };

  // INTEGRAÇÃO COM BACKEND SOLVER SUBSTITUIDA POR VERSÃO CLIENT-SIDE
  const runSolverBackend = async (payload: any) => {
    setIsLoading(true);
    try {
      // Usa o solver client-side importado (executa no próprio navegador)
      const data: any = await runSolverClient(payload);
      console.log("Dados do solver gerados localmente:", data);

      return data;
    } catch (error) {
      console.error("Erro na geração de horários client-side:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const runAutoScheduling = async (
    overrideMode?: "empty" | "all" | "shuffle",
    overrideShift?: "both" | "manha" | "tarde" | "noite" | "labs",
    overrideTurmaId?: string | string[],
  ) => {
    // 1. Inicia o Loading Visual (Skeleton) realçando feedback para o usuário
    setIsLoading(true);
    // Para manter retrocompatibilidade com modais antigos de loading (opcional)
    setIsGenerating(true);

    const effectiveMode = overrideMode || autoGenMode;
    const effectiveShift = overrideShift || autoGenShift;

    // Precalculate workloads based on UI's constraint evaluations
    const subjectsForSolver = subjects.map((s) => {
      const solverCustomWorkloads: Record<string, number> = {};
      turmas.forEach((t) => {
        solverCustomWorkloads[t.id] = getSubjectWorkloadsForTurma(
          s,
          t.id,
        ).workload;
      });
      return {
        ...s,
        customWorkloads: solverCustomWorkloads,
      };
    });

    // Tenta invocar a API de Backend
    const backendData = await runSolverBackend({
      mode: effectiveMode,
      shift: effectiveShift,
      overrideTurmaId,
      turmasArray: turmas,
      teachersArray: teachers,
      subjectsArray: subjectsForSolver,
      schedules,
      enableNoiteAsynchronous,
      enableNoite,
      disableDoubleClassesGlobally,
      autoGenForceConflicts,
    });

    if (backendData && backendData.success) {
      setSchedules(backendData.computedSchedules);
      setAutoGenResults({
        solved: backendData.solved,
        scannedCount: backendData.scannedCount,
        placedCount: backendData.placedCount,
        pending: backendData.pending || [],
        errors: backendData.errors || [],
      });
      setIsAutoGenerateModalOpen(false);
      setIsAutoGenerateResultsModalOpen(true);
      setIsAutoGenerateResultsMinimized(false);
    } else {
      alert(
        "Houve um problema ao conectar com a API de geração ou ocorreu uma falha no processamento pesado.",
      );
    }

    setIsGenerating(false);
    setIsLoading(false);
    setIsSaved(false);
  };

  const handleSave = async () => {
    localStorage.setItem("cecm_teachers", JSON.stringify(teachers));
    localStorage.setItem("cecm_subjects", JSON.stringify(subjects));
    localStorage.setItem("cecm_turmas", JSON.stringify(turmas));
    localStorage.setItem("cecm_schedules", JSON.stringify(schedules));
    localStorage.setItem("cecm_logo_url", logoUrl);
    localStorage.setItem("cecm_school_name", schoolName);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleAvailabilityDay = (dayId: string, periods: number[]) => {
    const slots = periods.map((p) => `${dayId}-${p}`);
    const allSelected = slots.every((s) =>
      newTeacherUnavailability.includes(s),
    );
    if (allSelected) {
      setNewTeacherUnavailability((prev) =>
        prev.filter((s) => !slots.includes(s)),
      );
    } else {
      setNewTeacherUnavailability((prev) => {
        const next = [...prev];
        slots.forEach((s) => {
          if (!next.includes(s)) next.push(s);
        });
        return next;
      });
    }
  };

  const toggleAvailabilityPeriod = (period: number) => {
    const slots = DAYS.map((d) => `${d.id}-${period}`);
    const allSelected = slots.every((s) =>
      newTeacherUnavailability.includes(s),
    );
    if (allSelected) {
      setNewTeacherUnavailability((prev) =>
        prev.filter((s) => !slots.includes(s)),
      );
    } else {
      setNewTeacherUnavailability((prev) => {
        const next = [...prev];
        slots.forEach((s) => {
          if (!next.includes(s)) next.push(s);
        });
        return next;
      });
    }
  };

  const startAvailabilityPainting = (slotId: string) => {
    const isCurrentlySelected = newTeacherUnavailability.includes(slotId);
    if (isCurrentlySelected) {
      setPaintingMode("disable");
      setNewTeacherUnavailability((prev) => prev.filter((s) => s !== slotId));
    } else {
      setPaintingMode("enable");
      setNewTeacherUnavailability((prev) => [...prev, slotId]);
    }
  };

  const handleAvailabilityMouseEnter = (slotId: string) => {
    if (!paintingMode) return;
    const isCurrentlySelected = newTeacherUnavailability.includes(slotId);
    if (paintingMode === "enable" && !isCurrentlySelected) {
      setNewTeacherUnavailability((prev) => [...prev, slotId]);
    } else if (paintingMode === "disable" && isCurrentlySelected) {
      setNewTeacherUnavailability((prev) => prev.filter((s) => s !== slotId));
    }
  };

  const addTeacher = () => {
    if (!newTeacherName.trim()) {
      alert("Por favor, insira o nome do professor");
      return;
    }

    // Validação de duplicidade de nome
    const nameExists = teachers.some(
      (t) =>
        normalizeGenericName(t.name) === normalizeGenericName(newTeacherName) &&
        t.id !== editingTeacherId,
    );

    if (nameExists) {
      alert(
        `Erro: Já existe um professor cadastrado com o nome "${newTeacherName.trim()}".`,
      );
      return;
    }

    const schoolWorkloadVal = newTeacherSchoolWorkload
      ? parseInt(newTeacherSchoolWorkload, 10)
      : undefined;
    const schoolWorkloadManhaVal = newTeacherSchoolWorkloadManha
      ? parseInt(newTeacherSchoolWorkloadManha, 10)
      : undefined;
    const schoolWorkloadTardeVal = newTeacherSchoolWorkloadTarde
      ? parseInt(newTeacherSchoolWorkloadTarde, 10)
      : undefined;
    const schoolWorkloadNoiteVal = newTeacherSchoolWorkloadNoite
      ? parseInt(newTeacherSchoolWorkloadNoite, 10)
      : undefined;

    // Validação da carga horária por período (Manhã + Tarde + Noite) não superando o Total Geral
    const totalWL = schoolWorkloadVal || 0;
    const manhaWL = schoolWorkloadManhaVal || 0;
    const tardeWL = schoolWorkloadTardeVal || 0;
    const noiteWL = enableNoite ? (schoolWorkloadNoiteVal || 0) : 0;

    if (totalWL > 0 && (manhaWL + tardeWL + noiteWL) > totalWL) {
      alert(`Erro: A soma das aulas da Manhã (${manhaWL}), Tarde (${tardeWL})` + (enableNoite ? ` e Noite (${noiteWL})` : "") + ` é ${manhaWL + tardeWL + noiteWL} aulas, o que supera o total geral contratado de ${totalWL} aulas. Por favor, ajuste.`);
      return;
    }

    if (editingTeacherId) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingTeacherId
            ? {
                ...t,
                name: newTeacherName,
                subjectIds: newTeacherSubjectIds,
                unavailability: newTeacherUnavailability,
                preferDoubleClasses: newTeacherPreferDouble,
                requireShiftInterval: newTeacherRequireShiftInterval,
                turmaIds: newTeacherTurmaIds,
                subjectTurmaMap: newTeacherSubjectTurmaMap,
                schoolWorkload: schoolWorkloadVal,
                schoolWorkloadManha: schoolWorkloadManhaVal,
                schoolWorkloadTarde: schoolWorkloadTardeVal,
                schoolWorkloadNoite: schoolWorkloadNoiteVal,
              }
            : t,
        ),
      );
      setEditingTeacherId(null);
    } else {
      const newTeacher: Teacher = {
        id: generateId(),
        name: newTeacherName,
        subjectIds: newTeacherSubjectIds,
        unavailability: newTeacherUnavailability,
        preferDoubleClasses: newTeacherPreferDouble,
        requireShiftInterval: newTeacherRequireShiftInterval,
        turmaIds: newTeacherTurmaIds,
        subjectTurmaMap: newTeacherSubjectTurmaMap,
        schoolWorkload: schoolWorkloadVal,
        schoolWorkloadManha: schoolWorkloadManhaVal,
        schoolWorkloadTarde: schoolWorkloadTardeVal,
        schoolWorkloadNoite: schoolWorkloadNoiteVal,
      };
      setTeachers([...teachers, newTeacher]);
    }

    setNewTeacherName("");
    setNewTeacherSubjectIds([]);
    setNewTeacherUnavailability([]);
    setNewTeacherPreferDouble(false);
    setNewTeacherRequireShiftInterval(false);
    setNewTeacherTurmaIds([]);
    setNewTeacherSubjectTurmaMap({});
    setNewTeacherSchoolWorkload("");
    setNewTeacherSchoolWorkloadManha("");
    setNewTeacherSchoolWorkloadTarde("");
    setNewTeacherSchoolWorkloadNoite("");
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setNewTeacherName(teacher.name);
    setNewTeacherSubjectIds(teacher.subjectIds || []);

    if (teacher.unavailability) {
      setNewTeacherUnavailability(teacher.unavailability);
    } else if (teacher.availability && teacher.availability.length > 0) {
      // Rotate logic from positive to negative
      const allSlots: string[] = [];
      DAYS.forEach((d) => {
        PERIODS_MANHA.forEach((p) => allSlots.push(`${d.id}-${p}`));
        PERIODS_TARDE.forEach((p) => allSlots.push(`${d.id}-${p}`));
        PERIODS_NOITE.forEach((p) => allSlots.push(`${d.id}-${p}`));
      });
      setNewTeacherUnavailability(
        allSlots.filter((s) => !teacher.availability!.includes(s)),
      );
    } else {
      setNewTeacherUnavailability([]);
    }

    setNewTeacherPreferDouble(teacher.preferDoubleClasses || false);
    setNewTeacherRequireShiftInterval(teacher.requireShiftInterval || false);
    setNewTeacherTurmaIds(teacher.turmaIds || []);
    setNewTeacherSubjectTurmaMap(teacher.subjectTurmaMap || {});
    setNewTeacherSchoolWorkload(teacher.schoolWorkload?.toString() || "");
    setNewTeacherSchoolWorkloadManha(
      teacher.schoolWorkloadManha?.toString() || "",
    );
    setNewTeacherSchoolWorkloadTarde(
      teacher.schoolWorkloadTarde?.toString() || "",
    );
    setNewTeacherSchoolWorkloadNoite(
      teacher.schoolWorkloadNoite?.toString() || "",
    );
  };

  const processMassImport = () => {
    if (!csvData.trim()) return;

    const lines = csvData.split("\n");
    const newTeachers: Teacher[] = [];
    const newSubjects: Subject[] = [...subjects]; // copy existing
    let addedTeachers = 0;
    let addedSubjects = 0;

    lines.forEach((line) => {
      const parts =
        line.split("\t").length > 1 ? line.split("\t") : line.split(";"); // Try tab, then semicolon
      if (parts.length >= 2) {
        const tName = parts[0].trim();
        if (!tName || tName.toLowerCase() === "nome") return; // Skip empty or header

        const subjectsStr = parts[1].trim();
        const tSubjects = subjectsStr
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s);

        const teacherSubjectIds: string[] = [];

        tSubjects.forEach((sName) => {
          let foundSub = newSubjects.find(
            (s) => normalizeGenericName(s.name) === normalizeGenericName(sName),
          );
          if (!foundSub) {
            foundSub = {
              id: generateId(),
              name: sName,
              workload: 2, // default workload
              classWorkload: 2,
              preferDoubleClasses: true, // Usually classes >= 2
            };
            newSubjects.push(foundSub);
            addedSubjects++;
          }
          if (!teacherSubjectIds.includes(foundSub.id)) {
            teacherSubjectIds.push(foundSub.id);
          }
        });

        // Add teacher
        const existingTeacher = teachers.find(
          (t) => normalizeGenericName(t.name) === normalizeGenericName(tName),
        );
        if (
          !existingTeacher &&
          !newTeachers.find(
            (t) => normalizeGenericName(t.name) === normalizeGenericName(tName),
          )
        ) {
          newTeachers.push({
            id: generateId(),
            name: tName,
            subjectIds: teacherSubjectIds,
            unavailability: [],
            preferDoubleClasses: true,
          });
          addedTeachers++;
        }
      }
    });

    if (addedSubjects > 0) {
      setSubjects(newSubjects);
    }
    if (addedTeachers > 0) {
      setTeachers((prev) => [...prev, ...newTeachers]);
    }

    alert(
      `Importação concluída: ${addedTeachers} professores e ${addedSubjects} disciplinas novas cadastrados.`,
    );
    setShowMassImportModal(false);
    setCsvData("");
  };

  const addSubject = () => {
    if (!newSubjectName.trim()) {
      alert("Por favor, insira o nome da disciplina");
      return;
    }

    // Validação de duplicidade de nome
    const nameExists = subjects.some(
      (s) =>
        normalizeGenericName(s.name) === normalizeGenericName(newSubjectName) &&
        s.id !== editingSubjectId,
    );

    if (nameExists) {
      alert(
        `Erro: Já existe uma disciplina cadastrada com o nome "${newSubjectName.trim()}".`,
      );
      return;
    }

    // Validação: Carga em sala + Carga em Lab/Especial não pode ser maior que Carga Total
    if (newSubjectClassWorkload + newSubjectLabWorkload > newSubjectWorkload) {
      alert(
        `Erro: A soma das aulas em sala (${newSubjectClassWorkload}) e aulas em laboratório/especial (${newSubjectLabWorkload}) não pode ser maior que a carga horária total da disciplina (${newSubjectWorkload}).`,
      );
      return;
    }

    // No validation needed for flat customWorkloads numeric mapping

    const subjectData = {
      name: newSubjectName,
      color: newSubjectColor,
      workload: newSubjectWorkload || 1,
      workloadFundamental:
        newSubjectWorkloadFundamental === ""
          ? undefined
          : newSubjectWorkloadFundamental,
      workloadMedio:
        newSubjectWorkloadMedio === "" ? undefined : newSubjectWorkloadMedio,
      isTechnical: newSubjectIsTechnical,
      useLabComp: newSubjectUseLabComp,
      useLabTab: newSubjectUseLabTab,
      useSalaMat: newSubjectUseSalaMat,
      roomIds: newSubjectRoomIds,
      labWorkload: newSubjectLabWorkload,
      classWorkload: newSubjectClassWorkload,
      preferDoubleClasses: newSubjectPreferDouble,
      customWorkloads: newSubjectCustomWorkloads,
      levelConstraint: newSubjectLevelConstraint,
      gradeConstraint: newSubjectGradeConstraint,
      suffixConstraint: newSubjectSuffixConstraint,
      allowedTurmaIds: newSubjectAllowedTurmaIds,
    };

    if (editingSubjectId) {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubjectId ? { ...s, ...subjectData } : s,
        ),
      );
      setEditingSubjectId(null);
    } else {
      const newSubject = {
        id: generateId(),
        ...subjectData,
      };
      setSubjects([...subjects, newSubject]);
    }

    setNewSubjectName("");
    setNewSubjectColor(generateDistinctColor(subjects));
    setNewSubjectWorkload(2);
    setNewSubjectWorkloadFundamental("");
    setNewSubjectWorkloadMedio("");
    setNewSubjectIsTechnical(false);
    setNewSubjectUseLabComp(false);
    setNewSubjectUseLabTab(false);
    setNewSubjectUseSalaMat(false);
    setNewSubjectRoomIds([]);
    setNewSubjectLabWorkload(0);
    setNewSubjectClassWorkload(0);
    setNewSubjectLevelConstraint("ambos");
    setNewSubjectGradeConstraint("");
    setNewSubjectSuffixConstraint("");
    setNewSubjectAllowedTurmaIds([]);
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setNewSubjectName(subject.name);
    setNewSubjectColor(
      subject.color &&
        subject.color !== "#cbd5e1" &&
        subject.color !== "#94a3b8"
        ? subject.color
        : getDeterministicColor(subject.id),
    );
    setNewSubjectWorkload(subject.workload);
    setNewSubjectWorkloadFundamental(subject.workloadFundamental ?? "");
    setNewSubjectWorkloadMedio(subject.workloadMedio ?? "");
    setNewSubjectIsTechnical(subject.isTechnical || false);
    setNewSubjectUseLabComp(subject.useLabComp || false);
    setNewSubjectUseLabTab(subject.useLabTab || false);
    setNewSubjectUseSalaMat(subject.useSalaMat || false);
    setNewSubjectRoomIds(subject.roomIds || []);
    setNewSubjectLabWorkload(subject.labWorkload || 0);
    setNewSubjectClassWorkload(subject.classWorkload || 0);
    setNewSubjectPreferDouble(subject.preferDoubleClasses || false);
    setNewSubjectCustomWorkloads(subject.customWorkloads || {});
    setNewSubjectLevelConstraint(subject.levelConstraint || "ambos");
    setNewSubjectGradeConstraint(subject.gradeConstraint || "");
    setNewSubjectSuffixConstraint(subject.suffixConstraint || "");
    setNewSubjectAllowedTurmaIds(subject.allowedTurmaIds || []);
  };

  const removeTeacher = (id: string) => {
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  const addRoom = () => {
    if (!newRoomName.trim()) {
      alert("Por favor, insira o nome da sala especial");
      return;
    }

    const roomNameTrimmed = newRoomName.trim();
    // Validação de duplicidade de nome de sala especial
    const roomExists = turmas.some(
      (t) =>
        t.isRoom &&
        normalizeGenericName(t.name) === normalizeGenericName(roomNameTrimmed),
    );

    if (roomExists) {
      alert(
        `Erro: Já existe uma sala especial cadastrada com o nome "${roomNameTrimmed}".`,
      );
      return;
    }

    const newRoom: Turma = {
      id: generateId(),
      name: roomNameTrimmed.toUpperCase(),
      shift: "ambos",
      isRoom: true,
      color: newRoomColor,
      icon: newRoomIcon,
    };
    setTurmas([...turmas, newRoom]);
    setNewRoomName("");
    setNewRoomIcon("DoorClosed");
  };

  const handleToggleDisableDoubleClassesGlobally = (val: boolean) => {
    setDisableDoubleClassesGlobally(val);
    localStorage.setItem(
      "disable_double_classes_globally",
      val ? "true" : "false",
    );
  };

  const removeTurma = (id: string) => {
    setTurmas((prev) => prev.filter((t) => t.id !== id));
    setSchedules((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedTurmaId === id) setSelectedTurmaId("");
  };

  const addTurma = () => {
    if (!newTurmaName.trim()) {
      alert("Por favor, insira o nome da turma");
      return;
    }

    const formattedName = formatTurmaName(newTurmaName);

    // Validação de duplicidade de nome (normalizado para evitar variações ordinárias e espaços)
    const nameExists = turmas.some(
      (t) =>
        !t.isRoom &&
        normalizeTurmaName(t.name) === normalizeTurmaName(formattedName) &&
        t.id !== editingTurmaId,
    );

    if (nameExists) {
      alert(
        `Erro: Já existe uma turma cadastrada com o nome "${formattedName}".`,
      );
      return;
    }

    if (editingTurmaId) {
      const oldTurma = turmas.find((t) => t.id === editingTurmaId);
      const concreteShift =
        newTurmaShift === "todas"
          ? oldTurma?.shift || importShift
          : newTurmaShift;
      const shiftChanged = oldTurma && oldTurma.shift !== concreteShift;

      setTurmas((prev) =>
        prev.map((t) =>
          t.id === editingTurmaId
            ? {
                ...t,
                name: formattedName,
                shift: concreteShift,
                dailyClassCount: newTurmaDailyClassCount,
                isTechnical: newTurmaIsTechnical,
                isCCM: newTurmaIsCCM,
              }
            : t,
        ),
      );

      if (shiftChanged) {
        setSchedules((prev) => {
          const next = { ...prev };
          if (next[editingTurmaId]) {
            next[editingTurmaId] = remapScheduleIfNecessary(
              {
                id: editingTurmaId,
                name: formattedName,
                shift: concreteShift,
                dailyClassCount: newTurmaDailyClassCount,
                isTechnical: newTurmaIsTechnical,
                isCCM: newTurmaIsCCM,
              },
              next[editingTurmaId],
              turmas,
            );
          }
          return next;
        });
      }

      // Se a turma foi alterada para ter 5 aulas/dia, limpa qualquer alocação residual no 6º período de cada dia
      if (newTurmaDailyClassCount === 5) {
        setSchedules((prev) => {
          const next = { ...prev };
          if (next[editingTurmaId]) {
            const copy = { ...next[editingTurmaId] };
            const periodsToRemove =
              concreteShift === "noite"
                ? [18]
                : concreteShift === "tarde"
                  ? [12]
                  : [6];
            DAYS.forEach((day) => {
              periodsToRemove.forEach((p) => {
                delete copy[`${day.id}-${p}`];
              });
            });
            next[editingTurmaId] = copy;
          }
          return next;
        });
      }

      setEditingTurmaId(null);
    } else {
      const concreteShift =
        newTurmaShift === "todas" ? importShift : newTurmaShift;
      const newTurma: Turma = {
        id: generateId(),
        name: formattedName,
        shift: concreteShift,
        dailyClassCount: newTurmaDailyClassCount,
        isTechnical: newTurmaIsTechnical,
                isCCM: newTurmaIsCCM,
      };
      setTurmas([...turmas, newTurma]);
      if (!selectedTurmaId) setSelectedTurmaId(newTurma.id);

      // Desafio 1: Automatizar a inserção da Matriz Curricular (SEED-PR 2026) dependendo do perfil da escola e nível da turma
      const isCCM = isCivicoMilitar;
      const isEF =
        /(?:^|\D)(?:6|7|8|9)(?:\D|$)|(?:sexto|sétimo|oitavo|nono)|fundamental/i.test(
          formattedName,
        );

      const targetWorkloads: Record<string, number> = {};

      if (isEF) {
        if (isCCM) {
          Object.assign(targetWorkloads, {
            "sub-port": 5,
            "sub-mat": 5,
            "sub-cien": 4,
            "sub-his": 3,
            "sub-geo": 3,
            "sub-ing": 2,
            "sub-art": 2,
            "sub-ef": 2,
            "sub-ensr": 1,
            "sub-cid": 2,
            "sub-edfin": 1,
          });
        } else {
          Object.assign(targetWorkloads, {
            "sub-port": 4,
            "sub-mat": 4,
            "sub-cien": 3,
            "sub-his": 3,
            "sub-geo": 3,
            "sub-robot": 2,
            "sub-ef": 2,
            "sub-ing": 2,
            "sub-art": 2,
            "sub-cid": 2,
            "sub-edfin": 2,
            "sub-ensr": 1,
          });
        }
      } else {
        if (isCCM) {
          Object.assign(targetWorkloads, {
            "sub-port": 4,
            "sub-mat": 4,
            "sub-bio": 2,
            "sub-fis": 2,
            "sub-quim": 2,
            "sub-his": 2,
            "sub-geo": 2,
            "sub-ing": 2,
            "sub-art": 1,
            "sub-ef": 1,
            "sub-fil": 1,
            "sub-soc": 1,
            "sub-cid": 2,
            "sub-eddigc": 2,
            "sub-edfin": 1,
            "sub-pvida": 1,
          });
        } else {
          Object.assign(targetWorkloads, {
            "sub-port": 4,
            "sub-mat": 4,
            "sub-bio": 2,
            "sub-fis": 2,
            "sub-quim": 2,
            "sub-his": 2,
            "sub-geo": 2,
            "sub-eddigc": 2,
            "sub-edfin": 0,
            "sub-ing": 2,
            "sub-ef": 2,
            "sub-art": 1,
            "sub-fil": 1,
            "sub-soc": 1,
            "sub-pvida": 1,
            "sub-cid": 2,
          });
        }
      }

      setSubjects((prev) =>
        prev.map((s) => {
          const canonicalKey = getSubjectCanonicalIdKey(s.name) || s.id;
          let work = targetWorkloads[canonicalKey];
          if (work !== undefined) {
            return {
              ...s,
              allowedTurmaIds: s.allowedTurmaIds
                ? Array.from(new Set([...s.allowedTurmaIds, newTurma.id]))
                : [newTurma.id],
              customWorkloads: {
                ...(s.customWorkloads || {}),
                [newTurma.id]: work,
              },
            };
          }
          return s;
        }),
      );
    }

    setNewTurmaName("");
    setNewTurmaDailyClassCount(isCivicoMilitar ? 6 : 5);
    setNewTurmaIsTechnical(false);
    setNewTurmaIsCCM(false);
  };

  const startEditTurma = (turma: Turma) => {
    setEditingTurmaId(turma.id);
    setNewTurmaName(turma.name);
    setNewTurmaShift(turma.shift || importShift); // Use active shift as default
    setNewTurmaDailyClassCount(turma.dailyClassCount || (isCivicoMilitar ? 6 : 5));
    setNewTurmaIsTechnical(!!turma.isTechnical);
    setNewTurmaIsCCM(!!turma.isCCM);
  };

  const [showAllSubjectsInRoom, setShowAllSubjectsInRoom] = useState(false);

  const getConsecutiveSlotLabel = (slot: string) => {
    const [day, periodStr] = slot.split("-");
    const period = parseInt(periodStr);
    const dayLabel = DAYS.find((d) => d.id === day)?.label || day;

    let consecPeriod: number | null = null;
    let type: "next" | "prev" = "next";
    if (period >= 1 && period <= 6) {
      if (period < 6) {
        consecPeriod = period + 1;
        type = "next";
      } else {
        consecPeriod = 5;
        type = "prev";
      }
    } else if (period >= 7 && period <= 12) {
      if (period < 12) {
        consecPeriod = period + 1;
        type = "next";
      } else {
        consecPeriod = 11;
        type = "prev";
      }
    } else if (period >= 13 && period <= 17) {
      if (period < 17) {
        consecPeriod = period + 1;
        type = "next";
      } else {
        consecPeriod = 16;
        type = "prev";
      }
    }

    if (!consecPeriod) return null;
    const actualConsecPeriod =
      consecPeriod > 12
        ? consecPeriod - 12
        : consecPeriod > 6
          ? consecPeriod - 6
          : consecPeriod;
    return {
      label: `${dayLabel}, ${actualConsecPeriod}º horário`,
      type,
      period: consecPeriod,
    };
  };

  const getConflictsForTest = (
    testSchedulesObj: Record<string, Record<string, any>>,
    dayId: string,
    period: number,
    teacherId: string,
    excludeTurmaId: string,
    optAssociatedTurmaId?: string,
  ) => {
    if (!teacherId) return [];
    const slotId = `${dayId}-${period}`;
    const conflicts: string[] = [];

    // Verificação de Indisponibilidade
    const teacher = teachers.find((t) => t.id === teacherId);
    if (
      teacher &&
      teacher.unavailability &&
      teacher.unavailability.length > 0
    ) {
      if (teacher.unavailability.includes(slotId)) {
        conflicts.push("INDISPONÍVEL");
      }
    } else if (
      teacher &&
      teacher.availability &&
      teacher.availability.length > 0
    ) {
      // Suporte legado
      if (!teacher.availability.includes(slotId)) {
        conflicts.push("INDISPONÍVEL");
      }
    }

    // Validação de intervalo exigido entre turnos
    if (teacher && teacher.requireShiftInterval) {
      if (period === 6) {
        const nextSlotId = `${dayId}-7`;
        const hasNextClass = Object.keys(testSchedulesObj).some(
          (tid) => testSchedulesObj[tid]?.[nextSlotId]?.teacherId === teacherId,
        );
        if (hasNextClass) {
          conflicts.push("TRANS_TURNO (1-Tarde)");
        }
      } else if (period === 7) {
        const prevSlotId = `${dayId}-6`;
        const hasPrevClass = Object.keys(testSchedulesObj).some(
          (tid) => testSchedulesObj[tid]?.[prevSlotId]?.teacherId === teacherId,
        );
        if (hasPrevClass) {
          conflicts.push("TRANS_TURNO (6-Manhã)");
        }
      } else if (period === 12) {
        const nextSlotId = `${dayId}-13`;
        const hasNextClass = Object.keys(testSchedulesObj).some(
          (tid) => testSchedulesObj[tid]?.[nextSlotId]?.teacherId === teacherId,
        );
        if (hasNextClass) {
          conflicts.push("TRANS_TURNO (1-Noite)");
        }
      } else if (period === 13) {
        const prevSlotId = `${dayId}-12`;
        const hasPrevClass = Object.keys(testSchedulesObj).some(
          (tid) => testSchedulesObj[tid]?.[prevSlotId]?.teacherId === teacherId,
        );
        if (hasPrevClass) {
          conflicts.push("TRANS_TURNO (6-Tarde)");
        }
      }
    }

    Object.entries(testSchedulesObj).forEach(([turmaId, schedule]) => {
      if (
        turmaId !== excludeTurmaId &&
        schedule[slotId]?.teacherId === teacherId
      ) {
        // Ignorar conflito se for o mesmo professor cuidando da mesma turma em sala e laboratório/sala especial ao mesmo tempo
        const currentIsRoom = turmas.find(
          (t) => t.id === excludeTurmaId,
        )?.isRoom;
        const otherIsRoom = turmas.find((t) => t.id === turmaId)?.isRoom;

        const assocClass1 = currentIsRoom
          ? optAssociatedTurmaId || tempAssociatedTurmaId
          : excludeTurmaId;
        const assocClass2 = otherIsRoom
          ? schedule[slotId]?.associatedTurmaId
          : turmaId;

        if (assocClass1 && assocClass2 && assocClass1 === assocClass2) {
          return;
        }

        const turmaName =
          turmas.find((t) => t.id === turmaId)?.name || "Outra Turma";
        conflicts.push(turmaName);
      }
    });

    return conflicts;
  };

  const validateDragAndDrop = (
    sourceTurmaId: string,
    sourceSlotId: string,
    targetTurmaId: string,
    targetSlotId: string,
  ): { isValid: boolean; error?: string } => {
    // 0. Ensure same turma context in class view
    if (viewMode === "turmas" && sourceTurmaId !== targetTurmaId) {
      return {
        isValid: false,
        error:
          "Para evitar erros nos cálculos de carga horária, não é permitido arrastar e mover aulas entre turmas diferentes. A reorganização manual só é permitida dentro da própria turma.",
      };
    }

    // 1. Retrieve slots
    const sourceSlotData = schedules[sourceTurmaId]?.[sourceSlotId];
    if (!sourceSlotData) {
      return { isValid: false, error: "Nenhuma aula no horário de origem." };
    }
    const targetSlotData = schedules[targetTurmaId]?.[targetSlotId];

    // Check room conflicts for drag-and-drop in regular class view
    if (viewMode === "turmas" && sourceSlotData.associatedRoomId) {
      const roomSched = schedules[sourceSlotData.associatedRoomId] || {};
      if (
        roomSched[targetSlotId] &&
        roomSched[targetSlotId].associatedTurmaId !== targetTurmaId
      ) {
        return {
          isValid: false,
          error:
            "O laboratório/sala especial está ocupado no horário de destino por outra turma.",
        };
      }
    }
    if (
      viewMode === "turmas" &&
      targetSlotData &&
      targetSlotData.associatedRoomId
    ) {
      const roomSched = schedules[targetSlotData.associatedRoomId] || {};
      if (
        roomSched[sourceSlotId] &&
        roomSched[sourceSlotId].associatedTurmaId !== sourceTurmaId
      ) {
        return {
          isValid: false,
          error:
            "O laboratório/sala especial está ocupado no horário de origem por outra turma.",
        };
      }
    }

    // 2. Extract day & period
    const [sourceDay, sourcePeriodStr] = sourceSlotId.split("-");
    const sourcePeriod = parseInt(sourcePeriodStr);
    const [targetDay, targetPeriodStr] = targetSlotId.split("-");
    const targetPeriod = parseInt(targetPeriodStr);

    // Validação de limite diário de aulas (5 aulas vs 6 aulas)
    const targetTurma = turmas.find((t) => t.id === targetTurmaId);
    if (targetTurma && getEffectiveDailyClassCount(targetTurma, isCivicoMilitar) === 5) {
      if (
        targetPeriod === 6 ||
        targetPeriod === 12 ||
        (targetPeriod === 18 && !enableNoiteAsynchronous)
      ) {
        return {
          isValid: false,
          error:
            "A turma ou laboratório de destino tem limite de 5 aulas neste turno.",
        };
      }
    }

    if (targetSlotData) {
      const sourceTurma = turmas.find((t) => t.id === sourceTurmaId);
      if (sourceTurma && getEffectiveDailyClassCount(sourceTurma, isCivicoMilitar) === 5) {
        if (
          sourcePeriod === 6 ||
          sourcePeriod === 12 ||
          (sourcePeriod === 18 && !enableNoiteAsynchronous)
        ) {
          return {
            isValid: false,
            error:
              "A turma ou laboratório de origem tem limite de 5 aulas neste turno.",
          };
        }
      }
    }

    // Validation for Room View: check if target room is allowed for this subject
    if (viewMode === "rooms") {
      const sourceSubject = subjects.find(
        (s) => s.id === sourceSlotData.subjectId,
      );
      if (sourceSubject) {
        const compRooms = getCompatibleSpecialRooms(sourceSubject, turmas);
        if (compRooms.length > 0 && !compRooms.includes(targetTurmaId)) {
          const roomObj = turmas.find((t) => t.id === targetTurmaId);
          return {
            isValid: false,
            error: `O laboratório/sala "${roomObj?.name || targetTurmaId}" não é compatível para a disciplina "${sourceSubject.name}".`,
          };
        }
      }

      if (targetSlotData) {
        const targetSubject = subjects.find(
          (s) => s.id === targetSlotData.subjectId,
        );
        if (targetSubject) {
          const compRooms = getCompatibleSpecialRooms(targetSubject, turmas);
          if (compRooms.length > 0 && !compRooms.includes(sourceTurmaId)) {
            const roomObj = turmas.find((t) => t.id === sourceTurmaId);
            return {
              isValid: false,
              error: `O laboratório/sala "${roomObj?.name || sourceTurmaId}" não é compatível para a disciplina "${targetSubject.name}".`,
            };
          }
        }
      }
    }

    // Checking if the regular physical classroom is already occupied in the target position (for Room view)
    if (viewMode === "rooms") {
      const sourceClassId = sourceSlotData.associatedTurmaId;
      const targetClassId = targetSlotData?.associatedTurmaId;

      if (sourceClassId) {
        const existingSlot = schedules[sourceClassId]?.[targetSlotId];
        if (existingSlot) {
          const isSwapOfSameRoomSlot =
            targetSlotData && existingSlot.associatedRoomId === targetTurmaId;
          if (!isSwapOfSameRoomSlot) {
            const classObj = turmas.find((t) => t.id === sourceClassId);
            return {
              isValid: false,
              error: `A turma "${classObj?.name || sourceClassId}" já possui outra disciplina/aula agendada no horário regular de destino (${targetDay}-${targetPeriod}).`,
            };
          }
        }
      }

      if (targetSlotData && targetClassId) {
        const existingSlotSource = schedules[targetClassId]?.[sourceSlotId];
        if (existingSlotSource) {
          const isSwapOfSameRoomSlot =
            existingSlotSource.associatedRoomId === sourceTurmaId;
          if (!isSwapOfSameRoomSlot) {
            const classObj = turmas.find((t) => t.id === targetClassId);
            return {
              isValid: false,
              error: `A turma "${classObj?.name || targetClassId}" já possui outra disciplina/aula agendada no horário regular de origem (${sourceDay}-${sourcePeriod}).`,
            };
          }
        }
      }
    }

    // 3. Test if the subject of source is in target turma's curriculum
    const sourceSubject = subjects.find(
      (s) => s.id === sourceSlotData.subjectId,
    );
    if (sourceSubject) {
      const realTargetTurmaId =
        viewMode === "rooms" ? sourceSlotData.associatedTurmaId : targetTurmaId;
      if (realTargetTurmaId) {
        const workloads = getSubjectWorkloadsForTurma(
          sourceSubject,
          realTargetTurmaId,
        );
        if (workloads.workload === 0) {
          const tName =
            turmas.find((t) => t.id === realTargetTurmaId)?.name ||
            realTargetTurmaId;
          return {
            isValid: false,
            error: `A disciplina "${sourceSubject.name}" não faz parte do currículo da turma "${tName}".`,
          };
        }
      }
    }

    // 4. Test if the teacher of source leciona in target turma
    const sourceTeacher = teachers.find(
      (t) => t.id === sourceSlotData.teacherId,
    );
    if (
      sourceTeacher &&
      sourceTeacher.turmaIds &&
      sourceTeacher.turmaIds.length > 0
    ) {
      const realTargetTurmaId =
        viewMode === "rooms" ? sourceSlotData.associatedTurmaId : targetTurmaId;
      if (
        realTargetTurmaId &&
        !sourceTeacher.turmaIds.includes(realTargetTurmaId)
      ) {
        const tName =
          turmas.find((t) => t.id === realTargetTurmaId)?.name ||
          realTargetTurmaId;
        return {
          isValid: false,
          error: `O professor ${sourceTeacher.name} não leciona para a turma ${tName}.`,
        };
      }
    }

    // 5. If swapping, test target subject & teacher in source context
    if (targetSlotData) {
      const targetSubject = subjects.find(
        (s) => s.id === targetSlotData.subjectId,
      );
      if (targetSubject) {
        const realSourceTurmaId =
          viewMode === "rooms"
            ? targetSlotData.associatedTurmaId
            : sourceTurmaId;
        if (realSourceTurmaId) {
          const workloads = getSubjectWorkloadsForTurma(
            targetSubject,
            realSourceTurmaId,
          );
          if (workloads.workload === 0) {
            const tName =
              turmas.find((t) => t.id === realSourceTurmaId)?.name ||
              realSourceTurmaId;
            return {
              isValid: false,
              error: `A disciplina "${targetSubject.name}" não faz parte do currículo da turma "${tName}".`,
            };
          }
        }
      }

      const targetTeacher = teachers.find(
        (t) => t.id === targetSlotData.teacherId,
      );
      if (
        targetTeacher &&
        targetTeacher.turmaIds &&
        targetTeacher.turmaIds.length > 0
      ) {
        const realSourceTurmaId =
          viewMode === "rooms"
            ? targetSlotData.associatedTurmaId
            : sourceTurmaId;
        if (
          realSourceTurmaId &&
          !targetTeacher.turmaIds.includes(realSourceTurmaId)
        ) {
          const tName =
            turmas.find((t) => t.id === realSourceTurmaId)?.name ||
            realSourceTurmaId;
          return {
            isValid: false,
            error: `O professor ${targetTeacher.name} não leciona para a turma ${tName}.`,
          };
        }
      }
    }

    // 6. Test conflict in a simulated schedule state of the entire school
    const nextSchedules = JSON.parse(JSON.stringify(schedules));

    if (viewMode === "rooms") {
      const sourceRoomId = sourceTurmaId;
      const targetRoomId = targetTurmaId;
      const sourceClassId = sourceSlotData.associatedTurmaId;
      const targetClassId = targetSlotData?.associatedTurmaId;

      if (!nextSchedules[targetRoomId]) nextSchedules[targetRoomId] = {};
      if (!nextSchedules[sourceRoomId]) nextSchedules[sourceRoomId] = {};

      if (targetSlotData) {
        nextSchedules[targetRoomId][targetSlotId] = { ...sourceSlotData };
        nextSchedules[sourceRoomId][sourceSlotId] = { ...targetSlotData };

        if (sourceClassId) {
          if (!nextSchedules[sourceClassId]) nextSchedules[sourceClassId] = {};
          nextSchedules[sourceClassId][targetSlotId] = {
            teacherId: sourceSlotData.teacherId,
            subjectId: sourceSlotData.subjectId,
            associatedRoomId: targetRoomId,
          };
          if (targetClassId !== sourceClassId) {
            delete nextSchedules[sourceClassId][sourceSlotId];
          }
        }
        if (targetClassId) {
          if (!nextSchedules[targetClassId]) nextSchedules[targetClassId] = {};
          nextSchedules[targetClassId][sourceSlotId] = {
            teacherId: targetSlotData.teacherId,
            subjectId: targetSlotData.subjectId,
            associatedRoomId: sourceRoomId,
          };
          if (targetClassId !== sourceClassId) {
            delete nextSchedules[targetClassId][targetSlotId];
          }
        }
      } else {
        nextSchedules[targetRoomId][targetSlotId] = { ...sourceSlotData };
        delete nextSchedules[sourceRoomId][sourceSlotId];

        if (sourceClassId) {
          if (!nextSchedules[sourceClassId]) nextSchedules[sourceClassId] = {};
          nextSchedules[sourceClassId][targetSlotId] = {
            teacherId: sourceSlotData.teacherId,
            subjectId: sourceSlotData.subjectId,
            associatedRoomId: targetRoomId,
          };
          delete nextSchedules[sourceClassId][sourceSlotId];
        }
      }
    } else {
      if (!nextSchedules[targetTurmaId]) nextSchedules[targetTurmaId] = {};
      if (!nextSchedules[sourceTurmaId]) nextSchedules[sourceTurmaId] = {};

      if (targetSlotData) {
        nextSchedules[targetTurmaId][targetSlotId] = sourceSlotData;
        nextSchedules[sourceTurmaId][sourceSlotId] = targetSlotData;

        const sRoomId = sourceSlotData.associatedRoomId;
        const tRoomId = targetSlotData?.associatedRoomId;

        if (sRoomId) {
          if (!nextSchedules[sRoomId]) nextSchedules[sRoomId] = {};
          nextSchedules[sRoomId][targetSlotId] = {
            ...sourceSlotData,
            associatedTurmaId: targetTurmaId,
          };
          delete nextSchedules[sRoomId][sourceSlotId];
        }
        if (tRoomId) {
          if (!nextSchedules[tRoomId]) nextSchedules[tRoomId] = {};
          nextSchedules[tRoomId][sourceSlotId] = {
            ...targetSlotData,
            associatedTurmaId: sourceTurmaId,
          };
          if (tRoomId !== sRoomId) {
            delete nextSchedules[tRoomId][targetSlotId];
          }
        }
      } else {
        nextSchedules[targetTurmaId][targetSlotId] = sourceSlotData;
        delete nextSchedules[sourceTurmaId][sourceSlotId];

        const sRoomId = sourceSlotData.associatedRoomId;
        if (sRoomId) {
          if (!nextSchedules[sRoomId]) nextSchedules[sRoomId] = {};
          nextSchedules[sRoomId][targetSlotId] = {
            ...sourceSlotData,
            associatedTurmaId: targetTurmaId,
          };
          delete nextSchedules[sRoomId][sourceSlotId];
        }
      }
    }

    // Validate source slot in target position
    const conflictsSource = getConflictsForTest(
      nextSchedules,
      targetDay,
      targetPeriod,
      sourceSlotData.teacherId,
      targetTurmaId,
      sourceSlotData.associatedTurmaId,
    );
    if (conflictsSource.length > 0) {
      const msg = conflictsSource.includes("INDISPONÍVEL")
        ? `Não é possível mover: O professor ${sourceTeacher?.name || ""} não está disponível no horário de destino (${targetDay} - ${targetPeriod}ª aula).`
        : `Não é possível mover: O professor ${sourceTeacher?.name || ""} já está dando aula na turma ${conflictsSource.join(", ")} neste mesmo horário (${targetDay} - ${targetPeriod}ª aula).`;
      return { isValid: false, error: msg };
    }

    // Validate target slot in source position
    if (targetSlotData) {
      const conflictsTarget = getConflictsForTest(
        nextSchedules,
        sourceDay,
        sourcePeriod,
        targetSlotData.teacherId,
        sourceTurmaId,
        targetSlotData.associatedTurmaId,
      );
      if (conflictsTarget.length > 0) {
        const mTeacherName =
          teachers.find((t) => t.id === targetSlotData.teacherId)?.name || "";
        const msg = conflictsTarget.includes("INDISPONÍVEL")
          ? `Não é possível trocar: A aula de ${mTeacherName} que está no destino não pode ser movida para a origem (${sourceDay} - ${sourcePeriod}ª aula), pois o professor não está disponível nesse horário.`
          : `Não é possível trocar com ${mTeacherName}: Ao tentar trocar de lugar, a aula de ${mTeacherName} bateria com outra aula que ele(a) já tem na turma ${conflictsTarget.join(", ")} (${sourceDay} - ${sourcePeriod}ª aula).`;
        return { isValid: false, error: msg };
      }
    }

    return { isValid: true };
  };

  const handleDragStart = (
    e: React.DragEvent,
    sourceTurmaId: string,
    sourceSlotId: string,
  ) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ sourceTurmaId, sourceSlotId }),
    );
    e.dataTransfer.effectAllowed = "move";

    // Preparar para destacar células válidas
    const slotData = schedules[sourceTurmaId]?.[sourceSlotId];
    if (slotData) {
      const isLab =
        !!slotData.associatedRoomId ||
        (turmas.find((t) => t.id === sourceTurmaId)?.isRoom ?? false);
      setDraggingSource({
        turmaId: sourceTurmaId,
        slotId: sourceSlotId,
        teacherId: slotData.teacherId,
        subjectId: slotData.subjectId,
        isLab,
      });
    }
  };

  const handleDragEnd = () => {
    setDraggingSource(null);
    setDraggedOverCell(null);
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetTurmaId: string,
    targetSlotId: string,
  ) => {
    e.preventDefault();
    if (
      draggedOverCell?.turmaId !== targetTurmaId ||
      draggedOverCell?.slotId !== targetSlotId
    ) {
      setDraggedOverCell({ turmaId: targetTurmaId, slotId: targetSlotId });
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCell(null);
  };

  const performMoveOrSwap = (
    sourceTurmaId: string,
    sourceSlotId: string,
    targetTurmaId: string,
    targetSlotId: string,
  ) => {
    if (sourceTurmaId === targetTurmaId && sourceSlotId === targetSlotId) {
      return;
    }

    const check = validateDragAndDrop(
      sourceTurmaId,
      sourceSlotId,
      targetTurmaId,
      targetSlotId,
    );
    if (!check.isValid) {
      // Flash target cell in Red
      setErrorCell({ turmaId: targetTurmaId, slotId: targetSlotId });
      setDragErrorMsg(check.error || "Operação inválida.");
      // Clear after definitions
      setTimeout(() => {
        setErrorCell(null);
      }, 1500);
      setTimeout(() => {
        setDragErrorMsg(null);
      }, 6000);
      return;
    }

    // Proceed with drop / change schedules
    const updatedSchedules = JSON.parse(JSON.stringify(schedules));
    const sourceSlotData = updatedSchedules[sourceTurmaId]?.[sourceSlotId];
    if (!sourceSlotData) return;
    const targetSlotData = updatedSchedules[targetTurmaId]?.[targetSlotId];

    if (!updatedSchedules[targetTurmaId]) {
      updatedSchedules[targetTurmaId] = {};
    }
    if (!updatedSchedules[sourceTurmaId]) {
      updatedSchedules[sourceTurmaId] = {};
    }

    if (viewMode === "rooms") {
      const sourceRoomId = sourceTurmaId; // column is room
      const targetRoomId = targetTurmaId; // column is room

      const sourceClassId = sourceSlotData.associatedTurmaId;
      const targetClassId = targetSlotData?.associatedTurmaId;

      // Initialize physical class schedules if needed
      if (sourceClassId && !updatedSchedules[sourceClassId])
        updatedSchedules[sourceClassId] = {};
      if (targetClassId && !updatedSchedules[targetClassId])
        updatedSchedules[targetClassId] = {};

      if (targetSlotData) {
        // Swap room slots (represent current columns)
        updatedSchedules[targetRoomId][targetSlotId] = { ...sourceSlotData };
        updatedSchedules[sourceRoomId][sourceSlotId] = { ...targetSlotData };

        // Update physical classes
        if (sourceClassId) {
          updatedSchedules[sourceClassId][targetSlotId] = {
            teacherId: sourceSlotData.teacherId,
            subjectId: sourceSlotData.subjectId,
            associatedRoomId: targetRoomId,
          };
          if (targetClassId !== sourceClassId) {
            delete updatedSchedules[sourceClassId][sourceSlotId];
          }
        }

        if (targetClassId) {
          updatedSchedules[targetClassId][sourceSlotId] = {
            teacherId: targetSlotData.teacherId,
            subjectId: targetSlotData.subjectId,
            associatedRoomId: sourceRoomId,
          };
          if (targetClassId !== sourceClassId) {
            delete updatedSchedules[targetClassId][targetSlotId];
          }
        }
      } else {
        // Move room slot (represent current columns)
        updatedSchedules[targetRoomId][targetSlotId] = { ...sourceSlotData };
        if (targetSlotId !== sourceSlotId || targetRoomId !== sourceRoomId) {
          delete updatedSchedules[sourceRoomId][sourceSlotId];
        }

        // Update physical class
        if (sourceClassId) {
          updatedSchedules[sourceClassId][targetSlotId] = {
            teacherId: sourceSlotData.teacherId,
            subjectId: sourceSlotData.subjectId,
            associatedRoomId: targetRoomId,
          };
          if (targetSlotId !== sourceSlotId) {
            delete updatedSchedules[sourceClassId][sourceSlotId];
          }
        }
      }
    } else {
      // viewMode === 'turmas'
      const sourceRoomId = sourceSlotData.associatedRoomId;
      const targetRoomId = targetSlotData?.associatedRoomId;
      if (sourceRoomId && !updatedSchedules[sourceRoomId])
        updatedSchedules[sourceRoomId] = {};
      if (targetRoomId && !updatedSchedules[targetRoomId])
        updatedSchedules[targetRoomId] = {};

      if (targetSlotData) {
        // Swap
        updatedSchedules[targetTurmaId][targetSlotId] = sourceSlotData;
        updatedSchedules[sourceTurmaId][sourceSlotId] = targetSlotData;

        // Swap room mirrors
        if (sourceRoomId) {
          updatedSchedules[sourceRoomId][targetSlotId] = {
            ...sourceSlotData,
            associatedTurmaId: targetTurmaId,
          };
          if (
            targetSlotId !== sourceSlotId ||
            targetTurmaId !== sourceTurmaId
          ) {
            if (sourceRoomId !== targetRoomId) {
              delete updatedSchedules[sourceRoomId][sourceSlotId];
            }
          }
        }
        if (targetRoomId) {
          updatedSchedules[targetRoomId][sourceSlotId] = {
            ...targetSlotData,
            associatedTurmaId: sourceTurmaId,
          };
          // If target room is not the same as source room, or source didn't occupy the slot we just wrote to
          if (targetRoomId !== sourceRoomId) {
            if (
              targetSlotId !== sourceSlotId ||
              targetTurmaId !== sourceTurmaId
            ) {
              delete updatedSchedules[targetRoomId][targetSlotId];
            }
          }
        }
      } else {
        // Move
        updatedSchedules[targetTurmaId][targetSlotId] = sourceSlotData;
        if (targetSlotId !== sourceSlotId || targetTurmaId !== sourceTurmaId) {
          delete updatedSchedules[sourceTurmaId][sourceSlotId];
        }

        // Move room mirror
        if (sourceRoomId) {
          updatedSchedules[sourceRoomId][targetSlotId] = {
            ...sourceSlotData,
            associatedTurmaId: targetTurmaId,
          };
          if (targetSlotId !== sourceSlotId) {
            delete updatedSchedules[sourceRoomId][sourceSlotId];
          }
        }
      }
    }

    setSchedules(updatedSchedules);
    localStorage.setItem("cecm_schedules", JSON.stringify(updatedSchedules));
  };

  const handleDrop = (
    e: React.DragEvent,
    targetTurmaId: string,
    targetSlotId: string,
  ) => {
    e.preventDefault();
    setDraggedOverCell(null);
    setDraggingSource(null);
    try {
      const rawData = e.dataTransfer.getData("text/plain");
      if (!rawData) return;

      let parsedData;
      try {
        parsedData = JSON.parse(rawData);
      } catch (err) {
        // Not a valid JSON payload (likely dragging external text)
        return;
      }

      const { sourceTurmaId, sourceSlotId } = parsedData;
      if (!sourceTurmaId || !sourceSlotId) return;

      performMoveOrSwap(
        sourceTurmaId,
        sourceSlotId,
        targetTurmaId,
        targetSlotId,
      );
    } catch (err) {
      console.error("Error on drop:", err);
    }
  };

  const getSuggestionsForSlot = (turmaId: string, slotId: string) => {
    const sourceSlotData = schedules[turmaId]?.[slotId];
    if (!sourceSlotData) return [];

    const teacherId = sourceSlotData.teacherId;
    if (!teacherId || teacherId === "none") return []; // no conflict if no teacher

    const tShift = getTurmaShift(
      turmas.find((t) => t.id === turmaId) || ({} as Turma),
    );
    const validPeriods =
      tShift === "manha"
        ? [1, 2, 3, 4, 5, 6]
        : tShift === "tarde"
          ? [7, 8, 9, 10, 11, 12]
          : tShift === "noite"
            ? [13, 14, 15, 16, 17]
            : [];

    const suggestions: { slotId: string; desc: string; isSwap: boolean }[] = [];

    DAYS.forEach((day) => {
      validPeriods.forEach((p) => {
        const targetSlotId = `${day.id}-${p}`;
        if (targetSlotId === slotId) return; // skip self

        const check = validateDragAndDrop(
          turmaId,
          slotId,
          turmaId,
          targetSlotId,
        );
        if (check.isValid) {
          const targetData = schedules[turmaId]?.[targetSlotId];
          const isTargetEmpty =
            !targetData ||
            !targetData.teacherId ||
            targetData.teacherId === "none";
          const displayDay = day.label;
          const displayPeriod = getDisplayPeriod(p);
          let desc = isTargetEmpty
            ? `Mover para ${displayDay} (${displayPeriod}ª)`
            : `Trocar com ${displayDay} (${displayPeriod}ª - ${subjects.find((s) => s.id === targetData.subjectId)?.name || "Outra"})`;
          suggestions.push({
            slotId: targetSlotId,
            desc,
            isSwap: !isTargetEmpty,
          });
        }
      });
    });

    return suggestions;
  };

  const handleAutoAssignSuggestion = () => {
    if (!tempSubject || !selectedTurmaId) return;
    const turma = turmas.find(t => t.id === selectedTurmaId);
    if (!turma) return;

    const tShift =
      turma.shift ||
      (turma.id.toLowerCase().includes("noite") ||
      turma.name.toLowerCase().includes("noite")
        ? "noite"
        : turma.id.toLowerCase().includes("tarde") ||
            turma.name.toLowerCase().includes("tarde")
          ? "tarde"
          : "manha");

    let validPeriods =
      tShift === "manha"
        ? [1, 2, 3, 4, 5, 6]
        : tShift === "tarde"
          ? [7, 8, 9, 10, 11, 12]
          : tShift === "noite"
            ? [13, 14, 15, 16, 17, 18]
            : [];
            
    if (validPeriods.length === 0) {
      validPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    }

    const effectiveDailyCount = getEffectiveDailyClassCount(turma, isCivicoMilitar);

    for (const day of DAYS) {
      for (const p of validPeriods) {
        const pIndex = validPeriods.indexOf(p);
        if (effectiveDailyCount === 5 && (pIndex % 6 === 5) && !(tShift === "noite" && enableNoiteAsynchronous)) {
           continue;
        }

        const slotId = `${day.id}-${p}`;
        const slotData = schedules[turma.id]?.[slotId];

        if (!slotData || (!slotData.teacherId && !slotData.subjectId)) {
          const conflicts = tempTeacher ? getConflicts(day.id, p, tempTeacher, turma.id) : [];
          
          if (tempAssociatedRoomId) {
            const isRoomBusy = Object.values(schedules).some(sched => 
              sched[slotId]?.associatedRoomId === tempAssociatedRoomId
            );
            if (isRoomBusy) conflicts.push("SALA_OCUPADA");
          }
          if (conflicts.length === 0) {
            setSchedules((prev) => {
              const newSched = { ...prev };
              if (!newSched[turma.id]) newSched[turma.id] = {};
              newSched[turma.id] = {
                ...newSched[turma.id],
                [slotId]: {
                  id: generateId(),
                  turmaId: turma.id,
                  subjectId: tempSubject,
                  teacherId: tempTeacher || "",
                  associatedRoomId: tempAssociatedRoomId || "",
                  isLocked: false,
                }
              };
              return newSched;
            });
            setIsSaved(false);
            setTempSubject("");
            setTempTeacher("");
            alert("Aula alocada com sucesso!");
            return;
          }
        }
      }
    }

    alert("Não foi possível encontrar um horário livre sem conflitos para esta alocação automaticamente. Tente fazer a alocação manualmente.");
  };

  const handleAutoFillEmptySlot = () => {
    if (!selectedSlot || !selectedTurmaId) return;
    const turma = turmas.find(t => t.id === selectedTurmaId);
    if (!turma) return;
    
    // Find missing subjects for this turma
    const tSched = schedules[turma.id] || {};
    const [dayId, periodStr] = selectedSlot.split("-");
    const period = parseInt(periodStr);
    
    let foundValid = false;
    for (const subject of subjects) {
      if (!subject.turmaIds?.includes(turma.id)) continue;
      
      const required = subject.weeklyClasses || 0;
      if (required <= 0) continue;
      
      let allocated = 0;
      Object.values(tSched).forEach(slot => {
        if (slot.subjectId === subject.id && slot.teacherId) {
          allocated++;
        }
      });
      
      if (allocated < required) {
        // Try to allocate this subject here
        const matchingTeacher = teachers.find(t => 
          t.subjectIds?.includes(subject.id) && t.turmaIds?.includes(turma.id)
        ) || teachers.find(t => t.subjectIds?.includes(subject.id));
        
        const teacherId = matchingTeacher?.id || "";
        const conflicts = teacherId ? getConflicts(dayId, period, teacherId, turma.id) : [];
        let roomConflict = false;
        let roomId = "";
        if (subject.roomIds && subject.roomIds.length > 0) {
          roomId = subject.roomIds[0];
          roomConflict = Object.values(schedules).some(sched => 
            sched[selectedSlot]?.associatedRoomId === roomId
          );
        }
        
        if (conflicts.length === 0 && !roomConflict) {
          // WE FOUND A MATCH!
          setTempSubject(subject.id);
          setTempTeacher(teacherId);
          setTempAssociatedRoomId(roomId);
          foundValid = true;
          alert("Sugestão carregada com sucesso! Clique em Salvar.");
          break;
        }
      }
    }
    
    if (!foundValid) {
      alert("Não foi possível encontrar uma aula pendente sem conflitos para este horário.");
    }
  };

  const handleAutoResolveConflict = () => {
    if (!selectedSlot || !selectedTurmaId || !tempSubject) return;
    
    const turma = turmas.find(t => t.id === selectedTurmaId);
    if (!turma) return;
    
    const tShift = turma.shift || (turma.id.toLowerCase().includes("noite") || turma.name.toLowerCase().includes("noite") ? "noite" : turma.id.toLowerCase().includes("tarde") || turma.name.toLowerCase().includes("tarde") ? "tarde" : "manha");
    let validPeriods = tShift === "manha" ? [1, 2, 3, 4, 5, 6] : tShift === "tarde" ? [7, 8, 9, 10, 11, 12] : tShift === "noite" ? [13, 14, 15, 16, 17, 18] : [];
    if (validPeriods.length === 0) validPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const effectiveDailyCount = getEffectiveDailyClassCount(turma, isCivicoMilitar);

    for (const day of DAYS) {
      for (const p of validPeriods) {
        const pIndex = validPeriods.indexOf(p);
        if (effectiveDailyCount === 5 && (pIndex % 6 === 5) && !(tShift === "noite" && enableNoiteAsynchronous)) continue;
        
        const slotId = `${day.id}-${p}`;
        if (slotId === selectedSlot) continue; // Skip current slot
        
        const slotData = schedules[turma.id]?.[slotId];
        if (!slotData || (!slotData.teacherId && !slotData.subjectId)) {
          const conflicts = tempTeacher ? getConflicts(day.id, p, tempTeacher, turma.id) : [];
          let roomConflict = false;
          if (tempAssociatedRoomId) {
            roomConflict = Object.values(schedules).some(sched => sched[slotId]?.associatedRoomId === tempAssociatedRoomId);
          }
          
          if (conflicts.length === 0 && !roomConflict) {
            setSchedules((prev) => {
              const newSched = { ...prev };
              if (!newSched[turma.id]) {
                newSched[turma.id] = {};
              } else {
                newSched[turma.id] = { ...newSched[turma.id] };
              }
              // Remove old
              delete newSched[turma.id][selectedSlot];
              // Add new
              newSched[turma.id][slotId] = {
                id: generateId(),
                turmaId: turma.id,
                subjectId: tempSubject,
                teacherId: tempTeacher || "",
                associatedRoomId: tempAssociatedRoomId || "",
                isLocked: false,
              };
              return newSched;
            });
            setIsSaved(false);
            setSelectedSlot(null);
            alert("Conflito resolvido! Aula movida para: " + day.name + " (" + p + "º horário)");
            return;
          }
        }
      }
    }
    alert("Não foi possível encontrar outro horário livre sem conflitos para mover esta aula.");
  };

  const handleSlotClick = (
    dayId: string,
    periodId: number,
    turmaId: string,
  ) => {
    const slotId = `${dayId}-${periodId}`;

    if (isClickMoveModeActive) {
      if (!clickMoveSource) {
        const currentSchedule = schedules[turmaId] || {};
        const hasSlotData = !!currentSchedule[slotId]?.teacherId || !!currentSchedule[slotId]?.subjectId;
        if (!hasSlotData) {
          setInfoMsg("Clique em um horário que já esteja preenchido para selecionar a origem.");
          return;
        }
        setClickMoveSource({ turmaId, slotId });
        setInfoMsg(`Origem selecionada! Agora clique em outra célula para trocar ou mover o horário.`);
      } else {
        if (clickMoveSource.turmaId === turmaId && clickMoveSource.slotId === slotId) {
          setClickMoveSource(null);
          setInfoMsg("Seleção cancelada.");
        } else {
          const check = validateDragAndDrop(clickMoveSource.turmaId, clickMoveSource.slotId, turmaId, slotId);
          if (!check.isValid) {
            setInfoMsg(check.error || "Movimentação inválida.");
            return;
          }
          performMoveOrSwap(clickMoveSource.turmaId, clickMoveSource.slotId, turmaId, slotId);
          setClickMoveSource(null);
          setInfoMsg("Troca/movimentação executada com sucesso!");
        }
      }
      return;
    }

    setSelectedTurmaId(turmaId);
    const currentSchedule = schedules[turmaId] || {};
    setSelectedSlot(slotId);
    const activeTeacherId = currentSchedule[slotId]?.teacherId || "";
    const activeSubjectId = currentSchedule[slotId]?.subjectId || "";

    if (tempSubject && !activeSubjectId) {
      // Keep existing tempSubject and tempTeacher for suggested allocation
      setTempAssociatedTurmaId(currentSchedule[slotId]?.associatedTurmaId || "");
      let defRoom = currentSchedule[slotId]?.associatedRoomId || "";
      if (!defRoom && tempSubject) {
        const sub = subjects.find(s => s.id === tempSubject);
        if (sub && sub.roomIds && sub.roomIds.length > 0) defRoom = sub.roomIds[0];
      }
      setTempAssociatedRoomId(defRoom);
    } else {
      setTempTeacher(activeTeacherId);
      setTempSubject(activeSubjectId);
      setTempAssociatedTurmaId(currentSchedule[slotId]?.associatedTurmaId || "");
      let defRoom = currentSchedule[slotId]?.associatedRoomId || "";
      if (!defRoom && activeSubjectId) {
        const sub = subjects.find(s => s.id === activeSubjectId);
        if (sub && sub.roomIds && sub.roomIds.length > 0) defRoom = sub.roomIds[0];
      }
      setTempAssociatedRoomId(defRoom);
    }
    setSlotError(null);
    setPendingLabConflict(null);
    setShowAllSubjectsInRoom(false); // Reset when opening modal

    // Auto-detect if selected teacher has preferDoubleClasses
    const selectedTeacherId = (tempSubject && !activeSubjectId) ? tempTeacher : activeTeacherId;
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    setAllocateConsecutive(teacher?.preferDoubleClasses || false);
    setManuallyToggledConsecutive(false);
  };

  const saveSlot = (forceLabOverride = false, ignoreLab = false) => {
    if (!selectedSlot || !selectedTurmaId) return;

    // Validar se o período excede o limite diário de aulas da turma
    const targetTurma = turmas.find(
      (t) =>
        t.id ===
        (viewMode === "rooms" ? tempAssociatedTurmaId : selectedTurmaId),
    );
    if (targetTurma && getEffectiveDailyClassCount(targetTurma, isCivicoMilitar) === 5) {
      const [_, periodStr] = selectedSlot.split("-");
      const p = parseInt(periodStr);
      if (p === 6 || p === 12 || (p === 18 && !enableNoiteAsynchronous)) {
        setSlotError(
          "Esta turma possui limite de 5 aulas por dia. Este período não pode ser alocado.",
        );
        return;
      }
    }

    // Safety check if no subjects or teachers exist
    if (subjects.length === 0 || teachers.length === 0) {
      setSlotError(
        "É necessário cadastrar pelo menos uma disciplina e um professor primeiro.",
      );
      return;
    }

    const nextSchedules = JSON.parse(JSON.stringify(schedules));
    const currentSchedule = nextSchedules[selectedTurmaId] || {};

    let activeRoomId = ignoreLab ? "" : tempAssociatedRoomId;

    // Extracted days and periods...
    const [day, periodStr] = selectedSlot.split("-");
    const period = parseInt(periodStr);
    let consecPeriod: number | null = null;
    if (period >= 1 && period <= 6) {
      consecPeriod = period < 6 ? period + 1 : 5;
    } else if (period >= 7 && period <= 12) {
      consecPeriod = period < 12 ? period + 1 : 11;
    } else if (period >= 13 && period <= 17) {
      consecPeriod = period < 17 ? period + 1 : 16;
    }
    const consecSlot = consecPeriod ? `${day}-${consecPeriod}` : null;

    // Helper to safely remove a single slot and its linked mirrors
    const removeSlotSafely = (
      slotId: string,
      currentData: ScheduleSlot,
      contextTurmaId: string,
    ) => {
      // ...
      if (currentData.associatedTurmaId) {
        if (nextSchedules[currentData.associatedTurmaId]) {
          const assocSched = {
            ...nextSchedules[currentData.associatedTurmaId],
          };
          if (
            assocSched[slotId] &&
            assocSched[slotId].associatedRoomId === contextTurmaId
          ) {
            delete assocSched[slotId].associatedRoomId;
            nextSchedules[currentData.associatedTurmaId] = assocSched;
          }
        }
      }
      if (currentData.associatedRoomId) {
        if (nextSchedules[currentData.associatedRoomId]) {
          const assocSched = { ...nextSchedules[currentData.associatedRoomId] };
          if (
            assocSched[slotId] &&
            assocSched[slotId].associatedTurmaId === contextTurmaId
          ) {
            delete assocSched[slotId];
            nextSchedules[currentData.associatedRoomId] = assocSched;
          }
        }
      }
      delete currentSchedule[slotId];
    };

    // Already extracted days and periods above

    if (!tempSubject) {
      if (selectedSlot && currentSchedule[selectedSlot]) {
        removeSlotSafely(
          selectedSlot,
          currentSchedule[selectedSlot],
          selectedTurmaId,
        );
        if (allocateConsecutive && consecSlot && currentSchedule[consecSlot]) {
          removeSlotSafely(
            consecSlot,
            currentSchedule[consecSlot],
            selectedTurmaId,
          );
        }
        nextSchedules[selectedTurmaId] = currentSchedule;
        setSchedules(nextSchedules);
        setSelectedSlot(null);
        return;
      } else {
        setSlotError("Por favor, selecione uma disciplina.");
        return;
      }
    } else if (viewMode === "rooms" && !tempAssociatedTurmaId) {
      setSlotError("Por favor, selecione a turma que utilizará a sala.");
      return;
    } else if (!tempTeacher) {
      setSlotError("Por favor, selecione um professor.");
      return;
    } else {
      // ... real teacher availability
      if (tempTeacher) {
        const teacher = teachers.find((t) => t.id === tempTeacher);
        if (teacher && teacher.turmaIds && teacher.turmaIds.length > 0) {
          const targetTurmaId =
            viewMode === "rooms" ? tempAssociatedTurmaId : selectedTurmaId;
          if (!teacher.turmaIds.includes(targetTurmaId)) {
            setSlotError(`Erro: O professor não leciona para esta turma.`);
            return;
          }
        }

        const selectedConflicts = getConflicts(
          day,
          period,
          tempTeacher,
          selectedTurmaId,
        );
        if (selectedConflicts.length > 0) {
          setSlotError(
            selectedConflicts.includes("INDISPONÍVEL")
              ? `Erro: O professor não está disponível no horário ${day}-${period}.`
              : `Erro: O professor já está ocupado em outra turma no horário ${day}-${period}.`,
          );
          return;
        }

        if (allocateConsecutive && consecSlot && consecPeriod) {
          const consecConflicts = getConflicts(
            day,
            consecPeriod,
            tempTeacher,
            selectedTurmaId,
          );
          if (consecConflicts.length > 0) {
            setSlotError(
              `Erro: O professor já está ocupado em outra turma no horário geminado.`,
            );
            return;
          }
        }
      }

      // Validação de disponibilidade da Sala Especial
      if (viewMode === "turmas" && activeRoomId) {
        const roomSchedule = schedules[activeRoomId] || {};
        const isConflict1 =
          roomSchedule[selectedSlot] &&
          roomSchedule[selectedSlot]?.associatedTurmaId !== selectedTurmaId;
        const isConflict2 =
          allocateConsecutive &&
          consecSlot &&
          roomSchedule[consecSlot] &&
          roomSchedule[consecSlot]?.associatedTurmaId !== selectedTurmaId;

        if (isConflict1 || isConflict2) {
          if (!forceLabOverride) {
            // Tentar realocar a aula do laboratório DE QUEM JÁ ESTÁ LÁ (Turma B) para outro slot da Turma B
            const trySwapOccupant = (sId: string) => {
              const occupantId = roomSchedule[sId]?.associatedTurmaId;
              if (!occupantId || occupantId === selectedTurmaId) return true; // not occupied or occupied by us
              const occupantSubjectId =
                nextSchedules[occupantId]?.[sId]?.subjectId;
              if (!occupantSubjectId) return false;

              const occupantOtherSlots = Object.entries(
                nextSchedules[occupantId] || {},
              ).filter(
                ([otherSId, slot]: [string, any]) =>
                  slot &&
                  slot.subjectId === occupantSubjectId &&
                  otherSId !== sId &&
                  !slot.associatedRoomId,
              );

              for (const [otherSId, slotAsAny] of occupantOtherSlots) {
                const slot: any = slotAsAny;
                const isRoomBusyThere =
                  schedules[activeRoomId]?.[otherSId] ||
                  nextSchedules[activeRoomId]?.[otherSId];
                if (!isRoomBusyThere) {
                  // Can swap!
                  // 1. Give room to occupant at otherSId
                  nextSchedules[occupantId][otherSId].associatedRoomId =
                    activeRoomId;
                  if (!nextSchedules[activeRoomId])
                    nextSchedules[activeRoomId] = {};
                  nextSchedules[activeRoomId][otherSId] = {
                    teacherId: slot.teacherId,
                    subjectId: occupantSubjectId,
                    associatedTurmaId: occupantId,
                  };

                  // 2. Remove room from occupant at sId
                  nextSchedules[occupantId][sId].associatedRoomId = undefined;
                  delete nextSchedules[activeRoomId][sId];

                  return true; // Swapped successfully
                }
              }
              return false; // could not swap
            };

            const swapped1 = !isConflict1 || trySwapOccupant(selectedSlot);
            const swapped2 = !isConflict2 || trySwapOccupant(consecSlot!);

            if (!(swapped1 && swapped2)) {
              setPendingLabConflict({ roomId: activeRoomId, consecSlot });
              setSlotError(null);
              return;
            }
          } else {
            // Overriding! Clean up the other turmas that were using this lab in these slots
            [selectedSlot, consecSlot].forEach((sId) => {
              if (sId && roomSchedule[sId]) {
                const oldTurmaId = roomSchedule[sId].associatedTurmaId;
                if (oldTurmaId && oldTurmaId !== selectedTurmaId) {
                  if (!nextSchedules[oldTurmaId])
                    nextSchedules[oldTurmaId] = {};
                  if (nextSchedules[oldTurmaId][sId]) {
                    // We don't delete their lesson, just remove their lab association
                    nextSchedules[oldTurmaId][sId] = {
                      ...nextSchedules[oldTurmaId][sId],
                      associatedRoomId: undefined,
                    };
                  }
                }
              }
            });
            setPendingLabConflict(null);
          }
        }
      }

      // Workload Validation
      const subject = subjects.find((s) => s.id === tempSubject);
      if (subject) {
        const targetTurmaIdForValidation =
          viewMode === "rooms" ? tempAssociatedTurmaId : selectedTurmaId;
        const workloads = getSubjectWorkloadsForTurma(
          subject,
          targetTurmaIdForValidation,
        );
        if (workloads.workload === 0) {
          setSlotError(
            `Erro: A disciplina não faz parte da grade curricular da turma.`,
          );
          return;
        }

        const usage = getWorkloadUsage(tempSubject);
        const currentSlotData = currentSchedule[selectedSlot] as ScheduleSlot;
        const consecSlotData =
          allocateConsecutive && consecSlot
            ? (currentSchedule[consecSlot] as ScheduleSlot)
            : null;

        const isEditingSameSelected =
          currentSlotData?.subjectId === tempSubject &&
          (viewMode === "rooms"
            ? currentSlotData?.associatedTurmaId === tempAssociatedTurmaId
            : true);

        const isEditingSameConsec =
          consecSlotData?.subjectId === tempSubject &&
          (viewMode === "rooms"
            ? consecSlotData?.associatedTurmaId === tempAssociatedTurmaId
            : true);

        let extraNeeded = 0;
        if (!isEditingSameSelected) extraNeeded += 1;
        if (allocateConsecutive && consecSlot && !isEditingSameConsec)
          extraNeeded += 1;

        if (usage.usage + extraNeeded > usage.total) {
          setSlotError(
            `Limite TOTAL de carga horária atingido para ${subject.name} (Máximo ${usage.total} aulas semanais).`,
          );
          return;
        }
      }

      // Clean old links first!
      if (currentSchedule[selectedSlot]) {
        removeSlotSafely(
          selectedSlot,
          currentSchedule[selectedSlot],
          selectedTurmaId,
        );
      }
      if (allocateConsecutive && consecSlot && currentSchedule[consecSlot]) {
        removeSlotSafely(
          consecSlot,
          currentSchedule[consecSlot],
          selectedTurmaId,
        );
      }

      // Apply assignments
      currentSchedule[selectedSlot] = {
        teacherId: tempTeacher,
        subjectId: tempSubject,
        associatedTurmaId:
          viewMode === "rooms" ? tempAssociatedTurmaId : undefined,
        associatedRoomId:
          viewMode === "turmas" ? activeRoomId || undefined : undefined,
      };

      if (allocateConsecutive && consecSlot) {
        currentSchedule[consecSlot] = {
          teacherId: tempTeacher,
          subjectId: tempSubject,
          associatedTurmaId:
            viewMode === "rooms" ? tempAssociatedTurmaId : undefined,
          associatedRoomId:
            viewMode === "turmas" ? activeRoomId || undefined : undefined,
        };
      }
    }

    nextSchedules[selectedTurmaId] = currentSchedule;

    if (viewMode === "rooms" && tempAssociatedTurmaId) {
      if (!nextSchedules[tempAssociatedTurmaId])
        nextSchedules[tempAssociatedTurmaId] = {};
      nextSchedules[tempAssociatedTurmaId] = {
        ...nextSchedules[tempAssociatedTurmaId],
      };
      nextSchedules[tempAssociatedTurmaId][selectedSlot] = {
        teacherId: tempTeacher,
        subjectId: tempSubject,
        associatedRoomId: selectedTurmaId,
      };
      if (allocateConsecutive && consecSlot) {
        nextSchedules[tempAssociatedTurmaId][consecSlot] = {
          teacherId: tempTeacher,
          subjectId: tempSubject,
          associatedRoomId: selectedTurmaId,
        };
      }
    }

    if (viewMode === "turmas" && activeRoomId) {
      if (!nextSchedules[activeRoomId]) nextSchedules[activeRoomId] = {};
      nextSchedules[activeRoomId] = { ...nextSchedules[activeRoomId] };
      nextSchedules[activeRoomId][selectedSlot] = {
        teacherId: tempTeacher,
        subjectId: tempSubject,
        associatedTurmaId: selectedTurmaId,
      };
      if (allocateConsecutive && consecSlot) {
        nextSchedules[activeRoomId][consecSlot] = {
          teacherId: tempTeacher,
          subjectId: tempSubject,
          associatedTurmaId: selectedTurmaId,
        };
      }
    }

    setSchedules(nextSchedules);

    setSelectedSlot(null);
  };

  const getTurmaRoomEligibility = (roomId: string, turmaId: string) => {
    const allowSubjects = subjects.filter((s) => {
      if (s.roomIds?.includes(roomId)) return true;
      if (roomId === "special_LAB_INFO" && s.useLabComp) return true;
      if (roomId === "special_LAB_TAB" && s.useLabTab) return true;
      if (roomId === "special_SALA_MAT" && s.useSalaMat) return true;
      if (
        roomId === "special_QUADRA" &&
        s.name.toLowerCase().includes("educação física")
      )
        return true;
      return false;
    });

    let totalLabAllowed = 0;
    let totalLabUsed = 0;

    allowSubjects.forEach((s) => {
      const wl = getSubjectWorkloadsForTurma(s, turmaId);
      totalLabAllowed += wl.labWorkload;

      let used = 0;
      Object.keys(schedules).forEach((rid) => {
        const room = turmas.find((t) => t.id === rid);
        if (room && room.isRoom) {
          used += Object.values(schedules[rid]).filter(
            (slot: ScheduleSlot) =>
              slot.subjectId === s.id && slot.associatedTurmaId === turmaId,
          ).length;
        }
      });
      totalLabUsed += used;
    });

    return { totalLabAllowed, totalLabUsed };
  };

  const getWorkloadUsage = (subjectId: string) => {
    if (!selectedTurmaId)
      return {
        usage: 0,
        total: 0,
        classroomUsage: 0,
        labUsage: 0,
        classroomTotal: 0,
        labTotal: 0,
      };

    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject)
      return {
        usage: 0,
        total: 0,
        classroomUsage: 0,
        labUsage: 0,
        classroomTotal: 0,
        labTotal: 0,
      };

    // Identificar a turma "real" que consome a carga
    const targetTurma = turmas.find((t) => t.id === selectedTurmaId);
    const actualTurmaId = targetTurma?.isRoom
      ? tempAssociatedTurmaId
      : selectedTurmaId;

    if (!actualTurmaId)
      return {
        usage: 0,
        total: 0,
        classroomUsage: 0,
        labUsage: 0,
        classroomTotal: 0,
        labTotal: 0,
      };

    // 1. Uso em sala de aula (no horário da própria turma)
    const classroomSchedule = schedules[actualTurmaId] || {};
    const classroomUsage = Object.values(classroomSchedule).filter(
      (slot: ScheduleSlot) =>
        slot.subjectId === subjectId && !slot.associatedRoomId,
    ).length;

    // 2. Uso em laboratórios/salas especiais (em outros horários onde esta turma é associada)
    let labUsage = 0;
    Object.keys(schedules).forEach((rid) => {
      const room = turmas.find((t) => t.id === rid);
      if (room && room.isRoom) {
        labUsage += Object.values(schedules[rid]).filter(
          (slot: ScheduleSlot) =>
            slot.subjectId === subjectId &&
            slot.associatedTurmaId === actualTurmaId,
        ).length;
      }
    });

    const {
      workload: total,
      classWorkload: cTotal,
      labWorkload: lTotal,
    } = getSubjectWorkloadsForTurma(subject, actualTurmaId);

    return {
      usage: classroomUsage + labUsage,
      total,
      classroomUsage,
      classroomTotal: cTotal,
      labUsage,
      labTotal: lTotal,
    };
  };

  const getSortedSubjectsForModal = () => {
    const result = [...subjects];
    result.sort((a, b) => {
      const statsA = getWorkloadUsage(a.id);
      const statsB = getWorkloadUsage(b.id);

      const hasWorkloadA = statsA.total > 0;
      const hasWorkloadB = statsB.total > 0;

      const isCompletedA = statsA.usage >= statsA.total;
      const isCompletedB = statsB.usage >= statsB.total;

      // 1. Prioritize active workloads (total > 0)
      if (hasWorkloadA !== hasWorkloadB) {
        return hasWorkloadA ? -1 : 1;
      }

      // 2. Incomplete workloads first
      if (isCompletedA !== isCompletedB) {
        return isCompletedA ? 1 : -1;
      }

      // 3. Fewer distributed classes first
      if (statsA.usage !== statsB.usage) {
        return statsA.usage - statsB.usage;
      }

      return a.name.localeCompare(b.name);
    });
    return result;
  };

  const getClassSubjectWorkload = (turmaId: string, subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject)
      return {
        usage: 0,
        total: 0,
        classroomUsage: 0,
        labUsage: 0,
        classroomTotal: 0,
        labTotal: 0,
      };

    const classroomSchedule = schedules[turmaId] || {};
    const classroomUsage = Object.values(classroomSchedule).filter(
      (slot: ScheduleSlot) =>
        slot.subjectId === subjectId && !slot.associatedRoomId,
    ).length;

    let labUsage = 0;
    Object.keys(schedules).forEach((rid) => {
      const room = turmas.find((t) => t.id === rid);
      if (room && room.isRoom) {
        labUsage += Object.values(schedules[rid] || {}).filter(
          (slot: ScheduleSlot) =>
            slot.subjectId === subjectId && slot.associatedTurmaId === turmaId,
        ).length;
      }
    });

    const {
      workload: total,
      classWorkload: cTotal,
      labWorkload: lTotal,
    } = getSubjectWorkloadsForTurma(subject, turmaId);

    return {
      usage: classroomUsage + labUsage,
      total,
      classroomUsage,
      classroomTotal: cTotal,
      labUsage,
      labTotal: lTotal,
    };
  };

  const getAsyncRowIndex = (
    dayId: string,
    asyncSlot: any,
    turmaId: string,
    syncPeriods: number[],
    localSchedules: any,
    localTeachers: any[],
    localTurmas: any[],
  ) => {
    if (!asyncSlot) return 0;
    const teacherId = asyncSlot.teacherId;
    const freePeriodIndices: number[] = [];

    syncPeriods.forEach((pId, pIdx) => {
      let slotAtPeriod = localSchedules[turmaId]?.[`${dayId}-${pId}`];
      if (!slotAtPeriod) {
        for (const rid in localSchedules) {
          const room = localTurmas.find((t) => t.id === rid);
          if (
            room?.isRoom &&
            localSchedules[rid][`${dayId}-${pId}`]?.associatedTurmaId ===
              turmaId
          ) {
            slotAtPeriod = localSchedules[rid][`${dayId}-${pId}`];
            break;
          }
        }
      }
      if (slotAtPeriod?.teacherId !== teacherId) {
        freePeriodIndices.push(pIdx);
      }
    });

    if (freePeriodIndices.length > 0) {
      if (freePeriodIndices.includes(2)) return 2;
      if (freePeriodIndices.includes(0)) return 0;
      if (freePeriodIndices.includes(1)) return 1;
      return freePeriodIndices[0];
    }
    return 0;
  };

  const handlePrintSingleTurma = (turma: Turma) => {
    const shift =
      turma.shift ||
      (turma.id.toLowerCase().includes("noite") ||
      turma.name.toLowerCase().includes("noite")
        ? "noite"
        : turma.id.toLowerCase().includes("tarde") ||
            turma.name.toLowerCase().includes("tarde")
          ? "tarde"
          : "manha");
    const currentPeriods =
      shift === "noite"
        ? PERIODS_NOITE
        : shift === "manha"
          ? PERIODS_MANHA
          : PERIODS_TARDE;
    const currentTimeRanges =
      shift === "noite"
        ? timeRangesNoite
        : shift === "manha"
          ? timeRangesManha
          : timeRangesTarde;
    const isNightAsync = shift === "noite" && enableNoiteAsynchronous;

    const html = `
      <div class="print-container">
        <div class="print-header">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 3px;">
            ${logoUrl ? `<img src="${logoUrl}" style="height: 32px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ""}
            <div style="text-align: left;">
              <h1 style="font-size: 9pt; margin: 0; font-weight: 800; line-height: 1.1;">${schoolName.toUpperCase()}</h1>
              <h2 style="font-size: 8pt; margin: 1px 0; color: #1e293b; font-weight: 700;">HORÁRIO DE AULAS - TURMA: ${turma.name} (${shift === "manha" ? "MANHÃ" : shift === "tarde" ? "TARDE" : "NOITE"})</h2>
              ${academicStartDate ? `<div style="font-size: 7.5pt; color: #475569; font-weight: 600; text-transform: uppercase;">PERÍODO: ${academicPeriod}º ${academicSystem.toUpperCase()} (${academicStartDate} a ${academicEndDate})</div>` : ""}
            </div>
          </div>
        </div>
        
        <div class="table-wrapper" style="transform: scale(0.96); transform-origin: top center; margin-bottom: -20px;">
          <table class="grid-table">
            <thead>
              <tr>
                <th class="day-col">DIA</th>
                <th class="period-col">AULA</th>
                <th class="time-col">HORÁRIO</th>
                <th class="content-col">${isNightAsync ? turma.name.toUpperCase() : "DISCIPLINA / PROFESSOR"}</th>
                ${isNightAsync ? `<th class="async-col" style="width: 140px;">ASSÍNCRONA</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${DAYS.map((day) => {
                const totalRows =
                  isNightAsync || getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 ? 6 : 7;
                const desiredCount =
                  isNightAsync || getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 ? 5 : 6;
                const activePeriods = currentPeriods.slice(0, desiredCount);
                const lastPeriodIdx = desiredCount - 1;

                const asyncPeriodId = isNightAsync ? currentPeriods[5] : null;
                const asyncSlotKey = asyncPeriodId
                  ? `${day.id}-${asyncPeriodId}`
                  : "";
                let asyncSlot = null;
                if (asyncSlotKey) {
                  asyncSlot = schedules[turma.id]?.[asyncSlotKey] || null;
                  if (!asyncSlot) {
                    for (const rid in schedules) {
                      const room = turmas.find((t) => t.id === rid);
                      if (
                        room?.isRoom &&
                        schedules[rid][asyncSlotKey]?.associatedTurmaId ===
                          turma.id
                      ) {
                        asyncSlot = schedules[rid][asyncSlotKey];
                        break;
                      }
                    }
                  }
                }

                const asyncRowIndex = asyncSlot
                  ? getAsyncRowIndex(
                      day.id,
                      asyncSlot,
                      turma.id,
                      currentPeriods.slice(0, 5),
                      schedules,
                      teachers,
                      turmas,
                    )
                  : -1;

                return activePeriods
                  .map((pId, pIndex) => {
                    const pName = `${pIndex + 1}ª aula`;
                    const time = currentTimeRanges[pIndex];
                    const slotKey = `${day.id}-${pId}`;
                    let slot = schedules[turma.id]?.[slotKey];

                    if (!slot) {
                      for (const rid in schedules) {
                        const room = turmas.find((t) => t.id === rid);
                        if (
                          room?.isRoom &&
                          schedules[rid][slotKey]?.associatedTurmaId ===
                            turma.id
                        ) {
                          slot = schedules[rid][slotKey];
                          break;
                        }
                      }
                    }

                    const teacher = teachers.find(
                      (t) => t.id === slot?.teacherId,
                    );
                    const actSub = slot
                      ? getActiveSubstitution(day.id, pId, slot.teacherId)
                      : null;
                    const subTeacher =
                      actSub && actSub.substituteTeacherId !== "none"
                        ? teachers.find(
                            (t) => t.id === actSub.substituteTeacherId,
                          )
                        : null;
                    const subject = subjects.find(
                      (s) => s.id === slot?.subjectId,
                    );
                    const associatedRoom = slot?.associatedRoomId
                      ? turmas.find((t) => t.id === slot.associatedRoomId)
                      : null;

                    const isGrayDay = day.id === "ter" || day.id === "qui";
                    const rowBgStyle = isGrayDay
                      ? "background-color: #d5dee8 !important;"
                      : "background-color: #ffffff !important;";

                    let asyncCellHtml = "";
                    if (isNightAsync) {
                      if (pIndex === asyncRowIndex && asyncSlot) {
                        const asyncTeacher = teachers.find(
                          (t) => t.id === asyncSlot.teacherId,
                        );
                        const asyncSubject = subjects.find(
                          (s) => s.id === asyncSlot.subjectId,
                        );
                        asyncCellHtml = `
                        <td class="slot-cell" style="padding-left: 6px;">
                          ${asyncSubject ? `<div class="subj-name">${asyncSubject.name}</div>` : "-"}
                          ${asyncTeacher ? `<div class="prof-name">${asyncTeacher.name}</div>` : ""}
                        </td>
                      `;
                      } else {
                        asyncCellHtml = `
                        <td class="slot-cell" style="text-align: center; color: #7f8c8d; font-weight: 500; font-size: 8pt; padding: 0;">
                          **********
                        </td>
                      `;
                      }
                    }

                    return `
                    <tr class="${pIndex === lastPeriodIdx ? "day-end" : ""}" style="${rowBgStyle}">
                      ${pIndex === 0 ? `<td rowspan="${totalRows}" class="day-cell" style="background-color: ${day.printBg} !important; color: ${day.printText} !important; border-right: 2px solid ${day.printText} !important;"><span style="color: ${day.printText} !important;">${day.label}</span></td>` : ""}
                      <td class="p-num-cell">${pName}</td>
                      <td class="p-time-cell">${time}</td>
                      <td class="slot-cell">
                        ${subject ? `<div class="subj-name">${formatSubjectName(subject.name, 16)}</div>` : "-"}
                        ${
                          teacher
                            ? `<div class="prof-name">
                          ${actSub ? `${subTeacher ? formatTeacherName(subTeacher.name) : "PENDENTE"} <span style="display: inline-block; padding: 1px 2px; background-color: #f1f5f9; color: #334155; border-radius: 2px; font-size: 4pt; font-weight: 800; border: 1px solid #cbd5e1; vertical-align: top;">SUB</span>` : formatTeacherName(teacher.name)}
                          ${associatedRoom ? `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 2px; padding: 1px 2px; margin-left: 2px; background-color: #f1f5f9; color: #334155; border-radius: 2px; font-size: 4pt; font-weight: 800; border: 1px solid #cbd5e1; vertical-align: middle;">${formatRoomBadgeName(associatedRoom.name)}${associatedRoom.icon ? `<span style="display: flex; width: 6px; height: 6px; color: #475569;">${getRoomIconHtml(associatedRoom.icon)}</span>` : ""}</span>` : ""}
                        </div>`
                            : ""
                        }
                      </td>
                      ${asyncCellHtml}
                    </tr>
                    ${
                      pIndex === 2
                        ? `
                      <tr class="interval-row" style="height: 9pt;">
                        <td colspan="2" class="p-time-cell" style="background: #cbd5e1 !important; font-weight: 900; font-size: 5.5pt; color: #1e293b; height: 9pt; padding: 0;">${shift === "manha" ? "10h-10h20" : shift === "tarde" ? "15h30-15h50" : "21h15-21h30"}</td>
                        <td class="slot-cell" style="background: #cbd5e1 !important; text-align: center; font-weight: 900; font-size: 6.5pt; letter-spacing: 0.2em; color: #1e293b; height: 9pt; padding: 0;">INTERVALO</td>
                        ${isNightAsync ? `<td class="slot-cell" style="background: #cbd5e1 !important;"></td>` : ""}
                      </tr>
                    `
                        : ""
                    }
                  `;
                  })
                  .join("");
              }).join("")}
            </tbody>
          </table>
        </div>
        
        <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 5px;">
          <div style="font-weight: 800; font-size: 7.5pt; color: #0f172a;">
            Sistema feito por: Prof. Lucas Mercer Leniar
            <span style="font-size: 6pt; color: #64748b; font-weight: normal; margin-left: 8px;">
              - Versão ${version} - ${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - Atualização de Grade
            </span>
          </div>
          <div style="font-size: 5.5pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; page-break-inside: avoid;">www.LucasLeniar.com.br</div>
        </div>
      </div>
    `;

    return html;
  };

  const sortSpecialRooms = (rooms: typeof turmas) => {
    const sortedAlphabetically = [...rooms].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const normalRooms: typeof turmas = [];
    let sala4: typeof turmas = [];
    let sala8: typeof turmas = [];
    let biblioteca: typeof turmas = [];
    
    sortedAlphabetically.forEach(room => {
      const nameLower = room.name.toLowerCase();
      if (nameLower.includes("sala 4") || nameLower === "sala4") {
        sala4.push(room);
      } else if (nameLower.includes("sala 8") || nameLower === "sala8") {
        sala8.push(room);
      } else if (nameLower.includes("biblioteca") || nameLower.includes("biblio")) {
        biblioteca.push(room);
      } else {
        normalRooms.push(room);
      }
    });
    
    return [...normalRooms, ...sala4, ...sala8, ...biblioteca];
  };

  const handlePrintLabsHorizontal = () => {
    const specialRooms = sortSpecialRooms(turmas.filter((t) => t.isRoom));
    const chunkedRooms = [];
    const CHUNK_SIZE = 10;
    
    for (let i = 0; i < specialRooms.length; i += CHUNK_SIZE) {
      chunkedRooms.push(specialRooms.slice(i, i + CHUNK_SIZE));
    }

    if (chunkedRooms.length === 0) {
      alert("Nenhuma sala especial cadastrada para impressão.");
      return;
    }

    const generateTableContent = (shift: "manha" | "tarde" | "noite", roomsToPrint: typeof turmas) => {
      const periods =
        shift === "noite"
          ? PERIODS_NOITE
          : shift === "manha"
            ? PERIODS_MANHA
            : PERIODS_TARDE;
      const timeRanges =
        shift === "noite"
          ? timeRangesNoite
          : shift === "manha"
            ? timeRangesManha
            : timeRangesTarde;

      return `
        <div style=" display: flex; flex-direction: column; min-width: 0;">
          <h2 class="period-title" style="margin-top: 0; margin-bottom: 2px;">PERÍODO: ${shift === "manha" ? "MANHÃ" : shift === "tarde" ? "TARDE" : "NOITE"}</h2>
          <div class="table-wrapper" style="border: 0.8pt solid black;">
            <table>
              <thead>
                <tr>
                  <th style="width: 20px; font-size: 5pt; padding: 1px;">DIA</th>
                  <th style="width: 20px; font-size: 5pt; padding: 0.5px;">AULA</th>
                  <th style="width: 40px; font-size: 5pt; padding: 0.5px;">HORÁRIO</th>
                  ${roomsToPrint
                    .map(
                      (room) => `
                    <th class="room-header" style="background-color: ${room.color || "#6366f1"} !important; padding: 2px;">
                      <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                        ${room.icon ? `<span style="display: inline-flex; width: 10px; height: 10px; color: #ffffff; opacity: 0.9;">${getRoomIconHtml(room.icon)}</span>` : ""}
                        <span>${room.name}</span>
                      </div>
                    </th>
                  `,
                    )
                    .join("")}
                </tr>
              </thead>
              <tbody>
                ${DAYS.map((day) => {
                  const lastPeriodIdx = periods.length - 1;
                  const totalRows = periods.length + 1;

                  return periods
                    .map((pId, pIdx) => {
                      const slotId = `${day.id}-${pId}`;
                      const isGrayDay = day.id === "ter" || day.id === "qui";
                      const rowBgStyle = isGrayDay
                        ? "background-color: #d5dee8 !important;"
                        : "background-color: #ffffff !important;";
                      return `
                      <tr style="${rowBgStyle} ${pIdx === lastPeriodIdx ? "border-bottom: 1.2pt solid black !important;" : ""}">
                        ${pIdx === 0 ? `<td rowspan="${totalRows}" class="day-cell" style="background-color: ${day.printBg} !important; color: ${day.printText} !important; border-right: 2px solid ${day.printText} !important;"><span style="color: ${day.printText} !important;">${day.label}</span></td>` : ""}
                      <td class="p-num-cell">${pIdx + 1}º</td>
                      <td class="p-time-cell" style="font-size: 3.8pt;">${timeRanges[pIdx]}</td>
                      ${roomsToPrint
                        .map((room) => {
                          const slot = schedules[room.id]?.[slotId];
                          const teacher = teachers.find(
                            (t) => t.id === slot?.teacherId,
                          );
                          const actSub = slot
                            ? getActiveSubstitution(day.id, pId, slot.teacherId)
                            : null;
                          const subTeacher =
                            actSub && actSub.substituteTeacherId !== "none"
                              ? teachers.find(
                                  (t) => t.id === actSub.substituteTeacherId,
                                )
                              : null;
                          const subject = subjects.find(
                            (s) => s.id === slot?.subjectId,
                          );
                          const turma = turmas.find(
                            (t) => t.id === slot?.associatedTurmaId,
                          );

                          return `
                          <td class="slot-cell">
                            ${
                              teacher
                                ? `
                              <div class="teacher-name" style="font-size: 3.8pt;">${actSub ? `${subTeacher ? formatTeacherName(subTeacher.name) : "PEND"} <span style="display:inline-block;padding:1px;background:#f1f5f9;color:#334155;border-radius:2px;font-size:3pt;font-weight:800;border:1px solid #cbd5e1;">SUB</span>` : formatTeacherName(teacher.name)}</div>
                              <div class="extra-info" style="font-size: 4pt;">
                                ${turma?.name || ""} ${subject ? `<span class="extra-info-subject">- ${formatSubjectName(subject.name, 10)}</span>` : ""}
                              </div>
                            `
                                : ""
                            }
                          </td>
                        `;
                        })
                        .join("")}
                    </tr>
                    ${
                      pIdx === 2
                        ? `
                      <tr class="interval-row">
                        <td colspan="2" class="interval-time" style="font-size: 3.8pt;">${shift === "manha" ? "10h - 10h20" : shift === "tarde" ? "15h30 - 15h50" : "21h15 - 21h30"}</td>
                        <td colspan="${roomsToPrint.length}" class="interval-text">INTERVALO</td>
                      </tr>
                    `
                        : ""
                    }
                  `;
                    })
                    .join("");
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    };

    const html = `
      <div style="padding: 0px;">
        ${chunkedRooms.map(chunk => `
          <div class="print-container">
            <!-- Cabeçalho em todas as páginas -->
            <div class="print-header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px;">
                ${logoUrl ? `<img src="${logoUrl}" style="height: 26px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ""}
                <div style="text-align: center;">
                  <h1 style="margin: 0; font-size: 8pt; font-weight: 800; text-transform: uppercase; line-height: 1.1;">${schoolName.toUpperCase()}</h1>
                  <h2 style="margin: 0; font-size: 7pt; font-weight: 700; color: #334155; line-height: 1.1;">CRONOGRAMA DE SALAS ESPECIAIS (LABORATÓRIOS E SALA DE MATEMÁTICA)</h2>
                  ${academicStartDate ? `<div style="font-size: 6.5pt; color: #475569; font-weight: 600; text-transform: uppercase; margin-top: 1px;">PERÍODO LETIVO: ${academicPeriod}º ${academicSystem.toUpperCase()} (${academicStartDate} a ${academicEndDate})</div>` : ""}
                </div>
              </div>
            </div>

            <!-- Shifts Side by Side -->
            <div style="display: flex; gap: 8px;  min-height: 0; margin-top: 2px;">
              ${generateTableContent("manha", chunk)}
              ${generateTableContent("tarde", chunk)}
              ${enableNoite ? generateTableContent("noite", chunk) : ""}
            </div>
            
            <div class="print-footer" style="margin-top: 4px; text-align: center;">
               <div style="font-weight: 800; font-size: 6pt; color: #0f172a;">
                 Sistema feito por: Prof. Lucas Mercer Leniar
                 <span style="font-size: 5pt; color: #64748b; font-weight: normal; margin-left: 6px;">
                   - Versão ${version} - ${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - Atualização de Grade
                 </span>
               </div>
               <div style="font-size: 3.8pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 0px;">www.LucasLeniar.com.br</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    executePrintHorizontal(html, "Cronograma de Salas Especiais");
  };

  const executePrintHorizontal = (html: string, title: string) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - ${schoolName || "Gestão Escolar"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              @media print {
                @page { size: A4 landscape; margin: 4mm; }
                html, body {
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white; 
                  color: black;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
              }
               .print-container { 
                height: auto; max-height: 180mm; overflow: hidden; page-break-inside: avoid;
                break-inside: auto;
                width: 100%;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                padding-bottom: 2mm;
              }
              .print-container:not(:last-child) {
                page-break-after: always; 
                break-after: page;
              }
              .print-header { 
                text-align: center; 
                margin-bottom: 2px; 
              }
              .period-title {
                background: #0f172a; 
                color: white !important; 
                text-align: center; 
                padding: 1.5px; 
                margin: 0 0 2px 0; 
                font-size: 7pt; 
                font-weight: 800; 
                text-transform: uppercase;
              }
              .table-wrapper {
                
                width: 100%;
                border: 0.8pt solid black;
              }
              table { 
                width: 100% !important; 
                height: 100% !important;
                border-collapse: collapse !important; 
                table-layout: fixed !important; 
              }
              th, td { 
                border: 0.1pt solid black !important; 
                text-align: center; 
                vertical-align: middle;
                padding: 0px !important; 
              }
              th { 
                background-color: #f1f5f9 !important; 
                font-weight: 800 !important;
              }
              .room-header {
                font-size: 6.5pt; 
                padding: 1px 0.5px !important; 
                text-transform: uppercase; 
                color: white !important; 
                font-weight: 800; 
                line-height: 1;
                height: 12.5pt;
              }
              .day-cell { 
                background-color: #0f172a !important; 
                color: white !important; 
                text-align: center; 
                font-weight: 800; 
                width: 20px;
              }
              .day-cell span {
                display: block;
                writing-mode: vertical-lr;
                transform: rotate(180deg);
                margin: 0 auto;
                font-size: 5.5pt;
                letter-spacing: 0.05em;
                text-transform: uppercase;
              }
              .p-num-cell {
                font-size: 6pt;
                font-weight: 800;
                background-color: transparent !important;
                height: 11pt;
              }
              .p-time-cell {
                font-size: 5pt;
                color: #475569;
                font-weight: 600;
                height: 11pt;
              }
              .slot-cell {
                padding: 0.5px 2px !important;
                height: 11pt;
                text-align: left !important;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              }
              .teacher-name {
                font-weight: 800; 
                line-height: 1; 
                font-size: 6pt; 
                overflow: hidden; 
                text-overflow: ellipsis;
                color: black;
                text-align: center;
              }
              .extra-info {
                font-weight: 700; 
                color: #2563eb; 
                font-size: 5pt; 
                text-transform: uppercase; 
                border-left: 1pt solid #cbd5e1; 
                padding-left: 2px; 
                margin-top: 0.2px; 
                overflow: hidden; 
                text-overflow: ellipsis;
                line-height: 1;
              }
              .extra-info-subject {
                font-weight: 400; 
                color: #475569; 
                text-transform: none;
              }
              .interval-row {
                height: 8pt !important;
                background-color: #cbd5e1 !important;
              }
              .interval-time {
                font-size: 5.5pt;
                font-weight: 900;
                color: #1e293b;
                height: 8pt !important;
                line-height: 8pt;
                background-color: #cbd5e1 !important;
              }
              .interval-text {
                font-size: 6.5pt;
                font-weight: 950;
                color: #1e293b;
                letter-spacing: 0.5em;
                text-transform: uppercase;
                height: 8pt !important;
                line-height: 8pt;
                background-color: #cbd5e1 !important;
              }
              .print-footer {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0px;
                margin-top: 1px;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${html}
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintGeralTurmas = (isUnified: boolean = false) => {
    // Less aggressive filtering for printing
    const filteredTurmas = turmas.filter((t) => !t.isRoom);
    const manhaTurmas = sortTurmasList(
      filteredTurmas.filter(
        (t) =>
          t.shift === "manha" ||
          (!t.shift &&
            !t.name.toLowerCase().includes("tarde") &&
            !t.id.toLowerCase().includes("tarde") &&
            !t.name.toLowerCase().includes("noite") &&
            !t.id.toLowerCase().includes("noite")),
      ),
    );
    const tardeTurmas = sortTurmasList(
      filteredTurmas.filter(
        (t) =>
          t.shift === "tarde" ||
          (!t.shift &&
            (t.name.toLowerCase().includes("tarde") ||
              t.id.toLowerCase().includes("tarde"))),
      ),
    );
    const noiteTurmas = sortTurmasList(
      filteredTurmas.filter(
        (t) =>
          t.shift === "noite" ||
          (!t.shift &&
            (t.name.toLowerCase().includes("noite") ||
              t.id.toLowerCase().includes("noite"))),
      ),
    );

    const generateUnifiedScheduleTable = () => {
      const allActiveTurmas = [...manhaTurmas, ...tardeTurmas, ...(enableNoite ? noiteTurmas : [])];
      if (allActiveTurmas.length === 0) return "";

      const maxDailyClasses = Math.max(
        5,
        ...allActiveTurmas.map((t) => getEffectiveDailyClassCount(t, isCivicoMilitar)),
      );

      const lastPeriodIdx = maxDailyClasses - 1;
      const totalRows = maxDailyClasses + 1; // including interval

      return `
        <div class="print-container unified-container" style="page-break-inside: avoid; break-inside: avoid; height: auto; max-height: 180mm; overflow: hidden;">
          <div class="print-header" style="margin-bottom: 2px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1px;">
              ${logoUrl ? `<img src="${logoUrl}" style="height: 22px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ""}
              <div style="text-align: center;">
                <h1 style="font-size: 7.5pt; margin: 0; font-weight: 800; text-transform: uppercase;">${schoolName.toUpperCase()}</h1>
                <h2 style="font-size: 6.5pt; margin: 0; font-weight: 700; color: #1e293b;">QUADRO DE HORÁRIOS GERAL (TODAS AS TURMAS)</h2>
                ${academicStartDate ? `<div style="font-size: 5.5pt; color: #475569; font-weight: 600; text-transform: uppercase; margin-top: 1px;">PERÍODO LETIVO: ${academicPeriod}º ${academicSystem.toUpperCase()} (${academicStartDate} a ${academicEndDate})</div>` : ""}
              </div>
            </div>
          </div>
          
          <div class="table-wrapper" style="transform: scale(0.96); transform-origin: top center; margin-bottom: -20px;">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="corner-header" style="width: 12px; border: 0.1pt solid black;"></th>
                  ${allActiveTurmas.map((t) => {
                    const shift = t.shift || (
                      t.id.toLowerCase().includes("noite") || t.name.toLowerCase().includes("noite") ? "noite" :
                      t.id.toLowerCase().includes("tarde") || t.name.toLowerCase().includes("tarde") ? "tarde" : "manha"
                    );
                    const shiftBg = shift === "manha" ? "#0284c7" : shift === "tarde" ? "#ea580c" : "#4f46e5";
                    const shiftLabel = shift === "manha" ? "M" : shift === "tarde" ? "T" : "N";
                    return `<th class="turma-header" style="background-color: ${shiftBg} !important; color: white !important; font-size: 3.0pt; height: 9pt; font-weight: 950; text-align: center; border: 0.1pt solid black;">${t.name}<span style="font-size: 3.0pt; font-weight: normal; opacity: 0.9; display: block; margin-top: 0.2px;">${shiftLabel}</span></th>`;
                  }).join("")}
                  <th class="time-header" style="width: 20px; font-size: 3.8pt; height: 9pt; border: 0.1pt solid black; background-color: #f1f5f9;">AULA</th>
                </tr>
              </thead>
              <tbody>
                ${DAYS.map((day) => {
                  let dayRowsHtml = "";
                  
                  for (let pIndex = 0; pIndex < maxDailyClasses; pIndex++) {
                    const pName = `${pIndex + 1}ª`;
                    const isGrayDay = day.id === "ter" || day.id === "qui";
                    const rowBgStyle = isGrayDay
                      ? "background-color: #f1f5f9 !important;"
                      : "background-color: #ffffff !important;";

                    dayRowsHtml += `
                    <tr class="${pIndex === lastPeriodIdx ? "day-end" : ""}" style="${rowBgStyle}">
                      ${pIndex === 0 ? `<td rowspan="${totalRows}" class="day-cell" style="background-color: ${day.printBg} !important; color: ${day.printText} !important; border-right: 1.5pt solid ${day.printText} !important; width: 12px; font-size: 3.8pt; padding: 0;"><span style="color: ${day.printText} !important;">${day.label}</span></td>` : ""}
                      ${allActiveTurmas.map((turma) => {
                        const shift = turma.shift || (
                          turma.id.toLowerCase().includes("noite") || turma.name.toLowerCase().includes("noite") ? "noite" :
                          turma.id.toLowerCase().includes("tarde") || turma.name.toLowerCase().includes("tarde") ? "tarde" : "manha"
                        );
                        
                        let pId = null;
                        if (shift === "manha") {
                          pId = PERIODS_MANHA[pIndex];
                        } else if (shift === "tarde") {
                          pId = PERIODS_TARDE[pIndex];
                        } else if (shift === "noite") {
                          pId = PERIODS_NOITE[pIndex];
                        }

                        const slotKey = `${day.id}-${pId}`;
                        let slot = pId ? schedules[turma.id]?.[slotKey] : null;

                        if (pId && !slot) {
                          for (const rid in schedules) {
                            const room = turmas.find((t) => t.id === rid);
                            if (
                              room?.isRoom &&
                              schedules[rid][slotKey]?.associatedTurmaId === turma.id
                            ) {
                              slot = schedules[rid][slotKey];
                              break;
                            }
                          }
                        }

                        const teacher = teachers.find((t) => t.id === slot?.teacherId);
                        const actSub = slot ? getActiveSubstitution(day.id, pId, slot.teacherId) : null;
                        const subTeacher = actSub && actSub.substituteTeacherId !== "none"
                          ? teachers.find((t) => t.id === actSub.substituteTeacherId)
                          : null;
                        const subject = subjects.find((s) => s.id === slot?.subjectId);
                        const associatedRoom = slot?.associatedRoomId ? turmas.find((t) => t.id === slot.associatedRoomId) : null;

                        const isPeriodOut = pId ? (getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 && pIndex === 5) : true;

                        return `
                          <td class="slot-cell" style="height: 6.5pt; border: 0.1pt solid black; ${isPeriodOut ? "background-color: #f8fafc !important;" : ""}">
                            ${isPeriodOut
                              ? '<div style="font-size: 3.0pt; color: #cbd5e1; font-weight: 800; text-align: center;">-</div>'
                              : `
                              ${subject ? `<div class="subj-name" style="font-size: 3.0pt; font-weight: 950; line-height: 1.0; color: black; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; padding: 0 0.5px;">${formatSubjectName(subject.name, 12)}</div>` : ""}
                              ${teacher
                                ? `<div class="prof-name" style="font-size: 3.0pt; line-height: 1.0; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; justify-content: center; gap: 1px; margin-top: 0.1px;">
                                  ${actSub ? `${subTeacher ? formatTeacherName(subTeacher.name) : "PENDENTE"}` : formatTeacherName(teacher.name)}
                                  ${associatedRoom ? `<span style="font-size: 3.2pt; background:#f1f5f9; padding:0.2px 0.5px; border-radius:1px; border:0.2px solid #cbd5e1; font-weight:900;">${formatRoomBadgeName(associatedRoom.name)}</span>` : ""}
                                </div>`
                                : ""
                              }
                            `}
                          </td>
                        `;
                      }).join("")}
                      <td class="time-info" style="height: 6.5pt; border: 0.1pt solid black; width: 26px; text-align: center; padding: 1px 0;">
                        <div style="font-size: 3.8pt; font-weight: 800; color: #1e3a8a;">${pName}</div>
                        <div style="font-size: 2.5pt; color: #475569; margin-top: 0.5px; line-height: 1;"><span style="font-weight:700">M:</span> ${timeRangesManha[pIndex] || "-"}</div>
                        <div style="font-size: 2.5pt; color: #475569; margin-top: 0.5px; line-height: 1;"><span style="font-weight:700">T:</span> ${timeRangesTarde[pIndex] || "-"}</div>
                      </td>
                    </tr>
                    `;

                    if (pIndex === 2) {
                      dayRowsHtml += `
                      <tr class="interval-row" style="height: 5pt; background-color: #cbd5e1 !important;">
                        ${allActiveTurmas.map(() => `<td class="slot-cell" style="background: #cbd5e1 !important; text-align: center; font-size: 4pt; font-weight: 900; color: #1e293b; height: 5pt; padding: 0; border: 0.1pt solid black;">INT</td>`).join("")}
                        <td style="background: #cbd5e1 !important; padding: 0; height: 5pt; text-align: center; border: 0.1pt solid black; color: #1e293b;">
                          <div style="font-size: 3.0pt; font-weight: 900;">INT</div>
                        </td>
                      </tr>
                      `;
                    }
                  }

                  return dayRowsHtml;
                }).join("")}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 2px;">
            <div style="font-weight: 800; font-size: 5.5pt; color: #0f172a;">
              Sistema feito por: Prof. Lucas Mercer Leniar
              <span style="font-size: 3.8pt; color: #64748b; font-weight: normal; margin-left: 8px;">
                - Versão ${version} - ${new Date().toLocaleDateString("pt-BR")} - Quadro Unificado Geral (Todas as Turmas)
              </span>
            </div>
            <div style="font-size: 4pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 0.5px;">www.LucasLeniar.com.br</div>
          </div>
        </div>
      `;
    };

    const generateScheduleTable = (
      shiftTurmas: Turma[],
      shift: "manha" | "tarde" | "noite",
    ) => {
      if (shiftTurmas.length === 0) return "";

      const maxDailyClasses =
        shiftTurmas.length > 0
          ? Math.max(
              5,
              ...shiftTurmas.map((t) => getEffectiveDailyClassCount(t, isCivicoMilitar)),
            )
          : 6;
      let currentPeriods =
        shift === "noite"
          ? PERIODS_NOITE
          : shift === "manha"
            ? PERIODS_MANHA
            : PERIODS_TARDE;
      if (shift === "noite" && enableNoiteAsynchronous) {
        currentPeriods = currentPeriods.slice(0, 5);
      } else {
        currentPeriods = currentPeriods.slice(0, maxDailyClasses);
      }

      const currentTimeRanges =
        shift === "noite"
          ? timeRangesNoite
          : shift === "manha"
            ? timeRangesManha
            : timeRangesTarde;

      return `
        <div class="print-container" style="page-break-after: always; break-after: page;">
          <div class="print-header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1px;">
              ${logoUrl ? `<img src="${logoUrl}" style="height: 28px; width: auto; object-fit: contain;" referrerpolicy="no-referrer" />` : ""}
              <div style="text-align: center;">
                <h1 style="font-size: 8pt; margin: 0; font-weight: 800; text-transform: uppercase;">${schoolName.toUpperCase()}</h1>
                <h2 style="font-size: 7pt; margin: 0; font-weight: 700; color: #1e293b;">HORÁRIO DAS TURMAS - PERÍODO: ${shift === "manha" ? "MANHÃ" : shift === "tarde" ? "TARDE" : "NOITE"}</h2>
                ${academicStartDate ? `<div style="font-size: 6.5pt; color: #475569; font-weight: 600; text-transform: uppercase; margin-top: 1px;">PERÍODO LETIVO: ${academicPeriod}º ${academicSystem.toUpperCase()} (${academicStartDate} a ${academicEndDate})</div>` : ""}
              </div>
            </div>
          </div>
          
          <div class="table-wrapper" style="transform: scale(0.96); transform-origin: top center; margin-bottom: -20px;">
            <table class="grid-table">
              <thead>
                <tr>
                  <th class="corner-header"></th>
                  ${shiftTurmas.map((t) => `<th class="turma-header">${t.name}</th>`).join("")}
                  <th class="time-header">HORÁRIO</th>
                </tr>
              </thead>
              <tbody>
                ${DAYS.map((day) => {
                  const lastPeriodIdx = currentPeriods.length - 1;
                  const totalRows = currentPeriods.length + 1;

                  return currentPeriods
                    .map((pId, pIndex) => {
                      const isThisNightAsync =
                        shift === "noite" &&
                        enableNoiteAsynchronous &&
                        pIndex === 5;
                      const pName = isThisNightAsync
                        ? "ASSÍNCRONA"
                        : `${pIndex + 1}ª`;
                      const time = isThisNightAsync
                        ? "ONLINE"
                        : currentTimeRanges[pIndex];
                      const isGrayDay = day.id === "ter" || day.id === "qui";
                      const rowBgStyle = isGrayDay
                        ? "background-color: #d5dee8 !important;"
                        : "background-color: #ffffff !important;";

                      return `
                      <tr class="${pIndex === lastPeriodIdx ? "day-end" : ""}" style="${rowBgStyle}">
                        ${pIndex === 0 ? `<td rowspan="${totalRows}" class="day-cell" style="background-color: ${day.printBg} !important; color: ${day.printText} !important; border-right: 2px solid ${day.printText} !important;"><span style="color: ${day.printText} !important;">${day.label}</span></td>` : ""}
                          ${shiftTurmas
                            .map((turma) => {
                              const slotKey = `${day.id}-${pId}`;
                              let slot = schedules[turma.id]?.[slotKey];

                              // Se não houver slot direto, buscar em salas especiais
                              if (!slot) {
                                for (const rid in schedules) {
                                  const room = turmas.find((t) => t.id === rid);
                                  if (
                                    room?.isRoom &&
                                    schedules[rid][slotKey]
                                      ?.associatedTurmaId === turma.id
                                  ) {
                                    slot = schedules[rid][slotKey];
                                    break;
                                  }
                                }
                              }

                              const teacher = teachers.find(
                                (t) => t.id === slot?.teacherId,
                              );
                              const actSub = slot
                                ? getActiveSubstitution(
                                    day.id,
                                    pId,
                                    slot.teacherId,
                                  )
                                : null;
                              const subTeacher =
                                actSub && actSub.substituteTeacherId !== "none"
                                  ? teachers.find(
                                      (t) =>
                                        t.id === actSub.substituteTeacherId,
                                    )
                                  : null;
                              const subject = subjects.find(
                                (s) => s.id === slot?.subjectId,
                              );
                              const associatedRoom = slot?.associatedRoomId
                                ? turmas.find(
                                    (t) => t.id === slot.associatedRoomId,
                                  )
                                : null;

                              const isPeriodOut =
                                getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 &&
                                pIndex === 5 &&
                                !(shift === "noite" && enableNoiteAsynchronous);

                              return `
                             <td class="slot-cell" style="${isPeriodOut ? "background-color: #f1f5f9 !important;" : ""}">
                               ${
                                 isPeriodOut
                                   ? '<div style="font-size: 5pt; color: #94a3b8; font-weight: 800; text-transform: uppercase; text-align: center; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0px;">SEM 6ª AULA</div>'
                                   : `
                                 ${subject ? `<div class="subj-name">${formatSubjectName(subject.name, 16)}</div>` : ""}
                                 ${
                                   teacher
                                     ? `<div class="prof-name">
                                   ${actSub ? `${subTeacher ? formatTeacherName(subTeacher.name) : "PENDENTE"} <span style="display:inline-block;padding:1px;background:#f1f5f9;color:#334155;border-radius:2px;font-size:4pt;font-weight:800;border:1px solid #cbd5e1;vertical-align:top;">SUB</span>` : formatTeacherName(teacher.name)}
                                   ${associatedRoom ? `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 2px; padding: 1px 2px; margin-left: 2px; background-color: #f1f5f9; color: #334155; border-radius: 2px; font-size: 4pt; font-weight: 800; border: 1px solid #cbd5e1;">${formatRoomBadgeName(associatedRoom.name)}${associatedRoom.icon ? `<span style="display: flex; width: 6px; height: 6px; color: #475569;">${getRoomIconHtml(associatedRoom.icon)}</span>` : ""}</span>` : ""}
                                 </div>`
                                     : ""
                                 }
                               `
                               }
                             </td>
                           `;
                            })
                            .join("")}
                        <td class="time-info">
                          <span class="p-num">${pName}</span>
                          <span class="p-time">${time}</span>
                        </td>
                      </tr>
                      ${
                        pIndex === 2
                          ? `
                        <tr class="interval-row" style="height: 6pt;">
                          ${shiftTurmas.map(() => `<td class="slot-cell" style="background: #cbd5e1 !important; text-align: center; font-size: 3.8pt; font-weight: 900; color: #1e293b; height: 6pt; padding: 0;">INTERVALO</td>`).join("")}
                          <td style="background: #cbd5e1 !important; padding: 0; height: 6pt;">
                            <span class="p-time" style="font-size: 4pt; font-weight: 900; color: #000000; line-height: 1; display: block; text-align: center;">${shift === "manha" ? "10h-10h20" : shift === "tarde" ? "15h30-15h50" : "21h15-21h30"}</span>
                          </td>
                        </tr>
                      `
                          : ""
                      }
                    `;
                    })
                    .join("");
                }).join("")}
              </tbody>
            </table>
          </div>
          
          <div class="print-footer" style="display: flex; flex-direction: column; align-items: center; gap: 0px; margin-top: 1px;">
            <div style="font-weight: 800; font-size: 6.5pt; color: #0f172a;">
              Sistema feito por: Prof. Lucas Mercer Leniar
              <span style="font-size: 5pt; color: #64748b; font-weight: normal; margin-left: 8px;">
                - Versão ${version} - ${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - Atualização de Grade
              </span>
            </div>
            <div style="font-size: 3.8pt; color: #2563eb; font-weight: 800; letter-spacing: 0.1em; margin-top: 1px; page-break-inside: avoid;">www.LucasLeniar.com.br</div>
          </div>
        </div>
      `;
    };

    let html = "";
    if (isUnified) {
      html = generateUnifiedScheduleTable();
    } else {
      if (manhaTurmas.length > 0)
        html += generateScheduleTable(manhaTurmas, "manha");
      if (tardeTurmas.length > 0)
        html += generateScheduleTable(tardeTurmas, "tarde");
      if (enableNoite && noiteTurmas.length > 0)
        html += generateScheduleTable(noiteTurmas, "noite");
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quadro de Horários - ${schoolName || "Gestão Escolar"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              @media print { 
                @page { 
                  size: A4 landscape; 
                  margin: ${isUnified ? "2mm" : "4mm"}; 
                }
                html, body {
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white; 
                  color: black;
                  -webkit-print-color-adjust: exact; 
                  print-color-adjust: exact; 
                  overflow: visible !important;
                }
              }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
              }
              
              .print-container { 
                height: auto; max-height: 180mm; overflow: hidden; page-break-inside: avoid;
                break-inside: auto;
                width: 100%;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                padding-bottom: 2mm;
              }
              .print-container:not(:last-child) {
                page-break-after: always; 
                break-after: page;
              }
              
              .print-header { text-align: center; margin-bottom: 1px; }
              
              .table-wrapper {
                
                width: 100%;
                border: 0.8pt solid black;
              }
              
              .grid-table { 
                width: 100%; 
                
                border-collapse: collapse; 
                table-layout: fixed; 
              }
              
              th, td { 
                border: 0.1pt solid #000; 
                text-align: center; 
                vertical-align: middle;
                padding: 0px; 
              }
              
              .corner-header { width: 12px; }
              .time-header { width: 38px; font-size: 5.5pt; font-weight: 800; background-color: #f1f5f9; height: 11pt; }
              
              .turma-header { 
                background-color: #e2e8f0; 
                font-size: 5.5pt; 
                font-weight: 800; 
                height: 11pt;
              }
              
              .day-cell { 
                width: 12px;
                background-color: #f8fafc;
                padding: 0;
              }
              .day-cell span {
                display: block;
                writing-mode: vertical-lr;
                transform: rotate(180deg);
                font-size: 5pt; 
                font-weight: 950; 
                text-transform: uppercase;
                margin: 0 auto;
                letter-spacing: 0.2px;
              }
              
              .slot-cell { 
                overflow: hidden;
                height: 10pt; 
                line-height: 1.05;
              }
              
              .subj-name { 
                font-size: 5.8pt; 
                font-weight: 900; 
                color: black; 
                text-transform: uppercase;
                line-height: 1.05;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 1px;
                text-align: center;
              }
              
              .prof-name { 
                font-size: 3.0pt; 
                color: #334155; 
                line-height: 1.0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding: 0 1px;
                margin-top: 0.2px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
              }
              
              .time-info { 
                background-color: transparent !important;
                line-height: 1.05;
                height: 10pt;
              }
              .p-num { display: block; font-size: 5.2pt; font-weight: 800; color: #1e3a8a; }
              .p-time { display: block; font-size: 4.2pt; font-weight: 500; color: #475569; }
              
              .print-footer {
                margin-top: 1px;
                text-align: right;
                font-size: 5.5pt;
                color: black;
                font-weight: 600;
                page-break-inside: avoid;
              }
              
              tr.day-end {
                border-bottom: 1.2pt solid black;
              }
              
              .interval-row, .interval-row td {
                height: 1px !important;
                background-color: #cbd5e1 !important;
                padding: 1px 0 !important;
                line-height: 1 !important;
              }
            </style>
          </head>
          <body>
            ${html}
            <script>
              window.onload = () => { 
                setTimeout(() => { 
                  window.print(); 
                }, 1000); 
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintAllTurmasIndividual = () => {
    let filteredTurmas = turmas.filter((t) => !t.isRoom);

    if (!enableNoite) {
      filteredTurmas = filteredTurmas.filter((t) => {
        const shift =
          t.shift ||
          (t.id.toLowerCase().includes("noite") ||
          t.name.toLowerCase().includes("noite")
            ? "noite"
            : t.id.toLowerCase().includes("tarde") ||
                t.name.toLowerCase().includes("tarde")
              ? "tarde"
              : "manha");
        return shift !== "noite";
      });
    }

    if (printIndividualShift === "manha") {
      filteredTurmas = filteredTurmas.filter((t) => {
        if (t.shift) return t.shift === "manha";
        return (
          !t.name.toLowerCase().includes("tarde") &&
          !t.id.toLowerCase().includes("tarde") &&
          !t.name.toLowerCase().includes("noite") &&
          !t.id.toLowerCase().includes("noite")
        );
      });
    } else if (printIndividualShift === "tarde") {
      filteredTurmas = filteredTurmas.filter((t) => {
        if (t.shift) return t.shift === "tarde";
        return (
          (t.name.toLowerCase().includes("tarde") ||
            t.id.toLowerCase().includes("tarde")) &&
          !t.name.toLowerCase().includes("noite") &&
          !t.id.toLowerCase().includes("noite")
        );
      });
    } else if (printIndividualShift === "noite") {
      filteredTurmas = filteredTurmas.filter((t) => {
        if (t.shift) return t.shift === "noite";
        return (
          t.name.toLowerCase().includes("noite") ||
          t.id.toLowerCase().includes("noite")
        );
      });
    }

    const html = sortTurmasList(filteredTurmas)
      .map((t) => handlePrintSingleTurma(t))
      .join("");

    executePrint(
      html,
      `Horários por Turma${printIndividualShift !== "todos" ? ` (${printIndividualShift === "manha" ? "Manhã" : printIndividualShift === "tarde" ? "Tarde" : "Noite"})` : ""}`,
    );
  };

  const executePrint = (html: string, title: string) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - ${schoolName || "Gestão Escolar"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 4mm; }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                
                overflow: visible !important;
              }
              .print-container { 
                width: 100%; 
                height: 288mm; max-height: 288mm; min-height: 288mm; overflow: hidden; /* Configured to fit perfectly on A4 portrait of 297mm height with 4mm margins */
                display: flex; 
                flex-direction: column; 
                box-sizing: border-box;
              }
              .print-container:not(:last-child) {
                page-break-after: always; 
                break-after: page;
              }
              .print-header { text-align: center; margin-bottom: 4px; border-bottom: 1.2pt solid black; padding-bottom: 2px; }
              .print-header h1 { font-size: 10pt; margin: 0; font-weight: 800; }
              .print-header h2 { font-size: 8.5pt; margin: 1px 0; color: #1e293b; font-weight: 700; }
              .table-wrapper { border: 0.8pt solid black; margin-top: 2px;  }
              .grid-table { width: 100%; border-collapse: collapse; table-layout: fixed;  }
              th, td { border: 0.4pt solid black; padding: 1px 2px; text-align: center; vertical-align: middle; }
              th { background: #f1f5f9 !important; font-weight: 800; font-size: 7.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .day-col { width: 22px; }
              .period-col { width: 50px; }
              .time-col { width: 80px; }
              .day-cell { font-weight: 900; background: #f8fafc !important; font-size: 7.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .day-cell span { display: block; writing-mode: vertical-lr; transform: rotate(180deg); margin: 0 auto; }
              .p-num-cell { font-weight: 700; color: #2563eb !important; font-size: 6.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .p-time-cell { color: #64748b !important; font-size: 6pt; font-weight: 500; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .slot-cell { text-align: left; padding-left: 6px; overflow: hidden; }
              .subj-name { font-weight: 800; font-size: 8pt; text-transform: uppercase; margin-bottom: 0px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
              .prof-name { font-size: 7.5pt; color: black !important; font-weight: 600; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; align-items: center; justify-content: center; gap: 2px; }
              .day-end { border-bottom: 1.2pt solid black; }
              .print-footer { margin-top: 2px; text-align: right; font-size: 6.5pt; color: black; font-weight: 600; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            ${html}
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrintTurmaSelection = (turma: Turma) => {
    const html = handlePrintSingleTurma(turma);
    executePrint(html, `Horário ${turma.name}`);
    setIsPrintingTurmaSelection(false);
  };

  const handlePrintMultipleTurmasCombined = (selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      alert("Por favor, selecione pelo menos 2 turmas para imprimir juntas.");
      return;
    }

    // Sort selected turmas
    let filteredSelection = turmas.filter((t) => selectedIds.includes(t.id));
    if (!enableNoite) {
      filteredSelection = filteredSelection.filter((t) => {
        const shift =
          t.shift ||
          (t.id.toLowerCase().includes("noite") ||
          t.name.toLowerCase().includes("noite")
            ? "noite"
            : t.id.toLowerCase().includes("tarde") ||
                t.name.toLowerCase().includes("tarde")
              ? "tarde"
              : "manha");
        return shift !== "noite";
      });
    }
    const sortedSelection = sortTurmasList(filteredSelection);

    // Generates combined column layouts
    const cardsHtml = sortedSelection
      .map((turma) => {
        const shift =
          turma.shift ||
          (turma.id.toLowerCase().includes("noite") ||
          turma.name.toLowerCase().includes("noite")
            ? "noite"
            : turma.id.toLowerCase().includes("tarde") ||
                turma.name.toLowerCase().includes("tarde")
              ? "tarde"
              : "manha");
        const currentPeriods =
          shift === "noite"
            ? PERIODS_NOITE
            : shift === "manha"
              ? PERIODS_MANHA
              : PERIODS_TARDE;
        const currentTimeRanges =
          shift === "noite"
            ? timeRangesNoite
            : shift === "manha"
              ? timeRangesManha
              : timeRangesTarde;

        const isNightAsync = shift === "noite" && enableNoiteAsynchronous;
        const desiredCount =
          isNightAsync || getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 ? 5 : 6;
        const slicePeriods = currentPeriods.slice(0, desiredCount);

        return `
        <div class="combined-card" style="page-break-inside: avoid; break-inside: avoid;">
          <div class="print-header-small" style="text-align: center; border-bottom: 2px solid black; padding-bottom: 1px; margin-bottom: 2px; background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <p style="font-size: 8pt; margin: 0; font-weight: 850; text-transform: uppercase; color: black; line-height: 1.1;">
              ${turma.name} — ${shift === "manha" ? "MANHÃ" : shift === "tarde" ? "TARDE" : "NOITE"}
            </p>
          </div>
          <table class="grid-table-small" style="width:100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <th style="width: 28px; font-size: 5.5pt; border: 0.5pt solid black; padding: 1.5px 2px; font-weight: 800;">DIA</th>
                <th style="width: 25px; font-size: 5.5pt; border: 0.5pt solid black; padding: 1.5px 2px; font-weight: 800;">AULA</th>
                <th style="width: 45px; font-size: 5.5pt; border: 0.5pt solid black; padding: 1.5px 2px; font-weight: 800;">HORÁRIO</th>
                <th style="font-size: 5.5pt; border: 0.5pt solid black; padding: 1.5px 2px; font-weight: 800;">DISCIPLINA / PROF</th>
                ${isNightAsync ? `<th style="width: 80px; font-size: 5.5pt; border: 0.5pt solid black; padding: 1.5px 2px; font-weight: 800;">ASSÍNCRONA</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${DAYS.map((day) => {
                const asyncPeriodId = isNightAsync ? currentPeriods[5] : null;
                const asyncSlotKey = asyncPeriodId
                  ? `${day.id}-${asyncPeriodId}`
                  : "";
                let asyncSlot = null;
                if (asyncSlotKey) {
                  asyncSlot = schedules[turma.id]?.[asyncSlotKey] || null;
                  if (!asyncSlot) {
                    for (const rid in schedules) {
                      const room = turmas.find((t) => t.id === rid);
                      if (
                        room?.isRoom &&
                        schedules[rid][asyncSlotKey]?.associatedTurmaId ===
                          turma.id
                      ) {
                        asyncSlot = schedules[rid][asyncSlotKey];
                        break;
                      }
                    }
                  }
                }

                const asyncRowIndex = asyncSlot
                  ? getAsyncRowIndex(
                      day.id,
                      asyncSlot,
                      turma.id,
                      currentPeriods.slice(0, 5),
                      schedules,
                      teachers,
                      turmas,
                    )
                  : -1;

                return slicePeriods
                  .map((pId, pIndex) => {
                    const pName = `${pIndex + 1}ª`;
                    const time = currentTimeRanges[pIndex] || "-";
                    const slotKey = `${day.id}-${pId}`;
                    let slot = schedules[turma.id]?.[slotKey];

                    if (!slot) {
                      for (const rid in schedules) {
                        const room = turmas.find((t) => t.id === rid);
                        if (
                          room?.isRoom &&
                          schedules[rid][slotKey]?.associatedTurmaId ===
                            turma.id
                        ) {
                          slot = schedules[rid][slotKey];
                          break;
                        }
                      }
                    }

                    const teacher = teachers.find(
                      (t) => t.id === slot?.teacherId,
                    );
                    const actSub = slot
                      ? getActiveSubstitution(day.id, pId, slot.teacherId)
                      : null;
                    const subTeacher =
                      actSub && actSub.substituteTeacherId !== "none"
                        ? teachers.find(
                            (t) => t.id === actSub.substituteTeacherId,
                          )
                        : null;
                    const subject = subjects.find(
                      (s) => s.id === slot?.subjectId,
                    );
                    const associatedRoom = slot?.associatedRoomId
                      ? turmas.find((t) => t.id === slot.associatedRoomId)
                      : null;
                    const isGrayDay = day.id === "ter" || day.id === "qui";
                    const bgStyle = isGrayDay
                      ? "background-color: #f1f5f9 !important;"
                      : "background-color: #ffffff !important;";

                    let asyncCellHtml = "";
                    if (isNightAsync) {
                      if (pIndex === asyncRowIndex && asyncSlot) {
                        const asyncTeacher = teachers.find(
                          (t) => t.id === asyncSlot.teacherId,
                        );
                        const asyncSubject = subjects.find(
                          (s) => s.id === asyncSlot.subjectId,
                        );
                        asyncCellHtml = `
                        <td style="font-size: 6.2pt; border: 0.5pt solid black; padding: 1px 3px; text-align: left; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                          <span style="font-weight: 850; text-transform: uppercase;">${asyncSubject ? formatSubjectName(asyncSubject.name, 14) : "-"}</span>
                          ${asyncTeacher ? `<span style="font-size: 5.5pt; font-weight: 500; display: block; color: #334155;">${formatTeacherName(asyncTeacher.name)}</span>` : ""}
                        </td>
                      `;
                      } else {
                        asyncCellHtml = `
                        <td style="font-size: 6.2pt; border: 0.5pt solid black; padding: 1px 3px; text-align: center; color: #7f8c8d; font-weight: 500;">
                          **********
                        </td>
                      `;
                      }
                    }

                    let labBadge = associatedRoom
                      ? `<span style="display: inline-flex; align-items: center; justify-content: center; gap: 2px; padding: 1px 3px; margin-left: 2px; background-color: #f1f5f9; color: #334155; border-radius: 2px; font-size: 4pt; font-weight: 800; border: 1px solid #cbd5e1; vertical-align: middle;">${formatRoomBadgeName(associatedRoom.name)}${associatedRoom.icon ? `<span style="display: flex; width: 6px; height: 6px; color: #475569;">${getRoomIconHtml(associatedRoom.icon)}</span>` : ""}</span>`
                      : "";

                    return `
                    <tr style="${bgStyle}">
                      ${pIndex === 0 ? `<td rowspan="${desiredCount}" class="day-cell-small" style="font-weight: 950; font-size: 6.5pt; border: 0.5pt solid black; vertical-align: middle; text-align: center; background-color: ${day.printBg} !important; color: ${day.printText} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.1;">${day.label}</td>` : ""}
                      <td class="p-num-cell-small" style="font-size: 6pt; border: 0.5pt solid black; padding: 1px 2px; text-align: center; font-weight: 800; color: #1d4ed8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${pName}</td>
                      <td class="p-time-cell-small" style="font-size: 5.3pt; border: 0.5pt solid black; padding: 1px 2px; text-align: center; color: #475569 !important; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${time}</td>
                      <td style="font-size: 6.2pt; border: 0.5pt solid black; padding: 1px 3px; text-align: left; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                        <span style="font-weight: 850; text-transform: uppercase;">${subject ? formatSubjectName(subject.name, 14) : "-"}</span>
                        ${teacher ? `<span style="font-size: 5.5pt; font-weight: 500; display: flex; align-items: center; gap: 2px; color: #334155;">${formatTeacherName(teacher.name)} ${labBadge}</span>` : ""}
                      </td>
                      ${asyncCellHtml}
                    </tr>
                  `;
                  })
                  .join("");
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
      })
      .join("");

    const cols = sortedSelection.length;
    let cardWidth = "32%";
    if (cols === 2) cardWidth = "48%";
    else if (cols === 1) cardWidth = "98%";

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impresso Combinado - ${schoolName || "Gestão Escolar"}</title>
            <style>
              @page { size: A4 landscape; margin: 4mm; }
              body { 
                font-family: system-ui, -apple-system, sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                color: black;
                overflow: hidden !important;
              }
              .page-wrapper {
                width: 100%;
                display: flex;
                flex-direction: column;
                height: 194mm;
                max-height: 194mm;
                box-sizing: border-box;
              }
              .main-title {
                text-align: center;
                border-bottom: 2px solid black;
                margin-bottom: 6px;
                padding-bottom: 3px;
              }
              .main-title h1 {
                font-size: 10pt;
                margin: 0;
                font-weight: 900;
                text-transform: uppercase;
              }
              .main-title h2 {
                font-size: 8pt;
                margin: 1px 0 0 0;
                color: #334155;
                font-weight: 700;
              }
              .combined-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                width: 100%;
                justify-content: center;
                align-items: flex-start;
                
              }
              .combined-card {
                width: ${cardWidth};
                border: 1pt solid black;
                padding: 3px;
                border-radius: 4px;
                background: white;
                box-sizing: border-box;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              @media print {
                html, body {
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: visible !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .page-wrapper {
                  height: auto !important;
                  max-height: none !important;
                  page-break-after: auto !important;
                  break-after: auto !important;
                  page-break-inside: auto !important;
                  break-inside: auto !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="page-wrapper">
              <div class="main-title">
                <h1>${schoolName.toUpperCase()}</h1>
                <h2>Grade de Horários Combinada (Turmas Selecionadas na mesma Folha)</h2>
                ${academicStartDate ? `<div style="font-size: 8pt; color: #475569; font-weight: 600; text-transform: uppercase; margin-top: 1px;">PERÍODO LETIVO: ${academicPeriod}º ${academicSystem.toUpperCase()} (${academicStartDate} a ${academicEndDate})</div>` : ""}
              </div>
              <div class="combined-grid">
                ${cardsHtml}
              </div>
            </div>
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }

    setIsPrintingTurmaSelection(false);
  };

  const handlePrintPendingReport = () => {
    if (!autoGenResults) return;

    let pendingList = autoGenResults.pending;
    if (!enableNoite) {
      pendingList = pendingList.filter((item) => {
        const tObj = turmas.find(
          (t) => t.id === item.turmaId || t.name === item.turmaName,
        );
        if (tObj) {
          const shift =
            tObj.shift ||
            (tObj.id.toLowerCase().includes("noite") ||
            tObj.name.toLowerCase().includes("noite")
              ? "noite"
              : tObj.id.toLowerCase().includes("tarde") ||
                  tObj.name.toLowerCase().includes("tarde")
                ? "tarde"
                : "manha");
          return shift !== "noite";
        }
        return !item.turmaName.toLowerCase().includes("noite");
      });
    }

    if (pendingList.length === 0) {
      alert("Não há aulas pendentes para imprimir.");
      return;
    }

    const schoolNameText = schoolName || "CE LUCAS LENIAR";
    const dateStr = new Date().toLocaleString("pt-BR");
    const rateSuccess = Math.round(
      (autoGenResults.placedCount / (autoGenResults.scannedCount || 1)) * 100,
    );

    const tableRows = pendingList
      .map(
        (item, index) => `
      <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="text-align: center; font-weight: bold; color: #64748b; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${index + 1}</td>
        <td style="font-weight: bold; text-transform: uppercase; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.turmaName}</td>
        <td style="font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.subjectName}</td>
        <td style="font-weight: 600; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.teacherName}</td>
        <td style="color: #b45309; text-align: left; font-size: 7.2pt; font-family: sans-serif; line-height: 1.2; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.reason}</td>
      </tr>
    `,
      )
      .join("");

    const htmlContent = `
      <div style="width: 100%; margin: 0 auto; padding: 1px;">
        <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">
          <h1 style="font-size: 11pt; margin: 0; font-weight: 800; text-transform: uppercase; color: #0f172a; font-family: sans-serif;">${schoolNameText}</h1>
          <h2 style="font-size: 9.5pt; margin: 2px 0 0 0; color: #475569; font-weight: 700; font-family: sans-serif;">Relatório de Aulas Pendentes - Geração Automática</h2>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px; font-weight: 500; font-family: sans-serif;">Gerado em ${dateStr}</div>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 8px; font-family: sans-serif;">
          <div style=" background: #f1f5f9; padding: 4px 8px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 7.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Aulas Requeridas:</span>
            <span style="font-size: 11pt; font-weight: 800; color: #1e293b; font-family: monospace;">${autoGenResults.scannedCount}</span>
          </div>
          <div style=" background: #ecfdf5; padding: 4px 8px; border-radius: 6px; text-align: center; border: 1px solid #d1fae5; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 7.5pt; color: #047857; font-weight: bold; text-transform: uppercase;">Aulas Alocadas:</span>
            <span style="font-size: 11pt; font-weight: 800; color: #065f46; font-family: monospace;">${autoGenResults.placedCount} <span style="font-size: 8.5pt; font-weight: 600;">(${rateSuccess}%)</span></span>
          </div>
          <div style=" background: #fef3c7; padding: 4px 8px; border-radius: 6px; text-align: center; border: 1px solid #fde68a; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 7.5pt; color: #b45309; font-weight: bold; text-transform: uppercase;">Aulas Pendentes:</span>
            <span style="font-size: 11pt; font-weight: 800; color: #78350f; font-family: monospace;">${pendingList.length}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 7.8pt; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <th style="padding: 4px 3px; text-align: center; width: 30px; font-weight: 800; border: 0.5px solid #cbd5e1;">#</th>
              <th style="padding: 4px 6px; text-align: left; width: 100px; font-weight: 800; border: 0.5px solid #cbd5e1;">TURMA</th>
              <th style="padding: 4px 6px; text-align: left; width: 130px; font-weight: 800; border: 0.5px solid #cbd5e1;">DISCIPLINA</th>
              <th style="padding: 4px 6px; text-align: left; width: 130px; font-weight: 800; border: 0.5px solid #cbd5e1;">PROFESSOR</th>
              <th style="padding: 4px 6px; text-align: left; font-weight: 800; border: 0.5px solid #cbd5e1;">MOTIVO DA PENDÊNCIA</th>
            </tr>
          </thead>
          <tbody style="border-bottom: 1px solid #e2e8f0;">
            ${tableRows}
          </tbody>
        </table>

        <div style="margin-top: 8px; padding: 6px 10px; border-radius: 6px; background-color: #eff6ff; border: 1px solid #bfdbfe; font-size: 7pt; color: #1e3a8a; line-height: 1.3; font-family: sans-serif; page-break-inside: avoid;">
          <strong>Dica para solução:</strong> As pendências acontecem devido a choques de horário (professor já alocado no mesmo período em outra turma), falta de disponibilidade cadastrada para o professor (grades muito restritas), ou limites físicos em laboratórios/salas especiais. Verifique e ajuste as disponibilidades dos professores listados para que o algoritmo consiga alocar estas aulas com sucesso.
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório de Pendências - ${schoolName || "Gestão Escolar"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 4mm; }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                color: #1e293b;
              }
              tr {
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = () => { 
                setTimeout(() => { 
                  window.print(); 
                  window.close(); 
                }, 500); 
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleForceAllocatePending = () => {
    if (!autoGenResults || autoGenResults.pending.length === 0) return;

    setSchedules((prev: AllSchedules) => {
      const next = JSON.parse(JSON.stringify(prev)); // Deep copy to be safe

      const pList = [...autoGenResults.pending];

      for (const pending of pList) {
        const { turmaId, subjectId, teacherId, isDouble } = pending;
        const turma = turmas.find((t) => t.id === turmaId);
        if (!turma) continue;

        const classShift = getTurmaShift(turma);
        let shiftPeriods: number[] = [];
        if (classShift === "noite") shiftPeriods = PERIODS_NOITE;
        else if (classShift === "tarde") shiftPeriods = PERIODS_TARDE;
        else shiftPeriods = PERIODS_MANHA;

        let slotsNeeded = isDouble ? 2 : 1;

        for (const day of DAYS) {
          if (slotsNeeded <= 0) break;
          for (let i = 0; i < shiftPeriods.length; i++) {
            const p = shiftPeriods[i];

            if (getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5) {
              if (classShift === "manha" && p === 6) continue;
              if (classShift === "tarde" && p === 12) continue;
              if (
                classShift === "noite" &&
                p === 18 &&
                !enableNoiteAsynchronous
              )
                continue;
            }

            const slotId = `${day.id}-${p}`;
            if (!next[turmaId]) next[turmaId] = {};

            const existing = next[turmaId][slotId];
            if (!existing || (!existing.teacherId && !existing.subjectId)) {
              if (slotsNeeded > 0) {
                next[turmaId][slotId] = { subjectId, teacherId };
                slotsNeeded--;
                if (slotsNeeded <= 0) break;
              }
            }
          }
        }

        // Second pass: if STILL slots needed (Turma is completely full), force overwrite FIRST available slots
        if (slotsNeeded > 0) {
          for (const day of DAYS) {
            if (slotsNeeded <= 0) break;
            for (let i = 0; i < shiftPeriods.length; i++) {
              const p = shiftPeriods[i];
              if (getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5) {
                if (classShift === "manha" && p === 6) continue;
                if (classShift === "tarde" && p === 12) continue;
                if (
                  classShift === "noite" &&
                  p === 18 &&
                  !enableNoiteAsynchronous
                )
                  continue;
              }
              const slotId = `${day.id}-${p}`;
              if (!next[turmaId]) next[turmaId] = {};

              if (slotsNeeded > 0) {
                next[turmaId][slotId] = { subjectId, teacherId };
                slotsNeeded--;
                if (slotsNeeded <= 0) break;
              }
            }
          }
        }
      }
      return next;
    });

    setAutoGenResults((prev) =>
      prev
        ? {
            ...prev,
            solved: true,
            placedCount: prev.scannedCount, // technically forced
            pending: [], // clear pending since we just forced them
          }
        : null,
    );

    setIsAutoGenerateResultsModalOpen(false);
  };

  const handlePrintMissingClassesReport = () => {
    // Collect all missing classes across the configured subset of turmas
    const pendingItems: {
      turma: string;
      shift: string;
      subject: string;
      expected: number;
      allocated: number;
      missing: number;
      extra: number;
    }[] = [];

    let activeTurmas = turmas.filter((t) => !t.isRoom);

    if (!enableNoite) {
      activeTurmas = activeTurmas.filter((t) => {
        const shift =
          t.shift ||
          (t.id.toLowerCase().includes("noite") ||
          t.name.toLowerCase().includes("noite")
            ? "noite"
            : t.id.toLowerCase().includes("tarde") ||
                t.name.toLowerCase().includes("tarde")
              ? "tarde"
              : "manha");
        return shift !== "noite";
      });
    }

    // Apply active shift filters to printed report
    if (missingClassesShift === "manha") {
      activeTurmas = activeTurmas.filter((t) => {
        if (t.shift) return t.shift === "manha";
        return (
          !t.name.toLowerCase().includes("tarde") &&
          !t.id.toLowerCase().includes("tarde") &&
          !t.name.toLowerCase().includes("noite") &&
          !t.id.toLowerCase().includes("noite")
        );
      });
    } else if (missingClassesShift === "tarde") {
      activeTurmas = activeTurmas.filter((t) => {
        if (t.shift) return t.shift === "tarde";
        return (
          (t.name.toLowerCase().includes("tarde") ||
            t.id.toLowerCase().includes("tarde")) &&
          !t.name.toLowerCase().includes("noite") &&
          !t.id.toLowerCase().includes("noite")
        );
      });
    } else if (missingClassesShift === "noite") {
      activeTurmas = activeTurmas.filter((t) => {
        if (t.shift) return t.shift === "noite";
        return (
          t.name.toLowerCase().includes("noite") ||
          t.id.toLowerCase().includes("noite")
        );
      });
    }

    // Apply active search filter to printed report
    if (missingClassesSearch.trim()) {
      const searchLower = missingClassesSearch.toLowerCase();
      activeTurmas = activeTurmas.filter((t) => {
        const matchesTurma = t.name.toLowerCase().includes(searchLower);
        const matchesSubject = subjects.some((s) => {
          const hasThisSubject =
            getSubjectWorkloadsForTurma(s, t.id).workload > 0;
          return hasThisSubject && s.name.toLowerCase().includes(searchLower);
        });
        return matchesTurma || matchesSubject;
      });
    }

    // Apply print choice based on UI filter
    if (missingClassesFilter !== "todos") {
      activeTurmas = activeTurmas.filter((t) => {
        return subjects.some((s) => {
          const { usage, total } = getClassSubjectWorkload(t.id, s.id);
          if (missingClassesFilter === "faltantes") {
            return total > 0 && usage < total;
          } else if (missingClassesFilter === "excesso") {
            return usage > total;
          } else if (missingClassesFilter === "ok") {
            return total > 0 && usage === total;
          }
          return true;
        });
      });
    }

    activeTurmas.forEach((t) => {
      subjects.forEach((s) => {
        // If searching, restrict to searched subjects
        if (missingClassesSearch.trim()) {
          const sNameLower = s.name.toLowerCase();
          const tNameLower = t.name.toLowerCase();
          const searchLower = missingClassesSearch.toLowerCase();
          if (
            !sNameLower.includes(searchLower) &&
            !tNameLower.includes(searchLower)
          ) {
            return;
          }
        }

        const { total, usage } = getClassSubjectWorkload(t.id, s.id);

        let shouldPrint = true;
        if (missingClassesFilter !== "todos") {
          if (
            missingClassesFilter === "faltantes" &&
            !(total > usage && total > 0)
          )
            shouldPrint = false;
          if (missingClassesFilter === "excesso" && !(usage > total))
            shouldPrint = false;
          if (missingClassesFilter === "ok" && !(total > 0 && usage === total))
            shouldPrint = false;
        }

        if (shouldPrint && (total > 0 || usage > 0)) {
          pendingItems.push({
            turma: t.name,
            shift:
              t.shift === "manha"
                ? "Manhã"
                : t.shift === "tarde"
                  ? "Tarde"
                  : "Noite",
            subject: s.name,
            expected: total,
            allocated: usage,
            missing: Math.max(0, total - usage),
            extra: Math.max(0, usage - total),
          });
        }
      });
    });

    if (pendingItems.length === 0) {
      alert(
        "Nenhum item encontrado com as opções de impressão e filtros selecionados.",
      );
      return;
    }

    // Sorting items by Class name first, then subject
    pendingItems.sort(
      (a, b) =>
        a.turma.localeCompare(b.turma, undefined, { numeric: true }) ||
        a.subject.localeCompare(b.subject),
    );

    const schoolNameText = schoolName || "CE LUCAS LENIAR";
    const dateStr = new Date().toLocaleString("pt-BR");
    const academicStr = `Período: ${academicPeriod}º ${academicSystem} ${academicStartDate ? `(${academicStartDate} a ${academicEndDate})` : ""}`;

    const availabilityWarnings: string[] = [];
    teachers.forEach((t) => {
      let totalRequiredWorkload = 0;
      if (t.schoolWorkload !== undefined) {
        totalRequiredWorkload = t.schoolWorkload;
      } else if (
        t.schoolWorkloadManha !== undefined ||
        t.schoolWorkloadTarde !== undefined ||
        t.schoolWorkloadNoite !== undefined
      ) {
        totalRequiredWorkload =
          (t.schoolWorkloadManha || 0) +
          (t.schoolWorkloadTarde || 0) +
          (t.schoolWorkloadNoite || 0);
      } else {
        subjects.forEach((s) => {
          if (t.subjectIds && t.subjectIds.includes(s.id)) {
            turmas.forEach((tu) => {
              if (!tu.isRoom) {
                const teachesThisTurma = isTeacherEligibleForSubjectInTurma(
                  t,
                  s.id,
                  tu.id,
                );
                if (teachesThisTurma) {
                  const otherEligibles = teachers.filter(
                    (otherT) =>
                      otherT.id !== t.id &&
                      isTeacherEligibleForSubjectInTurma(otherT, s.id, tu.id),
                  );
                  let countThisClass = true;
                  if (otherEligibles.length > 0) {
                    const hasExplicitLink =
                      (t.turmaIds && t.turmaIds.includes(tu.id)) ||
                      (t.subjectTurmaMap &&
                        t.subjectTurmaMap[s.id] &&
                        t.subjectTurmaMap[s.id].includes(tu.id));
                    if (hasExplicitLink) {
                      countThisClass = true;
                    } else {
                      const classHasThisTeacher = Object.values(
                        schedules[tu.id] || {},
                      ).some(
                        (slot: any) =>
                          slot?.teacherId === t.id && slot?.subjectId === s.id,
                      );
                      const classHasOtherTeacher = Object.values(
                        schedules[tu.id] || {},
                      ).some(
                        (slot: any) =>
                          slot?.teacherId &&
                          slot.teacherId !== t.id &&
                          slot?.subjectId === s.id,
                      );
                      if (classHasThisTeacher) {
                        countThisClass = true;
                      } else if (classHasOtherTeacher) {
                        countThisClass = false;
                      } else {
                        countThisClass = false;
                      }
                    }
                  }
                  if (countThisClass) {
                    const { workload } = getSubjectWorkloadsForTurma(s, tu.id);
                    totalRequiredWorkload += workload;
                  }
                }
              }
            });
          }
        });
      }

      let hasAvailabilityList = false;
      let totalAvailableSlots = 0;
      let manhaSlots = 0,
        tardeSlots = 0,
        noiteSlots = 0;

      const totalManhaBoard = 5 * 6; // 30
      const totalTardeBoard = 5 * 6; // 30
      const totalNoiteBoard = enableNoite ? 5 * 5 : 0; // 25

      if (t.unavailability && t.unavailability.length > 0) {
        hasAvailabilityList = true;
        const unManha = t.unavailability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 1 && p <= 6;
        }).length;
        const unTarde = t.unavailability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 7 && p <= 12;
        }).length;
        const unNoite = t.unavailability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 13 && p <= 17;
        }).length;

        manhaSlots = totalManhaBoard - unManha;
        tardeSlots = totalTardeBoard - unTarde;
        noiteSlots = totalNoiteBoard - unNoite;
        totalAvailableSlots = manhaSlots + tardeSlots + noiteSlots;
      } else if (t.availability && t.availability.length > 0) {
        // Legacy
        hasAvailabilityList = true;
        totalAvailableSlots = t.availability.length;
        manhaSlots = t.availability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 1 && p <= 6;
        }).length;
        tardeSlots = t.availability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 7 && p <= 12;
        }).length;
        noiteSlots = t.availability.filter((s) => {
          const p = parseInt(s.split("-")[1] || "0", 10);
          return p >= 13 && p <= 17;
        }).length;
      }

      if (
        totalRequiredWorkload > 0 &&
        hasAvailabilityList &&
        totalAvailableSlots < totalRequiredWorkload
      ) {
        availabilityWarnings.push(
          `Geral: ${t.name} precisa lecionar no total ${totalRequiredWorkload} aula(s), mas tem apenas ${totalAvailableSlots} slot(s) de disponibilidade.`,
        );
      }
      if (
        t.schoolWorkloadManha !== undefined &&
        hasAvailabilityList &&
        manhaSlots < t.schoolWorkloadManha
      ) {
        availabilityWarnings.push(
          `Manhã: ${t.name} precisa lecionar ${t.schoolWorkloadManha} aula(s) de Manhã, mas tem apenas ${manhaSlots} slot(s) de disponibilidade na manhã.`,
        );
      }
      if (
        t.schoolWorkloadTarde !== undefined &&
        hasAvailabilityList &&
        tardeSlots < t.schoolWorkloadTarde
      ) {
        availabilityWarnings.push(
          `Tarde: ${t.name} precisa lecionar ${t.schoolWorkloadTarde} aula(s) de Tarde, mas tem apenas ${tardeSlots} slot(s) de disponibilidade na tarde.`,
        );
      }
      if (
        t.schoolWorkloadNoite !== undefined &&
        hasAvailabilityList &&
        noiteSlots < t.schoolWorkloadNoite &&
        enableNoite
      ) {
        availabilityWarnings.push(
          `Noite: ${t.name} precisa lecionar ${t.schoolWorkloadNoite} aula(s) de Noite, mas tem apenas ${noiteSlots} slot(s) de disponibilidade na noite.`,
        );
      }

      let countManha = 0;
      let countTarde = 0;
      let countNoite = 0;
      Object.entries(schedules || {}).forEach(
        ([tid, turmaSched]: [string, any]) => {
          const isRoom = turmas.find((roomT) => roomT.id === tid)?.isRoom;
          if (!turmaSched || isRoom) return;
          Object.entries(turmaSched).forEach(
            ([slotId, slotVal]: [string, any]) => {
              if (slotVal && slotVal.teacherId === t.id) {
                const p = parseInt(slotId.split("-")[1] || "0", 10);
                if (p >= 1 && p <= 6) countManha++;
                else if (p >= 7 && p <= 12) countTarde++;
                else if (p >= 13 && p <= 17) countNoite++;
              }
            },
          );
        },
      );

      const totalAllocated =
        countManha + countTarde + (enableNoite ? countNoite : 0);
      if (t.schoolWorkload !== undefined && totalAllocated > t.schoolWorkload) {
        availabilityWarnings.push(
          `Excesso: ${t.name} está com ${totalAllocated} aula(s) alocada(s), ultrapassando seu limite geral de ${t.schoolWorkload} aula(s).`,
        );
      }
    });

    const tableRows = pendingItems
      .map(
        (item, index) => `
      <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        <td style="text-align: center; font-weight: bold; color: #64748b; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${index + 1}</td>
        <td style="font-weight: bold; text-transform: uppercase; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.turma} (${item.shift})</td>
        <td style="font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px;">${item.subject}</td>
        <td style="text-align: center; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px; font-weight: 500;">${item.expected}</td>
        <td style="text-align: center; font-family: sans-serif; font-size: 7.5pt; border: 0.5px solid #cbd5e1; padding: 3px 5px; font-weight: 500; color: #16a34a;">${item.allocated}</td>
        <td style="text-align: center; font-family: sans-serif; font-size: 8pt; border: 0.5px solid #cbd5e1; padding: 3px 5px; font-weight: 800; color: ${item.missing > 0 ? "#dc2626" : "#1e293b"}; background-color: ${item.missing > 0 ? "#fef2f2" : "transparent"};">${item.missing}</td>
      </tr>
    `,
      )
      .join("");

    const warningSection =
      availabilityWarnings.length > 0
        ? `
      <div style="margin-top: 10px; page-break-inside: avoid;">
        <h4 style="font-family: sans-serif; font-size: 8.5pt; font-weight: 800; color: #9a3412; border-bottom: 2px solid #fed7aa; padding-bottom: 2px; margin-bottom: 4px; text-transform: uppercase;">Avisos de Conflitos e Cargas de Professores</h4>
        <ul style="padding-left: 15px; font-family: sans-serif; font-size: 7.5pt; color: #475569; line-height: 1.3; margin: 0;">
          ${availabilityWarnings.map((warn) => `<li style="margin-bottom: 2px;">${warn}</li>`).join("")}
        </ul>
      </div>
    `
        : "";

    const printReportMode = "pending_only"; // fallback
    const subtitleModeText =
      printReportMode === "pending_only"
        ? "Apenas com Aulas Faltantes / Pendências"
        : "Relatório Completo - Todas as Classes";
    const activeFiltersText = [
      missingClassesShift !== "todos"
        ? `Turno: ${missingClassesShift === "manha" ? "Manhã" : missingClassesShift === "tarde" ? "Tarde" : "Noite"}`
        : "",
      missingClassesSearch.trim() ? `Busca: "${missingClassesSearch}"` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const htmlContent = `
      <div style="max-width: 100%; margin: 0 auto; padding: 2px;">
        <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: 8px;">
          <h1 style="font-size: 11pt; margin: 0; font-weight: 800; text-transform: uppercase; color: #0f172a; font-family: sans-serif;">${schoolNameText}</h1>
          <h2 style="font-size: 9.5pt; margin: 2px 0 0 0; color: #b45309; font-weight: 700; font-family: sans-serif; text-transform: uppercase;">Diagnóstico de Aulas Faltantes (Grade Horária)</h2>
          <div style="font-size: 7.5pt; color: #1e293b; margin-top: 3px; font-weight: 700; font-family: sans-serif; text-transform: uppercase; letter-spacing: 0.3px;">${subtitleModeText}</div>
          <div style="font-size: 7pt; color: #64748b; margin-top: 2px; font-weight: 500; font-family: sans-serif;">
            ${academicStr} • Gerado em ${dateStr} ${activeFiltersText ? `• ${activeFiltersText}` : ""}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 7.5pt; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <th style="padding: 4px 3px; text-align: center; width: 30px; font-weight: 800; border: 0.5px solid #cbd5e1;">#</th>
              <th style="padding: 4px 6px; text-align: left; width: 140px; font-weight: 800; border: 0.5px solid #cbd5e1;">TURMA</th>
              <th style="padding: 4px 6px; text-align: left; font-weight: 800; border: 0.5px solid #cbd5e1;">DISCIPLINA</th>
              <th style="padding: 4px 6px; text-align: center; width: 70px; font-weight: 800; border: 0.5px solid #cbd5e1;">LMT</th>
              <th style="padding: 4px 6px; text-align: center; width: 70px; font-weight: 800; border: 0.5px solid #cbd5e1;">USO</th>
              <th style="padding: 4px 6px; text-align: center; width: 80px; font-weight: 800; border: 0.5px solid #cbd5e1;">STATUS</th>
            </tr>
          </thead>
          <tbody style="border-bottom: 1px solid #e2e8f0;">
            ${pendingItems
              .map((item, index) => {
                let statusStr = "OK";
                let statusColor = "#1e293b";
                let statusBg = "transparent";
                if (item.missing > 0) {
                  statusStr = `FALTA ${item.missing}`;
                  statusColor = "#dc2626";
                  statusBg = "#fef2f2";
                } else if (item.extra > 0) {
                  statusStr = `SOBRA ${item.extra}`;
                  statusColor = "#d97706";
                  statusBg = "#fffbeb";
                }
                return `
              <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8fafc"}; text-align: left; border-bottom: 0.5px solid #e2e8f0;">
                <td style="padding: 3px 3px; text-align: center; color: #64748b; font-weight: bold; border: 0.5px solid #cbd5e1;">${index + 1}</td>
                <td style="padding: 3px 6px; font-weight: 800; font-size: 7.5pt; text-transform: uppercase; border: 0.5px solid #cbd5e1;">${item.turma} <span style="color:#64748b; font-size:5.5pt; padding-left: 2px;">(${item.shift})</span></td>
                <td style="padding: 3px 6px; font-size: 7.5pt; font-weight: 600; text-transform: uppercase; border: 0.5px solid #cbd5e1;">${item.subject}</td>
                <td style="padding: 3px 6px; text-align: center; font-weight: bold; color: #1e293b; border: 0.5px solid #cbd5e1;">${item.expected}</td>
                <td style="padding: 3px 6px; text-align: center; font-weight: bold; color: #0f766e; border: 0.5px solid #cbd5e1;">${item.allocated}</td>
                <td style="padding: 3px 6px; text-align: center; font-weight: 900; font-size: 7pt; color: ${statusColor}; background-color: ${statusBg}; border: 0.5px solid #cbd5e1;">${statusStr}</td>
              </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>

         ${warningSection}

        <div style="margin-top: 10px; padding: 6px 10px; border-radius: 6px; background-color: #fef3c7; border: 1px solid #fde68a; font-size: 7pt; color: #78350f; line-height: 1.3; font-family: sans-serif; page-break-inside: avoid;">
          <strong>Atenção:</strong> Dê preferência às disciplinas listadas acima, organizando a agenda dos professores correspondentes. Lembre-se de verificar se as restrições e limites de carga horária coincidem.
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório de Aulas Faltantes - ${schoolName || "Gestão Escolar"}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 4mm; }
              * { box-sizing: border-box; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                background: white; 
                color: #1e293b;
              }
              tr {
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = () => { 
                setTimeout(() => { 
                  window.print(); 
                  window.close(); 
                }, 500); 
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId);

  return (
    <>
      <AnimatePresence>
        {/* We use inline skeleton loader over cards now instead of this popup
        {isGenerating && ( ... )}
        */}
      </AnimatePresence>
      <ValidationPanel isOpen={isValidationPanelOpen} onClose={() => setIsValidationPanelOpen(false)} teachers={teachers} subjects={subjects} turmas={turmas} schedules={schedules} />
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <div
          className={
            isHorariosRoute
              ? "flex-1 flex flex-col space-y-2 animate-in fade-in duration-700 pb-1 overflow-hidden"
              : "hidden"
          }
        >
          {/* Action Bar / Navigation (Optimized For Compactness & Responsive Layout) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden flex flex-col lg:flex-row lg:items-center justify-between p-2 px-3 gap-2 overflow-hidden">
            <div className="flex items-center justify-between lg:justify-start gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-[3px] h-[16px] bg-indigo-650 rounded-full shrink-0"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tighter">
                    GRADE HORÁRIA
                  </span>
                  <span className="text-[7.5px] font-extrabold text-slate-400 uppercase leading-none mt-0.5">
                    Painel de Controle
                  </span>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg items-center border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode("turmas")}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${viewMode === "turmas" ? "bg-white shadow-xs text-indigo-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
                  title="Visualizar por Turmas"
                >
                  <Users className="w-3 h-3" />
                  <span>Turmas</span>
                </button>
                <button
                  onClick={() => setViewMode("rooms")}
                  className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${viewMode === "rooms" ? "bg-white shadow-xs text-indigo-700 font-black" : "text-slate-500 hover:text-slate-800"}`}
                  title="Visualizar por Salas"
                >
                  <School className="w-3 h-3" />
                  <span>Salas</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Shift Selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg items-center border border-slate-200 shrink-0">
                <button
                  onClick={() => setImportShift("manha")}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${importShift === "manha" ? "bg-white shadow-xs text-slate-900 font-black" : "text-slate-400 hover:text-slate-600"}`}
                  title="Turno Manhã"
                >
                  Manhã
                </button>
                <button
                  onClick={() => setImportShift("tarde")}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${importShift === "tarde" ? "bg-white shadow-xs text-slate-900 font-black" : "text-slate-400 hover:text-slate-600"}`}
                  title="Turno Tarde"
                >
                  Tarde
                </button>
                {enableNoite && (
                  <button
                    onClick={() => setImportShift("noite")}
                    className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${importShift === "noite" ? "bg-white shadow-xs text-slate-900 font-black" : "text-slate-400 hover:text-slate-600"}`}
                    title="Turno Noite"
                  >
                    Noite
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setIsWizardOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200/50 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Assistente de Configuração Passo a Passo"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assistente IA</span>
              </button>

              <button
                onClick={() => setIsAutoGenerateModalOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-750 border border-emerald-200/50 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Gerar Horários de Forma Automática e Inteligente"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Gerar Grade</span>
              </button>

              <button
                onClick={() => setIsValidationPanelOpen(true)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-750 border border-blue-200/50 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Abrir Painel de Validação e Detecção de Erros"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Validar</span>
              </button>

              <button
                onClick={() => setIsPrintingTurmaSelection(true)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-750 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Imprimir Quadro de Horários"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => setIsClearingSelection(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-200/50 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Limpar Grade de Horários"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

            {/* Suggested Allocation Banner */}
            {tempSubject && !selectedSlot && (
              <div className="mx-6 my-3 p-3 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl flex items-center justify-between text-emerald-800 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                  <span className="text-xs font-bold font-sans">
                    SUGESTÃO DE ALOCAÇÃO: Clique em qualquer horário em branco na grade da turma <strong className="font-black text-emerald-950">{turmas.find(t => t.id === selectedTurmaId)?.name}</strong> para alocar a disciplina <strong className="font-black text-emerald-950">{subjects.find(s => s.id === tempSubject)?.name}</strong>{tempTeacher ? " com o Prof. " : ""}{tempTeacher ? <strong className="font-black text-emerald-950">{teachers.find(t => t.id === tempTeacher)?.name}</strong> : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setTempSubject(""); setTempTeacher(""); }}
                    className="text-emerald-600 hover:text-emerald-850 text-[10px] font-black uppercase tracking-wider bg-white px-3 py-1.5 rounded-lg border border-emerald-200 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAutoAssignSuggestion}
                    className="text-white hover:text-emerald-50 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-700 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    Efetuar
                  </button>
                </div>
              </div>
            )}
            
            {/* MAIN TABLE WRAPPER */}
            <div className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar">
               <table 
                 style={{ 
                   width: `${(viewMode === "turmas" ? displayedTurmas.length : turmas.filter(t => t.isRoom).length) * 110 + 70}px`, 
                   minWidth: "100%" 
                 }}
                 className="border-collapse border-spacing-0 table-fixed select-none"
               >
                 <thead>
                   <tr className="bg-slate-100 border-b border-slate-300 sticky top-0 z-20">
                     <th style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }} className="bg-slate-100 sticky left-0 z-40 border-r border-slate-300"></th>
                     <th style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }} className="bg-slate-100 sticky left-[40px] z-40 border-r border-slate-300"></th>
                     {viewMode === "turmas"
                       ? displayedTurmas.map((t) => (
                           <th key={t.id} style={{ width: "95px", minWidth: "95px", maxWidth: "95px" }} className="p-0 border-r border-slate-300 text-[10px] font-black uppercase tracking-tight text-slate-900 bg-slate-100">
                             <div className="flex items-center justify-between px-1 py-2 group">
                               <span className="truncate">{t.name}</span>
                               <button onClick={(e) => { e.stopPropagation(); setConfirmConfig({title: "Remover Turma", message: "Deseja realmente remover a turma " + t.name + "?", confirmText: "Remover", cancelText: "Cancelar", onConfirm: () => removeTurma(t.id)}); }} className="print:hidden opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                             </div>
                           </th>
                         ))
                       : sortSpecialRooms(turmas.filter((t) => t.isRoom)).map((t) => (
                           <th key={t.id} style={{ width: "95px", minWidth: "95px", maxWidth: "95px", backgroundColor: t.color || "#6366f1" }} className="p-0 border-r border-slate-300 text-[10px] font-black uppercase tracking-tight text-white">
                             <div className="flex items-center justify-center gap-1 px-1 py-2 group relative">
                               <span className="truncate">{t.name}</span>
                             </div>
                           </th>
                         ))
                     }
                   </tr>
                 </thead>
                 <tbody>
                   {DAYS.map(day => {
                     const isGrayDay = day.id === "ter" || day.id === "qui";
                     const validPeriods = importShift === "manha"
                        ? [1,2,3,4,5,6]
                        : importShift === "tarde"
                          ? [7,8,9,10,11,12]
                          : [13,14,15,16,17,18];
                     const totalRows = validPeriods.length;
                     return validPeriods.map((actualPeriod, pIndex) => {
                       const slotId = `${day.id}-${actualPeriod}`;
                       const isLastPeriodOfDay = pIndex === totalRows - 1;
                       return [
                          <tr key={slotId} className={`group/row border-b ${isLastPeriodOfDay ? "border-slate-350 border-b-2" : "border-slate-200"}`}>
                           {pIndex === 0 && (
                             <td rowSpan={totalRows + (totalRows > 2 ? 1 : 0)} style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }} className={`${day.screenBg || 'bg-slate-800'} text-white p-0 border-r border-slate-300 sticky left-0 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.1)]`}>
                               <div className="flex items-center justify-center h-full w-full">
                                 <span className="text-[10px] font-black uppercase [writing-mode:vertical-lr] rotate-180 text-center tracking-widest whitespace-nowrap">{day.label}</span>
                               </div>
                             </td>
                           )}
                           <td style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }} className="bg-slate-50 border-r border-slate-200 sticky left-[40px] z-40">
                             <div className="flex items-center justify-center h-full w-full">
                               <span className="text-[10px] font-black text-slate-400">{pIndex + 1}ª</span>
                             </div>
                           </td>
                           {(viewMode === "turmas" ? displayedTurmas : sortSpecialRooms(turmas.filter(t => t.isRoom))).map(turma => {
                             const isPeriodOut = viewMode === "turmas" && getEffectiveDailyClassCount(turma, isCivicoMilitar) === 5 && pIndex === 5 && !(importShift === "noite" && enableNoiteAsynchronous);
                             if (isPeriodOut) {
                               return <td key={turma.id} style={{ width: "95px", minWidth: "95px", maxWidth: "95px", height: "22px" }} className="p-0 border-none bg-transparent"></td>;
                             }
                             const slotData = schedules[turma.id]?.[slotId];
                             const teacher = teachers.find(t => t.id === slotData?.teacherId);
                             const subject = subjects.find(s => s.id === slotData?.subjectId);
                             const associatedTurma = turmas.find(t => t.id === slotData?.associatedTurmaId);
                             const conflicts = getConflicts(day.id, actualPeriod, slotData?.teacherId || "", turma.id, slotId);
                             const activeSub = getActiveSubstitution(day.id, actualPeriod, teacher?.id || "");
                             const subTeacher = activeSub ? teachers.find(t => t.id === activeSub.substituteTeacherId) : null;
                             
                             let cellBg = isGrayDay ? "bg-slate-50" : "bg-white";
                             let isDimmed = false;
                             let customStyle = { width: "95px", minWidth: "95px", maxWidth: "95px", height: "22px", minHeight: "22px", maxHeight: "22px" };
                             if (draggingSource) {
                               const check = validateDragAndDrop(draggingSource.turmaId, draggingSource.slotId, turma.id, slotId);
                               if (check.isValid) {
                                 cellBg = "bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shadow-[inset_0_0_0_2px_rgba(16,185,129,0.3)] hover:shadow-[inset_0_0_0_2px_rgba(16,185,129,0.6)] cursor-pointer";
                               } else {
                                 cellBg = "bg-rose-50 border-rose-200 cursor-not-allowed opacity-90";
                               }
                             } else if (clickMoveSource) {
                               if (clickMoveSource.turmaId === turma.id && clickMoveSource.slotId === slotId) {
                                 cellBg = "bg-indigo-150 border-2 border-indigo-650 animate-pulse shadow-[inset_0_0_0_2px_rgba(99,102,241,0.4)] z-10 scale-[1.02]";
                               } else {
                                 const check = validateDragAndDrop(clickMoveSource.turmaId, clickMoveSource.slotId, turma.id, slotId);
                                 if (check.isValid) {
                                   cellBg = "bg-emerald-50/70 hover:bg-emerald-100/90 hover:scale-[0.98] transition-all cursor-pointer border border-emerald-200/50";
                                 } else {
                                   cellBg = "bg-rose-50/50 opacity-60 cursor-not-allowed";
                                 }
                               }
                             }

                             return (
                               <ScheduleCell 
                                  key={turma.id}
                                  turma={turma} day={day} actualPeriod={actualPeriod} slot={slotData} teacher={teacher} subject={subject} associatedTurma={associatedTurma} conflicts={conflicts} activeSub={activeSub} subTeacher={subTeacher} isGrayDay={isGrayDay} enableNoiteAsynchronous={enableNoiteAsynchronous} importShift={importShift} viewMode={viewMode} isLoading={false} isDragTargetValid={true} dragInvalidReason={""} errorCell={errorCell} draggedOverCell={draggedOverCell} cellBg={cellBg} customStyle={customStyle} slotId={slotId} turmas={turmas} schedules={schedules} isDimmed={isDimmed} draggingSource={draggingSource} handleSlotClick={handleSlotClick} setHoveredTeacherId={setHoveredTeacherId} handleDragOver={handleDragOver} handleDrop={handleDrop} handleDragLeave={handleDragLeave} handleDragStart={handleDragStart} handleDragEnd={handleDragEnd} setSchedules={setSchedules} setIsSaved={setIsSaved}
                               />
                             );
                           })}
                         </tr>,
                          pIndex === 2 && (
                            <tr key={`interval-${day.id}-${actualPeriod}`} className="bg-slate-400 border-b border-slate-500 select-none">
                              <td className="sticky left-[40px] z-40 bg-slate-400 border-r border-slate-500"></td>
                              <td 
                                colSpan={(viewMode === "turmas" ? displayedTurmas : sortSpecialRooms(turmas.filter(t => t.isRoom))).length}
                                className="py-0 px-4 text-center text-[5px] font-black tracking-[0.2em] uppercase text-white bg-slate-400 border-r border-slate-500 h-[6px] max-h-[6px]"
                              >
                                <div className="flex items-center justify-center gap-2 h-full py-0">
                                  <span>INTERVALO ({importShift === "manha" ? "10h00 - 10h20" : importShift === "tarde" ? "15h30 - 15h50" : "21h15 - 21h30"})</span>
                                </div>
                              </td>
                            </tr>
                          )
                        ]
                      })
                    })}
                 </tbody>
               </table>
            </div>

            {/* Edit Panel */}
            <AnimatePresence>
              {selectedSlot && selectedTurmaId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[90%] max-w-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Editar Aula: {selectedSlot}</h3>
                    <button onClick={() => { setSelectedSlot(null); setPendingLabConflict(null); }} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(!tempSubject && !tempTeacher) && (
                      <button 
                        onClick={handleAutoFillEmptySlot}
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Alocar Pendente
                      </button>
                    )}
                    {(tempTeacher || tempSubject) && (
                      <button 
                        onClick={handleAutoResolveConflict}
                        className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Mover para Resolver Conflito
                      </button>
                    )}
                  </div>
                  
                  {/* Edit Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Disciplina</label>
                      <select
                        value={tempSubject}
                        onChange={(e) => {
                          const newSubId = e.target.value;
                          setTempSubject(newSubId);
                          const sub = subjects.find(s => s.id === newSubId);
                          if (sub && sub.roomIds && sub.roomIds.length > 0) {
                            setTempAssociatedRoomId(sub.roomIds[0]);
                          }
                          if (newSubId) {
                            const matchingTeacher = teachers.find(t => t.subjectIds?.includes(newSubId) && t.turmaIds?.includes(selectedTurmaId!));
                            if (matchingTeacher) {
                              setTempTeacher(matchingTeacher.id);
                            } else {
                              const subTeacher = teachers.find(t => t.subjectIds?.includes(newSubId));
                              if (subTeacher) setTempTeacher(subTeacher.id);
                              else setTempTeacher("");
                            }
                          } else {
                            setTempTeacher("");
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        <option value="">-- Selecione --</option>
                        {subjects.map((s) => {
                          const targetTId = viewMode === "rooms" ? tempAssociatedTurmaId : selectedTurmaId;
                          const turma = turmas.find(t => t.id === targetTId);
                          let required = s.workload || 0;
                          let allocated = 0;
                          
                          if (turma) {
                            if (s.customWorkloads && s.customWorkloads[turma.id] !== undefined) {
                              required = s.customWorkloads[turma.id];
                            } else if (turma.isTechnical && s.isTechnical) {
                              required = s.classWorkload || 0;
                            } else if (s.levelConstraint === "fundamental" && (turma.name.toLowerCase().includes("fundamental") || turma.name.toLowerCase().includes("ano"))) { 
                              required = s.workloadFundamental || required;
                            } else if (s.levelConstraint === "medio" && (turma.name.toLowerCase().includes("medio") || turma.name.toLowerCase().includes("médio") || turma.name.toLowerCase().includes("série"))) { 
                              required = s.workloadMedio || required;
                            }
                            
                            const tSched = schedules[turma.id] || {};
                            Object.values(tSched).forEach((slot: any) => {
                              if (slot.subjectId === s.id && slot.teacherId) {
                                allocated++;
                              }
                            });
                          }
                          
                          const isComplete = allocated >= required;
                          const hasDef = !!turma && required > 0;
                          const color = !hasDef ? "#94a3b8" : (isComplete ? "#ef4444" : "#10b981");
                          const statusText = hasDef ? ` (${allocated}/${required})` : "";
                          const prefix = !hasDef ? "➖" : (isComplete ? "🔴" : "🟢");
                          
                          return (
                            <option key={s.id} value={s.id} style={{ color, fontWeight: 'bold' }}>
                              {prefix} {s.name}{statusText}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Professor</label>
                      <select
                        value={tempTeacher}
                        onChange={(e) => setTempTeacher(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        <option value="">-- Selecione --</option>
                        {teachers.filter(t => !tempSubject || t.subjectIds?.includes(tempSubject)).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">Sala (Opcional)</label>
                      <select
                        value={tempAssociatedRoomId}
                        onChange={(e) => setTempAssociatedRoomId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      >
                        <option value="">-- Sem Sala --</option>
                        {turmas.filter(t => t.isRoom).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    {viewMode === "rooms" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500">Turma (Opcional)</label>
                        <select
                          value={tempAssociatedTurmaId}
                          onChange={(e) => setTempAssociatedTurmaId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        >
                          <option value="">-- Selecione --</option>
                          {turmas.filter(t => !t.isRoom).map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTempTeacher("");
                        setTempSubject("");
                        setTempAssociatedRoomId("");
                        setTempAssociatedTurmaId("");
                        setPendingLabConflict(null);
                      }}
                      className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[9px] font-bold hover:bg-red-100 transition-all uppercase tracking-widest flex items-center justify-center gap-1"
                      title="Limpar Célula"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar Célula
                    </button>
                  </div>

                  {/* Move suggestions list */}
                  {(() => {
                    const suggestions = getSuggestionsForSlot(selectedTurmaId, selectedSlot);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                        <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">
                          📍 Sugestões de Destinos Válidos (Sem conflito de horário):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                          {suggestions.map((sug) => (
                            <button
                              key={sug.slotId}
                              onClick={() => {
                                performMoveOrSwap(selectedTurmaId, selectedSlot, selectedTurmaId, sug.slotId);
                                setSelectedSlot(null);
                                setInfoMsg("Movimentação executada com sucesso!");
                              }}
                              className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border uppercase tracking-wider transition-all cursor-pointer ${
                                sug.isSwap
                                  ? "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 hover:scale-[1.02]"
                                  : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 hover:scale-[1.02]"
                              }`}
                            >
                              {sug.desc}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedSlot(null);
                        setPendingLabConflict(null);
                      }}
                      className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveSlot(false)}
                      className="flex-1 px-4 py-3 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all uppercase tracking-widest"
                    >
                      Confirmar
                    </button>
                  </div>
                </motion.div>
                </div>
              )} 
          </AnimatePresence>
        </div>

        {/* Turmas Management Modal */}
        <AnimatePresence>
          {isPrintingTurmaSelection && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsPrintingTurmaSelection(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col text-left">
                    <h3 className="text-xl font-black text-slate-900 uppercase leading-tight">
                      Imprimir Horário por Turma
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      Selecione a turma desejada
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPrintingTurmaSelection(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                {/* Filtro de Turno */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans text-left">
                    Filtrar por Turno:
                  </span>
                  <div className="flex bg-slate-100 p-1 rounded-2xl items-center gap-1 w-full justify-between">
                    <button
                      type="button"
                      onClick={() => setPrintIndividualShift("todos")}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${printIndividualShift === "todos" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintIndividualShift("manha")}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${printIndividualShift === "manha" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Manhã
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintIndividualShift("tarde")}
                      className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${printIndividualShift === "tarde" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Tarde
                    </button>
                    {enableNoite && (
                      <button
                        type="button"
                        onClick={() => setPrintIndividualShift("noite")}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${printIndividualShift === "noite" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Noite
                      </button>
                    )}
                  </div>
                </div>

                {/* Quadro Geral (Grade Mestre) */}
                <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200/60 rounded-3xl text-left">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest font-sans flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    Quadro Geral da Escola (Grade Mestre):
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => handlePrintGeralTurmas(true)}
                      className="flex flex-col items-center justify-center p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all group border border-indigo-700 cursor-pointer shadow-sm text-center"
                    >
                      <Printer className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                        Tudo em 1 Página
                      </span>
                      <span className="text-[8px] font-bold text-indigo-100 mt-0.5 uppercase leading-none">
                        (A4 Única Folha)
                      </span>
                    </button>

                    <button
                      onClick={() => handlePrintGeralTurmas(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all group border border-slate-950 cursor-pointer shadow-sm text-center"
                    >
                      <Printer className="w-4 h-4 mb-1.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-wider leading-tight">
                        Por Turnos Separados
                      </span>
                      <span className="text-[8px] font-bold text-slate-300 mt-0.5 uppercase leading-none">
                        (1 Página por Turno)
                      </span>
                    </button>
                  </div>
                  <p className="text-[8.5px] text-slate-500 font-medium leading-normal mt-1">
                    💡 <strong>Dica:</strong> Se sua escola tiver muitas turmas (12+), use a opção "Tudo em 1 Página" e, na tela de impressão, configure a escala para 90% ou 80% para garantir o ajuste perfeito no papel A4.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                  {selectedTurmasToPrint.length >= 1 && (
                    <button
                      onClick={() =>
                        handlePrintMultipleTurmasCombined(selectedTurmasToPrint)
                      }
                      className="col-span-2 flex flex-col items-center justify-center p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all group border-2 border-emerald-700/20 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          {selectedTurmasToPrint.length === 1
                            ? "Imprimir Turma selecionada em tamanho compacto"
                            : `Imprimir ${selectedTurmasToPrint.length} Turmas juntas na mesma folha`}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-100 mt-1 uppercase">
                        {selectedTurmasToPrint.length === 1
                          ? "(Uma única folha em Paisagem A4)"
                          : "(Lado a lado em uma única folha Paisagem A4)"}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={handlePrintAllTurmasIndividual}
                    className="col-span-2 flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all group border-2 border-blue-700/20 cursor-pointer"
                  >
                    <Printer className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {printIndividualShift === "todos"
                        ? "Imprimir todas em folhas separadas"
                        : `Imprimir Turmas do Turno (${printIndividualShift === "manha" ? "Manhã" : printIndividualShift === "tarde" ? "Tarde" : "Noite"})`}
                    </span>
                    <span className="text-[9px] font-bold text-blue-100 mt-1 uppercase">
                      {printIndividualShift === "todos"
                        ? "(Uma página de sulfite por turma - Todas)"
                        : `(Uma página de sulfite por turma - Turno ${printIndividualShift === "manha" ? "Manhã" : printIndividualShift === "tarde" ? "Tarde" : "Noite"})`}
                    </span>
                  </button>

                  <div className="col-span-2 flex justify-between items-center px-1 my-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Selecione para múltiplos ou clique na 🖨️ para individual:
                    </span>
                    {selectedTurmasToPrint.length > 0 && (
                      <button
                        onClick={() => setSelectedTurmasToPrint([])}
                        className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest cursor-pointer"
                      >
                        Limpar Seleção
                      </button>
                    )}
                  </div>

                  <div className="col-span-2 h-px bg-slate-100" />

                  {(() => {
                    let list = turmas.filter((t) => !t.isRoom);
                    if (!enableNoite) {
                      list = list.filter((t) => {
                        const shift =
                          t.shift ||
                          (t.id.toLowerCase().includes("noite") ||
                          t.name.toLowerCase().includes("noite")
                            ? "noite"
                            : t.id.toLowerCase().includes("tarde") ||
                                t.name.toLowerCase().includes("tarde")
                              ? "tarde"
                              : "manha");
                        return shift !== "noite";
                      });
                    }
                    if (printIndividualShift === "manha") {
                      list = list.filter((t) => {
                        if (t.shift) return t.shift === "manha";
                        return (
                          !t.name.toLowerCase().includes("tarde") &&
                          !t.id.toLowerCase().includes("tarde") &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (printIndividualShift === "tarde") {
                      list = list.filter((t) => {
                        if (t.shift) return t.shift === "tarde";
                        return (
                          (t.name.toLowerCase().includes("tarde") ||
                            t.id.toLowerCase().includes("tarde")) &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (printIndividualShift === "noite") {
                      list = list.filter((t) => {
                        if (t.shift) return t.shift === "noite";
                        return (
                          t.name.toLowerCase().includes("noite") ||
                          t.id.toLowerCase().includes("noite")
                        );
                      });
                    }

                    const sortedList = sortTurmasList(list);
                    if (sortedList.length === 0) {
                      return (
                        <div className="col-span-2 text-center py-8 text-xs font-black text-slate-400 uppercase tracking-wider bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          Nenhuma turma para este turno
                        </div>
                      );
                    }

                    return sortedList.map((turma) => {
                      const isSelected = selectedTurmasToPrint.includes(
                        turma.id,
                      );
                      return (
                        <div
                          key={turma.id}
                          onClick={() => {
                            setSelectedTurmasToPrint((prev) =>
                              prev.includes(turma.id)
                                ? prev.filter((id) => id !== turma.id)
                                : [...prev, turma.id],
                            );
                          }}
                          className={`flex items-center justify-between p-3.5 bg-white border-2 rounded-2xl hover:border-blue-500 hover:bg-blue-50/20 transition-all group cursor-pointer ${isSelected ? "border-blue-600 bg-blue-50/20 shadow-xs" : "border-slate-100"}`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex flex-col text-left overflow-hidden">
                              <span className="text-xs font-black text-slate-800 truncate">
                                {turma.name}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                {turma.shift === "manha"
                                  ? "MANHÃ"
                                  : turma.shift === "tarde"
                                    ? "TARDE"
                                    : turma.shift === "noite"
                                      ? "NOITE"
                                      : "Indefinido"}{" "}
                                • {getEffectiveDailyClassCount(turma, isCivicoMilitar)} aulas
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintTurmaSelection(turma);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                            title="Imprimir Individual"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Clear Schedules Selection Modal */}
        <AnimatePresence>
          {isClearingSelection && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsClearingSelection(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      Limpar Grade de Horários
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 text-left">
                      Escolha o que deseja apagar
                    </p>
                  </div>
                  <button
                    onClick={() => setIsClearingSelection(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6 bg-white">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                      Selecione o que deseja limpar
                    </div>
                    <select
                      value={clearMode}
                      onChange={(e) => setClearMode(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 text-slate-700 py-3 px-4 rounded-xl font-bold uppercase cursor-pointer"
                    >
                      <option value="tudo">
                        Toda a Grade (Limpeza Completa)
                      </option>
                      <option value="manha">
                        Manhã (Limpa todas as turmas da manhã)
                      </option>
                      <option value="tarde">
                        Tarde (Limpa todas as turmas da tarde)
                      </option>
                      {enableNoite && (
                        <option value="noite">
                          Noite (Limpa todas as turmas da noite)
                        </option>
                      )}
                      {turmas.some((t) => t.isRoom) && (
                        <>
                          <option value="Labs - Manhã">
                            Salas Especiais (Labs) - Manhã
                          </option>
                          <option value="Labs - Tarde">
                            Salas Especiais (Labs) - Tarde
                          </option>
                          {enableNoite && (
                            <option value="Labs - Noite">
                              Salas Especiais (Labs) - Noite
                            </option>
                          )}
                        </>
                      )}
                      <option value="especificas">
                        Turma selecionada (Escolher turmas específicas)
                      </option>
                      <option value="conflitos">
                        Apenas Aulas com Conflito (Vermelhas)
                      </option>
                    </select>
                  </div>

                  {clearMode === "especificas" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        Quais turmas?
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                        {turmas.map((turma) => (
                          <label
                            key={turma.id}
                            className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                          >
                            <input
                              type="checkbox"
                              checked={clearSelectedTurmas.includes(turma.id)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setClearSelectedTurmas([
                                    ...clearSelectedTurmas,
                                    turma.id,
                                  ]);
                                else
                                  setClearSelectedTurmas(
                                    clearSelectedTurmas.filter(
                                      (id) => id !== turma.id,
                                    ),
                                  );
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-[11px] font-bold text-slate-700 uppercase">
                              {turma.name} {turma.isRoom ? "(Lab)" : ""}
                            </span>
                          </label>
                        ))}
                        {turmas.length === 0 && (
                          <div className="text-xs text-slate-400 italic text-center py-2">
                            Nenhuma turma cadastrada
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      disabled={
                        clearMode === "especificas" &&
                        clearSelectedTurmas.length === 0
                      }
                      onClick={() => {
                        setConfirmConfig({
                          title: "Confirmar Limpeza",
                          message:
                            "ATENÇÃO: Essa ação apagará a grade de horários da seleção que você fez. Não será possível desfazer. Deseja continuar?",
                          confirmText: "Limpar Seleção",
                          cancelText: "Cancelar",
                          onConfirm: () => {
                            setSchedules((prev) => {
                              const next = { ...prev };
                              const clearSlotSafely = (
                                tid: string,
                                slotId: string,
                                currentData: any,
                              ) => {
                                if (currentData.associatedTurmaId) {
                                  if (next[currentData.associatedTurmaId]) {
                                    const assocSched = {
                                      ...next[currentData.associatedTurmaId],
                                    };
                                    if (
                                      assocSched[slotId] &&
                                      assocSched[slotId].associatedRoomId ===
                                        tid
                                    ) {
                                      delete assocSched[slotId]
                                        .associatedRoomId;
                                      next[currentData.associatedTurmaId] =
                                        assocSched;
                                    }
                                  }
                                }
                                if (currentData.associatedRoomId) {
                                  if (next[currentData.associatedRoomId]) {
                                    const assocSched = {
                                      ...next[currentData.associatedRoomId],
                                    };
                                    if (
                                      assocSched[slotId] &&
                                      assocSched[slotId].associatedTurmaId ===
                                        tid
                                    ) {
                                      delete assocSched[slotId];
                                      next[currentData.associatedRoomId] =
                                        assocSched;
                                    }
                                  }
                                }
                              };

                              const applyClear = (
                                tid: string,
                                periodsToClear?: number[],
                              ) => {
                                if (!next[tid]) return;

                                if (!periodsToClear) {
                                  Object.keys(next[tid]).forEach((slotId) => {
                                    clearSlotSafely(
                                      tid,
                                      slotId,
                                      next[tid][slotId],
                                    );
                                  });
                                  delete next[tid];
                                } else {
                                  next[tid] = { ...next[tid] };
                                  Object.keys(next[tid]).forEach((slotId) => {
                                    const [_, pStr] = slotId.split("-");
                                    if (
                                      periodsToClear.includes(parseInt(pStr))
                                    ) {
                                      clearSlotSafely(
                                        tid,
                                        slotId,
                                        next[tid][slotId],
                                      );
                                      delete next[tid][slotId];
                                    }
                                  });
                                }
                              };

                              if (clearMode === "tudo") {
                                return {};
                              } else if (clearMode === "manha") {
                                turmas
                                  .filter(
                                    (t) =>
                                      !t.isRoom &&
                                      (t.shift === "manha" ||
                                        (!t.shift &&
                                          !t.name
                                            .toLowerCase()
                                            .includes("tarde") &&
                                          !t.name
                                            .toLowerCase()
                                            .includes("noite"))),
                                  )
                                  .forEach((t) => applyClear(t.id));
                              } else if (clearMode === "tarde") {
                                turmas
                                  .filter(
                                    (t) =>
                                      !t.isRoom &&
                                      (t.shift === "tarde" ||
                                        (!t.shift &&
                                          t.name
                                            .toLowerCase()
                                            .includes("tarde"))),
                                  )
                                  .forEach((t) => applyClear(t.id));
                              } else if (clearMode === "noite") {
                                turmas
                                  .filter(
                                    (t) =>
                                      !t.isRoom &&
                                      (t.shift === "noite" ||
                                        (!t.shift &&
                                          t.name
                                            .toLowerCase()
                                            .includes("noite"))),
                                  )
                                  .forEach((t) => applyClear(t.id));
                              } else if (clearMode === "Labs - Manhã") {
                                turmas
                                  .filter((t) => t.isRoom)
                                  .forEach((t) =>
                                    applyClear(t.id, PERIODS_MANHA),
                                  );
                              } else if (clearMode === "Labs - Tarde") {
                                turmas
                                  .filter((t) => t.isRoom)
                                  .forEach((t) =>
                                    applyClear(t.id, PERIODS_TARDE),
                                  );
                              } else if (clearMode === "Labs - Noite") {
                                turmas
                                  .filter((t) => t.isRoom)
                                  .forEach((t) =>
                                    applyClear(t.id, PERIODS_NOITE),
                                  );
                              } else if (clearMode === "especificas") {
                                clearSelectedTurmas.forEach((tid) =>
                                  applyClear(tid),
                                );
                              } else if (clearMode === "conflitos") {
                                Object.keys(next).forEach((tid) => {
                                  Object.keys(next[tid]).forEach((slotId) => {
                                    const [day, pStr] = slotId.split("-");
                                    const p = parseInt(pStr);
                                    const slot = next[tid][slotId];
                                    if (slot && slot.teacherId) {
                                      const confs = getConflicts(
                                        day,
                                        p,
                                        slot.teacherId,
                                        tid,
                                        slot.associatedTurmaId,
                                      );
                                      if (confs.length > 0) {
                                        clearSlotSafely(tid, slotId, slot);
                                        delete next[tid][slotId];
                                      }
                                    }
                                  });
                                });
                              }

                              return next;
                            });
                            setIsClearingSelection(false);
                          },
                        });
                      }}
                      className="w-full py-4 bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-orange-200/50"
                    >
                      <Trash2 className="w-4 h-4 text-orange-500" />
                      Confirmar Limpeza
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Academic Period Config Modal */}
        <AnimatePresence>
          {isAcademicConfigOpen && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsAcademicConfigOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-slate-900 text-left font-sans flex flex-col max-h-[85vh] overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 mb-5 border-b border-slate-100 pb-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 leading-tight uppercase tracking-tight text-sm">
                        Parâmetros Globais do Colégio
                      </h3>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                        Configuração refletida nos relatórios e painéis
                        centrais.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAcademicConfigOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1.5 block">
                      Modelo / Perfil da Instituição (SEED-PR)
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {/* regular */}
                      <button
                        type="button"
                        onClick={() => {
                          handleModalidadeChange(false);
                        }}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          !isCivicoMilitar
                            ? "bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500/10"
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            !isCivicoMilitar
                              ? "border-emerald-600 bg-emerald-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {!isCivicoMilitar && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                            Colégio Estadual Regular
                          </span>
                          <span className="text-[9.5px] text-slate-500 leading-snug block">
                            Matriz regular padrão SEED-PR
                          </span>
                        </div>
                      </button>

                      {/* ccm */}
                      <button
                        type="button"
                        onClick={() => {
                          handleModalidadeChange(true);
                        }}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isCivicoMilitar
                            ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500/10"
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/50"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isCivicoMilitar
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isCivicoMilitar && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                            Cívico-Militar (CCM)
                          </span>
                          <span className="text-[9.5px] text-slate-500 leading-snug block">
                            Matriz cívico-militar adaptada
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                      Modalidade
                    </label>
                    <select
                      value={academicSystem}
                      onChange={(e) => {
                        const newSystem = e.target.value as any;
                        setAcademicSystem(newSystem);
                        let newPeriod = academicPeriod;
                        if (newSystem === "Trimestral" && newPeriod > 3)
                          newPeriod = 3;
                        setAcademicPeriod(newPeriod);
                        const key = `${newSystem}-${newPeriod}`;
                        setAcademicStartDate(academicDates[key]?.start || "");
                        setAcademicEndDate(academicDates[key]?.end || "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="Bimestral">Bimestral</option>
                      <option value="Trimestral">Trimestral</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">
                      Período Vigente
                    </label>
                    <select
                      value={academicPeriod}
                      onChange={(e) => {
                        const newPeriod = Number(e.target.value);
                        setAcademicPeriod(newPeriod);
                        const key = `${academicSystem}-${newPeriod}`;
                        setAcademicStartDate(academicDates[key]?.start || "");
                        setAcademicEndDate(academicDates[key]?.end || "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value={1}>
                        1º {academicSystem.replace("al", "e")}
                      </option>
                      <option value={2}>
                        2º {academicSystem.replace("al", "e")}
                      </option>
                      <option value={3}>
                        3º {academicSystem.replace("al", "e")}
                      </option>
                      {academicSystem === "Bimestral" && (
                        <option value={4}>4º Bimestre</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {Array.from({
                      length: academicSystem === "Bimestral" ? 4 : 3,
                    }).map((_, i) => {
                      const p = i + 1;
                      const key = `${academicSystem}-${p}`;
                      return (
                        <div
                          key={p}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative"
                        >
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-200 text-[9px] font-bold text-slate-600 rounded-bl-xl rounded-tr-xl uppercase">
                            {p}º {academicSystem.replace("al", "e")}
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">
                                Início
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 01/02"
                                value={academicDates[key]?.start || ""}
                                onChange={(e) => {
                                  const newDates = {
                                    ...academicDates,
                                    [key]: {
                                      ...(academicDates[key] || {
                                        start: "",
                                        end: "",
                                      }),
                                      start: e.target.value,
                                    },
                                  };
                                  setAcademicDates(newDates);
                                  if (p === academicPeriod)
                                    setAcademicStartDate(e.target.value);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">
                                Término
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 15/04"
                                value={academicDates[key]?.end || ""}
                                onChange={(e) => {
                                  const newDates = {
                                    ...academicDates,
                                    [key]: {
                                      ...(academicDates[key] || {
                                        start: "",
                                        end: "",
                                      }),
                                      end: e.target.value,
                                    },
                                  };
                                  setAcademicDates(newDates);
                                  if (p === academicPeriod)
                                    setAcademicEndDate(e.target.value);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() => setIsAcademicConfigOpen(false)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-black uppercase tracking-wider text-[10px] rounded-lg transition-colors"
                  >
                    Confirmar e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Customizable Time Ranges Modal */}
        <AnimatePresence>
          {isConfiguringTimeRanges && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsConfiguringTimeRanges(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-2xl space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex flex-col text-left">
                    <h3 className="text-xl font-black text-slate-900 uppercase leading-tight">
                      Configurar Horários das Aulas
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      Defina com precisão o intervalo de cada aula
                    </p>
                  </div>
                  <button
                    onClick={() => setIsConfiguringTimeRanges(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div
                  className={`grid grid-cols-1 ${enableNoite ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar`}
                >
                  {/* MANHÃ CONTAINER */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Turno Manhã
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 bg-slate-200/50 p-0.5 rounded-lg border border-slate-300/40 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (timeRangesManha.length !== 5) {
                              setTimeRangesManha(timeRangesManha.slice(0, 5));
                            }
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesManha.length === 5 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                        >
                          5 AULAS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (timeRangesManha.length !== 6) {
                              setTimeRangesManha([
                                ...timeRangesManha,
                                "12h às 12h50",
                              ]);
                            }
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesManha.length === 6 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                        >
                          6 AULAS
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {timeRangesManha.map((range, index) => (
                        <div
                          key={`m-${index}`}
                          className="flex flex-col text-left"
                        >
                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            {index + 1}ª Aula:
                          </label>
                          <input
                            type="text"
                            value={range}
                            onChange={(e) => {
                              const updated = [...timeRangesManha];
                              updated[index] = e.target.value;
                              setTimeRangesManha(updated);
                            }}
                            className="w-full px-3 py-1.2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-slate-900 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TARDE CONTAINER */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                          Turno Tarde
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 bg-slate-200/50 p-0.5 rounded-lg border border-slate-300/40 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (timeRangesTarde.length !== 5) {
                              setTimeRangesTarde(timeRangesTarde.slice(0, 5));
                            }
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesTarde.length === 5 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                        >
                          5 AULAS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (timeRangesTarde.length !== 6) {
                              setTimeRangesTarde([
                                ...timeRangesTarde,
                                "17h30 às 18h20",
                              ]);
                            }
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesTarde.length === 6 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                        >
                          6 AULAS
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {timeRangesTarde.map((range, index) => (
                        <div
                          key={`t-${index}`}
                          className="flex flex-col text-left"
                        >
                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            {index + 1}ª Aula:
                          </label>
                          <input
                            type="text"
                            value={range}
                            onChange={(e) => {
                              const updated = [...timeRangesTarde];
                              updated[index] = e.target.value;
                              setTimeRangesTarde(updated);
                            }}
                            className="w-full px-3 py-1.2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-slate-900 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NOITE CONTAINER */}
                  {enableNoite && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                          <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                            Turno Noite
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-200/50 p-0.5 rounded-lg border border-slate-300/40 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (timeRangesNoite.length !== 5) {
                                setTimeRangesNoite(timeRangesNoite.slice(0, 5));
                              }
                            }}
                            className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesNoite.length === 5 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                          >
                            5 AULAS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (timeRangesNoite.length !== 6) {
                                setTimeRangesNoite([
                                  ...timeRangesNoite,
                                  "23h10 às 23h55",
                                ]);
                              }
                            }}
                            className={`px-1.5 py-0.5 text-[8px] font-black rounded cursor-pointer transition-all ${timeRangesNoite.length === 6 ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                          >
                            6 AULAS
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {timeRangesNoite.map((range, index) => (
                          <div
                            key={`n-${index}`}
                            className="flex flex-col text-left"
                          >
                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                              {index + 1}ª Aula:
                            </label>
                            <input
                              type="text"
                              value={range}
                              onChange={(e) => {
                                const updated = [...timeRangesNoite];
                                updated[index] = e.target.value;
                                setTimeRangesNoite(updated);
                              }}
                              className="w-full px-3 py-1.2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-slate-900 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      // reset defaults
                      setTimeRangesManha([
                        "7h30 às 8h20",
                        "8h20 às 9h10",
                        "9h10 às 10h",
                        "10h20 às 11h10",
                        "11h10 às 12h",
                        "12h às 12h50",
                      ]);
                      setTimeRangesTarde([
                        "13h às 13h50",
                        "13h50 às 14h40",
                        "14h40 às 15h30",
                        "15h50 às 16h40",
                        "16h40 às 17h30",
                        "17h30 às 18h20",
                      ]);
                      setTimeRangesNoite([
                        "18h45 às 19h35",
                        "19h35 às 20h25",
                        "20h25 às 21h15",
                        "21h30 às 22h20",
                        "22h20 às 23h10",
                        "23h10 às 23h55",
                      ]);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(
                        "cecm_time_ranges_manha",
                        JSON.stringify(timeRangesManha),
                      );
                      localStorage.setItem(
                        "cecm_time_ranges_tarde",
                        JSON.stringify(timeRangesTarde),
                      );
                      localStorage.setItem(
                        "cecm_time_ranges_noite",
                        JSON.stringify(timeRangesNoite),
                      );
                      setIsConfiguringTimeRanges(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all uppercase tracking-widest cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Turmas Management Modal */}
        <AnimatePresence>
          {(isAddingTurma || isAlunosRoute) && (
            <div
              className={`fixed inset-y-0 right-0 z-[85] flex ${isAlunosRoute ? "w-[85vw] max-w-[1200px]" : "w-[480px]"} bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.15)] pointer-events-auto border-l border-slate-200`}
            >
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`bg-white flex flex-col h-full p-6 w-full max-h-screen overflow-y-auto custom-scrollbar`}
              >
                <div className="flex justify-between items-center shrink-0 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase">
                    {editingTurmaId ? "Editar Turma" : "Gerenciar Turmas"}
                  </h3>
                  <button
                    onClick={() => {
                      if (isAlunosRoute) navigate("/horarios");
                      setIsAddingTurma(false);
                      setEditingTurmaId(null);
                      setNewTurmaName("");
                    }}
                    className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className={`space-y-4 flex-1 flex flex-col pt-4`}>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTurmaName}
                        onChange={(e) =>
                          setNewTurmaName(e.target.value.toUpperCase())
                        }
                        onKeyDown={(e) => e.key === "Enter" && addTurma()}
                        placeholder="Nome da Turma (Ex: 6ºA)"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-slate-900 transition-all"
                      />
                      <button
                        onClick={addTurma}
                        className={`px-6 rounded-xl transition-all ${editingTurmaId ? "bg-[#657c36] text-white" : "bg-slate-900 text-white hover:bg-black"}`}
                      >
                        {editingTurmaId ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={newTurmaShift}
                        onChange={(e) =>
                          setNewTurmaShift(e.target.value as any)
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 focus:outline-none focus:border-slate-900 transition-all"
                      >
                        {!editingTurmaId && (
                          <option value="todas">
                            Período: Todas as Turmas
                          </option>
                        )}
                        <option value="manha">Período: Manhã</option>
                        <option value="tarde">Período: Tarde</option>
                        {enableNoite && (
                          <option value="noite">Período: Noite</option>
                        )}
                      </select>

                      <label className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-100 transition-all w-full">
                        <input
                          type="checkbox"
                          checked={newTurmaDailyClassCount === 5}
                          onChange={(e) =>
                            setNewTurmaDailyClassCount(e.target.checked ? 5 : 6)
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-black text-slate-500 uppercase">
                          Turma com apenas 5 aulas por dia (25h/semana)
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-100 transition-all w-full">
                        <input
                          type="checkbox"
                          checked={newTurmaIsTechnical}
                          onChange={(e) =>
                            setNewTurmaIsTechnical(e.target.checked)
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-black text-slate-500 uppercase">
                          Ensino Técnico / Profissionalizante (Com{" "}
                          {techCourseName})
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none hover:bg-slate-100 transition-all w-full">
                        <input
                          type="checkbox"
                          checked={newTurmaIsCCM}
                          onChange={(e) =>
                            setNewTurmaIsCCM(e.target.checked)
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-black text-slate-500 uppercase">
                          Cívico-Militar (6 Aulas Diárias)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div
                    className={`overflow-y-auto pr-2 custom-scrollbar ${isAlunosRoute ? "flex-1 min-h-0" : "max-h-60"}`}
                  >
                    {newTurmaShift === "todas" ? (
                      <div
                        className={`grid grid-cols-1 ${enableNoite ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}
                      >
                        {[
                          "manha",
                          "tarde",
                          ...(enableNoite ? ["noite"] : []),
                        ].map((shiftLabel) => {
                          const shiftTurmas = sortTurmasList(
                            turmas.filter(
                              (t) => !t.isRoom && t.shift === shiftLabel,
                            ),
                          );
                          return (
                            <div key={shiftLabel} className="space-y-2">
                              <h4 className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 pb-2 mb-2 sticky top-0 bg-white z-10">
                                {shiftLabel === "manha"
                                  ? "Manhã"
                                  : shiftLabel === "tarde"
                                    ? "Tarde"
                                    : "Noite"}
                              </h4>
                              {shiftTurmas.map((turma) => (
                                <div
                                  key={turma.id}
                                  className="flex items-center justify-between p-2 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all group"
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-slate-800">
                                        {turma.name}
                                      </span>
                                      {turma.isTechnical && (
                                        <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100">
                                          {techCourseName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                      {getEffectiveDailyClassCount(turma, isCivicoMilitar)} AULAS/DIA
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditTurma(turma)}
                                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => removeTurma(turma.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {shiftTurmas.length === 0 && (
                                <p className="text-[10px] text-slate-400 italic">
                                  Nenhuma turma
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortTurmasList(
                          turmas.filter(
                            (t) => !t.isRoom && t.shift === newTurmaShift,
                          ),
                        ).map((turma) => (
                          <div
                            key={turma.id}
                            className="relative flex flex-col p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all group"
                          >
                            <div className="flex flex-col pr-14 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-800">
                                  {turma.name}
                                </span>
                                {turma.isTechnical && (
                                  <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-indigo-100">
                                    Técnico
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                {getEffectiveDailyClassCount(turma, isCivicoMilitar)} AULAS/DIA
                              </span>
                            </div>

                            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditTurma(turma)}
                                className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-md shadow-sm border border-slate-200 transition-colors"
                                title="Editar Turma"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeTurma(turma.id)}
                                className="p-1.5 bg-white text-slate-400 hover:text-rose-600 rounded-md shadow-sm border border-slate-200 transition-colors"
                                title="Excluir Turma"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Rooms Management Modal */}
        <AnimatePresence>
          {isAddingRoom && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsAddingRoom(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="flex justify-between items-center px-8 pt-8">
                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    Salas Especiais
                  </h3>
                  <button
                    onClick={() => setIsAddingRoom(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8 pt-4 space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nova Sala Especial
                      </label>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: LAB ARTES"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                            onKeyDown={(e) => e.key === "Enter" && addRoom()}
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <select
                            value={newRoomIcon}
                            onChange={(e) => setNewRoomIcon(e.target.value)}
                            className="flex-1 px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 appearance-none"
                          >
                            {predefinedIcons.map((iconOpt) => (
                              <option key={iconOpt.id} value={iconOpt.id}>
                                {iconOpt.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="color"
                            value={newRoomColor}
                            onChange={(e) => setNewRoomColor(e.target.value)}
                            className="w-12 h-11 p-1 bg-slate-50 border-2 border-slate-100 rounded-xl cursor-pointer shrink-0"
                          />
                          <button
                            onClick={addRoom}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm shrink-0"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {turmas
                        .filter((t) => t.isRoom)
                        .map((room) => (
                          <div
                            key={room.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: room.color || "#6366f1",
                                }}
                              >
                                {getRoomIcon(room.icon, "w-3 h-3 text-white")}
                              </div>
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={room.name}
                                  onChange={(e) => {
                                    const newName =
                                      e.target.value.toUpperCase();
                                    setTurmas((prev) =>
                                      prev.map((t) =>
                                        t.id === room.id
                                          ? { ...t, name: newName }
                                          : t,
                                      ),
                                    );
                                  }}
                                  className="text-[10px] font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 sm:w-32"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={room.icon || "DoorClosed"}
                                onChange={(e) => {
                                  const newIcon = e.target.value;
                                  setTurmas((prev) =>
                                    prev.map((t) =>
                                      t.id === room.id
                                        ? { ...t, icon: newIcon }
                                        : t,
                                    ),
                                  );
                                }}
                                title="Alterar Ícone"
                                className="text-[10px] w-20 appearance-none bg-slate-100 border-none font-bold text-slate-500 rounded-lg py-1 px-2 focus:ring-0 cursor-pointer"
                              >
                                {predefinedIcons.map((iconOpt) => (
                                  <option key={iconOpt.id} value={iconOpt.id}>
                                    {iconOpt.label}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <input
                                  type="color"
                                  value={room.color || "#6366f1"}
                                  onChange={(e) => {
                                    setTurmas((prev) =>
                                      prev.map((t) =>
                                        t.id === room.id
                                          ? { ...t, color: e.target.value }
                                          : t,
                                      ),
                                    );
                                  }}
                                  className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                                />
                                <button
                                  onClick={() => {
                                    setConfirmConfig({
                                      title: "Remover Sala Especial",
                                      message: `Deseja realmente remover a sala ${room.name}? Isso também apagará as alocações de horários vinculadas a ela.`,
                                      confirmText: "Remover",
                                      cancelText: "Cancelar",
                                      onConfirm: () => removeTurma(room.id),
                                    });
                                  }}
                                  className="p-2 text-slate-305 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setIsAddingRoom(false)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-black transition-all"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* WhatsApp Backup Export Modal */}
        <AnimatePresence>
          {isWhatsAppModalOpen && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsWhatsAppModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="flex justify-between items-center px-8 pt-8">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-6 h-6 text-[#25D366]" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Exportar via WhatsApp
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsWhatsAppModalOpen(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8 pt-4 space-y-5">
                  <div className="text-xs text-slate-500 font-medium leading-relaxed">
                    Esta ferramenta fará o{" "}
                    <span className="font-bold text-slate-700">
                      download automático
                    </span>{" "}
                    do arquivo de backup (.json) por segurança e abrirá o
                    WhatsApp com uma instrução tutorial completa para que você
                    possa enviá-la com o arquivo anexado ao seu contato de forma
                    fácil.
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                      Número do Contato (com DDD)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 41999999999"
                      value={tempWaPhone}
                      onChange={(e) => setTempWaPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleWhatsAppExport()
                      }
                    />
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase px-1 leading-normal tracking-tight">
                      Digite apenas números com DDD (Ex: 41998887766). Ficará
                      salvo para as próximas exportações!
                    </p>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      onClick={handleWhatsAppExport}
                      className="w-full py-4 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      Gerar & Enviar Backup
                    </button>

                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 block">
                        Como funciona:
                      </span>
                      <ol className="list-decimal list-inside text-[9.5px] text-emerald-700 space-y-1 font-semibold leading-normal">
                        <li>
                          O arquivo de backup{" "}
                          <span className="font-bold">.json</span> será baixado
                          para o seu computador ou celular.
                        </li>
                        <li>
                          O WhatsApp se abrirá com o tutorial do backup
                          pré-preenchido como mensagem de texto.
                        </li>
                        <li>
                          Envie a mensagem no chat e{" "}
                          <span className="font-bold">
                            anexe o arquivo .json baixado
                          </span>{" "}
                          logo em seguida!
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Teachers Management Modal */}
        <AnimatePresence>
          {(isAddingTeacher || isProfessoresRoute) && (
            <div
              className={`fixed inset-y-0 right-0 z-[85] flex ${isProfessoresRoute ? "w-[90vw]" : "w-[500px]"} bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.15)] pointer-events-auto border-l border-slate-200`}
            >
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`bg-white flex flex-col h-full p-6 pt-4 w-full max-h-screen overflow-y-auto custom-scrollbar`}
              >
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-900 uppercase">
                    {editingTeacherId
                      ? "Editar Professor"
                      : "Gerenciar Professores"}
                  </h3>
                  <button
                    onClick={() => {
                      if (isProfessoresRoute) navigate("/horarios");
                      setIsAddingTeacher(false);
                      setEditingTeacherId(null);
                      setNewTeacherName("");
                      setNewTeacherSubjectIds([]);
                      setNewTeacherUnavailability([]);
                      setNewTeacherTurmaIds([]);
                      setNewTeacherSubjectTurmaMap({});
                      setNewTeacherSchoolWorkload("");
                      setNewTeacherSchoolWorkloadManha("");
                      setNewTeacherSchoolWorkloadTarde("");
                      setNewTeacherSchoolWorkloadNoite("");
                    }}
                    className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className={`pt-4 space-y-6 flex-1 flex flex-col`}>
                  <div className="space-y-4 shrink-0 flex-1 flex flex-col">
                    {subjects.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <p className="text-xs font-bold text-amber-900">
                          Você precisa cadastrar as{" "}
                          <span className="underline">Disciplinas</span> antes
                          de adicionar professores.
                        </p>
                        <button
                          onClick={() => {
                            setIsAddingTeacher(false);
                            setIsAddingSubject(true);
                          }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-black uppercase"
                        >
                          Ir para Disciplinas
                        </button>
                      </div>
                    ) : (
                      <div
                        className={
                          isProfessoresRoute
                            ? "flex flex-row-reverse w-full h-full gap-6 overflow-hidden"
                            : "flex flex-col w-full"
                        }
                      >
                        <div
                          className={
                            isProfessoresRoute
                              ? "w-[380px] shrink-0 overflow-y-auto pr-2 custom-scrollbar space-y-4 flex flex-col"
                              : "space-y-4 flex flex-col"
                          }
                        >
                          {/* Tabs */}
                          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                              onClick={() => setTeacherModalTab("geral")}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                teacherModalTab === "geral"
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : "text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              Geral
                            </button>
                            <button
                              onClick={() => setTeacherModalTab("vinculos")}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                teacherModalTab === "vinculos"
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : "text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              Vínculos
                            </button>
                            <button
                              onClick={() => setTeacherModalTab("disponibilidade")}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                teacherModalTab === "disponibilidade"
                                  ? "bg-white text-slate-800 shadow-sm"
                                  : "text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              Disp.
                            </button>
                          </div>

                          {teacherModalTab === "geral" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                              {/* Nome do Professor */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                              Nome do Professor
                            </label>
                            <input
                              type="text"
                              value={newTeacherName}
                              onChange={(e) =>
                                setNewTeacherName(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && addTeacher()
                              }
                              placeholder="Ex: Prof. Silvana"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold focus:outline-none transition-all ${
                                teachers.some(
                                  (t) =>
                                    t.name.trim().toLowerCase() ===
                                      newTeacherName.trim().toLowerCase() &&
                                    t.id !== editingTeacherId,
                                ) && newTeacherName.trim() !== ""
                                  ? "border-red-500 ring-2 ring-red-50"
                                  : "border-slate-200 focus:border-slate-900"
                              }`}
                            />
                            {teachers.some(
                              (t) =>
                                t.name.trim().toLowerCase() ===
                                  newTeacherName.trim().toLowerCase() &&
                                t.id !== editingTeacherId,
                            ) &&
                              newTeacherName.trim() !== "" && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span className="text-[10px] font-black text-red-600 uppercase tracking-tight">
                                    Nome já cadastrado!
                                  </span>
                                </div>
                              )}
                          </div>

                          {/* Quadro de Cargas Horárias (Opcional) */}
                          <div className="space-y-3 p-4 bg-[#657c36]/5 border border-[#657c36]/20 rounded-2xl">
                            <div className="space-y-1">
                              <label className="text-[10.5px] font-black text-slate-600 uppercase tracking-widest block">
                                Total de Aulas Contratadas Neste Colégio
                              </label>
                              <p className="text-[8.5px] font-bold text-slate-500 leading-relaxed uppercase">
                                Informe a carga horária em Aulas (ex: 8 aulas)
                                designadas apenas para ESTE colégio. Se
                                preenchido, o sistema avisará caso você coloque
                                mais aulas do que o contratado.
                              </p>
                            </div>
                            <div
                              className={`grid grid-cols-2 ${enableNoite ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}
                            >
                              <div className="space-y-1 text-center">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                                  Geral (Total)
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={newTeacherSchoolWorkload}
                                  onChange={(e) =>
                                    setNewTeacherSchoolWorkload(e.target.value)
                                  }
                                  placeholder="Livre"
                                  title="Quantidade de aulas totais neste colégio"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#657c36] transition-all text-center placeholder:text-slate-300"
                                />
                              </div>

                              <div className="space-y-1 text-center">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                                  Manhã
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={newTeacherSchoolWorkloadManha}
                                  onChange={(e) =>
                                    setNewTeacherSchoolWorkloadManha(
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Livre"
                                  title="Quantidade de aulas que ele deve lecionar na Manhã"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#657c36] transition-all text-center placeholder:text-slate-300"
                                />
                              </div>

                              <div className="space-y-1 text-center">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                                  Tarde
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={newTeacherSchoolWorkloadTarde}
                                  onChange={(e) =>
                                    setNewTeacherSchoolWorkloadTarde(
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Livre"
                                  title="Quantidade de aulas que ele deve lecionar na Tarde"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#657c36] transition-all text-center placeholder:text-slate-300"
                                />
                              </div>

                              {enableNoite && (
                                <div className="space-y-1 text-center animate-in fade-in zoom-in-95">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                                    Noite
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={newTeacherSchoolWorkloadNoite}
                                    onChange={(e) =>
                                      setNewTeacherSchoolWorkloadNoite(
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Livre"
                                    title="Quantidade de aulas que ele deve lecionar na Noite"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#657c36] transition-all text-center placeholder:text-slate-300"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Real-time workload sum validation warning */}
                          {(() => {
                            const g = parseInt(newTeacherSchoolWorkload || "0", 10);
                            const m = parseInt(newTeacherSchoolWorkloadManha || "0", 10);
                            const t = parseInt(newTeacherSchoolWorkloadTarde || "0", 10);
                            const n = enableNoite ? parseInt(newTeacherSchoolWorkloadNoite || "0", 10) : 0;
                            if (g > 0 && (m + t + n) > g) {
                              return (
                                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[9px] font-black text-red-600 uppercase tracking-widest text-center animate-pulse mb-3">
                                  ⚠️ ATENÇÃO: A SOMA DOS PERÍODOS ({m + t + n} AULAS) SUPERA O TOTAL CONTRATADO ({g} AULAS)!
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Preferência de Aulas Geminadas */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              Preferência de Aulas
                            </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl transition-all">
                                <div className="flex flex-col gap-0.5 max-w-[80%]">
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                    Preferir Aulas Geminadas
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase leading-normal">
                                    Tentar preencher dois horários consecutivos
                                    no mesmo dia para este professor
                                  </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={newTeacherPreferDouble}
                                    onChange={(e) =>
                                      setNewTeacherPreferDouble(
                                        e.target.checked,
                                      )
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#657c36]"></div>
                                </label>
                              </div>

                              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl transition-all">
                                <div className="flex flex-col gap-0.5 max-w-[80%]">
                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                                    Exigir Intervalo entre Turnos (Evitar
                                    Consecutivos)
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase leading-normal">
                                    Bloqueia lecionar consecutivamente na última
                                    aula de um período (ex: manhã) e na primeira
                                    aula do período subsequente (ex: tarde)
                                  </span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={newTeacherRequireShiftInterval}
                                    onChange={(e) =>
                                      setNewTeacherRequireShiftInterval(
                                        e.target.checked,
                                      )
                                    }
                                    className="sr-only peer"
                                  />
                                  <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#657c36]"></div>
                                </label>
                              </div>
                            </div>
                          </div>
                            </div>
                          )}

                          {teacherModalTab === "vinculos" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              Selecione as Disciplinas
                            </label>
                            <div className="flex flex-wrap gap-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50 transition-all">
                              {subjects.map((s) => (
                                <label
                                  key={s.id}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all hover:border-[#657c36] hover:bg-[#657c36]/5 group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={newTeacherSubjectIds.includes(
                                      s.id,
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewTeacherSubjectIds([
                                          ...newTeacherSubjectIds,
                                          s.id,
                                        ]);
                                      } else {
                                        setNewTeacherSubjectIds(
                                          newTeacherSubjectIds.filter(
                                            (id) => id !== s.id,
                                          ),
                                        );
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                                  />
                                  <span className="text-[10px] font-black text-slate-600 uppercase group-hover:text-slate-900 tracking-tight">
                                    {s.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 col-span-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              Turmas que o Professor Leciona
                            </label>
                            <div className="flex flex-wrap gap-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50 transition-all max-h-40 overflow-y-auto">
                              {turmas
                                .filter((t) => !t.isRoom)
                                .map((t) => (
                                  <label
                                    key={t.id}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all hover:border-[#657c36] hover:bg-[#657c36]/5 group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={newTeacherTurmaIds.includes(
                                        t.id,
                                      )}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewTeacherTurmaIds([
                                            ...newTeacherTurmaIds,
                                            t.id,
                                          ]);
                                        } else {
                                          setNewTeacherTurmaIds(
                                            newTeacherTurmaIds.filter(
                                              (id) => id !== t.id,
                                            ),
                                          );
                                        }
                                      }}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                                    />
                                    <span className="text-[10px] font-black text-slate-600 uppercase group-hover:text-slate-900 tracking-tight">
                                      {t.name}
                                    </span>
                                  </label>
                                ))}
                              {turmas.filter((t) => !t.isRoom).length === 0 && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase p-1">
                                  Nenhuma turma cadastrada
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 px-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setNewTeacherTurmaIds(
                                    turmas
                                      .filter((t) => !t.isRoom)
                                      .map((t) => t.id),
                                  )
                                }
                                className="text-[9px] font-black uppercase text-[#657c36] hover:underline cursor-pointer"
                              >
                                Selecionar Todas
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => setNewTeacherTurmaIds([])}
                                className="text-[9px] font-black uppercase text-red-600 hover:underline cursor-pointer"
                              >
                                Livre (Todas)
                              </button>
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase px-1 leading-normal tracking-tight mt-1">
                              Se nenhuma turma for selecionada, o professor
                              poderá lecionar em QUALQUER turma por padrão.
                            </p>
                          </div>

                          {/* Restrições de Matérias por Turma */}
                          {newTeacherSubjectIds.length > 0 && (
                            <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">
                                Restrições de Turma por Disciplina (Opcional)
                              </label>
                              <p className="text-[8px] font-bold text-slate-400 uppercase leading-normal tracking-tight px-1 mt-0.5">
                                Selecione em quais turmas este professor pode
                                lecionar cada uma de suas disciplinas. Se não
                                marcar nenhuma turma, a disciplina estará
                                liberada para todas as turmas que o professor
                                leciona.
                              </p>
                              <div className="space-y-3 divide-y divide-slate-200/50">
                                {newTeacherSubjectIds.map((subId) => {
                                  const sub = subjects.find(
                                    (s) => s.id === subId,
                                  );
                                  if (!sub) return null;

                                  const sTurmas =
                                    newTeacherSubjectTurmaMap[subId] || [];
                                  const availableTurmas =
                                    newTeacherTurmaIds.length > 0
                                      ? turmas.filter(
                                          (t) =>
                                            !t.isRoom &&
                                            newTeacherTurmaIds.includes(t.id),
                                        )
                                      : turmas.filter((t) => !t.isRoom);

                                  return (
                                    <div
                                      key={subId}
                                      className="pt-3.5 first:pt-0"
                                    >
                                      <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between mb-2">
                                        <span className="text-[#657c36] font-black">
                                          {sub.name}
                                        </span>
                                        {availableTurmas.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNewTeacherSubjectTurmaMap(
                                                (prev) => {
                                                  const currentSelected =
                                                    prev[subId] || [];
                                                  const isAllSelected =
                                                    currentSelected.length ===
                                                    availableTurmas.length;
                                                  return {
                                                    ...prev,
                                                    [subId]: isAllSelected
                                                      ? []
                                                      : availableTurmas.map(
                                                          (t) => t.id,
                                                        ),
                                                  };
                                                },
                                              );
                                            }}
                                            className="text-[8px] font-black text-slate-400 hover:text-slate-800 uppercase underline bg-transparent border-0 cursor-pointer"
                                          >
                                            {sTurmas.length ===
                                            availableTurmas.length
                                              ? "Nenhuma"
                                              : "Todas"}
                                          </button>
                                        )}
                                      </div>

                                      {availableTurmas.length === 0 ? (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase italic">
                                          Selecione turmas acima primeiro
                                        </span>
                                      ) : (
                                        <div className="flex flex-wrap gap-1 font-sans">
                                          {availableTurmas.map((t) => {
                                            const isChecked = sTurmas.includes(
                                              t.id,
                                            );
                                            return (
                                              <label
                                                key={t.id}
                                                className={`flex items-center gap-1.5 px-2 py-1 border rounded-lg cursor-pointer text-[9px] transition-all select-none ${
                                                  isChecked
                                                    ? "bg-[#657c36]/10 border-[#657c36] text-[#657c36] font-black"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-bold"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={(e) => {
                                                    const checked =
                                                      e.target.checked;
                                                    setNewTeacherSubjectTurmaMap(
                                                      (prev) => {
                                                        const updatedList =
                                                          checked
                                                            ? [...sTurmas, t.id]
                                                            : sTurmas.filter(
                                                                (id) =>
                                                                  id !== t.id,
                                                              );
                                                        return {
                                                          ...prev,
                                                          [subId]: updatedList,
                                                        };
                                                      },
                                                    );
                                                  }}
                                                  className="hidden"
                                                />
                                                <span className="uppercase">
                                                  {t.name}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                            </div>
                          )}

                          {teacherModalTab === "disponibilidade" && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              Indisponibilidade no Colégio
                            </label>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                              <p className="text-[9px] font-bold text-red-600 uppercase mb-3 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>
                                  Marque apenas os horários que o professor NÃO
                                  PODE trabalhar (Arraste para pintar de cinza)
                                </span>
                              </p>

                              <div className="space-y-4">
                                {/* Manhã */}
                                <div>
                                  <h4 className="text-[9px] font-black text-[#657c36] uppercase tracking-wider mb-2 border-b border-[#657c36]/10 pb-1 flex justify-between items-center">
                                    <span>Período da Manhã</span>
                                    <span className="text-[7.5px] font-bold text-slate-400 normal-case italic">
                                      Arraste para pintar • Clique nos
                                      cabeçalhos para selecionar tudo
                                    </span>
                                  </h4>
                                  <div className="grid grid-cols-6 gap-1">
                                    <div className="col-span-1"></div>
                                    {DAYS.map((day) => (
                                      <button
                                        key={day.id}
                                        type="button"
                                        onClick={() =>
                                          toggleAvailabilityDay(
                                            day.id,
                                            [1, 2, 3, 4, 5, 6],
                                          )
                                        }
                                        className="text-[10px] font-black text-slate-400 hover:text-[#657c36] text-center uppercase tracking-tighter hover:underline cursor-pointer"
                                        title={`Inverter toda a manhã de ${day.label}`}
                                      >
                                        {day.id}
                                      </button>
                                    ))}

                                    {[1, 2, 3, 4, 5, 6].map((p) => (
                                      <React.Fragment key={p}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleAvailabilityPeriod(p)
                                          }
                                          className="text-[10px] font-black text-slate-505 hover:text-[#657c36] flex items-center justify-center p-0.5 h-7 hover:underline cursor-pointer"
                                          title={`Inverter a ${p}ª aula em todos os dias`}
                                        >
                                          {p}ª
                                        </button>
                                        {DAYS.map((day) => {
                                          const slotId = `${day.id}-${p}`;
                                          const isSelected =
                                            newTeacherUnavailability.includes(
                                              slotId,
                                            );
                                          return (
                                            <button
                                              key={slotId}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                startAvailabilityPainting(
                                                  slotId,
                                                );
                                              }}
                                              onMouseEnter={() =>
                                                handleAvailabilityMouseEnter(
                                                  slotId,
                                                )
                                              }
                                              className={`h-7 rounded-md border-2 transition-all flex items-center justify-center cursor-crosshair select-none ${
                                                isSelected
                                                  ? "bg-slate-300 border-slate-300 text-white"
                                                  : "bg-[#e5edd6] border-[#c0d4a1] hover:border-slate-300 hover:bg-slate-50"
                                              }`}
                                              title={`${day.label} - ${p}ª Aula`}
                                            >
                                              {isSelected ? (
                                                <X className="w-3 h-3" />
                                              ) : (
                                                <CheckCircle2 className="w-3 h-3 text-[#657c36]" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>

                                {/* Tarde */}
                                <div>
                                  <h4 className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-2 border-b border-orange-100 pb-1 flex justify-between items-center">
                                    <span>Período da Tarde</span>
                                    <span className="text-[7.5px] font-bold text-slate-400 normal-case italic">
                                      Arraste para pintar • Clique nos
                                      cabeçalhos para selecionar tudo
                                    </span>
                                  </h4>
                                  <div className="grid grid-cols-6 gap-1">
                                    <div className="col-span-1"></div>
                                    {DAYS.map((day) => (
                                      <button
                                        key={day.id}
                                        type="button"
                                        onClick={() =>
                                          toggleAvailabilityDay(
                                            day.id,
                                            [7, 8, 9, 10, 11, 12],
                                          )
                                        }
                                        className="text-[10px] font-black text-slate-400 hover:text-orange-600 text-center uppercase tracking-tighter hover:underline cursor-pointer"
                                        title={`Inverter toda a tarde de ${day.label}`}
                                      >
                                        {day.id}
                                      </button>
                                    ))}

                                    {[7, 8, 9, 10, 11, 12].map((p, idx) => (
                                      <React.Fragment key={p}>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleAvailabilityPeriod(p)
                                          }
                                          className="text-[10px] font-black text-slate-505 hover:text-orange-600 flex items-center justify-center p-0.5 h-7 hover:underline cursor-pointer"
                                          title={`Inverter a ${idx + 1}ª aula da tarde em todos os dias`}
                                        >
                                          {idx + 1}ª
                                        </button>
                                        {DAYS.map((day) => {
                                          const slotId = `${day.id}-${p}`;
                                          const isSelected =
                                            newTeacherUnavailability.includes(
                                              slotId,
                                            );
                                          return (
                                            <button
                                              key={slotId}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                startAvailabilityPainting(
                                                  slotId,
                                                );
                                              }}
                                              onMouseEnter={() =>
                                                handleAvailabilityMouseEnter(
                                                  slotId,
                                                )
                                              }
                                              className={`h-7 rounded-md border-2 transition-all flex items-center justify-center cursor-crosshair select-none ${
                                                isSelected
                                                  ? "bg-slate-300 border-slate-300 text-white"
                                                  : "bg-orange-100 border-orange-300 hover:border-slate-300 hover:bg-slate-50"
                                              }`}
                                              title={`${day.label} - ${idx + 1}ª Aula Tarde`}
                                            >
                                              {isSelected ? (
                                                <X className="w-3 h-3" />
                                              ) : (
                                                <CheckCircle2 className="w-3 h-3 text-orange-500" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>

                                {/* Noite */}
                                {enableNoite && (
                                  <div className="animate-in fade-in zoom-in-95">
                                    <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-2 border-b border-indigo-100 pb-1 flex justify-between items-center">
                                      <span>Período da Noite</span>
                                      <span className="text-[7.5px] font-bold text-slate-400 normal-case italic">
                                        Arraste para pintar • Clique nos
                                        cabeçalhos para selecionar tudo
                                      </span>
                                    </h4>
                                    <div className="grid grid-cols-6 gap-1">
                                      <div className="col-span-1"></div>
                                      {DAYS.map((day) => (
                                        <button
                                          key={day.id}
                                          type="button"
                                          onClick={() =>
                                            toggleAvailabilityDay(
                                              day.id,
                                              PERIODS_NOITE,
                                            )
                                          }
                                          className="text-[10px] font-black text-slate-400 hover:text-indigo-600 text-center uppercase tracking-tighter hover:underline cursor-pointer"
                                          title={`Inverter toda a noite de ${day.label}`}
                                        >
                                          {day.id}
                                        </button>
                                      ))}

                                      {PERIODS_NOITE.map((p, idx) => (
                                        <React.Fragment key={p}>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleAvailabilityPeriod(p)
                                            }
                                            className="text-[10px] font-black text-slate-505 hover:text-indigo-600 flex items-center justify-center p-0.5 h-7 hover:underline cursor-pointer"
                                            title={`Inverter a ${idx + 1}ª aula da noite em todos os dias`}
                                          >
                                            {idx + 1}ª
                                          </button>
                                          {DAYS.map((day) => {
                                            const slotId = `${day.id}-${p}`;
                                            const isSelected =
                                              newTeacherUnavailability.includes(
                                                slotId,
                                              );
                                            return (
                                              <button
                                                key={slotId}
                                                type="button"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  startAvailabilityPainting(
                                                    slotId,
                                                  );
                                                }}
                                                onMouseEnter={() =>
                                                  handleAvailabilityMouseEnter(
                                                    slotId,
                                                  )
                                                }
                                                className={`h-7 rounded-md border-2 transition-all flex items-center justify-center cursor-crosshair select-none ${
                                                  isSelected
                                                    ? "bg-slate-300 border-slate-300 text-white"
                                                    : "bg-indigo-100 border-indigo-300 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                                title={`${day.label} - ${idx + 1}ª Aula Noite`}
                                              >
                                                {isSelected ? (
                                                  <X className="w-3 h-3" />
                                                ) : (
                                                  <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                                )}
                                              </button>
                                            );
                                          })}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex flex-wrap gap-1.5 items-center justify-between border-t border-slate-100 pt-3">
                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const morningSlots = DAYS.flatMap((d) =>
                                        [1, 2, 3, 4, 5, 6].map(
                                          (p) => `${d.id}-${p}`,
                                        ),
                                      );
                                      setNewTeacherUnavailability((prev) =>
                                        prev.filter(
                                          (s) => !morningSlots.includes(s),
                                        ),
                                      );
                                    }}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all text-[8px] font-black uppercase rounded-md tracking-tight border border-emerald-200/50"
                                  >
                                    + Manhã
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const afternoonSlots = DAYS.flatMap((d) =>
                                        [7, 8, 9, 10, 11, 12].map(
                                          (p) => `${d.id}-${p}`,
                                        ),
                                      );
                                      setNewTeacherUnavailability((prev) =>
                                        prev.filter(
                                          (s) => !afternoonSlots.includes(s),
                                        ),
                                      );
                                    }}
                                    className="px-2 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all text-[8px] font-black uppercase rounded-md tracking-tight border border-orange-200/50"
                                  >
                                    + Tarde
                                  </button>
                                  {enableNoite && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nightSlots = DAYS.flatMap((d) =>
                                          PERIODS_NOITE.map(
                                            (p) => `${d.id}-${p}`,
                                          ),
                                        );
                                        setNewTeacherUnavailability((prev) =>
                                          prev.filter(
                                            (s) => !nightSlots.includes(s),
                                          ),
                                        );
                                      }}
                                      className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all text-[8px] font-black uppercase rounded-md tracking-tight border border-indigo-200/50"
                                    >
                                      + Noite
                                    </button>
                                  )}
                                </div>

                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewTeacherUnavailability(
                                        DAYS.flatMap((d) =>
                                          (enableNoite
                                            ? [
                                                ...PERIODS_MANHA,
                                                ...PERIODS_TARDE,
                                                ...PERIODS_NOITE,
                                              ]
                                            : [
                                                ...PERIODS_MANHA,
                                                ...PERIODS_TARDE,
                                              ]
                                          ).map((p) => `${d.id}-${p}`),
                                        ),
                                      )
                                    }
                                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all text-[8px] font-black uppercase rounded-md border border-blue-200/50 cursor-pointer"
                                  >
                                    BLOQUEAR TUDO
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewTeacherUnavailability([])
                                    }
                                    className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 transition-all text-[8px] font-black uppercase rounded-md border border-red-200/50 cursor-pointer"
                                  >
                                    PODE TODOS
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                            </div>
                          )}

                          <button
                            onClick={addTeacher}
                            className={`w-full py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 ${
                              editingTeacherId
                                ? "bg-[#657c36] text-white"
                                : "bg-slate-900 text-white hover:bg-black"
                            }`}
                          >
                            {editingTeacherId ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> Salvar
                                Alterações
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" /> Cadastrar Professor
                              </>
                            )}
                          </button>
                        </div>

                        <div
                          className={
                            isProfessoresRoute
                              ? "flex-1 min-w-0 flex flex-col h-full pr-6 border-r border-slate-100"
                              : "mt-2 flex flex-col"
                          }
                        >
                          <div className="flex flex-wrap gap-1 pb-1 shrink-0">
                            {[
                              "Todos",
                              ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
                            ].map((letter) => (
                              <button
                                key={letter}
                                onClick={() =>
                                  setTeacherLetterFilter(
                                    letter === "Todos" ? null : letter,
                                  )
                                }
                                className={`px-2 py-1 text-[9px] font-black rounded uppercase transition-colors ${
                                  teacherLetterFilter === letter ||
                                  (letter === "Todos" && !teacherLetterFilter)
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>

                          {/* Filtro por Matéria */}
                          <div className="flex flex-wrap gap-1 pb-2 pt-1.5 border-t border-slate-100 shrink-0 mt-1">
                            <button
                              onClick={() => setTeacherSubjectFilter(null)}
                              className={`px-2 py-1 text-[8.5px] font-black rounded uppercase transition-colors ${
                                !teacherSubjectFilter
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              Todas Matérias
                            </button>
                            {subjects.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => setTeacherSubjectFilter(sub.id)}
                                className={`px-2 py-1 text-[8.5px] font-black rounded uppercase transition-colors ${
                                  teacherSubjectFilter === sub.id
                                    ? "bg-[#657c36] text-white font-extrabold"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>

                          {(() => {
                            const teacherLoads: Record<string, number> = {};
                            for (const turmaId in schedules) {
                              // Ignorar espelhos de salas especiais para o cálculo de carga horária do professor
                              const turmaObj = turmas.find(
                                (t) => t.id === turmaId,
                              );
                              if (turmaObj && turmaObj.isRoom) continue;

                              const turmaSched = schedules[turmaId];
                              if (!turmaSched) continue;
                              for (const slotId in turmaSched) {
                                const slot = turmaSched[slotId];
                                if (
                                  slot &&
                                  slot.teacherId &&
                                  slot.teacherId !== "none"
                                ) {
                                  teacherLoads[slot.teacherId] =
                                    (teacherLoads[slot.teacherId] || 0) + 1;
                                }
                              }
                            }

                            return (
                              <div
                                className={`overflow-y-auto pr-2 custom-scrollbar ${isProfessoresRoute ? "flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 content-start" : "max-h-60 space-y-2"}`}
                              >
                                {teachers
                                  .filter(
                                    (t) =>
                                      (!teacherLetterFilter ||
                                        t.name
                                          .toUpperCase()
                                          .startsWith(teacherLetterFilter)) &&
                                      (!teacherSubjectFilter ||
                                        t.subjectIds?.includes(teacherSubjectFilter)),
                                  )
                                  .map((teacher) => {
                                    const teacherSubjects = subjects.filter(
                                      (s) => teacher.subjectIds?.includes(s.id),
                                    );
                                    const currentLoad =
                                      teacherLoads[teacher.id] || 0;
                                    const expectedLoad = teacher.schoolWorkload;
                                    const isIncomplete =
                                      expectedLoad &&
                                      currentLoad < expectedLoad;

                                    return (
                                      <div
                                        key={teacher.id}
                                        onMouseEnter={() =>
                                          setHoveredTeacherId(teacher.id)
                                        }
                                        onMouseLeave={() =>
                                          setHoveredTeacherId(null)
                                        }
                                        className={`relative flex flex-col p-3 rounded-xl hover:bg-white border transition-all group ${hoveredTeacherId === teacher.id ? "ring-2 ring-indigo-500 bg-white" : ""} ${isIncomplete ? "bg-amber-50/50 border-amber-200 hover:border-amber-300 shadow-sm" : "bg-slate-50 border-transparent hover:border-slate-200"}`}
                                      >
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2 pr-14">
                                            <span className="text-xs font-black text-slate-800 break-words">
                                              {teacher.name}
                                            </span>
                                            {teacher.schoolWorkload !==
                                              undefined && (
                                              <span
                                                className={`text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm flex gap-1 ${isIncomplete ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 animate-pulse" : "bg-purple-100 text-purple-700"}`}
                                                title={`Carga máxima fixada em ${teacher.schoolWorkload} aulas gerais neste colégio`}
                                              >
                                                Geral:{" "}
                                                <span
                                                  className={
                                                    isIncomplete
                                                      ? "text-amber-900"
                                                      : ""
                                                  }
                                                >
                                                  {currentLoad} /{" "}
                                                  {teacher.schoolWorkload}h
                                                </span>
                                                {isIncomplete && (
                                                  <AlertCircle className="w-2 h-2 inline" />
                                                )}
                                              </span>
                                            )}
                                            {(teacher.schoolWorkloadManha !==
                                              undefined ||
                                              teacher.schoolWorkloadTarde !==
                                                undefined ||
                                              (teacher.schoolWorkloadNoite !==
                                                undefined &&
                                                enableNoite)) && (
                                              <span
                                                className="text-[7px] font-black bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm flex items-center gap-1"
                                                title="Cargas por período (Manhã, Tarde, Noite)"
                                              >
                                                Períodos:
                                                {teacher.schoolWorkloadManha !==
                                                  undefined && (
                                                  <span className="font-extrabold text-[7px]">
                                                    M:
                                                    {
                                                      teacher.schoolWorkloadManha
                                                    }
                                                    h
                                                  </span>
                                                )}
                                                {teacher.schoolWorkloadTarde !==
                                                  undefined && (
                                                  <span className="font-extrabold text-[7px]">
                                                    T:
                                                    {
                                                      teacher.schoolWorkloadTarde
                                                    }
                                                    h
                                                  </span>
                                                )}
                                                {teacher.schoolWorkloadNoite !==
                                                  undefined &&
                                                  enableNoite && (
                                                    <span className="font-extrabold text-[7px]">
                                                      N:
                                                      {
                                                        teacher.schoolWorkloadNoite
                                                      }
                                                      h
                                                    </span>
                                                  )}
                                              </span>
                                            )}
                                            {teacher.availability &&
                                              teacher.availability.length >
                                                0 && (
                                                <span
                                                  className="text-[7px] font-black bg-blue-100 text-blue-600 px-1 py-0.5 rounded uppercase tracking-tighter"
                                                  title="Disponibilidade configurada"
                                                >
                                                  Disp.
                                                </span>
                                              )}
                                            {teacher.preferDoubleClasses && (
                                              <span
                                                className="text-[7px] font-black bg-amber-100 text-amber-700 px-1 py-0.5 rounded uppercase tracking-tighter"
                                                title="Prefere aulas geminadas"
                                              >
                                                Geminadas
                                              </span>
                                            )}
                                            {teacher.requireShiftInterval && (
                                              <span
                                                className="text-[7px] font-black bg-rose-100 text-rose-700 px-1 py-0.5 rounded uppercase tracking-tighter"
                                                title="Exige intervalo entre turnos consecutivas"
                                              >
                                                Intervalo Turno
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-1 mt-1.5">
                                            {teacherSubjects.map((s) => (
                                              <span
                                                key={s.id}
                                                className="text-[8px] font-black bg-[#657c36]/10 text-[#657c36] px-1.5 py-0.5 rounded uppercase"
                                              >
                                                {s.name}
                                              </span>
                                            ))}
                                            {teacherSubjects.length === 0 && (
                                              <span className="text-[8px] font-bold text-slate-400">
                                                Sem disciplina vinculada
                                              </span>
                                            )}
                                          </div>
                                          {teacher.turmaIds &&
                                          teacher.turmaIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 items-center mt-1.5">
                                              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight">
                                                Turmas:
                                              </span>
                                              {turmas
                                                .filter((t) =>
                                                  teacher.turmaIds?.includes(
                                                    t.id,
                                                  ),
                                                )
                                                .map((t) => (
                                                  <span
                                                    key={t.id}
                                                    className="text-[7.5px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-1 rounded uppercase tracking-tighter leading-none"
                                                  >
                                                    {t.name}
                                                  </span>
                                                ))}
                                            </div>
                                          ) : (
                                            <div className="text-[7.5px] font-semibold text-slate-400 mt-1.5 uppercase tracking-tight">
                                              Todas as Turmas
                                            </div>
                                          )}
                                        </div>

                                        {/* Absolute Positioned Actions Layer (Visible on hover on Desktop, always visible on mobile if needed, but doing hover mostly) */}
                                        <div className="absolute top-2 right-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                          <button
                                            onClick={() =>
                                              startEditTeacher(teacher)
                                            }
                                            className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-md shadow-sm border border-slate-200 transition-colors"
                                            title="Editar Professor"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              removeTeacher(teacher.id)
                                            }
                                            className="p-1.5 bg-white text-slate-400 hover:text-rose-600 rounded-md shadow-sm border border-slate-200 transition-colors"
                                            title="Excluir Professor"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Subjects Management Modal */}
        <AnimatePresence>
          {(isAddingSubject || isDisciplinasRoute) && (
            <div
              className={`fixed inset-y-0 right-0 z-[85] flex ${isDisciplinasRoute ? "w-[90vw]" : "w-[500px]"} bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.15)] pointer-events-auto border-l border-slate-200`}
            >
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`bg-white font-sans flex flex-col h-full p-6 w-full max-h-screen overflow-y-auto custom-scrollbar`}
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {editingSubjectId
                          ? "Editar Disciplina"
                          : "Cadastrar Nova Disciplina"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-1">
                        Defina as informações e regras de atribuição curricular
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isDisciplinasRoute) navigate("/horarios");
                      setIsAddingSubject(false);
                      setEditingSubjectId(null);
                      setNewSubjectName("");
                      setNewSubjectColor(generateDistinctColor(subjects));
                      setNewSubjectWorkload(2);
                      setNewSubjectIsTechnical(false);
                      setNewSubjectUseLabComp(false);
                      setNewSubjectUseLabTab(false);
                      setNewSubjectUseSalaMat(false);
                      setNewSubjectRoomIds([]);
                      setNewSubjectLabWorkload(0);
                      setNewSubjectClassWorkload(0);
                      setNewSubjectCustomWorkloads({});
                      setShowCustomWorkloads(false);
                    }}
                    className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Side-by-side layout string */}
                <div
                  className={`flex-1 flex ${isDisciplinasRoute ? "flex-row-reverse gap-6 h-full overflow-hidden" : "flex-col space-y-4"} pt-4`}
                >
                  <div
                    className={
                      isDisciplinasRoute
                        ? "flex-1 min-w-0 flex flex-col h-full border-l border-slate-100 pl-6"
                        : "pb-3 border-b border-slate-100 shrink-0 flex flex-col"
                    }
                  >
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2 px-1 shrink-0">
                      Disciplinas Já Cadastradas
                    </label>
                    <div
                      className={`overflow-y-auto pr-2 custom-scrollbar ${isDisciplinasRoute ? "flex-1 min-h-0" : "max-h-60"}`}
                    >
                      {subjects.length === 0 ? (
                        <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase">
                          Nenhuma disciplina cadastrada
                        </div>
                      ) : (
                        <div
                          className={
                            isDisciplinasRoute
                              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 content-start"
                              : "grid grid-cols-2 gap-2"
                          }
                        >
                          {subjects
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((s) => (
                              <div
                                key={s.id}
                                className="relative flex flex-col min-w-0 break-words gap-0.5 p-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg group hover:border-[#657c36] hover:bg-white transition-all"
                              >
                                <div className="flex flex-col min-w-0 pr-10">
                                  <span
                                    className="text-[10px] font-black text-slate-700 uppercase cursor-default truncate"
                                    title={s.name}
                                  >
                                    {s.name}
                                  </span>
                                  <div className="flex gap-2.5 mt-0.5">
                                    <span className="text-[8px] font-bold text-slate-400">
                                      Padrão: {s.workload}
                                    </span>
                                    {s.workloadFundamental && (
                                      <span className="text-[8px] font-bold text-emerald-600">
                                        Fund: {s.workloadFundamental}
                                      </span>
                                    )}
                                    {s.workloadMedio && (
                                      <span className="text-[8px] font-bold text-blue-600">
                                        Médio: {s.workloadMedio}
                                      </span>
                                    )}
                                    {s.isTechnical && (
                                      <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded border border-indigo-100 uppercase">
                                        {techCourseName}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => startEditSubject(s)}
                                    className="p-1.5 bg-white text-slate-400 hover:text-[#657c36] rounded-md shadow-sm border border-slate-200 transition-colors"
                                    title="Editar Disciplina"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => removeSubject(s.id)}
                                    className="p-1.5 bg-white text-slate-400 hover:text-red-500 rounded-md shadow-sm border border-slate-200 transition-colors"
                                    title="Excluir Disciplina"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form side */}
                  <div
                    className={
                      isDisciplinasRoute
                        ? "w-[400px] shrink-0 h-full overflow-y-auto pr-2 custom-scrollbar flex flex-col pt-1"
                        : "flex flex-col"
                    }
                  >
                    <div className="flex flex-col space-y-4 text-left">
                      {/* Tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button
                          onClick={() => setSubjectModalTab("geral")}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            subjectModalTab === "geral"
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Cadastro & Carga
                        </button>
                        <button
                          onClick={() => setSubjectModalTab("vinculos")}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            subjectModalTab === "vinculos"
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Regras & Vínculos
                        </button>
                      </div>

                      {/* Interactive Collapsible Guide Card */}
                      <details className="group border border-slate-200/80 bg-slate-50/70 rounded-2xl p-3.5 transition-all [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-[#657c36]" />
                            <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider font-sans">💡 Guia Rápido de Regras & Atribuição</span>
                          </div>
                          <span className="text-[8.5px] font-black text-[#657c36] uppercase tracking-widest group-open:hidden bg-[#657c36]/10 px-2 py-0.5 rounded-full">Expandir Guia</span>
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest hidden group-open:inline bg-slate-100 px-2 py-0.5 rounded-full">Ocultar</span>
                        </summary>
                        <div className="mt-3 border-t border-slate-200/50 pt-3 space-y-3.5 text-[9.5px] text-slate-600 leading-relaxed font-sans">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-800 uppercase text-[9px]">
                              <span className="w-1.5 h-1.5 bg-[#657c36] rounded-full" />
                              <span>1. Carga Horária Padrão vs. Por Nível</span>
                            </div>
                            <p className="pl-3 text-slate-500">
                              O campo <b>Padrão Geral</b> define a carga de aulas semanais para todas as turmas (ex: 2 aulas). Caso queira que turmas do Ensino Fundamental tenham uma carga e as do Ensino Médio outra, preencha os campos específicos de cada nível.
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-800 uppercase text-[9px]">
                              <span className="w-1.5 h-1.5 bg-[#657c36] rounded-full" />
                              <span>2. Restrição por Séries ou Sufixos</span>
                            </div>
                            <p className="pl-3 text-slate-500">
                              Se a disciplina for exclusiva de um ano, digite o número (ex: <b>1</b> para 1º Ano, <b>6</b> para 6º Ano). Para restringir a turmas específicas, digite o sufixo (ex: <b>A</b> para turmas A). Deixe vazio para aplicar a todas.
                            </p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-extrabold text-slate-800 uppercase text-[9px]">
                              <span className="w-1.5 h-1.5 bg-[#657c36] rounded-full" />
                              <span>3. Salas Especiais & Infraestrutura</span>
                            </div>
                            <p className="pl-3 text-slate-500">
                              Marque os laboratórios ou salas temáticas onde a disciplina obrigatoriamente deve acontecer (ex: Laboratório de Ciências). O algoritmo inteligente de alocação de grade respeitará esse vínculo.
                            </p>
                          </div>
                        </div>
                      </details>

                      {subjectModalTab === "geral" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                          {/* COLUMN 1: CADASTRO & CARGA */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                              <span className="text-[10px] font-black text-[#657c36] uppercase tracking-wider">
                                Cadastro & Carga Horária
                              </span>
                            </div>

                            {/* Nome da Disciplina & Cor */}
                            <div className="flex gap-3">
                              <div className="space-y-1 flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-0.5">
                                  Nome da Disciplina:
                                </label>
                                <input
                                  type="text"
                                  value={newSubjectName}
                                  onChange={(e) =>
                                    setNewSubjectName(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && addSubject()
                                  }
                                  placeholder="Ex: Matemática, Física, Artes..."
                                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all font-sans"
                                />
                              </div>
                              <div className="space-y-1 w-20">
                                <label
                                  className="text-[9px] font-black text-slate-400 uppercase ml-0.5"
                                  title="Cor de destaque na grade"
                                >
                                  Cor:
                                </label>
                                <input
                                  type="color"
                                  value={newSubjectColor || "#cbd5e1"}
                                  onChange={(e) =>
                                    setNewSubjectColor(e.target.value)
                                  }
                                  className="w-full h-[42px] p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                                  title="Escolha uma cor para a disciplina"
                                />
                              </div>
                            </div>

                            {/* Carga Horária Padrão */}
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-0.5">
                                Carga Horária (Aulas por Semana):
                              </label>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-slate-500 uppercase">
                                    Padrão Geral
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={newSubjectWorkload}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      setNewSubjectWorkload(val);
                                      setNewSubjectClassWorkload(val);
                                      setNewSubjectLabWorkload(0);
                                    }}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase">
                                      Ensino Fundamental
                                    </span>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder={String(newSubjectWorkload)}
                                      value={newSubjectWorkloadFundamental}
                                      onChange={(e) =>
                                        setNewSubjectWorkloadFundamental(
                                          e.target.value === ""
                                            ? ""
                                            : parseInt(e.target.value),
                                        )
                                      }
                                      className="w-full px-3 py-2 bg-emerald-50/30 border border-emerald-200 rounded-xl text-xs font-black text-emerald-900 focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-bold text-blue-600 uppercase">
                                      Ensino Médio
                                    </span>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder={String(newSubjectWorkload)}
                                      value={newSubjectWorkloadMedio}
                                      onChange={(e) =>
                                        setNewSubjectWorkloadMedio(
                                          e.target.value === ""
                                            ? ""
                                            : parseInt(e.target.value),
                                        )
                                      }
                                      className="w-full px-3 py-2 bg-blue-50/30 border border-blue-200 rounded-xl text-xs font-black text-blue-900 focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Componente Curricular: Técnico? */}
                            <div className="mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                              <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                  <input
                                    type="checkbox"
                                    checked={newSubjectIsTechnical}
                                    onChange={(e) =>
                                      setNewSubjectIsTechnical(e.target.checked)
                                    }
                                    className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                                  />
                                  <Check className="w-2.5 h-2.5 text-white absolute opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all pointer-events-none" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-indigo-900 block mb-0.5">
                                    Disciplina Técnica / Profissionalizante
                                  </span>
                                  <span className="text-[9px] text-indigo-700/80 leading-tight block font-semibold">
                                    Marque para garantir que essa matéria só seja
                                    lecionada em turmas marcadas como "Técnico". Ex:{" "}
                                    {techCourseName}, Finanças, etc.
                                  </span>
                                </div>
                              </label>
                            </div>

                            {/* Salas de Aula / Laboratórios */}
                            <div className="space-y-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <label className="text-[9px] font-black text-slate-400 uppercase block ml-0.5">
                                Infraestrutura / Salas Específicas:
                              </label>
                              <div className="grid grid-cols-2 gap-1.5 mt-1">
                                {turmas
                                  .filter((t) => t.isRoom)
                                  .map((room) => (
                                    <label
                                      key={room.id}
                                      className="flex items-center gap-2 cursor-pointer group p-1.5 bg-white border border-slate-100 rounded-lg hover:border-slate-350 transition-all"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={newSubjectRoomIds.includes(
                                          room.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setNewSubjectRoomIds([
                                              ...newSubjectRoomIds,
                                              room.id,
                                            ]);
                                          } else {
                                            setNewSubjectRoomIds(
                                              newSubjectRoomIds.filter(
                                                (rid) => rid !== room.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#657c36] focus:ring-[#657c36]"
                                      />
                                      <span
                                        className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 truncate"
                                        title={room.name}
                                      >
                                        {room.name}
                                      </span>
                                    </label>
                                  ))}
                                {turmas.filter((t) => t.isRoom).length === 0 && (
                                  <span className="text-[9px] text-slate-400 font-bold italic col-span-2 text-center py-2">
                                    Nenhuma sala especial cadastrada
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Excess Workload Guard */}
                          {newSubjectClassWorkload + newSubjectLabWorkload >
                            newSubjectWorkload && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mt-2">
                              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              <p className="text-[10px] font-bold text-red-600 leading-tight">
                                A soma das aulas (
                                {newSubjectClassWorkload + newSubjectLabWorkload})
                                excede a carga total ({newSubjectWorkload}).
                              </p>
                            </div>
                          )}

                          {/* Accordion: Specific workloads per class */}
                          <div className="pt-1.5 border-t border-slate-100 mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setShowCustomWorkloads(!showCustomWorkloads)
                              }
                              className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                            >
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                Diferenciar Carga Horária por Turma (Opcional)
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-500 transition-transform ${showCustomWorkloads ? "rotate-180" : ""}`}
                              />
                            </button>

                            {showCustomWorkloads && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-2.5 space-y-1.5 border-l-2 border-purple-100 pl-3 pb-1.5 max-h-48 overflow-y-auto custom-scrollbar"
                              >
                                <p className="text-[8.5px] font-bold text-slate-400 uppercase leading-snug mb-1.5">
                                  Defina cargas diferentes para turmas específicas.
                                  Deixar vazio utilizará o padrão de{" "}
                                  {newSubjectWorkload} aulas:
                                </p>
                                {turmas
                                  .filter(
                                    (t) =>
                                      !t.isRoom &&
                                      (newSubjectAllowedTurmaIds.length === 0 ||
                                        newSubjectAllowedTurmaIds.includes(t.id)),
                                  )
                                  .sort((a, b) =>
                                    a.name.localeCompare(b.name, undefined, {
                                      numeric: true,
                                    }),
                                  )
                                  .map((turma) => {
                                    const customValue =
                                      newSubjectCustomWorkloads[turma.id] !==
                                      undefined
                                        ? newSubjectCustomWorkloads[turma.id]
                                        : "";
                                    const isCustomized =
                                      newSubjectCustomWorkloads[turma.id] !==
                                      undefined;

                                    return (
                                      <div
                                        key={turma.id}
                                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${isCustomized ? "bg-purple-50/50 border-purple-200" : "bg-slate-50 border-slate-100 opacity-85 hover:opacity-100"}`}
                                      >
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                          {turma.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center bg-white border border-slate-250 rounded-xl px-2 py-0.5 shadow-xs w-24 focus-within:border-purple-400 transition-all">
                                            <span className="text-[7pt] font-black text-slate-400 mr-1.5 uppercase">
                                              Aulas:
                                            </span>
                                            <input
                                              type="number"
                                              placeholder={`${newSubjectWorkload}`}
                                              value={customValue}
                                              onChange={(e) => {
                                                const valStr = e.target.value.trim();
                                                const updated = {
                                                  ...newSubjectCustomWorkloads,
                                                };
                                                if (valStr === "") {
                                                  delete updated[turma.id];
                                                } else {
                                                  updated[turma.id] =
                                                    parseInt(valStr) || 0;
                                                }
                                                setNewSubjectCustomWorkloads(updated);
                                              }}
                                              className="w-full bg-transparent text-[11px] font-black focus:outline-none text-right text-slate-800 font-mono"
                                              min="0"
                                            />
                                          </div>
                                          {isCustomized && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = {
                                                  ...newSubjectCustomWorkloads,
                                                };
                                                delete updated[turma.id];
                                                setNewSubjectCustomWorkloads(updated);
                                              }}
                                              className="text-[8px] font-black text-red-500 hover:text-red-700 uppercase transition-all"
                                            >
                                              Limpar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}

                      {subjectModalTab === "vinculos" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                          {/* COLUMN 2: REGRAS & VÍNCULOS */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                              <span className="text-[10px] font-black text-purple-650 text-purple-600 uppercase tracking-wider">
                                Regras & Vínculos Curriculares
                              </span>
                            </div>

                            {/* Nível de Ensino */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase ml-0.5">
                                Filtro de Nível de Ensino:
                              </label>
                              <select
                                value={newSubjectLevelConstraint}
                                onChange={(e) =>
                                  setNewSubjectLevelConstraint(
                                    e.target.value as any,
                                  )
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all cursor-pointer font-sans"
                              >
                                <option value="ambos">
                                  Ambos os Níveis (Ensino Médio e Fundamental)
                                </option>
                                <option value="fundamental">
                                  Apenas Ensino Fundamental II (6º ao 9º Ano)
                                </option>
                                <option value="medio">
                                  Apenas Ensino Médio (1º ao 3º Ano)
                                </option>
                                <option value="tecnico">
                                  Ensino Médio Integrado ao Técnico (
                                  {techCourseName})
                                </option>
                              </select>
                            </div>

                            {/* Filtro de Série e Sufixo */}
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label
                                  className="text-[9px] font-black text-slate-400 uppercase ml-0.5"
                                  title="Ex: 6, 7º, 1"
                                >
                                  Restringir a Séries:
                                </label>
                                <input
                                  type="text"
                                  value={newSubjectGradeConstraint}
                                  onChange={(e) =>
                                    setNewSubjectGradeConstraint(e.target.value)
                                  }
                                  placeholder="Ex: 6, 1 (vazio=todas)"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all font-mono"
                                />
                              </div>

                              <div className="space-y-1">
                                <label
                                  className="text-[9px] font-black text-slate-400 uppercase ml-0.5"
                                  title="Ex: A, B, Integral"
                                >
                                  Restringir a Sufixo:
                                </label>
                                <input
                                  type="text"
                                  value={newSubjectSuffixConstraint}
                                  onChange={(e) =>
                                    setNewSubjectSuffixConstraint(e.target.value)
                                  }
                                  placeholder="Ex: A, B (vazio=todos)"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 transition-all font-mono"
                                />
                              </div>
                            </div>

                            {/* Whitelist of allowed classes */}
                            <div className="space-y-1">
                              <label
                                className="text-[9px] font-black text-slate-400 uppercase ml-0.5 block"
                                title="Força a disciplina a pertencer somente a estas turmas selecionadas"
                              >
                                Vincular apenas a turmas específicas (opcional):
                              </label>
                              <div className="max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 custom-scrollbar">
                                {turmas
                                  .filter((t) => !t.isRoom)
                                  .map((turma) => (
                                    <label
                                      key={turma.id}
                                      className="flex items-center gap-2 cursor-pointer group py-0.5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={newSubjectAllowedTurmaIds.includes(
                                          turma.id,
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setNewSubjectAllowedTurmaIds([
                                              ...newSubjectAllowedTurmaIds,
                                              turma.id,
                                            ]);
                                          } else {
                                            setNewSubjectAllowedTurmaIds(
                                              newSubjectAllowedTurmaIds.filter(
                                                (id) => id !== turma.id,
                                              ),
                                            );
                                          }
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                      />
                                      <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 font-mono">
                                        {turma.name}
                                      </span>
                                    </label>
                                  ))}
                                {turmas.filter((t) => !t.isRoom).length === 0 && (
                                  <span className="text-[9px] text-slate-400 font-bold block pt-1 text-center">
                                    Nenhuma turma cadastrada
                                  </span>
                                )}
                              </div>
                              <span className="text-[7.5px] text-slate-400 font-semibold block leading-tight mt-0.5">
                                * Deixe vazio para usar os filtros automáticos por
                                série e nível.
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={newSubjectPreferDouble}
                                  onChange={(e) =>
                                    setNewSubjectPreferDouble(e.target.checked)
                                  }
                                  className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 checked:bg-amber-600 checked:border-amber-600 transition-all cursor-pointer"
                                />
                                <Check className="w-2.5 h-2.5 text-white absolute opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all pointer-events-none" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-amber-900 block mb-0.5">
                                  Forçar Aulas Geminadas (Duplas)
                                </span>
                                <span className="text-[9px] text-amber-700/80 leading-tight block font-semibold">
                                  Prioriza blocos de 2 aulas consecutivas no mesmo
                                  dia para esta matéria específica (Padrão para
                                  matérias com 2 ou mais horários semanais).
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSubject(false);
                        setEditingSubjectId(null);
                        setNewSubjectName("");
                        setNewSubjectColor(generateDistinctColor(subjects));
                        setNewSubjectWorkload(2);
                        setNewSubjectIsTechnical(false);
                        setNewSubjectUseLabComp(false);
                        setNewSubjectUseLabTab(false);
                        setNewSubjectUseSalaMat(false);
                        setNewSubjectRoomIds([]);
                        setNewSubjectLabWorkload(0);
                        setNewSubjectClassWorkload(0);
                        setNewSubjectCustomWorkloads({});
                        setShowCustomWorkloads(false);
                      }}
                      className="flex-1 min-w-[120px] py-2.5 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addSubject}
                      disabled={
                        newSubjectClassWorkload + newSubjectLabWorkload >
                        newSubjectWorkload
                      }
                      className={`flex-[2] min-w-[150px] py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${newSubjectClassWorkload + newSubjectLabWorkload > newSubjectWorkload ? "bg-slate-300 text-slate-500 cursor-not-allowed" : editingSubjectId ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/15" : "bg-slate-900 hover:bg-slate-950 text-white shadow-md shadow-slate-900/15"}`}
                    >
                      {editingSubjectId
                        ? "Salvar Alterações"
                        : "Cadastrar Disciplina"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {isShowingMissingClasses && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsShowingMissingClasses(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-[95vw] lg:max-w-7xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">
                        Painel de Visão Geral
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                        Resumo completo da contabilização de aulas e turmas
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-close-missing-classes-header"
                    onClick={() => setIsShowingMissingClasses(false)}
                    className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors shadow-sm cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status Banner / Metrics Dashboard */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {(() => {
                    let overallExpected = 0;
                    let overallAllocated = 0;
                    let overallMissing = 0;
                    let overallExtra = 0;
                    let turmasComplete = 0;
                    let allocatedTeachers = new Set<string>();
                    let activeSubjects = new Set<string>();

                    let metricTurmas = turmas.filter((t) => !t.isRoom);

                    if (!enableNoite) {
                      metricTurmas = metricTurmas.filter((t) => {
                        const shift =
                          t.shift ||
                          (t.id.toLowerCase().includes("noite") ||
                          t.name.toLowerCase().includes("noite")
                            ? "noite"
                            : t.id.toLowerCase().includes("tarde") ||
                                t.name.toLowerCase().includes("tarde")
                              ? "tarde"
                              : "manha");
                        return shift !== "noite";
                      });
                    }

                    // Apply shift filters to metrics
                    if (missingClassesShift === "manha") {
                      metricTurmas = metricTurmas.filter((t) => {
                        if (t.shift) return t.shift === "manha";
                        return (
                          !t.name.toLowerCase().includes("tarde") &&
                          !t.id.toLowerCase().includes("tarde") &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (missingClassesShift === "tarde") {
                      metricTurmas = metricTurmas.filter((t) => {
                        if (t.shift) return t.shift === "tarde";
                        return (
                          (t.name.toLowerCase().includes("tarde") ||
                            t.id.toLowerCase().includes("tarde")) &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (missingClassesShift === "noite") {
                      metricTurmas = metricTurmas.filter((t) => {
                        if (t.shift) return t.shift === "noite";
                        return (
                          t.name.toLowerCase().includes("noite") ||
                          t.id.toLowerCase().includes("noite")
                        );
                      });
                    }

                    // Apply search filter to metrics
                    if (missingClassesSearch.trim()) {
                      const searchLower = missingClassesSearch.toLowerCase();
                      metricTurmas = metricTurmas.filter((t) => {
                        const matchesTurma = t.name
                          .toLowerCase()
                          .includes(searchLower);
                        const matchesSubject = subjects.some((s) => {
                          const hasThisSubject =
                            getSubjectWorkloadsForTurma(s, t.id).workload > 0;
                          return (
                            hasThisSubject &&
                            s.name.toLowerCase().includes(searchLower)
                          );
                        });
                        return matchesTurma || matchesSubject;
                      });
                    }

                    metricTurmas.forEach((t) => {
                      let isTurmaComplete = true;
                      if (missingClassesSearch.trim()) {
                        subjects.forEach((s) => {
                          const sNameLower = s.name.toLowerCase();
                          const tNameLower = t.name.toLowerCase();
                          const searchLower =
                            missingClassesSearch.toLowerCase();
                          if (
                            !sNameLower.includes(searchLower) &&
                            !tNameLower.includes(searchLower)
                          ) {
                            return;
                          }
                          const { total, usage } = getClassSubjectWorkload(
                            t.id,
                            s.id,
                          );
                          if (total > 0) activeSubjects.add(s.id);
                          overallExpected += total;
                          overallAllocated += Math.min(total, usage);
                          if (total > usage) {
                            overallMissing += total - usage;
                            isTurmaComplete = false;
                          } else if (usage > total) {
                            overallExtra += usage - total;
                            isTurmaComplete = false;
                          }
                        });
                      } else {
                        const cExpected = getEffectiveDailyClassCount(t, isCivicoMilitar) * 5;
                        let cAllocated = 0;
                        if (schedules[t.id]) {
                          Object.values(schedules[t.id]).forEach(
                            (slot: any) => {
                              if (slot && slot.teacherId && slot.subjectId) {
                                cAllocated++;
                                allocatedTeachers.add(slot.teacherId);
                                activeSubjects.add(slot.subjectId);
                              }
                            },
                          );
                        }
                        overallExpected += cExpected;
                        overallAllocated += Math.min(cExpected, cAllocated);
                        if (cExpected > cAllocated) {
                          overallMissing += cExpected - cAllocated;
                          isTurmaComplete = false;
                        } else if (cAllocated > cExpected) {
                          overallExtra += cAllocated - cExpected;
                          isTurmaComplete = false;
                        }
                      }
                      if (isTurmaComplete) turmasComplete++;
                    });

                    const overallCompletion =
                      overallExpected > 0
                        ? Math.round((overallAllocated / overallExpected) * 100)
                        : 0;

                    return (
                      <>
                        <div className="bg-slate-50 p-2.5 rounded-2xl flex flex-col justify-center border border-slate-100">
                          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                            Aulas Esperadas
                          </span>
                          <span className="text-xl font-black text-slate-800 leading-tight mt-0.5">
                            {overallExpected}
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-emerald-100/50">
                          <span className="text-[8.5px] font-black text-emerald-600/70 uppercase tracking-wider">
                            Aulas Distribuídas
                          </span>
                          <span className="text-xl font-black text-emerald-600 leading-tight mt-0.5 flex items-center gap-1.5">
                            {overallAllocated}
                            <span className="text-[10px] font-bold text-emerald-500/70 font-mono">
                              ({overallCompletion}%)
                            </span>
                          </span>
                        </div>
                        <div className="bg-rose-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-rose-100/50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8.5px] font-black text-rose-600/70 uppercase tracking-wider">
                              Aulas Faltantes
                            </span>
                            {overallMissing === 0 && (
                              <span className="bg-green-100 text-green-700 text-[7px] font-black px-1 py-0.5 rounded-sm uppercase tracking-widest leading-none">
                                OK
                              </span>
                            )}
                          </div>
                          <span className="text-xl font-black text-rose-600 leading-tight mt-0.5">
                            {overallMissing}
                          </span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-amber-100/50">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8.5px] font-black text-amber-600/70 uppercase tracking-wider">
                              Excesso (A Mais)
                            </span>
                            {overallExtra > 0 && (
                              <span className="bg-amber-200 text-amber-800 text-[7px] font-black px-1 py-0.5 rounded-sm uppercase tracking-widest leading-none">
                                ALERTA
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-xl font-black leading-tight mt-0.5 ${overallExtra > 0 ? "text-amber-600" : "text-amber-600/50"}`}
                          >
                            {overallExtra}
                          </span>
                        </div>

                        <div className="bg-blue-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-blue-100/50">
                          <span className="text-[8.5px] font-black text-blue-600/70 uppercase tracking-wider">
                            Grades Fechadas
                          </span>
                          <span className="text-xl font-black text-blue-600 leading-tight mt-0.5 flex items-center gap-1.5">
                            {turmasComplete}{" "}
                            <span className="text-[10px] font-bold text-blue-500/70 font-mono">
                              / {metricTurmas.length}
                            </span>
                          </span>
                        </div>
                        <div className="bg-purple-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-purple-100/50">
                          <span className="text-[8.5px] font-black text-purple-600/70 uppercase tracking-wider">
                            Prof. Alocados
                          </span>
                          <span className="text-xl font-black text-purple-600 leading-tight mt-0.5 flex items-center gap-1.5">
                            {allocatedTeachers.size}{" "}
                            <span className="text-[10px] font-bold text-purple-500/70 font-mono">
                              / {teachers.length}
                            </span>
                          </span>
                        </div>
                        <div className="bg-indigo-50/50 p-2.5 rounded-2xl flex flex-col justify-center border border-indigo-100/50">
                          <span className="text-[8.5px] font-black text-indigo-600/70 uppercase tracking-wider">
                            Disciplinas Usadas
                          </span>
                          <span className="text-xl font-black text-indigo-600 leading-tight mt-0.5 flex items-center gap-1.5">
                            {activeSubjects.size}{" "}
                            <span className="text-[10px] font-bold text-indigo-500/70 font-mono">
                              / {subjects.length}
                            </span>
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Advanced Search & Filtering Controls */}
                <div className="p-4 px-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Shift Selection tabs */}
                    <div className="flex bg-slate-200/60 p-1 rounded-xl items-center gap-1">
                      <button
                        id="btn-missing-classes-shift-all"
                        onClick={() => setMissingClassesShift("todos")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === "todos" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Todos
                      </button>
                      <button
                        id="btn-missing-classes-shift-manha"
                        onClick={() => setMissingClassesShift("manha")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === "manha" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Manhã
                      </button>
                      <button
                        id="btn-missing-classes-shift-tarde"
                        onClick={() => setMissingClassesShift("tarde")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === "tarde" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        Tarde
                      </button>
                      {enableNoite && (
                        <button
                          id="btn-missing-classes-shift-noite"
                          onClick={() => setMissingClassesShift("noite")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${missingClassesShift === "noite" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Noite
                        </button>
                      )}
                    </div>

                    {/* Filter Status Selector */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Status:
                      </span>
                      <select
                        id="select-missing-classes-filter"
                        value={missingClassesFilter}
                        onChange={(e) =>
                          setMissingClassesFilter(
                            e.target.value as
                              | "todos"
                              | "faltantes"
                              | "excesso"
                              | "ok",
                          )
                        }
                        className="bg-transparent border-none text-[10px] font-black uppercase text-slate-800 tracking-wider focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="todos">
                          Todos (Distribuídos e Falta)
                        </option>
                        <option value="faltantes">Apenas Faltantes</option>
                        <option value="excesso">Apenas Excesso (+)</option>
                        <option value="ok">Apenas Completos (OK)</option>
                      </select>
                    </div>
                  </div>

                  {/* Search Text Input */}
                  <div className="relative w-full md:w-72">
                    <input
                      id="input-missing-classes-search"
                      type="text"
                      value={missingClassesSearch}
                      onChange={(e) => setMissingClassesSearch(e.target.value)}
                      placeholder="Buscar por turma ou disciplina..."
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-800 transition-all shadow-sm"
                    />
                    {missingClassesSearch && (
                      <button
                        id="btn-clear-missing-search"
                        onClick={() => setMissingClassesSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Main List Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 custom-scrollbar">
                  {(() => {
                    let filteredTurmas = turmas.filter((t) => !t.isRoom);

                    if (!enableNoite) {
                      filteredTurmas = filteredTurmas.filter((t) => {
                        const shift =
                          t.shift ||
                          (t.id.toLowerCase().includes("noite") ||
                          t.name.toLowerCase().includes("noite")
                            ? "noite"
                            : t.id.toLowerCase().includes("tarde") ||
                                t.name.toLowerCase().includes("tarde")
                              ? "tarde"
                              : "manha");
                        return shift !== "noite";
                      });
                    }

                    // Apply shift filters
                    if (missingClassesShift === "manha") {
                      filteredTurmas = filteredTurmas.filter((t) => {
                        if (t.shift) return t.shift === "manha";
                        return (
                          !t.name.toLowerCase().includes("tarde") &&
                          !t.id.toLowerCase().includes("tarde") &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (missingClassesShift === "tarde") {
                      filteredTurmas = filteredTurmas.filter((t) => {
                        if (t.shift) return t.shift === "tarde";
                        return (
                          (t.name.toLowerCase().includes("tarde") ||
                            t.id.toLowerCase().includes("tarde")) &&
                          !t.name.toLowerCase().includes("noite") &&
                          !t.id.toLowerCase().includes("noite")
                        );
                      });
                    } else if (missingClassesShift === "noite") {
                      filteredTurmas = filteredTurmas.filter((t) => {
                        if (t.shift) return t.shift === "noite";
                        return (
                          t.name.toLowerCase().includes("noite") ||
                          t.id.toLowerCase().includes("noite")
                        );
                      });
                    }

                    // Apply search term
                    if (missingClassesSearch.trim()) {
                      const searchLower = missingClassesSearch.toLowerCase();
                      filteredTurmas = filteredTurmas.filter((t) => {
                        const matchesTurma = t.name
                          .toLowerCase()
                          .includes(searchLower);
                        const matchesSubject = subjects.some((s) => {
                          const hasThisSubject =
                            getSubjectWorkloadsForTurma(s, t.id).workload > 0;
                          return (
                            hasThisSubject &&
                            s.name.toLowerCase().includes(searchLower)
                          );
                        });
                        return matchesTurma || matchesSubject;
                      });
                    }

                    // Apply Filter Status to classrooms list
                    if (missingClassesFilter !== "todos") {
                      filteredTurmas = filteredTurmas.filter((t) => {
                        return subjects.some((s) => {
                          const { usage, total } = getClassSubjectWorkload(
                            t.id,
                            s.id,
                          );
                          if (missingClassesFilter === "faltantes") {
                            return total > 0 && usage < total;
                          } else if (missingClassesFilter === "excesso") {
                            return usage > total;
                          } else if (missingClassesFilter === "ok") {
                            return total > 0 && usage === total;
                          }
                          return true;
                        });
                      });
                    }

                    if (filteredTurmas.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                          <span className="text-sm font-black text-slate-800 uppercase">
                            Tudo em Ordem!
                          </span>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            Nenhuma pendência encontrada com as opções
                            selecionadas. Todas as turmas estão com a grade
                            totalmente alocada!
                          </p>
                        </div>
                      );
                    }

                    // Sort turmas cleanly and render
                    const renderedTurmas = sortTurmasList(filteredTurmas).map(
                      (turma) => {
                        // Let's compute statistics for this class
                        let classExpected = 0;
                        let classAllocated = 0;
                        let classMissing = 0;
                        let classExtra = 0;

                        const isSearching = missingClassesSearch.trim() !== "";

                        const classSubjects = subjects
                          .map((s) => {
                            const { usage, total, classroomUsage, labUsage } =
                              getClassSubjectWorkload(turma.id, s.id);
                            const missingCount = Math.max(0, total - usage);
                            const extraCount = Math.max(0, usage - total);

                            // In search mode, we sum individual matched subjects to form the total
                            if (isSearching) {
                              const sNameLower = s.name.toLowerCase();
                              const tNameLower = turma.name.toLowerCase();
                              const searchLower =
                                missingClassesSearch.toLowerCase();
                              if (
                                sNameLower.includes(searchLower) ||
                                tNameLower.includes(searchLower)
                              ) {
                                classExpected += total;
                                classAllocated += Math.min(total, usage);
                                classMissing += missingCount;
                                classExtra += extraCount;
                              }
                            }

                            return {
                              subject: s,
                              usage,
                              total,
                              classroomUsage,
                              labUsage,
                              missingCount,
                              extraCount,
                            };
                          })
                          .filter((item) => item.total > 0 || item.usage > 0);

                        // If NO search applied, we calculate missing/expected via grid slots
                        if (!isSearching) {
                          classExpected = getEffectiveDailyClassCount(turma, isCivicoMilitar) * 5;
                          classAllocated = 0;
                          if (schedules[turma.id]) {
                            Object.values(schedules[turma.id]).forEach(
                              (slot: any) => {
                                if (slot && slot.teacherId && slot.subjectId) {
                                  classAllocated++;
                                }
                              },
                            );
                          }
                          classMissing = Math.max(
                            0,
                            classExpected - classAllocated,
                          );
                          classExtra = Math.max(
                            0,
                            classAllocated - classExpected,
                          );
                        }

                        // Sort subjects of class: place pending ones pointing on top!
                        const sortedClassSubjects = [...classSubjects]
                          .filter((item) => {
                            if (missingClassesSearch.trim()) {
                              const sNameLower =
                                item.subject.name.toLowerCase();
                              const tNameLower = turma.name.toLowerCase();
                              const searchLower =
                                missingClassesSearch.toLowerCase();
                              return (
                                sNameLower.includes(searchLower) ||
                                tNameLower.includes(searchLower)
                              );
                            }
                            return true;
                          })
                          .filter((item) => {
                            if (missingClassesFilter === "faltantes") {
                              return item.missingCount > 0;
                            } else if (missingClassesFilter === "excesso") {
                              return item.extraCount > 0;
                            } else if (missingClassesFilter === "ok") {
                              return (
                                item.total > 0 &&
                                item.missingCount === 0 &&
                                item.extraCount === 0
                              );
                            }
                            return true;
                          })
                          .sort((a, b) => {
                            if (a.missingCount > 0 && b.missingCount === 0)
                              return -1;
                            if (a.missingCount === 0 && b.missingCount > 0)
                              return 1;
                            return a.subject.name.localeCompare(b.subject.name);
                          });

                        const classCompletionRate =
                          classExpected > 0
                            ? Math.round((classAllocated / classExpected) * 100)
                            : 0;

                        if (sortedClassSubjects.length === 0) return null;

                        return (
                          <div
                            key={turma.id}
                            className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                          >
                            {/* Turma summary row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100 font-sans">
                              <div className="flex items-center gap-2">
                                <div className="min-w-[4.25rem] px-2 h-11 rounded-xl bg-slate-900 flex flex-col items-center justify-center text-white font-black shrink-0">
                                  <span className="text-[11px] font-extrabold uppercase tracking-tight leading-none text-center whitespace-nowrap">
                                    {turma.name}
                                  </span>
                                  <span className="text-[6.5px] font-bold uppercase tracking-widest text-slate-300 mt-1 font-sans">
                                    {turma.shift === "manha"
                                      ? "MAN"
                                      : turma.shift === "tarde"
                                        ? "TAR"
                                        : "NOI"}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 uppercase font-sans leading-none flex items-center gap-2">
                                    Turma {turma.name}
                                    {classExtra > 0 && (
                                      <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full tracking-widest">
                                        ALERTA DE EXCESSO (+{classExtra})
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider font-sans leading-none">
                                    <span>
                                      {turma.shift === "manha"
                                        ? "Período da Manhã"
                                        : turma.shift === "tarde"
                                          ? "Período da Tarde"
                                          : "Período da Noite"}
                                    </span>
                                    <span>•</span>
                                    <span
                                      className={
                                        classMissing > 0
                                          ? "text-rose-600 font-black"
                                          : "text-green-600"
                                      }
                                    >
                                      {classMissing > 0
                                        ? `Faltam ${classMissing} aulas`
                                        : "Grade Completa"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Class progress */}
                              <div className="flex flex-col w-full sm:w-36">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-500 mb-0.5">
                                  <span>Distribuição</span>
                                  <span
                                    className={
                                      classExtra > 0
                                        ? "text-amber-600 font-black"
                                        : ""
                                    }
                                  >
                                    {classAllocated}/{classExpected} (
                                    {classCompletionRate}%)
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${classCompletionRate === 100 ? "bg-green-500" : "bg-rose-500"}`}
                                    style={{ width: `${classCompletionRate}%` }}
                                  />
                                </div>
                              </div>

                              {/* Quick Jump Action Button */}
                              <button
                                id={`btn-goto-grid-${turma.id}`}
                                onClick={() => {
                                  setSelectedTurmaId(turma.id);
                                  setViewMode("turmas");
                                  setIsShowingMissingClasses(false);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-[9px] font-black text-slate-700 uppercase tracking-wider transition-all border border-transparent hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                              >
                                Ir para Grade
                              </button>
                            </div>

                            {/* Schedule detail cards inside this classroom */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                              {sortedClassSubjects.map(
                                ({
                                  subject,
                                  usage,
                                  total,
                                  missingCount,
                                  extraCount,
                                  classroomUsage,
                                  labUsage,
                                }) => {
                                  const isPending = missingCount > 0;
                                  const isExtra = extraCount > 0;
                                  return (
                                    <div
                                      key={subject.id}
                                      className={`p-2 rounded-xl border transition-all flex flex-col justify-between ${
                                        isPending
                                          ? "bg-amber-50/40 border-amber-200/50 shadow-xs"
                                          : isExtra
                                            ? "bg-rose-50/40 border-rose-200/50 shadow-xs"
                                            : "bg-slate-50/50 border-slate-100 opacity-60"
                                      }`}
                                    >
                                      <div>
                                        <div className="flex justify-between items-start gap-1 mb-1.5 flex-nowrap">
                                          <span
                                            className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight truncate block font-sans"
                                            title={subject.name}
                                          >
                                            {subject.name}
                                          </span>
                                          {isPending ? (
                                            <span className="text-[7px] font-black bg-amber-500 text-white rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                                              -{missingCount}a
                                            </span>
                                          ) : isExtra ? (
                                            <span
                                              className="text-[7px] font-black bg-rose-500 text-white rounded px-1 py-0.5 uppercase tracking-wide shrink-0"
                                              title="Aulas a mais do que o esperado"
                                            >
                                              +{extraCount}a
                                            </span>
                                          ) : (
                                            <span className="text-[7px] font-black bg-green-100 text-green-700 rounded px-1 py-0.5 uppercase tracking-wide shrink-0">
                                              OK
                                            </span>
                                          )}
                                        </div>

                                        <div className="space-y-1">
                                          {/* Subject progress indicator */}
                                          <div className="flex justify-between text-[7.5px] font-bold text-slate-400 uppercase font-sans">
                                            <span>Alocado</span>
                                            <span
                                              className={
                                                isExtra ? "text-rose-600" : ""
                                              }
                                            >
                                              {usage}/{total}
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-200/60 rounded-full h-1 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${isPending ? "bg-amber-500" : isExtra ? "bg-rose-500" : "bg-green-500"}`}
                                              style={{
                                                width: `${Math.min(100, total > 0 ? (usage / total) * 100 : 100)}%`,
                                              }}
                                            />
                                          </div>

                                          {/* Special Room Specific Counts */}
                                          {(subject.labWorkload !== undefined ||
                                            subject.classWorkload !==
                                              undefined) && (
                                            <div className="flex items-center gap-1 text-[7px] text-slate-400 font-bold font-sans">
                                              <span>
                                                S: {classroomUsage}/
                                                {subject.classWorkload || 0}
                                              </span>
                                              <span>•</span>
                                              <span>
                                                L: {labUsage}/
                                                {subject.labWorkload || 0}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Arm and go to cell button */}
                                      <button
                                        id={`btn-load-subject-${turma.id}-${subject.id}`}
                                        onClick={() => {
                                          setSelectedTurmaId(turma.id);
                                          setTempSubject(subject.id);
                                          
                                          if (subject.roomIds && subject.roomIds.length > 0) {
                                            setTempAssociatedRoomId(subject.roomIds[0]);
                                          } else {
                                            setTempAssociatedRoomId("");
                                          }

                                          // Find matching teacher
                                          const matchingTeacher = teachers.find(t => 
                                            t.subjectIds?.includes(subject.id) && 
                                            t.turmaIds?.includes(turma.id)
                                          );
                                          if (matchingTeacher) {
                                            setTempTeacher(matchingTeacher.id);
                                          } else {
                                            const subTeacher = teachers.find(t => t.subjectIds?.includes(subject.id));
                                            if (subTeacher) {
                                              setTempTeacher(subTeacher.id);
                                            } else {
                                              setTempTeacher("");
                                            }
                                          }

                                          setSelectedSlot(null);
                                          setViewMode("turmas");
                                          setIsShowingMissingClasses(false);
                                        }}
                                        className="w-full mt-2 py-1 text-[8px] font-black text-center uppercase tracking-wider text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 bg-emerald-50 hover:border-transparent rounded-md transition-all shadow-xs cursor-pointer font-sans flex items-center justify-center gap-1"
                                        title="Sugerir alocação desta aula na grade"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                        Sugerir Alocação
                                      </button>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        );
                      },
                    );

                    return (
                      <div className="space-y-4">
                        {renderedTurmas}

                        {/* Dynamic Alerts and Workload vs Availability Warnings Panel */}
                        {(() => {
                          const availabilityWarnings: string[] = [];
                          teachers.forEach((t) => {
                            let totalRequiredWorkload = 0;

                            // Determine the total required/fixed workload
                            if (t.schoolWorkload !== undefined) {
                              totalRequiredWorkload = t.schoolWorkload;
                            } else if (
                              t.schoolWorkloadManha !== undefined ||
                              t.schoolWorkloadTarde !== undefined ||
                              t.schoolWorkloadNoite !== undefined
                            ) {
                              totalRequiredWorkload =
                                (t.schoolWorkloadManha || 0) +
                                (t.schoolWorkloadTarde || 0) +
                                (t.schoolWorkloadNoite || 0);
                            } else {
                              subjects.forEach((s) => {
                                if (
                                  t.subjectIds &&
                                  t.subjectIds.includes(s.id)
                                ) {
                                  turmas.forEach((tu) => {
                                    if (!tu.isRoom) {
                                      const teachesThisTurma =
                                        isTeacherEligibleForSubjectInTurma(
                                          t,
                                          s.id,
                                          tu.id,
                                        );
                                      if (teachesThisTurma) {
                                        const otherEligibles = teachers.filter(
                                          (otherT) =>
                                            otherT.id !== t.id &&
                                            isTeacherEligibleForSubjectInTurma(
                                              otherT,
                                              s.id,
                                              tu.id,
                                            ),
                                        );

                                        let countThisClass = true;
                                        if (otherEligibles.length > 0) {
                                          const hasExplicitLink =
                                            (t.turmaIds &&
                                              t.turmaIds.includes(tu.id)) ||
                                            (t.subjectTurmaMap &&
                                              t.subjectTurmaMap[s.id] &&
                                              t.subjectTurmaMap[s.id].includes(
                                                tu.id,
                                              ));

                                          if (hasExplicitLink) {
                                            countThisClass = true;
                                          } else {
                                            const classHasThisTeacher =
                                              Object.values(
                                                schedules[tu.id] || {},
                                              ).some(
                                                (slot: any) =>
                                                  slot?.teacherId === t.id &&
                                                  slot?.subjectId === s.id,
                                              );
                                            const classHasOtherTeacher =
                                              Object.values(
                                                schedules[tu.id] || {},
                                              ).some(
                                                (slot: any) =>
                                                  slot?.teacherId &&
                                                  slot.teacherId !== t.id &&
                                                  slot?.subjectId === s.id,
                                              );

                                            if (classHasThisTeacher) {
                                              countThisClass = true;
                                            } else if (classHasOtherTeacher) {
                                              countThisClass = false;
                                            } else {
                                              countThisClass = false;
                                            }
                                          }
                                        }

                                        if (countThisClass) {
                                          const { workload } =
                                            getSubjectWorkloadsForTurma(
                                              s,
                                              tu.id,
                                            );
                                          totalRequiredWorkload += workload;
                                        }
                                      }
                                    }
                                  });
                                }
                              });
                            }

                            // Calculate slot counts per shift
                            let hasAvailabilityList = false;
                            let totalAvailableSlots = 0;
                            let manhaSlots = 0,
                              tardeSlots = 0,
                              noiteSlots = 0;

                            const totalManhaBoard = 5 * 6; // 30
                            const totalTardeBoard = 5 * 6; // 30
                            const totalNoiteBoard = enableNoite ? 5 * 5 : 0; // 25

                            if (
                              t.unavailability &&
                              t.unavailability.length > 0
                            ) {
                              hasAvailabilityList = true;
                              const unManha = t.unavailability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 1 && p <= 6;
                              }).length;
                              const unTarde = t.unavailability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 7 && p <= 12;
                              }).length;
                              const unNoite = t.unavailability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 13 && p <= 17;
                              }).length;

                              manhaSlots = totalManhaBoard - unManha;
                              tardeSlots = totalTardeBoard - unTarde;
                              noiteSlots = totalNoiteBoard - unNoite;
                              totalAvailableSlots =
                                manhaSlots + tardeSlots + noiteSlots;
                            } else if (
                              t.availability &&
                              t.availability.length > 0
                            ) {
                              hasAvailabilityList = true;
                              totalAvailableSlots = t.availability.length;
                              manhaSlots = t.availability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 1 && p <= 6;
                              }).length;
                              tardeSlots = t.availability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 7 && p <= 12;
                              }).length;
                              noiteSlots = t.availability.filter((s) => {
                                const p = parseInt(s.split("-")[1] || "0", 10);
                                return p >= 13 && p <= 17;
                              }).length;
                            }

                            // 1. Availability check vs total required/fixed workload
                            if (
                              totalRequiredWorkload > 0 &&
                              hasAvailabilityList &&
                              totalAvailableSlots < totalRequiredWorkload
                            ) {
                              availabilityWarnings.push(
                                `Conflito Geral: O professor ${t.name} precisa lecionar no total ${totalRequiredWorkload} aula(s), mas tem apenas ${totalAvailableSlots} slot(s) de disponibilidade cadastrados no perfil.`,
                              );
                            }

                            // 2. Availability checks per shift
                            if (
                              t.schoolWorkloadManha !== undefined &&
                              hasAvailabilityList &&
                              manhaSlots < t.schoolWorkloadManha
                            ) {
                              availabilityWarnings.push(
                                `Conflito (Manhã): O professor ${t.name} precisa lecionar ${t.schoolWorkloadManha} aula(s) de Manhã, mas tem apenas ${manhaSlots} slot(s) de disponibilidade na manhã.`,
                              );
                            }
                            if (
                              t.schoolWorkloadTarde !== undefined &&
                              hasAvailabilityList &&
                              tardeSlots < t.schoolWorkloadTarde
                            ) {
                              availabilityWarnings.push(
                                `Conflito (Tarde): O professor ${t.name} precisa lecionar ${t.schoolWorkloadTarde} aula(s) de Tarde, mas tem apenas ${tardeSlots} slot(s) de disponibilidade na tarde.`,
                              );
                            }
                            if (
                              t.schoolWorkloadNoite !== undefined &&
                              hasAvailabilityList &&
                              noiteSlots < t.schoolWorkloadNoite &&
                              enableNoite
                            ) {
                              availabilityWarnings.push(
                                `Conflito (Noite): O professor ${t.name} precisa lecionar ${t.schoolWorkloadNoite} aula(s) de Noite, mas tem apenas ${noiteSlots} slot(s) de disponibilidade na noite.`,
                              );
                            }

                            // Calculate real scheduled/assigned classes per shift for this teacher
                            let countManha = 0;
                            let countTarde = 0;
                            let countNoite = 0;
                            Object.entries(schedules || {}).forEach(
                              ([tid, turmaSched]: [string, any]) => {
                                const isRoom = turmas.find(
                                  (roomT) => roomT.id === tid,
                                )?.isRoom;
                                if (!turmaSched || isRoom) return;
                                Object.entries(turmaSched).forEach(
                                  ([slotId, slotVal]: [string, any]) => {
                                    if (slotVal && slotVal.teacherId === t.id) {
                                      const p = parseInt(
                                        slotId.split("-")[1] || "0",
                                        10,
                                      );
                                      if (p >= 1 && p <= 6) countManha++;
                                      else if (p >= 7 && p <= 12) countTarde++;
                                      else if (p >= 13 && p <= 17) countNoite++;
                                    }
                                  },
                                );
                              },
                            );

                            const totalAllocated =
                              countManha +
                              countTarde +
                              (enableNoite ? countNoite : 0);

                            // 3. Excess checking against specified limits
                            if (
                              t.schoolWorkload !== undefined &&
                              totalAllocated > t.schoolWorkload
                            ) {
                              availabilityWarnings.push(
                                `Excesso Geral: O professor ${t.name} está com ${totalAllocated} aula(s) alocada(s) no total na grade, ultrapassando seu limite cadastrado de ${t.schoolWorkload} aula(s).`,
                              );
                            }
                            if (
                              t.schoolWorkloadManha !== undefined &&
                              countManha > t.schoolWorkloadManha
                            ) {
                              availabilityWarnings.push(
                                `Excesso (Manhã): O professor ${t.name} está com ${countManha} aula(s) alocada(s) de Manhã, ultrapassando seu limite cadastrado de ${t.schoolWorkloadManha} aula(s).`,
                              );
                            }
                            if (
                              t.schoolWorkloadTarde !== undefined &&
                              countTarde > t.schoolWorkloadTarde
                            ) {
                              availabilityWarnings.push(
                                `Excesso (Tarde): O professor ${t.name} está com ${countTarde} aula(s) alocada(s) de Tarde, ultrapassando seu limite cadastrado de ${t.schoolWorkloadTarde} aula(s).`,
                              );
                            }
                            if (
                              t.schoolWorkloadNoite !== undefined &&
                              countNoite > t.schoolWorkloadNoite &&
                              enableNoite
                            ) {
                              availabilityWarnings.push(
                                `Excesso (Noite): O professor ${t.name} está com ${countNoite} aula(s) alocada(s) de Noite, ultrapassando seu limite cadastrado de ${t.schoolWorkloadNoite} aula(s).`,
                              );
                            }
                          });

                          // Validação de carga horária por turma (25 ou 30 aulas planejadas por semana)
                          let validationTurmas = turmas.filter(
                            (tu) => !tu.isRoom,
                          );
                          if (!enableNoite) {
                            validationTurmas = validationTurmas.filter((tu) => {
                              const tShift =
                                tu.shift ||
                                (tu.id.toLowerCase().includes("noite") ||
                                tu.name.toLowerCase().includes("noite")
                                  ? "noite"
                                  : tu.id.toLowerCase().includes("tarde") ||
                                      tu.name.toLowerCase().includes("tarde")
                                    ? "tarde"
                                    : "manha");
                              return tShift !== "noite";
                            });
                          }

                          validationTurmas.forEach((tu) => {
                            const tShift =
                              tu.shift ||
                              (tu.id.toLowerCase().includes("noite") ||
                              tu.name.toLowerCase().includes("noite")
                                ? "noite"
                                : tu.id.toLowerCase().includes("tarde") ||
                                    tu.name.toLowerCase().includes("tarde")
                                  ? "tarde"
                                  : "manha");
                            const daily =
                              tShift === "noite" && enableNoiteAsynchronous
                                ? 6
                                : getEffectiveDailyClassCount(tu, isCivicoMilitar);
                            const expectedTotal = daily * 5; // 5 dias na semana

                            let plannedTotal = 0;
                            subjects.forEach((s) => {
                              const { workload } = getSubjectWorkloadsForTurma(
                                s,
                                tu.id,
                              );
                              plannedTotal += workload;
                            });

                            if (plannedTotal !== expectedTotal) {
                              availabilityWarnings.push(
                                `Carga da Turma: A turma ${tu.name} está com ${plannedTotal} aula(s) planejada(s) na semana, mas o valor esperado seria ${expectedTotal} aula(s) (${daily} por dia).`,
                              );
                            }
                          });

                          if (availabilityWarnings.length === 0) return null;

                          return (
                            <div className="p-5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col gap-2.5 shadow-xs font-sans mt-4">
                              <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider font-sans">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                Alertas de Conflitos e Carga Horária
                              </div>
                              <div className="max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                <ul className="list-disc pl-5 space-y-1.5">
                                  {availabilityWarnings.map((warn, i) => (
                                    <li
                                      key={i}
                                      className="text-xs font-semibold text-slate-750 leading-relaxed font-sans"
                                    >
                                      {warn}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>

                {/* Modal Footer */}
                <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="hidden lg:inline text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                      Clique em "Ir para Grade" ou "Carregar Matéria" para
                      começar a ajustar
                    </span>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs opacity-0"></div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto shrink-0">
                    <button
                      type="button"
                      onClick={handlePrintMissingClassesReport}
                      className="px-5 py-2.5 bg-[#657c36] hover:bg-[#52642c] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-102 cursor-pointer flex items-center gap-2 font-sans"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Esta Tabela
                    </button>
                    <button
                      id="btn-close-missing-classes-footer"
                      onClick={() => setIsShowingMissingClasses(false)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md hover:scale-102 cursor-pointer font-sans"
                    >
                      Fechar janela
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Auto-Schedule Generation Options Modal */}
        <AnimatePresence>
          {isAutoGenerateModalOpen && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsAutoGenerateModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100"
              >
                <div className="flex justify-between items-center px-8 pt-8">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-emerald-600 animate-pulse" />
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Gerar Horários do Zero
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAutoGenerateModalOpen(false)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8 pt-4 space-y-6">
                  <div className="text-xs text-slate-500 font-medium leading-relaxed font-sans">
                    O algoritmo inteligente organizará todas as aulas
                    cadastradas de forma equilibrada,{" "}
                    <span className="font-bold text-slate-700">
                      respeitando a disponibilidade dos professores, cargas
                      horárias e salas especiais
                    </span>
                    , garantindo zero duplicidades e choques de horário.
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={autoGenForceConflicts}
                          onChange={(e) =>
                            setAutoGenForceConflicts(e.target.checked)
                          }
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 checked:bg-amber-600 checked:border-amber-600 transition-all cursor-pointer"
                        />
                        <Check className="w-2.5 h-2.5 text-white absolute opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all pointer-events-none" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-900 block mb-0.5">
                          Salvar grade mesmo com conflitos
                        </span>
                        <span className="text-[9px] text-amber-700/80 leading-tight block font-semibold text-justify">
                          Se o sistema não conseguir encaixar as aulas (devido a
                          restrições de tempo), ele <b>forçará</b> as aulas nos
                          espaços vazios e exibirá essas aulas conflitantes em{" "}
                          <b>vermelho</b>, para correção manual posterior.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Opções de Modo */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                      Modo de Geração
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoGenMode("all")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenMode === "all" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider">
                          Do Zero
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Limpa o quadro INTEIRO (ignora os cadeados) e refaz tudo.
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenMode("shuffle")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenMode === "shuffle" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-[11px] font-black uppercase tracking-wider">
                          Embaralhar
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Mantém as aulas com cadeado e embaralha o restante.
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenMode("empty")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenMode === "empty" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-[11px] font-black uppercase tracking-wider">
                          Preencher
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Mantém como está e preenche apenas os horários vazios.
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Opções de Períodos/Turnos */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                      Foco de Geração
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoGenShift("both")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === "both" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider">
                          {enableNoite ? "Todos os Turnos" : "Manhã e Tarde"}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                          {enableNoite
                            ? "Distribui aulas para todos os turnos simultaneamente."
                            : "Distribui aulas para ambos os turnos simultaneamente."}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenShift("labs")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === "labs" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider text-indigo-700">
                          Salas Especiais
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                          Distribui somente as aulas agendadas em laboratórios e
                          salas especiais.
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenShift("manha")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === "manha" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider text-blue-600">
                          Apenas Manhã
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                          Gera horários apenas para as turmas do turno da manhã
                          (períodos 1-6).
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoGenShift("tarde")}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === "tarde" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600"}`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider text-amber-600">
                          Apenas Tarde
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                          Gera horários apenas para as turmas do turno da tarde
                          (períodos 7-12).
                        </div>
                      </button>
                      {enableNoite && (
                        <button
                          type="button"
                          onClick={() => setAutoGenShift("noite")}
                          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${autoGenShift === "noite" ? "border-emerald-600 bg-emerald-50/50 text-emerald-990 font-bold font-sans col-span-2" : "border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600 col-span-2"}`}
                        >
                          <div className="text-xs font-black uppercase tracking-wider text-[#6366f1]">
                            Apenas Noite
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                            Gera horários apenas para as turmas do turno da
                            noite (períodos 13-18).
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Opção para aulas geminadas */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Prevenir de Geminar Aulas
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                        Forçar distribuição aleatória das aulas de 1 horário por
                        dia.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleDisableDoubleClassesGlobally(
                          !disableDoubleClassesGlobally,
                        )
                      }
                      className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer focus:outline-none shrink-0 ${disableDoubleClassesGlobally ? "bg-emerald-600" : "bg-slate-300"}`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${disableDoubleClassesGlobally ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => runAutoScheduling()}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Wand2 className="w-4 h-4 text-emerald-100" />
                      Iniciar Programação Inteligente
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mudanças Modal */}
        <AnimatePresence>
          {isMudancasModalOpen && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsMudancasModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden border-2 border-slate-200/90"
              >
                <div className="bg-slate-50 p-6 px-8 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-blue-600" />
                    Realizar Mudanças
                  </h3>
                  <button
                    onClick={() => setIsMudancasModalOpen(false)}
                    className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors cursor-pointer focus:outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8 space-y-6 bg-white">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2">
                      Selecione o Grupo / Turma que deseja embaralhar
                    </div>
                    <select
                      value={mudancasMode}
                      onChange={(e) => setMudancasMode(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 text-slate-700 py-3 px-4 rounded-xl font-bold uppercase cursor-pointer"
                    >
                      <option value="manha">
                        Manhã (muda todo horário da manhã)
                      </option>
                      <option value="tarde">
                        Tarde (muda todo horário da tarde)
                      </option>
                      {enableNoite && (
                        <option value="noite">
                          Noite (muda todo horário da noite)
                        </option>
                      )}
                      {turmas.some((t) => t.isRoom) && (
                        <option value="labs">
                          Todas as salas especiais (Labs)
                        </option>
                      )}
                      <option value="especificas">
                        Turma selecionada (Escolher turmas específicas)
                      </option>
                    </select>
                  </div>

                  {mudancasMode === "especificas" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        Quais turmas?
                      </label>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                        {turmas
                          .filter((t) => !t.isRoom)
                          .map((turma) => (
                            <label
                              key={turma.id}
                              className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200"
                            >
                              <input
                                type="checkbox"
                                checked={mudancasSelectedTurmas.includes(
                                  turma.id,
                                )}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setMudancasSelectedTurmas([
                                      ...mudancasSelectedTurmas,
                                      turma.id,
                                    ]);
                                  else
                                    setMudancasSelectedTurmas(
                                      mudancasSelectedTurmas.filter(
                                        (id) => id !== turma.id,
                                      ),
                                    );
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-[11px] font-bold text-slate-700 uppercase">
                                {turma.name}
                              </span>
                            </label>
                          ))}
                        {turmas.filter((t) => !t.isRoom).length === 0 && (
                          <div className="text-xs text-slate-400 italic text-center py-2">
                            Nenhuma turma cadastrada
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50/50 border-l-[3px] border-blue-500 p-4 rounded-r-xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800 leading-relaxed font-sans text-justify">
                      ISSO IRÁ EMBARALHAR OS HORÁRIOS LIVRES DENTRO DA SELEÇÃO
                      TENTANDO ENCONTRAR UMA NOVA CONFIGURAÇÃO VÁLIDA PARA OS
                      PROFESSORES. AULAS COM O CADEADO ATIVADO (MANUAIS) SERÃO
                      PROTEGIDAS.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={
                        mudancasMode === "especificas" &&
                        mudancasSelectedTurmas.length === 0
                      }
                      onClick={() => {
                        setIsMudancasModalOpen(false);
                        if (mudancasMode === "manha")
                          runAutoScheduling("all", "manha");
                        else if (mudancasMode === "tarde")
                          runAutoScheduling("all", "tarde");
                        else if (mudancasMode === "noite")
                          runAutoScheduling("all", "noite");
                        else if (mudancasMode === "labs")
                          runAutoScheduling("all", "labs");
                        else if (mudancasMode === "especificas") {
                          // Pass specific turma IDs
                          runAutoScheduling(
                            "all",
                            "both",
                            mudancasSelectedTurmas,
                          );
                        }
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shuffle className="w-4 h-4 text-blue-100" />
                      Confirmar e Embaralhar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Auto-Schedule Results Modal */}
        <AnimatePresence>
          {isAutoGenerateResultsModalOpen &&
            autoGenResults &&
            !isAutoGenerateResultsMinimized && (
              <div className="fixed bottom-4 right-4 z-[85] w-full max-w-lg pointer-events-none p-2 flex justify-end">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 50 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 50 }}
                  className="bg-white rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden border-2 border-slate-200/90 pointer-events-auto"
                >
                  <div className="bg-slate-50 p-6 px-8 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {autoGenResults.solved ? (
                        <Sparkles className="w-6 h-6 text-emerald-600 animate-bounce" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                      )}
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight font-sans">
                        {autoGenResults.solved
                          ? "Sucesso absoluto!"
                          : "Geração Parcial Concluída"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!autoGenResults.solved && (
                        <button
                          onClick={() =>
                            setIsAutoGenerateResultsMinimized(true)
                          }
                          className="p-2 px-3 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-800 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                          title="Minimizar para ver o quadro de aulas"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                          Minimizar
                        </button>
                      )}
                      <button
                        onClick={() => setIsAutoGenerateResultsModalOpen(false)}
                        className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                    {/* Alerta de erro de cadastro / pré-requisito se houver */}
                    {autoGenResults.errors.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-red-800 text-xs font-black uppercase tracking-wider font-sans">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          Inconsistências Identificadas no Cadastro:
                        </div>
                        <ul className="list-disc pl-5 text-[10px] text-red-600 font-bold space-y-1 leading-relaxed font-sans">
                          {autoGenResults.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Métricas gerais */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-center items-center text-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-sans">
                          Aulas Requeridas
                        </div>
                        <div className="text-3xl font-black text-slate-900 font-mono">
                          {autoGenResults.scannedCount}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-all bg-emerald-50 border-emerald-100">
                        <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1 font-sans">
                          Aulas Alocadas
                        </div>
                        <div className="text-3xl font-black text-emerald-900 font-mono">
                          {autoGenResults.placedCount}{" "}
                          <span className="text-xs font-semibold text-emerald-600 font-sans">
                            (
                            {Math.round(
                              (autoGenResults.placedCount /
                                (autoGenResults.scannedCount || 1)) *
                                100,
                            )}
                            %)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resultados explicativos */}
                    <div className="text-xs text-slate-600 font-medium leading-relaxed font-sans">
                      {autoGenResults.solved ? (
                        <span>
                          O sistema conseguiu encaixar{" "}
                          <span className="text-emerald-700 font-bold">
                            100% dos horários planejados
                          </span>{" "}
                          em um arranjo totalmente otimizado e livre de
                          conflitos! Suas turmas e professores já estão
                          devidamente escalados.
                        </span>
                      ) : (
                        <span>
                          Devido a restrições complexas de disponibilidade de
                          professores ou limitações de salas especiais,{" "}
                          <span className="text-amber-700 font-extrabold">
                            {autoGenResults.pending.length} grupo(s) de aulas
                          </span>{" "}
                          ficaram com alocações pendentes. Eles foram listados
                          abaixo para que você possa encaixá-los manualmente na
                          grade ajustando levemente as disponibilidades.
                        </span>
                      )}
                    </div>

                    {/* Tabela de Pendências */}
                    {autoGenResults.pending.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
                          <span>
                            Lista de Aulas Pendentes (
                            {autoGenResults.pending.length})
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleForceAllocatePending();
                              }}
                              className="flex items-center gap-1.5 text-[9px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-amber-200 font-bold"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Forçar Alocação
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintPendingReport}
                              className="flex items-center gap-1.5 text-[9px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors border border-indigo-150 font-bold"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Imprimir Lista
                            </button>
                          </div>
                        </div>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-50 border-b border-indigo-100/50 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                  <th className="py-2.5 px-4 font-sans">
                                    Turma
                                  </th>
                                  <th className="py-2.5 px-4 font-sans">
                                    Matéria
                                  </th>
                                  <th className="py-2.5 px-4 font-sans">
                                    Professor
                                  </th>
                                  <th className="py-2.5 px-4 font-sans">
                                    Motivo
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100/70 font-mono text-[9px] text-slate-700">
                                {autoGenResults.pending.map((item, i) => (
                                  <tr
                                    key={i}
                                    className="hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="py-2 px-4 uppercase font-bold text-slate-800">
                                      {item.turmaName}
                                    </td>
                                    <td className="py-2 px-4 text-slate-600">
                                      {item.subjectName}
                                    </td>
                                    <td
                                      className="py-2 px-4 text-slate-600 truncate max-w-[120px]"
                                      title={item.teacherName}
                                    >
                                      {item.teacherName}
                                    </td>
                                    <td className="py-2 px-4 text-amber-600 font-sans leading-tight">
                                      {item.reason}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[10px] font-medium leading-relaxed text-indigo-700 font-sans">
                      🔔 <span className="font-bold">Dica:</span> Caso queira
                      forçar a alocação de alguma aula pendente, experimente
                      desobrigar a disponibilidade facultativa do professor
                      (permitindo-lhe lecionar em mais períodos) ou aumente as
                      matérias compatíveis em uma sala especial!
                    </div>

                    {/* IA Analysis Button */}
                    {autoGenResults.pending.length > 0 && (
                      <div className="space-y-3">
                        <button
                          onClick={requestGeminiAnalysis}
                          disabled={isAiAnalyzing}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70"
                        >
                          {isAiAnalyzing ? (
                            <span className="animate-spin text-white">⚙</span>
                          ) : (
                            <Sparkles className="w-4 h-4 text-teal-200" />
                          )}
                          {isAiAnalyzing
                            ? "Analisando Grade..."
                            : "Consultar Conselheiro IA Gemini"}
                        </button>
                        {aiAnalysisText && (
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-2 border-b border-slate-800 pb-2">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">
                                Feedback Conselheiro IA
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                              {aiAnalysisText}
                            </div>
                            {aiAnalysisActions &&
                              aiAnalysisActions.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                                  <button
                                    onClick={() => {
                                      setAiAnalysisText(null);
                                      setAiAnalysisActions([]);
                                    }}
                                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={applyGeminiActions}
                                    className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Efetuar Mudança ({aiAnalysisActions.length} ações)
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer buttons */}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAutoGenerateResultsModalOpen(false);
                          handleSave();
                        }}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-indigo-600/10 active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4 text-indigo-100" />
                        Salvar Alterações na Grade
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAutoGenerateResultsModalOpen(false)}
                        className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-center"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
        </AnimatePresence>

        {/* Minimized Auto-Schedule Results Panel */}
        <AnimatePresence>
          {isAutoGenerateResultsModalOpen &&
            autoGenResults &&
            isAutoGenerateResultsMinimized && (
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 bg-slate-900 text-white border border-slate-800 p-4 rounded-2xl shadow-xl max-w-sm md:max-w-md"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400 rounded-xl text-slate-900 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Geração de Horário
                    </h5>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">
                      Concluído com {autoGenResults.pending.length} pendências.
                    </p>
                    <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                      Quadro de turmas aberto para ajustes.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setIsAutoGenerateResultsMinimized(false)}
                    className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Alertas
                  </button>
                  <button
                    onClick={() => {
                      setIsAutoGenerateResultsModalOpen(false);
                      setIsAutoGenerateResultsMinimized(false);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Help & Tutorial Modal */}
        <AnimatePresence>
          {isHelpModalOpen && (
            <div
              className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsHelpModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl overflow-hidden border-2 border-slate-900 flex flex-col"
              >
                {/* Header */}
                <div className="bg-amber-400 p-6 border-b-2 border-slate-900 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <HelpCircle className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none font-sans">
                        Central de Ajuda & Manual de Uso
                      </h3>
                      <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wide mt-1 font-sans">
                        Aprenda a gerenciar, calibrar e gerar a grade horária
                        ideal
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsHelpModalOpen(false)}
                    className="p-2 bg-white rounded-full hover:bg-slate-50 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 active:shadow-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex flex-1 overflow-hidden min-h-0 bg-slate-50">
                  {/* Tabs Sidebar */}
                  <div className="w-1/4 max-w-[240px] border-r-2 border-slate-100 bg-white p-4 space-y-1.5 overflow-y-auto shrink-0 custom-scrollbar">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-2 mb-2 font-sans">
                      Tópicos do Manual
                    </span>

                    {[
                      { id: "geral", label: "1. Visão Geral", icon: School },
                      {
                        id: "disciplinas",
                        label: "2. Regras Curriculares",
                        icon: BookOpen,
                      },
                      {
                        id: "professores",
                        label: "3. Professores",
                        icon: Users,
                      },
                      {
                        id: "turmas_salas",
                        label: "4. Turmas & Salas",
                        icon: Calendar,
                      },
                      {
                        id: "geracao",
                        label: "5. Gerador Inteligente",
                        icon: Sparkles,
                      },
                      {
                        id: "validacoes",
                        label: "6. Diagnósticos",
                        icon: AlertTriangle,
                      },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = helpActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setHelpActiveTab(tab.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-all border-2 cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-amber-400 border-slate-900 shadow-sm"
                              : "bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <TabIcon
                            className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`}
                          />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-6 overflow-y-auto bg-white custom-scrollbar">
                    {helpActiveTab === "geral" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <School className="w-4 h-4 text-indigo-600 animate-bounce" />
                          1. Visão Geral do Sistema
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            Bem-vindo ao sistema de{" "}
                            <strong>
                              Planejamento e Otimização Inteligente de Grade
                              Horária
                            </strong>
                            . Esta aplicação foi estruturada especificamente
                            para atender as exigências complexas de colégios,
                            conciliando turmas de Ensino Fundamental II e Ensino
                            Médio, restrições físicas de laboratórios e
                            calendários flexíveis de professores.
                          </p>
                          <p>
                            A tela principal se divide em áreas fundamentais de
                            uso dinâmico:
                          </p>
                          <ul className="list-disc pl-5 space-y-1.5 font-sans">
                            <li>
                              <strong className="text-slate-900">
                                Quadro de Horários Central:
                              </strong>{" "}
                              Exibe a grade real da turma ou sala especial
                              selecionada. Cada dia contém aulas do turno
                              correspondente (Manhã: períodos 1 a 6; Tarde:
                              períodos 7 a 12).
                            </li>
                            <li>
                              <strong className="text-slate-900">
                                Seletores Extras na Barra Superior:
                              </strong>{" "}
                              Você pode alterar o Nome da Escola e a Logomarca
                              clicando neles diretamente, facilitando a emissão
                              de relatórios escolares impressos personalizados.
                            </li>
                            <li>
                              <strong className="text-slate-900">
                                Troca de Modos de Visualização:
                              </strong>{" "}
                              Exiba a grade consolidada por{" "}
                              <strong>Turma</strong> ou mude para conferir o
                              agendamento em{" "}
                              <strong>Salas Especiais / Laboratórios</strong>.
                            </li>
                            <li>
                              <strong className="text-slate-900">
                                Lixeira (Limpezas Avançadas):
                              </strong>{" "}
                              Ao clicar no botão de apagar no menu superior,
                              você pode esvaziar a grade inteira ou escolher
                              limpezas precisas:{" "}
                              <strong>Apagar apenas turmas selecionadas</strong>
                              , ou{" "}
                              <strong>Apagar Apenas Aulas com Conflito</strong>{" "}
                              preservando todo o resto.
                            </li>
                            <li>
                              <strong className="text-slate-900">
                                Controles de Exportação e Backup (Action Row
                                inferior):
                              </strong>{" "}
                              Salve dados no navegador, importe um arquivo JSON
                              salvando as modificações completas, exporte
                              backups de segurança e imprima os quadros por
                              turma com excelente qualidade gráfica.
                            </li>
                          </ul>
                          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-805 flex gap-2">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-bold uppercase tracking-wide block mb-0.5">
                                🔔 DICA RÁPIDA DE USO:
                              </span>
                              A grade salva automaticamente rascunhos no seu
                              navegador. No entanto, para persistir de forma
                              permanente ou compartilhar entre computadores,
                              utilize sempre o botão{" "}
                              <strong className="uppercase">
                                Salvar Alterações
                              </strong>{" "}
                              no canto superior direito e faça o download do
                              JSON de backup de tempos em tempos.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {helpActiveTab === "disciplinas" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <BookOpen className="w-4 h-4 text-emerald-600 animate-bounce" />
                          2. Gerenciamento e Regras de Disciplinas
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            O sistema possui um motor inteligente que impede o
                            agendamento incorreto de matérias em séries ou
                            turmas para as quais elas não foram criadas. Agora
                            você pode parametrizar restrições com alta precisão
                            ao adicionar ou editar qualquer disciplina:
                          </p>

                          <div className="space-y-3.5">
                            {/* Item 1 */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                                <div className="w-1.5 h-3 bg-blue-500 rounded-full"></div>
                                A. Restrição por Nível de Ensino (Médio vs
                                Fundamental)
                              </h5>
                              <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                                Configure se a matéria é de uso{" "}
                                <strong className="text-slate-850">
                                  Geral (Ambos os níveis)
                                </strong>
                                , exclusivo para as séries do{" "}
                                <strong className="text-slate-850">
                                  Ensino Fundamental II (6º ao 9º Ano)
                                </strong>{" "}
                                ou restrita ao{" "}
                                <strong className="text-slate-850">
                                  Ensino Médio (1º ao 3º Ano)
                                </strong>
                                .
                                <br />
                                <span className="text-amber-600 font-medium font-sans italic text-[10px]">
                                  * Regra rígida nativa:
                                </span>{" "}
                                Filosofia e Sociologia são bloqueadas para o
                                Ensino Fundamental por padrão, evitando
                                inclusões desatentas. Outras disciplinas
                                customizadas respeitarão estritamente esta
                                validação durante a geração automática ou
                                manual.
                              </p>
                            </div>

                            {/* Item 2 */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                                <div className="w-1.5 h-3 bg-amber-500 rounded-full"></div>
                                B. Filtro por Séries Específicas
                              </h5>
                              <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                                Permite escrever as séries válidas separadas por
                                vírgula (ex:{" "}
                                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[9px] font-bold">
                                  6, 6º
                                </code>
                                ). O sistema analisa o nome da turma para
                                validar se a disciplina pertence àquela série
                                curricular.
                                <br />
                                <span className="text-amber-600 font-medium font-sans italic text-[10px]">
                                  * Regra padrão:
                                </span>{" "}
                                O Ensino Religioso é nativamente restrito apenas
                                a turmas com o termo "6", mas agora você pode
                                aplicar essa mesma lógica a qualquer série ou
                                disciplina nova que inserir no painel.
                              </p>
                            </div>

                            {/* Item 3 */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                                <div className="w-1.5 h-3 bg-indigo-500 rounded-full"></div>
                                C. Restrição por Sufixo / Siglas do Nome de
                                Turma
                              </h5>
                              <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                                Ideal para itinerários formativos, trilhas de
                                aprofundamento técnico ou disciplinas eletivas
                                específicas. Digite siglas separadas por vírgula
                                (como{" "}
                                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[9px] font-bold">
                                  B, Integral
                                </code>
                                ).
                                <br />
                                <span className="text-amber-600 font-medium font-sans italic text-[10px]">
                                  * Exemplo Prático:
                                </span>{" "}
                                Matérias profissionalizantes como{" "}
                                <strong>{techCourseName}</strong> podem ser
                                configuradas para só entrarem em turmas que
                                possuam a marcação "Técnico". Se uma turma não
                                for marcada, ela não receberá essa aula.
                              </p>
                            </div>

                            {/* Item 4 */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                                <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                                D. Vínculo Exclusivo de Whitelist (Checkboxes)
                              </h5>
                              <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                                Caso queira um controle absoluto sobre quem terá
                                a disciplina, você pode marcar diretamente na
                                lista de caixas de seleção apenas as turmas
                                válidas. Se marcar alguma turma ali, o filtro
                                automático por série e sufixo é ignorado em prol
                                desta sua escolha manual cirúrgica de turmas
                                recomendadas.
                              </p>
                            </div>

                            {/* Item 5 */}
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                              <h5 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] flex items-center gap-1.5 font-sans">
                                <div className="w-1.5 h-3 bg-purple-500 rounded-full"></div>
                                E. Cargas Horárias específicas por Turma (Campo
                                customWorkloads)
                              </h5>
                              <p className="text-[11px] text-slate-500 pl-3 leading-relaxed">
                                Agora você pode configurar cargas horárias
                                totalmente personalizadas por Turma clicando no
                                botão{" "}
                                <strong className="text-slate-800">
                                  Cargas específicas por Turma
                                </strong>
                                . Digite o número exato de aulas para cada
                                turma. O sistema utilizará esta carga
                                personalizada na geração automática,
                                diagnósticos, análise de aulas esperadas e
                                progresso, de forma totalmente segura e tipada.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {helpActiveTab === "professores" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <Users className="w-4 h-4 text-indigo-600 animate-bounce" />
                          3. Cadastro de Professores e Disponibilidade
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            Os professores guiam a alocação de tempos do
                            colégio. Configurar corretamente a ficha de cada um
                            garante que o robô de horários trabalhe em harmonia
                            estrita:
                          </p>

                          <ul className="list-disc pl-5 space-y-1.5 font-sans">
                            <li>
                              <strong>Múltiplas Disciplinas:</strong> Um
                              professor de química também pode lecionar física
                              ou matemática. Marque todas as aplicáveis no
                              momento do cadastro do docente!
                            </li>
                            <li>
                              <strong>Carga no Colégio (Opcional):</strong>{" "}
                              Insira a quantidade exata de aulas que o professor
                              de 20h ou 40h ministra especificamente no seu
                              colégio. Deixar esse campo vazio habilita a
                              estimativa automática pelas turmas, enquanto
                              preenchê-lo evita conflitos artificiais relatando
                              que o professor estaria com a disponibilidade
                              menor do que a grade calculada de sua matéria
                              global.
                            </li>
                            <li>
                              <strong>
                                Preferência de Geminação (Aulas Gêmeas):
                              </strong>{" "}
                              Se ativado, o sistema prefere alocar aulas desse
                              professor seguidas (lado a lado na mesma turma),
                              favorecendo o desenvolvimento contínuo do plano
                              didático sem quebras.
                            </li>
                            <li>
                              <strong>Vínculo de Turmas (Opcional):</strong>{" "}
                              Caso o professor lecione somente a um grupo seleto
                              de turmas, vincule-as para que ele não receba
                              aulas de outras turmas acidentalmente. Se deixar
                              vazio, ele estará habilitado a dar aula para todas
                              as turmas que possuem disciplinas compatíveis.
                            </li>
                          </ul>

                          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block font-sans">
                              📆 Como Gerenciar a Grade de Disponibilidade:
                            </span>
                            <p className="text-[11px] leading-relaxed font-sans">
                              A grade de disponibilidade de cada professor é
                              exibida no cadastro de forma quadriculada para
                              cada dia útil (segunda a sexta-feira).
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                              <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                                <div className="w-3 h-3 bg-emerald-500 rounded border border-emerald-700 shrink-0"></div>
                                <span>
                                  <strong>Verde (Disponível):</strong> O
                                  professor está livre para receber aulas nestes
                                  períodos.
                                </span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl">
                                <div className="w-3 h-3 bg-slate-200 rounded border border-slate-400 shrink-0"></div>
                                <span>
                                  <strong>Cinza (Bloqueado):</strong> Horário
                                  inválido (ex: o professor está em outro
                                  colégio ou de folga nestes períodos).
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal italic pt-1 text-center font-sans">
                              * DICA: Clique em um quadrado cinza para torná-lo
                              verde e vice-versa. Certifique-se de
                              disponibilizar períodos suficientes para a carga
                              horária que o professor precisa ministrar!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {helpActiveTab === "turmas_salas" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <Calendar className="w-4 h-4 text-blue-600 animate-bounce" />
                          4. Cadastro de Turmas e Salas Especiais
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            O cadastro correto de onde os alunos assistirão às
                            aulas e como suas turmas estão identificadas é
                            capital para a validação da grade de horários:
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                              <span className="text-[10px] font-black text-indigo-700 uppercase block tracking-wider mb-1">
                                A. Gestão de Turmas
                              </span>
                              <p className="text-[11px] leading-relaxed">
                                Cada turma representa uma classe (Ex:{" "}
                                <strong>6º Ano A</strong>,{" "}
                                <strong>1º Ano E.M. B</strong>). Ao cadastrar ou
                                editar uma turma, você especifica seu{" "}
                                <strong>Turno</strong> oficial:
                              </p>
                              <ul className="list-disc pl-4 space-y-1 text-[10px] mt-1.5 text-slate-500">
                                <li>
                                  <strong>Manhã:</strong> Aulas alocadas nos
                                  períodos de 1 a 6.
                                </li>
                                <li>
                                  <strong>Tarde:</strong> Aulas alocadas nos
                                  períodos de 7 a 12.
                                </li>
                                <li>
                                  <strong>Ambos os turnos:</strong> Pode receber
                                  aulas em qualquer um dos 12 períodos do dia se
                                  houver necessidade.
                                </li>
                                <li>
                                  <strong>
                                    Aulas Assíncronas (Modo Noturno):
                                  </strong>{" "}
                                  Habilitando a opção "Aula Assíncrona" junto ao
                                  período noturno, o último horário (6º tempo)
                                  das turmas da noite é convertido
                                  automaticamente em aula assíncrona (on-line),
                                  permitindo flexibilizar as horas letivas da
                                  noite!
                                </li>
                              </ul>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                              <span className="text-[10px] font-black text-purple-700 uppercase block tracking-wider mb-1 font-sans">
                                B. Salas Especiais e Laboratórios
                              </span>
                              <p className="text-[11px] leading-relaxed">
                                Útil para agendar o uso rotativo de estruturas
                                compartilhadas, tais como:
                              </p>
                              <ul className="list-disc pl-4 space-y-1 text-[10px] mt-1.5 text-slate-500 font-sans">
                                <li>Laboratório de Informática (Lab Comp)</li>
                                <li>
                                  Carrinho de Chromebooks / Tablets (Lab Tab)
                                </li>
                                <li>Sala Especial de Matemática (Sala Mat)</li>
                              </ul>
                              <p className="text-[10px] mt-2 leading-relaxed text-slate-500 border-t border-slate-200/60 pt-1.5 font-medium">
                                Ao desenhar Disciplinas, você aponta se elas{" "}
                                <strong>restringem ou requerem</strong> o
                                agendamento em algum desses laboratórios/salas.
                                O sistema então cuida para que duas turmas
                                diferentes não fiquem alocadas no mesmo
                                laboratório no mesmo momento!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {helpActiveTab === "geracao" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
                          5. Motor de Geração Automática
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            O grande trunfo do sistema reside em seu gerador
                            inteligente. Ele calcula centenas de combinações em
                            milissegundos para propor a melhor grade de aulas
                            possível através de 3 botões principais na barra
                            superior do quadro:
                          </p>

                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                            <span className="text-[10px] font-black text-amber-900 uppercase block tracking-wider mb-2 font-sans">
                              1. Assistente IA (O Caminho mais fácil)
                            </span>
                            <p className="text-[11px] leading-relaxed">
                              Um Wizard passo a passo desenhado para iniciantes.
                              Ele fará 3 perguntas diretas para guiar o
                              preenchimento, e apertar o botão no final para
                              você de forma simplificada!
                            </p>
                          </div>

                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                            <span className="text-[10px] font-black text-amber-900 uppercase block tracking-wider mb-2 font-sans">
                              2. Gerar Automaticamente
                            </span>
                            <p className="text-[11px] leading-relaxed mb-2">
                              Apenas para usuários avançados abrirem o painel
                              completo de parâmetros de refinamento:
                            </p>
                            <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-slate-700">
                              <li>
                                <strong className="text-slate-900">
                                  Modo "Do Zero":
                                </strong>{" "}
                                Limpa completamente a grade do colégio inteiro e
                                faz uma nova organização ideal a nível global.
                              </li>
                              <li>
                                <strong className="text-slate-900">
                                  Modo "Apenas Vazios":
                                </strong>{" "}
                                Preserva as aulas que você inseriu manualmente
                                na grade, agendando de forma inteligente somente
                                as pendentes nos espaços em branco.
                              </li>
                              <li>
                                <strong className="text-slate-900">
                                  Filtro por Turnos:
                                </strong>{" "}
                                Permite escolher processar turmas separadas por
                                turno ou ambas juntas de uma vez.
                              </li>
                            </ul>
                          </div>

                          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                            <span className="text-[10px] font-black text-indigo-900 uppercase block tracking-wider mb-2 font-sans">
                              3. Botão "Mudanças" (Embaralhar Grade)
                            </span>
                            <p className="text-[11px] leading-relaxed">
                              Ideal para quando você precisa trocar certas
                              disposições de horários de um turno após uma grade
                              já gerada, buscando variação nos dias. O botão{" "}
                              <strong>Mudanças</strong> vai esvaziar a grade do{" "}
                              <u>
                                turno que você está avaliando na tela no momento
                              </u>{" "}
                              e preencher de forma aleatória e diferente. Se
                              ativou matérias Geminadas (Aulas Duplas) antes de
                              apertar o botão, o sistema as favorecerá nesta
                              nova distribuição!
                            </p>
                          </div>

                          <p className="text-[10px] text-slate-400 font-sans italic leading-normal">
                            * Nota: Se o algoritmo sinalizar que não conseguiu
                            alocar certas matérias, ele exibirá uma listagem
                            apontando os problemas (geralmente choque de
                            disponibilidade do docente ou falta de salas
                            livres).
                          </p>
                        </div>
                      </div>
                    )}

                    {helpActiveTab === "validacoes" && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                          6. Diagnósticos de Grade, Conflitos e Aulas Faltantes
                        </h4>
                        <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                          <p>
                            Para garantir a precisão do seu planejamento
                            escolar, incluímos um sistema avançado de
                            acompanhamento em tempo real:
                          </p>

                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-sans">
                            <span className="text-[11px] font-black text-slate-900 uppercase block tracking-wider mb-1">
                              Painel Interativo de Aulas Faltantes / Diagnóstico
                            </span>
                            <p className="text-[11px] leading-relaxed">
                              Clique no botão{" "}
                              <strong className="uppercase">
                                Aulas Faltantes
                              </strong>{" "}
                              na barra superior a qualquer momento. Ele abre uma
                              tabela interativa que exibe, disciplina por
                              disciplina e turma por turma, quantas aulas foram
                              alocadas e qual o limite ideal.
                            </p>
                            <div className="bg-white p-3 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                                Filtros Avançados ("Status"):
                              </span>
                              <ul className="list-disc pl-4 space-y-1.5 text-[10px]">
                                <li>
                                  <strong className="text-amber-600">
                                    Apenas Faltantes:
                                  </strong>{" "}
                                  Mostra as matérias em que a escola ainda
                                  precisa designar aulas (ainda existem buracos
                                  não preenchidos).
                                </li>
                                <li>
                                  <strong className="text-rose-600">
                                    Apenas Excesso (+):
                                  </strong>{" "}
                                  Exibe classes onde um erro de sobreposição
                                  ocorreu (ex: o professor está adicionado 6
                                  vezes, embora a carga máxima da disciplina
                                  fosse de apenas 5).
                                </li>
                                <li>
                                  <strong className="text-emerald-600">
                                    Apenas Completos (OK):
                                  </strong>{" "}
                                  Mostra todas as parcelas de turmas
                                  corretamente preenchidas e com carga horária
                                  100% batida com plano de educação.
                                </li>
                              </ul>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 mt-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-1">
                                Fique Atento às Regras de Contagem:
                              </span>
                              <ul className="list-disc pl-4 space-y-1.5 text-[10px] text-blue-900">
                                <li>
                                  <strong className="text-blue-950 text-xs">
                                    Salas Especiais:
                                  </strong>{" "}
                                  Laboratórios, Videotecas ou Espaços de
                                  Inclusão <em>NÃO entram</em> na contagem de
                                  aulas faltantes. Eles são livres para você
                                  lotar como quiser!
                                </li>
                                <li>
                                  <strong className="text-blue-950 text-xs">
                                    Período Noturno:
                                  </strong>{" "}
                                  As turmas da noite só entram na conta final
                                  das Aulas Faltantes se a caixinha "Habilitar
                                  Turno da Noite nas Previsões" estiver marcada
                                  lá no Início (tela de Cadastro da Escola). Se
                                  não estiver visível nela, estará no seu
                                  diagnóstico.
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="space-y-3.5 font-sans text-xs">
                            {/* Alerta 1 */}
                            <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-800">
                              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                              <div>
                                <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">
                                  Disponibilidade Estrita do Professor:
                                </strong>
                                Caso você tente arrastar um professor para
                                lecionar em um horário que ele marcou como
                                indisponível (cinza) no seu cadastro, o sistema
                                irá bloquear e exibir um alerta, mantendo a
                                integridade dos acordos trabalhistas do seu
                                docente.
                              </div>
                            </div>

                            {/* Alerta 2 */}
                            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-805">
                              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                              <div>
                                <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">
                                  Estouro de Carga Horária Exigida:
                                </strong>
                                O monitoramento do dashboard emitirá avisos se a
                                soma das aulas alocadas para uma disciplina na
                                grade horária superar a carga total definida por
                                matriz curricular.
                              </div>
                            </div>

                            {/* Alerta 3 */}
                            <div className="flex gap-3 p-3 bg-indigo-50 border border-indigo-150 rounded-2xl text-indigo-805">
                              <Info className="w-5 h-5 shrink-0 text-indigo-500 mt-0.5" />
                              <div>
                                <strong className="text-[10px] font-black uppercase tracking-wide block mb-0.5 font-sans">
                                  Módulo "Visão Geral":
                                </strong>
                                Clique no botão{" "}
                                <strong className="uppercase">
                                  Visão Geral
                                </strong>{" "}
                                na barra superior a qualquer momento. Ele abre
                                uma tabela interativa que exibe de forma
                                detalhada o resumo do seu horário: com total de
                                aulas esperadas, alocadas, faltantes e excessos
                                em forma de gráficos.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t-2 border-slate-900 flex justify-between items-center shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    SISTEMA DE GESTÃO ESCOLAR INTEGRADA COGNITIVA
                  </span>
                  <button
                    onClick={() => setIsHelpModalOpen(false)}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 active:shadow-none"
                  >
                    Entendi, fechar tutorial!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Wizard Modal */}
        <AnimatePresence>
          {isWizardOpen && (
            <div
              className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setIsWizardOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-5xl h-[88vh] max-h-[850px] shadow-2xl overflow-hidden border-2 border-slate-900 flex flex-col"
              >
                {/* Giant Retro Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 border-b-2 border-slate-900 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Sparkles className="w-6 h-6 text-purple-650 text-purple-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">
                        Assistente de Geração de Horários (Modo Wizard) 🚀
                      </h3>
                      <p className="text-[10px] text-purple-100 font-bold uppercase tracking-wide mt-1">
                        Crie sua grade horária escolar ideal seguindo um passo a
                        passo simplificado
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsWizardOpen(false)}
                    className="p-2 bg-white rounded-full hover:bg-slate-50 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Step Navigation Header */}
                <div className="bg-slate-55 border-b border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between overflow-x-auto gap-4 custom-scrollbar">
                  {[
                    { step: 1, name: "Parâmetros" },
                    { step: 2, name: "Turmas" },
                    { step: 3, name: "Disciplinas" },
                    { step: 4, name: "Docentes" },
                    { step: 5, name: "Salas Especiais" },
                    { step: 6, name: "Geração" },
                    { step: 7, name: "Validação" },
                  ].map((item) => {
                    const isActive = wizardStep === item.step;
                    const isCompleted = wizardStep > item.step;
                    return (
                      <div
                        key={item.step}
                        className="flex items-center gap-2 shrink-0"
                      >
                        <button
                          onClick={() => handleWizardStepClick(item.step)}
                          className="flex items-center gap-1.5 focus:outline-none rounded-lg p-1 group cursor-pointer focus:ring-2 focus:ring-purple-500/50 text-left"
                          title={`Ir para ${item.name}`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition-all border-2 ${
                              isActive
                                ? "bg-purple-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105"
                                : isCompleted
                                  ? "bg-green-500 text-white border-green-700"
                                  : "bg-white text-slate-400 border-slate-200"
                            }`}
                          >
                            {isCompleted ? "✓" : item.step}
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${
                              isActive
                                ? "text-purple-700 font-extrabold"
                                : isCompleted
                                  ? "text-green-600 group-hover:text-green-700"
                                  : "text-slate-550 text-slate-500 group-hover:text-slate-800"
                            }`}
                          >
                            {item.name}
                          </span>
                        </button>
                        {item.step < 7 && (
                          <span className="text-slate-300 font-black px-1">
                            →
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Wizard Nav Warning Banner */}
                {wizardError && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border-2 border-red-900 rounded-2xl flex items-center justify-between text-red-950 text-xs font-semibold gap-3 animate-pulse shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-650 text-red-600 shrink-0" />
                      <span>{wizardError}</span>
                    </div>
                    <button
                      onClick={() => setWizardError(null)}
                      className="p-1 hover:bg-red-100 rounded-lg text-red-900 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Step Contents Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 min-h-0 custom-scrollbar">
                  {/* STEP 1: Turnos e Configurações Gerais */}
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-250 pb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-650 text-purple-600 animate-spin-slow" />
                        Passo 1: Configurar Identificação da Escola e Turno
                        Letivo
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-sans">
                        Antes de começar, confirme a identificação oficial do
                        colégio e defina quais turnos letivos estarão ativos.
                        Habilitar o modo noturno com a opção de aulas
                        assíncronas liberará horários híbridos de forma
                        flexível.
                      </p>

                      {/* School Identification Section inside Wizard Step 1 */}
                      <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/60 shadow-sm space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Identificação do Colégio / Escola:
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nome do Colégio */}
                          <div className="space-y-1.5 animate-in fade-in duration-300">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                              <School className="w-3.5 h-3.5 text-emerald-600" />
                              Nome do Colégio:
                            </label>
                            <input
                              type="text"
                              value={schoolName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSchoolName(val);
                                window.dispatchEvent(
                                  new CustomEvent("cecm_school_name_changed", {
                                    detail: val,
                                  }),
                                );
                              }}
                              placeholder="Nome do Colégio (Ex: CE LUCAS LENIAR)"
                              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2.5 outline-none transition-all font-sans"
                            />
                          </div>

                          {/* URL do Logotipo */}
                          <div className="space-y-1.5 animate-in fade-in duration-300">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                              Link do Logotipo (PNG/JPG URL):
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="URL da logo da escola..."
                                className="flex-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-2.5 outline-none transition-all font-sans"
                              />
                              {logoUrl && (
                                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center p-1 overflow-hidden shrink-0">
                                  <img
                                    src={logoUrl}
                                    alt="Preview Logo"
                                    className="max-w-full max-h-full object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Perfil da Instituição */}
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-300">
                          <span className="text-[10px] font-black uppercase text-slate-500 mb-2 block">
                            Modelo / Perfil da Instituição (SEED-PR)
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* regular */}
                            <button
                              type="button"
                              onClick={() => {
                                handleModalidadeChange(false);
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all bg-white hover:bg-slate-50/50 ${
                                !isCivicoMilitar
                                  ? "border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10"
                                  : "border-slate-200"
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  !isCivicoMilitar
                                    ? "border-emerald-600 bg-emerald-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {!isCivicoMilitar && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block leading-tight mb-0.5">
                                  Colégio Estadual Regular
                                </span>
                                <span className="text-[10px] text-slate-500 leading-snug block">
                                  Ensino regular padrão. Ajusta a nova estrutura
                                  curricular com Proyecto de Vida, Finanças e
                                  Tecnologia padrão SEED-PR.
                                </span>
                              </div>
                            </button>

                            {/* ccm */}
                            <button
                              type="button"
                              onClick={() => {
                                handleModalidadeChange(true);
                              }}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all bg-white hover:bg-slate-50/50 ${
                                isCivicoMilitar
                                  ? "border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/10"
                                  : "border-slate-200"
                              }`}
                            >
                              <div
                                className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isCivicoMilitar
                                    ? "border-blue-600 bg-blue-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isCivicoMilitar && (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block leading-tight mb-0.5">
                                  Colégio Cívico-Militar (CCM)
                                </span>
                                <span className="text-[10px] text-slate-500 leading-snug block">
                                  Modelo de gestão cívico-militar (CCM-PR).
                                  Insere matérias como Cidadania e Civismo na
                                  carga horária semanal obrigatória.
                                </span>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Active Shift Toggles Card */}
                        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/60 shadow-sm space-y-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Turnos Habilitados:
                          </span>

                          <div className="space-y-3">
                            {/* Manhã */}
                            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div>
                                <span className="text-xs font-black text-slate-800 uppercase block">
                                  Turno da Manhã
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                                  6 Períodos (1ª a 6ª Aula)
                                </span>
                              </div>
                              <span className="text-[9px] bg-sky-100 text-sky-800 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Ativo
                              </span>
                            </div>

                            {/* Tarde */}
                            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div>
                                <span className="text-xs font-black text-slate-800 uppercase block">
                                  Turno da Tarde
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                                  6 Períodos (7ª a 12ª Aula)
                                </span>
                              </div>
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Ativo
                              </span>
                            </div>

                            {/* Noite */}
                            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                              <div>
                                <span className="text-xs font-black text-purple-800 uppercase block">
                                  Turno da Noite (Noturno)
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">
                                  6 Períodos Letivos (13ª a 18ª Aula)
                                </span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={enableNoite}
                                  onChange={(e) => {
                                    setEnableNoite(e.target.checked);
                                    localStorage.setItem(
                                      "enable_noite_period",
                                      e.target.checked ? "true" : "false",
                                    );
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Noturno Asynchronous Options Card */}
                        {enableNoite && (
                          <div className="bg-purple-50/40 p-5 rounded-2xl border-2 border-purple-200/50 shadow-sm space-y-4">
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block">
                              Recursos Noturnos Inteligentes:
                            </span>
                            <div className="p-4 bg-white border border-purple-200 rounded-2xl space-y-3.5">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={enableNoiteAsynchronous}
                                  onChange={(e) => {
                                    setEnableNoiteAsynchronous(
                                      e.target.checked,
                                    );
                                    localStorage.setItem(
                                      "enable_noite_asynchronous",
                                      e.target.checked ? "true" : "false",
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-600 cursor-pointer mt-0.5"
                                />
                                <div>
                                  <span className="text-xs font-black text-purple-950 uppercase block select-none">
                                    Habilitar Aula Assíncrona
                                  </span>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-snug mt-1 select-none font-sans">
                                    Converte a 6ª aula do Turno Noturno em{" "}
                                    <strong className="text-purple-700">
                                      AULA ONLINE ASSÍNCRONA
                                    </strong>{" "}
                                    na grade horária.
                                  </p>
                                </div>
                              </label>

                              <hr className="border-purple-100" />

                              <div className="text-[9px] text-purple-700 font-bold uppercase leading-relaxed flex gap-2 font-sans">
                                <Info className="w-4 h-4 text-purple-500 shrink-0" />
                                Esta regra ajusta a carga letiva semanal
                                permitindo gerar aulas EaD de forma nativa e sem
                                quebras na conformidade da matriz escolar!
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Cadastro de Turmas */}
                  {wizardStep === 2 &&
                    (() => {
                      const activeNonRoomTurmas = turmas.filter(
                        (t) => !t.isRoom,
                      );

                      const getTurmaShift = (t: Turma) => {
                        if (t.shift) return t.shift;
                        const nameLower = (t.name || "").toLowerCase();
                        const idLower = (t.id || "").toLowerCase();
                        if (
                          nameLower.includes("noite") ||
                          idLower.includes("noite")
                        )
                          return "noite";
                        if (
                          nameLower.includes("tarde") ||
                          idLower.includes("tarde")
                        )
                          return "tarde";
                        return "manha";
                      };

                      const manhaTurmas = activeNonRoomTurmas.filter(
                        (t) => getTurmaShift(t) === "manha",
                      );
                      const tardeTurmas = activeNonRoomTurmas.filter(
                        (t) => getTurmaShift(t) === "tarde",
                      );
                      const noiteTurmas = activeNonRoomTurmas.filter(
                        (t) => getTurmaShift(t) === "noite",
                      );
                      const outrasTurmas = activeNonRoomTurmas.filter((t) => {
                        const s = getTurmaShift(t);
                        return s !== "manha" && s !== "tarde" && s !== "noite";
                      });

                      const renderTurmaCard = (turma: Turma) => {
                        const tShift = turma.shift || "todas";
                        const badgeColor =
                          tShift === "manha"
                            ? "bg-sky-100 text-sky-850"
                            : tShift === "tarde"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800";
                        return (
                          <div
                            key={turma.id}
                            className="relative bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-[#657c36] transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 pr-14">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{
                                      backgroundColor: turma.color || "#94a3b8",
                                    }}
                                  />
                                  <span className="text-xs font-black text-slate-800 uppercase">
                                    {turma.name}
                                  </span>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                  <span
                                    className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor}`}
                                  >
                                    {tShift}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase font-sans">
                                    {getEffectiveDailyClassCount(turma, isCivicoMilitar)} aulas/dia{" "}
                                    {turma.shift === "noite" &&
                                      enableNoiteAsynchronous &&
                                      "+ 1 Assíncrona"}
                                  </span>
                                </div>
                              </div>

                              <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingTurmaId(turma.id);
                                    setNewTurmaName(turma.name);
                                    setNewTurmaShift(
                                      tShift === "todas" ? "todas" : tShift,
                                    );
                                    setNewTurmaDailyClassCount(
                                      getEffectiveDailyClassCount(turma, isCivicoMilitar),
                                    );
                                    openSidebarModal("turma");
                                  }}
                                  className="p-1.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Editar Turma"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeTurma(turma.id)}
                                  className="p-1.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Excluir Turma"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-600" />
                              Passo 2: Cadastro e Gestão de Turmas (
                              {activeNonRoomTurmas.length})
                            </h4>
                            <button
                              onClick={() => {
                                setEditingTurmaId(null);
                                setNewTurmaName("");
                                setNewTurmaShift("todas");
                                setNewTurmaDailyClassCount(6);
                                setIsAddingTurma(true);
                              }}
                              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase rounded-lg border-2 border-slate-900 shadow-[1px_1px_rgba(0,0,0,1)] shrink-0 transition-all cursor-pointer hover:shadow-[2px_2px_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-0"
                            >
                              + Cadastrar Turma
                            </button>
                          </div>

                          <p className="text-xs text-slate-500 max-w-xl font-sans">
                            Crie todas as turmas do colégio. Defina se as mesmas
                            estudarão 5 ou 6 aulas p/ dia, e quais os seus
                            turnos específicos.
                          </p>

                          <div className="space-y-6">
                            {/* Manhã */}
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 border-b border-sky-100 pb-1.5">
                                <Sun className="w-4 h-4 text-sky-500" />
                                <h5 className="text-[10px] font-black text-sky-950 uppercase tracking-wider">
                                  Turno Manhã ({manhaTurmas.length})
                                </h5>
                              </div>
                              {manhaTurmas.length === 0 ? (
                                <div className="text-[10px] font-bold text-slate-450 py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-wider">
                                  Nenhuma turma cadastrada no turno da manhã
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {manhaTurmas.map(renderTurmaCard)}
                                </div>
                              )}
                            </div>

                            {/* Tarde */}
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 border-b border-amber-100 pb-1.5">
                                <CloudSun className="w-4 h-4 text-amber-500" />
                                <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                                  Turno Tarde ({tardeTurmas.length})
                                </h5>
                              </div>
                              {tardeTurmas.length === 0 ? (
                                <div className="text-[10px] font-bold text-slate-450 py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-wider">
                                  Nenhuma turma cadastrada no turno da tarde
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {tardeTurmas.map(renderTurmaCard)}
                                </div>
                              )}
                            </div>

                            {/* Noite (only visible if enableNoite is true or has night classes) */}
                            {(enableNoite || noiteTurmas.length > 0) && (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 border-b border-purple-100 pb-1.5">
                                  <Moon className="w-4 h-4 text-purple-500" />
                                  <h5 className="text-[10px] font-black text-purple-950 uppercase tracking-wider">
                                    Turno Noite ({noiteTurmas.length})
                                  </h5>
                                </div>
                                {noiteTurmas.length === 0 ? (
                                  <div className="text-[10px] font-bold text-slate-450 py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-wider">
                                    Nenhuma turma cadastrada no turno da noite
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {noiteTurmas.map(renderTurmaCard)}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Outros / Geral */}
                            {outrasTurmas.length > 0 && (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 border-b border-slate-150 pb-1.5">
                                  <Calendar className="w-4 h-4 text-slate-500" />
                                  <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                                    Outras Turmas ({outrasTurmas.length})
                                  </h5>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {outrasTurmas.map(renderTurmaCard)}
                                </div>
                              </div>
                            )}

                            {/* Salas Especiais / Ambientes */}
                            {(() => {
                              const specialRooms = turmas.filter(
                                (t) => t.isRoom,
                              );
                              return (
                                <div className="space-y-2.5 pt-4 border-t border-slate-200">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-indigo-150">
                                    <div className="flex items-center gap-2">
                                      <DoorClosed className="w-4 h-4 text-indigo-500" />
                                      <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">
                                        Salas Especiais & Laboratórios (
                                        {specialRooms.length})
                                      </h5>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddingRoom(true);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Gerenciar Salas Especiais
                                    </button>
                                  </div>
                                  {specialRooms.length === 0 ? (
                                    <div className="text-[10px] font-bold text-slate-450 py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-wider font-sans">
                                      Nenhuma sala especial cadastrada. Clique
                                      ao lado para cadastrar!
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                      {specialRooms.map((room) => (
                                        <div
                                          key={room.id}
                                          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-350 transition-colors"
                                        >
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    room.color || "#6366f1",
                                                }}
                                              />
                                              <span className="text-xs font-black text-slate-800 uppercase">
                                                {room.name}
                                              </span>
                                            </div>
                                            <div className="text-[8px] font-black uppercase text-indigo-600 tracking-wider font-sans">
                                              SALA ESPECIAL / LAB
                                            </div>
                                          </div>

                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                openSidebarModal("sala");
                                              }}
                                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setConfirmConfig({
                                                  title:
                                                    "Remover Sala Especial",
                                                  message: `Deseja realmente remover a sala ${room.name}? Isso também apagará as alocações de horários vinculadas a ela.`,
                                                  confirmText: "Remover",
                                                  cancelText: "Cancelar",
                                                  onConfirm: () =>
                                                    removeTurma(room.id),
                                                });
                                              }}
                                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-455 hover:text-rose-600 transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}

                  {/* STEP 3: Cadastro de Disciplinas */}
                  {wizardStep === 3 &&
                    (() => {
                      const fundamentalSubs = subjects.filter(
                        (s) =>
                          s.levelConstraint === "fundamental" ||
                          s.levelConstraint === "ambos" ||
                          !s.levelConstraint,
                      );
                      const medioSubs = subjects.filter(
                        (s) =>
                          s.levelConstraint === "medio" ||
                          s.levelConstraint === "ambos" ||
                          !s.levelConstraint,
                      );
                      const tecnicoSubs = subjects.filter(
                        (s) => s.levelConstraint === "tecnico",
                      );

                      const openAddSubjectWithPreset = (
                        preset: "fundamental" | "medio" | "tecnico" | "ambos",
                      ) => {
                        setEditingSubjectId(null);
                        setNewSubjectName("");
                        setNewSubjectColor(generateDistinctColor(subjects));
                        setNewSubjectWorkload(2);
                        setNewSubjectUseLabComp(false);
                        setNewSubjectUseLabTab(false);
                        setNewSubjectUseSalaMat(false);
                        setNewSubjectRoomIds([]);
                        setNewSubjectLabWorkload(0);
                        setNewSubjectClassWorkload(0);
                        setNewSubjectLevelConstraint(preset);
                        setNewSubjectGradeConstraint("");
                        setNewSubjectSuffixConstraint("");
                        setNewSubjectAllowedTurmaIds([]);
                        setNewSubjectCustomWorkloads({});
                        setIsAddingSubject(true);
                      };

                      const renderSubjectCardInColumn = (subject: Subject) => {
                        const hasCustom =
                          subject.customWorkloads &&
                          Object.keys(subject.customWorkloads).length > 0;
                        return (
                          <div
                            key={subject.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-350 shadow-xs flex flex-col justify-between transition-all font-sans relative hover:shadow-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div className="min-w-0 flex-1 pr-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor:
                                        subject.color || "#94a3b8",
                                    }}
                                  />
                                  <span
                                    className="text-[11px] font-black text-slate-900 uppercase block truncate leading-tight"
                                    title={subject.name}
                                  >
                                    {subject.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 items-center mt-1">
                                  <span className="text-[7.5pt] font-extrabold text-blue-600 bg-blue-50/50 px-1 py-0.5 rounded uppercase font-mono tracking-tight">
                                    {subject.workload}a/semana
                                  </span>
                                  {(subject.levelConstraint === "ambos" ||
                                    !subject.levelConstraint) && (
                                    <span className="text-[7pt] font-extrabold text-[#657c36] bg-[#657c36]/10 px-1 py-0.5 rounded uppercase tracking-tighter">
                                      Geral / Ambos
                                    </span>
                                  )}
                                  {hasCustom && (
                                    <span className="text-[7pt] font-black text-purple-700 bg-purple-50 px-1 py-0.5 rounded uppercase tracking-tighter">
                                      Custom 🔥
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    startEditSubject(subject);
                                    openSidebarModal("disciplina");
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => removeSubject(subject.id)}
                                  className="p-1 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {hasCustom && (
                              <div className="mt-2 bg-purple-50/20 border border-purple-100/40 p-1.5 rounded-lg text-[8px] font-bold text-purple-950 space-y-0.5">
                                <div className="grid grid-cols-2 gap-1 max-h-16 overflow-y-auto font-mono">
                                  {Object.entries(
                                    subject.customWorkloads || {},
                                  ).map(([tId, count]) => {
                                    const tName =
                                      turmas.find((t) => t.id === tId)?.name ||
                                      tId;
                                    return (
                                      <div
                                        key={tId}
                                        className="bg-white/80 px-1 py-0.5 rounded border border-purple-100/30 text-center truncate"
                                      >
                                        {tName}: {count}a
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2 font-sans">
                            <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-purple-600" />
                              Passo 3: Grade Curricular de Disciplinas (
                              {subjects.length})
                            </h4>
                            <button
                              onClick={() => openAddSubjectWithPreset("ambos")}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[9px] font-black uppercase rounded-lg border-2 border-slate-900 shadow-[1px_1px_rgba(0,0,0,1)] shrink-0 transition-all cursor-pointer hover:shadow-[2px_2px_rgba(0,0,0,1)] active:translate-y-0"
                            >
                              + Adicionar Geral
                            </button>
                          </div>

                          <p className="text-xs text-slate-500 max-w-2xl font-sans leading-relaxed">
                            Configure as matérias escolares. Clique em{" "}
                            <strong className="text-slate-900">+ NOVO</strong>{" "}
                            em qualquer uma das colunas temáticas pré-definidas
                            para adicionar uma disciplina já vinculada
                            adequadamente a esse nível!
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                            {/* COL 1: Ensino Fundamental */}
                            <div className="bg-blue-50/20 p-3 rounded-2xl border border-blue-100 flex flex-col space-y-3 min-h-[350px]">
                              <div className="flex justify-between items-center border-b border-blue-100/60 pb-1.5">
                                <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                  Ensino Fundamental
                                </span>
                                <button
                                  onClick={() =>
                                    openAddSubjectWithPreset("fundamental")
                                  }
                                  className="text-[9px] font-black text-blue-700 bg-blue-100/50 hover:bg-blue-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  + NOVO
                                </button>
                              </div>
                              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                                {fundamentalSubs.length === 0 ? (
                                  <div className="text-[10px] text-slate-400 text-center py-10 italic bg-white/40 rounded-xl border border-dashed border-slate-200 font-sans">
                                    Lista vazia
                                  </div>
                                ) : (
                                  fundamentalSubs.map(renderSubjectCardInColumn)
                                )}
                              </div>
                            </div>

                            {/* COL 2: Ensino Médio */}
                            <div className="bg-purple-50/20 p-3 rounded-2xl border border-purple-100 flex flex-col space-y-3 min-h-[350px]">
                              <div className="flex justify-between items-center border-b border-purple-100/60 pb-1.5">
                                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                  Ensino Médio
                                </span>
                                <button
                                  onClick={() =>
                                    openAddSubjectWithPreset("medio")
                                  }
                                  className="text-[9px] font-black text-purple-700 bg-purple-100/50 hover:bg-purple-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  + NOVO
                                </button>
                              </div>
                              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                                {medioSubs.length === 0 ? (
                                  <div className="text-[10px] text-slate-400 text-center py-10 italic bg-white/40 rounded-xl border border-dashed border-slate-200 font-sans">
                                    Lista vazia
                                  </div>
                                ) : (
                                  medioSubs.map(renderSubjectCardInColumn)
                                )}
                              </div>
                            </div>

                            {/* COL 3: Técnico */}
                            <div className="bg-emerald-50/20 p-3 rounded-2xl border border-emerald-100 flex flex-col space-y-3 min-h-[350px]">
                              <div className="flex justify-between items-center border-b border-emerald-100/60 pb-1.5">
                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {techCourseName}
                                </span>
                                <button
                                  onClick={() =>
                                    openAddSubjectWithPreset("tecnico")
                                  }
                                  className="text-[9px] font-black text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  + NOVO
                                </button>
                              </div>
                              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                                {tecnicoSubs.length === 0 ? (
                                  <div className="text-[10px] text-slate-400 text-center py-10 italic bg-white/40 rounded-xl border border-dashed border-slate-200 font-sans">
                                    Lista vazia
                                  </div>
                                ) : (
                                  tecnicoSubs.map(renderSubjectCardInColumn)
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {/* STEP 4: Cadastro de Professores e Restrições de Disponibilidade */}
                  {wizardStep === 4 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-650 text-purple-600" />
                          Passo 4: Cadastro e Disponibilidade de Docentes (
                          {teachers.length})
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowMassImportModal(true)}
                            className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-black uppercase rounded-lg border border-emerald-300 transition-all cursor-pointer"
                          >
                            Importar Planilha (Excel/CSV)
                          </button>
                          <button
                            onClick={() => {
                              setEditingTeacherId(null);
                              setNewTeacherName("");
                              setNewTeacherSubjectIds([]);
                              setNewTeacherUnavailability([]);
                              setNewTeacherPreferDouble(true);
                              setNewTeacherRequireShiftInterval(false);
                              setNewTeacherTurmaIds([]);
                              setNewTeacherSubjectTurmaMap({});
                              setNewTeacherSchoolWorkload("");
                              setNewTeacherSchoolWorkloadManha("");
                              setNewTeacherSchoolWorkloadTarde("");
                              setNewTeacherSchoolWorkloadNoite("");
                              setIsAddingTeacher(true);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase rounded-lg border-2 border-slate-900 shadow-[1px_1px_rgba(0,0,0,1)] shrink-0 transition-all cursor-pointer hover:shadow-[2px_2px_rgba(0,0,0,1)] active:translate-y-0"
                          >
                            + Cadastrar Professor
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 max-w-xl font-sans">
                        Adicione os professores do colégio e defina as suas
                        restrições de horários e períodos em que estão
                        disponíveis ou bloqueados.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                        {teachers.map((teacher) => {
                          const subjectsTaught =
                            subjects
                              .filter((s) => teacher.subjectIds?.includes(s.id))
                              .map((s) => s.name)
                              .join(", ") || "Nenhuma";

                          let isAvailabilityLimited = false;
                          let countLivres = 0;
                          if (
                            teacher.unavailability &&
                            teacher.unavailability.length > 0
                          ) {
                            isAvailabilityLimited = true;
                            countLivres =
                              5 * 6 * 2 +
                              (enableNoite ? 5 * 5 : 0) -
                              teacher.unavailability.length; // Approximate for badge
                          } else if (
                            teacher.availability &&
                            teacher.availability.length > 0
                          ) {
                            isAvailabilityLimited = true;
                            countLivres = teacher.availability.length;
                          }

                          return (
                            <div
                              key={teacher.id}
                              className="relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-[#657c36] transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1 pr-14">
                                  <span className="text-xs font-black text-slate-800 uppercase block">
                                    {teacher.name}
                                  </span>
                                  <span
                                    className="text-[9px] text-slate-400 font-bold uppercase block line-clamp-2"
                                    title={subjectsTaught}
                                  >
                                    Matérias: {subjectsTaught}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                                    <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      {isAvailabilityLimited
                                        ? `${countLivres} slots livres`
                                        : "Totalmente Disponível 🌐"}
                                    </span>
                                    {teacher.preferDoubleClasses && (
                                      <span className="text-[8px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Geminadas ⚡
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="absolute top-4 right-4 flex gap-1 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      startEditTeacher(teacher);
                                      openSidebarModal("professor");
                                    }}
                                    className="p-1.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                    title="Editar Professor"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => removeTeacher(teacher.id)}
                                    className="p-1.5 bg-white shadow-sm border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Excluir Professor"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Cadastro de Salas Especiais */}
                  {wizardStep === 5 && (
                    <div className="space-y-4 animate-in fade-in duration-200 font-sans">
                      <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                        <DoorClosed className="w-4 h-4 text-purple-650 text-purple-600" />
                        Passo 5: Cadastro e Configuração de Salas Especiais /
                        Ambientes ({turmas.filter((t) => t.isRoom).length})
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                        Defina os ambientes especiais do colégio (laboratórios,
                        salas temáticas, etc.). Eles são fundamentais para
                        evitar choques de agendamento de locais físicos nas
                        disciplinas que os exigem.
                      </p>

                      {/* Inline room adding form */}
                      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-sm space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Adicionar Nova Sala Especial:
                        </span>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            type="text"
                            placeholder="NOME DA SALA (ex: INFORMÁTICA 1)"
                            value={newRoomName}
                            onChange={(e) =>
                              setNewRoomName(e.target.value.toUpperCase())
                            }
                            className="flex-1 min-w-[200px] px-3 py-2 bg-slate-55 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 uppercase"
                          />
                          <select
                            value={newRoomIcon}
                            onChange={(e) => setNewRoomIcon(e.target.value)}
                            className="px-3 py-2 bg-slate-55 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {predefinedIcons.map((iconOpt) => (
                              <option key={iconOpt.id} value={iconOpt.id}>
                                {iconOpt.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="color"
                            value={newRoomColor}
                            onChange={(e) => setNewRoomColor(e.target.value)}
                            className="w-10 h-9 p-1 bg-slate-55 border-2 border-slate-100 rounded-xl cursor-pointer shrink-0"
                          />
                          <button
                            onClick={addRoom}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm shrink-0"
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Existing rooms list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {turmas.filter((t) => t.isRoom).length === 0 ? (
                          <div className="col-span-full py-8 text-center bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Nenhuma Sala Especial Cadastrada. Use o formulário
                            acima para adicionar!
                          </div>
                        ) : (
                          turmas
                            .filter((t) => t.isRoom)
                            .map((room) => (
                              <div
                                key={room.id}
                                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border-2 border-slate-150 hover:border-purple-400 transition-all group shadow-xs relative"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                    style={{
                                      backgroundColor: room.color || "#6366f1",
                                    }}
                                  >
                                    {getRoomIcon(
                                      room.icon,
                                      "w-4 h-4 text-white",
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                      type="text"
                                      value={room.name}
                                      onChange={(e) => {
                                        const newName =
                                          e.target.value.toUpperCase();
                                        setTurmas((prev) =>
                                          prev.map((t) =>
                                            t.id === room.id
                                              ? { ...t, name: newName }
                                              : t,
                                          ),
                                        );
                                      }}
                                      className="text-xs font-black text-slate-800 bg-transparent border-b-2 border-transparent focus:border-purple-400 p-0 focus:ring-0 w-full"
                                    />
                                    <div className="flex gap-2">
                                      <select
                                        value={room.icon || "DoorClosed"}
                                        onChange={(e) => {
                                          const newIcon = e.target.value;
                                          setTurmas((prev) =>
                                            prev.map((t) =>
                                              t.id === room.id
                                                ? { ...t, icon: newIcon }
                                                : t,
                                            ),
                                          );
                                        }}
                                        title="Alterar Ícone"
                                        className="text-[9px] border-none bg-slate-55 font-black text-slate-500 rounded-md py-0.5 px-1 focus:ring-0 cursor-pointer"
                                      >
                                        {predefinedIcons.map((iconOpt) => (
                                          <option
                                            key={iconOpt.id}
                                            value={iconOpt.id}
                                          >
                                            {iconOpt.label}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="color"
                                        value={room.color || "#6366f1"}
                                        onChange={(e) => {
                                          const newColor = e.target.value;
                                          setTurmas((prev) =>
                                            prev.map((t) =>
                                              t.id === room.id
                                                ? { ...t, color: newColor }
                                                : t,
                                            ),
                                          );
                                        }}
                                        className="w-5 h-5 p-0 bg-transparent border-none rounded cursor-pointer"
                                        title="Alterar Cor"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeTurma(room.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0 ml-2"
                                  title="Excluir Sala Especial"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Motor de Geração Automática */}
                  {wizardStep === 6 && (
                    <div className="space-y-4 animate-in fade-in duration-200 font-sans">
                      <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-650 text-purple-600 animate-bounce" />
                        Passo 6: Motor de Otimização e Geração de Horários
                      </h4>
                      <p className="text-xs text-slate-550 max-w-xl text-slate-500 leading-relaxed font-sans">
                        Selecione suas opções de geração automática. O algoritmo
                        rodará verificando todas as restrições de laboratórios,
                        choque de professores ou cargas especificadas.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Control Panel Card */}
                        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                            Opções para Geração Inteligente:
                          </span>

                          <div className="space-y-3.5">
                            {/* Shift Filter */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase">
                                Processar Turnos:
                              </span>
                              <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1">
                                {[
                                  { id: "both", name: "Todos" },
                                  { id: "manha", name: "Manhã" },
                                  { id: "tarde", name: "Tarde" },
                                  { id: "noite", name: "Noite" },
                                ].map((s) => {
                                  const isCurrent = autoGenShift === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      onClick={() =>
                                        setAutoGenShift(s.id as any)
                                      }
                                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${isCurrent ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                    >
                                      {s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Strategy selection */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase">
                                Estratégia Básica:
                              </span>
                              <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1">
                                <button
                                  onClick={() => setAutoGenMode("all")}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${autoGenMode === "all" ? "bg-purple-650 bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                  Do Zero (Recom)
                                </button>
                                <button
                                  onClick={() => setAutoGenMode("empty")}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${autoGenMode === "empty" ? "bg-purple-650 bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-850"}`}
                                >
                                  Apenas Vazios
                                </button>
                              </div>
                            </div>

                            {/* Run Optimization Button */}
                            <button
                              onClick={() => runAutoScheduling()}
                              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-widest transition-all rounded-xl border-2 border-slate-900 shadow-[2px_2px_rgba(0,0,0,1)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-4 h-4 text-yellow-250 animate-pulse" />
                              Girar Algoritmo Inteligente Letivo ⚙
                            </button>
                          </div>
                        </div>

                        {/* Log Screen Card */}
                        <div className="bg-slate-900 p-4 rounded-2xl border-2 border-slate-950 flex flex-col justify-between font-mono h-64 text-xs text-slate-300 shadow-sm overflow-hidden relative">
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse animate-pulse-slow" />
                            <span className="text-[8px] font-bold text-slate-505 text-slate-400 uppercase tracking-wider font-mono">
                              Terminal Ativo
                            </span>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 border-b border-slate-800 pb-1 mb-2 block font-mono">
                            Resumo e Registros de IA:
                          </span>

                          <div className="flex-1 overflow-y-auto space-y-1 select-none font-mono text-[10px] text-slate-350 custom-scrollbar pr-1">
                            <div className="font-mono">
                              &gt; Aguardando comando de inicialização...
                            </div>
                            {autoGenResults ? (
                              <div className="space-y-1 font-mono">
                                <div className="text-emerald-400 font-mono">
                                  &gt; Algoritmo completado com sucesso!
                                </div>
                                <div className="font-mono">
                                  &gt; Aulas Escaneadas:{" "}
                                  {autoGenResults.scannedCount}
                                </div>
                                <div className="font-mono">
                                  &gt; Aulas Alocadas com sucesso:{" "}
                                  {autoGenResults.placedCount}
                                </div>
                                <div className="font-mono">
                                  &gt; Percentual de Alocação:{" "}
                                  {autoGenResults.scannedCount > 0
                                    ? Math.round(
                                        (autoGenResults.placedCount /
                                          autoGenResults.scannedCount) *
                                          100,
                                      )
                                    : 0}
                                  %
                                </div>
                                {autoGenResults.pending.length > 0 ? (
                                  <>
                                    <div className="text-amber-400 font-mono">
                                      &gt; {autoGenResults.pending.length}{" "}
                                      pendências encontradas. Consulte o
                                      diagnóstico!
                                    </div>
                                    <button
                                      onClick={() => {
                                        setIsAutoGenerateResultsModalOpen(true);
                                        if (!aiAnalysisText && !isAiAnalyzing) {
                                          requestGeminiAnalysis();
                                        }
                                      }}
                                      disabled={isAiAnalyzing}
                                      className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-md text-[9px] font-black uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70 border border-slate-700"
                                    >
                                      {isAiAnalyzing ? (
                                        <span className="animate-spin">⚙</span>
                                      ) : (
                                        <Sparkles className="w-3 h-3" />
                                      )}
                                      {isAiAnalyzing
                                        ? "Analisando..."
                                        : "IA Gemini: Sugerir Solução"}
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-green-400 font-mono">
                                    &gt; 100% de Harmonia lecionada atingida!
                                    Sem pendências!
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-500 italic font-mono">
                                &gt; Pressione o botão ao lado para organizar
                                todas as aulas na semana de forma otimizada.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Validação de Carga Horária e Verificação de Conflitos */}
                  {wizardStep === 7 && (
                    <div className="space-y-4 animate-in fade-in duration-200 font-sans">
                      <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />

                        Passo 7: Diagnóstico e Validação da Matriz de Horários
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                        Excelente! A seguir, revisamos as estatísticas gerais do
                        colégio para as turmas e professores, garantindo
                        conformidade matemática impecável.
                      </p>

                      {/* Overall Progress Block inside wizard */}
                      {(() => {
                        let overallExpected = 0;
                        let overallAllocated = 0;
                        let overallMissing = 0;
                        let metricTurmas = turmas.filter((t) => !t.isRoom);
                        if (!enableNoite) {
                          metricTurmas = metricTurmas.filter((t) => {
                            const shift =
                              t.shift ||
                              (t.id.toLowerCase().includes("noite") ||
                              t.name.toLowerCase().includes("noite")
                                ? "noite"
                                : t.id.toLowerCase().includes("tarde") ||
                                    t.name.toLowerCase().includes("tarde")
                                  ? "tarde"
                                  : "manha");
                            return shift !== "noite";
                          });
                        }
                        metricTurmas.forEach((t) => {
                          subjects.forEach((s) => {
                            const { total, usage } = getClassSubjectWorkload(
                              t.id,
                              s.id,
                            );
                            overallExpected += total;
                            overallAllocated += Math.min(total, usage);
                            if (total > usage) {
                              overallMissing += total - usage;
                            }
                          });
                        });

                        const overallCompletion =
                          overallExpected > 0
                            ? Math.round(
                                (overallAllocated / overallExpected) * 100,
                              )
                            : 0;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Metrics boxes inside step */}
                            <div className="bg-white p-5 rounded-2xl border-2 border-slate-200/60 shadow-sm space-y-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Progresso Consolidado da Matriz Letiva:
                              </span>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Esperadas
                                  </span>
                                  <span className="text-lg font-black text-slate-800 block mt-0.5">
                                    {overallExpected}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-sans">
                                    Planejadas
                                  </span>
                                  <span className="text-lg font-black text-green-600 block mt-0.5">
                                    {overallAllocated}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Pendências
                                  </span>
                                  <span className="text-lg font-black text-rose-600 block mt-0.5">
                                    {overallMissing}
                                  </span>
                                </div>
                              </div>

                              {/* Outer Progress Bar */}
                              <div className="space-y-1.5">
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200">
                                  <div
                                    className="bg-green-505 bg-green-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${overallCompletion}%` }}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500">
                                  <span>
                                    {overallCompletion}% Distribuição de Aulas
                                  </span>
                                  <span className="text-green-600 font-black">
                                    {overallAllocated}/{overallExpected}{" "}
                                    distribuídas
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quick checklist block */}
                            <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-slate-950 shadow-sm flex flex-col justify-between">
                              <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block mb-2 leading-none">
                                Matriz Pronta para Homologação:
                              </span>
                              <div className="space-y-2 text-[10px] text-slate-300 leading-relaxed font-sans flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400 font-extrabold">
                                    ✔
                                  </span>
                                  <span>
                                    Regras Curriculares por série, sufixo e
                                    whitelisting testadas com sucesso.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400 font-extrabold">
                                    ✔
                                  </span>
                                  <span>
                                    Cargas horárias por turma e docente com
                                    tipagem estrita implementada.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400 font-extrabold">
                                    ✔
                                  </span>
                                  <span>
                                    Laboratórios e salas especiais sob alocação
                                    e checagem unívocas.
                                  </span>
                                </div>
                              </div>

                              <hr className="border-slate-800 my-3 shrink-0" />

                              <button
                                onClick={handleExportData}
                                className="w-full mb-2.5 py-2 bg-slate-800 hover:bg-slate-750 text-amber-400 border-2 border-slate-700 font-black tracking-widest text-[10px] uppercase rounded-xl transition-all shadow-[2px_2px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 cursor-pointer text-center flex items-center justify-center gap-1.5"
                                title="Salvar arquivo de backup de segurança em formato .json"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Gerar Backup de Segurança (.json) 💾
                              </button>

                              <button
                                onClick={() => {
                                  setIsWizardOpen(false);
                                  handleSave();
                                }}
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-slate-900 font-black tracking-widest text-xs uppercase rounded-xl transition-all shadow-[2px_2px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0 cursor-pointer text-center"
                              >
                                Finalizar Wizard e Salvar Grade 🏁
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Responsive Giant Footer with Prev / Next controls */}
                <div className="bg-slate-55 p-4 border-t-2 border-slate-900 flex justify-between items-center shrink-0">
                  <button
                    disabled={wizardStep === 1}
                    onClick={() => handleWizardStepClick(wizardStep - 1)}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      wizardStep === 1
                        ? "bg-slate-150 text-slate-400 border-slate-300 shadow-none cursor-not-allowed opacity-50"
                        : "bg-white text-slate-700 hover:bg-slate-100 active:translate-y-0 cursor-pointer"
                    }`}
                  >
                    ◄ Voltar Passo
                  </button>

                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    Passo {wizardStep} de 7
                  </span>

                  {wizardStep < 7 ? (
                    <button
                      onClick={() => handleWizardStepClick(wizardStep + 1)}
                      className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0"
                    >
                      Avançar Passo ►
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsWizardOpen(false);
                        handleSave();
                      }}
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white border-2 border-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-0 active:translate-x-0"
                    >
                      Concluir Assistente!
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast de Segurança (Bloqueio de Informações / Botão Direito) */}
        <AnimatePresence>
          {showSecurityToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-slate-900 border-2 border-slate-900 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] text-white w-full max-w-xs md:max-w-sm"
            >
              <div className="p-1.5 bg-red-500 rounded-lg text-white shrink-0">
                <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h5 className="text-[9px] font-black uppercase tracking-widest text-red-400">
                  Acesso Restrito
                </h5>
                <p className="text-[10px] font-bold text-slate-100 font-sans leading-snug mt-0.5">
                  O clique direito e atalhos de depuração foram desativados para
                  segurança e integridade do banco de dados curricular.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast de Conflito de Arrastar/Soltar */}
        <AnimatePresence>
          {dragErrorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-red-950 border-2 border-red-900 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] text-white w-full max-w-xs md:max-w-sm"
            >
              <div className="p-1.5 bg-red-600 rounded-lg text-white shrink-0">
                <AlertCircle className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div>
                <h5 className="text-[9px] font-black uppercase tracking-widest text-red-200">
                  Operação Inválida / Conflito
                </h5>
                <p className="text-[10px] font-semibold text-red-100 font-sans leading-snug mt-0.5">
                  {dragErrorMsg}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast de Informação / Instrução */}
        <AnimatePresence>
          {infoMsg && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 left-6 z-[100] flex items-center gap-3 bg-indigo-950 border-2 border-indigo-900 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] text-white w-full max-w-xs md:max-w-sm"
            >
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white shrink-0">
                <Info className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-tight">Modo Mover por Cliques</h4>
                <p className="text-[10px] text-slate-350 leading-normal mt-0.5">{infoMsg}</p>
              </div>
              <button 
                onClick={() => setInfoMsg(null)}
                className="ml-auto p-1 rounded hover:bg-indigo-900/50 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {confirmConfig && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setConfirmConfig(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 border-2 border-slate-900 text-left"
              >
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {confirmConfig.title}
                </h4>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight leading-normal">
                  {confirmConfig.message}
                </p>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setConfirmConfig(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    {confirmConfig.cancelText || "Cancelar"}
                  </button>
                  <button
                    onClick={() => {
                      const cb = confirmConfig.onConfirm;
                      setConfirmConfig(null);
                      cb();
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 hover:scale-102 border-2 border-red-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(220,38,38,0.15)] cursor-pointer"
                  >
                    {confirmConfig.confirmText || "Confirmar"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Mass Import Modal */}
        <AnimatePresence>
          {showMassImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMassImportModal(false)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl border border-slate-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm">
                        Importação de Docentes em Massa
                      </h3>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                        Formato: Excel ou CSV
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMassImportModal(false)}
                    className="text-slate-400 hover:text-slate-700 p-2 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  Copie e cole os dados da sua planilha. Os dados devem seguir o
                  formato de duas colunas separadas por tabulação ou ponto e
                  vírgula: <b>Nome do Professor</b> e{" "}
                  <b>Matérias (separadas por vírgula)</b>.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-500 font-mono text-[10px] mb-4 space-y-1">
                  <p>Exemplo:</p>
                  <p className="font-bold text-slate-700">
                    João Silva{"\t"}Matemática, Física
                  </p>
                  <p className="font-bold text-slate-700">
                    Maria Lima{"\t"}Língua Portuguesa
                  </p>
                </div>

                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Dados da Planilha
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Cole aqui os dados do Excel..."
                  className="w-full h-48 p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs mb-4 resize-none custom-scrollbar"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMassImportModal(false)}
                    className="flex-1 py-2.5 font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={processMassImport}
                    className="flex-1 py-2.5 font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    Importar Docentes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isApiKeyModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApiKeyModalOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Chave da API Gemini
                    </h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      Configuração Salva no Navegador
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
                  O aplicativo processará os dados{" "}
                  <b>diretamente pelo seu navegador</b>. Nós{" "}
                  <b>não guardamos</b> a sua chave (ela ficará salva no
                  LocalStorage de sua própria máquina).
                </p>
                <input
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="Insira a sua API Key..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsApiKeyModalOpen(false)}
                    className="flex-1 py-2.5 font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveAndRunGemini}
                    className="flex-1 py-2.5 font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    Salvar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Autosave Indicator */}
        <AnimatePresence>
          {(isAutosaving || isSaved) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 bg-white border border-slate-200 shadow-lg rounded-full flex items-center gap-2 px-4 py-2 pointer-events-none z-50 overflow-hidden"
            >
              {isAutosaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-600">
                    Salvando as alterações...
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">
                    Visualização Atualizada & Gravada
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}


const ScheduleCell = React.memo(({
  turma, day, actualPeriod, slot, teacher, subject, associatedTurma, conflicts, activeSub, subTeacher,
  isGrayDay, enableNoiteAsynchronous, importShift, viewMode, isLoading, isDragTargetValid, dragInvalidReason,
  errorCell, draggedOverCell, cellBg, customStyle, slotId, turmas, schedules, isDimmed, draggingSource,
  handleSlotClick, setHoveredTeacherId, handleDragOver, handleDrop, handleDragLeave, handleDragStart, handleDragEnd, setSchedules, setIsSaved
}: any) => {
  return (
    <td
  id={`cell-${turma.id}-${slotId}`}
  tabIndex={0}
  data-turmaid={turma.id}
  data-slotid={slotId}
  data-dayid={day.id}
  data-period={actualPeriod}

                                          key={turma.id}
                                          style={customStyle}
                                          onClick={() =>
                                            handleSlotClick(
                                              day.id,
                                              actualPeriod,
                                              turma.id,
                                            )
                                          }
                                          onMouseEnter={
                                            slot
                                              ? () =>
                                                  setHoveredTeacherId(
                                                    slot.teacherId,
                                                  )
                                              : undefined
                                          }
                                          onMouseLeave={
                                            slot
                                              ? () => setHoveredTeacherId(null)
                                              : undefined
                                          }
                                          onDragOver={(e) =>
                                            handleDragOver(e, turma.id, slotId)
                                          }
                                          onDragLeave={handleDragLeave}
                                          onDrop={(e) =>
                                            handleDrop(e, turma.id, slotId)
                                          }
                                          className={`focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-[60] focus:relative p-0 px-0.5 border-r border-b border-slate-300 cursor-pointer transition-all group relative select-none ${isDimmed ? "opacity-20 grayscale-[80%] pointer-events-none !bg-slate-200" : ""} ${
                                            isLoading
                                              ? "bg-slate-100"
                                              : draggedOverCell?.turmaId ===
                                                    turma.id &&
                                                  draggedOverCell?.slotId ===
                                                    slotId
                                                ? isDragTargetValid
                                                  ? "bg-blue-100 border-2 border-dashed border-blue-500 scale-[0.98] transition-all duration-100 z-20"
                                                  : "bg-red-200 border-2 border-dashed border-red-500 scale-[0.98] transition-all duration-100 z-20"
                                                : errorCell?.turmaId ===
                                                      turma.id &&
                                                    errorCell?.slotId === slotId
                                                  ? "bg-red-600 border-2 border-red-800 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)] scale-[1.02] z-10"
                                                  : cellBg
                                          }`}
                                        >
                                          {draggedOverCell?.turmaId ===
                                            turma.id &&
                                            draggedOverCell?.slotId ===
                                              slotId &&
                                            !isDragTargetValid &&
                                            dragInvalidReason &&
                                            !isLoading && (
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-[9px] font-bold rounded shadow-xl whitespace-nowrap z-[60] animate-in fade-in zoom-in duration-75 pointer-events-none">
                                                <AlertCircle className="w-3 h-3 text-red-400 inline-block mr-1.5 align-middle" />
                                                <span className="align-middle">
                                                  {dragInvalidReason}
                                                </span>
                                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
                                              </div>
                                            )}
                                          {isLoading ? (
                                            <div className="flex flex-col items-center justify-center space-y-2 w-full h-full opacity-60">
                                              <div className="h-2.5 bg-slate-200 rounded w-16 animate-[pulse_1s_ease-in-out_infinite]"></div>
                                              <div className="h-2 bg-slate-300 rounded w-20 animate-[pulse_1.2s_ease-in-out_infinite_200ms]"></div>
                                            </div>
                                          ) : slot ? (
                                            <div
                                              draggable="true"
                                              onDragStart={(e) =>
                                                handleDragStart(
                                                  e,
                                                  turma.id,
                                                  slotId,
                                                )
                                              }
                                              onDragEnd={handleDragEnd}
                                              className="flex flex-col items-center justify-center text-center overflow-hidden cursor-move w-full h-full select-none"
                                            >
                                              <span
                                                className={`text-[8px] font-black uppercase leading-[1] mb-0 truncate w-full px-0.5 ${errorCell?.turmaId === turma.id && errorCell?.slotId === slotId ? "text-white" : conflicts.length > 0 ? "text-red-600" : viewMode === "rooms" ? "text-indigo-900" : activeSub ? "text-emerald-800" : isGrayDay ? "text-[#000000]" : "text-slate-800"}`}
                                              >
                                                {viewMode === "rooms"
                                                  ? formatSubjectName(
                                                      associatedTurma?.name,
                                                    ) || "N/A"
                                                  : formatSubjectName(
                                                      subject?.name,
                                                    )}
                                              </span>
                                              <div
                                                className={`text-[7px] font-bold uppercase w-full flex flex-col items-center justify-center min-w-0 leading-[1] ${errorCell?.turmaId === turma.id && errorCell?.slotId === slotId ? "text-red-100" : viewMode === "rooms" ? "text-indigo-400" : isGrayDay ? "text-[#2f2f2f]" : "text-slate-500"}`}
                                              >
                                                {activeSub ? (
                                                  <>
                                                    <span className="line-through opacity-70 truncate w-full px-0.5 leading-[1]">
                                                      {formatTeacherName(
                                                        teacher?.name,
                                                      )}
                                                    </span>
                                                    <span className="text-emerald-700 px-1 py-[2px] bg-emerald-100/80 rounded truncate max-w-[95%] text-[7px] mt-0.5 font-black border border-emerald-200 shadow-sm leading-none">
                                                      {formatTeacherName(
                                                        subTeacher?.name,
                                                      ) || "PENDENTE"}
                                                    </span>
                                                  </>
                                                ) : (
                                                  <span className="truncate w-full px-0.5 inline-flex flex-wrap items-center justify-center gap-1">
                                                    <span>
                                                      {formatTeacherName(
                                                        teacher?.name,
                                                      )}{" "}
                                                      {viewMode === "rooms" &&
                                                      subject
                                                        ? `• ${formatSubjectName(subject.name, 10)}`
                                                        : ""}
                                                    </span>
                                                    {viewMode === "turmas" &&
                                                      slot?.associatedRoomId &&
                                                      (() => {
                                                        const assocRoom =
                                                          turmas.find(
                                                            (t) =>
                                                              t.id ===
                                                              slot.associatedRoomId,
                                                          );
                                                        return (
                                                          <span
                                                            className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-indigo-100/80 text-indigo-700 rounded border border-indigo-200"
                                                            title={
                                                              assocRoom?.name
                                                            }
                                                          >
                                                            <span className="text-[7px] font-black">
                                                              {formatRoomBadgeName(
                                                                assocRoom?.name,
                                                              )}
                                                            </span>
                                                            {assocRoom?.icon
                                                              ? getRoomIcon(
                                                                  assocRoom.icon,
                                                                  "w-2.5 h-2.5 text-indigo-700 shrink-0",
                                                                )
                                                              : null}
                                                          </span>
                                                        );
                                                      })()}
                                                    {viewMode === "rooms" &&
                                                      slot?.associatedTurmaId && (
                                                        <span className="inline-block ml-1 px-1 bg-emerald-100 text-emerald-700 rounded text-[7px] font-black border border-emerald-200">
                                                          {turmas.find(
                                                            (t) =>
                                                              t.id ===
                                                              slot.associatedTurmaId,
                                                          )?.name || "TURMA"}
                                                        </span>
                                                      )}
                                                  </span>
                                                )}
                                              </div>
                                              {conflicts.length > 0 &&
                                                !(
                                                  errorCell?.turmaId ===
                                                    turma.id &&
                                                  errorCell?.slotId === slotId
                                                ) &&
                                                !activeSub && (
                                                  <div className="absolute top-0.5 right-0.5">
                                                    <AlertCircle className="w-2.5 h-2.5 text-red-500 fill-white" />
                                                  </div>
                                                )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newSchedules =
                                                    JSON.parse(
                                                      JSON.stringify(schedules),
                                                    );
                                                  if (
                                                    newSchedules[turma.id] &&
                                                    newSchedules[turma.id][
                                                      slotId
                                                    ]
                                                  ) {
                                                    newSchedules[turma.id][
                                                      slotId
                                                    ].isFixed =
                                                      !newSchedules[turma.id][
                                                        slotId
                                                      ].isFixed;
                                                    setSchedules(newSchedules);
                                                    setIsSaved(false);
                                                  }
                                                }}
                                                className={`absolute top-0.5 left-0.5 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${slot.isFixed ? "opacity-100 text-slate-700 bg-slate-200 hover:bg-slate-300" : "text-slate-300 hover:text-slate-600 hover:bg-slate-100"}`}
                                                title={
                                                  slot.isFixed
                                                    ? "Desbloquear aula (permitir que seja movida na geração automática)"
                                                    : "Travar aula (impedir que seja movida na geração automática)"
                                                }
                                              >
                                                <Lock className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Plus className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                          )}
                                        </td>
  );
});
