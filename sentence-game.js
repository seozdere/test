/* Local classroom game. No accounts, student records, or network writes. */
(() => {
 'use strict';
 const normalize=word=>String(word).normalize('NFC').toLocaleLowerCase('tr-TR');
 function isValidOrder(puzzle,words){
  if(words.length!==puzzle.words.length)return false;
  const input=words.map(normalize),groups=puzzle.groups.map(g=>g.map(normalize));
  const predicate=groups.at(-1),end=input.length-predicate.length;
  if(!predicate.every((word,i)=>input[end+i]===word))return false;
  const movable=groups.slice(0,-1);
  function match(offset,used){
   if(offset===end)return used===(1<<movable.length)-1;
   return movable.some((group,i)=>!(used&(1<<i))&&offset+group.length<=end&&group.every((word,j)=>input[offset+j]===word)&&match(offset+group.length,used|(1<<i)));
  }
  return match(0,0);
 }
 const randomIndex=n=>{const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;};
 function shuffledOrder(puzzle,random=randomIndex){
  let ids;
  for(let attempt=0;attempt<12;attempt++){
   ids=puzzle.words.map((_,i)=>i);
   for(let i=ids.length-1;i>0;i--){const j=random(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}
   if(!isValidOrder(puzzle,ids.map(i=>puzzle.words[i])))return ids;
  }
  // All shipped predicates contain a verb and cannot validly lead the sentence.
  ids=puzzle.words.map((_,i)=>i).reverse();
  if(isValidOrder(puzzle,ids.map(i=>puzzle.words[i])))throw new Error('Sentence cannot be scrambled: '+puzzle.id);
  return ids;
 }
 if(typeof module!=='undefined'&&module.exports){module.exports={isValidOrder,shuffledOrder};return;}
 const $=id=>document.getElementById(id),dialog=$('sentenceDialog');
 const data=window.NoTikSentences||[];
 const state={mode:null,puzzle:null,order:[],selected:[],score:0,solved:0,locked:false,running:false,finished:false,deadline:0,bag:[],previous:-1};
 let opener=null,timer=null,feedbackTimer=null,nextTimer=null;
 function clearFeedback(){clearTimeout(feedbackTimer);clearTimeout(nextTimer);feedbackTimer=null;nextTimer=null;$('sentenceFeedback').replaceChildren();}
 function paintClock(){const seconds=state.finished?0:state.running?Math.max(0,Math.ceil((state.deadline-performance.now())/1000)):60;$('sentenceClock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('sentenceStart').hidden=state.running||state.finished;$('sentenceStartGuide').hidden=state.mode!=='timed'||state.running||state.finished;$('sentenceTimerBox').hidden=state.mode!=='timed';$('sentenceTimerBox').dataset.urgent=String(state.running&&seconds<=10);}
 function tick(){if(state.mode==='timed'&&state.running&&performance.now()>=state.deadline){state.running=false;state.finished=true;state.locked=true;clearInterval(timer);timer=null;clearFeedback();say('');render();if(dialog.open){$('sentenceResult').scrollIntoView?.({block:'center',behavior:'auto'});$('sentenceRestart').focus();}}else paintClock();}
 function canPlay(){if(!state.mode||!state.running||state.finished)return false;if(state.mode==='timed'&&performance.now()>=state.deadline){tick();return false;}return true;}
 function reset(){clearInterval(timer);timer=null;clearFeedback();Object.assign(state,{score:0,solved:0,running:state.mode==='untimed',finished:false,deadline:0});next();if(state.mode==='timed')$('sentenceStart').focus();else $('sentenceBank').querySelector('button:not(:disabled)')?.focus();}
 function showCorrect(){clearFeedback();const card=document.createElement('div');card.className='sentence-correct-card';const title=document.createElement('strong');title.textContent='Doğru!';const points=document.createElement('span');points.textContent='+10 puan';card.append(title,points);$('sentenceFeedback').append(card);feedbackTimer=setTimeout(()=>{$('sentenceFeedback').replaceChildren();feedbackTimer=null;},600);nextTimer=setTimeout(()=>{nextTimer=null;if(canPlay())next();},650);}
 $('sentenceStart').addEventListener('click',()=>{if(state.mode!=='timed'||state.running||state.finished)return;state.running=true;state.deadline=performance.now()+60000;timer=setInterval(tick,100);render();});
 $('sentenceRestart').addEventListener('click',reset);
 function say(text,kind=''){$('sentenceMessage').textContent=text;$('sentenceMessage').dataset.kind=kind;}
 function next(){
  if(!data.length)return;clearFeedback();
  if(!state.bag.length)state.bag=data.map((_,i)=>i);
  let pool=state.bag.filter(i=>i!==state.previous);if(!pool.length)pool=state.bag;
  const index=pool[randomIndex(pool.length)];state.previous=index;state.bag.splice(state.bag.indexOf(index),1);
  state.puzzle=data[index];state.order=shuffledOrder(state.puzzle);state.selected=[];state.locked=false;say('');render();
 }
 function render(){
  paintClock();$('sentencePaper').hidden=state.finished;$('sentenceResult').hidden=!state.finished;$('sentenceResultScore').textContent=state.score+' puan';$('sentenceResultCount').textContent=state.solved+' cümle kurtardın!';
  $('sentenceScore').textContent=`${state.score} puan · ${state.solved} cümle`;
  $('sentenceProgress').textContent=`${state.selected.length} / ${state.puzzle.words.length} kelime`;
  $('sentenceAnswer').replaceChildren();$('sentenceBank').replaceChildren();
  if(!state.selected.length){const empty=document.createElement('span');empty.className='sentence-empty';empty.textContent='Cümlen burada oluşacak';$('sentenceAnswer').append(empty);}
  for(const id of state.selected){const button=document.createElement('button');button.type='button';button.className='sentence-token selected';button.textContent=state.puzzle.words[id];button.disabled=!state.running||state.locked;button.setAttribute('aria-label',state.puzzle.words[id]+' kelimesini geri al');button.addEventListener('click',()=>{if(!canPlay()||state.locked)return;state.selected=state.selected.filter(x=>x!==id);say('');render();$('sentenceBank').querySelector(`[data-word="${id}"]`)?.focus();});$('sentenceAnswer').append(button);}
  for(const id of state.order){const button=document.createElement('button');button.type='button';button.className='sentence-token';button.dataset.word=String(id);button.textContent=state.puzzle.words[id];button.disabled=!state.running||state.locked||state.selected.includes(id);button.addEventListener('click',()=>{if(!canPlay()||state.locked||state.selected.includes(id))return;state.selected.push(id);say('');render();const target=state.selected.length===state.puzzle.words.length?$('sentenceCheck'):$('sentenceBank').querySelector('button:not(:disabled)');target?.focus();});$('sentenceBank').append(button);}
  $('sentenceCheck').disabled=!state.running||state.locked||state.selected.length!==state.puzzle.words.length;
  $('sentenceClear').disabled=!state.running||state.locked||!state.selected.length;
  $('sentenceNext').disabled=!state.running;
 }
 $('sentenceCheck').addEventListener('click',()=>{
  if(!canPlay()||state.locked||state.selected.length!==state.puzzle.words.length)return;
  if(isValidOrder(state.puzzle,state.selected.map(i=>state.puzzle.words[i]))){state.locked=true;state.score+=10;state.solved++;render();say('');showCorrect();}
  else say('Bir daha dene: sözcük gruplarını birlikte tut, yüklemi sona getir. Seçtiğin kelimeye tıklayarak geri alabilirsin.','retry');
 });
 $('sentenceClear').addEventListener('click',()=>{if(!canPlay()||state.locked)return;state.selected=[];say('');render();$('sentenceBank').querySelector('button:not(:disabled)')?.focus();});

 $('sentenceNext').addEventListener('click',()=>{if(!canPlay())return;next();$('sentenceBank').querySelector('button:not(:disabled)')?.focus();});
 $('sentenceReset').addEventListener('click',reset);
 const close=()=>{clearInterval(timer);timer=null;state.running=false;clearFeedback();dialog.close();opener?.focus();};
 $('sentenceClose').addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 function showModePicker(){clearInterval(timer);timer=null;clearFeedback();state.running=false;state.mode=null;$('sentenceModePicker').hidden=false;$('sentenceStage').hidden=true;dialog.setAttribute('aria-labelledby','sentenceModeTitle');$('sentenceTimed').focus();}
 function chooseMode(mode){state.mode=mode;$('sentenceModePicker').hidden=true;$('sentenceStage').hidden=false;dialog.setAttribute('aria-labelledby','sentenceTitle');reset();}
 $('sentenceTimed').addEventListener('click',()=>chooseMode('timed'));
 $('sentenceUntimed').addEventListener('click',()=>chooseMode('untimed'));
 window.openSentenceGame=()=>{
  if(dialog.open)return;
  if(!data.length){window.alert('Cümleler yüklenemedi. Sayfayı yenileyin.');return;}
  opener=document.activeElement;showModePicker();dialog.showModal();$('sentenceTimed').focus();
 };
})();
