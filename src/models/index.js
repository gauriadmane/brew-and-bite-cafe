const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const oid = { type: Schema.Types.ObjectId, required: true };
const User = model('User', new Schema({
  name: {type:String,required:true,trim:true}, email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  passwordHash:{type:String,required:true,select:false}, role:{type:String,enum:['customer','owner','staff'],default:'customer'},
  approval:{type:String,enum:['pending','approved','rejected'],default:'approved'},
  phone:{type:String,default:''}, active:{type:Boolean,default:true}
},{timestamps:true}));
const Category = model('Category',new Schema({
  name:{type:String,required:true,trim:true}, slug:{type:String,required:true,unique:true}, active:{type:Boolean,default:true}
},{timestamps:true}));
const MenuItem = model('MenuItem',new Schema({
  name:{type:String,required:true},description:{type:String,default:''},category:{type:Schema.Types.ObjectId,ref:'Category',required:true,index:true},
  pricePaise:{type:Number,min:100,required:true},imageKey:{type:String,default:'coffee'},
  imageVersion:{type:Number,default:0,min:0},
  available:{type:Boolean,default:true},active:{type:Boolean,default:true}
},{timestamps:true}));
// Photos are stored in MongoDB, not on Render's temporary filesystem.
// One compressed JPEG per menu item, kept separate from API product JSON.
const MenuPhoto = model('MenuPhoto',new Schema({
  menuItem:{type:Schema.Types.ObjectId,ref:'MenuItem',required:true,unique:true},
  bytes:{type:Buffer,required:true},contentType:{type:String,enum:['image/jpeg'],default:'image/jpeg'}
},{timestamps:true}));
const Table = model('Table',new Schema({
  number:{type:String,required:true,unique:true},active:{type:Boolean,default:true},
  occupiedBy:{type:Schema.Types.ObjectId,ref:'Order',default:null,index:true}
},{timestamps:true}));
const Offer = model('Offer',new Schema({
  code:{type:String,required:true,unique:true,uppercase:true},type:{type:String,enum:['percent','fixed','combo'],required:true},
  value:{type:Number,default:0},minimumPaise:{type:Number,default:0},
  expiresAt:{type:Date,required:true},active:{type:Boolean,default:true},
  comboPricePaise:{type:Number,default:0},
  comboItems:[{menuItem:{type:Schema.Types.ObjectId,ref:'MenuItem'},quantity:Number,_id:false}],
  audience:{type:String,enum:['all','selected','regular'],default:'all',index:true},
  eligibleCustomers:[{type:Schema.Types.ObjectId,ref:'User'}]
},{timestamps:true}));
const orderItem = new Schema({menuItem:{type:Schema.Types.ObjectId,ref:'MenuItem'},
  name:String,unitPricePaise:Number,quantity:Number,lineTotalPaise:Number},{_id:false});
const Order = model('Order',new Schema({
  orderNumber:{type:String,required:true,unique:true},customer:{...oid,ref:'User',index:true},
  items:[orderItem],table:{...oid,ref:'Table'},tableNumber:String,
  instructions:{type:String,default:''},paymentMethod:{type:String,enum:['cash','upi','card'],required:true},
  paymentStatus:{type:String,enum:['Pending','Confirmed','Failed','Expired'],default:'Pending',index:true},
  orderStatus:{type:String,enum:['Placed','Accepted','Preparing','Ready','Completed','Cancelled'],default:'Placed',index:true},
  subtotalPaise:Number,discountPaise:Number,taxPaise:Number,totalPaise:Number,taxBps:Number,offerCode:String,
  providerOrderId:{type:String,default:''},providerPaymentId:{type:String,default:''},
  gatewayMethod:{type:String,default:''},
  paidAt:Date,readyAt:Date,completedAt:Date,cancelledAt:Date,expiresAt:Date,
  requiresReview:{type:Boolean,default:false}
},{timestamps:true}));
Order.schema.index({createdAt:-1});
Order.schema.index({customer:1,completedAt:-1,orderStatus:1,paymentStatus:1});
const PaymentAttempt = model('PaymentAttempt',new Schema({
  order:{...oid,ref:'Order',unique:true},providerOrderId:{type:String,required:true,unique:true},
  providerPaymentId:{type:String,default:''},status:{type:String,enum:['created','confirmed','failed'],default:'created'},
  failureReason:String
},{timestamps:true}));
const HandoverOtp = model('HandoverOtp',new Schema({
  order:{...oid,ref:'Order',unique:true},hash:{type:String,required:true},
  expiresAt:{type:Date,required:true},attempts:{type:Number,default:0},
  usedAt:{type:Date,default:null},issuedAt:{type:Date,default:Date.now},lastCustomerRequestedAt:{type:Date,default:null}
},{timestamps:true}));
const WebhookEvent = model('WebhookEvent',new Schema({
  eventId:{type:String,required:true,unique:true},kind:String,processedAt:{type:Date,default:null}
},{timestamps:true}));
module.exports = {User,Category,MenuItem,MenuPhoto,Table,Offer,Order,PaymentAttempt,HandoverOtp,WebhookEvent};
