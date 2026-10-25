const CashIn = require('../models/CashIn');
const CashOut = require('../models/CashOut');
const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const VendorBill = require('../models/VendorBill');
const Vendor = require('../models/Vendor');
const SalaryRecord = require('../models/SalaryRecord');
const PettyCash = require('../models/PettyCash');
const shareholderService = require('./shareholder.service');

// Helper to update Bill after Cash In
async function syncBillAfterCashIn(billId) {
  if (!billId) return;
  const payments = await CashIn.find({ billId });
  const totalCashIn = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const bill = await Bill.findById(billId);
  if (!bill) return;

  const customerDue = Number(((bill.totalAmount || 0) - totalCashIn).toFixed(2));
  let paymentState = 'not_paid';
  if (totalCashIn >= (bill.totalAmount || 0) && (bill.totalAmount || 0) > 0) {
    paymentState = 'paid';
  } else if (totalCashIn > 0) {
    paymentState = 'partial';
  }

  await Bill.findByIdAndUpdate(billId, {
    totalCashIn: Number(totalCashIn.toFixed(2)),
    customerDue,
    paymentState,
  });

  // Sync customer
  if (bill.customerId) {
    const customerPayments = await CashIn.find({ customerId: bill.customerId });
    const totalPaid = customerPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const customer = await Customer.findById(bill.customerId);
    if (customer) {
      await Customer.findByIdAndUpdate(bill.customerId, {
        totalPaid: Number(totalPaid.toFixed(2)),
        dueBalance: Number(((customer.totalBilled || 0) - totalPaid).toFixed(2)),
      });
    }
  }
}

// Helper to update VendorBill after Cash Out
async function syncVendorBillAfterCashOut(vendorBillId) {
  if (!vendorBillId) return;
  const payments = await CashOut.find({ vendorBillId });
  const paidAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const vBill = await VendorBill.findById(vendorBillId);
  if (!vBill) return;

  const vendorDue = Number(((vBill.totalAmount || 0) - paidAmount).toFixed(2));
  let paymentState = 'not_paid';
  if (paidAmount >= (vBill.totalAmount || 0) && (vBill.totalAmount || 0) > 0) {
    paymentState = 'paid';
  } else if (paidAmount > 0) {
    paymentState = 'partial';
  }

  await VendorBill.findByIdAndUpdate(vendorBillId, {
    paidAmount: Number(paidAmount.toFixed(2)),
    vendorDue,
    paymentState,
  });

  // Sync vendor
  if (vBill.vendorId) {
    const vendorPayments = await CashOut.find({ vendorId: vBill.vendorId, type: 'purchase' });
    const totalPaid = vendorPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const vendor = await Vendor.findById(vBill.vendorId);
    if (vendor) {
      await Vendor.findByIdAndUpdate(vBill.vendorId, {
        totalPaid: Number(totalPaid.toFixed(2)),
        dueBalance: Number(((vendor.totalPurchased || 0) - totalPaid).toFixed(2)),
      });
    }
  }
}

// -------------------------------------------------------------
// Cash In Operations
// -------------------------------------------------------------

exports.listCashIn = async ({ search, customerId, billId, paymentMethod, type, page = 1, limit = 20 }) => {
  const query = {};
  if (customerId) query.customerId = customerId;
  if (billId) query.billId = billId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { receiptNumber: { $regex: search, $options: 'i' } },
      { transactionRef: { $regex: search, $options: 'i' } },
      { chequeNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [records, total] = await Promise.all([
    CashIn.find(query)
      .populate('customerId', 'name companyName phone')
      .populate('billId', 'billNumber projectName')
      .populate('pettyCashId', 'name balance')
      .populate('receivedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    CashIn.countDocuments(query),
  ]);

  return {
    data: records,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.recordCashIn = async (data, userId) => {
  if (!data.receiptNumber) {
    const count = await CashIn.countDocuments();
    const year = new Date().getFullYear();
    data.receiptNumber = `REC-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Odoo Validation: Cash In cannot exceed total bill amount
  if (data.billId) {
    const bill = await Bill.findById(data.billId);
    if (bill && data.amount > (bill.customerDue || 0)) {
      const err = new Error(
        `Payment amount (৳${data.amount}) cannot exceed current customer due (৳${bill.customerDue})`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const record = new CashIn({
    ...data,
    receivedBy: userId || data.receivedBy,
  });

  const saved = await record.save();

  // 1. If linked to customer project bill
  if (saved.billId) {
    await syncBillAfterCashIn(saved.billId);
  } else if (saved.customerId) {
    const payments = await CashIn.find({ customerId: saved.customerId });
    const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const customer = await Customer.findById(saved.customerId);
    if (customer) {
      await Customer.findByIdAndUpdate(saved.customerId, {
        totalPaid: Number(totalPaid.toFixed(2)),
        dueBalance: Number(((customer.totalBilled || 0) - totalPaid).toFixed(2)),
      });
    }
  }

  // 2. Petty cash return flow (Odoo patty_return)
  if (saved.type === 'patty_return' && saved.pettyCashId) {
    const pettyCash = await PettyCash.findById(saved.pettyCashId);
    if (pettyCash) {
      pettyCash.balance = Number(((pettyCash.balance || 0) - saved.amount).toFixed(2));
      pettyCash.entries.push({
        date: saved.date,
        type: 'expense',
        category: 'cash_in_return',
        amount: saved.amount,
        description: `Petty cash returned to bank/cash via ${saved.receiptNumber}`,
        voucherRef: saved.receiptNumber,
        loggedBy: saved.receivedBy,
      });
      await pettyCash.save();
    }
  }

  return saved;
};

exports.deleteCashIn = async (id) => {
  const record = await CashIn.findById(id);
  if (!record) {
    const error = new Error('Cash In record not found');
    error.statusCode = 404;
    throw error;
  }

  const billId = record.billId;
  const customerId = record.customerId;
  await record.deleteOne();

  if (billId) await syncBillAfterCashIn(billId);
  if (customerId) {
    const customerPayments = await CashIn.find({ customerId });
    const totalPaid = customerPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const customer = await Customer.findById(customerId);
    if (customer) {
      await Customer.findByIdAndUpdate(customerId, {
        totalPaid: Number(totalPaid.toFixed(2)),
        dueBalance: Number(((customer.totalBilled || 0) - totalPaid).toFixed(2)),
      });
    }
  }

  return { message: 'Cash In record deleted' };
};

// -------------------------------------------------------------
// Cash Out Operations
// -------------------------------------------------------------

exports.listCashOut = async ({ search, type, vendorId, billId, employeeId, shareholderId, paymentMethod, page = 1, limit = 20 }) => {
  const query = {};
  if (type) query.type = type;
  if (vendorId) query.vendorId = vendorId;
  if (billId) query.billId = billId;
  if (employeeId) query.employeeId = employeeId;
  if (shareholderId) query.shareholderId = shareholderId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (search) {
    query.$or = [
      { voucherNumber: { $regex: search, $options: 'i' } },
      { recipientName: { $regex: search, $options: 'i' } },
      { transactionRef: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [records, total] = await Promise.all([
    CashOut.find(query)
      .populate('vendorId', 'name category phone')
      .populate('vendorBillId', 'billNumber totalAmount billRef')
      .populate('billId', 'billNumber projectName')
      .populate('employeeId', 'name employeeId designation')
      .populate('shareholderId', 'name employeeId')
      .populate('pettyCashId', 'name balance')
      .populate('paidBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    CashOut.countDocuments(query),
  ]);

  return {
    data: records,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.recordCashOut = async (data, userId) => {
  if (!data.voucherNumber) {
    const count = await CashOut.countDocuments();
    const year = new Date().getFullYear();
    data.voucherNumber = `EXP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Odoo Verification: Check that Vendor Bill strictly belongs to Master Bill
  if (data.billId && data.vendorBillId) {
    const vBill = await VendorBill.findById(data.vendorBillId);
    if (!vBill || !vBill.mainBillId || vBill.mainBillId.toString() !== data.billId.toString()) {
      const err = new Error(
        `Cross-verification failed: The selected vendor bill does not belong to Master Bill ID ${data.billId}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Odoo Validation: Vendor payment cannot exceed vendor due
  if (data.vendorBillId) {
    const vBill = await VendorBill.findById(data.vendorBillId);
    if (vBill && data.amount > (vBill.vendorDue || 0)) {
      const err = new Error(
        `Disbursement (৳${data.amount}) exceeds outstanding vendor due (৳${vBill.vendorDue}).`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const record = new CashOut({
    ...data,
    paidBy: userId || data.paidBy,
  });

  const saved = await record.save();

  // 1. If vendor purchase bill payment
  if (saved.vendorBillId) {
    await syncVendorBillAfterCashOut(saved.vendorBillId);
  }

  // 2. If salary payout: automatically link to SalaryRecord and mark as Paid
  if (saved.type === 'salary' && saved.salaryRecordId) {
    await SalaryRecord.findByIdAndUpdate(saved.salaryRecordId, {
      status: 'Paid',
      paidAt: saved.date,
      paymentMethod: saved.paymentMethod,
    });
  }

  // 3. If petty cash disbursement (Odoo type == 'petty_cash')
  if (saved.type === 'petty_cash' && saved.pettyCashId) {
    const pettyCash = await PettyCash.findById(saved.pettyCashId);
    if (pettyCash) {
      pettyCash.balance = Number(((pettyCash.balance || 0) + saved.amount).toFixed(2));
      pettyCash.entries.push({
        date: saved.date,
        type: 'top_up',
        category: 'petty_cash_float',
        amount: saved.amount,
        description: `Petty cash float added via ${saved.voucherNumber}`,
        voucherRef: saved.voucherNumber,
        loggedBy: saved.paidBy,
      });
      await pettyCash.save();
    }
  }

  // 4. If profit withdrawal by owner (Odoo type == 'withdraw_profit')
  if (saved.type === 'withdraw_profit') {
    await shareholderService.processOwnerWithdrawal(saved);
  }

  return saved;
};

exports.deleteCashOut = async (id) => {
  const record = await CashOut.findById(id);
  if (!record) {
    const error = new Error('Cash Out record not found');
    error.statusCode = 404;
    throw error;
  }

  const vendorBillId = record.vendorBillId;
  const salaryRecordId = record.salaryRecordId;
  await record.deleteOne();

  if (vendorBillId) await syncVendorBillAfterCashOut(vendorBillId);
  if (salaryRecordId) {
    await SalaryRecord.findByIdAndUpdate(salaryRecordId, { status: 'Draft' });
  }

  return { message: 'Cash Out record deleted' };
};
