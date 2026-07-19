const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    allocated: { type: Number, required: true, default: 0 },
    used: { type: Number, required: true, default: 0 },
    policy: { type: mongoose.Schema.Types.ObjectId, ref: 'LeavePolicy' },
    source: { type: String, enum: ['PolicyAssigned', 'ManualOverride'], default: 'PolicyAssigned' },
  },
  { timestamps: true },
);

leaveBalanceSchema.index({ employeeId: 1, year: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
