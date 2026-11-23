// Converts populated Mongoose documents into flat JSON the frontend can use directly.
exports.doctorShape = (d) => {
  if (!d) return null;
  const dept = d.department && d.department._id ? { _id: d.department._id, name: d.department.name, icon: d.department.icon } : d.department;
  return {
    _id: d._id,
    userId: (d.user && d.user._id) || d.user,
    name: (d.user && d.user.name) || 'Doctor',
    email: d.user && d.user.email,
    phone: d.user && d.user.phone,
    gender: d.user && d.user.gender,
    photo: d.photo,
    department: dept,
    specialization: d.specialization,
    qualification: d.qualification,
    experience: d.experience,
    fee: d.fee,
    bio: d.bio,
    rating: d.rating,
    availability: d.availability,
    createdAt: d.createdAt
  };
};

exports.patientShape = (p, extra = {}) => {
  if (!p) return null;
  const u = p.user || {};
  return {
    _id: p._id,
    userId: u._id,
    name: u.name || 'Unknown patient',
    email: u.email,
    phone: u.phone,
    gender: u.gender,
    dateOfBirth: u.dateOfBirth,
    address: u.address,
    bloodGroup: p.bloodGroup,
    allergies: p.allergies,
    emergencyContact: p.emergencyContact,
    createdAt: p.createdAt,
    ...extra
  };
};

exports.apptShape = (a) => ({
  _id: a._id,
  date: a.date,
  time: a.time,
  reason: a.reason,
  status: a.status,
  notes: a.notes,
  adminNote: a.adminNote,
  createdAt: a.createdAt,
  patient: a.patient
    ? { _id: a.patient._id, name: a.patient.user?.name || 'Unknown patient', email: a.patient.user?.email, phone: a.patient.user?.phone, gender: a.patient.user?.gender, dateOfBirth: a.patient.user?.dateOfBirth, bloodGroup: a.patient.bloodGroup, allergies: a.patient.allergies }
    : { name: 'Removed patient' },
  doctor: a.doctor
    ? { _id: a.doctor._id, name: a.doctor.user?.name || 'Doctor', specialization: a.doctor.specialization, photo: a.doctor.photo }
    : { name: 'Removed doctor' },
  department: a.department ? { _id: a.department._id, name: a.department.name } : null
});

// Populate options that match apptShape
exports.apptPopulate = [
  { path: 'patient', populate: { path: 'user', select: 'name email phone gender dateOfBirth' } },
  { path: 'doctor', select: 'user specialization photo', populate: { path: 'user', select: 'name' } },
  { path: 'department', select: 'name' }
];
