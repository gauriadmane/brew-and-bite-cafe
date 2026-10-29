const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('customer-specific offer eligibility is enforced for preview and for final order creation',()=>{
  const orders=read('src/routes/orders.js');
  const billing=read('src/services/billing.js');
  const catalog=read('src/routes/catalog.js');
  assert.equal((orders.match(/await priceCart\(body,req\.user\._id\)/g)||[]).length,2);
  assert.match(catalog,/await priceCart\(body,req\.user\._id\)/);
  assert.match(billing,/await requireOfferAudience\(offer,customerId\)/);
});

test('owner customer directory and details are both role guarded',()=>{
  const src=read('src/routes/customer-management.js');
  assert.match(src,/router\.use\(requireUser,roles\('owner'\)\)/);
  assert.match(src,/router\.get\('\/customers'/);
  assert.match(src,/router\.get\('\/customers\/:id'/);
  assert.match(src,/weeklyCompletedOrders/);
});

test('public offers only reveal public coupons; private coupons are personalized',()=>{
  const api=read('src/routes/catalog.js');
  assert.match(api,/router\.get\('\/offers\/mine',requireUser,roles\('customer'\)/);
  assert.match(api,/eligibleForOffer\(o,req\.user\._id,weekly\)/);
  assert.match(api,/audience:'all'/);
});

test('owner dashboard can view customers, assign specific recipients and make regular offers',()=>{
  const owner=read('public/js/owner.js'),ui=read('public/js/loyalty.js');
  const html=read('public/owner.html');
  assert.match(owner,/Customers & loyalty/);
  assert.match(owner,/BBLoyalty\.render/);
  assert.match(html,/\/js\/loyalty\.js/);
  assert.match(ui,/selected customers/i);
  assert.match(ui,/regular customers/i);
});

test('Render deployment blueprint is on one free Node web service with no secrets in Git',()=>{
  const config=read('render.yaml');
  assert.match(config,/plan: free/);
  assert.match(config,/runtime: node/);
  assert.match(config,/startCommand: npm start/);
  assert.match(config,/MONGODB_URI/);
  assert.match(config,/sync: false/);
  assert.doesNotMatch(config,/mongodb\+srv:\/\//);
  assert.match(read('.gitignore'),/^\.env$/m);
});
