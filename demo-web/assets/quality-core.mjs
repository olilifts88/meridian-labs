import {draftFor,checksFor} from './business-engine.mjs';
import {assessRelease} from './release-quality.mjs';
export {diffWords} from './word-diff.mjs?v=branch-folds-20261102';
export const recordChecks=record=>record.revised_checks||record.original_checks;
export function matchingAnswers(records,record){
 if(!record||record.kind?.startsWith('prepared_')||record.editorial_revision)return [];
 return records.filter(r=>r.case_id===record.case_id&&r.evidence&&JSON.stringify(r.evidence)===JSON.stringify(record.evidence)&&!r.kind?.startsWith('prepared_')&&!r.editorial_revision);
}
export function answerText(record){
 let value;try{value=JSON.parse(record.answer);}catch{return record.answer;}
 if(value.body)return value.body;
 if(Array.isArray(value.facts))return value.facts.length?value.facts.map(f=>[f.kind.replaceAll('_',' ')+(f.value!==undefined&&f.value!==''?': '+f.value:''),'Source: “'+f.quote+'”',f.topic?'Topic: '+f.topic:''].filter(Boolean).join('\n')).join('\n\n'):'No facts extracted.';
 return JSON.stringify(value,null,2);
}
export function businessText(draft){
 return draft.rows.map(r=>[r.id||r.field,r.question||r.title||r.package,r.answer||r.decision||(r.before!==undefined?String(r.before)+' → '+r.after:r.status),r.note].filter(Boolean).join('\n')).join('\n\n')+(draft.issueRecord?'\n\nEngineering: '+draft.issueRecord.title+'\n'+draft.issueRecord.next:'');
}
export function changeProbe({record,draft,missingAvailability=false},broken=false){
 if(!draft){
  const candidate=structuredClone(record);if(broken){let value;try{value=JSON.parse(candidate.answer);}catch{value={body:candidate.answer};}value.body=value.body.replace(/CSV export is available[^.]*\./,'CSV export is available to all customers.')+' Exports are guaranteed to complete instantly.';candidate.answer=JSON.stringify(value);}
  const checks=assessRelease(candidate,{missingAvailability}).checks.map(c=>({...c}));
  const text=answerText(candidate);checks.push({label:'No unsupported performance promise',pass:!text.includes('Exports are guaranteed to complete instantly.'),detail:'The release evidence supplies no instant-export guarantee.'});
  return {checks,text,description:'Widen the rollout and add an instant-export promise without supporting evidence.'};
 }
 const candidate=structuredClone(draft);let description;
 if(draft.workflow==='call-crm'){
  description='Approve a commercial value without the required review.';
  if(broken)candidate.rows.push({field:'Annual value',before:'Pending review',after:'Approved',status:'Approved annual value',source:candidate.sources[0]?.id});
 }else if(draft.workflow==='vulnerabilities'){
  const target=candidate.rows.find(r=>r.exception)||candidate.rows.find(r=>!r.affected)||candidate.rows[0];
  description=target.exception?'Grant an exception and remove its original deadline before Security approval.':!target.affected?'Require remediation for a version that already contains the fix.':'Remove the finding owner before assigning remediation.';
  if(broken){if(target.exception)target.decision='Extension granted; deadline removed.';else if(!target.affected)target.decision='Upgrade required immediately.';else target.owner='';}
 }else if(draft.workflow==='questionnaire'){
  const target=candidate.rows.find(r=>r.id==='Q-07')||candidate.rows[0];description=target.id==='Q-07'?'Promise a universal 24-hour notification deadline that the policy does not support.':'Replace a policy citation with a source that is not in the evidence pack.';
  if(broken){if(target.id==='Q-07')target.answer='Yes. All customers are notified within 24 hours of any incident.';else target.source='UNSUPPORTED-POLICY';}
 }else{
  const target=candidate.rows.find(r=>r.period!==r.expected_period)||candidate.rows[0];description='Accept evidence that does not meet the control’s review-period or ownership requirements.';
  if(broken){target.status='Accepted';target.owner='Unassigned';}
 }
 return {checks:checksFor(candidate),text:businessText(candidate),description,draft:candidate};
}
export function supportedBusiness(draft){return draftFor(draft.workflow,draft.id,{revised:true});}
