const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema(
  {
    period: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // YYYY-MM
    monthlySales: { type: Number, required: true, default: 0 },
    monthlyProfit: { type: Number, required: true, default: 0 },
    outstandingDue: { type: Number, required: true, default: 0 },
    billsPendingCollection: { type: Number, required: true, default: 0 },
    prevProfitShareBalance: { type: Number, required: true, default: 0 },
    recentProfit: { type: Number, required: true, default: 0 },
    currentTotalBalance: { type: Number, required: true, default: 0 },
    monthlySubsidy: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

// Index period for sorting, searching, and quick lookup
financialRecordSchema.index({ period: 1 });

module.exports = mongoose.model('FinancialRecord', financialRecordSchema);
