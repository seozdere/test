import {ScoreQueue, emptyScores, total, totalLabel, coalescedReader} from './speech-exam-core.mjs?v=speech-loader-20261028-r1';
// Presentation-only deadline calculation; compatible with the existing core module.
function selectionRemainingMs(value) {
  return Number.isFinite(value.selectionExpiresAt)
    ? Math.max(0, value.selectionExpiresAt - (Number.isFinite(value.serverTime) ? value.serverTime : Date.now()))
    : null;
}
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
function button(text, action, className) { const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node; }

export function mountAdmin(root, api, context) {
  root.classList.add('se-root');
  let exam = null, queue = null, busy = false, disposed = false;
  const header = el('header', undefined, 'se-header'), heading = el('div');
  heading.append(el('p', 'KONUŞMA DEĞERLENDİRMESİ', 'se-eyebrow'), el('h2', 'Canlı Konuşma Sınavı'));
  const contextLabel = el('p', [context.className, context.subjectId, context.termId, context.date].filter(Boolean).join(' · '), 'se-context'); heading.append(contextLabel); header.append(heading);
  const toolbar = el('div', undefined, 'se-toolbar'), status = el('p', 'Sınav seçin veya yeni sınav başlatın.', 'se-status'); status.setAttribute('role', 'status');
  const history = el('select'); history.setAttribute('aria-label', 'Kayıtlı sınavlar');
  const start = button('Sınavı Başlat', () => action(async () => { await flush(); load(await api.create(context)); await refreshHistory(); }));
  const finish = button('Sınavı Bitir', () => {
    if (exam && confirm('Sınav bitirilsin mi? Kaydedilmiş puanlar korunur; değerlendirme salt okunur olur.')) action(async () => { await flush(); load(await api.finish(exam.id, exam.revision)); await refreshHistory(); });
  });
  const download = button('Excel İndir', () => action(async () => { await flush(); const current = await api.get(exam.id); const {downloadExam} = await import('./speech-exam-xlsx.mjs?v=speech-loader-20261028-r1'); downloadExam(current); }));
  const retry = button('Kaydı yeniden dene', () => action(flush)); retry.hidden = true;
  const reload = button('Kayıtlı sınavları yenile', () => action(async () => { await flush(); if (exam) load(await api.get(exam.id)); await refreshHistory(); }));
  const discard = button('Sunucudaki kaydı aç', () => {
    if (confirm('Kaydedilmemiş yerel puanları bırakıp sunucudaki son kaydı açmak istiyor musunuz?')) action(async () => { load(await api.get(exam.id)); });
  }); discard.hidden = true;
  // Decorative SVGs keep the existing labels and action handlers intact.
  const artwork = [[start, 'start', 'm8 5 11 7-11 7Z'], [finish, 'finish', 'M6 6h12v12H6Z'], [download, 'download', 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4'], [reload, 'reload', 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1']];
  for (const [control, name, drawing] of artwork) {
    control.classList.add('se-action', 'se-action-' + name);
    const label = el('span', control.textContent), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const line = document.createElementNS(svg.namespaceURI, 'path'); line.setAttribute('d', drawing); svg.append(line); control.replaceChildren(svg, label);
  }
  toolbar.append(start, finish, download, history, reload, retry);
  toolbar.append(discard);
  const pairing = el('div', undefined, 'se-pairing'); pairing.hidden = true;
  const key = el('input'); key.type = 'password'; key.readOnly = true; key.autocomplete = 'off'; key.setAttribute('aria-label', 'Sınava özel geçici tahta anahtarı');
  const pairingNote = el('p', 'Bu anahtarı yalnızca yetkilendirdiğiniz tahtanın kronometresindeki bağlantı alanına yapıştırın. 15 dakika geçerlidir.');
  const copy = button('Anahtarı kopyala', async () => { try { await navigator.clipboard.writeText(key.value); inform('Tahta anahtarı kopyalandı.'); } catch (_) { key.select(); inform('Anahtarı seçip kopyalayın.'); } });
  pairing.append(pairingNote, key, copy);
  const issue = button('Tahta erişimi oluştur', () => action(async () => { await flush(); const grant = await api.issueBoard(exam.id); key.value = grant.token; pairing.hidden = false; }));
  const revoke = button('Tahta erişimini kapat', () => action(async () => { await api.revokeBoard(exam.id); key.value = ''; pairing.hidden = true; inform('Tahta erişimi kapatıldı.'); }));
  if (api.issueBoard) toolbar.append(issue, revoke);
  const layout = el('div', undefined, 'se-admin-layout'), roster = el('nav', undefined, 'se-roster'); roster.setAttribute('aria-label', 'Öğrenciler');
  const picker = el('div', undefined, 'se-mobile-picker');
  const pickerLabel = el('label', 'Öğrenci'), studentSelect = el('select'); studentSelect.setAttribute('aria-label', 'Değerlendirilecek öğrenci'); pickerLabel.append(studentSelect);
  const previousStudent = button('‹', () => stepStudent(-1)), nextStudent = button('›', () => stepStudent(1));
  previousStudent.setAttribute('aria-label', 'Önceki öğrenci'); nextStudent.setAttribute('aria-label', 'Sonraki öğrenci');
  picker.append(previousStudent, pickerLabel, nextStudent);
  studentSelect.addEventListener('change', () => chooseStudent(studentSelect.value));
  function stepStudent(direction) { const index = exam?.students.findIndex(s => s.id === exam.activeStudentId) ?? -1; const student = exam?.students[index + direction]; if (student) chooseStudent(student.id); }
  function chooseStudent(id) {
    id = id || null;
    if (busy || !exam || (id !== null && !exam.students.some(s => s.id === id))) return;
    void action(async () => { await flush(); if (exam.status === 'active') load(await api.select(exam.id, id, exam.revision)); else { exam.activeStudentId = id; renderForm(); update(); } }).finally(() => { studentSelect.value = exam?.activeStudentId || ''; });
  }
  const form = el('section', undefined, 'se-form'); layout.append(picker, roster, form); root.append(header, toolbar, status, pairing, layout);
  function inform(text) { status.textContent = text; }
  function controls() { start.disabled = busy || exam?.status === 'active'; finish.disabled = busy || !exam || exam.status !== 'active'; download.disabled = busy || !exam; history.disabled = busy; reload.disabled = busy; retry.disabled = busy; discard.disabled = busy; issue.disabled = finish.disabled; revoke.disabled = busy || !exam; studentSelect.disabled = busy || !exam; const index = exam?.students.findIndex(s => s.id === exam.activeStudentId) ?? -1; previousStudent.disabled = busy || index <= 0; nextStudent.disabled = busy || !exam || index >= exam.students.length - 1; }
  async function action(fn) {
    if (busy || disposed) return;
    busy = true; controls();
    try { await fn(); } catch (error) { inform(error.message); }
    finally { busy = false; controls(); }
  }
  async function flush() { if (queue?.dirty) await queue.flush(); }
  let selectionTimer;
  function scheduleSelectionClear() {
    clearTimeout(selectionTimer);
    const delay = selectionRemainingMs(exam);
    if (delay === null || !exam.activeStudentId || exam.status !== 'active') return;
    const {id, activeStudentId, selectionExpiresAt} = exam;
    selectionTimer = setTimeout(() => {
      if (disposed || exam.id !== id || exam.activeStudentId !== activeStudentId || exam.selectionExpiresAt !== selectionExpiresAt || queue?.dirty) return;
      exam.activeStudentId = null; exam.selectionExpiresAt = null; renderForm(); update();
    }, delay);
  }
  async function refreshHistory() {
    const records = await api.list(context); history.replaceChildren();
    const placeholder = el('option', 'Kayıtlı sınav seçin'); placeholder.value = ''; history.append(placeholder);
    for (const item of records) { const option = el('option', `${item.date} · ${item.status === 'active' ? 'Devam ediyor' : 'Tamamlandı'} · ${item.id.slice(0, 6)}`); option.value = item.id; history.append(option); }
    history.value = exam?.id || '';
    const active = records.find(item => item.status === 'active');
    if (!exam && active) load(await api.get(active.id));
  }
  history.addEventListener('change', () => {
    const target = history.value;
    if (!target) return;
    action(async () => { await flush(); load(await api.get(target)); }).finally(() => { history.value = exam?.id || ''; });
  });
  function load(value) {
    exam = value;
    key.value = ''; pairing.hidden = true; retry.hidden = true; discard.hidden = true;
    queue = new ScoreQueue({
      save: job => api.save(exam.id, job),
      revision: id => exam.results[id]?.revision ?? 0,
      onSaved(id, saved) {
        exam.results[id].revision = saved.revision; exam.revision = Math.max(exam.revision, saved.examRevision ?? exam.revision);
        if (saved.activeStudentId === null && exam.activeStudentId === id) { exam.activeStudentId = null; renderForm(); }
        if (exam.activeStudentId === id) {
          exam.selectionExpiresAt = saved.selectionExpiresAt ?? null; exam.serverTime = saved.serverTime;
        }
        scheduleSelectionClear();
        update();
      },
      onState(state, error) {
        retry.hidden = state !== 'error';
        discard.hidden = state !== 'error';
        inform({pending: 'Kaydedilmeyi bekliyor…', saving: 'Kaydediliyor…', saved: 'Kaydedildi.', error: error?.code === 'conflict' ? 'Başka oturumda değişiklik var. Taslağınız korunuyor. Puanlarınızı not alıp sunucudaki kaydı açarak yeniden değerlendirebilirsiniz.' : 'Kaydedilemedi. Bağlantıyı kontrol edip yeniden deneyin; taslağınız korunuyor.'}[state]);
      }
    });
    inform(exam.status === 'active' ? 'Öğrenci seçerek değerlendirmeye başlayın.' : 'Tamamlanmış sınav · Puanlar korunuyor.');
    contextLabel.textContent = [exam.className, exam.subjectId, exam.termId, exam.date].filter(Boolean).join(' · ');
    renderRoster(); renderForm(); controls(); scheduleSelectionClear();
  }
  function renderRoster() {
    roster.replaceChildren(el('h3', 'Öğrenciler'));
    studentSelect.replaceChildren(); const placeholder = el('option', 'Öğrenci seçin'); placeholder.value = ''; studentSelect.append(placeholder);
    for (const student of exam.students) {
      const option = el('option', student.name); option.value = student.id; studentSelect.append(option);
      const item = button('', () => chooseStudent(exam.activeStudentId === student.id ? null : student.id), 'se-student');
      item.dataset.studentId = student.id; item.append(el('span', student.name), el('small')); roster.append(item);
    }
    update();
  }
  function renderForm() {
    form.replaceChildren();
    const student = exam.students.find(s => s.id === exam.activeStudentId);
    if (!student) { form.append(el('p', 'Değerlendirmek için listeden öğrenci seçin.', 'se-empty')); return; }
    const head = el('div', undefined, 'se-form-heading'); head.append(el('h3', student.name), el('output', '', 'se-total'), button('Seçimi kaldır', () => chooseStudent(null))); form.append(head);
    exam.results[student.id] ||= {scores: emptyScores(), revision: 0};
    exam.rubric.criteria.forEach((criterion, index) => {
      const field = el('fieldset', undefined, 'se-criterion'), legend = el('legend', `${index + 1}. ${criterion}`), choices = el('div', undefined, 'se-scores');
      for (let score = 1; score <= 10; score++) {
        const choice = button(String(score), () => {
          if (exam.status !== 'active' || busy) return;
          if (exam.results[student.id].scores[index] === score) return;
          exam.results[student.id].scores[index] = score; queue.enqueue(student.id, index, score); update();
        });
        choice.dataset.criterion = index; choice.dataset.score = score; choice.setAttribute('aria-label', `${index + 1}. ölçüt: ${score} puan`); choices.append(choice);
      }
      field.append(legend, choices); form.append(field);
    });
    update();
  }
  function update() {
    if (!exam) return;
    studentSelect.value = exam.activeStudentId || '';
    for (const option of studentSelect.options) { const student = exam.students.find(s => s.id === option.value); if (!student) continue; const value = total(exam.results[student.id]?.scores ?? emptyScores()); option.textContent = `${student.name} · ${value.complete ? '✓ ' + value.sum + '/100' : value.count + '/10'}`; }
    for (const node of roster.querySelectorAll('[data-student-id]')) {
      const scores = exam.results[node.dataset.studentId]?.scores ?? emptyScores(), value = total(scores);
      node.setAttribute('aria-current', String(node.dataset.studentId === exam.activeStudentId));
      node.querySelector('small').textContent = value.complete ? `${value.sum}/100 · Tamamlandı` : `${value.count}/10 ölçüt`;
    }
    const scores = exam.results[exam.activeStudentId]?.scores ?? emptyScores();
    const output = form.querySelector('output'); if (output) output.textContent = totalLabel(scores);
    for (const choice of form.querySelectorAll('[data-score]')) {
      choice.setAttribute('aria-pressed', String(scores[Number(choice.dataset.criterion)] === Number(choice.dataset.score)));
      choice.disabled = exam.status !== 'active';
    }
    controls();
  }
  const beforeUnload = event => { if (queue?.dirty) { event.preventDefault(); event.returnValue = ''; } };
  const online = () => { if (queue?.error?.code !== 'conflict') void action(async () => { await flush(); if (exam) load(await api.get(exam.id)); }); };
  window.addEventListener('beforeunload', beforeUnload); window.addEventListener('online', online);
  controls(); const ready = action(refreshHistory);
  return {ready, async close() { await flush(); disposed = true; clearTimeout(selectionTimer); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('online', online); root.replaceChildren(); }, get exam() { return exam; }};
}

// Optional drawer inside the EXISTING timer. Timer background/state stay intact.
export function mountBoard(dialog, api, topic, {read = () => api.board(), managed = false} = {}) {
  const panel = el('section', undefined, 'se-board se-root'); panel.setAttribute('aria-label', 'Canlı konuşma değerlendirmesi');
  panel.id = 'se-board-' + crypto.randomUUID();
  const heading = el('header', undefined, 'se-board-heading'), liveLabel = el('p', undefined, 'se-live-label');
  const dot = el('span', undefined, 'se-live-dot'); dot.setAttribute('aria-hidden', 'true'); liveLabel.append(dot, el('span', 'Aktif Sınav'));
  const content = el('div', undefined, 'se-board-content');
  const tab = button('', () => setOpen(tab.getAttribute('aria-expanded') !== 'true'), 'se-drawer-tab');
  const arrow = el('span', '‹', 'se-drawer-arrow'); arrow.setAttribute('aria-hidden', 'true'); tab.append(arrow, el('span', 'Aktif Sınav', 'se-drawer-tab-label'));
  tab.setAttribute('aria-controls', panel.id); tab.setAttribute('aria-expanded', 'false'); tab.setAttribute('aria-label', 'Değerlendirmeyi aç');
  const close = button('', () => { setOpen(false); tab.focus(); }, 'se-drawer-close'); close.setAttribute('aria-label', 'Değerlendirmeyi kapat');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  heading.append(liveLabel, close); panel.append(heading, content); panel.inert = true; panel.setAttribute('aria-hidden', 'true');
  dialog.classList.add('se-live'); dialog.append(panel, tab);
  function setOpen(open) { dialog.classList.toggle('se-drawer-open', open); tab.setAttribute('aria-expanded', String(open)); tab.setAttribute('aria-label', open ? 'Değerlendirmeyi kapat' : 'Değerlendirmeyi aç'); arrow.textContent = open ? '›' : '‹'; panel.inert = !open; panel.setAttribute('aria-hidden', String(!open)); }
  const escape = event => { if (event.key === 'Escape' && tab.getAttribute('aria-expanded') === 'true') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); tab.focus(); } };
  dialog.addEventListener('keydown', escape, true);
  let lastRevision = -1, lastId = null, lastStudent = null, lastScores = null, unsubscribe = () => {}, expired = false;
  let selectionTimer, expiredSelection = null;
  const note = el('p', 'Bağlanıyor…', 'se-status'); note.setAttribute('role', 'status'); content.append(note);
  function clear(message) { clearTimeout(selectionTimer); panel.dataset.live = 'false'; const status = el('p', message, 'se-status'); status.setAttribute('role', 'status'); content.replaceChildren(status); }
  const applySnapshot = exam => {
    if (exam.status !== 'active') { clear('Sınav tamamlandı.'); expired = true; unsubscribe(); reader.close(); return; }
    if (expiredSelection?.id === exam.id && exam.revision <= expiredSelection.revision && exam.activeStudentId === expiredSelection.studentId) exam = {...exam, activeStudentId:null, selectionExpiresAt:null};
    if (exam.id === lastId && (exam.revision < lastRevision || exam.revision === lastRevision && exam.activeStudentId === lastStudent)) return;
    clearTimeout(selectionTimer);
    const sameStudent = exam.id === lastId && exam.activeStudentId === lastStudent;
    const previousList = content.querySelector('.se-board-rubric');
    const scrollTop = sameStudent ? previousList?.scrollTop || 0 : 0;
    const restoreListFocus = sameStudent && document.activeElement === previousList;
    const changed = lastRevision >= 0;
    lastId = exam.id; lastRevision = exam.revision;
    if (!managed && (!Number.isFinite(exam.expiresAt) || exam.expiresAt <= Date.now())) { clear('Tahta erişimi sona erdi.'); return; }
    if (!managed) scheduleExpiry(exam.expiresAt);
    panel.dataset.live = 'true'; content.replaceChildren();
    const student = exam.students.find(s => s.id === exam.activeStudentId);
    const studentHeading = el('h2', undefined, 'se-board-student');
    if (student) studentHeading.append(el('span', student.name, changed && !sameStudent ? 'se-name-pop' : ''));
    else {
      studentHeading.setAttribute('aria-label', 'Öğrenci seçimi bekleniyor...');
      const waiting = el('span', 'Öğrenci seçimi bekleniyor'), dots = el('span', undefined, 'se-waiting-dots');
      dots.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 3; i++) dots.append(el('span', '.'));
      waiting.append(dots); studentHeading.append(waiting);
    }
    content.append(studentHeading);
    const scores = exam.results[exam.activeStudentId]?.scores ?? emptyScores();
    const list = el('ol', undefined, 'se-board-rubric');
    list.tabIndex = 0; list.setAttribute('aria-label', 'Değerlendirme ölçütleri');
    exam.rubric.criteria.forEach((criterion, i) => {
      const updated = changed && sameStudent && lastScores && scores[i] !== lastScores[i];
      const row = el('li'), score = el('strong'), number = el('span', scores[i] === null ? '—' : String(scores[i]), 'se-score-value');
      if (scores[i] !== null) {
        number.dataset.tone = scores[i] > 5 ? 'high' : scores[i] === 5 ? 'middle' : 'low';
        if (updated) number.classList.add('se-update-pop');
      }
      score.append(number, document.createTextNode(' / 10'));
      row.append(el('span', criterion), score); list.append(row);
    });
    const value = total(scores), footer = el('div', undefined, 'se-board-footer');
    footer.append(el('output', `Puan: ${value.sum}`, 'se-total'), el('small', `${value.count}/10 ölçüt`, 'se-criterion-count'));
    content.append(list, footer);
    list.scrollTop = scrollTop;
    if (restoreListFocus) list.focus({preventScroll:true});
    lastStudent = exam.activeStudentId; lastScores = [...scores];
    const delay = selectionRemainingMs(exam);
    if (student && delay !== null) selectionTimer = setTimeout(() => {
      if (expired || lastId !== exam.id || lastRevision !== exam.revision || lastStudent !== exam.activeStudentId) return;
      expiredSelection = {id:exam.id, revision:exam.revision, studentId:exam.activeStudentId};
      applySnapshot({...exam, activeStudentId:null, selectionExpiresAt:null});
    }, delay);
  };
  const reader = coalescedReader(read, applySnapshot, () => { lastRevision = -1; clear('Bağlantı veya erişim doğrulanamadı. Yeniden bağlanın.'); });
  let expiryTimer;
  function scheduleExpiry(expiry) { clearTimeout(expiryTimer); expiryTimer = setTimeout(() => { expired = true; clear('Tahta erişimi sona erdi.'); unsubscribe(); reader.close(); }, Math.min(2147483647, Math.max(0, expiry - Date.now()))); }
  if (!managed) unsubscribe = api.subscribe(topic, () => { if (!document.hidden && !expired) reader.trigger(); }, state => {
    if (state !== 'SUBSCRIBED') { reader.invalidate(); lastRevision = -1; clear('Canlı bağlantı kesildi. Yeniden bağlanınca güncellenecek.'); }
  });
  const refresh = () => { if (!document.hidden && !expired) reader.trigger(); };
  const offline = () => { reader.invalidate(); lastRevision = -1; clear('Bağlantı kesildi. Yeniden bağlanınca güncellenecek.'); };
  if (!managed) { document.addEventListener('visibilitychange', refresh); window.addEventListener('online', refresh); window.addEventListener('offline', offline); reader.trigger(); }
  const dispose = () => { expired = true; clearTimeout(selectionTimer); clearTimeout(expiryTimer); reader.close(); unsubscribe(); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); dialog.removeEventListener('keydown', escape, true); panel.remove(); tab.remove(); dialog.classList.remove('se-live', 'se-drawer-open'); };
  dispose.update = exam => { if (!expired) applySnapshot(exam); };
  return dispose;
}
