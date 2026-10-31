// Real entry/import chain, without data.js, auth initialization or Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const admin=source('admin.html'),entry=admin.match(/src="(speech-exam-entry\.js[^\"]*)"/)[1];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/loader-fixture.html'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<button id="speechExamOpen" disabled>Sınav yönetimini aç</button><p id="speechExamAvailability">Sınav ekranı yükleniyor…</p><script src="${entry}"></script>`);return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',/\.(mjs|js)$/.test(file)?'text/javascript':'text/plain');res.end(data);});
});
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const scenario of ['current','old-core','missing-device','client-disabled']){
  const context=await browser.newContext(),page=await context.newPage(),errors=[],requests=[],logs=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')logs.push(message.text());});
  await context.route('**/*',route=>{
   const url=route.request().url();requests.push(url);
   if(!url.startsWith(base))return route.abort();
   if(scenario==='old-core'&&url.includes('/speech-exam-core.mjs')){
    const body=source('speech-exam-core.mjs').replace(/export function selectionRemainingMs\(value\) \{[\s\S]*?\r?\n\}/,'');
    assert(!body.includes('export function selectionRemainingMs'));
    return route.fulfill({contentType:'text/javascript',body});
   }
   if(scenario==='missing-device'&&url.includes('/speech-exam-device.mjs'))return route.fulfill({status:404,body:'missing'});
   if(scenario==='client-disabled'&&url.includes('/speech-exam-api.mjs'))return route.fulfill({contentType:'text/javascript',body:source('speech-exam-api.mjs').replace('LIVE_ENABLED = true','LIVE_ENABLED = false')});
   return route.continue();
  });
  await page.goto(base+'/loader-fixture.html');
   if(scenario==='current'||scenario==='old-core'){
   try{await page.waitForFunction(()=>!document.getElementById('speechExamOpen').disabled,null,{timeout:5000});}
   catch(error){console.log({scenario,status:await page.locator('#speechExamAvailability').textContent(),errors,logs,requests});throw error;}
   assert.equal(await page.locator('#speechExamAvailability').textContent(),'');
  }else{
   const expected=scenario==='client-disabled'?'Canlı sınav bu uygulama sürümünde kapalı.':'Sınav dosyaları yüklenemedi.';
    try{await page.waitForFunction(prefix=>document.getElementById('speechExamAvailability').textContent.startsWith(prefix),expected,{timeout:5000});}
    catch(error){console.log({scenario,status:await page.locator('#speechExamAvailability').textContent(),errors,logs,requests});throw error;}
   assert.equal(await page.locator('#speechExamOpen').isDisabled(),true);
  }
  assert.deepEqual(errors,[],scenario+' no unhandled errors');
  assert(!requests.some(url=>url.includes('supabase')),scenario+' no DB requests');
  await context.close();
 }
 console.log('PASS actual module loader: current and prior core both open; missing dependency and disabled client have distinct safe states; no Supabase requests.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
