import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, CalendarDays, Bell, AlertCircle, TrendingUp, Clock, Plus, X, Edit2, Trash2, ArrowRight, Settings, Sparkles, Save, FileText } from 'lucide-react';

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
    conflicts: 0
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
    // Load stats from localStorage used by the schedule generator
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
        // Default notices
        setNotices([
          { id: '1', title: 'Conselho de Classe', date: 'Hoje, 14:00', type: 'urgent', text: 'Conselho de classe referente ao primeiro trimestre dos 3º anos do Ensino Médio.' },
          { id: '2', title: 'Fechamento de Notas', date: 'Amanhã, 23:59', type: 'warning', text: 'Prazo final para o lançamento das notas e faltas no sistema escolar.' },
          { id: '3', title: 'Reunião Pedagógica', date: 'Sex, 08:00', type: 'info', text: 'Alinhamento das diretrizes para a feira de ciências interdisciplinar.' },
        ]);
      }

      const today = new Date();
      let currentTriConfig: TrimesterConfig = {
        name: savedAcademicSystem && savedAcademicPeriod ? `${savedAcademicPeriod}º ${savedAcademicSystem.replace('al', 'e')}` : '1º Trimestre',
        startDate: new Date(today.getFullYear(), 1, 5).toISOString().split('T')[0], // 5 Feb
        endDate: new Date(today.getFullYear(), 4, 15).toISOString().split('T')[0] // 15 May
      };
      
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
        // Fallback to legacy config
        if (savedAcademicStart) {
          const [day, month] = savedAcademicStart.split('/');
          if (day && month) {
            currentTriConfig.startDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else if (savedTrimester) {
          try {
            const parsed = JSON.parse(savedTrimester);
            if (parsed.startDate) currentTriConfig.startDate = parsed.startDate;
          } catch(e) {}
        }

        if (savedAcademicEnd) {
          const [day, month] = savedAcademicEnd.split('/');
          if (day && month) {
            currentTriConfig.endDate = `${today.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else if (savedTrimester) {
          try {
            const parsed = JSON.parse(savedTrimester);
            if (parsed.endDate) currentTriConfig.endDate = parsed.endDate;
          } catch(e) {}
        }
      }
      
      setTrimesterConfig(currentTriConfig);

      // Calculate progress
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
      const parsedTurmas = savedTurmas ? JSON.parse(savedTurmas).filter((t: any) => !t.isRoom) : [];
      const parsedSubjects = savedSubjects ? JSON.parse(savedSubjects) : [];
      const parsedSchedules = savedSchedules ? JSON.parse(savedSchedules) : {};

      setStats({
        teachers: parsedTeachers.length,
        turmas: parsedTurmas.length,
        subjects: parsedSubjects.length,
      });

      // Calculate class stats
      let expected = 0;
      parsedTurmas.forEach((t: any) => {
        expected += (t.dailyClassCount || 5) * 5;
      });

      let distributed = 0;
      const teacherLoads: Record<string, number> = {};
      const slotTeacherMap: Record<string, Set<string>> = {};
      let conflictsCount = 0;
      
      // Calculate distributed, workloads and conflicts
      Object.keys(parsedSchedules).forEach((turmaId) => {
        const turmaSchedule = parsedSchedules[turmaId];
        Object.keys(turmaSchedule).forEach((slotKey) => {
          const slot = turmaSchedule[slotKey];
          if (slot && slot.teacherId && slot.subjectId) {
            distributed++;
            teacherLoads[slot.teacherId] = (teacherLoads[slot.teacherId] || 0) + 1;
            
            // Check for conflicts (same teacher in same slot in different class)
            if (!slotTeacherMap[slotKey]) slotTeacherMap[slotKey] = new Set();
            if (slotTeacherMap[slotKey].has(slot.teacherId)) {
              conflictsCount++;
            } else {
              slotTeacherMap[slotKey].add(slot.teacherId);
            }
          }
        });
      });

      let incompleteCount = 0;
      parsedTeachers.forEach((t: any) => {
        const load = teacherLoads[t.id] || 0;
        const expectedLoad = t.schoolWorkload;
        // Count teachers who have a required workload but haven't reached it yet
        if (expectedLoad && load < expectedLoad) {
          incompleteCount++;
        }
      });
      setIncompleteTeachersCount(incompleteCount);

      const excess = distributed > expected ? distributed - expected : 0;
      const missing = expected > distributed ? expected - distributed : 0;
      const percentage = expected === 0 ? 0 : Math.round((distributed / expected) * 100);

      setClassStats({
        expected,
        distributed,
        missing,
        excess,
        percentage,
        conflicts: conflictsCount
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
    
    // Recalculate progress
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center text-center max-w-3xl w-full">
           <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
             <GraduationCap className="w-10 h-10" />
           </div>
           
           <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase mb-3 text-balance">Bem-vindo ao {schoolName}</h1>
           <p className="text-slate-500 font-medium mb-8 text-xs md:text-sm max-w-xl text-balance leading-relaxed">
             Parece que este é o seu primeiro acesso ou o sistema foi redefinido. Para ativar todas as funcionalidades e abas laterais, por favor inicie configurando sua grade de forma assistida ou faça a restauração de um backup prévio.
           </p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
             <button 
               onClick={() => navigate('/horarios?wizard=true')}
               className="flex flex-col items-center justify-center gap-3 p-8 bg-purple-600 border border-purple-700 rounded-2xl text-white hover:bg-purple-700 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1 group"
             >
               <Sparkles className="w-10 h-10 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
               <span className="text-lg font-black uppercase tracking-widest block drop-shadow-sm">Wizzard (Início Fácil)</span>
               <span className="text-[11px] text-purple-200 font-medium leading-relaxed px-4 opacity-90 group-hover:opacity-100">
                 Configuração passo a passo interativa para criar suas turmas, matriz curricular, docentes e gerar a primeira grade escolar.
               </span>
             </button>

             <button 
               onClick={() => window.dispatchEvent(new Event('cecm_open_import'))}
               className="flex flex-col items-center justify-center gap-3 p-8 bg-emerald-600 border border-emerald-700 rounded-2xl text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-1 group"
             >
               <Save className="w-10 h-10 text-emerald-200 group-hover:scale-110 transition-transform" />
               <span className="text-lg font-black uppercase tracking-widest block drop-shadow-sm">Restaurar Backup</span>
               <span className="text-[11px] text-emerald-100 font-medium leading-relaxed px-4 opacity-90 group-hover:opacity-100">
                 Já possui um arquivo .txt de um backup anterior? Importe as tabelas, salas e grades geradas previamente em poucos segundos.
               </span>
             </button>
           </div>
           
           <div className="w-full mt-10 pt-8 border-t border-slate-100 flex flex-col items-center justify-center gap-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Acesso Isolado Permitido</p>
              <button
                 onClick={() => navigate('/atas')}
                 className="flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors"
              >
                 <FileText className="w-4 h-4" />
                 Módulo de Atas
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Visão Geral</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-widest">{schoolName}</p>
        </div>
        <div className="flex flex-col gap-1.5 items-end">
          <div className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 rounded-xl text-white shadow-sm w-full md:w-auto">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black tracking-widest uppercase font-mono">
              {currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100 w-full md:w-auto justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              {currentTime.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Info Cards */}
        <div 
          onClick={() => navigate('/professores')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-blue-500 transition-colors">Corpo Docente <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
              <p className="text-4xl font-black text-slate-800">{stats.teachers}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Professores ativos no sistema</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/alunos')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-purple-500 transition-colors">Turmas <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
              <p className="text-4xl font-black text-slate-800">{stats.turmas}</p>
            </div>
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Turmas cadastradas</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/disciplinas')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-emerald-500 transition-colors">Disciplinas <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
              <p className="text-4xl font-black text-slate-800">{stats.subjects}</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Matriz curricular base</span>
          </div>
        </div>

        <div 
          onClick={() => navigate('/horarios')}
          className={`bg-white p-6 rounded-2xl border ${classStats.percentage > 100 ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'} shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-pointer`}
        >
          <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full group-hover:scale-110 transition-transform duration-500 ${classStats.percentage > 100 ? 'bg-rose-50' : 'bg-amber-50'}`} />
          <div className="relative flex justify-between items-start">
            <div className="space-y-2">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${classStats.percentage > 100 ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-amber-500'}`}>Horários <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
              <p className={`text-4xl font-black ${classStats.percentage > 100 ? 'text-rose-600' : 'text-slate-800'}`}>{classStats.percentage}%</p>
            </div>
            <div className={`p-3 rounded-xl ${classStats.percentage > 100 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className={`mt-4 flex flex-col gap-0.5 text-xs font-bold ${classStats.percentage > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{classStats.percentage > 100 ? 'Grade Excedida (Inconsistência)' : 'Preenchimento da grade'}</span>
            </div>
            {classStats.percentage > 100 && (
              <span className="text-[10px] text-rose-500 mt-0.5 font-semibold">Excedeu limite em {classStats.excess} aula(s). Revise.</span>
            )}
            {classStats.conflicts > 0 && (
              <span className="text-[10px] text-rose-500 mt-0.5 font-semibold">{classStats.conflicts} conflito(s) em mesmo horário.</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Notices */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-700" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Quadro de Avisos</h2>
            </div>
            <button 
              onClick={() => openNoticeModal()}
              className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Aviso
            </button>
          </div>
          
          <div className="space-y-3">
            {notices.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">Nenhum aviso configurado.</p>
              </div>
            ) : notices.map((notice) => (
              <div key={notice.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 transition-all hover:bg-slate-50 group">
                <div className={`shrink-0 mt-1 ${
                  notice.type === 'urgent' ? 'text-red-500' :
                  notice.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-slate-800">{notice.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 w-max">
                        <Clock className="w-3 h-3" />
                        {notice.date}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button onClick={() => openNoticeModal(notice)} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => handleDeleteNotice(notice.id, e)} className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{notice.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Quick Actions / Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-slate-700" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Status do Sistema</h2>
            </div>
          </div>
          
          <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="space-y-1 text-center">
                <p className="text-3xl font-black tracking-tight mt-1 truncate max-w-full text-blue-400">{trimesterConfig.name}</p>
                <div className="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden" title={`${trimesterConfig.startDate.split('-').reverse().join('/')} até ${trimesterConfig.endDate.split('-').reverse().join('/')}`}>
                  <div className="bg-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: `${trimesterProgress}%` }} />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progresso do Período</span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">{trimesterProgress}% Decorrido</span>
                </div>
              </div>

              <div className="border-t border-slate-700/50 pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300">Aulas Esperadas (Grade)</span>
                  <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold">{classStats.expected}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300">Horários Gerados</span>
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-bold">{classStats.distributed} ({classStats.percentage}%)</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300">Total Faltante</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold ${classStats.missing === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {classStats.missing === 0 ? 'OK' : classStats.missing}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300">Excesso (A mais)</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold ${classStats.excess === 0 ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {classStats.excess === 0 ? 'OK' : classStats.excess}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-300">Conflitos Pendentes</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold ${classStats.conflicts === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {classStats.conflicts === 0 ? 'NENHUM' : classStats.conflicts}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => navigate('/professores')}
            className="mt-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center cursor-pointer hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle className={`w-5 h-5 ${incompleteTeachersCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Resumo de Professores</h3>
            </div>
            {incompleteTeachersCount > 0 ? (
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                <span className="font-bold text-amber-600 block text-lg mb-1">{incompleteTeachersCount} Professores</span>
                Ainda não atingiram a carga horária semanal configurada.
              </p>
            ) : (
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                Todos os professores estão com a carga horária em dia ou não configurada.
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-500 transition-colors">
              VER CADASTRO <ArrowRight className="w-3 h-3" />
            </div>
          </div>

        </div>

      </div>

      {isEditingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase">{editingId ? 'Editar Aviso' : 'Novo Aviso'}</h3>
              <button onClick={closeNoticeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Título (ex: Conselho de Classe)</label>
                <input 
                  type="text" 
                  value={noticeForm.title}
                  onChange={e => setNoticeForm({...noticeForm, title: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                  placeholder="Título do aviso"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Data/Hora visível (ex: Hoje, 14:00)</label>
                <input 
                  type="text" 
                  value={noticeForm.date}
                  onChange={e => setNoticeForm({...noticeForm, date: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                  placeholder="Hoje, Amanhã, Sex 08:00..."
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Aviso</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'info'})}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${noticeForm.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >Normal</button>
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'warning'})}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${noticeForm.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >Atenção</button>
                  <button 
                    onClick={() => setNoticeForm({...noticeForm, type: 'urgent'})}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors ${noticeForm.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >Urgente</button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Descrição detalhada</label>
                <textarea 
                  value={noticeForm.text}
                  onChange={e => setNoticeForm({...noticeForm, text: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm resize-none h-24 font-medium"
                  placeholder="Descreva o aviso ou a convocação..."
                />
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={closeNoticeModal}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNotice}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
              >
                Salvar Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trimester Config Modal */}
      {isConfiguringTrimester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase">Configurar Período</h3>
              <button onClick={() => setIsConfiguringTrimester(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Período</label>
                <select 
                  value={trimesterConfig.name}
                  onChange={e => setTrimesterConfig({...trimesterConfig, name: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium bg-white"
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
                <label className="text-xs font-bold text-slate-500 uppercase">Data de Início</label>
                <input 
                  type="date" 
                  value={trimesterConfig.startDate}
                  onChange={e => setTrimesterConfig({...trimesterConfig, startDate: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Data de Fim</label>
                <input 
                  type="date" 
                  value={trimesterConfig.endDate}
                  onChange={e => setTrimesterConfig({...trimesterConfig, endDate: e.target.value})}
                  className="mt-1 w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-sm font-medium"
                />
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsConfiguringTrimester(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveTrimesterConfig}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
