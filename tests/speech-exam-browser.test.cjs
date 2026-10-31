const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes)});
});
(async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({acceptDownloads:true,hasTouch:true});
const external=[],errors=[];await context.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(base)&&!url.startsWith('blob:')){external.push(url);return route.abort()}return route.continue()});
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
const page=await context.newPage();await page.goto(base+'/tests/speech-exam-demo.html');await page.getByRole('button',{name:'Sınavı Başlat',exact:true}).click();
await page.locator('[data-student-id="sample-0"]').click();
await page.getByRole('button',{name:'1. ölçüt: 8 puan',exact:true}).click();await page.getByRole('button',{name:'1. ölçüt: 9 puan',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.');
assert.equal(await page.getByRole('button',{name:'1. ölçüt: 9 puan',exact:true}).getAttribute('aria-pressed'),'true');
await page.locator('[data-student-id="sample-1"]').click();assert.match(await page.locator('.se-form output').innerText(),/0 · 0\/10/);
await page.locator('[data-student-id="sample-0"]').click();assert.match(await page.locator('.se-form output').innerText(),/9 · 1\/10/);
await page.evaluate(()=>window.demoExamApi.failNextSave());await page.getByRole('button',{name:'2. ölçüt: 6 puan',exact:true}).click();
await page.getByRole('button',{name:'Kaydı yeniden dene'}).waitFor({state:'visible'});await page.getByRole('button',{name:'Kaydı yeniden dene'}).click();await page.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.');
await page.reload();await page.locator('[data-student-id="sample-0"]').waitFor();assert.match(await page.locator('.se-form output').innerText(),/15 · 2\/10/);
// Keyboard scoring: focused option must not disappear on an optimistic update.
await page.getByRole('button',{name:'3. ölçüt: 5 puan',exact:true}).focus();await page.keyboard.press('Space');
await page.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.');
assert.equal(await page.getByRole('button',{name:'3. ölçüt: 5 puan',exact:true}).getAttribute('aria-pressed'),'true');
const board=await context.newPage();await board.goto(base+'/tests/speech-exam-demo.html?board=1');await board.locator('.se-board h2').waitFor({state:'attached'});
assert.equal(await board.locator('.se-drawer-tab').getAttribute('aria-expanded'),'false');
assert.equal(await board.locator('.se-board').evaluate(n=>n.inert),true);
await board.getByRole('button',{name:'Değerlendirmeyi aç',exact:true}).click();await board.locator('.se-board h2').waitFor();
assert.equal(await board.locator('.se-board').getAttribute('data-live'),'true');
assert.equal(await board.locator('.se-board h2').innerText(),'Örnek Öğrenci A');
await page.getByRole('button',{name:'4. ölçüt: 7 puan',exact:true}).click();
await board.waitForFunction(()=>document.querySelector('.se-board output')?.textContent.includes('27 · 4/10'));
assert.equal(await board.locator('.se-board-rubric li.se-update-pop').count(),1);
assert.equal(await board.locator('.se-live-label').innerText(),'Değerlendirme');
await board.evaluate(()=>window.dispatchEvent(new Event('offline')));assert.equal(await board.locator('.se-board h2').count(),0);
assert.equal(await board.locator('.se-board').getAttribute('data-live'),'false');
await board.evaluate(()=>window.dispatchEvent(new Event('online')));await board.waitForFunction(()=>document.querySelector('.se-board output')?.textContent.includes('27 · 4/10'));
// Same-origin synthetic notifications contain no scores; the board reads its store.
for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['small-portrait',320,568],['landscape',844,390],['small-landscape',667,375],['smartboard',1920,1080]]){
 for(const target of [page,board]) {
  await target.setViewportSize({width,height});
  const overflow=await target.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,name);
 }
 assert.equal(await page.locator('.se-scores button').first().evaluate(n=>n.getBoundingClientRect().height>=42),true);
 await board.waitForTimeout(320);
 assert.equal(await board.locator('.se-board').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}),true,name);
 assert.equal(await board.locator('.se-board').evaluate(n=>n.getBoundingClientRect().top>document.querySelector('#speechDialog>.speech-close').getBoundingClientRect().bottom),true,'timer close clearance '+name);
 assert.equal(await board.locator('.se-board output').evaluate(n=>getComputedStyle(n).textAlign==='center'&&n.getBoundingClientRect().height>=68),true,'centered total '+name);
 await board.locator('.se-board output').scrollIntoViewIfNeeded();
 assert.equal(await board.locator('.se-board output').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),true,'total reachable '+name);
 await board.locator('.se-board-content').evaluate(n=>n.scrollTop=0);
 assert.equal(await board.locator('#speechDialog').evaluate(n=>getComputedStyle(n).backgroundImage.includes('timer.jpg')),true);
 if(width<=900){
   assert.equal(await page.locator('.se-roster').isVisible(),false);
   assert.equal(await page.locator('.se-mobile-picker').evaluate(n=>n.getBoundingClientRect().height<95),true);
   assert.equal(await page.locator('.se-mobile-picker option').count(),36);
 }
 if(['desktop','portrait','landscape','smartboard'].includes(name)) await board.screenshot({path:path.join(artifacts,'speech-board-'+name+'.png'),fullPage:true});
 if(name==='portrait') await page.screenshot({path:path.join(artifacts,'speech-admin-portrait.png'),fullPage:true});
}
// Toggle the same desktop student off; successful completion also clears the board,
// without finishing the exam or losing scores. Mobile supports the empty picker option.
await page.locator('[data-student-id="sample-0"]').click();
await board.waitForFunction(()=>document.querySelector('.se-board h2')?.textContent==='Öğrenci seçimi bekleniyor');
await page.locator('[data-student-id="sample-1"]').click();
for(let i=1;i<=10;i++) await page.getByRole('button',{name:i+'. ölçüt: 8 puan',exact:true}).click();
await page.waitForFunction(()=>window.demoExamUI.exam.activeStudentId===null);
await board.waitForFunction(()=>document.querySelector('.se-board h2')?.textContent==='Öğrenci seçimi bekleniyor');
assert.equal(await page.evaluate(()=>window.demoExamUI.exam.status),'active');
assert.equal(await page.evaluate(()=>window.demoExamUI.exam.results['sample-1'].scores.reduce((a,b)=>a+b,0)),80);
await page.locator('[data-student-id="sample-0"]').click();
const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Excel İndir',exact:true}).click();const download=await downloadEvent;assert(download.suggestedFilename().endsWith('.xlsx'));await download.saveAs(path.join(artifacts,'speech-browser-sample.xlsx'));
// Preview now reuses the actual timer markup/functions, including its background.
const timer=board;await timer.evaluate(()=>window.toggleSpeechTimer());
await timer.waitForFunction(()=>document.getElementById('speechTime').textContent!=='00:00');const elapsedBefore=await timer.locator('#speechTime').innerText();
await page.getByRole('button',{name:'5. ölçüt: 8 puan',exact:true}).click();
await timer.waitForFunction(()=>document.querySelector('.se-board output')?.textContent.includes('35 · 5/10'));
assert((await timer.locator('#speechTime').innerText())>=elapsedBefore);assert.equal(await timer.locator('#speechToggle').getAttribute('data-running'),'true');
for(const [width,height] of [[390,844],[844,390],[1440,900]]){
 await timer.setViewportSize({width,height});assert.equal(await timer.locator('#speechDialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
}
await timer.evaluate(()=>{window.stopSpeechTimer();window.resetSpeechTimer()});assert.equal(await timer.locator('#speechTime').innerText(),'00:00');
await timer.keyboard.press('Escape');assert.equal(await timer.locator('#speechDialog').evaluate(n=>n.open),true);assert.equal(await timer.locator('.se-drawer-tab').getAttribute('aria-expanded'),'false');
await timer.getByRole('button',{name:'Değerlendirmeyi aç',exact:true}).click();
await timer.locator('.se-drawer-close').tap();assert.equal(await timer.locator('.se-drawer-tab').getAttribute('aria-expanded'),'false');
await timer.locator('.se-drawer-tab').focus();await timer.keyboard.press('Enter');assert.equal(await timer.locator('.se-drawer-tab').getAttribute('aria-expanded'),'true');
await page.setViewportSize({width:390,height:844});await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('sample-34');
await page.waitForFunction(()=>document.querySelector('.se-form h3')?.textContent==='Örnek Öğrenci 35');
await page.getByRole('button',{name:'Önceki öğrenci',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.se-form h3')?.textContent==='Örnek Öğrenci 34');
await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('sample-0');
await page.waitForFunction(()=>document.querySelector('.se-form h3')?.textContent==='Örnek Öğrenci A');
await page.getByRole('button',{name:'Seçimi kaldır',exact:true}).click();await page.waitForFunction(()=>window.demoExamUI.exam.activeStudentId===null);
await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('sample-0');await page.waitForFunction(()=>window.demoExamUI.exam.activeStudentId==='sample-0');
await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('');await page.waitForFunction(()=>window.demoExamUI.exam.activeStudentId===null);
await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('sample-0');await page.waitForFunction(()=>window.demoExamUI.exam.activeStudentId==='sample-0');
page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Sınavı Bitir',exact:true}).click();await board.getByText('Sınav tamamlandı.').waitFor();
await page.reload();await page.getByLabel('Kayıtlı sınavlar',{exact:true}).selectOption({index:1});await page.getByLabel('Değerlendirilecek öğrenci',{exact:true}).selectOption('sample-0');
assert.match(await page.locator('.se-form output').innerText(),/35 · 5\/10/);assert.equal(await page.locator('.se-scores button').first().isDisabled(),true);
assert(!external.some(url=>url.includes('supabase')));assert.deepEqual(errors,[]);
// Production entry stays inert even without authentication globals.
const gate=await context.newPage();await gate.goto(base+'/tests/speech-exam-demo.html');await gate.setContent('<button id="speechExamOpen">Sınav</button><p id="speechExamAvailability"></p>');await gate.addScriptTag({path:path.join(root,'speech-exam-entry.js')});assert(await gate.locator('button').isDisabled());
await browser.close();server.close();console.log('PASS browser: six viewports, touch/keyboard, retry/reload, student switch, two-page live fixture, XLSX download, actual timer preservation, finish/history, closed production entry; zero Supabase requests');
})().catch(error=>{console.error(error);server.close();process.exit(1)});
