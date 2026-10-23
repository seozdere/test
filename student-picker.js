(() => {
 const dialog=document.getElementById('studentPickerDialog'),result=document.getElementById('pickedStudent');
 let className=null, busy=false, selectionRun=0;
 const button=document.getElementById('pickStudentButton');
 const histories=new Map();
 const historyKey=()=> 'notik.student-picker.v1:'+JSON.stringify([ClassLogData.parentToken||null,ClassLogData._activeTid?.()||null,ClassLogData.currentClass]);
 function readHistory(key,list){
  let state=histories.get(key);
  if(!state){try{state=JSON.parse(sessionStorage.getItem(key));}catch(_){} }
  const clean=value=>Array.isArray(value)?value.filter(name=>typeof name==='string'&&list.includes(name)):[];
  return {recent:clean(state?.recent).slice(-15),used:[...new Set(clean(state?.used))]};
 }
 function saveHistory(key,state){
  histories.set(key,state);
  try{sessionStorage.setItem(key,JSON.stringify(state));}catch(_){}
 }
 window.openStudentPicker=()=>{
  if(dialog.open)return;
  if(className!==ClassLogData.currentClass){result.textContent='Hazır mısınız?';className=ClassLogData.currentClass;}
  document.getElementById('pickerClass').textContent=className+' sınıfı';
  dialog.showModal();if(dialog.requestFullscreen)dialog.requestFullscreen().catch(()=>{});
 };
 window.pickRandomStudent=async()=>{
  if(busy||!dialog.open)return;
  const list=[...new Set(students.filter(name=>typeof name==='string'&&name.trim()))];
  result.classList.remove('picker-reveal');
  if(!list.length){result.textContent='Bu sınıfta henüz öğrenci bulunmuyor.';return;}
  const key=historyKey(),history=readHistory(key,list);
  let pool;
  if(list.length<=15){
   pool=list.filter(name=>!history.used.includes(name));
   if(!pool.length){history.used=[];pool=list.filter(name=>list.length===1||name!==history.recent.at(-1));}
  }else{pool=list.filter(name=>!history.recent.includes(name));}
  const random=new Uint32Array(1);const limit=Math.floor(4294967296/pool.length)*pool.length;
  do{crypto.getRandomValues(random);}while(random[0]>=limit);
  const chosen=pool[random[0]%pool.length], selectedClass=ClassLogData.currentClass, run=++selectionRun;
  busy=true;button.disabled=true;button.querySelector('.picker-button-label').textContent='Seçiliyor…';
  result.classList.add('picker-shuffling');
  const figure=(longHair)=>'<svg viewBox="0 0 48 60" aria-hidden="true"><g stroke="#82688E" stroke-width="1.5" stroke-linejoin="round">'+(longHair?'<path d="M11 34V20c0-19 26-19 26 0v14Z" fill="#B7A2CC"/>':'')+'<path d="M7 56V46c0-17 34-17 34 0v10Z" fill="'+(longHair?'#D8EBDD':'#D8E3F5')+'"/><path d="M20 30v9q4 4 8 0v-9" fill="#F5DCC5"/><ellipse cx="24" cy="22" rx="10" ry="13" fill="#F5DCC5"/>'+(longHair?'<path d="M13 21q-2-18 12-16 13 1 10 17-7-2-11-10-4 8-11 9Z" fill="#B7A2CC"/>':'<path d="M13 19q-3-16 10-14l10-2-1 5q7 4 3 14l-4-9q-8 6-18 6Z" fill="#B4A0C5"/>')+'</g></svg>';
  result.innerHTML='<span class="picker-deck" aria-hidden="true">'+[false,true,false,true].map(g=>'<span class="picker-person-card">'+figure(g)+'</span>').join('')+'</span><span class="picker-shuffle-caption">Şanslı kişi kim olacak?</span>';
  await new Promise(resolve=>setTimeout(resolve,1000));
  if(run!==selectionRun)return;
  busy=false;button.disabled=false;button.querySelector('.picker-button-label').textContent='Yeniden seç';result.classList.remove('picker-shuffling');
  if(!dialog.open||selectedClass!==ClassLogData.currentClass||key!==historyKey()||!students.includes(chosen)){result.textContent='Yeniden seçim yapabilirsiniz.';return;}
  history.recent=[...history.recent,chosen].slice(-15);
  history.used=[...new Set([...history.used,chosen])];
  saveHistory(key,history);
  result.textContent=chosen;void result.offsetWidth;result.classList.add('picker-reveal');
 };
 window.closeStudentPicker=()=>{
  if(!dialog.open||dialog.classList.contains('speech-closing'))return;
  selectionRun++;busy=false;button.disabled=false;button.querySelector('.picker-button-label').textContent='Öğrenci seç';
  if(result.classList.contains('picker-shuffling')){result.classList.remove('picker-shuffling');result.textContent='Hazır mısınız?';}
  dialog.classList.add('speech-closing');setTimeout(()=>{dialog.close();dialog.classList.remove('speech-closing');if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});},matchMedia('(prefers-reduced-motion: reduce)').matches?0:260);
 };
 dialog.addEventListener('cancel',e=>{e.preventDefault();window.closeStudentPicker();});
})();
