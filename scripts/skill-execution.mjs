/** Optional runtime guard. It counts only calls made through this instance.
 * Private source registers are supplied by the caller, never bundled here.
 */
import {createHash} from 'node:crypto';

export function normalise(value){
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
const keyFor=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

export class SourceRegister {
  constructor(entries){
    this.aliases=new Map();
    const ids=new Set();
    for(const entry of entries){
      if(!entry.id||!entry.location||!entry.method)throw Error('Source needs id, location and method');
      if(ids.has(entry.id))throw Error('Duplicate source id');
      ids.add(entry.id);
      for(const alias of [entry.id,...(entry.aliases||[])]){
        const key=normalise(alias);if(!key)throw Error('Empty source alias');
        const matches=this.aliases.get(key)||[];
        if(!matches.some(e=>e.id===entry.id))matches.push(entry);
        this.aliases.set(key,matches);
      }
    }
  }
  resolve(name){
    const matches=this.aliases.get(normalise(name))||[];
    if(matches.length!==1)return {status:matches.length?'ambiguous':'unmapped',candidates:matches.map(e=>e.id)};
    const entry=matches[0];
    return {status:entry.retired?'retired':'mapped',source:entry,freshness:'requires-current-read'};
  }
}

export class ExecutionBudget {
  constructor({target=6,cap=10,reserve=2}={}){
    if(!Number.isInteger(target)||!Number.isInteger(cap)||!Number.isInteger(reserve)||target<0||target>cap||reserve<0||reserve>cap)throw Error('Invalid budget');
    this.target=target;this.cap=cap;this.reserve=reserve;this.calls=[];this.reads=new Map();this.writes=new Map();this.negativeSearches=0;
  }
  charge({tool,purpose,verification=false}){
    if(!tool||!purpose)throw Error('Call needs tool and purpose');
    const ceiling=verification?this.cap:this.cap-this.reserve;
    if(this.calls.length>=ceiling)throw Error(verification?'Call cap reached: return checkpoint':'Stop discovery: preserve verification reserve');
    this.calls.push({tool,purpose,verification});
  }
  recordSearch({matches}){
    if(!Number.isInteger(matches)||matches<0)throw Error('Invalid match count');
    if(matches===0)this.negativeSearches++;
    return this.negativeSearches>=2?'change-source-or-stop':'continue';
  }
  async read({tool,args,revision,invoke,verification=false}){
    // Caller may reuse only a task-current read. Permission/schema/revision changes
    // must change the key or invalidate it. Unknown revision is task-local only.
    const key=keyFor({tool,args,revision:revision||'task-current'});
    if(this.reads.has(key))return {reused:true,value:this.reads.get(key)};
    this.charge({tool,purpose:'read',verification});
    const value=await invoke(args);
    if(value?.isError)throw Error('Tool read failed');
    this.reads.set(key,value);return {reused:false,value};
  }
  invalidateReads(){this.reads.clear();}
  async write({identity,tool,args,invoke,verify}){
    if(!identity||typeof verify!=='function')throw Error('Write needs identity and readback');
    const prior=this.writes.get(identity);
    if(prior?.status==='verified')return {reused:true,...prior};
    if(prior)throw Error('Uncertain write: read back and reconcile before retry');
    // Reserve room for both mutation and matching verification before acting.
    if(this.calls.length+2>this.cap)throw Error('Insufficient write/readback budget');
    this.charge({tool,purpose:'write',verification:true});
    this.writes.set(identity,{status:'uncertain'});
    // A mutation may succeed even when its acknowledgement is lost. Cached reads
    // must not be used to decide whether an uncertain write reached the source.
    this.invalidateReads();
    const receipt=await invoke(args);
    if(receipt?.isError)throw Error('Write result uncertain: read back before retry');
    this.charge({tool,purpose:'readback',verification:true});
    if(await verify(receipt)!==true)throw Error('Readback mismatch: preserve uncertain write');
    const result={status:'verified',receipt};this.writes.set(identity,result);this.invalidateReads();return result;
  }
  checkpoint({complete=false,missing=[]}={}){
    if(complete&&missing.length)throw Error('Incomplete source cannot be complete');
    return {calls:this.calls.length,target:this.target,cap:this.cap,overTarget:this.calls.length>this.target,complete,missing,scope:'calls through this instance only'};
  }
}

export function toolData(result){
  if(result?.isError)throw Error('Tool returned an error');
  if(result?.structuredContent!=null)return result.structuredContent;
  const text=result?.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');
  if(!text)throw Error('No tool data');
  return JSON.parse(text);
}
