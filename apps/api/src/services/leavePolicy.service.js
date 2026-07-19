const LeavePolicy = require('../models/LeavePolicy');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const User = require('../models/User');
const { dayjs } = require('../utils/time');

class LeavePolicyService {
  /**
   * Resolves the applicable policy for an employee for a given year.
   */
  async resolvePolicyFor(employee, year) {
    if (!employee) throw new Error('Employee is required to resolve policy');

    // Find active policy matching the employee's type for the year
    let policy = null;
    if (employee.employeeType) {
      policy = await LeavePolicy.findOne({
        employeeTypes: employee.employeeType,
        year: year,
        status: 'Active',
      }).populate('leaveAllocations.leaveType');
    }

    // Fallback to default active policy for the year
    if (!policy) {
      policy = await LeavePolicy.findOne({
        year: year,
        status: 'Active',
        isDefault: true,
      }).populate('leaveAllocations.leaveType');
    }

    return policy; // Might be null if no policies are defined
  }

  /**
   * Generates or updates balances for an employee based on a policy.
   * Simple recompute strategy: update `allocated`, preserve `used`, calculate `remaining` dynamically (no remaining field).
   */
  async generateBalancesFromPolicy(employeeId, policy, year) {
    if (!policy) return; // No policy assigned, cannot generate balances

    // 1. Delete any "PolicyAssigned" balances that do not belong to the current policy
    await LeaveBalance.deleteMany({
      employeeId,
      year,
      source: 'PolicyAssigned',
      policy: { $ne: policy._id },
    });

    // 2. Delete any "PolicyAssigned" balances under this policy that are no longer in the allocations list
    const policyLeaveTypeIds = policy.leaveAllocations.map(
      (alloc) => (alloc.leaveType._id || alloc.leaveType).toString()
    );
    await LeaveBalance.deleteMany({
      employeeId,
      year,
      policy: policy._id,
      source: 'PolicyAssigned',
      leaveType: { $nin: policyLeaveTypeIds },
    });

    const operations = [];

    for (const alloc of policy.leaveAllocations) {
      // Find existing balance for this leave type
      const existingBalance = await LeaveBalance.findOne({
        employeeId,
        year,
        leaveType: alloc.leaveType._id || alloc.leaveType,
      });

      if (existingBalance && existingBalance.source === 'ManualOverride') {
        // Skip manual overrides during sync
        continue;
      }

      operations.push({
        updateOne: {
          filter: {
            employeeId,
            year,
            leaveType: alloc.leaveType._id || alloc.leaveType,
          },
          update: {
            $set: {
              allocated: alloc.days,
              policy: policy._id,
              source: 'PolicyAssigned',
            },
            // 'used' is initialized to 0 by default on insert
          },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      await LeaveBalance.bulkWrite(operations);
    }
  }

  /**
   * Syncs balances for a single employee for a given year.
   */
  async syncEmployeeBalance(employeeId, year) {
    const employee = await User.findById(employeeId);
    if (!employee) throw new Error('Employee not found');

    const policy = await this.resolvePolicyFor(employee, year);
    if (!policy) {
      console.warn(`No active leave policy found for employee ${employeeId} in year ${year}`);
      return null;
    }

    await this.generateBalancesFromPolicy(employeeId, policy, year);
    return policy;
  }

  /**
   * Syncs balances for all active employees for a given year.
   */
  async syncAllBalancesForYear(year) {
    const activeEmployees = await User.find({ status: 'active' });
    let count = 0;

    for (const employee of activeEmployees) {
      try {
        const policy = await this.resolvePolicyFor(employee, year);
        if (policy) {
          await this.generateBalancesFromPolicy(employee._id, policy, year);
          count++;
        }
      } catch (err) {
        console.error(`Error syncing balance for employee ${employee._id}:`, err);
      }
    }

    return count;
  }
}

module.exports = new LeavePolicyService();
