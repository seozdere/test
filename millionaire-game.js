(function(){
 'use strict';
 const prizes=[1000,2000,5000,10000,20000,50000,100000,200000,300000,500000,750000,1000000];
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function questionDisplay(text){
  if(text.length<110||!text.trimEnd().endsWith('?'))return {hasPassage:false,html:`<strong class="mil-prompt">${esc(text)}</strong>`};
  let split=-1;
  for(const match of text.matchAll(/[.!?][”"’']?\s+(?=[A-ZÇĞİÖŞÜ])/gu)){
   const position=match.index+match[0].length;
   const prompt=text.slice(position).trim();
   if(prompt.length>=15&&prompt.length<=260&&prompt.endsWith('?'))split=position;
  }
  if(split<0)return {hasPassage:false,html:`<strong class="mil-prompt">${esc(text)}</strong>`};
  return {hasPassage:true,html:`<span class="mil-passage">${esc(text.slice(0,split).trimEnd())}</span> <strong class="mil-prompt">${esc(text.slice(split).trimStart())}</strong>`};
 }
 const jokerArt=type=>{const shapes={half:'<rect x="5" y="6" width="13" height="13" rx="4" fill="#DBEBE2"/><rect x="22" y="6" width="13" height="13" rx="4" fill="#DBEBE2"/><rect x="5" y="23" width="13" height="13" rx="4" fill="#F1DADE"/><rect x="22" y="23" width="13" height="13" rx="4" fill="#F1DADE"/><path d="m9 27 5 5m0-5-5 5m17-5 5 5m0-5-5 5"/>',audience:'<circle cx="20" cy="12" r="6" fill="#F4DFB5"/><circle cx="8" cy="17" r="4" fill="#D9CCE9"/><circle cx="32" cy="17" r="4" fill="#D9CCE9"/><path d="M2 33v-5c0-7 12-7 12 0v5m12 0v-5c0-7 12-7 12 0v5" fill="#D9CCE9"/><path d="M11 35V26c0-10 18-10 18 0v9z" fill="#D7E9E0"/>',phone:'<rect x="10" y="3" width="21" height="34" rx="6" fill="#DCE9F7"/><path d="M17 8h7m-5 24h3"/><path d="M16 14c-4 4 4 13 8 10l2-3-4-2-2 2-3-4 2-1z" fill="#F6E0B8"/><path d="M34 11q5 7 0 14M6 14q-3 4 0 9" stroke="#A997C2"/>'};return '<svg class="mil-joker-art" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="#887299" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+shapes[type]+'</svg>';};
 const fmt=n=>n.toLocaleString('tr-TR');
 const d=document.createElement('dialog');d.id='millionaireDialog';d.setAttribute('aria-label','Kim Milyoner Olmak İster?');document.body.append(d);
 let s=null,timer,clock,mode="general";
 const lastRound={turkish:new Set(),general:new Set()};
 const questionKey=q=>q.passageId?"passage:"+q.passageId:q.answers.map(a=>a.trim().toLocaleLowerCase('tr-TR')).sort().join('|')+'::'+q.correct.trim().toLocaleLowerCase('tr-TR');
 function makeRound(){
  const bank=window.MILLIONAIRE_BANKS?.[mode];
  if(!Array.isArray(bank))throw new Error('Missing question bank');
  const ids=new Set();
  for(const q of bank){
   if(!q||ids.has(q.id)||!Number.isInteger(q.stage)||q.stage<1||q.stage>12||typeof q.text!=='string'||!q.text.trim()||!Array.isArray(q.answers)||q.answers.length!==4||q.answers.some(a=>typeof a!=='string'||!a.trim())||new Set(q.answers.map(a=>a.normalize('NFC').trim())).size!==4||!q.answers.includes(q.correct))throw new Error('Invalid question bank');
   ids.add(q.id);
  }
  const selected=[],keys=new Set();
  for(let stage=1;stage<=12;stage++){
   const pool=bank.filter(q=>q.stage===stage);
   if(pool.length<12)throw new Error('Incomplete question stage');
   const fresh=pool.filter(q=>!lastRound[mode].has(q.id));
   const distinct=fresh.filter(q=>!keys.has(questionKey(q)));
   const choices=distinct.length?distinct:fresh.length?fresh:pool;
   const q=choices[Math.floor(Math.random()*choices.length)];selected.push(q);keys.add(questionKey(q));
  }
  lastRound[mode]=new Set(selected.map(q=>q.id));return selected;
 }
 const unit=()=>mode==="turkish"?"puan":"TL";
 const label=()=>mode==="turkish"?"Türkçe Milyoner":"Genel Kültür Milyoner";
 const amount=n=>fmt(n)+" "+unit();
 function stopClock(){clearInterval(clock);clock=null;}
 function remaining(){return Math.max(0,s.deadline-Date.now());}
 function tick(){if(!s||s.phase!=="choose")return;const left=remaining();if($("milClock")){$("milClock").textContent=Math.ceil(left/1000)+" sn";$("milClock").classList.toggle("urgent",left<=10000);}if(left===0)finish("Süre doldu!",s.safe,"Doğru cevap: "+s.q.correct);}
 function canChoose(){if(!s||s.phase!=="choose")return false;if(remaining()<=0){tick();return false;}return true;}
 const $=id=>d.querySelector('#'+id);
 function close(){if(!d.querySelector('[data-mode]')){window.openMillionaireGame();return;}stopClock();clearTimeout(timer);s=null;d.close();document.querySelector('.tool-millionaire')?.focus();}
 d.addEventListener('cancel',e=>{e.preventDefault();close();});
 function shell(html){d.innerHTML='<button class="mil-close" aria-label="'+(html.includes('data-mode=')?'Oyunu kapat':'Yarışma seçimine dön')+'">✕</button><main class="mil-main">'+html+'</main>';d.querySelector('.mil-close').onclick=close;}
 window.openMillionaireGame=()=>{stopClock();clearTimeout(timer);s=null;shell(`<section class="mil-intro"><span class="mil-eyebrow">NOTİK · BİLGİ YARIŞMASI</span><div class="mil-emblem" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="#887099" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="50" cy="89" rx="30" ry="4" fill="#DAD0E7" stroke="none"/><path d="M30 24H17v10c0 14 10 22 23 22m30-32h13v10c0 14-10 22-23 22" fill="#D9CEE9"/><path d="M29 16h42v23c0 16-9 27-21 27S29 55 29 39z" fill="#F6DE9F"/><path d="M37 24v13c0 8 3 14 7 17" stroke="#FFF8DF" stroke-width="4"/><path d="M50 67v11m-17 8h34l-5-8H38z" fill="#D8CCE9"/><rect x="44" y="30" width="12" height="19" rx="5" fill="#FFF5D6"/><path d="M50 35v9"/><path d="m14 13 4 5m64-4 4-5" stroke="#B49CC7"/></svg></div><h1>Kim Milyoner<br>Olmak İster?</h1><p>Hangi yarışmaya katılmak istersin?</p><div class="mil-modes"><button data-mode="turkish"><b>Türkçe Milyoner</b><span>Türkçe bilgini göster</span></button><button data-mode="general"><b>Genel Kültür</b><span>Bilgini konuştur</span></button></div></section>`);d.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;start();});if(!d.open)d.showModal();d.querySelector('[data-mode]').focus();};
 function start(){stopClock();clearTimeout(timer);let questions;try{questions=makeRound();}catch(error){s=null;console.error('Milyoner soruları yüklenemedi:',error);shell('<section class="mil-result"><h2>Sorular tam yüklenemedi</h2><p>Bağlantını kontrol edip sayfayı yenile.</p><button id="milReload" class="mil-primary">Sayfayı yenile</button></section>');$('milReload').onclick=()=>location.reload();$('milReload').focus();return;}s={questions,index:0,earned:0,safe:0,half:false,audience:false,phone:false,phase:'choose',selected:null,hidden:[]};question();}
 function question(){stopClock();s.q=s.questions[s.index];s.options=shuffle(s.q.answers);s.selected=null;s.hidden=[];s.phase='choose';s.questionEntering=true;s.deadline=Date.now()+[30,45,60,90][Math.floor(s.index/3)]*1000;draw();s.questionEntering=false;$('milQuestion').focus();tick();clock=setInterval(tick,200);}
 function draw(){const q=s.q,locked=s.phase!=='choose',display=questionDisplay(q.text);shell(`<header class="mil-header"><span class="mil-eyebrow">${label()}</span><div class="mil-clock" role="timer" aria-label="Kalan süre" id="milClock">${['audience','phone','confirm'].includes(s.phase)?'Duraklatıldı':s.phase==='reveal'?'Durduruldu':''}</div><div class="mil-score"><small>Bu sorunun değeri</small><strong>${fmt(prizes[s.index])}<span> ${unit()}</span></strong></div></header><div class="mil-layout"><section class="mil-play"><article class="mil-question-card ${s.questionEntering?'mil-question-enter':''}"><div class="mil-meta"><span>Soru ${s.index+1} / 12</span><span>${esc(q.category)}</span></div><h2 id="milQuestion" class="${display.hasPassage?'mil-has-passage':''}" tabindex="-1">${display.html}</h2></article><div class="mil-answers ${s.questionEntering?'mil-question-enter':''}">${s.options.map((a,i)=>`<button data-answer="${i}" class="mil-answer ${s.selected===i?'selected':''} ${s.phase==='reveal'&&a===q.correct?'correct':''} ${s.phase==='reveal'&&s.selected===i&&a!==q.correct?'wrong':''}" ${locked||s.hidden.includes(i)?'disabled':''} aria-pressed="${s.selected===i}" ${s.hidden.includes(i)?'style="visibility:hidden"':''}><b>${'ABCD'[i]}</b><span>${esc(a)}</span></button>`).join('')}</div>${s.phase==='reveal'?`<p class="mil-notice" role="status">${s.options[s.selected]===q.correct?'Doğru cevap!':'Doğru cevap: '+esc(q.correct)}</p>`:''}<div class="mil-jokers"><button id="milHalf" ${s.half||locked?'disabled':''}>${jokerArt('half')}<span>Yarı yarıya</span></button><button id="milAudience" ${s.audience||locked?'disabled':''}>${jokerArt('audience')}<span>Seyirciye sor</span></button><button id="milPhone" ${s.phone||locked?'disabled':''}>${jokerArt('phone')}<span>Arkadaşına sor<small>30 saniye</small></span></button></div><div class="mil-bottom"><button id="milConfirm" class="mil-primary ${s.selected!==null&&s.phase==='choose'?'mil-confirm-ready':''}" ${s.selected===null||locked?'disabled':''}>Son kararım</button><button id="milWithdraw" ${locked?'disabled':''}>Çekil · ${amount(s.earned)}</button></div><p class="mil-safety">Güvencedeki ödül: ${amount(s.safe)}</p></section><aside class="mil-ladder" aria-label="Ödül basamakları"><h3>${mode==="turkish"?"Puan":"Ödül (TL)"}</h3><ol>${prizes.map((p,i)=>`<li class="${i===s.index?'active':''} ${i===3||i===7?'safe':''} ${i<s.index?'passed':''}"><span>${i+1}</span><strong>${fmt(p)}</strong>${i===3||i===7?'<small>◆</small>':''}</li>`).reverse().join('')}</ol><small>◆ Güvenli basamak</small></aside></div>`);
 d.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(!canChoose())return;s.selected=+b.dataset.answer;d.querySelectorAll('[data-answer]').forEach(option=>{const selected=+option.dataset.answer===s.selected;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));});const confirmButton=$('milConfirm');confirmButton.disabled=false;confirmButton.classList.add('mil-confirm-ready');b.focus();});
 $('milHalf').onclick=()=>{if(s.half||!canChoose())return;s.half=true;s.selected=null;s.hidden=shuffle(s.options.map((a,i)=>a!==q.correct?i:-1).filter(i=>i>=0)).slice(0,2);draw();};
 $('milAudience').onclick=askAudience;
 $('milPhone').onclick=askFriend;
 $('milConfirm').onclick=lockAnswer;
 $('milWithdraw').onclick=()=>{if(canChoose())askDecision('withdraw');};
 if(s.phase==='choose')tick();
 }
 function lockAnswer(){
  if(!canChoose()||s.selected===null)return;
  stopClock();s.phase='reveal';const q=s.q,correct=s.options[s.selected]===q.correct;draw();if(correct)showCorrect();
  const current=s;timer=setTimeout(()=>{if(s!==current||!d.open||s.phase!=='reveal')return;if(!correct){finish('Güzel bir denemeydi!',s.safe,'Doğru cevap: '+q.correct);return;}s.earned=prizes[s.index];if(s.index===3||s.index===7)s.safe=s.earned;if(++s.index===12){finish('Milyon '+unit()+' senin!',s.earned,'12 sorunun tamamını bildin!');return;}question();},1400);
 }
 function askDecision(){
  if(!canChoose())return;
  s.remaining=remaining();stopClock();s.phase='confirm';draw();
  const popup=document.createElement('section');popup.className='mil-audience mil-decision';popup.setAttribute('role','alertdialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-labelledby','milDecisionTitle');
  popup.innerHTML='<div class="mil-audience-card mil-decision-card"><span class="mil-eyebrow">YARIŞMADAN ÇEKİL</span><h2 id="milDecisionTitle">Çekilmek istediğine emin misin?</h2><p>Çekilirsen mevcut ödülün korunacak.</p><div class="mil-decision-actions"><button type="button" id="milDecisionNo">Hayır, geri dön</button><button type="button" id="milDecisionYes" class="mil-primary">Evet, çekil</button></div></div>';
  d.querySelector('.mil-main').inert=true;d.append(popup);
  function resume(){if(!d.open||!s||s.phase!=='confirm')return;popup.remove();d.querySelector('.mil-main').inert=false;s.phase='choose';s.deadline=Date.now()+s.remaining;draw();tick();clock=setInterval(tick,200);$('milQuestion').focus();}
  $('milDecisionNo').onclick=resume;
  $('milDecisionYes').onclick=()=>{if(!d.open||!s||s.phase!=='confirm')return;popup.remove();d.querySelector('.mil-main').inert=false;finish('Ödülünü korudun!',s.earned,'Yeni bir yarışmada tekrar buluşalım.');};
  $('milDecisionYes').focus();
 }
 function finish(title,points,detail){stopClock();clearTimeout(timer);s.phase='done';shell(`<section class="mil-result"><div class="mil-emblem" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none" stroke="#887099" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="50" cy="89" rx="30" ry="4" fill="#DAD0E7" stroke="none"/><path d="M30 24H17v10c0 14 10 22 23 22m30-32h13v10c0 14-10 22-23 22" fill="#D9CEE9"/><path d="M29 16h42v23c0 16-9 27-21 27S29 55 29 39z" fill="#F6DE9F"/><path d="M37 24v13c0 8 3 14 7 17" stroke="#FFF8DF" stroke-width="4"/><path d="M50 67v11m-17 8h34l-5-8H38z" fill="#D8CCE9"/><rect x="44" y="30" width="12" height="19" rx="5" fill="#FFF5D6"/><path d="M50 35v9"/><path d="m14 13 4 5m64-4 4-5" stroke="#B49CC7"/></svg></div><span class="mil-eyebrow">YARIŞMA TAMAMLANDI</span><h2>${esc(title)}</h2><strong>${fmt(points)} <span>${unit()}</span></strong><p>${esc(detail)}</p><button id="milAgain" class="mil-primary">Baştan başla</button></section>`);$('milAgain').onclick=start;$('milAgain').focus();}
 function askAudience(){
  if(!canChoose()||s.audience)return;
  const current=s;
  s.audience=true;s.remaining=remaining();stopClock();s.phase='audience';draw();
  const correct=s.options.indexOf(s.q.correct),available=s.options.map((_,i)=>i).filter(i=>!s.hidden.includes(i));
  const votes=[0,0,0,0];votes[correct]=60+Math.floor(Math.random()*21);let rest=100-votes[correct];
  const others=shuffle(available.filter(i=>i!==correct));others.forEach((i,n)=>{votes[i]=n===others.length-1?rest:Math.floor(Math.random()*(rest+1));rest-=votes[i];});
  const popup=document.createElement('section');popup.className='mil-audience';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-label','Temsili seyirci oylaması');
  popup.innerHTML=`<div class="mil-audience-card"><span class="mil-eyebrow">SEYİRCİYE SOR</span><h2>Seyircinin seçimi</h2><div class="mil-votes">${votes.map((v,i)=>`<div><b>${'ABCD'[i]}</b><div class="mil-vote-track"><span style="width:${v}%"></span></div><strong>%${v}</strong></div>`).join('')}</div><small>Süre duraklatıldı.</small><button id="milAudienceContinue" class="mil-primary">Devam et</button></div>`;
  d.querySelector('.mil-main').inert=true;d.append(popup);$('milAudienceContinue').onclick=()=>{if(s!==current||!d.open||s.phase!=='audience')return;stopClock();popup.remove();d.querySelector('.mil-main').inert=false;s.phase='choose';s.deadline=Date.now()+s.remaining;draw();tick();clock=setInterval(tick,200);$('milQuestion').focus();};$('milAudienceContinue').focus();
 }
 function askFriend(){
  if(!canChoose()||s.phone)return;
  s.phone=true;s.remaining=remaining();stopClock();s.phase='phone';s.phoneDeadline=Date.now()+30000;draw();
  const current=s,popup=document.createElement('section');popup.className='mil-audience mil-phone';popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-label','Arkadaşına sor');
  popup.innerHTML=`<div class="mil-audience-card mil-phone-card">${jokerArt('phone')}<h2>Arkadaşına sor</h2><p>Sınıftan bir arkadaşının fikrini al.</p><div id="milPhoneClock" class="mil-phone-clock" role="timer" aria-label="Arkadaşına sorma süresi">30</div><p class="mil-phone-question">${esc(s.q.text)}</p><div class="mil-phone-answers">${s.options.map((a,i)=>s.hidden.includes(i)?'':`<span><b>${'ABCD'[i]}</b> ${esc(a)}</span>`).join('')}</div><small>Soru süren duraklatıldı.</small><button id="milPhoneContinue" class="mil-primary">Oyuna dön</button></div>`;
  d.querySelector('.mil-main').inert=true;d.append(popup);
  function resume(){if(s!==current||s.phase!=='phone'||!d.open)return;stopClock();popup.remove();d.querySelector('.mil-main').inert=false;s.phase='choose';s.deadline=Date.now()+s.remaining;draw();tick();clock=setInterval(tick,200);$('milQuestion').focus();}
  $('milPhoneContinue').onclick=resume;$('milPhoneContinue').focus();
  clock=setInterval(()=>{if(s!==current||!d.open)return;const seconds=Math.max(0,Math.ceil((s.phoneDeadline-Date.now())/1000));$('milPhoneClock').textContent=seconds;$('milPhoneClock').classList.toggle('urgent',seconds<=5);if(seconds===0)resume();},100);
 }
 function showCorrect(){const p=document.createElement('div');p.className='mil-correct-pop';p.setAttribute('role','status');p.innerHTML='<div><b>Doğru!</b><span>'+amount(prizes[s.index])+'</span></div>';d.append(p);}
})();
