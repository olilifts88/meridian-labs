import {REVISION,CASES,BASE_GUIDANCE,TECHNICAL_FIX,ALLOWED_ACTIONS,caseFor} from './recovery-data.mjs';
export const RECOVERY_KEY='meridian.customer-recovery.v1';
const clone=value=>structuredClone(value);
const key=c=>c.accountId+':'+c.symptom;
const states=['needs_specialist','held_by_checks','recovered','reopened'];
export function blankRecovery(){return {schema:1,revision:REVISION,sequence:0,cases:{},knowledge:[],events:[]};}
export function validateRecovery(value){
  if(!value||value.schema!==1||value.revision!==REVISION||!Number.isSafeInteger(value.sequence)||value.sequence<0||
     !value.cases||Array.isArray(value.cases)||typeof value.cases!=='object'||!Array.isArray(value.knowledge)||!Array.isArray(value.events))throw Error('The saved recovery demo could not be read. Download or reset this demo before continuing.');
  for(const [id,c]of Object.entries(value.cases))if(!CASES.some(x=>x.id===id)||c.caseId!==id||!states.includes(c.status)||!Array.isArray(c.checks)||!Array.isArray(c.timeline))throw Error('The saved recovery case is invalid.');
  const ids=new Set;
  for(const g of value.knowledge){if(ids.has(g.id)||!g.id||!['active','withdrawn'].includes(g.status)||!Number.isSafeInteger(g.version)||g.version<1||!CASES.some(c=>c.id===g.sourceCase)||typeof g.steps!=='string'||typeof g.approved!=='boolean'||typeof g.current!=='boolean'||!CASES.some(c=>c.id===g.sourceCase&&g.key===key(c)&&g.accountId===c.accountId&&g.symptom===c.symptom)||!ALLOWED_ACTIONS.includes(g.action))throw Error('The saved guidance is invalid.');ids.add(g.id);}
  return value;
}
export function readRecovery(storage){const raw=storage.getItem(RECOVERY_KEY);return raw===null?blankRecovery():validateRecovery(JSON.parse(raw));}
export function writeRecovery(storage,state){validateRecovery(state);const raw=JSON.stringify(state);storage.setItem(RECOVERY_KEY,raw);if(storage.getItem(RECOVERY_KEY)!==raw)throw Error('The browser could not confirm this save.');return state;}
export function indexedGuidance(state,c){
  validateRecovery(state);
  // The index is derived from current versioned records; withdrawn entries cannot be retrieved.
  const matches=state.knowledge.filter(g=>g.key===key(c)&&g.status==='active'&&g.accountId===c.accountId&&g.approved&&g.current);
  return clone(matches.sort((a,b)=>b.version-a.version)[0]||((BASE_GUIDANCE.accountId===c.accountId&&BASE_GUIDANCE.symptom===c.symptom)?BASE_GUIDANCE:null));
}
function event(state,c,type,detail){const item={id:++state.sequence,caseId:c.caseId,type,detail};state.events.push(item);c.timeline.push(clone(item));}
export function recoveryChecks(c,evidence){return [
  {label:'Evidence belongs to this account',pass:evidence?.account===c.accountId,detail:'The account on the logs must match the support case.'},
  {label:'Authentication succeeded',pass:evidence?.authentication===true,detail:'A sign-in event alone is not proof of useful recovery.'},
  {label:'Correct workspace is accessible',pass:evidence?.workspace===true,detail:'Existing authorised access must reach the intended workspace.'},
  {label:'Blocked task can be completed',pass:evidence?.task===true,detail:'The example includes a successful attempt at the blocked task.'},
  {label:'Customer confirmed recovery',pass:evidence?.customerConfirmed===true,detail:'A closed ticket cannot substitute for customer confirmation.'}
];}
function promote(state,result,c,guidance,evidence){
  if(result.status!=='recovered'||!recoveryChecks(c,evidence).every(x=>x.pass)||!guidance?.approved||!guidance.current||
     guidance.accountId!==c.accountId||guidance.symptom!==c.symptom||!ALLOWED_ACTIONS.includes(guidance.action))throw Error('Recovery and approved, scoped guidance are required before learning.');
  const existing=state.knowledge.find(x=>x.key===key(c)&&x.status==='active'&&x.action===guidance.action&&x.steps===guidance.steps);
  if(existing){result.learning={state:'reused',id:existing.id,version:existing.version};event(state,result,'learning','Reused guidance '+existing.id+'; no duplicate knowledge record.');return;}
  const version=Math.max(0,...state.knowledge.filter(x=>x.key===key(c)).map(x=>x.version))+1;
  for(const old of state.knowledge.filter(x=>x.key===key(c)&&x.status==='active'))old.status='withdrawn';
  const id='KNOW-'+c.symptom+'-'+version;
  const entry={id,key:key(c),version,accountId:c.accountId,symptom:c.symptom,action:guidance.action,steps:guidance.steps,
    approved:true,current:true,status:'active',sourceCase:c.id,sourceTicket:c.ticket};
  state.knowledge.push(entry);result.learning={state:'published',id,version};
  event(state,result,'learning','Validated guidance '+id+' saved and added to the account-scoped search index.');
}
export function runRecovery(state,id,{fault='none'}={}){
  validateRecovery(state);if(!['none','stale_source','missing_confirmation','wrong_account'].includes(fault))throw Error('Unknown evidence test.');
  const next=clone(state),c=caseFor(id);if(next.cases[id]?.status==='reopened')return next;
  const guidance=indexedGuidance(next,c),signature=JSON.stringify({revision:REVISION,id,fault,guidance});
  const prior=next.cases[id];if((prior?.status==='recovered'&&fault==='none')||prior?.signature===signature)return next;
  if(prior?.status==='recovered')for(const g of next.knowledge)if(g.sourceCase===id||g.id===prior.guidance?.id){g.status='withdrawn';g.current=false;}
  const result={caseId:id,ticket:c.ticket,status:'needs_specialist',signature,source:clone(c),guidance,reply:c.reply,checks:[],timeline:[],learning:{state:'not_ready'},recovery:null};
  if(fault==='stale_source'){result.source.evidence.current=false;result.source.context='The account diagnostics are stale. Fresh evidence is required before troubleshooting.';}
  next.cases[id]=result;
  event(next,result,'context','Read the fictional ticket, account membership and current diagnostics.');
  result.checks.push({label:'Current account context',pass:c.evidence.account===c.accountId&&c.evidence.membership&&c.evidence.current&&fault!=='stale_source',detail:'Stale context is held before any troubleshooting is offered.'});
  result.checks.push({label:'Guidance is approved and in scope',pass:!!guidance&&guidance.approved&&guidance.current&&guidance.accountId===c.accountId&&ALLOWED_ACTIONS.includes(guidance.action),detail:'Only approved non-privileged troubleshooting is allowed. Missing guidance needs investigation.'});
  if(!result.checks[0].pass){result.status='held_by_checks';result.reply='I need current account evidence before I can suggest a next step.';event(next,result,'hold','Source check failed. No guidance published and no case closure.');return next;}
  if(!result.checks[1].pass){event(next,result,'exception','No approved fix matches. Keep this case open with its evidence for technical investigation.');return next;}
  if(guidance.sourceTicket)result.reply='A checked fix from '+guidance.sourceTicket+' is available: '+guidance.steps;
  event(next,result,'route','Routine guidance uses the smaller-model plan; difficult reasoning is reserved for the stronger route. This run uses a prepared response.');
  event(next,result,'guidance','Source and action checks passed. Offered '+guidance.id+' without a routine human approval.');
  const evidence=clone(c.recovery);if(fault==='missing_confirmation')evidence.customerConfirmed=false;if(fault==='wrong_account')evidence.account='another-account';
  result.recovery=evidence;result.checks.push(...recoveryChecks(c,evidence));
  if(!recoveryChecks(c,evidence).every(x=>x.pass)){event(next,result,'exception','Recovery is unconfirmed. Keep the case open and do not learn an approved fix.');return next;}
  result.status='recovered';event(next,result,'recovery','Customer confirmation and task/access evidence agree. Recovery is confirmed in this example.');
  promote(next,result,c,guidance,evidence);return next;
}
export function resolveException(state,id,{approved=true,customerConfirmed=true}={}){
  validateRecovery(state);const next=clone(state),result=next.cases[id],c=caseFor(id);
  if(!result||result.status!=='needs_specialist'||id!==TECHNICAL_FIX.caseId)throw Error('Run the investigation case before applying its prepared technical fix.');
  const fix={...clone(TECHNICAL_FIX),current:true,approved};
  if(!approved||fix.accountId!==c.accountId||!ALLOWED_ACTIONS.includes(fix.action))throw Error('The technical fix must be authorised and within the allowed scope.');
  const evidence={...clone(fix.recovery),customerConfirmed};
  result.guidance={...fix,id:'TECH-FIX-1',version:1};result.reply='The workspace switcher now opens the existing Cedar workspace. No membership or permissions were changed.';result.recovery=evidence;
  result.checks=result.checks.filter(x=>!recoveryChecks(c,{}).some(y=>y.label===x.label));
  result.checks[1]={label:'Guidance is approved and in scope',pass:true,detail:'The fictional technical responder approved the tested, non-privileged workspace-selection fix.'};
  result.checks.push(...recoveryChecks(c,evidence));event(next,result,'technical',fix.diagnosis);
  if(!recoveryChecks(c,evidence).every(x=>x.pass)){event(next,result,'exception','Technical work finished, but customer recovery is still unconfirmed.');return next;}
  result.status='recovered';event(next,result,'recovery','The same case now contains the technical diagnosis and confirmed customer recovery.');promote(next,result,c,fix,evidence);return next;
}
export function reopenRecovery(state,id){
  validateRecovery(state);const next=clone(state),result=next.cases[id];if(!result||result.status!=='recovered')throw Error('Only a recovered case can be reopened.');
  result.status='reopened';result.learning={state:'withdrawn'};
  for(const g of next.knowledge)if(g.sourceCase===id||g.id===result.guidance?.id){g.status='withdrawn';g.current=false;}
  event(next,result,'reopen','Customer is still blocked. Reopened the case and removed affected learned guidance from the search index.');return next;
}
export function recoveryResult(state,id,plan){
  validateRecovery(state);const r=state.cases[id],c=caseFor(id);if(!r)throw Error('Run a case before saving a result.');
  const record={id:'prepared-recovery-'+id,kind:'prepared_recovery_output',answer:JSON.stringify(r),evidence:{sources:r.source},usage:null,
    provenance:{kind:'authored_recovery_scenario',revision:REVISION,benchmark_contribution:false}};
  return {schema:'visitor-scenario-result-v1',kind:'visitor_scenario',id:'scenario-'+crypto.randomUUID(),created_at:new Date().toISOString(),record,source_run_id:record.id,
    case:{workflow:'customer-recovery',id,title:c.title},execution:{model_calls:0,new_model_tokens:0,external_writes:false},benchmark_contribution:false,review_choice:'pending',
    scenario_checks:clone(r.checks),fresh_checks:{outcome:r.status==='recovered'?'Pass':'Needs improvement',criteria:clone(r.checks)},
    outcome:{state:r.status,summary:r.status==='recovered'?'Customer recovery confirmed in the prepared case.':'The case remains open; recovery has not been confirmed.',actions:[]},
    routing_plan:clone(plan),recovery_snapshot:clone(state)};
}
