import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {blankDelivery,transitionDelivery,visibleDelivery,saveDelivery,readDelivery} from '../demo-web/assets/delivery-engine.mjs';
import {createDeliveryServer} from '../scripts/delivery-sandbox.mjs';

const step=(s,type,extra={},actor='owner')=>transitionDelivery(s,{type,expectedRevision:s.revision,runId:s.runs.at(-1)?.id,...extra},{actor,now:'2026-11-03T12:00:00Z'});
const prepared=()=>step(blankDelivery(),'prepare',{caseId:'bd-pilot'});
test('supported changes commit, read back, retain pending budget and record real code receipts',()=>{
 let s=step(prepared(),'approve');s=step(s,'apply');const r=s.runs.at(-1);
 assert.equal(r.status,'confirmed');assert.equal(s.accounts['Northstar Analytics'].stage,'Pilot agreed');
 assert.equal(s.accounts['Northstar Analytics'].approvedAnnualValue,null);
 assert.equal(s.requests['Northstar Analytics:budget'].status,'Finance approval pending');
 assert.equal(Object.keys(s.issues).length,1);assert.equal(Object.keys(s.receipts).length,1);
 assert.equal(r.adapter.mode,'prepared_response');assert.equal(r.adapter.actualModel,null);
 assert.ok(r.executions.every(e=>e.compute_ms>=0&&e.model_calls===0));
});
test('uncommitted interest cannot become a pilot',()=>{
 let s=step(blankDelivery(),'prepare',{caseId:'bd-interest'});s=step(s,'approve');s=step(s,'apply');assert.equal(s.accounts['Harbour Systems'].stage,'Discovery');assert.equal(Object.keys(s.issues).length,0);
});
test('wrong-account evidence and unsupported budget both block approval and writes',()=>{
 for(const fault of ['wrong_account','unsupported_budget']){
  let s=step(prepared(),fault);s=step(s,'approve');s=step(s,'apply');assert.equal(s.runs.at(-1).status,'held');assert.equal(Object.keys(s.receipts).length,0);assert.equal(s.accounts['Northstar Analytics'].stage,'Technical review');
 }
});
test('read-only personas cannot approve or execute even with an existing owner approval',()=>{
 let s=step(prepared(),'approve');s=step(s,'apply',{},'engineer');assert.equal(s.runs.at(-1).status,'held');assert.equal(Object.keys(s.receipts).length,0);
 s=step(s,'approve',{},'finance');assert.equal(s.runs.at(-1).status,'held');
});
test('changed proposal and stale account revision invalidate prior approval',()=>{
 let s=step(prepared(),'approve');s=step(s,'change_after_approval');s=step(s,'apply');assert.equal(s.runs.at(-1).status,'held');
 let q=step(prepared(),'approve');q.accounts['Northstar Analytics'].revision++;q=step(q,'apply');assert.equal(q.runs.at(-1).status,'held');assert.equal(Object.keys(q.receipts).length,0);
});
test('lost acknowledgement and repeated action cannot create duplicate commits or issues',()=>{
 let s=step(prepared(),'approve');s=step(s,'apply',{fault:'after_commit'});assert.equal(s.runs.at(-1).status,'needs_readback');
 s=step(s,'apply');s=step(s,'apply');assert.equal(s.runs.at(-1).status,'confirmed');assert.equal(Object.keys(s.receipts).length,1);assert.equal(Object.keys(s.issues).length,1);assert.equal(s.accounts['Northstar Analytics'].revision,1);
});
test('interruption before commit leaves all destination records unchanged and retries safely',()=>{
 let s=step(prepared(),'approve');s=step(s,'apply',{fault:'before_commit'});assert.equal(Object.keys(s.receipts).length,0);assert.equal(Object.keys(s.issues).length,0);
 s=step(s,'apply');assert.equal(s.runs.at(-1).status,'confirmed');assert.equal(Object.keys(s.receipts).length,1);
});
test('stale workspace commands cannot overwrite a newer state',()=>{
 const s=prepared();assert.throws(()=>transitionDelivery(s,{type:'approve',runId:s.runs[0].id,expectedRevision:0}),/workspace changed/);
});
test('a persona view excludes another account, its proposals, receipts and requests',()=>{
 let s=step(blankDelivery(),'prepare',{caseId:'bd-interest'});s=step(s,'approve');s=step(s,'apply');s=step(s,'prepare',{caseId:'bd-pilot'});
 const view=visibleDelivery(s,'engineer');assert.equal(view.runs.length,1);assert.equal(view.runs[0].account,'Northstar Analytics');assert.equal(view.accounts['Harbour Systems'],undefined);assert.equal(Object.keys(view.receipts).length,0);
});
test('browser persistence verifies exact saved state; failed storage is not accepted',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};const s=prepared();saveDelivery(storage,s);assert.deepEqual(readDelivery(storage),s);
 assert.throws(()=>saveDelivery({setItem(){},getItem(){return null;}},s),/could not be confirmed/);
});
test('loopback writer enforces origin, session persona, durable readback and revision conflicts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'delivery-test-')),file=join(dir,'state.json');const server=await createDeliveryServer({port:0,stateFile:file});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;let cookie;
 const get=async()=>{const response=await fetch(base+'/api/delivery/state',{headers:cookie?{cookie}:{}});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return response.json();};
 const post=async(path,data,origin=base)=>{const response=await fetch(base+'/api/delivery/'+path,{method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(data)});cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;return {status:response.status,value:await response.json()};};
 try{
  let reply=await get();assert.equal(reply.runtime.surface,'loopback_node_server');assert.equal(reply.runtime.model_adapter.liveCalls,false);
  assert.equal((await post('command',{type:'prepare',caseId:'bd-pilot',expectedRevision:0},'https://another.example')).status,403);
  reply=(await post('command',{type:'prepare',caseId:'bd-pilot',expectedRevision:0})).value;const id=reply.state.runs[0].id;
  await post('persona',{actor:'engineer'});
  reply=(await post('command',{type:'approve',runId:id,expectedRevision:reply.state.revision,actor:'owner'})).value;assert.equal(reply.state.runs[0].status,'held');
  await post('persona',{actor:'owner'});
  reply=(await post('command',{type:'approve',runId:id,expectedRevision:reply.state.revision})).value;
  // A failed persistence operation must not mutate the authoritative workspace.
  await mkdir(file+'.tmp');const failed=await post('command',{type:'apply',runId:id,expectedRevision:reply.state.revision});assert.equal(failed.status,409);assert.equal(Object.keys(failed.value.state.receipts).length,0);await rm(file+'.tmp',{recursive:true});
  reply=(await post('command',{type:'apply',runId:id,expectedRevision:reply.state.revision})).value;
  const disk=JSON.parse(await readFile(file,'utf8'));assert.equal(disk.accounts['Northstar Analytics'].stage,'Pilot agreed');assert.equal(reply.state.receipts[id].after.stage,'Pilot agreed');
  assert.equal((await post('command',{type:'apply',runId:id,expectedRevision:0})).status,409);
  assert.equal((await fetch(base+'/../.git/config')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
