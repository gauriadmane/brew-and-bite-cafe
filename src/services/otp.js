const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const {HandoverOtp,Order,Table,User}=require('../models');
const {ensure,AppError}=require('../utils/http');
const {emailOrderOtp}=require('./notifier');
const OTP_LIFETIME=5*60*1000;
async function issueOtp(order, sendEmail=false) {
  ensure(order.orderStatus==='Ready',409,'Order must be ready before issuing a collection code.');
  const otp=String(crypto.randomInt(0,1000000)).padStart(6,'0');
  const hash=await bcrypt.hash(otp,10);
  await HandoverOtp.findOneAndUpdate({order:order._id},{
    $set:{hash,expiresAt:new Date(Date.now()+OTP_LIFETIME),attempts:0,usedAt:null,issuedAt:new Date()}
  },{upsert:true,new:true});
  if (sendEmail) {
    const user=await User.findById(order.customer).select('email');
    if (user) await emailOrderOtp(user.email,order.orderNumber,otp);
  }
  return otp;
}
async function requestCustomerOtp(order, userId) {
  ensure(String(order.customer)===String(userId),403,'This is not your order.');
  ensure(order.orderStatus==='Ready',409,'Collection code is available after your order is ready.');
  const existing=await HandoverOtp.findOne({order:order._id}).lean();
  ensure(!existing?.lastCustomerRequestedAt || Date.now()-new Date(existing.lastCustomerRequestedAt).getTime()>=30000,429,'Wait 30 seconds before requesting another code.');
  const code=await issueOtp(order,false);
  await HandoverOtp.updateOne({order:order._id},{$set:{lastCustomerRequestedAt:new Date()}});
  return code;
}
async function verifyHandover(orderId,code) {
  const order=await Order.findById(orderId);
  ensure(order,404,'Order not found.');
  ensure(order.orderStatus==='Ready',409,'Only ready orders can be handed over.');
  ensure(order.paymentStatus==='Confirmed',409,'Payment must be confirmed first.');
  const record=await HandoverOtp.findOne({order:orderId});
  ensure(record && !record.usedAt,400,'No active code. Customer must request a new code.');
  ensure(record.expiresAt>new Date(),400,'Code has expired.');
  ensure(record.attempts<5,429,'Too many incorrect attempts. Customer must request a new code.');
  const claimed=await HandoverOtp.findOneAndUpdate({
    _id:record._id,usedAt:null,attempts:{$lt:5},expiresAt:{$gt:new Date()}
  },{$inc:{attempts:1}},{new:true});
  ensure(claimed,409,'Code expired or no longer available.');
  const good=await bcrypt.compare(code,claimed.hash);
  if (!good) throw new AppError(400,'Incorrect code.');
  const done=await Order.findOneAndUpdate({_id:orderId,orderStatus:'Ready',paymentStatus:'Confirmed'},
    {$set:{orderStatus:'Completed',completedAt:new Date()}},{new:true});
  ensure(done,409,'Order could not be completed. Contact the owner.');
  await HandoverOtp.updateOne({_id:record._id,usedAt:null},{$set:{usedAt:new Date()}});
  await Table.updateOne({_id:done.table,occupiedBy:done._id},{$set:{occupiedBy:null}});
  return done;
}
module.exports={issueOtp,requestCustomerOtp,verifyHandover};
