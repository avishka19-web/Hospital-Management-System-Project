// Usage: npm run seed   (WARNING: wipes all existing data in the configured database)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const ContactMessage = require('../models/ContactMessage');
const Service = require('../models/Service');
const { today, toDateStr, parseDate, generateSlots, dateOnlyUTC } = require('./dates');

const U = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const departments = [
  { name: 'Cardiology', icon: 'fa-heart-pulse', image: U('1628348068343-c6a848d2b6dd'), description: 'Diagnosis and treatment of heart and vascular conditions, from routine ECG screening to advanced interventional procedures.' },
  { name: 'Neurology', icon: 'fa-brain', image: U('1559757175-5700dde675bc'), description: 'Expert care for the brain, spine and nervous system including stroke, epilepsy, migraine and movement disorders.' },
  { name: 'Orthopedics', icon: 'fa-bone', image: U('1530497610245-94d3c16cda28'), description: 'Joint replacement, sports injuries, fracture care and rehabilitation to keep you moving.' },
  { name: 'Pediatrics', icon: 'fa-baby', image: U('1581594693702-fbdc51b2763b'), description: 'Gentle, child-friendly care from newborn checkups and vaccinations to adolescent health.' },
  { name: 'Dermatology', icon: 'fa-hand-dots', image: U('1612776572997-76cc42e058c3'), description: 'Medical and cosmetic skin, hair and nail care, including allergy and acne treatment.' },
  { name: 'General Medicine', icon: 'fa-stethoscope', image: U('1631217868264-e5b90bb7e133'), description: 'Primary care for everyday illness, chronic condition management and preventive health checkups.' },
  { name: 'Dentistry', icon: 'fa-tooth', image: U('1606811841689-23dfddce3e95'), description: 'Preventive, restorative and cosmetic dental care in a calm, modern clinic.' },
  { name: 'Gynecology', icon: 'fa-person-pregnant', image: U('1584515933487-779824d29309'), description: "Women's health, maternity care, fertility support and routine screenings." }
];

const services = [
  { name: 'Emergency & Trauma Care', icon: 'fa-truck-medical', description: 'Round-the-clock emergency team with a dedicated trauma bay.' },
  { name: 'Diagnostic Imaging', icon: 'fa-x-ray', description: 'Digital X-ray, ultrasound, CT and MRI with same-day reports.' },
  { name: 'Pathology Laboratory', icon: 'fa-vial', description: 'NABL-style quality processes for blood, urine and tissue tests.' },
  { name: '24x7 Pharmacy', icon: 'fa-pills', description: 'In-house pharmacy with prescription counselling.' },
  { name: 'Intensive Care Unit', icon: 'fa-bed-pulse', description: 'Adult and pediatric ICU with continuous monitoring.' },
  { name: 'Health Check-up Packages', icon: 'fa-clipboard-check', description: 'Preventive packages for individuals, seniors and corporates.' },
  { name: 'Telemedicine', icon: 'fa-video', description: 'Follow-up consultations by video for eligible patients.' },
  { name: 'Ambulance Service', icon: 'fa-ambulance', description: 'Fully equipped ambulances with trained paramedics.' }
];

// days: 0=Sun ... 6=Sat
const doctors = [
  { name: 'Dr. Aarav Mehta', email: 'doctor@meridian.test', dept: 'Cardiology', spec: 'Interventional Cardiologist', exp: 15, fee: 1200, qual: 'MD, DM (Cardiology)', gender: 'male', photo: '1612349317150-e413f6a5b16d', days: [1, 2, 3, 4, 5], bio: 'Leads the cardiac catheterisation lab with a focus on minimally invasive coronary care and preventive cardiology.' },
  { name: 'Dr. Priya Nair', email: 'priya.nair@meridian.test', dept: 'Neurology', spec: 'Consultant Neurologist', exp: 12, fee: 1100, qual: 'MD, DM (Neurology)', gender: 'female', photo: '1559839734-2b71ea197ec2', days: [1, 2, 3, 4, 5], bio: 'Specialises in stroke recovery, epilepsy and chronic migraine management.' },
  { name: 'Dr. Vikram Singh', email: 'vikram.singh@meridian.test', dept: 'Orthopedics', spec: 'Orthopedic & Joint Replacement Surgeon', exp: 18, fee: 1300, qual: 'MS (Ortho), Fellowship in Arthroplasty', gender: 'male', photo: '1622253692010-333f2da6031d', days: [1, 2, 3, 4, 5, 6], bio: 'Performs knee and hip replacements and sports injury reconstruction.' },
  { name: 'Dr. Ananya Iyer', email: 'ananya.iyer@meridian.test', dept: 'Pediatrics', spec: 'Pediatrician', exp: 9, fee: 800, qual: 'MD (Pediatrics)', gender: 'female', photo: '1594824476967-48c8b964273f', days: [1, 2, 3, 4, 5, 6], bio: 'Cares for children from birth to adolescence with a gentle, play-based approach.' },
  { name: 'Dr. Meera Kapoor', email: 'meera.kapoor@meridian.test', dept: 'Dermatology', spec: 'Dermatologist', exp: 8, fee: 900, qual: 'MD (Dermatology)', gender: 'female', photo: '1582750433449-648ed127bb54', days: [1, 3, 5], bio: 'Treats acne, eczema, pigmentation and hair disorders.' },
  { name: 'Dr. Rohan Desai', email: 'rohan.desai@meridian.test', dept: 'General Medicine', spec: 'Internal Medicine Physician', exp: 11, fee: 600, qual: 'MD (Internal Medicine)', gender: 'male', photo: '1537368910025-700350fe46c7', days: [1, 2, 3, 4, 5, 6], bio: 'Manages diabetes, hypertension and complex multi-system illness.' },
  { name: 'Dr. Neha Sharma', email: 'neha.sharma@meridian.test', dept: 'Dentistry', spec: 'Dental Surgeon', exp: 7, fee: 700, qual: 'BDS, MDS (Prosthodontics)', gender: 'female', photo: '1651008376811-b90baee60c1f', days: [2, 3, 4, 5, 6], bio: 'Provides restorative dentistry, implants and smile design.' },
  { name: 'Dr. Kavita Rao', email: 'kavita.rao@meridian.test', dept: 'Gynecology', spec: 'Obstetrician & Gynecologist', exp: 14, fee: 1000, qual: 'MD, DNB (Obstetrics & Gynaecology)', gender: 'female', photo: '1576091160399-112ba8d25d1d', days: [1, 2, 3, 4, 5], bio: "Supports women through pregnancy, delivery and every stage of women's health." },
  { name: 'Dr. Sameer Joshi', email: 'sameer.joshi@meridian.test', dept: 'Cardiology', spec: 'Cardiac Electrophysiologist', exp: 10, fee: 1100, qual: 'MD, DM (Cardiology)', gender: 'male', photo: '1622253692010-333f2da6031d', days: [2, 4, 6], bio: 'Focuses on heart rhythm disorders, pacemakers and ablation.' },
  { name: 'Dr. Farah Khan', email: 'farah.khan@meridian.test', dept: 'General Medicine', spec: 'Family Physician', exp: 6, fee: 500, qual: 'MBBS, DNB (Family Medicine)', gender: 'female', photo: '1594824476967-48c8b964273f', days: [1, 2, 3, 4, 5], bio: 'First point of contact for families, with a focus on prevention and wellness.' }
];

const patients = [
  { name: 'Rahul Verma', email: 'patient@meridian.test', gender: 'male', dob: '1992-04-18', phone: '+91 98200 11001', address: '14 Hill Road, Bandra West, Mumbai 400050', blood: 'B+', allergies: 'Penicillin' },
  { name: 'Sneha Patil', email: 'sneha.patil@meridian.test', gender: 'female', dob: '1988-11-02', phone: '+91 98200 11002', address: '22 Lokhandwala Complex, Andheri West, Mumbai 400053', blood: 'O+', allergies: '' },
  { name: 'Arjun Reddy', email: 'arjun.reddy@meridian.test', gender: 'male', dob: '1975-07-25', phone: '+91 98200 11003', address: '8 Powai Lake Road, Powai, Mumbai 400076', blood: 'A+', allergies: 'Dust, pollen' },
  { name: 'Pooja Shah', email: 'pooja.shah@meridian.test', gender: 'female', dob: '1996-01-30', phone: '+91 98200 11004', address: '51 Marine Drive, Churchgate, Mumbai 400020', blood: 'AB+', allergies: '' },
  { name: 'Imran Sheikh', email: 'imran.sheikh@meridian.test', gender: 'male', dob: '1983-09-12', phone: '+91 98200 11005', address: '5 Mohammed Ali Road, Mumbai 400003', blood: 'O-', allergies: 'Sulfa drugs' },
  { name: 'Lakshmi Menon', email: 'lakshmi.menon@meridian.test', gender: 'female', dob: '1960-03-08', phone: '+91 98200 11006', address: '33 Matunga East, Mumbai 400019', blood: 'A-', allergies: '' },
  { name: 'Karan Malhotra', email: 'karan.malhotra@meridian.test', gender: 'male', dob: '2001-12-21', phone: '+91 98200 11007', address: '90 Versova Link Road, Andheri West, Mumbai 400061', blood: 'B-', allergies: '' },
  { name: 'Divya Joshi', email: 'divya.joshi@meridian.test', gender: 'female', dob: '1990-06-14', phone: '+91 98200 11008', address: '17 Kothrud, Pune 411038', blood: 'O+', allergies: 'Latex' }
];

const clinical = {
  Cardiology: [
    { dx: 'Mild hypertension', notes: 'BP 142/90 on two readings. ECG normal. Advised reduced salt intake and daily walking.', meds: [['Amlodipine', '5 mg', 'Once daily', '30 days']], advice: 'Review in 4 weeks with a home BP log.' },
    { dx: 'Stable angina - under evaluation', notes: 'Exertional chest tightness. Stress test scheduled.', meds: [['Aspirin', '75 mg', 'Once daily', '30 days'], ['Atorvastatin', '10 mg', 'At night', '30 days']], advice: 'Avoid strenuous exertion until the stress test.' }
  ],
  Neurology: [{ dx: 'Migraine without aura', notes: 'Recurrent unilateral headaches 3-4 times a month. Neurological exam normal.', meds: [['Sumatriptan', '50 mg', 'At onset of headache', 'As needed'], ['Propranolol', '20 mg', 'Twice daily', '60 days']], advice: 'Keep a headache diary; maintain regular sleep.' }],
  Orthopedics: [{ dx: 'Lumbar muscle strain', notes: 'Pain after lifting. No neurological deficit.', meds: [['Naproxen', '250 mg', 'Twice daily after food', '7 days']], advice: 'Physiotherapy twice a week. Avoid heavy lifting for 3 weeks.' }],
  Pediatrics: [{ dx: 'Viral upper respiratory infection', notes: 'Low-grade fever and cough for 3 days. Chest clear.', meds: [['Paracetamol syrup', '5 ml', 'Every 6 hours if fever', '3 days']], advice: 'Plenty of fluids and rest.' }],
  Dermatology: [{ dx: 'Mild acne vulgaris', notes: 'Comedonal acne on the cheeks and forehead.', meds: [['Adapalene gel 0.1%', 'Thin layer', 'At night', '8 weeks']], advice: 'Use sunscreen daily; avoid picking.' }],
  'General Medicine': [{ dx: 'Seasonal viral fever', notes: 'Fever and body ache for 2 days. Vitals stable.', meds: [['Paracetamol', '500 mg', 'Three times daily', '3 days']], advice: 'Rest, hydrate, return if fever persists beyond 3 days.' }],
  Dentistry: [{ dx: 'Dental caries (lower right molar)', notes: 'Cavity requiring restoration. Scheduled composite filling.', meds: [['Ibuprofen', '400 mg', 'As needed for pain', '3 days']], advice: 'Brush twice daily with fluoride toothpaste.' }],
  Gynecology: [{ dx: 'Routine antenatal check - normal', notes: '16 weeks. Fetal heartbeat normal; weight gain appropriate.', meds: [['Folic acid', '5 mg', 'Once daily', '30 days'], ['Iron + calcium', '1 tablet', 'Once daily', '30 days']], advice: 'Next visit in 4 weeks with routine blood tests.' }]
};

const reasons = ['Routine check-up', 'Follow-up consultation', 'Persistent cough and fever', 'Back pain after exercise', 'Recurring headaches', 'Skin rash for two weeks', 'Chest discomfort while climbing stairs', 'Annual health screening', 'Toothache', 'Second opinion on test reports'];

// nearest working day for this doctor, searching forward (dir=1) or backward (dir=-1)
function workday(doc, offset) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
  const dir = offset >= 0 ? 1 : -1;
  while (!doc.availability.days.includes(d.getDay())) d.setDate(d.getDate() + dir);
  return toDateStr(d);
}

(async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await Promise.all([User, Department, Doctor, Patient, Appointment, Prescription, MedicalRecord, ContactMessage, Service].map((m) => m.deleteMany({})));
  await Promise.all([User, Department, Doctor, Patient, Appointment, Prescription, MedicalRecord, ContactMessage, Service].map((m) => m.syncIndexes()));

  console.log('Creating admin, departments, services...');
  await User.create({ name: 'Hospital Administrator', email: 'admin@meridian.test', password: 'Admin@123', role: 'admin', phone: '+91 22 4000 1000', gender: 'other' });
  const depts = await Department.insertMany(departments);
  const deptByName = Object.fromEntries(depts.map((d) => [d.name, d]));
  await Service.insertMany(services);

  console.log('Creating doctors...');
  const docs = [];
  for (const d of doctors) {
    const user = await User.create({ name: d.name, email: d.email, password: 'Doctor@123', role: 'doctor', phone: '+91 22 4000 2' + String(docs.length).padStart(3, '0'), gender: d.gender });
    const doc = await Doctor.create({
      user: user._id, department: deptByName[d.dept]._id, specialization: d.spec, qualification: d.qual, experience: d.exp, fee: d.fee, bio: d.bio,
      photo: U(d.photo, 700), rating: +(4.5 + (docs.length % 5) / 10).toFixed(1), availability: { days: d.days, startTime: '09:00', endTime: '17:00', slotMinutes: 30 }
    });
    docs.push(doc);
  }

  console.log('Creating patients...');
  const pats = [];
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    const created = new Date(); created.setMonth(created.getMonth() - (5 - Math.floor(i * 0.7)), 5 + i * 3);
    const user = await User.create({ name: p.name, email: p.email, password: 'Patient@123', role: 'patient', phone: p.phone, gender: p.gender, dateOfBirth: dateOnlyUTC(p.dob), address: p.address, createdAt: created });
    pats.push(await Patient.create({ user: user._id, bloodGroup: p.blood, allergies: p.allergies, emergencyContact: { name: 'Family contact', phone: '+91 98200 99999' }, createdAt: created }));
  }

  console.log('Creating appointments, records, prescriptions...');
  const used = new Set();
  const deptNameById = Object.fromEntries(depts.map((d) => [String(d._id), d.name]));

  async function book(patient, doc, offset, status, opts = {}) {
    const date = workday(doc, offset);
    const slots = generateSlots(doc.availability);
    let time = opts.time;
    if (!time || used.has(`${doc._id}${date}${time}`)) time = slots.find((s) => !used.has(`${doc._id}${date}${s}`));
    if (!time) return null;
    const key = `${doc._id}${date}${time}`;
    if (['pending', 'approved'].includes(status)) used.add(key);
    const appt = await Appointment.create({
      patient: patient._id, doctor: doc._id, department: doc.department, date, time, status,
      reason: opts.reason || reasons[Math.floor(Math.random() * reasons.length)],
      createdAt: new Date(parseDate(date).getTime() - 5 * 864e5)
    });
    if (status === 'completed') {
      const options = clinical[deptNameById[String(doc.department)]];
      const c = options[Math.floor(Math.random() * options.length)];
      await MedicalRecord.create({ appointment: appt._id, patient: patient._id, doctor: doc._id, diagnosis: c.dx, notes: c.notes, visitDate: date });
      await Prescription.create({ appointment: appt._id, patient: patient._id, doctor: doc._id, advice: c.advice, medicines: c.meds.map(([name, dosage, frequency, duration]) => ({ name, dosage, frequency, duration })) });
      appt.notes = c.notes; await appt.save();
    }
    return appt;
  }

  const demoDoc = docs[0];
  const demoPatient = pats[0];

  // Demo doctor: today + upcoming
  await book(pats[1], demoDoc, 0, 'approved', { time: '09:30', reason: 'Palpitations on exertion' });
  await book(pats[2], demoDoc, 0, 'approved', { time: '10:30', reason: 'Blood pressure follow-up' });
  await book(pats[3], demoDoc, 0, 'pending', { time: '11:30', reason: 'Chest discomfort while climbing stairs' });
  await book(demoPatient, demoDoc, 1, 'approved', { time: '10:00', reason: 'ECG review and BP check' });
  await book(pats[4], demoDoc, 2, 'pending', { time: '14:00', reason: 'Second opinion on test reports' });
  await book(demoPatient, docs[5], 3, 'pending', { time: '11:00', reason: 'Annual health screening' });
  // Demo patient history
  await book(demoPatient, demoDoc, -20, 'completed', { time: '10:00', reason: 'Chest discomfort while climbing stairs' });
  await book(demoPatient, docs[5], -45, 'completed', { time: '12:00', reason: 'Seasonal fever' });
  await book(demoPatient, docs[4], -70, 'completed', { time: '15:00', reason: 'Skin rash for two weeks' });
  await book(demoPatient, docs[2], -30, 'cancelled', { time: '09:00', reason: 'Back pain after exercise' });

  // Bulk history spread over the last ~6 months for charts
  const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'rejected'];
  for (let i = 0; i < 46; i++) {
    const doc = docs[i % docs.length];
    const patient = pats[(i * 3 + 1) % pats.length];
    const offset = -(3 + Math.floor((i * 173) / 46) % 170);
    await book(patient, doc, offset, statuses[i % statuses.length]);
  }
  // Extra future activity
  for (let i = 0; i < 10; i++) {
    await book(pats[(i + 2) % pats.length], docs[(i * 2 + 1) % docs.length], 2 + i * 2, i % 3 === 0 ? 'pending' : 'approved');
  }

  await ContactMessage.insertMany([
    { name: 'Nisha Kulkarni', email: 'nisha.k@example.com', phone: '+91 98200 55501', subject: 'Health check-up packages', message: 'Could you share details and pricing for the senior citizen health check-up package?', status: 'new' },
    { name: 'Farhan Ali', email: 'farhan.ali@example.com', subject: 'Report collection', message: 'I did an MRI last week. How can I collect my report if I cannot visit in person?', status: 'new' },
    { name: 'Meenal Gupta', email: 'meenal.g@example.com', phone: '+91 98200 55503', subject: 'Appreciation for pediatrics team', message: 'Thank you to Dr. Iyer and the nursing staff for taking such good care of my son last month.', status: 'read' },
    { name: 'Suresh Pillai', email: 'suresh.p@example.com', subject: 'Parking availability', message: 'Is there visitor parking available for the evening OPD hours?', status: 'replied' }
  ]);

  console.log(`\nSeed complete: ${docs.length} doctors, ${pats.length} patients, ${await Appointment.countDocuments()} appointments.`);
  console.log('\nDemo logins');
  console.log('  Admin   : admin@meridian.test   / Admin@123');
  console.log('  Doctor  : doctor@meridian.test  / Doctor@123   (Dr. Aarav Mehta)');
  console.log('  Patient : patient@meridian.test / Patient@123  (Rahul Verma)\n');
  await mongoose.disconnect();
})().catch(async (e) => { console.error('Seed failed:', e); await mongoose.disconnect(); process.exit(1); });
