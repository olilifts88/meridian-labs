import {TRANSCRIPTS} from './business-data.mjs';
import {add,badge,fold} from './workbench-shared.mjs?v=branch-folds-20261102';

export const BRIEF_DESTINATION=['prep','Next meeting brief','Meeting preparation','Open a calendar-led prep sheet with account history, relevant tickets, related signals and commercial watch-outs.'];
export function outputDestinations(draft){return draft.workflow==='call-crm'&&!draft.destinations.some(d=>d[0]==='prep')?[...draft.destinations,BRIEF_DESTINATION]:draft.destinations;}

// A bounded, fictional snapshot. This preview installs no calendar job or connector.
export function buildMeetingBrief(draft){
 if(draft.workflow!=='call-crm'||!draft.transcript)throw Error('A customer conversation is required.');
 const account=draft.transcript.account,internal=!draft.transcript.stage;
 const calls=TRANSCRIPTS.filter(t=>t.account===account&&t.date<='2026-11-04').sort((a,b)=>a.date.localeCompare(b.date));
 const latest=calls.at(-1),commercial=calls.find(t=>t.budget),issue=calls.find(t=>t.issue);
 const sources=calls.map(t=>({id:'call-'+t.id,system:'Call library',title:t.date+' · '+t.title,text:t.transcript.map(([at,speaker,text])=>at+' · '+speaker+': '+text).join('\n')}));
 sources.push({id:'calendar',system:'Calendar',title:'Upcoming meeting · 5 November 2026, 10:00 GMT',text:account+' · '+(internal?'Release readiness review':'Customer follow-up')+' · '+latest.attendees+'. Fictional calendar event CAL-'+draft.id+'.'});
 sources.push({id:'crm',system:internal?'Team record':'CRM',title:account+' · latest recorded context',text:(latest.stage?'Recorded stage: '+latest.stage[1]+'. ':'Internal release-readiness meeting. ')+latest.action+' Owner: '+latest.owner+'. Due: '+latest.due+'. Derived from '+latest.title+'; newer delivery evidence has not been supplied.'});
 if(issue)sources.push({id:'linear',system:'Linear fixture',title:'ENG-142 · Export column order',text:'Snapshot · 4 November 2026, 16:00 GMT. Owner: Reporting Engineering. Status: In progress; regression evidence and customer confirmation pending. No verified fix or general-availability approval. This is additional fictional issue-tracker evidence.'});
 if(account==='Northstar Analytics')sources.push({id:'signal',system:'Shared signal fixture',title:'Related CSV workflow · anonymised signal',text:'Snapshot · 4 November 2026. An authorised aggregate reports the same column-order symptom in another account using CSV reports. That account’s private details are excluded. Similarity is a reason to investigate, not proof of the same root cause. Additional fictional evidence.'});
 const items=[
  {title:'Where we left off',text:latest.action+' '+(account==='Northstar Analytics'?'The London team is rehearsing its weekly revenue pack. Exported headings and values still require manual checking before sharing. Wider rollout remains conditional on a reliable export and customer sign-off.':internal?'The readiness review needs a named owner and evidence for each pilot exit criterion.':'Security needs evidence on SSO, data access, hosting and deletion. Eva has not booked a review slot, and the seat estimate is not an order.'),refs:['call-'+latest.id,'crm']},
  {title:'What changed',text:issue?'ENG-142 is in progress. Regression evidence and customer validation are still pending. Ask for an update before describing the issue as fixed. Check both heading order and cell mapping using the Customer, Revenue and Region report; a cosmetic heading fix is not enough.':'No verified delivery or product update is present in this snapshot.',refs:issue?['linear']:['crm']},
  {title:'Related signals',text:account==='Northstar Analytics'?'A similar CSV symptom appears in an authorised, anonymised signal from another account. Check whether the workflow and reproduction steps match. Bring the saved report order, sample exported headings and customer impact to Engineering; do not assume a shared root cause from similar symptoms.':'No permission-cleared related-customer signal is supplied. Do not infer one.',refs:account==='Northstar Analytics'?['signal']:[]},
  {title:'Commercial watch-outs',text:commercial?'£32,000 is an indicative annual budget for 40 requested seats. Finance has not approved it. Include Priya in the commercial follow-up; do not present this as contracted revenue. The proposal should separate annual price, billing terms and implementation charges. Ask what Finance still needs before approving the proposal.':internal?'No pricing decision is recorded in this internal meeting.':'No approved budget or pilot start date is recorded. Complete the security review before treating interest as a commitment.',refs:commercial?['call-'+commercial.id]:['call-'+latest.id]},
  {title:'Questions to take into the meeting',text:issue?'Has Engineering attached the regression evidence? Has the customer validated the export? Which follow-ups remain open'+(commercial?', and has Finance reviewed the proposal?':'?'):'Who owns the security review, what evidence is missing, and what must happen before agreeing a pilot?',refs:issue?['linear','call-'+latest.id]:['call-'+latest.id]}
 ];
 return {account,internal,meeting:'5 November 2026 · 10:00–10:30 GMT',prepared:'4 November 2026 · 18:00 GMT',attendees:latest.attendees,items,sources};
}

export function renderMeetingBrief(parent,draft){
 const brief=buildMeetingBrief(draft),root=add(parent,'section','',{class:'meeting-brief','aria-label':'Next meeting brief'});
 badge(root,'Fictional prepared example');add(root,'h2',brief.account+' · '+(brief.internal?'Team meeting brief':'Customer meeting brief'));
 add(root,'p',brief.meeting,{class:'lead'});add(root,'p',brief.attendees,{class:'muted'});
 const event=add(root,'article','',{class:'workspace-card'});add(event,'h3','Upcoming calendar event');add(event,'p',brief.meeting);add(event,'p','Preparation check: '+brief.prepared+'. Example rule: prepare tomorrow’s meetings at 18:00.');
 const start=add(event,'button','Preview calendar check',{type:'button',class:'primary'}),status=add(event,'p','The prepared brief is shown below.',{role:'status','aria-live':'polite'});
 start.onclick=()=>{status.textContent='Matched '+brief.account+' to its meeting and checked '+brief.sources.length+' permitted source records. Example brief ready below. No calendar connection or background job ran.';};
 const grid=add(root,'div','',{class:'workspace-grid'});
 for(const item of brief.items){const card=add(grid,'article','',{class:'workspace-card'});add(card,'h3',item.title);add(card,'p',item.text);for(const id of item.refs){const s=brief.sources.find(s=>s.id===id);const a=add(card,'a','View source · '+s.system,{href:'#brief-source-'+id,class:'button'});a.onclick=e=>{e.preventDefault();const target=root.querySelector('#brief-source-'+id);target.open=true;for(let n=target.parentElement;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;target.scrollIntoView({block:'center',behavior:'smooth'});target.querySelector('summary').focus();};}}
 const method=fold(root,'How this works');add(method,'p','At the configured preparation time, the intended agent checks the calendar, matches the meeting to the customer and attendees, then retrieves relevant information the meeting owner can access. It combines previous calls and CRM context with current tickets, product evidence and approved shared signals.');
 const steps=add(method,'ol');for(const text of ['Check the calendar and resolve the customer; ambiguous matches need review.','Read permitted CRM records, call history, relevant Linear tickets and product updates.','Compare dates, preserve commercial approvals, and anonymise permitted cross-customer signals.','Prepare a short brief with source links, open questions and missing or stale information.','Use the next call to update the account knowledge and prepare the following conversation.'])add(steps,'li',text);
 add(method,'p','This demo uses a fixed calendar event and prepared fictional source snapshots. It makes no live model calls, connects to no real calendar or customer system, and installs no schedule. Live use would require verified account matching, access checks, freshness rules and delivery.');
 const evidence=fold(root,'Sources and freshness');add(evidence,'p','Example checked at '+brief.prepared+'. Call history alone does not establish current delivery status. Conflicting pilot dates and completion claims need confirmation.');
 for(const s of brief.sources){const d=fold(evidence,s.system+' · '+s.title);d.id='brief-source-'+s.id;add(d,'p',s.text);}
 return root;
}
