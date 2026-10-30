// Prepared release client. Deploy only after the live preflight review.
// Server RPC permissions and the independent server gate control data access.
(() => {
  const RELEASE_ENABLED = true;
  const button = document.getElementById('speechExamOpen');
  const availability = document.getElementById('speechExamAvailability');
  function inform(message) {
    if (availability) availability.textContent = message;
    if (button) button.title = message;
  }
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-describedby', 'speechExamAvailability');
  }
  if (RELEASE_ENABLED) {
    inform('Sınav ekranı yükleniyor…');
    // A separate server gate and real RPC authorization are still mandatory.
    import('./speech-exam-host.mjs?v=speech-score-toggle-20261029-r1').then(module => {
      if (module.install() === false) inform('Canlı sınav bu uygulama sürümünde kapalı.');
    }).catch(error => {
      if (button) button.disabled = true;
      inform('Sınav dosyaları yüklenemedi. Sayfayı yenileyin; sorun sürerse güncel uygulama dosyalarının birlikte yüklendiğini kontrol edin.');
      console.error('NoTik sınav modülü yüklenemedi:', error);
    });
  } else inform('Canlı sınav bu uygulama sürümünde kapalı.');
})();
