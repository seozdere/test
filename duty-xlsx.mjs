import {referenceStyles,referenceCols,referenceMargins} from './duty-week-template.mjs?v=duty-week-template-20261101';
// Independent duty XLSX export, reusing the project's small ZIP/OOXML technique.
import {exportRows,exportCapacity,filename,pretty,addDays,assignments,dayName,weekday,KIND} from './duty-core.mjs?v=duty-background-20261102';
const encoder = new TextEncoder();
const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ -1) >>> 0;
}
function concat(parts) { const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }
function zip(files) {
  const local = [], central = []; let offset = 0;
  for (const [name, source] of Object.entries(files)) {
    const filename = encoder.encode(name), data = encoder.encode(source), crc = crc32(data);
    const header = new Uint8Array(30), h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint16(12, 33, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, filename.length, true);
    const directory = new Uint8Array(46), d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x800, true); d.setUint16(14, 33, true);
    d.setUint32(16, crc, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, filename.length, true); d.setUint32(42, offset, true);
    local.push(header, filename, data); central.push(directory, filename); offset += header.length + filename.length + data.length;
  }
  const directory = concat(central), end = new Uint8Array(22), e = new DataView(end.buffer), count = Object.keys(files).length;
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, count, true); e.setUint16(10, count, true); e.setUint32(12, directory.length, true); e.setUint32(16, offset, true);
  return concat([...local, directory, end]);
}
function column(index) { let result = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result; return result; }

export function workbook(state,from,to,period='week'){
 const title=state.year.class_name+' · Nöbetçi Öğrenciler · '+pretty(from)+' – '+pretty(to);
 const headers=['Tarih','Gün',...Array.from({length:exportCapacity(state,from,to)},(_,i)=>(i+1)+'. Nöbetçi'),'Yedek','Gün durumu','Yayın'];
 const schoolDates=new Set(state.days.filter(d=>d.kind==='school'&&![0,6].includes(weekday(d.day))).map(d=>d.day));
 const exported=exportRows(state,from,to).filter((row,i)=>period!=='week'||schoolDates.has(addDays(from,i)));
 const rows=[[title],headers,...exported];const last=column(headers.length-1),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const sheet=rows.map((row,y)=>'<row r="'+(y+1)+'" ht="'+(y===0?32:y===1?26:48)+'" customHeight="1">'+row.map((v,x)=>'<c r="'+column(x)+(y+1)+'" s="'+(y<2?1:0)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>').join('')+'</row>').join('');
 const files={
 '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+(period==='month'?'Aylık Nöbet':'Haftalık Nöbet')+'" sheetId="1" r:id="rId1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
 'xl/styles.xml':'<styleSheet xmlns="'+ns+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4EEDD"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
 'xl/worksheets/sheet1.xml':'<worksheet xmlns="'+ns+'"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:'+last+rows.length+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>'+headers.map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(i<2?18:27)+'" customWidth="1"/>').join('')+'</cols><sheetData>'+sheet+'</sheetData><mergeCells count="1"><mergeCell ref="A1:'+last+'1"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="'+(period==='month'?0:1)+'"/></worksheet>'
 };
 weeklyReferenceLayout(files,state,from,to,period);
 return zip(files);
}
export function downloadDuty(state,from,to,period='week'){const blob=new Blob([workbook(state,from,to,period)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename(state,from,to,period);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function weeklyReferenceLayout(files,state,from,to,period='week'){
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const short=d=>d.split('-').reverse().join('.');
 const sheetName=period==='month'?'Aylık Nöbet':'Haftalık Nöbet';
 const subtitle=period==='month'?new Intl.DateTimeFormat('tr-TR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(from+'T12:00:00Z')).toLocaleUpperCase('tr-TR'):short(from)+' – '+short(to);
 const rows=[[state.year.class_name+' SINIFI NÖBET LİSTESİ'],[subtitle],['TARİH','GÜN','NÖBETÇİLER']];
 const name=a=>state.roster.find(r=>r.id===a.student_id)?.display_name||a.name_snapshot||'—';
 for(const d of state.days.filter(d=>d.day>=from&&d.day<=to&&d.kind==='school'&&![0,6].includes(weekday(d.day))).sort((a,b)=>a.day.localeCompare(b.day))){
  const list=assignments(state,d).filter(a=>!['cancelled','not_completed'].includes(a.status)),reserve=list.find(a=>a.slot===0);
  rows.push([short(d.day),dayName(d.day),d.publication==='draft'?'Henüz yayımlanmadı':(list.filter(a=>a.slot>0).map(name).join(' – ')||'Görevli belirlenmedi')+(reserve?'\nYedek: '+name(reserve):'')]);
 }
 if(rows.length===3)rows.push(['','',period==='month'?'Bu ay için uygun nöbet günü yok.':'Bu hafta için uygun nöbet günü yok.']);
 const sheet=rows.map((row,y)=>`<row r="${y+1}" ht="${y===0?42:y===1?27.95:y===2?33:40.5}" customHeight="1">${row.map((v,x)=>`<c r="${column(x)}${y+1}" s="${y===0?1:y===1?8:y===2?5:(y%2?2:5)+x}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
 files['xl/styles.xml']=referenceStyles;
 files['xl/workbook.xml']=files['xl/workbook.xml'].replace('</workbook>',`<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'${sheetName}'!$A$1:$C$${rows.length}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName}'!$1:$3</definedName></definedNames></workbook>`);
 files['xl/worksheets/sheet1.xml']=`<worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:C${rows.length}"/><sheetViews><sheetView showGridLines="0" zoomScale="55" zoomScaleNormal="55" workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="33"/>${referenceCols}<sheetData>${sheet}</sheetData><mergeCells count="2"><mergeCell ref="A1:C1"/><mergeCell ref="A2:C2"/></mergeCells><printOptions horizontalCentered="1"/>${referenceMargins}<pageSetup paperSize="9" fitToWidth="1" fitToHeight="0" orientation="portrait"/></worksheet>`;
}
