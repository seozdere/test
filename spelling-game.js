/* Local spelling game; two players can interact with independent panels at once. */
(function(){
'use strict';
const bank=window.NoTikSpellingBank||[],dialog=document.createElement('dialog');
dialog.id='spellingDialog';dialog.className='speech-dialog spelling-game';dialog.setAttribute('aria-label','Yazım Dedektifi');document.body.append(dialog);
const $=selector=>dialog.querySelector(selector);
const labels=['Tümü','Sözcükler','Ek ve bağlaçlar','Karışık metin'];
const art='<svg viewBox="0 0 120 92" fill="none" stroke="#827297" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="21" y="12" width="58" height="68" rx="12" fill="#FFF4D9"/><path d="M32 28h32m-32 12h22m-22 12h16"/><g class="spelling-lens"><circle cx="77" cy="48" r="21" fill="#D9EEE9" fill-opacity=".95"/><path d="m92 64 17 17" stroke-width="8"/><path d="m66 48 7 7 14-16" stroke="#5D9683" stroke-width="3.5"/></g></svg>';
const person='<svg viewBox="0 0 80 70" aria-hidden="true"><circle cx="40" cy="21" r="12" fill="#FFF1CB" stroke="#8D79A5" stroke-width="2"/><path d="M17 62v-9a23 23 0 0 1 46 0v9z" fill="#C6E3D1" stroke="#8D79A5" stroke-width="2"/></svg>';
const people='<svg viewBox="0 0 80 70" aria-hidden="true"><g stroke="#8D79A5" stroke-width="2"><circle cx="25" cy="22" r="11" fill="#FFF1CB"/><path d="M7 60V48a18 18 0 0 1 36 0v12z" fill="#D3E8DA"/><circle cx="55" cy="22" r="11" fill="#FFF1CB"/><path d="M37 60V48a18 18 0 0 1 36 0v12z" fill="#DCD0EC"/></g></svg>';
let players=null,mode=0,filter='Tümü',opener=null,transitioning=false,ticker=null,deadline=0;
function shuffle(items){const a=[...items],random=new Uint32Array(a.length);crypto.getRandomValues(random);for(let i=a.length-1;i>0;i--){const j=random[i]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function stop(){clearInterval(ticker);ticker=null;if(players)players.forEach(p=>clearTimeout(p.timer));}
async function transition(action,exit=false){
 if(transitioning)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||!dialog.animate){action();return;}
 transitioning=true;dialog.inert=true;
 try{
  const target=exit?dialog:$('.spell-stage');
  if(target)await target.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.97)'}],{duration:mode===2?120:180,easing:'ease-in'}).finished;
  action();
  if(!exit&&dialog.open)await $('.spell-stage').animate([{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:mode===2?180:260,easing:'ease-out'}).finished;
 }finally{dialog.inert=false;transitioning=false;}
}
function shell(html){dialog.classList.toggle('punct-theme',mode!==1);dialog.innerHTML='<button id="spellClose" class="speech-close punct-close" type="button" aria-label="Oyunu kapat"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><main class="spell-stage">'+html+'</main>';
 $('#spellClose').onclick=leave;dialog.scrollTop=0;}
function close(){stop();players=null;dialog.close();opener?.focus();}
function leave(){if(players)transition(chooseMode);else if(mode)transition(chooseMode);else transition(close,true);}
dialog.addEventListener('cancel',e=>{e.preventDefault();if(mode===1)solo.leave();else leave();});
window.openSpellingGame=function(){opener=document.activeElement;mode=0;chooseMode();if(!dialog.open)dialog.showModal();};
function chooseMode(){solo.dispose();stop();players=null;mode=0;shell('<section class="punct-intro"><div class="spell-logo">'+art+'</div><h2>Yazım Dedektifi</h2><p>Kaç kişi oynayacak?</p><div class="punct-modes"><button type="button" data-players="1">'+person+'<strong>Tek oyuncu</strong><span>Kendi hızında yazım hatalarını bul.</span></button><button type="button" data-players="2">'+people+'<strong>İki oyuncu</strong><span>Aynı ekranda birlikte yarışın.</span></button></div><div class="punct-rules"><span>En fazla 10 metin</span><span>90 saniye</span><span>Doğru seçim +10</span></div></section>');
 dialog.querySelectorAll('[data-players]').forEach(b=>b.onclick=()=>{mode=Number(b.dataset.players);transition(mode===1?solo.menu:menu);});}
function menu(){players=null;shell('<div class="spell-logo">'+art+'</div><h2>Yazım Dedektifi</h2><p>Hatalı kelimelere dokun, metni düzelt!</p><div id="spellModes" class="spell-modes" role="group" aria-label="Konu seçimi"></div><button id="spellStart" class="spell-primary"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="spellStartGlass" x1="12" y1="8" x2="51" y2="53" gradientUnits="userSpaceOnUse"><stop stop-color="#F4FFF7"/><stop offset=".48" stop-color="#D6EFDF"/><stop offset="1" stop-color="#A7CFB8"/></linearGradient></defs><rect x="8" y="11" width="48" height="46" rx="17" fill="#78A58B" opacity=".25"/><rect x="8" y="6" width="48" height="46" rx="17" fill="url(#spellStartGlass)" stroke="#83AE94" stroke-width="1.8"/><path d="M16 22q0-8 9-8h13" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/><path d="M27 21q0-3 3-1l12 8q3 2 0 4l-12 8q-3 2-3-1z" fill="#548568" stroke="#47765A" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Başla</span></button>');
 for(const label of labels){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',filter===label);b.onclick=()=>{filter=label;$('#spellModes').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));};$('#spellModes').append(b);}$('#spellStart').onclick=()=>transition(start);$('#spellClose').setAttribute('aria-label','Oyuncu seçimine dön');}
// Pair long and short texts separately: equal long-text counts, no shared questions.
function dealDuel(pool){
 const length=q=>q.parts.reduce((sum,p)=>sum+(p.correct||p.text).length,0);
 const long=q=>length(q)>=90||q.parts.map(p=>p.correct||p.text).join('').trim().split(/\s+/).length>=12;
 const groups=[[],[]];pool.forEach(q=>groups[long(q)?1:0].push(q));
 const pairs=groups.map(group=>{const sorted=shuffle(group).sort((a,b)=>length(a)-length(b));const result=[];for(let i=0;i+1<sorted.length;i+=2)result.push([sorted[i],sorted[i+1]]);return shuffle(result);});
 const count=Math.min(10,pairs[0].length+pairs[1].length);
 const longCount=Math.min(pairs[1].length,Math.max(count-pairs[0].length,Math.round(count*groups[1].length/Math.max(1,pool.length))));
 const selected=shuffle([...pairs[1].slice(0,longCount),...pairs[0].slice(0,count-longCount)]);
 const decks=[[],[]],totals=[0,0];
 selected.forEach(pair=>{const first=totals[0]===totals[1]?shuffle([0,1])[0]:(totals[0]<totals[1]?0:1);decks[first].push(pair[1]);totals[first]+=length(pair[1]);decks[1-first].push(pair[0]);totals[1-first]+=length(pair[0]);});
 return decks.map(shuffle);
}
function start(){stop();const decks=dealDuel(bank.filter(q=>filter==='Tümü'||q.category===filter));if(!decks[0].length)return;
 players=decks.map(questions=>({questions,index:0,score:0,found:0,misses:0,selected:new Set(),done:false,finished:false,timer:null}));
 shell('<header class="spell-duel-header"><h2>Yazım Dedektifi</h2>'+(mode===2?'<strong id="spellClock" role="timer">01:30</strong>':'')+'</header><div class="spell-arena '+(mode===2?'spell-duel':'spell-solo')+'">'+players.map((_,i)=>'<section class="spell-player" data-player="'+i+'" aria-label="'+(i+1)+'. Oyuncu"></section>').join('')+'</div><div class="spell-game-footer"><button id="spellRestart">Baştan başla</button></div>');
 if(mode===2){
  $('.spell-duel-header').className='punct-header';$('#spellClock').className='punct-clock';
  $('.spell-arena').className='punct-arena';dialog.querySelectorAll('.spell-player').forEach(a=>a.className='punct-player');
  $('.spell-game-footer').className='punct-footer';$('#spellRestart').className='punct-restart';
 }
 $('#spellClose').setAttribute('aria-label','Oyuncu seçimine dön');$('#spellRestart').onclick=()=>transition(start);players.forEach((_,i)=>renderPlayer(i));
 if(mode===2){deadline=performance.now()+90000;ticker=setInterval(tick,100);}
}
function tick(){if(!players||mode!==2)return;const remaining=Math.max(0,Math.ceil((deadline-performance.now())/1000));$('#spellClock').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(!remaining)finish();}
function areaFor(i){return dialog.querySelector('[data-player="'+i+'"]');}
function renderPlayer(i){const p=players[i],area=areaFor(i),q=p.questions[p.index];p.selected=new Set();p.done=false;
 if(mode===2){renderDuelPlayer(i);return;}
 area.innerHTML='<header class="spell-player-head">'+(mode===2?'<strong>'+(i+1)+'. Oyuncu</strong>':'')+'<span class="spell-score">'+p.score+' puan</span></header><div class="spell-progress">Metin '+(p.index+1)+' / '+p.questions.length+'</div><p class="spell-instruction">Yazım hatalarını bul!</p><section class="spell-text" aria-label="İncelenecek metin"><div class="spell-sentence-words"></div><div class="spell-feedback" role="status" aria-live="polite">Hatalı olduğunu düşündüğün kelimeye dokun.</div></section><div class="spell-remaining"></div><div class="spell-actions"><button class="spell-pass">Pas</button></div>';
 const text=area.querySelector('.spell-sentence-words');q.parts.forEach((part,j)=>{if(/^\s+$/.test(part.text)||!/[a-zçğıöşü]/i.test(part.text)){text.append(document.createTextNode(part.text));return;}const b=document.createElement('button');b.type='button';b.textContent=part.text;b.onclick=()=>choose(i,j,b);text.append(b);});
 area.querySelector('.spell-pass').onclick=()=>advance(i);paint(i);}

function renderDuelPlayer(i){
 const p=players[i],q=p.questions[p.index],area=areaFor(i);
 area.innerHTML='<header class="punct-player-head"><strong>'+(i+1)+'. Oyuncu</strong><span class="spell-score">'+p.score+' puan</span></header><p class="punct-progress">Metin '+(p.index+1)+' / '+p.questions.length+'</p><div class="punct-sentence"><div class="punct-sentence-text spell-sentence-words"></div><div class="punct-feedback" data-feedback role="status"></div><div class="punct-solution"><button type="button" class="punct-solution-toggle" aria-expanded="false"><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M7 5h19l4 5v21H7z" fill="#DCEFF1" stroke="#548A91" stroke-width="1.6"/><path d="M25 5v7h5M12 14h8m-8 5h12m-12 5h6" stroke="#548A91" stroke-width="1.7" stroke-linecap="round"/><path d="m22 26 3 3 6-7" stroke="#C78D44" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Çözüm</span></button><div class="punct-solution-detail" hidden><em></em></div><button type="button" class="punct-next" disabled><span>Sonraki soru</span><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="29" height="27" rx="10" fill="#6FA983" fill-opacity=".22"/><rect x="3.5" y="3.5" width="29" height="27" rx="10" fill="#EAF6E8" stroke="#72A883" stroke-width="1.5"/><path d="M11 17h14m-6-6 6 6-6 6" stroke="#3F7954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8h5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg></button></div></div><p class="spell-remaining"></p><div class="punct-actions"><button type="button" class="punct-pass spell-pass">Pas</button></div>';
 const words=area.querySelector('.spell-sentence-words');
 q.parts.forEach((part,j)=>{
  if(/^\s+$/.test(part.text)||!/[a-zçğıöşü]/i.test(part.text)){words.append(document.createTextNode(part.text));return;}
  const b=document.createElement('button');b.type='button';b.className='spell-word';b.textContent=part.text;
  b.onpointerup=e=>{if(e.button!==0)return;e.preventDefault();choose(i,j,b);};b.onclick=e=>{if(e.detail===0)choose(i,j,b);};words.append(b);
 });
 const solution=area.querySelector('.punct-solution-toggle'),detail=area.querySelector('.punct-solution-detail');
 detail.id='spell-solution-'+i;solution.setAttribute('aria-controls',detail.id);
 detail.querySelector('em').textContent=(q.rule||'Doğru yazımlara dikkat et.')+' '+q.parts.filter(part=>part.correct).map(part=>part.text+' → '+part.correct).join(' · ');
 solution.onclick=()=>{
  if(!players||performance.now()>=deadline){if(players)finish();return;}
  const open=solution.getAttribute('aria-expanded')!=='true';solution.setAttribute('aria-expanded',String(open));detail.hidden=!open;
  if(open&&!p.done){p.done=true;words.textContent=q.parts.map(part=>part.correct||part.text).join('');area.querySelector('.spell-pass').disabled=true;area.querySelector('.spell-remaining').textContent='Çözüm gösteriliyor';unlockNext(i);}
 };
 area.querySelector('.punct-next').onclick=()=>{if(p.done)advance(i);};
 area.querySelector('.spell-pass').onclick=()=>advance(i);paint(i);
}
function unlockNext(i){
 const p=players[i],next=areaFor(i).querySelector('.punct-next');
 if(p.index===p.questions.length-1){next.hidden=true;p.timer=setTimeout(()=>{if(players?.[i]===p)advance(i);},1200);}
 else{next.disabled=false;next.classList.add('punct-next-attention');}
}

function paint(i){const p=players[i],area=areaFor(i);area.querySelector('.spell-score').textContent=p.score+' puan';area.querySelector('.spell-remaining').textContent=p.questions[p.index].parts.filter((part,j)=>part.correct&&!p.selected.has(j)).length+' hata kaldı';}
function choose(i,j,button){const p=players?.[i];if(!p||p.done||p.finished||p.selected.has(j))return;if(mode===2&&performance.now()>=deadline){finish();return;}p.selected.add(j);const part=p.questions[p.index].parts[j],area=areaFor(i),feedback=area.querySelector('[data-feedback],.spell-feedback');button.disabled=true;
 if(part.correct){p.score+=10;p.found++;button.textContent=part.correct;button.classList.add('spell-fixed');const wrong=document.createElement('span'),arrow=document.createElement('span'),right=document.createElement('span');wrong.className='spell-answer-wrong';wrong.textContent=part.text+' ✕';arrow.className='spell-answer-arrow';arrow.textContent='→';right.className='spell-answer-right';right.textContent=part.correct+' ✓';feedback.replaceChildren(wrong,arrow,right);}
 else{p.score-=5;p.misses++;button.classList.add('spell-wrong');feedback.textContent='Bu kelime doğru yazılmış. −5 puan';}
 feedback.className=(mode===2?'punct-feedback':'spell-feedback')+' '+(part.correct?'spell-good':'spell-bad');if(mode===2){if(part.correct)feedback.innerHTML='<div class="punct-answer-pop"><strong>Doğru!</strong></div>';else{const error=document.createElement('strong');error.className='punct-correction';error.textContent='Bu kelime doğru yazılmış. −5 puan';feedback.replaceChildren(error);}}paint(i);
 if(p.questions[p.index].parts.every((part,k)=>!part.correct||p.selected.has(k))){p.done=true;area.querySelector('.spell-pass').disabled=true;area.querySelector('.spell-remaining').textContent='Metin düzeltildi!';area.querySelectorAll('.spell-sentence-words button').forEach(b=>b.disabled=true);if(mode===2)unlockNext(i);else p.timer=setTimeout(()=>{if(players?.[i]===p)advance(i);},2500);}
}
function advance(i){const p=players?.[i];if(!p||p.finished)return;if(mode===2&&performance.now()>=deadline){finish();return;}clearTimeout(p.timer);if(++p.index>=p.questions.length){p.finished=true;const area=areaFor(i);area.innerHTML='<div class="spell-player-done"><h3>'+(mode===2?(i+1)+'. Oyuncu tamamladı':'Tamamlandı!')+'</h3><strong>'+p.score+' puan</strong><p>'+p.found+' hata düzeltildi · '+p.misses+' yanlış seçim</p></div>';if(players.every(x=>x.finished))finish();}else renderPlayer(i);}
function finish(){if(!players)return;stop();const result=players;players=null;let heading='İyi iş çıkardın, dedektif!';if(mode===2){heading=result[0].score===result[1].score?'Berabere!':(result[0].score>result[1].score?'1. Oyuncu':'2. Oyuncu')+' kazandı!';}
 if(mode===2){shell('<section class="punct-result-cover"><div class="punct-result" role="status"><h2 class="punct-winner">'+heading+'</h2><svg class="punct-trophy" viewBox="0 0 120 110" aria-hidden="true" fill="none" stroke="#AB803E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M33 24H16v14c0 16 12 23 26 23M87 24h17v14c0 16-12 23-26 23" fill="#FFE9B4"/><path d="M31 13h58v27c0 21-13 32-29 32S31 61 31 40z" fill="#F7D681"/><path d="M60 73v17m-16 0h32l7 12H37z" fill="#E9BF69"/><path d="m60 27 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#FFFADE"/><path d="M8 12v8m-4-4h8m98 45v8m-4-4h8" stroke="#D5AF63"/></svg><div class="punct-final-scores">'+result.map((p,i)=>'<p>'+(i+1)+'. Oyuncu<strong>'+p.score+' puan</strong></p>').join('')+'</div><button class="punct-restart">Baştan başla</button></div></section>');$('.punct-restart').onclick=()=>transition(start);return;}
 shell('<section class="spell-result"><div class="spell-logo">'+art+'</div><h2>'+heading+'</h2>'+result.map((p,i)=>'<p>'+(mode===2?(i+1)+'. Oyuncu':'Skorun')+': <strong>'+p.score+' puan</strong></p>').join('')+'<button id="spellAgain" class="spell-primary">Baştan başla</button><button id="spellMenu">Konu seç</button></section>');$('#spellAgain').onclick=()=>transition(start);$('#spellMenu').onclick=()=>transition(menu);}

// Archived SOLO implementation; DUO keeps its independent state and rendering.
const solo=createSolo();
function createSolo(){
const $=id=>dialog.querySelector('#'+id);let state=null,filter='Tümü',nextTimer=null,transitioning=false;
const labels=['Tümü','Sözcükler','Ek ve bağlaçlar','Karışık metin'];
const art='<svg viewBox="0 0 120 92" fill="none" stroke="#827297" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="21" y="12" width="58" height="68" rx="12" fill="#FFF4D9"/><path d="M32 28h32m-32 12h22m-22 12h16"/><g class="spelling-lens"><circle cx="77" cy="48" r="21" fill="#D9EEE9" fill-opacity=".95"/><path d="m92 64 17 17" stroke-width="8"/><path d="m66 48 7 7 14-16" stroke="#5D9683" stroke-width="3.5"/></g></svg>';
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
async function transition(action,exit=false){
 if(transitioning)return;
 clearTimeout(nextTimer);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced||!dialog.animate){action();return;}
 transitioning=true;dialog.inert=true;
 try{
  const target=exit?dialog:dialog.querySelector('.spell-stage');
  await target.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.97)'}],{duration:180,easing:'ease-in',fill:'none'}).finished;
  action();
  if(!exit&&dialog.open)await dialog.querySelector('.spell-stage').animate([{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:260,easing:'ease-out'}).finished;
 }finally{dialog.inert=false;transitioning=false;}
}
function leave(){transition(()=>state?menu():close(),!state);}
function shell(html){dialog.classList.remove('punct-theme');clearTimeout(nextTimer);dialog.innerHTML='<button id="spellClose" class="speech-close" type="button" aria-label="Oyunu kapat"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><main class="spell-stage">'+html+'</main>';$('spellClose').onclick=leave;dialog.scrollTop=0;}
function close(){clearTimeout(nextTimer);state=null;dialog.close();opener?.focus();}
function menu(){state=null;shell('<div class="spell-logo">'+art+'</div><h2>Yazım Dedektifi</h2><p>Hatalı kelimelere dokun, metni düzelt!</p><div id="spellModes" class="spell-modes" role="group" aria-label="Konu seçimi"></div><button id="spellStart" class="spell-primary"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="spellStartGlass" x1="12" y1="8" x2="51" y2="53" gradientUnits="userSpaceOnUse"><stop stop-color="#F4FFF7"/><stop offset=".48" stop-color="#D6EFDF"/><stop offset="1" stop-color="#A7CFB8"/></linearGradient></defs><rect x="8" y="11" width="48" height="46" rx="17" fill="#78A58B" opacity=".25"/><rect x="8" y="6" width="48" height="46" rx="17" fill="url(#spellStartGlass)" stroke="#83AE94" stroke-width="1.8"/><path d="M16 22q0-8 9-8h13" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".9"/><path d="M27 21q0-3 3-1l12 8q3 2 0 4l-12 8q-3 2-3-1z" fill="#548568" stroke="#47765A" stroke-width="1.5" stroke-linejoin="round"/></svg><span>Başla</span></button>');
for(const label of labels){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',filter===label);b.onclick=()=>{filter=label;menu();};$('spellModes').append(b);}$('spellStart').onclick=()=>transition(start);}
function start(){const pool=bank.filter(q=>filter==='Tümü'||q.category===filter);state={questions:shuffle(pool).slice(0,12),index:0,score:0,found:0,misses:0,selected:new Set(),done:false};render();}
function render(){const s=state,q=s.questions[s.index];s.selected=new Set();s.done=false;
shell('<header><div class="spell-mini-art">'+art+'</div><h2>Yazım Dedektifi</h2></header><div class="spell-stats"><span>Metin '+(s.index+1)+' / '+s.questions.length+'</span><strong id="spellScore"></strong><span id="spellRemaining"></span></div><p class="spell-instruction">Yazım hatalarını bul!</p><section id="spellText" class="spell-text" aria-label="İncelenecek metin"></section><div id="spellFeedback" class="spell-feedback" role="status" aria-live="polite">Hatalı olduğunu düşündüğün kelimeye dokun.</div><div class="spell-actions"><button id="spellRestart">Baştan başla</button><button id="spellPass">Pas</button></div>');$('spellClose').setAttribute('aria-label','Konu seçimine dön');
q.parts.forEach((p,i)=>{if(/^\s+$/.test(p.text)||!/[a-zçğıöşü]/i.test(p.text)){$('spellText').append(document.createTextNode(p.text));return;}const b=document.createElement('button');b.type='button';b.textContent=p.text;b.dataset.part=i;b.onclick=()=>choose(i,b);$('spellText').append(b);});
$('spellRestart').onclick=start;$('spellPass').onclick=()=>{if(state&&!state.done)advance();};paint();}
function advance(){clearTimeout(nextTimer);if(!state)return;if(++state.index>=state.questions.length)finish();else render();}
function paint(){const s=state,q=s.questions[s.index];$('spellScore').textContent=s.score+' puan';$('spellRemaining').textContent=q.parts.filter((p,i)=>p.correct&&!s.selected.has(i)).length+' hata kaldı';}
function choose(i,b){const s=state;if(!s||s.done||s.selected.has(i))return;s.selected.add(i);const p=s.questions[s.index].parts[i];b.disabled=true;
if(p.correct){s.score+=10;s.found++;b.textContent=p.correct;b.classList.add('spell-fixed');showCorrection(p.text,p.correct);}
else{s.score-=5;s.misses++;b.classList.add('spell-wrong');$('spellFeedback').textContent='Bu kelime doğru yazılmış. −5 puan';}
$('spellFeedback').className='spell-feedback '+(p.correct?'spell-good':'spell-bad');paint();
if(s.questions[s.index].parts.every((p,j)=>!p.correct||s.selected.has(j))){s.done=true;nextTimer=setTimeout(()=>{if(state!==s||!dialog.open)return;advance();},1500);$('spellPass').disabled=true;$('spellRemaining').textContent='Metin düzeltildi!';dialog.querySelectorAll('#spellText button').forEach(b=>b.disabled=true);}
}
function showCorrection(wrong,right){
 const feedback=$('spellFeedback');feedback.replaceChildren();
 const before=document.createElement('span');before.className='spell-answer-wrong';before.textContent=wrong+' ✕';
 const arrow=document.createElement('span');arrow.className='spell-answer-arrow';arrow.textContent='→';
 const after=document.createElement('span');after.className='spell-answer-right';after.textContent=right+' ✓';
 feedback.append(before,arrow,after);
}
function finish(){const s=state;shell('<section class="spell-result"><div class="spell-logo">'+art+'</div><h2>İyi iş çıkardın, dedektif!</h2><strong>'+s.score+' puan</strong><p>'+s.found+' hata düzeltildi · '+s.misses+' yanlış seçim</p><button id="spellAgain" class="spell-primary">Baştan başla</button><button id="spellMenu">Konu seç</button></section>');$('spellAgain').onclick=start;$('spellMenu').onclick=menu;}

return {menu,leave,dispose(){clearTimeout(nextTimer);state=null;}};
}
})();
