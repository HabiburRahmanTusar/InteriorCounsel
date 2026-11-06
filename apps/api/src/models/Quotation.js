const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  unit: { type: String, default: 'sft', trim: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    date: { type: Date, default: Date.now },
    validUntil: { type: Date },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectName: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['percent', 'fixed', 'none'], default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0 },
    vatAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Approved', 'Rejected', 'Converted to Bill'],
      default: 'Draft',
    },
    convertedBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    termsAndConditions: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

quotationSchema.pre('validate', async function (next) {
  if (!this.quotationNumber) {
    const count = await mongoose.model('Quotation').countDocuments();
    const year = new Date().getFullYear();
    this.quotationNumber = `QT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate Subtotal
  this.subtotal = (this.items || []).reduce((acc, it) => {
    it.amount = Number(((it.quantity || 0) * (it.unitPrice || 0)).toFixed(2));
    return acc + it.amount;
  }, 0);
  this.subtotal = Number(this.subtotal.toFixed(2));

  // Compute Discount
  if (this.discountType === 'percent') {
    this.discountAmount = Number(((this.subtotal * (this.discountValue || 0)) / 100).toFixed(2));
  } else if (this.discountType === 'fixed') {
    this.discountAmount = Number((this.discountValue || 0).toFixed(2));
  } else {
    this.discountAmount = 0;
  }

  const afterDiscount = Math.max(0, this.subtotal - this.discountAmount);

  // Compute VAT
  if (this.vatPercent && this.vatPercent > 0) {
    this.vatAmount = Number(((afterDiscount * this.vatPercent) / 100).toFixed(2));
  } else {
    this.vatAmount = 0;
  }

  this.totalAmount = Number((afterDiscount + this.vatAmount).toFixed(2));
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
