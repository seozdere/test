// Pure exam model. No application state, network or student storage access.
export const RUBRIC = Object.freeze({version: 'tr-speaking-1', criteria: Object.freeze([
  'Konuya bağlı kalarak amaca uygun konuşma',
  'Konuşmayı giriş, gelişme ve sonuç bütünlüğü içerisinde sunma',
  'Düşüncelerini açık, tutarlı ve örneklerle destekleyerek ifade etme',
  'Konuya uygun, çeşitli ve zengin sözcükler kullanma',
  'Dil bilgisi kurallarına uygun, doğru ve anlamlı cümleler kurma',
  'Gereksiz tekrar, dolgu sözcükleri ve uzun duraksamalar olmadan akıcı konuşma',
  'Sözcükleri doğru, açık ve anlaşılır biçimde seslendirme (telaffuz)',
  'Ses düzeyini, vurgu ve tonlamayı konuşmaya uygun kullanma',
  'Jest, mimik ve beden dilini konuşmayla uyumlu kullanma',
  'Uygun hitap ve bitirme ifadeleri kullanarak konuşmayı ayrılan sürede tamamlama'
])});
export const clone = value => structuredClone(value);
export const emptyScores = () => Array(10).fill(null);
export function validateScores(scores) {
  if (!Array.isArray(scores) || scores.length !== 10 || scores.some(v => v !== null && (!Number.isInteger(v) || v < 1 || v > 10))) throw Error('Geçersiz puan.');
  return scores;
}
export function total(scores) {
  validateScores(scores);
  const count = scores.filter(v => v !== null).length;
  return {count, sum: scores.reduce((sum, v) => sum + (v ?? 0), 0), complete: count === 10};
}
export function totalLabel(scores) {
  const value = total(scores);
  return value.complete ? `${value.sum} / 100` : `Geçici toplam: ${value.sum} · ${value.count}/10 ölçüt`;
}
export function exportRows(exam) {
  const headers = ['Sınıf', 'Öğrenci', 'Ders', 'Dönem', 'Tarih', ...exam.rubric.criteria, 'Toplam puan', 'Geçici toplam', 'Tamamlanma'];
  return [headers, ...exam.students.map(student => {
    const scores = exam.results[student.id]?.scores ?? emptyScores(), value = total(scores);
    return [exam.className, student.name, exam.subjectId, exam.termId, exam.date, ...scores,
      value.complete ? value.sum : null, value.count && !value.complete ? value.sum : null, value.complete ? 'Tamamlandı' : 'Eksik'];
  })];
}

// A retained request ID makes retry after a lost response idempotent. A failed
// request blocks following writes; edits arriving during a save remain pending.
export class ScoreQueue {
  constructor({save, revision, onState = () => {}, onSaved = () => {}, delay = 250}) {
    Object.assign(this, {save, revision, onState, onSaved, delay});
    this.pending = new Map(); this.job = null; this.running = null; this.timer = null; this.error = null;
  }
  get dirty() { return !!(this.job || this.pending.size || this.running); }
  enqueue(studentId, criterion, score) {
    if (!Number.isInteger(criterion) || criterion < 0 || criterion > 9 || (score !== null && (!Number.isInteger(score) || score < 1 || score > 10))) throw Error('Geçersiz puan.');
    const patch = this.pending.get(studentId) || {};
    patch[criterion] = score; this.pending.set(studentId, patch);
    this.onState(this.error ? 'error' : 'pending', this.error);
    clearTimeout(this.timer);
    if (!this.error) this.timer = setTimeout(() => this.flush().catch(() => {}), this.delay);
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    this.error = null;
    this.running = this.drain();
    try { await this.running; } finally { this.running = null; }
  }
  async drain() {
    try {
      while (this.job || this.pending.size) {
        if (!this.job) {
          const [studentId, patch] = this.pending.entries().next().value;
          this.pending.delete(studentId);
          this.job = {studentId, patch, expectedRevision: this.revision(studentId), mutationId: crypto.randomUUID()};
        }
        this.onState('saving');
        const saved = await this.save(clone(this.job));
        this.onSaved(this.job.studentId, saved);
        this.job = null;
      }
      this.onState('saved');
    } catch (error) { this.error = error; this.onState('error', error); throw error; }
  }
}

// No polling: join/rejoin, visibility and change events request a single read.
export function coalescedReader(read, apply, fail, delay = 80) {
  let timer, running = false, pending = false, closed = false, generation = 0;
  async function run() {
    if (closed) return;
    if (running) { pending = true; return; }
    running = true;
    const requestGeneration = generation;
    try { const value = await read(); if (!closed && generation === requestGeneration) apply(value); }
    catch (error) { if (!closed && generation === requestGeneration) fail(error); }
    finally { running = false; if (pending && !closed) { pending = false; trigger(); } }
  }
  function trigger() { if (closed) return; if (running) { pending = true; return; } clearTimeout(timer); timer = setTimeout(run, delay); }
  return {trigger, invalidate() { generation++; }, close() { closed = true; clearTimeout(timer); }};
}
