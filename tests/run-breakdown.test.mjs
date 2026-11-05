import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {summariseRun} from '../demo-web/assets/run-breakdown.mjs';
const records=JSON.parse(readFileSync(new URL('../demo-web/data/recorded-runs.json',import.meta.url))).records;
const source=records.find(r=>r.id==='sol-guided--release-notes-1');
test('one original response retains its measured categories and dated estimated cost without promoting task coverage',()=>{
 const r=summariseRun(source);assert.equal(r.amount,.0069708);assert.equal(r.tokens,14835);assert.equal(r.input,2466);assert.equal(r.cached,12288);assert.equal(r.output,81);assert.equal(r.coverage,'Partial');assert.equal(r.wholeTaskCost,null);assert.equal(r.rateDate,'2026-10-28');
});
test('authored and replay-derived outputs cannot inherit a copied generation measurement',()=>{
 for(const kind of ['prepared_business_output','prepared_release_output'])assert.equal(summariseRun({...source,kind}).available,false);
 assert.equal(summariseRun({id:'new-output',usage:source.usage}).available,false);assert.equal(summariseRun(null).available,false);
});
test('invalid tokens are rejected and mismatched costs stay unavailable while supported tokens remain visible',()=>{
 assert.equal(summariseRun({...source,usage:{...source.usage,cached_input_tokens:999999}}).available,false);
 const wrong=structuredClone(source);wrong.estimated_cost.token_counts.output++;assert.equal(summariseRun(wrong).amount,null);assert.equal(summariseRun(wrong).tokens,14835);
 const total=structuredClone(source);total.estimated_cost.amount+=1;assert.equal(summariseRun(total).amount,null);
 assert.equal(summariseRun({...source,actual_model:'different-model'}).amount,null);
 const model=structuredClone(source);model.estimated_cost.model_basis='different';assert.equal(summariseRun(model).amount,null);
});
test('different model trials retain individual amounts and never become one multi-model task',()=>{
 const trials=records.filter(r=>r.case_id==='release-notes:1');assert.equal(trials.length,4);for(const r of trials){assert.equal(summariseRun(r).amount,r.estimated_cost.amount);assert.equal(summariseRun(r).wholeTaskCost,null);}
});
