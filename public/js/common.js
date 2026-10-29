(function(){
  const state={user:null,csrf:null};
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format((Number(n)||0)/100);
  const byId=id=>document.getElementById(id);
  const app=()=>byId('app');
  const url=p=>`/${p}.html`;
  const roleHome=role=>role==='owner'?'/owner.html':role==='staff'?'/kitchen.html':'/';
  const roleName=role=>({owner:'Café Owner',staff:'Kitchen Staff',customer:'Customer'})[role]||'Guest';
  function allowedLoginDestination(next,role){
    if(!next)return roleHome(role);
    try{
      const parsed=new URL(next,location.origin);
      const publicPages=['/','/index.html','/menu.html','/offers.html','/about.html','/profile.html'];
      const byRole={owner:['/owner.html'],staff:['/kitchen.html'],customer:['/cart.html','/checkout.html','/orders.html','/receipt.html']};
      if(parsed.origin!==location.origin||![...publicPages,...(byRole[role]||[])].includes(parsed.pathname))return roleHome(role);
      // Staff and owners must always enter their respective workspace after sign-in unless opening a profile.
      if(role!=='customer'&&parsed.pathname!=='/profile.html')return roleHome(role);
      return parsed.pathname+parsed.search+parsed.hash;
    }catch{return roleHome(role);}
  }
  function setApp(html){app().innerHTML=html;}
  function heading(label,title,subtitle='') {
    return `<div class="pagehead"><div class="container"><span class="eyebrow">${esc(label)}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`;
  }
  let toastTimer;
  function toast(message,error=false){
    const t=byId('toast');if(!t)return;
    t.textContent=message;t.className=`toast visible${error?' error':''}`;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.className='toast',3800);
  }
  let csrfPromise;
  async function csrf(){
    if(csrfPromise)return csrfPromise;
    csrfPromise=(async()=>{
      const r=await fetch('/api/auth/csrf',{credentials:'same-origin'});
      if(!r.ok)throw Error('Could not initialize security token.');
      state.csrf=(await r.json()).csrfToken;
      return state.csrf;
    })();
    try{return await csrfPromise;}finally{csrfPromise=null;}
  }
  async function api(path,options={}){
    const method=(options.method||'GET').toUpperCase();
    const headers={...(options.headers||{})};
    if(!['GET','HEAD'].includes(method)){
      if(!state.csrf)await csrf();
      headers['X-CSRF-Token']=state.csrf;
      if(options.body&&typeof options.body!=='string'&&!(options.body instanceof Blob)&&!(options.body instanceof FormData)){
        headers['Content-Type']='application/json';options={...options,body:JSON.stringify(options.body)};
      }
    }
    const response=await fetch('/api'+path,{credentials:'same-origin',...options,method,headers});
    const type=response.headers.get('content-type')||'';
    const result=type.includes('json')?await response.json():{};
    if(!response.ok)throw Error(result.error||`Request failed (${response.status})`);
    return result;
  }
  async function getMe(){
    try{state.user=(await api('/auth/me')).user;}catch{state.user=null;}
    renderHeader();renderFooter();return state.user;
  }
  function basket(){try{const data=JSON.parse(localStorage.getItem('bb_cart')||'[]');return Array.isArray(data)?data.filter(i=>/^[a-f0-9]{24}$/i.test(i.id)&&Number.isInteger(i.qty)&&i.qty>0):[];}catch{return [];}}
  function saveBasket(cart){localStorage.setItem('bb_cart',JSON.stringify(cart));renderHeader();}
  function addItem(item){
    if(state.user&&state.user.role!=='customer'){toast('Ordering is available to customer accounts only.',true);return;}
    if(!item.available){toast('This item is currently unavailable.',true);return;}
    const cart=basket(),id=String(item._id),found=cart.find(x=>x.id===id);
    if(found){if(found.qty>=30)return toast('Maximum 30 units per item.',true);found.qty++;}
    else cart.push({id,qty:1,name:item.name,pricePaise:item.pricePaise,imageKey:item.imageKey,imageVersion:item.imageVersion||0});
    saveBasket(cart);toast(`${item.name} added to your cart`);
  }
  function menuImageSrc(item){
    const id=String(item._id||item.id||'');
    const version=Number(item.imageVersion)||0;
    if(version>0&&/^[a-f0-9]{24}$/i.test(id))return `/api/menu-images/${id}?v=${version}`;
    const key=['coffee','tea','pastry','sandwich','dessert','juice'].includes(item.imageKey)?item.imageKey:'coffee';
    return `/assets/${key}.svg`;
  }
  function productCard(x){
    const canOrder=!state.user||state.user.role==='customer';
    const enabled=x.available&&canOrder;
    return `<article class="product ${x.available?'':'unavailable'}"><img class="product-img" src="${esc(menuImageSrc(x))}" alt="${esc(x.name)}"><div class="product-body">
    <span class="product-category">${esc(x.category?.name||'Café favourite')}</span><h3>${esc(x.name)}</h3><p>${esc(x.description)}</p>
    <div class="product-bottom"><span class="price">${money(x.pricePaise)}</span><button class="btn small" data-add="${esc(x._id)}" ${enabled?'':'disabled'}>${!canOrder?'Preview only':x.available?'Add to cart +':'Unavailable'}</button></div></div></article>`;
  }
  function bindProducts(root,items){root.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const item=items.find(x=>String(x._id)===b.dataset.add);if(item)addItem(item);});}
  function navLink(href,label){
    const path=location.pathname;
    const active=path===href||(href==='/'&&path==='/index.html');
    return `<a href="${href}" ${active?'class="active" aria-current="page"':''}>${esc(label)}</a>`;
  }
  function renderHeader(){
    const u=state.user,role=u?.role||'',name=u?.name?.trim()||'',first=name.split(/\s+/)[0]||'Account';
    const total=basket().reduce((s,x)=>s+x.qty,0);
    const home=roleHome(role);
    let links='';
    if(role==='owner')links=navLink('/owner.html','Dashboard')+navLink('/menu.html','Menu preview')+navLink('/offers.html','Offers')+navLink('/about.html','About')+navLink('/profile.html','My profile');
    else if(role==='staff')links=navLink('/kitchen.html','Kitchen board')+navLink('/menu.html','Menu preview')+navLink('/about.html','About')+navLink('/profile.html','My profile');
    else links=navLink('/','Home')+navLink('/menu.html','Menu')+navLink('/offers.html','Offers')+navLink('/about.html','About')+(role==='customer'?navLink('/orders.html','My orders')+navLink('/profile.html','My profile'):'');
    if(u)links+=`<span class="nav-identity">Signed in as <strong>${esc(name)}</strong> · ${esc(roleName(role))}</span><button class="nav-mobile-logout" data-logout type="button">Log out</button>`;
    const account=u?`<a class="account-link" href="/profile.html" title="${esc(name)} · ${esc(roleName(role))}" aria-label="My profile: ${esc(name)}, ${esc(roleName(role))}"><span class="account-avatar">${esc(first.charAt(0).toUpperCase())}</span><span class="account-copy"><strong>${esc(first)}</strong><small>${esc(roleName(role))}</small></span></a>`:'<a class="btn secondary small" href="/login.html">Sign in</a>';
    const cartAction=!u||role==='customer'?`<a class="btn small cart-action" href="/cart.html" aria-label="View cart, ${total} items">Cart <span class="cart-counter">${total}</span></a>`:'';
    byId('site-header').innerHTML=`<header class="header"><div class="container header-inner">
      <a class="brand" href="${home}"><img src="/assets/logo.svg" alt="Brew & Bite emblem"><span>Brew & Bite<small>CAFÉ & KITCHEN</small></span></a>
      <nav id="main-nav" class="nav-links" aria-label="Main navigation">${links}</nav>
      <div class="head-actions">${account}${cartAction}${u?'<button data-logout class="btn signout-btn small head-logout" type="button">Log out</button>':''}
      <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Toggle navigation" aria-controls="main-nav" aria-expanded="false">☰</button></div></div></header>`;
    byId('nav-toggle').onclick=()=>{const n=byId('main-nav'),open=n.classList.toggle('open');byId('nav-toggle').setAttribute('aria-expanded',String(open));};
    byId('main-nav').onclick=e=>{if(e.target.closest('a')){byId('main-nav').classList.remove('open');byId('nav-toggle').setAttribute('aria-expanded','false');}};
    document.querySelectorAll('[data-logout]').forEach(button=>button.onclick=async()=>{
      button.disabled=true;
      try{await api('/auth/logout',{method:'POST'});state.user=null;localStorage.removeItem('bb_cart');location.replace('/');}
      catch(err){toast(err.message,true);button.disabled=false;}
    });
  }
  function renderFooter(){
    const u=state.user,role=u?.role;
    const accountLinks=role==='owner'?'<a href="/owner.html">Owner dashboard</a><a href="/profile.html">My profile</a>':role==='staff'?'<a href="/kitchen.html">Kitchen board</a><a href="/profile.html">My profile</a>':role==='customer'?'<a href="/orders.html">Track my orders</a><a href="/profile.html">My profile</a>':'<a href="/login.html">Sign in</a><a href="/staff-register.html">Join the kitchen team</a>';
    byId('site-footer').innerHTML=`<footer class="footer"><div class="container"><div class="footer-grid">
      <div><a class="brand" href="${roleHome(role)}"><img src="/assets/logo.svg" alt=""><span>Brew & Bite<small>CAFÉ & KITCHEN</small></span></a><p>Thoughtfully crafted cups, comforting bites and a warm spot for every kind of day.</p></div>
      <div><h4>Explore</h4><a href="/menu.html">Our menu</a><a href="/offers.html">Special offers</a><a href="/about.html">Our story</a><a href="/about.html#contact">Help & information</a></div>
      <div><h4>${u?'Your workspace':'Your account'}</h4>${accountLinks}</div>
      </div><div class="footer-bottom">© ${new Date().getFullYear()} Brew & Bite Café · College project demonstration · Test payments only.</div></div></footer>`;
  }
  async function requireRole(role){
    const user=await getMe();
    if(!user){location.replace('/login.html?next='+encodeURIComponent(location.pathname+location.search));return null;}
    if(role&&user.role!==role){
      setApp(heading('Access restricted','Not permitted','This page is restricted to '+role+' accounts.')+`<div class="container section"><p>Signed in as ${esc(roleName(user.role))}.</p><a class="btn" href="${roleHome(user.role)}">Go to your workspace</a></div>`);
      return null;
    }
    return user;
  }
  const safeDate=value=>{try{return new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'});}catch{return '';}};
  const status=s=>`<span class="badge ${esc(String(s).toLowerCase())}">${esc(s)}</span>`;
  // Authentication is checked even on public pages, so the header and role-aware home are correct.
  const ready=getMe();
  window.BB={state,esc,money,byId,app,setApp,heading,toast,csrf,api,getMe,basket,saveBasket,addItem,productCard,bindProducts,menuImageSrc,requireRole,safeDate,status,url,roleHome,roleName,allowedLoginDestination,ready};
  csrf().catch(err=>toast(err.message,true));
})();
