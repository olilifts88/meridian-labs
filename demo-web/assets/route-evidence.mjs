const MODELS=['gpt-6-luna','gpt-6.1-sol'];
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const median=values=>{if(!values.length||values.some(v=>!Number.isFinite(v)))return null;const n=[...values].sort((a,b)=>a-b),m=Math.floor(n.length/2);return n.length%2?n[m]:(n[m-1]+n[m])/2;};
export function routeEvidence(records){
 const groups=new Map(),seen=new Set();
 for(const r of records){
  if(seen.has(r.id)||!r.id||!r.case_id||!r.evidence||!MODELS.includes(r.requested_model)||!r.configuration?.endsWith('-guided')||r.kind?.startsWith('prepared_')||r.editorial_revision||!r.original_checks?.criteria?.length)continue;
  seen.add(r.id);const key=r.case_id+'|'+stable(r.evidence);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 const pairs=[...groups.values()].filter(rows=>MODELS.every(model=>rows.filter(r=>r.requested_model===model).length===1));
 return {cases:pairs.length,rows:MODELS.map(model=>{const runs=pairs.map(pair=>pair.find(r=>r.requested_model===model));return {model,runs,passed:runs.filter(r=>r.original_checks.outcome==='Pass'&&r.original_checks.criteria.every(c=>c.verdict==='Pass')).length,total:runs.length,median_ms:median(runs.map(r=>Number.isFinite(r.generation_duration_ms)&&r.generation_duration_ms>=0?r.generation_duration_ms:null)),median_cost:median(runs.map(r=>r.estimated_cost?.kind==='estimated_api_equivalent'&&Number.isFinite(r.estimated_cost.amount)&&r.estimated_cost.amount>=0?r.estimated_cost.amount:null))};})};
}
const add=(p,t,text='',attrs={})=>{const n=document.createElement(t);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;};
export function renderRouteEvidence(parent,records,models,{preset=null}={}){
 const evidence=routeEvidence(records);if(!evidence.cases)return;
 const d=add(parent,'details','',{class:'route-evidence'}),summary=add(d,'summary'),recommended=!preset||preset==='routed';
 add(summary,'span',recommended?'Chosen for output quality and token cost, informed by '+evidence.cases+' matched model comparisons.':'Your route uses the selected models and budgets; compare the recorded results below.');add(summary,'span','View comparison',{class:'route-evidence-link'});
 add(d,'p',evidence.cases+' matched source cases · workflow guidance · original output checks',{class:'muted'});
 const table=add(add(d,'div','',{class:'table-wrap'}),'table'),head=add(add(table,'thead'),'tr');for(const label of ['Model setup','All required checks','Median generation','Median token cost'])add(head,'th',label,{scope:'col'});
 const body=add(table,'tbody');for(const row of evidence.rows){const tr=add(body,'tr');for(const value of [models[row.model]?.label||row.model,row.passed+'/'+row.total+' cases',row.median_ms==null?'Unavailable':(row.median_ms/1000).toFixed(1)+' s',row.median_cost==null?'Unavailable':'$'+row.median_cost.toFixed(6)])add(tr,'td',value);}
 add(d,'p','These task comparisons inform model choice. Step assignments also reflect the task requirements and current token pricing. Token costs use recorded usage and the saved rate card; the calculator prices your selected route.',{class:'muted'});
 const sources=add(d,'details');add(sources,'summary','Inspect the recorded answers');const list=add(sources,'ul');for(const run of evidence.rows[0].runs){const item=add(list,'li');add(item,'span',run.case_id+' · ');for(const row of evidence.rows){const match=row.runs.find(r=>r.case_id===run.case_id&&stable(r.evidence)===stable(run.evidence));if(match){add(item,'a',models[row.model]?.label||row.model,{href:'/results.html?run='+encodeURIComponent(match.id)});add(item,'span',' ');}}}
}
