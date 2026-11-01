// Static replay adapter. Requests only read exported public-safe JSON.
(()=>{
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.origin!==location.origin)return nativeFetch(input,options);
  if(url.pathname==='/api/scenario'){
   let body;try{body=JSON.parse(options.body||'{}');}catch{return new Response('{"error":"Invalid scenario request"}',{status:400});}
   if(!/^[a-z0-9-]+$/.test(body.record_id||'')||!['pending','approve','reject'].includes(body.review_choice))return new Response('{"error":"Choose a prepared recorded scenario"}',{status:400});
   const response=await nativeFetch('/data/scenarios/'+body.record_id+'--'+body.review_choice+'.json');
   if(!response.ok)return new Response('{"error":"This prepared scenario is unavailable"}',{status:404});
   const result=await response.json();
   result.id='scenario-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));result.created_at=new Date().toISOString();
   return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
  }
  const routes={'/api/recorded-runs':'recorded-runs','/api/pilot':'pilot','/api/benchmarks':'benchmarks','/api/evaluations':'evaluations'};
  if(routes[url.pathname])return nativeFetch('/data/'+routes[url.pathname]+'.json');
  if(url.pathname==='/api/pricing/preflight')return nativeFetch(input,options);
  if(url.pathname.startsWith('/api/'))return new Response('{"error":"This hosted version supports recorded replays only"}',{status:404});
  return nativeFetch(input,options);
 };
})();
