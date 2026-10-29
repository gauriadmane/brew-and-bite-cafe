require('dotenv').config();
const production = process.env.NODE_ENV === 'production';
function assertEnv() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. See .env.example.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  const tax = Number(process.env.TAX_BPS || 0);
  if (!Number.isInteger(tax) || tax < 0 || tax > 10000) throw new Error('TAX_BPS must be 0..10000');
}
module.exports = { production, assertEnv, taxBps: () => Number(process.env.TAX_BPS || 0) };
