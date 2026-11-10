import {openAppDialog} from './app-dialog.mjs';
export function installWorkflowPreviews(root=document){
 for(const card of root.querySelectorAll('.workflow')){
  const link=card.querySelector('a.button');if(!link||card.dataset.previewInstalled)continue;card.dataset.previewInstalled='true';card.classList.add('has-workflow-preview');
  const open=e=>{if(e?.button>0||e?.metaKey||e?.ctrlKey||e?.shiftKey||e?.altKey)return;e?.preventDefault();
   const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;
   const content=document.createElement('section'),intro=document.createElement('p');intro.className='workflow-preview-intro';intro.textContent=card.querySelector('.explain')?.textContent||'Choose a prepared example and inspect its output.';content.append(intro);
   const frame=document.createElement('iframe');url.searchParams.set('embed','1');frame.src=url.href;frame.title=card.querySelector('h2')?.textContent+' interactive workflow';content.append(frame);
   openAppDialog({title:card.querySelector('h2')?.textContent||'Workflow',trigger:link,content,href:link.href,wide:true});
  };
  link.onclick=open;link.textContent='Preview workflow →';link.setAttribute('aria-label','Preview '+card.querySelector('h2')?.textContent);link.setAttribute('aria-haspopup','dialog');
  card.addEventListener('click',e=>{if(e.target.closest('a,button,input,select,textarea'))return;open(e);});
 }
}
installWorkflowPreviews();
