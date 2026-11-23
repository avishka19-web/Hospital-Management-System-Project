// Consultation records + prescriptions
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const { asyncHandler, httpError, str, isId, paginate, pageMeta } = require('../utils/helpers');
const { today } = require('../utils/dates');

const docPop = { path: 'doctor', select: 'user specialization', populate: { path: 'user', select: 'name' } };
const patPop = { path: 'patient', select: 'user', populate: { path: 'user', select: 'name' } };

async function scope(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'doctor') { const d = await Doctor.findOne({ user: user._id }); return { doctor: d ? d._id : null }; }
  const p = await Patient.findOne({ user: user._id });
  return { patient: p ? p._id : null };
}

const rxShape = (x) => ({
  _id: x._id, appointment: x.appointment?._id || x.appointment, date: x.appointment?.date, medicines: x.medicines, advice: x.advice, createdAt: x.createdAt,
  doctor: { _id: x.doctor?._id, name: x.doctor?.user?.name || 'Doctor' }, patient: { _id: x.patient?._id, name: x.patient?.user?.name || 'Patient' }
});
const recShape = (r) => ({
  _id: r._id, appointment: r.appointment, visitDate: r.visitDate, diagnosis: r.diagnosis, notes: r.notes,
  doctor: { _id: r.doctor?._id, name: r.doctor?.user?.name || 'Doctor', specialization: r.doctor?.specialization }, patient: { _id: r.patient?._id, name: r.patient?.user?.name || 'Patient' }
});

function listQuery(base, req) {
  const q = { ...base };
  if (isId(str(req.query.appointment))) q.appointment = req.query.appointment;
  if (isId(str(req.query.patient)) && req.user.role !== 'patient') q.patient = req.query.patient;
  return q;
}

exports.createConsultation = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!isId(str(b.appointment))) throw httpError(400, 'Appointment is required.');
  const appt = await Appointment.findById(b.appointment);
  if (!appt) throw httpError(404, 'Appointment not found.');
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor || String(appt.doctor) !== String(doctor._id)) throw httpError(403, 'You can only add notes to your own appointments.');
  if (!['approved', 'completed'].includes(appt.status)) throw httpError(400, 'Approve the appointment before adding consultation notes.');
  if (appt.date > today()) throw httpError(400, 'Consultation notes can be added on or after the appointment date.');

  const diagnosis = str(b.diagnosis).trim();
  if (diagnosis.length < 3) throw httpError(400, 'Enter a diagnosis (at least 3 characters).');
  const meds = Array.isArray(b.medicines) ? b.medicines : [];
  if (meds.length > 20) throw httpError(400, 'A prescription can hold at most 20 medicines.');
  const medicines = meds.map((m, i) => {
    const name = str(m && m.name).trim();
    const dosage = str(m && m.dosage).trim();
    if (!name || !dosage) throw httpError(400, `Medicine ${i + 1}: name and dosage are required.`);
    return { name: name.slice(0, 100), dosage: dosage.slice(0, 60), frequency: str(m.frequency).trim().slice(0, 60), duration: str(m.duration).trim().slice(0, 60) };
  });

  const record = await MedicalRecord.findOneAndUpdate(
    { appointment: appt._id },
    { $set: { patient: appt.patient, doctor: doctor._id, diagnosis: diagnosis.slice(0, 300), notes: str(b.notes).trim().slice(0, 2000), visitDate: appt.date } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  let prescription = null;
  if (medicines.length) {
    prescription = await Prescription.findOneAndUpdate(
      { appointment: appt._id },
      { $set: { patient: appt.patient, doctor: doctor._id, medicines, advice: str(b.advice).trim().slice(0, 1000) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } else {
    await Prescription.deleteOne({ appointment: appt._id });
  }

  if (b.markCompleted && appt.status === 'approved') { appt.status = 'completed'; await appt.save(); }
  res.status(201).json({ success: true, message: 'Consultation saved.', data: { record: record._id, prescription: prescription && prescription._id, status: appt.status } });
});

exports.listPrescriptions = asyncHandler(async (req, res) => {
  const p = paginate(req, 20, 100);
  const base = await scope(req.user);
  if (Object.values(base).some((v) => v === null)) return res.json({ success: true, data: [], pagination: pageMeta(p, 0) });
  const q = listQuery(base, req);
  const [total, rows] = await Promise.all([
    Prescription.countDocuments(q),
    Prescription.find(q).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).populate(docPop).populate(patPop).populate('appointment', 'date')
  ]);
  res.json({ success: true, data: rows.map(rxShape), pagination: pageMeta(p, total) });
});

exports.getPrescription = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Prescription not found.');
  const x = await Prescription.findById(req.params.id).populate(docPop).populate(patPop).populate('appointment', 'date');
  if (!x) throw httpError(404, 'Prescription not found.');
  const base = await scope(req.user);
  const key = Object.keys(base)[0];
  if (key && String(x[key]._id) !== String(base[key])) throw httpError(403, 'You do not have access to this prescription.');
  res.json({ success: true, data: rxShape(x) });
});

exports.listRecords = asyncHandler(async (req, res) => {
  const p = paginate(req, 20, 100);
  const base = await scope(req.user);
  if (Object.values(base).some((v) => v === null)) return res.json({ success: true, data: [], pagination: pageMeta(p, 0) });
  const q = listQuery(base, req);
  const [total, rows] = await Promise.all([
    MedicalRecord.countDocuments(q),
    MedicalRecord.find(q).sort({ visitDate: -1 }).skip(p.skip).limit(p.limit).populate(docPop).populate(patPop)
  ]);
  res.json({ success: true, data: rows.map(recShape), pagination: pageMeta(p, total) });
});
