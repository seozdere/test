/* Local two-player game. Independent pointer input; no student data stored. */
(function(){
 'use strict';
 const bank=window.NoTikPunctuationBank||[];
 const dialog=document.createElement('dialog');dialog.id='punctuationDialog';dialog.setAttribute('aria-label','Noktalama Düellosu');document.body.append(dialog);
 let game=null,ticker=null,opener=null,generation=0,mode=2,transitioning=false;
 const historyKey="notik-punctuation-history-v1";
 let history=[];try{const saved=JSON.parse(sessionStorage.getItem(historyKey)||"[]");if(Array.isArray(saved))history=saved.filter(id=>bank.some(q=>q.id===id));}catch(_){}
 const shuffle=items=>{const a=[...items];for(let i=a.length-1;i>0;i--){const r=new Uint32Array(1);crypto.getRandomValues(r);const j=r[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
 const signNames={'!':'Ünlem işareti','?':'Soru işareti','.':'Nokta',',':'Virgül',';':'Noktalı virgül',':':'İki nokta','’':'Kesme işareti','-':'Kısa çizgi','/':'Eğik çizgi','(':'Açma yay ayracı',')':'Kapama yay ayracı','…':'Üç nokta','[':'Açma köşeli ayracı',']':'Kapama köşeli ayracı','“':'Açma tırnak işareti','”':'Kapama tırnak işareti'};
 const art=()=>window.gameIntroArt?window.gameIntroArt('tool-punctuation'):'';
 const trophy='<svg class="punct-trophy" viewBox="0 0 120 110" aria-hidden="true" fill="none" stroke="#AB803E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M33 24H16v14c0 16 12 23 26 23M87 24h17v14c0 16-12 23-26 23" fill="#FFE9B4"/><path d="M31 13h58v27c0 21-13 32-29 32S31 61 31 40z" fill="#F7D681"/><path d="M60 73v17m-16 0h32l7 12H37z" fill="#E9BF69"/><path d="m60 27 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="#FFFADE"/><path d="M8 12v8m-4-4h8m98 45v8m-4-4h8" stroke="#D5AF63"/></svg>';
 function drawQuestions(){
  const selected=[];
  for(const level of ['Temel','Zor']){
   const pool=bank.filter(q=>q.level===level),recent=history.filter(id=>pool.some(q=>q.id===id)).slice(-Math.min(60,pool.length-5));
   selected.push(...shuffle(pool.filter(q=>!recent.includes(q.id))).slice(0,5));
  }
  history=[...history,...selected.map(q=>q.id)].slice(-120);try{sessionStorage.setItem(historyKey,JSON.stringify(history));}catch(_){}
  return shuffle(selected);
 }
 async function motion(out=false){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!dialog.animate)return;
  // Animate content only, keeping the background steady throughout the transition.
  const frames=out?[{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(8px) scale(.97)'}]:[{opacity:0,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}];
  await Promise.all([...dialog.children].filter(el=>!el.classList.contains('punct-close')).map(el=>el.animate(frames,{duration:out?180:260,easing:out?'ease-in':'ease-out',fill:'none'}).finished));
 }
 async function change(action,closing=false){if(transitioning)return;transitioning=true;dialog.inert=true;stop();try{await motion(true);action();if(!closing)await motion();}finally{dialog.inert=false;transitioning=false;}}
 function leave(){const active=!!game;change(active?menu:close,!active);}
 function stop(){generation++;clearInterval(ticker);ticker=null;if(game)for(const p of game.players)clearTimeout(p.timer);game=null;}
 function shell(html){dialog.innerHTML='<button class="punct-close" aria-label="Oyunu kapat"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'+html;dialog.querySelector('.punct-close').onclick=leave;dialog.scrollTop=0;}
 function close(){stop();dialog.close();opener?.focus();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();leave();});
 window.openPunctuationGame=()=>{if(dialog.open)return;opener=document.activeElement;menu();dialog.showModal();};
 function menu(){stop();shell('<main class="punct-intro">'+art()+'<h2>Noktalama Düellosu</h2><p>Nasıl oynamak istersin?</p><div class="punct-modes"><button data-mode="1"><svg viewBox="0 0 80 70" aria-hidden="true"><circle cx="40" cy="21" r="12" fill="#FFF1CB" stroke="#8D79A5" stroke-width="2"/><path d="M17 62v-9a23 23 0 0 1 46 0v9z" fill="#C6E3D1" stroke="#8D79A5" stroke-width="2"/></svg><strong>Tek oyuncu</strong><span>Kendini dene, puanını yükselt.</span></button><button data-mode="2"><svg viewBox="0 0 80 70" aria-hidden="true"><g stroke="#8D79A5" stroke-width="2"><circle cx="25" cy="22" r="11" fill="#FFF1CB"/><path d="M7 60V48a18 18 0 0 1 36 0v12z" fill="#D3E8DA"/><circle cx="55" cy="22" r="11" fill="#FFF1CB"/><path d="M37 60V48a18 18 0 0 1 36 0v12z" fill="#DCD0EC"/></g></svg><strong>İki oyuncu</strong><span>Aynı ekranda karşılıklı yarışın.</span></button></div><div class="punct-rules"><span>10 soru</span><span>90 saniye</span><span>Doğru cevap +10</span></div></main>');dialog.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=Number(b.dataset.mode);change(start);});}
 function start(){stop();game={deadline:performance.now()+90000,ended:false,players:Array.from({length:mode},()=>({questions:drawQuestions(),index:0,score:0,locked:false,timer:null}))};
  shell('<header class="punct-header"><h2>Noktalama Düellosu</h2><div class="punct-clock" role="timer">01:30</div></header><main class="punct-arena '+(mode===1?'punct-solo':'')+'">'+game.players.map((_,n)=>'<section class="punct-player" data-player="'+n+'" aria-label="'+(n+1)+'. Oyuncu"></section>').join('')+'</main><footer class="punct-footer"><button class="punct-restart">Baştan başla</button></footer>');
  dialog.querySelector('.punct-close').setAttribute('aria-label','Oyun girişine dön');dialog.querySelector('.punct-restart').onclick=()=>change(start);game.players.forEach((_,n)=>render(n));ticker=setInterval(tick,100);
 }
 function tick(){if(!game||game.ended)return;const seconds=Math.max(0,Math.ceil((game.deadline-performance.now())/1000));dialog.querySelector('.punct-clock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');if(!seconds)finish();}
 function render(n){const p=game.players[n],area=dialog.querySelector('[data-player="'+n+'"]');area.replaceChildren();
  const head=document.createElement('header');head.className='punct-player-head';head.innerHTML=(mode===2?'<strong>'+(n+1)+'. Oyuncu</strong>':'')+'<span>'+p.score+' puan</span>';area.append(head);
  if(p.index>=p.questions.length){const done=document.createElement('div');done.className='punct-sentence punct-done';done.textContent='Tamamladın! Diğer oyuncu bekleniyor.';area.append(done);return;}
  const q=p.questions[p.index],progress=document.createElement('p');progress.className='punct-progress';progress.textContent='Soru '+(p.index+1)+' / '+p.questions.length;area.append(progress);
  const sentence=document.createElement('div');sentence.className='punct-sentence';const gap=document.createElement('span');gap.className='punct-gap';gap.textContent='?';gap.setAttribute('aria-label','Boşluk');const text=document.createElement('div');text.className='punct-sentence-text';text.append(document.createTextNode(q.before),gap,document.createTextNode(q.after));sentence.append(text);area.append(sentence);
  const options=document.createElement('div');options.className='punct-options';options.setAttribute('role','group');options.setAttribute('aria-label',(n+1)+'. oyuncu cevapları');
  for(const sign of shuffle(q.options)){const button=document.createElement('button');button.textContent=sign;button.setAttribute('aria-label',(signNames[sign]||sign));
   button.onpointerup=e=>{if(e.button!==0)return;e.preventDefault();answer(n,sign,button);};button.onclick=e=>{if(e.detail===0)answer(n,sign,button);};options.append(button);}
  const feedback=document.createElement('div');feedback.className='punct-feedback';feedback.setAttribute('role','status');sentence.append(feedback);addSolution(sentence,q,n);area.append(options);const actions=document.createElement('div');actions.className='punct-actions';const pass=document.createElement('button');pass.className='punct-pass';pass.textContent='Pas';pass.onclick=()=>skip(n);const next=document.createElement('button');next.className='punct-next';next.innerHTML='<span>Sonraki soru</span><svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="29" height="27" rx="10" fill="#6FA983" fill-opacity=".22"/><rect x="3.5" y="3.5" width="29" height="27" rx="10" fill="#EAF6E8" stroke="#72A883" stroke-width="1.5"/><path d="M11 17h14m-6-6 6 6-6 6" stroke="#3F7954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8h5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>';next.disabled=true;next.onclick=()=>advance(n);sentence.querySelector('.punct-solution').append(next);actions.append(pass);area.append(actions);
 }
 function advance(n){if(!game||game.ended)return;if(performance.now()>=game.deadline){finish();return;}const p=game.players[n];if(!p.locked||p.index>=p.questions.length)return;p.index++;p.locked=false;render(n);if(game.players.every(x=>x.index>=x.questions.length))finish();}
 function skip(n){if(!game||game.ended)return;const p=game.players[n];if(p.locked)return;p.locked=true;advance(n);}
 function addSolution(sentence,q,n){
  const row=document.createElement('div');row.className='punct-solution';
  const button=document.createElement('button');button.className='punct-solution-toggle';button.setAttribute('aria-expanded','false');button.innerHTML='<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M7 5h19l4 5v21H7z" fill="#DCEFF1" stroke="#548A91" stroke-width="1.6"/><path d="M25 5v7h5M12 14h8m-8 5h12m-12 5h6" stroke="#548A91" stroke-width="1.7" stroke-linecap="round"/><path d="m22 26 3 3 6-7" stroke="#C78D44" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Çözüm</span>';
  const detail=document.createElement('div');detail.className='punct-solution-detail';detail.id='punct-solution-'+n;detail.hidden=true;const explanation=document.createElement('em');explanation.textContent=q.explanation;detail.append(explanation);button.setAttribute('aria-controls',detail.id);
  button.onclick=()=>{if(!game||game.ended)return;if(performance.now()>=game.deadline){finish();return;}const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));detail.hidden=!open;
   if(open){const p=game.players[n],area=sentence.parentElement;p.locked=true;area.querySelectorAll('.punct-options button,.punct-pass').forEach(b=>b.disabled=true);area.querySelector('.punct-next').disabled=false;sentence.querySelector('.punct-gap').textContent=q.answer;}
  };row.append(button,detail);sentence.append(row);
 }

 function showAnswer(area){
  const pop=document.createElement('div');pop.className='punct-answer-pop';
  const label=document.createElement('strong');label.textContent='Doğru!';pop.append(label);area.querySelector('.punct-feedback').append(pop);
 }
 function answer(n,sign,button){if(!game||game.ended)return;if(performance.now()>=game.deadline){finish();return;}const p=game.players[n];if(p.locked||p.index>=p.questions.length)return;p.locked=true;
  const q=p.questions[p.index],correct=sign===q.answer,area=dialog.querySelector('[data-player="'+n+'"]');if(correct)p.score+=10;area.querySelector('.punct-player-head span').textContent=p.score+' puan';area.querySelector('.punct-gap').textContent=q.answer;area.querySelector('.punct-gap').classList.add(correct?'is-right':'is-wrong');button.classList.add(correct?'is-right':'is-wrong');area.querySelectorAll('.punct-options button,.punct-pass').forEach(b=>b.disabled=true);
  const feedback=area.querySelector('.punct-feedback');feedback.classList.add(correct?'is-correct':'is-wrong');feedback.replaceChildren();if(correct)showAnswer(area,q.answer,n);else{const correction=document.createElement('strong');correction.className='punct-correction';correction.textContent='Doğrusu: '+q.answer+' ('+signNames[q.answer]+')';feedback.append(correction);}
  const next=area.querySelector('.punct-next');
  if(p.index===p.questions.length-1){
   next.disabled=true;next.hidden=true;
   const current=game,version=generation;
   p.timer=setTimeout(()=>{if(game!==current||generation!==version||game.ended)return;advance(n);},correct?850:1400);
  }else{next.disabled=false;next.classList.add('punct-next-attention');}
 }
 function finish(){if(!game||game.ended)return;game.ended=true;clearInterval(ticker);dialog.querySelector('.punct-arena').inert=true;dialog.querySelector('.punct-footer').inert=true;for(const p of game.players)clearTimeout(p.timer);dialog.querySelectorAll('.punct-options button,.punct-pass,.punct-next,.punct-solution-toggle').forEach(b=>b.disabled=true);
  const scores=game.players.map(p=>p.score),[a,b]=scores;
  const heading=mode===1?'Oyun tamamlandı!':a===b?'Berabere!':'Kazanan '+(a>b?'1.':'2.')+' Oyuncu';
  const cover=document.createElement('div');cover.className='punct-result-cover';const card=document.createElement('section');card.className='punct-result';card.setAttribute('role','status');card.innerHTML='<h2 class="punct-winner">'+heading+'</h2>'+trophy+'<div class="punct-final-scores">'+scores.map((score,n)=>'<p>'+(mode===1?'Skorun':(n+1)+'. Oyuncu')+'<strong>'+score+' puan</strong></p>').join('')+'</div><button class="punct-restart">Baştan başla</button>';cover.append(card);dialog.append(cover);card.querySelector('button').onclick=()=>change(start);card.querySelector('button').focus();
 }
})();
