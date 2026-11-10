import {add,fold} from './workbench-shared.mjs?v=branch-folds-20261102';

const NOTES={
 'bd-pilot':{
  crm:[['Customer goal','Make the London operations team’s weekly revenue pack easier to check by preserving the saved report’s column order.',6],['Pilot boundary','London is the initial scope. Other offices are possible expansion, not a commitment.',11]],
  engineering:[['Reproduction','Use Customer, Revenue and Region in that order. Compare exported headings and cell values with the saved report.',7],['Acceptance evidence','Attach a regression test and obtain the customer’s confirmation before calling the export issue resolved.',8]],
  revenue:[['Proposal contents','Show 40 requested seats, annual price, billing terms and implementation charges separately. The £32,000 indication remains subject to Finance approval.',9],['Stakeholders and next step','Alex owns the proposal and handover; Sam supports London setup. Include Maya and Priya for the commercial follow-up.',10]],
  report:[['Business context','The team currently reorders exported columns manually for its weekly revenue pack. The pilot should test whether the saved report can be exported reliably.',6],['Next meeting agenda','Check London access, the export investigation and Finance’s open questions. Keep wider rollout separate.',10]],
  library:[['Reusable themes','Weekly reporting, CSV data quality, pilot acceptance, Finance approval and scoped expansion.',6]]
 },
 'bd-interest':{
  crm:[['Evaluation goal','Security needs evidence about SSO, customer-data access, hosting and deletion before supporting a pilot.',6],['Qualification gap','Fifteen seats are an estimate for one team. Procurement, billing and annual budget remain unconfirmed.',9]],
  engineering:[['No defect to triage','This is an evaluation and security-information request. Route the policy questions to the evidence owner rather than creating a product bug.',6]],
  revenue:[['Commercial boundary','Do not treat the seat estimate as an order or invent an annual price. Procurement and budget have not been confirmed.',9],['Follow-up sequence','Send the security pack, request an introduction to the security lead and identify the review’s open questions before setting a pilot date.',8]],
  report:[['Review ownership','Dan will introduce Eva, the security lead. A review slot has not been booked.',7],['Next meeting agenda','Confirm the review owner, unresolved security questions and what the first evaluation should demonstrate.',10]],
  library:[['Reusable themes','Enterprise SSO, access controls, hosting, deletion, security-led qualification and tentative seat demand.',6]]
 },
 'delivery-review':{
  crm:[['Current customer friction','London is rehearsing its weekly revenue pack with sample reports. Exports still require manual comparison before sharing.',6],['Expansion condition','Bring an engineering update and the guide to the next call. Wider rollout depends on reliable exports and customer sign-off.',11]],
  engineering:[['Repeat evidence','The same Customer, Revenue and Region report reproduces the problem without a changed saved order. Attach this call to ENG-142.',7],['Status boundary','Engineering’s current status is requested; no confirmed fix date is available in the conversation.',8]],
  revenue:[['Expansion remains conditional','A wider rollout depends on a reliable export and customer sign-off. This discussion establishes no new price or committed expansion.',11]],
  report:[['Customer guide','Explain how to export, compare the first row with saved headings and stop sharing if values appear under the wrong column.',9],['Owner and timing','Sam will prepare the guide for Maya’s review by 4 November, then collect confirmation once regression evidence is ready.',10]],
  library:[['Reusable themes','Repeated export failure, customer checklist, evidence before closure and conditional rollout.',7]]
 },
 'internal-planning':{
  crm:[['Internal scope','This review concerns release readiness. It does not authorise new customer or commercial field changes.',9]],
  engineering:[['Regression design','Use a saved report whose display order differs from row-object order. Check cell mapping as well as headings.',4],['Evidence boundary','Attach test evidence to ENG-142 before release review; no general release date is promised.',7]],
  revenue:[['No commercial action','Pricing and broader expansion are outside this internal decision. Retain existing commercial terms.',9]],
  report:[['Exit criteria','Require a passing regression, a checked pilot export and customer confirmation. Keep each criterion open until evidence is attached.',6],['Readiness review','Bring an owner and status for every exit criterion, the outstanding customer action and the decision required.',8]],
  library:[['Reusable themes','Regression quality, pilot exit criteria, release approval, customer confirmation and team ownership.',6]]
 }
};

export function transcriptInsights(draft,view){return (NOTES[draft.id]?.[view]||[]).map(([title,text,index])=>({title,text,source:draft.sources[index]}));}
export function renderTranscriptInsights(parent,draft,view){
 const notes=transcriptInsights(draft,view);if(!notes.length)return;
 const section=add(parent,'section','',{class:'transcript-insights'});add(section,'h3','Context and follow-through');
 for(const note of notes){const article=add(section,'article','',{class:'workspace-card'});add(article,'h4',note.title);add(article,'p',note.text);if(note.source){const evidence=fold(article,'Supporting conversation');add(evidence,'p',note.source.at+' · '+note.source.speaker,{class:'muted'});add(evidence,'blockquote',note.source.text);}}
}
