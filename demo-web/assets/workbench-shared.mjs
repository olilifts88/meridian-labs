import {attachRunViews} from './run-breakdown.mjs?v=run-breakdown-20261105';
import {attachRouteSettings} from './route-settings.mjs?v=run-breakdown-20261105';
import {renderRouteEvidence} from './route-evidence.mjs?v=run-breakdown-20261105';
import {renderTranscriptRoute} from './transcript-route.mjs?v=run-breakdown-20261105';
import {makePlan,calculatePlan} from './workflow-routing.mjs?v=run-breakdown-20261105';
export function add(p,t,text='',attrs={}){const n=document.createElement(t);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;}
export function badge(p,text,tone='neutral'){return add(p,'span',text,{class:'rw-badge '+tone});}
export function fold(p,title){const d=add(p,'details');add(d,'summary',title);return d;}
export function select(p,label,options,value){const l=add(p,'label',label),s=add(l,'select','',{'aria-label':label});for(const[v,t]of options){const o=add(s,'option',t,{value:v});o.selected=v===value;}return s;}
export function link(p,label,url,primary=false){return add(p,'a',label,{href:url,class:'button'+(primary?' primary':'')});}
export const money=n=>n==null?'Unavailable':'$'+n.toFixed(5);
export function renderRoute(parent,workflow,record,card,{savedPlan=null,onApply=()=>{},readonly=false,settingsHost=null,getContext=null,records=[]}={}){
 let plan=savedPlan?structuredClone(savedPlan):makePlan(workflow,record,card),selectedBranch=null;
 const settings=add(settingsHost||parent,'div','',{class:'rw-settings-bar'}),button=add(settings,'button','Adjust route & token budgets',{type:'button',class:'rw-settings-trigger','aria-haspopup':'dialog'});if(readonly)button.hidden=true;if(readonly)add(settings,'span','Saved route',{class:'muted'});
 const routeFold=fold(parent,'Model route & cost'),route=add(routeFold,'section','',{class:'rw-route',id:'model-routing'});routeFold.className='app-route-disclosure';
 attachRouteSettings(parent,button,{getContext:()=>({workflow,record,card,plan,records,session:getContext?.()?.result||null}),onApply:next=>{plan=next;onApply(structuredClone(plan));draw();}});
 const views=attachRunViews(routeFold,route,{getContext:()=>({workflow,record,session:getContext?.()?.result||null}),defaultView:readonly?'run':'route'});
 function draw(){route.replaceChildren();const header=add(route,'div','',{class:'row'});add(header,'h2','Model route');badge(header,plan.preset==='custom'?'Custom route':plan.preset==='economy'?'Lower-cost route':plan.preset==='deep'?'Deeper review':plan.preset&&plan.rate_card.models[plan.preset]?plan.rate_card.models[plan.preset].label+' throughout':'Recommended route');renderRouteEvidence(route,records,plan.rate_card.models,{preset:plan.preset});const grid=add(route,'div','',{class:'rw-stage-grid'});
  const branched=workflow==='call-crm'&&getContext&&renderTranscriptRoute(grid,plan,getContext(),selectedBranch,key=>{selectedBranch=key;});if(branched)grid.className='';
  if(!branched)plan.stages.forEach((s,i)=>{const d=fold(grid,''),summary=d.querySelector('summary');add(summary,'span',String(i+1).padStart(2,'0'),{class:'rw-stage-number'});add(summary,'strong',s.name);const tags=add(summary,'span','',{class:'rw-labels'});badge(tags,plan.rate_card.models[s.model].label,'model');badge(tags,s.effort+' effort');if(!s.enabled)badge(tags,'Excluded');add(d,'p',s.reason);add(d,'p',s.quality_check,{class:'muted'});});
  const e=calculatePlan(plan),stats=add(route,'dl','',{class:'rw-costs'}),baseline=plan.rate_card.models[plan.baseline_model].label;for(const[label,value]of [['Selected route estimate',money(e.amount)],['All steps: '+baseline,money(e.baseline)],['Planned tokens',plan.stages.filter(s=>s.enabled).reduce((n,s)=>n+s.input_tokens+s.output_tokens,0).toLocaleString()],['Rates',plan.rate_card.verified_on+' · USD']]){const div=add(stats,'div');add(div,'dt',label);add(div,'dd',value);}
  if(e.amount!=null&&e.baseline!=null){const delta=e.amount-e.baseline;const line=add(route,'div','',{class:'rw-cost-difference'});badge(line,(delta<0?'−':delta>0?'+':'')+money(Math.abs(delta))+' · '+(delta<0?'lower estimated cost':delta>0?'higher estimated cost':'same estimated cost'),delta<0?'good':'neutral');add(line,'span','Compared with '+baseline+' at every step, using the same token estimates.',{class:'muted'});}
  const more=fold(route,'What do these estimates mean?');add(more,'p','The selected route prices the planned input and output for each included step. The comparison uses the same token amounts with one model throughout. Planned tokens are assumptions, not measured usage or an enforced limit. Changing the route changes the estimate; the prepared output follows the scenario and review choices.');add(more,'p','Effort has no fixed price multiplier. Reasoning is included in output. Estimates exclude subscription charges and tool fees.',{class:'muted'});if(plan.pricing_check?.status==='saved_rates')add(more,'p','Latest prices could not be verified. Using the dated '+plan.rate_card.verified_on+' rate card.',{class:'muted'});
 }
 draw();return {snapshot:()=>structuredClone(plan),setPlan:p=>{plan=structuredClone(p);draw();views.refresh();},refreshBreakdown:views.refresh,showBreakdown:()=>views.show('run')};
}
