const mongoose = require('mongoose');

const cashInSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, unique: true, uppercase: true, trim: true },
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ['customer_payment', 'investment', 'patty_return', 'others'],
      default: 'customer_payment',
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Optional if investment or petty return
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // Linked Project Bill
    pettyCashId: { type: mongoose.Schema.Types.ObjectId, ref: 'PettyCash' }, // For patty_return
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'mfs'],
      default: 'cash',
    },
    bankName: { type: String, trim: true },
    chequeNumber: { type: String, trim: true },
    transactionRef: { type: String, trim: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

cashInSchema.index({ customerId: 1, date: -1 });
cashInSchema.index({ billId: 1 });

module.exports = mongoose.model('CashIn', cashInSchema);
