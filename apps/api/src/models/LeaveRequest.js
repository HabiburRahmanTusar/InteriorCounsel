const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    leaveType: { type: String, enum: ['Annual', 'Sick', 'Casual', 'Unpaid'], default: 'Annual' },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    requestedDays: { type: Number, required: true }, // The number of working days taken
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employeeId: 1, startDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
