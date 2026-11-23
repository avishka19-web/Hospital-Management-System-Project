const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const { asyncHandler, httpError, str, isId, escapeRegex, paginate, pageMeta } = require('../utils/helpers');
const { patientShape, apptShape, apptPopulate } = require('../utils/shapes');
const { applyProfile } = require('./authController');

const userSel = 'name email phone gender dateOfBirth address';

async function doctorOf(user) {
  const d = await Doctor.findOne({ user: user._id });
  if (!d) throw httpError(403, 'Doctor profile not found.');
  return d;
}

exports.list = asyncHandler(async (req, res) => {
  const p = paginate(req, 10, 100);
  const q = {};
  if (req.user.role === 'doctor') {
    const d = await doctorOf(req.user);
    q._id = { $in: await Appointment.distinct('patient', { doctor: d._id }) };
  }
  const search = str(req.query.search).trim();
  const gender = str(req.query.gender);
  if (search || gender) {
    const uq = { role: 'patient' };
    if (['male', 'female', 'other'].includes(gender)) uq.gender = gender;
    if (search) { const rx = new RegExp(escapeRegex(search), 'i'); uq.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
    q.user = { $in: (await User.find(uq).select('_id')).map((u) => u._id) };
  }
  const sort = req.query.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };
  const [total, patients] = await Promise.all([
    Patient.countDocuments(q),
    Patient.find(q).sort({ ...sort, _id: 1 }).skip(p.skip).limit(p.limit).populate('user', userSel)
  ]);
  const apptFilter = { patient: { $in: patients.map((x) => x._id) } };
  if (req.user.role === 'doctor') apptFilter.doctor = (await doctorOf(req.user))._id;
  const counts = await Appointment.aggregate([{ $match: apptFilter }, { $group: { _id: '$patient', total: { $sum: 1 }, last: { $max: '$date' } } }]);
  const cm = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json({
    success: true,
    data: patients.map((x) => patientShape(x, { appointmentCount: cm[String(x._id)]?.total || 0, lastVisit: cm[String(x._id)]?.last || null })),
    pagination: pageMeta(p, total)
  });
});

exports.get = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Patient not found.');
  const patient = await Patient.findById(req.params.id).populate('user', userSel);
  if (!patient) throw httpError(404, 'Patient not found.');

  const apptQ = { patient: patient._id };
  if (req.user.role === 'patient' && String(patient.user._id) !== String(req.user._id)) throw httpError(403, 'You can only view your own profile.');
  if (req.user.role === 'doctor') {
    const d = await doctorOf(req.user);
    apptQ.doctor = d._id;
    if (!(await Appointment.exists(apptQ))) throw httpError(403, 'This patient has no appointments with you.');
  }
  const appts = await Appointment.find(apptQ).sort({ date: -1, time: -1 }).limit(50).populate(apptPopulate);
  const recQ = { patient: patient._id };
  const records = await MedicalRecord.find(recQ).sort({ visitDate: -1 }).limit(50).populate({ path: 'doctor', select: 'user specialization', populate: { path: 'user', select: 'name' } });
  const prescriptions = await Prescription.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(50).populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } }).populate('appointment', 'date');
  res.json({
    success: true,
    data: {
      profile: patientShape(patient),
      appointments: appts.map(apptShape),
      records: records.map((r) => ({ _id: r._id, visitDate: r.visitDate, diagnosis: r.diagnosis, notes: r.notes, doctor: { name: r.doctor?.user?.name || 'Doctor', specialization: r.doctor?.specialization } })),
      prescriptions: prescriptions.map((x) => ({ _id: x._id, date: x.appointment?.date, medicines: x.medicines, advice: x.advice, doctor: { name: x.doctor?.user?.name || 'Doctor' } }))
    }
  });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Patient not found.');
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw httpError(404, 'Patient not found.');
  if (req.user.role === 'patient' && String(patient.user) !== String(req.user._id)) throw httpError(403, 'You can only edit your own profile.');
  const user = await User.findById(patient.user);
  await applyProfile(user, req.body || {});
  res.json({ success: true, message: 'Patient updated.', data: patientShape(await Patient.findById(patient._id).populate('user', userSel)) });
});
