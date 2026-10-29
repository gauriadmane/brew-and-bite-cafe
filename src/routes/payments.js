const express=require('express');
const crypto=require('crypto');
const {rateLimit}=require('express-rate-limit');
const {Order,WebhookEvent}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const {parse,objectId,z}=require('../utils/validation');
const {createPaymentOrder,checkSignature,confirmProviderPayment,markProviderFailure}=require('../services/payments');
const router=express.Router();
router.use(requireUser,roles('customer'));
router.use(rateLimit({windowMs:60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false,
  message:{ok:false,error:'Please slow down.'}}));
router.post('/:id/create',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const order=await Order.findOne({_id:id,customer:req.user._id});
  ensure(order,404,'Order not found.');
  const checkout=await createPaymentOrder(order);
  res.json({ok:true,...checkout,orderNumber:order.orderNumber});
}));
router.post('/:id/verify',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const data=parse(z.object({razorpay_order_id:z.string(),razorpay_payment_id:z.string(),razorpay_signature:z.string()}),req.body);
  const order=await Order.findOne({_id:id,customer:req.user._id});
  ensure(order&&order.paymentMethod!=='cash',404,'Online order not found.');
  ensure(order.providerOrderId&&order.providerOrderId===data.razorpay_order_id,400,'Unexpected gateway order ID.');
  ensure(checkSignature(order.providerOrderId,data.razorpay_payment_id,data.razorpay_signature,process.env.RAZORPAY_KEY_SECRET),400,'Invalid payment signature.');
  const result=await confirmProviderPayment(order.providerOrderId,data.razorpay_payment_id);
  res.json({ok:true,...result});
}));
async function webhook(req,res) {
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
  ensure(secret,503,'Webhook is not configured.');
  const sig=req.get('x-razorpay-signature')||'';
  ensure(/^[a-f\d]{64}$/i.test(sig),400,'Invalid webhook signature.');
  const expected=crypto.createHmac('sha256',secret).update(req.body).digest('hex');
  ensure(crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(sig)),400,'Invalid webhook signature.');
  const data=JSON.parse(req.body.toString('utf8'));
  const eventId=req.get('x-razorpay-event-id')||crypto.createHash('sha256').update(req.body).digest('hex');
  const event=await WebhookEvent.findOneAndUpdate({eventId},
    {$setOnInsert:{eventId,kind:String(data.event||'').slice(0,100)}},
    {upsert:true,new:true});
  if(event.processedAt) return res.json({ok:true,duplicate:true});
  const payment=data.payload?.payment?.entity;
  if(data.event==='payment.captured'&&payment?.order_id) await confirmProviderPayment(payment.order_id,payment.id);
  if(data.event==='payment.failed'&&payment?.order_id) await markProviderFailure(payment.order_id,payment.id);
  await WebhookEvent.updateOne({eventId},{$set:{processedAt:new Date()}});
  res.json({ok:true});
}
module.exports={router,webhook:asyncRoute(webhook)};
