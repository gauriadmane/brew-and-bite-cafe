const express=require('express');
const {Types}=require('mongoose');
const {User,Order}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const {parse,objectId}=require('../utils/validation');
const {weeklyStart,MIN_ORDERS}=require('../services/loyalty');
const router=express.Router();
router.use(requireUser,roles('owner'));

const quoteRegex=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function customerSearch(q){
  const value=String(q||'').trim().slice(0,60);
  if(!value)return {};
  const expression=new RegExp(quoteRegex(value),'i');
  return {$or:[{name:expression},{email:expression},{phone:expression}]};
}
async function aggregates(ids,now=new Date()){
  if(!ids.length)return new Map();
  const [weekly,paid,all]=await Promise.all([
    Order.aggregate([{$match:{customer:{$in:ids},orderStatus:'Completed',paymentStatus:'Confirmed',completedAt:{$gte:weeklyStart(now),$lte:now}}},
      {$group:{_id:'$customer',count:{$sum:1},amount:{$sum:'$totalPaise'}}}]),
    Order.aggregate([{$match:{customer:{$in:ids},paymentStatus:'Confirmed'}},
      {$group:{_id:'$customer',count:{$sum:1},amount:{$sum:'$totalPaise'}}}]),
    Order.aggregate([{$match:{customer:{$in:ids}}},{$group:{_id:'$customer',count:{$sum:1},last:{$max:'$createdAt'}}}])
  ]);
  const map=new Map(ids.map(id=>[String(id),{weeklyCompletedOrders:0,weeklyPaidPaise:0,
    paidOrders:0,lifetimePaidPaise:0,totalOrders:0,lastOrderAt:null}]));
  for(const row of weekly){const m=map.get(String(row._id));if(m){m.weeklyCompletedOrders=row.count;m.weeklyPaidPaise=row.amount;}}
  for(const row of paid){const m=map.get(String(row._id));if(m){m.paidOrders=row.count;m.lifetimePaidPaise=row.amount;}}
  for(const row of all){const m=map.get(String(row._id));if(m){m.totalOrders=row.count;m.lastOrderAt=row.last;}}
  for(const m of map.values())m.isRegular=m.weeklyCompletedOrders>=MIN_ORDERS;
  return map;
}

// The lookup route supports selecting specific customers in an offer editor.
router.get('/customers/lookup',asyncRoute(async(req,res)=>{
  const users=await User.find({role:'customer',active:true,...customerSearch(req.query.q)})
    .select('name email').sort({name:1,_id:1}).limit(100).lean();
  res.json({ok:true,customers:users});
}));

router.get('/customers',asyncRoute(async(req,res)=>{
  const page=Math.min(1000,Math.max(1,Number.parseInt(req.query.page,10)||1));
  const limit=Math.min(25,Math.max(1,Number.parseInt(req.query.limit,10)||15));
  const segment=String(req.query.segment||'all');
  ensure(['all','regular'].includes(segment),400,'Invalid customer filter.');
  const filter={role:'customer',...customerSearch(req.query.q)};
  if(segment==='regular'){
    // Selected-customer search remains database backed; no browser-maintained VIP flag.
    const regularIds=await Order.aggregate([
      {$match:{orderStatus:'Completed',paymentStatus:'Confirmed',completedAt:{$gte:weeklyStart()}}},
      {$group:{_id:'$customer',count:{$sum:1}}},{$match:{count:{$gte:MIN_ORDERS}}}
    ]);
    filter._id={$in:regularIds.map(x=>x._id)};
  }
  const [users,total]=await Promise.all([
    User.find(filter).select('name email phone active createdAt').sort({createdAt:-1,_id:-1})
      .skip((page-1)*limit).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  const stats=await aggregates(users.map(u=>u._id));
  res.json({ok:true,page,pages:Math.ceil(total/limit),total,regularThreshold:MIN_ORDERS,
    windowDays:7,customers:users.map(u=>({...u,...stats.get(String(u._id))}))});
}));

router.get('/customers/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const user=await User.findOne({_id:id,role:'customer'})
    .select('name email phone active createdAt').lean();
  ensure(user,404,'Customer not found.');
  const [stats,orders]=await Promise.all([
    aggregates([new Types.ObjectId(id)]),
    Order.find({customer:id}).select('orderNumber items tableNumber paymentMethod paymentStatus orderStatus totalPaise offerCode createdAt completedAt')
      .sort({createdAt:-1}).limit(25).lean()
  ]);
  res.json({ok:true,customer:{...user,...stats.get(id)},orders});
}));
module.exports=router;
