// Real UI + real PostgreSQL functions, synthetic credentials/data, localhost only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {fixture}=require('./duty-db.test.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join((process.env.USERPROFILE||require("node:os").homedir()),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
async function run(options={}){
 const f=await fixture(),{db,rpc,write,today,add}=f;const root=path.resolve(__dirname,'..'),artifacts=path.join(process.env.TEMP||require('node:os').tmpdir(),'notik-duty-test-artifacts');fs.mkdirSync(artifacts,{recursive:true});
 await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[Array.from({length:10},(_,i)=>i===0?'=Örnek Uzun İsimli Öğrenci':'Örnek Öğrenci '+(i+1))]);
 await write('create',{className:'Sample A',label:'Örnek öğretim yılı',start:add(today,-20),end:add(today,200)});
 const id=f.state.year.id,pr={yearId:id,revision:f.state.year.revision,from:today,to:add(today,28),seed:'browser-seed-01'};
 const plan=(await rpc('preview',pr)).value;await write('apply_plan',{...pr,selectedDates:plan.days.map(d=>d.day),fingerprint:plan.fingerprint});await write('publish',{from:today,to:add(today,7)});
 const server=http.createServer(async(req,res)=>{
  try{
   if(req.url==='/rpc'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;const {name,payload}=JSON.parse(body);let data;
    if(name==='cl_duty_rpc')data=(await db.query('select cl_duty_rpc($1,$2,$3) r',[payload.p_token,payload.p_action,payload.p_payload])).rows[0].r;
    else if(name==='cl_duty_parent')data=(await db.query('select cl_duty_parent($1,$2) r',[payload.p_parent_token,payload.p_year_id])).rows[0].r;
    else throw Error('Unexpected RPC');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data}));return;
   }
   if(req.url.startsWith('/duty-test')){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NoTik · Örnek nöbet</title><body style="margin:0;background:#e9e4ef"><button id="open">Nöbeti aç</button><script type="module">import {openDuty} from '/duty-ui.mjs';const parent=new URLSearchParams(location.search).has('parent');const client={async rpc(name,payload){return fetch('/rpc',{method:'POST',body:JSON.stringify({name,payload})}).then(r=>r.json());}};document.querySelector('#open').onclick=()=>openDuty({client,token:()=>parent?'synthetic-parent':'synthetic-teacher-token',parent,className:'Sample A',launcher:document.querySelector('#open')});document.querySelector('#open').click();</script></body></html>`);return;}
   const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  }catch(e){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:{code:e.code||'P0001',message:e.message}}));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
 if(options.preview)return {server,db,base};
 if(process.env.DUTY_PREVIEW==='1'){console.log('Synthetic local preview: '+base+'/duty-test');await new Promise(()=>{});return;}
 try{
 browser=await chromium.launch({headless:true,channel:'chrome'});const context=await browser.newContext({acceptDownloads:true});const errors=[],external=[];
 await context.route('**/*',route=>{const u=route.request().url();if(!u.startsWith(base)&&!u.startsWith('blob:')){external.push(u);return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(base+'/duty-test');await page.locator('[data-action="excel"]').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-action="excel"]').disabled);
 const download=page.waitForEvent('download');await page.locator('[data-action="excel"]').click();const file=await download;assert(file.suggestedFilename().endsWith('.xlsx'));await file.saveAs(path.join(artifacts,'weekly.xlsx'));
 await page.locator('[data-tab="counts"]').click();await page.getByText('Haftanın günlerine dağılım',{exact:true}).waitFor();
 await page.locator('[data-tab="week"]').click();const resultButton=page.locator('[data-action="result"]').first();if(await resultButton.count()){
  await resultButton.click();await page.locator('[data-form="result"] [name="status"]').selectOption('completed');await page.locator('[data-form="result"] button').click();await page.waitForFunction(()=>!document.querySelector('.duty-preview'));assert((await db.query("select count(*)::int n from classlog_duty_assignments where status='completed'")).rows[0].n===1);
 }
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflow');
  assert(await page.locator('.duty-dialog').evaluate(n=>n.getBoundingClientRect().width<=innerWidth+1));
  for(const tab of ['week','counts','calendar','roster','settings','approvals']){await page.locator(`[data-tab="${tab}"]`).click();assert.equal(await page.locator('.duty-dialog').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,`dialog overflow ${width} ${tab}`);}
  await page.locator('[data-tab="week"]').click();if(width===390||width===1440)await page.screenshot({path:path.join(artifacts,'duty-'+width+'.png')});
 }
 await page.locator('[data-tab="calendar"]').click();await page.locator('[data-action="holidayToday"]').click();assert(await page.locator('.duty-preview').count());await page.locator('[data-action="cancelPreview"]').click();
 await page.locator('[data-tab="week"]').click();await page.locator('summary').filter({hasText:'Liste oluştur'}).click();await page.locator('[data-form="plan"] [name="from"]').fill(add(today,10));await page.locator('[data-form="plan"] [name="to"]').fill(add(today,20));await page.locator('[data-form="plan"] button').click();await page.locator('[data-action="apply"]').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-action="apply"]').disabled);await page.locator('[data-action="apply"]').click();await page.waitForFunction(()=>!document.querySelector('.duty-preview'));
 const before=(await db.query('select revision from classlog_duty_years where id=$1',[id])).rows[0].revision;await page.evaluate(()=>window.dispatchEvent(new Event('offline')));assert((await page.locator('.duty-freshness').textContent()).includes('Çevrimdışı'));assert.equal((await db.query('select revision from classlog_duty_years where id=$1',[id])).rows[0].revision,before);
 await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(()=>!document.querySelector('.duty-freshness').textContent.includes('Çevrimdışı'));
 const parent=await context.newPage();parent.on('pageerror',e=>errors.push(e.message));await parent.goto(base+'/duty-test?parent=1');await parent.locator('[data-tab="counts"]').waitFor();assert.equal(await parent.locator('[data-action="excel"]').count(),0);assert.equal(await parent.locator('form').count(),0);assert.equal(await parent.locator('.duty-draft').count(),0);assert.equal(await parent.locator('[data-action="result"]').count(),0);
 await parent.locator('[data-tab="counts"]').click();assert.equal(await parent.locator('tbody tr').count(),10);
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS browser: real SQL through UI, weekly XLSX, confirmation, preview/apply, 320–1440px, all tabs, parent isolation, offline, keyboard close');console.log('Artifacts: '+artifacts);
 }finally{await browser?.close();await new Promise(r=>server.close(r));await db.close();}

}
module.exports={run};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
