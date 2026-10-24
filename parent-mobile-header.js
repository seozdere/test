/* Hide only the school branding during deliberate mobile table scrolling. */
(() => {
 const root=document.getElementById('mainDashboard');if(!root)return;
 const header=root.querySelector('.excel-header'),brand=header.querySelector('.school-brand'),nav=header.querySelector('.header-right');
 const wrap=document.createElement('div');wrap.className='mobile-brand-wrap';brand.before(wrap);wrap.append(brand);
 const mobile=matchMedia('(max-width:1024px), (max-width:1366px) and (pointer:coarse)'),wide=matchMedia('(min-width:641px) and (max-width:1024px), (min-width:641px) and (max-width:1366px) and (pointer:coarse)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let compact=false,blockedUntil=0,userUntil=0,transitionId=0;
 let animations=[];
 const positions=new WeakMap(),saved=new Map();
 const ids={homework:'homeworkView',class:'classView',leader:'leaderPanel',tools:'toolsPanel'};
 const tools=document.getElementById('btnTools'),anchor=document.createComment('games shortcut');
 tools.before(anchor);
 const subjects=document.getElementById('subjectTabsParent');
 function placeTools(){
  const portraitMulti=matchMedia('(max-width:640px) and (orientation:portrait)').matches&&subjects.querySelectorAll('.subject-tab-parent').length>=2;
  root.classList.toggle('portrait-multi-subject',portraitMulti);
  if(wide.matches||portraitMulti){const target=nav.querySelector('.view-toggle-wrap');if(tools.parentElement!==target)target.append(tools);}
  else if(tools.previousSibling!==anchor)anchor.after(tools);
 }



 // Progressive experiment: unsupported browsers retain the previous controller below.
 if(CSS.supports('animation-timeline: --dashboard-scroll')&&CSS.supports('timeline-scope: --dashboard-scroll')&&CSS.supports('animation-range: 0px 100px')&&!reduced.matches){
  const panels=Object.values(ids).map(id=>document.getElementById(id));
  let shift=0,frame=0;
  const visible=()=>panels.find(el=>el&&el.getClientRects().length);
  function measure(){
   frame=0;
   root.classList.toggle('header-wide-touch',wide.matches);
   root.classList.toggle('header-collapsible',mobile.matches);
   placeTools();
   root.classList.toggle('header-scroll-driven',mobile.matches);
   if(!mobile.matches){panels.forEach(el=>el.classList.remove('panel-scroll-active'));return;}
   const height=header.offsetHeight;
   shift=wide.matches?0:Math.max(0,Math.floor(nav.getBoundingClientRect().top-header.getBoundingClientRect().top-8));
   root.style.setProperty('--hdr-h',height+'px');root.style.setProperty('--hdr-shift',shift+'px');
   const active=visible();
   panels.forEach(el=>el.classList.toggle('panel-scroll-active',el===active));
   window.scheduleLatestHomeworkMarker?.();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  window.ParentHeader={
   beforeSwitch(view){
    if(!mobile.matches)return null;
    const panel=document.getElementById(ids[view]);
    const position={top:panel?.scrollTop||0,left:panel?.scrollLeft||0};
    saved.set(view,position);return position;
   },
   afterSwitch(view,previous){
    measure();if(!mobile.matches||!previous)return;
    const panel=document.getElementById(ids[view]),position=saved.get(view)||previous;
    // Retain each tab's content offset, and never reveal branding on a collapsed-tab switch.
    panel.scrollTop=previous.top>=shift?Math.max(shift,position.top):position.top;
    panel.scrollLeft=position.left;
    window.scheduleLatestHomeworkMarker?.();
   }
  };
  new MutationObserver(schedule).observe(subjects,{childList:true});
  new ResizeObserver(schedule).observe(header);
  window.addEventListener('resize',schedule,{passive:true});
  mobile.addEventListener('change',schedule);wide.addEventListener('change',schedule);
  document.fonts?.ready.then(schedule);measure();
  return;
 }
 function syncLayout(){
  root.classList.toggle('header-wide-touch',wide.matches);
  root.classList.toggle('header-collapsible',mobile.matches);
  placeTools();
  if(!mobile.matches||wide.matches)setCompact(false);
  window.scheduleLatestHomeworkMarker?.();
 }
 window.ParentHeader={
  beforeSwitch(view){
   if(!mobile.matches)return null;
   const panel=document.getElementById(ids[view]);
   const position={top:panel?.scrollTop||0,left:panel?.scrollLeft||0};
   saved.set(view,position);userUntil=0;
   return position;
  },
  afterSwitch(view,previous){
   if(!mobile.matches||!previous)return;
   const panel=document.getElementById(ids[view]);if(!panel)return;
   const position=saved.get(view)||previous;
   panel.scrollTop=position.top;panel.scrollLeft=position.left;
   positions.set(panel,panel.scrollTop);
   window.scheduleLatestHomeworkMarker?.();
  }
 };
 async function setCompact(next){
  next=mobile.matches&&!wide.matches&&next;if(next===compact)return;
  const id=++transitionId;
  animations.forEach(a=>a.cancel());animations=[];delete root.dataset.headerAnimating;
  compact=next;blockedUntil=performance.now()+500;
  const duration=reduced.matches?0:220;
  if(compact&&duration&&brand.animate){
   const fade=brand.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:110,easing:'ease-in',fill:'forwards'});animations.push(fade);
   try{await fade.finished;}catch(_){return;}
   if(id!==transitionId)return;
  }

  const panels=[...root.children].filter(el=>['homeworkView','classView','leaderPanel','toolsPanel'].includes(el.id)&&el.getClientRects().length);
  const before=panels.map(el=>el.getBoundingClientRect().top);
  const scrollBefore=panels.map(el=>el.scrollTop);
  // One layout change; subsequent frames animate only transforms and opacity.
  root.classList.toggle('mobile-header-compact',compact);brand.inert=compact;
  animations.forEach(a=>a.cancel());animations=[];
  const after=panels.map(el=>el.getBoundingClientRect().top);
  // Use the space released by the branding before scrolling content away.
  // Apply the same compensation to every dashboard panel.
  panels.forEach((el,i)=>{
   if(compact){
    el.scrollTop=Math.max(0,scrollBefore[i]-Math.max(0,before[i]-after[i]));
    positions.set(el,el.scrollTop);
   }
  });
  window.positionLatestHomeworkMarker?.();
  if(!duration||!root.animate)return;
  root.dataset.headerAnimating='true';
  const animate=(el,frames)=>{const a=el.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.25,1)'});animations.push(a);return a;};
  panels.forEach((el,i)=>{const delta=before[i]-after[i]+el.scrollTop-scrollBefore[i];if(delta)animate(el,[{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}]);});
  animate(nav,[{opacity:.65,transform:'translateY('+(compact?8:-8)+'px)'},{opacity:1,transform:'translateY(0)'}]);
  if(!compact)animate(brand,[{opacity:0,transform:'translateY(-18px)'},{opacity:1,transform:'translateY(0)'}]);
  const marker=document.getElementById('latestHomeworkMarker');
  const index=panels.findIndex(el=>el.id==='homeworkView');
  if(marker&&index>=0){const delta=before[index]-after[index];animate(marker,[{translate:'0 '+delta+'px'},{translate:'0 0'}]);}
  Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(id===transitionId){animations=[];delete root.dataset.headerAnimating;window.scheduleLatestHomeworkMarker?.();}});
 }
 const mark=()=>{userUntil=performance.now()+1200;};
 const activePanel=()=>Object.values(ids).map(id=>document.getElementById(id)).find(el=>el&&el.getClientRects().length);
 function revealAtTop(up){
  const panel=activePanel();
  if(up&&compact&&panel&&panel.scrollTop<=1&&performance.now()>blockedUntil&&!document.querySelector('dialog[open]'))setCompact(false);
 }
 let touchY=0;
 root.addEventListener('wheel',e=>{mark();revealAtTop(e.deltaY<0);},{passive:true});
 root.addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY||0;},{passive:true});
 root.addEventListener('touchmove',e=>{mark();const y=e.touches[0]?.clientY||0;revealAtTop(y-touchY>12);touchY=y;},{passive:true});
 root.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!e.target.matches('input,textarea,select'))mark();});
 root.addEventListener('scroll',event=>{
  const panel=event.target;if(!['homeworkView','classView','leaderPanel','toolsPanel'].includes(panel.id))return;
  const y=Math.max(0,panel.scrollTop),previous=positions.get(panel)??0;positions.set(panel,y);
  if(!mobile.matches||performance.now()<blockedUntil||performance.now()>userUntil||document.querySelector('dialog[open]'))return;
  if(!compact&&y>48&&y>previous&&panel.scrollHeight-panel.clientHeight>wrap.offsetHeight+64)setCompact(true);
  else if(compact&&y<=1&&y<previous)setCompact(false);
 },{capture:true,passive:true});
 new MutationObserver(syncLayout).observe(subjects,{childList:true});
 window.addEventListener('resize',syncLayout,{passive:true});
 mobile.addEventListener('change',syncLayout);wide.addEventListener('change',syncLayout);syncLayout();
 window.addEventListener('pageshow',()=>{userUntil=0;setCompact(false);});
})();
