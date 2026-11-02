export function runAction({run,view,render}){
 let state='idle',generation=0;
 const set=(next,ticket=null)=>{if(ticket!==null&&ticket!==generation)return false;state=next;render(state);return true;};
 const api={activate:()=>{if(state==='complete'||state==='held')view();else if(state==='idle')run();},begin:()=>{generation++;set('busy');return generation;},reset:()=>{generation++;set('idle');},complete:ticket=>set('complete',ticket),held:ticket=>set('held',ticket),fail:ticket=>set('idle',ticket),current:ticket=>ticket===generation};
 set('idle');return api;
}
export function attachRunButton(button,output,onRun){
 output.id=output.id||'workflow-output';output.setAttribute('tabindex','-1');button.setAttribute('aria-controls',output.id);
 const action=runAction({run:onRun,view:()=>{if(output.hidden)return;const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;output.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});output.focus({preventScroll:true});},render:state=>{
  button.replaceChildren();button.classList.toggle('is-complete',state==='complete');button.classList.toggle('is-held',state==='held');button.disabled=state==='busy';button.setAttribute('aria-busy',String(state==='busy'));
  if(state==='complete'){const icon=button.ownerDocument.createElement('span');icon.className='rw-run-check';icon.textContent='✓';icon.setAttribute('aria-hidden','true');button.append(icon);}
  const label=button.ownerDocument.createElement('span');label.textContent=state==='complete'?(button.dataset.completeLabel||'Complete · View output ↓'):state==='held'?'Needs evidence · View output ↓':state==='busy'?'Preparing result…':(button.dataset.idleLabel||'Run workflow');button.append(label);
 }});button.onclick=()=>action.activate();return action;
}
