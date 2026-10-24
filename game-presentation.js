/* Reuse the original animated card drawings on game entry screens. */
(function(){
 window.gameIntroArt=function(card,extra=''){
  const source=document.querySelector('.'+card+' .game-card-art');
  if(!source)return '';
  return '<div class="game-intro-art '+extra+'" aria-hidden="true">'+source.innerHTML+'</div>';
 };
 const initialize=()=>{
  document.querySelector('#chainModePicker').insertAdjacentHTML('afterbegin',gameIntroArt('tool-chain')+'<h2 class="game-intro-title">Kelime Zinciri</h2>');
  document.querySelector('#sentenceModePicker').insertAdjacentHTML('afterbegin',gameIntroArt('tool-sentence'));
  document.querySelector('#gameStage').insertAdjacentHTML('afterbegin',gameIntroArt('tool-word-market','intro-market')+gameIntroArt('tool-secret-word','intro-secret'));
  const chess=document.querySelector('#chessChoose'),art=chess.querySelector('.chess-intro-art');if(art)chess.prepend(art);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
