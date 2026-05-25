import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  BookOpen, 
  Menu,
  X,
  LogOut,
  FileText,
  Settings,
  Building2,
  Image as ImageIcon,
  Moon,
  Clock,
  Calendar,
  Save,
  MessageCircle,
  Download,
  Key,
  HelpCircle,
  Lock,
  CalendarClock,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('CE LUCAS LENIAR EF.M.P.');
  const [logoUrl, setLogoUrl] = useState('');
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configModalidade, setConfigModalidade] = useState<'Trimestre' | 'Bimestre'>('Trimestre');
  const [configPeriodo, setConfigPeriodo] = useState<string>('1');
  const [configStartDate, setConfigStartDate] = useState<string>('');
  const [configEndDate, setConfigEndDate] = useState<string>('');
  const [configSchoolName, setConfigSchoolName] = useState('');
  const [configLogoUrl, setConfigLogoUrl] = useState('');
  const [configEnableNoite, setConfigEnableNoite] = useState(false);
  const [configEnableAsincrona, setConfigEnableAsincrona] = useState(false);
  const [configApiKey, setConfigApiKey] = useState('');

  const handleOpenSettings = () => {
    setConfigSchoolName(localStorage.getItem('cecm_school_name') || 'CE LUCAS LENIAR EF.M.P.');
    setConfigLogoUrl(localStorage.getItem('cecm_logo_url') || '');
    setConfigEnableNoite(localStorage.getItem('enable_noite_period') === 'true');
    setConfigEnableAsincrona(localStorage.getItem('enable_noite_asynchronous') === 'true');
    setConfigApiKey(localStorage.getItem('GEMINI_API_KEY') || '');

    const trimesterConfigStr = localStorage.getItem('cecm_trimester_config');
    if (trimesterConfigStr) {
      try {
        const config = JSON.parse(trimesterConfigStr);
        const name = config.name || '1º Trimestre';
        if (name.includes('Bimestre')) {
          setConfigModalidade('Bimestre');
          setConfigPeriodo(name.charAt(0));
        } else {
          setConfigModalidade('Trimestre');
          setConfigPeriodo(name.charAt(0));
        }
        
        if (config.startDate) setConfigStartDate(config.startDate);
        if (config.endDate) setConfigEndDate(config.endDate);
      } catch (e) {}
    }
    setIsSettingsOpen(true);
    setIsSidebarOpen(false); // Close mobile sidebar if open
  };

  const handleSaveSettings = () => {
    localStorage.setItem('cecm_school_name', configSchoolName);
    localStorage.setItem('cecm_logo_url', configLogoUrl);
    localStorage.setItem('enable_noite_period', configEnableNoite ? 'true' : 'false');
    localStorage.setItem('enable_noite_asynchronous', configEnableAsincrona ? 'true' : 'false');
    if (configApiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', configApiKey.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }

    const periodName = `${configPeriodo}º ${configModalidade}`;
    
    let trimesterConfig: any = { name: periodName, startDate: configStartDate, endDate: configEndDate };
    const saved = localStorage.getItem('cecm_trimester_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        trimesterConfig = { ...parsed, name: periodName, startDate: configStartDate, endDate: configEndDate };
      } catch (e) {}
    } else {
      if (!trimesterConfig.startDate || !trimesterConfig.endDate) {
        const today = new Date();
        trimesterConfig.startDate = new Date(today.getFullYear(), 1, 5).toISOString().split('T')[0];
        trimesterConfig.endDate = new Date(today.getFullYear(), 4, 15).toISOString().split('T')[0];
      }
    }
    localStorage.setItem('cecm_trimester_config', JSON.stringify(trimesterConfig));

    window.dispatchEvent(new CustomEvent('cecm_school_name_changed', { detail: configSchoolName }));

    setIsSettingsOpen(false);
    
    // Reload to apply architectural changes (like night shift to everything)
    window.location.reload();
  };

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualActiveTab, setManualActiveTab] = useState('geral');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [supportModule, setSupportModule] = useState('Geral');
  const [supportMessage, setSupportMessage] = useState('');

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setIsResetting(true);

    if (resetPassword !== 'ccm2024') {
      setIsResetting(false);
      setResetError('Senha incorreta.');
      return;
    }

    setTimeout(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cecm_') || key.startsWith('enable_noite_')) {
          localStorage.removeItem(key);
        }
      });
      setIsResetting(false);
      setIsResetOpen(false);
      setResetPassword('');
      // Force reload to completely wipe memory state
      window.location.reload();
    }, 1000);
  };

  const handleExportBackup = () => {
    const data = {
      teachers: JSON.parse(localStorage.getItem('cecm_teachers') || '[]'),
      subjects: JSON.parse(localStorage.getItem('cecm_subjects') || '[]'),
      turmas: JSON.parse(localStorage.getItem('cecm_turmas') || '[]'),
      schedules: JSON.parse(localStorage.getItem('cecm_schedules') || '{}'),
      version: parseInt(localStorage.getItem('cecm_version') || '74', 10),
      logoUrl: localStorage.getItem('cecm_logo_url') || '',
      schoolName: localStorage.getItem('cecm_school_name') || 'CE LUCAS LENIAR EF.M.P.',
      timeRangesManha: JSON.parse(localStorage.getItem('cecm_time_ranges_manha') || 'null'),
      timeRangesTarde: JSON.parse(localStorage.getItem('cecm_time_ranges_tarde') || 'null'),
      timeRangesNoite: JSON.parse(localStorage.getItem('cecm_time_ranges_noite') || 'null'),
      enableNoite: localStorage.getItem('enable_noite_period') === 'true',
      enableNoiteAsynchronous: localStorage.getItem('enable_noite_asynchronous') === 'true',
      exportDate: new Date().toISOString(),
      appName: "GE-Scheduler"
    };
    
    // Cleanup null properties
    for (const key in data) {
      if ((data as any)[key] === null) delete (data as any)[key];
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.download = `backup_completo_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  // Expose the raw file input
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        const hasSomeData = data.teachers || data.subjects || data.turmas || data.schedules;
        
        if (hasSomeData) {
          setPendingImportData(data);
          setIsImportConfirmOpen(true);
        } else {
          // If no recognized tables, mock them to attempt force restore or notify
          alert('Arquivo de backup não contém as tabelas corretas.');
        }
      } catch (err) {
        alert('Erro crítico ao processar o backup. O arquivo pode estar corrompido.');
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const confirmImport = () => {
    if (!pendingImportData) return;
    const data = pendingImportData;
    
    if (data.teachers) localStorage.setItem('cecm_teachers', JSON.stringify(data.teachers));
    if (data.subjects) localStorage.setItem('cecm_subjects', JSON.stringify(data.subjects));
    if (data.turmas) localStorage.setItem('cecm_turmas', JSON.stringify(data.turmas));
    localStorage.setItem('cecm_schedules', JSON.stringify(data.schedules || {}));
    
    if (data.logoUrl !== undefined) localStorage.setItem('cecm_logo_url', data.logoUrl);
    if (data.schoolName !== undefined) {
      localStorage.setItem('cecm_school_name', data.schoolName);
      setSchoolName(data.schoolName);
    }
    if (data.timeRangesManha) localStorage.setItem('cecm_time_ranges_manha', JSON.stringify(data.timeRangesManha));
    if (data.timeRangesTarde) localStorage.setItem('cecm_time_ranges_tarde', JSON.stringify(data.timeRangesTarde));
    if (data.timeRangesNoite) localStorage.setItem('cecm_time_ranges_noite', JSON.stringify(data.timeRangesNoite));

    if (data.enableNoite !== undefined) localStorage.setItem('enable_noite_period', data.enableNoite ? 'true' : 'false');
    if (data.enableNoiteAsynchronous !== undefined) localStorage.setItem('enable_noite_asynchronous', data.enableNoiteAsynchronous ? 'true' : 'false');
    
    if (data.academicSystem) {
      localStorage.setItem('cecm_academic_system', data.academicSystem);
    }
    if (data.academicDates) {
      localStorage.setItem('cecm_academic_dates', JSON.stringify(data.academicDates));
      
      const sys = data.academicSystem || 'Bimestral';
      const today = new Date();
      const numPeriods = sys === 'Bimestral' ? 4 : 3;
      for (let p = 1; p <= numPeriods; p++) {
        const key = `${sys}-${p}`;
        const dates = data.academicDates[key];
        if (dates && dates.start && dates.end) {
          const parts = dates.start.split('/');
          if (parts.length === 2) {
            const start = new Date(today.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]));
            const endParts = dates.end.split('/');
            const end = new Date(today.getFullYear(), parseInt(endParts[1]) - 1, parseInt(endParts[0]));
            if (end < start) end.setFullYear(end.getFullYear() + 1);
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            if (today >= start && today <= end) {
              localStorage.setItem('cecm_academic_period', p.toString());
              localStorage.setItem('cecm_academic_start', dates.start);
              localStorage.setItem('cecm_academic_end', dates.end);
              break;
            }
          }
        }
      }
    }

    setIsImportConfirmOpen(false);
    setIsImportOpen(false);
    window.location.reload();
  };

  const [hasTurmas, setHasTurmas] = useState(true);
  const [hasDisciplinas, setHasDisciplinas] = useState(true);
  const [hasProfessores, setHasProfessores] = useState(true);

  useEffect(() => {
    const savedName = localStorage.getItem('cecm_school_name');
    if (savedName) setSchoolName(savedName);
    
    const savedLogo = localStorage.getItem('cecm_logo_url');
    if (savedLogo) setLogoUrl(savedLogo);

    const handleNameChange = (e: Event) => {
      const ce = e as CustomEvent<string>;
      setSchoolName(ce.detail);
    };

    const handleOpenImport = () => setIsImportOpen(true);
    const handleOpenExport = () => setIsExportOpen(true);

    window.addEventListener('cecm_school_name_changed', handleNameChange);
    window.addEventListener('cecm_open_import', handleOpenImport);
    window.addEventListener('cecm_open_export', handleOpenExport);

    const checkData = () => {
      try {
        const t = JSON.parse(localStorage.getItem('cecm_turmas') || '[]');
        const d = JSON.parse(localStorage.getItem('cecm_subjects') || '[]');
        const p = JSON.parse(localStorage.getItem('cecm_teachers') || '[]');
        setHasTurmas(t.length > 0);
        setHasDisciplinas(d.length > 0);
        setHasProfessores(p.length > 0);
      } catch (e) {}
    };
    checkData();
    const intervalId = setInterval(checkData, 1000);

    return () => {
      window.removeEventListener('cecm_school_name_changed', handleNameChange);
      window.removeEventListener('cecm_open_import', handleOpenImport);
      window.removeEventListener('cecm_open_export', handleOpenExport);
      clearInterval(intervalId);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, locked: false },
    { name: 'Turmas', path: '/alunos', icon: GraduationCap, locked: !hasTurmas },
    { name: 'Disciplinas', path: '/disciplinas', icon: BookOpen, locked: !hasTurmas },
    { name: 'Professores', path: '/professores', icon: Users, locked: !hasTurmas || !hasDisciplinas },
    { name: 'Horários', path: '/horarios', icon: CalendarDays, locked: !hasTurmas || !hasDisciplinas || !hasProfessores },
    { name: 'Substituições', path: '/substituicoes', icon: CalendarClock, locked: !hasTurmas || !hasDisciplinas || !hasProfessores },
    { name: 'Atas de Reunião', path: '/atas', icon: FileText, locked: false },
  ];

  const handleSupportSend = () => {
    const text = `Olá Professor Lucas, preciso de suporte no sistema de Gestão Escolar!\n\n*Módulo:* ${supportModule}\n*Escola:* ${schoolName}\n*Mensagem:* ${supportMessage || 'Gostaria de tirar uma dúvida.'}`;
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/5542988869655?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
    setIsSupportOpen(false);
    setSupportMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-20 bg-white border-r border-slate-200 flex flex-col pt-3 pb-3 px-1
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col items-center justify-center mb-4 px-1 gap-2">
          <div className="flex items-center justify-center">
            {logoUrl ? (
              <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg p-0.5 overflow-hidden flex items-center justify-center shrink-0">
                <img src={logoUrl} alt="Logo Escola" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="bg-[#657c36] p-2 rounded-lg shrink-0">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="w-full text-center px-0.5">
            <h1 className="text-[8.5px] font-black text-slate-900 leading-tight uppercase tracking-tighter truncate w-full">GE ESCOLAR</h1>
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest truncate w-full">{schoolName}</p>
          </div>
          <button 
            className="lg:hidden absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md shrink-0"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar overflow-x-hidden px-1">
          {navItems.map((item, index) => (
            <div key={item.path} className="w-full flex-col flex gap-1">
              {item.locked ? (
                <div
                  className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] uppercase tracking-tighter font-extrabold transition-all text-center leading-none text-slate-300 bg-slate-50 border border-slate-100 cursor-not-allowed"
                  title="Complete a etapa anterior primeiro"
                >
                  <Lock className="w-4 h-4 text-slate-300" />
                  <span className="truncate w-full block line-through">{item.name}</span>
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] uppercase tracking-tighter font-extrabold transition-all text-center leading-none
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="truncate w-full block">{item.name}</span>
                </NavLink>
              )}
              {index === 0 && (
                <button 
                  onClick={() => {
                    setIsImportOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[7px] font-black tracking-widest uppercase transition-all text-emerald-600 hover:bg-emerald-50 mb-0.5 border border-transparent hover:border-emerald-100"
                >
                  <Save className="w-3 h-3 shrink-0" />
                  <span className="truncate w-full block">Restaurar</span>
                </button>
              )}
              {index === navItems.length - 1 && (
                <button 
                  onClick={() => {
                    setIsExportOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex flex-col items-center justify-center gap-1 py-1 rounded-md text-[7px] font-black tracking-widest uppercase transition-all text-red-600 hover:bg-red-50 mt-0.5 border border-transparent hover:border-red-100"
                >
                  <Download className="w-3 h-3 shrink-0" />
                  <span className="truncate w-full block">Backup</span>
                </button>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-100 pt-2 space-y-0.5 px-1">
          <button
            onClick={() => {
              setIsResetOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 transition-all uppercase tracking-tighter"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate w-full block">Resetar</span>
          </button>
          <button
            onClick={() => {
              setIsManualOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-all uppercase tracking-tighter"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span className="truncate w-full block">Manual</span>
          </button>
          <button
            onClick={() => {
              setIsSupportOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all uppercase tracking-tighter"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate w-full block">Suporte</span>
          </button>
          <button 
            onClick={handleOpenSettings}
            className="w-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all uppercase tracking-tighter"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className="truncate w-full block">Painel</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all uppercase tracking-tighter"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="truncate w-full block">Sair</span>
          </button>
          
          <div className="pt-1.5 text-center">
            <span className="text-[7px] font-bold text-slate-800 uppercase tracking-widest pl-0.5">V 1.0.76</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4 lg:hidden sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-slate-900 uppercase">Gestão Escolar</h1>
          </div>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar bg-slate-50 relative">
          <Outlet />
        </main>
      </div>

      {/* Global Config Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Configurações do Sistema</h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Parâmetros Globais do Colégio</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Modalidade Acadêmica */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Período Acadêmico Atual
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Modalidade</label>
                      <select 
                        value={configModalidade}
                        onChange={(e) => setConfigModalidade(e.target.value as any)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                      >
                        <option value="Trimestre">Trimestre (3 períodos)</option>
                        <option value="Bimestre">Bimestre (4 períodos)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Período</label>
                      <select 
                        value={configPeriodo}
                        onChange={(e) => setConfigPeriodo(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                      >
                        {configModalidade === 'Trimestre' ? (
                          <>
                            <option value="1">1º Trimestre</option>
                            <option value="2">2º Trimestre</option>
                            <option value="3">3º Trimestre</option>
                          </>
                        ) : (
                          <>
                            <option value="1">1º Bimestre</option>
                            <option value="2">2º Bimestre</option>
                            <option value="3">3º Bimestre</option>
                            <option value="4">4º Bimestre</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Início do Período</label>
                      <input 
                        type="date"
                        value={configStartDate}
                        onChange={(e) => setConfigStartDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Fim do Período</label>
                      <input 
                        type="date"
                        value={configEndDate}
                        onChange={(e) => setConfigEndDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Identidade da Escola */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Identidade da Escola
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Nome do Colégio</label>
                      <input 
                        type="text"
                        value={configSchoolName}
                        onChange={(e) => setConfigSchoolName(e.target.value)}
                        placeholder="Ex: CE LUCAS LENIAR EF.M.P."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 mb-1 block">Logo da Escola (URL da Imagem)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={configLogoUrl}
                          onChange={(e) => setConfigLogoUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                        />
                        {configLogoUrl && (
                          <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center p-1 shrink-0">
                            <img src={configLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arquitetura de Turnos */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5" />
                    Arquitetura de Turnos (Noite)
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                    
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={configEnableNoite}
                          onChange={(e) => {
                            setConfigEnableNoite(e.target.checked);
                            if (!e.target.checked) setConfigEnableAsincrona(false);
                          }}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 checked:bg-slate-900 checked:border-slate-900 transition-all cursor-pointer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-slate-800 uppercase block mb-0.5 group-hover:text-slate-900 transition-colors">Habilitar Período Noturno</span>
                        <p className="text-[9.5px] text-slate-500 font-medium leading-relaxed">
                          Libera a criação e o manejo de turmas e salas para a grade da noite.
                        </p>
                      </div>
                    </label>

                    {configEnableNoite && (
                      <div className="pl-8 !mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="flex items-start gap-3 cursor-pointer group p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                            <input 
                              type="checkbox" 
                              checked={configEnableAsincrona}
                              onChange={(e) => setConfigEnableAsincrona(e.target.checked)}
                              className="peer appearance-none w-4 h-4 border-2 border-purple-300 rounded focus:ring-2 focus:ring-purple-600 focus:ring-offset-1 checked:bg-purple-600 checked:border-purple-600 transition-all cursor-pointer"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-purple-900 uppercase tracking-widest block mb-0.5 group-hover:text-purple-700 transition-colors">Grade: 5 Aulas + 1 Assíncrona</span>
                            <p className="text-[9px] text-purple-600/80 font-bold leading-relaxed">
                              Define a 6ª aula da noite como componente online (não aloca salas ou laboratórios, e usa carga reservada).
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chave da API Gemini */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" />
                    Chave de API (Google Gemini)
                  </h4>
                  <div>
                    <input 
                      type="password"
                      value={configApiKey}
                      onChange={(e) => setConfigApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-500 bg-slate-50"
                    />
                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed mt-1.5 ml-1">
                      Necessária para habilitar as funções de Inteligência Artificial no sistema, como sugestões de otimização de horário.
                    </p>
                  </div>
                </div>

              </div>

              <div className="mt-8 flex gap-3 pt-5 border-t border-slate-100">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-3 font-bold text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Recarregar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                    <Save size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Restaurar Backup</h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Importar arquivo .txt</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsImportOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-5">
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  Para restaurar os seus dados, clique no botão abaixo e selecione o <span className="font-bold text-slate-700">arquivo de backup (.txt)</span> que você salvou anteriormente.
                </div>
                
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 block">Atenção:</span>
                  <p className="text-[9.5px] text-emerald-700 font-medium leading-normal">
                    Importar um arquivo de backup irá <span className="font-bold">substituir todos os dados atuais</span> do colégio. Essa ação é <span className="font-bold">irreversível</span>.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md">
                    <Save className="w-4 h-4" />
                    Escolher arquivo de Backup (.txt)
                    <input 
                      type="file" 
                      accept=".txt"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportConfirmOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Save className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Confirmar Importação</h3>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  A importação irá substituir TODOS os dados atuais (professores, matérias e horários). Essa ação é irreversível.
                  Deseja mesmo continuar e apagar os dados atuais?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setIsImportConfirmOpen(false); setPendingImportData(null); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmImport}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold uppercase transition-colors shadow-sm"
                  >
                    Sim, Importar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center shrink-0">
                    <Download size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Gerar Backup do Sistema</h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Exportar arquivo .txt Completo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExportOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-5">
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  Esta opção fará o download da base completa do seu sistema. Isso inclui: <span className="font-bold text-slate-700">todas as turmas, professores, matérias, configurações e a grade de horários completa.</span>
                </div>
                
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-800 block">Dica de Segurança:</span>
                  <p className="text-[9.5px] text-red-700 font-medium leading-normal">
                    Salve este arquivo em um local seguro como Pen Drive ou Google Drive. Ele poderá ser usado para <span className="font-bold underline">Restaurar o Sistema</span> ou transferi-lo para outro computador!
                  </p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleExportBackup}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Gerar e Baixar .txt Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResetOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resetar Tudo</h2>
                    <p className="text-[10px] text-slate-500 font-medium">Você está prestes a apagar completamente os dados.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsResetOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-2 text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed font-bold">
                      Isso apagará todas as disciplinas, professores, turmas e grade de horários do navegador local.
                      <span className="block mt-1 font-black underline">Esta operação é irreversível se você não tiver feito backup.</span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1">
                    Confirme o código do sistema:
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="••••••"
                    autoFocus
                  />
                  {resetError && <p className="text-[10px] text-red-600 mt-1 font-bold">{resetError}</p>}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !resetPassword}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isResetting ? 'Aguarde...' : 'Confirmar e Apagar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSupportOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Suporte Técnico</h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Contato direto via WhatsApp</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSupportOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 pt-4 space-y-5">
                <div className="text-xs text-slate-500 font-medium leading-relaxed">
                  O suporte técnico do sistema é realizado <strong className="text-slate-700">exclusivamente pelo WhatsApp</strong> para garantir um atendimento rápido e direto.
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase tracking-wider">Módulo do Sistema</label>
                    <select 
                      value={supportModule}
                      onChange={(e) => setSupportModule(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50 transition-all"
                    >
                      <option value="Geral (Dúvidas/Sugestões)">Geral (Dúvidas/Sugestões) 💭</option>
                      <option value="Dashboard & Import/Export">Dashboard & Configurações ⚙️</option>
                      <option value="Quadro de Horários">Quadro de Horários 📅</option>
                      <option value="Gestão de Professores">Gestão de Professores 👩‍🏫</option>
                      <option value="Gestão de Turmas/Alunos">Gestão de Turmas/Alunos 🎓</option>
                      <option value="Gestão de Disciplinas">Gestão de Disciplinas 📚</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 mb-1 block uppercase tracking-wider">Descreva brevemente o problema/dúvida</label>
                    <textarea 
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Ex: Não consigo gerar a grade do 1º ano da manhã..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50 min-h-[80px] resize-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex gap-3 items-center">
                  <div className="bg-emerald-100 p-2 rounded-lg shrink-0 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-800 block">WhatsApp: (42) 98886-9655</span>
                    <p className="text-[9px] text-emerald-700 font-medium leading-normal mt-0.5">
                      Você será redirecionado para o chat com a mensagem preenchida.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button 
                    onClick={() => setIsSupportOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSupportSend}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chamar no WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManualOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-700">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
                      Manual do Sistema
                    </h3>
                    <p className="text-[10px] text-slate-800 font-bold uppercase tracking-wide mt-1">
                      Aprenda a configurar e gerenciar todos os módulos do sistema
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManualOpen(false)} 
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex flex-1 overflow-hidden min-h-0 bg-slate-50">
                {/* Tabs Sidebar */}
                <div className="w-1/4 max-w-[240px] border-r border-slate-200 bg-white p-4 space-y-1.5 overflow-y-auto shrink-0 custom-scrollbar">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-2 mb-2 font-sans">Módulos</span>
                  
                  {[
                    { id: 'geral', label: '1. Visão Geral', icon: LayoutDashboard },
                    { id: 'horarios', label: '2. Horários', icon: CalendarDays },
                    { id: 'professores', label: '3. Professores', icon: Users },
                    { id: 'alunos', label: '4. Turmas', icon: GraduationCap },
                    { id: 'disciplinas', label: '5. Disciplinas', icon: BookOpen },
                    { id: 'atas', label: '6. Atas de Reunião', icon: FileText }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = manualActiveTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setManualActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-all border cursor-pointer ${
                          isActive 
                            ? 'bg-amber-50 text-amber-900 border-amber-200 shadow-sm' 
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-white custom-scrollbar">
                  {manualActiveTab === 'geral' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <LayoutDashboard className="w-4 h-4 text-indigo-600 px-0.5" />
                        1. Visão Geral e Dashboard
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Bem-vindo ao <strong>Sistema de Gestão Escolar Integrado</strong>. Na tela inicial (Dashboard) você encontra uma visão geral rápida da situação e status de gerência de tempo e professores.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Configurar Sistema:</strong> Altere as propriedades fundamentais como Nome do Colégio, Logotipo, Modalidades de Período Acadêmico (Trimestre/Bimestre) e ative a arquitetura estrutural do turno Noturno se houver.</li>
                          <li><strong>Importar e Gerar Backup (.txt):</strong> Mantenha a integridade de seus dados sempre alta gerando backups em formato JSON puro que podem ser compartilhados offline ou enviados via WhatsApp por segurança, e restaurados utilizando a opção Importar Backup. A importação <strong className="text-red-500">substituirá</strong> os dados atuais!</li>
                          <li><strong>Identidade e Menus:</strong> Toda a navegação se encontra encapsulada nas abas laterais do painel esquerdo, que é adaptativo para tablets e smartphones (sendo escondido sob um menu "hamburguer").</li>
                          <li><strong>Versionamento:</strong> O sistema mantém controle estrito de versões a fim de auxiliar manutenções de infraestrutura com apoio do Professor Lucas M. Leniar.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'horarios' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <CalendarDays className="w-4 h-4 text-amber-500 px-0.5" />
                        2. Sistema Gerador de Horários
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          A área de "Horários" é o coração estratégico da aplicação, responsável por calcular, validar e alocar recursos letivos baseando-se estritamente na <strong>disponibilidade cadastrada dos Professores</strong> e nas restrições curriculares das Disciplinas.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Visão Geral:</strong> Exibe a grade real separada por turmas ou laboratórios. Dias e janelas de aulas são exibidos lado a lado num quadrante estático. Lembre-se, o turno da noite possui arquitetura de 5 tempos caso selecionado, ou 5 aulas + 1 tempo assíncrono final se a opção da carga EAD noturna estiver ativada nas configurações.</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Alocação Automática:</strong> Use "Gerar Auto" para usar os algoritmos internos de alocação de tempo buscando preencher todas as janelas possíveis seguindo restrições hardcoded e disponibilidade de professores.</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Alocação e Edição Manual:</strong> Pressionando nas lacunas temporais para editar, o processo torna-se inteiramente Manual.
                            <ul className="list-[circle] pl-4 mt-1 space-y-1">
                              <li><strong>Aulas Geminadas:</strong> O sistema sugere aulas duplas (geminadas) para professores que têm esta preferência. Caso ativado, os cálculos de carga horária e conflitos englobarão os 2 tempos. Se a disciplina necessitar de laboratório, serão alocados simultaneamente os 2 tempos na sala da turma, e os 2 tempos na sala do laboratório (espelhamento).</li>
                              <li><strong>Associação com Laboratórios (Inteligente):</strong> Se você selecionar uma Matéria que exige laboratórios, a opção de "Espelhar em Sala Especial?" selecionará e carimbará o primeiro laboratório correspondente que estiver livre neste horário <strong>automaticamente</strong>.</li>
                              <li><strong>Conflitos de Espaço Físico:</strong> Se existirem apenas laboratórios ocupados por outras turmas no horário escolhido, o sistema exibirá um aviso alertando qual turma está nele. O sistema permitirá "Forçar Troca", onde a sua turma atual "tomará a posse" da sala, e a turma que anteriormente possuia a reserva da sala perderá apenas o espelhamento no laboratório (mas terá sua aula regular na sala de aula convencional inalterada).</li>
                            </ul>
                          </li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Reorganização Rápida (Arrastar e Soltar):</strong> Você pode arrastar uma aula (clique, segure e mova) para uma lacuna vazia no calendário ou sobre uma aula existente para realizar a troca direta de dias e horários - a funcionalidade de drag and drop obedece as seguintes checagens:
                            <ul className="list-[circle] pl-4 mt-1 space-y-1">
                              <li>A reorganização manual <strong>só é permitida dentro da própria turma</strong> para não corromper os cálculos internos de carga horária do sistema gerador completo.</li>
                              <li>Se a aula movida for vinculada a algum laboratório, todo o espelhamento acompanhará a aula ou acusará erro caso o laboratório de destino já esteja ocupado naquele horário.</li>
                            </ul>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'professores' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <Users className="w-4 h-4 text-emerald-600 px-0.5" />
                        3. Gestão e Disponibilidade de Professores
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Os docentes guiam as regras de restrição primárias do gerador. Neste painel de tabelas gerencie quem é apto a lecionar qual grade de aulas. 
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Controle de Horas (Grade de Disponibilidade Pessoal):</strong> Quando um docente for inserido na base, defina suas janelas de tempo "cinzas" (bloqueadas) ou disponíveis.</li>
                          <li><strong>Vinculando Conhecimentos:</strong> Um professor de matemática também pode apresentar compatibilidade a disciplinas Eletivas. Atribua estas matérias na edição do seu cartão ou crie sub-registros de matérias genéricas e permita o docente ser sorteado pelo construtor.</li>
                          <li><strong>Limites da Carga Letiva Exata:</strong> Você deve evitar que o sistema crie turmas exaustivas adicionando um teto rígido numérico na ficha do docente que indica as aulas globais que o mesmo pode lecionar.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'alunos' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <GraduationCap className="w-4 h-4 text-pink-600 px-0.5" />
                        4. Distribuição de Turmas e Infraestrutura
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          A aba de Turmas gerencia as salas físicas da escola, divididas em duas grandes categorias: as <strong>Turmas Padrões</strong> (que acomodam os alunos regularmente) e as <strong>Salas Especiais/Laboratórios</strong>.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Turmas Regulares:</strong> Armazena o corpo discente físico alocado (como os agrupamentos de 1º ano B - Tarde). Cada turma possui um limite de preenchimento diário (geralmente até a 5ª ou 6ª aula).</li>
                          <li><strong>Cadastro de Salas Especiais (Laboratórios, Quadras, etc):</strong> Você pode cadastrar ambientes de infraestrutura (Laboratório de Informática, Quadra de Esportes, Sala de Artes) no botão "Adicionar Sala Especial". Estas salas não "pertencem" a alunos fixos, mas são utilizadas pelas turmas de modo rotativo.
                            <ul className="list-[circle] pl-4 mt-1 space-y-1">
                              <li><strong>Cores Customizadas:</strong> Atribua uma cor ao laboratório para fácil distinção visual na view de Horários.</li>
                              <li><strong>Visualização Isolada:</strong> No módulo de Horários, alternei a visualização para "Ver Salas Especiais" e você terá um calendário focado apenas na ocupação de todos os laboratórios cadastrados, verificando conflitos de infraestrutura.</li>
                            </ul>
                          </li>
                          <li><strong>Vinculação com Disciplinas:</strong> No módulo de Disciplinas, você poderá marcar uma matéria (ex: Educação Física) para exigir ou utilizar essas Salas Especiais (ex: Quadra). O gerador de horários usará esta infraestrutura automaticamente para espelhar a aula e ocupar a sala.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'disciplinas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <BookOpen className="w-4 h-4 text-blue-600 px-0.5" />
                        5. Especificações Curriculares (Disciplinas)
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          O módulo de matrizes armazena a essência acadêmica e alicerça bloqueios cruciais limitantes das metodologias (séries iniciais não podem ter turmas de Sociologia se bloqueadas via menu de edições).
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Restrições de Séries:</strong> Ensino fundamental II não deverá obter as grades típicas limitadas ao nível médio. Selecione as matrizes no ato de inserção. </li>
                          <li><strong>Vínculo Específico (Lista Fechada):</strong> Insira um itinerário que existe apenas em uma turma especial? Ative checkboxes de whitelisting marcando as turmas compatíveis, isolando-as de distribuições generalistas feitas pelo Gerador.</li>
                          <li><strong>Customização Carga Horária:</strong> Na interface de aulas esperadas da disciplina, indique quantas matérias em janelas aquela turma precisa semanalmente.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'atas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <FileText className="w-4 h-4 text-orange-600 px-0.5" />
                        6. Módulo de Atas de Reunião Escolar
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Um gerenciador auxiliar textual criado com padrões oficiais para agilizar emissão de documentações comprobatórias de atos legais, conselhos de avaliações, pautas diárias ou assembleias. O documento gera automaticamente formatação exigida em impressões de atas fiscais e armazena rasconhos permanentes nos navegadores locais ou via download backup em extensão JSON.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
