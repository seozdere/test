// Local fixtures only. Never loads the app's data.js or connects to Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..'), artifacts = path.join(__dirname, 'artifacts');
fs.mkdirSync(artifacts, {recursive: true});
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const server = http.createServer((req,res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/admin-fixture.html') {
    const html = fs.readFileSync(path.join(root,'admin.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    res.setHeader('Content-Type','text/html; charset=utf-8'); res.end(html); return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err,bytes) => { if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes); });
});
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({hasTouch:true});
 await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/tests/speech-exam-demo.html');
 await page.getByRole('button',{name:'Sınavı Başlat',exact:true}).click();
 await page.locator('[data-student-id="sample-0"]').click();
 const five=page.getByRole('button',{name:'1. ölçüt: 5 puan',exact:true});
 const seven=page.getByRole('button',{name:'1. ölçüt: 7 puan',exact:true});
 const saved=()=>page.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.');
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  await page.setViewportSize({width,height});
  await five.tap();await saved();assert.equal(await five.getAttribute('aria-pressed'),'true');
  await five.tap();await saved();assert.equal(await five.getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>window.demoExamUI.exam.results['sample-0'].scores[0]),null);
  await five.tap();await seven.tap();await saved();
  assert.equal(await seven.getAttribute('aria-pressed'),'true');assert.equal(await five.getAttribute('aria-pressed'),'false');
  await seven.focus();await page.keyboard.press('Space');await saved();
  assert.equal(await seven.getAttribute('aria-pressed'),'false');
 }
 // Coalesced double-tap, persistence and other criteria remain correct.
 await page.getByRole('button',{name:'2. ölçüt: 8 puan',exact:true}).click();await saved();
 await five.evaluate(n=>{n.click();n.click();});await saved();
 await page.reload();await five.waitFor();
 assert.deepEqual(await page.evaluate(()=>window.demoExamUI.exam.results['sample-0'].scores.slice(0,3)),[null,8,null]);
 // Retry preserves null instead of resurrecting the old score.
 await five.click();await saved();
 await page.evaluate(()=>window.demoExamApi.failNextSave());await five.click();
 await page.getByRole('button',{name:'Kaydı yeniden dene',exact:true}).click();await saved();
 assert.equal(await page.evaluate(()=>window.demoExamUI.exam.results['sample-0'].scores[0]),null);
 const menu=await context.newPage();menu.on('pageerror',e=>errors.push(e.message));
 await menu.goto(base+'/admin-fixture.html');await menu.evaluate(()=>window.homeworkRecordedDates=()=>[]);
 await menu.addScriptTag({path:path.join(root,'admin-layout.js')});
 await menu.evaluate(()=>{document.querySelector('#adminMenuSheet').showModal();document.querySelectorAll('#adminMenuSheet .admin-only').forEach(n=>n.style.display='block');document.querySelector('#adminManagementPanel').open=true;});
 for(const [width,height] of [[1440,900],[390,844],[844,390]]){
  await menu.setViewportSize({width,height});
  const arrows=await menu.locator('.menu-category-summary').evaluateAll(nodes=>nodes.map(n=>{
   const r=n.getBoundingClientRect(),svg=n.querySelector('svg').getBoundingClientRect(),s=getComputedStyle(n);
   return {rightGap:r.right-svg.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth),center:Math.abs(r.y+r.height/2-svg.y-svg.height/2)};
  }));
  assert.equal(arrows.length,2);
  for(const arrow of arrows){assert(Math.abs(arrow.rightGap)<1);assert(arrow.center<1);}
  await menu.screenshot({path:path.join(artifacts,`menu-arrow-${width}.png`)});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: tap/keyboard toggle, different score, rapid double tap, persisted null, retry, other criteria preserved; menu arrows right-aligned on desktop/portrait/landscape.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
