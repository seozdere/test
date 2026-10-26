// TEST DEPLOY ONLY. Do not copy this file into the live deployment.
import {LIVE_ENABLED, SpeechExamApi} from './speech-exam-api.mjs?v=test-20261026';
import {mountAdmin, mountBoard} from './speech-exam-ui.mjs?v=3';
let styles;
function loadStyles() {
  if (!styles) styles = new Promise((resolve, reject) => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./speech-exam.css?v=3', import.meta.url).href;
    link.onload = resolve; link.onerror = () => { link.remove(); styles = null; reject(Error('Sınav görünümü yüklenemedi.')); }; document.head.append(link);
  });
  return styles;
}
export function install() {
  if (!LIVE_ENABLED) return;
  const launcher = document.getElementById('speechExamOpen');
  if (launcher) {
    launcher.disabled = false; launcher.title = '';
    const availability = document.getElementById('speechExamAvailability'); if (availability) availability.textContent = '';
    launcher.addEventListener('click', async () => {
      if (!ClassLogAuth.hasFullTeacherSession()) return;
      launcher.disabled = true;
      try {
        await loadStyles();
        const dialog = document.createElement('dialog'); dialog.className = 'se-dialog se-root'; dialog.setAttribute('aria-label', 'Canlı Konuşma Sınavı');
        const close = document.createElement('button'); close.type = 'button'; close.className = 'se-dialog-close'; close.textContent = 'Kapat';
        const body = document.createElement('div'); dialog.append(close, body); document.body.append(dialog);
        const api = new SpeechExamApi(_supabase, () => ClassLogAuth.getSessionToken());
        const ui = mountAdmin(body, api, {className: ClassLogData.currentClass, subjectId: ClassLogData.currentSubject,
          termId: ClassLogData._teacherTermId(), date: document.getElementById('currentDate').value});
        const finish = async () => { close.disabled = true; try { await ui.close(); dialog.close(); dialog.remove(); launcher.focus(); } catch (_) { close.disabled = false; } };
        close.onclick = finish; dialog.addEventListener('cancel', event => { event.preventDefault(); void finish(); }); dialog.showModal();
      } finally { launcher.disabled = false; }
    });
  }
  // This URL flag only reveals a pairing input. It never grants access.
  // A board capability is manually transferred, never sent on the kiosk channel.
  const timer = document.getElementById('speechDialog');
  if (timer && new URLSearchParams(location.search).has('speechBoard')) {
    const section = document.createElement('section'); section.className = 'se-root';
    const label = document.createElement('label'); label.textContent = 'Sınava özel tahta erişim anahtarı';
    const input = document.createElement('input'); input.type = 'password'; input.autocomplete = 'off'; input.spellcheck = false; input.maxLength = 128; label.append(input);
    const connect = document.createElement('button'); connect.textContent = 'Tahtaya bağlan'; connect.type = 'button';
    const status = document.createElement('p'); status.setAttribute('role', 'status'); section.append(label, connect, status); timer.querySelector('.speech-stage').append(section);
    let disconnect = null, credential = '', generation = 0;
    connect.onclick = async () => {
      const attempt = ++generation;
      connect.disabled = true;
      try {
        credential = input.value.trim(); input.value = '';
        const api = new SpeechExamApi(_supabase, () => credential), verified = await api.board();
        if (verified.status !== 'active') throw Error('Aktif sınav bulunamadı.');
        await loadStyles();
        if (attempt !== generation || !timer.open) return;
        disconnect?.(); disconnect = mountBoard(timer, api, verified.topic); section.hidden = true;
      } catch (_) { if (attempt === generation) { credential = ''; status.textContent = 'Tahta erişimi doğrulanamadı.'; } }
      finally { if (attempt === generation) connect.disabled = false; }
    };
    timer.addEventListener('close', () => { generation++; disconnect?.(); disconnect = null; credential = ''; connect.disabled = false; section.hidden = false; status.textContent = ''; });
  }
}
