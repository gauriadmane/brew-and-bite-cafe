const mongoose = require('mongoose');
async function connectDb() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'brew_and_bite', serverSelectionTimeoutMS: 12000, maxPoolSize: 8
  });
  console.log('MongoDB connected to brew_and_bite');
}
module.exports = { connectDb };
