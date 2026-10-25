const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    phone: { type: String, trim: true, default: '01XXXXXXXXX' },
    email: { type: String, lowercase: true, trim: true },
    billingAddress: { type: String, trim: true },
    siteAddress: { type: String, trim: true }, // Interior project/site location
    address: { type: String, trim: true },
    totalBilled: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    dueBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate Customer Code if not supplied (e.g. CUST-0001)
customerSchema.pre('save', async function (next) {
  if (!this.customerCode) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerCode = `CUST-${String(count + 1).padStart(4, '0')}`;
  }
  this.dueBalance = Number(((this.totalBilled || 0) - (this.totalPaid || 0)).toFixed(2));
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
