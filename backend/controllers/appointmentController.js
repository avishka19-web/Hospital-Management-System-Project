const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { asyncHandler, httpError, str, isId, escapeRegex, paginate, pageMeta } = require('../utils/helpers');
const { today, addDays, parseDate, TIME, generateSlots, appointmentDateTime } = require('../utils/dates');
const { apptShape, apptPopulate } = require('../utils/shapes');

const { STATUSES, ACTIVE } = Appointment;
const TRANSITIONS = { pending: ['approved', 'rejected', 'cancelled'], approved: ['completed', 'cancelled'], rejected: [], completed: [], cancelled: [] };
const MAX_ADVANCE_DAYS = 90;
const PATIENT_CANCEL_HOURS = 2;

// ---------- slot logic ----------
async function assertSlotFree(doctor, date, time, excludeId) {
  const d = parseDate(date);
  if (!d) throw httpError(400, 'Choose a valid date.');
  if (!TIME.test(time || '')) throw httpError(400, 'Choose a valid time slot.');
  if (date < today()) throw httpError(400, 'You cannot book a date in the past.');
  if (date > addDays(today(), MAX_ADVANCE_DAYS)) throw httpError(400, `Appointments can be booked up to ${MAX_ADVANCE_DAYS} days ahead.`);
  const av = doctor.availability;
  if (!av.days.includes(d.getDay())) throw httpError(400, 'The doctor is not available on that day.');
  if (!generateSlots(av).includes(time)) throw httpError(400, "That time is outside the doctor's working slots.");
  if (appointmentDateTime(date, time) <= new Date()) throw httpError(400, 'That time has already passed.');
  const q = { doctor: doctor._id, date, time, status: { $in: ACTIVE } };
  if (excludeId) q._id = { $ne: excludeId };
  if (await Appointment.exists(q)) throw httpError(409, 'That slot is already booked. Please choose another time.');
}

exports.slots = asyncHandler(async (req, res) => {
  const { doctor: doctorId, date, exclude } = req.query;
  if (!isId(str(doctorId))) throw httpError(400, 'Doctor is required.');
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw httpError(404, 'Doctor not found.');
  const d = parseDate(str(date));
  if (!d) throw httpError(400, 'Choose a valid date.');
  const av = doctor.availability;
  if (!av.days.includes(d.getDay())) return res.json({ success: true, data: { working: false, days: av.days, slots: [] } });

  const q = { doctor: doctor._id, date, status: { $in: ACTIVE } };
  if (isId(str(exclude))) q._id = { $ne: exclude };
  const booked = new Set((await Appointment.find(q).select('time')).map((a) => a.time));
  const now = new Date();
  const slots = generateSlots(av).map((time) => {
    const past = date < today() || appointmentDateTime(date, time) <= now;
    return { time, available: !past && !booked.has(time), reason: booked.has(time) ? 'booked' : past ? 'past' : null };
  });
  res.json({ success: true, data: { working: true, days: av.days, slots } });
});

// ---------- scope / access ----------
async function scopeFilter(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'doctor') {
    const d = await Doctor.findOne({ user: user._id });
    return { doctor: d ? d._id : null };
  }
  const p = await Patient.findOne({ user: user._id });
  return { patient: p ? p._id : null };
}

async function loadForUser(id, user) {
  if (!isId(id)) throw httpError(404, 'Appointment not found.');
  const appt = await Appointment.findById(id);
  if (!appt) throw httpError(404, 'Appointment not found.');
  const scope = await scopeFilter(user);
  const key = Object.keys(scope)[0];
  if (key && String(appt[key]) !== String(scope[key])) throw httpError(403, 'You do not have access to this appointment.');
  return appt;
}

const respond = async (id) => apptShape(await Appointment.findById(id).populate(apptPopulate));

// ---------- handlers ----------
exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const reason = str(b.reason).trim();
  if (!isId(str(b.doctor))) throw httpError(400, 'Select a doctor.');
  if (reason.length < 3) throw httpError(400, 'Please describe the reason for your visit (at least 3 characters).');
  if (reason.length > 500) throw httpError(400, 'Reason must be 500 characters or fewer.');

  const doctor = await Doctor.findById(b.doctor);
  if (!doctor) throw httpError(404, 'Doctor not found.');
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw httpError(403, 'Only patient accounts can book appointments.');

  await assertSlotFree(doctor, str(b.date), str(b.time));
  if (await Appointment.exists({ patient: patient._id, date: b.date, time: b.time, status: { $in: ACTIVE } })) {
    throw httpError(409, 'You already have an appointment at that date and time.');
  }
  if (await Appointment.exists({ patient: patient._id, doctor: doctor._id, date: b.date, status: { $in: ACTIVE } })) {
    throw httpError(409, 'You already have an appointment with this doctor on that day.');
  }
  const appt = await Appointment.create({ patient: patient._id, doctor: doctor._id, department: doctor.department, date: b.date, time: b.time, reason });
  res.status(201).json({ success: true, message: 'Appointment requested. You will be notified once the hospital confirms it.', data: await respond(appt._id) });
});

exports.list = asyncHandler(async (req, res) => {
  const p = paginate(req, 10, 100);
  const q = await scopeFilter(req.user);
  if (Object.values(q).some((v) => v === null)) return res.json({ success: true, data: [], pagination: pageMeta(p, 0) });

  const statuses = str(req.query.status).split(',').filter((s) => STATUSES.includes(s));
  if (statuses.length) q.status = { $in: statuses };
  const date = str(req.query.date);
  if (parseDate(date)) q.date = date;
  const range = {};
  if (parseDate(str(req.query.from))) range.$gte = req.query.from;
  if (parseDate(str(req.query.to))) range.$lte = req.query.to;
  if (!q.date && Object.keys(range).length) q.date = range;
  if (req.query.view === 'upcoming') { q.date = { ...(typeof q.date === 'object' ? q.date : {}), $gte: today() }; q.status = { $in: ACTIVE }; }
  if (req.user.role === 'admin' && isId(str(req.query.doctor))) q.doctor = req.query.doctor;
  if (req.user.role === 'admin' && isId(str(req.query.department))) q.department = req.query.department;

  const search = str(req.query.search).trim();
  if (search && req.user.role !== 'patient') {
    const rx = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ role: { $in: ['patient', 'doctor'] }, name: rx }).select('_id role');
    const patients = await Patient.find({ user: { $in: users.filter((u) => u.role === 'patient').map((u) => u._id) } }).select('_id');
    const or = [{ patient: { $in: patients.map((x) => x._id) } }, { reason: rx }];
    if (req.user.role === 'admin') {
      const doctors = await Doctor.find({ user: { $in: users.filter((u) => u.role === 'doctor').map((u) => u._id) } }).select('_id');
      or.push({ doctor: { $in: doctors.map((x) => x._id) } });
    }
    q.$and = [{ $or: or }];
  }

  const dir = ['asc', 'upcoming'].includes(req.query.sort) || req.query.view === 'upcoming' ? 1 : -1;
  const [total, rows] = await Promise.all([
    Appointment.countDocuments(q),
    Appointment.find(q).sort({ date: dir, time: dir }).skip(p.skip).limit(p.limit).populate(apptPopulate)
  ]);
  res.json({ success: true, data: rows.map(apptShape), pagination: pageMeta(p, total) });
});

exports.get = asyncHandler(async (req, res) => {
  const appt = await loadForUser(req.params.id, req.user);
  res.json({ success: true, data: await respond(appt._id) });
});

exports.update = asyncHandler(async (req, res) => {
  const appt = await loadForUser(req.params.id, req.user);
  const b = req.body || {};
  const role = req.user.role;
  const prev = appt.status;

  if (b.status !== undefined) {
    const next = str(b.status);
    if (!STATUSES.includes(next)) throw httpError(400, 'Invalid appointment status.');
    if (next !== prev) {
      if (role === 'patient') {
        if (next !== 'cancelled') throw httpError(403, 'Patients can only cancel their appointments.');
        if (!ACTIVE.includes(prev)) throw httpError(400, `A ${prev} appointment cannot be cancelled.`);
        const hours = (appointmentDateTime(appt.date, appt.time) - new Date()) / 36e5;
        if (hours < PATIENT_CANCEL_HOURS) throw httpError(400, `Appointments can only be cancelled at least ${PATIENT_CANCEL_HOURS} hours before the start time. Please call the hospital.`);
      } else if (!TRANSITIONS[prev].includes(next)) {
        throw httpError(400, `A ${prev} appointment cannot be changed to ${next}.`);
      }
      if (next === 'completed' && appt.date > today()) throw httpError(400, 'An appointment can only be completed on or after its scheduled date.');
      appt.status = next;
    }
  }

  if (b.date !== undefined || b.time !== undefined) {
    if (role !== 'admin') throw httpError(403, 'Only administrators can reschedule appointments.');
    if (!ACTIVE.includes(appt.status)) throw httpError(400, 'Only pending or approved appointments can be rescheduled.');
    const doctor = await Doctor.findById(appt.doctor);
    if (!doctor) throw httpError(400, 'The assigned doctor no longer exists.');
    const date = b.date !== undefined ? str(b.date) : appt.date;
    const time = b.time !== undefined ? str(b.time) : appt.time;
    await assertSlotFree(doctor, date, time, appt._id);
    appt.date = date;
    appt.time = time;
  }

  if (b.notes !== undefined && role !== 'patient') appt.notes = str(b.notes).trim().slice(0, 1000);
  if (b.adminNote !== undefined && role === 'admin') appt.adminNote = str(b.adminNote).trim().slice(0, 500);

  await appt.save();
  res.json({ success: true, message: 'Appointment updated.', data: await respond(appt._id) });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Appointment not found.');
  const appt = await Appointment.findByIdAndDelete(req.params.id);
  if (!appt) throw httpError(404, 'Appointment not found.');
  res.json({ success: true, message: 'Appointment deleted.' });
});

exports.PATIENT_CANCEL_HOURS = PATIENT_CANCEL_HOURS;
