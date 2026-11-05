/* Optional game assets: ordered, session-deduplicated, retryable. */
(() => {
const manifest={"openFiguresGame":["game-presentation.js?v=2","punctuation-game.css?v=21","punctuation-game-data.js?v=4","punctuation-game.js?v=19","figures-game-data.js?v=2","figures-game.js?v=2"],"openClassroomGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "turkish-game-dictionary.js?v=4", "word-market-data.js?v=1", "secret-word-data.js?v=1", "classroom-games.js?v=36"], "openSentenceGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "sentence-game-data.js?v=1", "sentence-game.js?v=4"], "openLearningGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "learning-games.css?v=7", "puzzle-core.js?v=1", "learning-games.js?v=17"], "openMillionaireGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "millionaire-game.css?v=26", "millionaire-general-bank.js?v=2", "millionaire-general2-bank.js?v=1", "millionaire-turkish-bank.js?v=2", "millionaire-turkish-docx-bank.js?v=2", "millionaire-turkish-extra-bank.js?v=1", "millionaire-turkish-sorular3-bank.js?v=2", "millionaire-game.js?v=16"], "openSpellingGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "spelling-game.css?v=2", "punctuation-game.css?v=21", "spelling-game-data.js?v=4", "spelling-game.js?v=16"], "openPunctuationGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "punctuation-game.css?v=21", "punctuation-game-data.js?v=4", "punctuation-game.js?v=19"], "openWordHunter": ["classroom-games.css?v=39", "game-presentation.js?v=2", "word-hunter.css?v=10", "word-hunter-data.js?v=1", "word-hunter-core.js?v=2", "word-hunter.js?v=4"], "openChessGame": ["classroom-games.css?v=39", "game-presentation.js?v=2", "chess-game.css?v=4", "chess-game.js?v=4"], "toggleTools": ["classroom-games.css?v=39", "chess-game.css?v=4", "learning-games.css?v=7", "millionaire-game.css?v=26", "spelling-game.css?v=2", "punctuation-game.css?v=21", "word-hunter.css?v=10", "game-presentation.js?v=2"]};
const cssOrder=["classroom-games.css?v=39", "chess-game.css?v=4", "learning-games.css?v=7", "millionaire-game.css?v=26", "spelling-game.css?v=2", "game-presentation.css?v=49", "punctuation-game.css?v=21", "word-hunter.css?v=10"];
const assets=new Map(),jobs=new Map();
const indicator=document.createElement('div');indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');indicator.hidden=true;indicator.className='notik-asset-loader';
const style=document.createElement('style');style.textContent=`
.notik-asset-loader[hidden]{display:none!important}
.notik-asset-loader{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:12px;width:210px;max-width:calc(100vw - 32px);padding:22px 18px;border:1px solid #cdbddd;border-radius:26px;background:linear-gradient(145deg,#fffefa,#f0e9f8);color:#5c4974;font:700 14px/1.5 'Plus Jakarta Sans',sans-serif;text-align:center;box-shadow:inset 0 3px 0 #fff,inset 0 -4px 0 #c8b7dd44,0 12px 42px #46335e33}
.notik-asset-loader svg{width:88px;height:88px;overflow:visible}
.notik-asset-loader .loader-book{transform-origin:44px 48px;animation:notik-loader-float 1.8s ease-in-out infinite}
.notik-asset-loader .loader-star{transform-origin:center;transform-box:fill-box;animation:notik-loader-spark 1.4s ease-in-out infinite alternate}
.notik-asset-loader .loader-star:last-child{animation-delay:.5s}
.notik-asset-loader button{font:inherit;color:#55406e;border:1px solid #cbb9dd;border-radius:12px;background:linear-gradient(#fff,#e8ddf3);padding:8px 14px;min-height:44px;cursor:pointer}
.notik-asset-loader button:focus-visible{outline:3px solid #8c74ad;outline-offset:3px}
@keyframes notik-loader-float{50%{transform:translateY(-5px) rotate(-3deg)}}
@keyframes notik-loader-spark{from{opacity:.35;transform:scale(.75)}to{opacity:1;transform:scale(1.1)}}
@media(prefers-reduced-motion:reduce){.notik-asset-loader *{animation:none!important}}
`;document.head.append(style);document.body.append(indicator);
function showLoading(){
 indicator.hidden=false;
 indicator.innerHTML=`<svg viewBox="0 0 88 88" aria-hidden="true" focusable="false">
 <defs><linearGradient id="notik-loader-cover" x2="0" y2="1"><stop stop-color="#f1e7fc"/><stop offset="1" stop-color="#cdb9e4"/></linearGradient><linearGradient id="notik-loader-paper" x2="0" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#f5e7bd"/></linearGradient></defs>
 <ellipse cx="44" cy="77" rx="27" ry="5" fill="#b7a2cf" opacity=".18"/>
 <g class="loader-book" stroke="#88709f" stroke-width="2" stroke-linejoin="round">
 <rect x="12" y="22" width="64" height="49" rx="13" fill="url(#notik-loader-cover)"/>
 <path d="M44 33Q30 24 18 31V62Q31 57 44 66Q57 57 70 62V31Q57 24 44 33Z" fill="url(#notik-loader-paper)"/>
 <path d="M44 33V66M24 39L36 40M24 46L35 47M52 40L64 39M53 47L64 46" fill="none" stroke-linecap="round"/>
 <path d="M18 26Q29 21 37 25" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
 <circle cx="64" cy="61" r="12" fill="#c5e5d0" stroke="#73a68a"/><path d="m58 61 4 4 8-9" fill="none" stroke="#548466" stroke-width="3" stroke-linecap="round"/>
 </g><path class="loader-star" d="m15 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f3d894" stroke="#c9a866"/><path class="loader-star" d="m73 9 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#d4c4e9" stroke="#a08bbb"/>
 </svg><span>Hazırlanıyor…</span>`;
}
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
  const request=++latest;showLoading();
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
