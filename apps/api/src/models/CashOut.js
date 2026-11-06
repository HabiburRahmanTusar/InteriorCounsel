const mongoose = require('mongoose');

const CASH_OUT_TYPES = [
  'purchase',          // Vendor material purchase
  'transport',         // Transport & carriage
  'commission',        // Sales / Designer commission
  'petty_box',         // HPL Carrying / Petty Box
  'sales_return',      // Sales Return & Adjustments
  'fitting_charge',    // Carpentry & fitting labor
  'showroom_expense',  // Showroom daily supplies
  'operating_expense', // General operational expense
  'entertainment',     // Entertainment & guest hospitality
  'conveyance',        // Local travel & site conveyance
  'showroom_rent',     // Showroom / Workshop rent
  'electricity_bill',  // Electric utility bill
  'mobile_bill',       // Phone / Internet bill
  'wasa_bill',         // Water / WASA bill
  'vat',               // VAT & Tax
  'petty_cash',        // Top-up for petty cash float
  'salary',            // Employee monthly salary payout
  'withdraw_profit',   // Owner / Shareholder profit withdrawal
  'others',
];

const cashOutSchema = new mongoose.Schema(
  {
    voucherNumber: { type: String, unique: true, uppercase: true, trim: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: CASH_OUT_TYPES, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'cheque', 'mfs'],
      default: 'cash',
    },
    // Links based on expense type
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendorBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorBill' },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // Link to specific interior project
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For salary or staff payout
    salaryRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryRecord' }, // Auto-links to monthly salary
    shareholderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For withdraw_profit
    pettyCashId: { type: mongoose.Schema.Types.ObjectId, ref: 'PettyCash' }, // For petty_cash float disbursement
    recipientName: { type: String, trim: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bankName: { type: String, trim: true },
    chequeNumber: { type: String, trim: true },
    transactionRef: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

cashOutSchema.index({ type: 1, date: -1 });
cashOutSchema.index({ vendorId: 1 });
cashOutSchema.index({ billId: 1 });
cashOutSchema.index({ employeeId: 1 });

module.exports = mongoose.model('CashOut', cashOutSchema);
module.exports.CASH_OUT_TYPES = CASH_OUT_TYPES;
