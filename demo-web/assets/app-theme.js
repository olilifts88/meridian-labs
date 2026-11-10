(()=>{
 const key='meridian-app-appearance';let theme;try{theme=localStorage.getItem(key)}catch{}if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 const apply=value=>{document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;};apply(theme);
 document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-banner,.app-header,header'),nav=header?.querySelector('nav')||header;if(!nav)return;
  // One shared shell: Meridian identity + the existing product and controls.
  // Keep this in the shared experience script, not individual workflow pages.
  if(!header.classList.contains('meridian-shell')){
   header.classList.add('meridian-shell');
   const logo=document.createElement('a');logo.className='ml-suite-home';logo.href='/';logo.setAttribute('aria-label','Meridian Labs · all workflows');
   const image=document.createElement('img');image.src='/assets/meridian-original-realistic.svg';image.alt='';image.width=68;image.height=68;const wordmark=document.createElement('span');wordmark.textContent='Meridian Labs';logo.append(image,wordmark);
   const oldHome=header.querySelector('.banner-home');
   if(oldHome){const product=document.createElement('a');product.className='ml-product';product.href='/';const strong=document.createElement('strong');strong.textContent='AI Workflows';const small=document.createElement('small');small.textContent='by Meridian Labs';product.append(strong,small);oldHome.replaceWith(product);}
   else {const product=header.querySelector('.app-brand')||header.querySelector(':scope > strong');if(product)product.classList.add('ml-product');}
   header.prepend(logo);
  }
  const label=document.createElement('label');label.className='app-theme-control';label.append(document.createTextNode('Appearance'));const select=document.createElement('select');select.setAttribute('aria-label','Appearance');for(const value of ['light','dark']){const o=document.createElement('option');o.value=value;o.textContent=value==='light'?'Light':'Dark';o.selected=value===theme;select.append(o)}label.append(select);nav.append(label);const status=document.createElement('span');status.className='app-theme-status';status.setAttribute('role','status');label.append(status);select.onchange=()=>{theme=select.value;apply(theme);try{localStorage.setItem(key,theme);status.textContent=''}catch{status.textContent='Applied for this page; preference could not be saved.'}};
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh page';refresh.title='Reload this page. Saved results stay in this browser.';refresh.onclick=()=>location.reload();nav.append(refresh);
  window.addEventListener('storage',e=>{if(e.key===key&&['light','dark'].includes(e.newValue)){theme=e.newValue;select.value=theme;apply(theme)}});
 });
})();
