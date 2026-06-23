const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { isWithinOfficeRadius } = require('../utils/haversine');
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
  const user = await User.findById(userId).populate('shiftId').populate('officeLocationId');
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
  if (!user.officeLocationId) {
    const error = new Error('User has no assigned office location');
    error.status = 400;
    throw error;
  }

  // Geofence check
  const withinFence = isWithinOfficeRadius({ latitude, longitude }, user.officeLocationId);
  if (!withinFence) {
    const error = new Error('Out of office geofence bounds');
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
  const user = await User.findById(userId).populate('shiftId').populate('officeLocationId');
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
  if (!user.officeLocationId) {
    const error = new Error('User has no assigned office location');
    error.status = 400;
    throw error;
  }

  // Geofence check
  const withinFence = isWithinOfficeRadius({ latitude, longitude }, user.officeLocationId);
  if (!withinFence) {
    const error = new Error('Out of office geofence bounds');
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

  const status = checkOutStatus(new Date(), user.shiftId);
  const checkOutTime = new Date();
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

  const userQuery = { status: 'active' };

  const users = await User.find(userQuery);
  const attendanceLogs = await Attendance.find({ attendanceDate: targetDate });

  const logMap = new Map(attendanceLogs.map((log) => [log.employeeId.toString(), log]));

  const rows = users.map((user) => {
    const log = logMap.get(user._id.toString());
    return {
      employeeId: user._id,
      employeeName: user.name,
      employeeCode: user.employeeId,
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
