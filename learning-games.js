(function(){
 'use strict';
 const {shuffle,gradeAnswer}=window.NoTikPuzzleCore,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const titles={sudoku:'Sudoku',city:'Şehrini Bul',country:'Ülkeyi Bul'},continents={'Europe':'Avrupa','Asia':'Asya','Africa':'Afrika','North America':'Kuzey Amerika','South America':'Güney Amerika','Oceania':'Okyanusya'};
 const dialog=document.createElement('dialog');dialog.id='learningDialog';dialog.className='speech-dialog learning-game';dialog.setAttribute('aria-label','Bulmaca');document.body.append(dialog);
 let kind,cache={},session=null,clock=null,geoTimer=null,token=0,level='easy',region='Europe',countryLevel='medium',cityMode='name',bags={};
 // Small islands and obscure territories are deliberately excluded from questions.
 const countryPools={
  Europe:{easy:'TR GB FR ES IT DE GR SE NO FI PL',medium:'PT IE NL BE CH AT CZ HU RO BG UA DK HR RS',hard:'RU BY MD LT LV EE AL BA MK ME SI SK IS'},
  Asia:{easy:'TR CN IN JP SA IR IQ',medium:'PK AF MN UZ TH VN MY ID KR SY KZ',hard:'RU GE AM AZ TM TJ KG NP BD LK KH LA MM KP PH JO OM YE'},
  Africa:{easy:'EG ZA MA DZ LY SD KE',medium:'TN ET SO NG TZ CD AO NA MG GH SN CM ZM ZW',hard:'ML MR NE TD BF CI GN SL LR BJ TG GA CG CF SS UG RW BI BW MZ MW ER'},
  'North America':{easy:'CA US MX',medium:'CU GT HN NI CR PA DO',hard:'HT BZ SV JM'},
  'South America':{easy:'BR AR CL PE CO',medium:'VE EC BO PY UY',hard:'GY SR'},
  Oceania:{easy:'AU NZ',medium:'PG',hard:'SB VU'}
 };
 const countryIds=(area=region,difficulty=countryLevel)=>[...new Set(['easy','medium','hard'].slice(0,['easy','medium','hard'].indexOf(difficulty)+1).flatMap(l=>countryPools[area][l].split(' ')))];
 function pathBounds(d){const n=d.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=n.filter((_,i)=>i%2===0),ys=n.filter((_,i)=>i%2===1);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];}
 function continentSource(world){
  const extras=(world.background||[]).filter(x=>['KAZ','CUB'].includes(x.id)).map(x=>({...x,id:x.id==='KAZ'?'KZ':'CU'}));
  const items=[...world.items,...extras].filter(x=>x.continent===region||(['Europe','Asia'].includes(region)&&['TR','RU'].includes(x.id)));
  // Frame the main land masses, not overseas territories or remote island groups.
  const frameIds=countryIds(region,'hard').filter(id=>id!=='RU');
  const anchors=items.filter(x=>frameIds.includes(x.id)).map(x=>x.paths.map(pathBounds).sort((a,b)=>(b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0]);
  const left=Math.min(...anchors.map(b=>b[0])),top=Math.min(...anchors.map(b=>b[1])),right=Math.max(...anchors.map(b=>b[2])),bottom=Math.max(...anchors.map(b=>b[3]));
  const pad=Math.max(right-left,bottom-top)*.055;
  return {items,background:(world.background||[]).filter(x=>x.continent===region&&!['KAZ','CUB'].includes(x.id)),viewBox:[left-pad,top-pad,right-left+2*pad,bottom-top+2*pad].join(' ')};
 }
 const $=id=>dialog.querySelector('#'+id);
 const button=(id,label,cls='')=>`<button type="button" id="${id}" class="${cls}">${label}</button>`;
 function shell(content){if(content.includes('class="learn-choices')||content.includes('class="learn-setup'))content=window.gameIntroArt('tool-'+kind)+content;dialog.innerHTML=button('learnClose','✕','speech-close')+'<main class="learn-stage">'+content+'</main>';$('learnClose').setAttribute('aria-label','Oyunu kapat');$('learnClose').onclick=close;dialog.scrollTop=0;}
 function close(){
  if(kind==='country'&&session){menu();return;}
  clearTimeout(geoTimer);token++;clearInterval(clock);session=null;dialog.close();document.querySelector('.tool-'+kind)?.focus();
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 async function load(name){if(cache[name])return cache[name];const r=await fetch(name+'-data.json?v='+(name==='geography'?'3':'2'));if(!r.ok)throw Error('load');return cache[name]=await r.json();}
 window.openLearningGame=async function(type){
  if(!titles[type])return;clearTimeout(geoTimer);kind=type;session=null;clearInterval(clock);const request=++token;dialog.dataset.kind=type;shell(`<h2>${titles[type]}</h2><p role="status">Oyun hazırlanıyor…</p>`);if(!dialog.open)dialog.showModal();
  try{await load(type==='sudoku'?'sudoku':'geography');if(request!==token||!dialog.open)return;menu();}
  catch{if(request!==token)return;shell('<h2>Oyun yüklenemedi</h2><p>Bağlantını kontrol edip tekrar dene.</p>'+button('learnRetry','Tekrar dene'));$('learnRetry').onclick=()=>window.openLearningGame(type);}
 };
 function menu(){
  clearTimeout(geoTimer);clearInterval(clock);session=null;
  if(kind==='sudoku'){
   shell('<h2>Sudoku</h2><p>Bir zorluk seç, sayıları yerleştir.</p><div class="learn-choices">'+[['easy','Kolay'],['medium','Orta'],['hard','Zor']].map(([v,n])=>`<button type="button" data-level="${v}"><strong>${n}</strong><span>9 × 9 sudoku</span></button>`).join('')+'</div>');
   dialog.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{level=b.dataset.level;startSudoku();});
  }else if(kind==='country'){
   shell(`<h2>Ülkeyi Bul</h2><p>Bir kıta seç, ülkeleri keşfet!</p><div class="country-levels" role="group" aria-label="Zorluk">${[['easy','Kolay'],['medium','Orta'],['hard','Zor']].map(([v,n])=>`<button data-country-level="${v}" aria-pressed="${countryLevel===v}">${n}</button>`).join('')}</div><div class="learn-choices continent-choices">${Object.entries(continents).map(([v,n],i)=>`<button type="button" data-continent="${v}"><svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#817299" stroke-width="2"><circle cx="32" cy="30" r="23" fill="${['#DDEBD8','#F6E4C6','#F5D9CD','#D9E8F6','#E7DDF1','#D8ECE7'][i]}"/><ellipse cx="32" cy="30" rx="12" ry="23"/><path d="M9 30h46M14 16q18 12 36 0M14 44q18-12 36 0M32 53v6m-12 0h24"/></svg><strong>${n}</strong><span>${countryIds(v,countryLevel).length} ülke</span></button>`).join('')}</div><p class="learn-credit">Her tur en fazla 10 farklı ülke · Zor modda daha az bilinen ülkeleri keşfet.</p>`);
   dialog.querySelectorAll('[data-country-level]').forEach(b=>b.onclick=()=>{countryLevel=b.dataset.countryLevel;menu();});
   dialog.querySelectorAll('[data-continent]').forEach(b=>b.onclick=()=>{region=b.dataset.continent;startGeo();});
  }else{
   cityMode='name';
   const choices=[['name','Şehri haritada bul'],['plate','Plakadan şehri bul']];
   const options=`<div class="geo-select-label">${kind==='city'?'Oyun türü':'Kıta'}</div><details id="geoSelect" class="geo-select"><summary><span id="geoSelected">${choices[0][1]}</span><span class="geo-chevron" aria-hidden="true">⌄</span></summary><div class="geo-options" role="group" aria-label="${kind==='city'?'Oyun türü':'Kıta'}">${choices.map(([v,n],i)=>`<button type="button" data-choice="${v}" aria-pressed="${i===0}">${n}</button>`).join('')}</div></details>`;
   shell(`<h2>${titles[kind]}</h2><p>Haritada bul, her doğru cevapla puan kazan!</p><div class="learn-setup">${options}<p>En fazla 10 soru · Her soru en fazla 10 puan</p>${button('geoStart','Başla','mint')}</div><p class="learn-credit">${kind==='city'?'81 il · Plaka ve harita':'164 ülke · Küçük ada ülkelerinin tamamı bu haritada yer almıyor.'}</p>`);
   dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(kind==='city')cityMode=b.dataset.choice;else region=b.dataset.choice;$('geoSelected').textContent=b.textContent;dialog.querySelectorAll('[data-choice]').forEach(o=>o.setAttribute('aria-pressed',o===b));$('geoSelect').open=false;$('geoSelect').querySelector('summary').focus();});
   $('geoSelect').addEventListener('keydown',e=>{if(e.key==='Escape'&&$('geoSelect').open){e.preventDefault();e.stopPropagation();$('geoSelect').open=false;$('geoSelect').querySelector('summary').focus();}});
   $('geoStart').onclick=startGeo;
  }
 }
 function result(title,content,restart){
  dialog.querySelector('.geo-correct-feedback')?.remove();
  clearInterval(clock);const main=dialog.querySelector('main');main.inert=true;
  const cover=document.createElement('div');cover.className='learn-overlay';cover.innerHTML=`<section class="learn-result" role="dialog" aria-modal="true" aria-labelledby="learnResultTitle"><div class="learn-result-star" aria-hidden="true">✦</div><h2 id="learnResultTitle">${title}</h2>${content}${button('learnAgain','Yeniden oyna','mint')}${button('learnMenu','Seçime dön')}</section>`;dialog.append(cover);
  $('learnAgain').onclick=()=>{cover.remove();main.inert=false;restart();};$('learnMenu').onclick=()=>{cover.remove();main.inert=false;menu();};$('learnAgain').focus();
 }
 function takePuzzle(){if(!bags[level]?.length)bags[level]=shuffle(cache.sudoku[level]);return bags[level].pop();}
 function startSudoku(){
  clearInterval(clock);const entry=takePuzzle();session={puzzle:entry.puzzle,solution:entry.solution,values:[...entry.puzzle].map(Number),selected:entry.puzzle.indexOf('0'),undo:[],errors:0,hints:0,started:Date.now(),done:false};
  shell(`<h2>Sudoku <small>${{easy:'Kolay',medium:'Orta',hard:'Zor'}[level]}</small></h2><div class="learn-stats"><span id="sudokuClock">00:00</span><span id="sudokuStats"></span></div><div id="sudokuGrid" class="sudoku-grid" role="group" aria-label="Sudoku tahtası"></div><p id="sudokuMessage" class="learn-message" role="status">Boş bir kareye, ardından bir sayıya dokun.</p><div class="sudoku-pad">${Array.from({length:9},(_,i)=>button('number'+(i+1),i+1)).join('')}</div><div class="learn-actions">${button('sudokuErase','Sil')}${button('sudokuUndo','Geri al')}${button('sudokuHint','İpucu','sand')}${button('sudokuNew','Yeni sudoku','blue')}</div><p class="learn-credit">Her satır, sütun ve 3 × 3 kutuda 1–9 birer kez bulunmalı.<br>1000 puanla başlarsın; yanlış deneme −20, ipucu −50 puan.<br><a href="licenses/learning-games.txt" target="_blank" rel="noopener">Bulmaca kaynağı ve lisans</a></p>`);
  $('sudokuGrid').onclick=e=>{const b=e.target.closest('[data-cell]');if(b){session.selected=Number(b.dataset.cell);drawSudoku();}};
  for(let n=1;n<=9;n++)$('number'+n).onclick=()=>enter(n);
  $('sudokuErase').onclick=()=>{const i=session.selected;if(!editable(i)||!session.values[i])return;snapshot();session.values[i]=0;drawSudoku();};
  $('sudokuUndo').onclick=()=>{const old=session.undo.pop();if(old){session.values=old.values;drawSudoku();}};
  $('sudokuHint').onclick=()=>{let i=session.selected;if(!editable(i)||session.values[i])i=session.values.indexOf(0);if(i<0)return;session.selected=i;session.hints++;place(Number(session.solution[i]));$('sudokuMessage').textContent='Bir kare senin için dolduruldu.';};
  $('sudokuNew').onclick=startSudoku;
  clock=setInterval(()=>{if(!session||session.done)return;const sec=Math.floor((Date.now()-session.started)/1000);$('sudokuClock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');},1000);drawSudoku();
 }
 const editable=i=>i>=0&&session.puzzle[i]==='0'&&!session.done;
 function snapshot(){session.undo.push({values:[...session.values]});}
 function enter(n){
  const s=session,i=s.selected;if(!editable(i))return;
  if(Number(s.solution[i])!==n){s.errors++;$('sudokuMessage').textContent='Bu sayı bu kareye uygun değil. Bir daha dene.';drawSudoku();return;}
  if(s.values[i]===n)return;place(n);$('sudokuMessage').textContent='Doğru yerleştirdin!';
 }
 function place(n){
  const s=session,i=s.selected;snapshot();s.values[i]=n;
  drawSudoku();if(s.values.join('')===s.solution){s.done=true;result('Sudoku tamamlandı!',`<strong>${Math.max(0,1000-s.errors*20-s.hints*50)} puan</strong><p>${s.errors} yanlış deneme · ${s.hints} ipucu</p>`,startSudoku);}
 }
 function drawSudoku(){
  const s=session,focus=document.activeElement?.dataset?.cell;
  $('sudokuGrid').innerHTML=s.values.map((v,i)=>`<button type="button" data-cell="${i}" class="${s.puzzle[i]!=='0'?'given ':''}${i===s.selected?'chosen ':''}${i%9===2||i%9===5?'box-right ':''}${Math.floor(i/9)===2||Math.floor(i/9)===5?'box-bottom':''}" aria-label="Satır ${Math.floor(i/9)+1}, sütun ${i%9+1}, ${v||'boş'}${s.puzzle[i]!=='0'?', sabit':''}" aria-pressed="${i===s.selected}">${v||''}</button>`).join('');
  if(focus!==undefined)$('sudokuGrid').querySelector(`[data-cell="${focus}"]`)?.focus({preventScroll:true});
  $('sudokuStats').textContent=`${s.values.filter(Boolean).length}/81 · ${s.errors} yanlış · ${s.hints} ipucu`;
  $('sudokuUndo').disabled=!s.undo.length;
 }
 dialog.addEventListener('keydown',e=>{
  if(kind!=='sudoku'||!session||session.done||e.ctrlKey||e.metaKey||e.altKey)return;
  if(/^[1-9]$/.test(e.key)){e.preventDefault();enter(Number(e.key));}
  else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();$('sudokuErase').click();}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[e.key];session.selected=Math.max(0,Math.min(80,session.selected+delta));drawSudoku();$('sudokuGrid').querySelector(`[data-cell="${session.selected}"]`).focus();}
 });
 function startGeo(){
  clearTimeout(geoTimer);
  const source=kind==='city'?cache.geography.turkey:continentSource(cache.geography.world);const pool=source.items.filter(x=>kind==='city'||countryIds().includes(x.id));
  session={source,questions:shuffle(pool).slice(0,10),index:0,score:0,correct:0,attempts:0,wrong:new Set(),locked:false,zoom:1,hinted:false};
  shell(`<h2>${titles[kind]}</h2><div class="learn-stats"><span id="geoProgress"></span><strong id="geoScore"></strong></div><h3 id="geoQuestion" class="geo-question"></h3><div class="geo-layout"><div id="geoViewport" class="geo-viewport"><svg id="geoMap" preserveAspectRatio="xMidYMid meet" viewBox="${source.viewBox}" role="group" aria-label="${kind==='city'?'Türkiye illeri':'Dünya ülkeleri'}"></svg></div><aside class="geo-navigation" aria-label="Harita kontrolleri"><div class="geo-zoom-buttons">${button('geoZoomIn','+')}${button('geoZoomOut','−')}</div><div class="geo-directions">${button('geoUp','↑')}${button('geoLeft','←')}${button('geoDown','↓')}${button('geoRight','→')}</div>${button('geoZoomReset','Sığdır')}</aside></div><p id="geoMessage" class="learn-message" role="status"></p><div class="learn-actions geo-actions">${button('geoRestart','Baştan başla','mint')}${button('geoSkip','Pas','blue')}</div><p class="learn-credit">Yakınlaştırıp haritayı kaydırabilirsin. Yanlış seçim −2 puan; doğru cevap en az 2 puan.<br><a href="licenses/learning-games.txt" target="_blank" rel="noopener">Harita kaynakları</a></p>`);
  $('geoZoomIn').setAttribute('aria-label','Haritayı yakınlaştır');$('geoZoomOut').setAttribute('aria-label','Haritayı uzaklaştır');
  if(kind==='country'){
   $('learnClose').setAttribute('aria-label','Kıta seçimine dön');
   dialog.querySelector('h2').textContent=continents[region]+' · '+({easy:'Kolay',medium:'Orta',hard:'Zor'}[countryLevel]);
   $('geoMap').setAttribute('aria-label',continents[region]+' ülkeleri');
   const back=document.createElement('button');back.type='button';back.className='geo-continent-back';back.textContent='Kıta seç';back.onclick=menu;dialog.querySelector('.learn-stats').append(back);
  }
  $('geoZoomIn').onclick=()=>zoom(session.zoom+.5);$('geoZoomOut').onclick=()=>zoom(session.zoom-.5);$('geoZoomReset').onclick=()=>{zoom(1);$('geoViewport').scrollTo(0,0);};
  $('geoMap').innerHTML=(source.background||[]).map(x=>`<g class="geo-background">${x.paths.map(d=>`<path d="${esc(d)}"/>`).join('')}</g>`).join('')+source.items.map(x=>`<g data-place="${esc(x.id)}" role="button" tabindex="0" aria-label="${esc(x.name)}">${x.paths.map(d=>`<path d="${esc(d)}"/>`).join('')}</g>`).join('');
  let bounds=source.viewBox.split(' ').map(Number);
  if(kind==='city'){const b=$('geoMap').getBBox();bounds=[b.x-6,b.y-6,b.width+12,b.height+12];$('geoMap').setAttribute('viewBox',bounds.join(' '));}
  $('geoViewport').style.setProperty('--map-ratio',bounds[2]/bounds[3]);
  if(kind==='country'){
   const main=dialog.querySelector('main'),layout=dialog.querySelector('.geo-layout'),side=document.createElement('aside');
   main.classList.add('country-board');side.className='country-sidebar';side.setAttribute('aria-label','Soru ve oyun kontrolleri');
   for(const el of [main.querySelector('h2'),main.querySelector('.learn-stats'),$('geoQuestion'),layout.querySelector('.geo-navigation'),$('geoMessage'),main.querySelector('.geo-actions'),main.querySelector('.learn-credit')])side.append(el);
   main.append(side);
  }
  for(const [id,dx,dy,label] of [['geoUp',0,-1,'Haritayı yukarı kaydır'],['geoDown',0,1,'Haritayı aşağı kaydır'],['geoLeft',-1,0,'Haritayı sola kaydır'],['geoRight',1,0,'Haritayı sağa kaydır']]){$(id).setAttribute('aria-label',label);$(id).onclick=()=>pan(dx,dy);}
  $('geoMap').onclick=e=>{const g=e.target.closest('[data-place]');if(g)answer(g.dataset.place,e.target.closest('path'),e);};
  $('geoMap').onkeydown=e=>{const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(direction){e.preventDefault();pan(...direction);return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();const g=e.target.closest('[data-place]');if(g)answer(g.dataset.place);}};
  $('geoRestart').onclick=startGeo;
  $('geoSkip').onclick=()=>{if(session.locked)return;session.locked=true;mark(target().id,'right');$('geoMessage').textContent='Cevap: '+target().name;$('geoQuestion').classList.add('geo-question-leaving');geoControls();queueGeoNext(1400);};
  question();
 }
 const target=()=>session.questions[session.index];
 function mark(id,cls){$('geoMap').querySelector(`[data-place="${id}"]`)?.classList.add(cls);}
 function pan(dx,dy){const view=$('geoViewport');view.scrollBy({left:dx*view.clientWidth*.35,top:dy*view.clientHeight*.35,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 function zoom(value){
  const view=$('geoViewport'),map=$('geoMap');
  const centerX=(view.scrollLeft+view.clientWidth/2)/view.scrollWidth,centerY=(view.scrollTop+view.clientHeight/2)/view.scrollHeight;
  session.zoom=Math.max(1,Math.min(5,value));map.style.width=(session.zoom*100)+'%';map.style.height=(session.zoom*100)+'%';
  view.scrollTo({left:centerX*view.scrollWidth-view.clientWidth/2,top:centerY*view.scrollHeight-view.clientHeight/2,behavior:'instant'});
  $('geoZoomIn').disabled=session.zoom===5;$('geoZoomOut').disabled=session.zoom===1;for(const id of ['geoUp','geoDown','geoLeft','geoRight'])$(id).disabled=session.zoom===1;
 }
 function question(){session.attempts=0;session.wrong.clear();session.locked=false;session.hinted=false;dialog.querySelectorAll('[data-place], [data-place] path').forEach(g=>g.classList.remove('wrong','right','hint'));dialog.querySelector('.geo-correct-feedback')?.remove();const prompt=kind==='city'&&cityMode==='plate'?target().id+' plakalı şehir nerede?':target().name+' nerede?';$('geoQuestion').className='geo-question';$('geoQuestion').innerHTML='<span>'+esc(prompt)+'</span>';void $('geoQuestion').offsetWidth;$('geoQuestion').classList.add('geo-question-entering');$('geoMessage').textContent='Haritada doğru yere dokun.';geoControls();resetViewForNewQuestion();}
 function resetViewForNewQuestion(){
  const current=session,index=session.index;
  const reset=()=>{if(session!==current||session.index!==index||!dialog.open||session.locked)return;zoom(1);$('geoViewport').scrollTo(0,0);};
  // Let the new question finish appearing before changing the map framing.
  clearTimeout(geoTimer);
  if(session.zoom>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)geoTimer=setTimeout(reset,380);
  else reset();
 }
 function geoControls(){$('geoProgress').textContent=`Soru ${session.index+1}/${session.questions.length}`;$('geoScore').textContent=session.score+' puan';$('geoSkip').disabled=session.locked;}
 function queueGeoNext(delay){
  clearTimeout(geoTimer);const current=session;
  geoTimer=setTimeout(()=>{
   if(session!==current||!dialog.open)return;
   if(++session.index===session.questions.length){result('Tur tamamlandı!',`<strong>${session.score} puan</strong><p>${session.correct}/${session.questions.length} doğru cevap</p>`,startGeo);return;}
   question();
  },delay);
 }
 function showGeoCorrect(points){
  $('geoQuestion').classList.add('geo-question-leaving');
  dialog.querySelector('.geo-correct-feedback')?.remove();
  const popup=document.createElement('div');popup.className='geo-correct-feedback';popup.setAttribute('role','status');
  popup.innerHTML=`<div class="geo-correct-card"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none"><circle cx="24" cy="24" r="20" fill="#DBEFE0" stroke="#8BBC9B" stroke-width="2"/><path d="m14 24 7 7 14-15" stroke="#57886B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Doğru!</strong><span>+${points} puan</span></div>`;
  dialog.append(popup);popup.addEventListener('animationend',()=>popup.remove(),{once:true});
 }
 function showGeoWrong(name,event,anchor){
  dialog.querySelector('.geo-correct-feedback')?.remove();
  const popup=document.createElement('div');popup.className='geo-correct-feedback geo-wrong-feedback';popup.setAttribute('role','status');
  const card=document.createElement('div');card.className='geo-wrong-card';card.textContent=name;
  popup.append(card);dialog.append(popup);
  const bounds=anchor?.getBoundingClientRect();
  const x=event?.detail?event.clientX:(bounds?bounds.left+bounds.width/2:innerWidth/2);
  const y=event?.detail?event.clientY:(bounds?bounds.top+bounds.height/2:innerHeight/2);
  const width=card.offsetWidth,height=card.offsetHeight;
  popup.style.left=Math.max(8,Math.min(innerWidth-width-8,x-width/2))+'px';
  popup.style.top=Math.max(8,Math.min(innerHeight-height-8,y-height-12))+'px';
  const cleanup=setTimeout(()=>popup.remove(),850);
  popup.addEventListener('animationend',()=>{clearTimeout(cleanup);popup.remove();},{once:true});
 }
 function answer(id,clickedPath,event){
  const s=session;if(s.locked||s.wrong.has(id))return;const selected=s.source.items.find(x=>x.id===id);if(!selected)return;
  const grade=gradeAnswer(target().id,id,s.attempts);
  if(grade.correct){s.locked=true;s.correct++;s.score+=grade.points;mark(id,'right');$('geoMessage').textContent=`Doğru! ${selected.name} · +${grade.points} puan`;showGeoCorrect(grade.points);queueGeoNext(1400);}
  else{
   showGeoWrong(selected.name,event,clickedPath||dialog.querySelector('[data-place="'+id+'"]'));
   s.attempts++;s.wrong.add(id);if(clickedPath)clickedPath.classList.add('wrong');else mark(id,'wrong');
   if(s.attempts>=5){s.locked=true;zoom(1);viewCorrectAnswer();queueGeoNext(2400);}
   else $('geoMessage').textContent=`Burası ${selected.name}. Bir daha dene! (${s.attempts}/5)`;
  }
  geoControls();
 }
 function viewCorrectAnswer(){mark(target().id,'right');$('geoMessage').textContent='5 yanlış seçim. Doğru cevap: '+target().name;}
})();
