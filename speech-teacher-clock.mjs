// Local teacher-only clock; no server writes or board connection.
export function teacherClock(now=()=>Date.now()){
 let key=null,elapsed=0,started=null;
 const reset=()=>{elapsed=0;started=null;};
 return {
  select(next){if(next!==key){key=next;reset();}},
  toggle(){if(!key)return;if(started===null)started=now();else{elapsed+=Math.max(0,now()-started);started=null;}},
  reset,
  get running(){return started!==null;},
  get milliseconds(){return elapsed+(started===null?0:Math.max(0,now()-started));}
 };
}
