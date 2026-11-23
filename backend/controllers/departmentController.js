const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const { asyncHandler, httpError, str, isId } = require('../utils/helpers');
const { isUrl } = require('../utils/validators');

exports.list = asyncHandler(async (req, res) => {
  const [depts, doctors] = await Promise.all([
    Department.find().sort({ name: 1 }),
    Doctor.find().populate('user', 'name').select('user department specialization photo')
  ]);
  const byDept = {};
  doctors.forEach((d) => { (byDept[d.department] = byDept[d.department] || []).push({ _id: d._id, name: d.user?.name, specialization: d.specialization, photo: d.photo }); });
  res.json({
    success: true,
    data: depts.map((d) => ({ ...d.toObject(), doctorCount: (byDept[d._id] || []).length, doctors: byDept[d._id] || [] }))
  });
});

function fields(b, file) {
  const out = {};
  if (b.name !== undefined) { const n = str(b.name).trim(); if (n.length < 2) throw httpError(400, 'Department name must be at least 2 characters.'); out.name = n; }
  if (b.description !== undefined) out.description = str(b.description).trim().slice(0, 1000);
  if (b.icon !== undefined && /^fa-[a-z0-9-]+$/.test(str(b.icon))) out.icon = b.icon;
  if (file) out.image = `/uploads/${file.filename}`;
  else if (b.imageUrl !== undefined && (b.imageUrl === '' || isUrl(b.imageUrl))) out.image = str(b.imageUrl).trim();
  return out;
}

exports.create = asyncHandler(async (req, res) => {
  const data = fields(req.body || {}, req.file);
  if (!data.name) throw httpError(400, 'Department name is required.');
  res.status(201).json({ success: true, message: 'Department added.', data: await Department.create(data) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Department not found.');
  const dept = await Department.findById(req.params.id);
  if (!dept) throw httpError(404, 'Department not found.');
  dept.set(fields(req.body || {}, req.file));
  await dept.save();
  res.json({ success: true, message: 'Department updated.', data: dept });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Department not found.');
  if (await Doctor.exists({ department: req.params.id })) throw httpError(400, 'Move or remove the doctors in this department before deleting it.');
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) throw httpError(404, 'Department not found.');
  res.json({ success: true, message: 'Department deleted.' });
});
