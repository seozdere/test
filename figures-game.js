/* Local question scheduling; each category and answer position is balanced. */
(()=>{
 const bank=window.NoTikFiguresBank,categories=[...new Set(bank.map(q=>q.answer))];
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 let pools={};
 function draw(){
  const questions=[];
  for(const category of categories){
   if(!pools[category]?.length)pools[category]=shuffle(bank.filter(q=>q.answer===category));
   for(let i=0;i<2;i++)questions.push(pools[category].pop());
  }
  const positions=shuffle(Array.from({length:10},(_,i)=>i%4));
  return shuffle(questions).map((q,i)=>{const options=shuffle(categories.filter(c=>c!==q.answer && !(q.answer==="Konuşturma" && c==="Kişileştirme"))).slice(0,3);options.splice(positions[i],0,q.answer);return {...q,options};});
 }
 window.createNoTikDuel({id:'figuresDialog',open:'openFiguresGame',title:'Söz Sanatları Kâşifi',art:'tool-figures',bank,draw});
})();
