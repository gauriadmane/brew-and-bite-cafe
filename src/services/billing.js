const { MenuItem, Offer, Table, Category }=require('../models');
const { ensure }=require('../utils/http');
const { taxBps }=require('../config/env');
const {discountForOffer,computeTotals}=require('../utils/pricing');
const {requireOfferAudience}=require('./loyalty');
async function priceCart(body,customerId) {
  ensure(new Set(body.items.map(x=>x.menuItem)).size===body.items.length,400,'Duplicate cart items.');
  const ids=body.items.map(x=>x.menuItem);
  const docs=await MenuItem.find({_id:{$in:ids},active:true,available:true}).lean();
  ensure(docs.length===ids.length,400,'A cart item is unavailable. Refresh your cart.');
  const activeCategories=await Category.countDocuments({_id:{$in:[...new Set(docs.map(x=>String(x.category)))]},active:true});
  ensure(activeCategories===new Set(docs.map(x=>String(x.category))).size,400,'A menu category is no longer available.');
  const map=new Map(docs.map(x=>[String(x._id),x]));
  const lines=body.items.map(x=>{
    const item=map.get(x.menuItem);
    return {menuItem:item._id,name:item.name,unitPricePaise:item.pricePaise,quantity:x.quantity,lineTotalPaise:item.pricePaise*x.quantity};
  });
  let offer=null;
  if (body.offerCode) {
    offer=await Offer.findOne({code:body.offerCode,active:true,expiresAt:{$gt:new Date()}}).lean();
    ensure(offer,400,'Offer code is invalid or expired.');
    await requireOfferAudience(offer,customerId);
  }
  const totals=computeTotals(lines,offer,taxBps());
  if (offer) {
    ensure(totals.subtotalPaise>=offer.minimumPaise,400,'Order does not meet the offer minimum.');
    ensure(totals.discountPaise>0,400,'This offer does not apply to your cart.');
  }
  const table=await Table.findOne({_id:body.table,active:true,occupiedBy:null}).lean();
  ensure(table,409,'The selected table is no longer available.');
  return {lines,totals,offerCode:offer?.code||'',table};
}
module.exports={discountForOffer,computeTotals,priceCart};
