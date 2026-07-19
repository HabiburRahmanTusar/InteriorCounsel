const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
    requestedDays: { type: Number, required: true }, // The number of working days taken
    halfDay: { type: Boolean, default: false },
    approverRemarks: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employeeId: 1, startDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
