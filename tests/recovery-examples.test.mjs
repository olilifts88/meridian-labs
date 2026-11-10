import test from 'node:test';
import assert from 'node:assert/strict';
import {RECOVERY_EXAMPLES,preparedRecoveryExample,compareRecoveryEvidence} from '../demo-web/assets/recovery-examples.mjs';
import {indexedGuidance} from '../demo-web/assets/recovery-engine.mjs';
import {caseFor} from '../demo-web/assets/recovery-data.mjs';
test('worked examples retain their actual recovery and failure states',()=>{
 const expected={routine:'recovered',exception:'needs_specialist',reuse:'recovered',stale:'held_by_checks',confirmation:'needs_specialist',account:'needs_specialist',reopened:'reopened'};
 for(const[id]of RECOVERY_EXAMPLES){const {state,selected}=preparedRecoveryExample(id);assert.equal(state.cases[selected].status,expected[id],id);}
});
test('reuse depends on a resolved source and reopening withdraws the affected guide',()=>{
 const {state}=preparedRecoveryExample('reuse');assert.equal(state.cases.repeat.learning.state,'reused');assert.equal(state.knowledge.length,1);assert.equal(state.knowledge[0].sourceTicket,'REC-102');
 const reopened=preparedRecoveryExample('reopened');assert.equal(indexedGuidance(reopened.state,caseFor('repeat')),null);
});
test('missing confirmation and wrong-account evidence never publish a fix',()=>{
 for(const id of ['confirmation','account','stale']){const {state,selected}=preparedRecoveryExample(id);assert.equal(state.knowledge.length,0);assert(state.cases[selected].checks.some(c=>!c.pass));}
});
test('evidence comparisons preserve case identity and do not fabricate model measurements',()=>{
 for(const id of ['session','investigate','repeat']){const [missing,complete]=compareRecoveryEvidence(id);assert.equal(missing.result.caseId,id);assert.equal(complete.result.caseId,id);assert.notEqual(missing.result.status,'recovered');assert.equal(complete.result.status,'recovered');assert(missing.result.checks.some(c=>!c.pass));assert(complete.result.checks.every(c=>c.pass));assert.equal(missing.result.usage,undefined);}
});
test('loading another example cannot mutate an earlier snapshot',()=>{
 const prior=preparedRecoveryExample('reuse'),copy=structuredClone(prior);preparedRecoveryExample('reopened');assert.deepEqual(prior,copy);assert.throws(()=>preparedRecoveryExample('unknown'),/Unknown/);
});
