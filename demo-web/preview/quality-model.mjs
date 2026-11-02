import {assessRelease} from '../assets/release-quality.mjs';
export const modelName = id => ({'gpt-6-luna':'GPT-6 Luna','gpt-6.1-sol':'GPT-6.1 Sol','gpt-6.1-terra':'GPT-6.1 Terra'}[id]||id);
export const setupName = r => modelName(r.requested_model)+' · '+(r.configuration.endsWith('guided')?'With workflow guide':'Task instructions only');
export const checksOf = r => r.revised_checks||r.original_checks;
export function parseAnswer(r){try{return JSON.parse(r.answer);}catch{return {body:r.answer};}}
export function outputText(r){const a=parseAnswer(r);return a.body||(Array.isArray(a.facts)?(a.facts.length?a.facts.map(f=>[f.kind.replaceAll('_',' ')+(f.value!==undefined&&f.value!==''?': '+f.value:''),'Source: “'+f.quote+'”',f.topic?'Topic: '+f.topic:''].filter(Boolean).join('\n')).join('\n\n'):'No facts extracted.'):JSON.stringify(a,null,2));}
export function compareRecords(records,caseId,instructions='guided'){
 const candidates=records.filter(r=>r.case_id===caseId&&r.configuration.endsWith('-'+instructions));
 if(!candidates.length)return [];
 return candidates.filter(r=>JSON.stringify(r.evidence)===JSON.stringify(candidates[0].evidence));
}
export function validateChange(record,broken=false){
 if(record.case_id.startsWith('release-notes')){
  const candidate=structuredClone(record);
  if(broken)candidate.answer=JSON.stringify({body:parseAnswer(record).body.replace(/CSV export is available[^.]*\./,'CSV export is available to all customers.')+' The new export is guaranteed to complete instantly.'});
  const result=assessRelease(candidate);
  const checks=result.checks.map(c=>({label:c.label,pass:c.pass,detail:c.detail}));
  // The source does not supply a latency guarantee, regardless of rollout stage.
  checks.push({label:'No unsupported performance promise',pass:!broken,detail:broken?'The release evidence contains no instant-export guarantee.':'The announcement makes no new performance promise.'});
  return {checks,answer:outputText(candidate)};
 }
 const transcript=record.evidence.calls[0].transcript,original=parseAnswer(record).facts||[],facts=structuredClone(original);
 if(broken)facts.push({kind:'stage',deal:'d1',quote:transcript,value:'Pilot approved for every office',approved:true});
 const allQuotes=facts.every(f=>typeof f.quote==='string'&&transcript.includes(f.quote));
 const tentative=transcript.includes('might');
 return {answer:JSON.stringify({facts},null,2),checks:[
  {label:'Source quotes retained',pass:allQuotes,detail:'Every excerpt must exist in this transcript.'},
  {label:'Commitment matches the speaker’s words',pass:!facts.some(f=>f.kind==='stage'&&(tentative||String(f.value).includes('every office'))),detail:tentative?'Finance approval is still pending. Keep the opportunity Qualified.':'Only the two-week dispatch-team pilot is approved.'},
  {label:'Commercial changes wait for review',pass:!facts.some(f=>f.approved),detail:'Extraction cannot approve its own CRM or commercial updates.'},
  {label:'No invented engineering report',pass:!facts.some(f=>f.kind==='bug'&&!f.quote.includes('CSV export fails')),detail:'An issue on file does not establish a new report in this conversation.'}
 ]};
}
export function traceFor(record){
 const call=record.case_id.startsWith('call-crm'),source=call?record.evidence.calls[0].transcript:record.evidence.sources['product-change'].content;
 if(!call){return [
 {id:'read',name:'Read the release evidence',model:'GPT-6.1 Terra',effort:'medium',input:source.summary+' '+source.availability_statement,decision:'Keep the confirmed audience and customer action attached to the change.',check:'Rollout scope matches the approved source.',output:source.availability_statement,destination:'Release evidence'},
 {id:'draft',name:'Draft the announcement',model:'GPT-6.1 Sol',effort:'medium',input:source.summary+' '+source.action,decision:'Describe the customer-visible change and the next action.',check:'No unsupported availability or performance promise.',output:parseAnswer(record).body,destination:'Release draft'},
 {id:'review',name:'Review the claims',model:'GPT-6.1 Sol',effort:'high',input:source.availability_statement,decision:'Check the draft against the specification before approval.',check:'Source-backed claims and an explicit review boundary.',output:'Draft ready for a reviewer; no publication action taken.',destination:'Shared review'},
 {id:'format',name:'Prepare the release note',model:'GPT-6 Luna',effort:'low',input:parseAnswer(record).body,decision:'Retain approved facts while formatting the customer update.',check:'Formatting does not broaden the rollout.',output:parseAnswer(record).body,destination:'Product updates'}];}
 const tentative=source.includes('might'),facts=parseAnswer(record).facts||[],pilot=facts.find(f=>f.kind==='stage'),price=facts.find(f=>f.kind==='price'),bug=facts.find(f=>f.kind==='bug');
 const node=(id,name,decision,check,output,destination,input=source)=>({id,name,model:'GPT-6.1 Sol',effort:'high',input,decision,check,output,destination});
 return [
 {...node('read','Read the transcript','Identify the account and separate each statement.','Use the transcript, not the existing CRM, to establish what was said.',source,'Source evidence'),model:'GPT-6.1 Terra',effort:'medium'},
 node('crm','Account updates',tentative?'Keep the existing stage; interest does not establish approval.':'Prepare the agreed pilot stage for review.','Preserve scope, start date and the authorised decision.',tentative?'Opportunity stage: Qualified → Qualified. No approved pilot.':'Opportunity stage: Qualified → Pilot. Scope: dispatch team, two weeks from 2 November.','CRM',pilot?.quote||source),
 node('engineering','Engineering signals',bug?'Link the report to the existing issue.':'Do not create an engineering signal from an unrelated issue on file.','A supporting quote and the existing issue key are required.',bug?'Attach the blocking export report to '+record.evidence.known_issue.id+'. Keep one issue.':'No new issue. This transcript reports no export failure.','Internal issue board',bug?.quote||source),
 node('revenue','Pricing follow-up',price?'Keep the budget as tentative and request commercial review.':'Do not infer a pricing request from a pilot decision.','No contracted value changes without approval.',price?'Indicative budget: £32,000. Procurement approval pending. Existing annual value remains £18,000.':'No pricing follow-up required from this conversation.','Revenue tracker',price?.quote||source),
 {...node('report','Meeting report','Make the decision and next action readable for the team.','Distinguish an agreement from an open question.',tentative?'Pilot interest remains subject to finance. Procurement has not approved the indicative £32,000 budget.':'Two-week dispatch pilot approved; success target is 20% fewer manual handoffs. Export failure blocks the pilot review.','Company message board'),effort:'medium'},
 {...node('library','Searchable call knowledge','Keep the conversation linked to its account and date.','Answers must retain the source excerpt.',source,'Call library'),effort:'medium'},
 node('review','Review the proposed changes','Bring the destination records together before any approval.','Commercial terms, issue identity and commitments remain consistent.','Review the CRM, issue, revenue and team records as one set.','Shared review'),
 {...node('format','Prepare the output records','Format the reviewed fields for each destination.','No new facts or approval are introduced by formatting.','Five destination records, with source references and individual review status.','Output hub'),model:'GPT-6 Luna',effort:'low'}];
}
// Word-level LCS highlights differences without assigning a quality judgment.
export function diffWords(left,right){
 const a=left.match(/\s+|[^\s]+/g)||[],b=right.match(/\s+|[^\s]+/g)||[];
 const rows=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)rows[i][j]=a[i]===b[j]?1+rows[i+1][j+1]:Math.max(rows[i+1][j],rows[i][j+1]);
 let i=0,j=0;const l=[],r=[];
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){l.push([a[i++],false]);r.push([b[j++],false]);}else if(i<a.length&&(j===b.length||rows[i+1][j]>=rows[i][j+1]))l.push([a[i++],true]);else r.push([b[j++],true]);}
 return [l,r];
}
