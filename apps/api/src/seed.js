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
const SalaryRecord = require('./models/SalaryRecord');
const DeductionLog = require('./models/DeductionLog');
const SystemSetting = require('./models/SystemSetting');
const Holiday = require('./models/Holiday');

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
    await Promise.all([
      User.deleteMany({}),
      Shift.deleteMany({}),
      Attendance.deleteMany({}),
      SalaryRecord.deleteMany({}),
      DeductionLog.deleteMany({}),
      SystemSetting.deleteMany({}),
      Holiday.deleteMany({}),
    ]);
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

    log.info('Users seeded.');

    log.info('----------------------------------------------');
    log.info('Database Seeding Completed Successfully!');
    log.info('----------------------------------------------');
    log.info('Seed Credentials:');
    log.info('  Admin:   admin@attendly.com   / password123');
    log.info('----------------------------------------------');
  } catch (error) {
    log.error('Error seeding database:', error);
  } finally {
    await disconnectDatabase();
    log.info('Database connection closed.');
  }
}

seed();
