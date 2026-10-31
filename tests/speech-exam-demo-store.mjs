// Synthetic development fixture ONLY. Never imports data.js or Supabase.
import {RUBRIC, clone, emptyScores, validateScores} from '../speech-exam-core.mjs';
export const DEMO_CONTEXT = {className: 'Örnek 6A', subjectId: 'Türkçe', termId: 'Örnek dönem', date: '2026-10-25'};
const KEY = 'notik-synthetic-speech-exams-v1';
export function createDemoStore(storage = localStorage) {
  const listeners = new Set(), channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(KEY) : null;
  let failNext = false;
  const read = () => JSON.parse(storage.getItem(KEY) || '[]');
  const view = exam => {
    const value = clone(exam); value.serverTime = Date.now();
    if (value.selectionExpiresAt && value.selectionExpiresAt <= value.serverTime) { value.activeStudentId = null; value.selectionExpiresAt = null; }
    return value;
  };
  const notify = () => listeners.forEach(fn => fn());
  const persist = records => { storage.setItem(KEY, JSON.stringify(records)); notify(); channel?.postMessage({type: 'changed'}); };
  if (channel) channel.onmessage = event => { if (event.data?.type === 'changed') notify(); };
  function lookup(records, id) { const exam = records.find(e => e.id === id); if (!exam) throw Error('Örnek sınav bulunamadı.'); return exam; }
  function active(exam) { if (exam.status !== 'active') throw Error('Sınav tamamlanmış.'); }
  function conflict() { const error = Error('Kayıt başka oturumda değişti.'); error.code = 'conflict'; throw error; }
  return {
    async list(context) { return read().filter(e => e.className === context.className && e.subjectId === context.subjectId && e.termId === context.termId).reverse(); },
    async create(context) {
      const records = read(); if (records.some(e => e.className === context.className && e.status === 'active')) throw Error('Bu sınıfta aktif sınav var.');
      const exam = {...context, id: crypto.randomUUID(), status: 'active', revision: 1, activeStudentId: null, rubric: clone(RUBRIC),
        students: Array.from({length:35}, (_, i) => ({id: 'sample-' + i, name: ['Örnek Öğrenci A', 'Örnek Öğrenci B', 'Uzun Adlı Örnek Öğrenci C'][i] || 'Örnek Öğrenci ' + (i + 1)})), results: {}};
      records.push(exam); persist(records); return clone(exam);
    },
    async get(id) { return view(lookup(read(), id)); },
    async select(id, studentId, revision) {
      const records = read(), exam = lookup(records, id); active(exam);
      if (exam.revision !== revision) conflict();
      if (studentId !== null && !exam.students.some(s => s.id === studentId)) throw Error('Geçersiz öğrenci.');
      exam.activeStudentId = studentId; exam.selectionExpiresAt = null; exam.revision++; persist(records); return view(exam);
    },
    async save(id, job) {
      if (failNext) { failNext = false; throw Error('Örnek ağ kesintisi'); }
      const records = read(), exam = lookup(records, id); active(exam);
      if (!exam.students.some(s => s.id === job.studentId)) throw Error('Geçersiz öğrenci.');
      const result = exam.results[job.studentId] ||= {scores: emptyScores(), revision: 0};
      if (result.mutationId === job.mutationId) return {...clone(result), examRevision: exam.revision, activeStudentId: exam.activeStudentId, selectionExpiresAt:exam.selectionExpiresAt, serverTime:Date.now()};
      if (job.expectedRevision !== result.revision) conflict();
      for (const [key, value] of Object.entries(job.patch)) { if (!/^[0-9]$/.test(key)) throw Error('Geçersiz ölçüt'); result.scores[Number(key)] = value; }
      validateScores(result.scores); result.revision++; result.mutationId = job.mutationId; exam.revision++;
      if (exam.activeStudentId === job.studentId) exam.selectionExpiresAt = result.scores.every(score => score !== null) ? Date.now() + 10000 : null;
      persist(records);
      return {...clone(result), examRevision: exam.revision, activeStudentId: exam.activeStudentId, selectionExpiresAt:exam.selectionExpiresAt, serverTime:Date.now()};
    },
    async finish(id, revision) { const records = read(), exam = lookup(records, id); if (exam.status === 'finished') return clone(exam); if (exam.revision !== revision) conflict(); exam.status = 'finished'; exam.activeStudentId = null; exam.selectionExpiresAt = null; exam.revision++; persist(records); return clone(exam); },
    subscribe(topic, callback, status) { listeners.add(callback); status?.('SUBSCRIBED'); return () => listeners.delete(callback); },
    async board() { const exam = read().find(e => e.status === 'active') || read().at(-1); if (!exam) throw Error('Örnek sınav bekleniyor'); return {...view(exam), expiresAt: Date.now() + 15 * 60 * 1000}; },
    failNextSave() { failNext = true; },
    close() { channel?.close(); listeners.clear(); }
  };
}
