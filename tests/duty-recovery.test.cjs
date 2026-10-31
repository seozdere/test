const assert = require('node:assert/strict');
const {fixture} = require('./duty-db.test.cjs');

async function run(log = console.log) {
  const f = await fixture();
  try {
    const {db,rpc,write,today,add} = f;
    await db.query('update classlog_storage set students=$1 where id=$2',
      [['A','B','C','D','E'], 'sample-term__Sample A']);
    await write('create',{className:'Sample A',label:'Geçmiş ve yedek testi',
      start:add(today,-30),end:add(today,90)});
    const yearId=f.state.year.id;
    const historyDays=f.state.days.filter(d=>d.kind==='school' && d.day<today).slice(0,2);
    const child=f.state.roster[0], other=f.state.roster[1];
    await write('record_history',{day:historyDays[0].day,studentId:child.id,slot:1,
      status:'completed',reason:'Gerçekleşen eski görev'});
    const original=f.state.assignments.find(a=>a.day_id===historyDays[0].id && a.student_id===child.id);
    await write('record_history',{day:historyDays[0].day,studentId:other.id,slot:2,
      status:'completed',reason:'İkinci öğrenci'});
    const otherRecord=f.state.assignments.find(a=>a.day_id===historyDays[0].id && a.student_id===other.id);
    await write('result',{assignmentId:original.id,status:'not_completed',reason:'Önceki kayıt hatalı'});
    assert.equal(f.state.counts[child.id],0);
    await write('record_history',{day:historyDays[1].day,studentId:child.id,slot:1,
      status:'completed',reason:'Telafi görevi gerçekten gerçekleşti'});
    const compensation=f.state.assignments.find(a=>a.day_id===historyDays[1].id && a.student_id===child.id);
    assert.equal(f.state.counts[child.id],1);
    await write('result',{assignmentId:original.id,status:'completed',reason:'Eski görevi de tuttuğu doğrulandı'});
    assert.equal(f.state.counts[child.id],2,'two real completed duties remain counted');
    assert.deepEqual(f.state.assignments.find(a=>a.id===compensation.id),compensation);
    assert.deepEqual(f.state.assignments.find(a=>a.id===otherRecord.id),otherRecord);

    const payload={yearId,revision:f.state.year.revision,from:today,to:add(today,14),seed:'reserve-seed-001'};
    const response=await rpc('preview',payload);
    assert.equal(response.ok,true);
    const p=response.value;
    await write('apply_plan',{...payload,selectedDates:p.days.map(d=>d.day),fingerprint:p.fingerprint});
    const day=f.state.days.find(d=>d.day>=today && d.kind==='school');
    await db.exec(`CREATE OR REPLACE FUNCTION cl_duty_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT '${day.day}'::date $$;`);
    await write('publish',{from:day.day,to:day.day});
    const assignments=f.state.assignments.filter(a=>a.day_id===day.id && a.is_current);
    const first=assignments.find(a=>a.slot===1), second=assignments.find(a=>a.slot===2), reserve=assignments.find(a=>a.slot===0);
    assert(reserve);
    const beforeCount=Number(f.state.counts[reserve.student_id]||0);
    await write('replace',{assignmentId:first.id,studentId:reserve.student_id,
      reason:'Asıl görevli yok; yedek devraldı',confirmPublished:true});
    assert.deepEqual(f.state.assignments.find(a=>a.id===second.id),second);
    assert.equal(f.state.assignments.find(a=>a.id===reserve.id).is_current,false);
    assert.equal(f.state.assignments.find(a=>a.id===first.id).status,'not_completed');
    const promoted=f.state.assignments.find(a=>a.day_id===day.id && a.is_current && a.slot===1);
    assert.equal(promoted.student_id,reserve.student_id);
    assert.equal(Number(f.state.counts[reserve.student_id]||0),beforeCount,'promotion itself is not completion');
    await write('result',{assignmentId:promoted.id,status:'completed'});
    assert.equal(f.state.counts[reserve.student_id],beforeCount+1);

    // A different child with a reused name receives a new identity and no old credit/debt.
    const departed=f.state.roster.find(r=>r.id===child.id);
    const names=(await db.query("select students from classlog_storage where id='sample-term__Sample A'")).rows[0].students;
    await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[names.filter(n=>n!==departed.source_name)]);
    f.state.year.revision=(await rpc('get',{yearId})).value.year.revision;
    await write('sync_roster');
    await db.query("update classlog_storage set students=$1 where id='sample-term__Sample A'",[names]);
    f.state.year.revision=(await rpc('get',{yearId})).value.year.revision;
    await write('sync_roster');
    assert.equal(f.state.year.roster_dirty,true);
    const historicalCount=f.state.counts[child.id];
    await write('rejoin',{studentId:child.id,sameStudent:false,reason:'Aynı isimli farklı öğrenci'});
    const newcomer=f.state.roster.find(r=>r.source_name===departed.source_name && r.id!==child.id);
    assert(newcomer,'new stable identity required');
    assert.equal(Number(f.state.counts[newcomer.id]||0),0);
    assert.equal(f.state.counts[child.id],historicalCount);
    assert(f.state.roster.find(r=>r.id===child.id).left_on);
    assert.equal(f.state.year.roster_dirty,false);
    log('PASS recovery: correction after completed compensation, reserve promotion, other student unchanged, same-name new identity');
  } finally { await f.db.close(); }
}
module.exports={run};
if(require.main===module) run().catch(e=>{console.error(e);process.exitCode=1;});
