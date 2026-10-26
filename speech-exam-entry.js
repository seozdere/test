// TEST DEPLOY ONLY. Do not copy this file into the live deployment.
// Intentionally dormant. No RPC, Realtime subscription, roster read or heavy
// module download until the security review AND server release gate are complete.
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
    import('./speech-exam-host.mjs?v=test-20261026').then(module => module.install()).catch(() => {});
  }
})();
