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
    res.setHeader('Content-Type','text/html'); res.end(html); return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err,bytes) => { if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes); });
});
let browser;
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless:true,channel:'chrome'});
  const context = await browser.newContext({hasTouch:true});
  const errors = [], external = [];
  await context.route('**/*',route => {
    const url=route.request().url();
    if(!url.startsWith(base)&&!url.startsWith('blob:')){external.push(url);return route.abort();}
    return route.continue();
  });
  context.on('page',p => p.on('pageerror',e => errors.push(e.message)));
  const admin = await context.newPage();
  await admin.goto(base+'/tests/speech-exam-demo.html');
  await admin.getByRole('button',{name:'Sınavı Başlat',exact:true}).click();
  await admin.locator('[data-student-id="sample-0"]').click();
  await admin.getByRole('button',{name:'1. ölçüt: 8 puan',exact:true}).click();
  await admin.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.');
  const board = await context.newPage();
  await board.goto(base+'/tests/speech-exam-demo.html?board=1');
  await board.locator('.se-board-student').waitFor({state:'attached'});
  for (const [name,width,height] of [['desktop',1440,900],['portrait',390,844],['large-portrait',440,956],['small-portrait',320,568],['landscape',844,390],['small-landscape',667,375],['smartboard',1920,1080]]) {
    await board.setViewportSize({width,height}); await board.waitForTimeout(400);
    const closed = await board.locator('.speech-time-row').boundingBox();
    await board.locator('.se-drawer-tab').tap(); await board.waitForTimeout(400);
    const panel = await board.locator('.se-board').boundingBox(), timer = await board.locator('.speech-time-row').boundingBox();
    assert(panel.x>=0 && panel.x+panel.width<=width+1 && panel.y>=0 && panel.y+panel.height<=height+1,name+' panel bounds');
    assert.equal(await board.locator('#speechDialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,name+' overflow');
    assert.equal(await board.locator('.se-board-rubric li').count(),10);
    assert.equal(await board.locator('.se-board .se-total').innerText(),'Puan: 8');
    assert.equal(await board.locator('.se-criterion-count').innerText(),'1/10 ölçüt');
    const footer=await board.locator('.se-board-footer').boundingBox();
    assert(footer.y>=panel.y && footer.y+footer.height<=panel.y+panel.height,name+' visible total');
    const points=await board.locator('.se-board .se-total').boundingBox();
    assert(Math.abs(points.x+points.width/2-footer.x-footer.width/2)<1,name+' centered points');
    assert.equal(await board.locator('.se-board-rubric').evaluate(n=>getComputedStyle(n).overflowX==='hidden'),true,name+' no horizontal scroll bar');
    assert.equal(await board.locator('.se-board-student .se-update-pop').count(),0);
    if(width<=640 && height>width){
      assert(Math.abs(panel.height-height/2)<2,name+' half-height');
      assert(timer.y+timer.height<panel.y,name+' timer above sheet');
      assert(timer.y<closed.y,name+' timer moved up');
      const controls=await board.locator('.speech-icon-actions').boundingBox();
      assert(controls.y+controls.height<=panel.y-40,name+' timer controls reachable');
      const timerClose=await board.locator('.speech-close').boundingBox(), title=await board.locator('#speechTitle').boundingBox();
      assert(title.y>=timerClose.y+timerClose.height,name+' title clears close');
      assert.equal(await board.locator('.se-board-rubric').evaluate(n=>{const right=n.getBoundingClientRect().right;return [...n.querySelectorAll('strong')].every(s=>s.getBoundingClientRect().right<=right-12);}),true,name+' scrollbar score clearance');
    } else {
      assert.equal(await board.locator('.se-board-rubric').evaluate(n=>getComputedStyle(n).scrollbarWidth),'none',name+' hidden scrollbar');
    }
    await board.locator('.se-board-rubric').evaluate(n=>n.scrollTop=n.scrollHeight);
    assert.equal(await board.locator('.se-board-rubric li').last().evaluate(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return r.bottom<=p.bottom+1;}),true,name+' last criterion reachable');
    await board.locator('.se-board-rubric').evaluate(n=>n.scrollTop=0);
    await board.screenshot({path:path.join(artifacts,'speech-layout-'+name+'.png')});
    await board.locator('.se-drawer-close').tap(); await board.waitForTimeout(400);
    const restored=await board.locator('.speech-time-row').boundingBox();
    assert(Math.abs(restored.y-closed.y)<2,name+' restored timer');
  }
  await board.setViewportSize({width:390,height:844});
  await board.locator('.se-drawer-tab').focus();await board.keyboard.press('Enter');
  await board.waitForTimeout(350);
  await board.locator('#speechToggle').tap();
  await board.waitForFunction(()=>document.querySelector('#speechTime').textContent!=='00:00');
  await board.keyboard.press('Escape');
  assert.equal(await board.locator('#speechDialog').evaluate(n=>n.open),true);
  assert.equal(await board.locator('.se-drawer-tab').getAttribute('aria-expanded'),'false');
  await board.waitForTimeout(350);await board.locator('.se-drawer-tab').tap();
  await board.waitForTimeout(350);
  await board.locator('.se-board-rubric').evaluate(n=>{n.scrollTop=n.scrollHeight;n.focus();});
  const previousScroll=await board.locator('.se-board-rubric').evaluate(n=>n.scrollTop);
  await admin.getByRole('button',{name:'2. ölçüt: 6 puan',exact:true}).click();
  await board.waitForFunction(()=>document.querySelector('.se-board .se-total').textContent==='Puan: 14');
  assert.equal(await board.locator('.se-board-rubric li.se-update-pop').count(),0);
  assert.equal(await board.locator('.se-board-rubric .se-score-value.se-update-pop').count(),1);
  assert.equal(await board.locator('.se-board-rubric').evaluate(n=>n.scrollTop),previousScroll);
  assert.equal(await board.locator('.se-board-rubric').evaluate(n=>document.activeElement===n),true);
  assert.equal(await board.locator('#speechToggle').getAttribute('data-running'),'true');
  const toneColors=[];
  for(const [score,tone] of [[7,'high'],[5,'middle'],[4,'low']]){
    await admin.getByRole('button',{name:`2. ölçüt: ${score} puan`,exact:true}).click();
    await board.waitForFunction(expected=>document.querySelectorAll('.se-score-value')[1]?.textContent===String(expected),score);
    const value=board.locator('.se-score-value').nth(1);
    assert.equal(await value.getAttribute('data-tone'),tone);
    assert.equal(await value.evaluate(n=>getComputedStyle(n).animationName),'se-score-pop');
    assert.equal(await board.locator('.se-board-rubric strong').nth(1).evaluate(n=>getComputedStyle(n).animationName),'none');
    assert.equal(await board.locator('.se-board-student .se-update-pop').count(),0);
    toneColors.push(await value.evaluate(n=>getComputedStyle(n).getPropertyValue('--se-score-ink').trim()));
    await board.locator('.se-board-rubric').evaluate(n=>n.scrollTop=0);
    await board.screenshot({path:path.join(artifacts,`speech-score-${tone}.png`)});
  }
  assert.equal(new Set(toneColors).size,3,'three distinct score feedback colors');
  await board.evaluate(()=>window.stopSpeechTimer());
  // Last saved score remains visible for ten seconds, then presentation clears.
  for(let i=1;i<=10;i++){
    const choice=admin.getByRole('button',{name:`${i}. ölçüt: 8 puan`,exact:true});
    if(await choice.getAttribute('aria-pressed')!=='true')await choice.click();
  }
  await admin.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.'&&window.demoExamUI.exam.results['sample-0'].scores.every(s=>s===8));
  await board.waitForFunction(()=>document.querySelector('.se-board .se-total').textContent==='Puan: 80');
  assert.equal(await board.locator('.se-score-value').last().innerText(),'8');
  await board.waitForTimeout(8500);
  assert.equal(await board.locator('.se-board-student').innerText(),'Örnek Öğrenci A');
  await board.waitForFunction(()=>document.querySelector('.se-board-student').textContent==='Öğrenci seçimi bekleniyor...',null,{timeout:4000});
  await admin.waitForFunction(()=>window.demoExamUI.exam.activeStudentId===null);
  assert.equal(await board.locator('.se-waiting-dots>span').count(),3);
  for(const [time,expected] of [[100,['1','0','0']],[400,['1','1','0']],[700,['1','1','1']],[1000,['0','0','0']]]){
    const opacity=await board.locator('.se-waiting-dots').evaluate((node,t)=>{
      for(const a of node.getAnimations({subtree:true})){a.pause();a.currentTime=t;}
      return [...node.children].map(n=>getComputedStyle(n).opacity);
    },time);
    assert.deepEqual(opacity,expected,'sequential waiting dots');
  }
  // A completed student's pending expiry must never dismiss a new selection.
  await admin.locator('[data-student-id="sample-1"]').click();
  for(let i=1;i<=10;i++)await admin.getByRole('button',{name:`${i}. ölçüt: 7 puan`,exact:true}).click();
  await admin.waitForFunction(()=>document.querySelector('.se-status').textContent==='Kaydedildi.'&&window.demoExamUI.exam.selectionExpiresAt);
  await admin.locator('[data-student-id="sample-2"]').click();
  await board.waitForFunction(()=>document.querySelector('.se-board-student').textContent==='Uzun Adlı Örnek Öğrenci C');
  await board.waitForTimeout(10100);
  assert.equal(await board.locator('.se-board-student').innerText(),'Uzun Adlı Örnek Öğrenci C');
  assert.equal(await admin.evaluate(()=>window.demoExamUI.exam.activeStudentId),'sample-2');
  // The actual admin structure is loaded without any auth, database or app scripts.
  const menu=await context.newPage();await menu.goto(base+'/admin-fixture.html');
  await menu.evaluate(()=>window.homeworkRecordedDates=()=>[]);
  await menu.addScriptTag({path:path.join(root,'admin-layout.js')});
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
    await menu.setViewportSize({width,height});
    await menu.evaluate(()=>{document.querySelector('#adminMenuSheet').showModal();document.querySelectorAll('#adminMenuSheet .admin-only').forEach(n=>n.style.display='block');});
    assert.equal(await menu.locator('#adminMenuSheet>.menu-body>#speechExamAdmin').count(),1);
    assert.equal(await menu.locator('#speechAdmin #speechExamOpen').count(),0);
    await menu.locator('#speechExamAdmin>summary').click();
    await menu.locator('#speechExamOpen').waitFor({state:'visible'});
    const box=await menu.locator('#adminMenuSheet').boundingBox();assert(Math.abs(box.x+box.width/2-width/2)<2,'centered menu');
    await menu.screenshot({path:path.join(artifacts,`speech-menu-${width}.png`)});
    await menu.evaluate(()=>{document.querySelector('#speechExamAdmin').open=false;document.querySelector('#adminMenuSheet').close();});
  }
  // Unapproved device: no warning card until the user requests a code.
  const setup=await context.newPage();await setup.goto(base+'/admin-fixture.html');
  await setup.evaluate(async()=>{
    document.body.innerHTML='';
    const html=await (await fetch('/parent.html')).text();
    const timer=new DOMParser().parseFromString(html,'text/html').getElementById('speechDialog');
    for(const n of timer.querySelectorAll('[onclick]'))n.removeAttribute('onclick');
    document.body.append(timer);timer.showModal();
    for(const href of ['/game-presentation.css','/speech-exam.css']){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.append(l);}
    const {installAutomaticBoard}=await import('/speech-exam-device.mjs');
    const memory=new Map();window.setupCalls=[];
    window.disposeSetup=installAutomaticBoard(timer,{async call(action){window.setupCalls.push(action);return action==='read'?{status:'pending',code:'TEST1234',expiresAt:Date.now()+600000}:{};},subscribe(){return ()=>{};}},{parentToken:()=> 'synthetic-parent',loadStyles:async()=>{},mountBoard:()=>()=>{},storage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}});
  });
  await setup.setViewportSize({width:390,height:844});
  await setup.locator('.se-device-identify').waitFor();
  assert.equal(await setup.locator('.se-device-setup p').isVisible(),false);
  assert.equal(await setup.locator('.se-device-identify svg').count(),1);
  await setup.screenshot({path:path.join(artifacts,'speech-device-idle.png')});
  await setup.locator('.se-device-identify').tap();
  await setup.getByText('TEST1234',{exact:true}).waitFor();
  assert.deepEqual(await setup.evaluate(()=>window.setupCalls),['request','read']);
  await setup.evaluate(()=>window.disposeSetup());
  assert(!external.some(u=>u.includes('supabase')),'no Supabase requests');
  assert.deepEqual(errors,[]);
  console.log('PASS: seven viewports, bottom sheet/restoration, timer continuity, keyboard/touch, rubric scroll and footer, separate admin accordion, SVG device code request; synthetic data only.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
