const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateMenuImage,MAX_IMAGE_BYTES}=require('../src/utils/menu-image');
const root=path.resolve(__dirname,'..');
const src=file=>fs.readFileSync(path.join(root,file),'utf8');

test('JPEG validator refuses missing, oversized or non-JPEG upload bytes',()=>{
  for(const bytes of [undefined,Buffer.from('not an image'),Buffer.alloc(MAX_IMAGE_BYTES+1,1)]){
    assert.throws(()=>validateMenuImage(bytes),/image|JPEG/i);
  }
});
test('JPEG validator accepts a real JPEG and rejects corrupt or missing dimensions',()=>{
  const good=fs.readFileSync(path.join(root,'tests/fixtures/product-test.jpg'));
  assert.equal(validateMenuImage(good),good);
  const altered=Buffer.from(good);altered[0]=0;
  assert.throws(()=>validateMenuImage(altered),/JPEG/);
  const disguised=Buffer.alloc(150,1);
  disguised[0]=255;disguised[1]=216;disguised[2]=255;
  disguised[148]=255;disguised[149]=217;
  assert.throws(()=>validateMenuImage(disguised),/JPEG/);
});
test('checkout shows all three payment methods as radio cards and checks availability',()=>{
  const js=src('public/js/customer.js');
  for(const method of ['cash','upi','card'])assert.match(js,new RegExp(`name="payment-method" value="${method}"`));
  assert.match(js,/api\('\/payment-options'\)/);
  assert.match(js,/payment-help/);
  assert.doesNotMatch(js,/<select id="method">/);
});
test('owner interface permits photo upload, photo removal, and clear payment badges',()=>{
  const js=src('public/js/owner.js');
  assert.match(js,/id="menu-file" type="file"/);
  assert.match(js,/menu-remove-photo/);
  assert.match(js,/compressMenuPhoto/);
  assert.match(js,/image\/jpeg/);
  assert.match(js,/payment-badge/);
});
test('photo API is owner-protected and menu image GET reads from MongoDB',()=>{
  const routes=src('src/routes/owner.js');
  assert.match(routes,/router\.use\(requireUser,roles\('owner'\)\)/);
  assert.match(routes,/router\.post\('\/menu\/:id\/image'/);
  assert.match(routes,/router\.delete\('\/menu\/:id\/image'/);
  const catalog=src('src/routes/catalog.js');
  assert.match(catalog,/router\.get\('\/menu-images\/:id'/);
  const app=src('src/app.js');
  assert.match(app,/express\.raw\(\{type:'image\/jpeg',limit:'350kb'\}\)/);
});
test('Logout hover is light, not a generic dark primary hover',()=>{
  const css=src('public/css/style.css');
  assert.match(css,/\.btn\.signout-btn:hover:not\(:disabled\)/);
  assert.match(css,/background:#f8d8cc/);
});
test('Razorpay Test Mode is required for online payments',()=>{
  const api=src('src/routes/catalog.js');
  const provider=src('src/services/payments.js');
  assert.match(api,/rzp_test_/);
  assert.match(provider,/Use Razorpay Test Mode keys/);
});
