const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');

exports.getWorkflows = async (req, res, next) => {
  try {
    const workflows = await ApprovalWorkflow.find().sort({ applicantRole: 1 });
    return apiResponse.ok(res, workflows);
  } catch (err) {
    return next(err);
  }
};

exports.updateWorkflow = async (req, res, next) => {
  try {
    const { applicantRole, stages, isActive } = req.body;

    if (!applicantRole || !stages || !Array.isArray(stages)) {
      return apiResponse.badRequest(res, 'applicantRole and stages (array) are required');
    }

    // Sort stages by sequence to ensure consistency
    const sortedStages = stages
      .map((s, idx) => ({
        sequence: s.sequence || idx + 1,
        role: s.role,
        label: s.label || `${s.role.charAt(0).toUpperCase() + s.role.slice(1)} Approval`,
      }))
      .sort((a, b) => a.sequence - b.sequence);

    // Enforce sequence numbers starting from 1
    sortedStages.forEach((s, idx) => {
      s.sequence = idx + 1;
    });

    const workflow = await ApprovalWorkflow.findOneAndUpdate(
      { applicantRole: applicantRole.toLowerCase() },
      {
        applicantRole: applicantRole.toLowerCase(),
        stages: sortedStages,
        isActive: isActive !== undefined ? isActive : true,
      },
      { upsert: true, new: true }
    );

    return apiResponse.ok(res, workflow, 'Approval workflow updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deleteWorkflow = async (req, res, next) => {
  try {
    const { id } = req.params;
    await ApprovalWorkflow.findByIdAndDelete(id);
    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};

exports.getRoles = async (req, res, next) => {
  try {
    const roles = await User.distinct('role');
    const defaultRoles = ['admin', 'hr', 'manager', 'employee'];
    // Merge, lowercase, and deduplicate
    const uniqueRoles = Array.from(
      new Set([...defaultRoles, ...roles].map((r) => r.toLowerCase()))
    );
    return apiResponse.ok(res, uniqueRoles);
  } catch (err) {
    return next(err);
  }
};
