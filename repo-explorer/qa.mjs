const ENDPOINT='https://mcp.deepwiki.com/mcp';
export function parseMessage(text){const events=text.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim());const message=JSON.parse(events.length?events.at(-1):text);if(message.error)throw Error(message.error.message||'Code Q&A is unavailable');return message.result;}
async function rpc(method,params,fetcher,signal){const response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','Mcp-Protocol-Version':'2024-11-05'},body:JSON.stringify({jsonrpc:'2.0',id:method==='tools/list'?1:2,method,params}),signal});if(!response.ok)throw Error('Code Q&A is unavailable ('+response.status+')');return parseMessage(await response.text());}
export async function askRepository(repository,question,{fetcher=fetch,signal}={}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||question.trim().length<3||question.length>600)throw Error('Enter a question between 3 and 600 characters.');
 const tools=await rpc('tools/list',{},fetcher,signal);
 const tool=tools.tools?.find(t=>['ask_wiki_question','ask_question'].includes(t.name)&&t.inputSchema?.properties?.repoName&&t.inputSchema?.properties?.question);
 if(!tool)throw Error('Code Q&A is temporarily unavailable.');
 const prompt='Answer this question about '+repository+' in plain English, using the repository code. Start with a direct one- or two-sentence answer, then use short bullets only if they help explain what happens. Keep the explanation under 130 words. Include source links. Avoid introductory filler and generic architecture tours. Distinguish prepared demo outputs from live model calls or external writes. If the code does not establish the answer, say what is missing. Question: '+question.trim();
 const result=await rpc('tools/call',{name:tool.name,arguments:{repoName:repository,question:prompt}},fetcher,signal);
 if(result.isError)throw Error('DeepWiki could not answer that question.');
 const answer=result.structuredContent?.result||result.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 if(typeof answer!=='string'||!answer.trim())throw Error('No answer was returned.');
 return answer.trim();
}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:'?u.href:null;}catch{return null;}}
