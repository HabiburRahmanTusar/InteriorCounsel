const mongoose = require('mongoose');

const VENDOR_CATEGORIES = [
  'wood_board',       // Plywood, MDF, HDF, Solid Wood, Veneer
  'hardware',         // Hinges, channels, locks, handles, fittings
  'glass_mirror',     // Tempered glass, frosted glass, mirrors
  'fabric_curtain',   // Upholstery, curtains, blinds
  'lighting_electric',// Lights, fixtures, cabling, switches
  'paint_polish',     // Duco paint, lacquer polish, wall paint
  'fitting_labor',    // Carpentry, installation, civil contractors
  'transport',        // Logistics, freight, delivery trucks
  'general_supply',   // Fasteners, adhesives, tools, general materials
  'others',
];

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: { type: String, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true, default: '01XXXXXXXXX' },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    tradeLicense: { type: String, trim: true },
    category: {
      type: String,
      default: 'general_supply',
      trim: true,
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      branch: { type: String, trim: true },
      routingNumber: { type: String, trim: true },
    },
    totalPurchased: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    totalDiscountReceived: { type: Number, default: 0, min: 0 },
    dueBalance: { type: Number, default: 0 },
    discounts: [
      {
        date: { type: Date, default: Date.now },
        billNo: { type: String, trim: true },
        supplierRef: { type: String, trim: true },
        vendorBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorBill' },
        type: { type: String, enum: ['Fixed', 'Percent'], default: 'Fixed' },
        value: { type: Number, default: 0 },
        amount: { type: Number, required: true },
        note: { type: String, trim: true },
      },
    ],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate Vendor Code if not supplied (e.g. VND-0001)
vendorSchema.pre('save', async function (next) {
  if (!this.vendorCode) {
    const count = await mongoose.model('Vendor').countDocuments();
    this.vendorCode = `VND-${String(count + 1).padStart(4, '0')}`;
  }
  const purchased = this.totalPurchased || 0;
  const discount = this.totalDiscountReceived || 0;
  const paid = this.totalPaid || 0;
  this.dueBalance = Number((purchased - discount - paid).toFixed(2));
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
module.exports.VENDOR_CATEGORIES = VENDOR_CATEGORIES;
