/* Presentation only: retain the original button node and its game handlers. */
(()=>{
 const selector='.punct-restart,.wh-restart,.wh-again,#milAgain,#spellRestart,#spellAgain,#secretRestart,#marketRestart,#chainTimerReset,#chainRestart,#sentenceReset,#sentenceRestart,#chessReset,#chessAgain,#learnAgain,#geoRestart';
 function decorate(root){
  const buttons=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const button of buttons){
   if(button.querySelector(':scope > .game-restart-art'))continue;
   button.classList.add('game-restart-control');
   const image=document.createElement('img');image.className='game-restart-art';image.src='assets/icons/game-restart.svg';image.alt='';image.setAttribute('aria-hidden','true');
   const label=document.createElement('span');label.className='game-restart-label';label.textContent='Baştan Başla';
   button.replaceChildren(image,label);
  }
 }
 decorate(document);
 new MutationObserver(records=>{for(const record of records){if(record.target instanceof Element && record.target.matches(selector))decorate(record.target);for(const node of record.addedNodes)if(node instanceof Element)decorate(node);}}).observe(document.body,{childList:true,subtree:true});
})();
