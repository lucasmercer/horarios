import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Download, Upload, Trash2, Code, Database, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function DataManager() {
  const [stats, setStats] = useState({
    teachers: 0,
    turmas: 0,
    subjects: 0,
    schedules: 0,
    substitutions: 0,
    notices: 0,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    try {
      setStats({
        teachers: JSON.parse(localStorage.getItem('cecm_teachers') || '[]').length,
        turmas: JSON.parse(localStorage.getItem('cecm_turmas') || '[]').length,
        subjects: JSON.parse(localStorage.getItem('cecm_subjects') || '[]').length,
        schedules: Object.keys(JSON.parse(localStorage.getItem('cecm_schedules') || '{}')).length,
        substitutions: JSON.parse(localStorage.getItem('cecm_substitutions') || '[]').length,
        notices: JSON.parse(localStorage.getItem('cecm_notices') || '[]').length,
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const data = {
        teachers: JSON.parse(localStorage.getItem('cecm_teachers') || '[]'),
        subjects: JSON.parse(localStorage.getItem('cecm_subjects') || '[]'),
        turmas: JSON.parse(localStorage.getItem('cecm_turmas') || '[]'),
        schedules: JSON.parse(localStorage.getItem('cecm_schedules') || '{}'),
        substitutions: JSON.parse(localStorage.getItem('cecm_substitutions') || '[]'),
        notices: JSON.parse(localStorage.getItem('cecm_notices') || '[]'),
        version: localStorage.getItem('cecm_version') || '74',
        logoUrl: localStorage.getItem('cecm_logo_url') || '',
        schoolName: localStorage.getItem('cecm_school_name') || 'CE LUCAS LENIAR EF.M.P.',
        timeRangesManha: JSON.parse(localStorage.getItem('cecm_time_ranges_manha') || 'null'),
        timeRangesTarde: JSON.parse(localStorage.getItem('cecm_time_ranges_tarde') || 'null'),
        timeRangesNoite: JSON.parse(localStorage.getItem('cecm_time_ranges_noite') || 'null'),
        enableNoite: localStorage.getItem('enable_noite_period') === 'true',
        enableNoiteAsynchronous: localStorage.getItem('enable_noite_asynchronous') === 'true',
        isCivicoMilitar: localStorage.getItem('cecm_is_civico_militar') === 'true',
        techCourseName: localStorage.getItem('cecm_tech_course_name') || 'Marketing',
        academicSystem: localStorage.getItem('cecm_academic_system'),
        academicDates: JSON.parse(localStorage.getItem('cecm_academic_dates') || '{}'),
        exportDate: new Date().toISOString(),
        appName: "GE-Scheduler"
      };

      for (const key in data) {
        if ((data as any)[key] === null) delete (data as any)[key];
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const timeStr = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '');
      link.download = `backup_completo_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
    }, 600);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('idle');

    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.appName || data.appName !== "GE-Scheduler") {
            setImportStatus('error');
            setImportMessage('Arquivo incompatível. Certifique-se de ser um backup gerado por este sistema.');
            setIsImporting(false);
            return;
          }

          if (data.teachers) localStorage.setItem('cecm_teachers', JSON.stringify(data.teachers));
          if (data.subjects) localStorage.setItem('cecm_subjects', JSON.stringify(data.subjects));
          if (data.turmas) localStorage.setItem('cecm_turmas', JSON.stringify(data.turmas));
          if (data.schedules) localStorage.setItem('cecm_schedules', JSON.stringify(data.schedules));
          if (data.substitutions) localStorage.setItem('cecm_substitutions', JSON.stringify(data.substitutions));
          if (data.notices) localStorage.setItem('cecm_notices', JSON.stringify(data.notices));
          
          if (data.logoUrl !== undefined) localStorage.setItem('cecm_logo_url', data.logoUrl);
          if (data.schoolName !== undefined) localStorage.setItem('cecm_school_name', data.schoolName);
          if (data.enableNoite !== undefined) localStorage.setItem('enable_noite_period', data.enableNoite ? 'true' : 'false');
          if (data.enableNoiteAsynchronous !== undefined) localStorage.setItem('enable_noite_asynchronous', data.enableNoiteAsynchronous ? 'true' : 'false');
          if (data.isCivicoMilitar !== undefined) localStorage.setItem('cecm_is_civico_militar', data.isCivicoMilitar ? 'true' : 'false');
          if (data.techCourseName) localStorage.setItem('cecm_tech_course_name', data.techCourseName);
          
          loadStats();
          setImportStatus('success');
          setImportMessage('Banco de dados restaurado com sucesso! Os recursos do sistema foram atualizados.');
        } catch (err) {
          setImportStatus('error');
          setImportMessage('Erro crítico ao ler o arquivo JSON. O arquivo pode estar corrompido.');
        }
        setIsImporting(false);
      }, 800);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleClearDatabase = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetError('');
    setIsResetting(true);

    if (resetPassword !== 'ccm2024') {
      setIsResetting(false);
      setResetError('Senha incorreta.');
      return;
    }

    setTimeout(() => {
      const keysToRemove = Object.keys(localStorage).filter(k => 
        k.startsWith('cecm_') || 
        k.startsWith('enable_noite_')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      loadStats();
      setIsClearConfirmOpen(false);
      setIsResetting(false);
      setResetPassword('');
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center bg-slate-50/50 min-h-full font-sans tracking-tight">
      <div className="w-full max-w-4xl p-4 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Database className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gerenciador de Banco de Dados</h1>
              <p className="text-sm font-medium text-slate-500 mt-1 max-w-xl">
                O formato do seu sistema de gestão é puramente offline e seguro, utilizando arquivos reais estruturados (.json) em vez de bancos de dados em nuvem. Você possui total controle do fluxo.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Turmas Cadastradas" value={stats.turmas || '0'} unit="turmas" />
          <StatCard title="Docentes" value={stats.teachers || '0'} unit="professores" />
          <StatCard title="Disciplinas (Matriz)" value={stats.subjects || '0'} unit="cadastros" />
          <StatCard title="Horários Salvos" value={stats.schedules || '0'} unit="grades" />
        </div>

        {importStatus === 'success' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold">{importMessage}</p>
          </motion.div>
        )}

        {importStatus === 'error' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-bold">{importMessage}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Export */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Exportar Backup (.json)</h2>
            <p className="text-xs font-medium text-slate-500 mb-6 min-h-[40px] leading-relaxed">
              Realize o download rotineiro para proteger suas informações de planejamento contra formatações de computador.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide py-3.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isExporting ? 'Gerando Pacote...' : 'Fazer Download Seguro'}
            </button>
          </div>

          {/* Card: Import */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Restaurar Banco (.json)</h2>
            <p className="text-xs font-medium text-slate-500 mb-6 min-h-[40px] leading-relaxed">
              Carregue toda a sua base de dados instantaneamente de volta ao sistema a partir de um arquivo anterior.
            </p>
            <label className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide py-3.5 px-4 rounded-xl transition-all cursor-pointer">
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {isImporting ? 'Lendo e Indexando...' : 'Selecionar Arquivo'}
              <input
                type="file"
                accept=".json,.txt"
                className="hidden"
                disabled={isImporting}
                ref={fileInputRef}
                onChange={handleImport}
              />
            </label>
          </div>
        </div>

        {/* Card: WIPE OUT */}
        <div className="bg-white rounded-3xl p-6 border-2 border-red-50 hover:border-red-100 transition-colors flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flexItems-center gap-4 flex-1">
            <div className="flex-1">
              <h3 className="text-sm font-black text-red-600 uppercase tracking-wider mb-1">Zona de Perigo (Reset GERAL)</h3>
              <p className="text-xs font-semibold text-slate-500">Isto apagará permanentemente as grades curriculares formatadas, turmas e históricos salvos localmente no momento.</p>
            </div>
          </div>
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="shrink-0 flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold text-xs tracking-wide py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Apagar Banco Inteiro
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isClearConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
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
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleClearDatabase} className="space-y-4">
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
                  />
                  {resetError && <span className="text-[10px] items-center gap-1 font-black text-red-500 uppercase mt-1 flex"><AlertCircle className="w-3 h-3" /> {resetError}</span>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isResetting || !resetPassword}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md shadow-red-600/20"
                  >
                    {isResetting ? (
                      <span className="animate-pulse">Formatando...</span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Formatar Tudo
                      </>
                    )}
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

function StatCard({ title, value, unit }: { title: string, value: string | number, unit: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-center gap-1 hover:border-indigo-100 transition-colors group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-none tracking-tighter">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 capitalize">{unit}</span>
      </div>
    </div>
  );
}
