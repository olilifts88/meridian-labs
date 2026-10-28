// Browser-owned scenario history. Never writes to the model benchmark or owner reviews.
export const STORAGE_KEY='meridian.visitor-scenarios.v1';
export const LIMIT=50;
export function validateResult(value){
 if(!value||value.schema!=='visitor-scenario-result-v1'||value.kind!=='visitor_scenario'||
    typeof value.id!=='string'||!/^scenario-[a-z0-9-]+$/.test(value.id)||
    !value.record||value.source_run_id!==value.record.id||!value.case||
    !value.execution||value.execution.model_calls!==0||value.execution.new_model_tokens!==0||value.execution.external_writes!==false||
    value.benchmark_contribution!==false||!['pending','approve','reject'].includes(value.review_choice)||
    !Array.isArray(value.scenario_checks)||!value.fresh_checks||!value.outcome||
    typeof value.record.answer!=='string'||typeof value.created_at!=='string')throw Error('This saved scenario record is invalid.');
 return value;
}
export function readResults(storage){
 const text=storage.getItem(STORAGE_KEY);if(!text)return [];
 const value=JSON.parse(text);if(!Array.isArray(value)||value.length>LIMIT)throw Error('Saved scenario history could not be read.');
 value.forEach(validateResult);return value;
}
export function saveResult(storage,value){
 validateResult(value);const previous=readResults(storage);const match=previous.find(x=>x.id===value.id);
 if(match){if(JSON.stringify(match)!==JSON.stringify(value))throw Error('A different result already uses this ID.');return previous;}
 if(previous.length>=LIMIT)throw Error('This browser has 50 saved results. Download this result or remove one before saving another.');
 const next=[value,...previous];storage.setItem(STORAGE_KEY,JSON.stringify(next));
 if(!readResults(storage).some(x=>x.id===value.id))throw Error('The browser could not confirm the save.');return next;
}
export function removeResult(storage,id){
 const next=readResults(storage).filter(x=>x.id!==id);storage.setItem(STORAGE_KEY,JSON.stringify(next));return next;
}
