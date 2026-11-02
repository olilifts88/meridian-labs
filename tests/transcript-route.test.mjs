import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {draftFor,newBusinessResult,approveBusiness,validateBusiness} from '../demo-web/assets/business-engine.mjs';
import {transcriptBranches,renderTranscriptRoute} from '../demo-web/assets/transcript-route.mjs';
import {makePlan,calculatePlan} from '../demo-web/assets/workflow-routing.mjs';
import {price} from '../demo-web/assets/pricing.mjs';
const card=JSON.parse(readFileSync(new URL('../demo-web/data/rate-card.json',import.meta.url)));
test('historical four-stage routes fall back without rewriting their saved budget',()=>{
 const old=makePlan('questionnaire',null,card);old.workflow='call-crm';
 const before=structuredClone(old);
 assert.equal(renderTranscriptRoute(null,old,{draft:draftFor('call-crm','bd-pilot')}),false);
 assert.deepEqual(old,before);
});
test('no-action transcript paths cannot invent account, engineering or pricing work',()=>{
 const interest=transcriptBranches(draftFor('call-crm','bd-interest'));
 assert.equal(interest.find(b=>b.key==='engineering').status,'No issue reported');
 assert.equal(interest.find(b=>b.key==='engineering').records.length,0);
 assert.equal(interest.find(b=>b.key==='revenue').records.find(r=>r.label==='Indicative annual budget').value,'Not supplied');
 const internal=transcriptBranches(draftFor('call-crm','internal-planning'));
 assert.equal(internal.find(b=>b.key==='crm').status,'No account change');
 assert.equal(internal.find(b=>b.key==='revenue').status,'No pricing request');
});
test('repeat engineering reports link one existing issue and retain the exact supporting quote',()=>{
 const d=draftFor('call-crm','delivery-review'),b=transcriptBranches(d).find(b=>b.key==='engineering');
 assert.equal(b.status,'Link existing issue');assert.equal(b.records.length,1);assert.match(b.records[0].label,/ENG-142/);
 assert.deepEqual(b.sources,[d.sources.find(s=>s.id===d.issueRecord.source)]);
});
test('branch views flag commercial and commitment conflicts, then reflect supported correction',()=>{
 for(const id of ['bd-pilot','bd-interest']){
  const bad=transcriptBranches(draftFor('call-crm',id,{issue:true}));
  assert.equal(bad.find(b=>b.key==='crm').status,'Needs correction');
  const fixed=transcriptBranches(draftFor('call-crm',id,{issue:true,revised:true}));
  assert(fixed.every(b=>b.status!=='Needs correction'));
 }
});
test('branch budgets, shared review, formatting and retries are all counted once',()=>{
 const p=makePlan('call-crm',null,card),base=calculatePlan(p);
 assert.equal(new Set(p.stages.map(s=>s.route_part)).size,8);
 assert.equal(p.stages.find(s=>s.role==='verification').route_part,'review');
 assert(p.stages.every(s=>Number.isFinite(s.input_tokens)&&Number.isFinite(s.output_tokens)));
 const branch=p.stages.find(s=>s.route_part==='revenue'),before=base.rows.find(r=>r.id===branch.id).estimate.amount;
 branch.enabled=false;assert(Math.abs(calculatePlan(p).amount-(base.amount-before))<1e-12);
 branch.enabled=true;branch.output_tokens+=1000;
 const now=calculatePlan(p);assert(now.amount>base.amount);assert(now.baseline>base.baseline);
 const retry={...p.stages.find(s=>s.role==='verification'),id:'retry-8',role:'retry',route_part:'retry'};
 p.stages.push(retry);assert(Math.abs(calculatePlan(p).amount-now.amount-price(retry,card).amount)<1e-12);
});
test('saved branching route survives approval without replacing its budget snapshot',()=>{
 const p=makePlan('call-crm',null,card);p.stages[2].input_tokens=12345;
 const r=newBusinessResult('call-crm','bd-pilot',p),a=validateBusiness(approveBusiness(r));
 assert.deepEqual(a.routing_plan,p);p.stages[2].input_tokens=1;
 assert.equal(a.routing_plan.stages[2].input_tokens,12345);
});
