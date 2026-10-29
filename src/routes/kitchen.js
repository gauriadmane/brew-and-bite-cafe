const express=require('express');
const {Order}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const {parse,objectId,z}=require('../utils/validation');
const {issueOtp,verifyHandover}=require('../services/otp');
const router=express.Router();
router.use(requireUser,roles('staff','owner'));
router.get('/orders',asyncRoute(async(req,res)=>{
  const orders=await Order.find({orderStatus:{$in:['Accepted','Preparing','Ready']},
    $or:[{paymentMethod:'cash'},{paymentStatus:'Confirmed'}]})
    .select('orderNumber items.name items.quantity tableNumber instructions orderStatus paymentMethod paymentStatus createdAt').sort({createdAt:1}).limit(80).lean();
  res.json({ok:true,orders});
}));
router.patch('/orders/:id/status',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const {status}=parse(z.object({status:z.enum(['Preparing','Ready'])}),req.body);
  const prior=status==='Preparing'?'Accepted':'Preparing';
  const order=await Order.findOneAndUpdate({_id:id,orderStatus:prior,
    $or:[{paymentMethod:'cash'},{paymentStatus:'Confirmed'}]},
    {$set:{orderStatus:status,...status==='Ready'?{readyAt:new Date()}: {}}},{new:true});
  ensure(order,409,`Order must be ${prior.toLowerCase()} and eligible for preparation.`);
  if(status==='Ready') await issueOtp(order,true);
  res.json({ok:true,order:{id:order._id,orderNumber:order.orderNumber,orderStatus:order.orderStatus}});
}));
router.post('/orders/:id/handover',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const {otp}=parse(z.object({otp:z.string().regex(/^\d{6}$/)}),req.body);
  const order=await verifyHandover(id,otp);
  res.json({ok:true,order:{id:order._id,orderNumber:order.orderNumber,orderStatus:order.orderStatus}});
}));
module.exports=router;
