// The regular-customer rule uses a rolling 7-day window and fully completed, paid orders.
// The source of truth is the Order collection, never a browser-maintained counter.
const {Order}=require('../models');
const {ensure}=require('../utils/http');
const DAYS=7;
const MIN_ORDERS=5; // more than four
const weeklyStart=(now=new Date())=>new Date(now.getTime()-DAYS*24*60*60*1000);
const qualifyingOrderFilter=(customerId, now=new Date())=>({
  customer:customerId,
  orderStatus:'Completed',paymentStatus:'Confirmed',completedAt:{$gte:weeklyStart(now),$lte:now}
});
async function regularOrderCount(customerId,now=new Date()) {
  return Order.countDocuments(qualifyingOrderFilter(customerId,now));
}
function offerAudience(offer){return offer.audience||'all';} // old DB records remain public
function eligibleForOffer(offer,customerId,weeklyCount=0){
  if(!offer)return false;
  switch(offerAudience(offer)){
    case 'all':return true;
    case 'regular':return weeklyCount>=MIN_ORDERS;
    case 'selected':return Boolean(customerId)&&Array.isArray(offer.eligibleCustomers)&&
      offer.eligibleCustomers.some(id=>String(id)===String(customerId));
    default:return false;
  }
}
async function requireOfferAudience(offer,customerId){
  if(offerAudience(offer)==='all')return;
  ensure(customerId,403,'Sign in as a customer to use this offer.');
  const weekly=offerAudience(offer)==='regular'?await regularOrderCount(customerId):0;
  ensure(eligibleForOffer(offer,customerId,weekly),403,'This offer is reserved for eligible customers.');
}
module.exports={DAYS,MIN_ORDERS,weeklyStart,qualifyingOrderFilter,regularOrderCount,offerAudience,eligibleForOffer,requireOfferAudience};
