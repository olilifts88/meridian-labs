import {calculatePlan} from './workflow-routing.mjs?v=illustrative-breakdown-20261105';
// Source-bound recorded usage. Route plans and comparison trials are never execution receipts.
export function summariseRun(record){
 const empty={available:false,amount:null,tokens:null,model:null,coverage:'Unavailable',reason:'No measured model call is attached to this output.'};
 if(!record||record.kind?.startsWith('prepared_')||!record.recorded_at||!record.answer_sha256)return empty;
 const u=record.usage;if(!u||!['input_tokens','cached_input_tokens','output_tokens'].every(k=>Number.isSafeInteger(u[k])&&u[k]>=0)||u.cached_input_tokens>u.input_tokens)return {...empty,reason:'Recorded token evidence is missing or invalid.'};
 const c=record.estimated_cost;let amount=null;
 if(c?.currency==='USD'&&Number.isFinite(c.amount)&&c.amount>=0&&c.model_basis===record.requested_model&&(!record.actual_model||record.actual_model===c.model_basis)&&c.token_counts?.input===u.input_tokens-u.cached_input_tokens&&c.token_counts?.cached_input===u.cached_input_tokens&&c.token_counts?.output===u.output_tokens){
  const parts=c.components;if(parts&&['input','cached_input','output'].every(k=>Number.isFinite(parts[k])&&parts[k]>=0)&&Math.abs(parts.input+parts.cached_input+parts.output-c.amount)<1e-10)amount=c.amount;
 }
 return {available:true,id:record.id,model:record.actual_model||record.requested_model||'Unknown',modelBasis:record.actual_model?'Recorded model label':'Requested model; backend unverified',tokens:u.input_tokens+u.output_tokens,input:u.input_tokens-u.cached_input_tokens,cached:u.cached_input_tokens,output:u.output_tokens,amount,components:amount===null?null:c.components,rateDate:c?.rate_card?.checked_on||null,coverage:'Partial',wholeTaskCost:null};
}
const add=(p,t,value='',attrs={})=>{const n=document.createElement(t);n.textContent=value;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;};
const money=n=>n==null?'Unavailable':'$'+n.toFixed(5);
const number=n=>n==null?'Unavailable':n.toLocaleString('en-GB');
export function illustrateRun(plan){
 if(!plan?.rate_card||!Array.isArray(plan.stages))return null;
 const priced=calculatePlan(plan),calls=priced.rows.filter(r=>r.enabled),models=new Map();
 for(const call of calls){
  const group=models.get(call.model)||{model:call.model,label:plan.rate_card.models[call.model]?.label||call.model,calls:0,input:0,cached:0,output:0,tokens:0,amount:0};
  group.calls++;group.input+=call.input_tokens;group.cached+=call.cached_input_tokens;group.output+=call.output_tokens;group.tokens+=call.input_tokens+call.output_tokens;
  group.amount=group.amount===null||call.estimate.amount===null?null:group.amount+call.estimate.amount;models.set(call.model,group);
 }
 return {schema:'illustrative-workflow-run-v1',illustrative:true,amount:priced.amount,tokens:calls.reduce((n,c)=>n+c.input_tokens+c.output_tokens,0),calls,models:[...models.values()],rateDate:plan.rate_card.verified_on,rateCard:plan.rate_card.id,processing:plan.processing_tier,region:plan.region};
}
export function renderRunBreakdown(parent,{plan=null,workflow=null}={}){
 parent.replaceChildren();parent.classList.add('run-breakdown');add(parent,'h2','Run breakdown');
 add(parent,'span','Illustrative execution',{class:'rw-badge'});
 const run=illustrateRun(plan);
 if(!run){add(parent,'p','Choose a model route to see its illustrative execution.');return null;}
 const stats=add(parent,'dl','',{class:'rw-costs'});for(const[label,value]of [['Workflow cost estimate',money(run.amount)],['Illustrative tokens',number(run.tokens)],['Model calls',number(run.calls.length)],['Models used',number(run.models.length)]]){const cell=add(stats,'div');add(cell,'dt',label);add(cell,'dd',value);}
 const journey=add(parent,'ol','',{class:'illustrative-call-list','aria-label':'Illustrative model calls'});
 run.calls.forEach((call,i)=>{const item=add(journey,'li'),head=add(item,'div','',{class:'illustrative-call-head'});add(head,'span',String(i+1).padStart(2,'0'),{class:'rw-stage-number'});add(head,'strong',call.name);add(head,'span',plan.rate_card.models[call.model]?.label||call.model,{class:'rw-badge model'});add(head,'strong',money(call.estimate.amount));const detail=add(item,'details');add(detail,'summary',number(call.input_tokens+call.output_tokens)+' tokens · '+call.effort+' effort');add(detail,'p',call.reason);add(detail,'p','Input: '+number(call.input_tokens)+' · cached input: '+number(call.cached_input_tokens)+' · output: '+number(call.output_tokens));if(call.estimate.reason)add(detail,'p',call.estimate.reason,{class:'error'});if(call.estimate.components)add(detail,'pre',JSON.stringify(call.estimate.components,null,2));});
 if(!run.calls.length)add(parent,'p','This route uses ordinary code only; no model calls are included.');
 add(parent,'h3','Cost by model');const wrap=add(parent,'div','',{class:'table-wrap'}),table=add(wrap,'table'),head=add(add(table,'thead'),'tr');for(const label of ['Model','Calls','Input','Cached input','Output','Estimated cost'])add(head,'th',label);
 const body=add(table,'tbody');for(const model of run.models){const row=add(body,'tr');for(const value of [model.label,number(model.calls),number(model.input),number(model.cached),number(model.output),money(model.amount)])add(row,'td',value);}
 const method=add(parent,'details');add(method,'summary','How this is calculated');add(method,'p','This demonstrates the selected model route using the existing scenario and token budgets. No new AI calls are made. Every included step and retry is counted once. Displayed amounts are rounded; the total uses unrounded values.');add(method,'p','The shared calculator prices input, cache and output using the saved model rates. These are illustrative token amounts and estimated costs, not measured execution.');add(method,'p','Rate snapshot: '+run.rateDate+' · USD · '+run.processing+' · '+run.region+'. Reasoning is included in output; cached input is a subset of input.');
 if(workflow)add(method,'a','Inspect the original model experiments',{href:'/runs.html?workflow='+encodeURIComponent(workflow)});
 return run;
}
let nextId=0;
export function attachRunViews(container,modelPane,{getContext,defaultView='route'}={}){
 const id='run-views-'+(++nextId),tabs=document.createElement('div');tabs.className='run-view-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Models and run evidence');container.insertBefore(tabs,modelPane);
 const breakdown=add(container,'section','',{class:'rw-route'});let active=defaultView==='run'?'run':'route';
 const routePanel=document.createElement('div');container.insertBefore(routePanel,modelPane);routePanel.append(modelPane);const panes={route:routePanel,run:breakdown},buttons={};for(const[key,label]of [['route','Model route'],['run','Run breakdown']]){const b=add(tabs,'button',label,{type:'button',role:'tab',id:id+'-'+key,'aria-controls':id+'-'+key+'-panel'});buttons[key]=b;panes[key].id=id+'-'+key+'-panel';panes[key].setAttribute('role','tabpanel');panes[key].setAttribute('aria-labelledby',b.id);b.onclick=()=>show(key);}
 function show(key){active=key;for(const name of ['route','run']){buttons[name].setAttribute('aria-selected',String(active===name));buttons[name].setAttribute('aria-pressed',String(active===name));panes[name].hidden=active!==name;}if(active==='run')renderRunBreakdown(breakdown,getContext?.()||{});container.dispatchEvent(new CustomEvent('runviewchange',{detail:{view:active},bubbles:true}));}
 tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const key=e.key==='Home'?'route':e.key==='End'?'run':active==='route'?'run':'route';show(key);buttons[key].focus();};show(active);return {refresh:()=>{if(active==='run')renderRunBreakdown(breakdown,getContext?.()||{});},show};
}
