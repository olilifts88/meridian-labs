import {blankDelivery,readDelivery,saveDelivery,transitionDelivery,policyFor,PERSONAS,deliveryStats} from './delivery-engine.mjs';
import {TRANSCRIPTS} from './business-data.mjs';
import {renderRoute,add,fold,select,link} from './workbench-shared.mjs?v=branch-folds-20261102';

const app=document.getElementById('app'),message=document.getElementById('message');
let state,actor='owner',mode='browser',selected=null,caseId='bd-pilot',card,busy=false,loadError=null,route,runtime=null;
const say=(text,error=false)=>{message.textContent=text;message.className=error?'error':'';};
const visibleRuns=()=>state?.runs.filter(r=>PERSONAS[actor].accounts.includes(r.account))||[];
const run=()=>visibleRuns().find(r=>r.id===selected)||visibleRuns().at(-1);
const stateName={prepared:'Ready for review',approved:'Approved proposal',held:'Held by checks',needs_readback:'Commit needs confirmation',confirmed:'Confirmed in sandbox'};
async function api(path,data){const response=await fetch('/api/delivery/'+path,{method:data?'POST':'GET',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{}),credentials:'same-origin'});const value=await response.json();if(!response.ok){if(value.state)state=value.state;throw Error(value.error||'Sandbox request failed.');}return value;}
async function command(type,extra={}){
 if(busy||loadError)return;busy=true;
 try{
  const value={type,runId:run()?.id,expectedRevision:state.revision,...extra};
  if(mode==='server'){const reply=await api('command',value);state=reply.state;actor=reply.actor;runtime=reply.runtime;}
  else {const next=transitionDelivery(state,value,{actor});saveDelivery(localStorage,next);state=readDelivery(localStorage);}
  selected=type==='prepare'?state.runs.at(-1).id:selected;
  const latest=run(),last=latest?.trace.at(-1);say(last?.detail||'Saved.',last?.status==='blocked');
 }catch(e){say(e.message,true);}finally{busy=false;draw();}
}
async function persona(value){try{if(mode==='server'){const reply=await api('persona',{actor:value});state=reply.state;}actor=value;say('Demo persona changed. The source and approval rules still apply.');}catch(e){say(e.message,true);}draw();}
function change(p,name,before,after){const row=add(p,'div');add(row,'h3',name);const grid=add(row,'div','',{class:'delivery-diff'});for(const[label,value]of [['Before',before],['Proposed / saved',after]]){const cell=add(grid,'div','',{class:'delivery-value'});add(cell,'small',label);add(cell,'strong',value==null?'Not recorded':String(value));}}
function sources(p,r){for(const s of r.draft.sources){const d=add(p,'div','',{class:'delivery-evidence',id:'evidence-'+s.id});add(d,'small',s.at+' · '+s.speaker);add(d,'blockquote',s.text);}}
function evidenceLink(p,r,id){const s=r.draft.sources.find(x=>x.id===id);if(s){add(p,'blockquote',s.text);const a=add(p,'a','Source '+s.at+' · '+s.speaker,{href:'#evidence-'+id});a.onclick=()=>{document.getElementById('delivery-source').open=true;};}}
function draw(){
 app.replaceChildren();
 const head=add(app,'div','',{class:'delivery-head'}),intro=add(head,'div');add(intro,'div','TRANSCRIPT TO ACTION',{class:'eyebrow'});add(intro,'h1','One conversation. Useful work across teams.');add(intro,'p','Follow the evidence, review the decisions and confirm the records that changed.',{class:'lead'});
 const scope=add(app,'p',mode==='server'?'Local server sandbox · demo personas · fictional records. Rules run again on the writer before changes are saved.':'Browser sandbox · fictional records. Rules demonstrate workflow behaviour; browser state is not an enterprise security boundary.',{class:'delivery-scope'});
 const controls=add(app,'div','',{class:'delivery-controls'}),scenario=select(controls,'Conversation',TRANSCRIPTS.filter(t=>['bd-pilot','bd-interest'].includes(t.id)).map(t=>[t.id,t.account+' · '+t.title]),caseId);
 scenario.onchange=()=>{caseId=scenario.value;};const who=select(controls,'Demo persona',Object.entries(PERSONAS).map(([id,p])=>[id,p.name]),actor);who.onchange=()=>persona(who.value);
 const start=add(controls,'button','Prepare proposals',{type:'button',class:'primary'});start.disabled=busy||!!loadError;start.onclick=()=>command('prepare',{caseId});
 const r=run();
 if(visibleRuns().length){const history=select(controls,'Saved run',[...visibleRuns()].reverse().map(r=>[r.id,r.id+' · '+r.account+' · '+stateName[r.status]]),r?.id);history.onchange=()=>{selected=history.value;draw();};}
 if(loadError){add(app,'p',loadError,{class:'delivery-scope'});return;}
 const journey=add(app,'nav','',{class:'delivery-journey','aria-label':'Delivery journey'});
 for(const[id,label,kind]of [['source','Read sources','code'],['proposal','Prepare proposals','prepared response'],['policy','Check permission','code'],['review','Approve exact version','person'],['result','Write and read back','code'],['trace','Inspect run','evidence']]){const a=add(journey,'a','',{href:'#delivery-'+id});add(a,'small',kind);add(a,'strong',label);if(id==='source')a.onclick=()=>{const source=document.getElementById('delivery-source');if(source)source.open=true;};}
 if(!r){const empty=add(app,'section','',{class:'delivery-panel'});add(empty,'h2','A pilot, a possible budget and a product problem');add(empty,'p','Prepare the Northstar conversation to see why those statements lead to different actions. No live model calls or external services are involved.');architecture(app);return;}
 const meta=add(app,'div','',{class:'delivery-meta'});for(const value of [r.id,r.account,stateName[r.status],PERSONAS[actor].name])add(meta,'span',value);
 const grid=add(app,'div','',{class:'delivery-grid'}),left=add(grid,'div'),right=add(grid,'div');
 const proposal=add(left,'section','',{class:'delivery-panel',id:'delivery-proposal'});add(proposal,'h2','What should change?');
 for(const row of r.draft.rows){change(proposal,row.field,row.before,row.after);add(proposal,'p',row.status,{class:'delivery-status'});evidenceLink(proposal,r,row.source);}
 if(r.draft.issueRecord){add(proposal,'h3','Engineering signal');add(proposal,'p',r.draft.issueRecord.title+' · Needs triage · Reporting Engineering');evidenceLink(proposal,r,r.draft.issueRecord.source);}
 if(r.draft.transcript.budget){add(proposal,'h3','Finance request');add(proposal,'p','£'+r.draft.transcript.budget.toLocaleString('en-GB')+' is indicative. It never becomes approved annual value in this workflow.');}
 const source=add(left,'details','',{class:'delivery-panel delivery-bottom',id:'delivery-source'});add(source,'summary','Read the source conversation');sources(source,r);
 const policy=add(right,'section','',{class:'delivery-panel',id:'delivery-policy'});add(policy,'h2','Who can do what?');add(policy,'p','Business owners review and apply supported account updates. Engineering and Finance can inspect Northstar but cannot write its account through this workflow. Finance approval is a separate process.');
 const checks=policyFor(r,actor,'review'),moreChecks=fold(policy,'Inspect evidence and commitment checks');if(checks.some(c=>!c.pass))moreChecks.open=true;for(const [i,c]of checks.entries()){const row=add(i<2?policy:moreChecks,'div','',{class:'delivery-check'});add(row,'b',c.pass?'Pass':'Blocked',{class:c.pass?'delivery-pass':'delivery-block'});const d=add(row,'div');add(d,'strong',c.name);add(d,'p',c.reason);}
 const review=add(policy,'div','',{id:'delivery-review'});add(review,'h3','Review this version');add(review,'p',r.approval?'Approval belongs to '+PERSONAS[r.approval.actor].name+' and the reviewed proposal/account revision.':'No approval has been recorded for this proposal.');
 const actions=add(review,'div','',{class:'delivery-actions'}),approve=add(actions,'button','Approve this proposal',{type:'button'});approve.disabled=!!state.receipts[r.id];approve.onclick=()=>command('approve');
 const apply=add(actions,'button',r.status==='needs_readback'||r.status==='confirmed'?'Retry / confirm saved write':'Apply to sandbox',{type:'button',class:'primary'});apply.onclick=()=>command('apply');
 const failures=fold(policy,'Try a boundary or failure');add(failures,'p','These controls intentionally exercise the same policy and writer. Records change only after checks pass.');
 for(const[type,label]of [['wrong_account','Use a wrong-account source'],['unsupported_budget','Treat tentative budget as approved'],['change_after_approval','Change proposal after approval']]){const b=add(failures,'button',label,{type:'button'});b.disabled=!!state.receipts[r.id];b.onclick=()=>command(type);}
 for(const[fault,label]of [['before_commit','Interrupt before saving'],['after_commit','Lose acknowledgement after saving']]){const b=add(failures,'button',label,{type:'button'});b.disabled=!!state.receipts[r.id];b.onclick=()=>command('apply',{fault});}
 add(failures,'p','Prepare a new proposal to return to the source-supported case. Change the demo persona to test action permission.');
 const result=add(right,'section','',{class:'delivery-panel delivery-bottom',id:'delivery-result'});add(result,'h2','Saved workspace');const account=state.accounts[r.account];
 change(result,'Opportunity stage',r.before.stage,account.stage);change(result,'Requested seats',r.before.requestedSeats,account.requestedSeats);change(result,'Approved annual value',r.before.approvedAnnualValue,account.approvedAnnualValue);
 add(result,'p','Account revision '+account.revision+' · indicative budget '+(account.indicativeBudget?'£'+account.indicativeBudget.amount.toLocaleString('en-GB')+' · '+account.indicativeBudget.status:'not recorded'));
 const issue=state.issues[r.account+':export'],request=state.requests[r.account+':budget'];if(issue)add(result,'p',issue.id+' · '+issue.title+' · '+issue.status);if(request)add(result,'p','Finance · £'+request.amount.toLocaleString('en-GB')+' · '+request.status);
 if(state.receipts[r.id])add(result,'p','Receipt '+state.receipts[r.id].id+' · '+state.receipts[r.id].at+' · approved by '+PERSONAS[state.receipts[r.id].approval.actor].name);
 const trace=add(app,'section','',{class:'delivery-panel delivery-bottom',id:'delivery-trace'});add(trace,'h2','What happened in this run?');const list=add(trace,'ol','',{class:'delivery-trace'});
 for(const e of r.trace){const li=add(list,'li');add(li,'strong',e.step+' · '+e.status);add(li,'p',e.detail);const d=fold(li,'Inspect step evidence');add(d,'pre',JSON.stringify(e,null,2));}
 const receipts=fold(trace,'Observed execution receipts');add(receipts,'p','These measurements belong to the code that ran in this sandbox. They are not model latency or whole-workflow timings.');for(const e of r.executions||[]){add(receipts,'p',e.command+' · '+e.surface+' · '+e.compute_ms.toFixed(2)+' ms reducer compute · '+e.policy);}
 const adapter=fold(trace,'Model adapter contract');add(adapter,'pre',JSON.stringify(r.adapter,null,2));add(adapter,'p','Prepared fixture adapter is active. Live provider execution is not installed. Routing plans do not change that boundary.');
 const download=add(trace,'button','Download run evidence',{type:'button'});download.onclick=()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify({run:r,receipt:state.receipts[r.id]??null,mode,modelCalls:0,observedModelUsage:null},null,2)],{type:'application/json'}));a.href=url;a.download=r.id+'.json';a.click();URL.revokeObjectURL(url);};
 const routeHost=add(app,'section','',{class:'delivery-panel delivery-bottom'});add(routeHost,'h2','Routing plan and observed execution');add(routeHost,'p','This run used prepared proposals and code checks. No new model was dispatched. Token usage and model latency for these steps are unavailable. The controls below change planning assumptions.');
 if(card)route=renderRoute(routeHost,'call-crm',{id:r.id,usage:{input_tokens:6000,output_tokens:1200}},card,{savedPlan:route?.snapshot(),getContext:()=>({draft:r.draft})});
 architecture(app);
 const oversight=add(app,'section','',{class:'delivery-panel delivery-bottom'});add(oversight,'h2','Operation and ownership');const stats=deliveryStats(state);add(oversight,'p',stats.runs+' fictional runs · '+stats.confirmed+' confirmed · '+stats.held+' held · '+stats.commits+' unique commits · '+stats.denied+' blocked attempts.');add(oversight,'p','Business owner: scope, review and adoption. Platform owner: integrations, policies and reliability. Finance: commercial approval. Engineering: issue triage and remediation.');add(oversight,'p','These are sandbox events, not real weekly active users or measured business savings.');
 add(app,'p','Fictional data · no external writes · no new model calls · saved only in this sandbox.',{class:'delivery-foot'});
}
function architecture(p){const section=add(p,'section','',{class:'delivery-panel delivery-bottom'}),d=fold(section,'Where does it run?');const grid=add(d,'div','',{class:'delivery-architecture'});for(const[title,text]of [['Browser','Displays the conversation, source-linked proposals, review and execution evidence.'],[mode==='server'?'Loopback writer':'Browser policy engine',mode==='server'?'Node.js validates the server-session demo persona, exact proposal, account revision and source rules. Requests from other origins are blocked.':'The same policy engine runs in JavaScript. This is a portable demonstration, not trusted access enforcement.'],[mode==='server'?'Local state file':'Browser state',mode==='server'?'Fictional records and receipts are saved together by atomic replacement and read back. No external CRM, credentials or model endpoint.':'Fictional records and receipts stay in localStorage on this origin. No server-side writes.']]){const cell=add(grid,'div');add(cell,'strong',title);add(cell,'p',text);}add(d,'p','Demo personas can be selected deliberately. They are not verified employee identities or enterprise sign-in.');if(runtime){const status=fold(d,'Runtime and policy status');add(status,'pre',JSON.stringify(runtime,null,2));}link(d,'Inspect the workflow source','https://github.com/olilifts88/meridian-labs');}
async function main(){
 try{const response=await fetch('/api/delivery/state');if(response.status===404)state=readDelivery(localStorage);else if(response.ok){const data=await response.json();if(data.mode!=='server')throw Error('Unexpected sandbox response.');mode='server';state=data.state;actor=data.actor;runtime=data.runtime;}else throw Error('The local writer is unavailable; browser fallback was not used.');}
 catch(e){loadError=e.message;state=blankDelivery();}
 try{card=await(await fetch('/data/rate-card.json')).json();}catch{card=null;}
 selected=state.runs.at(-1)?.id;draw();if(loadError)say(loadError,true);
}
main();
