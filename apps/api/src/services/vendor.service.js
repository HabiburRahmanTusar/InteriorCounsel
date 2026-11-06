const Vendor = require('../models/Vendor');
const VendorBill = require('../models/VendorBill');
const CashOut = require('../models/CashOut');

exports.listVendors = async ({ search, category, status, page = 1, limit = 20 }) => {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { vendorCode: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [vendors, total] = await Promise.all([
    Vendor.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Vendor.countDocuments(query),
  ]);

  return {
    data: vendors,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getVendorById = async (id) => {
  const vendor = await Vendor.findById(id);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  // Get material purchase bills and recent payments
  const [vendorBills, payments] = await Promise.all([
    VendorBill.find({ vendorId: id }).populate('mainBillId', 'billNumber projectName').sort({ date: -1 }),
    CashOut.find({ vendorId: id, type: 'purchase' }).sort({ date: -1 }).limit(10),
  ]);

  return {
    vendor,
    vendorBills,
    recentPayments: payments,
  };
};

exports.createVendor = async (data) => {
  const payload = { ...data };
  if (!payload.phone || !payload.phone.trim()) {
    payload.phone = '01XXXXXXXXX';
  }
  if (!payload.category || !payload.category.trim()) {
    payload.category = 'general_supply';
  }
  if (!payload.bankDetails && (payload.bankName || payload.bankAccountNumber || payload.bankAccountName)) {
    payload.bankDetails = {
      bankName: payload.bankName || '',
      accountName: payload.bankAccountName || '',
      accountNumber: payload.bankAccountNumber || '',
      branch: payload.branch || '',
      routingNumber: payload.routingNumber || '',
    };
  }
  const vendor = new Vendor(payload);
  return vendor.save();
};

exports.updateVendor = async (id, data) => {
  const vendor = await Vendor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }
  return vendor;
};

exports.deleteVendor = async (id) => {
  const vendor = await Vendor.findById(id);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const activeBills = await VendorBill.countDocuments({ vendorId: id });
  if (activeBills > 0) {
    const error = new Error('Cannot delete vendor with associated purchase bills. Deactivate instead.');
    error.statusCode = 400;
    throw error;
  }

  await vendor.deleteOne();
  return { message: 'Vendor deleted successfully' };
};

exports.applySupplierDiscount = async (vendorId, { vendorBillId, billNo, supplierRef, type, value, date, note }) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const vendorBill = await VendorBill.findById(vendorBillId);
  if (!vendorBill) {
    const error = new Error('Vendor bill not found');
    error.statusCode = 404;
    throw error;
  }

  let discountAmount = 0;
  if (type === 'Percent') {
    discountAmount = Number(((vendorBill.totalAmount * Number(value)) / 100).toFixed(2));
  } else {
    discountAmount = Number(Number(value).toFixed(2));
  }

  if (discountAmount <= 0) {
    const error = new Error('Discount amount must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const currentNet = Math.max(0, vendorBill.totalAmount - (vendorBill.discountAmount || 0));
  if (discountAmount > currentNet) {
    const error = new Error(`Discount cannot exceed remaining net purchase of ৳${currentNet}`);
    error.statusCode = 400;
    throw error;
  }

  vendorBill.discountAmount = Number(((vendorBill.discountAmount || 0) + discountAmount).toFixed(2));
  await vendorBill.save();

  const discountEntry = {
    date: date ? new Date(date) : new Date(),
    billNo: billNo || (vendorBill.mainBillId ? 'Master Bill' : 'General Stock'),
    supplierRef: supplierRef || vendorBill.billRef || '',
    vendorBillId: vendorBill._id,
    type: type || 'Fixed',
    value: Number(value),
    amount: discountAmount,
    note: note || '',
  };

  vendor.discounts.push(discountEntry);
  vendor.totalDiscountReceived = Number(((vendor.totalDiscountReceived || 0) + discountAmount).toFixed(2));
  await vendor.save();

  return { vendor, vendorBill, discount: discountEntry };
};

exports.reverseSupplierDiscount = async (vendorId, discountId) => {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found');
    error.statusCode = 404;
    throw error;
  }

  const discountIndex = vendor.discounts.findIndex((d) => d._id.toString() === discountId.toString());
  if (discountIndex === -1) {
    const error = new Error('Discount record not found');
    error.statusCode = 404;
    throw error;
  }

  const [discount] = vendor.discounts.splice(discountIndex, 1);
  vendor.totalDiscountReceived = Math.max(0, Number(((vendor.totalDiscountReceived || 0) - discount.amount).toFixed(2)));
  await vendor.save();

  if (discount.vendorBillId) {
    const vendorBill = await VendorBill.findById(discount.vendorBillId);
    if (vendorBill) {
      vendorBill.discountAmount = Math.max(0, Number(((vendorBill.discountAmount || 0) - discount.amount).toFixed(2)));
      await vendorBill.save();
    }
  }

  return { vendor, reversedDiscount: discount };
};
