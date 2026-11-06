const mongoose = require('mongoose');

const pettyCashEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['top_up', 'expense'], required: true },
  category: { type: String, trim: true }, // e.g., 'tea_snacks', 'hardware_urgent', 'local_fare', 'cleaning'
  amount: { type: Number, required: true, min: 0.01 },
  description: { type: String, required: true, trim: true },
  voucherRef: { type: String, trim: true },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const pettyCashAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Main Showroom Petty Cash" or "Gulshan Site Petty Cash"
    custodianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    entries: [pettyCashEntrySchema],
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PettyCash', pettyCashAccountSchema);
