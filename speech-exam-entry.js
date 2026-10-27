// Prepared release client. Deploy only after the live preflight review.
// Server RPC permissions and the independent server gate control data access.
(() => {
  const RELEASE_ENABLED = true;
  const button = document.getElementById('speechExamOpen');
  if (button) {
    button.disabled = true;
    button.title = 'Güvenlik kurulumu ve testleri tamamlanana kadar kapalı.';
    button.setAttribute('aria-describedby', 'speechExamAvailability');
  }
  if (RELEASE_ENABLED) {
    // A separate server gate and real RPC authorization are still mandatory.
    import('./speech-exam-host.mjs?v=speech-layout-20261027-r6').then(module => module.install()).catch(() => {});
  }
})();
