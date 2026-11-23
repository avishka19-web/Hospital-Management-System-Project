const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    specialization: { type: String, required: true, trim: true, maxlength: 100 },
    qualification: { type: String, trim: true, maxlength: 150, default: '' },
    experience: { type: Number, min: 0, max: 60, default: 0 },
    fee: { type: Number, min: 0, default: 0 },
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    photo: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 4.7 },
    availability: {
      days: { type: [Number], default: [1, 2, 3, 4, 5] },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
      slotMinutes: { type: Number, default: 30 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doctor', doctorSchema);
