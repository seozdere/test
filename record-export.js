function buildRecordExportRows(data,kind,context){
 const source=(kind==='homework'?data.records:data.classRecords)||{};
 const dates=Object.keys(source).sort();
 // Preserve records of names removed from the current roster as well.
 const names=[...new Set([...(data.students||[]),...dates.flatMap(date=>Object.keys(source[date]||{}))])];
 const header=['Sınıf','Ders','Dönem','Öğrenci Adı'];
 dates.forEach(date=>{const label=date.split('-').reverse().join('.');header.push(...(kind==='homework'?[label]:[label+' Olumlu',label+' Olumsuz',label+' Net']));});
 if(kind==='class')header.push('Toplam Olumlu','Toplam Olumsuz','Toplam Net');
 const labels={'1':'Tamam','-1':'Eksik','0':'Kitap Yok','2':'Yarım','3':'Gelmedi'};
 return [header,...names.map(name=>{const row=[context.className,context.subject,context.term,name];let positive=0,negative=0;
 dates.forEach(date=>{const value=source[date]?.[name];if(kind==='homework'){row.push(value===undefined||value===null?'İşaretlenmedi':labels[String(value)]??'Bilinmeyen kayıt');}else{const stats=getClassMarkStats(value);positive+=stats.pos;negative+=stats.neg;row.push(stats.pos,stats.neg,stats.pos-stats.neg);}});
 if(kind==='class')row.push(positive,negative,positive-negative);return row;})];
}
function recordExportCSV(rows){return '\ufeffsep=;\r\n'+rows.map(row=>row.map(value=>{let text=String(value??'');if(typeof value!=='number'&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(';')).join('\r\n');}
(()=>{
 const buttons=[document.getElementById('exportHomeworkBtn'),document.getElementById('exportClassBtn')],status=document.getElementById('recordExportStatus');
 async function download(kind){
 if(buttons.some(b=>b.disabled))return;
 const context={className:ClassLogData.currentClass,subjectId:ClassLogData.currentSubject,subject:SUBJECTS.find(s=>s.id===ClassLogData.currentSubject)?.label||ClassLogData.currentSubject,term:ClassLogData._activeTid()||'Varsayılan dönem'};
 const termId=ClassLogData._teacherTermId();buttons.forEach(b=>b.disabled=true);status.textContent='Güncel kayıtlar okunuyor…';
 try{
 const {data,error}=await _supabase.rpc('cl_get_teacher_view',{p_token:ClassLogAuth.getSessionToken(),p_class_name:context.className,p_subject_id:context.subjectId,p_term_id:termId});
 if(error||!data?.ok||!Array.isArray(data.students))throw Error();
 const rows=buildRecordExportRows(data,kind,context),blob=new Blob([recordExportCSV(rows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=('NoTik_'+context.className+'_'+context.subject+'_'+context.term+'_'+(kind==='homework'?'Odev':'Ders_ici')+'_'+new Date().toISOString().slice(0,10)+'.csv').replace(/[\\/:*?"<>|]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 status.textContent=context.className+' · '+context.subject+': tüm kayıtlı tarihler için Excel uyumlu CSV hazırlandı.';
 }catch(_){status.textContent='Güncel kayıtlar alınamadı; dosya oluşturulmadı.';}finally{buttons.forEach(b=>b.disabled=false);}
 }
 buttons[0].onclick=()=>download('homework');buttons[1].onclick=()=>download('class');
})();
