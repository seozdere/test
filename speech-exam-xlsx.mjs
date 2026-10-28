// Small, lazy-loaded OOXML writer: ZIP/store, explicit string cells, no formulas.
// No third-party runtime or CDN request. Null cells remain empty in real XLSX.
import {exportRows} from './speech-exam-core.mjs?v=speech-xlsx-template-20261028-r1';
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
export function workbook(exam) {
  // Match the supplied classroom template. Keep the exam's roster order and
  // ID-based score lookup; the source workbook's student data is never bundled.
  const rows = exportRows(exam).map(row => [row[1], ...row.slice(5, 16), row[17]]);
  const cells = rows.map((row, y) => `<row r="${y + 1}"${y === 0 ? ' ht="150" customHeight="1"' : ''}>${row.map((value, x) => {
    const ref = `${column(x)}${y + 1}`, style = y === 0 ? (x === 0 ? 1 : 2) : (x > 0 && x < 12 ? 3 : 0);
    if (value === null || value === undefined) return `<c r="${ref}" s="${style}"/>`;
    return typeof value === 'number' ? `<c r="${ref}" s="${style}"><v>${value}</v></c>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  return zip({
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Konuşma Sınavı" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Plus Jakarta Sans"/></font><font><b/><sz val="11"/><name val="Plus Jakarta Sans"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" textRotation="90" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${ns}"><dimension ref="A1:M${rows.length}"/><sheetViews><sheetView workbookViewId="0" zoomScale="70" zoomScaleNormal="70"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="14.25"/><cols>${[23.125,5.75,8.25,8.25,5.75,8.25,10.75,8.25,8.25,8.25,10.75,3.25,11].map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" bestFit="1" customWidth="1"/>`).join('')}</cols><sheetData>${cells}</sheetData><autoFilter ref="A1:M${rows.length}"/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape"/></worksheet>`
  });
}
export function examFilename(exam) {
  // The saved exam date, never today's date or the currently selected class.
  const date = String(exam.date).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1');
  return `${exam.className} Konuşma Sınavı  ${date}.xlsx`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
}
export function downloadExam(exam) {
  const blob = new Blob([workbook(exam)], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = examFilename(exam);
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
