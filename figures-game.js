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
 window.createNoTikDuel({id:'figuresDialog',open:'openFiguresGame',title:'Söz Sanatları Kâşifi',art:'tool-figures',restartArt:"<svg viewBox=\"0 0 64 64\" fill=\"none\" aria-hidden=\"true\"><rect x=\"7\" y=\"9\" width=\"50\" height=\"48\" rx=\"17\" fill=\"#C6B1DA\" opacity=\".4\"/><rect x=\"7\" y=\"5\" width=\"50\" height=\"48\" rx=\"17\" fill=\"#E9DEF4\" stroke=\"#AF94C5\" stroke-width=\"2\"/><path d=\"M16 17q2-6 12-6\" stroke=\"white\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M20 26a14 14 0 1 1-1 13M19 17v10h10\" stroke=\"#806397\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg><span>Baştan başla</span>",bank,draw});
})();
