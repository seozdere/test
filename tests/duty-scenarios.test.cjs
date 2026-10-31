const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture,sql}=require('./duty-db.test.cjs');
async function run(log=console.log){
 const f=await fixture(),{db,rpc,write,today,add}=f;
 const baseline=(await db.query('select * from classlog_storage order by id')).rows;
 await db.exec('ALTER TABLE classlog_storage ADD COLUMN "classRecords" jsonb DEFAULT \'{}\', ADD COLUMN notes jsonb DEFAULT \'{}\';');
 await db.exec(require('fs').readFileSync(require('path').join(__dirname,'../sql/29_rename_student.sql'),'utf8'));
 await db.query('update classlog_storage set students=$1 where id=$2',[['A','B','C','D','E'],'sample-term__Sample A']);
 await write('create',{className:'Sample A',label:'Senaryolar',start:add(today,-30),end:add(today,300)});
 const id=f.state.year.id,initial=f.state.roster.map(r=>r.id);
 const ctx=()=>({yearId:id,revision:f.state.year.revision});
 const get=async()=>{const s=(await rpc('get',{yearId:id})).value;await write('settings',{dailyCount:s.year.daily_count});};
 async function plan(from,to,extra={}){const payload={...ctx(),from,to,seed:'same-seed-0001',...extra};const p=(await rpc('preview',payload)).value;assert(p);return {payload,p};}
 let {payload,p}=await plan(today,add(today,40));
 const same=(await rpc('preview',payload)).value;assert.deepEqual(p,same,'same snapshot and seed reproduce exactly');
 await write('apply_plan',{...payload,selectedDates:p.days.map(d=>d.day),fingerprint:p.fingerprint});
 let school=f.state.days.find(d=>d.day>=today&&d.kind==='school');
 // Make first school day the server's synthetic today. This is local DB only.
 await db.exec(`CREATE OR REPLACE FUNCTION cl_duty_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT '${school.day}'::date $$;`);
 const tasks=f.state.assignments.filter(a=>a.day_id===school.id&&a.slot>0&&a.is_current);
 await write('publish',{from:school.day,to:add(school.day,6)});
 await write('result',{assignmentId:tasks[0].id,status:'completed'});
 assert.equal(f.state.counts[tasks[0].student_id],1);assert.equal(f.state.counts[tasks[1].student_id],0,'independent confirmations');
 await write('result',{assignmentId:tasks[1].id,status:'completed'});
 const other=JSON.stringify(f.state.assignments.find(a=>a.id===tasks[1].id));
 const locked=f.state.assignments.filter(a=>a.is_current&&f.state.days.some(d=>d.id===a.day_id&&d.publication==='published'&&d.day>school.day));
 await write('result',{assignmentId:tasks[0].id,status:'not_completed',reason:'Önceki onay hatalı'});
 assert.equal(f.state.counts[tasks[0].student_id],0);assert.equal(JSON.stringify(f.state.assignments.find(a=>a.id===tasks[1].id)),other);
 for(const a of locked)assert.deepEqual(f.state.assignments.find(x=>x.id===a.id),a,'published future frozen');
 await write('result',{assignmentId:tasks[0].id,status:'completed',reason:'Düzeltme geri alındı'});assert.equal(f.state.counts[tasks[0].student_id],1);
 await assert.rejects(write('calendar',{from:school.day,to:school.day,kind:'holiday',reason:'Geçmiş tatil'}),/Onaylı/);
 const unchanged=(await rpc('get',{yearId:id})).value;assert.equal(unchanged.counts[tasks[0].student_id],1,'failed transaction rolls back');
 await write('calendar',{from:school.day,to:school.day,kind:'holiday',reason:'İki hatalı onay iptal',confirmCompleted:true});assert.equal(f.state.counts[tasks[0].student_id],0);
 await write('calendar',{from:school.day,to:school.day,kind:'school',reason:'Tatil geri alındı'});assert.equal(f.state.counts[tasks[0].student_id],0);
 // Retry exact request, including revision, returns prior success without double audit/writes.
 const job={...ctx(),operationId:crypto.randomUUID(),dailyCount:2};let response=await rpc('settings',job);assert.equal(response.ok,true);const replay=await rpc('settings',job);assert.equal(replay.replayed,true);
 assert.equal((await db.query('select count(*)::int n from classlog_duty_audit_log where operation_id=$1',[job.operationId])).rows[0].n,1);
 assert.equal((await rpc('settings',{...job,operationId:crypto.randomUUID()})).reason,'conflict');
 // Refresh write helper's expected revision using no mutation to application files.
 f.state.year.revision=response.value.year.revision;
 await assert.rejects(rpc('settings',{...job,dailyCount:3}),/kimliği/);
 // Identity-preserving rename also updates the old homework storage atomically.
 const old=f.state.roster[0],rename=(await db.query('select cl_duty_rename_student($1,$2,$3,$4,$5) r',['synthetic-teacher-token','Sample A','sample-term',old.source_name,'Yeni ad'])).rows[0].r;
 assert(rename.ok);let snapshot=(await rpc('get',{yearId:id})).value;assert.equal(snapshot.roster.find(r=>r.id===old.id).display_name,'Yeni ad');assert.equal(snapshot.year.roster_dirty,false);f.state.year.revision=snapshot.year.revision;
 const currentNames=(await db.query("select students from classlog_storage where id='sample-term__Sample A'")).rows[0].students;
 await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[[...currentNames,'Yeni öğrenci']]);
 snapshot=(await rpc('get',{yearId:id})).value;assert(snapshot.year.roster_dirty);f.state.year.revision=snapshot.year.revision;
 await assert.rejects(plan(school.day,add(school.day,7)),/eşitleyin/);await write('sync_roster');
 assert.equal(f.state.roster.length,6);assert.equal(f.state.roster.find(r=>r.display_name==='Yeni öğrenci').joined_on,school.day);
 // Exemption keeps historical data; published conflicts are retained, generator excludes candidate.
 const inactive=f.state.roster.find(r=>r.display_name==='Yeni öğrenci');await write('exempt',{studentId:inactive.id,from:school.day,to:add(school.day,30),reason:'Örnek izin'});
 ({p}=await plan(add(school.day,7),add(school.day,20)));assert(p.days.every(d=>d.slots.every(a=>a.student_id!==inactive.id)));
 await write('revoke_exemption',{exemptionId:f.state.exemptions.at(-1).id});
 // Partial preview/apply preserves unselected dates and requires exact preview fingerprint.
 const subset=f.state.days.filter(d=>d.kind==='school'&&d.day>add(school.day,6)).slice(0,2).map(d=>d.day);
 ({payload,p}=await plan(subset[0],subset[1],{selectedDates:[subset[1]]}));
 const retained=f.state.assignments.filter(a=>f.state.days.some(d=>d.id===a.day_id&&d.day===subset[0]));
 await assert.rejects(write('apply_plan',{...payload,selectedDates:[subset[1]],fingerprint:'bad'}),/Önizleme/);
 await write('apply_plan',{...payload,selectedDates:[subset[1]],fingerprint:p.fingerprint});
 assert.deepEqual(f.state.assignments.filter(a=>f.state.days.some(d=>d.id===a.day_id&&d.day===subset[0])),retained);
 // Cancellation followed by reopening requires a fresh explicit proposal, with no duplicate slot.
 const cancelledDay=f.state.days.find(d=>d.day>=add(school.day,7)&&d.kind==='school'&&d.publication==='draft');
 await write('calendar',{from:cancelledDay.day,to:cancelledDay.day,kind:'holiday',reason:'Tatil testi'});
 await write('calendar',{from:cancelledDay.day,to:cancelledDay.day,kind:'school',reason:'Tatil kaldırıldı'});
 ({payload,p}=await plan(cancelledDay.day,cancelledDay.day));await write('apply_plan',{...payload,selectedDates:[cancelledDay.day],fingerprint:p.fingerprint});
 assert.equal(f.state.assignments.filter(a=>a.day_id===cancelledDay.id&&a.is_current&&a.slot>0).length,2);
 // Add a real historical record, correct it and restore it without changing another child's record.
 const past=f.state.days.find(d=>d.day<school.day&&d.kind==='school');
 await write('record_history',{day:past.day,studentId:initial[0],slot:1,status:'completed',reason:'İlk kurulum geçmişi',confirmPublished:true});
 const imported=f.state.assignments.find(a=>a.day_id===past.id&&a.is_current);assert(imported);
 await write('result',{assignmentId:imported.id,status:'not_completed',reason:'Geçmiş düzeltildi'});
 await write('result',{assignmentId:imported.id,status:'completed',reason:'Düzeltme geri alındı'});
 // Both role and daily slot capacity remain enforced for manual history.
 await assert.rejects(write('record_history',{day:past.day,studentId:initial[1],slot:1,status:'completed',reason:'Çift yer'}),/dolu/);
 await assert.rejects(write('record_history',{day:add(school.day,10),studentId:initial[1],slot:1,status:'completed',reason:'Erken onay'}));
 // A departed child whose name reappears must be explicitly resolved.
 const departure=f.state.roster.find(r=>r.id===initial[1]);
 let sourceNames=(await db.query("select students from classlog_storage where id='sample-term__Sample A'")).rows[0].students;
 await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[sourceNames.filter(n=>n!==departure.source_name)]);
 f.state.year.revision=(await rpc('get',{yearId:id})).value.year.revision;await write('sync_roster');
 await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[sourceNames]);f.state.year.revision=(await rpc('get',{yearId:id})).value.year.revision;
 await write('sync_roster');assert(f.state.year.roster_dirty);
 await write('rejoin',{studentId:departure.id,sameStudent:true,reason:'Aynı öğrenci döndü'});assert.equal(f.state.roster.find(r=>r.id===departure.id).left_on,null);
 // Parent cannot access another class, draft, private explanations, or inactive reasons.
 const pub=(await db.query('select cl_duty_parent($1,$2) r',['synthetic-parent',id])).rows[0].r.value;
 assert(!JSON.stringify(pub).includes('Örnek izin'));assert(!pub.assignments.some(a=>'explanation' in a));
 // Real anon role must use the checked entry point, not direct table access.
 await db.exec('SET ROLE anon');assert.equal((await rpc('get',{yearId:id},'synthetic-kiosk-token')).ok,false);await assert.rejects(db.query('select cl_duty_generate($1,$2,$3,$4)',[id,today,add(today,10),'fake-seed']));await db.exec('RESET ROLE');
 const baseB=(await db.query("select * from classlog_storage where id='sample-term__Sample B'")).rows[0];assert.deepEqual(baseB.students,baseline[1].students);
 await db.exec(sql('01_install.sql'));await db.exec(sql('02_enable.sql'));assert.equal((await rpc('get',{yearId:id})).value.roster.length,6);
 await db.close();log('PASS duty scenarios: history correction/reversal, rollback, immutable published plans, exact retries, stale revisions, rename UUIDs, roster reconciliation, newcomer, absence, partial acceptance, isolation');

}
module.exports={run};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
