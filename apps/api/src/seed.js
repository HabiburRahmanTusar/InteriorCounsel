/**
 * Database Seeder Script.
 * Populates MongoDB with standard shifts, locations, departments, users of all roles,
 * and realistic attendance logs.
 */
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const config = require('./config');
const { connectDatabase, disconnectDatabase } = require('./config/db');

// Models
const User = require('./models/User');
const Shift = require('./models/Shift');
const Attendance = require('./models/Attendance');

// Custom logger fallback
const log = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
};

async function seed() {
  const uri = config.mongodbUri || 'mongodb://localhost:27017/workforce_management';
  log.info(`Connecting to database: ${uri}`);

  await connectDatabase(uri);

  try {
    // 1. Clear Existing Data
    log.info('Clearing old database records...');
    await Promise.all([User.deleteMany({}), Shift.deleteMany({}), Attendance.deleteMany({})]);
    log.info('Database cleared.');

    // 2. Seed Shifts
    log.info('Seeding Shifts...');
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
    log.info('Shifts seeded successfully.');

    // 4. Seed Users (Scaffolding / Passwords hashed automatically via User model pre-save hook)
    log.info('Seeding Users...');

    // Seed Admin
    const adminUser = await User.create({
      employeeId: 'EMP00001',
      name: 'System Admin',
      email: 'admin@attendly.com',
      password: 'password123',
      phone: '+8801700000001',
      designation: 'IT Director',
      role: 'admin',
      status: 'active',
    });

    // Seed HR Manager
    const hrUser = await User.create({
      employeeId: 'EMP00002',
      name: 'Sarah Rahman',
      email: 'hr@attendly.com',
      password: 'password123',
      phone: '+8801700000002',
      designation: 'HR Executive',
      role: 'hr',
      status: 'active',
    });

    // Seed Manager
    const managerUser = await User.create({
      employeeId: 'EMP00003',
      name: 'Imran Khan',
      email: 'manager@attendly.com',
      password: 'password123',
      phone: '+8801700000003',
      designation: 'Engineering Manager',
      role: 'manager',
      shiftId: dayShift._id,
      status: 'active',
    });

    // Seed Employee
    const employeeUser = await User.create({
      employeeId: 'EMP00004',
      name: 'Tanvir Hossain',
      email: 'employee@attendly.com',
      password: 'password123',
      phone: '+8801700000004',
      designation: 'Senior Developer',
      role: 'employee',
      shiftId: dayShift._id,
      status: 'active',
    });

    log.info('Users seeded.');

    // 6. Seed Attendance Logs (5 days of history for employee user)
    log.info('Seeding Attendance records...');
    const today = new Date();

    // Helper to construct dates at specific hours/minutes in local timezone
    const makeDate = (daysAgo, hours, minutes) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const attendanceRecords = [
      // Day 1 (4 days ago) - On Time check-in, normal check-out
      {
        employeeId: employeeUser._id,
        attendanceDate: makeDate(4, 0, 0),
        checkIn: {
          time: makeDate(4, 8, 52), // 08:52 AM
          status: 'On Time',
          location: { latitude: 23.8101, longitude: 90.4124 },
        },
        checkOut: {
          time: makeDate(4, 18, 5), // 06:05 PM
          status: 'Normal',
          location: { latitude: 23.8102, longitude: 90.4123 },
        },
        workingMinutes: 553,
      },
      // Day 2 (3 days ago) - Within Grace period check-in, normal check-out
      {
        employeeId: employeeUser._id,
        attendanceDate: makeDate(3, 0, 0),
        checkIn: {
          time: makeDate(3, 9, 12), // 09:12 AM (Grace period is 15 mins)
          status: 'On Time',
          location: { latitude: 23.8103, longitude: 90.4125 },
        },
        checkOut: {
          time: makeDate(3, 18, 1), // 06:01 PM
          status: 'Normal',
          location: { latitude: 23.8102, longitude: 90.4124 },
        },
        workingMinutes: 529,
      },
      // Day 3 (2 days ago) - Late check-in, normal check-out
      {
        employeeId: employeeUser._id,
        attendanceDate: makeDate(2, 0, 0),
        checkIn: {
          time: makeDate(2, 9, 32), // 09:32 AM (Late)
          status: 'Late',
          location: { latitude: 23.8104, longitude: 90.4126 },
        },
        checkOut: {
          time: makeDate(2, 18, 0), // 06:00 PM
          status: 'Normal',
          location: { latitude: 23.8103, longitude: 90.4125 },
        },
        workingMinutes: 508,
      },
      // Day 4 (1 day ago) - On Time check-in, early leave check-out
      {
        employeeId: employeeUser._id,
        attendanceDate: makeDate(1, 0, 0),
        checkIn: {
          time: makeDate(1, 8, 58), // 08:58 AM
          status: 'On Time',
          location: { latitude: 23.8102, longitude: 90.4124 },
        },
        checkOut: {
          time: makeDate(1, 16, 45), // 04:45 PM (Early Leave)
          status: 'Early Leave',
          location: { latitude: 23.8103, longitude: 90.4125 },
        },
        workingMinutes: 467,
      },
      // Day 5 (Today) - Checked-in, not yet checked-out
      {
        employeeId: employeeUser._id,
        attendanceDate: makeDate(0, 0, 0),
        checkIn: {
          time: makeDate(0, 8, 55), // 08:55 AM
          status: 'On Time',
          location: { latitude: 23.8103, longitude: 90.4125 },
        },
        workingMinutes: 0,
      },
    ];

    await Attendance.create(attendanceRecords);
    log.info('Attendance logs seeded successfully.');

    log.info('----------------------------------------------');
    log.info('Database Seeding Completed Successfully!');
    log.info('----------------------------------------------');
    log.info('Seed Credentials:');
    log.info('  Admin:   admin@attendly.com   / password123');
    log.info('  HR:      hr@attendly.com      / password123');
    log.info('  Manager: manager@attendly.com / password123');
    log.info('  Emp:     employee@attendly.com/ password123');
    log.info('----------------------------------------------');
  } catch (error) {
    log.error('Error seeding database:', error);
  } finally {
    await disconnectDatabase();
    log.info('Database connection closed.');
  }
}

seed();
