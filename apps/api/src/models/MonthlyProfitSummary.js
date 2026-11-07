const mongoose = require('mongoose');

const distributionLineSchema = new mongoose.Schema({
  shareholderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharePercentage: { type: Number, required: true },
  amount: { type: Number, required: true },
});

const monthlyProfitSummarySchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true }, // Format "YYYY-MM" or "YYYY-MM_to_YYYY-MM"
    fromMonth: { type: String }, // Format "YYYY-MM"
    toMonth: { type: String }, // Format "YYYY-MM"
    periodLabel: { type: String }, // e.g. "October 2026" or "October 2026 – November 2026"
    totalConfirmedSales: { type: Number, default: 0 }, // 1. Product Calculation (Gross Sales)
    // 2. Sales Expenses Breakdown
    salesExpenses: {
      purchasePayment: { type: Number, default: 0 },
      hplCarryingPettyBox: { type: Number, default: 0 },
      transportationCharge: { type: Number, default: 0 },
      salesCommission: { type: Number, default: 0 },
      salesReturn: { type: Number, default: 0 },
      fittingLabor: { type: Number, default: 0 },
      totalSalesExpenses: { type: Number, default: 0 },
    },
    // 3. Profit = Product Calculation - Sales Expenses
    profit: { type: Number, default: 0 },
    // 4. Office Expenses Breakdown
    officeExpenses: {
      rent: { type: Number, default: 0 },
      salaries: { type: Number, default: 0 },
      electricity: { type: Number, default: 0 },
      wasa: { type: Number, default: 0 },
      internet: { type: Number, default: 0 },
      conveyance: { type: Number, default: 0 },
      entertainment: { type: Number, default: 0 },
      admin: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      totalOfficeExpenses: { type: Number, default: 0 },
    },
    // Legacy support fields so existing interfaces continue working smoothly
    totalPurchases: { type: Number, default: 0 },
    directCosts: { type: Number, default: 0 }, // transport, fitting, commission, patty_box
    investments: { type: Number, default: 0 },
    operationalExpenses: { type: Number, default: 0 }, // rent, utilities, salaries, etc.
    netProfit: { type: Number, default: 0 }, // 5. Net Profit = Profit - Office Expenses
    isDistributed: { type: Boolean, default: false },
    distributionDate: { type: Date },
    distributionLines: [distributionLineSchema],
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MonthlyProfitSummary', monthlyProfitSummarySchema);
