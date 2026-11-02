import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENARIOS} from '../demo-web/assets/business-data.mjs';
import {draftFor,approveBusiness,newBusinessResult,validateBusiness,outputURL} from '../demo-web/assets/business-engine.mjs';
import {changeProbe,matchingAnswers,diffWords} from '../demo-web/assets/quality-core.mjs';
import {INSTRUCTION_LABELS,instructionLabel} from '../demo-web/assets/instruction-labels.mjs';
const catalog=JSON.parse(readFileSync(new URL('../demo-web/data/recorded-runs.json',import.meta.url)));
test('all business scenarios pass supported checks and catch an injected conflict without mutation',()=>{
 for(const workflow of Object.keys(SCENARIOS))for(const scenario of SCENARIOS[workflow]){
  const draft=draftFor(workflow,scenario.id),before=JSON.stringify(draft);
  assert(changeProbe({draft}).checks.every(c=>c.pass),workflow+':'+scenario.id);
  assert(changeProbe({draft},true).checks.some(c=>!c.pass),workflow+':'+scenario.id);
  assert.equal(JSON.stringify(draft),before);
 }
});
test('release source checks reject unsupported claims even for original plain-text answers',()=>{
 for(const record of catalog.records.filter(r=>r.case_id.startsWith('release-notes'))){
  const before=JSON.stringify(record);assert(changeProbe({record},true).checks.some(c=>!c.pass));assert.equal(JSON.stringify(record),before);
 }
});
test('model comparison never transfers scores to prepared or revised outputs',()=>{
 const r=catalog.records[0];assert.equal(matchingAnswers(catalog.records,r).length,4);assert.deepEqual(matchingAnswers(catalog.records,{...r,kind:'prepared_business_output'}),[]);assert.deepEqual(matchingAnswers(catalog.records,{...r,editorial_revision:2}),[]);assert.deepEqual(matchingAnswers(catalog.records,{...r,evidence:{different:true}}),[]);
});
test('quality probes leave approved artifacts and destination URLs valid',()=>{
 for(const workflow of Object.keys(SCENARIOS)){const scenario=SCENARIOS[workflow][0],result=approveBusiness(newBusinessResult(workflow,scenario.id,{})),before=JSON.stringify(result);changeProbe({draft:result.business_draft},true);validateBusiness(result);assert.equal(JSON.stringify(result),before);for(const[view]of result.business_draft.destinations)assert(outputURL(result,view).includes('view='+view));}
});
test('new instruction labels preserve stable saved configuration IDs',()=>{assert.equal(instructionLabel('luna-basic'),'What to produce');assert.equal(instructionLabel('sol-guided'),'What to produce + how to do it');assert.equal(Object.keys(INSTRUCTION_LABELS).length,2);});
test('diff reconstruction preserves empty, repeated and structured answer text',()=>{for(const[a,b]of [['',''],['a a b','a b b'],['quote:\n£32,000 pending','quote:\n£32,000 approved']]){const[l,r]=diffWords(a,b);assert.equal(l.map(x=>x[0]).join(''),a);assert.equal(r.map(x=>x[0]).join(''),b);}});
