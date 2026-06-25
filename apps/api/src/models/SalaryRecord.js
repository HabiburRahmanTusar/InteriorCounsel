const mongoose = require('mongoose');

const salaryRecordSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // YYYY-MM
    workingDays: { type: Number, required: true, default: 0 },
    attendedDays: { type: Number, required: true, default: 0 },
    lateDays: { type: Number, required: true, default: 0 },
    deductedDays: { type: Number, required: true, default: 0 },
    approvedLeaveDays: { type: Number, default: 0 },
    baseSalary: { type: Number, required: true, default: 0 },
    dailySalary: { type: Number, required: true, default: 0 },
    deductionAmount: { type: Number, required: true, default: 0 },
    leaveEncashmentAmount: { type: Number, default: 0 },
    finalPayableSalary: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Draft', 'Paid'], default: 'Draft' },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

salaryRecordSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SalaryRecord', salaryRecordSchema);
