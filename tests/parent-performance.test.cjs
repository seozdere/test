const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('parent.js','utf8');
const timers=new Map();let id=0,calls=0,resolve;
const ctx=vm.createContext({document:{hidden:false},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),Date,JSON,console,
 syncParentState:()=>{calls++;return new Promise(r=>resolve=r)},window:{ParentRecovery:{ready(){},fail(){}}},students:[],records:{},classRecords:{},notes:{},currentSubject:'x',SUBJECTS:[],currentView:'homework',ClassLogData:{},summaryDialog:{open:false},
 renderSubjectTabs(){},updateBranding(){},renderCurrentView(){},renderParentNoticeBar(){},renderParentTickerBar(){},renderCriticalPopup(){}});
vm.runInContext('let parentPollTimer=null,parentRefreshInFlight=false,lastParentRefreshAt=0;'+source.slice(source.indexOf("let parentLastStateHash ="),source.indexOf('function renderSubjectTabs()')),ctx);
(async()=>{
 vm.runInContext('scheduleParentPoll()',ctx);assert.equal([...timers.values()].at(-1).ms,3000);
 vm.runInContext("parentChannelStatus('subject','SUBSCRIBED');parentChannelStatus('global','SUBSCRIBED')",ctx);assert([...timers.values()].some(t=>t.ms===30000));
 ctx.document.hidden=true;vm.runInContext('scheduleParentPoll()',ctx);assert(![...timers.values()].some(t=>t.ms===30000||t.ms===3000));ctx.document.hidden=false;
 vm.runInContext("parentChannelStatus('global','CLOSED')",ctx);assert([...timers.values()].some(t=>t.ms===3000));
 const first=vm.runInContext('refreshParentView(true)',ctx);await vm.runInContext('refreshParentView(true)',ctx);assert.equal(calls,1);resolve(true);await first;assert.equal(vm.runInContext('parentRefreshPending',ctx),false);assert([...timers.values()].some(t=>t.ms===100));
 vm.runInContext('queueParentRefresh();queueParentRefresh();queueParentRefresh()',ctx);assert.equal([...timers.values()].filter(t=>t.ms===100).length,1);
 console.log('PASS sync: healthy/failing intervals, hidden polling, serialized refresh, trailing refresh, burst debounce');
 const manifest=JSON.parse(fs.readFileSync('parent-games-loader.js','utf8').match(/const manifest=(.*);/)[1]);
 for(const [name,urls]of Object.entries(manifest))for(const url of urls)assert(fs.existsSync(url.split('?')[0]),name+': '+url);
 let fail=true;const requested=[],opened=[];const win={toggleTools:()=>opened.push('tools')};
 const doc={querySelector:()=>null,createTextNode:text=>text,createElement:()=>({style:{},setAttribute(){},append(){},replaceChildren(){},remove(){}}),body:{append(){}},head:{querySelectorAll:()=>[],insertBefore(node){this.append(node)},append(node){const url=node.src||node.href;requested.push(url);queueMicrotask(()=>{
 if(fail&&url.startsWith('word-hunter-core')){fail=false;node.onerror();return;}
 for(const [name,urls]of Object.entries(manifest))if(url===urls.at(-1)&&name!=='toggleTools')win[name]=()=>opened.push(name);
 node.onload();});}}};
 vm.runInNewContext(fs.readFileSync('parent-games-loader.js','utf8'),{window:win,document:doc,Map,Error,Object});
 for(const name of Object.keys(manifest)){await win[name]();await win[name]();assert(opened.includes(name==='toggleTools'?'tools':name));}
 for(const url of new Set(requested))assert.equal(requested.filter(x=>x===url).length,url.startsWith('word-hunter-core')?2:1,url);
 console.log('PASS lazy loader: every entry, dependency existence/order, repeated opens deduplicated, failure retry');
})().catch(e=>{console.error(e);process.exitCode=1});
