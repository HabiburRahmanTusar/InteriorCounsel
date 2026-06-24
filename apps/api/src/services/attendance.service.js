const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { checkInStatus, checkOutStatus, workingMinutes, dayjs } = require('../utils/time');

exports.getStatus = async function getStatus(userId) {
  const user = await User.findById(userId).populate('shiftId');
  const localToday = dayjs().tz('Asia/Dhaka').startOf('day').toDate();

  const record = await Attendance.findOne({ employeeId: userId, attendanceDate: localToday });

  return {
    checkedIn: !!record?.checkIn,
    checkedOut: !!record?.checkOut,
    checkIn: record?.checkIn || undefined,
    checkOut: record?.checkOut || undefined,
  };
};

exports.checkIn = async function checkIn({ userId, latitude, longitude }) {
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

  // Check if already checked in
  const exists = await Attendance.findOne({ employeeId: userId, attendanceDate: localToday });
  if (exists && exists.checkIn) {
    const error = new Error('Already checked in for today');
    error.status = 400;
    throw error;
  }

  const status = checkInStatus(new Date(), user.shiftId);

  const record = await Attendance.findOneAndUpdate(
    { employeeId: userId, attendanceDate: localToday },
    {
      employeeId: userId,
      attendanceDate: localToday,
      checkIn: {
        time: new Date(),
        status,
        location: { latitude, longitude },
      },
    },
    { upsert: true, new: true },
  );

  return record;
};

exports.checkOut = async function checkOut({ userId, latitude, longitude }) {
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

  record.checkOut = {
    time: checkOutTime,
    status,
    location: { latitude, longitude },
  };
  record.workingMinutes = minutes;
  await record.save();

  return record;
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
  // Use Asia/Dhaka or convert the date string to start of day in Dhaka
  const targetDate = dayjs(date).tz('Asia/Dhaka').startOf('day').toDate();

  const userQuery = { status: 'active', role: { $ne: 'admin' } };

  const users = await User.find(userQuery).populate('shiftId');
  const attendanceLogs = await Attendance.find({ attendanceDate: targetDate });

  const logMap = new Map(attendanceLogs.map((log) => [log.employeeId.toString(), log]));

  const todayDhaka = dayjs().tz('Asia/Dhaka').startOf('day');
  const targetDhaka = dayjs(date).tz('Asia/Dhaka').startOf('day');
  const nowDhaka = dayjs().tz('Asia/Dhaka');

  const rows = users.map((user) => {
    const log = logMap.get(user._id.toString());

    let status = '—';
    if (log?.checkIn) {
      status = log.checkIn.status;
    } else {
      if (user.shiftId) {
        if (targetDhaka.isAfter(todayDhaka)) {
          status = '—';
        } else if (targetDhaka.isBefore(todayDhaka)) {
          status = 'Absent';
        } else {
          // Today: check if shift is over
          const [eh, em] = user.shiftId.endTime.split(':').map(Number);
          let shiftEnd = targetDhaka.hour(eh).minute(em).second(0).millisecond(0);

          const [sh, sm] = user.shiftId.startTime.split(':').map(Number);
          const isOvernight = eh < sh || (eh === sh && em < sm);
          if (isOvernight) {
            shiftEnd = shiftEnd.add(1, 'day');
          }

          if (nowDhaka.isAfter(shiftEnd)) {
            status = 'Absent';
          } else {
            status = 'Not Checked In';
          }
        }
      } else {
        status = '—';
      }
    }

    return {
      employeeId: user._id,
      employeeName: user.name,
      employeeCode: user.employeeId,
      status,
      checkIn: log?.checkIn
        ? {
            time: log.checkIn.time,
            status: log.checkIn.status,
            location: log.checkIn.location,
          }
        : undefined,
      checkOut: log?.checkOut
        ? {
            time: log.checkOut.time,
            status: log.checkOut.status,
            location: log.checkOut.location,
          }
        : undefined,
      workingMinutes: log?.workingMinutes || 0,
    };
  });

  return rows;
};
