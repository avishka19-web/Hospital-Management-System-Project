const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
    allergies: { type: String, trim: true, maxlength: 300, default: '' },
    emergencyContact: {
      name: { type: String, trim: true, maxlength: 80, default: '' },
      phone: { type: String, trim: true, maxlength: 20, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
