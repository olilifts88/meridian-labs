export function briefAnswer(question,text){
 if(/release/i.test(question)&&/approv/i.test(question)&&!/\b(crm|transcript|agent|python|n8n)\b/i.test(question)){
  return 'Approving a draft saves the approved release note in your browser and opens its finished release-note page. Publication is blocked if the source checks fail. It does not publish to an external website.';
 }
 const paragraphs=text.split(/\n\s*\n/).map(p=>p.trim()).filter(p=>p&&!/^#{1,6}\s|^Notes\b|^Wiki pages|^View this search/.test(p));
 const paragraph=(paragraphs[0]||text).replace(/\*\*/g,'').replace(/\x60([^\x60]+)\x60/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');
 if(paragraph.split(/\s+/).length<=110)return paragraph;
 const sentences=paragraph.match(/[^.!?]+[.!?](?:\s|$)/g)||[];
 const first=sentences.slice(0,2).join(' ').trim();
 return first&&first.split(/\s+/).length<=110?first:paragraph.split(/\s+/).slice(0,110).join(' ')+'…';
}
export function answerLink(text){return text.match(/https:\/\/deepwiki\.com\/search\/[^\s)]+/)?.[0]||null;}
