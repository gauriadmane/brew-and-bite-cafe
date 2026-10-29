const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/services/loyalty.js'),'utf8');
let lastFilter=null;
let simulatedCount=5;
const moduleMock={exports:{}};
vm.runInNewContext(source,{
  module:moduleMock,
  require:p=>p==='../models'?{Order:{countDocuments:async filter=>{lastFilter=filter;return simulatedCount;}}}:
    p==='../utils/http'?{ensure:(v,status,msg)=>{if(!v){const err=new Error(msg);err.status=status;throw err;}}}:
    (()=>{throw Error('unexpected dependency '+p);})(),
  Date,Array,Boolean,String,Set,Number
});
const loyalty=moduleMock.exports;
const user='507f1f77bcf86cd799439011',other='507f1f77bcf86cd799439022';

test('regular customer = five or more completed and paid orders in rolling 7 days',()=>{
  const now=new Date('2026-10-29T07:00:00.000Z');
  const filter=loyalty.qualifyingOrderFilter(user,now);
  assert.equal(loyalty.MIN_ORDERS,5);
  assert.equal(filter.customer,user);
  assert.equal(filter.orderStatus,'Completed');
  assert.equal(filter.paymentStatus,'Confirmed');
  assert.equal(filter.completedAt.$gte.toISOString(),'2026-10-22T07:00:00.000Z');
  assert.equal(filter.completedAt.$lte.toISOString(),now.toISOString());
});

test('existing public offers remain eligible after schema upgrade',()=>{
  assert.equal(loyalty.offerAudience({code:'WELCOME10'}),'all');
  assert.equal(loyalty.eligibleForOffer({code:'WELCOME10'},other,0),true);
});

test('private selected coupon accepts only listed customers',()=>{
  const offer={audience:'selected',eligibleCustomers:[user]};
  assert.equal(loyalty.eligibleForOffer(offer,user,0),true);
  assert.equal(loyalty.eligibleForOffer(offer,other,12),false);
  assert.equal(loyalty.eligibleForOffer(offer,null,20),false);
});

test('rolling regular coupon requires at least 5 orders even if code is known',()=>{
  const offer={audience:'regular'};
  assert.equal(loyalty.eligibleForOffer(offer,user,4),false);
  assert.equal(loyalty.eligibleForOffer(offer,user,5),true);
  assert.equal(loyalty.eligibleForOffer(offer,user,6),true);
});

test('server checks recent count for regular coupons',async()=>{
  const offer={audience:'regular'};
  simulatedCount=4;
  await assert.rejects(loyalty.requireOfferAudience(offer,user),e=>e.status===403);
  simulatedCount=5;
  await loyalty.requireOfferAudience(offer,user);
  assert.equal(lastFilter.customer,user);
  assert.equal(lastFilter.orderStatus,'Completed');
});

test('server refuses a selected customer coupon for a different customer',async()=>{
  const offer={audience:'selected',eligibleCustomers:[user]};
  await assert.rejects(loyalty.requireOfferAudience(offer,other),e=>e.status===403);
  await loyalty.requireOfferAudience(offer,user);
});
