const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  unit: { type: String, default: 'sft', trim: true }, // sft, rft, pcs, set, lot, nos
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  supplierName: { type: String, trim: true, default: '' },
  supplierInvoiceNo: { type: String, trim: true, default: '' },
  purchaseAmount: { type: Number, default: 0, min: 0 },
  supplierDiscount: { type: Number, default: 0, min: 0 },
  netPurchase: { type: Number, default: 0, min: 0 },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    date: { type: Date, default: Date.now },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, trim: true },
    customerMobile: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectName: { type: String, required: true, trim: true },
    siteLocation: { type: String, trim: true },
    items: [billItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['percent', 'fixed', 'none'], default: 'none' },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    vatPercent: { type: Number, default: 0, min: 0 },
    vatAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    // Direct Costs per Bill (Odoo BillProfitBill)
    transportCharge: { type: Number, default: 0, min: 0 },
    fittingCharge: { type: Number, default: 0, min: 0 },
    salesCommission: { type: Number, default: 0, min: 0 },
    pattyBoxCharge: { type: Number, default: 0, min: 0 },
    salesReturn: { type: Number, default: 0, min: 0 },
    directCosts: { type: Number, default: 0, min: 0 },
    vendorTotalPurchase: { type: Number, default: 0, min: 0 },
    billProfit: { type: Number, default: 0 }, // totalAmount - (directCosts + vendorTotalPurchase)
    totalCashIn: { type: Number, default: 0, min: 0 },
    customerDue: { type: Number, default: 0 },
    paymentState: {
      type: String,
      enum: ['not_paid', 'partial', 'paid'],
      default: 'not_paid',
    },
    status: {
      type: String,
      enum: ['Draft', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

billSchema.index({ customerId: 1, date: -1 });
billSchema.index({ salespersonId: 1 });
billSchema.index({ status: 1 });

module.exports = mongoose.model('Bill', billSchema);
