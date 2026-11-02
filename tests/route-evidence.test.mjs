import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {routeEvidence} from '../demo-web/assets/route-evidence.mjs';
const records=JSON.parse(readFileSync(new URL('../demo-web/data/recorded-runs.json',import.meta.url))).records;
test('recommendation evidence uses matched original guided outputs, never revised judgments',()=>{
 const e=routeEvidence(records);assert.equal(e.cases,10);assert.deepEqual(e.rows.map(r=>r.passed),[7,9]);assert.equal(e.rows[0].median_ms,3311.8355);assert.equal(e.rows[1].median_ms,6818.1955);
 const changed=structuredClone(records);for(const r of changed)r.revised_checks={outcome:'Pass',criteria:[]};assert.deepEqual(routeEvidence(changed).rows.map(r=>r.passed),[7,9]);
});
test('mismatched sources, authored outputs and ambiguous duplicate model answers do not count',()=>{
 const pair=records.filter(r=>r.case_id==='call-crm:1'&&r.configuration.endsWith('-guided'));assert.equal(routeEvidence(pair).cases,1);
 const mismatch=structuredClone(pair);mismatch[0].evidence.extra='Different input';assert.equal(routeEvidence(mismatch).cases,0);
 assert.equal(routeEvidence([...pair,{...pair[0],id:'ambiguous'}]).cases,0);
 assert.equal(routeEvidence(pair.map(r=>({...r,kind:'prepared_business_output'}))).cases,0);
 assert.equal(routeEvidence([...pair,...pair]).cases,1);
});
test('missing cost or time stays unavailable rather than becoming zero',()=>{
 const pair=structuredClone(records.filter(r=>r.case_id==='call-crm:1'&&r.configuration.endsWith('-guided')));pair[0].generation_duration_ms=null;pair[0].estimated_cost=null;
 const e=routeEvidence(pair),row=e.rows.find(r=>r.model===pair[0].requested_model);assert.equal(row.median_ms,null);assert.equal(row.median_cost,null);
});
