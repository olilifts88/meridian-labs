import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRecords,validateChange,traceFor,diffWords} from '../demo-web/preview/quality-model.mjs';
const catalog=JSON.parse(readFileSync(new URL('../demo-web/data/recorded-runs.json',import.meta.url)));
test('preview compares only identical cases and instruction styles',()=>{
 for(const id of ['call-crm:1','call-crm:2','release-notes:1','release-notes:2']){const rows=compareRecords(catalog.records,id);assert.equal(rows.length,2);assert(rows.every(r=>r.case_id===id&&r.configuration.endsWith('-guided')));}
});
test('source checks catch injected claims without mutating the saved answers',()=>{
 for(const record of catalog.records.filter(r=>r.configuration==='sol-guided'&&/^(call-crm|release-notes):/.test(r.case_id))){const before=JSON.stringify(record);assert(validateChange(record,false).checks.every(c=>c.pass),record.id);assert(validateChange(record,true).checks.some(c=>!c.pass),record.id);assert.equal(JSON.stringify(record),before);}
});
test('transcript trace has five destinations, rejoins for review, and preserves tentative budget',()=>{
 const r=catalog.records.find(r=>r.id==='sol-guided--call-crm-2'),trace=traceFor(r);assert.equal(trace.length,8);assert.equal(new Set(trace.slice(1,6).map(n=>n.destination)).size,5);assert.equal(trace[6].id,'review');assert.match(trace.find(n=>n.id==='revenue').output,/Procurement approval pending/);assert.match(trace.find(n=>n.id==='engineering').output,/No new issue/);
});
test('word differences preserve both answers exactly',()=>{const [a,b]=diffWords('pilot customers only','all customers now');assert.equal(a.map(x=>x[0]).join(''),'pilot customers only');assert.equal(b.map(x=>x[0]).join(''),'all customers now');assert(a.some(x=>x[1]));assert(b.some(x=>x[1]));});
