const {Order,Table}=require('../models');
const {ready,client,confirmProviderPayment}=require('../services/payments');
let running=false;
async function expireEligibleOrders() {
  if(running) return; running=true;
  try {
    const candidates=await Order.find({paymentMethod:{$in:['upi','card']},paymentStatus:{$in:['Pending','Failed']},orderStatus:'Placed',
      expiresAt:{$lte:new Date()}}).limit(30).lean();
    for(const order of candidates) {
      try {
        if(order.providerOrderId) {
          if (!ready()) continue;
          const response=await client().orders.fetchPayments(order.providerOrderId);
          const payments=response.items||[];
          const captured=payments.find(p=>p.status==='captured');
          if(captured) {await confirmProviderPayment(order.providerOrderId,captured.id);continue;}
          if(payments.some(p=>p.status==='authorized'||p.status==='created')) continue;
        }
        const cancelled=await Order.findOneAndUpdate({_id:order._id,paymentStatus:{$in:['Pending','Failed']},orderStatus:'Placed',
          expiresAt:{$lte:new Date()}},{$set:{orderStatus:'Cancelled',paymentStatus:'Expired',cancelledAt:new Date()}},{new:true});
        if(cancelled) await Table.updateOne({_id:cancelled.table,occupiedBy:cancelled._id},{$set:{occupiedBy:null}});
      } catch(err) {console.warn('One payment expiry check failed:',err.message);}
    }
  } finally {running=false;}
}
function startExpiry() {
  const interval=setInterval(()=>expireEligibleOrders().catch(err=>console.warn('Expiry job failed:',err.message)),2*60*1000);
  interval.unref();
  expireEligibleOrders().catch(err=>console.warn('Initial expiry check failed:',err.message));
}
module.exports={expireEligibleOrders,startExpiry};
