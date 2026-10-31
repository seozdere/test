const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('word-hunter.js','utf8');const context=vm.createContext({});vm.runInContext(source.slice(source.indexOf('function bindDuelAnswer('),source.indexOf('function choosePlayer(')),context);
const totals=[0,0];const buttons=totals.map((_,i)=>{const b={disabled:false,isConnected:true,addEventListener(n,fn){this[n]=fn}};context.bindDuelAnswer(b,()=>{totals[i]++;b.disabled=true});return b});
buttons.forEach((b,i)=>b.pointerdown({pointerType:'touch',pointerId:i+1,isPrimary:i===0,preventDefault(){}}));assert.deepEqual(totals,[1,1]);
buttons.forEach(b=>b.onclick({pointerType:'touch',detail:1}));assert.deepEqual(totals,[1,1]);
buttons[0].disabled=false;buttons[0].onclick({detail:0});assert.equal(totals[0],2);
const rules=[['word-hunter.css','tool-word-hunter',-4],['punctuation-game.css','tool-punctuation',-3],['game-presentation.css','tool-millionaire',-2]];
for(const [file,name,order]of rules){const css=fs.readFileSync(file,'utf8');assert(new RegExp('\\.'+name+'\\{[^}]*order:'+order+';?').test(css),file)}
console.log('PASS: primary + secondary touch, duplicate prevention, keyboard activation, lazy stylesheet ordering');
