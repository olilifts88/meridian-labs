import {inspectSource,outputViews} from './app-ui.mjs';
import {renderQualityReview} from './quality-review.mjs?v=branch-folds-20261102';
import {attachRouteSettings} from './route-settings.mjs?v=branch-folds-20261102';
import {add,badge,fold,select,money} from './workbench-shared.mjs?v=branch-folds-20261102';
import {attachRunButton} from './run-button.mjs?v=branch-folds-20261102';
import {renderRouteEvidence} from './route-evidence.mjs?v=branch-folds-20261102';
import {renderOutputEvaluation,revealResults} from './output-evaluation.mjs?v=branch-folds-20261102';
import {makePlan,calculatePlan,requestPrices} from './workflow-routing.mjs?v=branch-folds-20261102';
import {saveResult,readResults} from './visitor-results.mjs';
import {approvePublication,validatePublication,findPublication,publicationUrl,releasePRContext,releaseTitle} from './release-publication.mjs';
import {assessRelease,releaseEvidence,releaseDecisions} from './release-quality.mjs';

import {releaseCopy,copyText,renderCopy} from './release-copy.mjs';
import {EXTRA_RELEASE_CASES,EXTRA_RELEASE_RECORDS,preparedReleaseResult} from './release-examples.mjs';
function fact(p,label,text,id){const d=add(p,'div','',{class:'rw-fact',...(id?{id}:{})});add(d,'dt',label);add(d,'dd',text);}
function sourceLink(p,id,label='View source'){if(id){const a=add(p,'a',label,{href:'#'+id,class:'rw-source-link'});a.onclick=e=>{if(inspectSource(document.getElementById(id),a)){e.preventDefault();return;}let n=document.getElementById(id);while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}};}}
function json(p,label,value){add(fold(p,label),'pre',JSON.stringify(value,null,2));}

export function renderReleaseWorkbench(app,catalog,card,{say=()=>{},saved=null}={}){
 document.body.classList.add('release-page');
 app.classList.add('release-workbench');
 const allRecords=[...catalog.records,...EXTRA_RELEASE_RECORDS],allCases=[...catalog.cases,...EXTRA_RELEASE_CASES];
 const params=new URLSearchParams(location.search),initial=saved?.record||allRecords.find(r=>r.id===params.get('record')&&r.case_id.startsWith('release-notes:'));
 let record,plan,session=null,busy=false,revision=0,previousDraft=null;
 const header=add(app,'div','',{class:'rw-heading'});add(header,'div','Release notes',{class:'eyebrow'});add(header,'h1','Prepare a release announcement');add(header,'p','Check what shipped, keep the rollout conditions clear and review the finished draft.',{class:'lead'});
 const bar=add(app,'section','',{class:'rw-commandbar','aria-label':'Workflow controls'}),choices=add(bar,'div','',{class:'rw-choices'});
 const workflow=select(choices,'Workflow',[['release-notes','Release notes'],['call-crm','Transcript to action'],['questionnaire','Security questionnaires'],['vulnerabilities','Vulnerability review'],['soc2','SOC 2 evidence']],'release-notes');
 const cases=select(choices,'Scenario',allCases.filter(c=>c.workflow==='release-notes').map(c=>[c.id,c.title]),initial?.case_id||'release-notes:2');
 const run=add(bar,'button','Run workflow',{type:'button',class:'primary rw-run'});
 const resultDeck=add(app,'section','',{class:'rw-result-deck','aria-label':'Workflow result'}),evaluation=add(resultDeck,'section','',{class:'rw-panel rw-evaluation','aria-label':'Output evaluation'});resultDeck.hidden=true;
 run.dataset.idleLabel='Review prepared scenario';run.dataset.completeLabel='Prepared · View output ↓';const completion=attachRunButton(run,resultDeck,()=>execute());
 const settingsBar=add(app,'div','',{class:'rw-settings-bar'}),openSettings=add(settingsBar,'button','Adjust route & token budgets',{type:'button',class:'rw-settings-trigger','aria-haspopup':'dialog','aria-controls':'route-settings-dialog'});
 bar.after(settingsBar);
 const route=add(app,'section','',{class:'rw-route',id:'model-routing','aria-labelledby':'rw-route-title'}),routeHeader=add(route,'div','',{class:'row'});add(routeHeader,'h2','Model route',{id:'rw-route-title'});const routeType=badge(routeHeader,'Recommended route');
 const routeFold=fold(app,'Model route & cost');routeFold.className='app-route-disclosure';settingsBar.after(routeFold);routeFold.append(route);
 const routeEvidenceHost=add(route,'div');
 const stageCards=add(route,'div','',{class:'rw-stage-grid'}),routeStats=add(route,'dl','',{class:'rw-costs'});
 attachRouteSettings(app,openSettings,{getContext:()=>({workflow:'release-notes',record,card,plan,records:catalog.records}),onApply:next=>{plan=next;invalidate();drawRoute();}});
 const costDifference=add(route,'div','',{class:'rw-cost-difference','aria-live':'polite'}),explain=fold(route,'What do these estimates mean?');add(explain,'p','Selected route: the estimated API token cost of all enabled steps using their chosen models.');add(explain,'p','One-model comparison: the same token amounts, priced with the comparison model at every step. Change that model in the route settings to compare another option.');add(explain,'p','Planned tokens: input plus output across all enabled steps. Instructions, source documents and earlier answers may be read more than once. These amounts are planning assumptions, not measured usage or enforced limits. Changing them updates the calculator, not the saved draft.');const pricingStatus=add(explain,'p','',{class:'muted','aria-live':'polite'});

 const sourceFold=add(app,'details','',{class:'rw-source-fold'});add(sourceFold,'summary','Release evidence');sourceFold.open=true;const workspace=add(sourceFold,'div','',{class:'rw-workspace rw-source-workspace'}),evidence=add(workspace,'section','',{class:'rw-panel rw-evidence','aria-labelledby':'rw-evidence-title'}),output=add(resultDeck,'section','',{class:'rw-panel rw-output','aria-labelledby':'rw-output-title','aria-live':'polite'});
 const quality=add(resultDeck,'section');const views=outputViews(resultDeck,{'Draft':output,'Source checks':evaluation,'Quality & evidence':quality});
 const compare=add(app,'section','',{class:'rw-panel rw-comparison'});
 const modes=add(evidence,'div'); // Reattached after each evidence redraw.
 const inputMode=select(modes,'Evidence pack',[['complete','Complete release evidence'],['missing','Missing rollout confirmation']],'complete');
 add(app,'p','Your result is saved in this browser. Open a step or source for the detail.',{class:'rw-footnote'});
 function selected(){return initial?.case_id===cases.value?initial:allRecords.find(r=>r.case_id===cases.value&&(r.configuration==='sol-guided'||r.kind==='prepared_release_output'));}
 function disable(value){busy=value;run.disabled=value;workflow.disabled=value;cases.disabled=value;inputMode.disabled=value;openSettings.disabled=value;}
 function invalidate(){session=null;revision++;showPlaceholder();}
 function showPlaceholder(){completion.reset();resultDeck.hidden=true;evaluation.replaceChildren();sourceFold.open=true;output.replaceChildren();add(output,'h2','Release draft',{id:'rw-output-title'});badge(output,'Ready to run');const empty=add(output,'div','',{class:'rw-empty'});add(empty,'div','↗',{class:'rw-empty-mark','aria-hidden':'true'});add(empty,'h3','Your draft will appear here');add(empty,'p','Run the workflow to see the announcement, source decisions and quality checks.');}
 function drawRoute(){
  routeEvidenceHost.replaceChildren();renderRouteEvidence(routeEvidenceHost,catalog.records,card.models,{preset:plan.preset});
  const estimate=calculatePlan(plan);stageCards.replaceChildren();routeStats.replaceChildren();routeType.textContent=plan.preset==='custom'?'Custom route':plan.preset==='economy'?'Lower-cost route':plan.preset==='deep'?'Deeper review':!plan.preset||plan.preset==='routed'?'Recommended route':card.models[plan.preset]?.label+' throughout';
  const missing=inputMode.value==='missing';if(missing)routeType.textContent='Held for evidence';routeType.className='rw-badge '+(missing?'warn':'neutral');
  const a=assessRelease(record),contributions=[['Scope & audience',a.pilot?'Keep the confirmed audience restriction attached to the change.':'Confirm general availability before drafting.'],['Customer-facing draft','Explain the change and the next action in a short announcement.'],['Claim review','Match the audience, change and action to the release specification.'],['Review copy','Keep the approved facts intact in the final format.']];
  for(const [i,s] of plan.stages.entries()){
   const d=fold(stageCards,''),summary=d.querySelector('summary');summary.textContent='';add(summary,'span',String(i+1).padStart(2,'0'),{class:'rw-stage-number'});add(summary,'strong',s.name);const labels=add(summary,'span','',{class:'rw-labels'});badge(labels,plan.rate_card.models[s.model].label,'model');badge(labels,s.effort[0].toUpperCase()+s.effort.slice(1)+' effort');
   const contribution=contributions[i]||['Extra review','An additional budgeted attempt.'];add(d,'h3',contribution[0]);add(d,'p',contribution[1]);add(d,'p',s.reason,{class:'muted'});badge(d,s.enabled?'Included':'Excluded');
  }
  const baselineName=plan.rate_card.models[plan.baseline_model]?.label||plan.baseline_model;
  fact(routeStats,'Selected route estimate',missing?'On hold':money(estimate.amount));fact(routeStats,'All steps: '+baselineName,missing?'—':money(estimate.baseline));fact(routeStats,'Planned tokens',missing?'0 · on hold':plan.stages.filter(s=>s.enabled).reduce((n,s)=>n+s.input_tokens+s.output_tokens,0).toLocaleString());fact(routeStats,'Rates',plan.rate_card.verified_on+' · USD');
  costDifference.replaceChildren();if(!missing&&estimate.difference!=null){const difference=estimate.amount-estimate.baseline;badge(costDifference,(difference<0?'−':difference>0?'+':'')+money(Math.abs(difference))+' · '+(difference<0?'lower estimated cost':difference>0?'higher estimated cost':'same estimated cost'),difference<0?'good':difference>0?'warn':'neutral');add(costDifference,'span','Compared with '+baselineName+' at every step, using the same token estimates.',{class:'muted'});}

 }
 function drawEvidence(){
  evidence.replaceChildren();const {source,change}=releaseEvidence(record),missing=inputMode.value==='missing';const heading=add(evidence,'div','',{class:'row'});add(heading,'h2','Release evidence',{id:'rw-evidence-title'});badge(heading,missing?'Needs evidence':'Source approved',missing?'warn':'good');
  add(evidence,'p',source.title,{class:'rw-source-title'});const facts=add(evidence,'dl','',{class:'rw-facts'});
  fact(facts,'What changed',change.summary,'release-source-change');
  fact(facts,'Availability',missing?'Rollout confirmation not supplied.':change.availability_statement,'release-source-availability');
  const labels=add(evidence,'div','',{class:'rw-labels'});badge(labels,missing?'Rollout unknown':change.audience_label||(change.stage==='ga'?'General availability':'Pilot only'),missing?'warn':'neutral');if(!missing)for(const audience of change.audiences){const text=audience.replaceAll('_',' ');if(text.toLowerCase()!==(change.audience_label||'').toLowerCase())badge(labels,text);}
  const action=add(evidence,'dl','',{class:'rw-facts'});fact(action,'Customer action',change.action,'release-source-action');
  const refs=add(evidence,'div','',{id:'release-source-references',class:'rw-references'});add(refs,'span','Linked work',{class:'rw-field-label'});const tags=add(refs,'div','',{class:'rw-labels'});for(const url of change.pr_urls)badge(tags,'PR #'+url.split('/').pop());badge(tags,'1 product change');
  const context=fold(evidence,'Read the PR context');for(const pr of releasePRContext(record)){const item=fold(context,'PR #'+pr.number+' · '+pr.title);add(item,'p',pr.summary);add(item,'span',pr.file,{class:'rw-code-path'});const code=add(item,'pre','',{class:'rw-diff'});for(const [kind,line] of pr.lines)add(code,'code',(kind==='add'?'+ ':kind==='remove'?'- ':'  ')+line,{class:kind});}add(context,'p','Prepared code excerpts for this demo. The recorded source snapshot is preserved separately.',{class:'muted'});
  const meta=fold(evidence,'Source details');add(meta,'p','Reviewed '+source.reviewed_on+' · evidence as of '+record.evidence.as_of,{class:'muted'});add(meta,'p','Both PR references belong to '+change.change_id+'. The confirmed rollout statement sets the audience.');json(meta,'Exact source snapshot',record.evidence);
  const contextSource=record.evidence.sources['supporting-context'];if(contextSource){const extra=add(evidence,'div','',{id:'release-source-context'});add(extra,'h3',contextSource.title);add(extra,'p',contextSource.content,{class:'muted'});}
  const test=fold(evidence,'Test an evidence gap');test.append(modes);const issue=add(test,'button','Load a missing-action draft',{type:'button'});issue.onclick=()=>prepareRevision(true);add(test,'p','Remove rollout confirmation to check whether the workflow holds the draft.',{class:'muted'});
 }
 function drawComparisons(){compare.replaceChildren();const d=fold(compare,'Sources and review method');add(d,'p','The workflow checks audience, claims, customer action and format against the release pack. A reviewer approves the finished copy.');add(d,'a','Supporting model evidence',{href:'/runs.html?workflow=release-notes'});}
 function prepareRevision(issue=false){
  previousDraft=releaseCopy(record);const original=selected();record={...structuredClone(original),id:'prepared-revision--'+original.id,kind:'prepared_release_output',editorial_revision:issue?1:2,editorial_issue:issue?'missing-action':null,revision_source_id:original.id};record.answer=JSON.stringify({body:copyText(releaseCopy(record))});session=null;drawOutput(null);say(issue?'The customer action is missing. Review the flagged check, then request the correction.':'Revised draft prepared. Review the changed copy, then approve it.');
 }
 function revisionForm(parent){
  if(parent.querySelector('.revision-form'))return;const form=add(parent,'div','',{class:'revision-form'});add(form,'h3','Request a revision');add(form,'p','Restore or clarify the customer action using the release evidence.');const label=add(form,'label','Reviewer note'),note=add(label,'textarea','',{'aria-label':'Reviewer note',rows:'3'});const revise=add(form,'button','Review revised draft',{type:'button',class:'primary'});revise.onclick=()=>{const text=note.value.trim();prepareRevision(false);record.reviewer_note=text;execute();};const save=add(form,'button','Save note only',{type:'button'});save.onclick=()=>{if(!note.value.trim()){say('Add a note before saving.',true);return;}record={...structuredClone(record),id:'prepared-feedback--'+record.id,kind:'prepared_release_output',revision_source_id:record.revision_source_id||record.id,reviewer_note:note.value.trim()};execute('reject');};
 }
 function drawOutput(result,{storageError=null,animate=false}={}){
  output.replaceChildren();if(result)completion.complete();else completion.held();const a=assessRelease(record,{missingAvailability:inputMode.value==='missing'});renderOutputEvaluation(evaluation,{checks:a.checks,record,records:catalog.records,models:card.models,revision:record.editorial_revision===2?'Customer action clarified; the source conditions and required steps have been checked again.':null,scope:'Release notes · '+allCases.find(c=>c.id===cases.value).title});renderQualityReview(quality,{workflow:'release-notes',record,records:catalog.records,plan,models:card.models,cases:allCases,missingAvailability:inputMode.value==='missing'});resultDeck.hidden=false;views.refresh();sourceFold.open=false;const head=add(output,'div','',{class:'row'});add(head,'h2','Release draft',{id:'rw-output-title'});
  if(!a.available){badge(head,'Needs evidence','warn');add(output,'h3','Confirm availability before drafting');add(output,'p','The release pack identifies the change and customer action, but does not confirm who can use it. Ask the release owner for the rollout stage and audience.');sourceLink(output,'release-source-availability','Review the missing evidence');add(output,'p','Draft held. No approval is available until the evidence is complete.',{class:'rw-hold'});views.refresh();if(animate)revealResults(resultDeck,{scroll:false});return;}
  badge(head,a.ready?'Checks passed':'Needs review',a.ready?'good':'warn');const state=!a.ready?'Held by checks':result?.publication&&!storageError?'Release note published':result?.review_choice==='approve'?'Ready to publish':result?.review_choice==='reject'?'Changes requested':'Awaiting approval';badge(output,state,result?.review_choice==='approve'?'good':'neutral');
  const draft=add(output,'article','',{class:'rw-draft'});add(draft,'div','Product update',{class:'eyebrow'});add(draft,'h3',releaseTitle(record));const copy=releaseCopy(record);renderCopy(draft,copy);if(record.editorial_revision===2){badge(output,'Revised draft','good');const changed=fold(output,'What changed');add(changed,'p','The customer action now has explicit steps. Confirmed availability and product claims are retained.');if(previousDraft){add(changed,'h4','Previous draft');renderCopy(changed,previousDraft);}if(record.reviewer_note)add(changed,'p','Reviewer note: '+record.reviewer_note);}
  const tools=add(output,'div','',{class:'rw-output-tools'}),copyButton=add(tools,'button','Copy draft',{type:'button'});copyButton.onclick=async()=>{try{await navigator.clipboard.writeText([copy.title,copyText(copy)].join('\n\n'));copyButton.textContent='Copied';}catch{say('Copy is unavailable. Select and copy the draft text.',true);}};
  if(result&&!storageError)add(tools,'a','Open saved result',{href:'/results.html?session='+encodeURIComponent(result.id),class:'button'});
  if(result){const download=add(tools,'button','Download result',{type:'button'});download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=result.id+'.json';link.click();URL.revokeObjectURL(url);};}
  const decisionFold=fold(output,'Why this draft says what it says');for(const decision of releaseDecisions(record)){const row=add(decisionFold,'div','',{class:'rw-decision'});badge(row,decision.label,decision.tone);add(row,'strong',decision.title);add(row,'p',decision.text);sourceLink(row,decision.source);}
  const review=add(output,'div','',{class:'rw-review'});add(review,'h3','Review decision');if(result?.publication&&!storageError){add(review,'a','View release note',{href:publicationUrl(result),class:'button primary'});}else if(a.ready){const controls=add(review,'div','',{class:'rw-output-tools'});for(const [choice,label] of [['approve','Approve & publish'],['reject','Request changes']]){const b=add(controls,'button',label,{type:'button',...(choice==='approve'?{class:'primary'}:{})});b.disabled=busy||(choice==='reject'&&result?.review_choice===choice);b.onclick=()=>choice==='reject'?revisionForm(review):execute(choice);}add(review,'p','Approve the draft to open its release-note page.',{class:'muted'});}else {add(review,'p','Resolve the flagged check before approval.');const fix=add(review,'button','Request changes',{type:'button'});fix.onclick=()=>revisionForm(review);}
  if(storageError)add(output,'p','Browser save failed: '+storageError+'. Download the result to keep it.',{role:'alert',class:'error'});
  const method=fold(output,'Output source & method');badge(method,card.models[record.requested_model]?.label||'Workflow output','model');add(method,'p','Source answer: '+record.id+'. The draft is formatted from the supplied release context; original answers are preserved. The model route is a configurable plan; its costs use entered token budgets.',{class:'muted'});json(method,'Recorded answer and checks',{answer:record.answer,checks:record.revised_checks||record.original_checks});if(animate)revealResults(resultDeck,{scroll:false});
 }
 function change(){previousDraft=null;record=selected();invalidate();drawEvidence();plan=makePlan('release-notes',record,card);drawRoute();drawComparisons();pricingStatus.textContent='';say('');}
 async function execute(reviewChoice='pending'){
  if(busy)return;const a=assessRelease(record,{missingAvailability:inputMode.value==='missing'});
  if(!a.available){session=null;drawOutput(null,{animate:true});say('Workflow held: confirm the release audience and rollout stage.');return;}
  if(reviewChoice==='approve'&&!a.ready)return;
  disable(true);const runTicket=completion.begin();say('Checking the saved output and latest prices…');const runRevision=revision;
  try{
   if(reviewChoice==='approve'){const existing=findPublication(readResults(localStorage),record);if(existing){location.assign(publicationUrl(existing));return;}}
   let value;if(record.kind==='prepared_release_output'){value=preparedReleaseResult(record,allCases.find(c=>c.id===record.case_id),reviewChoice);}else{const response=await fetch('/api/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({record_id:record.id,review_choice:reviewChoice})});value=await response.json();if(!response.ok)throw Error(value.error||'The workflow result could not be loaded.');}
   const savedPlan=reviewChoice!=='pending'&&session?.routing_plan?structuredClone(session.routing_plan):structuredClone(plan);try{if(reviewChoice==='pending')savedPlan.rate_card=await requestPrices(savedPlan.rate_card);if(reviewChoice==='pending')savedPlan.pricing_check={status:'verified',checked_at:savedPlan.rate_card.checked_at};}catch{savedPlan.pricing_check={status:'saved_rates',attempted_at:new Date().toISOString(),reason:'Using the dated saved rate card; fresh prices could not be verified.'};}
   savedPlan.estimate=calculatePlan(savedPlan);value.routing_plan=savedPlan;if(reviewChoice==='approve')value=approvePublication(value);
   if(previousDraft)value.previous_draft=previousDraft;let storageError=null;try{saveResult(localStorage,value);if(value.publication)validatePublication(readResults(localStorage).find(r=>r.id===value.id));}catch(error){storageError=error.message;}
   if(runRevision!==revision)return;session=value;drawOutput(value,{storageError,animate:reviewChoice!=='approve'});pricingStatus.textContent=savedPlan.pricing_check?.status==='saved_rates'?'Latest prices could not be verified. The calculator uses the saved '+savedPlan.rate_card.verified_on+' rate card.':'';say(storageError?'Result ready. Browser saving is unavailable.':'Result ready · saved in this browser.');if(value.publication&&!storageError)location.assign(publicationUrl(value));
  }catch(error){completion.fail(runTicket);say(error.message,true);}finally{disable(false);if(session)for(const b of output.querySelectorAll('.rw-review button'))b.disabled=(b.textContent==='Request changes'&&session.review_choice==='reject');}
 }
 workflow.onchange=()=>location.assign('/scenarios.html?workflow='+workflow.value);cases.onchange=change;
 inputMode.onchange=()=>{invalidate();drawEvidence();drawRoute();if(inputMode.value==='missing')drawOutput(null);say('');};change();if(saved){session=saved;record=structuredClone(saved.record);previousDraft=saved.previous_draft||null;plan=saved.routing_plan||makePlan('release-notes',record,card);drawEvidence();drawRoute();drawOutput(saved);}
 return {element:app};
}
