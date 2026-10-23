/* Both sections remain open on every screen size. */
(() => {
 for(const name of ['tools','games']){
  const toggle=document.getElementById(name+'SectionToggle'),body=document.getElementById(name+'SectionBody');
  if(!toggle||!body)continue;
  toggle.disabled=true;toggle.setAttribute('aria-expanded','true');
  body.dataset.mobileOpen='true';body.hidden=false;
 }
})();
