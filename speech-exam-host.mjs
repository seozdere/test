import {LIVE_ENABLED, SpeechExamApi} from './speech-exam-api.mjs?v=speech-xlsx-template-20261028-r1';
import {mountAdmin, mountBoard} from './speech-exam-ui.mjs?v=speech-xlsx-template-20261028-r1';
import {SpeechDeviceApi, mountDeviceAdmin, installAutomaticBoard} from './speech-exam-device.mjs?v=speech-xlsx-template-20261028-r1';
let styles;
function loadStyles() {
  if (!styles) styles = new Promise((resolve, reject) => {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./speech-exam.css?v=speech-xlsx-template-20261028-r1', import.meta.url).href;
    link.onload = resolve; link.onerror = () => { link.remove(); styles = null; reject(Error('Sınav görünümü yüklenemedi.')); }; document.head.append(link);
  });
  return styles;
}
export function install() {
  if (!LIVE_ENABLED) return false;
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
        const close = document.createElement('button'); close.type = 'button'; close.className = 'se-dialog-close'; close.setAttribute('aria-label', 'Kapat'); close.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
        const body = document.createElement('div'); dialog.append(close, body); document.body.append(dialog);
        const api = new SpeechExamApi(_supabase, () => ClassLogAuth.getSessionToken());
        api.issueBoard = undefined; api.revokeBoard = undefined;
        const deviceRoot = document.createElement('div');
        const deviceContext = {className: ClassLogData.currentClass, subjectId: ClassLogData.currentSubject, termId: ClassLogData._teacherTermId()};
        const closeDevices = mountDeviceAdmin(deviceRoot, new SpeechDeviceApi(_supabase, () => ClassLogAuth.getSessionToken()), deviceContext);
        const ui = mountAdmin(body, api, {className: ClassLogData.currentClass, subjectId: ClassLogData.currentSubject,
          termId: ClassLogData._teacherTermId(), date: document.getElementById('currentDate').value});
        body.querySelector('.se-header').after(deviceRoot);
        const finish = async () => { close.disabled = true; try { await ui.close(); closeDevices(); dialog.close(); dialog.remove(); launcher.focus(); } catch (_) { close.disabled = false; } };
        close.onclick = finish; dialog.addEventListener('cancel', event => { event.preventDefault(); void finish(); }); dialog.showModal();
      } finally { launcher.disabled = false; }
    });
  }
  const timer = document.getElementById('speechDialog');
  if (timer) installAutomaticBoard(timer, new SpeechDeviceApi(_supabase), {
    parentToken: () => new URLSearchParams(location.search).get('id'), loadStyles, mountBoard
  });
}
