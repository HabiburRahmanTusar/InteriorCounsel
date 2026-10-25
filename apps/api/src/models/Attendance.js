/**
 * Attendance model — daily check-in / check-out records.
 * See build plan §5 `attendance` collection.
 *
 * Compound unique index on { employeeId, attendanceDate } enforces
 * the idempotency rule (one record per employee per day).
 */
const mongoose = require('mongoose');

const CHECK_IN_STATUSES = ['On Time', 'Late'];
const CHECK_OUT_STATUSES = ['Normal', 'Early Leave', 'Late Checkout'];

const geoPointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    address: { type: String },
  },
  { _id: false },
);

const checkInSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    status: { type: String, enum: CHECK_IN_STATUSES, required: true },
    location: geoPointSchema,
    lateMinutes: { type: Number, default: 0 },
  },
  { _id: false },
);

const checkOutSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    status: { type: String, enum: CHECK_OUT_STATUSES, required: true },
    location: geoPointSchema,
  },
  { _id: false },
);

const ATTENDANCE_STATUSES = ['present', 'absent', 'leave'];

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendanceDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'present',
      required: true,
    },
    late: { type: Boolean, default: false },
    overview: { type: String, default: '' }, // e.g. "ON Time", "15 Min Late", "1H 30Min Late", "Leave", "Absent"
    workingHoursDisplay: { type: String, default: '00 H 00 Min' },
    checkIn: checkInSchema,
    checkOut: checkOutSchema,
    workingMinutes: { type: Number, default: 0, min: 0 },
    // 12-hour AM/PM friendly manual fields from Odoo
    checkInTime: { type: String, trim: true },
    checkInPeriod: { type: String, enum: ['AM', 'PM'], default: 'AM' },
    checkOutTime: { type: String, trim: true },
    checkOutPeriod: { type: String, enum: ['AM', 'PM'], default: 'PM' },
    note: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

attendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ attendanceDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.CHECK_IN_STATUSES = CHECK_IN_STATUSES;
module.exports.CHECK_OUT_STATUSES = CHECK_OUT_STATUSES;
