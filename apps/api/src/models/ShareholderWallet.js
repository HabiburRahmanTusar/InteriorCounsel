const mongoose = require('mongoose');

const shareholderTransactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ['distribution', 'withdrawal'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0.01 },
  month: { type: String }, // e.g. "2026-10"
  reference: { type: String, trim: true }, // Voucher # or distribution ID
  cashOutId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashOut' },
  notes: { type: String, trim: true },
});

const shareholderWalletSchema = new mongoose.Schema(
  {
    shareholderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sharePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    totalDistributed: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0 },
    transactions: [shareholderTransactionSchema],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

shareholderWalletSchema.pre('save', function (next) {
  this.currentBalance = Number(((this.totalDistributed || 0) - (this.totalWithdrawn || 0)).toFixed(2));
  next();
});

module.exports = mongoose.model('ShareholderWallet', shareholderWalletSchema);
