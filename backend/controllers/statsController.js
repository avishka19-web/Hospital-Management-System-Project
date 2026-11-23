const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const ContactMessage = require('../models/ContactMessage');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const { asyncHandler, httpError } = require('../utils/helpers');
const { today, monthKeys } = require('../utils/dates');
const { apptShape, apptPopulate } = require('../utils/shapes');

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (k) => `${LABELS[+k.slice(5) - 1]} ${k.slice(2, 4)}`;

async function monthlyAppointments(keys) {
  const rows = await Appointment.aggregate([
    { $match: { date: { $gte: `${keys[0]}-01` } } },
    { $group: { _id: { $substrBytes: ['$date', 0, 7] }, count: { $sum: 1 } } }
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return { labels: keys.map(monthLabel), values: keys.map((k) => m[k] || 0) };
}

async function monthlyPatients(keys) {
  const [y, mo] = keys[0].split('-').map(Number);
  const rows = await User.aggregate([
    { $match: { role: 'patient', createdAt: { $gte: new Date(y, mo - 1, 1) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }
  ]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return { labels: keys.map(monthLabel), values: keys.map((k) => m[k] || 0) };
}

async function statusDistribution() {
  const rows = await Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const labels = Appointment.STATUSES;
  return { labels: labels.map((s) => s[0].toUpperCase() + s.slice(1)), values: labels.map((s) => m[s] || 0) };
}

async function departmentStats() {
  const [depts, rows] = await Promise.all([
    Department.find().sort({ name: 1 }),
    Appointment.aggregate([{ $group: { _id: { department: '$department', status: '$status' }, count: { $sum: 1 } } }])
  ]);
  return depts.map((d) => {
    const mine = rows.filter((r) => String(r._id.department) === String(d._id));
    const get = (s) => mine.filter((r) => r._id.status === s).reduce((a, r) => a + r.count, 0);
    return { _id: d._id, name: d.name, total: mine.reduce((a, r) => a + r.count, 0), completed: get('completed'), pending: get('pending'), cancelled: get('cancelled') + get('rejected') };
  });
}

async function doctorPerformance() {
  const [doctors, rows] = await Promise.all([
    Doctor.find().populate('user', 'name').populate('department', 'name'),
    Appointment.aggregate([{ $group: { _id: { doctor: '$doctor', status: '$status' }, count: { $sum: 1 } } }])
  ]);
  return doctors.map((d) => {
    const mine = rows.filter((r) => String(r._id.doctor) === String(d._id));
    const get = (s) => mine.filter((r) => r._id.status === s).reduce((a, r) => a + r.count, 0);
    const total = mine.reduce((a, r) => a + r.count, 0);
    const completed = get('completed');
    return { _id: d._id, name: d.user?.name, department: d.department?.name, specialization: d.specialization, total, completed, pending: get('pending'), cancelled: get('cancelled') + get('rejected'), completionRate: total ? Math.round((completed / total) * 100) : 0 };
  }).sort((a, b) => b.completed - a.completed || b.total - a.total);
}

exports.publicStats = asyncHandler(async (req, res) => {
  const [doctors, patients, departments, appointments] = await Promise.all([
    Doctor.countDocuments(), Patient.countDocuments(), Department.countDocuments(), Appointment.countDocuments({ status: 'completed' })
  ]);
  res.json({ success: true, data: { doctors, patients, departments, appointments } });
});

exports.adminStats = asyncHandler(async (req, res) => {
  const t = today();
  const keys = monthKeys(6);
  const [patients, doctors, appointments, todayCount, pending, completed, unread, monthly, registrations, status, departments, recent] = await Promise.all([
    Patient.countDocuments(), Doctor.countDocuments(), Appointment.countDocuments(), Appointment.countDocuments({ date: t }),
    Appointment.countDocuments({ status: 'pending' }), Appointment.countDocuments({ status: 'completed' }), ContactMessage.countDocuments({ status: 'new' }),
    monthlyAppointments(keys), monthlyPatients(keys), statusDistribution(), departmentStats(),
    Appointment.find().sort({ createdAt: -1 }).limit(6).populate(apptPopulate)
  ]);
  res.json({
    success: true,
    data: {
      totals: { patients, doctors, appointments, today: todayCount, pending, completed, unreadMessages: unread },
      charts: { monthlyAppointments: monthly, patientRegistrations: registrations, statusDistribution: status, departmentAppointments: { labels: departments.map((d) => d.name), values: departments.map((d) => d.total) } },
      recent: recent.map(apptShape)
    }
  });
});

exports.reports = asyncHandler(async (req, res) => {
  const keys = monthKeys(12);
  const [totalAppts, totalPatients, totalDoctors, monthly, registrations, status, departments, doctors] = await Promise.all([
    Appointment.countDocuments(), Patient.countDocuments(), Doctor.countDocuments(),
    monthlyAppointments(keys), monthlyPatients(keys), statusDistribution(), departmentStats(), doctorPerformance()
  ]);
  const completed = status.values[Appointment.STATUSES.indexOf('completed')];
  const cancelled = status.values[Appointment.STATUSES.indexOf('cancelled')] + status.values[Appointment.STATUSES.indexOf('rejected')];
  res.json({
    success: true,
    data: {
      totals: { appointments: totalAppts, patients: totalPatients, doctors: totalDoctors, completionRate: totalAppts ? Math.round((completed / totalAppts) * 100) : 0, cancellationRate: totalAppts ? Math.round((cancelled / totalAppts) * 100) : 0 },
      charts: { monthlyAppointments: monthly, patientRegistrations: registrations, statusDistribution: status, departmentAppointments: { labels: departments.map((d) => d.name), values: departments.map((d) => d.total) } },
      departments, doctors
    }
  });
});

exports.doctorStats = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) throw httpError(403, 'Doctor profile not found.');
  const t = today();
  const mine = { doctor: doctor._id };
  const [patients, todayCount, upcoming, pending, completed, todayList, upcomingList] = await Promise.all([
    Appointment.distinct('patient', mine), Appointment.countDocuments({ ...mine, date: t, status: { $in: ['pending', 'approved', 'completed'] } }),
    Appointment.countDocuments({ ...mine, date: { $gt: t }, status: { $in: Appointment.ACTIVE } }), Appointment.countDocuments({ ...mine, status: 'pending' }),
    Appointment.countDocuments({ ...mine, status: 'completed' }),
    Appointment.find({ ...mine, date: t, status: { $in: ['pending', 'approved', 'completed'] } }).sort({ time: 1 }).populate(apptPopulate),
    Appointment.find({ ...mine, date: { $gt: t }, status: { $in: Appointment.ACTIVE } }).sort({ date: 1, time: 1 }).limit(6).populate(apptPopulate)
  ]);
  const consultationsPending = await Appointment.countDocuments({ ...mine, status: 'approved', date: { $lte: t } });
  res.json({ success: true, data: { totals: { patients: patients.length, today: todayCount, upcoming, pending, completed, consultationsPending }, today: todayList.map(apptShape), upcoming: upcomingList.map(apptShape) } });
});

exports.patientStats = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) throw httpError(403, 'Patient profile not found.');
  const t = today();
  const mine = { patient: patient._id };
  const [upcomingCount, completed, prescriptions, records, upcoming, recentRx] = await Promise.all([
    Appointment.countDocuments({ ...mine, date: { $gte: t }, status: { $in: Appointment.ACTIVE } }), Appointment.countDocuments({ ...mine, status: 'completed' }),
    Prescription.countDocuments(mine), MedicalRecord.countDocuments(mine),
    Appointment.find({ ...mine, date: { $gte: t }, status: { $in: Appointment.ACTIVE } }).sort({ date: 1, time: 1 }).limit(5).populate(apptPopulate),
    Prescription.find(mine).sort({ createdAt: -1 }).limit(3).populate({ path: 'doctor', select: 'user', populate: { path: 'user', select: 'name' } }).populate('appointment', 'date')
  ]);
  res.json({
    success: true,
    data: {
      totals: { upcoming: upcomingCount, completed, prescriptions, records },
      upcoming: upcoming.map(apptShape),
      recentPrescriptions: recentRx.map((x) => ({ _id: x._id, date: x.appointment?.date, doctor: x.doctor?.user?.name, medicines: x.medicines, advice: x.advice }))
    }
  });
});
