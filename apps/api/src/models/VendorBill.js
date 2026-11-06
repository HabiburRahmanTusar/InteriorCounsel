const mongoose = require('mongoose');

const vendorBillItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  unit: { type: String, default: 'pcs', trim: true }, // sheets, sft, pcs, kgs, boxes, rolls, meters
  quantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  isSelected: { type: Boolean, default: true }, // Odoo: tick to supply this line from master bill
});

const vendorBillSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, trim: true },
    billRef: { type: String, trim: true }, // Vendor's own invoice # (e.g. INV-SUPPLIER-8842)
    stockPurposeNumber: { type: String, trim: true }, // Odoo: stock_purpose_number for general inventory without a customer bill
    date: { type: Date, default: Date.now },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    mainBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // Link to interior project if job-specific
    category: {
      type: String,
      enum: [
        'wood_board',
        'hardware',
        'glass_mirror',
        'fabric_curtain',
        'lighting_electric',
        'paint_polish',
        'fitting_labor',
        'transport',
        'general_supply',
        'others',
      ],
      default: 'general_supply',
    },
    items: [vendorBillItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    vendorDue: { type: Number, default: 0 },
    paymentState: {
      type: String,
      enum: ['not_paid', 'partial', 'paid'],
      default: 'not_paid',
    },
    status: {
      type: String,
      enum: ['Draft', 'Confirmed', 'Paid', 'Cancelled'],
      default: 'Draft',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-prune unselected lines from vendor bill (Odoo _prune_unselected_lines)
vendorBillSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.items = this.items.filter((item) => item.isSelected !== false);
  }
  this.netAmount = Math.max(0, Number(((this.totalAmount || 0) - (this.discountAmount || 0)).toFixed(2)));
  this.vendorDue = Math.max(0, Number(((this.netAmount) - (this.paidAmount || 0)).toFixed(2)));
  if (this.vendorDue <= 0 && this.paidAmount > 0) {
    this.paymentState = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentState = 'partial';
  } else {
    this.paymentState = 'not_paid';
  }
  next();
});

vendorBillSchema.index({ vendorId: 1, date: -1 });
vendorBillSchema.index({ mainBillId: 1 });
vendorBillSchema.index({ status: 1 });

module.exports = mongoose.model('VendorBill', vendorBillSchema);
