const assert = require('node:assert/strict');
const {fixture} = require('./duty-db.test.cjs');

async function run(log = console.log) {
  const f = await fixture();
  try {
    const {db, rpc, write, today, add} = f;
    await db.query('update classlog_storage set students=$1 where id=$2',
      [['A', 'B', 'C', 'D', 'E', 'F'], 'sample-term__Sample A']);
    await write('create', {className:'Sample A', label:'Kapasite testi',
      start:add(today,-14), end:add(today,60), dailyCount:2});
    const yearId = f.state.year.id;
    async function plan(from, to, extra = {}) {
      const payload = {yearId, revision:f.state.year.revision, from, to,
        seed:'capacity-seed-001', ...extra};
      const response = await rpc('preview', payload);
      assert.equal(response.ok, true);
      const p = response.value;
      await write('apply_plan', {...payload, selectedDates:p.days.map(d=>d.day),
        fingerprint:p.fingerprint});
    }
    await plan(today, add(today,21));
    const days = f.state.days.filter(d=>d.day>=today && d.kind==='school');
    const locked = days[0], mutable = days[1];
    await db.exec(`CREATE OR REPLACE FUNCTION cl_duty_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT '${locked.day}'::date $$;`);
    await write('publish', {from:locked.day, to:locked.day});
    const oldTasks = f.state.assignments.filter(a=>a.day_id===locked.id && a.is_current);
    for (const a of oldTasks.filter(a=>a.slot>0)) {
      await write('result', {assignmentId:a.id, status:'completed'});
    }
    const completedTasks = f.state.assignments.filter(a=>a.day_id===locked.id);
    const completedDay = f.state.days.find(d=>d.id===locked.id);
    await write('settings', {dailyCount:1});
    assert.equal(f.state.year.daily_count, 1);
    assert.deepEqual(f.state.days.find(d=>d.id===locked.id), completedDay);
    assert.deepEqual(f.state.assignments.filter(a=>a.day_id===locked.id), completedTasks);
    await plan(mutable.day, mutable.day);
    assert.equal(f.state.days.find(d=>d.id===mutable.id).daily_count, 1);
    assert.equal(f.state.assignments.filter(a=>a.day_id===mutable.id && a.is_current && a.slot>0).length, 1);
    await write('settings', {dailyCount:3});
    assert.equal(f.state.days.find(d=>d.id===locked.id).daily_count, 2);
    assert.equal(f.state.days.find(d=>d.id===mutable.id).daily_count, 1);
    await plan(mutable.day, mutable.day);
    assert.equal(f.state.days.find(d=>d.id===mutable.id).daily_count, 3);
    assert.equal(f.state.assignments.filter(a=>a.day_id===mutable.id && a.is_current && a.slot>0).length, 3);
    assert.deepEqual(f.state.assignments.filter(a=>a.day_id===locked.id), completedTasks);
    log('PASS capacity 2→1→3: historical/public snapshots retained; only explicitly replanned day changes');
  } finally { await f.db.close(); }
}
module.exports = {run};
if (require.main===module) run().catch(e=>{console.error(e);process.exitCode=1;});
