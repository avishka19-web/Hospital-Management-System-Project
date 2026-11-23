const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    medicines: [
      {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        dosage: { type: String, required: true, trim: true, maxlength: 60 },
        frequency: { type: String, trim: true, maxlength: 60, default: '' },
        duration: { type: String, trim: true, maxlength: 60, default: '' }
      }
    ],
    advice: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
