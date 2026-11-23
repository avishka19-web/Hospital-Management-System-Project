const mongoose = require('mongoose');

const STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
const ACTIVE = ['pending', 'approved'];

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'] },
    time: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM'] },
    reason: { type: String, required: [true, 'Reason is required'], trim: true, maxlength: 500 },
    status: { type: String, enum: { values: STATUSES, message: 'Invalid appointment status' }, default: 'pending' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    adminNote: { type: String, trim: true, maxlength: 500, default: '' },
    // Unique only while the appointment is pending/approved. Guarantees no double booking,
    // even if two requests arrive at the same moment.
    slotKey: { type: String, unique: true, sparse: true }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, date: 1, time: 1 });
appointmentSchema.index({ patient: 1, date: -1 });
appointmentSchema.index({ status: 1, date: 1 });

appointmentSchema.pre('validate', async function () {
  this.slotKey = ACTIVE.includes(this.status) ? `${this.doctor}_${this.date}_${this.time}` : undefined;
});

const Appointment = mongoose.model('Appointment', appointmentSchema);
Appointment.STATUSES = STATUSES;
Appointment.ACTIVE = ACTIVE;
module.exports = Appointment;
