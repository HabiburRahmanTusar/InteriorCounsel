const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    employeeTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeType' }],
    year: { type: Number, required: true },
    status: { type: String, enum: ['Draft', 'Active', 'Archived'], default: 'Draft' },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    leaveAllocations: [
      {
        leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
        days: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeavePolicy', leavePolicySchema);
