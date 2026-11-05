import {template} from './exam-entry-template.mjs';
import {zip} from './speech-exam-xlsx.mjs?v=studentno-20261104';
const escape=value=>String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function entryRows(exam){
 return exam.students.map(student=>{
  const scores=exam.results[student.id]?.scores;
  const complete=Array.isArray(scores)&&scores.length===10&&scores.every(n=>Number.isInteger(n)&&n>=1&&n<=10);
  const listening=exam.listeningScores?.[student.id];
  return [student.name,complete?scores.reduce((a,b)=>a+b,0):null,Number.isInteger(listening)&&listening>=0&&listening<=100?listening:null];
 });
}
export function entryWorkbook(exam){
 const rows=entryRows(exam),last=Math.max(2,rows.length+1),files={...template};
 const textCell=(ref,style,value)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
 let cells='<row r="1" spans="1:5" ht="54.75" customHeight="1">'+['No','Öğrenci','Yazılı Sınav','Dinleme Sınavı','Konuşma Sınavı'].map((v,i)=>textCell('ABCDE'[i]+'1',i<2?1:2,v)).join('')+'</row>';
 cells+=(rows.length?rows:[['',null,null]]).map(([name,score,listening],i)=>{const r=i+2;return `<row r="${r}" spans="1:5" ht="15">${textCell('A'+r,3,exam.studentNumbers?.[exam.students[i]?.id]??'')}${textCell('B'+r,2,name)}<c r="C${r}" s="2"/><c r="D${r}" s="3">${listening===null?'':`<v>${listening}</v>`}</c><c r="E${r}" s="3">${score===null?'':`<v>${score}</v>`}</c></row>`;}).join('');
 files['xl/worksheets/sheet1.xml']=files['xl/worksheets/sheet1.xml'].replace('{{ROWS}}',cells).replaceAll('A1:D36',`A1:E${last}`);
 files['xl/tables/table1.xml']=files['xl/tables/table1.xml'].replaceAll('A1:D36',`B1:E${last}`);
 files['xl/worksheets/sheet1.xml']=files['xl/worksheets/sheet1.xml'].replace(/<cols>[\s\S]*?<\/cols>/,`<cols>${[5.625,26.625,14.125,15,16].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`);
 files['xl/styles.xml']=files['xl/styles.xml'].replace('<cellXfs count="3">','<cellXfs count="4">').replace('</cellXfs>','<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>');
 for(const [name,value] of Object.entries(files))if(typeof value==='object')files[name]=Uint8Array.from(atob(value.base64),c=>c.charCodeAt(0));
 return zip(files);
}
export function entryFilename(exam){return `${exam.className} Sınav Girişi ${exam.date}.xlsx`.replace(/[<>:"/\\|?*]/g,'-');}
export function downloadEntry(exam){
 const url=URL.createObjectURL(new Blob([entryWorkbook(exam)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const a=document.createElement('a');a.href=url;a.download=entryFilename(exam);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
