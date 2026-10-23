/* Isolated Söz Avcısı dialog. Only its own DOM and local question history change. */
(function(){
'use strict';
const bank=window.NoTikWordHunterBank,core=window.NoTikWordHunterCore;
const dialog=document.createElement('dialog');dialog.id='wordHunterDialog';dialog.setAttribute('aria-label','Söz Avcısı – Deyim ve Atasözü');document.body.append(dialog);
const $=s=>dialog.querySelector(s),key='notik-word-hunter-seen-v1';
let state=null,timer=null,opener=null,seen=[];
try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))seen=saved.filter(id=>bank.some(q=>q.id===id));}catch{}
const art='<svg viewBox="0 0 120 92" fill="none" stroke="#827297" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21q23-9 44 1 22-10 45-1v53q-23-8-45 1-21-9-44-1z" fill="#FFF2CE"/><path d="M59 24v48M25 35h23m-23 12h17m28-12h22"/><g class="wh-lens"><circle cx="83" cy="55" r="18" fill="#D6EBDF"/><path d="m96 69 13 13" stroke-width="7"/><path d="m76 55 5 5 10-12" stroke="#59876C" stroke-width="3"/></g></svg>';
const person=n=>'<svg viewBox="0 0 80 70" fill="none" stroke="#88749B" stroke-width="2" aria-hidden="true">'+(n===2?'<circle cx="22" cy="20" r="10" fill="#FFF1CF"/><path d="M5 59V47a17 17 0 0 1 34 0v12z" fill="#DBEBDD"/><circle cx="57" cy="20" r="10" fill="#FFF1CF"/><path d="M40 59V47a17 17 0 0 1 34 0v12z" fill="#E2D6EE"/>':'<circle cx="40" cy="20" r="12" fill="#FFF1CF"/><path d="M18 60V49a22 22 0 0 1 44 0v11z" fill="#DBEBDD"/>')+'</svg>';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function clear(){clearTimeout(timer);timer=null;}
function remember(id){
 if(seen.length>=bank.length)seen=[];
 seen=seen.filter(x=>x!==id);seen.push(id);
 try{localStorage.setItem(key,JSON.stringify(seen));}catch{}
}
function shell(html){clear();dialog.innerHTML='<button type="button" class="wh-close" aria-label="Oyunu kapat"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button><main class="wh-stage">'+html+'</main>';$('.wh-close').onclick=close;}
function close(){clear();state=null;dialog.close();opener?.focus();}
dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{clear();state=null;});
window.openWordHunter=function(){opener=document.activeElement;menu();if(!dialog.open)dialog.showModal();};
function menu(){state=null;shell('<section class="wh-intro"><div class="wh-art">'+art+'</div><h1>Söz Avcısı</h1><p class="wh-subtitle">Deyim &amp; Atasözü</p><p>Deyim ve atasözlerini doğru anlamlarıyla eşleştir!</p><div class="wh-modes"><button data-mode="1">'+person(1)+'<strong>Tek oyuncu</strong><span>10 soruda kendini dene.</span></button><button data-mode="2">'+person(2)+'<strong>İki oyuncu</strong><span>Sırayla oynayın, kişi başına 10 soru.</span></button></div></section>');dialog.scrollTop=0;dialog.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(Number(b.dataset.mode)));}
function start(mode){clear();state=core.makeRound(bank,mode,seen);render();dialog.scrollTop=0;}
function render(){
 const q=state.questions[state.index];remember(q.id);
 const turn=Math.floor(state.index/state.mode)+1;
 shell('<header class="wh-heading"><h1>Söz Avcısı</h1><span>Deyim &amp; Atasözü</span></header><div class="wh-scores">'+state.scores.map((s,i)=>'<div class="wh-score '+(i===q.player?'is-active':'')+'" '+(i===q.player?'aria-current="true"':'')+'><span>'+(state.mode===1?'Puanın':(i+1)+'. Oyuncu')+'</span><strong>'+s+' <small>puan</small></strong></div>').join('')+'</div><div class="wh-turn" role="status">'+(state.mode===2?'Sıra '+(q.player+1)+'. Oyuncuda · ':'')+'Soru '+turn+' / 10</div><section class="wh-question '+(q.player===1?'wh-purple':'')+'" aria-labelledby="whTerm"><div class="wh-term-card"><span class="wh-kind">'+q.kind+'</span><h2 id="whTerm">'+escape(q.term)+'</h2></div><p class="wh-prompt">Bu söz ne anlama geliyor?</p><div class="wh-options">'+q.options.map((o,i)=>'<button type="button" data-option="'+i+'"><span class="wh-letter" aria-hidden="true">'+(i===0?'A':'B')+'</span><span>'+escape(o)+'</span></button>').join('')+'</div><div class="wh-feedback" role="status" aria-live="polite" aria-atomic="true"></div></section><footer class="wh-actions"><button class="wh-restart wh-gloss" type="button"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="7" y="9" width="50" height="48" rx="17" fill="#C6B1DA" opacity=".4"/><rect x="7" y="5" width="50" height="48" rx="17" fill="#E9DEF4" stroke="#AF94C5" stroke-width="2"/><path d="M16 17q2-6 12-6" stroke="white" stroke-width="3" stroke-linecap="round"/><path d="M20 26a14 14 0 1 1-1 13M19 17v10h10" stroke="#806397" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Baştan başla</span></button></footer>');
 dialog.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.option)));
 $('.wh-restart').onclick=()=>start(state.mode);
}
function choose(index){
 if(!state)return;const result=core.answer(state,index);if(!result)return;
 const round=state,q=round.questions[round.index];
 dialog.querySelectorAll('[data-option]').forEach(b=>{b.disabled=true;if(q.options[Number(b.dataset.option)]===q.meaning)b.classList.add('is-correct');else if(Number(b.dataset.option)===index)b.classList.add('is-wrong');});
 const feedback=$('.wh-feedback');feedback.classList.add(result.correct?'wh-good':'wh-bad');
 feedback.innerHTML=result.correct?'<strong class="wh-pop">✓ Doğru! +10 puan</strong>':'<div class="wh-error-pop"><strong>Doğrusu</strong><span>'+escape(result.meaning)+'</span></div>';
 $('.wh-score.is-active strong').innerHTML=round.scores[result.player]+' <small>puan</small>';
 timer=setTimeout(()=>{if(state!==round||!dialog.open)return;core.advance(round);if(round.index===round.questions.length)finish();else render();},1500);
}
function finish(){const mode=state.mode,scores=[...state.scores];state=null;
 const title=mode===1?'Harika av, söz avcısı!':scores[0]===scores[1]?'Berabere!':(scores[0]>scores[1]?'1. Oyuncu':'2. Oyuncu')+' kazandı!';
 shell('<section class="wh-result"><div class="wh-art">'+art+'</div><h1>'+title+'</h1><div class="wh-scores">'+scores.map((s,i)=>'<div class="wh-score"><span>'+(mode===1?'Sonucun':(i+1)+'. Oyuncu')+'</span><strong>'+s+' / 100 puan</strong></div>').join('')+'</div><p>Her söz, yeni bir keşif!</p><button class="wh-again" type="button">Yeniden oyna</button></section>');dialog.scrollTop=0;$('.wh-again').onclick=()=>start(mode);
}
})();
