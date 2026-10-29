(async function(){
 const B=window.BB,{api,esc,money,toast,setApp,heading,byId,safeDate,status}=B;
 await B.ready;
 const owner=await B.requireRole('owner');
 if(!owner)return;
 const sections=[['overview','Overview'],['orders','Orders'],['menu','Menu items'],['categories','Categories'],['tables','Tables'],['offers','Special offers'],['customers','Customers & loyalty'],['staff','Staff requests'],['reports','Reports']];
 let current='overview';
 setApp(heading('OWNER / ADMIN WORKSPACE',`Welcome back, ${owner.name.split(/\s+/)[0]}`,'Your private café management space for orders, team and sales.')+`<div class="container dashboard"><aside class="sidebar"><h3>Management</h3>${sections.map(([key,title])=>`<button data-section="${key}" class="${key===current?'active':''}">${title}</button>`).join('')}</aside><div class="dashboard-main"><div class="dashboard-top"><div><span class="eyebrow">CAFÉ OPERATIONS</span><h2 id="panel-title">Overview</h2></div><div class="flex wrap"><a class="btn secondary small" href="/profile.html">My profile</a><a class="btn secondary small" href="/kitchen.html">Kitchen board</a><button class="btn secondary small" id="reload">↻ Refresh</button></div></div><div id="panel"><div class="loading">Loading dashboard…</div></div></div></div>`);
 const panel=()=>byId('panel');
 const safe=promise=>promise.catch(e=>{panel().innerHTML=`<div class="message error">${esc(e.message)}</div>`;});
 const rows=(heading,body)=>`<div class="table-wrap"><table><thead><tr>${heading.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${heading.length}">No records yet.</td></tr>`}</tbody></table></div>`;
 const dateValue=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
 const notify=async action=>{try{await action();toast('Changes saved successfully.');await show();}catch(e){toast(e.message,true);}};
 function selectSection(name){current=name;document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===name));byId('panel-title').textContent=sections.find(s=>s[0]===name)[1];safe(show());}
 document.querySelector('.sidebar').onclick=e=>{const b=e.target.closest('[data-section]');if(b)selectSection(b.dataset.section);};
 byId('reload').onclick=()=>safe(show());
 async function overview(){const [s,orders]=await Promise.all([api('/owner/summary'),api('/owner/orders?page=1')]);
  panel().innerHTML=`<div class="stat-grid"><div class="stat"><small>Today's paid sales</small><strong>${money(s.todayRevenuePaise)}</strong></div><div class="stat"><small>Orders today</small><strong>${s.todayOrders}</strong></div><div class="stat"><small>Awaiting acceptance</small><strong>${s.pendingOrders}</strong></div><div class="stat"><small>All-time orders</small><strong>${s.totalOrders}</strong></div></div><div class="workspace-tips"><span>● Owner account</span><span>Manage menu and tables</span><span>Approve kitchen staff</span><span>Track confirmed sales</span></div><div class="panel mt-4"><div class="tool-row"><h3>Recent activity</h3><button class="btn secondary small" id="view-orders">View all orders</button></div>${rows(['Order','Customer','Status','Payment','Total'],orders.orders.slice(0,7).map(o=>`<tr><td>${esc(o.orderNumber)}<div class="small muted">${safeDate(o.createdAt)}</div></td><td>${esc(o.customer?.name||'Customer')}</td><td>${status(o.orderStatus)}</td><td><span class="payment-badge">${esc((o.gatewayMethod||o.paymentMethod).toUpperCase())}</span> ${status(o.paymentStatus)}</td><td>${money(o.totalPaise)}</td></tr>`).join(''))}</div>`;
  byId('view-orders').onclick=()=>selectSection('orders');
 }
 async function orders(){const r=await api('/owner/orders');
  panel().innerHTML=`<div class="tool-row"><p class="muted">Online orders require confirmed payment before acceptance. Paid cancellations require a separate refund process.</p></div><div class="stack">${r.orders.length?r.orders.map(o=>`<article class="order-card"><div class="flex between wrap"><div><span class="eyebrow">${esc(o.orderNumber)}</span><h3>${esc(o.customer?.name||'Customer')} · Table ${esc(o.tableNumber)}</h3><div class="small muted">${safeDate(o.createdAt)} · ${esc(o.customer?.email||'')}</div></div><div class="order-meta">${status(o.orderStatus)} ${status(o.paymentStatus)} <span class="payment-badge">${esc((o.gatewayMethod||o.paymentMethod).toUpperCase())}</span> <strong>${money(o.totalPaise)}</strong></div></div><div class="order-items">${o.items.map(i=>`<p>${esc(i.name)} × ${i.quantity}</p>`).join('')}${o.instructions?`<div class="message mt-2">Instructions: ${esc(o.instructions)}</div>`:''}</div><div class="flex wrap">
   ${o.orderStatus==='Placed'&&(o.paymentMethod==='cash'||o.paymentStatus==='Confirmed')?`<button class="btn small" data-accept="${esc(o._id)}">Accept order</button>`:''}
   ${o.paymentMethod==='cash'&&o.paymentStatus==='Pending'&&o.orderStatus!=='Cancelled'?`<button class="btn small secondary" data-cash="${esc(o._id)}">Confirm cash collected</button>`:''}
   ${['Placed','Accepted'].includes(o.orderStatus)&&['Pending','Failed'].includes(o.paymentStatus)?`<button class="btn small ghost" data-cancel="${esc(o._id)}">Cancel</button>`:''}
   ${o.requiresReview?'<span class="message error">Payment requires review. Do not refund automatically.</span>':''}</div></article>`).join(''):'<div class="empty">There are no orders yet.</div>'}</div>`;
  panel().onclick=e=>{const b=e.target.closest('[data-accept],[data-cancel],[data-cash]');if(!b)return;
    if(b.dataset.accept)notify(()=>api(`/owner/orders/${b.dataset.accept}/status`,{method:'PATCH',body:{status:'Accepted'}}));
    if(b.dataset.cancel&&confirm('Cancel this unpaid order?'))notify(()=>api(`/owner/orders/${b.dataset.cancel}/status`,{method:'PATCH',body:{status:'Cancelled'}}));
    if(b.dataset.cash&&confirm('Confirm that cash was physically received?'))notify(()=>api(`/owner/orders/${b.dataset.cash}/confirm-cash`,{method:'POST'}));
  };
 }
 async function categories(){const r=await api('/owner/categories');
  panel().innerHTML=`<div class="panel"><h3>Add menu category</h3><form id="cat-form" class="flex wrap"><div class="grow"><label for="cat-name">Category name</label><input class="input" id="cat-name" minlength="2" maxlength="80" required placeholder="E.g. Hot Beverages"></div><button class="btn" type="submit">Add category</button></form></div><div class="panel mt-3"><h3>Existing categories</h3>${rows(['Category','Status','Actions'],r.categories.map(c=>`<tr><td>${esc(c.name)}</td><td>${status(c.active?'Active':'Inactive')}</td><td><button class="btn secondary tiny" data-edit="${c._id}">Rename</button><button class="btn ghost tiny" data-toggle="${c._id}">${c.active?'Deactivate':'Activate'}</button></td></tr>`).join(''))}</div>`;
  byId('cat-form').onsubmit=e=>{e.preventDefault();notify(()=>api('/owner/categories',{method:'POST',body:{name:byId('cat-name').value}}));};
  panel().onclick=e=>{const b=e.target.closest('[data-edit],[data-toggle]');if(!b)return;
    const c=r.categories.find(x=>String(x._id)===(b.dataset.edit||b.dataset.toggle));if(!c)return;
    if(b.dataset.toggle)notify(()=>api(`/owner/categories/${c._id}`,{method:'PATCH',body:{active:!c.active}}));
    else{const name=prompt('New category name:',c.name);if(name&&name.trim())notify(()=>api(`/owner/categories/${c._id}`,{method:'PATCH',body:{name:name.trim()}}));}
  };
 }
 async function compressMenuPhoto(file){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP image.');
   if(file.size>8*1024*1024)throw Error('Choose a photo smaller than 8 MB.');
   const image=await createImageBitmap(file);
   try{
     if(image.width*image.height>22000000)throw Error('Image resolution is too large. Choose a smaller photograph.');
     for(const maxEdge of [1100,850,650]){
       const scale=Math.min(1,maxEdge/Math.max(image.width,image.height));
       const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
       const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
       for(const quality of [.84,.7,.55]){
         const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
         if(blob&&blob.size<=340*1024)return blob;
       }
     }
     throw Error('The photo is still too large after compression. Choose a simpler or smaller image.');
   }finally{image.close?.();}
 }
 async function menu(){
   const [r,c]=await Promise.all([api('/owner/menu'),api('/owner/categories')]);
   const categories=c.categories.filter(x=>x.active);
   const imageKeys=['coffee','tea','pastry','sandwich','dessert','juice'];
   const options=categories.map(x=>`<option value="${esc(x._id)}">${esc(x.name)}</option>`).join('');
   const imageOptions=imageKeys.map(k=>`<option value="${k}">${k.charAt(0).toUpperCase()+k.slice(1)}</option>`).join('');
   panel().innerHTML=`
     <div class="panel"><div class="tool-row"><div><span class="eyebrow">MENU MANAGEMENT</span><h3 id="menu-form-title">Add menu item</h3></div><button class="btn secondary small hidden" type="button" id="menu-reset">Cancel editing</button></div>
       <p class="muted small">Create an item or choose Edit below. You can upload your own product photo, replace it any time, or use a built-in illustration.</p>
       <form id="menu-form"><input id="menu-id" type="hidden">
         <div class="form-row"><div class="field"><label for="menu-name">Item name</label><input class="input" id="menu-name" minlength="2" maxlength="80" required></div><div class="field"><label for="menu-category">Category</label><select id="menu-category" required>${options}</select></div></div>
         <div class="field"><label for="menu-description">Description</label><textarea id="menu-description" maxlength="300"></textarea></div>
         <div class="form-row"><div class="field"><label for="menu-price">Price in ₹</label><input class="input" id="menu-price" type="number" min="1" max="100000" step="0.01" required></div><div class="field"><label for="menu-image">Default illustration</label><select id="menu-image">${imageOptions}</select></div></div>
         <div class="menu-photo-editor"><div class="menu-photo-preview"><img id="menu-image-preview" src="/assets/coffee.svg" alt="Selected menu item preview"></div>
           <div class="menu-photo-controls"><label for="menu-file">Upload your own product photo</label><input class="input" id="menu-file" type="file" accept="image/jpeg,image/png,image/webp"><p class="hint">JPG, PNG or WebP, up to 8 MB before compression. Automatically resized and saved to MongoDB as a JPEG under 350 KB. No extra photo hosting account required.</p>
           <p id="menu-photo-feedback" class="small muted" role="status" aria-live="polite">You can add a photo now or after creating the product.</p>
           <button type="button" id="menu-remove-photo" class="btn secondary small hidden">Remove uploaded photo</button></div></div>
         <div class="checkrow mt-3"><input id="menu-available" type="checkbox" checked><label for="menu-available">Available for ordering</label></div>
         <button class="btn mt-3" id="menu-save" type="submit">Save menu item</button>
       </form></div>
     <div class="panel mt-3"><h3>All menu items</h3><p class="muted small">Click Edit to change the price, description, availability, illustration or uploaded photo.</p>
     ${rows(['Product','Category','Price','Visibility','Actions'],r.items.map(i=>`<tr><td><div class="product-table-cell"><img class="product-thumb" src="${esc(B.menuImageSrc(i))}" alt=""><strong>${esc(i.name)}</strong></div></td><td>${esc(i.category?.name||'—')}</td><td>${money(i.pricePaise)}</td><td>${status(i.active?(i.available?'Available':'Unavailable'):'Inactive')}</td><td><button class="btn secondary tiny" type="button" data-edit="${esc(i._id)}">Edit</button><button class="btn ghost tiny" type="button" data-toggle="${esc(i._id)}" ${i.active?'':'disabled'}>${i.available?'Pause':'Resume'}</button><button class="btn ghost tiny" type="button" data-remove="${esc(i._id)}" ${i.active?'':'disabled'}>Deactivate</button></td></tr>`).join(''))}</div>`;
   let pendingBlob=null;
   let editItem=null;
   const preview=byId('menu-image-preview');
   const feedback=byId('menu-photo-feedback');
   const removeButton=byId('menu-remove-photo');
   function updatePreview(){if(pendingBlob)return;preview.src=editItem?B.menuImageSrc(editItem):`/assets/${byId('menu-image').value}.svg`;}
   function reset(){
     byId('menu-form').reset();byId('menu-id').value='';byId('menu-form-title').textContent='Add menu item';
     byId('menu-reset').classList.add('hidden');removeButton.classList.add('hidden');
     feedback.textContent='You can add a photo now or after creating the product.';
     pendingBlob=null;editItem=null;updatePreview();
   }
   byId('menu-reset').onclick=reset;
   byId('menu-image').onchange=()=>{if(!editItem||!editItem.imageVersion)updatePreview();};
   byId('menu-file').onchange=async()=>{
     const file=byId('menu-file').files?.[0];if(!file){pendingBlob=null;updatePreview();return;}
     const save=byId('menu-save');save.disabled=true;pendingBlob=null;feedback.textContent='Optimizing photo…';
     try{
       const result=await compressMenuPhoto(file);
       const reader=new FileReader();
       const dataUrl=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Cannot preview photo.'));reader.readAsDataURL(result);});
       pendingBlob=result;preview.src=dataUrl;
       feedback.textContent=`Ready to upload · ${Math.round(result.size/1024)} KB. Click Save menu item to store it.`;
     }catch(e){byId('menu-file').value='';feedback.textContent=e.message;toast(e.message,true);updatePreview();}
     finally{save.disabled=false;}
   };
   byId('menu-form').onsubmit=async e=>{
     e.preventDefault();const id=byId('menu-id').value;const button=byId('menu-save');button.disabled=true;
     const data={name:byId('menu-name').value.trim(),category:byId('menu-category').value,description:byId('menu-description').value.trim(),pricePaise:Math.round(Number(byId('menu-price').value)*100),imageKey:byId('menu-image').value,available:byId('menu-available').checked,active:true};
     let itemSaved=false;
     try{
       const saved=await api(id?`/owner/menu/${id}`:'/owner/menu',{method:id?'PATCH':'POST',body:data});itemSaved=true;
       const itemId=id||saved.item?._id;
       if(pendingBlob){feedback.textContent='Uploading photo to MongoDB…';await api(`/owner/menu/${itemId}/image`,{method:'POST',body:pendingBlob,headers:{'Content-Type':'image/jpeg'}});}
       toast(pendingBlob?'Product and photo saved successfully.':'Menu item saved successfully.');await show();
     }catch(error){
       toast(itemSaved?`Product details saved, but the photo upload failed: ${error.message}`:error.message,true);
       feedback.textContent=error.message;
     }finally{button.disabled=false;}
   };
   removeButton.onclick=async()=>{
     if(!editItem?.imageVersion||!confirm(`Remove the custom photo for ${editItem.name}? The default illustration will reappear.`))return;
     removeButton.disabled=true;
     try{await api(`/owner/menu/${editItem._id}/image`,{method:'DELETE'});toast('Custom product photo removed.');await show();}
     catch(e){toast(e.message,true);removeButton.disabled=false;}
   };
   panel().onclick=e=>{
     const b=e.target.closest('[data-edit],[data-toggle],[data-remove]');if(!b)return;
     const id=b.dataset.edit||b.dataset.toggle||b.dataset.remove;
     const item=r.items.find(x=>String(x._id)===id);if(!item)return;
     if(b.dataset.edit){
       reset();editItem=item;byId('menu-id').value=item._id;byId('menu-name').value=item.name;
       byId('menu-category').value=item.category?._id||'';byId('menu-description').value=item.description;
       byId('menu-price').value=(item.pricePaise/100).toFixed(2);byId('menu-image').value=item.imageKey;
       byId('menu-available').checked=item.available;byId('menu-form-title').textContent='Edit menu item';
       removeButton.classList.toggle('hidden',!(item.imageVersion>0));
       byId('menu-reset').classList.remove('hidden');
       feedback.textContent=item.imageVersion?'This product has a custom photo. Choose a new file to replace it, or remove it below.':'Using the default illustration. You can choose a custom photo.';
       updatePreview();byId('menu-form').scrollIntoView({behavior:'smooth',block:'start'});byId('menu-name').focus({preventScroll:true});
     }
     if(b.dataset.toggle)notify(()=>api(`/owner/menu/${id}`,{method:'PATCH',body:{available:!item.available}}));
     if(b.dataset.remove&&confirm('Deactivate this menu item? Existing orders remain unchanged.'))notify(()=>api(`/owner/menu/${id}`,{method:'DELETE'}));
   };
 }
 async function tables(){const r=await api('/owner/tables');
  panel().innerHTML=`<div class="panel"><h3>Add dine-in table</h3><form id="table-form" class="flex wrap"><div class="grow"><label for="new-table">Table number</label><input id="new-table" class="input" maxlength="12" pattern="[a-zA-Z0-9-]+" placeholder="E.g. T1" required></div><button class="btn">Add table</button></form></div><div class="panel mt-3"><h3>Table management</h3>${rows(['Table','Status','Occupancy','Actions'],r.tables.map(t=>`<tr><td><strong>${esc(t.number)}</strong></td><td>${status(t.active?'Active':'Inactive')}</td><td>${t.occupiedBy?'<span class="badge pending">Occupied</span>':'<span class="badge paid">Available</span>'}</td><td><button class="btn tiny secondary" data-rename="${t._id}">Rename</button><button class="btn tiny ghost" data-toggle="${t._id}">${t.active?'Disable':'Enable'}</button></td></tr>`).join(''))}</div>`;
  byId('table-form').onsubmit=e=>{e.preventDefault();notify(()=>api('/owner/tables',{method:'POST',body:{number:byId('new-table').value.trim(),active:true}}));};
  panel().onclick=e=>{const b=e.target.closest('[data-rename],[data-toggle]');if(!b)return;
    const t=r.tables.find(x=>String(x._id)===(b.dataset.rename||b.dataset.toggle));if(!t)return;
    if(b.dataset.rename){const val=prompt('Table number:',t.number);if(val)notify(()=>api(`/owner/tables/${t._id}`,{method:'PATCH',body:{number:val.trim()}}));}
    else notify(()=>api(`/owner/tables/${t._id}`,{method:'PATCH',body:{active:!t.active}}));
  };
 }
 async function offers(){const [r,m]=await Promise.all([api('/owner/offers'),api('/owner/menu')]);const menu=m.items.filter(i=>i.active);
  const options=menu.map(i=>`<option value="${i._id}">${esc(i.name)}</option>`).join('');
  panel().innerHTML=`<div class="panel"><div class="tool-row"><h3 id="offer-title">Create offer</h3><button class="btn ghost small hidden" id="offer-reset">Cancel editing</button></div><form id="offer-form"><input id="offer-id" type="hidden"><div class="form-row"><div class="field"><label for="offer-code">Promo code</label><input id="offer-code" class="input" minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" required placeholder="E.g. WELCOME10"></div><div class="field"><label for="offer-type">Discount type</label><select id="offer-type"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option><option value="combo">Combo package</option></select></div></div><div class="form-row"><div class="field"><label for="offer-value">Value (% or ₹)</label><input id="offer-value" class="input" type="number" min="0" step="0.01" value="10" required></div><div class="field"><label for="offer-min">Minimum order (₹)</label><input id="offer-min" class="input" type="number" min="0" step="0.01" value="0" required></div></div><div class="form-row"><div class="field"><label for="offer-expiry">Expiry date</label><input id="offer-expiry" class="input" type="date" value="${dateValue(new Date(Date.now()+30*86400000))}" required></div><div class="field"><label for="combo-price">Combo total price (₹)</label><input id="combo-price" class="input" type="number" min="0" step="0.01" value="0"></div></div><div class="form-row"><div class="field"><label for="combo1">Combo item 1</label><select id="combo1"><option value="">None</option>${options}</select><input class="input mt-2" id="combo1qty" type="number" value="1" min="1" max="30" aria-label="Quantity for combo item 1"></div><div class="field"><label for="combo2">Combo item 2 (optional)</label><select id="combo2"><option value="">None</option>${options}</select><input class="input mt-2" id="combo2qty" type="number" value="1" min="1" max="30" aria-label="Quantity for combo item 2"></div></div><p class="hint">For combo discounts select item(s), required quantities and a bundle price. Customers must add those items to qualify.</p><div class="checkrow"><input id="offer-active" type="checkbox" checked><label for="offer-active">Offer active</label></div><button class="btn mt-3">Save offer</button></form></div><div class="panel mt-3"><h3>All offers</h3>${rows(['Code','Type','Value','Expires','Status','Actions'],r.offers.map(o=>`<tr><td><strong>${esc(o.code)}</strong></td><td>${esc(o.type)}</td><td>${o.type==='percent'?o.value+'%':o.type==='fixed'?money(o.value):money(o.comboPricePaise)}</td><td>${safeDate(o.expiresAt)}</td><td>${status(o.active?'Active':'Inactive')}</td><td><button class="btn tiny secondary" data-edit="${o._id}">Edit</button><button class="btn tiny ghost" data-toggle="${o._id}">${o.active?'Deactivate':'Activate'}</button></td></tr>`).join(''))}</div>`;
  function reset(){byId('offer-form').reset();byId('offer-id').value='';byId('offer-title').textContent='Create offer';byId('offer-reset').classList.add('hidden');}
  byId('offer-reset').onclick=reset;
  function formData(){const type=byId('offer-type').value;const comboItems=[];
    for(let n of [1,2])if(byId(`combo${n}`).value)comboItems.push({menuItem:byId(`combo${n}`).value,quantity:Number(byId(`combo${n}qty`).value)});
    return{code:byId('offer-code').value.toUpperCase().trim(),type,
      value:type==='fixed'?Math.round(Number(byId('offer-value').value)*100):type==='percent'?Number(byId('offer-value').value):0,
      minimumPaise:Math.round(Number(byId('offer-min').value)*100),
      expiresAt:new Date(`${byId('offer-expiry').value}T23:59:59+05:30`).toISOString(),active:byId('offer-active').checked,
      comboPricePaise:Math.round(Number(byId('combo-price').value)*100),comboItems:type==='combo'?comboItems:[]};}
  byId('offer-form').onsubmit=e=>{e.preventDefault();const id=byId('offer-id').value;
    notify(()=>api(id?`/owner/offers/${id}`:'/owner/offers',{method:id?'PATCH':'POST',body:formData()}));};
  panel().onclick=e=>{const b=e.target.closest('[data-edit],[data-toggle]');if(!b)return;const id=b.dataset.edit||b.dataset.toggle;
    const o=r.offers.find(x=>String(x._id)===id);if(!o)return;
    if(b.dataset.toggle){notify(()=>api(`/owner/offers/${id}`,{method:'PATCH',body:{active:!o.active}}));return;}
    byId('offer-id').value=o._id;byId('offer-code').value=o.code;byId('offer-type').value=o.type;
    byId('offer-value').value=o.type==='fixed'?o.value/100:o.type==='percent'?o.value:0;
    byId('offer-min').value=o.minimumPaise/100;byId('offer-expiry').value=dateValue(o.expiresAt);
    byId('combo-price').value=o.comboPricePaise/100;byId('offer-active').checked=o.active;
    [1,2].forEach((n,i)=>{byId(`combo${n}`).value=o.comboItems?.[i]?.menuItem||'';byId(`combo${n}qty`).value=o.comboItems?.[i]?.quantity||1;});
    byId('offer-title').textContent='Edit offer';byId('offer-reset').classList.remove('hidden');byId('offer-code').focus();
  };
 }
 async function staff(){const r=await api('/owner/staff');
   panel().innerHTML=`<div class="panel"><h3>Kitchen team requests</h3><p class="muted">Only approved staff can log in to the kitchen board.</p>${rows(['Name','Email','Requested','Status','Actions'],r.staff.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${safeDate(s.createdAt)}</td><td>${status(s.approval)}</td><td>${s.approval!=='approved'?`<button class="btn tiny" data-approve="${s._id}">Approve</button>`:''} ${s.approval!=='rejected'?`<button class="btn tiny ghost" data-reject="${s._id}">Reject</button>`:''}</td></tr>`).join(''))}</div>`;
   panel().onclick=e=>{const b=e.target.closest('[data-approve],[data-reject]');if(!b)return;const id=b.dataset.approve||b.dataset.reject;
     const approval=b.dataset.approve?'approved':'rejected';
     if(confirm(`${approval==='approved'?'Approve':'Reject'} this kitchen staff account?`))notify(()=>api(`/owner/staff/${id}`,{method:'PATCH',body:{approval}}));};
 }
 async function reports(){panel().innerHTML=`<div class="panel"><h3>Confirmed sales reports</h3><p class="muted">Revenue includes confirmed payments only. Date filter uses Indian Standard Time.</p><form id="report-form" class="form-row"><div class="field"><label for="from">From</label><input id="from" type="date" class="input" value="${dateValue(new Date(Date.now()-29*86400000))}"></div><div class="field"><label for="to">To</label><input id="to" type="date" class="input" value="${dateValue(new Date())}"></div><div class="flex wrap"><button class="btn">View report</button><a class="btn secondary" id="export" href="#">Download CSV</a></div></form></div><div id="report-result" class="mt-3"></div>`;
   async function load(){const query=`?from=${encodeURIComponent(byId('from').value)}&to=${encodeURIComponent(byId('to').value)}`;
     byId('export').href='/api/owner/reports/csv'+query;
     try{const r=await api('/owner/reports'+query);
       const max=Math.max(1,...r.daily.map(x=>x.revenuePaise));
       byId('report-result').innerHTML=`<div class="stat-grid"><div class="stat"><small>Confirmed revenue</small><strong>${money(r.total.revenuePaise)}</strong></div><div class="stat"><small>Paid orders</small><strong>${r.total.orders}</strong></div></div><div class="panel mt-3"><h3>Daily revenue</h3>${r.daily.length?`<div class="chart-outer"><div class="chart">${r.daily.map(x=>`<div class="chart-col" title="${esc(x._id)}: ${money(x.revenuePaise)}"><div class="chart-bar" style="height:${Math.max(2,Math.round(x.revenuePaise/max*180))}px"></div><div class="chart-label">${esc(x._id.slice(5))}</div></div>`).join('')}</div></div>`:'<div class="empty">No confirmed sales in this period.</div>'}</div><div class="report-grid mt-3"><div class="panel"><h3>Payment methods</h3>${rows(['Method','Orders','Revenue'],r.methods.map(x=>`<tr><td>${esc(x._id)}</td><td>${x.orders}</td><td>${money(x.revenuePaise)}</td></tr>`).join(''))}</div><div class="panel"><h3>Popular items (gross)</h3>${rows(['Item','Units','Gross value'],r.items.map(x=>`<tr><td>${esc(x._id)}</td><td>${x.quantity}</td><td>${money(x.grossPaise)}</td></tr>`).join(''))}</div></div>`;
     }catch(e){byId('report-result').innerHTML=`<div class="message error">${esc(e.message)}</div>`;}}
   byId('report-form').onsubmit=e=>{e.preventDefault();load();};await load();
 }
 async function customers(){return window.BBLoyalty.render({panel,api,esc,money,toast,status});}
 async function show(){panel().innerHTML='<div class="loading">Loading café data…</div>';const fn={overview,orders,menu,categories,tables,offers,customers,staff,reports}[current];await fn();}
 await safe(show());
})();
