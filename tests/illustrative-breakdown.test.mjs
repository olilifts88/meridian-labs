import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {makePlan,calculatePlan,WORKFLOWS} from '../demo-web/assets/workflow-routing.mjs';
import {illustrateRun} from '../demo-web/assets/run-breakdown.mjs';
const card=JSON.parse(readFileSync(new URL('../demo-web/data/rate-card.json',import.meta.url)));
for(const workflow of Object.keys(WORKFLOWS))test(workflow+' breakdown uses every enabled step and the shared calculator',()=>{
 const plan=makePlan(workflow,null,card),before=JSON.stringify(plan),run=illustrateRun(plan);
 assert.equal(run.illustrative,true);assert.equal(run.amount,calculatePlan(plan).amount);assert.equal(run.calls.length,plan.stages.filter(s=>s.enabled).length);assert.equal(run.models.reduce((n,m)=>n+m.calls,0),run.calls.length);assert.equal(run.models.reduce((n,m)=>n+m.tokens,0),run.tokens);assert(Math.abs(run.models.reduce((n,m)=>n+m.amount,0)-run.amount)<1e-10);assert.equal(JSON.stringify(plan),before);
});
test('model choice, budgets, retries and disabled calls update the same illustrative execution',()=>{
 const p=makePlan('release-notes',null,card),base=illustrateRun(p);p.stages[0].model='gpt-6-luna';assert.notEqual(illustrateRun(p).amount,base.amount);
 p.stages.push({...p.stages[1],id:'retry-1',name:'Retry',role:'retry'});assert.equal(illustrateRun(p).calls.length,5);p.stages[0].enabled=false;assert.equal(illustrateRun(p).calls.length,4);
 for(const stage of p.stages)stage.enabled=false;assert.equal(illustrateRun(p).amount,0);assert.equal(illustrateRun(p).calls.length,0);assert.equal(illustrateRun(p).models.length,0);
});
test('saved snapshots stay stable and invalid prices cannot become fabricated totals',()=>{
 const p=makePlan('release-notes',null,card),saved=structuredClone(p);p.stages[0].input_tokens+=100;assert.notEqual(illustrateRun(p).amount,illustrateRun(saved).amount);saved.stages[0].model='unknown';assert.equal(illustrateRun(saved).amount,null);assert.equal(illustrateRun(null),null);
});
