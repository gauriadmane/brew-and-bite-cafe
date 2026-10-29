const {checkSignature}=require('../utils/signatures');
const Razorpay=require('razorpay');
const {Order,PaymentAttempt}=require('../models');
const {ensure}=require('../utils/http');
const ready=()=>Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET);
function client() {
  ensure(ready()&&process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_'),503,'Use Razorpay Test Mode keys for online checkout.');
  return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
}
async function createPaymentOrder(order) {
  ensure(order.paymentMethod!=='cash',400,'Cash orders do not use Razorpay.');
  ensure(order.orderStatus==='Placed' && ['Pending','Failed'].includes(order.paymentStatus),409,'Order cannot be paid in this state.');
  if(order.paymentStatus==='Failed') await Order.updateOne({_id:order._id,paymentStatus:'Failed',orderStatus:'Placed'},{$set:{paymentStatus:'Pending'}});
  let attempt=await PaymentAttempt.findOne({order:order._id});
  if (!attempt) {
    const provider=await client().orders.create({amount:order.totalPaise,currency:'INR',receipt:order.orderNumber,notes:{localOrderId:String(order._id)}});
    try {attempt=await PaymentAttempt.create({order:order._id,providerOrderId:provider.id});}
    catch(err) {
      if (err.code!==11000) throw err;
      attempt=await PaymentAttempt.findOne({order:order._id});
    }
  }
  await Order.updateOne({_id:order._id,orderStatus:'Placed',paymentStatus:'Pending'},{$set:{providerOrderId:attempt.providerOrderId}});
  return {keyId:process.env.RAZORPAY_KEY_ID,providerOrderId:attempt.providerOrderId,amount:order.totalPaise,currency:'INR'};
}
async function confirmProviderPayment(providerOrderId,paymentId) {
  const attempt=await PaymentAttempt.findOne({providerOrderId});
  ensure(attempt,404,'Payment attempt not found.');
  const order=await Order.findById(attempt.order);
  ensure(order,404,'Order not found.');
  const remote=await client().payments.fetch(paymentId);
  ensure(remote.order_id===providerOrderId&&remote.amount===order.totalPaise&&remote.currency==='INR',400,'Payment details do not match the order.');
  ensure(remote.status==='captured',409,'Payment is not captured yet.');
  if(order.paymentStatus==='Confirmed') {
    if(order.providerPaymentId && order.providerPaymentId!==paymentId) {
      await Order.updateOne({_id:order._id},{$set:{requiresReview:true}});
      return {requiresReview:true};
    }
    return {confirmed:true,duplicate:true};
  }
  const confirmed=await Order.findOneAndUpdate({
    _id:order._id,paymentMethod:{$ne:'cash'},paymentStatus:{$ne:'Confirmed'},orderStatus:{$ne:'Cancelled'}
  },{$set:{paymentStatus:'Confirmed',providerPaymentId:paymentId,gatewayMethod:String(remote.method||'').slice(0,30),paidAt:new Date(),requiresReview:false}},{new:true});
  if (!confirmed && order.orderStatus==='Cancelled') {
    await Order.updateOne({_id:order._id},{$set:{requiresReview:true,providerPaymentId:paymentId}});
    return {requiresReview:true};
  }
  await PaymentAttempt.updateOne({_id:attempt._id},{$set:{status:'confirmed',providerPaymentId:paymentId}});
  return {confirmed:true};
}
async function markProviderFailure(providerOrderId,paymentId) {
  const attempt=await PaymentAttempt.findOne({providerOrderId});
  if (!attempt) return;
  await PaymentAttempt.updateOne({_id:attempt._id,status:{$ne:'confirmed'}},{$set:{status:'failed',providerPaymentId:paymentId}});
  await Order.updateOne({_id:attempt.order,paymentStatus:'Pending',orderStatus:'Placed'},{$set:{paymentStatus:'Failed'}});
  // The customer can retry via the same provider order ID from their order page.
}
module.exports={ready,client,checkSignature,createPaymentOrder,confirmProviderPayment,markProviderFailure};
