const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Department name is required'], unique: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    image: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'fa-stethoscope' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
