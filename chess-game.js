/* NoTik chess UI. Rules: chess.js 1.4.0; AI: Stockfish.js 19 (separate worker). */
import { Chess } from './vendor/chess/chess.mjs';
const $=id=>document.getElementById(id), dialog=$('chessDialog');
const names={p:'Piyon',n:'At',b:'Fil',r:'Kale',q:'Vezir',k:'Şah'};
const shapes={
 p:'M24 31a9 9 0 1 1 16 0l-2 4 5 16H21l5-16z',
 r:'M19 16h7v7h5v-7h7v7h5v-7h6v15l-7 5 2 15H22l2-15-5-5z',
 n:'M22 51l2-14-8-1 4-13 13-10 2 7c16 4 13 20 11 31z M23 29h3 M32 23l-1 5',
 b:'M32 12c-14 13-16 19-5 25l-6 14h22l-6-14c11-6 9-12-5-25z M33 20l-5 10',
 q:'M17 25l9 9 6-14 6 14 9-9-6 26H23z M17 22v1 M32 16v1 M47 22v1',
 k:'M32 8v14 M26 14h12 M25 23c-13-3-12 10-4 16l3 12h16l3-12c8-6 9-19-4-16z'
};
export function pieceSVG(type,color){return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="${color==='w'?'#FFF9E9':'#645777'}" stroke="${color==='w'?'#716080':'#EDE2F6'}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><path d="${shapes[type]}"/><path d="M20 52h24l3 6H17z"/></svg>`;}
export function outcome(g){
 if(g.isCheckmate())return {title:(g.turn()==='w'?'Siyah':'Beyaz')+' kazandı!',reason:'Şah mat!'};
 if(g.isStalemate())return {title:'Berabere!',reason:'Pat: şah tehdit altında değil, yasal hamle yok.'};
 if(g.isInsufficientMaterial())return {title:'Berabere!',reason:'Mat için yeterli taş kalmadı.'};
 if(g.isThreefoldRepetition())return {title:'Berabere!',reason:'Aynı konum üç kez tekrarlandı.'};
 if(g.isDrawByFiftyMoves())return {title:'Berabere!',reason:'50 hamle boyunca piyon hareketi veya taş alma olmadı.'};
 return null;
}
let game=new Chess(),mode='local',selected=null,promotion=null,worker=null,busy=false,ready=false,failed=false,watchdog=null,noticeTimer=null,flipped=false,lastResult=null;
let hintWorker=null,hintTimer=null,suggestion=null,hintText='',hintPending=false,hintReady=false;
function clearHint(dispose=false){
 clearTimeout(hintTimer);
 // An interrupted search is discarded entirely; an idle engine stays warm.
 if(dispose||hintPending){if(hintWorker)hintWorker.terminate();hintWorker=null;hintReady=false;}
 hintPending=false;suggestion=null;hintText='';
}
function requestHint(){
 if(hintPending||busy||promotion||outcome(game)||(mode==='ai'&&game.turn()==='b')||!dialog.open)return;
 clearHint();hintText='Hamle önerisi hazırlanıyor…';
 const position=game.fen();
 const fail=()=>{clearHint(true);hintText='Öneri yüklenemedi. Hamle öner butonuyla tekrar deneyebilirsin.';render();};
 try{
  const current=hintWorker||new Worker(new URL('./vendor/chess/stockfish-19-lite-single.js',import.meta.url));hintWorker=current;hintPending=true;
  const search=()=>{
   clearTimeout(hintTimer);hintTimer=setTimeout(fail,15000);
   const history=game.history({verbose:true});
   const initial=history[0]?.before||position;
   const moves=history.map(m=>m.from+m.to+(m.promotion||'')).join(' ');
   current.postMessage('position fen '+initial+(moves?' moves '+moves:''));
   current.postMessage('go movetime 1500');
  };
  hintTimer=setTimeout(fail,30000);
  current.onerror=()=>{if(hintWorker===current)fail();};
  current.onmessage=e=>{
   if(hintWorker!==current||!hintPending||game.fen()!==position||!dialog.open)return;
   const line=String(e.data);
   if(line==='uciok'){
    current.postMessage('setoption name Hash value 16');
    current.postMessage('setoption name Skill Level value 20');
    current.postMessage('isready');
   }
   if(line==='readyok'&&!hintReady){hintReady=true;search();}
   if(line.startsWith('bestmove ')){
    const uci=line.split(' ')[1];
    const legal=game.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===uci);
    if(!legal){fail();return;}
    hintPending=false;clearHint();suggestion={from:legal.from,to:legal.to};
    hintText=`Öneri: ${names[legal.piece]} ${legal.from.toUpperCase()} → ${legal.to.toUpperCase()}${legal.promotion?' · '+names[legal.promotion]+' seç.':''}`;
    render();
   }
  };
  if(hintReady)search();else current.postMessage('uci');
 }catch{fail();}
 render();
}
const say=(text,error=false)=>{$('chessNotice').textContent=text;$('chessNotice').classList.toggle('error',error);clearTimeout(noticeTimer);if(text)noticeTimer=setTimeout(()=>$('chessNotice').textContent='',4000);};
function stopEngine(){clearTimeout(watchdog);if(worker)worker.terminate();worker=null;ready=false;busy=false;}
function engineFail(){stopEngine();failed=true;render();say('Bilgisayar yüklenemedi. Bağlantını kontrol edip “Tekrar dene”ye bas.',true);}
function startEngine(){
 stopEngine();failed=false;busy=true;render();
 try{
  const current=new Worker(new URL('./vendor/chess/stockfish-19-lite-single.js',import.meta.url));worker=current;
  watchdog=setTimeout(engineFail,30000);
  current.onerror=()=>{if(worker===current)engineFail();};
  current.onmessage=e=>{
   if(worker!==current)return;
   const line=String(e.data);
   if(line==='uciok'){current.postMessage('setoption name Hash value 32');current.postMessage('isready');}
   if(line==='readyok'){clearTimeout(watchdog);ready=true;busy=false;render();think();}
   if(line.startsWith('bestmove ')){
    clearTimeout(watchdog);busy=false;
    const move=line.split(' ')[1];
    try{game.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]||'q'});}catch{engineFail();return;}
    render();showResult();
   }
  };
  current.postMessage('uci');
 }catch{engineFail();}
}
function think(){
 if(mode!=='ai'||game.turn()!=='b'||outcome(game)||!dialog.open)return;
 if(!worker){if(!failed)startEngine();return;}
 if(!ready||busy)return;
 busy=true;render();
 // Replay history so the engine sees repetition, not just the final FEN.
 const moves=game.history({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).join(' ');
 const level=$('chessLevel').value;
 worker.postMessage('setoption name Skill Level value '+({easy:2,medium:10,strong:20}[level]));
 worker.postMessage('position startpos moves '+moves);
 worker.postMessage('go movetime '+(level==='strong'?1800:level==='medium'?900:400));
 watchdog=setTimeout(engineFail,15000);
}
function render(){
 const end=outcome(game),turn=game.turn(),history=game.history({verbose:true}),last=history.at(-1);
 $('chessTurn').textContent=end?end.title:busy?'Bilgisayar düşünüyor…':(turn==='w'?'Beyaz':'Siyah')+' oynuyor'+(game.isCheck()?' · Şah!':'');
 $('chessUndo').disabled=!history.length;
 $('chessHint').disabled=hintPending||busy||!!promotion||!!end||(mode==='ai'&&turn==='b');
 $('chessHint').textContent=hintPending?'Düşünüyor…':'Hamle öner';
 $('chessHintStatus').textContent=hintText;
 $('chessHintStatus').hidden=!hintText;
 $('chessRetry').hidden=!failed;
 $('chessLevelWrap').hidden=mode!=='ai';
 $('chessPromotion').hidden=!promotion;
 const legal=selected?game.moves({square:selected,verbose:true}):[];
 const files=flipped?'hgfedcba':'abcdefgh',ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
 $('chessStage').inert=!!promotion||!$('chessResult').hidden;
 const focus=document.activeElement?.dataset?.square;
 $('chessBoard').innerHTML=ranks.map((rank,ri)=>[...files].map((file,fi)=>{
  const sq=file+rank,p=game.get(sq),hint=legal.some(m=>m.to===sq);
  const recommended=suggestion&&(suggestion.from===sq||suggestion.to===sq);
  const cls=['chess-square',(file.charCodeAt(0)-97+rank)%2?'dark':'light',selected===sq?'selected':'',hint?'legal':'',last&&(last.from===sq||last.to===sq)?'last':'',p?.type==='k'&&p.color===turn&&game.isCheck()?'check':'',recommended?'recommended':''].join(' ');
  return `<button type="button" class="${cls}" data-square="${sq}" aria-label="${sq}${p?' '+(p.color==='w'?'Beyaz ':'Siyah ')+names[p.type]:', boş'}${hint?', gidilebilir':''}" aria-pressed="${selected===sq}">${p?pieceSVG(p.type,p.color):''}${fi===0?'<small class="rank">'+rank+'</small>':''}${ri===7?'<small class="file">'+file+'</small>':''}</button>`;
 }).join('')).join('');
 if(focus)$('chessBoard').querySelector(`[data-square="${focus}"]`)?.focus({preventScroll:true});
 $('chessHistory').textContent=history.length?history.map((m,i)=>(i%2===0?(Math.floor(i/2)+1)+'. ':'')+m.san).join('  '):'Bir taşa, ardından gideceği kareye dokun.';
}
function showResult(){const end=outcome(game);if(!end||lastResult===game.fen())return;lastResult=game.fen();$('chessResultTitle').textContent=end.title;$('chessResultReason').textContent=end.reason;$('chessResult').hidden=false;$('chessStage').inert=true;$('chessAgain').focus();}
function play(from,to,promote){
 try{game.move({from,to,promotion:promote||'q'});}catch{say(game.isCheck()?'Şahını korumalısın. Bu hamle yapılamaz.':'Bu hamle yapılamaz. İşaretli karelerden birini seç.',true);return;}
 clearHint();selected=null;promotion=null;say('');render();showResult();think();
}
$('chessBoard').addEventListener('click',e=>{
 const sq=e.target.closest('[data-square]')?.dataset.square;if(!sq)return;
 if(promotion||outcome(game))return;
 if(busy||(mode==='ai'&&game.turn()==='b')){say('Bilgisayarın hamlesini bekle.');return;}
 const p=game.get(sq);
 if(sq===selected){selected=null;render();return;}
 if(p?.color===game.turn()){selected=sq;render();return;}
 if(!selected){say('Önce sıradaki oyuncunun taşını seç.',true);return;}
 const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);
 if(candidates.some(m=>m.promotion)){
  clearHint();
  promotion={from:selected,to:sq};$('chessPromotionChoices').innerHTML=['q','r','b','n'].map(t=>`<button type="button" data-promote="${t}" aria-label="${names[t]}">${pieceSVG(t,game.turn())}<span>${names[t]}</span></button>`).join('');render();$('chessPromotionChoices').firstElementChild.focus();return;
 }
 play(selected,sq);
});
$('chessPromotionChoices').onclick=e=>{const type=e.target.closest('[data-promote]')?.dataset.promote;if(type&&promotion)play(promotion.from,promotion.to,type);};
$('chessPromotionCancel').onclick=()=>{promotion=null;render();};
function reset(){clearHint();stopEngine();game=new Chess();selected=promotion=lastResult=null;failed=false;$('chessResult').hidden=true;say('');render();}
$('chessUndo').onclick=()=>{
 clearHint();stopEngine();failed=false;promotion=selected=lastResult=null;$('chessResult').hidden=true;
 const previous=game.undo();if(mode==='ai'&&previous?.color==='b')game.undo();
 say('Hamle geri alındı.');render();
};
$('chessReset').onclick=reset;$('chessAgain').onclick=reset;
$('chessResultDismiss').onclick=()=>{$('chessResult').hidden=true;$('chessStage').inert=false;$('chessUndo').focus();};
$('chessFlip').onclick=()=>{flipped=!flipped;render();};
$('chessRetry').onclick=startEngine;
$('chessHint').onclick=requestHint;
function choose(value){mode=value;$('chessChoose').hidden=true;$('chessStage').hidden=false;reset();}
$('chessLocal').onclick=()=>choose('local');$('chessComputer').onclick=()=>choose('ai');
function close(){clearHint(true);stopEngine();clearTimeout(noticeTimer);dialog.close();document.querySelector('.tool-chess')?.focus();}
$('chessClose').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
window.openChessGame=()=>{clearHint(true);stopEngine();$('chessChoose').hidden=false;$('chessStage').hidden=true;$('chessResult').hidden=true;$('chessPromotion').hidden=true;dialog.showModal();$('chessLocal').focus();};
