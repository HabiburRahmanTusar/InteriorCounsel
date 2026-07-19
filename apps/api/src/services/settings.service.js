const SystemSetting = require('../models/SystemSetting');
const User = require('../models/User');
const Shift = require('../models/Shift');
const Attendance = require('../models/Attendance');
const SalaryRecord = require('../models/SalaryRecord');
const DeductionLog = require('../models/DeductionLog');
const Holiday = require('../models/Holiday');
const EmployeeType = require('../models/EmployeeType');
const LeaveType = require('../models/LeaveType');
const LeavePolicy = require('../models/LeavePolicy');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveRequest = require('../models/LeaveRequest');
const FinancialRecord = require('../models/FinancialRecord');
const RefreshToken = require('../models/RefreshToken');

exports.updateAttendanceRules = async function updateAttendanceRules(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'attendance-rules' },
    { key: 'attendance-rules', value: payload },
    { upsert: true, new: true },
  );
};

exports.getCompany = async function getCompany() {
  const doc = await SystemSetting.findOne({ key: 'company' });
  return doc ? doc.value : { name: 'Attendly Inc', legalName: 'Attendly Incorporated' };
};

exports.updateCompany = async function updateCompany(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'company' },
    { key: 'company', value: payload },
    { upsert: true, new: true },
  );
};

exports.getWorkCalendar = async function getWorkCalendar() {
  const doc = await SystemSetting.findOne({ key: 'work-calendar' });
  return doc
    ? doc.value
    : {
        weekends: ['Friday', 'Saturday'],
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriod: 15,
        lateResetsMonthly: true,
        consecutiveLatesPenaltyThreshold: 3,
      };
};

exports.updateWorkCalendar = async function updateWorkCalendar(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'work-calendar' },
    { key: 'work-calendar', value: payload },
    { upsert: true, new: true },
  );
};

exports.cleanDatabase = async function cleanDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database cleanup is only allowed in development environment.');
  }

  // 1. Clear Existing Data
  await Promise.all([
    User.deleteMany({}),
    Shift.deleteMany({}),
    Attendance.deleteMany({}),
    SalaryRecord.deleteMany({}),
    DeductionLog.deleteMany({}),
    SystemSetting.deleteMany({}),
    Holiday.deleteMany({}),
    EmployeeType.deleteMany({}),
    LeaveType.deleteMany({}),
    LeavePolicy.deleteMany({}),
    LeaveBalance.deleteMany({}),
    LeaveRequest.deleteMany({}),
    FinancialRecord.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);

  // Drop stale/obsolete indexes to prevent duplicate key errors
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.db.collection('leavepolicies').dropIndex('employmentType_1');
  } catch (err) {
    // Ignore if not found
  }

  // 2. Seed core data
  // Shifts
  const dayShift = await Shift.create({
    name: 'Day Shift',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriod: 15,
  });

  const nightShift = await Shift.create({
    name: 'Night Shift',
    startTime: '21:00',
    endTime: '06:00',
    gracePeriod: 15,
  });

  // Employee Types
  const fullTime = await EmployeeType.create({ code: 'full_time', label: 'Full-Time' });
  const partTime = await EmployeeType.create({ code: 'part_time', label: 'Part-Time' });
  const contractor = await EmployeeType.create({ code: 'contractor', label: 'Contractor' });

  // Leave Types
  const annualLeave = await LeaveType.create({ name: 'Annual Leave', code: 'annual', isPaid: true, deductsFromBalance: true });
  const sickLeave = await LeaveType.create({ name: 'Sick Leave', code: 'sick', isPaid: true, deductsFromBalance: true });
  const casualLeave = await LeaveType.create({ name: 'Casual Leave', code: 'casual', isPaid: true, deductsFromBalance: true });
  const unpaidLeave = await LeaveType.create({ name: 'Unpaid Leave', code: 'unpaid', isPaid: false, deductsFromBalance: false });

  // Admin User
  const adminUser = await User.create({
    employeeId: 'EMP00001',
    name: 'System Admin',
    email: 'admin@attendly.com',
    password: 'password123',
    phone: '+8801700000001',
    designation: 'IT Director',
    role: 'admin',
    status: 'active',
    employeeType: fullTime._id,
    shiftId: dayShift._id,
    joiningDate: new Date(),
  });

  // Default Leave Policy for current year
  const currentYear = new Date().getFullYear();
  await LeavePolicy.create({
    name: 'Standard Leave Policy',
    description: 'Default policy for all full-time employees',
    employeeTypes: [fullTime._id],
    year: currentYear,
    status: 'Active',
    isDefault: true,
    createdBy: adminUser._id,
    leaveAllocations: [
      { leaveType: annualLeave._id, days: 15 },
      { leaveType: sickLeave._id, days: 10 },
      { leaveType: casualLeave._id, days: 10 },
    ],
  });

  // System Settings
  await SystemSetting.create({
    key: 'work-calendar',
    value: {
      weekends: ['Friday', 'Saturday'],
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      gracePeriod: 15,
      lateResetsMonthly: true,
      consecutiveLatesPenaltyThreshold: 3,
    }
  });

  await SystemSetting.create({
    key: 'company',
    value: {
      name: 'Attendly Inc',
      legalName: 'Attendly Incorporated',
    }
  });

  return {
    message: 'Database cleaned and core data re-seeded.',
    seedCredentials: {
      email: 'admin@attendly.com',
      password: 'password123',
    },
  };
};
