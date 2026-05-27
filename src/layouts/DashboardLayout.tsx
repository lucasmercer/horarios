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
  AlertCircle,
  Check
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
  const [configIsCivicoMilitar, setConfigIsCivicoMilitar] = useState(false);
  const [configApiKey, setConfigApiKey] = useState('');

  const handleOpenSettings = () => {
    setConfigSchoolName(localStorage.getItem('cecm_school_name') || 'CE LUCAS LENIAR EF.M.P.');
    setConfigLogoUrl(localStorage.getItem('cecm_logo_url') || '');
    setConfigEnableNoite(localStorage.getItem('enable_noite_period') === 'true');
    setConfigEnableAsincrona(localStorage.getItem('enable_noite_asynchronous') === 'true');
    setConfigIsCivicoMilitar(localStorage.getItem('cecm_is_civico_militar') === 'true');
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
    localStorage.setItem('cecm_is_civico_militar', configIsCivicoMilitar ? 'true' : 'false');
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
    localStorage.setItem('cecm_academic_system', configModalidade === 'Trimestre' ? 'Trimestral' : 'Bimestral');
    localStorage.setItem('cecm_academic_period', configPeriodo);
    
    if (configStartDate) {
      const [y, m, d] = configStartDate.split('-');
      if (y && m && d) localStorage.setItem('cecm_academic_start', `${d}/${m}`);
    }
    if (configEndDate) {
      const [y, m, d] = configEndDate.split('-');
      if (y && m && d) localStorage.setItem('cecm_academic_end', `${d}/${m}`);
    }

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

                {/* Perfil da Instituição */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Modelo / Perfil da Instituição (SEED-PR)
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {/* Option 1: Colégio Estadual Regular */}
                    <button
                      type="button"
                      onClick={() => setConfigIsCivicoMilitar(false)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        !configIsCivicoMilitar
                          ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/10'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        !configIsCivicoMilitar ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                      }`}>
                        {!configIsCivicoMilitar && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight mb-0.5">Colégio Estadual Regular</span>
                        <span className="text-[10px] text-slate-500 leading-snug block">
                          Modalidade de ensino estadual regular padrão da SEED-PR (inclui Projeto de Vida, Ed. Financeira/Digital de forma padrão).
                        </span>
                      </div>
                    </button>

                    {/* Option 2: Colégio Estadual Cívico-Militar */}
                    <button
                      type="button"
                      onClick={() => setConfigIsCivicoMilitar(true)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        configIsCivicoMilitar
                          ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/10'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className={`mt-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        configIsCivicoMilitar ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                      }`}>
                        {configIsCivicoMilitar && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight mb-0.5">Colégio Cívico-Militar (CCM)</span>
                        <span className="text-[10px] text-slate-500 leading-snug block">
                          Modalidade de ensino cívico-militar (CCM-PR) com matriz curricular adaptada (Cidadania e Civismo, etc.).
                        </span>
                      </div>
                    </button>
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
                          Bem-vindo ao <strong>Sistema de Gestão Escolar Integrado</strong>. Na tela inicial (Dashboard) você encontra uma visão geral rápida da situação e status de gerência do preenchimento das turmas e possíveis conflitos no algoritmo matricial.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Métricas:</strong> O quadro exibe uma porcentagem em tempo real sobre a alocação de aulas e aponta a quantidade exata de conflitos pendentes (com atalho direto para a grade visual de conflitos) e o total de faltas ou cargas letivas excedidas.</li>
                          <li><strong>Configurar Sistema:</strong> Altere as propriedades fundamentais como Nome do Colégio, Logotipo, Modalidades de Período Acadêmico (Trimestre/Bimestre) e ative a arquitetura de horários customizada ou turnos noturnos.</li>
                          <li><strong>Exportar e Importar Backup (.gec ou .json):</strong> Exporte toda a estrutura do sistema (turmas, docentes, disciplinas e horários configurados) de backup como arquivo e restaure a qualquer instante. <strong className="text-red-500">A importação substitui totalmente seus dados locais!</strong></li>
                          <li><strong>Acompanhamento:</strong> Você avista o TOP 5 professores com maior carga letiva na escola, além de acessar de forma veloz o controle local temporário em seu cache de navegação.</li>
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
                          O módulo "Horários" é o coração estratégico da aplicação, responsável por calcular, validar e alocar aulas baseando-se restritamente na <strong>disponibilidade dos Docentes</strong> e nas exigências ou parâmetros criados para as Disciplinas.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Visão Turmas x Salas Especiais:</strong> Use a engrenagem no topo de configurações e intercale se deseja visualizar e formatar a escala observando de fora o âmbito de Turma Padrão Geral ou as matrizes espelhadas de Laboratórios Isolados (verificando reservas de ambientes físicos específicos).</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Alocação Automática x Assistente:</strong> Pressione "Assistente" (ícone Mágica) para abrir o painel inteligente e o sistema preencher as lacunas vazias otimizando cruzamentos sem quebrar bloqueios de horários dos profissionais ou restrições de salas geminadas.</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Alocação e Edição Manual Interativa:</strong> Clique vazio num slot (célula) e será sugerido a alocação disponível, considerando conflitos de sobreposições em tempo real (que sinalizará de imediato as turmas impactadas informando "Professor Indisponível" ou "Professor no 1ºA").</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Espelhamento em Salas Especiais (Métrica de Carga):</strong> Quando uma disciplina vinculada a um laboratório é alocada, ambos (a turma presencial e a sala do laboratório) exibirão aquele horário. Contudo, essa inserção <strong>não conta como "aula a mais"</strong>. É um espelhamento puramente logístico: A carga real dada pelo professor continua sendo apenas 1 aula, e o volume total da matéria também não dobra.</li>
                          <li><strong className="text-slate-900 text-[11px] block mt-2">Arrastar e Soltar:</strong> Você pode transferir e permutar componentes de ensino arrastando blocos e trocando duas disciplinas ou dias alocados. Conflitos graves no arrastar e soltar poderão deletar lacunas se um professor não constar como disponível ou o laboratório de destino estiver tomado pela capacidade de outra escola.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'professores' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <Users className="w-4 h-4 text-emerald-600 px-0.5" />
                        3. Gestão de Professores
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Painel para gestão de regras de alocação pessoal. Neste módulo você gerencia a aptidão, disponibilidade horária, além de estabelecer travas por turno garantindo bem estar da carga humana em sua instituição.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Controle de Disponibilidade Visual:</strong> Cada período (manha/tarde/noite) dispõe de matriz em checkbox definindo janelas de bloqueio (onde o gerador nunca colocará aquele determinado professor).</li>
                          <li><strong>Regras de Intervalo e Aulas Geminadas:</strong> Force o sistema interligar "aulas duplas no mesmo dia" caso uma rotina exija que um conteúdo não seja repassado separadamente, bem como estipular o intervalo obrigatório protetor para troca entre fluxos Tarde e Noite para descanso.</li>
                          <li><strong>Limites da Carga Letiva:</strong> Delimitar teto macro global geral (ex: 20 aulas do concurso e encerramento para outra escola), ou se preferir, configurar micro-tetos fragmentados estipulando que o limite deste professor ocorre separadamente até "Manhã: 5," "Tarde: 2". Estes cálculos evitarão sub-aproveitação da força docente de sua arquitetura.</li>
                          <li><strong>Limitações e Associações Diretivas:</strong> Associar professor X apenas com a turma A em tal disciplina específica (atribuição forçada ou whitelisting).</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'alunos' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <GraduationCap className="w-4 h-4 text-pink-600 px-0.5" />
                        4. Turmas e Ambientes Computacionais (Salas Especiais)
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          A aba gerencia as entidades da escola, divididas puramente entre <strong>Turmas Regulares Clássicas</strong> (que acomodam os alunos num período definido para processamentos curriculares) e as <strong>Salas Especiais</strong>.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Turmas Regulares:</strong> Cadastre com a respectiva quantidade formativa do turno englobando o teto e a extensão acadêmica.</li>
                          <li><strong>Cadastro de Salas Especiais:</strong> Ambientes de alta infraestrutura flutuante que funcionam nos três turnos da instituição como Laboratórios, Quadras de Esportes, entre outros. O seu funcionamento atinge "status ocupado" permitindo interceção sem que seja interpretada a lógica de choque em disciplinas (duas aulas no mesmo laboratório causarão conflito de espaço).</li>
                          <li>Atribua cores vivas diferentes a infraestrutura especial permitindo ao leitor humano acompanhar de forma relacional dentro da emissão da tela onde está acontecendo uma eventual sobreposição letiva na interface dos "Gerentes de Conflitos".</li>
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
                          O módulo base armazena as dependências teóricas de ensinos e rege todo a volumetria que guiará a demanda matemática da geração computacional final da grade.
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 font-sans">
                          <li><strong>Carga Horária e Customização Excepcional:</strong> Você molda quantas janelas representativas cada disciplina contém numa base global. Além de flexibilizar uma quantidade "diferenciada" permitindo o módulo injetar que a turma B possua 2 tempos deste componente, enquanto que nativamente uma distribuição das turmas da Manhã consuma sempre 3 horários. </li>
                          <li><strong>Exigências por Infraestrutura (Salas):</strong> Declare obrigatoriedades vinculativas indicando que "Robótica" será espelhada exaustivamente apenas para Laboratório Informática 1, impedindo cruzamentos indesejados nas salas não-equipadas da central regular.</li>
                          <li><strong>Teto Disciplinar e Restrições de Níveis:</strong> Exilia-se as disciplinas específicas apenas entre Fundamental e/ou Médio, evitando choque em filtragens do formulário ou permitindo que componentes itinerários se restrinjam 1 ou 2 grupos alvos especiais selecionados no cardápio flutuante local.</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {manualActiveTab === 'atas' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                        <FileText className="w-4 h-4 text-orange-600 px-0.5" />
                        6. Módulo Auxiliar: Emissor de Atas
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 font-sans leading-relaxed">
                        <p>
                          Gerenciador de documentos burocráticos textuais criado para secretarias extraírem redações formatadas oficias (leis e atas escolares normatizadas) otimizando impressões e gerando registros rascunho de conselhos rotineiros. Salvamento interno integrado e exportações independentes.
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
