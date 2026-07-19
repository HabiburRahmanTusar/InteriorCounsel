const mongoose = require('mongoose');

const employeeTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    label: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmployeeType', employeeTypeSchema);
