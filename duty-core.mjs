// Calendar-only ISO dates: never convert a school date through local/UTC midnight.
export const VERSION='duty-1';
export const STATUS={planned:'Planlandı',pending:'Onay bekliyor',completed:'Tamamlandı',not_completed:'Tutmadı',cancelled:'İptal'};
export const KIND={school:'Okul günü',holiday:'Tatil',half_day:'Yarım gün',closed:'Nöbet yok'};
export function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw Error('Geçersiz tarih');const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)throw Error('Geçersiz tarih');return value;}
export function addDays(value,n){const d=new Date(date(value)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function weekday(value){return new Date(date(value)+'T12:00:00Z').getUTCDay();}
export function monday(value){return addDays(value,-((weekday(value)+6)%7));}
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function pretty(value){return new Intl.DateTimeFormat('tr-TR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(date(value)+'T12:00:00Z'));}
export function dayName(value){return new Intl.DateTimeFormat('tr-TR',{timeZone:'UTC',weekday:'long'}).format(new Date(date(value)+'T12:00:00Z'));}
export function range(from,to){date(from);date(to);if(to<from||new Date(to)-new Date(from)>401*86400000)throw Error('Geçersiz tarih aralığı');const out=[];for(let d=from;d<=to;d=addDays(d,1))out.push(d);return out;}
export function eligible(state,id,day){const r=state.roster.find(r=>r.id===id);return !!r&&r.joined_on<=day&&(!r.left_on||r.left_on>day)&&!state.exemptions.some(e=>e.student_id===id&&!e.revoked&&e.starts_on<=day&&(!e.ends_on||e.ends_on>=day));}
export function assignments(state,day){return state.assignments.filter(a=>a.day_id===day.id&&a.is_current).sort((a,b)=>(a.slot||9)-(b.slot||9));}
export function statusOf(a,day,todayValue){return a.status==='planned'&&day.day<todayValue&&a.slot>0?'pending':a.status;}
export function dayStatus(state,day){if(day.kind!=='school')return KIND[day.kind];const a=assignments(state,day).filter(a=>a.slot>0),done=a.filter(a=>a.status==='completed').length;if(done===(day.daily_count??state.year.daily_count))return 'Tamamlandı';if(done)return 'Kısmen tamamlandı';if(a.some(a=>statusOf(a,day,state.today)==='pending'))return 'Onay bekliyor';if(a.length&&a.every(a=>a.status==='cancelled'))return 'İptal';return a.length?'Planlandı':'Henüz planlanmadı';}
export function statistics(state){
 const days=new Map(state.days.map(d=>[d.id,d])),confirmed=state.assignments.filter(a=>a.status==='completed'),pairs=new Map(),weekdays=Array(7).fill(0);
 const rows=state.roster.map(r=>{const own=confirmed.filter(a=>a.student_id===r.id),pending=state.assignments.filter(a=>a.student_id===r.id&&a.is_current&&a.slot>0&&days.has(a.day_id)&&statusOf(a,days.get(a.day_id),state.today)==='pending');return {...r,count:Number(state.counts[r.id]||0),last:own.map(a=>days.get(a.day_id)?.day).filter(Boolean).sort().at(-1)||null,pending:pending.length,active:eligible(state,r.id,state.today)};});
 for(const d of state.days){const a=confirmed.filter(a=>a.day_id===d.id);weekdays[weekday(d.day)]+=a.length;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const key=[a[i].student_id,a[j].student_id].sort().join('|');pairs.set(key,(pairs.get(key)||0)+1);}}
 const pendingDays=state.days.filter(d=>assignments(state,d).some(a=>a.slot>0&&statusOf(a,d,state.today)==='pending'));
 const active=rows.filter(r=>r.active),counts=active.map(r=>r.count);
 return {rows,weekdays,pairs:[...pairs].sort((a,b)=>b[1]-a[1]),pendingDays,min:counts.length?Math.min(...counts):0,max:counts.length?Math.max(...counts):0,total:confirmed.length,active:active.length,openDays:state.days.filter(d=>d.kind==='school').length,plannedDays:state.days.filter(d=>assignments(state,d).some(a=>a.slot>0&&a.status!=='cancelled')).length};
}
export function exportCapacity(state,from,to){return Math.max(state.year.daily_count,...state.days.filter(d=>d.day>=from&&d.day<=to).map(d=>d.daily_count??state.year.daily_count));}
export function exportRows(state,from,to){const capacity=exportCapacity(state,from,to),display=a=>a?(state.roster.find(r=>r.id===a.student_id)?.display_name||a.name_snapshot):null;return range(from,to).map(value=>{const d=state.days.find(d=>d.day===value);if(!d)return [pretty(value),dayName(value),...Array(capacity).fill('—'),'—','Takvim dışında',''];const list=assignments(state,d);return [pretty(value),dayName(value),...Array.from({length:capacity},(_,i)=>{const a=list.find(a=>a.slot===i+1);return a?`${display(a)} (${a.status==='completed'&&a.completion_source==='automatic'?'Otomatik kabul':STATUS[statusOf(a,d,state.today)]})`:'—';}),display(list.find(a=>a.slot===0&&a.status!=='cancelled'))||'—',dayStatus(state,d),d.publication==='draft'?'TASLAK':'Yayımlandı'];});}
export function filename(state,from,to){return `NoTik_${state.year.class_name}_Nobet_${date(from)}_${date(to)}.xlsx`.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-');}

// Published weeks only; on weekends lead with the approaching school week.
export function parentWeeks(state){return [...new Set((state?.days||[]).filter(d=>d.publication!=='draft').map(d=>monday(d.day)))].sort();}
export function defaultParentWeek(state){const day=state?.today||today(),base=monday(day),target=weekday(day)===0||weekday(day)===6?addDays(base,7):base,weeks=parentWeeks(state);return weeks.find(w=>w>=target)||weeks.at(-1)||target;}
