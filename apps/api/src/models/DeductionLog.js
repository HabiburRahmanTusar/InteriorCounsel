const mongoose = require('mongoose');

const deductionLogSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    triggerReason: { type: String, required: true }, // e.g. "3 late entries reached"
    deductedDays: { type: Number, required: true, default: 1 },
    deductedAmount: { type: Number, required: true },
    linkedAttendance: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // YYYY-MM
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for fast lookups
deductionLogSchema.index({ employeeId: 1, month: 1 });
deductionLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('DeductionLog', deductionLogSchema);
