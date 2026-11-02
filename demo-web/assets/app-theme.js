(()=>{
 const key='meridian-app-appearance';let theme;try{theme=localStorage.getItem(key)}catch{}if(!['light','dark'].includes(theme))theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 const apply=value=>{document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;};apply(theme);
 document.addEventListener('DOMContentLoaded',()=>{
  const header=document.querySelector('.site-banner,.app-header,header'),nav=header?.querySelector('nav')||header;if(!nav)return;
  if(header.matches('.site-banner')){const home=header.querySelector('.banner-home');if(home){home.classList.add('app-product');home.replaceChildren();const strong=document.createElement('strong');strong.textContent='AI Workflows';const small=document.createElement('small');small.textContent='by Meridian Labs';home.append(strong,small);}}
  const label=document.createElement('label');label.className='app-theme-control';label.append(document.createTextNode('Appearance'));const select=document.createElement('select');select.setAttribute('aria-label','Appearance');for(const value of ['light','dark']){const o=document.createElement('option');o.value=value;o.textContent=value==='light'?'Light':'Dark';o.selected=value===theme;select.append(o)}label.append(select);nav.append(label);const status=document.createElement('span');status.className='app-theme-status';status.setAttribute('role','status');label.append(status);select.onchange=()=>{theme=select.value;apply(theme);try{localStorage.setItem(key,theme);status.textContent=''}catch{status.textContent='Applied for this page; preference could not be saved.'}};
  window.addEventListener('storage',e=>{if(e.key===key&&['light','dark'].includes(e.newValue)){theme=e.newValue;select.value=theme;apply(theme)}});
 });
})();
