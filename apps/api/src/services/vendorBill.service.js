const VendorBill = require('../models/VendorBill');
const Vendor = require('../models/Vendor');
const CashOut = require('../models/CashOut');
const billingService = require('./billing.service');

function calculateVendorBillTotals(data) {
  let totalAmount = 0;
  // Auto-prune unselected lines (Odoo _prune_unselected_lines)
  const items = (data.items || [])
    .filter((item) => item.isSelected !== false)
    .map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const amount = Number((qty * price).toFixed(2));
      totalAmount += amount;
      return {
        description: item.description,
        unit: item.unit || 'pcs',
        quantity: qty,
        unitPrice: price,
        amount,
        isSelected: true,
      };
    });

  return {
    items,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}

async function updateVendorFinancials(vendorId) {
  const bills = await VendorBill.find({ vendorId, status: { $ne: 'Cancelled' } });
  const grossPurchased = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalDiscountReceived = bills.reduce((acc, b) => acc + (b.discountAmount || 0), 0);
  const netPurchased = Number(Math.max(0, grossPurchased - totalDiscountReceived).toFixed(2));

  const payments = await CashOut.find({ vendorId, type: 'purchase' });
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const dueBalance = Number((netPurchased - totalPaid).toFixed(2));

  await Vendor.findByIdAndUpdate(vendorId, {
    totalPurchased: netPurchased,
    grossPurchased: Number(grossPurchased.toFixed(2)),
    totalDiscountReceived: Number(totalDiscountReceived.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    dueBalance,
  });
}

exports.listVendorBills = async ({ search, vendorId, mainBillId, paymentState, status, page = 1, limit = 20 }) => {
  const query = {};
  if (vendorId) query.vendorId = vendorId;
  if (mainBillId) query.mainBillId = mainBillId;
  if (paymentState) query.paymentState = paymentState;
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { billNumber: { $regex: search, $options: 'i' } },
      { billRef: { $regex: search, $options: 'i' } },
      { stockPurposeNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [bills, total] = await Promise.all([
    VendorBill.find(query)
      .populate('vendorId', 'name category phone')
      .populate('mainBillId', 'billNumber projectName')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VendorBill.countDocuments(query),
  ]);

  return {
    data: bills,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getVendorBillById = async (id) => {
  const bill = await VendorBill.findById(id)
    .populate('vendorId')
    .populate('mainBillId', 'billNumber projectName siteLocation');

  if (!bill) {
    const error = new Error('Vendor bill not found');
    error.statusCode = 404;
    throw error;
  }

  const payments = await CashOut.find({ vendorBillId: id }).populate('paidBy', 'name');

  return {
    bill,
    payments,
  };
};

exports.createVendorBill = async (data) => {
  // If not linked to customer bill, assign unique stock_purpose_number for general inventory
  if (!data.mainBillId && !data.stockPurposeNumber) {
    const count = await VendorBill.countDocuments({ mainBillId: { $exists: false } });
    const year = new Date().getFullYear();
    data.stockPurposeNumber = `STK-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  const totals = calculateVendorBillTotals(data);
  const discountAmount = Number(data.discountAmount) || 0;
  const netAmount = Math.max(0, Number((totals.totalAmount - discountAmount).toFixed(2)));
  const vendorBill = new VendorBill({
    ...data,
    ...totals,
    discountAmount,
    netAmount,
    paidAmount: 0,
    vendorDue: netAmount,
    paymentState: 'not_paid',
  });

  const saved = await vendorBill.save();
  await updateVendorFinancials(saved.vendorId);

  // Auto-sync Master Bill profitability in real time
  if (saved.mainBillId) {
    await billingService.recalculateBillProfit(saved.mainBillId);
  }

  return saved;
};

exports.updateVendorBill = async (id, data) => {
  const existing = await VendorBill.findById(id);
  if (!existing) {
    const error = new Error('Vendor bill not found');
    error.statusCode = 404;
    throw error;
  }

  const totals = calculateVendorBillTotals({
    items: data.items !== undefined ? data.items : existing.items,
  });

  const discountAmount = data.discountAmount !== undefined ? (Number(data.discountAmount) || 0) : (existing.discountAmount || 0);
  const netAmount = Math.max(0, Number((totals.totalAmount - discountAmount).toFixed(2)));
  const vendorDue = Math.max(0, Number((netAmount - (existing.paidAmount || 0)).toFixed(2)));
  let paymentState = 'not_paid';
  if (existing.paidAmount >= netAmount && netAmount > 0) {
    paymentState = 'paid';
  } else if (existing.paidAmount > 0) {
    paymentState = 'partial';
  }

  const updated = await VendorBill.findByIdAndUpdate(
    id,
    {
      ...data,
      ...totals,
      discountAmount,
      netAmount,
      vendorDue,
      paymentState,
    },
    { new: true, runValidators: true }
  );

  await updateVendorFinancials(updated.vendorId);

  // Auto-sync Master Bill profitability in real time
  if (updated.mainBillId) {
    await billingService.recalculateBillProfit(updated.mainBillId);
  }

  return updated;
};

exports.deleteVendorBill = async (id) => {
  const bill = await VendorBill.findById(id);
  if (!bill) {
    const error = new Error('Vendor bill not found');
    error.statusCode = 404;
    throw error;
  }

  if (bill.paidAmount > 0) {
    const error = new Error('Cannot delete vendor bill with existing payments.');
    error.statusCode = 400;
    throw error;
  }

  const vendorId = bill.vendorId;
  const mainBillId = bill.mainBillId;
  await bill.deleteOne();
  await updateVendorFinancials(vendorId);

  if (mainBillId) {
    await billingService.recalculateBillProfit(mainBillId);
  }

  return { message: 'Vendor bill deleted successfully' };
};

exports.updateVendorFinancials = updateVendorFinancials;
