import {readResults} from './visitor-results.mjs';
import {validatePublication,releasePRContext} from './release-publication.mjs';
import {renderCopy} from './release-copy.mjs';
import {releaseEvidence} from './release-quality.mjs';
const app=document.getElementById('release-page');
function add(p,tag,text='',attrs={}){const n=document.createElement(tag);n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);p.append(n);return n;}
function link(p,text,href,primary=false){return add(p,'a',text,{href,class:'button'+(primary?' primary':'')});}
try{
 const id=new URLSearchParams(location.search).get('session'),result=readResults(localStorage).find(r=>r.id===id);validatePublication(result);
 const p=result.publication,{change}=releaseEvidence(result.record);app.replaceChildren();document.title=p.title+' | Meridian Labs';
 const trail=add(app,'nav','',{'aria-label':'Breadcrumb',class:'rn-trail'});add(trail,'a','Workflows',{href:'/'});add(trail,'span','/');add(trail,'a','Release notes',{href:'/scenarios.html?workflow=release-notes'});
 const article=add(app,'article','',{class:'rn-article'}),meta=add(article,'div','',{class:'rn-meta'});add(meta,'span','Product update',{class:'eyebrow'});add(meta,'time',new Date(p.published_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),{datetime:p.published_at});
 add(article,'h1',p.title);const badge=add(article,'div','',{class:'rw-labels'});add(badge,'span',change.audience_label||(change.stage==='ga'?'Available to all customers':'Pilot release'),{class:'rw-badge '+(change.stage==='ga'?'good':'neutral')});
 // Publication layout omits the drafting prefix; the approved source text is retained below.
 if(p.copy)renderCopy(article,p.copy,{leadClass:'rn-body',sectionClass:'rn-section'});else{const copy=p.approved_body.replace(/^Draft(?: for review)?:\s*/i,'');add(article,'p',copy,{class:'rn-body'});}
 if(!p.copy){const action=add(article,'aside','',{class:'rn-action'});add(action,'h2',change.change_category==='breaking_change'?'Update your export integration':change.change_category==='bug_fix'?'Export your report again':'Try it in your next report');add(action,'p',change.action);if(change.stage!=='ga')add(action,'p','Access is limited to the confirmed pilot groups.',{class:'muted'});}
 if(change.visual){const visual=add(article,'figure','',{class:'rn-report'}),head=add(visual,'div','',{class:'rn-report-head'});add(head,'span',change.visual.title);add(visual,'pre',change.visual.code,{class:'rn-code'});add(visual,'figcaption',change.visual.caption);}else{
 const visual=add(article,'figure','',{class:'rn-report','aria-label':'Report column order carried into CSV export'}),head=add(visual,'div','',{class:'rn-report-head'});add(head,'span','Report → CSV export');add(head,'span','Column order retained',{class:'rw-badge good'});
 const table=add(visual,'table'),thead=add(add(table,'thead'),'tr');for(const text of ['Revenue','Customer'])add(thead,'th',text);const row=add(add(table,'tbody'),'tr');add(row,'td','£32,000');add(row,'td','Acme');add(visual,'figcaption','The exported headings follow the order shown in the report.');
 }
 const nav=add(article,'div','',{class:'rw-output-tools'});link(nav,'Review workflow result','/results.html?session='+encodeURIComponent(result.id));link(nav,'Back to release workflow','/scenarios.html?record='+encodeURIComponent(result.record.revision_source_id||result.record.id));
 const details=add(app,'details','',{class:'rn-details'});add(details,'summary','Publication & source details');add(details,'p','Approved and opened on the Meridian demo release page. This release and its approval history are saved in this browser.',{class:'muted'});
 add(details,'p','Source: '+result.record.evidence.sources['product-change'].title+' · PR #'+releasePRContext(result.record).map(r=>r.number).join(' and #')+'.');add(details,'p','Approval saved '+new Date(p.published_at).toLocaleString('en-GB')+'.');add(details,'h2','Approved draft');add(details,'p',p.approved_body);add(details,'a',result.record.kind==='prepared_release_output'?'Inspect release evidence':'Inspect the original source answer',{href:result.record.kind==='prepared_release_output'?'/scenarios.html?record='+encodeURIComponent(result.record.revision_source_id||result.record.id):'/results.html?run='+encodeURIComponent(result.source_run_id)});
}catch(error){app.replaceChildren();add(app,'h1','Release note unavailable');add(app,'p','Open an approved release from this browser, or run the release workflow to create one.');link(app,'Open release workflow','/scenarios.html?workflow=release-notes',true);}
