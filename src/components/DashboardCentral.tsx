import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CalendarDays, 
  Bell, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  Save, 
  FileText, 
  Award,
  Calendar
} from 'lucide-react';

export type NoticeType = 'urgent' | 'warning' | 'info';

export interface Notice {
  id: string;
  title: string;
  date: string;
  type: NoticeType;
  text: string;
}

export interface TrimesterConfig {
  name: string;
  startDate: string;
  endDate: string;
}

export default function DashboardCentral() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    teachers: 0,
    turmas: 0,
    subjects: 0,
  });
  
  const [classStats, setClassStats] = useState({
    expected: 0,
    distributed: 0,
    missing: 0,
    excess: 0,
    percentage: 0,
    conflicts: 0,
    teachersWithExcess: 0,
    activeTeachers: 0,
    averageTeacherLoad: 0,
    roomsCount: 0
  });

  const [shiftStats, setShiftStats] = useState({
    manha: { expected: 0, distributed: 0, percentage: 0, missing: [] as string[] },
    tarde: { expected: 0, distributed: 0, percentage: 0, missing: [] as string[] },
    noite: { expected: 0, distributed: 0, percentage: 0, missing: [] as string[] },
    labs: { expected: 0, distributed: 0, percentage: 0, missing: [] as string[] }
  });

  const [incompleteTeachersCount, setIncompleteTeachersCount] = useState(0);

  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('cecm_school_name') || 'CE LUCAS LENIAR EF.M.P.');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noticeForm, setNoticeForm] = useState<Omit<Notice, 'id'>>({
    title: '',
    date: '',
    type: 'info',
    text: '',
  });

  const [isConfiguringTrimester, setIsConfiguringTrimester] = useState(false);
  const [trimesterConfig, setTrimesterConfig] = useState<TrimesterConfig>({
    name: '1º Trimestre',
    startDate: '',
    endDate: ''
  });
  const [trimesterProgress, setTrimesterProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedTeachers = localStorage.getItem('cecm_teachers');
      const savedTurmas = localStorage.getItem('cecm_turmas');
      const savedSubjects = localStorage.getItem('cecm_subjects');
      const savedSchoolName = localStorage.getItem('cecm_school_name');
      const savedSchedules = localStorage.getItem('cecm_schedules');
      const savedNotices = localStorage.getItem('cecm_notices');
      const savedTrimester = localStorage.getItem('cecm_trimester_config');
      const savedAcademicSystem = localStorage.getItem('cecm_academic_system');
      const savedAcademicPeriod = localStorage.getItem('cecm_academic_period');
      const savedAcademicStart = localStorage.getItem('cecm_academic_start');
      const savedAcademicEnd = localStorage.getItem('cecm_academic_end');
      
      if (savedSchoolName) setSchoolName(savedSchoolName);

      if (savedNotices) {
        setNotices(JSON.parse(savedNotices));
      } else {
        setNotices([
          { id: '1', title: 'Conselho de Classe', date: 'Hoje, 14:00', type: 'urgent', text: 'Conselho de classe referente ao primeiro trimestre dos 3º anos do Ensino Médio.' },
          { id: '2', title: 'Fechamento de Notas', date: 'Amanhã, 23:59', type: 'warning', text: 'Prazo final para o lançamento das notas e faltas no sistema escolar.' },
          { id: '3', title: 'Reunião Pedagógica', date: 'Sex, 08:00', type: 'info', text: 'Alinhamento das diretrizes para a feira de ciências interdisciplinar.' },
        ]);
      }

      const today = new Date();
      let currentTriConfig: TrimesterConfig = {
        name: '1º Trimestre',
        startDate: new Date(today.getFullYear(), 1, 5).toISOString().split('T')[0],
        endDate: new Date(today.getFullYear(), 4, 15).toISOString().split('T')[0]
      };
      
      if (savedTrimester) {
        try {
          const parsed = JSON.parse(savedTrimester);
          if (parsed.name) currentTriConfig.name = parsed.name;
          if (parsed.startDate) currentTriConfig.startDate = parsed.startDate;
          if (parsed.endDate) currentTriConfig.endDate = parsed.endDate;
        } catch(e) {}
      } else {
        if (savedAcademicSystem && savedAcademicPeriod) {
          currentTriConfig.name = `${savedAcademicPeriod}º ${savedAcademicSystem.replace('al', 'e')}`;
        }
        
        const savedAcademicDatesStr = localStorage.getItem('cecm_academic_dates');
        let foundDateConfig = false;

        if (savedAcademicDatesStr && savedAcademicSystem && savedAcademicPeriod) {
          try {
            const datesConfig = JSON.parse(savedAcademicDatesStr);
            const key = `${savedAcademicSystem}-${savedAcademicPeriod}`;
            const currentDates = datesConfig[key];
            if (currentDates) {
               if (currentDates.start) {
                  const [day, month] = currentDates.start.split('/');
                  if (day && month) {
                    currentTriConfig.startDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    foundDateConfig = true;
                  }
               }
               if (currentDates.end) {
                  const [day, month] = currentDates.end.split('/');
                  if (day && month) {
                    currentTriConfig.endDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    foundDateConfig = true;
                  }
               }
            }
          } catch (e) {
            console.error("Failed to parse academic dates in dashboard", e);
          }
        } 
        
        if (!foundDateConfig) {
          if (savedAcademicStart) {
            const [day, month] = savedAcademicStart.split('/');
            if (day && month) {
              currentTriConfig.startDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          if (savedAcademicEnd) {
            const [day, month] = savedAcademicEnd.split('/');
            if (day && month) {
              currentTriConfig.endDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }
      }
      
      setTrimesterConfig(currentTriConfig);

      const start = new Date(currentTriConfig.startDate).getTime();
      const end = new Date(currentTriConfig.endDate).getTime();
      const now = today.getTime();
      
      if (now <= start) {
        setTrimesterProgress(0);
      } else if (now >= end) {
        setTrimesterProgress(100);
      } else {
        const totalDuration = end - start;
        const elapsed = now - start;
        setTrimesterProgress(Math.round((elapsed / totalDuration) * 100));
      }

      const parsedTeachers = savedTeachers ? JSON.parse(savedTeachers) : [];
      const rawParsedTurmas = savedTurmas ? JSON.parse(savedTurmas).filter((t: any) => !t.isRoom) : [];
      const enableNoite = localStorage.getItem('cecm_enable_noite') === 'true';

      const parsedTurmas = rawParsedTurmas.filter((t: any) => {
        if (enableNoite) return true;
        const tName = (t.name || '').toLowerCase();
        const tShift = t.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
        return tShift !== 'noite';
      });

      const parsedSubjects = savedSubjects ? JSON.parse(savedSubjects) : [];
      const parsedSchedules = savedSchedules ? JSON.parse(savedSchedules) : {};

      setStats({
        teachers: parsedTeachers.length,
        turmas: parsedTurmas.length,
        subjects: parsedSubjects.length,
      });

      let expected = 0;
      let expectedManha = 0;
      let expectedTarde = 0;
      let expectedNoite = 0;

      let missingManhaDetails: string[] = [];
      let missingTardeDetails: string[] = [];
      let missingNoiteDetails: string[] = [];

      parsedTurmas.forEach((t: any) => {
        const expectedCount = (t.dailyClassCount || 5) * 5;
        expected += expectedCount;
        
        const tName = (t.name || '').toLowerCase();
        const tShift = t.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');
        
        if (tShift === 'manha') expectedManha += expectedCount;
        else if (tShift === 'tarde') expectedTarde += expectedCount;
        else if (tShift === 'noite') expectedNoite += expectedCount;

        if (!t.isRoom) {
          let filledCount = 0;
          if (parsedSchedules[t.id]) {
            Object.values(parsedSchedules[t.id]).forEach((s: any) => {
              if (s && s.teacherId && s.subjectId) filledCount++;
            });
          }
           
          if (filledCount < expectedCount) {
             const diff = expectedCount - filledCount;
             const msg = `${t.name}: Faltam ${diff} aula${diff > 1 ? 's' : ''}`;
             if (tShift === 'manha') missingManhaDetails.push(msg);
             else if (tShift === 'tarde') missingTardeDetails.push(msg);
             else if (tShift === 'noite') missingNoiteDetails.push(msg);
          }
        }
      });

      let distributed = 0;
      let distManha = 0;
      let distTarde = 0;
      let distNoite = 0;
      let distLabs = 0;

      const teacherLoads: Record<string, number> = {};
      const slotTeacherMap: Record<string, Set<string>> = {};
      let conflictsCount = 0;
      
      const rawTurmas = savedTurmas ? JSON.parse(savedTurmas) : [];
      
      Object.keys(parsedSchedules).forEach((turmaId) => {
        const turmaObj = rawTurmas.find((t: any) => t.id === turmaId);
        if (!turmaObj) return;

        const isRoom = turmaObj.isRoom;
        const turmaSchedule = parsedSchedules[turmaId];
        
        Object.keys(turmaSchedule).forEach((slotKey) => {
          const slot = turmaSchedule[slotKey];
          if (slot && slot.teacherId && slot.subjectId) {
            
            if (isRoom) {
               distLabs++;
            } else {
               const tName = (turmaObj.name || '').toLowerCase();
               const tShift = turmaObj.shift || (tName.includes('tarde') ? 'tarde' : tName.includes('noite') ? 'noite' : 'manha');

               if (!enableNoite && tShift === 'noite') return;

               distributed++;
               if (tShift === 'manha') distManha++;
               else if (tShift === 'tarde') distTarde++;
               else if (tShift === 'noite') distNoite++;

               teacherLoads[slot.teacherId] = (teacherLoads[slot.teacherId] || 0) + 1;
              
               if (!slotTeacherMap[slotKey]) slotTeacherMap[slotKey] = new Set();
               if (slotTeacherMap[slotKey].has(slot.teacherId)) {
                 conflictsCount++;
               } else {
                 slotTeacherMap[slotKey].add(slot.teacherId);
               }
            }
          }
        });
      });

      let incompleteCount = 0;
      let teachersWithExcessCount = 0;
      let activeTeachersCount = 0;
      let totalTeacherLoad = 0;

      parsedTeachers.forEach((t: any) => {
        const load = teacherLoads[t.id] || 0;
        if (load > 0) {
          activeTeachersCount++;
          totalTeacherLoad += load;
        }
        const expectedLoad = t.schoolWorkload;
        if (expectedLoad && load < expectedLoad) {
          incompleteCount++;
        }
        if (expectedLoad && expectedLoad > 0 && load > expectedLoad) {
          teachersWithExcessCount++;
        }
      });
      setIncompleteTeachersCount(incompleteCount);

      const calcPercentage = (dist: number, exp: number) => {
        if (exp === 0) return 0;
        if (dist === 0) return 0;
        if (dist === exp) return 100;
        const p = Math.round((dist / exp) * 100);
        if (dist < exp && p >= 100) return 99;
        if (dist > 0 && p <= 0) return 1;
        return p;
      };

      const excess = distributed > expected ? distributed - expected : 0;
      const missing = expected > distributed ? expected - distributed : 0;
      const percentage = calcPercentage(distributed, expected);

      setClassStats({
        expected,
        distributed,
        missing,
        excess,
        percentage,
        conflicts: conflictsCount,
        teachersWithExcess: teachersWithExcessCount,
        activeTeachers: activeTeachersCount,
        averageTeacherLoad: activeTeachersCount > 0 ? Math.round((totalTeacherLoad / activeTeachersCount) * 10) / 10 : 0,
        roomsCount: rawParsedTurmas.filter((t: any) => t.isRoom).length
      });

      setShiftStats({
        manha: { expected: expectedManha, distributed: distManha, percentage: calcPercentage(distManha, expectedManha), missing: missingManhaDetails },
        tarde: { expected: expectedTarde, distributed: distTarde, percentage: calcPercentage(distTarde, expectedTarde), missing: missingTardeDetails },
        noite: { expected: expectedNoite, distributed: distNoite, percentage: calcPercentage(distNoite, expectedNoite), missing: missingNoiteDetails },
        labs: { expected: 0, distributed: distLabs, percentage: 0, missing: [] }
      });

    } catch (e) {
      console.error('Error loading stats from localStorage', e);
    }
  }, []);

  const saveNotices = (newNotices: Notice[]) => {
    setNotices(newNotices);
    localStorage.setItem('cecm_notices', JSON.stringify(newNotices));
  };

  const handleSaveNotice = () => {
    if (!noticeForm.title.trim()) return;

    if (editingId) {
      const updated = notices.map(n => n.id === editingId ? { ...noticeForm, id: editingId } : n);
      saveNotices(updated);
    } else {
      const newNotice = { ...noticeForm, id: Date.now().toString() };
      saveNotices([...notices, newNotice]);
    }
    closeNoticeModal();
  };

  const handleDeleteNotice = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este aviso?')) {
      saveNotices(notices.filter(n => n.id !== id));
    }
  };

  const openNoticeModal = (notice?: Notice) => {
    if (notice) {
      setEditingId(notice.id);
      setNoticeForm({
        title: notice.title,
        date: notice.date,
        type: notice.type,
        text: notice.text,
      });
    } else {
      setEditingId(null);
      setNoticeForm({
        title: '',
        date: '',
        type: 'info',
        text: '',
      });
    }
    setIsEditingNotice(true);
  };

  const closeNoticeModal = () => {
    setIsEditingNotice(false);
    setEditingId(null);
  };

  const saveTrimesterConfig = () => {
    localStorage.setItem('cecm_trimester_config', JSON.stringify(trimesterConfig));
    setIsConfiguringTrimester(false);
    
    const start = new Date(trimesterConfig.startDate).getTime();
    const end = new Date(trimesterConfig.endDate).getTime();
    const now = new Date().getTime();
    
    if (now <= start) {
      setTrimesterProgress(0);
    } else if (now >= end) {
      setTrimesterProgress(100);
    } else {
      const totalDuration = end - start;
      const elapsed = now - start;
      setTrimesterProgress(Math.round((elapsed / totalDuration) * 100));
    }
  };

  const isFirstAccess = stats.turmas === 0 && stats.teachers === 0 && stats.subjects === 0;

  if (isFirstAccess) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center font-sans">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center text-center max-w-3xl w-full">
           <div className="w-16 h-16 bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
             <GraduationCap className="w-8 h-8" />
           </div>
           
           <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase mb-3">GE ESCOLAR</h1>
           <p className="text-slate-500 font-medium mb-8 text-sm max-w-xl leading-relaxed">
             Bem-vindo ao sistema de gestão e distribuição de horários escolares. Para começar a trabalhar, configure o sistema através do Wizard ou restaure um backup.
           </p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
             <button 
               onClick={() => navigate('/horarios?wizard=true')}
               className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-white hover:bg-slate-850 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
             >
               <Sparkles className="w-6 h-6 text-amber-300 mb-1" />
               <span className="text-sm font-bold uppercase tracking-wider block">Wizard (Início Rápido)</span>
               <span className="text-xs text-slate-400 font-medium leading-relaxed px-2">
                 Configuração guiada passo a passo para cadastrar turmas, matérias e professores.
               </span>
             </button>
 
             <button 
               onClick={() => navigate('/dados')}
               className="flex flex-col items-center justify-center gap-2 p-6 bg-white border border-slate-200 rounded-2xl text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
             >
               <Save className="w-6 h-6 text-slate-600 mb-1" />
               <span className="text-sm font-bold uppercase tracking-wider block">Importar Backup</span>
               <span className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                 Se você já possui um arquivo de backup (.json), restaure-o em instantes.
               </span>
             </button>
           </div>
           
           <div className="w-full mt-10 pt-8 border-t border-slate-100 flex flex-col items-center justify-center gap-4">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Módulos Independentes</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                   onClick={() => navigate('/atas')}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-850 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                >
                   <FileText className="w-3.5 h-3.5" />
                   Atas de Reunião
                </button>
                <button
                   onClick={() => navigate('/certificados')}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-850 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
                >
                   <Award className="w-3.5 h-3.5 text-amber-500" />
                   Certificados
                </button>
              </div>
           </div>
         </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans selection:bg-slate-200">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Painel de Controle</span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Visão Geral</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{schoolName}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center justify-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl text-white shadow-xs font-mono">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold tracking-widest uppercase">
              {currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100/80 px-4 py-2.5 rounded-xl border border-slate-200/40 justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
              {currentTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Bento Grid - Simplified Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Grade fill Card */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status de Distribuição</span>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mt-0.5">Andamento Geral da Grade</h3>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                classStats.percentage === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                classStats.percentage > 100 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                {classStats.percentage}% Preenchida
              </div>
            </div>

            {/* Custom Horizontal Progress Bar */}
            <div className="relative w-full bg-slate-100 h-3.5 rounded-full overflow-hidden mb-6">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  classStats.percentage === 100 ? 'bg-emerald-500' :
                  classStats.percentage > 100 ? 'bg-rose-500' : 'bg-slate-900'
                }`}
                style={{ width: `${Math.min(classStats.percentage, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aulas Esperadas</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{classStats.expected}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5 leading-none">Matriz das turmas</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aulas Distribuídas</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{classStats.distributed}</span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5 leading-none">Alocadas na grade</span>
              </div>
              <div 
                className={`transition-all rounded-xl p-1.5 -m-1.5 border border-transparent cursor-pointer hover:bg-slate-50 ${classStats.missing > 0 ? 'hover:border-rose-100/60' : 'hover:border-slate-100'}`}
                onClick={() => navigate('/horarios', { state: { showMissingClasses: true } })}
                title={classStats.missing > 0 ? "Clique para gerenciar e alocar aulas faltantes" : "Ver andamento da grade"}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  Diferença 
                  {classStats.missing > 0 && <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
                </span>
                {classStats.missing > 0 ? (
                  <>
                    <span className="text-2xl font-black text-rose-600 mt-1 block flex items-center gap-1">
                      -{classStats.missing}
                      <ArrowRight className="w-4 h-4 text-rose-400 inline-block" />
                    </span>
                    <span className="text-[10px] text-rose-500 font-semibold block mt-0.5 leading-none hover:underline">Aulas faltantes ↗</span>
                  </>
                ) : classStats.excess > 0 ? (
                  <>
                    <span className="text-2xl font-black text-amber-600 mt-1 block">+{classStats.excess}</span>
                    <span className="text-[10px] text-amber-500 font-semibold block mt-0.5 leading-none">Aulas em excesso</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">OK</span>
                    <span className="text-[10px] text-emerald-500 font-semibold block mt-0.5 leading-none">Grade completa</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Warnings & Conflicts Strip */}
          {(classStats.conflicts > 0 || classStats.excess > 0) && (
            <div className="mt-6 p-3.5 bg-amber-50/70 border border-amber-100/70 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-800 block uppercase tracking-wider text-[10px] mb-0.5">Inconsistências Identificadas</span>
                <p className="text-amber-700 font-medium leading-relaxed">
                  {classStats.conflicts > 0 && `${classStats.conflicts} conflito(s) de professores no mesmo horário. `}
                  {classStats.excess > 0 && `${classStats.excess} aula(s) distribuídas acima da carga permitida pela matriz.`}
                </p>
                <button 
                  onClick={() => navigate('/horarios')}
                  className="text-[10px] font-bold text-amber-900 hover:underline uppercase tracking-wider mt-1.5 inline-flex items-center gap-1"
                >
                  Resolver Horários <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* School Resources Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cadastros Ativos</span>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mt-0.5">Estrutura Escolar</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div onClick={() => navigate('/professores')} className="group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 text-slate-500 mb-1">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Professores</span>
                </div>
                <span className="text-2xl font-black text-slate-950 group-hover:text-blue-600 transition-colors">{stats.teachers}</span>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Ativos no sistema</p>
              </div>

              <div onClick={() => navigate('/alunos')} className="group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 text-slate-500 mb-1">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Turmas</span>
                </div>
                <span className="text-2xl font-black text-slate-950 group-hover:text-purple-600 transition-colors">{stats.turmas}</span>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Configuradas</p>
              </div>

              <div onClick={() => navigate('/disciplinas')} className="group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 text-slate-500 mb-1">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Disciplinas</span>
                </div>
                <span className="text-2xl font-black text-slate-950 group-hover:text-emerald-600 transition-colors">{stats.subjects}</span>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Na Matriz Base</p>
              </div>

              <div onClick={() => navigate('/salas')} className="group cursor-pointer hover:bg-slate-50/50 p-2 -m-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 text-slate-500 mb-1">
                  <Award className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Especiais</span>
                </div>
                <span className="text-2xl font-black text-slate-950 group-hover:text-amber-600 transition-colors">{classStats.roomsCount}</span>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Salas / Laboratórios</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Média de carga docente: <strong className="text-slate-800 font-bold">{classStats.averageTeacherLoad} aulas/prof</strong></span>
            <span>Uso: <strong className="text-slate-800 font-bold">{classStats.activeTeachers} de {stats.teachers}</strong></span>
          </div>
        </div>

      </div>

      {/* Secondary Row: Shifts and Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Notice Board Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-black text-slate-850 uppercase tracking-widest">Quadro de Avisos</h2>
            </div>
            <button 
              onClick={() => openNoticeModal()}
              className="flex items-center gap-1.5 bg-slate-950 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-850 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Novo Aviso
            </button>
          </div>
          
          <div className="space-y-3">
            {notices.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                <Bell className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">Nenhum aviso ativo.</p>
              </div>
            ) : notices.map((notice) => (
              <div 
                key={notice.id} 
                className={`bg-white p-5 rounded-2xl border flex gap-4 transition-all hover:bg-slate-50/50 group ${
                  notice.type === 'urgent' ? 'border-l-4 border-l-rose-500 border-slate-200' :
                  notice.type === 'warning' ? 'border-l-4 border-l-amber-500 border-slate-200' : 'border-l-4 border-l-slate-400 border-slate-200'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-tight">{notice.title}</h3>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">{notice.date}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button 
                        onClick={() => openNoticeModal(notice)} 
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteNotice(notice.id, e)} 
                        className="p-1.5 hover:bg-rose-50 rounded text-rose-500 transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl font-medium">{notice.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Turn Distribution and Period status Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Period Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Período Letivo</span>
                  <p className="text-xl font-black text-slate-50 mt-1 truncate">{trimesterConfig.name}</p>
                </div>
                <button 
                  onClick={() => setIsConfiguringTrimester(true)}
                  className="text-[9px] font-bold bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors text-slate-200"
                >
                  Ajustar
                </button>
              </div>

              <div className="mt-5">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1 px-0.5">
                  <span className="text-slate-400">Progresso Temporal</span>
                  <span className="text-slate-200">{trimesterProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${trimesterProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 mt-4 pt-4 border-t border-white/5 flex justify-between items-center font-medium">
              <span>Início: <strong className="text-slate-200">{trimesterConfig.startDate ? trimesterConfig.startDate.split('-').reverse().join('/') : '-'}</strong></span>
              <span>Término: <strong className="text-slate-200">{trimesterConfig.endDate ? trimesterConfig.endDate.split('-').reverse().join('/') : '-'}</strong></span>
            </div>
          </div>

          {/* Turn Distribution Detail */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Preenchimento por Turno</h3>
            
            <div className="space-y-3.5">
              {/* Manhã */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    Manhã
                    {shiftStats.manha.missing.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Existem aulas pendentes de alocação neste turno" />
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{shiftStats.manha.distributed} / {shiftStats.manha.expected} ({shiftStats.manha.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      shiftStats.manha.percentage === 100 ? 'bg-emerald-500' :
                      shiftStats.manha.percentage > 100 ? 'bg-rose-500' : 'bg-slate-900'
                    }`} 
                    style={{ width: `${Math.min(shiftStats.manha.percentage, 100)}%` }} 
                  />
                </div>
              </div>

              {/* Tarde */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    Tarde
                    {shiftStats.tarde.missing.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Existem aulas pendentes de alocação neste turno" />
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{shiftStats.tarde.distributed} / {shiftStats.tarde.expected} ({shiftStats.tarde.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      shiftStats.tarde.percentage === 100 ? 'bg-emerald-500' :
                      shiftStats.tarde.percentage > 100 ? 'bg-rose-500' : 'bg-slate-900'
                    }`} 
                    style={{ width: `${Math.min(shiftStats.tarde.percentage, 100)}%` }} 
                  />
                </div>
              </div>

              {/* Noite */}
              {shiftStats.noite.expected > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      Noite
                      {shiftStats.noite.missing.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Existem aulas pendentes de alocação neste turno" />
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{shiftStats.noite.distributed} / {shiftStats.noite.expected} ({shiftStats.noite.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        shiftStats.noite.percentage === 100 ? 'bg-emerald-500' :
                        shiftStats.noite.percentage > 100 ? 'bg-rose-500' : 'bg-slate-900'
                      }`} 
                      style={{ width: `${Math.min(shiftStats.noite.percentage, 100)}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Notice Dialog / Modal */}
      {isEditingNotice && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in"
          onClick={closeNoticeModal}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-lg border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">{editingId ? 'Editar Aviso' : 'Novo Aviso'}</h3>
              <button onClick={closeNoticeModal} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Título</label>
                <input 
                  type="text" 
                  value={noticeForm.title}
                  onChange={e => setNoticeForm({...noticeForm, title: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm font-medium bg-slate-50/50"
                  placeholder="Ex: Conselho de Classe"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data ou Horário Visível</label>
                <input 
                  type="text" 
                  value={noticeForm.date}
                  onChange={e => setNoticeForm({...noticeForm, date: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm font-medium bg-slate-50/50"
                  placeholder="Ex: Hoje, 14:00"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tipo de Prioridade</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'info'})}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${noticeForm.type === 'info' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >Normal</button>
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'warning'})}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${noticeForm.type === 'warning' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >Atenção</button>
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'urgent'})}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${noticeForm.type === 'urgent' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >Urgente</button>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descrição</label>
                <textarea 
                  value={noticeForm.text}
                  onChange={e => setNoticeForm({...noticeForm, text: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm resize-none h-24 font-medium bg-slate-50/50"
                  placeholder="Escreva as informações detalhadas do comunicado..."
                />
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={closeNoticeModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNotice}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-850 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trimester/Period Config Dialog */}
      {isConfiguringTrimester && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsConfiguringTrimester(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm shadow-lg border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Período Acadêmico</h3>
              <button onClick={() => setIsConfiguringTrimester(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Período</label>
                <select 
                  value={trimesterConfig.name}
                  onChange={e => setTrimesterConfig({...trimesterConfig, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm font-medium bg-slate-50/50"
                >
                  <option value="1º Trimestre">1º Trimestre</option>
                  <option value="2º Trimestre">2º Trimestre</option>
                  <option value="3º Trimestre">3º Trimestre</option>
                  <option value="1º Bimestre">1º Bimestre</option>
                  <option value="2º Bimestre">2º Bimestre</option>
                  <option value="3º Bimestre">3º Bimestre</option>
                  <option value="4º Bimestre">4º Bimestre</option>
                </select>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data de Início</label>
                <input 
                  type="date" 
                  value={trimesterConfig.startDate}
                  onChange={e => setTrimesterConfig({...trimesterConfig, startDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm font-medium bg-slate-50/50"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data de Fim</label>
                <input 
                  type="date" 
                  value={trimesterConfig.endDate}
                  onChange={e => setTrimesterConfig({...trimesterConfig, endDate: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 outline-hidden focus:border-slate-800 text-sm font-medium bg-slate-50/50"
                />
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setIsConfiguringTrimester(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveTrimesterConfig}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-850 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
