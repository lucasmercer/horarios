import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Download, Upload, Trash2, Database, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

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
      const certKeys = Object.keys(localStorage).filter(k => k.startsWith('preset_template_'));
      const certificatePresets: Record<string, any> = {};
      certKeys.forEach(k => {
        certificatePresets[k] = JSON.parse(localStorage.getItem(k) || 'null');
      });

      const data = {
        teachers: JSON.parse(localStorage.getItem('cecm_teachers') || '[]'),
        subjects: JSON.parse(localStorage.getItem('cecm_subjects') || '[]'),
        turmas: JSON.parse(localStorage.getItem('cecm_turmas') || '[]'),
        schedules: JSON.parse(localStorage.getItem('cecm_schedules') || '{}'),
        substitutions: JSON.parse(localStorage.getItem('cecm_substitutions') || '[]'),
        notices: JSON.parse(localStorage.getItem('cecm_notices') || '[]'),
        roomReservations: JSON.parse(localStorage.getItem('cecm_room_reservations') || '[]'),
        roomLayout: JSON.parse(localStorage.getItem('cecm_room_layout') || '{}'),
        certificatePresets: certificatePresets,
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
          const rawData = JSON.parse(content);
          
          if (!rawData.appName || rawData.appName !== "GE-Scheduler") {
            setImportStatus('error');
            setImportMessage('Arquivo incompatível. Certifique-se de ser um backup gerado por este sistema.');
            setIsImporting(false);
            return;
          }

          import('../lib/validation').then(({ BackupSchema }) => {
            const validation = BackupSchema.safeParse(rawData);
            if (!validation.success) {
              console.error("Validation error:", validation.error);
              setImportStatus('error');
              setImportMessage('O arquivo JSON possui formato inválido ou corrompido. Falha de validação estrutural.');
              setIsImporting(false);
              return;
            }

            const data = validation.data;

            if (data.teachers) localStorage.setItem('cecm_teachers', JSON.stringify(data.teachers));
            if (data.subjects) localStorage.setItem('cecm_subjects', JSON.stringify(data.subjects));
            if (data.turmas) localStorage.setItem('cecm_turmas', JSON.stringify(data.turmas));
            if (data.schedules) localStorage.setItem('cecm_schedules', JSON.stringify(data.schedules));
            if (data.substitutions) localStorage.setItem('cecm_substitutions', JSON.stringify(data.substitutions));
            if (data.notices) localStorage.setItem('cecm_notices', JSON.stringify(data.notices));
            if (data.roomReservations) localStorage.setItem('cecm_room_reservations', JSON.stringify(data.roomReservations));
            if (data.roomLayout) localStorage.setItem('cecm_room_layout', JSON.stringify(data.roomLayout));
            if (data.certificatePresets) {
              Object.keys(data.certificatePresets).forEach(k => {
                localStorage.setItem(k, JSON.stringify(data.certificatePresets![k]));
              });
            }
            
            if (data.logoUrl !== undefined) localStorage.setItem('cecm_logo_url', data.logoUrl);
            if (data.schoolName !== undefined) localStorage.setItem('cecm_school_name', data.schoolName);
            if (data.enableNoite !== undefined) localStorage.setItem('enable_noite_period', data.enableNoite ? 'true' : 'false');
            if (data.enableNoiteAsynchronous !== undefined) localStorage.setItem('enable_noite_asynchronous', data.enableNoiteAsynchronous ? 'true' : 'false');
            if (data.isCivicoMilitar !== undefined) localStorage.setItem('cecm_is_civico_militar', data.isCivicoMilitar ? 'true' : 'false');
            if (data.techCourseName) localStorage.setItem('cecm_tech_course_name', data.techCourseName);
            
            loadStats();
            setImportStatus('success');
            setImportMessage('Banco de dados restaurado com segurança! Dados reindexados com sucesso.');
            setIsImporting(false);
          }).catch(err => {
             console.error("Zod schema load error:", err);
             setImportStatus('error');
             setImportMessage('Erro interno ao carregar validador de arquivo.');
             setIsImporting(false);
          });
        } catch (err) {
          setImportStatus('error');
          setImportMessage('Erro ao interpretar o JSON do backup. O arquivo pode estar corrompido.');
          setIsImporting(false);
        }
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
      setResetError('Senha de segurança incorreta.');
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
    <div className="flex-1 w-full bg-slate-50 flex flex-col p-4 md:p-8 animate-in fade-in duration-300 overflow-y-auto font-sans selection:bg-slate-200">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gerenciador de Dados</span>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Importação, Exportação e Backup</h1>
              <p className="text-xs font-semibold text-slate-500">Isto é um sistema offline e seguro. Toda a sua base de dados reside no seu navegador.</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Turmas Ativas" value={stats.turmas} unit="turmas" />
          <StatCard title="Professores" value={stats.teachers} unit="docentes" />
          <StatCard title="Disciplinas Cadastradas" value={stats.subjects} unit="matrizes" />
          <StatCard title="Grades de Horários" value={stats.schedules} unit="salvas" />
        </div>

        {importStatus === 'success' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold">{importMessage}</p>
          </motion.div>
        )}

        {importStatus === 'error' && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-100 flex items-center gap-3">
            <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            <p className="text-xs font-bold">{importMessage}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/85 shadow-xs flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-700">
                <Download className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1.5">Exportar Base Completa</h2>
              <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                Baixe um arquivo JSON com todas as configurações locais do seu sistema, incluindo pautas de atas, cadastro de professores, grades salvas e templates personalizados.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-70 disabled:cursor-wait active:scale-[0.98]"
            >
              {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isExporting ? 'Fazendo Empacotamento...' : 'Fazer Backup (.json)'}
            </button>
          </div>

          {/* Import card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/85 shadow-xs flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-700">
                <Upload className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1.5">Restaurar do Backup</h2>
              <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">
                Importe e reindexe um arquivo de backup gerado anteriormente. Seus dados atuais serão sobrescritos pelas informações validadas do arquivo.
              </p>
            </div>
            <label className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-755 font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all cursor-pointer text-center active:scale-[0.98]">
              {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              {isImporting ? 'Processando Validação...' : 'Selecionar Arquivo'}
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

        {/* Wipe out card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> Zona de Segurança Máxima
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Deseja restaurar as configurações de fábrica do GE Escolar? Isto limpará de forma irreversível o banco do navegador local.
            </p>
          </div>
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="shrink-0 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Formatar Banco
          </button>
        </div>
      </div>

      {/* Wipe out Confirmation Modal */}
      <AnimatePresence>
        {isClearConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsClearConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-md border border-slate-250 space-y-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-950 uppercase tracking-widest">Restaurar Sistema</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Ação destrutiva</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleClearDatabase} className="space-y-4">
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Isso apagará permanentemente professores, grades, pautas e histórico de faltas de sua máquina. <strong className="text-rose-700">Certifique-se de que possui uma cópia em JSON de backup antes de confirmar!</strong>
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
                    Digite a chave do sistema para prosseguir:
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-hidden focus:border-rose-500 transition-colors"
                    placeholder="••••••••"
                  />
                  {resetError && (
                    <span className="text-[9px] font-black text-rose-600 uppercase mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {resetError}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsClearConfirmOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-850"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !resetPassword}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    {isResetting ? 'Limpando...' : 'Formatar Banco'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, unit }: { title: string, value: string | number, unit: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-center gap-1 group transition-colors">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-xl font-black text-slate-900 group-hover:text-slate-950 leading-none tracking-tight">{value}</span>
        <span className="text-[9px] font-bold text-slate-400 capitalize">{unit}</span>
      </div>
    </div>
  );
}
