const mongoose = require('mongoose');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Holiday = require('../src/models/Holiday');
const DeductionLog = require('../src/models/DeductionLog');
const SalaryRecord = require('../src/models/SalaryRecord');
const SystemSetting = require('../src/models/SystemSetting');
const {
  calculateWorkingDays,
  evaluateLateDeductions,
  recalculateSalary,
} = require('../src/services/automation.service');

const TEST_DB_URI = 'mongodb://localhost:27017/workforce_management_test';

describe('Payroll & Deduction Automation Engine', () => {
  let employeeId;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear all test collections
    await Promise.all([
      User.deleteMany({}),
      Attendance.deleteMany({}),
      Holiday.deleteMany({}),
      DeductionLog.deleteMany({}),
      SalaryRecord.deleteMany({}),
      SystemSetting.deleteMany({}),
    ]);

    // Create a default weekends configuration: Friday and Saturday
    await SystemSetting.create({
      key: 'work-calendar',
      value: {
        weekends: ['Friday', 'Saturday'],
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriod: 15,
        lateResetsMonthly: true,
      },
    });

    // Create a test employee
    const emp = await User.create({
      employeeId: 'T00001',
      name: 'Test Employee',
      email: 'test.emp@company.com',
      password: 'password123',
      salary: 30000,
      role: 'employee',
      joiningDate: new Date('2026-06-01T00:00:00Z'),
      status: 'active',
    });
    employeeId = emp._id;
  });

  test('calculateWorkingDays excludes weekends and custom holidays correctly', async () => {
    const user = await User.findById(employeeId);

    // June 2026 has 30 days.
    // Friday/Saturday weekends in June 2026:
    // June 5, 6, 12, 13, 19, 20, 26, 27 (8 days of weekend)
    // Working days without holidays: 30 - 8 = 22 days.

    let workingDays = await calculateWorkingDays('2026-06', user);
    expect(workingDays).toBe(22);

    // Add a holiday on Monday June 1st
    await Holiday.create({
      name: 'Test Holiday',
      date: new Date('2026-06-01T00:00:00.000Z'),
    });

    workingDays = await calculateWorkingDays('2026-06', user);
    expect(workingDays).toBe(21);
  });

  test('calculateWorkingDays bounds by joining date', async () => {
    // Move joining date to June 15th
    const user = await User.findById(employeeId);
    user.joiningDate = new Date('2026-06-15T00:00:00Z');
    await user.save();

    // From June 15 to June 30:
    // Total days: 16 days.
    // Weekends (Fri/Sat) in June 15-30: June 19, 20, 26, 27 (4 days)
    // Expected working days: 16 - 4 = 12 days.
    const workingDays = await calculateWorkingDays('2026-06', user);
    expect(workingDays).toBe(12);
  });

  test('evaluateLateDeductions triggers exactly 1 day deduction for 3 late entries', async () => {
    // Create 3 late attendance records
    // June 2 (Tue), June 3 (Wed), June 4 (Thu)
    const dates = [
      new Date('2026-06-02T09:30:00Z'), // Late
      new Date('2026-06-03T09:45:00Z'), // Late
      new Date('2026-06-04T09:20:00Z'), // Late
    ];

    for (const date of dates) {
      await Attendance.create({
        employeeId,
        attendanceDate: new Date(date.toDateString()),
        checkIn: {
          time: date,
          status: 'Late',
          lateMinutes: 30,
        },
      });
    }

    // Run late evaluations
    const logsCreated = await evaluateLateDeductions(employeeId, '2026-06');
    expect(logsCreated).toBe(1);

    // Verify a DeductionLog was written to DB
    const deduction = await DeductionLog.findOne({ employeeId, month: '2026-06' });
    expect(deduction).toBeTruthy();
    expect(deduction.deductedDays).toBe(1);
    expect(deduction.linkedAttendance.length).toBe(3);

    // Verify recalculateSalary produces correct calculations
    const record = await recalculateSalary(employeeId, '2026-06');
    expect(record).toBeTruthy();
    expect(record.workingDays).toBe(22);
    expect(record.attendedDays).toBe(3); // 3 checked in days
    expect(record.lateDays).toBe(3);
    // Deducted days = late penalty (1). Absent days (19) are not deducted from salary.
    expect(record.deductedDays).toBe(1);

    const dailySalary = Number((30000 / 22).toFixed(2));
    const expectedDeduction = Number((1 * dailySalary).toFixed(2));
    expect(record.deductionAmount).toBe(expectedDeduction);
    expect(record.finalPayableSalary).toBe(Number((30000 - expectedDeduction).toFixed(2)));
  });
});
