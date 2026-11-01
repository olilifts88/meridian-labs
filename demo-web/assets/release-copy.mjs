// Editorial structure uses only the release pack. Original model answers stay intact.
export const COPY_REVISION='release-copy-v1';
function baseCopy(record){
 const c=record.evidence.sources['product-change'].content;
 const title=c.release_title||'CSV export keeps your column order';
 if(c.change_category==='breaking_change')return {revision:COPY_REVISION,title,lead:c.summary+' Exports in API v2 run as background jobs, so creating an export and downloading the finished file are separate steps.',sections:[
  {heading:'Who is affected',text:c.availability_statement},
  {heading:'Update your integration',steps:['Handle the HTTP 202 response and retain the job ID.','Use the returned download URL when the export is ready.'],text:c.action},
  {heading:'API v1 support',text:'API v1 keeps its current behaviour until 1 February 2027. Use this support window to update clients that need the API v2 export flow.'}
 ]};
 if(c.change_category==='bug_fix')return {revision:COPY_REVISION,title,lead:c.summary+' A value such as “Acme, Inc” stays in one column instead of being read as two separate fields.',sections:[
  {heading:'What changed',text:'Comma-containing values are quoted, and quotation marks inside a value are escaped. This keeps the field structure intact when the CSV is read.'},
  {heading:'Availability',text:c.availability_statement},
  {heading:'Replace affected exports',text:c.action+' The fix applies to a new export; it does not repair a file you downloaded earlier.'}
 ]};
 const pilot=c.stage!=='ga';
 return {revision:COPY_REVISION,title,lead:c.summary,sections:[
  {heading:pilot?'Pilot availability':'Availability',text:c.availability_statement+(pilot?' The feature remains in beta.':'')},
  {heading:'Export a report',text:c.action}
 ]};
}
export function releaseCopy(record){
 const copy=baseCopy(record),c=record.evidence.sources['product-change'].content;
 if(record.editorial_issue==='missing-action')copy.sections=copy.sections.filter(s=>!['Export a report','Replace affected exports','Update your integration'].includes(s.heading));
 if(record.editorial_revision===2){
  const action=copy.sections.find(s=>['Export a report','Replace affected exports','Update your integration'].includes(s.heading));
  if(action&&!action.steps)action.steps=c.change_category==='bug_fix'?['Generate a fresh CSV export of the affected report.','Use the new file in place of the earlier export.']:['Open the report you want to export.','Choose Export.','Check that the exported headings match the report’s column order.'];
 }
 return copy;
}
export function copyText(copy){return [copy.lead,...copy.sections.flatMap(s=>[s.text||'',...(s.steps||[])])].filter(Boolean).join(' ');}
export function renderCopy(parent,copy,{leadClass='rw-draft-body',sectionClass='rw-draft-section'}={}){
 const lead=document.createElement('p');lead.className=leadClass;lead.textContent=copy.lead;parent.append(lead);
 for(const section of copy.sections){const wrapper=document.createElement('section');wrapper.className=sectionClass;const title=document.createElement('h2');title.textContent=section.heading;wrapper.append(title);if(section.text){const p=document.createElement('p');p.textContent=section.text;wrapper.append(p);}if(section.steps){const list=document.createElement('ol');for(const text of section.steps){const li=document.createElement('li');li.textContent=text;list.append(li);}wrapper.append(list);}parent.append(wrapper);}
}
