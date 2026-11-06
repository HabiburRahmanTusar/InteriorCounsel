const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    productType: {
      type: String,
      enum: ['Storable Product', 'Consumable', 'Service'],
      default: 'Storable Product',
    },
    invoicingPolicy: {
      type: String,
      enum: ['Ordered quantities', 'Delivered quantities'],
      default: 'Ordered quantities',
    },
    category: { type: String, trim: true, default: 'General' },
    salesPrice: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, default: 'sft' }, // sft, rft, nos, cft, kg, etc.
    stockQuantity: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 0 },
    internalRef: { type: String, trim: true },
    barcode: { type: String, trim: true },
    tags: { type: String, trim: true },
    canBeSold: { type: Boolean, default: true },
    canBePurchased: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
