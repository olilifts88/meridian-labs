import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {blankDelivery,validateDelivery,transitionDelivery,visibleDelivery,PERSONAS} from '../demo-web/assets/delivery-engine.mjs';
import {ADAPTER} from '../demo-web/assets/delivery-adapter.mjs';

const root=fileURLToPath(new URL('../demo-web/',import.meta.url));
export async function createDeliveryServer({port=8770,stateFile=resolve(tmpdir(),'meridian-delivery-'+port+'.json')}={}){
 let state;try{state=validateDelivery(JSON.parse(await readFile(stateFile,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;state=blankDelivery();}
 const sessions=new Map();let queue=Promise.resolve();const started=Date.now();let commands=0;
 const runtime=()=>({surface:'loopback_node_server',node:process.version,uptime_seconds:Math.floor((Date.now()-started)/1000),writer:'Serialized commands; atomic JSON replacement; disk readback',session:'HttpOnly SameSite=Strict cookie; deliberately switchable demo personas',policy:'delivery-policy-v1',model_adapter:ADAPTER,commands,external_writes:false});
 const server=http.createServer(async(req,res)=>{
  const host='127.0.0.1:'+server.address().port;
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   if(req.headers.host!==host){json(403,{error:'Use the loopback address printed at startup.'});return;}
   const url=new URL(req.url,'http://'+host),path=url.pathname;
   if(path.startsWith('/api/delivery/')){
    if(req.headers.origin&&req.headers.origin!=='http://'+host){json(403,{error:'Cross-origin requests are blocked.'});return;}
    const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('delivery_session='))?.split('=')[1];
    let actor=sessions.get(token);
    if(req.method==='GET'&&path==='/api/delivery/state'){
     if(!actor){const value=randomBytes(24).toString('hex');sessions.set(value,'owner');res.setHeader('Set-Cookie','delivery_session='+value+'; HttpOnly; SameSite=Strict; Path=/api/delivery/');actor='owner';}
     json(200,{mode:'server',actor,state:visibleDelivery(state,actor),runtime:runtime(),stateFile:'Local sandbox file'});return;
    }
    if(req.method!=='POST'){json(405,{error:'Method not allowed.'});return;}
    if(req.headers.origin!=='http://'+host){json(403,{error:'A same-origin browser request is required.'});return;}
    if(!actor){json(401,{error:'Open the sandbox before making changes.'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){json(415,{error:'JSON is required.'});return;}
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384){json(413,{error:'Request too large.'});return;}}
    let data;try{data=JSON.parse(body);}catch{json(400,{error:'Invalid JSON.'});return;}
    if(path==='/api/delivery/persona'){
     if(!PERSONAS[data.actor]){json(400,{error:'Unknown demo persona.'});return;}
     const value=randomBytes(24).toString('hex');sessions.delete(token);sessions.set(value,data.actor);res.setHeader('Set-Cookie','delivery_session='+value+'; HttpOnly; SameSite=Strict; Path=/api/delivery/');json(200,{actor:data.actor,state:visibleDelivery(state,data.actor),mode:'server'});return;
    }
    if(path!=='/api/delivery/command'){json(404,{error:'Unknown endpoint.'});return;}
    // Serialize transactions; validate against the latest revision, then persist before acknowledging.
    const operation=queue.then(async()=>{
     const next=transitionDelivery(state,data,{actor,surface:'local_server'});commands++;await mkdir(dirname(stateFile),{recursive:true});
     const temporary=stateFile+'.tmp';await writeFile(temporary,JSON.stringify(next),{mode:0o600});await rename(temporary,stateFile);state=next;
     const readback=validateDelivery(JSON.parse(await readFile(stateFile,'utf8')));if(JSON.stringify(readback)!==JSON.stringify(next))throw Error('The saved workspace did not match its commit. Refresh before retrying.');return next;
    });queue=operation.catch(()=>{});
    try{await operation;json(200,{mode:'server',actor,state:visibleDelivery(state,actor),runtime:runtime()});}catch(e){json(409,{error:e.message,mode:'server',actor,state:visibleDelivery(state,actor),runtime:runtime()});}return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){json(405,{error:'Method not allowed.'});return;}
   const name=decodeURIComponent(path==='/'?'/delivery.html':path);const file=resolve(root,'.'+name);
   if(!file.startsWith(root)||name.split('/').some(p=>p.startsWith('.'))){json(404,{error:'Not found.'});return;}
   try{const content=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);}catch{json(404,{error:'Not found.'});}
  }catch(e){if(!res.headersSent)json(500,{error:'The sandbox could not complete this request. Previous saved state is retained.'});else res.end();}
 });
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--port'),f=args.indexOf('--state-file');const port=i<0?8770:Number(args[i+1]);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Use a valid port.');
 const server=await createDeliveryServer({port,...(f<0?{}:{stateFile:resolve(args[f+1])})});
 server.listen(port,'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+port+'/delivery.html\nFictional sandbox. Demo personas are not enterprise authentication. No model calls or external writes.'));
}
