import {draftFor,checksFor} from './business-engine.mjs';
import {TRANSCRIPTS} from './business-data.mjs';
import {prepareDelivery} from './delivery-adapter.mjs';

export const STORAGE_KEY='meridian.delivery-sandbox.v1';
export const PERSONAS={
 owner:{name:'Alex · business owner',accounts:['Northstar Analytics','Harbour Systems'],actions:['review','write']},
 engineer:{name:'Casey · Engineering',accounts:['Northstar Analytics'],actions:['read']},
 finance:{name:'Priya · Finance',accounts:['Northstar Analytics'],actions:['read']}
};
const copy=x=>structuredClone(x);
const fingerprint=r=>JSON.stringify({sourceAccount:r.sourceAccount,draft:r.draft});
const snapshot=d=>{const x=copy(d);delete x.reviewer_note;return JSON.stringify(x);};
export function blankDelivery(){return {schema:1,revision:0,sequence:0,runs:[],accounts:{},issues:{},requests:{},receipts:{}};}
export function validateDelivery(s){
 if(!s||s.schema!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isSafeInteger(s.sequence)||!Array.isArray(s.runs)||s.runs.length>200||!s.accounts||!s.issues||!s.requests||!s.receipts)throw Error('This sandbox state could not be read. Keep a copy before resetting.');
 for(const r of s.runs)if(!r.id||!Array.isArray(r.trace)||!TRANSCRIPTS.some(t=>t.id===r.caseId)||!r.draft)throw Error('Invalid saved workflow run.');
 return s;
}
export function readDelivery(storage){const raw=storage.getItem(STORAGE_KEY);return raw===null?blankDelivery():validateDelivery(JSON.parse(raw));}
export function saveDelivery(storage,s){validateDelivery(s);const text=JSON.stringify(s);storage.setItem(STORAGE_KEY,text);if(storage.getItem(STORAGE_KEY)!==text)throw Error('Save could not be confirmed.');return s;}
export function visibleDelivery(s,actor){
 const allowed=PERSONAS[actor]?.accounts||[],view=copy(s);view.runs=view.runs.filter(r=>allowed.includes(r.account));
 view.accounts=Object.fromEntries(Object.entries(view.accounts).filter(([key])=>allowed.includes(key)));
 for(const field of ['issues','requests'])view[field]=Object.fromEntries(Object.entries(view[field]).filter(([,v])=>allowed.includes(v.account)));
 const ids=new Set(view.runs.map(r=>r.id));view.receipts=Object.fromEntries(Object.entries(view.receipts).filter(([key])=>ids.has(key)));return view;
}
function event(s,r,step,status,detail,data={}){r.trace.push({sequence:++s.sequence,step,status,detail,...copy(data)});}
export function policyFor(r,actor,action){
 const persona=PERSONAS[actor];const canonical=draftFor('call-crm',r.caseId,{revised:r.draft.revision===2,issue:r.draft.issue});
 const sourceChecks=checksFor(r.draft);
 return [
  {name:'Account scope',pass:!!persona?.accounts.includes(r.account)&&r.sourceAccount===r.account,reason:'The selected persona and source must belong to this account.'},
  {name:'Action permission',pass:!!persona?.actions.includes(action),reason:action==='write'?'Only the business-owner demo persona can apply account changes.':'Only the business-owner demo persona can approve this workflow.'},
  {name:'Source and output integrity',pass:snapshot(canonical)===snapshot(r.draft),reason:'The prepared output must retain the canonical source-supported values.'},
  ...sourceChecks.map(c=>({name:c.label,pass:c.pass,reason:c.detail}))
 ];
}
export function deliveryStats(s){return {runs:s.runs.length,confirmed:s.runs.filter(r=>r.status==='confirmed').length,held:s.runs.filter(r=>r.status==='held').length,awaiting:s.runs.filter(r=>r.status==='prepared'||r.status==='approved').length,commits:Object.keys(s.receipts).length,denied:s.runs.reduce((n,r)=>n+r.trace.filter(e=>e.status==='blocked').length,0)};}
export function transitionDelivery(state,command,{actor='owner',now=new Date().toISOString(),surface='browser'}={}){
 const started=performance.now();
 validateDelivery(state);
 if(!PERSONAS[actor])throw Error('Unknown demo persona.');
 if(!command||typeof command!=='object'||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision!==state.revision)throw Error('The workspace changed. Refresh before retrying; no update was applied.');
 const s=copy(state);const kind=command.type;
 if(kind==='prepare'){
  if(s.runs.length>=200)throw Error('This sandbox is full. Export the evidence before starting another workspace.');
  if(!['bd-pilot','bd-interest'].includes(command.caseId))throw Error('Choose a supported customer conversation.');
  const prepared=prepareDelivery(command.caseId),draft=prepared.draft,account=draft.transcript.account;
  if(!PERSONAS[actor].accounts.includes(account))throw Error('This demo persona cannot read that account.');
  s.accounts[account]??={account,revision:0,stage:draft.transcript.stage[0],requestedSeats:null,indicativeBudget:null,approvedAnnualValue:null};
  const r={id:'RUN-'+(++s.sequence),caseId:command.caseId,account,sourceAccount:account,createdAt:now,draft,status:'prepared',approval:null,trace:[],executions:[],adapter:prepared.execution,before:copy(s.accounts[account])};
  s.runs.push(r);
  event(s,r,'sources','passed','Loaded the conversation and existing account.',{account,sourceCount:draft.sources.length});
  event(s,r,'proposals','prepared','Prepared proposals from the fictional scenario. No model was called.',{mode:'prepared_response',outputs:['Account changes','Engineering signal','Finance request']});
  event(s,r,'checks','passed','Source checks computed for this proposal.',{checks:checksFor(draft)});
 }else{
  const r=s.runs.find(r=>r.id===command.runId);if(!r)throw Error('Prepare a workflow first.');
  if(!PERSONAS[actor].accounts.includes(r.account))throw Error('This demo persona cannot read that account.');
  if(kind==='approve'){
   if(s.receipts[r.id])throw Error('This run already has a commit receipt. Verify the saved result instead.');
   const checks=policyFor(r,actor,'review');r.checks=checks;
   if(checks.some(c=>!c.pass)){r.status='held';event(s,r,'approval','blocked',checks.find(c=>!c.pass).reason,{actor,checks});}
   else{r.approval={actor,at:now,fingerprint:fingerprint(r),accountRevision:s.accounts[r.account].revision};r.status='approved';event(s,r,'approval','approved','Approved this exact proposal and account revision.',{actor,accountRevision:r.approval.accountRevision});}
  }else if(kind==='apply'){
   const checks=policyFor(r,actor,'write');r.checks=checks;
   if(checks.some(c=>!c.pass)){r.status='held';event(s,r,'write','blocked',checks.find(c=>!c.pass).reason,{actor,checks});}
   else if(s.receipts[r.id]){r.status='confirmed';r.after=copy(s.receipts[r.id].after);event(s,r,'readback','confirmed','Existing commit receipt found. No second write was made.',{receipt:s.receipts[r.id].id,duplicatePrevented:true});}
   else if(!r.approval||r.approval.fingerprint!==fingerprint(r)){r.status='held';event(s,r,'write','blocked','The proposal changed or has not been approved. Review it again.',{actor});}
   else if(r.approval.accountRevision!==s.accounts[r.account].revision){r.status='held';event(s,r,'write','blocked','The account changed after approval. Prepare a fresh proposal.',{actor});}
   else if(command.fault==='before_commit'){r.status='approved';event(s,r,'write','interrupted','Simulated interruption before commit. No records were changed.');}
   else{
    const before=copy(s.accounts[r.account]),after=copy(before),t=r.draft.transcript;
    if(t.stage)after.stage=t.stage[1];if(t.seats)after.requestedSeats=t.seats;
    if(t.budget)after.indicativeBudget={amount:t.budget,status:'Finance approval pending'};
    after.revision++;
    const issue=r.draft.issueRecord;
    if(issue){const key=r.account+':export';const previous=s.issues[key];s.issues[key]={id:previous?.id||'SIGNAL-'+(Object.keys(s.issues).length+1),account:r.account,title:issue.title,owner:'Reporting Engineering',status:'Needs triage',sourceCases:[...new Set([...(previous?.sourceCases||[]),r.caseId])],source:issue.source};}
    if(t.budget)s.requests[r.account+':budget']={account:r.account,amount:t.budget,status:'Finance approval pending',owner:'Finance',source:'T-2'};
    s.accounts[r.account]=after;r.after=copy(after);
    const receipt={id:'COMMIT-'+(++s.sequence),runId:r.id,at:now,actor,before,after:copy(after),approval:copy(r.approval)};s.receipts[r.id]=receipt;
    event(s,r,'write','committed','Sandbox records committed together. The indicative budget remains pending.',{receipt:receipt.id,actor});
    r.status=command.fault==='after_commit'?'needs_readback':'confirmed';
    if(command.fault==='after_commit')event(s,r,'readback','interrupted','Simulated lost acknowledgement after commit. Retry to find the existing receipt.');
    else event(s,r,'readback','confirmed','The saved account matches the approved values.',{receipt:receipt.id,accountRevision:after.revision});
   }
  }else if(kind==='wrong_account'||kind==='unsupported_budget'||kind==='change_after_approval'){
   if(s.receipts[r.id])throw Error('Prepare a new run before testing a failure.');
   if(kind==='wrong_account')r.sourceAccount='Another account';
   else if(kind==='unsupported_budget'){const row=r.draft.rows.find(x=>x.field==='Indicative annual budget');if(!row)throw Error('This case has no budget.');row.status='Approved annual value';}
   else {if(!r.approval)throw Error('Approve the proposal before testing a changed proposal.');r.draft.reviewer_note='A change made after approval';}
   r.status='prepared';event(s,r,'checks','changed','Loaded an explicit demonstration failure; records are unchanged.',{test:kind});
  }else throw Error('Unsupported sandbox command.');
 }
 const touched=kind==='prepare'?s.runs.at(-1):s.runs.find(r=>r.id===command.runId);
 touched.executions??=[];touched.executions.push({command:kind,actor,surface,at:now,policy:'delivery-policy-v1',compute_ms:Math.max(0,performance.now()-started),measurement:'Reducer compute only; excludes network and persistence.',model_calls:0,model_usage:null});
 s.revision++;return validateDelivery(s);
}
