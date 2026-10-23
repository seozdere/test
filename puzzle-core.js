/* Shared, independently testable puzzle rules. */
(function(root){
 function solveSudoku(input,limit=2){
  if(!/^[0-9]{81}$/.test(input))return {count:0,solution:null};
  const grid=[...input].map(Number),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);let count=0,solution=null;
  const box=i=>Math.floor(i/27)*3+Math.floor(i%9/3);
  for(let i=0;i<81;i++)if(grid[i]){const bit=1<<grid[i],r=Math.floor(i/9),c=i%9,b=box(i);if((rows[r]|cols[c]|boxes[b])&bit)return {count:0,solution:null};rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;}
  function search(){
   if(count>=limit)return;let best=-1,options=[],size=10;
   for(let i=0;i<81;i++)if(!grid[i]){const mask=rows[Math.floor(i/9)]|cols[i%9]|boxes[box(i)],allowed=[];for(let n=1;n<=9;n++)if(!(mask&(1<<n)))allowed.push(n);if(!allowed.length)return;if(allowed.length<size){best=i;options=allowed;size=allowed.length;if(size===1)break;}}
   if(best===-1){count++;solution??=grid.join('');return;}
   const r=Math.floor(best/9),c=best%9,b=box(best);
   for(const n of options){const bit=1<<n;grid[best]=n;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;search();grid[best]=0;rows[r]&=~bit;cols[c]&=~bit;boxes[b]&=~bit;if(count>=limit)return;}
  }search();return {count,solution};
 }
 function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function gradeAnswer(expected,actual,attempts){return {correct:expected===actual,points:expected===actual?Math.max(2,10-attempts*2):0};}
 const api={solveSudoku,shuffle,gradeAnswer};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NoTikPuzzleCore=api;
})(typeof window==='undefined'?globalThis:window);
