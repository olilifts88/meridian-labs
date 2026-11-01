import {VULNERABILITIES,QUESTIONS,POLICIES,CONTROLS,TRANSCRIPTS,SCENARIOS,NAMES,sourceRows} from './business-data.mjs';
export const REVISION='company-workflows-v1';
export function scenarioFor(workflow,id){const s=SCENARIOS[workflow]?.find(s=>s.id===id);if(!s)throw Error('This workflow scenario is unavailable.');return s;}
export function draftFor(workflow,id,{revised=false,issue=false}={}){
 const scenario=scenarioFor(workflow,id);const sources=sourceRows(workflow,id);
 const base={workflow,id,title:scenario.title,revision:revised?2:1,source_revision:REVISION,sources:structuredClone(sources),feedback:revised?scenario.revisionNote:'',issue:issue&&!revised};
 if(workflow==='vulnerabilities'){
  const rows=VULNERABILITIES.filter(r=>id==='exceptions'?r.affected&&(r.status==='Overdue'||r.exception):id==='unaffected'?!r.affected: true).map(r=>({...r,decision:!r.affected?'No remediation: installed version contains the fix.':r.exception&&issue&&!revised?'Extension granted; deadline removed.':r.exception?'Keep the original deadline; Security approval is pending.':'Assign remediation and attach fresh scan evidence before closure.',source:r.id}));
  return {...base,summary:'Review the installed version before assigning remediation. Prioritise exposed production services; exception requests remain open until approved.',rows,destinations:[['remediation','Remediation register','Remediation tracker','Owners, due dates, mitigations and closure evidence.'],['exceptions','Exception requests','Security review','Pending requests, original deadlines and required approvals.']]};
 }
 if(workflow==='questionnaire'){
  const rows=QUESTIONS.filter(q=>id==='claims'?q.status!=='Supported':true).map(q=>({...q,answer:q.id==='Q-07'&&issue&&!revised?'Yes. All customers are notified within 24 hours of any incident.':q.answer}));
  return {...base,summary:'Draft answers use the approved policy pack. Scope restrictions remain in the response; missing reports and unsupported capabilities are routed to the evidence owner.',rows,destinations:[['responses','Customer response pack','Security questionnaire','Question-by-question answers, citations and review notes.'],['requests','Evidence requests','Security review','Open requests with a named owner and acceptance criteria.']]};
 }
 if(workflow==='soc2'){
  const rows=CONTROLS.filter(c=>id==='gaps'?c.status!=='Accepted':true).map(c=>({...c,status:c.id==='CC7.3'&&issue&&!revised?'Accepted':c.status,source:c.id}));
  return {...base,summary:'Evidence is mapped to the Q3 review period. A document can be present and still need follow-up for its period, owner, approval or coverage.',rows,destinations:[['controls','Evidence register','SOC 2 workspace','Control mapping, review periods and evidence decisions.'],['followups','Owner follow-ups','Action register','Requests for missing records, approvals and corrections.']]};
 }
 const t=TRANSCRIPTS.find(t=>t.id===id),quote=i=>'T-'+(i+1),changes=[];
 if(t.stage)changes.push({field:'Opportunity stage',before:t.stage[0],after:issue&&!revised&&id==='bd-interest'?'Pilot agreed':t.stage[1],source:'T-1',status:t.stage[0]===t.stage[1]?'Retained':'Ready for review'});
 if(t.seats)changes.push({field:'Requested seats',before:'Not recorded',after:t.seats,source:id==='bd-pilot'?'T-2':id==='bd-interest'?'T-2':'T-1',status:id==='delivery-review'?'Existing pilot scope':'Requested, not contracted'});
 if(t.budget)changes.push({field:'Indicative annual budget',before:'Not recorded',after:'£'+t.budget.toLocaleString('en-GB'),source:'T-2',status:issue&&!revised?'Approved annual value':'Finance approval pending'});
 const issueRecord=t.issue?{id:'ENG-142',title:t.issue,owner:'Reporting Engineering',priority:'High',state:'Needs triage',source:quote(t.issueQuote),description:id==='internal-planning'?'The release needs a regression test and Customer Success confirmation before general availability.':t.issue,existing:id==='delivery-review'||id==='internal-planning',next:id==='delivery-review'?'Attach this report to ENG-142; retain one issue with both call references.':'Confirm reproduction, capture the export headings and attach the regression test.'}:null;
 return {...base,transcript:structuredClone(t),summary:t.action,rows:changes,issueRecord,destinations:[['crm','Account updates','CRM','Field changes with source quotes and approval history.'],['engineering','Engineering signals','Internal issue board','Product reports, customer impact and existing issue links.'],['revenue','Pricing follow-ups','Revenue tracker','Proposal inputs, commercial approvals and a draft response.'],['report','Meeting report','Company message board','Decisions, actions and owners in a readable team post.'],['library','Transcript knowledge','Call library','Search conversations and open the supporting excerpts.']]};
}
export function checksFor(draft){
 const checks=[{label:'Sources retained',pass:JSON.stringify(draft.sources)===JSON.stringify(sourceRows(draft.workflow,draft.id)),detail:'The output retains the source snapshot used for this review.'}];
 if(draft.workflow==='vulnerabilities'){
  checks.push({label:'Versions checked before remediation',pass:draft.rows.every(r=>r.affected||r.decision.startsWith('No remediation')),detail:'Already-fixed installations are separated from affected assets.'});
  checks.push({label:'Exceptions keep their original deadline',pass:draft.rows.every(r=>!r.exception||r.decision.includes('pending')),detail:'A request does not extend an SLA. Security approval and the original deadline remain visible.'});
  checks.push({label:'Every finding has an owner and deadline',pass:draft.rows.every(r=>r.owner&&r.due&&r.validation),detail:'Closure requires an upgrade, regression checks and refreshed inventory evidence.'});
 }else if(draft.workflow==='questionnaire'){
  checks.push({label:'Answers cite the policy pack',pass:draft.rows.every(r=>POLICIES.some(p=>p.id===r.source)),detail:'Each response links to a named, dated source.'});
  checks.push({label:'Incident deadlines stay within the contract',pass:draft.rows.every(r=>r.id!=='Q-07'||r.answer===QUESTIONS.find(q=>q.id==='Q-07').answer),detail:'The policy does not promise a universal 24-hour notification deadline.'});
  checks.push({label:'Missing evidence remains an open request',pass:draft.rows.filter(q=>q.status==='Needs evidence').every(q=>q.answer.includes('supplied policy')||q.answer.includes('No current')),detail:'Unsupported capabilities and missing reports are routed for evidence, not answered positively.'});
 }else if(draft.workflow==='soc2'){
  checks.push({label:'Review period matches the control',pass:draft.rows.every(r=>r.period===r.expected_period||r.status!=='Accepted'),detail:'The Q2 incident register cannot satisfy the Q3 evidence request.'});
  checks.push({label:'Open gaps have follow-up actions',pass:draft.rows.every(r=>r.request&&r.owner&&r.due),detail:'Missing owners are explicitly unassigned, with a request to appoint one.'});
  checks.push({label:'Acceptance needs a current approval',pass:draft.rows.every(r=>r.status!=='Accepted'||r.reviewed>='2026-09-01'&&r.owner!=='Unassigned'),detail:'Stale reviews, pending approvals and missing owners are not cleared.'});
 }else{
  const t=draft.transcript;
  checks.push({label:'Commitment matches the speaker’s words',pass:!draft.rows.some(r=>r.after==='Pilot agreed'&&!t.committed),detail:'Interest and security review do not establish pilot approval.'});
  checks.push({label:'Commercial values remain subject to approval',pass:!draft.rows.some(r=>r.status==='Approved annual value'),detail:'An indicative budget is not a contracted annual value.'});
  checks.push({label:'Engineering signals retain the source quote',pass:!draft.issueRecord||draft.sources.some(s=>s.id===draft.issueRecord.source),detail:'Repeated reports link to the existing issue; a call without an issue creates none.'});
  checks.push({label:'Actions have an owner and due date',pass:!!t.owner&&!!t.due,detail:'The follow-up is assigned and linked to the transcript.'});
 }
 return checks;
}
export function ready(draft){return checksFor(draft).every(c=>c.pass);}
export function newBusinessResult(workflow,id,plan,{revised=false,issue=false,feedback=''}={}){
 const draft=draftFor(workflow,id,{revised,issue});if(feedback)draft.reviewer_note=feedback;
 const record={id:'business-'+workflow+'-'+id,kind:'prepared_business_output',answer:JSON.stringify(draft),evidence:{sources:draft.sources},usage:null,provenance:{kind:'authored_business_scenario',revision:REVISION,benchmark_contribution:false}};
 return {schema:'visitor-scenario-result-v1',kind:'visitor_scenario',id:'scenario-'+crypto.randomUUID(),created_at:new Date().toISOString(),record,source_run_id:record.id,case:{workflow,id,title:scenarioFor(workflow,id).title},execution:{model_calls:0,new_model_tokens:0,external_writes:false},benchmark_contribution:false,review_choice:'pending',scenario_checks:checksFor(draft),fresh_checks:{outcome:ready(draft)?'Pass':'Needs improvement',criteria:checksFor(draft)},outcome:{state:ready(draft)?'awaiting_approval':'held_by_checks',summary:draft.summary,actions:[]},routing_plan:structuredClone(plan),business_draft:draft};
}
export function approveBusiness(result){
 if(result.record.kind!=='prepared_business_output'||!ready(result.business_draft))throw Error('Resolve the flagged checks before approval.');
 const expected=draftFor(result.case.workflow,result.case.id,{revised:result.business_draft.revision===2,issue:result.business_draft.issue});
 const actual=structuredClone(result.business_draft);delete actual.reviewer_note;
 if(JSON.stringify(expected)!==JSON.stringify(actual)||result.record.answer!==JSON.stringify(result.business_draft))throw Error('The draft has changed. Run the workflow and review it again.');
 return {...result,id:'scenario-'+crypto.randomUUID(),created_at:new Date().toISOString(),parent_id:result.id,review_choice:'approve',outcome:{...result.outcome,state:'simulated_complete',actions:[{state:'applied',human_approved:true,field:'Meridian output pages'}]},business_publication:{revision:REVISION,approved_draft:JSON.stringify(result.business_draft),approved_at:new Date().toISOString()}};
}
export function validateBusiness(result){
 if(!result?.business_publication||result.business_publication.revision!==REVISION||result.review_choice!=='approve'||result.outcome.state!=='simulated_complete'||result.business_publication.approved_draft!==JSON.stringify(result.business_draft)||result.record.answer!==JSON.stringify(result.business_draft)||!ready(result.business_draft))throw Error('This output needs an approved, unchanged workflow result.');
 approveBusiness(result);return result;
}
export function outputURL(result,view='overview'){return '/workspace.html?session='+encodeURIComponent(result.id)+'&view='+encodeURIComponent(view);}
export function findBusinessPublication(results,result){return results.find(r=>{try{validateBusiness(r);return r.business_publication.approved_draft===JSON.stringify(result.business_draft);}catch{return false;}})||null;}
