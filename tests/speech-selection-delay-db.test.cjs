// Ephemeral local PostgreSQL, synthetic identities only. No network/Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pkg=process.env.PGLITE_PATH;
const {PGlite}=require(pkg),{pgcrypto}=require(path.join(pkg,'dist/contrib/pgcrypto.cjs'));
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
(async()=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try {
  await db.exec(read('speech-exam-fixture.sql'));
  await db.exec("CREATE TABLE public.classlog_parent_links(class_name text,token text,active boolean);INSERT INTO public.classlog_parent_links VALUES('Sample A','sample-parent-link',true);UPDATE public.classlog_sessions SET expires_at=now() WHERE session_kind='kiosk';");
  const release='../sql/canli-kurulum-tamamlanan-2026-10-27/kurulum/';
  for(const file of ['01_TABLOLAR.sql','02_SINAV_RPC_KAPALI.sql','03_TAHTA_CIHAZ_ONAYI_KAPALI.sql','05_ERISIMI_AC.sql'])await db.exec(read(release+file));
  const before=(await db.query('SELECT * FROM classlog_storage ORDER BY id')).rows;
  const permissions=async()=>(await db.query("SELECT p.oid::regprocedure::text AS name,p.proacl::text AS acl,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('cl_speech_exam_rpc','cl_speech_exam_snapshot','cl_speech_device_rpc') ORDER BY p.proname")).rows;
  const acl=await permissions();
  await db.exec(read('../sql/34_speech_selection_delay.sql'));
  await db.exec(read('../sql/34_speech_selection_delay.sql')); // safe repeat, no access reset
  await db.exec(read('../sql/35_speech_score_toggle.sql'));
  await db.exec(read('../sql/35_speech_score_toggle.sql')); // safe repeat, no access reset
  assert.deepEqual(await permissions(),acl);
  assert.equal((await db.query('SELECT cl_speech_exam_enabled() AS enabled')).rows[0].enabled,true);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM classlog_speech_results'));
  await assert.rejects(db.query('SELECT cl_speech_exam_snapshot(gen_random_uuid())'));
  const token='synthetic-teacher-token',ctx={className:'Sample A',subjectId:'turkce',termId:'sample-term',date:'2026-10-27'};
  const rpc=async(action,payload={},credential=token)=>(await db.query('SELECT cl_speech_exam_rpc($1,$2,$3::jsonb) AS r',[credential,action,JSON.stringify(payload)])).rows[0].r;
  const secret='a'.repeat(64);
  const device=async(action,payload={},key=secret,teacher=null)=>(await db.query('SELECT cl_speech_device_rpc($1,$2,$3,$4::jsonb) AS r',[action,key,teacher,JSON.stringify(payload)])).rows[0].r;
  assert.equal((await rpc('create',ctx,'synthetic-parent-token')).ok,false);
  const request=await device('request',{parentToken:'sample-parent-link'});assert.equal(request.ok,true);
  assert.equal((await device('approve',{...ctx,code:request.value.code},null,token)).ok,true);
  let exam=(await rpc('create',ctx)).value;
  const first=exam.students[0].id,second=exam.students[1].id;
  exam=(await rpc('select',{id:exam.id,studentId:first,expectedRevision:exam.revision})).value;
  let saved=await rpc('save',{id:exam.id,studentId:first,expectedRevision:0,mutationId:crypto.randomUUID(),patch:Object.fromEntries(Array.from({length:9},(_,i)=>[i,8]))});
  assert.equal(saved.ok,true);assert.equal(saved.value.selectionExpiresAt,null);
  const job={id:exam.id,studentId:first,expectedRevision:1,mutationId:crypto.randomUUID(),patch:{9:7}};
  saved=await rpc('save',job);assert.equal(saved.ok,true);
  assert.equal(saved.value.activeStudentId,first);
  assert.equal(saved.value.selectionExpiresAt-saved.value.serverTime,10000);
  const retry=await rpc('save',job);assert.equal(retry.value.selectionExpiresAt,saved.value.selectionExpiresAt,'retry does not extend display');
  let visible=(await device('read',{parentToken:'sample-parent-link'})).value.exam;
  assert.equal(visible.activeStudentId,first);assert.equal(visible.results[first].scores[9],7);
  // Advance only the fixture deadline; no real-time wait or production data.
  await db.exec('RESET ROLE');
  await db.query("UPDATE classlog_speech_exams SET selection_expires_at=now()-interval '1 second' WHERE id=$1",[exam.id]);
  await db.exec('SET ROLE anon');
  visible=(await device('read',{parentToken:'sample-parent-link'})).value.exam;
  assert.equal(visible.activeStudentId,null);assert.deepEqual(visible.students,[]);assert.deepEqual(visible.results,{});
  exam=(await rpc('get',{id:exam.id})).value;assert.equal(exam.status,'active');assert.equal(exam.activeStudentId,null);assert.equal(exam.results[first].scores[9],7);
  exam=(await rpc('select',{id:exam.id,studentId:first,expectedRevision:exam.revision})).value;
  assert.equal(exam.activeStudentId,first);assert.equal(exam.selectionExpiresAt,null,'explicit selection can review completed scores');
  saved=await rpc('save',{id:exam.id,studentId:first,expectedRevision:2,mutationId:crypto.randomUUID(),patch:{9:9}});
  assert.equal(saved.value.selectionExpiresAt-saved.value.serverTime,10000);
  const clearJob={id:exam.id,studentId:first,expectedRevision:saved.value.revision,mutationId:crypto.randomUUID(),patch:{9:null}};
  saved=await rpc('save',clearJob);assert.equal(saved.ok,true);assert.equal(saved.value.selectionExpiresAt,null);
  const cleared=(await rpc('get',{id:exam.id})).value;
  assert.equal(cleared.results[first].scores[9],null);assert.equal(cleared.activeStudentId,first);
  assert.deepEqual(cleared.results[first].scores.slice(0,9),Array(9).fill(8));
  assert.equal((await device('read',{parentToken:'sample-parent-link'})).value.exam.results[first].scores[9],null);
  assert.equal((await rpc('save',clearJob)).value.revision,saved.value.revision,'duplicate clear is idempotent');
  for(const value of [0,11,1.5,'5',false,{}]) {
    const invalid=await rpc('save',{...clearJob,expectedRevision:saved.value.revision,mutationId:crypto.randomUUID(),patch:{9:value}});
    assert.equal(invalid.ok,false,'only integer 1-10 or null allowed');
  }
  const denied=await rpc('save',{...clearJob,mutationId:crypto.randomUUID()},'invalid-token');assert.equal(denied.ok,false);
  saved=await rpc('save',{...clearJob,expectedRevision:saved.value.revision,mutationId:crypto.randomUUID(),patch:{9:9}});
  assert.equal(saved.ok,true);assert.equal(saved.value.selectionExpiresAt-saved.value.serverTime,10000);
  exam=(await rpc('select',{id:exam.id,studentId:second,expectedRevision:saved.value.examRevision})).value;
  assert.equal(exam.selectionExpiresAt,null);assert.equal((await device('read',{parentToken:'sample-parent-link'})).value.exam.activeStudentId,second);
  exam=(await rpc('select',{id:exam.id,studentId:null,expectedRevision:exam.revision})).value;
  assert.equal((await device('read',{parentToken:'sample-parent-link'})).value.exam.activeStudentId,null);
  exam=(await rpc('finish',{id:exam.id,expectedRevision:exam.revision})).value;
  assert.equal(exam.status,'finished');assert.equal(exam.results[first].scores[9],9);
  assert.equal((await rpc('save',{...clearJob,expectedRevision:saved.value.revision,mutationId:crypto.randomUUID()})).ok,false,'finished exam stays read-only');
  assert.equal((await device('read',{parentToken:'sample-parent-link'})).value.exam,null);
  await db.exec('RESET ROLE');
  assert.deepEqual((await db.query('SELECT * FROM classlog_storage ORDER BY id')).rows,before);
  console.log('PASS DB: exactly 10 seconds, duplicate save deadline unchanged, authorized board expiry, persistent grades, manual selection/clear/finish, new student protection, unchanged permissions and class data, repeatable migration.');
 } finally {await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
