require('dotenv').config();
const {assertEnv}=require('../src/config/env');
const {connectDb}=require('../src/config/db');
const {Category,MenuItem,Table,Offer}=require('../src/models');
const mongoose=require('mongoose');
const items=[
 ['Espresso','Coffee','Bold, concentrated coffee with a rich aroma.',9500,'coffee'],
 ['Café Latte','Coffee','Silky steamed milk poured over smooth espresso.',16500,'coffee'],
 ['Cappuccino','Coffee','Creamy espresso with a soft cloud of milk foam.',15500,'coffee'],
 ['Masala Chai','Tea','A cozy cup of Indian spiced tea.',8500,'tea'],
 ['Iced Lemon Tea','Tea','Bright, refreshing tea with a citrus twist.',12000,'tea'],
 ['Butter Croissant','Bakery','Golden, flaky pastry baked until buttery.',13000,'pastry'],
 ['Chocolate Brownie','Desserts','Fudgy chocolate brownie for a sweet pause.',15500,'dessert'],
 ['Grilled Veg Sandwich','Sandwiches','Toasty vegetables and melty cheese.',18500,'sandwich'],
 ['Classic Club Sandwich','Sandwiches','Triple-layer comfort with crisp vegetables.',21500,'sandwich'],
 ['Mango Cooler','Cold Drinks','Tropical mango refreshment served chilled.',14500,'juice'],
 ['Blueberry Cheesecake','Desserts','Creamy cheesecake with a berry finish.',22500,'dessert'],
 ['Cold Coffee','Cold Drinks','Chilled and creamy with a gentle coffee kick.',17500,'coffee']
];
async function run(){
 assertEnv();await connectDb();
 const categories={};
 for(const name of ['Coffee','Tea','Bakery','Desserts','Sandwiches','Cold Drinks']){
   const slug=name.toLowerCase().replace(/\s+/g,'-');
   categories[name]=await Category.findOneAndUpdate({slug},{$setOnInsert:{name,slug,active:true}},{upsert:true,new:true});
 }
 for(const [name,category,description,pricePaise,imageKey] of items){
   if(!await MenuItem.exists({name})) await MenuItem.create({name,description,pricePaise,imageKey,category:categories[category]._id});
 }
 for(let i=1;i<=8;i++)await Table.updateOne({number:`T${i}`},{$setOnInsert:{number:`T${i}`,active:true}},{upsert:true});
 await Offer.updateOne({code:'WELCOME10'},{$setOnInsert:{code:'WELCOME10',type:'percent',value:10,
   minimumPaise:30000,expiresAt:new Date('2028-12-31T18:29:59.000Z'),active:true}},{upsert:true});
 console.log('Seeded categories, 12 menu items, 8 tables and the WELCOME10 sample offer (idempotently).');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
