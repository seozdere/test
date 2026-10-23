/* Classroom games: local play only, no student records or network writes. */
(() => {
 'use strict';
 const normalize = value => String(value).normalize('NFC').trim().toLocaleLowerCase('tr-TR').replace(/[âîû]/g,c=>({'â':'a','î':'i','û':'u'}[c]));
 const dictionary=typeof module!=='undefined'&&module.exports?require('./turkish-game-dictionary.js'):window.NoTikGameDictionary;
 const dictionaryError=word=>!dictionary?'Kelime sözlüğü yüklenemedi. Sayfayı yenileyin.':dictionary.has(normalize(word))?'':'Bu kelime oyun sözlüğünde yok. Kelimenin yalın hâlini kullanın.';
 const lettersOnly = word => /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/u.test(word);
 // Match whole words and common inflections, never arbitrary substrings (e.g. sikke, götür).
 const profanityMessage='Bu kelime oyun için uygun değil. Başka bir kelime yazın.';
 const profanityFold=value=>normalize(value).normalize('NFKC').replace(/[çğıöşü]/g,l=>({'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u'}[l])).replace(/[\s\p{P}\p{Cf}]/gu,'');
 const blockedWords=new Set(['amk','aq','amq','amina','amini','aminakoyim','aminakoyayim','aminakoyiyim','aminakoydum','amcik','amcigi','siktir','sikeyim','sikeyin','sikik','sikis','sikisik','sikici','sikerim','siker','sikmis','siktim','siktin','sikti','sikiyor','sik','orospu','orospucocugu','pic','piclik','yarrak','yarrag','yarak','yarag','got','gotveren','gotlek','dassak','dassag','tassak','tassag','tasak','tasag','ibne','pezevenk','kahpe','kaltak','kaltag','fuck','shit','bitch','asshole','motherfucker']);
 // Classroom-specific exclusions include the anatomical terms requested by the teacher.
 const exactOnlyWords=new Set(['am','dol','oc']);
 ['penis','vajina','sikko','siko','sikim','sikissiz','sikisken','sikisme','sikisiyor','sikiseyim','sokuk','amcik','amcig','amcikli','amciksiz','amini','amina','aminakoy','aminako','amina','siktirgit','hassiktir','hasiktir','hassik','bok','boktan','bombok','boklu','cuk','yarram','yarra','yarro','yarakli','gavat','kavat','godos','lavuk','dallama','dangalak','aptal','salak','gerizekali','gerzek','ahmak','beyinsiz','embesil','haysiyetsiz','serefsiz','namussuz','pust','fahise','kerhane','kancik','kevase','malafat','pornografi','porno','pornografik','seks','seksuel','masturbasyon','masturbator','otuzbir','otuzbirci','dildo','klitoris','orgazm','sperm','sperma','testis','anus','anus','tasak','abaza','abazan','puşt','ibnelik','ibneli','ipne','orosbu','orospuluk','orospucocuk','amcuk','amck','amciklama','aminoglu','aminferyadi','dalyarak','dalyarrak','gotelek','gotoglan','gotos','gotlu','gotune','gotunu','gotunden','siktirik','siktirici','sikiver','sikicem','sikecem','sikiyim','sikeyim','sikem','sikerler','siktiler','sikil','sikilmis','sikilmek','sictir','sicayim','sictigim','sictirgit','yavsak','yavsag','pespaye','hiyarto','zibidi','zirtapoz','yarragim','yaragim','yarrami'].forEach(w=>blockedWords.add(profanityFold(w)));
 const profanitySuffix=/^(?:lar|ler|lik|luk|ci|cu|yi|yu|ya|ye|si|su|im|in|i|a|e|u|um|un|imi|ini|ina|inin|inda|imda|ime|inde|inden|indan|dan|den|ten|tan|siniz|sin|miz|niz|imiz|iniz|mek|mak|me|ma|ti|tim|tir|tirin|tirgit)*$/;
 function isInappropriate(value){const original=normalize(value);const word=profanityFold(value);if(word.length>64)return false;if(exactOnlyWords.has(word)||/^döl(?:ü|ün|ünü|üne|ler|leri|lük)?$/u.test(original))return true;if(blockedWords.has(word)||blockedWords.has(word.replace(/(.)\1+/gu,'$1'))||blockedWords.has(word.replace(/(.)\1{2,}/gu,'$1$1')))return true;for(const root of blockedWords){if(root.length>=3&&word.startsWith(root)&&profanitySuffix.test(word.slice(root.length)))return true;}return false;}
 const canBuild = (word, letters) => {
  const available = [...letters];
  return [...word].every(letter => { const i = available.indexOf(letter); if (i < 0) return false; available.splice(i, 1); return true; });
 };
 const marketPuzzles=typeof module!=='undefined'&&module.exports?require('./word-market-data.js'):(window.NoTikWordMarket||[]);
 const secretPuzzles=typeof module!=='undefined'&&module.exports?require('./secret-word-data.js'):(window.NoTikSecretWords||[]);
 const alphabet=[...'abcçdefgğhıijklmnoöprsştuüvyz'];
 function randomIndex(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
 function shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=randomIndex(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
 function take(items,state){if(!state.bag?.length)state.bag=items.map((_,i)=>i);let pool=state.bag.filter(i=>i!==state.previous);if(!pool.length)pool=state.bag;const index=pool[randomIndex(pool.length)];state.bag.splice(state.bag.indexOf(index),1);state.previous=index;return items[index];}
 if(typeof module!=='undefined'&&module.exports){module.exports={dictionaryError,isInappropriate,normalize,lettersOnly,canBuild,marketPuzzles,secretPuzzles,alphabet};return;}
 const $=id=>document.getElementById(id),dialog=$('classroomGameDialog');
 const chain={mode:null,passLetter:null,done:false,turns:[0,0],words:[],scores:[0,0],team:0,remaining:20000,running:false,undo:[]};
 const market={found:[],score:0,done:false,running:false,deadline:0,revealed:false};
 let marketTimer=null;
 const secret={guesses:[],hints:1,done:false,finished:false,running:false,remaining:60000,score:0,solved:0};
 let secretTimer=null,secretNextTimer=null,secretFeedbackTimer=null;
 const secretValue=()=>Math.max(10,30-Math.max(0,secret.hints-1)*10);
 function clearSecretFeedback(){clearTimeout(secretFeedbackTimer);secretFeedbackTimer=null;$('secretFeedback').replaceChildren();$('secretPenalty').replaceChildren();}
 function stopSecret(){if(secret.running)secret.remaining=Math.max(0,secret.deadline-performance.now());secret.running=false;clearInterval(secretTimer);secretTimer=null;}
 function secretPaint(){const left=secret.running?Math.max(0,secret.deadline-performance.now()):secret.remaining;const seconds=Math.ceil(left/1000);$('secretClock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('secretStart').hidden=secret.running||secret.finished;$('secretStartGuide').hidden=secret.running||secret.finished;$('secretTimerBox').dataset.urgent=String(secret.running&&seconds<=10);}
 function secretTick(){if(secret.running&&performance.now()>=secret.deadline){stopSecret();clearTimeout(secretNextTimer);secretNextTimer=null;clearSecretFeedback();secret.done=true;secret.finished=true;secret.remaining=0;if(active==='secret'){render();say('');if(dialog.open){$('secretResult').scrollIntoView?.({block:'center',behavior:'auto'});$('secretRestart').focus();}}}else if(active==='secret')secretPaint();}
 function secretCanPlay(){if(active!=='secret'||!secret.running||secret.finished)return false;if(performance.now()>=secret.deadline){secretTick();return false;}return !secret.done;}
 function secretFeedback(won,text){clearSecretFeedback();const card=document.createElement('div');card.className='secret-feedback-card';card.dataset.won=String(won);const title=document.createElement('strong');title.textContent=won?'Tebrikler, kelimeyi buldunuz!':text;card.append(title);if(won){const score=document.createElement('span');score.textContent='+'+secretValue()+' puan';card.append(score);for(let i=0;i<24;i++){const bit=document.createElement('i');bit.className='secret-confetti';bit.setAttribute('aria-hidden','true');bit.style.setProperty('--x',((i*41)%100)+'%');bit.style.setProperty('--drift',((i%2?-1:1)*(25+i*5))+'px');bit.style.setProperty('--turn',(i*47)+'deg');bit.style.setProperty('--delay',((i%4)*.04)+'s');bit.style.setProperty('--color',['#A6D5BE','#F2CD76','#C3A8DF','#A6CCE8','#E9AEBF'][i%5]);card.append(bit);}}$('secretFeedback').append(card);secretFeedbackTimer=setTimeout(()=>{$('secretFeedback').replaceChildren();secretFeedbackTimer=null;},1250);}
 function nextSecretLater(){clearTimeout(secretNextTimer);secretNextTimer=setTimeout(()=>{secretNextTimer=null;if(!secret.running||secret.finished)return;if(performance.now()>=secret.deadline){secretTick();return;}newSecret(take(secretPuzzles,secret));if(active==='secret'){render();say('');}},1300);}
 function resetSecretSession(){stopSecret();clearTimeout(secretNextTimer);secretNextTimer=null;clearSecretFeedback();Object.assign(secret,{score:0,solved:0,remaining:60000,finished:false});newSecret(take(secretPuzzles,secret));if(active==='secret'){render();say('');}}
 $('secretStart').addEventListener('click',()=>{if(active!=='secret'||secret.running||secret.finished)return;secret.running=true;secret.deadline=performance.now()+secret.remaining;secretTimer=setInterval(secretTick,100);render();say('');});
 $('secretRestart').addEventListener('click',()=>{if(active!=='secret')return;resetSecretSession();$('secretStart').focus();});
 let chainChoosing=false;
 let active=null,lastOpener=null,closeTimer=null,timer=null,messageTimer=null;
 function say(text){clearTimeout(messageTimer);messageTimer=null;$('gameMessage').textContent=text;if(text==='Sıra diğer takımda!')messageTimer=setTimeout(()=>{$('gameMessage').textContent='';messageTimer=null;},1000);}
 function chips(target,words,kind='game-word'){target.replaceChildren(...words.map(word=>{const el=document.createElement('span');el.className=kind;el.textContent=word;return el;}));}
 function timerPaint(){const left=chain.running?Math.max(0,chain.deadline-performance.now()):chain.remaining;$('gameClock').textContent=`${Math.ceil(left/1000)} sn`;$('gamePause').textContent=chain.running?'Duraklat':'Süreyi başlat';$('gamePause').dataset.waiting=String(!chain.running&&!chain.done);$('gamePause').disabled=chain.done;$('chainPass').disabled=!chain.running||chain.done;}
 function stopClock(){if(chain.running)chain.remaining=Math.max(0,chain.deadline-performance.now());chain.running=false;clearInterval(timer);timer=null;timerPaint();}
 function startClock(){if(chain.running||chain.done||chainChoosing||!chain.mode||active!=='chain'||!dialog.open)return;chain.running=true;chain.deadline=performance.now()+chain.remaining;timer=setInterval(tick,100);timerPaint();}
 function tick(){if(!chain.running)return;if(performance.now()>=chain.deadline){$('gameField').value='';if(chain.mode==='solo'){finishChain();return;}advanceTeam();if(!chain.done){render();say(`Süre doldu. Sıra Takım ${chain.team===0?'A':'B'}’da.`);}}else timerPaint();}
 function finishChain(){stopClock();chain.done=true;chain.remaining=0;$('gameField').value='';say('');render();$('chainResult').scrollIntoView?.({block:'center',behavior:'auto'});$('chainRestart').focus();}
 function advanceTeam(){stopClock();chain.turns[chain.team]++;if(chain.turns[0]+chain.turns[1]>=20){finishChain();return;}chain.team=1-chain.team;chain.remaining=20000;startClock();}
 function pause(){tick();stopClock();}
 function marketPaint(){const seconds=market.done?0:market.running?Math.max(0,Math.ceil((market.deadline-performance.now())/1000)):60;$('marketClock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('marketTimerBox').dataset.urgent=String(market.running&&seconds<=10);}
 function marketTick(){if(market.running&&performance.now()>=market.deadline){market.running=false;market.done=true;clearInterval(marketTimer);marketTimer=null;if(active==='market'){render();say('Süre doldu!');if(dialog.open)$('marketFinal').scrollIntoView?.({block:'center',behavior:'auto'});}}else if(active==='market')marketPaint();}
 function marketCanPlay(){marketTick();return active==='market'&&market.running&&!market.done;}
 function startMarket(){if(active!=='market'||market.running||market.done)return;market.running=true;market.deadline=performance.now()+60000;marketTimer=setInterval(marketTick,100);render();say('');}
 $('marketStart').addEventListener('click',startMarket);
 function resetMarket(){if(active!=='market')return;clearInterval(marketTimer);marketTimer=null;market.running=false;market.deadline=0;market.found=[];market.score=0;market.done=false;market.revealed=false;newRound();}
 $('marketNextStudent').addEventListener('click',resetMarket);
 $('marketRestart').addEventListener('click',()=>{if(active!=='market')return;resetMarket();$('marketStart').focus();});
 $('marketReset').addEventListener('click',()=>{resetMarket();$('marketStart').focus();});
 function chainError(word){const first=chain.passLetter||chain.words.at(-1)?.word.at(-1);if(!lettersOnly(word)||word.length<2||word.length>30)return 'En az 2 harfli, tek bir Türkçe kelime yazın.';if(chain.words.some(x=>x.word===word))return 'Bu kelime zincirde var.';if(first&&word[0]!==first)return `Kelimeniz “${first.toLocaleUpperCase('tr-TR')}” ile başlamalı.`;if(word.endsWith('ğ'))return 'Zincir devam edebilsin: Ğ ile bitmeyen bir kelime seçin.';return dictionaryError(word);}
 function updateSubmitHint(){for(const key of chainKeys)key.disabled=key.dataset.unsupported==='true'||active!=='chain'||chainChoosing||!chain.running;$('gameMarketGuide').textContent=market.running?'Bu harflerle kelimeler bulmaya başla!':'Süreyi başlat ve bu harflerle kelimeler bulmaya başla!';$('gameBackspace').disabled=active!=='market'||!market.running||market.done||!$('gameField').value;if(active==='market'&&normalize($('gameField').value).length)market.started=true;$('gameMarketGuide').hidden=active!=='market'||!!market.started||market.done;$('gameSubmit').dataset.ready=String(active==='chain'&&!$('gameField').disabled&&normalize($('gameField').value).length>0);}
 $('gameField').addEventListener('input',updateSubmitHint);
 $('gameBackspace').addEventListener('click',()=>{if(!marketCanPlay())return;$('gameField').value=[...$('gameField').value].slice(0,-1).join('');updateSubmitHint();say('');});
 const qKeyboardRows=['qwertyuıopğü','asdfghjklşi','zxcvbnmöç'];
 const chainKeys=[];
 for(const letters of qKeyboardRows){const row=document.createElement('div');row.className='chain-key-row';for(const letter of letters){const key=document.createElement('button');key.type='button';key.textContent=letter.toLocaleUpperCase('tr-TR');key.dataset.unsupported=String(!alphabet.includes(letter));key.setAttribute('aria-label',key.textContent+' harfi');key.addEventListener('click',()=>{if(!alphabet.includes(letter)||!chainCanType())return;if($('gameField').value.length<30){$('gameField').value+=letter;updateSubmitHint();}});row.append(key);chainKeys.push(key);}$('chainTypingKeyboard').append(row);}
 const keyActions=document.createElement('div');keyActions.className='chain-key-row';
 for(const [label,action] of [['⌫ Sil','delete'],['Onayla ve ekle','submit']]){const key=document.createElement('button');key.type='button';key.textContent=label;key.dataset.action=action;key.addEventListener('click',()=>{if(!chainCanType())return;if(action==='delete'){$('gameField').value=[...$('gameField').value].slice(0,-1).join('');updateSubmitHint();}else submitGame({preventDefault(){}},true);});keyActions.append(key);chainKeys.push(key);}$('chainTypingKeyboard').append(keyActions);
 function chainCanType(){if(active!=='chain'||chainChoosing||!chain.running)return false;if(performance.now()>=chain.deadline){tick();return false;}return true;}
 function chooseChainMode(mode){if(active!=='chain'||!chainChoosing)return;chainChoosing=false;if(chain.mode!==mode){chain.mode=mode;newRound();}else render();$(chain.done?'chainRestart':'gamePause').focus();}
 $('chainSolo').addEventListener('click',()=>chooseChainMode('solo'));
 $('chainTeam').addEventListener('click',()=>chooseChainMode('team'));
 function render(){
  const choosing=active==='chain'&&chainChoosing;$('chainModePicker').hidden=!choosing;$('gameStage').hidden=choosing;dialog.setAttribute('aria-labelledby',choosing?'chainModeTitle':'gameTitle');dialog.dataset.choosing=String(choosing);if(choosing){dialog.dataset.game='chain';dialog.dataset.team='';return;}
  const c=active==='chain',m=active==='market',s=active==='secret';
  $('gameBoardLabel').hidden=s;$('gameBoardLabel').dataset.intro=String(c);$('gameBoard').hidden=c&&!chain.words.length&&!chain.passLetter;
  dialog.dataset.game=active;dialog.dataset.team=c?(chain.mode==='solo'?'solo':chain.team===0?'a':'b'):'';dialog.dataset.mode=c?chain.mode:'';
  $('gameTitle').textContent=c?(chain.mode==='solo'?'Kelime Zinciri · Bireysel':'Kelime Zinciri · Takım'):m?'Kelime Pazarı':'Gizli Kelime';
  $('gameIntro').hidden=true;$('gameScore').hidden=true;
  $('gameIntro').textContent=c||m?'':'Harfleri seçin, gizli kelimeyi açın. 7 yanlış hakkınız var.';
  $('gameEmblem').hidden=true;$('gameEmblem').textContent=c||m?'':'?';
  $('marketTimerBox').hidden=!m;$('marketFinal').hidden=!m||!market.done;$('marketStart').hidden=!m||market.running||market.done;$('marketNextStudent').hidden=!m;$('gameLetterActions').hidden=!m;$('chainTypingKeyboard').hidden=!c;$('chainPass').hidden=!c;$('gameTeamA').hidden=c&&chain.mode==='solo';$('gameTeamB').hidden=c&&chain.mode==='solo';$('gameTeams').hidden=!c||chain.done;$('gamePaper').hidden=(c&&chain.done)||(s&&secret.finished);$('chainResult').hidden=!c||!chain.done;$('chainTurnCount').hidden=!c||chain.mode!=='team'||chain.done;$('gameKeyboard').hidden=!s;$('secretTimerBox').hidden=!s;$('secretStartGuide').hidden=!s||secret.running||secret.finished;$('secretWordStatus').hidden=!s;$('secretResult').hidden=!s||!secret.finished;$('gameForm').hidden=s;
  $('gameHint').hidden=!s;$('gameReveal').hidden=c||(m&&!market.done);$('gameUndo').hidden=true;
  $('gameUndo').disabled=!chain.undo.length;
  $('gameNew').disabled=m&&market.done;
  $('gameNew').textContent=c?'Baştan başla':m?'Yeni harfler':'Yeni kelime';
  $('gameReveal').textContent=m?'Örnek kelimeleri göster':'Kelimeyi göster';
  $('gameSubmit').textContent=c?'Onayla ve ekle':'Onayla ve sat';
  $('gameField').disabled=c?!chain.running:m?!market.running:true;$('gameSubmit').disabled=$('gameField').disabled;updateSubmitHint();
  $('gameReveal').disabled=m?market.revealed:secret.done||!secret.running;
  $('gameBoard').replaceChildren();$('gameClues').replaceChildren();$('gameKeyboard').replaceChildren();
  $('gameFineprint').hidden=c||m;
  $('gameFineprint').textContent=c||m?'':'Açılan harf tüm yerlerinde görünür. Doğru harf hak götürmez; tekrar seçilemez.';
  if(c){
   $('chainTurnCount').textContent=`Tur ${Math.min(20,chain.turns[0]+chain.turns[1]+1)} / 20 · Her takıma 10 sıra`;
   $('chainResultTitle').textContent=chain.mode==='solo'?'Oyun bitti!':chain.scores[0]===chain.scores[1]?'Berabere!':`Takım ${chain.scores[0]>chain.scores[1]?'A':'B'} kazandı!`;
   $('chainResultScores').replaceChildren();chips($('chainResultScores'),chain.mode==='solo'?[`Skorun: ${chain.scores[0]} puan`]:[`Takım A: ${chain.scores[0]} puan`,`Takım B: ${chain.scores[1]} puan`],'chain-result-score');
   $('chainResultSummary').textContent=chain.mode==='solo'?`${chain.words.length} kelimelik bir zincir kurdun.`:`20 tur tamamlandı · ${chain.words.length} geçerli kelime`;
   $('gameTeamA').textContent=`Takım A · ${chain.scores[0]}`;$('gameTeamB').textContent=`Takım B · ${chain.scores[1]}`;
   $('gameTeamA').dataset.active=String(chain.team===0);$('gameTeamB').dataset.active=String(chain.team===1);
   $('gameScore').textContent=chain.mode==='solo'?`${chain.done?'Skorun: ':''}${chain.scores[0]} puan · ${chain.words.length} kelime`:`Sıra: Takım ${chain.team===0?'A':'B'} · ${chain.words.length} kelime`;
   timerPaint();$('gameBoardLabel').textContent=chain.done?'Tur tamamlandı! Yeni bir zincir kurmaya hazır mısın?':(chain.passLetter||chain.words.length)?`İlk harfi ${(chain.passLetter||chain.words.at(-1).word.at(-1)).toLocaleUpperCase('tr-TR')} olan bir kelime bul!`:chain.running?'İlk kelimeyi yaz!':'Başlamak için süreyi başlat ve ilk kelimeyi yaz!';

   if(chain.passLetter||chain.words.length)chips($('gameBoard'),[(chain.passLetter||chain.words.at(-1).word.at(-1)).toLocaleUpperCase('tr-TR')],'game-tile');
   chips($('gameWords'),chain.words.map(x=>`${chain.mode==='solo'?'':(x.team===0?'A':'B')+' · '}${x.word} +${x.word.length}`));$('gameWordsLabel').textContent='Kelime zinciriniz';
  }else if(m){
   $('gameScore').textContent=`${market.score} puan · ${market.found.length} kelime`;marketPaint();$('marketFinalScore').textContent=`${market.score} puan`;$('marketFinalCount').textContent=`${market.found.length} kelime buldun!`;
   $('gameBoardLabel').textContent='Harf tezgâhı';
   market.tiles.forEach(letter=>{const b=document.createElement('button');b.type='button';b.className='game-tile';b.textContent=letter.toLocaleUpperCase('tr-TR');b.disabled=!market.running;b.setAttribute('aria-label',`${b.textContent} harfini ekle`);b.addEventListener('click',()=>{if(!marketCanPlay())return;if(canBuild(normalize($('gameField').value)+letter,market.letters)){$('gameField').value+=letter;updateSubmitHint();}else say('Bu harfin tüm kutularını kullandınız.');});$('gameBoard').append(b);});
   $('gameWords').replaceChildren();market.found.forEach(word=>{const row=document.createElement('span');row.className='game-word';const label=document.createElement('span');label.textContent=`${word} +${word.length**2}`;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`${word} kelimesini ve puanını kaldır`);remove.disabled=!market.running;remove.addEventListener('click',()=>{if(!marketCanPlay())return;market.found=market.found.filter(w=>w!==word);market.score=market.found.reduce((sum,w)=>sum+w.length**2,0);render();say('Kelime ve puanı kaldırıldı.');});row.append(label,remove);$('gameWords').append(row);});
   $('gameWordsLabel').textContent='Satılan kelimeler';
   if(market.revealed){const p=document.createElement('p');p.textContent='Örnekler: '+market.puzzle.words.join(', ');$('gameClues').append(p);}
  }else{
   secretPaint();
   const mistakes=secret.guesses.filter(l=>!secret.puzzle.word.includes(l));
   $('gameScore').textContent=`${secret.score} puan · ${secret.solved} kelime`;$('secretWordStatus').textContent=`Bu kelime: ${secretValue()} puan · Kalan hak: ${7-mistakes.length}`;$('secretResultScore').textContent=secret.score+' puan';$('secretResultCount').textContent=secret.solved+' kelime buldun!';
   $('gameBoardLabel').textContent='Gizli kelime';
   chips($('gameBoard'),[...secret.puzzle.word].map(l=>secret.done||secret.guesses.includes(l)?l.toLocaleUpperCase('tr-TR'):'·'),'game-tile');
   secret.puzzle.clues.slice(0,secret.hints).forEach((clue,i)=>{const p=document.createElement('p');p.textContent=`${i+1}. ${clue}`;$('gameClues').append(p);});
   $('gameHint').disabled=secret.hints>=secret.puzzle.clues.length||secret.done||!secret.running;
   for(const letters of qKeyboardRows){const row=document.createElement('div');row.className='secret-key-row';for(const l of letters){const b=document.createElement('button');b.type='button';b.className='game-key';b.textContent=l.toLocaleUpperCase('tr-TR');b.dataset.unsupported=String(!alphabet.includes(l));b.disabled=!alphabet.includes(l)||!secret.running||secret.done||secret.guesses.includes(l);if(secret.guesses.includes(l))b.dataset.result=secret.puzzle.word.includes(l)?'correct':'wrong';b.addEventListener('click',()=>guess(l));row.append(b);}$('gameKeyboard').append(row);}
   chips($('gameWords'),mistakes.map(l=>l.toLocaleUpperCase('tr-TR')));$('gameWordsLabel').textContent='Kelime içinde olmayan harfler';
  }
 }
 function guess(letter){if(!secretCanPlay()||secret.guesses.includes(letter)||!alphabet.includes(letter))return;secret.guesses.push(letter);secret.won=[...secret.puzzle.word].every(l=>secret.guesses.includes(l));secret.done=secret.won||secret.guesses.filter(l=>!secret.puzzle.word.includes(l)).length>=7;if(secret.won){secret.score+=secretValue();secret.solved++;}render();if(secret.done){say('');secretFeedback(secret.won,`Kelime: ${secret.puzzle.word.toLocaleUpperCase('tr-TR')}`);nextSecretLater();}else say(secret.puzzle.word.includes(letter)?'Doğru harf!':'Bu harf kelimede yok.');}
 function newSecret(puzzle){secret.puzzle=puzzle;secret.guesses=[];secret.hints=puzzle.clues.length?1:0;secret.done=false;secret.won=false;}
 function newRound(){
  if(active==='chain'){stopClock();Object.assign(chain,{passLetter:null,words:[],scores:[0,0],team:0,remaining:chain.mode==='solo'?60000:20000,done:false,turns:[0,0],undo:[]});}
  if(active==='market'){if(market.running&&!marketCanPlay()||market.done)return;market.puzzle=take(marketPuzzles,market);market.letters=market.puzzle.letters;while(market.letters.length<9)market.letters+='aeıi'[randomIndex(4)];market.tiles=shuffle(market.letters);if(market.tiles.join('')===market.letters){const different=market.tiles.findIndex(l=>l!==market.tiles[0]);if(different>0)[market.tiles[0],market.tiles[different]]=[market.tiles[different],market.tiles[0]];}market.started=false;market.revealed=false;}
  if(active==='secret'){if(secret.running){if(performance.now()>=secret.deadline){secretTick();return;}clearTimeout(secretNextTimer);secretNextTimer=null;clearSecretFeedback();newSecret(take(secretPuzzles,secret));}else resetSecretSession();}
  $('gameField').value='';say('');render();
 }
 window.openClassroomGame=kind=>{if(!['chain','market','secret'].includes(kind)||dialog.open)return;if((kind==='market'&&!marketPuzzles.length)||(kind==='secret'&&!secretPuzzles.length)){window.alert('Oyun verileri yüklenemedi. Sayfayı yenileyin.');return;}active=kind;chainChoosing=kind==='chain';lastOpener=document.activeElement;clearTimeout(closeTimer);dialog.classList.remove('speech-closing');if((kind==='market'&&!market.puzzle)||(kind==='secret'&&!secret.puzzle))newRound();else{say('');$('gameField').value='';render();}dialog.showModal();if(kind==='market')marketTick();if(kind==='secret')secretTick();if(kind==='chain')$('chainSolo').focus();else $('gameClose').focus();};
 function close(){if(!dialog.open||dialog.classList.contains('speech-closing'))return;if(active==='chain')pause();if(active==='secret')clearSecretFeedback();dialog.classList.add('speech-closing');closeTimer=setTimeout(()=>{dialog.close();dialog.classList.remove('speech-closing');lastOpener?.focus();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:260);}
 $('gameClose').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active==='chain'){pause();render();}});
 document.addEventListener('keydown',e=>{if(active!=='secret'||!dialog.open||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;const l=normalize(e.key);if(alphabet.includes(l)){e.preventDefault();guess(l);}});
 $('gamePause').addEventListener('click',()=>{if(chain.running)pause();else startClock();render();});
 function submitGame(e,fromKeyboard=false){
  e.preventDefault();if(active==='chain'&&(chainChoosing||!chain.mode))return;if(active==='market'&&!marketCanPlay())return;if(active==='chain'&&chain.running&&performance.now()>=chain.deadline){tick();return;}if($('gameField').disabled)return;
  const word=normalize($('gameField').value);if(isInappropriate(word)){say(profanityMessage);return;}let error='';
  if(active==='chain'){
   error=chainError(word);if(!error){chain.undo.push({scores:[...chain.scores],team:chain.team,turns:[...chain.turns]});chain.passLetter=null;chain.words.push({word,team:chain.team});chain.scores[chain.team]+=word.length;if(chain.mode==='team')advanceTeam();}
  }else if(active==='market'){
   if(!lettersOnly(word)||word.length<2)error='En az 2 harfli bir kelime yazın.';
   else if(!canBuild(word,market.letters))error='Bu kelime için tezgâhtaki harfler yeterli değil.';
   else if(market.found.includes(word))error='Bu kelime zaten satıldı.';
   else if(dictionaryError(word))error=dictionaryError(word);
   else{market.found.push(word);market.score+=word.length**2;}
  }
  if(error){say(error);return;}if(active==='chain'&&chain.done)return;$('gameField').value='';render();say(active==='chain'?(chain.mode==='solo'?`Zincire eklendi! +${word.length} puan`:'Sıra diğer takımda!'):`Kelime satıldı! +${word.length**2} puan`);if(!fromKeyboard)$('gameField').focus();
 }
 $('gameForm').addEventListener('submit',submitGame);
 $('gameNew').addEventListener('click',newRound);
 function resetChain(){if(active!=='chain'||chainChoosing||!chain.mode)return;newRound();$('gamePause').focus();}
 $('chainRestart').addEventListener('click',resetChain);
 $('chainTimerReset').addEventListener('click',resetChain);
 $('chainPass').addEventListener('click',()=>{if(!chainCanType())return;$('gameField').value='';if(chain.mode==='team'){advanceTeam();if(chain.done)return;render();say('Sıra diğer takımda!');}else{const current=chain.passLetter||chain.words.at(-1)?.word.at(-1);const choices=[...alphabet].filter(l=>l!=='ğ'&&l!==current);chain.passLetter=choices[randomIndex(choices.length)];render();say('');}});
 $('gameUndo').addEventListener('click',()=>{const previous=chain.undo.pop();if(!previous)return;stopClock();chain.words.pop();chain.scores=previous.scores;chain.team=previous.team;chain.turns=previous.turns;chain.done=false;chain.remaining=chain.mode==='solo'?60000:20000;render();say('Kelime ve puanı geri alındı. Hazır olunca süreyi başlatın.');});
 $('gameHint').addEventListener('click',()=>{if(secretCanPlay()&&secret.hints<secret.puzzle.clues.length){secret.hints++;render();say('');const penalty=document.createElement('span');penalty.className='secret-penalty-pop';penalty.textContent='−10 puan';$('secretPenalty').replaceChildren(penalty);}});
 $('gameReveal').addEventListener('click',()=>{if(active==='market'){marketTick();if(!market.done)return;market.revealed=true;render();say('');return;}if(!secretCanPlay())return;secret.done=true;render();say('');secretFeedback(false,`Kelime: ${secret.puzzle.word.toLocaleUpperCase('tr-TR')}`);nextSecretLater();});


})();
