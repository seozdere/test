// Ephemeral PostgreSQL only. No URLs, secrets, remote DB or production fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pkg=process.env.PGLITE_PATH;
if(!pkg)throw Error('Set PGLITE_PATH to a temporary @electric-sql/pglite install.');
const {PGlite}=require(pkg),{pgcrypto}=require(path.join(pkg,'dist/contrib/pgcrypto.cjs'));
(async()=>{
const db=new PGlite({extensions:{pgcrypto}});
const fixture=fs.readFileSync(path.join(__dirname,'speech-exam-fixture.sql'),'utf8');
await db.exec(process.env.PGLITE_CRYPTO_PUBLIC ? fixture.replace('WITH SCHEMA extensions','WITH SCHEMA public') : fixture);
const baseline=(await db.query('select * from public.classlog_storage order by id')).rows;
const release=process.env.EXAM_SQL_PACKAGE==='release';
const releaseSql=file=>fs.readFileSync(path.join(__dirname,'../sql/speech-exam-release',file),'utf8');
if(release) await db.exec(releaseSql('00_preflight.READONLY.sql'));
for(const file of release ? ['speech-exam-release/01_storage.sql','speech-exam-release/02_rpc.sql'] : ['31_speech_exam_storage.DRAFT.sql','32_speech_exam_rpc.DRAFT.sql']) await db.exec(fs.readFileSync(path.join(__dirname,'../sql',file),'utf8'));
const teacher='synthetic-teacher-token';
const rpc=async(action,payload={},token=teacher)=>(await db.query('select public.cl_speech_exam_rpc($1,$2,$3::jsonb) as result',[token,action,JSON.stringify(payload)])).rows[0].result;
assert.equal((await rpc('list')).reason,'disabled');
await db.exec('SET ROLE anon');await assert.rejects(db.query('select public.cl_speech_exam_rpc(null,null)'));await assert.rejects(db.query('select * from public.classlog_speech_results'));await assert.rejects(db.query('select public.cl_speech_exam_snapshot(gen_random_uuid())'));await db.exec('RESET ROLE');
// Local test-only activation. It is never included in a migration file.
if(release){
 await db.exec('GRANT CREATE ON SCHEMA public TO anon');
 await assert.rejects(db.exec(releaseSql('03_enable.sql')), /Unsafe schema CREATE/);
 await db.exec('ROLLBACK; REVOKE CREATE ON SCHEMA public FROM anon');
 await db.exec(releaseSql('03_enable.sql'));
 await db.exec(releaseSql('02_rpc.sql')); // Updating RPCs closes the feature again.
 assert.equal((await rpc('list')).reason,'disabled');
 await db.exec(releaseSql('03_enable.sql'));
 const status=await db.exec(releaseSql('05_status.READONLY.sql'));
 assert.equal(status[0].rows[0].server_enabled,true);assert.equal(status[1].rows.length,4);
 for(const table of status[1].rows) assert.equal(table.rls_enabled,true);
 for(const role of status[2].rows){assert.equal(role.rpc_access,true);assert.equal(role.internal_snapshot_access,false);assert.equal(role.direct_scores_access,false);}
 await db.exec('SET ROLE anon');
}else await db.exec("CREATE OR REPLACE FUNCTION public.cl_speech_exam_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$; GRANT EXECUTE ON FUNCTION public.cl_speech_exam_rpc(text,text,jsonb) TO anon; SET ROLE anon;");
const ctx={className:'Sample A',subjectId:'turkce',termId:'sample-term',date:'2026-10-25'};
for(const token of ['synthetic-parent-token','synthetic-kiosk-token','synthetic-expired-token'])assert.equal((await rpc('create',ctx,token)).reason,'unauthorized');
assert.equal((await rpc('create',ctx,'synthetic-other-token')).reason,'forbidden');
let created=await rpc('create',ctx);assert.equal(created.ok,true,JSON.stringify(created));let exam=created.value;
assert.equal((await rpc('create',ctx)).reason,'conflict');
const student=exam.students[0].id;assert.deepEqual(exam.results[student].scores,Array(10).fill(null));
assert.equal((await rpc('get',{id:exam.id},'synthetic-other-token')).reason,'forbidden');
exam=(await rpc('select',{id:exam.id,studentId:student,expectedRevision:exam.revision})).value;
let job={id:exam.id,studentId:student,expectedRevision:0,mutationId:crypto.randomUUID(),patch:{0:10,1:7}};
let saved=await rpc('save',job);assert.equal(saved.ok,true,JSON.stringify(saved));assert.equal(saved.value.revision,1);
assert.equal((await rpc('save',job)).value.revision,1);
assert.equal((await rpc('save',{...job,mutationId:crypto.randomUUID()})).reason,'conflict');
for(const patch of [{0:0},{0:11},{0:1.5},{10:5},{0:null}])assert.equal((await rpc('save',{...job,expectedRevision:1,mutationId:crypto.randomUUID(),patch})).reason,'invalid');
const grant=await rpc('issue_board',{id:exam.id});assert.equal(grant.ok,true,JSON.stringify(grant));
const board=await rpc('board',{},grant.value.token);assert.equal(board.ok,true,JSON.stringify(board));assert.equal(board.value.students.length,1);assert.equal(Object.keys(board.value.results).length,1);assert.equal(board.value.students[0].id,student);
assert.equal((await rpc('get',{id:exam.id},grant.value.token)).reason,'unauthorized');assert.equal((await rpc('save',job,grant.value.token)).reason,'unauthorized');
await rpc('revoke_board',{id:exam.id});assert.equal((await rpc('board',{},grant.value.token)).reason,'unauthorized');
const second=await rpc('issue_board',{id:exam.id});
await db.exec('RESET ROLE; UPDATE public.classlog_teachers SET active=false WHERE id=1; SET ROLE anon');assert.equal((await rpc('board',{},second.value.token)).reason,'unauthorized');
await db.exec('RESET ROLE; UPDATE public.classlog_teachers SET active=true WHERE id=1; UPDATE public.classlog_sessions SET expires_at=now()-interval \'1 minute\' WHERE id=1; SET ROLE anon');assert.equal((await rpc('board',{},second.value.token)).reason,'unauthorized');
await db.exec('RESET ROLE; UPDATE public.classlog_sessions SET expires_at=now()+interval \'1 hour\' WHERE id=1; SET ROLE anon');
exam=(await rpc('get',{id:exam.id})).value;
assert.equal((await rpc('list',{...ctx,date:'2030-01-01'})).value[0].status,'active');
exam=(await rpc('select',{id:exam.id,studentId:null,expectedRevision:exam.revision})).value;
assert.equal(exam.activeStudentId,null);
assert.deepEqual((await rpc('board',{},second.value.token)).value.students,[]);
exam=(await rpc('select',{id:exam.id,studentId:student,expectedRevision:exam.revision})).value;
const complete=await rpc('save',{...job,expectedRevision:1,mutationId:crypto.randomUUID(),patch:Object.fromEntries(Array.from({length:8},(_,i)=>[i+2,8]))});
assert.equal(complete.ok,true);assert.equal(complete.value.activeStudentId,null);
const cleared=(await rpc('board',{},second.value.token)).value;assert.equal(cleared.activeStudentId,null);assert.deepEqual(cleared.students,[]);assert.deepEqual(cleared.results,{});
exam=(await rpc('get',{id:exam.id})).value;assert.equal(exam.status,'active');assert.equal(exam.results[student].scores.filter(s=>s!==null).length,10);
const finished=await rpc('finish',{id:exam.id,expectedRevision:exam.revision});assert.equal(finished.ok,true);
assert.equal((await rpc('board',{},second.value.token)).value.status,'finished');
assert.equal((await rpc('save',{...job,expectedRevision:1})).reason,'finished');
assert.equal((await rpc('get',{id:exam.id})).value.results[student].scores[0],10);
assert.equal((await rpc('list',ctx)).value[0].status,'finished');
await db.exec('RESET ROLE');
assert.deepEqual((await db.query('select * from public.classlog_storage order by id')).rows,baseline);
const signals=(await db.query('select payload,topic from realtime.test_signals')).rows;
assert(signals.length>0);for(const signal of signals){assert.deepEqual(Object.keys(signal.payload),['revision']);assert(signal.topic.startsWith('speech_change_'));}
await db.exec("UPDATE public.classlog_speech_board_grants SET expires_at=now()-interval '1 minute'");assert.equal((await rpc('board',{},second.value.token)).reason,'unauthorized');
if(release){
 const continuing=(await rpc('create',ctx)).value;assert.equal(continuing.status,'active');
 const beforeDisable=(await db.query('select id,status,active_student_id,revision from public.classlog_speech_exams order by id')).rows;
 const beforeScores=(await db.query('select * from public.classlog_speech_results order by exam_id,student_id')).rows;
 await db.exec(releaseSql('04_disable_keep_data.sql'));
 assert.equal((await rpc('list',ctx)).reason,'disabled');
 assert.deepEqual((await db.query('select id,status,active_student_id,revision from public.classlog_speech_exams order by id')).rows,beforeDisable);
 assert.deepEqual((await db.query('select * from public.classlog_speech_results order by exam_id,student_id')).rows,beforeScores);
 await db.exec('SET ROLE anon');await assert.rejects(rpc('list',ctx));await db.exec('RESET ROLE');
 console.log('PASS release activation guards, RPC reinstall, disable/revoke without losing grades or finishing ongoing exams');
}
await db.close();console.log('PASS local PostgreSQL: migrations, closed gate, denied table/helper access, teacher/class/kiosk/parent authorization, null scores, persistence, idempotency, conflicts, read-only board, revocation/expiry, finish/history, signals, unchanged original data');
})().catch(error=>{console.error(error);process.exitCode=1});
