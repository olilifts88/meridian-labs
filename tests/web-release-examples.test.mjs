import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXTRA_RELEASE_CASES,EXTRA_RELEASE_RECORDS,preparedReleaseResult} from '../demo-web/assets/release-examples.mjs';
import {assessRelease} from '../demo-web/assets/release-quality.mjs';
import {approvePublication,validatePublication,releasePRContext} from '../demo-web/assets/release-publication.mjs';
import {saveResult,readResults} from '../demo-web/assets/visitor-results.mjs';
test('new bug-fix and breaking-change cases have distinct approved destinations',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 for(const record of EXTRA_RELEASE_RECORDS){const scenario=EXTRA_RELEASE_CASES.find(c=>c.id===record.case_id);assert.ok(assessRelease(record).ready);const result=approvePublication(preparedReleaseResult(record,scenario,'approve'));saveResult(storage,result);assert.equal(validatePublication(result).publication.title,record.evidence.sources['product-change'].content.release_title);assert.equal(releasePRContext(record).length,2);assert.equal(result.execution.model_calls,0);assert.equal(result.benchmark_contribution,false);assert.equal(record.requested_model,null);}
 assert.equal(readResults(storage).length,2);assert.notEqual(readResults(storage)[0].publication.title,readResults(storage)[1].publication.title);
});
test('breaking-change output must retain migration date and asynchronous response',()=>{
 const record=structuredClone(EXTRA_RELEASE_RECORDS.find(r=>r.case_id.endsWith('export-api-v2'))),body=JSON.parse(record.answer);
 body.body=body.body.replace('API v1 keeps its current behaviour until 1 February 2027.','');record.answer=JSON.stringify(body);assert.equal(assessRelease(record).ready,false);assert.throws(()=>preparedReleaseResult(record,EXTRA_RELEASE_CASES[1],'approve'));
});
test('API-v2 audience cannot become a general customer rollout',()=>{
 const record=structuredClone(EXTRA_RELEASE_RECORDS[1]),body=JSON.parse(record.answer);body.body+=' Available to all customers.';record.answer=JSON.stringify(body);assert.equal(assessRelease(record).checks.find(c=>c.id==='scope').pass,false);
});
