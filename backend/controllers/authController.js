const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { asyncHandler, httpError, str } = require('../utils/helpers');
const { isEmail, isPhone, strongPassword } = require('../utils/validators');
const { parseDate, dateOnlyUTC, today } = require('../utils/dates');
const { doctorShape } = require('../utils/shapes');

const BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other'];

const sign = (user, remember) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: remember ? '7d' : '12h' });

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone,
  gender: u.gender, dateOfBirth: u.dateOfBirth, address: u.address
});

async function buildProfile(user) {
  const base = publicUser(user);
  if (user.role === 'patient') base.patient = await Patient.findOne({ user: user._id });
  if (user.role === 'doctor') {
    const d = await Doctor.findOne({ user: user._id }).populate('user', 'name email phone gender').populate('department', 'name icon');
    base.doctor = doctorShape(d);
  }
  return base;
}

// Validates and applies profile fields. Used by /auth/me and /patients/:id.
async function applyProfile(user, b) {
  const errors = [];
  if (b.name !== undefined) { const n = str(b.name).trim(); n.length < 2 ? errors.push('Full name must be at least 2 characters.') : (user.name = n); }
  if (b.phone !== undefined) { const p = str(b.phone).trim(); isPhone(p) ? (user.phone = p) : errors.push('Enter a valid phone number.'); }
  if (b.gender !== undefined) { GENDERS.includes(b.gender) ? (user.gender = b.gender) : errors.push('Select a valid gender.'); }
  if (b.dateOfBirth !== undefined && b.dateOfBirth !== '') {
    const s = str(b.dateOfBirth);
    parseDate(s) && s < today() ? (user.dateOfBirth = dateOnlyUTC(s)) : errors.push('Enter a valid date of birth in the past.');
  }
  if (b.address !== undefined) { const a = str(b.address).trim(); a.length < 5 ? errors.push('Address must be at least 5 characters.') : (user.address = a); }

  const upd = {};
  if (user.role === 'patient') {
    if (b.bloodGroup !== undefined) { BLOOD.includes(b.bloodGroup) ? (upd.bloodGroup = b.bloodGroup) : errors.push('Invalid blood group.'); }
    if (b.allergies !== undefined) upd.allergies = str(b.allergies).trim().slice(0, 300);
    if (b.emergencyContact && typeof b.emergencyContact === 'object') {
      const ec = b.emergencyContact;
      const phone = str(ec.phone).trim();
      if (phone && !isPhone(phone)) errors.push('Enter a valid emergency contact phone.');
      upd.emergencyContact = { name: str(ec.name).trim().slice(0, 80), phone: phone.slice(0, 20) };
    }
  }
  if (errors.length) throw httpError(400, errors[0], errors);
  await user.save();
  if (Object.keys(upd).length) await Patient.updateOne({ user: user._id }, { $set: upd });
}

exports.register = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name).trim();
  const email = str(b.email).trim().toLowerCase();
  const phone = str(b.phone).trim();
  const address = str(b.address).trim();
  const dob = str(b.dateOfBirth);
  const errors = [];

  if (name.length < 2) errors.push('Full name must be at least 2 characters.');
  if (!isEmail(email)) errors.push('Enter a valid email address.');
  if (!isPhone(phone)) errors.push('Enter a valid phone number (7-15 digits).');
  if (!strongPassword(b.password)) errors.push('Password must be at least 8 characters and include a letter and a number.');
  if (b.password !== b.confirmPassword) errors.push('Passwords do not match.');
  if (!GENDERS.includes(b.gender)) errors.push('Please select a gender.');
  if (!parseDate(dob) || dob >= today()) errors.push('Enter a valid date of birth in the past.');
  if (address.length < 5) errors.push('Address must be at least 5 characters.');
  if (errors.length) throw httpError(400, errors[0], errors);

  if (await User.findOne({ email })) throw httpError(409, 'An account with this email already exists.');

  const user = await User.create({ name, email, phone, password: b.password, role: 'patient', gender: b.gender, dateOfBirth: dateOnlyUTC(dob), address });
  try {
    await Patient.create({ user: user._id });
  } catch (e) {
    await User.deleteOne({ _id: user._id });
    throw e;
  }
  res.status(201).json({ success: true, message: 'Account created successfully.', data: { token: sign(user, false), user: publicUser(user) } });
});

exports.login = asyncHandler(async (req, res) => {
  const email = str((req.body || {}).email).trim().toLowerCase();
  const password = str((req.body || {}).password);
  const remember = !!(req.body || {}).remember;
  if (!email || !password) throw httpError(400, 'Email and password are required.');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw httpError(401, 'Incorrect email or password.');
  if (!user.isActive) throw httpError(403, 'This account has been deactivated. Contact the hospital administrator.');

  res.json({ success: true, message: 'Logged in.', data: { token: sign(user, remember), user: publicUser(user) } });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await buildProfile(req.user) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  await applyProfile(req.user, req.body || {});
  res.json({ success: true, message: 'Profile updated.', data: await buildProfile(await User.findById(req.user._id)) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (!strongPassword(newPassword)) throw httpError(400, 'New password must be at least 8 characters and include a letter and a number.');
  if (newPassword !== confirmPassword) throw httpError(400, 'New passwords do not match.');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(str(currentPassword)))) throw httpError(400, 'Current password is incorrect.');
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully.' });
});

// No email service is configured in this demo, so this always returns the same generic reply.
exports.forgotPassword = asyncHandler(async (req, res) => {
  if (!isEmail(str((req.body || {}).email))) throw httpError(400, 'Enter a valid email address.');
  res.json({ success: true, message: 'If an account exists for that email, reset instructions will be sent. (Email delivery is not configured in this demo — ask an administrator to reset your password.)' });
});

module.exports.applyProfile = applyProfile;
module.exports.buildProfile = buildProfile;
