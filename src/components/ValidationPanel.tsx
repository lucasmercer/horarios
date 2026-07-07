import React, { useMemo } from 'react';
import { Teacher, Subject, Turma, ScheduleSlot } from '../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ValidationPanelProps {
  teachers: Teacher[];
  subjects: Subject[];
  turmas: Turma[];
  schedules: Record<string, Record<string, ScheduleSlot>>;
  isOpen: boolean;
  onClose: () => void;
}

export function ValidationPanel({ teachers, subjects, turmas, schedules, isOpen, onClose }: ValidationPanelProps) {
  const validations = useMemo(() => {
    const errors: string[] = [];
    
    // 1. Check if teacher has enough available slots for their workload
    teachers.forEach(teacher => {
      // Calculate total required workload for this teacher
      let totalWorkload = 0;
      
      if (teacher.subjectIds && teacher.subjectIds.length > 0) {
        teacher.subjectIds.forEach(subjectId => {
          const subject = subjects.find(s => s.id === subjectId);
          if (subject) {
            // Find turmas this teacher teaches for this subject
            const taughtTurmas = teacher.subjectTurmaMap?.[subjectId] || [];
            
            taughtTurmas.forEach(turmaId => {
              const turma = turmas.find(t => t.id === turmaId);
              if (turma) {
                // Determine workload for this subject in this turma
                let w = subject.workload || 0;
                if (subject.customWorkloads && subject.customWorkloads[turma.id] !== undefined) {
                  w = subject.customWorkloads[turma.id];
                } else if (turma.isTechnical && subject.isTechnical) {
                  w = subject.classWorkload || 0;
                } else if (subject.levelConstraint === "fundamental" && turma.name.toLowerCase().includes("fundamental")) {
                   w = subject.workloadFundamental || w;
                } else if (subject.levelConstraint === "medio" && turma.name.toLowerCase().includes("medio")) {
                   w = subject.workloadMedio || w;
                }
                totalWorkload += w;
              }
            });
          }
        });
      }
      
      // Calculate max available slots
      // A standard teacher has 5 days * 5 or 6 periods
      // But we just subtract the unavailable ones from a theoretical max, OR we look at their unavailability
      const unavailableCount = teacher.unavailability?.length || 0;
      const totalPossibleSlots = 30; // Assuming 6 classes a day * 5 days. Adjust if needed.
      const availableSlots = totalPossibleSlots - unavailableCount;
      
      if (totalWorkload > availableSlots) {
        errors.push(`Professor(a) ${teacher.name} precisa dar ${totalWorkload} aulas, mas só tem ${availableSlots} horários disponíveis.`);
      }
    });


    let totalMissing = 0;
    const missingDetails: Record<string, number> = {};

    turmas.forEach(turma => {
      if (turma.isRoom) return;

      subjects.forEach(subject => {
        let applicable = true;
        if (subject.allowedTurmaIds && subject.allowedTurmaIds.length > 0 && !subject.allowedTurmaIds.includes(turma.id)) {
          applicable = false;
        } else if (subject.levelConstraint) {
          if (subject.levelConstraint === "fundamental" && !turma.name.toLowerCase().includes("fundamental") && !turma.id.toLowerCase().includes("ef")) applicable = false;
          if (subject.levelConstraint === "medio" && !turma.name.toLowerCase().includes("medio") && !turma.name.toLowerCase().includes("médio") && !turma.id.toLowerCase().includes("em")) applicable = false;
          if (subject.levelConstraint === "tecnico" && !turma.isTechnical) applicable = false;
        }

        if (!applicable) return;

        let required = subject.workload || 0;
        if (subject.customWorkloads && subject.customWorkloads[turma.id] !== undefined) {
          required = subject.customWorkloads[turma.id];
        } else if (turma.isTechnical && subject.isTechnical) {
          required = subject.classWorkload || 0;
        } else if (subject.levelConstraint === "fundamental" && turma.name.toLowerCase().includes("fundamental")) { 
          required = subject.workloadFundamental || required;
        } else if (subject.levelConstraint === "medio" && turma.name.toLowerCase().includes("medio")) { 
          required = subject.workloadMedio || required;
        }

        if (required > 0) {
          let allocated = 0;
          const tSched = schedules[turma.id] || {};
          Object.values(tSched).forEach(slot => {
            if (slot.subjectId === subject.id && slot.teacherId) {
              allocated++;
            }
          });

          if (allocated < required) {
            const missing = required - allocated;
            totalMissing += missing;
            if (!missingDetails[turma.name]) missingDetails[turma.name] = 0;
            missingDetails[turma.name] += missing;
          }
        }
      });
    });

    if (totalMissing > 0) {
      const summary = `Existem ${totalMissing} aulas pendentes de alocação na grade escolar.`;
      errors.push(summary);
    }

    return errors;
  }, [teachers, subjects, turmas, schedules]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-slate-200 z-[100] flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Validação em Tempo Real
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          ×
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {validations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tudo certo!</p>
            <p className="text-xs text-slate-500">Nenhum conflito estrutural detectado antes da geração.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="px-3 py-2 bg-amber-100/50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">
                Atenção: Os seguintes problemas matemáticos impedem a geração de uma grade perfeita.
              </p>
            </div>
            {validations.map((err, i) => (
              <div key={i} className="p-3 bg-white border border-red-200 rounded shadow-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{err}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
