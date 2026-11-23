const Service = require('../models/Service');
const { asyncHandler, httpError, str, isId } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Service.find({ isActive: true }).sort({ createdAt: 1 }) });
});

exports.listAll = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Service.find().sort({ createdAt: 1 }) });
});

function fields(b) {
  const out = {};
  if (b.name !== undefined) { const n = str(b.name).trim(); if (n.length < 2) throw httpError(400, 'Service name must be at least 2 characters.'); out.name = n; }
  if (b.description !== undefined) out.description = str(b.description).trim().slice(0, 500);
  if (b.icon !== undefined && /^fa-[a-z0-9-]+$/.test(str(b.icon))) out.icon = b.icon;
  if (b.isActive !== undefined) out.isActive = b.isActive === true || b.isActive === 'true';
  return out;
}

exports.create = asyncHandler(async (req, res) => {
  const data = fields(req.body || {});
  if (!data.name) throw httpError(400, 'Service name is required.');
  res.status(201).json({ success: true, message: 'Service added.', data: await Service.create(data) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Service not found.');
  const s = await Service.findById(req.params.id);
  if (!s) throw httpError(404, 'Service not found.');
  s.set(fields(req.body || {}));
  await s.save();
  res.json({ success: true, message: 'Service updated.', data: s });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Service not found.');
  const s = await Service.findByIdAndDelete(req.params.id);
  if (!s) throw httpError(404, 'Service not found.');
  res.json({ success: true, message: 'Service deleted.' });
});
