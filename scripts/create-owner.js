require('dotenv').config();
const bcrypt=require('bcryptjs');
const mongoose=require('mongoose');
const {assertEnv}=require('../src/config/env');
const {connectDb}=require('../src/config/db');
const {User}=require('../src/models');
async function run(){
  assertEnv();
  const email=(process.env.OWNER_EMAIL||'').trim().toLowerCase();
  const password=process.env.OWNER_PASSWORD||'';
  const name=(process.env.OWNER_NAME||'Café Owner').trim();
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12) throw Error('Set OWNER_EMAIL and a strong OWNER_PASSWORD (12+ characters) in your terminal session.');
  await connectDb();
  const existing=await User.findOne({email});
  if(existing) throw Error('Account already exists. Owner creation is intentionally not repeatable.');
  await User.create({name,email,role:'owner',approval:'approved',passwordHash:await bcrypt.hash(password,12)});
  console.log('Owner account created. Owner password was not printed.');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
