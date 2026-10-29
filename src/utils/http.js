class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ensure = (condition, status, message) => { if (!condition) throw new AppError(status, message); };
const safeNumber = value => Number.isInteger(value) ? value : 0;
module.exports = { AppError, asyncRoute, ensure, safeNumber };
