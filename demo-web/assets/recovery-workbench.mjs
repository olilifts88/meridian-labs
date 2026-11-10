import {openAppDialog} from './app-dialog.mjs';
import {RECOVERY_EXAMPLES,preparedRecoveryExample,compareRecoveryEvidence} from './recovery-examples.mjs';
import {renderOutputEvaluation,evaluationSummary} from './output-evaluation.mjs';
import {CASES,caseFor} from './recovery-data.mjs';
import {RECOVERY_KEY,blankRecovery,readRecovery,writeRecovery,runRecovery,resolveException,reopenRecovery,recoveryResult,validateRecovery} from './recovery-engine.mjs';
import {add,badge,fold,link,select,renderRoute} from './workbench-shared.mjs?v=branch-folds-20261102';
import {outputViews} from './app-ui.mjs?v=branch-folds-20261102';
import {saveResult} from './visitor-results.mjs';
const labels={recovered:'Back to work',needs_specialist:'Needs investigation',held_by_checks:'Waiting for evidence',reopened:'Reopened'};
const clone=x=>structuredClone(x);
export function renderRecoveryWorkbench(app,card,{say=()=>{},saved=null}={}){
 const readonly=!!saved;let state,loadError=null,selected=saved?.case.id||'session',tab='Conversation',fault='none',route=null;
 try{state=readonly?validateRecovery(clone(saved.recovery_snapshot)):readRecovery(localStorage);}catch(e){state=blankRecovery();loadError=e;}
 const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/recovery.css';document.head.append(css);
 app.classList.add('bounceback');
 const head=add(app,'section','',{class:'bb-heading'}),intro=add(head,'div');add(intro,'div','CUSTOMER RECOVERY',{class:'bb-kicker'});add(intro,'h1','Bounceback');
 const tools=add(head,'div','',{class:'controls'});link(tools,'Quick guide','/bounceback-guide.html');link(tools,'Saved results','/saved-results.html');
 const restart=add(tools,'button','Reset demo',{type:'button'});restart.hidden=readonly;
 if(readonly)add(app,'p','Saved snapshot · Changes here cannot affect the working demo.',{class:'bb-scope'});
 const notice=add(app,'p','',{class:'bb-notice',role:'status','aria-live':'polite'});notice.hidden=true;let noticeTimer;
 const stages=add(app,'nav','',{class:'bb-stages','aria-label':'Recovery journey'});
 const layout=add(app,'div','',{class:'bb-layout'}),queue=add(layout,'aside','',{class:'bb-queue','aria-label':'Customer cases'}),main=add(layout,'section','',{class:'bb-case','aria-label':'Selected case'}),insights=add(layout,'aside','',{class:'bb-insights','aria-label':'Evidence and learning'});
 const routing=add(app,'section','',{class:'bb-routing'});
 const start=add(app,'section','',{class:'bb-start','aria-label':'Start with an example'});head.after(start);
 add(start,'div','Prepared demo · fictional support cases',{class:'bb-kicker'});add(start,'h2','See what useful recovery looks like');
 add(start,'p','Load a worked example, inspect the decisions, then try the cases yourself. No live AI calls or customer-system changes.',{class:'bb-muted'});
 const exampleTools=add(start,'div','',{class:'bb-example-tools'}),example=select(exampleTools,'Worked example',RECOVERY_EXAMPLES,'routine'),load=add(exampleTools,'button','Load example',{type:'button',class:'primary'});
 start.hidden=readonly;
 load.onclick=()=>{if(loadError)return notify('Export or reset the unreadable working data before loading an example.',true);if(Object.keys(state.cases).length&&!confirm('Replace the working demo with this prepared example? Saved result snapshots will remain.'))return;const next=preparedRecoveryExample(example.value);selected=next.selected;fault='none';tab='Conversation';persist(next.state);if(state===next.state){notify('Prepared example loaded. Select a case to open its workspace, or inspect the result below.');}};
 let caseDialog=null;
 function openCase(trigger){if(caseDialog)return;const surface=document.createElement('div');surface.className='bb-case-surface';surface.append(main,insights);caseDialog=openAppDialog({title:'Bounceback · Case workspace',trigger,content:surface,href:'/scenarios.html?workflow=customer-recovery',wide:true,onClose:()=>{layout.append(main,insights);caseDialog=null;queue.querySelector('[aria-pressed=true]')?.focus();}});}
 function openPage(trigger,title,href){const frame=document.createElement('iframe');frame.title=title;frame.src=href;openAppDialog({title,trigger,content:frame,href,wide:true});}
 for(const a of tools.querySelectorAll('a'))a.onclick=e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();openPage(a,a.textContent,a.href);};
 function assess(trigger){const content=document.createElement('section'),panes={},deck=add(content,'div');for(const name of ['Source checks','Compare evidence','AI & model planning'])panes[name]=add(deck,'section');outputViews(deck,panes);
  const result=state.cases[selected];
  if(result){renderOutputEvaluation(panes['Source checks'],{checks:result.checks,title:'Recovery evaluation',scope:caseFor(selected).ticket+' · '+labels[result.status]});add(panes['Source checks'],'p','These checks inspect the prepared evidence. Passing checks do not turn a reopened case into a recovered case or establish real-world model accuracy.',{class:'bb-muted'});}else add(panes['Source checks'],'p','Load an example or run this case to inspect its checks.');
  add(panes['Compare evidence'],'p','Two prepared versions of this fictional case show why confirmation matters. These are authored examples, not a comparison of model generations.');
  const pair=add(panes['Compare evidence'],'div','',{class:'bb-compare'});for(const item of compareRecoveryEvidence(selected)){const box=add(pair,'article','',{class:'bb-comparison'}),summary=evaluationSummary(item.result.checks);add(box,'h3',item.label);badge(box,labels[item.result.status],item.result.status==='recovered'?'good':'warn');add(box,'p',summary.passed+' / '+summary.total+' source checks passed');add(box,'p',item.result.reply);const missing=item.result.checks.filter(c=>!c.pass);for(const c of missing)add(box,'p',c.label,{class:'bb-muted'});}
  const ai=panes['AI & model planning'];add(ai,'h3','What is running here?');add(ai,'p','The response is prepared text. Retrieval, recovery checks, state changes and guidance withdrawal run as ordinary code in this browser.');
  add(ai,'h3','Where an LLM could help');add(ai,'p','The route below plans classification, response reasoning, recovery verification and knowledge formatting. Changing the planned model or budget does not generate a new answer.');
  for(const stage of route?.snapshot()?.stages||[]){const box=add(ai,'article','',{class:'bb-comparison'});add(box,'h4',stage.name);add(box,'p',(card.models?.[stage.model]?.label||stage.model)+' · '+stage.effort+' effort');add(box,'p',stage.reason);add(box,'p','Planned tokens: '+stage.input_tokens+' input + '+stage.output_tokens+' output',{class:'bb-muted'});}
  add(ai,'p','No executed model comparison, semantic-quality score, measured latency or measured task cost is available for Bounceback. Route prices are planning estimates; recorded model evidence elsewhere belongs to its original source cases.',{class:'bb-muted'});
  const recorded=add(ai,'button','Explore recorded model examples',{type:'button'});recorded.onclick=()=>openPage(recorded,'Recorded model evidence · other workflows','/runs.html');
  openAppDialog({title:'Bounceback · Evaluation & AI',trigger,content,wide:true});
 }

 function notify(text,error=false){clearTimeout(noticeTimer);notice.textContent=text;notice.hidden=!text;notice.classList.toggle('bb-error',error);say('');if(text&&!error)noticeTimer=setTimeout(()=>{notice.hidden=true;notice.textContent='';},4000);}
 function persist(next){if(readonly||loadError)return;try{writeRecovery(localStorage,next);state=next;notify('Progress saved in this browser.');draw();}catch(e){notify('Could not save: '+e.message+' Your previous progress is unchanged.',true);}}
 function change(action){try{persist(action());}catch(e){notify(e.message,true);}}
 function inspect(trigger,title,build){const content=document.createElement('section');build(content);openAppDialog({title,trigger,content});}
 function inspectChecks(trigger){const r=state.cases[selected];inspect(trigger,'Recovery checks',p=>{add(p,'p','A successful sign-in is only one part of recovery. The customer must reach the right workspace and complete the task they were blocked from doing.');for(const check of r?.checks||[]){const row=add(p,'section','',{class:'bb-check'});badge(row,check.pass?'Passed':'Not confirmed',check.pass?'good':'warn');add(row,'h3',check.label);add(row,'p',check.detail);}if(!r)add(p,'p','Run this case to evaluate its evidence.');});}
 function draw(){
  queue.replaceChildren();main.replaceChildren();insights.replaceChildren();stages.replaceChildren();routing.replaceChildren();
  const c=caseFor(selected),r=state.cases[selected];
  for(const [i,label]of ['Understand','Resolve','Confirm','Learn'].entries()){
   const complete=i===0?!!r:i===1?!!r?.timeline.some(e=>e.type==='guidance'||e.type==='technical'):i===2?r?.status==='recovered':['published','reused'].includes(r?.learning.state);
   const b=add(stages,'button','',{type:'button',class:complete?'bb-stage bb-complete':'bb-stage'});add(b,'span',complete?'✓':String(i+1));add(b,'strong',label);
   b.onclick=()=>i===0?inspect(b,'Case evidence',p=>source(p,c,r)):i===1?inspect(b,'Resolution guidance',p=>guidance(p,r)):i===2?inspectChecks(b):inspect(b,'Learning and reuse',p=>knowledge(p,r));
  }
  add(queue,'h2','Try the journey');add(queue,'p','Start with a routine fix, then follow an exception through to reuse.',{class:'bb-muted'});
  for(const [i,item]of CASES.entries()){
   const b=add(queue,'button','',{type:'button',class:'bb-case-button','aria-pressed':String(item.id===selected)});add(b,'span','0'+(i+1)+' · '+item.ticket,{class:'bb-kicker'});add(b,'strong',item.title);add(b,'small',state.cases[item.id]?labels[state.cases[item.id].status]:['Resolve automatically','Investigate once','Reuse the checked fix'][i]);
   b.onclick=()=>{selected=item.id;fault='none';tab='Conversation';notify('');draw();openCase(b);};
  }
  add(queue,'p','Cedar Studio · 3 fictional cases',{class:'bb-queue-foot'});
  const caseHead=add(main,'header','',{class:'bb-case-head'});add(caseHead,'div',c.ticket+' · '+c.account,{class:'bb-kicker'});add(caseHead,'h2',c.title,{tabindex:'-1'});badge(caseHead,r?labels[r.status]:'Ready to run',r?.status==='recovered'?'good':r?'warn':'neutral');add(caseHead,'p',c.goal,{class:'bb-muted'});
  const deck=add(main,'div','',{class:'bb-deck'}),conversation=add(deck,'section','',{'aria-label':'Conversation'}),progress=add(deck,'section','',{'aria-label':'Case progress'}),learning=add(deck,'section','',{'aria-label':'Learning'});
  const views=outputViews(deck,{Conversation:conversation,'Case progress':progress,Learning:learning});
  views.show(tab);deck.querySelectorAll('.app-output-tabs button').forEach(b=>b.addEventListener('click',()=>{tab=b.textContent;}));
  turn(conversation,'Customer',c.customer,'customer');
  if(r){turn(conversation,'Bounceback',r.reply,'assistant');if(r.status==='recovered')turn(conversation,'Customer','I’m back in the team workspace and I can continue editing. Thank you.','customer');else if(r.status==='reopened')turn(conversation,'Customer','The problem has returned. I still can’t complete my work.','customer');
   const status=add(conversation,'div','',{class:'bb-outcome '+(r.status==='recovered'?'bb-success':'')});add(status,'strong',labels[r.status]);add(status,'p',r.status==='recovered'?'Customer confirmation, account access and a completed task agree.':r.status==='held_by_checks'?'The source is stale. The workflow stops before suggesting a fix.':r.status==='reopened'?'The case is open again and the affected learned guidance is unavailable for reuse.':'The case stays open. The evidence and steps already checked remain attached.');
  }else{add(conversation,'p',selected==='repeat'?'Run REC-102 first to create a checked fix, or run this case now to see what happens without one.':'Run the workflow to retrieve guidance, check the outcome and capture what worked.',{class:'bb-empty'});}
  if(r){const list=add(progress,'ol','',{class:'bb-timeline'});for(const e of r.timeline){const item=add(list,'li');add(item,'strong',({context:'Understand',route:'Route',guidance:'Resolve',recovery:'Confirm',learning:'Learn',exception:'Investigate',technical:'Technical finding',hold:'Hold',reopen:'Reopen'})[e.type]);add(item,'p',e.detail);}}else add(progress,'p','The steps and their evidence will appear when you run this case.',{class:'bb-empty'});
  knowledge(learning,r);
  const actions=add(main,'div','',{class:'bb-actions'});
  if(!readonly){
   if(!r||!['recovered','reopened'].includes(r.status)){const run=add(actions,'button',r?'Run again':'Run workflow',{type:'button',class:'primary'});run.disabled=!!loadError;run.onclick=()=>change(()=>runRecovery(state,selected,{fault}));}
   if(r?.status==='needs_specialist'&&selected==='investigate'){const fix=add(actions,'button','Apply prepared technical fix',{type:'button',class:'primary'});fix.disabled=!!loadError;fix.onclick=()=>change(()=>resolveException(state,selected));}
   if(r?.status==='recovered'){const next=CASES[CASES.findIndex(x=>x.id===selected)+1];if(next){const n=add(actions,'button','Try next case →',{type:'button',class:'primary'});n.onclick=()=>{selected=next.id;tab='Conversation';fault='none';notify('');draw();main.querySelector('h2')?.focus();};}const reopen=add(actions,'button','Customer still blocked',{type:'button'});reopen.onclick=()=>change(()=>reopenRecovery(state,selected));}
   if(r?.status==='reopened')add(actions,'p','Reset the demo to replay this case. Re-running cannot silently close a reopened case.',{class:'bb-muted'});
   if(selected==='repeat'&&r?.status==='needs_specialist'){const prev=add(actions,'button','Investigate REC-102',{type:'button'});prev.onclick=()=>{selected='investigate';tab='Conversation';draw();};}
  }else link(actions,'Open working demo','/scenarios.html?workflow=customer-recovery',true);
  const assessment=add(insights,'section');add(assessment,'h2','Evaluation & AI');const counts=r?evaluationSummary(r.checks):null;add(assessment,'strong',counts?counts.passed+' / '+counts.total+' source checks':'No output loaded');add(assessment,'p',r?labels[r.status]+' · prepared evidence':'Choose a worked example to inspect its output.',{class:'bb-muted'});const evaluation=add(assessment,'button','Inspect evaluation & AI',{type:'button'});evaluation.onclick=()=>assess(evaluation);
  const evidence=add(insights,'section');add(evidence,'h2','Why this step?');add(evidence,'p',r?.source.context||c.context,{class:'bb-muted'});
  const sourceButton=add(evidence,'button','Open source evidence',{type:'button'});sourceButton.onclick=()=>inspect(sourceButton,'Case evidence',p=>source(p,c,r));
  const checks=add(evidence,'button',r?r.checks.filter(x=>x.pass).length+' / '+r.checks.length+' checks passed':'Inspect recovery checks',{type:'button'});checks.onclick=()=>inspectChecks(checks);
  const guide=add(evidence,'button',r?.guidance?'Open guidance · '+(r.guidance.sourceTicket||r.guidance.id):'How is the response chosen?',{type:'button'});guide.onclick=()=>inspect(guide,'Resolution guidance',p=>guidance(p,r));
  const learn=add(insights,'section');add(learn,'h2','Learn once. Reuse safely.');const active=state.knowledge.filter(g=>g.status==='active');add(learn,'strong',active.length+' checked '+(active.length===1?'fix':'fixes')+' available',{class:'bb-knowledge-count'});add(learn,'p',r?.learning.state==='reused'?'This case reused an indexed fix. It did not create a duplicate.':r?.learning.state==='published'?'The checked fix has been captured, versioned and indexed automatically.':'A fix enters the index only after its source, allowed action and customer recovery pass the checks.',{class:'bb-muted'});const index=add(learn,'button','Open knowledge index',{type:'button'});index.onclick=()=>inspect(index,'Learning and reuse',p=>knowledge(p,r));
  if(!readonly){const tests=fold(insights,'Try a failed check');add(tests,'p','Use a fresh case or reset to test an alternative outcome.');const control=select(tests,'Evidence test',[['none','All expected evidence'],['stale_source','Stale account context'],['missing_confirmation','No customer confirmation'],['wrong_account','Recovery logs from another account']],fault);control.onchange=()=>{fault=control.value;};const test=add(tests,'button','Run evidence test',{type:'button'});test.disabled=!!loadError||r?.status==='reopened';test.onclick=()=>change(()=>runRecovery(state,selected,{fault}));}
  const exports=add(insights,'section');add(exports,'h2',readonly?'Saved result':'Keep this result');const download=add(exports,'button','Download JSON',{type:'button'});download.disabled=!r;download.onclick=()=>downloadJson(readonly?saved:recoveryResult(state,selected,route.snapshot()),'bounceback-'+c.ticket+'.json');
  if(!readonly){const save=add(exports,'button','Save result',{type:'button'});save.disabled=!r||!!loadError;save.onclick=()=>{try{const result=recoveryResult(state,selected,route.snapshot());saveResult(localStorage,result);notify('Result saved. Open Saved results to return to this snapshot.');}catch(e){notify('Could not save result: '+e.message,true);}};}
  route=renderRoute(routing,'customer-recovery',null,card,{savedPlan:route?.snapshot()||saved?.routing_plan||null,readonly});
  if(loadError){notify(loadError.message+' Your stored data has not been overwritten. Export it before resetting.',true);const raw=add(insights,'button','Download stored data',{type:'button'});raw.onclick=()=>{try{downloadJson({stored:localStorage.getItem(RECOVERY_KEY)},'bounceback-storage.json');}catch(e){notify(e.message,true);}};}
 }
 restart.onclick=()=>{if(!confirm('Reset Bounceback progress and its learned fixes? Saved result snapshots will remain.'))return;try{writeRecovery(localStorage,blankRecovery());loadError=null;state=blankRecovery();selected='session';fault='none';tab='Conversation';notify('Demo reset. Saved result snapshots are unchanged.');draw();}catch(e){notify('Could not reset: '+e.message,true);}};
 function source(p,c,r){add(p,'h3',c.ticket+' · '+c.account);add(p,'p',c.customer);add(p,'h3','Account diagnostics');add(p,'p',r?.source.context||c.context);json(p,'Source values',r?.source.evidence||c.evidence);if(r?.recovery)json(p,'Recovery evidence',r.recovery);add(p,'p','All case text and log values are authored examples. The demo does not read a live support system.',{class:'bb-muted'});}
 function guidance(p,r){if(!r?.guidance){add(p,'p','No approved fix has been retrieved. The workflow keeps the case open for investigation.');return;}add(p,'h3',r.guidance.id);add(p,'p',r.guidance.steps);json(p,'Version and source',r.guidance);add(p,'p','Only existing authorised access is used. This demo cannot change permissions or account membership.');}
 function knowledge(p,r){add(p,'p','Validated outcomes become versioned guidance automatically. The search index uses the account and symptom; withdrawn records cannot be retrieved.');if(r)add(p,'strong','This case: '+r.learning.state.replaceAll('_',' '));if(!state.knowledge.length)add(p,'p','No learned guidance yet. Resolve REC-102, then try REC-103.');for(const g of state.knowledge){const item=add(p,'article','',{class:'bb-knowledge'});badge(item,g.status,g.status==='active'?'good':'warn');add(item,'h3',g.id+' · v'+g.version);add(item,'p',g.steps);add(item,'p','Source: '+g.sourceTicket+' · Scope: '+g.accountId+' / '+g.symptom,{class:'bb-muted'});}}
 draw();return {snapshot:()=>clone(state)};
}
function turn(parent,who,text,tone){const n=add(parent,'article','',{class:'bb-turn bb-'+tone});add(n,'strong',who);add(n,'p',text);}
function json(parent,label,value){const d=fold(parent,label);add(d,'pre',JSON.stringify(value,null,2));}
function downloadJson(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
