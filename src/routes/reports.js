const express=require('express');
const {Order}=require('../models');
const {requireUser,roles}=require('../middleware/auth');
const {asyncRoute,ensure}=require('../utils/http');
const router=express.Router();
router.use(requireUser,roles('owner'));
function range(req) {
  const today=new Date();
  const start=req.query.from?new Date(`${req.query.from}T00:00:00+05:30`):new Date(today.getTime()-30*86400000);
  const end=req.query.to?new Date(`${req.query.to}T23:59:59.999+05:30`):today;
  ensure(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end>=start,400,'Invalid date range.');
  ensure(end-start<=366*86400000,400,'Date range must be 366 days or less.');
  return {paidAt:{$gte:start,$lte:end},paymentStatus:'Confirmed'};
}
async function report(req) {
  const match=range(req);
  const [daily,methods,items,totals]=await Promise.all([
    Order.aggregate([{$match:match},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$paidAt',timezone:'Asia/Kolkata'}},revenuePaise:{$sum:'$totalPaise'},orders:{$sum:1}}},{$sort:{_id:1}}]),
    Order.aggregate([{$match:match},{$group:{_id:{$cond:[{$gt:[{$strLenCP:{$ifNull:['$gatewayMethod','']}},0]},'$gatewayMethod','$paymentMethod']},revenuePaise:{$sum:'$totalPaise'},orders:{$sum:1}}}]),
    Order.aggregate([{$match:match},{$unwind:'$items'},{$group:{_id:'$items.name',quantity:{$sum:'$items.quantity'},grossPaise:{$sum:'$items.lineTotalPaise'}}},{$sort:{quantity:-1}},{$limit:25}]),
    Order.aggregate([{$match:match},{$group:{_id:null,revenuePaise:{$sum:'$totalPaise'},orders:{$sum:1}}}])
  ]);
  return {daily,methods,items,total:totals[0]||{revenuePaise:0,orders:0}};
}
router.get('/',asyncRoute(async(req,res)=>res.json({ok:true,...await report(req)})));
function cell(x) {
  let value=String(x??'');
  if(/^[=+@\-\t\r]/.test(value)) value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
}
router.get('/csv',asyncRoute(async(req,res)=>{
  const data=await report(req);
  const rows=[['Date','Paid Orders','Confirmed Revenue INR'],...data.daily.map(x=>[x._id,x.orders,(x.revenuePaise/100).toFixed(2)])];
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="brew-and-bite-sales.csv"');
  res.send('\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n'));
}));
module.exports=router;
