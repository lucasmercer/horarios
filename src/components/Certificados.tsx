import React, { useState, useEffect, useRef } from 'react';
import { generateCertificate, renderPdfToCanvas, type CertificateData, formatName, BASE_TEMPLATES } from '../lib/pdf-utils';
import { 
  FileText, Download, Eye, Users, Calendar, Type, Loader2, ImagePlus, LogOut, 
  Sliders, Library, Layout, Check, Sparkles, Trash2, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_DESCRIPTION = "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Menção Honrosa,\nem reconhecimento às boas práticas, atitudes exemplares e\ndedicação demonstradas ao longo do trimestre.";

const MENSAGENS_PRESETS = [
  {
    id: "padrao",
    titulo: "🎖️ Geral CECM (Padrão)",
    texto: "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Menção Honrosa,\nem reconhecimento às boas práticas, atitudes exemplares e\ndedicação demonstradas ao longo do trimestre."
  },
  {
    id: "desempenho",
    titulo: "📚 Desempenho Excelente",
    texto: "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Menção Honrosa\nem reconhecimento ao extraordinário desempenho acadêmico, comprometimento\ncom os estudos e alcance de excelentes médias neste trimestre letivo."
  },
  {
    id: "conduta",
    titulo: "💂 Disciplina e Cívico-Militar",
    texto: "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Destaque Cívico-Militar\nem homenagem às atitudes exemplares de respeito, garbo, pontualidade\ne excelente comportamento disciplinar demonstrados ao longo do trimestre."
  },
  {
    id: "assiduidade",
    titulo: "⏱️ Frequência Integral (100%)",
    texto: "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Aluno Assíduo\nem reconhecimento à frequência escolar de 100% registrada nas aulas,\ndemonstrando pleno compromisso com o seu desenvolvimento letivo."
  },
  {
    id: "esportes",
    titulo: "🏅 Mérito Esportivo",
    texto: "A Direção do Colégio Estadual Cívico-Militar Gregório Szeremeta\nconfere ao estudante o presente certificado de Mérito Esportivo\nem reconhecimento à dedicação, excelente espírito esportivo e superação\ndemonstrados nos jogos escolares representados pela nossa instituição."
  }
];

type PdfTemplate = string;

function CertificatePreview({ pdfBytes, template }: { pdfBytes: Uint8Array | null, template: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (pdfBytes) {
      const render = async () => {
        // Wait for canvas to be in DOM
        for (let i = 0; i < 20; i++) {
          if (canvasRef.current || !isMounted) break;
          await new Promise(r => setTimeout(r, 50));
        }

        if (canvasRef.current && isMounted) {
          setIsRendering(true);
          await renderPdfToCanvas(pdfBytes, canvasRef.current);
          if (isMounted) setIsRendering(false);
        }
      };
      render();
    }
    return () => { isMounted = false; };
  }, [pdfBytes]);

  if (!pdfBytes) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div className="relative group/canvas max-w-full max-h-full">
        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-lg blur-xl opacity-0 group-hover/canvas:opacity-100 transition-opacity" />
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-full rounded shadow-2xl border border-slate-200 bg-white mx-auto transition-transform duration-300" 
        />
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}
      </div>
      <div className="mt-4 lg:mt-6 flex flex-wrap justify-center items-center gap-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-150 italic text-[9px] lg:text-[11px] text-slate-400 font-medium tracking-wide">
        <span>PRÉ-VISUALIZAÇÃO DE ALTA QUALIDADE (A4)</span>
        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
        <span className="uppercase">MODELO ATIVO: {template}</span>
      </div>
    </div>
  );
}

const getStudentNames = (namesStr: string): string[] => {
  return namesStr
    .split(/[,\n]/)
    .map(n => n.trim())
    .filter(n => n !== "");
};

// Custom Fine Tuning Component
function PreciseAdjuster({ 
  label, 
  value, 
  onChange, 
  min = -400, 
  max = 400 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void; 
  min?: number; 
  max?: number; 
}) {
  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="flex justify-between items-center text-[10px]">
        <span className="font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={value} 
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) onChange(val);
            }} 
            className="w-12 text-center bg-white border border-slate-200 rounded py-0.5 text-[10px] font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-300"
          />
          <button 
            type="button" 
            onClick={() => onChange(0)}
            className="text-[9px] text-slate-400 font-bold hover:text-blue-500 hover:underline uppercase tracking-tight"
          >
            Zerar
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          type="button" 
          onClick={() => onChange(Math.max(min, value - 10))}
          className="px-1.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[9px] font-extrabold text-slate-600 select-none active:bg-slate-50 shrink-0"
        >
          -10
        </button>
        <button 
          type="button" 
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-1.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[9px] font-extrabold text-slate-600 select-none active:bg-slate-50 shrink-0"
        >
          -1
        </button>
        <input 
          type="range" min={min} max={max} value={value} 
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <button 
          type="button" 
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-1.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[9px] font-extrabold text-slate-600 select-none active:bg-slate-50 shrink-0"
        >
          +1
        </button>
        <button 
          type="button" 
          onClick={() => onChange(Math.min(max, value + 10))}
          className="px-1.5 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded text-[9px] font-extrabold text-slate-600 select-none active:bg-slate-50 shrink-0"
        >
          +10
        </button>
      </div>
    </div>
  );
}

function ElementPositioner({
  title,
  xValue,
  onXChange,
  yValue,
  onYChange,
  minX = -400,
  maxX = 400,
  minY = -400,
  maxY = 400,
  fontSizeValue,
  onFontSizeChange,
}: {
  title: string;
  xValue: number;
  onXChange: (val: number) => void;
  yValue: number;
  onYChange: (val: number) => void;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  fontSizeValue?: string;
  onFontSizeChange?: (val: string) => void;
}) {
  return (
    <div className="space-y-2.5 p-3.5 rounded-xl border border-slate-150/70 bg-gradient-to-br from-slate-50 to-slate-50/50">
      <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1.5">
        <span className="font-extrabold text-slate-600 uppercase tracking-wide">{title}</span>
        <div className="flex gap-2">
          {onFontSizeChange && fontSizeValue && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Tamanho:</span>
              <input 
                type="number" 
                value={fontSizeValue} 
                onChange={(e) => onFontSizeChange(e.target.value)}
                className="w-10 text-center bg-white border border-slate-200 rounded py-0.5 text-[9px] font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-300"
              />
            </div>
          )}
          <button 
            type="button" 
            onClick={() => { onXChange(0); onYChange(0); }}
            className="text-[9px] text-slate-400 font-bold hover:text-blue-500 hover:underline uppercase tracking-tight"
          >
            Resetar [0, 0]
          </button>
        </div>
      </div>
      
      <div className="flex gap-4 items-center">
        {/* Vertical Axis Control Slider */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-0.5">
            Vertical Y
          </span>
          <div className="relative flex flex-col items-center justify-between h-28 w-12 bg-white border border-slate-200 rounded-lg shadow-sm py-1.5 px-1">
            {/* Top Label */}
            <span className="text-[8px] font-black text-emerald-600 select-none cursor-default leading-none">▲ CIMA</span>
            
            {/* Range slider rotated -90deg.
                Under this rotation, dragging UP naturally moves the thumb towards max (positive) and dragging DOWN maps to min (negative). 
                We bind directly to yValue and onYChange to keep slide, input and text movement perfectly aligned. */}
            <div className="relative h-14 w-6 flex items-center justify-center">
              <input 
                type="range" 
                min={minY} 
                max={maxY} 
                value={yValue} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onYChange(val);
                }}
                style={{
                  transform: 'rotate(-90deg)',
                  width: '60px',
                  outline: 'none',
                }}
                className="cursor-pointer accent-blue-600 bg-slate-100 rounded"
              />
            </div>

            {/* Bottom Label */}
            <span className="text-[8px] font-black text-rose-500 select-none cursor-default leading-none">▼ BAIXO</span>
          </div>
          
          {/* Numerical Input + Fine Trim Button Combo */}
          <div className="flex flex-col items-center gap-1 mt-1">
            <input 
              type="number" 
              value={yValue} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) onYChange(val);
              }} 
              className="w-12 text-center bg-white border border-slate-250 rounded py-0.5 text-[9px] font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-300"
            />
            <div className="flex gap-1">
              <button 
                type="button" 
                onClick={() => onYChange(Math.max(minY, yValue - 5))}
                className="px-1 text-[8px] font-extrabold bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 select-none cursor-pointer"
                title="Mover 5 unidades para baixo"
              >
                -5
              </button>
              <button 
                type="button" 
                onClick={() => onYChange(Math.min(maxY, yValue + 5))}
                className="px-1 text-[8px] font-extrabold bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 select-none cursor-pointer"
                title="Mover 5 unidades para cima"
              >
                +5
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Axis Control Slider */}
        <div className="flex-1 flex flex-col gap-1.5 justify-center py-2">
          <div>
            <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">
              <span>Horizontal (X)</span>
              <span className="text-blue-600 font-mono text-[9px]">{xValue > 0 ? `+${xValue} (Direita)` : xValue < 0 ? `${xValue} (Esquerda)` : "Centralizado"}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
              <span className="text-[8px] font-bold text-rose-500 font-sans shrink-0 select-none">◀ ESQ</span>
              <input 
                type="range" 
                min={minX} 
                max={maxX} 
                value={xValue} 
                onChange={(e) => onXChange(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-100 rounded-lg cursor-pointer accent-blue-600"
              />
              <span className="text-[8px] font-bold text-emerald-600 font-sans shrink-0 select-none">DIR ▶</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex gap-1">
              <button 
                type="button" 
                onClick={() => onXChange(Math.max(minX, xValue - 5))}
                className="px-2 py-0.5 text-[8px] font-extrabold bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 select-none cursor-pointer"
                title="Mover 5 unidades para a esquerda"
              >
                -5
              </button>
              <button 
                type="button" 
                onClick={() => onXChange(Math.min(maxX, xValue + 5))}
                className="px-2 py-0.5 text-[8px] font-extrabold bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 select-none cursor-pointer"
                title="Mover 5 unidades para a direita"
              >
                +5
              </button>
            </div>
            <input 
              type="number" 
              value={xValue} 
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) onXChange(val);
              }} 
              className="w-12 text-center bg-white border border-slate-250 rounded py-0.5 text-[9px] font-mono text-blue-600 font-bold focus:outline-none focus:border-blue-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Certificados() {
  const [names, setNames] = useState("Lucas Mercer Leniar, Pedro Albuquerque, Ana Carolina Silva");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalText, setAdditionalText] = useState(DEFAULT_DESCRIPTION);
  const [fontSize, setFontSize] = useState("44");
  const [template, setTemplate] = useState<PdfTemplate>('template1');
  const [templatePdfBytes, setTemplatePdfBytes] = useState<Uint8Array | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'appearance' | 'layout'>('content');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);
  
  // Custom Positioning State
  const [yOffsetName, setYOffsetName] = useState(10);
  const [xOffsetName, setXOffsetName] = useState(0);
  const [yOffsetDescription, setYOffsetDescription] = useState(-25);
  const [xOffsetDescription, setXOffsetDescription] = useState(0);
  const [yOffsetSignatures, setYOffsetSignatures] = useState(-120);
  const [xOffsetSignatures, setXOffsetSignatures] = useState(0);
  const [yOffsetDate, setYOffsetDate] = useState(-170);
  const [xOffsetDate, setXOffsetDate] = useState(0);
  
  // Font Sizes Additional
  const [fontSizeDescription, setFontSizeDescription] = useState("18");
  const [fontSizeSignatures, setFontSizeSignatures] = useState("10");
  const [fontSizeDate, setFontSizeDate] = useState("12");

  const [showDateOnCertificate, setShowDateOnCertificate] = useState(true);
  const [showSystemElements, setShowSystemElements] = useState(false); // Template 1 default preset starts hidden
  const [numSignatures, setNumSignatures] = useState(1); // Template 1 default preset is 1 signature

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Logo State
  const [logoBytes, setLogoBytes] = useState<Uint8Array | null>(null);
  const [logoX, setLogoX] = useState(0);
  const [logoY, setLogoY] = useState(0);
  const [logoScale, setLogoScale] = useState(0.5);

  // Font Selections
  const [fontName, setFontName] = useState('Helvetica-Bold');
  const [fontDescription, setFontDescription] = useState('Times-Italic');
  const [fontFooter, setFontFooter] = useState('Helvetica');

  // Load custom saved preset or factory defaults for template selection
  const selectTemplate = (id: PdfTemplate) => {
    setTemplate(id);
    if (id === 'custom') {
      setShowSystemElements(false);
      setYOffsetDate(-150);
      setXOffsetDate(0);
      setShowDateOnCertificate(true);
      setNumSignatures(1);
      return;
    }

    // Attempt to load from custom saved preset in localStorage
    const savedPresetStr = localStorage.getItem(`preset_template_${id}`);
    if (savedPresetStr) {
      try {
        const preset = JSON.parse(savedPresetStr);
        setYOffsetName(preset.yOffsetName ?? 0);
        setXOffsetName(preset.xOffsetName ?? 0);
        setFontSize(String(preset.fontSize ?? 44));
        setYOffsetDescription(preset.yOffsetDescription ?? 0);
        setXOffsetDescription(preset.xOffsetDescription ?? 0);
        setFontSizeDescription(String(preset.fontSizeDescription ?? 18));
        setYOffsetSignatures(preset.yOffsetSignatures ?? 0);
        setXOffsetSignatures(preset.xOffsetSignatures ?? 0);
        setFontSizeSignatures(String(preset.fontSizeSignatures ?? 10));
        setYOffsetDate(preset.yOffsetDate ?? (preset.yOffsetSignatures ?? -120) - 50);
        setXOffsetDate(preset.xOffsetDate ?? preset.xOffsetSignatures ?? 0);
        setFontSizeDate(String(preset.fontSizeDate ?? 12));
        setFontName(preset.fontName ?? 'Helvetica-Bold');
        setFontDescription(preset.fontDescription ?? 'Times-Italic');
        setFontFooter(preset.fontFooter ?? 'Helvetica');
        setShowSystemElements(preset.showSystemElements !== false);
        setNumSignatures(preset.numSignatures ?? 2);
        setShowDateOnCertificate(preset.showDateOnCertificate !== false);
        return;
      } catch (e) {
        console.error("Failed to parse custom preset for template", id, e);
      }
    }

    // Default factory preset configuration
    const config = (BASE_TEMPLATES as any)[id];
    if (config && config.defaultOffsets) {
      const defs = config.defaultOffsets;
      setYOffsetName(defs.yOffsetName ?? 0);
      setXOffsetName(defs.xOffsetName ?? 0);
      setFontSize(String(defs.fontSize ?? 44));
      setYOffsetDescription(defs.yOffsetDescription ?? 0);
      setXOffsetDescription(defs.xOffsetDescription ?? 0);
      setFontSizeDescription("18"); // fallback 18
      setYOffsetSignatures(defs.yOffsetSignatures ?? 0);
      setXOffsetSignatures(defs.xOffsetSignatures ?? 0);
      setFontSizeSignatures("10"); // fallback 10
      setYOffsetDate(defs.yOffsetDate ?? ((defs.yOffsetSignatures ?? -120) - 50));
      setXOffsetDate(defs.xOffsetDate ?? 0);
      setFontSizeDate("12"); // fallback 12
      setFontName(defs.fontName ?? 'Helvetica-Bold');
      setFontDescription(defs.fontDescription ?? 'Times-Italic');
      setFontFooter(defs.fontFooter ?? 'Helvetica');
      setShowSystemElements(defs.showSystemElements !== false);
      setNumSignatures(defs.numSignatures ?? 2);
      setShowDateOnCertificate(true);
    }
  };

  const saveCurrentAsPreset = () => {
    const preset = {
      yOffsetName,
      xOffsetName,
      fontSize: parseInt(fontSize) || 44,
      yOffsetDescription,
      xOffsetDescription,
      fontSizeDescription: parseInt(fontSizeDescription) || 18,
      yOffsetSignatures,
      xOffsetSignatures,
      fontSizeSignatures: parseInt(fontSizeSignatures) || 10,
      yOffsetDate,
      xOffsetDate,
      fontSizeDate: parseInt(fontSizeDate) || 12,
      showDateOnCertificate,
      showSystemElements,
      numSignatures,
      fontName,
      fontDescription,
      fontFooter
    };
    try {
      localStorage.setItem(`preset_template_${template}`, JSON.stringify(preset));
      alert("Sucesso!\nPreset de posicionamento e alinhamento salvo para este modelo.");
    } catch (e) {
      console.error(e);
    }
  };

  const clearCurrentPreset = () => {
    try {
      localStorage.removeItem(`preset_template_${template}`);
      selectTemplate(template);
      alert("Fábrica!\nPreset removido. Retornou às coordenadas padrão oficiais do modelo.");
    } catch (e) {
      console.error(e);
    }
  };

  // Load saving preset on startup for default template (template1)
  useEffect(() => {
    const savedPresetStr = localStorage.getItem(`preset_template_template1`);
    if (savedPresetStr) {
      try {
        const preset = JSON.parse(savedPresetStr);
        setYOffsetName(preset.yOffsetName ?? 10);
        setXOffsetName(preset.xOffsetName ?? 0);
        setFontSize(String(preset.fontSize ?? 44));
        setYOffsetDescription(preset.yOffsetDescription ?? -25);
        setXOffsetDescription(preset.xOffsetDescription ?? 0);
        setFontSizeDescription(String(preset.fontSizeDescription ?? 18));
        setYOffsetSignatures(preset.yOffsetSignatures ?? -120);
        setXOffsetSignatures(preset.xOffsetSignatures ?? 0);
        setFontSizeSignatures(String(preset.fontSizeSignatures ?? 10));
        setYOffsetDate(preset.yOffsetDate ?? (preset.yOffsetSignatures ?? -120) - 50);
        setXOffsetDate(preset.xOffsetDate ?? preset.xOffsetSignatures ?? 0);
        setFontSizeDate(String(preset.fontSizeDate ?? 12));
        setFontName(preset.fontName ?? 'Helvetica-Bold');
        setFontDescription(preset.fontDescription ?? 'Times-Italic');
        setFontFooter(preset.fontFooter ?? 'Helvetica');
        setShowSystemElements(preset.showSystemElements !== false);
        setNumSignatures(preset.numSignatures ?? 1);
        setShowDateOnCertificate(preset.showDateOnCertificate !== false);
      } catch (e) {
        console.error("Failed to parse template1 preset on init", e);
      }
    }
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRenderingCanvas, setIsRenderingCanvas] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);
  
  // Clean cache and session variables upon launching login screen
  useEffect(() => {
    
  }, [isAuthenticated]);

  // Dynamic automatic previewer (with 350ms debounce)
  useEffect(() => {
    if (!isAuthenticated || !names.trim() || !autoUpdate) return;

    const timer = setTimeout(() => {
      const triggerPreview = async () => {
        const studentNames = getStudentNames(names);
        if (studentNames.length === 0) return;

        // Ensure current preview index stays bounded
        const index = Math.min(previewStudentIndex, studentNames.length - 1);
        const selectedStudentName = studentNames[index] || studentNames[0] || "";
        
        setIsRenderingCanvas(true);
        const studentData: CertificateData = {
          name: formatName(selectedStudentName),
          date,
          additionalText,
          fontSize: parseInt(fontSize) || 48,
          template,
          templatePdfBytes,
          yOffsetName,
          xOffsetName,
          yOffsetDescription,
          xOffsetDescription,
          fontSizeDescription: parseInt(fontSizeDescription) || 18,
          yOffsetSignatures,
          xOffsetSignatures,
          fontSizeSignatures: parseInt(fontSizeSignatures) || 10,
          yOffsetDate,
          xOffsetDate,
          fontSizeDate: parseInt(fontSizeDate) || 12,
          showDateOnCertificate,
          showSystemElements,
          numSignatures,
          fontName,
          fontDescription,
          fontFooter,
          logoBytes,
          logoX,
          logoY,
          logoScale
        };

        try {
          const pdfBytes = await generateCertificate(studentData);
          setPreviewPdfBytes(pdfBytes);
        } catch (error) {
          console.error("Auto-render painting failed:", error);
        } finally {
          setIsRenderingCanvas(false);
        }
      };

      triggerPreview();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    names,
    previewStudentIndex,
    date,
    additionalText,
    fontSize,
    fontSizeDescription,
    fontSizeSignatures,
    fontSizeDate,
    template,
    templatePdfBytes,
    yOffsetName,
    xOffsetName,
    yOffsetDescription,
    xOffsetDescription,
    yOffsetSignatures,
    xOffsetSignatures,
    yOffsetDate,
    xOffsetDate,
    showDateOnCertificate,
    showSystemElements,
    numSignatures,
    fontName,
    fontDescription,
    fontFooter,
    logoBytes,
    logoX,
    logoY,
    logoScale,
    autoUpdate,
    isAuthenticated
  ]);

  // Manual render trigger fallback
  const handlePreview = async () => {
    if (!names.trim()) {
      alert("Por favor, preencha o campo 'Lista de Alunos'.");
      return;
    }
    setIsPreviewing(true);
    const studentNames = getStudentNames(names);
    const index = Math.min(previewStudentIndex, studentNames.length - 1);
    const selectedStudent = studentNames[index] || studentNames[0] || "";

    const studentData: CertificateData = {
      name: formatName(selectedStudent),
      date,
      additionalText,
      fontSize: parseInt(fontSize) || 48,
      template,
      templatePdfBytes,
      yOffsetName,
      xOffsetName,
      yOffsetDescription,
      xOffsetDescription,
      fontSizeDescription: parseInt(fontSizeDescription) || 18,
      yOffsetSignatures,
      xOffsetSignatures,
      fontSizeSignatures: parseInt(fontSizeSignatures) || 10,
      yOffsetDate,
      xOffsetDate,
      fontSizeDate: parseInt(fontSizeDate) || 12,
      showDateOnCertificate,
      showSystemElements,
      numSignatures,
      fontName,
      fontDescription,
      fontFooter,
      logoBytes,
      logoX,
      logoY,
      logoScale
    };

    try {
      const pdfBytes = await generateCertificate(studentData);
      setPreviewPdfBytes(pdfBytes);
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadAll = async () => {
    const studentNames = getStudentNames(names);
    if (studentNames.length === 0) {
      alert("Por favor, insira ao menos um nome.");
      return;
    }

    setIsDownloading(true);
    try {
      for (const student of studentNames) {
        const capitalizedName = formatName(student);

        const studentData: CertificateData = {
          name: capitalizedName,
          date,
          additionalText,
          fontSize: parseInt(fontSize) || 48,
          template,
          templatePdfBytes,
          yOffsetName,
          xOffsetName,
          yOffsetDescription,
          xOffsetDescription,
          fontSizeDescription: parseInt(fontSizeDescription) || 18,
          yOffsetSignatures,
          xOffsetSignatures,
          fontSizeSignatures: parseInt(fontSizeSignatures) || 10,
          yOffsetDate,
          xOffsetDate,
          fontSizeDate: parseInt(fontSizeDate) || 12,
          showDateOnCertificate,
          showSystemElements,
          numSignatures,
          fontName,
          fontDescription,
          fontFooter,
          logoBytes,
          logoX,
          logoY,
          logoScale
        };

        const pdfBytes = await generateCertificate(studentData);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const fileName = `certificado_${capitalizedName.replace(/\s+/g, "_")}.pdf`;
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const bytes = new Uint8Array(event.target?.result as ArrayBuffer);
        setTemplatePdfBytes(bytes);
        setTemplateFileName(file.name);
        setTemplate('custom');
        setShowSystemElements(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const allStudents = getStudentNames(names);
  const studentCount = allStudents.length;
  const hasDuplicates = new Set(allStudents.map(n => formatName(n))).size !== allStudents.length;

  // Utility actions for student names
  const cleanUpNamesList = () => {
    setNames("");
    setPreviewStudentIndex(0);
  };

  const capitalizeNamesList = () => {
    if (allStudents.length === 0) return;
    const capitalized = allStudents.map(n => formatName(n)).join(', ');
    setNames(capitalized);
  };

  const removeDuplicateNames = () => {
    if (allStudents.length === 0) return;
    const uniques = Array.from(new Set(allStudents.map(n => formatName(n))));
    setNames(uniques.join(', '));
  };

  const loadSampleNames = () => {
    setNames("Lucas Mercer Leniar, Ana Carolina Silva, Pedro Albuquerque, Maria Eduarda de Souza, Roberto de Oliveira");
    setPreviewStudentIndex(0);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6 border border-slate-100"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-xl mb-2">
              <Users size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-center">Certificados CECM</h1>
            <p className="text-slate-500 text-sm font-medium text-center">Colégio Estadual Cívico-Militar Gregório Szeremeta</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (password.toLowerCase().trim() === 'ccm2024') {
                setIsAuthenticated(true);
              } else {
                setLoginError(true);
                setTimeout(() => setLoginError(false), 2000);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de Acesso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso..."
                className={cn(
                  "w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none transition-all",
                  loginError ? "border-red-500 animate-shake" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50"
                )}
                autoFocus
              />
              {loginError && (
                <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Senha incorreta</p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              ACESSAR PORTAL
            </button>
          </form>

          <div className="text-center space-y-1 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
              Reserva - PR // Brasil
            </p>
            <p className="text-[9px] text-slate-600 uppercase font-bold">
              Desenvolvido por Prof. Lucas Mercer Leniar
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Header Banner */}
      <header className="h-16 border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between bg-white shrink-0 sticky top-0 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs lg:text-sm font-black tracking-tight text-slate-900 leading-none">
                GERADOR DE CERTIFICADOS
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-extrabold uppercase rounded border border-blue-100">
                PRO v2.0
              </span>
            </div>
            <p className="text-[8px] lg:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              CECM Gregório Szeremeta
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Sincronização</span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Automático ativo
            </span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Status:
            </span>
            <span className={cn(
              "text-[8px] lg:text-[10px] px-2 py-1 font-extrabold rounded-full uppercase tracking-wider",
              isDownloading 
                ? "bg-amber-100 text-amber-800 animate-pulse" 
                : isPreviewing || isRenderingCanvas 
                  ? "bg-blue-100 text-blue-800 spin-loader animate-pulse" 
                  : "bg-emerald-100 text-emerald-800"
            )}>
              {isDownloading ? "Gerando Lote..." : isPreviewing || isRenderingCanvas ? "Pintando..." : "Pronto"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto">
        {/* Expanded Navigation Dashboard Sidebar (Tabbed layout) */}
        <aside className="w-full lg:w-[440px] border-r border-slate-200 bg-white flex flex-col lg:overflow-hidden shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.015)] z-20">
          
          {/* Quick Base Templates Row to download if needed */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Templates Originais (PDF)</span>
            <div className="flex flex-wrap gap-1">
              {[
                { name: 'T1', href: 'https://lucasmercer.github.io/certificado/template.pdf', t: 'Padrão' },
                { name: 'T2', href: 'https://lucasmercer.github.io/certificado/template4.pdf', t: 'Paraná' },
                { name: 'T3', href: 'https://lucasmercer.github.io/certificado/template2.pdf', t: 'Azul' },
                { name: 'T4', href: 'https://lucasmercer.github.io/certificado/template6%20(1).pdf', t: 'Esp6' },
                { name: 'T5', href: 'https://lucasmercer.github.io/certificado/template7%20(1).pdf', t: 'Esp7' }
              ].map((m, idx) => (
                <a
                  key={idx}
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 bg-white border border-slate-200 hover:border-blue-300 rounded text-[9px] font-bold text-slate-600 hover:text-blue-600 transition-colors"
                  title={`Baixar PDF original do Modelo ${m.t}`}
                >
                  {m.name}
                </a>
              ))}
            </div>
          </div>

          {/* Graphical Tabs Selection */}
          <div className="grid grid-cols-3 border-b border-slate-200 divide-x divide-slate-150 text-center select-none bg-slate-50/20 shrink-0">
            <button
              onClick={() => setActiveTab('content')}
              className={cn(
                "py-3.5 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative",
                activeTab === 'content' 
                  ? "bg-white text-blue-600" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/40"
              )}
            >
              <FileText size={15} className={activeTab === 'content' ? "text-blue-600" : "text-slate-400" } />
              <span>1. Conteúdo</span>
              {activeTab === 'content' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in duration-300" />}
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={cn(
                "py-3.5 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative",
                activeTab === 'appearance' 
                  ? "bg-white text-blue-600" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/40"
              )}
            >
              <Library size={15} className={activeTab === 'appearance' ? "text-blue-600" : "text-slate-400" } />
              <span>2. Modelo</span>
              {activeTab === 'appearance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in duration-300" />}
            </button>
            <button
              onClick={() => setActiveTab('layout')}
              className={cn(
                "py-3.5 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all relative",
                activeTab === 'layout' 
                  ? "bg-white text-blue-600" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/40"
              )}
            >
              <Layout size={15} className={activeTab === 'layout' ? "text-blue-600" : "text-slate-400" } />
              <span>3. Alinhamento</span>
              {activeTab === 'layout' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in duration-300" />}
            </button>
          </div>

          {/* Tab Contents Viewport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* TAB 1: CONTENT & NAMES */}
            {activeTab === 'content' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-5"
              >
                {/* Auto Update / Live Mode Status Banner */}
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <div className="text-[10px] text-emerald-800 leading-none">
                      <strong>Prévia Dinâmica Ativa:</strong> As alterações refletem sozinhas na tela.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={autoUpdate}
                      onChange={(e) => setAutoUpdate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* List of Students Text Area */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                      Lista de Alunos ({studentCount})
                    </label>
                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                      Vírgula ou Linha
                    </span>
                  </div>
                  <textarea
                    value={names}
                    onChange={(e) => setNames(e.target.value)}
                    placeholder="Ex: Lucas Mercer Leniar, Maria Albuquerque da Silva, Roberto de Souza..."
                    className="w-full h-36 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-xs text-slate-800 placeholder:text-slate-400 font-medium leading-relaxed hover:border-slate-300"
                  />
                  
                  {/* BULK ACTIONS ROW */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={capitalizeNamesList}
                        disabled={studentCount === 0}
                        className="px-2 py-1 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 active:bg-slate-50 text-[9px] font-bold rounded-lg transition-all text-slate-500 uppercase cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                        title="Corrige maiúsculas e minúsculas mantendo preposições certas"
                      >
                        ✨ Formatar tudo
                      </button>
                      <button
                        type="button"
                        onClick={removeDuplicateNames}
                        disabled={studentCount === 0 || !hasDuplicates}
                        className={cn(
                          "px-2 py-1 bg-white border text-[9px] font-bold rounded-lg transition-all uppercase cursor-pointer disabled:opacity-40 disabled:pointer-events-none",
                          hasDuplicates 
                            ? "border-red-300 text-red-600 hover:bg-red-50" 
                            : "border-slate-200 text-slate-500"
                        )}
                        title="Remove duplicados e corrige espaços"
                      >
                        🔄 Sem Duplicidades
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={loadSampleNames}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9px] font-bold rounded-lg transition-all uppercase cursor-pointer"
                        title="Carregar nomes para teste rápido"
                      >
                        Exemplos
                      </button>
                      <button
                        type="button"
                        onClick={cleanUpNamesList}
                        disabled={studentCount === 0}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        title="Limpar campo de alunos"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Date of Issue Inputs */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Data de Emissão
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setDate(new Date().toISOString().split('T')[0])}
                      className="text-[9px] font-bold text-blue-600 hover:underline uppercase"
                    >
                      Redefinir p/ Hoje
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-700 hover:border-slate-300"
                    />
                    <Calendar size={14} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Pre-made Certificate Message presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                      Modelos de Mensagem Prontos
                    </label>
                    <span className="text-[8px] text-slate-400 font-sans tracking-wide">CONFIRA PRESET DE TEXTO</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {MENSAGENS_PRESETS.map((p) => {
                      const isActive = additionalText === p.texto;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setAdditionalText(p.texto)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-xl border text-[10px] font-medium transition-all flex items-center justify-between",
                            isActive 
                              ? "bg-blue-50/50 border-blue-400 text-blue-800 shadow-sm" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="font-bold">{p.titulo}</span>
                          {isActive && <CheckSquare size={12} className="text-blue-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Message Editor */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Mensagem do Certificado (Texto Livre)
                  </label>
                  <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    rows={4}
                    placeholder="Edite livremente o corpo do certificado..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-700 leading-relaxed font-medium hover:border-slate-300"
                  />
                  <p className="text-[9px] text-slate-400 italic">
                    Dica: Use quebras de linha (`Enter`) para separar parágrafos de forma equilibrada no PDF.
                  </p>
                </div>
              </motion.div>
            )}

            {/* TAB 2: TEMPLATE SELECT & FONTS */}
            {activeTab === 'appearance' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-5"
              >
                {/* Background File Upload */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    Subir Próprio Gabarito PDF
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-blue-300 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center justify-center py-2 px-4 text-center">
                      <ImagePlus size={16} className="text-slate-400 group-hover:text-blue-500 mb-1" />
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">
                        {templateFileName ? (
                          <span className="text-blue-600 truncate max-w-[280px] block">{templateFileName}</span>
                        ) : (
                          <span>Carregar PDF de Fundo Personalizado</span>
                        )}
                      </p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleTemplateUpload} />
                  </label>
                </div>

                {/* Template Cards list */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                      Gabaritos Oficiais da Escola
                    </label>
                    <button
                      type="button"
                      onClick={() => selectTemplate(template)}
                      className="text-[9px] text-blue-600 font-bold hover:underline uppercase"
                      title="Reinicia coordenadas originais do modelo atual"
                    >
                      Resetar Coordenadas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(BASE_TEMPLATES).map((t: any) => {
                      const isSelected = template === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => selectTemplate(t.id)}
                          className={cn(
                            "flex flex-col p-3 rounded-xl border text-left transition-all relative overflow-hidden group w-full",
                            isSelected 
                              ? "bg-blue-50/70 border-blue-500 text-slate-800 ring-2 ring-blue-500/10 shadow-sm" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-1 gap-2">
                            <span className={cn(
                              "text-[10px] font-extrabold uppercase tracking-wider font-sans truncate",
                              isSelected ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600"
                            )}>
                              {t.name}
                            </span>
                            {isSelected ? (
                              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-extrabold rounded-full uppercase tracking-wider shrink-0">
                                Selecionado
                              </span>
                            ) : (
                              <div className="flex gap-1 shrink-0">
                                {t.colors.map((c, i) => (
                                  <div key={i} className="w-1.5 h-1.5 rounded-full border border-slate-200" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] text-slate-400 font-normal leading-normal mb-1.5">
                            {t.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 pt-1.5 border-t border-dashed border-slate-100 text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                            <span>FONTE: {t.defaultOffsets.fontName.split('-')[0]}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span>TAM: {t.defaultOffsets.fontSize}px</span>
                          </div>
                        </button>
                      );
                    })}

                    {templatePdfBytes && (
                      <button
                        type="button"
                        onClick={() => selectTemplate('custom')}
                        className={cn(
                          "flex flex-col p-3 rounded-xl border text-left transition-all relative overflow-hidden w-full",
                          template === 'custom' 
                            ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/10 shadow-sm" 
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            ✨ PDF PERSONALIZADO INTERNO
                          </span>
                          {template === 'custom' && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-extrabold rounded-full uppercase tracking-wider">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono truncate max-w-[250px]">
                          Arquivo: {templateFileName}
                        </p>
                      </button>
                    )}
                  </div>

                </div>

                {/* Font Selections & Families */}
                <div className="space-y-3 bg-slate-50/20 p-3.5 border border-slate-100 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Famílias Tipográficas</span>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="flex items-center justify-between gap-3 bg-white border border-slate-150 p-2 rounded-lg">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase shrink-0">1. Aluno</label>
                      <select 
                        value={fontName} 
                        onChange={(e) => setFontName(e.target.value)}
                        className="bg-transparent text-[10px] rounded px-1 w-full focus:outline-none font-bold text-slate-700 text-right cursor-pointer"
                      >
                        <option value="Helvetica-Bold">Helvetica Bold (Clássica)</option>
                        <option value="Helvetica">Helvetica Reg</option>
                        <option value="Times-Bold">Times Bold (Solene)</option>
                        <option value="Times-Roman">Times Classical</option>
                        <option value="Courier">Courier (Etiqueta)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-white border border-slate-150 p-2 rounded-lg">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase shrink-0">2. Mensagem</label>
                      <select 
                        value={fontDescription} 
                        onChange={(e) => setFontDescription(e.target.value)}
                        className="bg-transparent text-[10px] rounded px-1 w-full focus:outline-none font-bold text-slate-700 text-right cursor-pointer"
                      >
                        <option value="Times-Italic">Times Italic (Elegante)</option>
                        <option value="Times-Roman">Times Serif Normal</option>
                        <option value="Helvetica">Helvetica Normal</option>
                        <option value="Courier">Courier Mono</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-white border border-slate-150 p-2 rounded-lg">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase shrink-0">3. Assinatura</label>
                      <select 
                        value={fontFooter} 
                        onChange={(e) => setFontFooter(e.target.value)}
                        className="bg-transparent text-[10px] rounded px-1 w-full focus:outline-none font-bold text-slate-700 text-right cursor-pointer"
                      >
                        <option value="Helvetica">Helvetica Sans</option>
                        <option value="Helvetica-Bold">Helvetica Bold</option>
                        <option value="Times-Roman">Times Serife</option>
                        <option value="Courier">Courier Monospace</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checkbox show system elements: Signatures */}
                <div className="flex flex-col gap-2.5 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight font-sans">Assinaturas e Rodapé</span>
                      <span className="text-[8px] text-slate-400 font-sans">Ver linhas de "Direção" e data no certificado</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSystemElements(!showSystemElements)}
                      className={cn(
                        "w-10 h-6 rounded-full transition-colors relative flex items-center p-1 cursor-pointer",
                        showSystemElements ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", showSystemElements ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>

                  {/* Quantity of signatures option */}
                  {showSystemElements && (
                    <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-200/50">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wider font-sans">Quantidade de Assinaturas</span>
                        <span className="text-[8px] text-slate-400 font-sans">Selecione o número de linhas para assinatura (1 a 4)</span>
                      </div>
                      <div className="flex bg-white p-0.5 border border-slate-200 rounded-lg shadow-sm w-full">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setNumSignatures(num)}
                            className={cn(
                              "flex-1 px-1 py-1 text-[9px] font-black uppercase rounded-md transition-all cursor-pointer",
                              numSignatures === num 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            {num} Linha{num > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 3: FINE CO-ORDINATE ALIGNMENT (OFFSETS & LOGO) */}
            {activeTab === 'layout' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-4"
              >
                 <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-[10px] text-blue-800 leading-normal mb-2 flex gap-2">
                  <Info size={14} className="shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <strong>Ajuste de Alinhamento Cósmico:</strong> Use as barras verticais para mover os elementos para cima/baixo, e as deitadas para mover para os lados (esquerda/direita).
                  </div>
                </div>

                {/* Preset Controls */}
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-2.5 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">Presets do Modelo Ativo</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">
                      {localStorage.getItem(`preset_template_${template}`) 
                        ? "🎖️ Utilizando seu preset personalizado!" 
                        : "Utilizando coordenadas padrão do sistema."}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={saveCurrentAsPreset}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[8px] font-extrabold rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                      title="Salva coordenadas atuais como seu preset para este modelo"
                    >
                      Salvar Alinhamento
                    </button>
                    {localStorage.getItem(`preset_template_${template}`) && (
                      <button
                        type="button"
                        onClick={clearCurrentPreset}
                        className="px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[8px] font-extrabold rounded-lg uppercase tracking-wider transition-colors cursor-pointer"
                        title="Reseta configurações personalizadas de volta ao padrão de fábrica"
                      >
                        Resetar Padrão
                      </button>
                    )}
                  </div>
                </div>

                {/* Adjuster Name */}
                <ElementPositioner 
                  title="1. Aluno (Nome)"
                  yValue={yOffsetName}
                  onYChange={setYOffsetName}
                  xValue={xOffsetName}
                  onXChange={setXOffsetName}
                  fontSizeValue={fontSize}
                  onFontSizeChange={setFontSize}
                />

                {/* Adjuster Description */}
                <ElementPositioner 
                  title="2. Mensagem / Descrição"
                  yValue={yOffsetDescription}
                  onYChange={setYOffsetDescription}
                  xValue={xOffsetDescription}
                  onXChange={setXOffsetDescription}
                  fontSizeValue={fontSizeDescription}
                  onFontSizeChange={setFontSizeDescription}
                />

                {/* Adjuster Footer Signatures */}
                {showSystemElements ? (
                  <ElementPositioner 
                    title="3. Assinaturas e Linhas"
                    yValue={yOffsetSignatures}
                    onYChange={setYOffsetSignatures}
                    xValue={xOffsetSignatures}
                    onXChange={setXOffsetSignatures}
                    fontSizeValue={fontSizeSignatures}
                    onFontSizeChange={setFontSizeSignatures}
                  />
                ) : (
                  <div className="text-center p-3 text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Rodapé e Assinaturas Ocultos (Ative essa opção na Aba 2 se necessário alinhar).
                  </div>
                )}

                {/* Adjuster Emission Date */}
                <ElementPositioner 
                  title="4. Data de Emissão"
                  yValue={yOffsetDate}
                  onYChange={setYOffsetDate}
                  xValue={xOffsetDate}
                  onXChange={setXOffsetDate}
                  fontSizeValue={fontSizeDate}
                  onFontSizeChange={setFontSizeDate}
                />

                {/* PNG Logo Floating Seal adjustments */}
                <div className="pt-3 border-t border-slate-150 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">5. Selo Flutuante (Imagem PNG)</span>
                    {logoBytes && (
                      <button 
                        type="button" 
                        onClick={() => setLogoBytes(null)} 
                        className="text-[9px] text-red-500 font-extrabold uppercase hover:underline"
                      >
                        Remover Selo
                      </button>
                    )}
                  </div>

                  {!logoBytes ? (
                    <label className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <ImagePlus size={16} className="text-slate-400 mb-1" />
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase">Subir Selo do Colégio (PNG)</span>
                      <input 
                        type="file" accept="image/png" className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const bytes = new Uint8Array(ev.target?.result as ArrayBuffer);
                              setLogoBytes(bytes);
                            };
                            reader.readAsArrayBuffer(file);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="space-y-3">
                      <ElementPositioner 
                        title="Ajuste do Selo" 
                        yValue={logoY}
                        onYChange={setLogoY}
                        xValue={logoX}
                        onXChange={setLogoX}
                      />

                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                          <span>Escala do Selo/Brasão</span>
                          <span className="text-blue-600 font-mono">{Math.round(logoScale * 100)} %</span>
                        </div>
                        <input 
                          type="range" min="-1" max="2" step="0.01" value={logoScale} 
                          onChange={(e) => setLogoScale(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg accent-blue-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* SIDEBAR PERSISTENT FOOTER ACTIONS */}
          <div className="mt-auto p-4 bg-slate-50/60 border-t border-slate-200 flex flex-col gap-2 shrink-0">
            {/* Show Generate preview only if auto update is off in this tab */}
            {!autoUpdate && (
              <button
                onClick={handlePreview}
                disabled={isPreviewing || isDownloading || isRenderingCanvas}
                className="w-full bg-slate-100 text-slate-700 font-extrabold py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isPreviewing || isRenderingCanvas ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
                Gerar Amostra Manual
              </button>
            )}
            
            <button
              onClick={handleDownloadAll}
              disabled={isDownloading || isPreviewing || studentCount === 0}
              className="w-full bg-blue-600 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDownloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={14} />}
              Gerar Lote ({studentCount} Alunos)
            </button>
          </div>
        </aside>

        {/* Dynamic Display Canvas & Student navigation Preview Center Panel */}
        <section className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center lg:overflow-hidden bg-[#F1F5F9]">
          
          {/* Active Preview Name Selector Board (Only shows if multiple students exist) */}
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 px-5 py-3.5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users size={15} />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Aluno em Exibição</p>
                <p className="text-[11.5px] font-black text-slate-700 uppercase mt-1 leading-none">
                  {studentCount > 0 ? formatName(allStudents[Math.min(previewStudentIndex, studentCount - 1)] || "") : "Nenhum Aluno Cadastrado"}
                </p>
              </div>
            </div>

            {/* Page navigation layout for previewing different students */}
            {studentCount > 1 && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewStudentIndex(prev => Math.max(0, prev - 1))}
                  disabled={previewStudentIndex === 0}
                  className="p-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold select-none text-xs flex items-center"
                >
                  <ChevronLeft size={13} className="mr-0.5" /> Voltar
                </button>
                <div className="px-2 font-mono text-[10.5px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">
                  {previewStudentIndex + 1} de {studentCount}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewStudentIndex(prev => Math.min(studentCount - 1, prev + 1))}
                  disabled={previewStudentIndex >= studentCount - 1}
                  className="p-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer font-bold select-none text-xs flex items-center"
                >
                  Próximo <ChevronRight size={13} className="ml-0.5" />
                </button>
              </div>
            )}
          </div>

          {/* Main Stage Frame */}
          <div className="flex-1 w-full max-w-4xl bg-white rounded-[24px] border border-slate-200 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] flex items-center justify-center relative overflow-hidden group">
            {/* Minimal Background Artistry Grid to hold draftsmanship */}
            <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 0)', backgroundSize: '16px 16px' }} />

            <AnimatePresence mode="wait">
              {previewPdfBytes ? (
                <motion.div
                  key={`preview-std-${previewStudentIndex}-${template}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full h-full p-4 sm:p-8 z-10 flex items-center justify-center"
                >
                  <CertificatePreview pdfBytes={previewPdfBytes} template={template} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty-stage"
                  className="flex flex-col items-center gap-6 text-center px-4 relative z-10 max-w-sm"
                >
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[20px] flex items-center justify-center text-slate-300 shadow-sm leading-none group-hover:rotate-3 transition-transform duration-500">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1.5">Painel de Preview Interativo</h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      Insira a lista de alunos ao lado para carregar a amostra do seu PDF automaticamente.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick status/credit help row */}
          <div className="w-full max-w-4xl h-8 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 shrink-0 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sincronizado: Reserva - PR // CEP 84320-000
            </span>
            <span className="hidden sm:block">CECM Gregório Szeremeta - Certificados de Excelência</span>
          </div>
        </section>
      </main>
    </div>
  );
}
