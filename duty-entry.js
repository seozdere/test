// Only a class-availability check runs before opening; duty records remain lazy-loaded.
(() => {
 const admin=document.querySelector('body')?.classList.contains('admin-page') || !!document.getElementById('speechExamOpen');
 const anchor=admin?document.getElementById('speechAdmin'):document.getElementById('toolsSectionBody');
 if(!anchor)return;
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./duty-launch.css?v=duty-week-month-20261101',document.currentScript.src);document.head.append(css);
 const button=document.createElement('button');button.type='button';button.id='dutyOpen';button.className=admin?'tbtn no-kiosk duty-launch':'tool-card tool-launch';
 const art='<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="6" width="26" height="23" rx="7" fill="#E0EDE4" stroke="#748C80" stroke-width="1.6"/><path d="M10 3v6M22 3v6M4 13h24" stroke="#748C80" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="19" r="3" fill="#E7CABA"/><path d="M7 26a5 5 0 0 1 10 0m3-5 2 2 4-5" stroke="#748C80" stroke-width="1.8" stroke-linecap="round"/></svg>';
 if(admin){
  const section=document.createElement('details');section.id='dutyAdmin';section.className='announcement-details admin-info-panel no-kiosk';
  section.innerHTML='<summary class="announcement-summary"><span>'+art+' Nöbetçi Öğrenciler</span></summary><div class="duty-menu-body"></div>';
  button.textContent='Nöbet yönetimini aç';button.classList.add('tbtn-accent');section.querySelector('.duty-menu-body').append(button);
  (document.getElementById('speechExamAdmin')||anchor).after(section);
 }else{
  button.classList.add('duty-tool-card');button.innerHTML='<h3>'+art+'Nöbetçi Öğrenciler</h3><p>Bu haftanın nöbetçi öğrencileri.</p><span class="tools-soon">Bu hafta ↗</span><span class="duty-card-art" aria-hidden="true">'+art+'</span>';
  (anchor.querySelector('.tools-grid')||anchor).append(button);
 }
 if(!admin){
  button.hidden=true;
  let channel=null,channelName=null,checking=false;
  async function availability(){
   if(checking)return;const token=typeof ClassLogData!=='undefined'?ClassLogData.parentToken||new URLSearchParams(location.search).get('id'):null;if(!token)return;
   checking=true;try{
    const {data,error}=await _supabase.rpc('cl_duty_available',{p_parent_token:token});button.hidden=!!error||data?.enabled!==true;
    if(!error&&data?.channel&&data.channel!==channelName){if(channel)_supabase.removeChannel(channel);channelName=data.channel;channel=_supabase.channel(channelName).on('broadcast',{event:'changed'},()=>{availability();window.dispatchEvent(new Event('notik-duty-change'));}).subscribe();}
   }catch(_){button.hidden=true;}finally{checking=false;}
  }
  availability();document.addEventListener('DOMContentLoaded',availability,{once:true});window.addEventListener('online',availability);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')availability();});
  const tools=document.getElementById('toolsPanel');if(tools)new MutationObserver(()=>{if(!tools.hidden)availability();}).observe(tools,{attributes:true,attributeFilter:['hidden']});
 }
 button.onclick=async()=>{button.disabled=true;try{const module=await import('./duty-ui.mjs?v=duty-week-month-20261101');await module.openDuty({client:_supabase,token:()=>admin?ClassLogAuth.getSessionToken():ClassLogData.parentToken,parent:!admin,className:ClassLogData.currentClass,launcher:button});}catch(e){alert(e.message||'Nöbet ekranı açılamadı.');}finally{button.disabled=false;}};
})();
