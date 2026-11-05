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
export function renderRunBreakdown(parent,{record=null,session=null,workflow=null}={}){
 parent.replaceChildren();parent.classList.add('run-breakdown');add(parent,'h2','Run breakdown');
 const measured=summariseRun(record);
 if(session)add(parent,'p','This saved scenario is a prepared replay. Its selected model route is a plan; replaying it does not create new AI usage.',{class:'notice'});
 if(!measured.available){add(parent,'p',measured.reason,{class:'notice'});add(parent,'p','A route estimate cannot fill this gap. Measured calls will appear here when they are linked to this output.',{class:'muted'});}
 else{
  add(parent,'p',session?'Original source generation · separate from this scenario replay':'Original recorded generation',{class:'eyebrow'});
  const stats=add(parent,'dl','',{class:'rw-costs'});for(const[label,value]of [['Captured run cost',money(measured.amount)],['Recorded tokens',number(measured.tokens)],['Model calls','1'],['Task coverage','Partial']]){const cell=add(stats,'div');add(cell,'dt',label);add(cell,'dd',value);}
  add(parent,'p','The captured amount prices this recorded generation only. Whole-task cost is unavailable: a complete coordinator, worker, retry and verification inventory is not established.',{class:'muted'});
  const wrap=add(parent,'div','',{class:'table-wrap'}),table=add(wrap,'table'),head=add(add(table,'thead'),'tr');for(const label of ['Model','Calls','Uncached input','Cached input','Output','Estimated cost'])add(head,'th',label);
  const row=add(add(table,'tbody'),'tr');for(const value of [measured.model,'1',number(measured.input),number(measured.cached),number(measured.output),money(measured.amount)])add(row,'td',value);
  add(parent,'p',measured.modelBasis+'. Reasoning tokens are included in output; cached tokens are included in total input.',{class:'muted'});
  const detail=add(parent,'details');add(detail,'summary','Token cost and source');
  if(measured.components)for(const[key,label]of [['input','Uncached input'],['cached_input','Cached input'],['output','Output']])add(detail,'p',label+': '+money(measured.components[key]));
  add(detail,'p','Rate snapshot: '+(measured.rateDate||'Unavailable')+' · USD. Estimated token value, not a billed charge.');
  add(detail,'a','Open original recorded run',{href:'/results.html?run='+encodeURIComponent(record.id)});add(detail,'pre',JSON.stringify({run:record.id,recorded_at:record.recorded_at,requested_model:record.requested_model,actual_model:record.actual_model??null,usage:record.usage,estimated_cost:record.estimated_cost},null,2));
 }
 if(workflow)add(parent,'a','View separate recorded model trials',{href:'/runs.html?workflow='+encodeURIComponent(workflow)});
 add(parent,'p','Alternative model trials are separate runs. They are not added together as steps of this task.',{class:'muted'});
 return measured;
}
let nextId=0;
export function attachRunViews(container,modelPane,{getContext,defaultView='route'}={}){
 const id='run-views-'+(++nextId),tabs=document.createElement('div');tabs.className='run-view-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Models and run evidence');container.insertBefore(tabs,modelPane);
 const breakdown=add(container,'section','',{class:'rw-route'});let active=defaultView==='run'?'run':'route';
 const routePanel=document.createElement('div');container.insertBefore(routePanel,modelPane);routePanel.append(modelPane);const panes={route:routePanel,run:breakdown},buttons={};for(const[key,label]of [['route','Model route'],['run','Run breakdown']]){const b=add(tabs,'button',label,{type:'button',role:'tab',id:id+'-'+key,'aria-controls':id+'-'+key+'-panel'});buttons[key]=b;panes[key].id=id+'-'+key+'-panel';panes[key].setAttribute('role','tabpanel');panes[key].setAttribute('aria-labelledby',b.id);b.onclick=()=>show(key);}
 function show(key){active=key;for(const name of ['route','run']){buttons[name].setAttribute('aria-selected',String(active===name));buttons[name].setAttribute('aria-pressed',String(active===name));panes[name].hidden=active!==name;}if(active==='run')renderRunBreakdown(breakdown,getContext?.()||{});container.dispatchEvent(new CustomEvent('runviewchange',{detail:{view:active},bubbles:true}));}
 tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const key=e.key==='Home'?'route':e.key==='End'?'run':active==='route'?'run':'route';show(key);buttons[key].focus();};show(active);return {refresh:()=>{if(active==='run')renderRunBreakdown(breakdown,getContext?.()||{});},show};
}
