const mongoose = require('mongoose');

const approvalWorkflowSchema = new mongoose.Schema(
  {
    applicantRole: {
      type: String,
      required: true,
      unique: true,
    },
    stages: [
      {
        sequence: { type: Number, required: true }, // e.g. 1, 2, 3
        role: { type: String, required: true }, // e.g. "manager", "hr", "finance"
        label: { type: String, required: true }, // e.g. "Department Manager Approval"
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
