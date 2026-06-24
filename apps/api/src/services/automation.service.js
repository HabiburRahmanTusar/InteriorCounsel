const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const DeductionLog = require('../models/DeductionLog');
const SalaryRecord = require('../models/SalaryRecord');
const SystemSetting = require('../models/SystemSetting');
const { dayjs } = require('../utils/time');

/**
 * Helper to fetch configured weekends (fallback to Friday & Saturday)
 */
async function getWeekends() {
  const setting = await SystemSetting.findOne({ key: 'work-calendar' });
  return setting && setting.value && setting.value.weekends ? setting.value.weekends : ['Friday', 'Saturday'];
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
    holidays.map((h) => dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD'))
  );

  const startOfMonth = dayjs(monthStr).tz('Asia/Dhaka').startOf('month');
  const endOfMonth = dayjs(monthStr).tz('Asia/Dhaka').endOf('month');

  const joining = dayjs(user.joiningDate || user.createdAt).tz('Asia/Dhaka').startOf('day');
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

  const startOfMonth = dayjs(monthStr).tz('Asia/Dhaka').startOf('month').toDate();
  const endOfMonth = dayjs(monthStr).tz('Asia/Dhaka').endOf('month').toDate();

  // 1. Get all Late attendance records for this month
  const lateRecords = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: startOfMonth, $lte: endOfMonth },
    'checkIn.status': 'Late',
  }).sort({ attendanceDate: 1 });

  if (lateRecords.length === 0) return 0;

  // 2. Get existing DeductionLogs for this month to find already-linked lates
  const deductionLogs = await DeductionLog.find({
    employeeId,
    month: monthStr,
  });

  const processedAttendanceIds = new Set();
  for (const log of deductionLogs) {
    for (const attId of log.linkedAttendance) {
      processedAttendanceIds.add(attId.toString());
    }
  }

  // 3. Find unlinked late records
  const unlinkedLates = lateRecords.filter(
    (record) => !processedAttendanceIds.has(record._id.toString())
  );

  let logsCreated = 0;
  if (unlinkedLates.length >= 3) {
    // Determine daily salary to log deduction amount
    const workingDays = await calculateWorkingDays(monthStr, user);
    const dailySalary = workingDays > 0 ? (user.salary || 0) / workingDays : 0;

    // Chunk into groups of 3
    for (let i = 0; i < unlinkedLates.length - (unlinkedLates.length % 3); i += 3) {
      const chunk = unlinkedLates.slice(i, i + 3);
      const chunkIds = chunk.map((c) => c._id);

      await DeductionLog.create({
        employeeId,
        triggerReason: '3 late entries reached',
        deductedDays: 1,
        deductedAmount: Number(dailySalary.toFixed(2)),
        linkedAttendance: chunkIds,
        month: monthStr,
        timestamp: new Date(),
      });
      logsCreated++;
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

  // 1. Check if record is Paid
  const existingRecord = await SalaryRecord.findOne({ employeeId, month: monthStr });
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
    holidays.map((h) => dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD'))
  );

  const joining = dayjs(user.joiningDate || user.createdAt).tz('Asia/Dhaka').startOf('day');
  const resignation = user.resignationDate
    ? dayjs(user.resignationDate).tz('Asia/Dhaka').endOf('day')
    : null;

  const attendanceDates = new Set(
    attendances.map((a) => dayjs(a.attendanceDate).tz('Asia/Dhaka').format('YYYY-MM-DD'))
  );

  let absentDays = 0;
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

    // If it was a working day but employee did not check in, they are absent
    if (!attendanceDates.has(dateStr)) {
      absentDays++;
    }

    currentDay = currentDay.add(1, 'day');
  }

  // 5. Calculate late days and late deductions
  const lateDays = attendances.filter((a) => a.checkIn?.status === 'Late').length;

  const deductions = await DeductionLog.find({ employeeId, month: monthStr });
  const lateDeductedDays = deductions.reduce((sum, log) => sum + (log.deductedDays || 0), 0);

  const totalDeductedDays = absentDays + lateDeductedDays;

  // 6. Perform financial calculation
  const baseSalary = user.salary || 0;
  const dailySalary = Number((baseSalary / workingDays).toFixed(2));
  const deductionAmount = Number(Math.min(baseSalary, totalDeductedDays * dailySalary).toFixed(2));
  const finalPayableSalary = Number((baseSalary - deductionAmount).toFixed(2));

  // 7. Upsert salary record
  const record = await SalaryRecord.findOneAndUpdate(
    { employeeId, month: monthStr },
    {
      employeeId,
      month: monthStr,
      workingDays,
      attendedDays,
      lateDays,
      deductedDays: totalDeductedDays,
      baseSalary,
      dailySalary,
      deductionAmount,
      finalPayableSalary,
      status: 'Draft',
      processedAt: new Date(),
    },
    { upsert: true, new: true }
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
