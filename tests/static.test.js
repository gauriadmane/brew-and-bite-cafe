const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../public');
const pages=['index','about','offers','menu','cart','checkout','orders','login','register','staff-register','profile','receipt','owner','kitchen','404'];
test('all expected customer and staff pages exist',()=>{
  for(const page of pages)assert.equal(fs.existsSync(path.join(root,page+'.html')),true,`${page}.html missing`);
});
test('every page includes the shared API and navigation script',()=>{
  for(const page of pages){const html=fs.readFileSync(path.join(root,page+'.html'),'utf8');
    assert.match(html,/<script src="\/js\/common.js" defer><\/script>/);
    assert.match(html,/id="app"/);
  }
});
test('all local menu illustration categories exist',()=>{
  for(const key of ['coffee','tea','pastry','sandwich','dessert','juice','logo']){
    assert.equal(fs.existsSync(path.join(root,'assets',key+'.svg')),true,`${key}.svg missing`);
  }
});
