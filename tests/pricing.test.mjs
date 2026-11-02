import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {price,priceTask,validateCard} from '../demo-web/assets/pricing.mjs';
import {makePlan,calculatePlan,WORKFLOWS,refreshPrices} from '../demo-web/assets/workflow-routing.mjs';
const card=JSON.parse(readFileSync(new URL('../demo-web/data/rate-card.json',import.meta.url)));
const row={session_id:'s',response_id:'r',model:'gpt-6.1-terra',effort:'medium',input_tokens:12000,cached_input_tokens:4000,cache_write_input_tokens:7000,cache_write_30m_tokens:3000,cache_write_12h_tokens:4000,cache_write_semantics:'openai-input-subset-v1',output_tokens:1000,reasoning_output_tokens:700};
test('official mixed-cache example uses distinct reads and lifetimes',()=>assert.ok(Math.abs(price(row,card).amount-.01995)<1e-10));
test('reasoning is an output subset',()=>assert.equal(price(row,card).amount,price({...row,reasoning_output_tokens:0},card).amount));
test('context threshold applies per request including cached input',()=>{
 const a={...row,input_tokens:272000,cached_input_tokens:0,cache_write_input_tokens:0,output_tokens:1000};
 assert.equal(price(a,card).amount,.277);assert.ok(Math.abs(price({...a,input_tokens:272001},card).amount-.551502)<1e-10);
});
test('tier and region compose; unavailable combinations fail closed',()=>{
 assert.ok(Math.abs(price({...row,processing_tier:'batch',region:'regional'},card).amount-.01995*.55)<1e-10);
 assert.equal(price({...row,processing_tier:'ultrafast'},card).amount,null);
 assert.equal(price({...row,model:'gpt-6-sol',processing_tier:'fast',region:'regional'},card).amount,null);
});
test('missing categories, unsafe writes, negative or NaN inputs remain unpriced',()=>{
 for(const r of [{...row,input_tokens:NaN},{...row,input_tokens:-1},{...row,cache_write_semantics:null},{...row,reasoning_output_tokens:1001},{...row,output_tokens:undefined},{...row,cache_write_12h_tokens:1}])assert.equal(price(r,card).amount,null);
 assert.equal(price({...row,model:'new-model'},card).amount,null);
});
test('effort compatibility never creates an artificial price multiplier',()=>{
 assert.equal(price({...row,model:'gpt-6-astra',effort:'none'},card).amount,null);
 assert.equal(price({...row,effort:'high'},card).amount,price(row,card).amount);
});
test('deduplicated full-task costs include retries and preserve coverage',()=>{
 const retry={...row,response_id:'retry',role:'retry'};
 const task=priceTask([row,row,retry],card,{inventoryComplete:true});assert.equal(task.duplicates,1);assert.equal(task.coverage,'Complete');assert.equal(task.amount,2*price(row,card).amount);
 assert.equal(priceTask([row],card).amount,null);
 assert.throws(()=>priceTask([row,{...row,output_tokens:2}],card),/Conflicting/);
});
test('all five workflows have predetermined stages and five-model comparisons',()=>{
 validateCard(card);assert.equal(Object.keys(card.models).length,5);
 for(const id of Object.keys(WORKFLOWS)){const plan=makePlan(id,null,card);assert.equal(plan.stages.length,id==='call-crm'?8:4);assert.ok(calculatePlan(plan).amount>0);for(const m of Object.keys(card.models))assert.ok(calculatePlan({...plan,baseline_model:m}).baseline>0);}
});
test('missing evidence and code-only cases preserve gates and avoid model budgets',()=>{
 const hold=makePlan('questionnaire',{routing_preview:{action:'hold'}},card);assert.equal(hold.gate_state,'hold');assert.equal(hold.stages.filter(s=>s.enabled).length,1);
 const code=makePlan('vulnerabilities',{routing_preview:{action:'code'}},card);assert.equal(calculatePlan(code).amount,0);
});
test('failed official check never modifies a saved card',async()=>{
 const before=JSON.stringify(card);await assert.rejects(refreshPrices(card,async()=>{throw Error('Offline');}));assert.equal(JSON.stringify(card),before);
});
