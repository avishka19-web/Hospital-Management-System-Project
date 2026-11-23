const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const { asyncHandler, httpError, str, isId, escapeRegex, paginate, pageMeta } = require('../utils/helpers');
const { isEmail, isPhone, strongPassword, isUrl } = require('../utils/validators');
const { TIME, toMin } = require('../utils/dates');
const { doctorShape } = require('../utils/shapes');

const populate = (q) => q.populate('user', 'name email phone gender').populate('department', 'name icon');

function parseAvailability(b, cur) {
  const a = { days: cur.days, startTime: cur.startTime, endTime: cur.endTime, slotMinutes: cur.slotMinutes };
  if (b.days !== undefined) {
    let d = b.days;
    if (typeof d === 'string') d = d.split(',');
    if (!Array.isArray(d)) d = [];
    a.days = [...new Set(d.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
    if (!a.days.length) throw httpError(400, 'Select at least one working day.');
  }
  if (b.startTime !== undefined) a.startTime = str(b.startTime);
  if (b.endTime !== undefined) a.endTime = str(b.endTime);
  if (b.slotMinutes !== undefined) a.slotMinutes = Number(b.slotMinutes);
  if (!TIME.test(a.startTime) || !TIME.test(a.endTime)) throw httpError(400, 'Working hours must be in HH:MM format.');
  if (toMin(a.startTime) >= toMin(a.endTime)) throw httpError(400, 'End time must be after start time.');
  if (![10, 15, 20, 30, 45, 60].includes(a.slotMinutes)) throw httpError(400, 'Slot length must be 10, 15, 20, 30, 45 or 60 minutes.');
  if (toMin(a.endTime) - toMin(a.startTime) < a.slotMinutes) throw httpError(400, 'Working hours are shorter than one slot.');
  return a;
}

function num(v, label, min, max) {
  const n = Number(v);
  if (v === '' || v === undefined || Number.isNaN(n) || n < min || n > max) throw httpError(400, `${label} must be a number between ${min} and ${max}.`);
  return n;
}

exports.list = asyncHandler(async (req, res) => {
  const p = paginate(req, 12, 100);
  const q = {};
  const search = str(req.query.search).trim();
  if (isId(req.query.department)) q.department = req.query.department;
  const day = str(req.query.day);
  if (day !== '' && !Number.isNaN(Number(day))) q['availability.days'] = Number(day);
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ role: 'doctor', name: rx }).select('_id');
    q.$or = [{ user: { $in: users.map((u) => u._id) } }, { specialization: rx }];
  }
  const sorts = { experience: { experience: -1 }, fee: { fee: 1 }, '-fee': { fee: -1 }, newest: { createdAt: -1 } };
  const sort = { ...(sorts[req.query.sort] || { createdAt: -1 }), _id: 1 };
  const [total, docs] = await Promise.all([
    Doctor.countDocuments(q),
    populate(Doctor.find(q).sort(sort).skip(p.skip).limit(p.limit))
  ]);
  res.json({ success: true, data: docs.map(doctorShape), pagination: pageMeta(p, total) });
});

exports.get = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Doctor not found.');
  const d = await populate(Doctor.findById(req.params.id));
  if (!d) throw httpError(404, 'Doctor not found.');
  res.json({ success: true, data: doctorShape(d) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name).trim();
  const email = str(b.email).trim().toLowerCase();
  const phone = str(b.phone).trim();
  if (name.length < 2) throw httpError(400, 'Doctor name must be at least 2 characters.');
  if (!isEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (!isPhone(phone)) throw httpError(400, 'Enter a valid phone number.');
  if (!strongPassword(b.password)) throw httpError(400, 'Password must be at least 8 characters and include a letter and a number.');
  if (!isId(str(b.department)) || !(await Department.exists({ _id: b.department }))) throw httpError(400, 'Select a valid department.');
  const specialization = str(b.specialization).trim();
  if (specialization.length < 2) throw httpError(400, 'Specialization is required.');
  const experience = num(b.experience, 'Experience', 0, 60);
  const fee = num(b.fee === undefined || b.fee === '' ? 0 : b.fee, 'Consultation fee', 0, 100000);
  const availability = parseAvailability(b, { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00', slotMinutes: 30 });
  if (await User.findOne({ email })) throw httpError(409, 'An account with this email already exists.');

  let photo = '';
  if (req.file) photo = `/uploads/${req.file.filename}`;
  else if (isUrl(b.photoUrl)) photo = str(b.photoUrl).trim();

  const user = await User.create({ name, email, phone, password: b.password, role: 'doctor', gender: ['male', 'female', 'other'].includes(b.gender) ? b.gender : '' });
  let doc;
  try {
    doc = await Doctor.create({
      user: user._id, department: b.department, specialization,
      qualification: str(b.qualification).trim().slice(0, 150), experience, fee,
      bio: str(b.bio).trim().slice(0, 1000), photo, availability
    });
  } catch (e) {
    await User.deleteOne({ _id: user._id });
    throw e;
  }
  res.status(201).json({ success: true, message: 'Doctor added.', data: doctorShape(await populate(Doctor.findById(doc._id))) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Doctor not found.');
  const doc = await Doctor.findById(req.params.id).populate('user');
  if (!doc) throw httpError(404, 'Doctor not found.');
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && String(doc.user._id) !== String(req.user._id)) throw httpError(403, 'You can only edit your own profile.');
  const b = req.body || {};

  doc.availability = parseAvailability(b, doc.availability);
  if (b.bio !== undefined) doc.bio = str(b.bio).trim().slice(0, 1000);
  if (b.phone !== undefined) {
    if (!isPhone(str(b.phone))) throw httpError(400, 'Enter a valid phone number.');
    doc.user.phone = str(b.phone).trim();
  }

  if (isAdmin) {
    if (b.name !== undefined) { if (str(b.name).trim().length < 2) throw httpError(400, 'Doctor name must be at least 2 characters.'); doc.user.name = str(b.name).trim(); }
    if (b.email !== undefined) { if (!isEmail(b.email)) throw httpError(400, 'Enter a valid email address.'); doc.user.email = str(b.email).trim().toLowerCase(); }
    if (b.gender !== undefined && ['male', 'female', 'other', ''].includes(b.gender)) doc.user.gender = b.gender;
    if (b.password) { if (!strongPassword(b.password)) throw httpError(400, 'Password must be at least 8 characters and include a letter and a number.'); doc.user.password = b.password; }
    if (b.department !== undefined) { if (!isId(str(b.department)) || !(await Department.exists({ _id: b.department }))) throw httpError(400, 'Select a valid department.'); doc.department = b.department; }
    if (b.specialization !== undefined) { if (str(b.specialization).trim().length < 2) throw httpError(400, 'Specialization is required.'); doc.specialization = str(b.specialization).trim(); }
    if (b.qualification !== undefined) doc.qualification = str(b.qualification).trim().slice(0, 150);
    if (b.experience !== undefined) doc.experience = num(b.experience, 'Experience', 0, 60);
    if (b.fee !== undefined) doc.fee = num(b.fee, 'Consultation fee', 0, 100000);
    if (req.file) doc.photo = `/uploads/${req.file.filename}`;
    else if (b.photoUrl !== undefined && (b.photoUrl === '' || isUrl(b.photoUrl))) { if (b.photoUrl !== '' || b.clearPhoto) doc.photo = str(b.photoUrl).trim(); }
  }
  await doc.user.save();
  await doc.save();
  res.json({ success: true, message: 'Doctor updated.', data: doctorShape(await populate(Doctor.findById(doc._id))) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Doctor not found.');
  const doc = await Doctor.findById(req.params.id);
  if (!doc) throw httpError(404, 'Doctor not found.');
  // Active bookings are cancelled; history is kept for patient records.
  await Appointment.updateMany(
    { doctor: doc._id, status: { $in: Appointment.ACTIVE } },
    { $set: { status: 'cancelled', adminNote: 'Cancelled: doctor removed from the hospital directory.' }, $unset: { slotKey: '' } }
  );
  await User.deleteOne({ _id: doc.user });
  await doc.deleteOne();
  res.json({ success: true, message: 'Doctor removed. Any active appointments were cancelled.' });
});
