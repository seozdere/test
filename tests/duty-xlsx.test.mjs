import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {workbook} from '../duty-xlsx.mjs';
import {exportRows, dayStatus, filename} from '../duty-core.mjs';

// Test dependencies only; the production exporter has no package dependency.
const require = createRequire(import.meta.url);
function testDependency(name) {
  try { return require(name); } catch (error) {
    if (error.code!=='MODULE_NOT_FOUND') throw error;
    const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ||
      path.join(os.homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules');
    return require(path.join(modules,name));
  }
}
const JSZip = testDependency('jszip');
const {xml2js} = testDependency('xml-js');
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = cell => cell.is?.t?._text ?? '';

for (const capacity of [1,2,3]) {
  const state = {
    year:{class_name:'6/A',daily_count:capacity}, today:'2026-10-30',
    roster:[{id:'one',display_name:'=Çınar & <Öztürk>'}], exemptions:[],
    days:[
      {id:'monday',day:'2026-10-26',kind:'school',publication:'published',daily_count:capacity},
      {id:'holiday',day:'2026-10-29',kind:'holiday',publication:'published',daily_count:capacity,reason:'PRIVATE-REASON'},
      {id:'friday',day:'2026-10-30',kind:'school',publication:'draft',daily_count:capacity}
    ],
    assignments:[{id:'a',day_id:'monday',student_id:'one',slot:1,
      name_snapshot:'Eski ad',status:'completed',is_current:true,explanation:'PRIVATE-EXPLANATION'}]
  };
  const bytes = workbook(state,'2026-10-26','2026-11-01');
  const archive = await JSZip.loadAsync(bytes, {checkCRC32:true});
  const entries = Object.keys(archive.files).filter(n=>!archive.files[n].dir);
  assert.equal(entries.length,6);
  for (const entry of entries) {
    const xml = await archive.file(entry).async('string');
    assert.doesNotThrow(()=>xml2js(xml,{compact:true}), entry+' must be valid XML');
    assert(!xml.includes('PRIVATE-'), 'private reasons must not be exported');
  }
  const sheetSource = await archive.file('xl/worksheets/sheet1.xml').async('string');
  const sheet = xml2js(sheetSource,{compact:true}).worksheet;
  const rows = list(sheet.sheetData.row);
  assert.equal(rows.length,9,'title, headers, seven calendar days');
  assert.equal(list(rows[1].c).length,capacity+5);
  assert.match(text(rows[2].c[2]), /^=Çınar & <Öztürk> \(Tamamlandı\)$/);
  assert(!sheetSource.includes('Eski ad'),'export agrees with current displayed identity');
  for (const row of rows) for (const cell of list(row.c)) {
    assert.equal(cell._attributes.t,'inlineStr');
    assert(!cell.f,'student names are text, never spreadsheet formulas');
  }
  assert.equal(sheet.sheetViews.sheetView.pane._attributes.ySplit,'2');
  assert.equal(sheet.pageSetup._attributes.orientation,'landscape');
  assert.equal(sheet.pageSetup._attributes.paperSize,'9');
  const lastColumn = String.fromCharCode(65+capacity+4);
  assert.equal(sheet.dimension._attributes.ref,`A1:${lastColumn}9`);
  assert.equal(sheet.mergeCells.mergeCell._attributes.ref,`A1:${lastColumn}1`);
  assert.equal(text(rows[5].c[capacity+3]),'Tatil');
  assert.equal(text(rows[6].c[capacity+4]),'TASLAK');
  assert.match(filename(state,'2026-10-26','2026-11-01'),/^NoTik_6-A_Nobet_2026-10-26_2026-11-01\.xlsx$/);
}

// Changing the default must not change the meaning of a completed historic day.
const mixed = {
  year:{class_name:'Örnek',daily_count:1},today:'2026-10-30',roster:[],
  days:[{id:'past',day:'2026-10-26',daily_count:3,kind:'school',publication:'published'}],
  assignments:[1,2,3].map(slot=>({id:String(slot),student_id:String(slot),day_id:'past',
    slot,status:'completed',is_current:true,name_snapshot:'Öğrenci '+slot}))
};
assert.equal(dayStatus(mixed,mixed.days[0]),'Tamamlandı');
assert.equal(exportRows(mixed,'2026-10-26','2026-11-01')[0].length,8);
console.log('PASS XLSX: ZIP CRC, six OOXML parts, 1/2/3 slots, seven dates, privacy, Unicode, formula safety, capacity history');
