import test from 'node:test';
import assert from 'node:assert/strict';
import {blankRecovery,runRecovery,resolveException,reopenRecovery,indexedGuidance,readRecovery,writeRecovery,recoveryResult,RECOVERY_KEY} from '../demo-web/assets/recovery-engine.mjs';
import {caseFor} from '../demo-web/assets/recovery-data.mjs';
import {saveResult,readResults} from '../demo-web/assets/visitor-results.mjs';
import {makePlan,calculatePlan} from '../demo-web/assets/workflow-routing.mjs';
import {readFileSync} from 'node:fs';
const storage=()=>{const data=new Map;return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const investigated=()=>resolveException(runRecovery(blankRecovery(),'investigate'),'investigate');
test('routine recovery requires task evidence and confirmation, then learns without a review click',()=>{
 const before=blankRecovery(),s=runRecovery(before,'session');assert.equal(s.cases.session.status,'recovered');assert.ok(s.cases.session.checks.every(c=>c.pass));assert.equal(s.knowledge.length,1);assert.equal(before.sequence,0);assert.deepEqual(runRecovery(s,'session'),s);
});
test('an unknown fix stays open; the next case cannot retrieve one early',()=>{
 let s=runRecovery(blankRecovery(),'investigate');assert.equal(s.cases.investigate.status,'needs_specialist');assert.equal(s.knowledge.length,0);s=runRecovery(s,'repeat');assert.equal(s.cases.repeat.status,'needs_specialist');assert.equal(indexedGuidance(s,caseFor('repeat')),null);
});
test('a verified technical fix is automatically indexed and reused without duplicate knowledge',()=>{
 let s=investigated();assert.equal(s.cases.investigate.status,'recovered');assert.equal(s.knowledge.length,1);assert.equal(s.knowledge[0].sourceTicket,'REC-102');s=runRecovery(s,'repeat');assert.equal(s.cases.repeat.status,'recovered');assert.equal(s.cases.repeat.learning.state,'reused');assert.equal(s.knowledge.length,1);assert.match(s.cases.repeat.reply,/REC-102/);assert.deepEqual(runRecovery(s,'repeat'),s);
});
test('stale sources, wrong-account recovery and missing confirmation never close or publish',()=>{
 for(const fault of ['stale_source','wrong_account','missing_confirmation']){const s=runRecovery(blankRecovery(),'session',{fault});assert.notEqual(s.cases.session.status,'recovered');assert.equal(s.knowledge.length,0);}
});
test('account-scoped retrieval cannot leak a learned guide into another account',()=>{
 const s=investigated();assert.equal(indexedGuidance(s,{...caseFor('repeat'),accountId:'other'}),null);
 const bad=structuredClone(s);bad.knowledge[0].accountId='other';assert.throws(()=>indexedGuidance(bad,caseFor('repeat')),/invalid/);
});
test('technical work alone is not recovery; unauthorised fixes are refused',()=>{
 const open=runRecovery(blankRecovery(),'investigate');assert.throws(()=>resolveException(open,'investigate',{approved:false}),/authorised/);const s=resolveException(open,'investigate',{customerConfirmed:false});assert.equal(s.cases.investigate.status,'needs_specialist');assert.equal(s.knowledge.length,0);assert.equal(resolveException(s,'investigate').knowledge.length,1);
});
test('reopening withdraws indexed guidance and cannot silently heal on rerun',()=>{
 const s=reopenRecovery(investigated(),'investigate');assert.equal(s.cases.investigate.status,'reopened');assert.equal(indexedGuidance(s,caseFor('repeat')),null);assert.deepEqual(runRecovery(s,'investigate'),s);assert.equal(runRecovery(s,'repeat').cases.repeat.status,'needs_specialist');
 let repeat=runRecovery(investigated(),'repeat');repeat=reopenRecovery(repeat,'repeat');assert.equal(indexedGuidance(repeat,caseFor('repeat')),null);
});
test('a failed recovery retest withdraws the previous learned fix',()=>{
 const s=runRecovery(investigated(),'investigate',{fault:'stale_source'});assert.equal(s.cases.investigate.status,'held_by_checks');assert.equal(indexedGuidance(s,caseFor('repeat')),null);
});
test('stored state is checked; failed writes do not return successful saves',()=>{
 const db=storage(),s=investigated();writeRecovery(db,s);assert.deepEqual(readRecovery(db),s);db.setItem(RECOVERY_KEY,'broken');assert.throws(()=>readRecovery(db));assert.throws(()=>writeRecovery({setItem(){throw Error('quota');}},s),/quota/);assert.throws(()=>writeRecovery({setItem(){},getItem(){return null;}},s),/confirm/);
});
test('snapshot integrates with shared result history and retains zero-call provenance',()=>{
 const db=storage(),s=investigated(),card=JSON.parse(readFileSync(new URL('../demo-web/data/rate-card.json',import.meta.url))),plan=makePlan('customer-recovery',null,card),result=recoveryResult(s,'investigate',plan);saveResult(db,result);assert.deepEqual(readResults(db)[0],result);assert.equal(plan.gate_state,'automatic_checks');assert.ok(calculatePlan(plan).amount>0);assert.equal(result.execution.model_calls,0);assert.equal(result.execution.external_writes,false);s.cases.investigate.status='reopened';assert.equal(result.recovery_snapshot.cases.investigate.status,'recovered');
});
