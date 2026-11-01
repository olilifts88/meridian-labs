// Pure calculation. Effort selects a route; it never multiplies a token price.
export function validateCard(card){
 if(card?.schema!==2||card.currency!=='USD'||!/^\d{4}-\d{2}-\d{2}$/.test(card.verified_on)||!card.models||!Object.keys(card.models).length)throw Error('Invalid pricing snapshot');
 for(const [id,m] of Object.entries(card.models)){
  if(!/^gpt-6(?:\.\d+)?-[a-z]+$/.test(id)||!Array.isArray(m.efforts)||!m.efforts.length||!m.tiers?.standard)throw Error('Invalid model configuration');
  for(const k of ['input','cached','output','write_30m','write_12h'])if(typeof m[k]!=='number'||!Number.isFinite(m[k])||m[k]<0)throw Error('Invalid price');
  if(!Number.isSafeInteger(m.long_context_threshold)||m.long_context_threshold<1||!Number.isFinite(m.long_input_multiplier)||m.long_input_multiplier<1||!Number.isFinite(m.long_output_multiplier)||m.long_output_multiplier<1)throw Error('Invalid context rates');
  if(!m.source?.startsWith('https://developers.openai.com/api/docs/models/'))throw Error('Invalid pricing source');
  for(const v of Object.values(m.tiers))if(!Number.isFinite(v)||v<=0)throw Error('Invalid processing rate');
 }
 return card;
}
export function price(row,card){
 const fail=reason=>({amount:null,reason,currency:'USD',actual_charge:null,rate_card_id:card?.id});
 const m=card?.models?.[row.model||row.recorded_model];if(!m)return fail('Unknown or unsupported model');
 const keys=['input_tokens','cached_input_tokens','output_tokens','reasoning_output_tokens','cache_write_input_tokens'];
 if(keys.some(k=>!Number.isSafeInteger(row[k])||row[k]<0))return fail('Missing or invalid token category');
 const i=row.input_tokens,c=row.cached_input_tokens,o=row.output_tokens,w=row.cache_write_input_tokens;
 if(c+w>i||row.reasoning_output_tokens>o||row.total_tokens!=null&&row.total_tokens!==i+o)return fail('Token categories do not reconcile');
 if(row.effort&&!m.efforts.includes(row.effort))return fail('Unsupported effort for this model');
 let a=0,b=0;
 if(w){
  if(row.cache_write_semantics!=='openai-input-subset-v1')return fail('Cache-write counter semantics are unverified');
  a=row.cache_write_30m_tokens;b=row.cache_write_12h_tokens;
  if(!Number.isSafeInteger(a)||a<0||!Number.isSafeInteger(b)||b<0||a+b!==w)return fail('Cache-write lifetimes are missing or inconsistent');
 }
 const tier=row.processing_tier||'standard',tm=m.tiers[tier];if(tm==null)return fail('Unsupported processing tier');
 const region=row.region||'global';if(!['global','regional','fedramp'].includes(region))return fail('Unknown pricing region');
 if(region==='regional'&&m.unsupported_regional_tiers?.includes(tier))return fail('Regional processing is unavailable for this tier');
 const regionMultiplier=region==='global'?1:card.regional_multiplier;
 const long=i>m.long_context_threshold,im=long?m.long_input_multiplier:1,om=long?m.long_output_multiplier:1;
 const counts={input:i-c-w,cached:c,write_30m:a,write_12h:b,output:o},components={};
 for(const [k,n] of Object.entries(counts))components[k]=n*m[k]*(k==='output'?om:im)*tm*regionMultiplier/1e6;
 return {amount:Object.values(components).reduce((s,v)=>s+v,0),reason:null,currency:'USD',actual_charge:null,components,token_counts:counts,context_band:long?'long':'short',processing_tier:tier,region,rate_card_id:card.id,verified_on:card.verified_on};
}
export function priceTask(rows,card,{inventoryComplete=false}={}){
 const seen=new Map(),priced=[],gaps=[];let duplicates=0;
 for(const row of rows){
  const key=row.response_id&&row.session_id?JSON.stringify([row.session_id,row.response_id]):null;
  if(!key){gaps.push('Missing response identity');continue;}
  if(seen.has(key)){if(JSON.stringify(seen.get(key))!==JSON.stringify(row))throw Error('Conflicting duplicate response');duplicates++;continue;}
  seen.set(key,row);const result=price(row,card);priced.push({...row,estimate:result});if(result.amount==null)gaps.push(result.reason);
 }
 const subtotal=priced.some(r=>r.estimate.amount!=null)?priced.reduce((s,r)=>s+(r.estimate.amount??0),0):null;
 const complete=inventoryComplete&&priced.length>0&&!gaps.length;
 return {subtotal,amount:complete?subtotal:null,coverage:complete?'Complete':subtotal==null?'Unavailable':'Partial',gaps,duplicates,rows:priced};
}
