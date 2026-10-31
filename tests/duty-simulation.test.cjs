const assert=require('node:assert/strict'),crypto=require('node:crypto');const {fixture}=require('./duty-db.test.cjs');
async function run(log=console.log){
 const f=await fixture(),{db,rpc,today,add}=f;let cases=0,daysTotal=0;
 await db.query('update classlog_teachers set classes=$1 where id=1',[[1,2,3,10,29,30,31,40].map(n=>'Sim '+n)]);
 for(const n of [1,2,3,10,29,30,31,40]){
  const className='Sim '+n,names=Array.from({length:n},(_,i)=>'Örnek '+(i+1));await db.query('insert into classlog_storage(id,students,records) values($1,$2,$3)',['sample-term__'+className,names,{}]);
  const created=await rpc('create',{className,label:'Simülasyon',start:today,end:add(today,300),operationId:crypto.randomUUID()});assert(created.ok);const s=created.value,id=s.year.id;
  // Synthetic calendar with a 9-day closure, half-days and multiple holiday weekdays.
  await db.query("update classlog_duty_days set kind='holiday' where year_id=$1 and (day between $2 and $3 or extract(day from day)::int%17=0)",[id,add(today,40),add(today,48)]);
  await db.query("update classlog_duty_days set kind='half_day' where year_id=$1 and extract(day from day)::int=28",[id]);
  for(let seed=0;seed<3;seed++){
   const p=(await rpc('preview',{yearId:id,revision:s.year.revision,from:today,to:add(today,300),seed:'simulation-seed-'+seed})).value;
   assert(p,'preview');const totals=new Map(s.roster.map(r=>[r.id,0])),pairs=new Map(),byDay=Array(7).fill(0);
   for(const d of p.days){cases++;assert(![0,6].includes(new Date(d.day+'T12:00Z').getUTCDay()));assert(!(d.day>=add(today,40)&&d.day<=add(today,48)));assert.notEqual(d.day.slice(8),'28');assert.equal(new Set(d.slots.map(a=>a.student_id)).size,d.slots.length);
    const primary=d.slots.filter(a=>a.slot>0);assert.equal(primary.length,Math.min(2,n));for(const a of primary){totals.set(a.student_id,totals.get(a.student_id)+1);byDay[new Date(d.day+'T12:00Z').getUTCDay()]++;}
    const values=[...totals.values()];assert(Math.max(...values)-Math.min(...values)<=1,`fair round n=${n}, seed=${seed}, day=${d.day}`);
    if(primary.length===2){const key=primary.map(a=>a.student_id).sort().join('|');pairs.set(key,(pairs.get(key)||0)+1);}
   }
   daysTotal+=p.days.length;
   log(JSON.stringify({students:n,seed,schoolDays:p.days.length,min:Math.min(...totals.values()),max:Math.max(...totals.values()),repeatedPairs:[...pairs.values()].reduce((sum,c)=>sum+Math.max(0,c-1),0),weekdays:byDay.slice(1,6),shortStaffDays:p.warnings.length}));
  }
  // Every planned duty is still unconfirmed and contributes zero to real counts.
  assert(Object.values((await rpc('get',{yearId:id})).value.counts).every(c=>c===0));
 }
 log(`PASS ${cases} daily invariant checks; ${daysTotal} school days, 8 roster sizes, 3 seeds, holidays and half-days`);await db.close();

}
module.exports={run};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
