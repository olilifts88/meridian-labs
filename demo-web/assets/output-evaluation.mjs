import {inspectSource} from './app-ui.mjs';
// Per-output checks and matched recorded answers. Never invent model scores.
export function evaluationSummary(checks){
 if(!Array.isArray(checks)||checks.some(c=>typeof c.pass!=='boolean'||typeof c.label!=='string'))throw Error('Evaluation checks are invalid.');
 return {passed:checks.filter(c=>c.pass).length,total:checks.length,ready:checks.length>0&&checks.every(c=>c.pass),failed:checks.filter(c=>!c.pass)};
}
export function matchedComparisons(records,record){
 // Prepared outputs have different inputs or copy, so never inherit model judgments.
 if(!record||record.kind==='prepared_release_output'||record.kind==='prepared_business_output'||record.editorial_revision)return [];
 const matches=records.filter(r=>r.case_id===record.case_id&&r.evidence&&JSON.stringify(r.evidence)===JSON.stringify(record.evidence));
 return matches.map(r=>{const checks=r.revised_checks||r.original_checks;return {id:r.id,model:r.requested_model,instructions:r.configuration.endsWith('guided')?'What to produce + how to do it':'What to produce',passed:checks.criteria.filter(c=>c.verdict==='Pass').length,total:checks.criteria.length,ready:checks.outcome==='Pass',owner_review:r.owner_review||'Not reviewed',recorded_at:r.recorded_at};});
}
function add(p,t,text='',attrs={}){const n=document.createElement(t);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;}
export function sourceAnchor(parent,id,label='View source'){
 if(!id)return;const a=add(parent,'a',label,{href:'#'+id,class:'rw-source-link'});a.onclick=e=>{const target=document.getElementById(id);if(inspectSource(target,a)){e.preventDefault();return;}let n=target;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}target?.scrollIntoView({block:'center',behavior:'auto'});};return a;
}
export function renderOutputEvaluation(parent,{checks,record=null,records=[],models={},revision=null,title='This output’s evaluation',scope='Current output'}={}){
 parent.replaceChildren();const summary=evaluationSummary(checks),head=add(parent,'div','',{class:'oe-heading'});add(head,'h2',title);add(head,'span',summary.ready?'Source checks passed':'Needs attention',{class:'rw-badge '+(summary.ready?'good':'warn')});
 const count=add(parent,'div','',{class:'oe-count'});add(count,'strong',summary.passed+'/'+summary.total);add(count,'span','source checks passed');
 add(parent,'p',scope,{class:'oe-scope'});
 const list=add(parent,'div','',{class:'oe-checks'});for(const c of checks){const row=add(list,'div','',{class:'oe-check '+(c.pass?'oe-passed':'oe-flagged')}),line=add(row,'div','',{class:'oe-check-head'});add(line,'span',c.label);add(line,'strong',c.pass?'Passed':'Flagged');const mark=add(row,'div','',{class:'oe-mark','aria-hidden':'true'});add(mark,'span');add(row,'p',c.detail);sourceAnchor(row,c.source);}
 if(summary.failed.length){const next=add(parent,'div','',{class:'oe-next'});add(next,'strong','Resolve before approval');add(next,'p',summary.failed[0].detail);}
 if(revision){const change=add(parent,'div','',{class:'oe-revision'});add(change,'strong','Correction checked');add(change,'p',revision);}
 const human=add(parent,'div','',{class:'oe-human'});add(human,'strong','Clarity & usefulness');add(human,'span','Reviewer decision',{class:'rw-badge'});add(human,'p','Source checks establish fixed rules. Review whether the output is clear and useful before approving it.');

 return summary;
}
export function revealResults(deck,{scroll=true}={}){
 deck.hidden=false;
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 // All content is already available; this is a presentation reveal, never a fake run.
 if(!reduced&&typeof deck.animate==='function'){
  const targets=[...deck.querySelectorAll('.oe-heading,.oe-count,.oe-check,.oe-human,.oe-revision,.rw-output>h2,.rw-output>.row,.rw-output>.rw-draft-body,.rw-draft,.rw-output>.rw-labels')].filter(n=>!n.closest('details:not([open])')).slice(0,16);
  targets.forEach((n,i)=>{for(const a of n.getAnimations?.()||[])a.cancel();n.animate([{opacity:0,transform:'translateY(7px)',filter:'blur(1px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0)'}],{duration:260,delay:Math.min(i*32,280),easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});});
 }
 if(scroll)deck.scrollIntoView({block:'start',behavior:'auto'});
}
