// Synthetic preview only: reuse the real timer markup/functions without running
// parent.js initialization, data.js, or any Supabase/student/topic request.
export async function openTimerPreview(api, mountBoard) {
  const [htmlResponse, jsResponse] = await Promise.all([fetch('../parent.html'), fetch('../parent.js')]);
  if (!htmlResponse.ok || !jsResponse.ok) throw Error('Kronometre önizlemesi yüklenemedi.');
  const html = await htmlResponse.text(), source = await jsResponse.text();
  const dialog = new DOMParser().parseFromString(html, 'text/html').getElementById('speechDialog');
  const start = source.indexOf('let speechElapsed ='), end = source.indexOf('function positionLatestHomeworkMarker()');
  if (!dialog || start < 0 || end <= start) throw Error('Kronometre kaynak yapısı değişmiş.');
  for (const href of ['../style.css?v=218', '../game-presentation.css?v=49', '../speech-exam.css?v=3']) {
    await new Promise(resolve => { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; link.onload = resolve; link.onerror = resolve; document.head.append(link); });
  }
  for (const node of dialog.querySelectorAll('.speech-topic-area button')) { node.disabled = true; node.removeAttribute('onclick'); node.title = 'Örnek önizlemede konu seçimi kapalı.'; }
  document.body.append(dialog);
  dialog.requestFullscreen = undefined;
  const url = URL.createObjectURL(new Blob([source.slice(start, end)], {type:'text/javascript'}));
  try { await new Promise((resolve,reject) => { const script=document.createElement('script'); script.src=url; script.onload=resolve; script.onerror=reject; document.body.append(script); }); }
  finally { URL.revokeObjectURL(url); }
  let cleanup;
  const open = () => { window.openSpeechTimer(); cleanup = mountBoard(dialog, api, 'demo'); };
  dialog.addEventListener('close', () => { cleanup?.(); cleanup = null; });
  open();
  return open;
}
