// Owner-only customer and loyalty workspace. Server controls all permissions and discounts.
window.BBLoyalty=(function(){
  let selectedCustomerId='';
  let search='',segment='all',page=1;
  const formatDate=d=>d?new Date(d).toLocaleDateString('en-IN'):'—';
  const amountPaise=v=>Number(v||0);
  async function render({panel,api,esc,money,toast,status}){
    const root=()=>panel();
    const title=()=>`<div class="panel loyalty-top"><div class="tool-row"><div><span class="eyebrow">YOUR CAFÉ COMMUNITY</span><h3>Customers & loyalty</h3><p class="muted">A regular customer has <strong>5+ completed and paid orders within the last rolling 7 days</strong>.</p></div><div class="flex wrap"><button class="btn small secondary" type="button" id="loyalty-customers">Customer directory</button><button class="btn small" type="button" id="loyalty-offers">Targeted offers</button></div></div></div><div id="loyalty-content" class="mt-3"></div>`;
    root().innerHTML=title();
    document.getElementById('loyalty-customers').onclick=()=>listCustomers();
    document.getElementById('loyalty-offers').onclick=()=>showTargetedOffers();
    function content(){return document.getElementById('loyalty-content');}
    async function listCustomers(){
      content().innerHTML='<div class="panel loading">Loading customer records…</div>';
      try{
        const params=new URLSearchParams({page:String(page),limit:'15',q:search,segment});
        const r=await api('/owner/customers?'+params);
        content().innerHTML=`<div class="panel"><div class="tool-row"><div><h3>Customer directory</h3><p class="muted">${r.total} matching customer${r.total===1?'':'s'} · View their paid orders, contact details and loyalty eligibility.</p></div></div><form id="customer-search" class="form-row"><div class="field"><label for="loyalty-search">Search name, email or phone</label><input id="loyalty-search" class="input" value="${esc(search)}" maxlength="60" placeholder="Find a customer"></div><div class="field"><label for="loyalty-segment">Show</label><select id="loyalty-segment" class="input"><option value="all" ${segment==='all'?'selected':''}>All customers</option><option value="regular" ${segment==='regular'?'selected':''}>Regular customers (5+)</option></select></div><div class="flex"><button class="btn" type="submit">Search</button></div></form>
        <div class="table-wrap mt-3"><table><thead><tr><th>Customer</th><th>Last 7 days</th><th>Confirmed spend</th><th>Last order</th><th>Actions</th></tr></thead><tbody>${r.customers.length?r.customers.map(c=>`<tr><td><strong>${esc(c.name)}</strong><div class="small muted">${esc(c.email)}</div>${c.isRegular?'<span class="badge paid">Regular customer</span>':''}</td><td><strong>${c.weeklyCompletedOrders}</strong> completed & paid</td><td>${money(amountPaise(c.lifetimePaidPaise))}<div class="small muted">${c.paidOrders} paid orders</div></td><td>${formatDate(c.lastOrderAt)}</td><td><button class="btn secondary tiny" data-detail="${esc(c._id)}">Details</button> <button class="btn tiny" data-offer="${esc(c._id)}">Give offer</button></td></tr>`).join(''):'<tr><td colspan="5">No customers match this search.</td></tr>'}</tbody></table></div>
        <div class="flex between wrap mt-3"><button id="loyalty-prev" class="btn secondary small" ${page<=1?'disabled':''}>← Previous</button><span class="muted">Page ${page} of ${r.pages||1}</span><button id="loyalty-next" class="btn secondary small" ${page>=r.pages?'disabled':''}>Next →</button></div></div>`;
        document.getElementById('customer-search').onsubmit=e=>{e.preventDefault();search=document.getElementById('loyalty-search').value.trim();segment=document.getElementById('loyalty-segment').value;page=1;listCustomers();};
        document.getElementById('loyalty-segment').onchange=()=>{segment=document.getElementById('loyalty-segment').value;search=document.getElementById('loyalty-search').value.trim();page=1;listCustomers();};
        document.getElementById('loyalty-prev').onclick=()=>{page=Math.max(1,page-1);listCustomers();};
        document.getElementById('loyalty-next').onclick=()=>{page++;listCustomers();};
        content().onclick=e=>{const btn=e.target.closest('[data-detail],[data-offer]');if(!btn)return;
          if(btn.dataset.detail)showCustomer(btn.dataset.detail);
          else{selectedCustomerId=btn.dataset.offer;showTargetedOffers(selectedCustomerId);}
        };
      }catch(error){content().innerHTML=`<div class="message error">${esc(error.message)}</div>`;}
    }
    async function showCustomer(id){
      content().innerHTML='<div class="panel loading">Loading customer details…</div>';
      try{
        const r=await api('/owner/customers/'+encodeURIComponent(id)),c=r.customer;
        content().innerHTML=`<div class="panel"><div class="tool-row"><div><span class="eyebrow">CUSTOMER PROFILE</span><h3>${esc(c.name)}</h3><div class="muted">${esc(c.email)} · ${esc(c.phone||'No phone saved')}</div><div class="small muted">Joined ${formatDate(c.createdAt)}</div></div><button id="loyalty-back" class="btn secondary small">← All customers</button></div><div class="stat-grid mt-3"><div class="stat"><small>Completed, paid (7 days)</small><strong>${c.weeklyCompletedOrders} / 5</strong></div><div class="stat"><small>Customer status</small><strong>${c.isRegular?'Regular':'Standard'}</strong></div><div class="stat"><small>Total paid orders</small><strong>${c.paidOrders}</strong></div><div class="stat"><small>Total confirmed spend</small><strong>${money(amountPaise(c.lifetimePaidPaise))}</strong></div></div><button id="loyalty-reward-one" class="btn mt-3">Create personal offer for ${esc(c.name)} →</button></div>
        <div class="panel mt-3"><h3>Recent orders</h3><div class="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Order status</th><th>Payment</th><th>Offer</th></tr></thead><tbody>${r.orders.length?r.orders.map(o=>`<tr><td>${esc(o.orderNumber)}</td><td>${formatDate(o.createdAt)}</td><td>${money(amountPaise(o.totalPaise))}</td><td>${status(o.orderStatus)}</td><td>${status(o.paymentStatus)}</td><td>${esc(o.offerCode||'—')}</td></tr>`).join(''):'<tr><td colspan="6">No orders yet.</td></tr>'}</tbody></table></div></div>`;
        document.getElementById('loyalty-back').onclick=listCustomers;
        document.getElementById('loyalty-reward-one').onclick=()=>{selectedCustomerId=c._id;showTargetedOffers(c._id);};
      }catch(error){content().innerHTML=`<div class="message error">${esc(error.message)}</div>`;}
    }
    async function showTargetedOffers(targetId=''){
      content().innerHTML='<div class="panel loading">Loading loyalty offers…</div>';
      try{
        const [targetList,offerList]=await Promise.all([api('/owner/customers/lookup'),api('/owner/offers')]);
        const customers=targetList.customers.slice();
        if(targetId&&!customers.some(x=>String(x._id)===String(targetId))){
          const extra=await api('/owner/customers/'+encodeURIComponent(targetId));
          customers.unshift({_id:extra.customer._id,name:extra.customer.name,email:extra.customer.email});
        }
        const targeted=offerList.offers.filter(o=>['selected','regular'].includes(o.audience));
        const options=customers.map(c=>`<option value="${esc(c._id)}" ${String(c._id)===String(targetId)?'selected':''}>${esc(c.name)} (${esc(c.email)})</option>`).join('');
        content().innerHTML=`<div class="panel"><div class="tool-row"><div><h3 id="loyalty-offer-heading">Create a loyalty offer</h3><p class="muted">Offers are checked against the customer's account at checkout. Only the owner can assign customers.</p></div><button class="btn secondary small hidden" id="loyalty-cancel-edit">Cancel editing</button></div>
          <form id="loyalty-offer-form"><input type="hidden" id="loyalty-edit-id"><div class="form-row"><div class="field"><label for="loyalty-code">Offer code</label><input class="input" id="loyalty-code" minlength="3" maxlength="30" pattern="[A-Za-z0-9_-]+" placeholder="E.g. VIPTHANKS15" required></div><div class="field"><label for="loyalty-audience">Who can use this code?</label><select id="loyalty-audience" class="input"><option value="selected">Selected customers only</option><option value="regular">All currently eligible regular customers</option></select></div></div>
          <div id="loyalty-target-block" class="field"><label for="loyalty-targets">Choose customers (Ctrl+click to select multiple)</label><select id="loyalty-targets" class="input" multiple size="6">${options}</select><p class="hint">Customers not listed? Search them in the Customer directory first. At most 100 customers can be assigned per offer.</p></div>
          <div class="form-row"><div class="field"><label for="loyalty-type">Discount type</label><select id="loyalty-type" class="input"><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></div><div class="field"><label for="loyalty-value">Discount value</label><input id="loyalty-value" class="input" type="number" min="1" step="0.01" value="10" required></div></div>
          <div class="form-row"><div class="field"><label for="loyalty-minimum">Minimum order (₹)</label><input id="loyalty-minimum" class="input" type="number" min="0" step="0.01" value="0" required></div><div class="field"><label for="loyalty-expires">Valid until</label><input id="loyalty-expires" class="input" type="date" required></div></div>
          <div class="checkrow"><input id="loyalty-active" type="checkbox" checked><label for="loyalty-active">Offer active</label></div>
          <p class="hint">Targeted offers can be reused until they expire or the owner deactivates them. A regular-customer offer rechecks the 7-day order rule every time it is used.</p>
          <button class="btn mt-3" type="submit" id="loyalty-save">Save loyalty offer</button></form></div>
          <div class="panel mt-3"><h3>Existing loyalty offers</h3><div class="table-wrap"><table><thead><tr><th>Code</th><th>Audience</th><th>Discount</th><th>Valid until</th><th>Actions</th></tr></thead><tbody>${targeted.length?targeted.map(o=>`<tr><td><strong>${esc(o.code)}</strong> ${!o.active?'<span class="badge">Inactive</span>':''}</td><td>${o.audience==='regular'?'All regular customers':`${o.eligibleCustomers?.length||0} selected customers`}</td><td>${o.type==='percent'?`${o.value}%`:money(o.value)}</td><td>${formatDate(o.expiresAt)}</td><td><button class="btn secondary tiny" data-edit-loyalty="${esc(o._id)}">Edit</button> <button class="btn ghost tiny" data-toggle-loyalty="${esc(o._id)}">${o.active?'Deactivate':'Activate'}</button></td></tr>`).join(''):'<tr><td colspan="5">No loyalty offers have been created.</td></tr>'}</tbody></table></div></div>`;
        const audience=document.getElementById('loyalty-audience'),targets=document.getElementById('loyalty-targets');
        const toggleTargets=()=>document.getElementById('loyalty-target-block').classList.toggle('hidden',audience.value!=='selected');
        audience.onchange=toggleTargets;toggleTargets();
        const expires=document.getElementById('loyalty-expires');
        const date=new Date(Date.now()+30*86400000);
        expires.value=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        const reset=()=>{document.getElementById('loyalty-offer-form').reset();document.getElementById('loyalty-edit-id').value='';document.getElementById('loyalty-offer-heading').textContent='Create a loyalty offer';document.getElementById('loyalty-cancel-edit').classList.add('hidden');toggleTargets();};
        document.getElementById('loyalty-cancel-edit').onclick=reset;
        document.getElementById('loyalty-offer-form').onsubmit=async e=>{
          e.preventDefault();
          const btn=document.getElementById('loyalty-save');btn.disabled=true;
          try{
            const type=document.getElementById('loyalty-type').value;
            const value=Number(document.getElementById('loyalty-value').value);
            if(type==='percent'&&(value<=0||value>100||!Number.isInteger(value)))throw new Error('Percentage must be a whole number between 1 and 100.');
            const eligibleCustomers=audience.value==='selected'?[...targets.selectedOptions].map(x=>x.value):[];
            if(audience.value==='selected'&&!eligibleCustomers.length)throw new Error('Select at least one customer.');
            const body={code:document.getElementById('loyalty-code').value.trim().toUpperCase(),
              audience:audience.value,eligibleCustomers,type,
              value:type==='percent'?value:Math.round(value*100),
              minimumPaise:Math.round(Number(document.getElementById('loyalty-minimum').value)*100),
              expiresAt:new Date(`${expires.value}T23:59:59+05:30`).toISOString(),
              comboPricePaise:0,comboItems:[],active:document.getElementById('loyalty-active').checked};
            const id=document.getElementById('loyalty-edit-id').value;
            await api(id?'/owner/offers/'+id:'/owner/offers',{method:id?'PATCH':'POST',body});
            toast('Loyalty offer saved.');await showTargetedOffers();
          }catch(error){toast(error.message,true);}finally{btn.disabled=false;}
        };
        content().onclick=async e=>{
          const edit=e.target.closest('[data-edit-loyalty]');
          const toggle=e.target.closest('[data-toggle-loyalty]');
          if(!edit&&!toggle)return;
          const o=targeted.find(item=>String(item._id)===(edit?edit.dataset.editLoyalty:toggle.dataset.toggleLoyalty));
          if(!o)return;
          if(toggle){try{await api('/owner/offers/'+o._id,{method:'PATCH',body:{active:!o.active}});toast('Offer updated.');await showTargetedOffers();}catch(err){toast(err.message,true);}return;}
          document.getElementById('loyalty-edit-id').value=o._id;
          document.getElementById('loyalty-code').value=o.code;
          audience.value=o.audience;toggleTargets();
          [...targets.options].forEach(x=>x.selected=(o.eligibleCustomers||[]).some(id=>String(id)===x.value));
          document.getElementById('loyalty-type').value=o.type;
          document.getElementById('loyalty-value').value=o.type==='fixed'?(o.value/100):o.value;
          document.getElementById('loyalty-minimum').value=o.minimumPaise/100;
          expires.value=String(o.expiresAt).slice(0,10);
          document.getElementById('loyalty-active').checked=o.active;
          document.getElementById('loyalty-offer-heading').textContent='Edit loyalty offer';
          document.getElementById('loyalty-cancel-edit').classList.remove('hidden');
          document.getElementById('loyalty-offer-form').scrollIntoView({behavior:'smooth',block:'start'});
        };
      }catch(error){content().innerHTML=`<div class="message error">${esc(error.message)}</div>`;}
    }
    await listCustomers();
  }
  return {render};
})();
