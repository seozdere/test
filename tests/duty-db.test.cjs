// Synthetic in-memory PostgreSQL only. Never connects to Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pkg=process.env.PGLITE_PATH||path.join(process.env.TEMP,'notik-exam-test-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=require(pkg),{pgcrypto}=require(path.join(pkg,'dist/contrib/pgcrypto.cjs'));
const sql=name=>fs.readFileSync(path.join(__dirname,'../sql/duty-release',name),'utf8');
async function fixture(){
 const db=new PGlite({extensions:{pgcrypto}});
 await db.exec(fs.readFileSync(path.join(__dirname,'speech-exam-fixture.sql'),'utf8'));
 await db.exec(`CREATE TABLE classlog_parent_links(class_name text primary key,token text,active boolean); INSERT INTO classlog_parent_links VALUES('Sample A','synthetic-parent',true),('Sample B','other-parent',true);`);
 await db.exec(sql('00_preflight.READONLY.sql'));await db.exec(sql('01_install.sql'));await db.exec(sql('01_install.sql'));await db.exec(sql('02_enable.sql'));
 const today=(await db.query("select cl_duty_today()::text as day")).rows[0].day;
 const add=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 let state;
 const rpc=async(action,payload={},token='synthetic-teacher-token')=>(await db.query('select cl_duty_rpc($1,$2,$3) as r',[token,action,payload])).rows[0].r;
 const write=async(action,payload={})=>{const r=await rpc(action,{yearId:state?.year.id,revision:state?.year.revision,operationId:crypto.randomUUID(),...payload});assert.equal(r.ok,true,JSON.stringify(r));if(r.value)state=r.value;return r;};
 return {db,today,add,rpc,write,get state(){return state}};
}
module.exports={fixture,sql};
if(require.main===module)(async()=>{
 const f=await fixture();const {db,today,add,rpc,write}=f;
 for(const token of ['synthetic-parent','synthetic-kiosk-token','synthetic-expired-token'])assert.equal((await rpc('list',{className:'Sample A'},token)).ok,false);
 assert.equal((await rpc('list',{className:'Sample B'})).ok,false);
 await write('create',{className:'Sample A',label:'Örnek yıl',start:add(today,-40),end:add(today,200)});
 const id=f.state.year.id;
 await assert.rejects(write('create',{className:'Sample A',label:'Çakışma',start:today,end:add(today,10)}));
 const preview=(await rpc('preview',{yearId:id,revision:f.state.year.revision,from:today,to:add(today,20),seed:'synthetic-seed-001'})).value;
 assert(preview.days.length>5);assert(preview.days.every(d=>new Set(d.slots.map(a=>a.student_id)).size===d.slots.length));
 await write('apply_plan',{from:today,to:add(today,20),seed:preview.seed,fingerprint:preview.fingerprint,selectedDates:preview.days.map(d=>d.day)});
 assert(Object.values(f.state.counts).every(n=>n===0));
 await write('publish',{from:today,to:add(today,6)});
 const published=JSON.stringify(f.state.assignments.filter(a=>f.state.days.some(d=>d.id===a.day_id&&d.publication==='published')));
 const newplan=(await rpc('preview',{yearId:id,revision:f.state.year.revision,from:today,to:add(today,20),seed:'synthetic-seed-002'})).value;
 await write('apply_plan',{from:today,to:add(today,20),seed:newplan.seed,fingerprint:newplan.fingerprint,selectedDates:newplan.days.map(d=>d.day)});
 assert.equal(JSON.stringify(f.state.assignments.filter(a=>f.state.days.some(d=>d.id===a.day_id&&d.publication==='published'))),published);
 const parent=(await db.query('select cl_duty_parent($1,$2) as r',['synthetic-parent',id])).rows[0].r.value;
 assert(parent.days.every(d=>d.publication!=='draft'));assert.deepEqual(parent.exemptions,[]);assert(parent.assignments.every(a=>!Object.hasOwn(a,'confirmed_by')));
 assert.equal((await db.query('select cl_duty_parent($1,$2) as r',['other-parent',id])).rows[0].r.value,null);
 const target=f.state.days.find(d=>d.day>=today&&d.kind==='school'&&d.publication==='published');
 await write('calendar',{from:target.day,to:target.day,kind:'half_day',reason:'Örnek yarım gün'});
 assert(f.state.assignments.filter(a=>a.day_id===target.id&&a.is_current).every(a=>a.status==='cancelled'));
 await write('calendar',{from:target.day,to:target.day,kind:'school',reason:'Tatil kaldırıldı'});
 assert(f.state.assignments.filter(a=>a.day_id===target.id&&a.is_current).every(a=>a.status==='cancelled'));
 await db.exec('SET ROLE anon');await assert.rejects(db.query('select * from classlog_duty_assignments'));await assert.rejects(db.query('select cl_duty_snapshot($1)',[id]));await db.exec('RESET ROLE');
 await db.exec(sql('90_disable_keep_data.sql'));assert.equal((await rpc('get',{yearId:id})).reason,'disabled');await db.exec(sql('02_enable.sql'));assert.equal((await rpc('get',{yearId:id})).value.year.id,id);
 await db.close();console.log('PASS duty DB: migrations/reinstall, rights, draft/publication, holiday/unholiday, access, disable preserves data');
})().catch(e=>{console.error(e);process.exitCode=1});
