import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {approvePublication,validatePublication,findPublication,publicationUrl} from '../demo-web/assets/release-publication.mjs';
import {releaseCopy,copyText} from '../demo-web/assets/release-copy.mjs';
import {assessRelease} from '../demo-web/assets/release-quality.mjs';
import {saveResult,readResults} from '../demo-web/assets/visitor-results.mjs';
function approved(){const value=JSON.parse(readFileSync(new URL('../demo-web/data/scenarios/sol-guided--release-notes-2--approve.json',import.meta.url)));value.id='scenario-publication-test';return value;}
function storage(){const rows=new Map();return {getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)};}
test('approval creates a source-bound release and survives saving/readback',()=>{
 const source=approved(),before=JSON.stringify(source),release=approvePublication(source),store=storage();
 saveResult(store,release);assert.equal(validatePublication(readResults(store)[0]).publication.approved_body,JSON.parse(source.record.answer).body);
 assert.equal(JSON.stringify(source),before);assert.equal(release.publication.destination,publicationUrl(release));
});
test('pending, rejected and unsuccessful checks cannot publish',()=>{
 for(const mutate of [r=>r.review_choice='pending',r=>r.review_choice='reject',r=>r.fresh_checks.outcome='Needs improvement',r=>r.outcome.actions[0].human_approved=false,r=>r.outcome.actions[0].state='pending']){
  const r=approved();mutate(r);assert.throws(()=>approvePublication(r));
 }
 const invalid=approved();invalid.record.answer='Plain text without the required format.';assert.throws(()=>approvePublication(invalid));
});
test('changing the approved answer or source invalidates the publication',()=>{
 const a=approvePublication(approved());a.record.answer=JSON.stringify({body:'A different draft'});assert.throws(()=>validatePublication(a));
 const b=approvePublication(approved());b.record.evidence.as_of='2026-11-02';assert.throws(()=>validatePublication(b));
 const c=approvePublication(approved());c.publication.approved_body='Changed copy';assert.throws(()=>validatePublication(c));
});
test('repeat approval finds the same publication, with no duplicate save',()=>{
 const release=approvePublication(approved()),store=storage();saveResult(store,release);saveResult(store,release);
 const existing=findPublication(readResults(store),approved().record);assert.equal(existing.id,release.id);assert.equal(readResults(store).length,1);
 const changed=approved().record;changed.evidence.as_of='2026-11-02';assert.equal(findPublication(readResults(store),changed),null);
});
test('failed storage cannot produce a readable publication',()=>{
 const store={getItem:()=>null,setItem:()=>{throw Error('storage unavailable');}};
 assert.throws(()=>saveResult(store,approvePublication(approved())),/storage unavailable/);assert.equal(readResults(store).length,0);
});
test('a publication cannot be rebound to another session or lose approval',()=>{
 const r=approvePublication(approved());r.id='scenario-other';assert.throws(()=>validatePublication(r));
 const s=approvePublication(approved());s.review_choice='reject';assert.throws(()=>validatePublication(s));
});
test('the published copy is bound to the exact approved layout and wording',()=>{
 const r=approvePublication(approved());r.publication.copy.lead+=' Extra promise.';assert.throws(()=>validatePublication(r));
});

test('prepared editorial revisions retain source gates and publish changed action steps',()=>{
 const original=structuredClone(approved().record);original.kind='prepared_release_output';original.editorial_revision=2;
 const copy=releaseCopy(original);assert(copy.sections.some(s=>s.steps?.length));
 original.answer=JSON.stringify({body:copyText(copy)});
 const value=approved();value.record=original;value.source_run_id=original.id;
 assert.doesNotThrow(()=>validatePublication(approvePublication(value)));
 const bad=structuredClone(original);bad.editorial_issue='missing-action';bad.editorial_revision=1;bad.answer=JSON.stringify({body:copyText(releaseCopy(bad))});
 assert.equal(assessRelease(bad).ready,false);
});
