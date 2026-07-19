const mongoose = require('mongoose');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');
const Holiday = require('../src/models/Holiday');
const LeaveRequest = require('../src/models/LeaveRequest');
const reportService = require('../src/services/report.service');
const Shift = require('../src/models/Shift');
const LeaveType = require('../src/models/LeaveType');

const TEST_DB_URI = 'mongodb://localhost:27017/workforce_management_test';

describe('Employee Wise Attendance Report API & Service', () => {
  let employee;
  let shift;
  let annualLeaveType;
  let sickLeaveType;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Attendance.deleteMany({}),
      Holiday.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Shift.deleteMany({}),
      LeaveType.deleteMany({}),
    ]);

    annualLeaveType = await LeaveType.create({ name: 'Annual', code: 'annual' });
    sickLeaveType = await LeaveType.create({ name: 'Sick', code: 'sick' });

    // Create a default shift (9:00 AM to 5:00 PM)
    shift = await Shift.create({
      name: 'Day Shift',
      startTime: '09:00',
      endTime: '17:00',
      gracePeriod: 15,
    });

    // Create an employee
    employee = await User.create({
      employeeId: 'EMP00005',
      name: 'John Doe',
      email: 'john.doe@test.com',
      password: 'password123',
      role: 'employee',
      status: 'active',
      shiftId: shift._id,
      joiningDate: new Date('2026-06-01'),
    });
  });

  test('should generate daily report rows with correct statuses and summaries', async () => {
    // 1. Seed a public holiday on 2026-06-03
    await Holiday.create({ name: 'National Holiday', date: new Date('2026-06-03') });

    // 2. Seed an approved leave request on 2026-06-04
    await LeaveRequest.create({
      employeeId: employee._id,
      startDate: new Date('2026-06-04'),
      endDate: new Date('2026-06-04'),
      leaveType: annualLeaveType._id,
      reason: 'Medical checkup',
      requestedDays: 1,
      status: 'Approved',
    });

    // 3. Seed check-in on 2026-06-01 (On Time)
    // Shift is 9:00 AM to 5:00 PM (Dhaka time)
    // 2026-06-01 is Monday (workday)
    await Attendance.create({
      employeeId: employee._id,
      attendanceDate: new Date('2026-06-01T00:00:00.000Z'),
      checkIn: {
        time: new Date('2026-06-01T03:00:00.000Z'), // 09:00 AM Dhaka is 03:00 AM UTC
        status: 'On Time',
        lateMinutes: 0,
      },
      checkOut: {
        time: new Date('2026-06-01T11:00:00.000Z'), // 05:00 PM Dhaka is 11:00 AM UTC
        status: 'Normal',
      },
      workingMinutes: 480,
    });

    // 4. Seed check-in on 2026-06-02 (Late check-in)
    // 2026-06-02 is Tuesday (workday)
    await Attendance.create({
      employeeId: employee._id,
      attendanceDate: new Date('2026-06-02T00:00:00.000Z'),
      checkIn: {
        time: new Date('2026-06-02T03:30:00.000Z'), // 09:30 AM Dhaka (30 mins late)
        status: 'Late',
        lateMinutes: 30,
      },
      checkOut: {
        time: new Date('2026-06-02T11:00:00.000Z'), // 05:00 PM Dhaka
        status: 'Normal',
      },
      workingMinutes: 450,
    });

    // 5. Seed check-in on 2026-06-05 (Half-Day - short working hours)
    // 2026-06-05 is Friday (weekend by default, but let's test a weekend attendance log)
    // 2026-06-08 is Monday. Let's seed a short working hour workday on 2026-06-08
    await Attendance.create({
      employeeId: employee._id,
      attendanceDate: new Date('2026-06-08T00:00:00.000Z'),
      checkIn: {
        time: new Date('2026-06-08T03:00:00.000Z'),
        status: 'On Time',
        lateMinutes: 0,
      },
      checkOut: {
        time: new Date('2026-06-08T05:00:00.000Z'), // Left at 11:00 AM Dhaka (2 hours worked)
        status: 'Early Leave',
      },
      workingMinutes: 120, // Less than half of 480 minutes
    });

    const report = await reportService.employeeWise({
      employeeId: employee._id.toString(),
      from: '2026-06-01',
      to: '2026-06-08',
    });

    expect(report).toBeDefined();
    expect(report.items.length).toBe(8); // June 1 to June 8 is 8 days

    // Verify day-by-day calculations
    const row01 = report.items.find((r) => r.date === '2026-06-01');
    expect(row01.status).toBe('Present');
    expect(row01.workingHours).toBe('8h 0m');

    const row02 = report.items.find((r) => r.date === '2026-06-02');
    expect(row02.status).toBe('Late');
    expect(row02.remarks).toContain('Late check-in');

    const row03 = report.items.find((r) => r.date === '2026-06-03');
    expect(row03.status).toBe('Holiday');
    expect(row03.remarks).toBe('Public Holiday: National Holiday');

    const row04 = report.items.find((r) => r.date === '2026-06-04');
    expect(row04.status).toBe('Leave');
    expect(row04.remarks).toBe('Approved Leave: Medical checkup');

    const row08 = report.items.find((r) => r.date === '2026-06-08');
    expect(row08.status).toBe('Half-Day');
    expect(row08.remarks).toContain('Short hours');

    // Summary assertions
    expect(report.summary.totalPresentDays).toBe(2); // row01 and row02 (Late is present, row08 is Half-Day)
    expect(report.summary.totalLateDays).toBe(1); // row02
    expect(report.summary.totalWorkingHours).toBe('17h 30m'); // 480 + 450 + 120 = 1050 mins = 17.5 hours
  });

  test('should support CSV export generation', async () => {
    const reportExport = await reportService.exportEmployeeWise({
      format: 'csv',
      employeeId: employee._id.toString(),
      from: '2026-06-01',
      to: '2026-06-02',
    });

    expect(reportExport.contentType).toBe('text/csv');
    expect(reportExport.buffer).toBeInstanceOf(Buffer);
    const text = reportExport.buffer.toString('utf-8');
    expect(text).toContain('Employee ID');
    expect(text).toContain('John Doe');
  });

  test('should support Excel export generation', async () => {
    const reportExport = await reportService.exportEmployeeWise({
      format: 'excel',
      employeeId: employee._id.toString(),
      from: '2026-06-01',
      to: '2026-06-02',
    });

    expect(reportExport.contentType).toContain('spreadsheetml');
    expect(reportExport.buffer).toBeInstanceOf(Buffer);
  });

  test('should generate leave wise report and statistics', async () => {
    // Seed approved leave request
    await LeaveRequest.create({
      employeeId: employee._id,
      startDate: new Date('2026-06-03'),
      endDate: new Date('2026-06-05'),
      leaveType: annualLeaveType._id,
      reason: 'Vacation',
      requestedDays: 3,
      status: 'Approved',
      approvedBy: employee._id,
      approvalDate: new Date(),
    });

    // Seed pending leave request
    await LeaveRequest.create({
      employeeId: employee._id,
      startDate: new Date('2026-06-07'),
      endDate: new Date('2026-06-08'),
      leaveType: sickLeaveType._id,
      reason: 'Fever',
      requestedDays: 2,
      status: 'Pending',
    });

    const report = await reportService.leaveWise({
      employeeId: employee._id.toString(),
      from: '2026-06-01',
      to: '2026-06-10',
    });

    expect(report).toBeDefined();
    expect(report.items.length).toBe(2);
    // Sort should be reverse chronological (June 7th request first)
    expect(report.items[0].leaveType).toBe('Sick');
    expect(report.items[1].leaveType).toBe('Annual');

    expect(report.summary.totalLeaveTaken).toBe(3);
    expect(report.summary.pendingRequests).toBe(1);
    expect(report.summary.approvedLeaves).toBe(1);
    expect(report.summary.rejectedLeaves).toBe(0);
  });

  test('should support Leave report CSV, PDF, and Excel exports', async () => {
    const csvExport = await reportService.exportLeaveWise({
      format: 'csv',
      from: '2026-06-01',
      to: '2026-06-10',
    });
    expect(csvExport.contentType).toBe('text/csv');
    expect(csvExport.buffer).toBeInstanceOf(Buffer);

    const pdfExport = await reportService.exportLeaveWise({
      format: 'pdf',
      from: '2026-06-01',
      to: '2026-06-10',
    });
    expect(pdfExport.contentType).toBe('application/pdf');
    expect(pdfExport.buffer).toBeInstanceOf(Buffer);

    const excelExport = await reportService.exportLeaveWise({
      format: 'excel',
      from: '2026-06-01',
      to: '2026-06-10',
    });
    expect(excelExport.contentType).toContain('spreadsheetml');
    expect(excelExport.buffer).toBeInstanceOf(Buffer);
  });
});
