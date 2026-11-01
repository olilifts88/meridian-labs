// Source-linked checks for the release workbench. Original run records are read-only.
export function releaseEvidence(record) {
 const source=record?.evidence?.sources?.['product-change'];
 const change=source?.content||{};
 return {source,change,ready:source?.approved===true&&Boolean(change.summary&&change.action&&change.availability_statement&&change.stage&&change.audiences?.length)};
}
export function releaseBody(record) {
 try {const value=JSON.parse(record.answer);return typeof value.body==='string'?{text:value.body,structured:true}:{text:record.answer,structured:false};}
 catch {return {text:record.answer||'',structured:false};}
}
export function assessRelease(record,{missingAvailability=false}={}) {
 const {source,change,ready}=releaseEvidence(record),body=releaseBody(record);
 const pilot=change.stage!=='ga'||!change.audiences?.includes('all_customers'),available=ready&&!missingAvailability;
 const changePhrase=(change.summary||'').replace(change.feature||'','').trim().replace(/^now /i,'').replace(/\.$/,'');
 const checks=[
  {id:'availability',label:'Confirmed audience retained',pass:available&&body.text.includes(change.availability_statement),detail:available?change.availability_statement:'Rollout confirmation is missing. Hold the draft.',source:'release-source-availability'},
  {id:'scope',label:'No wider rollout claimed',pass:available&&(!pilot||!/all customers|everyone|generally available|general availability/i.test(body.text)),detail:pilot?'Keep the confirmed audience restriction in the announcement.':'General availability is confirmed in the release specification.',source:'release-source-availability'},
  {id:'change',label:'Product change included',pass:available&&body.text.includes(change.feature)&&body.text.includes(changePhrase),detail:change.summary||'A confirmed change is required.',source:'release-source-change'},
  {id:'action',label:'Customer action included',pass:available&&body.text.toLowerCase().includes(change.action.toLowerCase()),detail:change.action||'A customer action is required.',source:'release-source-action'},
  {id:'format',label:'Required answer format',pass:available&&body.structured,detail:body.structured?'The source answer contains the requested body field.':'The source answer is plain text; the required JSON format was not met.',source:null}
 ];
 if(change.change_category==='breaking_change'){checks.push({id:'migration-window',label:'API v1 support window retained',pass:available&&body.text.includes('API v1 keeps its current behaviour until 1 February 2027.'),detail:'Retain the confirmed API v1 support date so clients can plan their migration.',source:'release-source-context'},{id:'async-response',label:'Async response explained',pass:available&&body.text.includes('HTTP 202')&&body.text.includes('job ID'),detail:'Creating an export job is separate from downloading the finished file.',source:'release-source-context'});}
 return {available,pilot,body,checks,passed:checks.filter(c=>c.pass).length,total:checks.length,ready:available&&checks.every(c=>c.pass),source,change};
}
export function releaseDecisions(record) {
 const {change}=releaseEvidence(record),pilot=change.stage!=='ga'||!change.audiences?.includes('all_customers');
 return [
  {label:'Include',tone:'good',title:change.feature||'Product change',text:change.summary,source:'release-source-change'},
  {label:pilot?'Keep restriction':'Confirm scope',tone:pilot?'warn':'good',title:change.audience_label||(pilot?'Pilot audience only':'Available to all customers'),text:change.availability_statement,source:'release-source-availability'},
  {label:'Keep together',tone:'neutral',title:'One change, two PR references',text:'Both PRs belong to '+change.change_id+'. They support one announcement, not two separate release items.',source:'release-source-references'},
  {label:'Exclude',tone:'neutral',title:pilot?'A wider launch claim':'Unconfirmed benefits',text:pilot?'The evidence does not support “available to everyone”.':'The evidence does not establish performance gains or other benefits beyond the confirmed change.',source:'release-source-availability'}
 ];
}
