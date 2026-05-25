import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarClock, Plus, Trash2, Edit2, AlertCircle, Save, Calendar, UserX, UserCheck, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Teacher {
  id: string;
  name: string;
  color?: string;
}

interface Substitution {
  id: string;
  date: string;
  absentTeacherId: string;
  substituteTeacherId: string; // can be 'none' if empty
  classesCount: number;
  observations: string;
}

export default function Substitutions() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [absentId, setAbsentId] = useState('');
  const [substituteId, setSubstituteId] = useState('none');
  const [classesCount, setClassesCount] = useState<number>(1);
  const [observations, setObservations] = useState('');

  useEffect(() => {
    try {
      const savedTeachers = localStorage.getItem('cecm_teachers');
      if (savedTeachers) {
        setTeachers(JSON.parse(savedTeachers));
      }
      const savedSubs = localStorage.getItem('cecm_substitutions');
      if (savedSubs) {
        setSubstitutions(JSON.parse(savedSubs));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSubstitutions = (newSubs: Substitution[]) => {
    setSubstitutions(newSubs);
    localStorage.setItem('cecm_substitutions', JSON.stringify(newSubs));
  };

  const handleSave = () => {
    if (!absentId) return;

    if (editingId) {
      const updated = substitutions.map(s => 
        s.id === editingId 
          ? { ...s, date, absentTeacherId: absentId, substituteTeacherId: substituteId, classesCount, observations }
          : s
      );
      saveSubstitutions(updated);
    } else {
      const newSub: Substitution = {
        id: Math.random().toString(36).substring(2, 9),
        date,
        absentTeacherId: absentId,
        substituteTeacherId: substituteId,
        classesCount,
        observations
      };
      saveSubstitutions([newSub, ...substitutions]);
    }

    setIsAdding(false);
    setEditingId(null);
    setAbsentId('');
    setSubstituteId('none');
    setClassesCount(1);
    setObservations('');
  };

  const handleEdit = (sub: Substitution) => {
    setEditingId(sub.id);
    setDate(sub.date);
    setAbsentId(sub.absentTeacherId);
    setSubstituteId(sub.substituteTeacherId);
    setClassesCount(sub.classesCount);
    setObservations(sub.observations);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      saveSubstitutions(substitutions.filter(s => s.id !== id));
    }
  };

  // Calculate balances Compute Aulas Devendo / Em Haver
  const balances: Record<string, number> = {};
  teachers.forEach(t => balances[t.id] = 0);
  
  substitutions.forEach(sub => {
    if (balances[sub.absentTeacherId] !== undefined) {
      balances[sub.absentTeacherId] -= sub.classesCount; // Owe classes
    }
    if (sub.substituteTeacherId && sub.substituteTeacherId !== 'none' && balances[sub.substituteTeacherId] !== undefined) {
      balances[sub.substituteTeacherId] += sub.classesCount; // Earn classes
    }
  });

  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconhecido';

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Calendário de Substituições</h1>
              <p className="text-sm font-medium text-slate-500">Banco de horas e faltas do corpo docente</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setEditingId(null);
              setAbsentId('');
              setSubstituteId('none');
              setClassesCount(1);
              setObservations('');
              setIsAdding(!isAdding);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancelar' : 'Nova Substituição'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area: List and Form */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                    {editingId ? 'Editar Registro' : 'Novo Registro de Substituição'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantidade de Aulas</label>
                      <input 
                        type="number" 
                        min="1"
                        value={classesCount}
                        onChange={e => setClassesCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Professor Faltante</label>
                      <select 
                        value={absentId}
                        onChange={e => setAbsentId(e.target.value)}
                        className="w-full px-3 py-2 bg-red-50/50 border border-red-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-red-300"
                      >
                        <option value="">Selecione...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Professor Substituto</label>
                      <select 
                        value={substituteId}
                        onChange={e => setSubstituteId(e.target.value)}
                        className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-300"
                      >
                        <option value="none">Nenhum / Pendente</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observações</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Motivo médico, reposição agendada, etc."
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleSave}
                      disabled={!absentId}
                      className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Registro
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Histórico de Eventos</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {substitutions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma substituição registrada</p>
                  </div>
                ) : (
                  substitutions.map(sub => (
                    <div key={sub.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 justify-between group">
                      <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 bg-slate-100 text-slate-500 font-black text-xs rounded-2xl flex flex-col items-center justify-center shrink-0">
                          <span>{format(parseISO(sub.date), 'dd')}</span>
                          <span className="text-[8px] uppercase">{format(parseISO(sub.date), 'MMM', { locale: ptBR })}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold line-clamp-1 max-w-[150px] text-red-600 flex items-center gap-1">
                              <UserX className="w-3.5 h-3.5" />
                              {getTeacherName(sub.absentTeacherId)}
                            </span>
                            <span className="text-slate-300 text-xs">→</span>
                            {sub.substituteTeacherId && sub.substituteTeacherId !== 'none' ? (
                              <span className="text-sm font-bold line-clamp-1 max-w-[150px] text-emerald-600 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                {getTeacherName(sub.substituteTeacherId)}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-md">
                                Pendente
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {sub.classesCount} {sub.classesCount === 1 ? 'Aula' : 'Aulas'}
                            </span>
                            {sub.observations && (
                              <span className="text-slate-400 border-l border-slate-200 pl-3 italic truncate max-w-xs">
                                "{sub.observations}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(sub)} className="p-2 text-slate-400 hover:text-blue-500 bg-white border border-slate-200 hover:border-blue-200 rounded-lg shadow-sm transition-all hover:bg-blue-50">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="p-2 text-slate-400 hover:text-red-500 bg-white border border-slate-200 hover:border-red-200 rounded-lg shadow-sm transition-all hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Banco de Horas */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden text-white relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <CalendarClock className="w-32 h-32" />
              </div>
              <div className="relative p-6 pt-8 border-b border-slate-800">
                <h2 className="text-lg font-black uppercase tracking-tight mb-1">Banco de Horas</h2>
                <p className="text-xs text-slate-400 font-medium">Situação dos professores</p>
              </div>
              <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {teachers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-medium">
                    Nenhum professor cadastrado.
                  </div>
                ) : (
                  teachers.sort((a,b) => a.name.localeCompare(b.name)).map(t => {
                    const balance = balances[t.id] || 0;
                    if (balance === 0) return null; // Only show non-zero balances by default? Or show all. Let's show all for clarity if they have any activity.
                    // Actually let's show only active or non-zero to unclutter, or all, but styled.
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[150px]">{t.name}</span>
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-black min-w-[70px] text-center ${
                          balance > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          balance < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {balance > 0 ? `+${balance} Haver` : balance < 0 ? `${balance} Deve` : '0 (Z)'}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
                )}
                
                {teachers.filter(t => balances[t.id] === 0).map(t => (
                   <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/50 transition-colors group opacity-50">
                    <span className="text-sm font-bold text-slate-400 truncate max-w-[150px]">{t.name}</span>
                    <div className="px-2.5 py-1 rounded-lg text-[10px] font-black min-w-[70px] text-center bg-slate-800 text-slate-500 border border-slate-700">
                      Zerad.
                    </div>
                 </div>
                ))}

              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-amber-800">Como funciona</p>
                <p className="text-xs font-medium leading-relaxed opacity-80">
                  Professores faltantes acumulam <strong>dívida</strong> (-) de aulas com a escola. Professores substitutos acumulam <strong>haver</strong> (+) de aulas com a escola para folgas futuras.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
