import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, Plus, Trash2, Edit2, AlertCircle, Save, Calendar, UserX, UserCheck, Clock, X } from 'lucide-react';
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
  endDate?: string;
  absentTeacherId: string;
  substituteTeacherId: string; // can be 'none' if empty
  classesCount: number;
  periods?: number[]; // Added specific periods
  observations: string;
}

export default function Substitutions() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [schedules, setSchedules] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [absentId, setAbsentId] = useState('');
  const [substituteId, setSubstituteId] = useState('none');
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [observations, setObservations] = useState('');
  const [manualClassesCount, setManualClassesCount] = useState<string>('');
  
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isCreatingSubstitute, setIsCreatingSubstitute] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      const savedSchedules = localStorage.getItem('cecm_schedules');
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSubstitutions = (newSubs: Substitution[]) => {
    setSubstitutions(newSubs);
    localStorage.setItem('cecm_substitutions', JSON.stringify(newSubs));
  };

  const calculateClassesCount = (subAbsentId: string, startDate: string, endDateStr: string, selPeriods: number[]) => {
    if (!subAbsentId || !schedules) return 0;
    let count = 0;
    const start = new Date(startDate + 'T00:00:00');
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59') : new Date(startDate + 'T23:59:59');
    
    const map: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayId = map[d.getDay()];
      if (!dayId) continue;
      
      Object.keys(schedules).forEach(turmaId => {
        const ts = schedules[turmaId];
        if (!ts) return;
        Object.keys(ts).forEach(slotKey => {
          if (slotKey.startsWith(`${dayId}-`)) {
            const slot = ts[slotKey];
            if (slot && slot.teacherId === subAbsentId) {
              const periodIdx = parseInt(slotKey.split('-')[1], 10);
              if (selPeriods.length === 0 || selPeriods.includes(periodIdx)) {
                count++;
              }
            }
          }
        });
      });
    }
    return count;
  };

  const handleSave = () => {
    if (!absentId) return;

    let calcCount = manualClassesCount ? parseInt(manualClassesCount, 10) : calculateClassesCount(absentId, date, endDate, selectedPeriods);
    if (isNaN(calcCount)) calcCount = 0;

    if (editingId) {
      const updated = substitutions.map(s => 
        s.id === editingId 
          ? { ...s, date, endDate, absentTeacherId: absentId, substituteTeacherId: substituteId, classesCount: calcCount, observations, periods: selectedPeriods }
          : s
      );
      saveSubstitutions(updated);
    } else {
      const newSub: Substitution = {
        id: Math.random().toString(36).substring(2, 9),
        date,
        endDate,
        absentTeacherId: absentId,
        substituteTeacherId: substituteId,
        classesCount: calcCount,
        periods: selectedPeriods,
        observations
      };
      saveSubstitutions([newSub, ...substitutions]);
    }

    setIsAdding(false);
    setEditingId(null);
    setAbsentId('');
    setSubstituteId('none');
    setSelectedPeriods([]);
    setObservations('');
    setManualClassesCount('');
    setEndDate('');
    setIsCreatingSubstitute(false);
    setNewTeacherName('');
  };

  const handleCreateNewTeacher = () => {
    if (!newTeacherName.trim()) return;
    const newId = `prof-${Math.random().toString(36).substring(2, 9)}`;
    const newTeacher: Teacher = {
      id: newId,
      name: newTeacherName.trim().toUpperCase()
    };
    const updatedTeachers = [...teachers, newTeacher];
    setTeachers(updatedTeachers);
    localStorage.setItem('cecm_teachers', JSON.stringify(updatedTeachers));
    setSubstituteId(newId);
    setIsCreatingSubstitute(false);
    setNewTeacherName('');
  };

  const handleEdit = (sub: Substitution) => {
    setEditingId(sub.id);
    setDate(sub.date);
    setEndDate(sub.endDate || '');
    setAbsentId(sub.absentTeacherId);
    setSubstituteId(sub.substituteTeacherId);
    setSelectedPeriods(sub.periods || []);
    setObservations(sub.observations);
    setManualClassesCount(sub.classesCount.toString());
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = () => {
    if (confirmDeleteId) {
      saveSubstitutions(substitutions.filter(s => s.id !== confirmDeleteId));
      if (editingId === confirmDeleteId) {
        setIsAdding(false);
        setEditingId(null);
      }
      setConfirmDeleteId(null);
    }
  };

  // Calculate balances Compute Aulas Devendo / Em Haver
  const hoursData: Record<string, { owed: number, earned: number }> = {};
  teachers.forEach(t => hoursData[t.id] = { owed: 0, earned: 0 });
  
  substitutions.forEach(sub => {
    if (hoursData[sub.absentTeacherId] !== undefined) {
      hoursData[sub.absentTeacherId].owed += sub.classesCount; // Owe classes
    }
    if (sub.substituteTeacherId && sub.substituteTeacherId !== 'none' && hoursData[sub.substituteTeacherId] !== undefined) {
      hoursData[sub.substituteTeacherId].earned += sub.classesCount; // Earn classes
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
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ocorrências e Substituições</h1>
              <p className="text-sm font-medium text-slate-500">Banco de horas, faltas sem substituto e reposições</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setEditingId(null);
              setAbsentId('');
              setSubstituteId('none');
              setSelectedPeriods([]);
              setObservations('');
              setIsAdding(!isAdding);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancelar' : 'Nova Ocorrência / Substituição'}
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
                    {editingId ? 'Editar Registro' : 'Novo Registro de Ocorrência'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Início</label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Data Fim (Opcional)</label>
                      <input 
                        type="date" 
                        value={endDate}
                        min={date}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Professor Faltante (Ou Reposição)</label>
                      <select 
                        value={absentId}
                        onChange={e => setAbsentId(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold text-slate-700 focus:outline-none ${absentId === 'none' ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-100 focus:border-red-300'}`}
                      >
                        <option value="">Selecione o Professor com Falta...</option>
                        <option value="none">Nenhum / Apenas Reposição de Aulas</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aulas Substituídas/Repostas</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Calculado auto se vazio..."
                        value={manualClassesCount}
                        onChange={e => setManualClassesCount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Professor Substituto / Repositor</label>
                        {!isCreatingSubstitute && (
                          <button type="button" onClick={() => setIsCreatingSubstitute(true)} className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Cadastrar Novo
                          </button>
                        )}
                      </div>
                      
                      {isCreatingSubstitute ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Nome do novo professor..."
                            value={newTeacherName}
                            onChange={e => setNewTeacherName(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2 bg-emerald-50/30 border border-emerald-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-400 uppercase"
                            autoFocus
                          />
                          <button 
                            type="button" 
                            onClick={handleCreateNewTeacher}
                            disabled={!newTeacherName.trim()}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setIsCreatingSubstitute(false)}
                            className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={substituteId}
                          onChange={e => setSubstituteId(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm font-bold text-slate-700 focus:outline-none ${substituteId === 'none' ? 'bg-amber-50 border-amber-200 focus:border-amber-400' : 'bg-emerald-50/50 border-emerald-100 focus:border-emerald-300'}`}
                        >
                          <option value="none">Falta - Sem Substituto (Gera Débito / A repor)</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="md:col-span-2 space-y-2 mt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Períodos Substituídos (Opcional)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[1,2,3,4,5,6].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded shadow-sm border transition-all ${
                              selectedPeriods.includes(p) 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            {p}ª M
                          </button>
                        ))}
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        {[7,8,9,10,11,12].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded shadow-sm border transition-all ${
                              selectedPeriods.includes(p) 
                                ? 'bg-orange-600 text-white border-orange-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-orange-400'
                            }`}
                          >
                            {p-6}ª T
                          </button>
                        ))}
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        {[13,14,15,16,17,18].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded shadow-sm border transition-all ${
                              selectedPeriods.includes(p) 
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                            }`}
                          >
                            {p-12}ª N
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5 mt-2">
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
                  
                  <div className="mt-6 flex justify-end gap-3">
                    {editingId && (
                      <button 
                        onClick={() => {
                          handleDelete(editingId);
                          // form closes itself after deletion because handleDelete calls setSubstitutions which updates state, and then we should close the form.
                          // handleDelete already filters the substitutions. Let's call close form logic.
                          setIsAdding(false);
                          setEditingId(null);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white hover:bg-red-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover Evento
                      </button>
                    )}
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
                        {sub.endDate && sub.endDate !== sub.date && (
                          <div className="flex flex-col justify-center items-center h-12 px-1 text-slate-300 font-bold text-xs">até</div>
                        )}
                        {sub.endDate && sub.endDate !== sub.date && (
                          <div className="w-12 h-12 bg-slate-100/50 text-slate-400 font-black text-xs rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-100 border-dashed">
                            <span>{format(parseISO(sub.endDate), 'dd')}</span>
                            <span className="text-[8px] uppercase">{format(parseISO(sub.endDate), 'MMM', { locale: ptBR })}</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {sub.absentTeacherId === 'none' ? (
                              <span className="text-sm font-bold line-clamp-1 max-w-[200px] text-blue-600 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> REPOSIÇÃO
                              </span>
                            ) : (
                              <span className="text-sm font-bold line-clamp-1 max-w-[150px] text-red-600 flex items-center gap-1">
                                <UserX className="w-3.5 h-3.5" />
                                {getTeacherName(sub.absentTeacherId)}
                              </span>
                            )}
                            <span className="text-slate-300 text-xs">→</span>
                            {sub.substituteTeacherId && sub.substituteTeacherId !== 'none' ? (
                              <span className="text-sm font-bold line-clamp-1 max-w-[150px] text-emerald-600 flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                {getTeacherName(sub.substituteTeacherId)}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider border border-amber-200 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <UserX className="w-3" /> Falta (Sem Substituto)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1.5 text-xs text-slate-500 font-medium mt-1">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-bold text-slate-600">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> {sub.classesCount} {sub.classesCount === 1 ? 'Aula' : 'Aulas'}
                              </span>
                              {sub.observations && (
                                <span className="text-slate-400 border-l border-slate-200 pl-3 italic truncate max-w-[200px]">
                                  "{sub.observations}"
                                </span>
                              )}
                            </div>
                            {sub.periods && sub.periods.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {sub.periods.map(p => {
                                  let label = '';
                                  let colorClass = '';
                                  if (p <= 6) { label = `${p}ª M`; colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; }
                                  else if (p <= 12) { label = `${p-6}ª T`; colorClass = 'bg-orange-50 text-orange-700 border-orange-200'; }
                                  else { label = `${p-12}ª N`; colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200'; }
                                  return (
                                    <span key={p} className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(sub)} className="px-3 py-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-lg shadow-sm transition-all hover:bg-blue-50 flex items-center gap-1.5">
                          <Edit2 className="w-3 h-3" />
                          Editar
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
                <p className="text-xs text-slate-400 font-medium mb-4">Aulas em débito (Faltas) e créditos</p>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-800 pt-3">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/30"></div> Débito (A Repor)</div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/30"></div> Crédito (Já Reposto)</div>
                </div>
              </div>
              <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                {teachers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-medium">
                    Nenhum professor cadastrado.
                  </div>
                ) : (
                  teachers.sort((a,b) => a.name.localeCompare(b.name)).map(t => {
                    const data = hoursData[t.id] || { owed: 0, earned: 0 };
                    if (data.owed === 0 && data.earned === 0) return null;
                    const netOwed = Math.max(0, data.owed - data.earned);
                    const netEarned = Math.max(0, data.earned - data.owed);
                    const isSettled = data.owed > 0 && netOwed === 0 && netEarned === 0;

                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/50 transition-colors group">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[150px]">{t.name}</span>
                          {isSettled && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Débito Zerado</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex flex-col items-end mr-2 text-right">
                             <span className="text-[8px] font-bold text-slate-500 uppercase">Faltas: {data.owed}</span>
                             <span className="text-[8px] font-bold text-slate-500 uppercase">Reposições: {data.earned}</span>
                          </div>
                          <div className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg ${netOwed > 0 ? 'bg-red-500/20 border-red-500/30' : 'bg-slate-800/50 border-slate-700'} border`} title="Saldo Devedor (Faltam Repor)">
                            <span className={`text-sm font-black leading-none ${netOwed > 0 ? 'text-red-400' : 'text-slate-500'}`}>{netOwed}</span>
                          </div>
                          <div className={`flex flex-col items-center justify-center w-8 h-8 rounded-lg ${netEarned > 0 ? 'bg-blue-500/20 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'} border`} title="Saldo Extra (Créditos a Usar)">
                            <span className={`text-sm font-black leading-none ${netEarned > 0 ? 'text-blue-400' : 'text-slate-500'}`}>{netEarned}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
                )}
                
                {teachers.filter(t => {
                  const data = hoursData[t.id] || { owed: 0, earned: 0 };
                  return data.owed === 0 && data.earned === 0;
                }).map(t => (
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

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 border-2 border-slate-900 text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Remover Evento
            </h4>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight leading-normal">
              Tem certeza que deseja excluir este registro de substituição?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 border-2 border-red-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(220,38,38,0.15)] cursor-pointer"
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
