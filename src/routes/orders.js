const express=require('express');
const {Types}=require('mongoose');
const crypto=require('crypto');
const {Order,Table}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const {parse,orderInput,objectId}=require('../utils/validation');
const {priceCart}=require('../services/billing');
const {requestCustomerOtp}=require('../services/otp');
const router=express.Router();
router.use(requireUser,roles('customer'));
router.post('/preview',asyncRoute(async(req,res)=>{
  const body=parse(orderInput,req.body);
  const quote=await priceCart(body,req.user._id);
  res.json({ok:true,items:quote.lines,tableNumber:quote.table.number,...quote.totals,offerCode:quote.offerCode});
}));
router.post('/',asyncRoute(async(req,res)=>{
  const body=parse(orderInput,req.body);
  const quote=await priceCart(body,req.user._id);
  const _id=new Types.ObjectId();
  const table=await Table.findOneAndUpdate({_id:body.table,active:true,occupiedBy:null},{$set:{occupiedBy:_id}},{new:true});
  ensure(table,409,'Table was booked by someone else. Select another table.');
  try {
    const orderNumber=`BB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [order]=await Order.create([{
      _id,orderNumber,customer:req.user._id,items:quote.lines,table:table._id,tableNumber:table.number,
      instructions:body.instructions,paymentMethod:body.paymentMethod,offerCode:quote.offerCode,
      ...quote.totals,
      expiresAt:body.paymentMethod==='cash'?undefined:new Date(Date.now()+30*60*1000)
    }]);
    res.status(201).json({ok:true,order});
  } catch(err) {
    await Table.updateOne({_id:table._id,occupiedBy:_id},{$set:{occupiedBy:null}});
    throw err;
  }
}));
router.get('/',asyncRoute(async(req,res)=>{
  const page=Math.min(100,Math.max(1,Number(req.query.page)||1));
  const [orders,total]=await Promise.all([
    Order.find({customer:req.user._id}).sort({createdAt:-1}).skip((page-1)*20).limit(20).lean(),
    Order.countDocuments({customer:req.user._id})
  ]);
  res.json({ok:true,orders,page,pages:Math.ceil(total/20)});
}));
router.get('/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const order=await Order.findOne({_id:id,customer:req.user._id}).lean();
  ensure(order,404,'Order not found.');
  res.json({ok:true,order});
}));
router.post('/:id/cancel',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const order=await Order.findOneAndUpdate({_id:id,customer:req.user._id,orderStatus:'Placed',paymentStatus:{$in:['Pending','Failed']}},
    {$set:{orderStatus:'Cancelled',cancelledAt:new Date()}},{new:true});
  ensure(order,409,'Order cannot be cancelled. Contact the owner for paid orders.');
  await Table.updateOne({_id:order.table,occupiedBy:order._id},{$set:{occupiedBy:null}});
  res.json({ok:true,order});
}));
router.post('/:id/otp',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const order=await Order.findOne({_id:id,customer:req.user._id});
  ensure(order,404,'Order not found.');
  const otp=await requestCustomerOtp(order,req.user._id);
  res.json({ok:true,otp,expiresInSeconds:300,message:'Share this code only at the café counter.'});
}));
module.exports=router;
