/* Optional game assets: ordered, session-deduplicated, retryable. */
(() => {
const manifest={"openFiguresGame":["game-presentation.js?v=2","punctuation-game.css?v=21","punctuation-game-data.js?v=4","punctuation-game.js?v=17","figures-game-data.js?v=2","figures-game.js?v=1"],"openClassroomGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "turkish-game-dictionary.js?v=4", "word-market-data.js?v=1", "secret-word-data.js?v=1", "classroom-games.js?v=36"], "openSentenceGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "sentence-game-data.js?v=1", "sentence-game.js?v=4"], "openLearningGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "learning-games.css?v=7", "puzzle-core.js?v=1", "learning-games.js?v=17"], "openMillionaireGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "millionaire-game.css?v=26", "millionaire-general-bank.js?v=2", "millionaire-general2-bank.js?v=1", "millionaire-turkish-bank.js?v=2", "millionaire-turkish-docx-bank.js?v=2", "millionaire-turkish-extra-bank.js?v=1", "millionaire-turkish-sorular3-bank.js?v=2", "millionaire-game.js?v=16"], "openSpellingGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "spelling-game.css?v=2", "punctuation-game.css?v=21", "spelling-game-data.js?v=4", "spelling-game.js?v=16"], "openPunctuationGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "punctuation-game.css?v=21", "punctuation-game-data.js?v=4", "punctuation-game.js?v=17"], "openWordHunter": ["classroom-games.css?v=39", "game-presentation.js?v=2", "word-hunter.css?v=7", "word-hunter-data.js?v=1", "word-hunter-core.js?v=2", "word-hunter.js?v=4"], "openChessGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "chess-game.css?v=4", "chess-game.js?v=4"], "toggleTools": ["classroom-games.css?v=39", "chess-game.css?v=4", "learning-games.css?v=7", "millionaire-game.css?v=26", "spelling-game.css?v=2", "punctuation-game.css?v=21", "word-hunter.css?v=7", "game-presentation.js?v=2"]};
const cssOrder=["classroom-games.css?v=39", "chess-game.css?v=4", "learning-games.css?v=7", "millionaire-game.css?v=26", "spelling-game.css?v=2", "game-presentation.css?v=49", "punctuation-game.css?v=21", "word-hunter.css?v=7"];
const assets=new Map(),jobs=new Map();
const indicator=document.createElement('div');indicator.setAttribute('role','status');indicator.hidden=true;
indicator.style.cssText='position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:10000;padding:10px 16px;border-radius:12px;background:#26324b;color:white;font:14px sans-serif;max-width:90vw';document.body.append(indicator);
function load(url){
 if(assets.has(url))return assets.get(url);
 const promise=new Promise((resolve,reject)=>{
  const css=url.includes('.css'),node=document.createElement(css?'link':'script');
  if(css){node.rel='stylesheet';node.href=url;}else{node.src=url;if(url.startsWith('chess-game.js'))node.type='module';}
  node.onload=resolve;node.onerror=()=>{node.remove();assets.delete(url);reject(new Error(url));};if(css){
   const rank=cssOrder.indexOf(url);
   const later=[...document.head.querySelectorAll('link[rel="stylesheet"]')].find(link=>cssOrder.indexOf(link.getAttribute('href'))>rank);
   document.head.insertBefore(node,later||document.querySelector('link[href^="parent-mobile-header.css"]'));
  }else document.head.append(node);
 });assets.set(url,promise);return promise;
}
let latest=0;
Object.entries(manifest).forEach(([name,urls])=>{
 const original=window[name];let implementation=original;
 const wrapper=async(...args)=>{
  const request=++latest;indicator.hidden=false;indicator.textContent='Yükleniyor…';
  try{
   if(!jobs.has(name))jobs.set(name,(async()=>{for(const url of urls)await load(url);if(window[name]!==wrapper)implementation=window[name];window[name]=wrapper;})().catch(error=>{jobs.delete(name);throw error;}));
   await jobs.get(name);
   if(request!==latest)return;
   if(typeof implementation!=='function')throw new Error('Oyun açılamadı');
   indicator.hidden=true;return await implementation(...args);
  }catch(error){
   if(request!==latest)return;
   indicator.hidden=false;indicator.replaceChildren(document.createTextNode('Yüklenemedi. '));
   const retry=document.createElement('button');retry.type='button';retry.textContent='Tekrar dene';retry.onclick=()=>wrapper(...args);indicator.append(retry);
  }
 };window[name]=wrapper;
});
})();
