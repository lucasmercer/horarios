import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./src/components/schedules.json', 'utf8'));

const subjects = data.subjects;
const turmas = data.turmas.filter(t => t.shift === 'manha');

let count = 0;
turmas.forEach(T => {
  subjects.forEach(S => {
    // simplified custom workload check
    let w = S.customWorkloads && S.customWorkloads[T.id] !== undefined ? S.customWorkloads[T.id] : S.workload;
    
    // the universal bypass logic
    const subjectNameLower = S.name.toLowerCase().trim();
    const universalSubjects = [
      'matemática', 'matematica', 'português', 'portugues', 'língua portuguesa', 'lingua portuguesa', 'portugués',
      'história', 'historia', 'geografia', 'ciências', 'ciencias', 'biologia', 'física', 'fisica',
      'química', 'quimica', 'educação física', 'educacao fisica', 'arte', 'artes',
      'inglês', 'ingles', 'língua inglesa', 'lingua inglesa', 'espanhol'
    ];
    let isUniversal = universalSubjects.some(u => subjectNameLower.includes(u));
    let hasAnyCustom = S.customWorkloads && Object.keys(S.customWorkloads).length > 0;
    
    let isFundamental = /\b(6|7|8|9)\b|\b(6|7|8|9)º/i.test(T.name);
    let isMedio = (/\b(1|2|3)\b|\b(1|2|3)º|\b(1|2|3)ª/i.test(T.name) || T.name.toLowerCase().includes('médio')) && !isFundamental;

    // Filter rules
    if (S.allowedTurmaIds && S.allowedTurmaIds.length > 0 && !S.allowedTurmaIds.includes(T.id)) return;
    if (S.levelConstraint === 'fundamental' && !isFundamental) return;
    if (S.levelConstraint === 'medio' && !isMedio) return;
    
    if (hasAnyCustom && S.customWorkloads[T.id] === undefined && !isUniversal) {
      // it gets 0
      return;
    }
    
    let defaultW = S.workload;
    if (isFundamental && S.workloadFundamental !== undefined && S.workloadFundamental > 0) defaultW = S.workloadFundamental;
    else if (isMedio && S.workloadMedio !== undefined && S.workloadMedio > 0) defaultW = S.workloadMedio;

    let finalW = S.customWorkloads && S.customWorkloads[T.id] !== undefined ? S.customWorkloads[T.id] : defaultW;
    
    if (finalW > 0) count += finalW;
  });
});
console.log("Total: " + count);
