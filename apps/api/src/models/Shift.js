/**
 * Shift model — defines work timings + grace period.
 * See build plan §5 `shifts` collection.
 */
const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    gracePeriod: { type: Number, default: 15, min: 0, max: 120 },
    timezone: { type: String, default: 'Asia/Dhaka' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Shift', shiftSchema);
