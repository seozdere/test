const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const handlers={},stores=new Map();const key=r=>typeof r==='string'?r:r.url;
const open=async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {keys:async()=>[...store.keys()],match:async r=>store.get(key(r)),put:async(r,v)=>store.set(key(r),v),add:async()=>{}}};
let network=0;
const context={URL,Response,console,fetch:async()=>{network++;throw Error('offline')},caches:{open,keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k),match:async r=>{for(const s of stores.values())if(s.has(key(r)))return s.get(key(r));}},self:{registration:{scope:'https://test.local/'},location:{href:'https://test.local/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim(){}},skipWaiting(){}}};
(async()=>{
 const old=await open('classlog-v530');const url='https://test.local/word-hunter.js?v=2';await old.put(url,new Response('cached-game'));
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
 let work;handlers.activate({waitUntil:p=>work=p});await work;
 assert(!stores.has('classlog-v530'));
 let response;handlers.fetch({request:{url,mode:'cors',destination:'script'},respondWith:p=>response=p});assert.equal(await (await response).text(),'cached-game');assert.equal(network,0);
 console.log('PASS service worker: prior game cache migrated; offline game served without network');
})().catch(e=>{console.error(e);process.exitCode=1});
