import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRelease,releaseDecisions} from '../demo-web/assets/release-quality.mjs';
import {releaseCopy,copyText} from '../demo-web/assets/release-copy.mjs';
const catalog=JSON.parse(readFileSync(new URL('../demo-web/data/recorded-runs.json',import.meta.url)));
const runs=catalog.records.filter(r=>r.case_id.startsWith('release-notes:'));
test('original release answers retain their source checks and remain unchanged',()=>{
 const before=JSON.stringify(runs);
 for(const r of runs){const a=assessRelease(r);assert.equal(a.ready,(r.revised_checks||r.original_checks).outcome==='Pass',r.id);}
 assert.equal(JSON.stringify(runs),before);
});
test('a pilot announcement cannot widen access to all customers',()=>{
 const r=structuredClone(runs.find(r=>r.case_id==='release-notes:2'&&r.configuration==='sol-guided'));
 r.answer=JSON.stringify({body:'CSV export now preserves the report column order. Open a report and choose Export. CSV export is available to the confirmed pilot groups. Available to all customers.'});
 const a=assessRelease(r);assert.equal(a.ready,false);assert.equal(a.checks.find(c=>c.id==='scope').pass,false);
});
test('missing rollout confirmation holds even a previously passing answer',()=>{
 const r=runs.find(r=>r.configuration==='sol-guided');
 assert.equal(assessRelease(r,{missingAvailability:true}).available,false);
 const missing=structuredClone(r);delete missing.evidence.sources['product-change'].content.availability_statement;
 assert.equal(assessRelease(missing).ready,false);
});
test('plain-text answer fails required format while source facts can still match',()=>{
 const a=assessRelease(runs.find(r=>r.id==='luna-basic--release-notes-2'));
 assert.equal(a.checks.find(c=>c.id==='format').pass,false);
 assert.ok(a.checks.filter(c=>c.id!=='format').every(c=>c.pass));
});
test('review decisions keep two PRs tied to one change and preserve pilot scope',()=>{
 const d=releaseDecisions(runs.find(r=>r.case_id==='release-notes:2'));
 assert.ok(d.some(x=>x.title==='One change, two PR references'));
 assert.ok(d.some(x=>x.title==='A wider launch claim'&&x.label==='Exclude'));
});
test('formatted release copy preserves the original source conditions',()=>{
 for(const record of runs){const value={...record,answer:JSON.stringify({body:copyText(releaseCopy(record))})};assert.ok(assessRelease(value).ready,record.id);}
});
