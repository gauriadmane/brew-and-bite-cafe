const express=require('express');
const {MenuItem,MenuPhoto,Category,Table,Offer}=require('../models');
const {asyncRoute}=require('../utils/http');
const {parse,orderInput,objectId}=require('../utils/validation');
const {priceCart}=require('../services/billing');
const {requireUser,roles}=require('../middleware/auth');
const {regularOrderCount,eligibleForOffer}=require('../services/loyalty');
const router=express.Router();
router.get('/payment-options',(req,res)=>{
  const key=process.env.RAZORPAY_KEY_ID||'';
  const configured=Boolean(key&&process.env.RAZORPAY_KEY_SECRET);
  const mode=key.startsWith('rzp_test_')?'test':key.startsWith('rzp_live_')?'live':'unknown';
  res.json({ok:true,onlineAvailable:configured&&mode==='test',mode:configured?mode:'unconfigured'});
});
router.get('/categories',asyncRoute(async(req,res)=>{
  const categories=await Category.find({active:true}).sort({name:1}).lean();
  res.json({ok:true,categories});
}));
router.get('/menu',asyncRoute(async(req,res)=>{
  const page=Math.min(1000,Math.max(1,Number.parseInt(req.query.page,10)||1));
  const limit=Math.min(36,Math.max(1,Number.parseInt(req.query.limit,10)||12));
  const activeCategoryIds=await Category.distinct('_id',{active:true});
  const filter={active:true,category:{$in:activeCategoryIds}};
  const search=String(req.query.q||'').trim().slice(0,80);
  if(search) filter.name={$regex:search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
  if(req.query.category&&/^[a-f\d]{24}$/i.test(req.query.category)) filter.category={$in:activeCategoryIds.filter(x=>String(x)===String(req.query.category).toLowerCase())};
  if(req.query.available==='true') filter.available=true;
  const [items,total]=await Promise.all([
    MenuItem.find(filter).populate('category','name').sort({name:1}).skip((page-1)*limit).limit(limit).lean(),
    MenuItem.countDocuments(filter)
  ]);
  res.json({ok:true,items,total,page,pages:Math.ceil(total/limit)});
}));
// Public image endpoint; bytes are streamed from MongoDB (works on free ephemeral hosting).
router.get('/menu-images/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const photo=await MenuPhoto.findOne({menuItem:id}).select('bytes').lean();
  if(!photo)return res.status(404).end();
  res.set('Content-Type','image/jpeg');
  res.set('X-Content-Type-Options','nosniff');
  res.set('Cache-Control','public, max-age=3600');
  res.end(photo.bytes);
}));
router.get('/tables',asyncRoute(async(req,res)=>{
  const tables=await Table.find({active:true}).sort({number:1}).lean();
  res.json({ok:true,tables:tables.map(t=>({_id:t._id,number:t.number,available:!t.occupiedBy}))});
}));
router.post('/offers/validate',requireUser,roles('customer'),asyncRoute(async(req,res)=>{
  const body=parse(orderInput,req.body);
  const priced=await priceCart(body,req.user._id);
  res.json({ok:true,...priced.totals,offerCode:priced.offerCode});
}));
// Guests only see public codes. A customer gets their own eligible private offers.
router.get('/offers/mine',requireUser,roles('customer'),asyncRoute(async(req,res)=>{
  const offers=await Offer.find({active:true,expiresAt:{$gt:new Date()}})
    .select('code type minimumPaise expiresAt value audience eligibleCustomers')
    .sort({createdAt:-1}).limit(200).lean();
  const weekly=offers.some(o=>o.audience==='regular')?await regularOrderCount(req.user._id):0;
  const eligible=offers.filter(o=>eligibleForOffer(o,req.user._id,weekly)).slice(0,30);
  res.json({ok:true,offers:eligible.map(({eligibleCustomers,...o})=>o),weeklyCompletedOrders:weekly,regular:weekly>=5});
}));
router.get('/offers',asyncRoute(async(req,res)=>{
  const offers=await Offer.find({active:true,expiresAt:{$gt:new Date()},
    $or:[{audience:'all'},{audience:{$exists:false}}]})
    .select('code type minimumPaise expiresAt value').limit(12).lean();
  res.json({ok:true,offers});
}));
module.exports=router;
