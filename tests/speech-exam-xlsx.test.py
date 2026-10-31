"""Validate downloaded OOXML using synthetic exams, without network or app data."""
import base64
import io
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
WIDTHS = [23.125, 5.75, 8.25, 8.25, 5.75, 8.25, 10.75, 8.25, 8.25, 8.25, 10.75, 3.25, 11]
script = r'''
import {workbook, examFilename} from './speech-exam-xlsx.mjs';
import {RUBRIC} from './speech-exam-core.mjs';
const output=[];
for(const count of [0,1,35,70]) {
 const students=Array.from({length:count},(_,i)=>({id:`id-${i}`,name:i===0?'=HYPERLINK("https://invalid.example")':`Örnek Öğrenci ${count-i}`}));
 const exam={className:'7İ',date:'2024-02-29',subjectId:'turkce',termId:'example',rubric:RUBRIC,students,results:{}};
 for(const [i,s] of students.entries()) if(i%3!==2) exam.results[s.id]={scores:i%3===0?Array(10).fill(10):[1,2,3,4,5,6,7,8,9,null]};
 const before=JSON.stringify(exam);
 const bytes=workbook(exam);
 if(JSON.stringify(exam)!==before) throw Error('Export mutated exam');
 output.push({count,name:examFilename(exam),bytes:Buffer.from(bytes).toString('base64'),criteria:RUBRIC.criteria,students,results:exam.results});
}
console.log(JSON.stringify(output));
'''
result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, check=True, capture_output=True)
for case in json.loads(result.stdout):
    assert case['name'] == '7İ Konuşma Sınavı  29.02.2024.xlsx'
    with zipfile.ZipFile(io.BytesIO(base64.b64decode(case['bytes']))) as archive:
        assert archive.testzip() is None
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        styles = ET.fromstring(archive.read('xl/styles.xml'))
        assert not sheet.findall('.//m:f', NS), 'Names must never become formulas'
        rows = sheet.findall('m:sheetData/m:row', NS)
        assert len(rows) == case['count'] + 1
        assert sheet.find('m:dimension', NS).get('ref') == f"A1:M{len(rows)}"
        assert sheet.find('m:autoFilter', NS).get('ref') == f"A1:M{len(rows)}"
        assert [float(c.get('width')) for c in sheet.find('m:cols', NS)] == WIDTHS
        assert rows[0].get('ht') == '150'
        assert sheet.find('m:sheetFormatPr', NS).get('defaultRowHeight') == '14.25'
        assert sheet.find('m:sheetViews/m:sheetView', NS).get('zoomScale') == '70'
        assert sheet.find('m:sheetViews/m:sheetView/m:pane', NS).get('state') == 'frozen'
        assert sheet.find('m:pageSetup', NS).attrib == {'paperSize': '9', 'orientation': 'landscape'}
        alignments = [x.find('m:alignment', NS).attrib for x in styles.find('m:cellXfs', NS)]
        assert alignments[2] == {'horizontal':'left', 'textRotation':'90', 'wrapText':'1'}
        assert alignments[3] == {'horizontal':'center', 'vertical':'center', 'wrapText':'1'}
        headers = [''.join(c.find('m:is', NS).itertext()) for c in rows[0]]
        assert headers == ['Öğrenci', *case['criteria'], 'Toplam puan', 'Tamamlanma']
        for i, row in enumerate(rows[1:]):
            cells = list(row)
            assert len(cells) == 13
            assert ''.join(cells[0].find('m:is', NS).itertext()) == case['students'][i]['name']
            expected = case['results'].get(case['students'][i]['id'], {}).get('scores', [None]*10)
            for cell, value in zip(cells[1:11], expected):
                v = cell.find('m:v', NS)
                assert (None if v is None else int(v.text)) == value
                assert cell.get('s') == '3'
            v = cells[11].find('m:v', NS)
            complete = all(v is not None for v in expected)
            assert (None if v is None else int(v.text)) == (sum(expected) if complete else None)
            assert ''.join(cells[12].find('m:is', NS).itertext()) == ('Tamamlandı' if complete else 'Eksik')
print('PASS: template layout, 0/1/35/70 students, roster/score association, blanks, totals, Turkish filename/date, formula-safe names, no source mutation')
