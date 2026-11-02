import {checksFor} from './business-engine.mjs';
import {calculatePlan} from './workflow-routing.mjs?v=run-complete-20261102';

const PATHS=[
 ['crm','Account updates','CRM','Separate agreed changes from tentative interest.'],
 ['engineering','Engineering signals','Internal issue board','Check the reported problem and existing issue.'],
 ['revenue','Pricing follow-up','Revenue tracker','Keep commercial requests separate from approved terms.'],
 ['report','Meeting report','Company message board','Record decisions, owners and open questions.'],
 ['library','Searchable knowledge','Call library','Keep excerpts linked to the original conversation.']
];
export function transcriptBranches(draft){
 if(draft?.workflow!=='call-crm'||!draft.transcript)throw Error('A transcript draft is required.');
 const t=draft.transcript,checks=checksFor(draft),source=id=>draft.sources.find(s=>s.id===id),hasCommercial=!!(t.stage&&(t.budget||t.seats));
 return PATHS.map(([key,title,destination,description])=>{
  let status='Ready for review',action,ids,records=[];
  const relevant=checks.filter(c=>c.label==='Sources retained'||key==='crm'&&/Commitment|Commercial/.test(c.label)||key==='engineering'&&/Engineering/.test(c.label)||key==='revenue'&&/Commercial/.test(c.label)||key==='report'&&/Actions/.test(c.label));
  if(key==='crm'){
   ids=[...new Set(draft.rows.map(r=>r.source))];records=draft.rows.map(r=>({label:r.field,value:String(r.before)+' → '+String(r.after),status:r.status}));
   action=!t.stage?'This internal meeting changes no account fields. Keep its decisions in the issue board and team report.':t.budget?'Review the proposed account fields. Record a budget indication separately from approved annual value.':t.stage[0]===t.stage[1]?'Keep the current opportunity stage. The speaker has not agreed a change. Review any seat request separately.':'Review the account changes against the speaker’s explicit agreement.';
   if(!draft.rows.length)status='No account change';else if(t.budget)status='Budget confirmation needed';
  }else if(key==='engineering'){
   const issue=draft.issueRecord;ids=issue?[issue.source]:draft.sources.filter(s=>/no product issues/i.test(s.text)).map(s=>s.id);
   action=issue?issue.next:'No product defect is reported in this transcript. Create no engineering issue.';
   status=issue?(issue.existing?'Link existing issue':'Needs engineering triage'):'No issue reported';
   if(issue)records=[{label:issue.id+' · '+issue.title,value:issue.description,status:issue.existing?'Add to the existing history':'Prepare for triage'}];
  }else if(key==='revenue'){
   ids=hasCommercial?['T-2']:[];status=hasCommercial?(t.budget?'Finance approval pending':'Discovery follow-up'):'No pricing request';
   action=t.budget?'Prepare the seat proposal and include Finance. Keep committed annual value unchanged.':hasCommercial?'Send the requested information. Confirm budget and commitment before proposing commercial terms.':'No new seat or price proposal is requested. Keep existing commercial terms unchanged.';
   if(hasCommercial)records=[{label:'Requested seats',value:String(t.seats||'Not supplied'),status:'Requested, not contracted'},{label:'Indicative annual budget',value:t.budget?'£'+t.budget.toLocaleString('en-GB'):'Not supplied',status:t.budget?'Finance approval pending':'Not approved'}];
  }else if(key==='report'){
   ids=draft.sources.map(s=>s.id);action=t.action;records=[{label:'Follow-up owner',value:t.owner,status:'Due '+t.due}];
  }else{
   ids=draft.sources.map(s=>s.id);action='Index the original excerpts under '+t.account+'. Preserve the speaker, timestamp and links to the proposed records.';records=[{label:'Conversation',value:t.title,status:draft.sources.length+' source excerpts'}];
  }
  if(relevant.some(c=>!c.pass))status='Needs correction';
  return {key,title,destination,description,status,action,records,sources:ids.map(source).filter(Boolean),checks:relevant};
 });
}
const add=(p,t,text='',attrs={})=>{const n=document.createElement(t);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;};
const money=n=>n==null?'Unavailable':'$'+n.toFixed(5);
function labels(parent,stage,plan){const tags=add(parent,'div','',{class:'rw-labels'});add(tags,'span',plan.rate_card.models[stage.model].label,{class:'rw-badge model'});add(tags,'span',stage.effort+' effort',{class:'rw-badge neutral'});if(!stage.enabled)add(tags,'span','Budget excluded',{class:'rw-badge warn'});}
function node(parent,stage,plan){const d=add(parent,'details','',{class:'tr-node tr-center'}),s=add(d,'summary',stage.name);labels(s,stage,plan);add(d,'p',stage.reason);return d;}
export function renderTranscriptRoute(parent,plan,{draft,result=null},selected=null,onSelect=()=>{}){
 const parts=new Map(plan.stages.filter(s=>s.role!=='retry').map(s=>[s.route_part,s]));
 if(!['read','crm','engineering','revenue','report','library','review','format'].every(k=>parts.has(k)))return false;
 const branches=transcriptBranches(draft),estimates=calculatePlan(plan).rows,root=add(parent,'div','',{class:'transcript-route'});
 node(root,parts.get('read'),plan);add(root,'div','',{class:'tr-trunk','aria-hidden':'true'});
 const lanes=add(root,'div','',{class:'tr-branches','aria-label':'Destination paths'}),buttons=[];
 for(const branch of branches){const s=parts.get(branch.key),button=add(lanes,'button','',{type:'button',class:'tr-branch','aria-pressed':String(selected===branch.key),'aria-controls':'transcript-branch-detail'});buttons.push(button);
  add(button,'span',branch.destination,{class:'tr-destination'});add(button,'strong',branch.title);add(button,'span',branch.description,{class:'tr-description'});labels(button,s,plan);
  const bottom=add(button,'span','',{class:'tr-branch-bottom'});add(bottom,'span',branch.status,{class:'tr-state'+(branch.status==='Needs correction'?' tr-flag':'')});add(bottom,'span',money(estimates.find(r=>r.id===s.id)?.estimate.amount),{class:'tr-price'});
  button.onclick=()=>{selected=selected===branch.key?null:branch.key;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(branches[i].key===selected)));drawDetail();onSelect(selected);};
 }
 add(root,'div','',{class:'tr-trunk','aria-hidden':'true'});node(root,parts.get('review'),plan);add(root,'div','',{class:'tr-trunk','aria-hidden':'true'});node(root,parts.get('format'),plan);
 for(const stage of plan.stages.filter(s=>s.role==='retry')){add(root,'div','',{class:'tr-trunk','aria-hidden':'true'});node(root,stage,plan);}
 const detail=add(root,'section','',{id:'transcript-branch-detail',class:'tr-detail','aria-live':'polite','aria-label':'Selected destination detail'});
 function drawDetail(){detail.hidden=!selected;detail.replaceChildren();if(!selected)return;const branch=branches.find(b=>b.key===selected),stage=parts.get(branch.key);add(detail,'span',branch.destination,{class:'tr-destination'});add(detail,'h3',branch.title);add(detail,'span',branch.status,{class:'rw-badge '+(branch.status==='Needs correction'?'warn':'neutral')});add(detail,'p',branch.action);
  const sources=add(detail,'details');add(sources,'summary','Supporting excerpts · '+branch.sources.length);
  for(const source of branch.sources){add(sources,'blockquote',source.text);add(sources,'p',source.at+' · '+source.speaker,{class:'muted'});const link=add(sources,'a','View in transcript',{href:'#source-'+source.id,class:'rw-source-link'});link.onclick=()=>{let n=document.getElementById('source-'+source.id);while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}};}
  if(!branch.sources.length)add(sources,'p','No relevant request was identified. Review the full transcript before adding an action.');
  const review=add(detail,'details');add(review,'summary','Checks and route budget');for(const c of branch.checks)add(review,'p',(c.pass?'Passed: ':'Flagged: ')+c.label+'. '+c.detail);add(review,'p',stage.reason);add(review,'p','Estimated tokens: '+stage.input_tokens.toLocaleString()+' input + '+stage.output_tokens.toLocaleString()+' output. Checking a destination can use a budget even when the outcome is no action.',{class:'muted'});
  if(result?.business_publication)add(detail,'a','Open '+branch.title.toLowerCase(),{href:'/workspace.html?session='+encodeURIComponent(result.id)+'&view='+branch.key,class:'button'});
 }
 drawDetail();return true;
}
