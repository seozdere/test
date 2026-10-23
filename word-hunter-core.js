/* Pure round/scoring logic; no network or student records. */
(function(root){
'use strict';
function shuffle(items){const a=[...items],r=new Uint32Array(a.length);crypto.getRandomValues(r);for(let i=a.length-1;i>0;i--){const j=r[i]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeRound(bank,mode,seen=[]){
 if(mode!==1&&mode!==2)throw new Error('Invalid player count');
 const used=new Set(seen),decks=Array.from({length:mode},()=>[]);
 for(const kind of ['Deyim','Atasözü']){
  const pool=bank.filter(q=>q.kind===kind);
  if(pool.length<5*mode)throw new Error('Not enough questions');
  const chosen=[...shuffle(pool.filter(q=>!used.has(q.id))),...shuffle(pool.filter(q=>used.has(q.id)))].slice(0,5*mode);
  // Match the reading load within each category, then randomize each player's order.
  chosen.sort((a,b)=>a.term.length-b.term.length);
  for(let i=0;i<chosen.length;i+=mode){const pair=shuffle(chosen.slice(i,i+mode));pair.forEach((q,p)=>decks[p].push(q));}
 }
 const ordered=decks.map(shuffle),questions=[];
 for(let i=0;i<10;i++)for(let p=0;p<mode;p++)questions.push({...ordered[p][i],player:p,options:shuffle([ordered[p][i].meaning,ordered[p][i].wrong])});
 return {mode,questions,index:0,scores:Array(mode).fill(0),answered:false};
}
function answer(state,option){
 if(state.answered||state.index>=state.questions.length||![0,1].includes(option))return null;
 const q=state.questions[state.index],correct=q.options[option]===q.meaning;
 state.answered=true;if(correct)state.scores[q.player]+=10;
 return {correct,player:q.player,meaning:q.meaning};
}
function advance(state){if(!state.answered)return false;state.index++;state.answered=false;return true;}
const api=Object.freeze({shuffle,makeRound,answer,advance});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NoTikWordHunterCore=api;
})(typeof window==='undefined'?globalThis:window);
