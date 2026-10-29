const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/js/loyalty.js'),'utf8');
const owner='507f1f77bcf86cd799439011';

function fixture(){
  const elements=new Map();
  const el=id=>{
    if(!elements.has(id)) elements.set(id,{
      id,innerHTML:'',value:'',textContent:'',checked:true,disabled:false,options:[],selectedOptions:[],
      classList:{add:()=>{},remove:()=>{},toggle:()=>{}},
      reset:()=>{},scrollIntoView:()=>{}
    });
    return elements.get(id);
  };
  let panelHTML='';
  const panel=()=>({set innerHTML(v){panelHTML=v;},get innerHTML(){return panelHTML;}});
  const calls=[];
  const user={_id:owner,name:'Test Loyal Customer',email:'loyal@example.test',phone:'9888888888',
    weeklyCompletedOrders:5,paidOrders:7,lifetimePaidPaise:145000,isRegular:true,
    lastOrderAt:'2026-10-29T07:00:00Z',createdAt:'2026-10-01T07:00:00Z'};
  const api=async(url,options)=>{
    calls.push({url,options});
    if(url.startsWith('/owner/customers?')) return {ok:true,total:1,page:1,pages:1,customers:[user]};
    if(url==='/owner/customers/lookup')return {ok:true,customers:[user]};
    if(url==='/owner/customers/'+owner)return {ok:true,customer:user,orders:[]};
    if(url==='/owner/offers')return {ok:true,offers:[]};
    if(url.startsWith('/owner/offers')&&options?.method==='POST')return {ok:true,offer:options.body};
    throw Error('Unexpected API '+url);
  };
  const sandbox={window:{},document:{getElementById:el},URLSearchParams,Date,Number,String,Math,Array,Set,Intl,console};
  vm.runInNewContext(source,sandbox,{filename:'loyalty.js'});
  const ctx={panel,api,esc:x=>String(x),money:n=>'₹'+(Number(n)/100).toFixed(2),toast:()=>{},status:x=>x};
  return {el,calls,ctx,module:sandbox.window.BBLoyalty};
}

test('owner loyalty UI renders database-backed customer directory with reward action',async()=>{
  const f=fixture();
  await f.module.render(f.ctx);
  assert.match(f.el('loyalty-content').innerHTML,/Test Loyal Customer/);
  assert.match(f.el('loyalty-content').innerHTML,/5<\/strong> completed/);
  assert.match(f.el('loyalty-content').innerHTML,/data-offer=/);
  assert.ok(f.calls.some(c=>c.url.startsWith('/owner/customers?')));
});

test('owner can open targeted offer editor from customer workspace',async()=>{
  const f=fixture();
  await f.module.render(f.ctx);
  await f.el('loyalty-offers').onclick();
  assert.match(f.el('loyalty-content').innerHTML,/Create a loyalty offer/);
  assert.match(f.el('loyalty-content').innerHTML,/regular customers/i);
  assert.match(f.el('loyalty-content').innerHTML,/loyalty-targets/);
  assert.ok(f.calls.some(c=>c.url==='/owner/customers/lookup'));
});

test('owner targeted offer submission includes assigned customer ID and required pricing fields',async()=>{
  const f=fixture();
  await f.module.render(f.ctx);
  await f.el('loyalty-offers').onclick();
  f.el('loyalty-code').value='VIPTHANKS15';
  f.el('loyalty-audience').value='selected';
  f.el('loyalty-type').value='percent';
  f.el('loyalty-value').value='15';
  f.el('loyalty-minimum').value='200';
  f.el('loyalty-expires').value='2026-12-31';
  f.el('loyalty-targets').selectedOptions=[{value:owner}];
  f.el('loyalty-active').checked=true;
  await f.el('loyalty-offer-form').onsubmit({preventDefault(){}});
  const posted=f.calls.find(c=>c.url==='/owner/offers'&&c.options?.method==='POST');
  assert.ok(posted,'a real offer POST request must occur');
  assert.equal(posted.options.body.audience,'selected');
  assert.deepEqual([...posted.options.body.eligibleCustomers],[owner]);
  assert.equal(posted.options.body.minimumPaise,20000);
  assert.equal(posted.options.body.value,15);
  assert.equal(posted.options.body.code,'VIPTHANKS15');
});
