const express=require('express');
const {User,Category,MenuItem,MenuPhoto,Table,Offer,Order}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const {parse,menuItem,category,table,offer,objectId,z}=require('../utils/validation');
const {validateMenuImage}=require('../utils/menu-image');
const router=express.Router();
router.use(requireUser,roles('owner'));
const slugify=s=>s.trim().toLowerCase().replace(/[^a-z\d]+/g,'-').replace(/^-|-$/g,'');
router.get('/summary',asyncRoute(async(req,res)=>{
  const now=new Date(),ist=new Date(now.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  const start=new Date(now.getTime()-(ist.getHours()*3600+ist.getMinutes()*60+ist.getSeconds())*1000-ist.getMilliseconds());
  const [totalOrders,todayOrders,pendingOrders,summary]=await Promise.all([
    Order.countDocuments(),Order.countDocuments({createdAt:{$gte:start}}),
    Order.countDocuments({orderStatus:'Placed'}),
    Order.aggregate([{$match:{paymentStatus:'Confirmed',paidAt:{$gte:start}}},
      {$group:{_id:null,total:{$sum:'$totalPaise'},count:{$sum:1}}}])
  ]);
  res.json({ok:true,totalOrders,todayOrders,pendingOrders,todayRevenuePaise:summary[0]?.total||0,
    todayPaidOrders:summary[0]?.count||0});
}));
router.get('/categories',asyncRoute(async(req,res)=>res.json({ok:true,categories:await Category.find().sort({name:1}).lean()})));
router.post('/categories',asyncRoute(async(req,res)=>{
  const data=parse(category,req.body);
  const created=await Category.create({...data,slug:slugify(data.name)});
  res.status(201).json({ok:true,category:created});
}));
router.patch('/categories/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const data=parse(category.partial().extend({active:z.boolean().optional()}),req.body);
  if(data.name) data.slug=slugify(data.name);
  const updated=await Category.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});
  ensure(updated,404,'Category not found.');res.json({ok:true,category:updated});
}));
router.get('/menu',asyncRoute(async(req,res)=>{
  const items=await MenuItem.find().populate('category','name').sort({createdAt:-1}).limit(250).lean();res.json({ok:true,items});
}));
router.post('/menu',asyncRoute(async(req,res)=>{
  const data=parse(menuItem,req.body);
  ensure(await Category.exists({_id:data.category,active:true}),400,'Category is not active.');
  const item=await MenuItem.create(data);res.status(201).json({ok:true,item});
}));
router.patch('/menu/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id),data=parse(menuItem.partial(),req.body);
  if(data.category) ensure(await Category.exists({_id:data.category,active:true}),400,'Category is not active.');
  const item=await MenuItem.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});
  ensure(item,404,'Item not found.');res.json({ok:true,item});
}));
router.delete('/menu/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const item=await MenuItem.findByIdAndUpdate(id,{$set:{active:false,available:false}},{new:true});
  ensure(item,404,'Item not found.');res.json({ok:true,item});
}));
// Owner-only upload: the browser sends a compressed JPEG Blob, not a URL or filesystem path.
router.post('/menu/:id/image',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  ensure(await MenuItem.exists({_id:id,active:true}),404,'Active menu item not found.');
  ensure(req.is('image/jpeg'),415,'Upload must be a JPEG image.');
  const bytes=validateMenuImage(req.body);
  await MenuPhoto.findOneAndUpdate({menuItem:id},{$set:{bytes,contentType:'image/jpeg'}},{upsert:true,new:true,runValidators:true});
  const item=await MenuItem.findByIdAndUpdate(id,{$inc:{imageVersion:1}},{new:true});
  res.json({ok:true,imageVersion:item.imageVersion,message:'Product photo saved.'});
}));
router.delete('/menu/:id/image',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  ensure(await MenuItem.exists({_id:id}),404,'Menu item not found.');
  await MenuPhoto.deleteOne({menuItem:id});
  await MenuItem.updateOne({_id:id},{$set:{imageVersion:0}});
  res.json({ok:true,message:'Custom photo removed. Default illustration restored.'});
}));
router.get('/tables',asyncRoute(async(req,res)=>res.json({ok:true,tables:await Table.find().sort({number:1}).lean()})));
router.post('/tables',asyncRoute(async(req,res)=>{
  const data=parse(table,req.body);const created=await Table.create(data);res.status(201).json({ok:true,table:created});
}));
router.patch('/tables/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id),data=parse(table.partial(),req.body);
  const updated=await Table.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});
  ensure(updated,404,'Table not found.');res.json({ok:true,table:updated});
}));
// Offers can be public, restricted to selected customers, or restricted to weekly regulars.
async function validateOfferTargets(data){
  if(data.audience!=='selected'){data.eligibleCustomers=[];return data;}
  const count=await User.countDocuments({_id:{$in:data.eligibleCustomers},role:'customer',active:true});
  ensure(count===data.eligibleCustomers.length,400,'One or more selected customers are missing or inactive.');
  return data;
}
async function validateCombo(data){
  if(data.type!=='combo')return;
  const ids=[...new Set(data.comboItems.map(i=>i.menuItem))];
  ensure(ids.length===data.comboItems.length,400,'Duplicate combo items.');
  ensure(await MenuItem.countDocuments({_id:{$in:ids},active:true})===ids.length,400,'Combo contains a missing item.');
}
router.get('/offers',asyncRoute(async(req,res)=>res.json({ok:true,offers:await Offer.find().sort({createdAt:-1}).lean()})));
router.post('/offers',asyncRoute(async(req,res)=>{
  const data=await validateOfferTargets(parse(offer,req.body));
  await validateCombo(data);
  const created=await Offer.create(data);res.status(201).json({ok:true,offer:created});
}));
router.patch('/offers/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const existing=await Offer.findById(id).lean();ensure(existing,404,'Offer not found.');
  // Normalize MongoDB ObjectIds into strings before the same Zod validation as POST.
  const merged={
    code:existing.code,type:existing.type,value:existing.value,
    minimumPaise:existing.minimumPaise,expiresAt:existing.expiresAt.toISOString(),
    active:existing.active,comboPricePaise:existing.comboPricePaise,
    comboItems:(existing.comboItems||[]).map(x=>({menuItem:String(x.menuItem),quantity:x.quantity})),
    audience:existing.audience||'all',
    eligibleCustomers:(existing.eligibleCustomers||[]).map(String),
    ...req.body
  };
  const data=await validateOfferTargets(parse(offer,merged));
  await validateCombo(data);
  const updated=await Offer.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});
  res.json({ok:true,offer:updated});
}));
router.get('/staff',asyncRoute(async(req,res)=>{
  const staff=await User.find({role:'staff'}).select('name email approval active createdAt').sort({createdAt:-1}).lean();
  res.json({ok:true,staff});
}));
router.patch('/staff/:id',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id),{approval}=parse(z.object({approval:z.enum(['approved','rejected'])}),req.body);
  const staff=await User.findOneAndUpdate({_id:id,role:'staff'},{$set:{approval}},{new:true});
  ensure(staff,404,'Staff request not found.');res.json({ok:true,staff:{id:staff._id,approval:staff.approval}});
}));
router.get('/orders',asyncRoute(async(req,res)=>{
  const status=String(req.query.status||'');
  const filter=['Placed','Accepted','Preparing','Ready','Completed','Cancelled'].includes(status)?{orderStatus:status}:{};
  const page=Math.min(100,Math.max(1,Number.parseInt(req.query.page,10)||1));
  const [orders,total]=await Promise.all([
    Order.find(filter).populate('customer','name email').sort({createdAt:-1}).skip((page-1)*30).limit(30).lean(),
    Order.countDocuments(filter)
  ]);
  res.json({ok:true,orders,total,page,pages:Math.ceil(total/30)});
}));
router.patch('/orders/:id/status',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id),{status}=parse(z.object({status:z.enum(['Accepted','Cancelled'])}),req.body);
  if(status==='Accepted') {
    const order=await Order.findOneAndUpdate({_id:id,orderStatus:'Placed',
      $or:[{paymentMethod:'cash'},{paymentStatus:'Confirmed'}]},{$set:{orderStatus:'Accepted'}},{new:true});
    ensure(order,409,'Online orders must be paid and placed before acceptance.');
    return res.json({ok:true,order});
  }
  const order=await Order.findOneAndUpdate({_id:id,orderStatus:{$in:['Placed','Accepted']},paymentStatus:{$in:['Pending','Failed']}},
    {$set:{orderStatus:'Cancelled',cancelledAt:new Date()}},{new:true});
  ensure(order,409,'Cannot cancel this order. Paid orders require a separate refund process.');
  await Table.updateOne({_id:order.table,occupiedBy:order._id},{$set:{occupiedBy:null}});
  res.json({ok:true,order});
}));
router.post('/orders/:id/confirm-cash',asyncRoute(async(req,res)=>{
  const id=parse(objectId,req.params.id);
  const order=await Order.findOneAndUpdate({_id:id,paymentMethod:'cash',paymentStatus:'Pending',orderStatus:{$nin:['Cancelled']}},
    {$set:{paymentStatus:'Confirmed',paidAt:new Date()}},{new:true});
  ensure(order,409,'Cash payment cannot be confirmed for this order.');
  res.json({ok:true,order});
}));
module.exports=router;
