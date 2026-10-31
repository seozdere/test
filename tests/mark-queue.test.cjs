// Run: node tests/mark-queue.test.cjs (mock RPCs; no network or credentials).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../data.js'), 'utf8');
const queueSource = source.slice(source.indexOf('const ClassLogMarkQueue ='));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clone = value => value === undefined ? undefined : structuredClone(value);

async function run() {
    const servers = { a: { records: {}, classRecords: {} }, b: { records: {}, classRecords: {} } };
    let active = 0, maxActive = 0, writes = 0, fail = false, delay = 30;
    const model = {
        currentClass: 'a', currentSubject: 'english', records: {}, classRecords: {},
        _dbId() { return this.currentClass; }, _teacherTermId() { return 'term'; }, _activeTid() { return 'term'; },
        _setError() {}, _clearError() {}, async _afterWrite() {}
    };
    const context = vm.createContext({
        setTimeout, clearTimeout, _cloneData: clone, ClassLogData: model,
        ClassLogAuth: { getSessionToken: () => 'mock' },
        _supabase: { async rpc(name, args) {
            active++; maxActive = Math.max(active, maxActive);
            await sleep(delay);
            active--;
            if (name === 'cl_get_teacher_view') return { data: { ok: true, ...clone(servers[args.p_class_name]) } };
            writes++;
            if (fail) { fail = false; return { error: new Error('offline') }; }
            servers[args.p_id] = { records: clone(args.p_records), classRecords: clone(args.p_class_records) };
            return { data: true };
        } }
    });
    vm.runInContext(queueSource + '\nglobalThis.queue = ClassLogMarkQueue;', context);
    const q = context.queue;
    const add = (kind, day, names = Object.keys(day)) => q.add(kind, { today: day }, { date: 'today', students: names });
    const pending = [add('records', { Ali: 1 }), add('records', { Ali: -1 }), add('records', { Ayse: 2 })];
    assert.equal(q.state().pending, 3);
    assert.equal(q.overlay('records', {}).today.Ali, -1, 'latest optimistic value survives');
    await sleep(60); assert.equal(writes, 0, '125ms debounce');
    await Promise.all(pending);
    assert.equal(servers.a.records.today.Ali, -1);
    assert.equal(servers.a.records.today.Ayse, 2);
    assert.equal(maxActive, 1, 'only one RPC in flight');

    delay = 100;
    const slow = add('classRecords', { Ali: { pos: 1, neg: 0 } });
    await sleep(150);
    const newer = add('classRecords', { Ali: { pos: 2, neg: 0 } });
    assert.equal(q.overlay('classRecords', model.classRecords).today.Ali.pos, 2);
    await slow;
    assert.equal(q.overlay('classRecords', model.classRecords).today.Ali.pos, 2, 'old response cannot erase next click');
    await newer;
    assert.equal(servers.a.classRecords.today.Ali.pos, 2);
    assert.equal(servers.a.records.today.Ali, -1, 'other mark type preserved');

    delay = 10; fail = true;
    const failed = add('records', { Ali: 3 });
    await sleep(180);
    assert.equal(q.state().error, true);
    const later = add('records', { Ayse: 1 });
    await sleep(150);
    assert.equal(q.state().pending, 2);
    assert.equal(q.state().error, true, 'later clicks cannot hide unresolved failure');
    q.retry(); await Promise.all([failed, later]);
    assert.equal(q.state().pending, 0);
    assert.equal(q.state().error, false);
    assert.equal(servers.a.records.today.Ali, 3);
    assert.equal(servers.a.records.today.Ayse, 1);

    await add('records', { Ali: 1, Ayse: 1 }); // bulk
    await add('records', {}, ['Ali', 'Ayse']); // bulk clear
    assert.equal(servers.a.records.today, undefined);
    assert.equal(servers.a.classRecords.today.Ali.pos, 2);
    const oldContext = add('records', { Ali: 2 });
    model.currentClass = 'b'; model.records = {}; model.classRecords = {};
    const newContext = add('records', { Veli: 1 });
    await Promise.all([oldContext, newContext]);
    assert.equal(servers.a.records.today.Ali, 2);
    assert.equal(servers.b.records.today.Veli, 1);
    assert.equal(model.records.today.Ali, undefined, 'context isolated');
    assert.equal(q.state().history.length, 5);
    assert.equal(maxActive, 1);
    // Exercise the production sync guard with a response older than a confirmed write.
    const syncMethod = source.slice(source.indexOf('    async sync() {'), source.indexOf('    syncParent(')).trim().replace(/,$/, '');
    context.ClassLogAuth.isLoggedIn = () => true;
    let release;
    context._supabase.rpc = () => new Promise(resolve => { release = resolve; });
    vm.runInContext('globalThis.syncUnderTest = ({' + syncMethod + '}).sync;', context);
    let applied = false;
    model._applyViewPayload = () => { applied = true; };
    const stale = context.syncUnderTest.call(model);
    model.records = { today: { Veli: 3 } };
    release({ data: { ok: true, records: {} } });
    assert.equal(await stale, false);
    assert.equal(applied, false, 'stale Realtime response rejected');
    assert.equal(model.records.today.Veli, 3);
    console.log('PASS: debounce, optimistic overlay, rapid taps, multiple students, slow network, failure/retry, bulk/clear, context isolation, five-item history');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
