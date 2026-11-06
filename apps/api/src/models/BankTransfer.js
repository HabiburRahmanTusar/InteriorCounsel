const mongoose = require('mongoose');

const bankTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, unique: true, uppercase: true, trim: true },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    transferFrom: { type: String, required: true, trim: true }, // e.g. Cash, Mercantile Bank, City Bank, Brac Bank
    transferTo: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    memo: { type: String, trim: true },
    chequeNo: { type: String, trim: true },
    chequeDate: { type: String, trim: true },
    status: { type: String, enum: ['Draft', 'Confirmed'], default: 'Confirmed' },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bankTransferSchema.pre('save', async function (next) {
  if (!this.transferNumber) {
    const count = await mongoose.model('BankTransfer').countDocuments();
    this.transferNumber = `Int.Trns/${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('BankTransfer', bankTransferSchema);
