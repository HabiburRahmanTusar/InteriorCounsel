const mongoose = require('mongoose');

const distributionLineSchema = new mongoose.Schema({
  shareholderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharePercentage: { type: Number, required: true },
  amount: { type: Number, required: true },
});

const monthlyProfitSummarySchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // Format "YYYY-MM"
    totalConfirmedSales: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    directCosts: { type: Number, default: 0 }, // transport, fitting, commission, patty_box
    investments: { type: Number, default: 0 },
    operationalExpenses: { type: Number, default: 0 }, // rent, utilities, salaries, etc.
    netProfit: { type: Number, default: 0 },
    isDistributed: { type: Boolean, default: false },
    distributionDate: { type: Date },
    distributionLines: [distributionLineSchema],
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthlyProfitSummary', monthlyProfitSummarySchema);
