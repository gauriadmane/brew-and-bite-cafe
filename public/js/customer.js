(async function(){
 const B=window.BB,{api,esc,money,toast,setApp,heading,productCard,bindProducts,basket,saveBasket,byId,safeDate,status,menuImageSrc}=B;
 const page=document.body.dataset.page;
 await B.ready; // Load the real session before rendering public or protected pages.
 const err=error=>`<div class="container section"><div class="message error">${esc(error.message||error)}</div></div>`;
 const section=(title,copy='')=>heading('Brew & Bite Café',title,copy);
 const loading=(text='Loading…')=>`<div class="container loading">${esc(text)}</div>`;
 const getCartTotal=()=>basket().reduce((sum,x)=>sum+x.qty*x.pricePaise,0);
 const requireCustomer=async()=>B.requireRole('customer');
 const itemBody=order=>order.items.map(i=>`<p>${esc(i.name)} × ${i.quantity} · ${money(i.lineTotalPaise)}</p>`).join('');
 const stages=['Placed','Accepted','Preparing','Ready','Completed'];
 const steps=o=>o.orderStatus==='Cancelled'?'':`<div class="steps">${stages.map(s=>`<span class="step ${stages.indexOf(s)<=stages.indexOf(o.orderStatus)?'done':''}">${s}</span>`).join('')}</div>`;
 async function home(){
  const u=B.state.user;
  // Never show the public ordering homepage as the default workspace for staff or the owner.
  if(u&&(u.role==='owner'||u.role==='staff')){location.replace(B.roleHome(u.role));return;}
  const customer=u?.role==='customer';
  const first=customer?esc(u.name.trim().split(/\s+/)[0]):'';
  document.title=(customer?`Welcome back, ${u.name.trim().split(/\s+/)[0]}`:'Welcome')+' · Brew & Bite Café';
  setApp(`${customer?`<section class="welcome-band"><div class="container welcome-inner"><div><span class="eyebrow">YOUR CAFÉ ACCOUNT</span><strong>Good to see you, ${first}!</strong><span>You're signed in as a Customer. Ready for something delicious?</span></div><a class="btn secondary small" href="/orders.html">Track my orders →</a></div></section>`:''}
  <section class="hero"><div class="container hero-grid"><div class="hero-copy"><span class="eyebrow">Handcrafted happiness in every cup</span><h1>${customer?'Your next favourite <em>is waiting.</em>':'Your daily dose of <em>comfort</em> starts here.'}</h1><p>Rich coffee, freshly made bites and warm moments. Explore the menu, pick your table and let our kitchen do the rest.</p><div class="hero-buttons"><a class="btn" href="/menu.html">Explore the menu →</a><a class="btn secondary" href="/about.html">Discover our story</a>${customer?'<a class="btn ghost" href="/profile.html">My account</a>':''}</div></div><div class="hero-art"><div class="hero-halo"><img src="/assets/coffee.svg" alt="Illustrated Brew & Bite coffee cup"></div><div class="hero-stamp">Fresh<small>DAILY</small></div><div class="hero-tag">☕ Warm cups. Happy hearts.</div></div></div></section>
  <section class="feature-strip"><div class="container features"><div class="feature"><span class="feature-ico">☕</span><div><strong>Freshly prepared</strong><span>Made with care, every order</span></div></div><div class="feature"><span class="feature-ico">🥐</span><div><strong>Something for everyone</strong><span>Sweet, savoury and satisfying</span></div></div><div class="feature"><span class="feature-ico">🪑</span><div><strong>Order from your table</strong><span>Convenient dine-in checkout</span></div></div></div></section>
  <section class="section"><div class="container"><div class="section-title"><span class="eyebrow">Made to make your day</span><h2>Our café favourites</h2><p>A little peek at the menu you'll want to come back for.</p></div><div id="featured" class="menu-grid">${loading()}</div><div class="text-center mt-4"><a href="/menu.html" class="btn secondary">See the full menu →</a></div></div></section>
  <section class="section soft-section" id="how-it-works"><div class="container"><div class="section-title"><span class="eyebrow">Simple from start to sip</span><h2>How ordering works</h2><p>Everything you need, from a single menu to an easy collection at your table.</p></div><div class="info-grid"><article class="info-card"><span class="info-icon">01</span><h3>Choose your favourites</h3><p>Browse the menu, explore categories and add the items you'd love.</p></article><article class="info-card"><span class="info-icon">02</span><h3>Pick a table & pay</h3><p>Select an available dine-in table and choose how you'd like to pay.</p></article><article class="info-card"><span class="info-icon">03</span><h3>Enjoy your order</h3><p>Track the kitchen's progress and use your OTP when your order is ready.</p></article></div></div></section>
  <section class="section"><div class="container"><div class="promo"><div><span class="eyebrow">Get to know us</span><h2>More than coffee. A place to belong.</h2><p>Thoughtful cups, comforting food and genuine hospitality. Discover what Brew & Bite is all about.</p><a class="btn light mt-2" href="/about.html">Read our story →</a></div><div class="promo-art" aria-hidden="true">☕ 🥐</div></div></div></section>
  <section class="section-sm" id="offers"><div class="container"><div class="section-title"><span class="eyebrow">A sweeter deal</span><h2>Special offers</h2><p>Eligible discounts are checked against your order at checkout.</p></div><div id="home-offers" class="chips" style="justify-content:center"></div><div class="text-center mt-3"><a class="btn secondary" href="/offers.html">Explore offers →</a></div></div></section>
  <section class="section"><div class="container text-center"><span class="eyebrow">Make your day better</span><h2>Your next cup is one click away.</h2><p class="muted">Have a question about ordering? Learn how it works or ask the team at the café counter.</p><div class="hero-buttons center"><a class="btn" href="/menu.html">Order from the menu</a><a class="btn secondary" href="/about.html#contact">Help & information</a></div></div></section>`);
  try{
    const [r,o]=await Promise.all([api('/menu?limit=6&available=true'),api(B.state.user?.role==='customer'?'/offers/mine':'/offers')]);
    byId('featured').innerHTML=r.items.length?r.items.map(productCard).join(''):'<div class="empty">Menu items will appear here once the owner adds them.</div>';
    bindProducts(byId('featured'),r.items);
    byId('home-offers').innerHTML=o.offers.length?o.offers.map(x=>`<a class="chip offer-chip" href="/offers.html">${esc(x.code)} · ${x.type==='percent'?`${Number(x.value)}% off`:x.type==='fixed'?`${money(x.value)} off`:'Combo offer'} →</a>`).join(''):'<span class="muted">No active discounts right now. Check back soon.</span>';
  }catch(e){byId('featured').innerHTML=err(e);byId('home-offers').textContent='Offers could not be loaded.';}
 }
 function scrollToHash(){
   const hash=decodeURIComponent(location.hash.slice(1));
   if(hash){const target=byId(hash);if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
 }
 function about(){
   const role=B.state.user?.role||'guest';
   const focus={
     guest:{tag:'VISITING FOR THE FIRST TIME?',title:'Discover a simpler café experience',body:'Explore the live menu, create a customer account and choose how you would like to pay when you order at a table.',primary:'/menu.html',action:'Explore the menu',secondary:'/register.html',secondaryAction:'Create an account'},
     customer:{tag:'YOUR CAFÉ EXPERIENCE',title:'Everything about your next order',body:'Browse fresh menu choices, pick an available table, see the bill before checkout and track each preparation stage until secure collection.',primary:'/orders.html',action:'Track my orders',secondary:'/profile.html',secondaryAction:'My profile'},
     owner:{tag:'YOUR MANAGEMENT EXPERIENCE',title:'Run the café with confidence',body:'Your Owner Dashboard brings together customer orders, confirmed payments, menu prices, uploaded photos, tables, offers, staff approval and sales reports.',primary:'/owner.html',action:'Open my dashboard',secondary:'/profile.html',secondaryAction:'Manage my profile'},
     staff:{tag:'YOUR KITCHEN EXPERIENCE',title:'Prepare with clarity. Hand over securely.',body:'Review only accepted orders, follow preparation instructions, progress orders through Preparing and Ready, and verify the customer’s handover OTP.',primary:'/kitchen.html',action:'Open kitchen board',secondary:'/profile.html',secondaryAction:'My profile'}
   }[role];
   const stages=role==='owner'?[
      ['01','Review the café','Monitor new orders, payments and daily sales from your dashboard.'],
      ['02','Keep the menu current','Manage item pricing, availability, categories and product photos.'],
      ['03','Support the team','Approve kitchen access, manage tables and review reports.']
   ]:role==='staff'?[
      ['01','Check accepted orders','See items, quantity, table number and special instructions.'],
      ['02','Prepare and mark ready','Move through the permitted kitchen preparation statuses.'],
      ['03','Verify handover','Confirm payment and verify the time-limited collection OTP.']
   ]:[
      ['01','Explore the menu','See live products, photos, prices and availability.'],
      ['02','Choose a table and pay','Cash at counter or simulated Razorpay Test Mode checkout.'],
      ['03','Track and collect','Follow order progress and show the collection OTP when ready.']
   ];
   document.title='About Brew & Bite · '+B.roleName(role)+' Experience';
   setApp(heading('WELCOME TO OUR STORY','Made for the little moments','Discover how thoughtfully prepared café favourites and easy ordering work together.')+`
     <section class="section"><div class="container about-story"><div class="about-story-art"><img src="/assets/coffee.svg" alt="Illustration of a Brew & Bite coffee cup"><div class="about-story-tag">GOOD COFFEE. GOOD COMPANY.</div></div>
       <div><span class="eyebrow">THE BREW & BITE IDEA</span><h2>A warm welcome, from first sip to last bite.</h2>
         <p>We believe the best café moments happen when everything feels effortless — a comforting drink, something delicious, and time to enjoy good company.</p>
         <p>Brew & Bite brings a café-inspired menu and a connected ordering experience into one place. Customers discover food and drinks, the owner manages daily operations, and the kitchen sees what needs preparing.</p>
         <p class="small muted">Brew & Bite is a college project demonstration. Menu items and café operations shown here are sample data unless configured for an actual café.</p>
         <a class="btn secondary mt-2" href="/menu.html">View our menu →</a>
       </div></div></section>
     <section class="section-sm soft-section"><div class="container"><div class="about-focus"><div><span class="eyebrow">${focus.tag}</span><h2>${focus.title}</h2><p>${focus.body}</p><div class="flex wrap mt-3"><a class="btn" href="${focus.primary}">${focus.action} →</a><a class="btn secondary" href="${focus.secondary}">${focus.secondaryAction}</a></div></div><div class="about-focus-symbol" aria-hidden="true">${role==='owner'?'▤':role==='staff'?'♨':'☕'}</div></div></div></section>
     <section class="section"><div class="container"><div class="section-title"><span class="eyebrow">HOW IT WORKS</span><h2>${role==='owner'?'Your café, organized.':role==='staff'?'A better kitchen workflow.':'A little joy, made simple.'}</h2><p>Clear steps, transparent progress, and a smoother day for everyone.</p></div>
       <div class="info-grid">${stages.map(([number,title,text])=>`<article class="info-card"><span class="info-icon">${number}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></div></section>
     <section class="section-sm soft-section" id="contact"><div class="container help-panel"><div><span class="eyebrow">HELP & INFORMATION</span><h2>${role==='owner'?'Managing your café?':role==='staff'?'Need kitchen help?':'We are here to help.'}</h2>
       <p>${role==='owner'?'Review orders, edit the menu and photos, or update staff permissions directly from your dashboard.':role==='staff'?'Use your kitchen workspace to review orders. For staff permissions or access issues, contact the café owner.':'For menu questions, table assistance or order collection, ask the team at the café counter. You can check your order progress under My Orders.'}</p>
       <p class="small muted">No public address or contact phone number has been supplied, so this demonstration does not display invented contact details.</p></div>
       <div class="help-actions"><a class="btn" href="${focus.primary}">${focus.action}</a><a class="btn secondary" href="/menu.html">View menu</a></div></div></section>`);
   scrollToHash();
   window.addEventListener('hashchange',scrollToHash);
 }
 async function offersPage(){
   document.title='Special Offers · Brew & Bite Café';
   setApp(heading('Special offers','A little extra joy','All active offers are verified automatically against your cart during checkout.')+`<section class="section"><div class="container"><div id="offers-list" class="offer-grid">${loading('Checking today\'s offers…')}</div><div class="help-panel mt-4"><div><h3>How to redeem</h3><p>Choose your favourites, then enter the promo code at checkout. Minimum order conditions and expiry dates are checked by the server.</p></div><a class="btn" href="/menu.html">Explore the menu →</a></div></div></section>`);
   try{
     const r=await api(B.state.user?.role==='customer'?'/offers/mine':'/offers');
     byId('offers-list').innerHTML=r.offers.length?r.offers.map(o=>`<article class="offer-card"><span class="eyebrow">${o.audience==='selected'?'YOUR EXCLUSIVE OFFER':o.audience==='regular'?'REGULAR CUSTOMER REWARD':'LIMITED-TIME OFFER'}</span><div class="offer-code">${esc(o.code)}</div><h3>${o.type==='percent'?`${Number(o.value)}% off your order`:o.type==='fixed'?`${money(o.value)} off your order`:'Special combo offer'}</h3><p>${o.minimumPaise>0?`Valid on orders of ${money(o.minimumPaise)} or more.`:'No minimum order amount.'}</p><p class="small muted">Ends ${safeDate(o.expiresAt)}</p><button class="btn secondary small" data-copy-code="${esc(o.code)}" type="button">Copy offer code</button></article>`).join(''):'<div class="empty"><h3>No active offers right now</h3><p>Explore the menu for the latest café favourites.</p><a class="btn" href="/menu.html">Browse menu</a></div>';
     byId('offers-list').onclick=async e=>{const button=e.target.closest('[data-copy-code]');if(!button)return;
       try{await navigator.clipboard.writeText(button.dataset.copyCode);toast('Offer code copied.');}
       catch{toast(`Use offer code: ${button.dataset.copyCode}`);}
     };
   }catch(e){byId('offers-list').innerHTML=err(e);}
 }
 async function menu(){
   let categories=[],current='',q='',pageNo=1;
   setApp(section('Explore our menu','Comforting sips, delicious bites and freshly made favourites.')+(B.state.user&&B.state.user.role!=='customer'?'<div class="container mt-3"><div class="message">You are viewing the menu as a team member. Orders can only be placed from a customer account.</div></div>':'')+`<section class="section-sm"><div class="container"><form id="search-form" class="searchrow"><input id="menu-search" class="input" placeholder="Search coffee, pastries, sandwiches…" aria-label="Search menu"><button class="btn" type="submit">Search</button></form><div id="categories" class="chips mb-0"></div><div id="menu-results" class="menu-grid mt-3"></div><div id="pagination" class="flex between mt-3"></div></div></section>`);
   try{categories=(await api('/categories')).categories;}catch(e){toast(e.message,true);}
   function drawCats(){byId('categories').innerHTML=[{_id:'',name:'All favourites'},...categories].map(c=>`<button class="chip ${current===String(c._id)?'active':''}" data-category="${esc(c._id)}">${esc(c.name)}</button>`).join('');}
   async function load(){byId('menu-results').innerHTML=loading('Discovering your favourites…');
     try{const r=await api(`/menu?page=${pageNo}&limit=9&q=${encodeURIComponent(q)}&category=${encodeURIComponent(current)}`);
       byId('menu-results').innerHTML=r.items.length?r.items.map(productCard).join(''):'<div class="empty"><h3>No matching dishes</h3>Try a different search or category.</div>';
       byId('pagination').innerHTML=`<button class="btn secondary small" id="prev" ${pageNo===1?'disabled':''}>← Previous</button><span class="muted">Page ${pageNo} of ${r.pages||1}</span><button class="btn secondary small" id="next" ${pageNo>=r.pages?'disabled':''}>Next →</button>`;
       byId('prev').onclick=()=>{pageNo--;load();};byId('next').onclick=()=>{pageNo++;load();};
       byId('menu-results').onclick=e=>{const b=e.target.closest('[data-add]');if(b){const item=r.items.find(x=>String(x._id)===b.dataset.add);if(item)B.addItem(item);}};
     }catch(e){byId('menu-results').innerHTML=err(e);}
   }
   drawCats();byId('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;current=b.dataset.category;pageNo=1;drawCats();load();};
   byId('search-form').onsubmit=e=>{e.preventDefault();q=byId('menu-search').value.trim();pageNo=1;load();};await load();
 }
 function cart(){
  if(B.state.user&&B.state.user.role!=='customer'){location.replace(B.roleHome(B.state.user.role));return;}
  function render(){const items=basket();setApp(section('Your cart','A few favourites away from something delicious.')+`<section class="section"><div class="container"><div class="split"><div class="card"><h2>Your selections</h2>${items.length?items.map(x=>`<div class="cart-line"><img src="${esc(menuImageSrc(x))}" alt=""><div class="cart-line-info"><h3>${esc(x.name)}</h3><span class="muted">${money(x.pricePaise)} each</span></div><div class="cart-line-actions"><label for="q-${esc(x.id)}">Qty</label><input class="input qty" type="number" min="1" max="30" id="q-${esc(x.id)}" data-qty="${esc(x.id)}" value="${x.qty}"><button class="btn ghost small" data-remove="${esc(x.id)}">Remove</button></div></div>`).join(''):'<div class="empty"><h3>Your cart is empty</h3><p>Add your favourite coffee or snack to begin.</p><a class="btn" href="/menu.html">Browse the menu</a></div>'}</div>
  <aside class="card"><h3>Order summary</h3><div class="summary-list"><div class="sumrow"><span>Estimated subtotal</span><strong>${money(getCartTotal())}</strong></div><p class="small muted">Final prices, eligible discounts and applicable taxes are calculated securely at checkout.</p><a class="btn full ${items.length?'':'hidden'}" href="/checkout.html">Proceed to checkout →</a><a class="btn secondary full" href="/menu.html">Continue shopping</a></div></aside></div></div></section>`);
    B.app().onclick=e=>{const button=e.target.closest('[data-remove]');if(!button)return;saveBasket(basket().filter(x=>x.id!==button.dataset.remove));render();};
    B.app().onchange=e=>{const field=e.target.closest('[data-qty]');if(!field)return;const v=Number(field.value);if(!Number.isInteger(v)||v<1||v>30){toast('Quantity must be between 1 and 30.',true);render();return;}const list=basket();const item=list.find(x=>x.id===field.dataset.qty);if(item)item.qty=v;saveBasket(list);render();};
  }
  render();
 }
 function itemsRequest(){return basket().map(x=>({menuItem:x.id,quantity:x.qty}));}
 async function loadRazorpay(){if(window.Razorpay)return;await new Promise((resolve,reject)=>{
   const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(Error('Razorpay checkout failed to load.'));document.head.appendChild(s);
 });}
 // An order exists in MongoDB as soon as POST /orders succeeds, even if its gateway payment fails.
 // Always continue with that existing order rather than allowing a second order from an empty cart.
 function goToOrderHistory(payment){location.replace('/orders.html?payment='+encodeURIComponent(payment));}
 async function payOrder(order){
   let gatewayResponseReceived=false;
   try{
     const setup=await api(`/payments/${order._id}/create`,{method:'POST'});
     await loadRazorpay();
     const gateway=new Razorpay({key:setup.keyId,amount:setup.amount,currency:'INR',name:'Brew & Bite Café',description:`Order ${esc(order.orderNumber)}`,
       order_id:setup.providerOrderId,handler:async result=>{
         gatewayResponseReceived=true; // A successful callback may also close the payment popup.
         try{
           const verified=await api(`/payments/${order._id}/verify`,{method:'POST',body:result});
           goToOrderHistory(verified.confirmed&&!verified.requiresReview?'success':'review');
         }catch(e){
           // Do not call the payment failed: the gateway may have captured it already.
           console.warn('Payment verification needs review:',e);
           goToOrderHistory('review');
         }
       },modal:{ondismiss:()=>{
         if(!gatewayResponseReceived)goToOrderHistory('pending');
       }},
       prefill:{name:B.state.user?.name||'',email:B.state.user?.email||''},theme:{color:'#6f4e37'}});
     gateway.open();
   }catch(e){
     // The order was already saved and the cart was intentionally cleared. Offer a retry there.
     console.warn('Razorpay checkout could not start:',e);
     goToOrderHistory('retry');
   }
 }
 async function checkout(){if(!await requireCustomer())return;
   if(!basket().length){location.href='/cart.html';return;}
   setApp(section('Checkout','Double-check the details before we start preparing your order.')+`<section class="section-sm"><div class="container split"><div class="card"><h2>Order details</h2><form id="checkout-form"><div class="field"><label for="table">Your dine-in table</label><select id="table" required><option value="">Loading available tables…</option></select></div><div class="field"><label for="instructions">Special instructions (optional)</label><textarea id="instructions" maxlength="400" placeholder="For example: less sugar, no onions…"></textarea></div><div class="field"><label for="offer">Promo code (optional)</label><input id="offer" class="input" maxlength="40" placeholder="Enter a code"></div><div class="field"><label id="payment-title">Choose your payment method</label>
    <div class="payment-grid" role="group" aria-labelledby="payment-title">
      <label class="payment-choice"><input type="radio" name="payment-method" value="cash" checked><span class="payment-choice-body"><span class="payment-choice-icon" aria-hidden="true">₹</span><strong>Cash</strong><small>Pay at café counter</small></span></label>
      <label class="payment-choice"><input type="radio" name="payment-method" value="upi"><span class="payment-choice-body"><span class="payment-choice-icon" aria-hidden="true">↗</span><strong>UPI</strong><small>Razorpay Test Mode</small></span></label>
      <label class="payment-choice"><input type="radio" name="payment-method" value="card"><span class="payment-choice-body"><span class="payment-choice-icon" aria-hidden="true">▣</span><strong>Debit / Credit Card</strong><small>Razorpay Test Mode</small></span></label>
    </div><div id="payment-help" class="payment-help" aria-live="polite">Checking online payment availability…</div>
    </div><div id="quote-notice" class="message">Choose a table to calculate your final bill.</div><div class="flex wrap mt-3"><button id="quote" type="button" class="btn secondary">Recalculate bill</button><button id="place" class="btn" type="submit">Place order →</button></div></form></div><aside class="card"><h3>Your bill</h3><div id="bill" class="summary-list"><span class="muted">Awaiting table selection.</span></div><div class="line"></div><a href="/cart.html" class="btn secondary full">← Modify cart</a></aside></div></section>`);
   try{const r=await api('/tables');const free=r.tables.filter(t=>t.available);byId('table').innerHTML='<option value="">Select a table</option>'+free.map(t=>`<option value="${esc(t._id)}">Table ${esc(t.number)}</option>`).join('');
     if(!free.length)byId('quote-notice').textContent='All tables are occupied. Ask the owner to release a table.';
   }catch(e){toast(e.message,true);}
   // Keep the payment cards visible even if Razorpay keys are missing; explain why disabled.
   try{
     const cfg=await api('/payment-options');
     const available=Boolean(cfg.onlineAvailable);
     document.querySelectorAll('input[name="payment-method"]').forEach(input=>{
       if(input.value!=='cash')input.disabled=!available;
     });
     byId('payment-help').className='payment-help'+(available?' success':' warning');
     byId('payment-help').textContent=available?
       'Online payments are enabled in Razorpay Test Mode. No real money is charged. UPI/Card are preferences; the gateway may offer other methods. The actual captured method is recorded.':
       cfg.mode==='live'?'Live Razorpay credentials found. Use Test Mode keys in .env and restart the server to enable these options.':
       'UPI and Card are visible but unavailable: add your Razorpay TEST Key ID and Secret to .env, save, then restart npm run dev.';
   }catch(e){byId('payment-help').textContent='Could not check online payment availability. Please refresh or choose cash.';}
   let createdOrderId=null; // Prevent another submission after creating a pending online order.
   function body(){return{items:itemsRequest(),table:byId('table').value,paymentMethod:document.querySelector('input[name="payment-method"]:checked').value,instructions:byId('instructions').value,offerCode:byId('offer').value.trim().toUpperCase()};}
   async function preview(){
     if(!itemsRequest().length){
       // Without this guard, changing the payment method after closing Razorpay sends items: [].
       if(createdOrderId){goToOrderHistory('pending');return false;}
       byId('quote-notice').className='message';
       byId('quote-notice').textContent='Your cart is empty. Return to the menu or check My Orders for an existing order.';
       return false;
     }
     if(!body().table)return false;
     try{const r=await api('/orders/preview',{method:'POST',body:body()});
     byId('bill').innerHTML=`${r.items.map(i=>`<div class="sumrow"><span>${esc(i.name)} × ${i.quantity}</span><strong>${money(i.lineTotalPaise)}</strong></div>`).join('')}<div class="line"></div><div class="sumrow"><span>Subtotal</span><strong>${money(r.subtotalPaise)}</strong></div><div class="sumrow"><span>Discount</span><strong>− ${money(r.discountPaise)}</strong></div><div class="sumrow"><span>Tax (${r.taxBps/100}%)</span><strong>${money(r.taxPaise)}</strong></div><div class="sumrow total"><span>Total</span><strong>${money(r.totalPaise)}</strong></div>`;
     byId('quote-notice').className='message success';byId('quote-notice').textContent='Bill verified with current café prices.';return true;
   }catch(e){byId('quote-notice').className='message error';byId('quote-notice').textContent=e.message;return false;}}
   byId('quote').onclick=preview;byId('table').onchange=preview;byId('offer').onchange=preview;document.querySelectorAll('input[name="payment-method"]').forEach(radio=>radio.onchange=preview);
   byId('checkout-form').onsubmit=async e=>{
     e.preventDefault();
     if(createdOrderId){goToOrderHistory('pending');return;}
     const button=byId('place');button.disabled=true;
     try{
       if(!await preview())return;
       const order=(await api('/orders',{method:'POST',body:body()})).order;
       createdOrderId=order._id;
       // The order now exists and holds its table; preserve it and retry payments from My Orders.
       saveBasket([]);
       if(order.paymentMethod==='cash')location.replace('/orders.html');
       else await payOrder(order);
     }catch(e){toast(e.message,true);}finally{if(!createdOrderId)button.disabled=false;}
   };
 }
 async function orders(){if(!await requireCustomer())return;
   const paymentOutcome=new URLSearchParams(location.search).get('payment');
   const paymentNotices={
     pending:'The payment window was closed. Your online order is saved. Check the payment status below. If it remains Pending or Failed, choose Pay now to retry; do not place a duplicate order.',
     retry:'Razorpay checkout could not open. Your order is already saved. Check its status below and use Pay now to retry.',
     review:'Payment verification was not completed. If Razorpay displayed success, refresh your orders or contact the owner before attempting another payment.',
     success:'Online payment verified successfully. Your order is saved and can be accepted by the café owner.'
   };
   const notice=Object.prototype.hasOwnProperty.call(paymentNotices,paymentOutcome)?
     `<div class="message ${paymentOutcome==='success'?'success':''}" role="status">${esc(paymentNotices[paymentOutcome])}</div>`:'';
   setApp(section('Your orders','Follow each step from the kitchen to your table.')+`<section class="section-sm"><div class="container">${notice}<div class="tool-row"><span class="muted">Status updates refresh automatically while this page is open.</span><button id="refresh" class="btn secondary small">Refresh orders</button></div><div id="orders-list">${loading()}</div></div></section>`);
   async function load(){try{const r=await api('/orders');byId('orders-list').innerHTML=r.orders.length?r.orders.map(o=>`<article class="order-card" data-order="${esc(o._id)}"><div class="flex between wrap"><div><span class="eyebrow">${esc(o.orderNumber)}</span><h3>Table ${esc(o.tableNumber)}</h3><div class="small muted">${safeDate(o.createdAt)}</div></div><div class="order-meta">${status(o.orderStatus)} ${status(o.paymentStatus)} <span class="payment-badge">${esc((o.gatewayMethod||o.paymentMethod).toUpperCase())}</span> <strong>${money(o.totalPaise)}</strong></div></div>${steps(o)}<div class="order-items">${itemBody(o)}</div><div class="flex wrap"><a class="btn secondary small" href="/receipt.html?id=${esc(o._id)}">View receipt</a>
     ${o.orderStatus==='Placed'&&['Pending','Failed'].includes(o.paymentStatus)?`<button class="btn ghost small" data-cancel="${esc(o._id)}">Cancel</button>`:''}
     ${o.orderStatus==='Ready'?`<button class="btn small" data-otp="${esc(o._id)}">Get collection OTP</button>`:''}
     ${o.paymentMethod!=='cash'&&o.orderStatus==='Placed'&&['Pending','Failed'].includes(o.paymentStatus)?`<button class="btn small" data-pay="${esc(o._id)}">Pay now</button>`:''}
     </div><div class="otp-slot"></div>${o.requiresReview?'<p class="message error">Payment review required. Please contact the owner.</p>':''}</article>`).join(''):'<div class="empty"><h3>No orders yet</h3><p>Your delicious journey begins with the menu.</p><a class="btn" href="/menu.html">Explore menu</a></div>';
     byId('orders-list').onclick=async e=>{const b=e.target.closest('[data-cancel],[data-otp],[data-pay]');if(!b)return;
       if(b.dataset.cancel){if(!confirm('Cancel this unpaid order?'))return;try{await api(`/orders/${b.dataset.cancel}/cancel`,{method:'POST'});toast('Order cancelled.');load();}catch(e){toast(e.message,true);}}
       if(b.dataset.otp){try{const r=await api(`/orders/${b.dataset.otp}/otp`,{method:'POST'});
         b.closest('.order-card').querySelector('.otp-slot').innerHTML=`<div class="mt-2"><p class="small muted">Show this code to authorized staff within five minutes.</p><div class="otp-display">${esc(r.otp)}</div></div>`;
       }catch(e){toast(e.message,true);}}
       if(b.dataset.pay){const o=r.orders.find(x=>String(x._id)===b.dataset.pay);if(o)await payOrder(o);}
     };
   }catch(e){byId('orders-list').innerHTML=err(e);}}
   byId('refresh').onclick=load;await load();setInterval(()=>{if(document.visibilityState==='visible'&&!document.querySelector('.otp-display'))load();},20000);
 }
 async function receipt(){if(!await requireCustomer())return;
   const id=new URLSearchParams(location.search).get('id');
   try{const {order:o}=await api('/orders/'+encodeURIComponent(id));
     setApp(section('Your receipt',`Order ${o.orderNumber}`)+`<section class="section-sm"><div class="container"><div class="card" style="max-width:730px;margin:auto"><div class="flex between wrap"><h2>Brew & Bite Café</h2><button class="btn no-print" id="print">Print / Save PDF</button></div><p class="muted">${esc(o.orderNumber)} · ${safeDate(o.createdAt)} · Table ${esc(o.tableNumber)}</p><div class="flex wrap">${status(o.orderStatus)} ${status(o.paymentStatus)}</div><div class="line"></div>${o.items.map(i=>`<div class="sumrow"><span>${esc(i.name)} × ${i.quantity} (${money(i.unitPricePaise)} each)</span><strong>${money(i.lineTotalPaise)}</strong></div>`).join('')}<div class="line"></div><div class="summary-list"><div class="sumrow"><span>Subtotal</span><strong>${money(o.subtotalPaise)}</strong></div><div class="sumrow"><span>Discount</span><strong>− ${money(o.discountPaise)}</strong></div><div class="sumrow"><span>Tax (${o.taxBps/100}%)</span><strong>${money(o.taxPaise)}</strong></div><div class="sumrow total"><span>Total</span><strong>${money(o.totalPaise)}</strong></div></div><p class="small muted mt-3">Payment: ${esc(o.paymentMethod.toUpperCase())}. Status: ${esc(o.paymentStatus)}.</p><p class="small muted">This is an academic demo. Online payments use Razorpay Test Mode.</p></div></div></section>`);
     byId('print').onclick=()=>window.print();
   }catch(e){setApp(err(e));}
 }
 async function authenticate(which){
   const staff=which==='staff-register',register=which==='register'||staff;
   setApp(`<div class="container"><div class="form-card"><span class="eyebrow">${staff?'Join our café team':register?'Welcome to Brew & Bite':'Welcome back'}</span><h2>${staff?'Kitchen staff request':register?'Create your account':'Sign in'}</h2><p>${staff?'The owner must approve your account before you can sign in.':register?'A fresh start and fresh coffee await.':'One secure login takes you to the workspace for your account.'}</p>${!register?'<div class="login-role-guide"><span>Customer · My café</span><span>Owner · Dashboard</span><span>Staff · Kitchen</span></div>':''}
   <form id="auth-form">${register?'<div class="field"><label for="name">Full name</label><input id="name" class="input" required minlength="2" maxlength="80" autocomplete="name"></div>':''}<div class="field"><label for="email">Email</label><input id="email" class="input" type="email" required autocomplete="email"></div><div class="field"><label for="password">Password</label><input id="password" class="input" type="password" minlength="${register?8:1}" required autocomplete="${register?'new-password':'current-password'}"></div><button class="btn full" type="submit">${staff?'Submit staff request':register?'Create account':'Sign in →'}</button></form>
   <div class="line"></div><p class="small">${register?`Already have an account? <a href="/login.html"><strong>Sign in</strong></a>`:`New here? <a href="/register.html"><strong>Create account</strong></a>`}</p>${!staff?'<p class="small muted"><a href="/staff-register.html">Work in our kitchen? Request staff access</a></p>':''}</div></div>`);
   byId('auth-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;
     try{const data={email:byId('email').value.trim(),password:byId('password').value};if(register)data.name=byId('name').value.trim();
       const r=await api(staff?'/auth/staff/request':register?'/auth/register':'/auth/login',{method:'POST',body:data});
       if(staff){toast(r.message);location.href='/login.html';return;}
       await B.getMe();
       if(r.user.role!=='customer')saveBasket([]);
       const next=new URLSearchParams(location.search).get('next');
       location.replace(B.allowedLoginDestination(next,r.user.role));
     }catch(e){toast(e.message,true);}finally{b.disabled=false;}
   };
 }
 async function profile(){
   const u=await B.requireRole();if(!u)return;
   const role=B.roleName(u.role);
   const workspace=B.roleHome(u.role);
   const workspaceLabel=u.role==='owner'?'Open owner dashboard':u.role==='staff'?'Open kitchen board':'Explore the menu';
   const currentPage=u.role==='customer'?'/orders.html':workspace;
   const currentLabel=u.role==='customer'?'My orders':workspaceLabel;
   document.title=`My Profile · ${role} · Brew & Bite Café`;
   setApp(heading('My account',`Welcome, ${u.name.split(/\s+/)[0]}`,'Your account details and a quick way back to your workspace.')+`<section class="section-sm"><div class="container profile-grid"><aside class="card profile-identity"><span class="profile-avatar">${esc(u.name[0].toUpperCase())}</span><span class="eyebrow">SIGNED IN AS</span><h2>${esc(u.name)}</h2><span class="role-badge ${esc(u.role)}">${esc(role)}</span><p class="muted">${esc(u.email)}</p>${u.role==='staff'?`<p class="small muted">Staff status: ${esc(u.approval||'approved')}</p>`:''}<div class="line"></div><h3>Your workspace</h3><p class="small muted">${u.role==='owner'?'Manage café orders, menus, staff and reports.':u.role==='staff'?'Prepare accepted orders and verify customer handovers.':'Browse the menu, check your orders and manage your details.'}</p><a class="btn full" href="${currentPage}">${currentLabel} →</a>${u.role==='customer'?'<a class="btn secondary full mt-2" href="/menu.html">Browse menu</a>':''}</aside>
   <div class="card profile-form-card"><span class="eyebrow">PROFILE SETTINGS</span><h2>Personal information</h2><p class="muted">Keep your display name and contact number up to date.</p><form id="profile-form"><div class="field"><label for="name">Full name</label><input id="name" class="input" value="${esc(u.name)}" minlength="2" maxlength="80" autocomplete="name" required></div><div class="field"><label for="email-readonly">Email address</label><input id="email-readonly" class="input" type="email" value="${esc(u.email)}" readonly aria-describedby="email-hint"><p id="email-hint" class="hint">Email is used to sign in and cannot be edited here.</p></div><div class="field"><label for="phone">Phone number (optional)</label><input id="phone" class="input" value="${esc(u.phone||'')}" placeholder="+91 98765 43210" autocomplete="tel"></div><button class="btn" type="submit">Save profile changes</button></form><div id="profile-feedback" class="mt-3" role="status" aria-live="polite"></div></div></div></section>`);
   byId('profile-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;
     try{await api('/auth/me',{method:'PATCH',body:{name:byId('name').value.trim(),phone:byId('phone').value.trim()}});await B.getMe();byId('profile-feedback').innerHTML='<div class="message success">Your profile was saved successfully.</div>';toast('Profile saved.');}
     catch(e){byId('profile-feedback').innerHTML=`<div class="message error">${esc(e.message)}</div>`;toast(e.message,true);}finally{button.disabled=false;}
   };
 }
 try{switch(page){case'index':await home();break;case'about':about();break;case'offers':await offersPage();break;case'menu':await menu();break;case'cart':cart();break;case'checkout':await checkout();break;case'orders':await orders();break;case'receipt':await receipt();break;case'login':case'register':case'staff-register':await authenticate(page);break;case'profile':await profile();break;default:setApp(section('Page not found','Please return to the homepage.')+'<div class="container section"><a class="btn" href="/">Back to home</a></div>');}}
 catch(e){setApp(err(e));}
})();
