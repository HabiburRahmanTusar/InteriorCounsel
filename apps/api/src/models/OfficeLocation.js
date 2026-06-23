/**
 * Office location model — GPS coordinates + radius for check-in validation.
 * See build plan §5 `office_locations` collection.
 */
const mongoose = require('mongoose');

const officeLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    radius: { type: Number, required: true, min: 1, default: 100 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('OfficeLocation', officeLocationSchema);
