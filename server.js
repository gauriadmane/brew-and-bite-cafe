const {assertEnv}=require('./src/config/env');
const {connectDb}=require('./src/config/db');
const {startExpiry}=require('./src/jobs/expire');
const app=require('./src/app');
async function start() {
  assertEnv();await connectDb();startExpiry();
  const port=Number(process.env.PORT||3000);
  app.listen(port,'0.0.0.0',()=>console.log(`Brew & Bite listening on port ${port}`));
}
start().catch(err=>{console.error('Startup error:',err.message);process.exit(1);});
