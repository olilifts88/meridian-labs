// Shared live-content dialog. Content is moved, never cloned, so controls retain their handlers.
export function openAppDialog({title,trigger=null,content,href=null,wide=false,onClose=()=>{}}){
 if(!content)throw Error('Dialog content is required.');
 if(!document.querySelector('link[data-app-dialog-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/app-dialog.css';css.dataset.appDialogStyle='true';document.head.append(css);}
 const dialog=document.createElement('dialog');dialog.className='app-dialog'+(wide?' app-dialog-wide':'');dialog.setAttribute('aria-label',title);
 const head=document.createElement('header');head.className='app-dialog-heading';const heading=document.createElement('h2');heading.textContent=title;head.append(heading);
 const actions=document.createElement('div');actions.className='app-dialog-actions';
 if(href){const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener';link.textContent='Open full page ↗';actions.append(link);}
 const close=document.createElement('button');close.type='button';close.className='app-dialog-close';close.setAttribute('aria-label','Close '+title);close.textContent='Close ×';close.onclick=()=>dialog.close();actions.append(close);head.append(actions);
 const body=document.createElement('div');body.className='app-dialog-body';body.append(content);dialog.append(head,body);document.body.append(dialog);
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{onClose();dialog.remove();if(trigger?.isConnected)trigger.focus();},{once:true});
 dialog.showModal();close.focus();return dialog;
}
