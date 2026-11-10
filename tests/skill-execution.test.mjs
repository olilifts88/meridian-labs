import test from 'node:test';
import assert from 'node:assert/strict';
import {SourceRegister,ExecutionBudget,toolData} from '../scripts/skill-execution.mjs';

test('mapped aliases resolve private external content without assuming GitHub',()=>{
  const r=new SourceRegister([{id:'presentation',aliases:['Voice Ops','Sierra shorthand'],location:'https://example.test/notes',method:'supported browser',access:'private'}]);
  assert.equal(r.resolve('SIERRA   shorthand').source.method,'supported browser');
  assert.equal(r.resolve('Sierra shorthand').freshness,'requires-current-read');
  assert.equal(r.resolve('unrelated').status,'unmapped');
});
test('ambiguous and retired mappings cannot silently become a source answer',()=>{
  const r=new SourceRegister([{id:'one',aliases:['notes'],location:'a',method:'fetch'},{id:'two',aliases:['notes'],location:'b',method:'fetch'},{id:'old',location:'c',method:'fetch',retired:true}]);
  assert.equal(r.resolve('notes').status,'ambiguous');assert.equal(r.resolve('old').status,'retired');
});
test('conflicting duplicate source IDs are rejected before lookup',()=>{
  assert.throws(()=>new SourceRegister([{id:'a',location:'one',method:'fetch'},{id:'a',location:'two',method:'fetch'}]),/Duplicate source id/);
});
test('duplicate task reads reuse data; revisions and invalidation force freshness',async()=>{
  const b=new ExecutionBudget();let called=0;const request={tool:'fetch',args:{id:'a'},revision:'r1',invoke:async()=>++called};
  await b.read(request);assert.equal((await b.read(request)).reused,true);
  await b.read({...request,revision:'r2'});b.invalidateReads();await b.read(request);assert.equal(called,3);
});
test('failed reads count but are not cached',async()=>{
  const b=new ExecutionBudget();const request={tool:'fetch',args:{id:'a'},invoke:async()=>({isError:true})};
  await assert.rejects(b.read(request));await assert.rejects(b.read(request));assert.equal(b.checkpoint().calls,2);
});
test('equivalent request objects do not cause a second source read',async()=>{
  const b=new ExecutionBudget();let reads=0;const invoke=async()=>++reads;
  await b.read({tool:'fetch',args:{id:'a',ref:'r'},invoke});
  await b.read({tool:'fetch',args:{ref:'r',id:'a'},invoke});assert.equal(reads,1);
});
test('underlying calls count even inside one orchestration batch and preserve readback',()=>{
  const b=new ExecutionBudget({target:2,cap:4,reserve:1});
  for(let i=0;i<3;i++)b.charge({tool:'fetch',purpose:'source'});
  assert.throws(()=>b.charge({tool:'fetch',purpose:'source'}));
  b.charge({tool:'fetch',purpose:'readback',verification:true});
  assert.throws(()=>b.charge({tool:'fetch',purpose:'readback',verification:true}));assert.equal(b.checkpoint().calls,4);
});
test('two negative searches change strategy; pagination never implies completion',()=>{
  const b=new ExecutionBudget();assert.equal(b.recordSearch({matches:0}),'continue');
  assert.equal(b.recordSearch({matches:0}),'change-source-or-stop');
  assert.throws(()=>b.checkpoint({complete:true,missing:['next page']}));assert.equal(b.checkpoint({missing:['next page']}).complete,false);
});
test('write/readback executes once and completed retries are no-ops',async()=>{
  const b=new ExecutionBudget();let mutations=0,reads=0;
  const request={identity:'task:result',tool:'update',args:{},invoke:async()=>{mutations++;return {id:'saved'};},verify:async()=>{reads++;return true;}};
  await b.write(request);assert.equal((await b.write(request)).reused,true);assert.equal(mutations,1);assert.equal(reads,1);assert.equal(b.checkpoint().calls,2);
});
test('lost write acknowledgment blocks a second mutation',async()=>{
  const b=new ExecutionBudget();let mutations=0;
  const request={identity:'a',tool:'update',args:{},invoke:async()=>{mutations++;throw Error('connection lost');},verify:async()=>true};
  await assert.rejects(b.write(request));await assert.rejects(b.write(request),/Uncertain write/);assert.equal(mutations,1);
});
test('uncertain mutations invalidate old reads before reconciliation',async()=>{
  const b=new ExecutionBudget();let value='before',reads=0;
  const request={tool:'fetch',args:{id:'a'},invoke:async()=>{reads++;return value;}};
  await b.read(request);
  await assert.rejects(b.write({identity:'a',tool:'update',args:{},invoke:async()=>{value='after';throw Error('lost acknowledgment');},verify:async()=>true}));
  assert.equal((await b.read(request)).value,'after');assert.equal(reads,2);
});
test('readback mismatch retains uncertain state',async()=>{
  const b=new ExecutionBudget();const r={identity:'a',tool:'update',args:{},invoke:async()=>({id:'a'}),verify:async()=>false};
  await assert.rejects(b.write(r),/Readback mismatch/);await assert.rejects(b.write(r),/Uncertain write/);
});
test('structured result wins over display text, empty success is distinct from errors',()=>{
  assert.deepEqual(toolData({structuredContent:{results:[]},content:[{type:'text',text:'{}'}]}),{results:[]});
  assert.deepEqual(toolData({content:[{type:'text',text:'{"results":[1]}'}]}),{results:[1]});
  assert.throws(()=>toolData({isError:true,structuredContent:{results:[]}}));
});
test('null structured data falls back to the actual JSON text response',()=>{
  assert.deepEqual(toolData({structuredContent:null,content:[{type:'text',text:'{"pages":[{"id":"a"}]}'}]}),{pages:[{id:'a'}]});
});
test('a known lookup can read current notes and save/readback in three task calls',async()=>{
  const b=new ExecutionBudget();const r=new SourceRegister([{id:'notes',aliases:['short script'],location:'notes-id',method:'fetch'}]);
  const source=r.resolve('short script').source;
  const result=await b.read({tool:source.method,args:{id:source.location},invoke:async()=>({revision:'r2',variant:'shorthand',text:'fixture script'})});
  await b.write({identity:'fixture:notes:r2',tool:'save',args:result.value,invoke:async v=>v,verify:async receipt=>receipt.revision==='r2'&&receipt.variant==='shorthand'});
  assert.equal(b.checkpoint({complete:true}).calls,3);
});
