const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const VendorBill = require('../models/VendorBill');
const CashIn = require('../models/CashIn');
const CashOut = require('../models/CashOut');

function calculateBillTotals(data) {
  let subtotal = 0;
  const items = (data.items || []).map((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const amount = Number((qty * price).toFixed(2));
    subtotal += amount;
    const pa = Number(item.purchaseAmount) || 0;
    const sd = Number(item.supplierDiscount) || 0;
    const np = Number(item.netPurchase) || Math.max(0, Number((pa - sd).toFixed(2)));
    return {
      description: item.description,
      unit: item.unit || 'sft',
      quantity: qty,
      unitPrice: price,
      amount,
      supplierName: (item.supplierName || '').trim(),
      supplierInvoiceNo: (item.supplierInvoiceNo || '').trim(),
      purchaseAmount: pa,
      supplierDiscount: sd,
      netPurchase: np,
      vendorId: item.vendorId || null,
    };
  });

  subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;
  const discountType = data.discountType || 'none';
  const discountValue = Number(data.discountValue) || 0;

  if (discountType === 'percent') {
    discountAmount = Number(((subtotal * discountValue) / 100).toFixed(2));
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const vatPercent = Number(data.vatPercent) || 0;
  const vatAmount = Number(((taxableAmount * vatPercent) / 100).toFixed(2));

  const totalAmount = Number((taxableAmount + vatAmount).toFixed(2));

  // Direct Costs per Bill (from Odoo BillProfitBill)
  const transportCharge = Number(data.transportCharge) || 0;
  const fittingCharge = Number(data.fittingCharge) || 0;
  const salesCommission = Number(data.salesCommission) || 0;
  const pattyBoxCharge = Number(data.pattyBoxCharge) || 0;
  const directCosts = Number((transportCharge + fittingCharge + salesCommission + pattyBoxCharge).toFixed(2));

  return {
    items,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    vatPercent,
    vatAmount,
    totalAmount,
    transportCharge,
    fittingCharge,
    salesCommission,
    pattyBoxCharge,
    directCosts,
  };
}

async function recalculateBillProfit(billId) {
  const bill = await Bill.findById(billId);
  if (!bill) return;

  const vendorBills = await VendorBill.find({ mainBillId: billId, status: { $ne: 'Cancelled' } });
  const vendorTotalPurchase = vendorBills.reduce((acc, vb) => acc + (vb.totalAmount || 0), 0);

  // Direct Real-Time Bill Profitability: Total Sale - (Direct Costs + Vendor Total Purchase)
  const billProfit = Number(((bill.totalAmount || 0) - ((bill.directCosts || 0) + vendorTotalPurchase)).toFixed(2));

  await Bill.findByIdAndUpdate(billId, {
    vendorTotalPurchase: Number(vendorTotalPurchase.toFixed(2)),
    billProfit,
  });
}

async function updateCustomerFinancials(customerId) {
  const bills = await Bill.find({ customerId, status: { $in: ['Confirmed', 'Completed'] } });
  const totalBilled = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  const payments = await CashIn.find({ customerId });
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  await Customer.findByIdAndUpdate(customerId, {
    totalBilled: Number(totalBilled.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    dueBalance: Number((totalBilled - totalPaid).toFixed(2)),
  });
}

exports.listBills = async ({ search, customerId, salespersonId, paymentState, status, page = 1, limit = 20 }) => {
  const query = {};
  if (customerId) query.customerId = customerId;
  if (salespersonId) query.salespersonId = salespersonId;
  if (paymentState) query.paymentState = paymentState;
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { billNumber: { $regex: search, $options: 'i' } },
      { projectName: { $regex: search, $options: 'i' } },
      { siteLocation: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [bills, total] = await Promise.all([
    Bill.find(query)
      .populate('customerId', 'name companyName phone')
      .populate('salespersonId', 'name employeeId')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Bill.countDocuments(query),
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

exports.getBillById = async (id) => {
  const bill = await Bill.findById(id)
    .populate('customerId')
    .populate('salespersonId', 'name email employeeId phone');

  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  const [payments, vendorBills, directExpenses] = await Promise.all([
    CashIn.find({ billId: id }).populate('receivedBy', 'name').sort({ date: -1 }),
    VendorBill.find({ mainBillId: id }).populate('vendorId', 'name category phone').sort({ date: -1 }),
    CashOut.find({ billId: id }).populate('paidBy', 'name').sort({ date: -1 }),
  ]);

  const materialCost = vendorBills.reduce((acc, vb) => acc + (vb.totalAmount || 0), 0);
  const directExpenseCost = directExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const totalProjectCost = Number((materialCost + (bill.directCosts || 0) + directExpenseCost).toFixed(2));
  const projectGrossProfit = Number(((bill.totalAmount || 0) - totalProjectCost).toFixed(2));
  const profitMarginPercent = bill.totalAmount > 0
    ? Number(((projectGrossProfit / bill.totalAmount) * 100).toFixed(1))
    : 0;

  return {
    bill,
    payments,
    vendorBills,
    directExpenses,
    profitability: {
      totalRevenue: bill.totalAmount,
      totalCashCollected: bill.totalCashIn,
      customerDue: bill.customerDue,
      directCosts: bill.directCosts || 0,
      materialCost,
      directExpenseCost,
      totalProjectCost,
      projectGrossProfit,
      profitMarginPercent,
    },
  };
};

exports.getBillLinesForVendor = async (billId) => {
  const bill = await Bill.findById(billId);
  if (!bill) {
    const err = new Error('Bill not found');
    err.statusCode = 404;
    throw err;
  }
  return (bill.items || []).map((item) => ({
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    isSelected: true, // Default checked for mirroring (Odoo _prune_unselected_lines)
  }));
};

async function syncBillSuppliers(bill, items = []) {
  if (!bill || !items || !items.length) return;

  const suppliersMap = new Map();
  for (const it of items) {
    const sName = (it.supplierName || '').trim();
    if (!sName) continue;
    if (!suppliersMap.has(sName)) {
      suppliersMap.set(sName, []);
    }
    suppliersMap.get(sName).push(it);
  }

  if (suppliersMap.size === 0) return;

  const vendorBillService = require('./vendorBill.service');

  for (const [name, sItems] of suppliersMap.entries()) {
    // 1. Find or create Vendor
    let vendor = await Vendor.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (!vendor) {
      const count = await Vendor.countDocuments();
      vendor = new Vendor({
        vendorCode: `VND-${String(count + 1).padStart(4, '0')}`,
        name,
        category: 'general_supply',
        phone: '01XXXXXXXXX',
        status: 'active',
      });
      await vendor.save();
    }

    // Assign vendorId to items
    for (const it of sItems) {
      it.vendorId = vendor._id;
    }

    // 2. Compute purchases for this vendor on this bill
    const grossPurchase = sItems.reduce((acc, it) => acc + (Number(it.purchaseAmount) || 0), 0);
    const supplierDiscount = sItems.reduce((acc, it) => acc + (Number(it.supplierDiscount) || 0), 0);
    const netPurchase = Math.max(0, Number((grossPurchase - supplierDiscount).toFixed(2)));
    const invoiceNos = [...new Set(sItems.map((it) => (it.supplierInvoiceNo || '').trim()).filter(Boolean))].join(', ');

    // 3. Find or create VendorBill
    let vendorBill = await VendorBill.findOne({ mainBillId: bill._id, vendorId: vendor._id });

    const vbItems = sItems.map((it) => ({
      description: it.description || 'Material / Fitting Item',
      unit: it.unit || 'pcs',
      quantity: Number(it.quantity) || 1,
      unitPrice: it.purchaseAmount && it.quantity ? Number((it.purchaseAmount / it.quantity).toFixed(2)) : (Number(it.unitPrice) || 0),
      amount: Number(it.purchaseAmount) || Number(it.amount) || 0,
      isSelected: true,
    }));

    const billStatus = (bill.status === 'Confirmed' || bill.status === 'Completed') ? 'Confirmed' : 'Draft';

    if (vendorBill) {
      vendorBill.billRef = invoiceNos || vendorBill.billRef || '';
      vendorBill.items = vbItems;
      vendorBill.totalAmount = Number(grossPurchase.toFixed(2));
      vendorBill.discountAmount = Number(supplierDiscount.toFixed(2));
      vendorBill.netAmount = Number(netPurchase.toFixed(2));
      vendorBill.status = bill.status === 'Cancelled' ? 'Cancelled' : billStatus;
      await vendorBill.save();
    } else if (grossPurchase > 0 || invoiceNos) {
      const vbCount = await VendorBill.countDocuments();
      vendorBill = new VendorBill({
        billNumber: `VB-${bill.billNumber || 'BILL'}-${String(vbCount + 1).padStart(4, '0')}`,
        billRef: invoiceNos,
        vendorId: vendor._id,
        mainBillId: bill._id,
        category: vendor.category || 'general_supply',
        items: vbItems,
        totalAmount: Number(grossPurchase.toFixed(2)),
        discountAmount: Number(supplierDiscount.toFixed(2)),
        netAmount: Number(netPurchase.toFixed(2)),
        paidAmount: 0,
        vendorDue: Number(netPurchase.toFixed(2)),
        status: bill.status === 'Cancelled' ? 'Cancelled' : billStatus,
      });
      await vendorBill.save();
    }

    // 4. Update vendor financials
    await vendorBillService.updateVendorFinancials(vendor._id);
  }

  // Save updated vendorIds to bill
  await Bill.findByIdAndUpdate(bill._id, { items });
}

exports.createBill = async (data) => {
  if (!data.customerId && data.customerName) {
    let customer = await Customer.findOne({ name: { $regex: new RegExp(`^${data.customerName.trim()}$`, 'i') } });
    if (!customer) {
      const addr = data.siteLocation || data.address || '';
      customer = new Customer({
        name: data.customerName.trim(),
        phone: data.customerMobile || '01XXXXXXXXX',
        address: addr,
        billingAddress: addr,
        siteAddress: addr,
      });
      await customer.save();
    } else if (data.customerMobile || data.address) {
      if (data.customerMobile) customer.phone = data.customerMobile;
      if (data.address) {
        customer.address = data.address;
        customer.billingAddress = data.address;
        customer.siteAddress = data.address;
      }
      await customer.save();
    }
    data.customerId = customer._id;
  }

  if (data.customerId && (data.customerMobile || data.address)) {
    const cust = await Customer.findById(data.customerId);
    if (cust) {
      let changed = false;
      if (data.customerMobile && cust.phone !== data.customerMobile) {
        cust.phone = data.customerMobile;
        changed = true;
      }
      if (data.address && cust.address !== data.address) {
        cust.address = data.address;
        cust.billingAddress = data.address;
        cust.siteAddress = data.address;
        changed = true;
      }
      if (changed) await cust.save();
    }
  }

  if (data.salesperson && !data.salespersonId) {
    const User = require('../models/User');
    let sp = await User.findOne({ name: { $regex: new RegExp(`^${data.salesperson.trim()}$`, 'i') } });
    if (!sp) {
      const cleanName = data.salesperson.trim();
      const count = await User.countDocuments();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'sp';
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('sales123', 10);
      try {
        sp = new User({
          employeeId: `EMP-${Date.now().toString().slice(-5)}`,
          name: cleanName,
          email: `${slug}${count + 1}@interiorcounsel.com`,
          password: hashedPassword,
          designation: 'Sales Executive',
          role: 'employee',
          status: 'active',
        });
        await sp.save();
      } catch (err) {
        sp = await User.findOne();
      }
    }
    if (sp) data.salespersonId = sp._id;
  }

  if (!data.salespersonId) {
    const User = require('../models/User');
    const fallbackUser = await User.findOne();
    if (fallbackUser) data.salespersonId = fallbackUser._id;
  }

  if (!data.billNumber) {
    const count = await Bill.countDocuments();
    const year = new Date().getFullYear();
    data.billNumber = `BILL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  const totals = calculateBillTotals(data);
  const bill = new Bill({
    ...data,
    ...totals,
    totalCashIn: 0,
    customerDue: totals.totalAmount,
    vendorTotalPurchase: 0,
    billProfit: Number((totals.totalAmount - totals.directCosts).toFixed(2)),
    paymentState: 'not_paid',
  });

  const saved = await bill.save();
  await syncBillSuppliers(saved, totals.items);
  await recalculateBillProfit(saved._id);
  await updateCustomerFinancials(saved.customerId);
  return Bill.findById(saved._id);
};

exports.updateBill = async (id, data) => {
  const existing = await Bill.findById(id);
  if (!existing) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  const totals = calculateBillTotals({
    items: data.items !== undefined ? data.items : existing.items,
    discountType: data.discountType !== undefined ? data.discountType : existing.discountType,
    discountValue: data.discountValue !== undefined ? data.discountValue : existing.discountValue,
    vatPercent: data.vatPercent !== undefined ? data.vatPercent : existing.vatPercent,
    transportCharge: data.transportCharge !== undefined ? data.transportCharge : existing.transportCharge,
    fittingCharge: data.fittingCharge !== undefined ? data.fittingCharge : existing.fittingCharge,
    salesCommission: data.salesCommission !== undefined ? data.salesCommission : existing.salesCommission,
    pattyBoxCharge: data.pattyBoxCharge !== undefined ? data.pattyBoxCharge : existing.pattyBoxCharge,
  });

  const customerDue = Number((totals.totalAmount - (existing.totalCashIn || 0)).toFixed(2));
  let paymentState = 'not_paid';
  if (existing.totalCashIn >= totals.totalAmount && totals.totalAmount > 0) {
    paymentState = 'paid';
  } else if (existing.totalCashIn > 0) {
    paymentState = 'partial';
  }

  const billProfit = Number((totals.totalAmount - (totals.directCosts + (existing.vendorTotalPurchase || 0))).toFixed(2));

  const updated = await Bill.findByIdAndUpdate(
    id,
    {
      ...data,
      ...totals,
      customerDue,
      paymentState,
      billProfit,
    },
    { new: true, runValidators: true }
  );

  await syncBillSuppliers(updated, totals.items);
  await recalculateBillProfit(updated._id);
  await updateCustomerFinancials(updated.customerId);
  return Bill.findById(updated._id);
};

exports.deleteBill = async (id) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    const error = new Error('Bill not found');
    error.statusCode = 404;
    throw error;
  }

  if (bill.totalCashIn > 0) {
    const error = new Error('Cannot delete bill with existing customer payments. Cancel it instead.');
    error.statusCode = 400;
    throw error;
  }

  // Remove linked vendor bills and update vendor balances
  const vbs = await VendorBill.find({ mainBillId: id });
  const vendorBillService = require('./vendorBill.service');
  for (const vb of vbs) {
    const vId = vb.vendorId;
    await vb.deleteOne();
    await vendorBillService.updateVendorFinancials(vId);
  }

  const customerId = bill.customerId;
  await bill.deleteOne();
  await updateCustomerFinancials(customerId);
  return { message: 'Bill deleted successfully' };
};

exports.recalculateBillProfit = recalculateBillProfit;
exports.updateCustomerFinancials = updateCustomerFinancials;
