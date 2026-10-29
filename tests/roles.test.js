const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const publicRoot=path.join(__dirname,'../public');
const read=js=>fs.readFileSync(path.join(publicRoot,'js',js),'utf8');

async function createPage(role,page='index',hash=''){
  const user=role?{id:'a'.repeat(24),name:'Asha Patel',email:'asha@example.test',phone:'',role,approval:'approved'}:null;
  const elements=new Map();
  function el(id){if(!elements.has(id))elements.set(id,{
    id,innerHTML:'',textContent:'',className:'',dataset:{},disabled:false,
    classList:{add(){},remove(){},toggle(){return false;}},
    addEventListener(){},setAttribute(){},scrollIntoView(){}
  });return elements.get(id);}
  const pathname=`/${page==='index'?'':page+'.html'}`;
  const location={origin:'http://localhost:3000',pathname,hash,search:'',replaced:null,replace(url){this.replaced=url;}};
  const fetch=async url=>{
    let data={ok:true};let ok=true;
    if(url==='/api/auth/me') {ok=!!user;data=ok?{ok:true,user}:{ok:false,error:'Not logged in'};}
    else if(url==='/api/auth/csrf')data={ok:true,csrfToken:'0'.repeat(64)};
    else if(url.startsWith('/api/menu'))data={ok:true,items:[],pages:1};
    else if(url==='/api/offers')data={ok:true,offers:[]};
    else if(url==='/api/categories')data={ok:true,categories:[]};
    return {ok,status:ok?200:401,headers:{get(){return 'application/json';}},json:async()=>data};
  };
  const sandbox={document:{body:{dataset:{page}},getElementById:el,querySelectorAll:()=>[]},
    window:{addEventListener(){}},location,URL,Intl,Date,Number,Math,String,Object,Array,
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}},fetch,
    setTimeout(){return 1;},clearTimeout(){},requestAnimationFrame(fn){fn();},console,confirm(){return true;},
    navigator:{clipboard:{writeText:async()=>{}}}
  };
  vm.createContext(sandbox);
  vm.runInContext(read('common.js'),sandbox,{filename:'common.js'});
  await sandbox.window.BB.ready;
  return {sandbox,location,el,async render(){
    vm.runInContext(read('customer.js'),sandbox,{filename:'customer.js'});
    for(let i=0;i<8;i++)await new Promise(setImmediate);
  }};
}

test('owner header contains owner actions, identity and profile without a cart',async()=>{
  const p=await createPage('owner');const header=p.el('site-header').innerHTML;
  assert.match(header,/Dashboard/);assert.match(header,/Café Owner/);
  assert.match(header,/href="\/profile.html"/);assert.match(header,/Menu preview/);
  assert.doesNotMatch(header,/cart-action/);
  assert.doesNotMatch(header,/href="\/orders.html"/);
});
test('staff sees kitchen navigation, user identity and profile without cart',async()=>{
  const p=await createPage('staff');const header=p.el('site-header').innerHTML;
  assert.match(header,/Kitchen board/);assert.match(header,/Kitchen Staff/);
  assert.match(header,/href="\/profile.html"/);
  assert.doesNotMatch(header,/href="\/owner.html"/);
  assert.doesNotMatch(header,/cart-action/);
});
test('customer sees orders, account and ordering features without owner actions',async()=>{
  const p=await createPage('customer');const header=p.el('site-header').innerHTML;
  assert.match(header,/My orders/);assert.match(header,/Customer/);
  assert.match(header,/cart-action/);assert.match(header,/href="\/profile.html"/);
  assert.doesNotMatch(header,/href="\/owner.html"/);
});
test('public header includes valid About and Offers page links',async()=>{
  const p=await createPage(null);const header=p.el('site-header').innerHTML;
  assert.match(header,/href="\/about.html"/);
  assert.match(header,/href="\/offers.html"/);
  assert.match(header,/href="\/login.html"/);
});
test('owner and staff default homepage redirects to correct workspace',async()=>{
  const owner=await createPage('owner');await owner.render();
  assert.equal(owner.location.replaced,'/owner.html');
  const staff=await createPage('staff');await staff.render();
  assert.equal(staff.location.replaced,'/kitchen.html');
});
test('customer homepage is personalized and does not redirect',async()=>{
  const p=await createPage('customer');await p.render();
  assert.equal(p.location.replaced,null);
  assert.match(p.el('app').innerHTML,/Good to see you, Asha/);
  assert.match(p.el('app').innerHTML,/href="\/about.html"/);
});
test('staff profile page renders account details and kitchen workspace link',async()=>{
  const p=await createPage('staff','profile');await p.render();
  const html=p.el('app').innerHTML;
  assert.match(html,/Kitchen Staff/);assert.match(html,/href="\/kitchen.html"/);
  assert.match(html,/profile-form/);assert.match(html,/asha@example\.test/);
});
test('cross-role next destinations are ignored after login',async()=>{
  const p=await createPage('owner');const redirect=p.sandbox.window.BB.allowedLoginDestination;
  assert.equal(redirect('/checkout.html','owner'),'/owner.html');
  assert.equal(redirect('/owner.html','customer'),'/');
  assert.equal(redirect('//evil.example','customer'),'/');
  assert.equal(redirect('https://evil.example/','staff'),'/kitchen.html');
  assert.equal(redirect('/profile.html','staff'),'/profile.html');
  assert.equal(redirect('/orders.html','customer'),'/orders.html');
});
test('standalone About and Offers pages exist',()=>{
  for(const page of ['about','offers']){
    const html=fs.readFileSync(path.join(publicRoot,page+'.html'),'utf8');
    assert.match(html,new RegExp(`data-page="${page}"`));
    assert.match(html,/js\/common\.js/);assert.match(html,/js\/customer\.js/);
  }
});

test('About content shows a useful action and role-specific instructions for every role',async()=>{
  for(const [role,text,url] of [
    ['owner','Your Owner Dashboard','/owner.html'],
    ['staff','Your kitchen workspace','/kitchen.html'],
    ['customer','Everything about your next order','/orders.html'],
    [null,'Discover a simpler café experience','/register.html']
  ]){
    const page=await createPage(role,'about');await page.render();
    const html=page.el('app').innerHTML;
    assert.match(html,new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
    assert.ok(html.includes(`href="${url}"`),`${role||'guest'} missing role-appropriate action`);
    assert.match(html,/id="contact"/);
  }
});
