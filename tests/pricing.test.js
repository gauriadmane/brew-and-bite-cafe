const test=require('node:test');
const assert=require('node:assert/strict');
const {computeTotals,discountForOffer}=require('../src/utils/pricing');
const lines=[{menuItem:'a',unitPricePaise:10000,quantity:2},{menuItem:'b',unitPricePaise:15000,quantity:1}];
test('calculates subtotal in integer paise',()=>{
 assert.deepEqual(computeTotals(lines,null,0),{subtotalPaise:35000,discountPaise:0,taxPaise:0,totalPaise:35000,taxBps:0});
});
test('percentage offer and tax apply after discount',()=>{
 assert.deepEqual(computeTotals(lines,{type:'percent',value:10,minimumPaise:0},500),{
 subtotalPaise:35000,discountPaise:3500,taxPaise:1575,totalPaise:33075,taxBps:500});
});
test('fixed discount never exceeds subtotal',()=>{
 assert.equal(discountForOffer({type:'fixed',value:999999,minimumPaise:0},lines,35000),35000);
});
test('minimum threshold restricts offer',()=>{
 assert.equal(discountForOffer({type:'percent',value:25,minimumPaise:50000},lines,35000),0);
});
test('combo discount applies only for qualifying quantities',()=>{
 const combo={type:'combo',comboPricePaise:20000,minimumPaise:0,comboItems:[{menuItem:'a',quantity:1},{menuItem:'b',quantity:1}]};
 assert.equal(discountForOffer(combo,lines,35000),5000);
 assert.equal(discountForOffer(combo,[{menuItem:'a',unitPricePaise:10000,quantity:1}],10000),0);
});
test('freebie discount is capped when combo price is higher',()=>{
 const combo={type:'combo',comboPricePaise:90000,minimumPaise:0,comboItems:[{menuItem:'a',quantity:1}]};
 assert.equal(discountForOffer(combo,lines,35000),0);
});
