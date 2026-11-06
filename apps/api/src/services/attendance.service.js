const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { checkInStatus, checkOutStatus, workingMinutes, dayjs } = require('../utils/time');
const automationService = require('./automation.service');

function format12HourParts(dateObj) {
  if (!dateObj) return { time: '', period: 'AM' };
  const d = dayjs(dateObj).tz('Asia/Dhaka');
  let hour = d.hour();
  const minute = d.minute();
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return {
    time: `${hour}:${String(minute).padStart(2, '0')}`,
    period,
  };
}

function formatWorkingHours(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '00 H 00 Min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')} H ${String(minutes).padStart(2, '0')} Min`;
}

function calculateLateOverview(lateMinutes) {
  if (!lateMinutes || lateMinutes <= 0) return 'ON Time';
  const h = Math.floor(lateMinutes / 60);
  const m = lateMinutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}H ${m}Min Late` : `${h}H Late`;
  }
  return `${m} Min Late`;
}

exports.getStatus = async function getStatus(userId) {
  const user = await User.findById(userId).populate('shiftId');
  const localToday = dayjs().tz('Asia/Dhaka').startOf('day').toDate();

  const record = await Attendance.findOne({ employeeId: userId, attendanceDate: localToday });

  return {
    checkedIn: !!record?.checkIn,
    checkedOut: !!record?.checkOut,
    checkIn: record?.checkIn || undefined,
    checkOut: record?.checkOut || undefined,
    status: record?.status || 'present',
    overview: record?.overview || '',
    workingHoursDisplay: record?.workingHoursDisplay || '00 H 00 Min',
  };
};

exports.checkIn = async function checkIn({ userId, latitude, longitude, address }) {
  const user = await User.findById(userId).populate('shiftId');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (!user.shiftId) {
    const error = new Error('User has no assigned shift');
    error.status = 400;
    throw error;
  }

  const localToday = dayjs().tz('Asia/Dhaka').startOf('day').toDate();

  const exists = await Attendance.findOne({ employeeId: userId, attendanceDate: localToday });
  if (exists && exists.checkIn) {
    const error = new Error('Already checked in for today');
    error.status = 400;
    throw error;
  }

  const checkInTime = new Date();
  const status = checkInStatus(checkInTime, user.shiftId);
  const { getLateMinutes } = require('../utils/time');
  const lateMinutes = getLateMinutes(checkInTime, user.shiftId);
  const isLate = lateMinutes > 0;
  const overview = calculateLateOverview(lateMinutes);
  const timeParts = format12HourParts(checkInTime);

  const record = await Attendance.findOneAndUpdate(
    { employeeId: userId, attendanceDate: localToday },
    {
      employeeId: userId,
      attendanceDate: localToday,
      status: 'present',
      late: isLate,
      overview,
      checkInTime: timeParts.time,
      checkInPeriod: timeParts.period,
      checkIn: {
        time: checkInTime,
        status,
        location: { latitude, longitude, address },
        lateMinutes,
      },
    },
    { upsert: true, new: true },
  );

  // Trigger automation asynchronously
  const monthStr = dayjs(localToday).tz('Asia/Dhaka').format('YYYY-MM');
  automationService
    .evaluateLateDeductions(userId, monthStr)
    .then(() => automationService.recalculateSalary(userId, monthStr))
    .catch((err) => console.error('Automation error after check-in:', err));

  return record;
};

exports.checkOut = async function checkOut({ userId, latitude, longitude, address }) {
  const user = await User.findById(userId).populate('shiftId');
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  if (!user.shiftId) {
    const error = new Error('User has no assigned shift');
    error.status = 400;
    throw error;
  }

  const localToday = dayjs().tz('Asia/Dhaka').startOf('day').toDate();

  const record = await Attendance.findOne({ employeeId: userId, attendanceDate: localToday });
  if (!record || !record.checkIn) {
    const error = new Error('No active check-in record found for today');
    error.status = 400;
    throw error;
  }
  if (record.checkOut) {
    const error = new Error('Already checked out for today');
    error.status = 400;
    throw error;
  }

  const checkOutTime = new Date();
  const status = checkOutStatus(checkOutTime, user.shiftId, record.checkIn.time);
  const minutes = workingMinutes(record.checkIn.time, checkOutTime);
  const timeParts = format12HourParts(checkOutTime);
  const workingHoursDisplay = formatWorkingHours(minutes);

  record.checkOut = {
    time: checkOutTime,
    status,
    location: { latitude, longitude, address },
  };
  record.workingMinutes = minutes;
  record.workingHoursDisplay = workingHoursDisplay;
  record.checkOutTime = timeParts.time;
  record.checkOutPeriod = timeParts.period;
  await record.save();

  const monthStr = dayjs(localToday).tz('Asia/Dhaka').format('YYYY-MM');
  automationService
    .recalculateSalary(userId, monthStr)
    .catch((err) => console.error('Automation error after check-out:', err));

  return record;
};

/**
 * Bulk action: Generates today's attendance roster for all active employees.
 * Equivalent to Odoo hr.daily.attendance.action_create_today_attendance()
 */
exports.generateTodayRoster = async function generateTodayRoster() {
  const localToday = dayjs().tz('Asia/Dhaka').startOf('day').toDate();
  const activeEmployees = await User.find({ status: 'active', role: { $ne: 'admin' } });

  const existingLogs = await Attendance.find({ attendanceDate: localToday });
  const existingUserIds = new Set(existingLogs.map((l) => l.employeeId.toString()));

  const toCreate = [];
  for (const emp of activeEmployees) {
    if (!existingUserIds.has(emp._id.toString())) {
      toCreate.push({
        employeeId: emp._id,
        attendanceDate: localToday,
        status: 'present',
        late: false,
        overview: 'Not Checked In',
        workingHoursDisplay: '00 H 00 Min',
      });
    }
  }

  if (toCreate.length > 0) {
    await Attendance.insertMany(toCreate);
  }

  return Attendance.find({ attendanceDate: localToday }).populate('employeeId', 'name employeeId designation phone');
};

/**
 * Manual Attendance Entry / Adjustment by Admin or HR
 * Supports Odoo-style manual 12-hour AM/PM and Status overrides
 */
exports.recordManualAttendance = async function recordManualAttendance(data) {
  const { employeeId, date, status = 'present', checkInTime, checkInPeriod, checkOutTime, checkOutPeriod, note } = data;

  const user = (mongoose.Types.ObjectId.isValid(employeeId) ? await User.findById(employeeId).populate('shiftId') : await User.findOne({ employeeId }).populate('shiftId')) || await User.findOne({ employeeId }).populate('shiftId');
  if (!user) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }
  const empId = user._id;

  const targetDate = date ? dayjs(date).tz('Asia/Dhaka').startOf('day').toDate() : dayjs().tz('Asia/Dhaka').startOf('day').toDate();

  let late = false;
  let overview = '';
  let workingMinutesVal = 0;
  let checkInObj = undefined;
  let checkOutObj = undefined;

  if (status === 'leave') {
    overview = 'Leave';
  } else if (status === 'absent') {
    overview = 'Absent';
  } else {
    // status === 'present'
    if (checkInTime && user.shiftId) {
      // Parse 12-hour string to 24h
      const [hStr, mStr] = checkInTime.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr || '0', 10);
      if (checkInPeriod === 'PM' && h < 12) h += 12;
      if (checkInPeriod === 'AM' && h === 12) h = 0;

      const inDate = dayjs(targetDate).hour(h).minute(m).second(0).toDate();
      const [shStr, smStr] = user.shiftId.startTime.split(':');
      const shiftStartMinutes = parseInt(shStr, 10) * 60 + parseInt(smStr, 10);
      const grace = user.shiftId.gracePeriod || 0;
      const actualCheckInMinutes = h * 60 + m;

      const diff = actualCheckInMinutes - (shiftStartMinutes + grace);
      if (diff > 0) {
        late = true;
        overview = calculateLateOverview(diff);
      } else {
        late = false;
        overview = 'ON Time';
      }

      checkInObj = {
        time: inDate,
        status: late ? 'Late' : 'On Time',
        lateMinutes: Math.max(0, diff),
      };

      if (checkOutTime) {
        let outH = parseInt(checkOutTime.split(':')[0], 10);
        const outM = parseInt(checkOutTime.split(':')[1] || '0', 10);
        if (checkOutPeriod === 'PM' && outH < 12) outH += 12;
        if (checkOutPeriod === 'AM' && outH === 12) outH = 0;

        const outDate = dayjs(targetDate).hour(outH).minute(outM).second(0).toDate();
        workingMinutesVal = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 60000));

        checkOutObj = {
          time: outDate,
          status: 'Normal',
        };
      }
    } else {
      overview = 'ON Time';
    }
  }

  const workingHoursDisplay = formatWorkingHours(workingMinutesVal);

  const updated = await Attendance.findOneAndUpdate(
    { employeeId: empId, attendanceDate: targetDate },
    {
      employeeId: empId,
      attendanceDate: targetDate,
      status,
      late,
      overview,
      workingMinutes: workingMinutesVal,
      workingHoursDisplay,
      checkInTime,
      checkInPeriod,
      checkOutTime,
      checkOutPeriod,
      checkIn: checkInObj,
      checkOut: checkOutObj,
      note,
    },
    { upsert: true, new: true }
  );

  // Re-evaluate salary & late deductions for the month
  const monthStr = dayjs(targetDate).tz('Asia/Dhaka').format('YYYY-MM');
  await automationService.evaluateLateDeductions(empId, monthStr);
  await automationService.recalculateSalary(empId, monthStr);

  return updated;
};

exports.listManualAttendance = async function listManualAttendance(filter = {}) {
  const query = {};
  if (filter.employeeId) {
    const user = (mongoose.Types.ObjectId.isValid(filter.employeeId) ? await User.findById(filter.employeeId) : await User.findOne({ employeeId: filter.employeeId })) || await User.findOne({ employeeId: filter.employeeId });
    if (user) query.employeeId = user._id;
  }
  if (filter.date) {
    query.attendanceDate = dayjs(filter.date).tz('Asia/Dhaka').startOf('day').toDate();
  }

  const list = await Attendance.find(query)
    .populate('employeeId', 'name employeeId designation')
    .sort({ attendanceDate: -1, updatedAt: -1 })
    .limit(150);

  return list;
};

exports.deleteManualAttendance = async function deleteManualAttendance(id) {
  const record = await Attendance.findById(id);
  if (!record) {
    const error = new Error('Attendance record not found');
    error.status = 404;
    throw error;
  }
  await record.deleteOne();
  return { id };
};

exports.getSalarySummary = async function getSalarySummary(employeeId, refDate) {
  return automationService.getSalarySummary(employeeId, refDate);
};

exports.history = async function history({ userId, from, to, page, limit }) {
  const query = { employeeId: userId };
  if (from || to) {
    query.attendanceDate = {};
    if (from) query.attendanceDate.$gte = dayjs(from).startOf('day').toDate();
    if (to) query.attendanceDate.$lte = dayjs(to).endOf('day').toDate();
  }

  const total = await Attendance.countDocuments(query);
  const items = await Attendance.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ attendanceDate: -1 });

  return {
    items,
    total,
  };
};

exports.daily = async function daily({ date }) {
  const targetDate = dayjs(date).tz('Asia/Dhaka').startOf('day').toDate();
  const userQuery = { status: 'active', role: { $ne: 'admin' } };

  const users = await User.find(userQuery).populate('shiftId');
  const attendanceLogs = await Attendance.find({ attendanceDate: targetDate });

  const logMap = new Map(attendanceLogs.map((log) => [log.employeeId.toString(), log]));

  return users.map((user) => {
    const log = logMap.get(user._id.toString());
    return {
      employeeId: user._id,
      employeeName: user.name,
      employeeCode: user.employeeId,
      status: log?.status || 'present',
      late: log?.late || false,
      overview: log?.overview || (log?.checkIn ? (log.late ? 'Late' : 'ON Time') : 'Not Checked In'),
      workingHoursDisplay: log?.workingHoursDisplay || '00 H 00 Min',
      checkInTime: log?.checkInTime,
      checkInPeriod: log?.checkInPeriod,
      checkOutTime: log?.checkOutTime,
      checkOutPeriod: log?.checkOutPeriod,
      checkIn: log?.checkIn,
      checkOut: log?.checkOut,
      workingMinutes: log?.workingMinutes || 0,
    };
  });
};
