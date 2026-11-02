import {price,validateCard} from './pricing.mjs';
export const WORKFLOWS={
 'customer-recovery':{title:'Customer recovery',automatic:true,stages:[['Understand the problem','gpt-6-luna','low','Classify the symptom and retrieve current account-scoped evidence.'],['Resolve or investigate','gpt-6.1-sol','medium','Use approved guidance for routine problems. Reserve technical investigation for exceptions.'],['Verify useful recovery','gpt-6.1-sol','high','Check customer confirmation against access and task evidence before closure.'],['Capture the checked fix','gpt-6-luna','low','Version, index and reuse validated guidance. Withdraw it if the case reopens.']],checks:['Match the account and reject stale sources.','Allow only approved troubleshooting; never grant permissions.','Require customer confirmation and a successful blocked task.','Retain the source case and prevent duplicate or withdrawn guidance.'],gate:'Routine approved troubleshooting runs automatically. Missing guidance or failed recovery checks keep the case open for investigation.'},
 'release-notes':{title:'Release notes',stages:[['Read the release evidence','gpt-6.1-terra','medium','Check what shipped, who can use it and any rollout limits.'],['Draft the announcement','gpt-6.1-sol','medium','Write for the intended audience. Keep pilot restrictions clear.'],['Check claims and scope','gpt-6.1-sol','high','Check that every claim is backed by the release evidence.'],['Format for delivery','gpt-6-luna','low','Put the approved copy into the release-note template.']],gate:'A person approves publication. Keep pilot availability clear.'},
 vulnerabilities:{title:'Vulnerability review',stages:[['Read supplied advisories','gpt-6.1-terra','medium','Read the advisories for the installed software versions.'],['Plan remediation','gpt-6.1-sol','high','Explain what is affected, whether a fix exists and when it is due.'],['Review evidence and exceptions','gpt-6.1-sol','high','Review unclear fixes or conflicting severity ratings.'],['Format the review','gpt-6-luna','low','List the owner, deadline and source for each finding.']],gate:'Code checks installed versions first. Unaffected versions and missing scan coverage stay explicit; a person approves remediation.'},
 questionnaire:{title:'Security questionnaires',stages:[['Research approved evidence','gpt-6.1-terra','medium','Find the approved policy statements that answer the question.'],['Draft cited replies','gpt-6.1-sol','medium','Write the answer and link each claim to its source.'],['Review unsupported claims','gpt-6.1-sol','high','Check for conflicting policies or promises the evidence does not support.'],['Format the response','gpt-6-luna','low','Put the approved answer into the requested format.']],gate:'Ask for evidence where it is missing. A reviewer approves security claims before they are shared.'},
 soc2:{title:'SOC 2 evidence review',stages:[['Read evidence descriptions','gpt-6.1-terra','medium','Match each document to its control. Check the owner and review period.'],['Draft follow-up requests','gpt-6.1-sol','medium','Ask the right owner for the missing or updated evidence.'],['Review the evidence mapping','gpt-6.1-sol','high','Check that each document supports the control it is linked to.'],['Format the evidence pack','gpt-6-luna','low','Prepare the reviewer checklist and keep open requests visible.']],gate:'A reviewer owns evidence acceptance. Missing owners, stale documents and pending approvals cannot be cleared by a model.'},
 'call-crm':{title:'Transcript to action',stages:[
 ['Read the transcript','gpt-6.1-terra','medium','Extract decisions, requests and supporting quotes. Keep the speaker and context.'],
 ['Account updates','gpt-6.1-sol','high','Separate agreed account changes from suggestions. Keep indicative budgets pending.'],
 ['Engineering signals','gpt-6.1-sol','high','Identify the reported problem, retain the customer impact and check existing issue links.'],
 ['Pricing follow-up','gpt-6.1-sol','high','Prepare the commercial request without changing approved prices or contracted value.'],
 ['Meeting report','gpt-6.1-sol','medium','Record decisions, owners, due dates and unresolved questions for the team.'],
 ['Searchable knowledge','gpt-6.1-sol','medium','Retain source excerpts, speaker, account and topic so later answers can cite the conversation.'],
 ['Review the proposed changes together','gpt-6.1-sol','high','Check contradictions, duplicate records and approval requirements across destinations.'],
 ['Prepare the output records','gpt-6-luna','low','Format the reviewed account changes, issue links, commercial follow-up, team post and source excerpts.']
 ],parts:['read','crm','engineering','revenue','report','library','review','format'],inputWeights:[.55,.3,.35,.25,.4,.3,.6,.25],outputWeights:[.6,.35,.35,.3,.55,.4,.5,1],gate:'Check for duplicate changes. Keep tentative budgets pending and send price changes for approval.'}
};
const $=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
function add(p,t,text='',attrs={}){const n=$(t,text,attrs);p.append(n);return n;}
function select(p,label,options,value,change){const wrap=add(p,'label',label),s=add(wrap,'select','',{'aria-label':label});for(const [v,t] of options){const o=add(s,'option',t,{value:v});o.selected=v===value;}s.onchange=()=>change(s.value);return s;}
const money=n=>n==null?'Unavailable':'$'+Number(n).toFixed(5);
export function makePlan(workflow,record,card){
 const spec=WORKFLOWS[workflow];if(!spec)throw Error('Unknown workflow');
 const input=record?.usage?.input_tokens??6000,output=record?.usage?.output_tokens??600;
 const category=record?.evidence?.sources?.['product-change']?.content?.change_category;const gate=workflow==='release-notes'&&category==='breaking_change'?'A person approves publication. Retain the migration steps, API audience and confirmed support window.':workflow==='release-notes'&&category==='bug_fix'?'A person approves publication. Explain the fix and required customer action without promising recovery of previous exports.':spec.gate;
 const block=record?.routing_preview?.action==='hold',noModel=record?.routing_preview?.action==='code';
 const verification=spec.parts?spec.parts.indexOf('review'):2;
 const branchChecks={read:'Retain each speaker, timestamp and source excerpt.',crm:'Keep suggestions separate from commitments and approved account values.',engineering:'Keep one issue history and retain the exact reported behaviour.',revenue:'Do not turn an indicative budget into contracted revenue or an approved price.',report:'Retain decisions, owners, due dates and open questions.',library:'Preserve original excerpts and links to related records.',review:'Check consistency, duplicates and approval boundaries across every destination.',format:'Keep the reviewed values, qualifiers and citations intact.'};
 const stages=spec.stages.map(([name,model,effort,reason],index)=>({id:'stage-'+index,name,model,effort,reason,...(spec.parts?{route_part:spec.parts[index]}:{}),quality_check:spec.checks?.[index]??(spec.parts?branchChecks[spec.parts[index]]:(index===0?'Use current authorised sources and retain supporting evidence.':index===1?'Complete the requested task; preserve uncertainty and source conditions.':index===2?'Check correctness, completion and approval boundaries against the source.':'Keep facts and citations intact; make the next action clear.')),role:index===0?'coordinator':index===verification?'verification':'worker',
  enabled:!(block&&index>0)&&!noModel,
  input_tokens:Math.max(300,Math.ceil(input*(spec.inputWeights||[.55,.65,.6,.25])[index])),cached_input_tokens:0,cache_write_input_tokens:0,cache_write_30m_tokens:0,cache_write_12h_tokens:0,
  output_tokens:Math.max(100,Math.ceil(output*(spec.outputWeights||[.6,1.2,.5,1])[index])),reasoning_output_tokens:0,cache_write_semantics:'openai-input-subset-v1'}));
 return {schema:2,kind:'workflow_route_scenario',workflow,source_run_id:record?.id??null,policy_version:spec.parts?'transcript-branches-v1':'workflow-stages-v2',basis:workflow==='customer-recovery'?'Illustrative token assumptions for the recovery design; no measured model usage or quality.':'Editable planning token budgets, seeded from the selected recorded response scale. Stage usage, quality and latency have not been measured.',
  rate_card:structuredClone(card),processing_tier:'standard',region:'global',baseline_model:'gpt-6.1-sol',baseline_effort:'medium',stages,gate,gate_state:block?'hold':noModel?'code_only':spec.automatic?'automatic_checks':'approval_required',new_model_calls:0};
}
export function calculatePlan(plan){
 const rows=plan.stages.map(stage=>({...stage,estimate:stage.enabled?price({...stage,processing_tier:plan.processing_tier,region:plan.region},plan.rate_card):{amount:0,reason:null},baseline:stage.enabled?price({...stage,model:plan.baseline_model,effort:plan.baseline_effort,processing_tier:plan.processing_tier,region:plan.region},plan.rate_card):{amount:0,reason:null}}));
 const sum=key=>rows.every(r=>r[key].amount!=null)?rows.reduce((s,r)=>s+r[key].amount,0):null;
 const amount=sum('estimate'),baseline=sum('baseline');
 return {amount,baseline,difference:amount==null||baseline==null?null:baseline-amount,rows,coverage:amount==null?'Partial':'Complete for entered budgets',scope:'Planning estimate; no measured outcome or actual charge',rate_card_id:plan.rate_card.id};
}
export function compactRoute(parent,workflow){
 const spec=WORKFLOWS[workflow];if(!spec)return;
 const box=add(parent,'div','',{class:'route-mini'});add(box,'strong','Model route');
 const tags=add(box,'div','',{class:'route-chips'});for(const stage of (spec.parts?[spec.stages[0],spec.stages[1],spec.stages[6],spec.stages[7]]:spec.stages))add(tags,'span',stage[1].replace(/^gpt-([\d.]+)-(.+)$/,(_,v,n)=>'GPT-'+v+' '+n[0].toUpperCase()+n.slice(1))+' · '+stage[2],{class:'route-chip'});
 add(box,'a','Explore stages & costs →',{href:'/scenarios.html?workflow='+workflow+'#model-routing'});
}
export function renderPlanner(parent,workflow,record,card,{savedPlan=null,readonly=false,records=[],onChange=()=>{}}={}){
 let plan=savedPlan?structuredClone(savedPlan):makePlan(workflow,record,card);let expandedStage='';
 const root=add(parent,'section','',{class:'routing-planner card',id:'model-routing'});
 add(root,'div','Route settings',{class:'eyebrow'});add(root,'h2','Model route');
 add(root,'p',readonly?'Saved route and prices.':'Start with the recommended workflow route. Open a step to see why the model was chosen, or customise the route.',{class:'muted'});
 const top=add(root,'div','',{class:'routing-toolbar controls'}),tools=add(root,'details','',{class:'route-tools'});add(tools,'summary','Prices & downloads');const buttons=add(tools,'div','',{class:'controls'});
 let view=add(root,'div'),refreshStatus=add(root,'p','',{class:'muted','aria-live':'polite'});
 function modelOptions(){return Object.entries(plan.rate_card.models).map(([k,m])=>[k,m.label]);}
 function draw(){
  top.replaceChildren();view.replaceChildren();
  const update=()=>{draw();onChange(snapshot());};
  if(!readonly){
   const presetArea=add(top,'div');const advanced=add(top,'details','',{class:'pricing-options'});add(advanced,'summary','Customise & compare');const options=add(advanced,'div','',{class:'controls'});
   select(presetArea,'Workflow route',[['routed','Recommended route'],['economy','Lower-cost route'],['deep','Deeper review'],['custom','Custom route'],...modelOptions().map(([k,l])=>[k,l+' throughout'])],plan.preset||'routed',v=>{if(v==='custom')return;plan.preset=v;if(['routed','economy','deep'].includes(v)){const fresh=makePlan(workflow,record,plan.rate_card);plan.stages=fresh.stages;if(v==='economy')for(const s of plan.stages){if(s.role!=='verification')s.model='gpt-6-luna';}if(v==='deep')plan.stages.find(s=>s.role==='verification').model='gpt-6-astra';}else for(const s of plan.stages){s.model=v;if(!plan.rate_card.models[v].efforts.includes(s.effort))s.effort='medium';}update();});
   select(options,'Compare with',modelOptions(),plan.baseline_model,v=>{plan.baseline_model=v;update();});
   select(options,'Baseline effort',plan.rate_card.models[plan.baseline_model].efforts.map(x=>[x,x]),plan.baseline_effort,v=>{plan.baseline_effort=v;update();});
   select(options,'Processing',[['standard','Standard'],['flex','Flex'],['batch','Batch'],['fast','Fast'],['ultrafast','Ultrafast (eligible models)']],plan.processing_tier,v=>{plan.processing_tier=v;update();});
   select(options,'Pricing region',[['global','Global'],['regional','Regional (+10%)'],['fedramp','FedRAMP (+10%)']],plan.region,v=>{plan.region=v;update();});
  }
  const quality=add(view,'details','',{class:'quality-rationale'});add(quality,'summary','Why this route: quality first, then cost');add(quality,'p','Define the required outcome and prohibited actions first. Compare versions on the same source cases, inspect errors and human feedback, then compare cost among routes that meet the quality gates. Code checks fixed rules; reviewers judge source truth and usefulness.');add(quality,'p','Six checks: accuracy, completion, instructions and permissions, verification, clarity, efficiency.',{class:'muted'});const matched=records.filter(r=>r.case_id===record?.case_id);if(matched.length){add(quality,'h3','Evaluation evidence for this example');add(quality,'p','Compare “What to produce” with “What to produce + how to do it”. The second adds the workflow method and checks. Same task. Same source evidence.',{class:'muted'});const t=add(add(quality,'div','',{class:'table-wrap'}),'table'),h=add(add(t,'thead'),'tr');for(const name of ['Recorded setup','Original checks','Revised checks','Owner review','Source'])add(h,'th',name);const b=add(t,'tbody');for(const r of matched){const tr=add(b,'tr');add(tr,'td',plan.rate_card.models[r.requested_model]?.label+' / '+(r.configuration.endsWith('guided')?'What to produce + how to do it':'What to produce'));add(tr,'td',r.original_checks.outcome);add(tr,'td',(r.revised_checks||r.original_checks).outcome);add(tr,'td',r.owner_review||'Awaiting review');add(add(tr,'td'),'a','Inspect answer',{href:'/results.html?run='+encodeURIComponent(r.id)});}add(quality,'p','These source comparisons inform the workflow design. Stage assignments follow the task requirements and quality gates; fixed-setup evidence stays attached to its original answers.',{class:'muted'});}add(quality,'a','Explore the evaluation method →',{href:'/evaluation.html#stage-routing'});
  const result=calculatePlan(plan),summary=add(view,'div','',{class:'routing-summary'});
  const delta=result.amount==null||result.baseline==null?null:result.amount-result.baseline;
  for(const [name,value] of [['Selected route estimate',money(result.amount)],['All steps: '+plan.rate_card.models[plan.baseline_model].label,money(result.baseline)],['Estimated difference',delta==null?'Unavailable':(delta<0?'−':delta>0?'+':'')+money(Math.abs(delta))]]){const item=add(summary,'div');add(item,'strong',value);add(item,'span',name);}
  add(view,'p','Prices checked '+new Date(plan.rate_card.verified_on+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' · USD · '+plan.processing_tier,{class:'muted'});
  add(view,'p',readonly?'Open a step to inspect its model and cost.':'Open a step to change its model, effort and token budget.',{class:'budget-note'});
  const pre=add(view,'div','',{class:'code-stage'});add(pre,'strong','Evidence and routing checks');add(pre,'p','Validate sources, select the route and prevent duplicates.');
  const flow=add(view,'ol','',{class:'route-stages'});
  for(const row of result.rows){
   const stage=plan.stages.find(s=>s.id===row.id),item=add(flow,'li','',{class:'route-stage'+(!stage.enabled?' stage-held':'')}),fold=add(item,'details');fold.open=expandedStage===stage.id;fold.ontoggle=()=>{if(fold.open)expandedStage=stage.id;};const head=add(fold,'summary','',{class:'route-stage-head'}),li=add(fold,'div','',{class:'route-stage-content'});add(head,'h3',stage.name);add(head,'span',plan.rate_card.models[stage.model].label+' · '+stage.effort,{class:'route-model-label'});add(head,'strong',money(row.estimate.amount));
   if(!readonly){
    const enabled=add(li,'label','Include stage budget '),check=add(enabled,'input','',{type:'checkbox','aria-label':'Include '+stage.name});check.checked=stage.enabled;check.onchange=()=>{stage.enabled=check.checked;update();};
    const controls=add(li,'div','',{class:'controls'});
    select(controls,'Model · '+stage.name,modelOptions(),stage.model,v=>{stage.model=v;plan.preset='custom';if(!plan.rate_card.models[v].efforts.includes(stage.effort))stage.effort='medium';update();});
    select(controls,'Effort · '+stage.name,plan.rate_card.models[stage.model].efforts.map(x=>[x,x]),stage.effort,v=>{stage.effort=v;update();});
   }else add(li,'p',plan.rate_card.models[stage.model].label+' · '+stage.effort+' effort'+(!stage.enabled?' · excluded':''));
   add(li,'p',stage.reason,{class:'muted'});add(li,'p','Quality check: '+(stage.quality_check||'Preserve the source facts and approval boundaries.'),{class:'stage-quality'});
   if(!stage.enabled)add(li,'p',plan.gate_state==='hold'?'Held for evidence; this stage has no budget until explicitly included.':'No model required by the selected source route; this stage is excluded.',{class:'notice'});
   if(row.estimate.reason)add(li,'p',row.estimate.reason,{class:'error'});
   const more=add(li,'details');add(more,'summary','Token budget & cost breakdown');
   if(!readonly){const inputs=add(more,'div','',{class:'token-inputs'});for(const [key,label] of [['input_tokens','Total input'],['cached_input_tokens','Cached reads'],['cache_write_30m_tokens','30-minute writes'],['cache_write_12h_tokens','12-hour writes'],['output_tokens','Total output (includes reasoning)'],['reasoning_output_tokens','Reasoning subset']]){
     const wrap=add(inputs,'label',label),input=add(wrap,'input','',{type:'number',min:'0',step:'1',value:String(stage[key]),'aria-label':stage.name+' '+label});
     const readValue=()=>{stage[key]=input.value.trim()===''?null:Number(input.value);stage.cache_write_input_tokens=stage.cache_write_30m_tokens+stage.cache_write_12h_tokens;};input.oninput=()=>{readValue();onChange(snapshot());};input.onchange=()=>{readValue();update();};
   }}
   add(more,'pre',JSON.stringify({budget:stage,calculation:row.estimate},null,2));
  }
  const gate=add(view,'div','',{class:'code-stage gate-stage'});add(gate,'strong','Quality gate & approval');add(gate,'p',plan.gate);
  const method=add(view,'details');add(method,'summary','Sources & calculation');add(method,'p','Rate card: '+plan.rate_card.id+'. '+plan.basis+' Effort has no fixed price multiplier. Reasoning is included in output. Token estimates exclude tool fees and subscription charges. Model quality and duration require recorded evidence.',{class:'muted'});if(plan.pricing_check)add(method,'p',plan.pricing_check.reason||'Official rates verified before saving.');
  const matrix=add(view,'details');add(matrix,'summary','Compare every model at the same budgets');
  const wrap=add(matrix,'div','',{class:'table-wrap'}),table=add(wrap,'table'),hr=add(add(table,'thead'),'tr');for(const h of ['Model throughout','Token estimate','Output quality / time'])add(hr,'th',h);
  const body=add(table,'tbody');for(const [id,m] of Object.entries(plan.rate_card.models)){const fixed=calculatePlan({...plan,baseline_model:id,baseline_effort:'medium'}),tr=add(body,'tr');add(tr,'td',m.label);add(tr,'td',money(fixed.baseline));add(tr,'td','Not measured for this route');}
 }
 if(readonly){const reprice=add(buttons,'button','Compare with current prices');reprice.onclick=async()=>{reprice.disabled=true;try{const latest=await requestPrices(card),value=calculatePlan({...plan,rate_card:latest});refreshStatus.textContent='Saved estimate '+money(calculatePlan(plan).amount)+' · at current verified prices '+money(value.amount)+' · checked '+latest.verified_on+'.';}catch{refreshStatus.textContent='Current prices could not be verified. Your saved estimate is unchanged.';}finally{reprice.disabled=false;}};}
 const download=add(buttons,'button','Download route & rates');download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'})),a=$('a','',{href:url,download:workflow+'-route.json'});a.click();URL.revokeObjectURL(url);};
 if(!readonly){
  const retry=add(buttons,'button','Add a retry budget');retry.onclick=()=>{const source=plan.stages.find(s=>s.role==='verification');plan.stages.push({...structuredClone(source),id:'retry-'+plan.stages.length,name:'Retry / escalation '+(plan.stages.length-3),role:'retry',route_part:'retry',enabled:true,reason:'Optional extra attempt. Its full input and output count toward the task estimate.'});draw();onChange(snapshot());};
  const refresh=add(buttons,'button','Check latest OpenAI prices');refresh.onclick=async()=>{
   refresh.disabled=true;refreshStatus.textContent='Checking official OpenAI documentation…';
   try{const candidate=await requestPrices(plan.rate_card);plan.rate_card=candidate;refreshStatus.textContent='Prices verified '+new Date(candidate.checked_at).toLocaleString('en-GB')+'.';draw();onChange(snapshot());}
   catch{refreshStatus.textContent='A fresh official pricing check could not be verified. Using the saved '+plan.rate_card.verified_on+' rates. Open the official documentation or use the local pricing preflight.';}
   finally{refresh.disabled=false;}
  };
 }
 add(buttons,'a','Open official pricing ↗',{href:'https://developers.openai.com/api/docs/pricing',target:'_blank',rel:'noopener',class:'button'});
 const snapshot=()=>({...structuredClone(plan),estimate:calculatePlan(plan)});
 draw();return {snapshot,element:root};
}
export function parseModelPage(text,model,old){
 const clean=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
 const start=clean.indexOf('Text tokens');if(start<0||!clean.includes(model))throw Error('Unknown documentation format');
 const section=clean.slice(start,start+5000),patterns={input:/\bInput\s+\$([\d.]+)/,cached:/Cached input\s+\$([\d.]+)/,write_30m:/Cache writes\s+\$([\d.]+)/,output:/\bOutput\s+\$([\d.]+)/};
 const next={...old};for(const [k,re] of Object.entries(patterns)){const match=section.match(re);if(!match)throw Error('Price not found');next[k]=Number(match[1]);if(!Number.isFinite(next[k])||next[k]<0)throw Error('Invalid official price');}
 // Fail closed if the documented billing rules no longer match this adapter.
 if(!/272K/.test(section)||!/2x input/.test(section)||!/1\.5x output/.test(section)||!/50% (?:lower|of Standard)/.test(section)||!/2x (?:Standard|the applicable)/.test(section))throw Error('Billing rules need review');
 if(Math.abs(next.write_30m-next.input*1.25)>1e-9)throw Error('Cache write rule changed');
 next.write_12h=next.input*2.5;return next;
}
export async function refreshPrices(card,fetcher=fetch){
 const candidate=structuredClone(card);
 await Promise.all(Object.entries(card.models).map(async([id,m])=>{const response=await fetcher(m.source,{signal:AbortSignal.timeout(12000),cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('Official pricing unavailable');candidate.models[id]=parseModelPage(await response.text(),id,m);}));
 // A browser that cannot read the official pages (including CORS) keeps the dated snapshot.
 candidate.verified_on=new Date().toISOString().slice(0,10);candidate.id='openai-usd-'+candidate.verified_on+'-verified';candidate.checked_at=new Date().toISOString();return validateCard(candidate);
}

export async function requestPrices(card,fetcher=fetch){
 const response=await fetcher('/api/pricing/preflight',{cache:'no-store',signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw Error('Pricing check unavailable');const result=await response.json();
 if(result.status!=='verified')throw Error(result.reason||'Retained saved rates');return validateCard(result.card);
}
