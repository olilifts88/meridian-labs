// Authored business scenarios. Never contribute to the recorded model benchmark.
export const NAMES={'release-notes':'Release notes','call-crm':'Transcript to action',vulnerabilities:'Vulnerability review',questionnaire:'Security questionnaires',soc2:'SOC 2 evidence review'};
export const TODAY='2026-11-01';
export const SLA={Critical:2,High:7,Medium:30,Low:90};
const due=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*864e5).toISOString().slice(0,10);
const packages=[
 ['report-renderer','4.2.1','4.2.4','Template expressions can invoke restricted helpers','Reporting','Web reports','Untrusted report templates reach the rendering service.','Disable user-supplied expressions until the upgrade is deployed.'],
 ['archive-reader','2.6.0','2.6.3','Archive paths can escape the extraction directory','Data Platform','Import workers','Partner archives are unpacked by a background worker.','Reject absolute paths and parent-directory entries at ingestion.'],
 ['identity-gateway','3.1.2','3.1.5','Session renewal does not rotate the previous token','Identity','Authentication','The renewal endpoint is reachable by signed-in users.','Shorten session lifetime and revoke existing renewal tokens.'],
 ['query-adapter','1.8.1','1.9.0','Dynamic sort parameters bypass identifier validation','Data Platform','Search API','Customer-defined sort keys reach the query builder.','Allowlist sort columns at the API boundary.'],
 ['image-worker','5.0.0','5.0.2','Malformed image dimensions exhaust worker memory','Infrastructure','Media workers','Uploads are size-limited but decoded dimensions are unchecked.','Cap decoded pixels and isolate image processing.'],
 ['webhook-client','2.3.0','2.3.2','Redirects can target an internal network address','Integrations','Outbound webhooks','Tenant webhook destinations allow redirects.','Disable redirects and block private address ranges.'],
 ['csv-parser','6.1.0','6.1.1','Quoted fields cause excessive parser work','Reporting','CSV imports','Large quoted fields can be submitted by customers.','Cap field length and processing time.'],
 ['audit-writer','1.4.0','1.4.2','Multiline values can create ambiguous audit records','Security','Audit pipeline','User labels are included in line-oriented audit events.','Write structured JSON events and escape control characters.'],
 ['notification-kit','3.5.1','3.5.4','Email subject values allow header injection','Messaging','Notification workers','Tenant-defined subjects reach the delivery adapter.','Reject carriage-return and newline characters in headers.'],
 ['cache-router','2.0.0','2.0.3','Cache keys omit the tenant discriminator','Infrastructure','Response cache','Two tenants may request resources with the same local identifier.','Disable shared response caching on affected endpoints.']
];
export const VULNERABILITIES=Array.from({length:40},(_,i)=>{
 const p=packages[i%10],env=['Production','Staging','Internal','Production'][Math.floor(i/10)],severity=['Critical','High','High','Medium','Medium','High','Medium','Low','Medium','Critical'][i%10];
 const discovered=['2026-10-27','2026-10-29','2026-10-15','2026-10-20'][Math.floor(i/10)],affected=i%9!==0||i===0,exception=i===14||i===23;
 const installed=affected?p[1]:p[2],deadline=due(discovered,SLA[severity]);
 return {id:'VUL-'+String(i+1).padStart(3,'0'),advisory:'MSA-2026-'+String(101+i%10),package:'meridian/'+p[0],installed,fixed:p[2],affected,severity,owner:p[4],service:p[5],environment:env,title:p[3],exposure:p[6],mitigation:p[7],discovered,due:deadline,sla_days:SLA[severity],status:!affected?'Not affected':exception?'Exception requested':deadline<TODAY?'Overdue':'Open',exception:exception?'Service owner requests a short extension for a compatibility test. Security approval is pending; the original deadline still applies.':null,source:'Dependency inventory INV-'+(101+i)+' and advisory '+('MSA-2026-'+String(101+i%10)),evidence:'Inventory pins '+installed+'. Advisory lists versions before '+p[2]+' as affected. '+env+' asset '+(101+i)+'.',validation:'Deploy '+p[2]+', run the regression suite for '+p[5].toLowerCase()+', and attach the refreshed inventory before closure.'};
});
export const POLICIES=[
 ['SEC-01','Identity and access','Security','2026-10-20','Staff use SSO and MFA. Privileged access needs an owner approval and quarterly review. Customer SSO is offered on the Enterprise plan.'],
 ['SEC-02','Encryption','Infrastructure','2026-10-18','Production data uses TLS 1.2 or later in transit and AES-256 at rest. Keys are managed through the cloud key service; production key access is restricted.'],
 ['SEC-03','Incident response','Security','2026-10-21','The on-call team triages suspected incidents. Confirmed customer-impacting incidents are communicated under the applicable contract; no universal notification deadline is stated.'],
 ['SEC-04','Data lifecycle','Privacy','2026-10-12','Customer records are deleted within 30 days of a validated deletion request. Encrypted backups expire within 35 days. Legal retention exceptions require a documented review.'],
 ['SEC-05','Supplier assurance','Risk','2026-10-10','Critical suppliers are assessed before onboarding and annually. A subprocessor list is maintained; contractual change notifications follow the signed agreement.'],
 ['SEC-06','Secure development','Engineering','2026-10-26','Pull requests require peer review and automated dependency, secret and static-analysis checks. Production releases require a passing build and a named release owner.'],
 ['SEC-07','Continuity and recovery','Infrastructure','2026-10-15','Encrypted backups run daily. Recovery targets are RPO 24 hours and RTO 8 hours. A restore exercise ran on 16 September with a documented follow-up on runbook access.'],
 ['SEC-08','Monitoring and logs','Security','2026-10-22','Production audit events are retained for 365 days. Alerts cover authentication anomalies and privileged actions. Logs have restricted access and centralised retention.'],
 ['SEC-09','Vulnerability management','Security','2026-10-24','Dependency scans run on pull requests and daily. Internal remediation targets: critical 2 days, high 7, medium 30, low 90. Exceptions need Security approval.'],
 ['SEC-10','People and devices','People Operations','2026-10-14','Employees complete security training at onboarding and annually. Managed devices use encryption and endpoint protection. Access removal is part of the offboarding checklist.'],
 ['SEC-11','Tenant separation','Engineering','2026-10-19','Application authorisation checks the tenant on each resource request. Integration tests exercise cross-tenant access. Shared infrastructure is used.'],
 ['SEC-12','Data location','Privacy','2026-10-16','The standard production environment is hosted in the EU. Support access can occur from approved locations. Exclusive country-level residency is not promised.']
].map(([id,title,owner,reviewed,text])=>({id,title,owner,reviewed,text}));
const questions=[
 ['Do staff use multi-factor authentication?','SEC-01','Yes. Staff access uses SSO and MFA.','Supported'],
 ['Is customer SSO available on every plan?','SEC-01','Customer SSO is available on the Enterprise plan. It is not included on every plan.','Qualified'],
 ['How is privileged access reviewed?','SEC-01','Privileged access requires owner approval and is reviewed quarterly.','Supported'],
 ['Is customer data encrypted in transit?','SEC-02','Yes. Production connections use TLS 1.2 or later.','Supported'],
 ['How is stored production data encrypted?','SEC-02','Production data uses AES-256 at rest. Keys are managed through the cloud key service.','Supported'],
 ['Do customers bring their own encryption keys?','SEC-02','The supplied policy describes managed keys but does not establish customer-managed key support. Confirm with Infrastructure before answering.','Needs evidence'],
 ['Do you notify all customers within 24 hours of any incident?','SEC-03','Notification follows the applicable contract for confirmed customer-impacting incidents. The policy does not promise a universal 24-hour deadline.','Qualified'],
 ['How are deletion requests handled?','SEC-04','Validated deletion requests are completed within 30 days, subject to documented legal retention exceptions.','Supported'],
 ['Are all backup copies removed immediately on deletion?','SEC-04','No. Encrypted backup copies expire within 35 days.','Qualified'],
 ['How are critical suppliers assessed?','SEC-05','Critical suppliers are assessed before onboarding and annually.','Supported'],
 ['Are code changes peer reviewed?','SEC-06','Yes. Pull requests require peer review and automated checks before release.','Supported'],
 ['Do you run dependency and secret scans?','SEC-06','Yes. Automated dependency, secret and static-analysis checks are part of the development process.','Supported'],
 ['What are the recovery targets?','SEC-07','The stated targets are RPO 24 hours and RTO 8 hours. These are recovery targets, not a promise of uninterrupted service.','Qualified'],
 ['Has recovery been tested?','SEC-07','A restore exercise ran on 16 September 2026. The record includes a follow-up on runbook access.','Supported'],
 ['How long are production audit logs retained?','SEC-08','Production audit events are retained for 365 days, with restricted access.','Supported'],
 ['What are your vulnerability remediation targets?','SEC-09','Internal targets are 2 days for critical, 7 for high, 30 for medium and 90 for low findings. Exceptions require Security approval.','Supported'],
 ['Do employees receive security training?','SEC-10','Yes. Training is required at onboarding and annually.','Supported'],
 ['Does each customer have dedicated infrastructure?','SEC-11','No. Infrastructure is shared; application authorisation and cross-tenant tests enforce tenant separation.','Qualified'],
 ['Can you guarantee data stays exclusively in Germany?','SEC-12','The standard environment is EU-hosted. The supplied policy does not guarantee exclusive German residency.','Qualified'],
 ['Can you provide a current independent penetration-test report?','SEC-06','No current penetration-test report was supplied in this evidence pack. Request the report, its scope and the remediation status from Security.','Needs evidence']
];
export const QUESTIONS=questions.map(([question,source,answer,status],i)=>({id:'Q-'+String(i+1).padStart(2,'0'),question,source,answer,status,owner:POLICIES.find(p=>p.id===source).owner,review:status==='Needs evidence'?'Request evidence before sending a positive claim.':status==='Qualified'?'Keep the scope restriction in the customer response.':'Confirm wording before external sharing.'}));
const controlSpecs=[
 ['CC6.1','User access review','Identity','Quarterly access review','2026-Q3','2026-10-05','Accepted','IAM-218','Review shows sampled staff access, reviewer sign-off and removal tickets.'],
 ['CC6.2','Joiner access approvals','People Operations','Joiner approval sample','2026-Q3','2026-10-06','Accepted','HR-041','All sampled joiners have manager approval before access creation.'],
 ['CC6.3','Leaver access removal','Identity','Offboarding tickets','2026-Q3','2026-10-08','Needs evidence','IAM-224','Two sampled departures lack a timestamp for final application access removal.'],
 ['CC6.6','Production network access','Infrastructure','Firewall review','2026-Q3','2026-10-09','Accepted','NET-088','Reviewed rules are linked to owners and approved service requirements.'],
 ['CC7.1','Vulnerability response','Security','Remediation register','2026-Q3','2026-10-10','Needs review','VUL-091','Three overdue findings have mitigation notes but no approved exceptions.'],
 ['CC7.2','Security monitoring','Security','Alert triage sample','2026-Q3','2026-10-04','Accepted','SOC-116','Sampled alerts include investigation notes, timestamps and closure decisions.'],
 ['CC7.3','Incident assessment','Security','Incident register','2026-Q2','2026-07-08','Wrong period','INC-032','The register covers Q2. Supply the Q3 register or a signed no-incident statement for Q3.'],
 ['CC7.4','Incident response exercise','Security','Tabletop exercise report','2026-Q3','2026-10-12','Pending approval','IR-015','Exercise results are present but the response owner has not approved the follow-up plan.'],
 ['CC8.1','Change management','Engineering','Release approval sample','2026-Q3','2026-10-02','Accepted','REL-064','Each sampled release includes peer review, build status and release approval.'],
 ['CC9.2','Supplier risk review','Risk','Critical supplier register','2026-Q3','2026-10-01','Needs evidence','VEN-022','Two critical suppliers lack the current annual assessment.'],
 ['A1.2','Backup monitoring','Infrastructure','Backup job evidence','2026-Q3','2026-10-07','Accepted','BKP-109','Daily job evidence covers the period with failed-job follow-up attached.'],
 ['A1.3','Restore testing','Infrastructure','Restore exercise','2026-Q3','2026-09-16','Needs review','DR-018','Restore met the recorded target. Runbook access was missing for the secondary responder.'],
 ['CC2.2','Security training','People Operations','Training completion export','2026-Q3','2026-10-03','Accepted','TRN-044','Completion export and exception follow-ups cover active staff.'],
 ['CC3.2','Risk assessment','Risk','Annual risk register','2026-Q3','2026-10-11','Missing owner','RSK-012','The register is present but the accountable owner field is empty.'],
 ['CC5.3','Policy review','Security','Policy approval record','2026-Q3','2025-09-01','Stale','POL-009','The last approved review is over a year old. Provide the current approval record.'],
 ['CC6.7','Encryption key access','Infrastructure','Key-access review','2026-Q3','2026-10-06','Accepted','KEY-051','Privileged key-access sample is reviewed and tied to access approvals.']
];
export const CONTROLS=controlSpecs.map(([id,title,owner,evidence,period,reviewed,status,reference,note])=>({id,title,owner:status==='Missing owner'?'Unassigned':owner,evidence,period,reviewed,status,reference,note,due:'2026-11-08',request:status==='Accepted'?'Retain the reviewed evidence and approval receipt.':'Provide the missing record, resolve the stated gap and obtain control-owner approval.',expected_period:'2026-Q3'}));
export const TRANSCRIPTS=[
 {id:'bd-pilot',title:'Pilot approval and export issue',type:'Business development',account:'Northstar Analytics',date:'2026-10-29',attendees:'Maya Patel, Operations Director; Alex Reed, Meridian',transcript:[
 ['00:42','Maya','We have completed the technical review. Please move us into the pilot; we can start with the London team on 9 November.'],
 ['02:10','Maya','The budget might be around £32,000 a year, but Finance has not signed that off. Please send a proposal for 40 seats.'],
 ['04:05','Maya','Our CSV exports put Revenue before Customer even though Customer is first in the report. It happened on three exports yesterday.'],
 ['05:31','Alex','I will ask Engineering to investigate the column order and send the proposal by Tuesday.'],
 ['06:12','Maya','Please keep the commercial discussion with me and include Priya from Finance in the follow-up.'],
 ["07:05", "Alex", "What would make the pilot useful enough for the London team to keep using it?"],
 ["07:28", "Maya", "Our operations analysts prepare a weekly revenue pack for the Monday meeting. They currently reorder the exported columns by hand. We want the CSV to match the saved report so that the pack can be checked without that extra step."],
 ["08:14", "Maya", "Please test a report with Customer, Revenue and Region in that order. Compare the export headings and a sample of rows against the report; we must not move values under the wrong headings."],
 ["09:02", "Alex", "I will put those reproduction steps on the engineering report. We will need a regression test and your confirmation before calling the export problem resolved."],
 ["10:16", "Maya", "Priya needs the proposal to show the seat count, annual price, billing terms and any implementation charges separately. The budget is a planning figure; it is not approval to sign."],
 ["11:08", "Alex", "I will own the proposal and the handover. Sam will help the London team with setup. Let us use the next follow-up to check access, the export issue and the questions Finance still has."],
 ["12:03", "Maya", "London is the initial scope. Other offices are only a possibility once the pilot proves useful; please do not include them as committed expansion."]
 ],stage:['Technical review','Pilot agreed'],budget:32000,seats:40,issue:'CSV export column order differs from the report',issueQuote:2,committed:true,action:'Send a 40-seat proposal and confirm the London pilot setup.',owner:'Alex Reed',due:'2026-11-03'},
 {id:'bd-interest',title:'Interest without a commitment',type:'Business development',account:'Harbour Systems',date:'2026-10-30',attendees:'Dan Morgan, Product Lead; Alex Reed, Meridian',transcript:[
 ['00:30','Dan','A pilot could be useful, but we need the security team to review it first. We have not committed to a start date.'],
 ['02:04','Dan','Could you send the Enterprise SSO information? We would probably start with 15 seats if the review works out.'],
 ['03:20','Dan','I do not have an approved budget to share yet.'],
 ['04:45','Alex','I will send the security pack and arrange a review with your security lead next week.'],
 ['05:10','Dan','No product issues from us so far. We are still evaluating the fit.'],
 ["06:04", "Alex", "What is the security team trying to establish before they would support a pilot?"],
 ["06:36", "Dan", "They need to understand Enterprise SSO, who can access customer data, where the standard environment is hosted and what happens when data is deleted. Please use the approved policy pack rather than a general assurance."],
 ["07:22", "Dan", "We use an existing identity provider. I will introduce our security lead, Eva, after I have sent her the information. She has not booked a review slot yet."],
 ["08:10", "Alex", "I will send the pack, list anything we cannot answer from current evidence and ask you for an introduction. We should not set a pilot date until that review is complete."],
 ["09:01", "Dan", "The 15 seats are a starting estimate for one team. We have not confirmed procurement, billing or an annual budget."],
 ["10:18", "Alex", "For the next call, let us confirm the review owner, the open security questions and what a small first evaluation would need to demonstrate."]
 ],stage:['Discovery','Discovery'],budget:null,seats:15,issue:null,issueQuote:null,committed:false,action:'Send the security pack and arrange a security review.',owner:'Alex Reed',due:'2026-11-05'},
 {id:'delivery-review',title:'Delivery review and recurring issue',type:'Customer success',account:'Northstar Analytics',date:'2026-10-31',attendees:'Maya Patel, Operations Director; Sam Chen, Customer Success',transcript:[
 ['00:25','Maya','The pilot is running for the London team. We are not ready to expand to the other offices yet.'],
 ['01:45','Maya','The CSV column order issue is still happening. The same thing was reported in our call on Thursday.'],
 ['03:12','Maya','Please give us a short guide showing how to export a report and check the headings before sharing it.'],
 ['04:08','Sam','I will link this report to the existing export issue and publish the export checklist for the pilot team.'],
 ['05:02','Maya','Keep the existing pilot scope. We will discuss expansion after the export issue is resolved.'],
 ["06:05", "Sam", "Can you describe where the export problem is getting in the way of the London pilot?"],
 ["06:32", "Maya", "The team is rehearsing the weekly revenue pack with sample reports. We can check the reports in the product, but the exported columns still need a manual comparison before anyone shares the CSV."],
 ["07:17", "Maya", "The same Customer, Revenue and Region report reproduces it. We have not changed the saved column order since Thursday. Please keep both call references on one engineering issue."],
 ["08:04", "Sam", "I will add the reproduction details to ENG-142 and ask Engineering for its current status. We do not have a confirmed fix date to give you today."],
 ["09:10", "Maya", "The checklist should explain how to export the report, compare the first row with the saved headings and stop sharing the file if a value appears under the wrong column."],
 ["10:03", "Sam", "I will prepare that guide for your review by 4 November and collect your confirmation after the regression evidence is ready."],
 ["11:16", "Maya", "Before the next call, please bring the engineering update and the guide. The wider rollout is still dependent on a reliable export and our sign-off."]
 ],stage:['Pilot active','Pilot active'],budget:null,seats:null,issue:'Recurring CSV export column-order issue',issueQuote:1,committed:false,action:'Link the repeat report to ENG-142 and prepare an export checklist.',owner:'Sam Chen',due:'2026-11-04'},
 {id:'internal-planning',title:'Internal planning and ownership',type:'Internal meeting',account:'Meridian product team',date:'2026-10-30',attendees:'Jordan Ellis, Product; Sam Chen, Customer Success; Casey Wong, Engineering',transcript:[
 ['00:18','Jordan','The release will stay in the pilot until Customer Success confirms the export workflow with Northstar.'],
 ['01:40','Casey','Engineering owns the column-order fix under ENG-142. We will attach the regression test before asking for release approval.'],
 ['03:05','Sam','I will prepare the customer export checklist and collect confirmation from Maya.'],
 ['04:22','Jordan','Record the pilot exit criteria in the team update. There is no decision to announce general availability today.'],
 ["05:12", "Casey", "The regression needs to use a report whose displayed heading order differs from the row object order. Compare both the headings and the cell values so that a cosmetic fix cannot hide a mapping problem."],
 ["06:09", "Sam", "Northstar needs a short checklist while Engineering investigates. I will send a draft to Maya, and keep the customer wording clear that the fix is not yet confirmed."],
 ["07:01", "Jordan", "Our exit criteria are a passing regression, a checked export from the pilot workflow and customer confirmation. Do not convert any of those into completed work until the evidence is attached."],
 ["08:18", "Casey", "I will attach test evidence to ENG-142. I cannot promise a general release date before that review."],
 ["09:06", "Jordan", "The next readiness review should show the owner and status of each exit criterion, the remaining customer action and the decision we need to make."],
 ["10:02", "Sam", "I will bring the guide status and customer feedback to that review. Pricing and broader expansion are outside this internal decision."]
 ],stage:null,budget:null,seats:null,issue:'ENG-142 release readiness',issueQuote:1,committed:false,action:'Record pilot exit criteria, attach the regression test and collect customer confirmation.',owner:'Jordan Ellis',due:'2026-11-04'}
];
export const SCENARIOS={
 'call-crm':TRANSCRIPTS.map(t=>({id:t.id,title:t.title,description:t.type+' · '+t.account,revisionLabel:'Keep the commitment and scope precise',revisionNote:'Use the speaker’s exact level of commitment. Keep commercial proposals separate from approved account values.'})),
 vulnerabilities:[{id:'estate',title:'Review the software estate',description:'40 inventory findings across production, staging and internal services.'},{id:'exceptions',title:'Review exceptions and overdue fixes',description:'Keep the original deadline until Security approves an exception.'},{id:'unaffected',title:'Check versions before assigning work',description:'Separate already-fixed installations from affected assets.'}].map(x=>({...x,revisionLabel:'Retain the deadline on pending exceptions',revisionNote:'An exception request is not an approved extension. Keep the SLA deadline and mitigation visible.'})),
 questionnaire:[{id:'full',title:'Complete a customer questionnaire',description:'20 questions matched to 12 approved policy sources.'},{id:'claims',title:'Review promises and missing evidence',description:'Customer SSO, incident deadlines, residency and report requests need careful qualification.'}].map(x=>({...x,revisionLabel:'Qualify the incident-notification answer',revisionNote:'Do not promise every customer a 24-hour deadline. Use the applicable contract and confirmed incident scope.'})),
 soc2:[{id:'quarterly',title:'Prepare the quarterly evidence pack',description:'16 controls, their evidence and a clear follow-up register.'},{id:'gaps',title:'Resolve the evidence gaps',description:'Wrong periods, stale approvals and missing owners stay open.'}].map(x=>({...x,revisionLabel:'Keep the wrong-period evidence open',revisionNote:'A Q2 incident register cannot satisfy the Q3 control review. Request the correct period before acceptance.'}))
};
export function sourceRows(workflow,scenario){
 if(workflow==='vulnerabilities')return VULNERABILITIES;
 if(workflow==='questionnaire')return POLICIES;
 if(workflow==='soc2')return CONTROLS;
 const t=TRANSCRIPTS.find(x=>x.id===scenario);if(!t)throw Error('Unknown transcript');return t.transcript.map(([at,speaker,text],i)=>({id:'T-'+(i+1),at,speaker,text}));
}
