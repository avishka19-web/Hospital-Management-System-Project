const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    diagnosis: { type: String, required: [true, 'Diagnosis is required'], trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    visitDate: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
