// Small entry; no requests or module downloads until the tool is opened.
(() => {
 const admin=document.querySelector('body')?.classList.contains('admin-page') || !!document.getElementById('speechExamOpen');
 const anchor=admin?document.getElementById('speechAdmin'):document.getElementById('toolsSectionBody');
 if(!anchor)return;
 const button=document.createElement('button');button.type='button';button.id='dutyOpen';button.className=admin?'tbtn no-kiosk duty-launch':'tool-card tool-launch';
 button.innerHTML='<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="7" fill="#E0EDE4" stroke="#748C80" stroke-width="1.6"/><path d="M10 3v6M22 3v6M4 13h24" stroke="#748C80" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19" r="3" fill="#E7CABA"/><path d="M7 26a5 5 0 0 1 10 0m3-5 2 2 4-5" stroke="#748C80" stroke-width="1.8" stroke-linecap="round"/></svg><span>Nöbetçi Öğrenciler<small style="display:block;font-weight:400;font-size:12px;margin-top:4px">Akıllı ve adil nöbet planlaması</small></span>';
 if(admin){button.style.cssText='margin:10px 0;display:flex;align-items:center;gap:10px;';anchor.after(button);}else (anchor.querySelector('.tools-grid')||anchor).append(button);
 button.onclick=async()=>{button.disabled=true;try{const module=await import('./duty-ui.mjs?v=duty-1');await module.openDuty({client:_supabase,token:()=>admin?ClassLogAuth.getSessionToken():ClassLogData.parentToken,parent:!admin,className:ClassLogData.currentClass,launcher:button});}catch(e){alert(e.message||'Nöbet ekranı açılamadı.');}finally{button.disabled=false;}};
})();
