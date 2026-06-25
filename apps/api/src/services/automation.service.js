const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const DeductionLog = require('../models/DeductionLog');
const SalaryRecord = require('../models/SalaryRecord');
const SystemSetting = require('../models/SystemSetting');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const { dayjs } = require('../utils/time');

/**
 * Helper to fetch configured weekends (fallback to Friday & Saturday)
 */
async function getWorkCalendarSetting() {
  const setting = await SystemSetting.findOne({ key: 'work-calendar' });
  return setting && setting.value ? setting.value : {};
}

async function getWeekends() {
  const setting = await getWorkCalendarSetting();
  return setting.weekends || ['Friday', 'Saturday'];
}

/**
 * Calculate dynamic working days for an employee in a given month.
 * Excludes weekends and custom holidays.
 * Bounded by employee joining and resignation dates.
 *
 * @param {string} monthStr - Format "YYYY-MM"
 * @param {object} user - User document
 * @returns {Promise<number>}
 */
async function calculateWorkingDays(monthStr, user) {
  const weekends = await getWeekends();
  const holidays = await Holiday.find({});
  const holidayDates = new Set(
    holidays.map((h) => dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD')),
  );

  const startOfMonth = dayjs(monthStr).tz('Asia/Dhaka').startOf('month');
  const endOfMonth = dayjs(monthStr).tz('Asia/Dhaka').endOf('month');

  const joining = dayjs(user.joiningDate || user.createdAt)
    .tz('Asia/Dhaka')
    .startOf('day');
  const resignation = user.resignationDate
    ? dayjs(user.resignationDate).tz('Asia/Dhaka').endOf('day')
    : null;

  let workingDays = 0;
  let currentDay = startOfMonth;

  while (currentDay.isBefore(endOfMonth) || currentDay.isSame(endOfMonth, 'day')) {
    // 1. Check if employee was active on this day
    if (currentDay.isBefore(joining, 'day')) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }
    if (resignation && currentDay.isAfter(resignation, 'day')) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    // 2. Check if weekend
    const dayName = currentDay.format('dddd');
    if (weekends.includes(dayName)) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    // 3. Check if holiday
    const dateStr = currentDay.format('YYYY-MM-DD');
    if (holidayDates.has(dateStr)) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    // Otherwise, it is a working day
    workingDays++;
    currentDay = currentDay.add(1, 'day');
  }

  return workingDays;
}

/**
 * Check late entries and trigger deduction events when the 3-lates threshold is crossed.
 *
 * @param {string} employeeId
 * @param {string} monthStr - Format "YYYY-MM"
 */
async function evaluateLateDeductions(employeeId, monthStr) {
  const user = await User.findById(employeeId);
  if (!user || user.role === 'admin') return 0;

  // 1. Check if SalaryRecord is already Paid/locked or if it's a past month
  const currentMonthStr = dayjs().tz('Asia/Dhaka').format('YYYY-MM');
  if (monthStr < currentMonthStr) {
    return 0; // Strictly prevent recalculating historical/past months
  }

  const existingRecord = await SalaryRecord.findOne({ employeeId, month: monthStr });
  if (existingRecord && existingRecord.status === 'Paid') {
    return 0; // Skip deduction recalculation for locked records
  }

  const startOfMonth = dayjs(monthStr).tz('Asia/Dhaka').startOf('month').toDate();
  const endOfMonth = dayjs(monthStr).tz('Asia/Dhaka').endOf('month').toDate();

  // 1. Get ALL attendance records for this month
  const allAttendances = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: startOfMonth, $lte: endOfMonth },
    'checkIn.status': { $exists: true },
  }).sort({ attendanceDate: 1 });

  if (allAttendances.length === 0) return 0;

  // 2. Clear existing DeductionLogs for this month so we can recalculate from scratch
  await DeductionLog.deleteMany({ employeeId, month: monthStr });

  // 3. Find consecutive lates
  let logsCreated = 0;
  let consecutiveLates = [];

  const workingDays = await calculateWorkingDays(monthStr, user);
  const dailySalary = workingDays > 0 ? (user.salary || 0) / workingDays : 0;

  const calendarSetting = await getWorkCalendarSetting();
  const threshold = calendarSetting.consecutiveLatesPenaltyThreshold || 3;

  for (const record of allAttendances) {
    if (record.checkIn.status === 'Late') {
      consecutiveLates.push(record);
      if (consecutiveLates.length === threshold) {
        // Trigger deduction for consecutive lates
        await DeductionLog.create({
          employeeId,
          triggerReason: `${threshold} consecutive late entries`,
          deductedDays: 1,
          deductedAmount: Number(dailySalary.toFixed(2)),
          linkedAttendance: consecutiveLates.map((c) => c._id),
          month: monthStr,
          timestamp: new Date(),
        });
        logsCreated++;
        consecutiveLates = []; // Reset counter after penalty
      }
    } else {
      // If they check in 'On Time' (or anything else), reset the consecutive late counter
      consecutiveLates = [];
    }
  }

  return logsCreated;
}

/**
 * Recalculate salary details for an employee in a given month.
 *
 * @param {string} employeeId
 * @param {string} monthStr - Format "YYYY-MM"
 */
async function recalculateSalary(employeeId, monthStr) {
  const user = await User.findById(employeeId);
  if (!user || user.role === 'admin') return null;

  // 1. Check if record is Paid or if it's a past month
  const currentMonthStr = dayjs().tz('Asia/Dhaka').format('YYYY-MM');
  const existingRecord = await SalaryRecord.findOne({ employeeId, month: monthStr });

  if (monthStr < currentMonthStr) {
    return existingRecord; // Strictly prevent recalculating historical/past months
  }

  if (existingRecord && existingRecord.status === 'Paid') {
    return existingRecord; // Locked
  }

  // 2. Calculate working days
  const workingDays = await calculateWorkingDays(monthStr, user);
  if (workingDays === 0) {
    // No active working days, delete draft or set to 0
    if (existingRecord) {
      await existingRecord.deleteOne();
    }
    return null;
  }

  // 3. Calculate attended days
  const startOfMonth = dayjs(monthStr).tz('Asia/Dhaka').startOf('month').toDate();
  const endOfMonth = dayjs(monthStr).tz('Asia/Dhaka').endOf('month').toDate();

  const attendances = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: startOfMonth, $lte: endOfMonth },
    'checkIn.time': { $exists: true },
  });

  const attendedDays = attendances.length;

  // 4. Calculate absent days (active contract working days where attendance is missing)
  const weekends = await getWeekends();
  const holidays = await Holiday.find({});
  const holidayDates = new Set(
    holidays.map((h) => dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD')),
  );

  const joining = dayjs(user.joiningDate || user.createdAt)
    .tz('Asia/Dhaka')
    .startOf('day');
  const resignation = user.resignationDate
    ? dayjs(user.resignationDate).tz('Asia/Dhaka').endOf('day')
    : null;

  const attendanceDates = new Set(
    attendances.map((a) => dayjs(a.attendanceDate).tz('Asia/Dhaka').format('YYYY-MM-DD')),
  );

  const leaveRequests = await LeaveRequest.find({
    employeeId,
    status: 'Approved',
    startDate: { $lte: endOfMonth },
    endDate: { $gte: startOfMonth },
  });

  let approvedLeaveDays = 0;
  let currentDay = dayjs(monthStr).tz('Asia/Dhaka').startOf('month');
  const endOfMonthDhaka = dayjs(monthStr).tz('Asia/Dhaka').endOf('month');

  while (currentDay.isBefore(endOfMonthDhaka) || currentDay.isSame(endOfMonthDhaka, 'day')) {
    if (currentDay.isBefore(joining, 'day')) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }
    if (resignation && currentDay.isAfter(resignation, 'day')) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    const dayName = currentDay.format('dddd');
    if (weekends.includes(dayName)) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    const dateStr = currentDay.format('YYYY-MM-DD');
    if (holidayDates.has(dateStr)) {
      currentDay = currentDay.add(1, 'day');
      continue;
    }

    // If it was a working day but employee did not check in
    if (!attendanceDates.has(dateStr)) {
      // Check if they are on approved leave
      let isOnLeave = false;
      for (const req of leaveRequests) {
        if (
          currentDay.isBetween(
            dayjs(req.startDate).tz('Asia/Dhaka').startOf('day'),
            dayjs(req.endDate).tz('Asia/Dhaka').endOf('day'),
            null,
            '[]',
          )
        ) {
          isOnLeave = true;
          break;
        }
      }

      if (isOnLeave) {
        approvedLeaveDays++;
      }
    }

    currentDay = currentDay.add(1, 'day');
  }

  // 5. Calculate late days and late deductions
  const lateDays = attendances.filter((a) => a.checkIn?.status === 'Late').length;

  const deductions = await DeductionLog.find({ employeeId, month: monthStr });
  const lateDeductedDays = deductions.reduce((sum, log) => sum + (log.deductedDays || 0), 0);

  // Only late penalties are deducted from salary; absent days are not deducted
  const totalDeductedDays = lateDeductedDays;

  // 6. Perform financial calculation
  const baseSalary = user.salary || 0;
  const dailySalary = Number((baseSalary / workingDays).toFixed(2));
  let deductionAmount = Number(Math.min(baseSalary, totalDeductedDays * dailySalary).toFixed(2));

  // Year-end encashment logic
  let leaveEncashmentAmount = 0;
  if (dayjs(monthStr).format('MM') === '12') {
    const year = dayjs(monthStr).year();
    const balance = await LeaveBalance.findOne({ employeeId, year });
    const remainingLeaves = balance ? balance.allocated - balance.used : 20; // fallback default
    if (remainingLeaves > 0) {
      leaveEncashmentAmount = Number((remainingLeaves * dailySalary).toFixed(2));
    }
  }

  const finalPayableSalary = Number(
    (baseSalary - deductionAmount + leaveEncashmentAmount).toFixed(2),
  );

  // 7. Upsert salary record
  const record = await SalaryRecord.findOneAndUpdate(
    { employeeId, month: monthStr },
    {
      employeeId,
      month: monthStr,
      workingDays,
      attendedDays,
      lateDays,
      deductedDays: lateDeductedDays,
      approvedLeaveDays,
      baseSalary,
      dailySalary,
      deductionAmount,
      leaveEncashmentAmount,
      finalPayableSalary,
      status: 'Draft',
      processedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return record;
}

/**
 * Evaluate all active users for the current/given month
 */
async function evaluateAllActive(monthStr) {
  const targetMonth = monthStr || dayjs().tz('Asia/Dhaka').format('YYYY-MM');
  const activeEmployees = await User.find({ role: { $ne: 'admin' }, status: 'active' });

  for (const emp of activeEmployees) {
    await evaluateLateDeductions(emp._id, targetMonth);
    await recalculateSalary(emp._id, targetMonth);
  }
}

module.exports = {
  calculateWorkingDays,
  evaluateLateDeductions,
  recalculateSalary,
  evaluateAllActive,
  getWeekends,
};
