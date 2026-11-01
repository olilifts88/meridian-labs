import {assessRelease} from './release-quality.mjs';
import {releaseCopy,copyText,COPY_REVISION} from './release-copy.mjs';

export const RELEASE_TITLE='CSV export keeps your column order';
export function releaseTitle(record){return record?.evidence?.sources?.['product-change']?.content?.release_title||RELEASE_TITLE;}
export function publicationUrl(result){return '/release-note.html?session='+encodeURIComponent(result.id);}
export function approvePublication(result,now=new Date().toISOString()){
 const assessment=assessRelease(result.record);
 if(result.case?.workflow!=='release-notes'||result.review_choice!=='approve'||!assessment.ready||result.fresh_checks?.outcome!=='Pass'||result.outcome?.state!=='simulated_complete'||!result.outcome?.actions?.length||result.outcome.actions.some(a=>a.state!=='applied'||a.human_approved!==true))throw Error('The draft needs passing checks and approval before publication.');
 if(!Number.isFinite(Date.parse(now)))throw Error('Invalid publication date.');
 const copy=releaseCopy(result.record);if(!assessRelease({...result.record,answer:JSON.stringify({body:copyText(copy)})}).ready)throw Error('The release copy does not pass its source checks.');
 return {...result,publication:{schema:'meridian-release-publication-v2',copy,copy_revision:COPY_REVISION,title:releaseTitle(result.record),approved_body:assessment.body.text,approved_answer:result.record.answer,approved_evidence:JSON.stringify(result.record.evidence),source_run_id:result.record.id,published_at:now,destination:publicationUrl(result),scope:'browser-owned demo publication'}};
}
export function validatePublication(result){
 const p=result?.publication;
 if(!p||!['meridian-release-publication-v1','meridian-release-publication-v2'].includes(p.schema)||!/^scenario-[a-z0-9-]+$/.test(result.id)||result.case?.workflow!=='release-notes'||result.review_choice!=='approve'||result.source_run_id!==result.record?.id||p.source_run_id!==result.record.id||p.title!==releaseTitle(result.record)||p.approved_answer!==result.record.answer||p.approved_evidence!==JSON.stringify(result.record.evidence)||p.destination!==publicationUrl(result)||!Number.isFinite(Date.parse(p.published_at))||result.fresh_checks?.outcome!=='Pass'||result.outcome?.state!=='simulated_complete'||!result.outcome?.actions?.length||result.outcome.actions.some(a=>a.state!=='applied'||a.human_approved!==true)||!assessRelease(result.record).ready||p.approved_body!==assessRelease(result.record).body.text)throw Error('This release note does not match an approved draft.');
 if(p.schema==='meridian-release-publication-v2'&&(p.copy_revision!==COPY_REVISION||JSON.stringify(p.copy)!==JSON.stringify(releaseCopy(result.record))))throw Error('The release copy has changed since approval.');
 return result;
}
export function findPublication(results,record){
 return results.find(r=>{try{validatePublication(r);return r.publication.schema==='meridian-release-publication-v2'&&r.record.id===record.id&&r.publication.approved_answer===record.answer&&r.publication.approved_evidence===JSON.stringify(record.evidence);}catch{return false;}})||null;
}
// Prepared code context requested for the demo. Separate from the recorded model evidence.
export const PR_CONTEXT=[
 {number:41,title:'Keep the report’s column order',file:'src/reports/export-csv.ts',summary:'Use the columns shown in the report when building the CSV. The row object does not decide the order.',lines:[['context','export function exportCsv(rows, visibleColumns) {'],['remove','  const columns = Object.keys(rows[0]);'],['add','  const columns = visibleColumns.map(column => column.key);'],['context','  return toCsv(rows, { columns });'],['context','}']]},
 {number:42,title:'Check the exported headings',file:'tests/reports/export-csv.test.ts',summary:'Check a report whose visible columns use a different order from the underlying row data.',lines:[['add',"it('keeps the visible report column order', () => {"],['add',"  const rows = [{ name: 'Acme', revenue: 32000 }];"],['add',"  const columns = [{ key: 'revenue' }, { key: 'name' }];"],['add','  const csv = exportCsv(rows, columns);'],['add',"  expect(csv.split('\\n')[0]).toBe('revenue,name');"],['add','});']]}
];

export function releasePRContext(record){
 const category=record.evidence.sources['product-change'].content.change_category;
 if(category==='bug_fix')return [
  {number:43,title:'Quote CSV field values',file:'src/reports/csv-field.ts',summary:'Wrap each value and escape embedded quotes so commas stay inside the field.',lines:[['remove','return String(value);'],['add',`return '"' + String(value).replaceAll('"', '""') + '"';`]]},
  {number:44,title:'Cover commas and embedded quotes',file:'tests/reports/csv-field.test.ts',summary:'Check names containing commas and quotes.',lines:[['add',`expect(csvField('Acme, Inc')).toBe('"Acme, Inc"');`],['add',`expect(csvField('A "quoted" name')).toBe('"A ""quoted"" name"');`]]}
 ];
 if(category==='breaking_change')return [
  {number:45,title:'Return a background export job',file:'src/api/v2/report-export.ts',summary:'Return a job reference. Creating the job does not mean the file is ready.',lines:[['remove','return sendCsv(report);'],['add','const job = await exports.create(report.id);'],['add','return json({ job_id: job.id, download_url: job.url }, 202);']]},
  {number:46,title:'Check the migration response',file:'tests/api/v2/report-export.test.ts',summary:'Check the accepted response and job reference before downloading.',lines:[['add','expect(response.status).toBe(202);'],['add','expect(response.body.job_id).toBeDefined();'],['add','expect(response.body.download_url).toBeDefined();']]}
 ];
 return PR_CONTEXT;
}
