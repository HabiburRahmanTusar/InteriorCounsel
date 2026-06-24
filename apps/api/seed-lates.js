const mongoose = require('mongoose');
const User = require('./src/models/User');
const Attendance = require('./src/models/Attendance');
const automation = require('./src/services/automation.service');
const { dayjs } = require('./src/utils/time');

mongoose.connect('mongodb://localhost:27017/workforce_management').then(async () => {
  const users = await User.find({ role: { $ne: 'admin' }, status: 'active' }).limit(2);
  
  if (users.length < 2) {
    console.log('Not enough active employees found.');
    process.exit(1);
  }

  const user1 = users[0]; // 3 lates
  const user2 = users[1]; // 8 lates

  // Clear existing attendances for these users this month to start fresh
  const startOfMonth = dayjs().tz('Asia/Dhaka').startOf('month').toDate();
  const endOfMonth = dayjs().tz('Asia/Dhaka').endOf('month').toDate();
  
  await Attendance.deleteMany({
    employeeId: { $in: [user1._id, user2._id] },
    attendanceDate: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const monthStr = dayjs().tz('Asia/Dhaka').format('YYYY-MM');
  let currentDay = dayjs(monthStr).tz('Asia/Dhaka').startOf('month');
  
  const weekends = await automation.getWeekends();
  
  let user1Lates = 0;
  let user2Lates = 0;

  // Generate attendances for the month
  while (currentDay.isBefore(endOfMonth)) {
    const dayName = currentDay.format('dddd');
    if (!weekends.includes(dayName)) {
      
      // User 1: 3 consecutive lates, then On Time
      if (user1Lates < 3) {
        await Attendance.create({
          employeeId: user1._id,
          attendanceDate: currentDay.toDate(),
          checkIn: { time: currentDay.hour(10).minute(0).toDate(), status: 'Late', ipAddress: '127.0.0.1', location: { latitude: 0, longitude: 0 } }
        });
        user1Lates++;
      } else if (user1Lates < 10) {
        // Just pad with some On Time records
        await Attendance.create({
          employeeId: user1._id,
          attendanceDate: currentDay.toDate(),
          checkIn: { time: currentDay.hour(8).minute(50).toDate(), status: 'On Time', ipAddress: '127.0.0.1', location: { latitude: 0, longitude: 0 } }
        });
        user1Lates++;
      }

      // User 2: 8 consecutive lates
      if (user2Lates < 8) {
        await Attendance.create({
          employeeId: user2._id,
          attendanceDate: currentDay.toDate(),
          checkIn: { time: currentDay.hour(10).minute(0).toDate(), status: 'Late', ipAddress: '127.0.0.1', location: { latitude: 0, longitude: 0 } }
        });
        user2Lates++;
      } else if (user2Lates < 10) {
        await Attendance.create({
          employeeId: user2._id,
          attendanceDate: currentDay.toDate(),
          checkIn: { time: currentDay.hour(8).minute(50).toDate(), status: 'On Time', ipAddress: '127.0.0.1', location: { latitude: 0, longitude: 0 } }
        });
        user2Lates++;
      }
    }
    currentDay = currentDay.add(1, 'day');
  }

  // Clear existing deduction logs for these users
  const DeductionLog = require('./src/models/DeductionLog');
  await DeductionLog.deleteMany({ employeeId: { $in: [user1._id, user2._id] }, month: monthStr });

  // Reset salary records
  const db = mongoose.connection.db;
  await db.collection('salaryrecords').updateMany({ employeeId: { $in: [user1._id, user2._id] } }, { $set: { status: 'Draft', deductedDays: 0, deductionAmount: 0 } });

  // Recalculate
  await automation.evaluateAllActive();

  console.log(`Successfully generated 3 consecutive lates for ${user1.name} and 8 consecutive lates for ${user2.name}`);
  console.log('Recalculation complete. Check the UI now!');
  process.exit(0);

}).catch(console.error);
