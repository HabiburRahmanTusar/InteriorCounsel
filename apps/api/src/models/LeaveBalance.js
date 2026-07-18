const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    allocated: {
      Annual: { type: Number, required: true, default: 15 },
      Sick: { type: Number, required: true, default: 10 },
      Casual: { type: Number, required: true, default: 10 },
    },
    used: {
      Annual: { type: Number, required: true, default: 0 },
      Sick: { type: Number, required: true, default: 0 },
      Casual: { type: Number, required: true, default: 0 },
    },
  },
  { timestamps: true },
);

leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
