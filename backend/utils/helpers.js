const mongoose = require('mongoose');

exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.httpError = (status, message, errors) => {
  const err = new Error(message);
  err.status = status;
  if (errors) err.errors = errors;
  return err;
};

exports.str = (v) => (typeof v === 'string' ? v : '');
exports.isId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v) && mongoose.isValidObjectId(v);
exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.paginate = (req, def = 10, max = 100) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || def, 1), max);
  return { page, limit, skip: (page - 1) * limit };
};

exports.pageMeta = (p, total) => ({ page: p.page, limit: p.limit, total, pages: Math.max(Math.ceil(total / p.limit), 1) });
