/**
 * Attendance model — daily check-in / check-out records.
 * See build plan §5 `attendance` collection.
 *
 * Compound unique index on { employeeId, attendanceDate } enforces
 * the idempotency rule (one record per employee per day).
 */
const mongoose = require('mongoose');

const CHECK_IN_STATUSES = ['On Time', 'Late'];
const CHECK_OUT_STATUSES = ['Normal', 'Early Leave'];

const geoPointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const checkInSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    status: { type: String, enum: CHECK_IN_STATUSES, required: true },
    location: geoPointSchema,
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

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendanceDate: { type: Date, required: true },
    checkIn: checkInSchema,
    checkOut: checkOutSchema,
    workingMinutes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ attendanceDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.CHECK_IN_STATUSES = CHECK_IN_STATUSES;
module.exports.CHECK_OUT_STATUSES = CHECK_OUT_STATUSES;
