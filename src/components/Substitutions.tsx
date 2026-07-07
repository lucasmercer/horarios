import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, CheckCircle2, Plus, Trash2, Edit2, AlertCircle, Save, Calendar, UserX, UserCheck, Clock, X } from 'lucide-react';
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
  substituteTeacherId: string;
  classesCount: number;
  periods?: number[];
  observations: string;
}

export default function Substitutions() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [schedules, setSchedules] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [absentId, setAbsentId] = useState('');
  const [substituteId, setSubstituteId] = useState<string>('none');
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

  const getMissedTurmas = (teacherId: string) => {
    if (!teacherId || !schedules) return [];
    
    const missedMap: Record<string, { turmaName: string, count: number, details: string[] }> = {};
    const dayMap: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    const dayLabels: Record<string, string> = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta' };

    substitutions.filter(sub => sub.absentTeacherId === teacherId).forEach(sub => {
      const start = new Date(sub.date + 'T00:00:00');
      const end = sub.endDate ? new Date(sub.endDate + 'T23:59:59') : new Date(sub.date + 'T23:59:59');
      const selPeriods = sub.periods || [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayId = dayMap[d.getDay()];
        if (!dayId) continue;

        Object.keys(schedules).forEach(turmaId => {
          const ts = schedules[turmaId];
          if (!ts) return;
          
          let turmaName = turmaId;
          try {
            const savedTurmas = localStorage.getItem('cecm_turmas');
            if (savedTurmas) {
              const parsed = JSON.parse(savedTurmas);
              const found = parsed.find((t: any) => t.id === turmaId);
              if (found) turmaName = found.name;
            }
          } catch(e) {}

          Object.keys(ts).forEach(slotKey => {
            if (slotKey.startsWith(`${dayId}-`)) {
              const slot = ts[slotKey];
              if (slot && slot.teacherId === teacherId) {
                const periodIdx = parseInt(slotKey.split('-')[1], 10);
                if (selPeriods.length === 0 || selPeriods.includes(periodIdx)) {
                  let periodLabel = '';
                  if (periodIdx <= 6) periodLabel = `${periodIdx}ª Aula Manhã`;
                  else if (periodIdx <= 12) periodLabel = `${periodIdx-6}ª Aula Tarde`;
                  else periodLabel = `${periodIdx-12}ª Aula Noite`;

                  const detail = `${format(d, 'dd/MM')} (${dayLabels[dayId]}) - ${periodLabel}`;
                  
                  if (!missedMap[turmaId]) {
                    missedMap[turmaId] = { turmaName, count: 0, details: [] };
                  }
                  missedMap[turmaId].count++;
                  if (!missedMap[turmaId].details.includes(detail)) {
                    missedMap[turmaId].details.push(detail);
                  }
                }
              }
            }
          });
        });
      }
    });

    return Object.values(missedMap);
  };

  const hoursData: Record<string, { owed: number, earned: number }> = {};
  teachers.forEach(t => hoursData[t.id] = { owed: 0, earned: 0 });
  
  substitutions.forEach(sub => {
    if (hoursData[sub.absentTeacherId] !== undefined) {
      hoursData[sub.absentTeacherId].owed += sub.classesCount;
    }
    if (sub.substituteTeacherId && sub.substituteTeacherId !== 'none' && hoursData[sub.substituteTeacherId] !== undefined) {
      hoursData[sub.substituteTeacherId].earned += sub.classesCount;
    }
  });

  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconhecido';

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col p-4 md:p-8 animate-in fade-in duration-300 overflow-y-auto font-sans selection:bg-slate-200">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gestão de Substituições</span>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Ocorrências & Banco de Horas</h1>
              <p className="text-xs font-semibold text-slate-500">Controle faltas de professores, substitutos escalados e saldo de horas letivas</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
                setEditingId(null);
                setAbsentId('');
                setSubstituteId('none');
                setSelectedPeriods([]);
                setObservations('');
                setManualClassesCount('');
                setEndDate('');
              } else {
                setEditingId(null);
                setAbsentId('');
                setSubstituteId('none');
                setSelectedPeriods([]);
                setObservations('');
                setManualClassesCount('');
                setEndDate('');
                setIsAdding(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white hover:bg-slate-850 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.98]"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Fechar Formulário' : 'Nova Ocorrência'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Area: List and Form */}
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-5"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      {editingId ? 'Editar Ocorrência' : 'Novo Registro de Ocorrência'}
                    </h2>
                    <button 
                      onClick={() => {
                        setIsAdding(false);
                        setEditingId(null);
                      }} 
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data Início <span className="text-[8.5px] text-indigo-500 font-extrabold">(Pressione H para hoje)</span></label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'h' || e.key === 'H') {
                            e.preventDefault();
                            setDate(format(new Date(), 'yyyy-MM-dd'));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data Fim (Opcional) <span className="text-[8.5px] text-indigo-500 font-extrabold">(Pressione H para hoje)</span></label>
                      <input 
                        type="date" 
                        value={endDate}
                        min={date}
                        onChange={e => setEndDate(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'h' || e.key === 'H') {
                            e.preventDefault();
                            setEndDate(format(new Date(), 'yyyy-MM-dd'));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Professor com Falta (Ausente)</label>
                      <select 
                        value={absentId}
                        onChange={e => setAbsentId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                      >
                        <option value="">Selecione o Professor Ausente...</option>
                        <option value="none">Nenhum / Apenas Reposição Extra</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantidade de Aulas</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Deixe em branco para calcular automaticamente..."
                        value={manualClassesCount}
                        onChange={e => setManualClassesCount(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Professor Substituto / Repositor</label>
                        {!isCreatingSubstitute && (
                          <button 
                            type="button" 
                            onClick={() => setIsCreatingSubstitute(true)} 
                            className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Cadastrar Novo
                          </button>
                        )}
                      </div>
                      
                      {isCreatingSubstitute ? (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="NOME DO NOVO DOCENTE..."
                            value={newTeacherName}
                            onChange={e => setNewTeacherName(e.target.value.toUpperCase())}
                            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900 uppercase"
                            autoFocus
                          />
                          <button 
                            type="button" 
                            onClick={handleCreateNewTeacher}
                            disabled={!newTeacherName.trim()}
                            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50 transition-all hover:bg-slate-850"
                          >
                            Salvar
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setIsCreatingSubstitute(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={substituteId}
                          onChange={e => setSubstituteId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                        >
                          <option value="none">Falta sem substituto (Gera saldo devedor de horas)</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                    
                    {/* Períodos Substituídos */}
                    <div className="md:col-span-2 space-y-2 mt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Períodos Afetados (Selecione para restringir o cálculo)</label>
                      
                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {/* Manhã */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Manhã</span>
                          <div className="flex flex-wrap gap-1">
                            {[1,2,3,4,5,6].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                                  selectedPeriods.includes(p) 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {p}ª M
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tarde */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tarde</span>
                          <div className="flex flex-wrap gap-1">
                            {[7,8,9,10,11,12].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                                  selectedPeriods.includes(p) 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {p-6}ª T
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Noite */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Noite</span>
                          <div className="flex flex-wrap gap-1">
                            {[13,14,15,16,17,18].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p].sort((a,b)=>a-b))}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                                  selectedPeriods.includes(p) 
                                    ? 'bg-slate-900 text-white border-slate-900' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {p-12}ª N
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observações / Detalhes</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Licença médica, atestado, reposição de recesso letivo..."
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 outline-hidden focus:border-slate-900"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                    {editingId && (
                      <button 
                        onClick={() => {
                          handleDelete(editingId);
                          setIsAdding(false);
                          setEditingId(null);
                        }}
                        className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover Evento
                      </button>
                    )}
                    <button 
                      onClick={handleSave}
                      disabled={!absentId}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar Registro
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Historical Events List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Histórico de Eventos</h2>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {substitutions.length} {substitutions.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              
              <div className="divide-y divide-slate-100">
                {substitutions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <CalendarClock className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold">Nenhuma ocorrência ou substituição cadastrada.</p>
                  </div>
                ) : (
                  substitutions.map(sub => (
                    <div key={sub.id} className="p-5 hover:bg-slate-50/40 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group">
                      <div className="flex gap-4 items-start">
                        <div className="w-11 h-11 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-200/20">
                          <span className="text-sm font-black leading-none">{format(parseISO(sub.date), 'dd')}</span>
                          <span className="text-[7.5px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">{format(parseISO(sub.date), 'MMM', { locale: ptBR })}</span>
                        </div>
                        
                        {sub.endDate && sub.endDate !== sub.date && (
                          <>
                            <div className="flex flex-col justify-center items-center h-11 text-slate-300 font-bold text-xs">até</div>
                            <div className="w-11 h-11 bg-slate-100/60 text-slate-600 font-bold text-xs rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-200/20 border-dashed">
                              <span className="text-sm font-black leading-none">{format(parseISO(sub.endDate), 'dd')}</span>
                              <span className="text-[7.5px] uppercase tracking-wider font-bold text-slate-400 mt-0.5">{format(parseISO(sub.endDate), 'MMM', { locale: ptBR })}</span>
                            </div>
                          </>
                        )}
                        
                        <div className="space-y-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {sub.absentTeacherId === 'none' ? (
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" /> REPOSIÇÃO EXTRA
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md">
                                <UserX className="w-3 h-3 shrink-0" />
                                {getTeacherName(sub.absentTeacherId)}
                              </span>
                            )}
                            
                            <span className="text-slate-300 text-xs">→</span>
                            
                            {sub.substituteTeacherId && sub.substituteTeacherId !== 'none' ? (
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <UserCheck className="w-3 h-3 shrink-0" />
                                {getTeacherName(sub.substituteTeacherId)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider border border-amber-100 bg-amber-50/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <UserX className="w-3 h-3 shrink-0" /> Ausência Sem Substituto
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 font-bold text-slate-650">
                                <Clock className="w-3.5 h-3.5 text-slate-400" /> {sub.classesCount} {sub.classesCount === 1 ? 'aula' : 'aulas'}
                              </span>
                              {sub.observations && (
                                <span className="text-slate-400 border-l border-slate-200 pl-3 italic truncate max-w-[240px]">
                                  "{sub.observations}"
                                </span>
                              )}
                            </div>
                            
                            {sub.periods && sub.periods.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {sub.periods.map(p => {
                                  let label = '';
                                  let colorClass = '';
                                  if (p <= 6) { label = `${p}ª M`; colorClass = 'bg-slate-100 text-slate-600 border-slate-200/50'; }
                                  else if (p <= 12) { label = `${p-6}ª T`; colorClass = 'bg-slate-100 text-slate-600 border-slate-200/50'; }
                                  else { label = `${p-12}ª N`; colorClass = 'bg-slate-150 text-slate-600 border-slate-200'; }
                                  return (
                                    <span key={p} className={`text-[8.5px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-end md:self-center gap-2">
                        {(!sub.substituteTeacherId || sub.substituteTeacherId === 'none') && (
                          <button 
                            onClick={() => setConfirmDeleteId(sub.id)}
                            className="px-2.5 py-1.5 font-bold text-[10px] text-emerald-600 hover:text-white hover:bg-emerald-500 uppercase tracking-wider bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Resolver
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(sub)} 
                          className="px-2.5 py-1.5 font-bold text-[10px] text-slate-500 hover:text-slate-900 uppercase tracking-wider bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(sub.id)}
                          className="px-2.5 py-1.5 font-bold text-[10px] text-rose-500 hover:text-white hover:bg-rose-500 uppercase tracking-wider bg-rose-50 border border-rose-200 rounded-lg shadow-sm transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Banco de Horas */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Banco de Horas</h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Aulas devidas por faltas ou em haver por reposições</p>
                
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider text-slate-400 mt-3 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-red-150 border border-red-200 shrink-0" />
                    Débito (-)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded bg-blue-150 border border-blue-200 shrink-0" />
                    Crédito (+)
                  </div>
                </div>
              </div>

              <div className="p-2 divide-y divide-slate-150/40 max-h-[500px] overflow-y-auto custom-scrollbar">
                {teachers.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-bold">
                    Nenhum docente cadastrado no sistema.
                  </div>
                ) : (
                  teachers.sort((a,b) => a.name.localeCompare(b.name)).map(t => {
                    const data = hoursData[t.id] || { owed: 0, earned: 0 };
                    if (data.owed === 0 && data.earned === 0) return null;
                    const netOwed = Math.max(0, data.owed - data.earned);
                    const netEarned = Math.max(0, data.earned - data.owed);
                    const isSettled = data.owed > 0 && netOwed === 0 && netEarned === 0;

                    const isExpanded = expandedTeacherId === t.id;
                    const missedTurmas = isExpanded ? getMissedTurmas(t.id) : [];

                    return (
                      <div key={t.id} className="flex flex-col p-1 rounded-xl hover:bg-slate-50/40 transition-all border border-transparent hover:border-slate-100">
                        <div 
                          onClick={() => setExpandedTeacherId(isExpanded ? null : t.id)}
                          className="flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer group"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-black text-slate-800 group-hover:text-[#657c36] transition-colors truncate flex items-center gap-1.5">
                              {t.name}
                              <span className="text-[7.5px] font-extrabold text-slate-400 bg-slate-100 border border-slate-200/60 px-1 py-0.5 rounded uppercase tracking-wider">
                                {isExpanded ? 'Ver Menos' : 'Detalhar'}
                              </span>
                            </span>
                            {isSettled && <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Saldo Compensado</span>}
                          </div>
                          <div className="flex gap-2 items-center shrink-0">
                            <div className="flex flex-col items-end text-right text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none gap-0.5 mr-1">
                               <span>F: {data.owed}</span>
                               <span>R: {data.earned}</span>
                            </div>
                            
                            {/* Owed box */}
                            <div 
                              className={`flex items-center justify-center w-7.5 h-7.5 rounded-lg border ${
                                netOwed > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                              }`}
                              title="Saldo Devedor (Aulas Faltantes a repor)"
                            >
                              <span className="text-xs font-black">{netOwed}</span>
                            </div>

                            {/* Earned box */}
                            <div 
                              className={`flex items-center justify-center w-7.5 h-7.5 rounded-lg border ${
                                netEarned > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'
                              }`}
                              title="Saldo Extra (Aulas repostas em haver)"
                            >
                              <span className="text-xs font-black">{netEarned}</span>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-slate-100/60 mt-1 space-y-2.5 animate-in slide-in-from-top-1 fade-in duration-200">
                            <div className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">
                              🔍 Histórico de Turmas com Aulas em Dívida:
                            </div>
                            {missedTurmas.length === 0 ? (
                              <div className="text-[9.5px] font-bold text-[#657c36] italic uppercase tracking-wide">
                                Nenhuma aula devida em turmas do horário ativo.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {missedTurmas.map((mt, i) => (
                                  <div key={i} className="bg-slate-50 border border-slate-150/40 rounded-xl p-2.5 space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-black text-[#657c36] uppercase tracking-wider">
                                      <span>{mt.turmaName}</span>
                                      <span className="bg-[#657c36]/10 text-[#657c36] px-1.5 py-0.5 rounded font-extrabold text-[8px] tracking-wide uppercase">
                                        {mt.count} {mt.count === 1 ? 'Aula Devida' : 'Aulas Devidas'}
                                      </span>
                                    </div>
                                    <div className="space-y-0.5 pt-1">
                                      {mt.details.map((det, j) => (
                                        <div key={j} className="text-[9px] font-bold text-slate-500 uppercase tracking-wide pl-1.5 border-l-2 border-slate-200">
                                          • {det}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }).filter(Boolean)
                )}
                
                {teachers.filter(t => {
                  const data = hoursData[t.id] || { owed: 0, earned: 0 };
                  return data.owed === 0 && data.earned === 0;
                }).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/50 transition-colors group opacity-60">
                    <span className="text-xs font-semibold text-slate-500 truncate">{t.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-150/40">Compensado</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-3 text-slate-700">
              <AlertCircle className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block">Banco de Horas Coletivo</span>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  As ausências registradas geram débito (-) para o professor ausente. Substituições geram saldo credor (+) para o professor substituto, facilitando a compensação e reposição de aulas de forma justa.
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs animate-in fade-in"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-md border border-slate-200 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Resolver / Remover Evento
            </h4>
            <p className="text-xs font-semibold text-slate-500 leading-normal">
              Tem certeza de que deseja remover este registro do histórico? Se for uma pendência de aula, ela será dada como resolvida.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase transition-all"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
