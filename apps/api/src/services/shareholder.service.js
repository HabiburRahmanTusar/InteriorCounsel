const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const ShareholderWallet = require('../models/ShareholderWallet');
const MonthlyProfitSummary = require('../models/MonthlyProfitSummary');
const User = require('../models/User');
const Bill = require('../models/Bill');
const VendorBill = require('../models/VendorBill');
const CashIn = require('../models/CashIn');
const CashOut = require('../models/CashOut');

exports.listShareholders = async () => {
  const wallets = await ShareholderWallet.find({ status: 'active' }).populate('shareholderId', 'name email employeeId phone designation');
  return wallets;
};

exports.getWallet = async (shareholderId) => {
  let wallet = await ShareholderWallet.findOne({ shareholderId }).populate('shareholderId', 'name email employeeId designation');
  if (!wallet) {
    const user = await User.findById(shareholderId);
    if (!user) {
      const err = new Error('Shareholder user not found');
      err.statusCode = 404;
      throw err;
    }
    wallet = new ShareholderWallet({
      shareholderId,
      sharePercentage: 0,
      totalDistributed: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
      transactions: [],
    });
    await wallet.save();
    wallet = await wallet.populate('shareholderId', 'name email employeeId designation');
  }
  return wallet;
};

exports.registerShareholder = async ({ shareholderId, name, email, phone, designation, sharePercentage }) => {
  let targetUserId = shareholderId;

  if (!targetUserId && name && name.trim()) {
    let user = null;
    if (email && email.trim()) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }
    if (!user) {
      user = await User.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    }
    if (!user) {
      const cleanName = name.trim();
      const count = await User.countDocuments();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'partner';
      const cleanEmail = (email && email.trim()) || `${slug}${count + 1}@interiorcounsel.com`;
      const empId = `SH-${Date.now().toString().slice(-5)}`;
      user = new User({
        employeeId: empId,
        name: cleanName,
        email: cleanEmail,
        phone: phone || '',
        designation: designation || 'Shareholder / Partner',
        role: 'employee',
        status: 'active',
        password: empId,
      });
      await user.save();
    }
    targetUserId = user._id;
  }

  if (!targetUserId) {
    const err = new Error('Either shareholderId or partner name is required');
    err.statusCode = 400;
    throw err;
  }

  return exports.updateSharePercentage(targetUserId, sharePercentage ?? 0);
};

exports.updateSharePercentage = async (shareholderId, sharePercentage) => {
  if (sharePercentage < 0 || sharePercentage > 100) {
    const err = new Error('Share percentage must be between 0 and 100');
    err.statusCode = 400;
    throw err;
  }

  let wallet = await ShareholderWallet.findOne({ shareholderId });
  if (!wallet) {
    wallet = new ShareholderWallet({ shareholderId });
  }

  wallet.sharePercentage = Number(sharePercentage);
  wallet.status = 'active';
  await wallet.save();
  return wallet.populate('shareholderId', 'name email employeeId designation');
};

exports.removeShareholder = async (shareholderId) => {
  const wallet = await ShareholderWallet.findOne({ shareholderId });
  if (!wallet) {
    const err = new Error('Shareholder wallet not found');
    err.statusCode = 404;
    throw err;
  }
  wallet.status = 'inactive';
  wallet.sharePercentage = 0;
  await wallet.save();
  return wallet;
};

exports.calculateMonthlyProfit = async (monthStr) => {
  const targetMonth = monthStr || dayjs().tz('Asia/Dhaka').format('YYYY-MM');
  const start = dayjs(targetMonth).tz('Asia/Dhaka').startOf('month').toDate();
  const end = dayjs(targetMonth).tz('Asia/Dhaka').endOf('month').toDate();
  const dateFilter = { date: { $gte: start, $lte: end } };

  const [bills, vendorBills, cashIn, cashOut] = await Promise.all([
    Bill.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }),
    VendorBill.find({ ...dateFilter, status: { $in: ['Confirmed', 'Paid'] } }),
    CashIn.find(dateFilter),
    CashOut.find(dateFilter),
  ]);

  // 1. Product Calculation (Total Confirmed Sales Revenue)
  const totalConfirmedSales = Number(bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0).toFixed(2));

  // 2. Sales Expenses (Deducted from Product Calculation to get Profit)
  // -------------------------------------------------------------
  // a) Purchase Payment (Vendor Procurement Bills / Purchase Vouchers)
  const vendorBillPurchases = vendorBills.reduce((acc, vb) => acc + (vb.totalAmount || 0), 0);
  const purchaseCashOut = cashOut.filter((c) => c.type === 'purchase').reduce((acc, c) => acc + c.amount, 0);
  const purchasePayment = Number((vendorBillPurchases > 0 ? vendorBillPurchases : purchaseCashOut).toFixed(2));

  // b) HPL Carrying / Petty Box
  const hplFromBills = bills.reduce((acc, b) => acc + (b.pattyBoxCharge || 0), 0);
  const hplFromCashOut = cashOut.filter((c) => ['petty_box', 'petty_cash'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0);
  const hplCarryingPettyBox = Number((hplFromBills + hplFromCashOut).toFixed(2));

  // c) Transportation / Load-Unload Charge
  const transportFromBills = bills.reduce((acc, b) => acc + (b.transportCharge || 0), 0);
  const transportFromCashOut = cashOut.filter((c) => c.type === 'transport').reduce((acc, c) => acc + c.amount, 0);
  const transportationCharge = Number((transportFromBills + transportFromCashOut).toFixed(2));

  // d) Sales Commission
  const commissionFromBills = bills.reduce((acc, b) => acc + (b.salesCommission || 0), 0);
  const commissionFromCashOut = cashOut.filter((c) => c.type === 'commission').reduce((acc, c) => acc + c.amount, 0);
  const salesCommission = Number((commissionFromBills + commissionFromCashOut).toFixed(2));

  // e) Sales Return & Adjustments
  const salesReturnFromBills = bills.reduce((acc, b) => acc + (b.salesReturn || 0), 0);
  const salesReturnFromCashOut = cashOut.filter((c) => ['sales_return', 'return'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0);
  const salesReturn = Number((salesReturnFromBills + salesReturnFromCashOut).toFixed(2));

  // f) Fitting and Architectural Installation
  const fittingFromBills = bills.reduce((acc, b) => acc + (b.fittingCharge || 0), 0);
  const fittingFromCashOut = cashOut.filter((c) => c.type === 'fitting_charge').reduce((acc, c) => acc + c.amount, 0);
  const fittingLabor = Number((fittingFromBills + fittingFromCashOut).toFixed(2));

  const totalSalesExpenses = Number(
    (purchasePayment + hplCarryingPettyBox + transportationCharge + salesCommission + salesReturn + fittingLabor).toFixed(2)
  );

  // 3. Profit = Product Calculation - Sales Expenses
  const profit = Number((totalConfirmedSales - totalSalesExpenses).toFixed(2));

  // 4. Office Expenses (Deducted from Profit to get Net Profit)
  // -------------------------------------------------------------
  const rent = Number(cashOut.filter((c) => ['showroom_rent', 'office_rent'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const salaries = Number(cashOut.filter((c) => c.type === 'salary').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const electricity = Number(cashOut.filter((c) => c.type === 'electricity_bill').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const wasa = Number(cashOut.filter((c) => c.type === 'wasa_bill').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const internet = Number(cashOut.filter((c) => c.type === 'mobile_bill').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const conveyance = Number(cashOut.filter((c) => c.type === 'conveyance').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const entertainment = Number(cashOut.filter((c) => ['entertainment', 'snacks'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const admin = Number(cashOut.filter((c) => ['operating_expense', 'showroom_expense'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const vat = Number(cashOut.filter((c) => c.type === 'vat').reduce((acc, c) => acc + c.amount, 0).toFixed(2));
  const other = Number(cashOut.filter((c) => ['other', 'others', 'general'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0).toFixed(2));

  const totalOfficeExpenses = Number(
    (rent + salaries + electricity + wasa + internet + conveyance + entertainment + admin + vat + other).toFixed(2)
  );

  // Capital Investments / Injections (if any)
  const investments = Number(cashIn.filter((c) => c.type === 'investment').reduce((acc, c) => acc + c.amount, 0).toFixed(2));

  // 5. Net Profit = Profit - Office Expenses (+ investments)
  const netProfit = Number(((profit - totalOfficeExpenses) + investments).toFixed(2));

  const salesExpensesObj = {
    purchasePayment,
    hplCarryingPettyBox,
    transportationCharge,
    salesCommission,
    salesReturn,
    fittingLabor,
    totalSalesExpenses,
  };

  const officeExpensesObj = {
    rent,
    salaries,
    electricity,
    wasa,
    internet,
    conveyance,
    entertainment,
    admin,
    vat,
    other,
    totalOfficeExpenses,
  };

  let summary = await MonthlyProfitSummary.findOne({ month: targetMonth });
  if (!summary) {
    summary = new MonthlyProfitSummary({
      month: targetMonth,
      totalConfirmedSales,
      salesExpenses: salesExpensesObj,
      profit,
      officeExpenses: officeExpensesObj,
      totalPurchases: purchasePayment,
      directCosts: Number((totalSalesExpenses - purchasePayment).toFixed(2)),
      investments,
      operationalExpenses: totalOfficeExpenses,
      netProfit,
      isDistributed: false,
      status: 'draft',
    });
  } else if (!summary.isDistributed) {
    summary.totalConfirmedSales = totalConfirmedSales;
    summary.salesExpenses = salesExpensesObj;
    summary.profit = profit;
    summary.officeExpenses = officeExpensesObj;
    summary.totalPurchases = purchasePayment;
    summary.directCosts = Number((totalSalesExpenses - purchasePayment).toFixed(2));
    summary.investments = investments;
    summary.operationalExpenses = totalOfficeExpenses;
    summary.netProfit = netProfit;
  }

  await summary.save();
  return summary;
};

exports.distributeMonthlyProfit = async (monthStr) => {
  const summary = await exports.calculateMonthlyProfit(monthStr);

  if (summary.isDistributed) {
    const err = new Error(`Monthly profit for ${summary.month} has already been distributed.`);
    err.statusCode = 400;
    throw err;
  }

  if (summary.netProfit <= 0) {
    const err = new Error(`Net profit for ${summary.month} is ${summary.netProfit}. Cannot distribute negative or zero profit.`);
    err.statusCode = 400;
    throw err;
  }

  const wallets = await ShareholderWallet.find({ status: 'active', sharePercentage: { $gt: 0 } });
  if (wallets.length === 0) {
    const err = new Error('No active shareholders with share percentage > 0 found.');
    err.statusCode = 400;
    throw err;
  }

  const distributionLines = [];

  for (const wallet of wallets) {
    const shareAmount = Number(((summary.netProfit * wallet.sharePercentage) / 100).toFixed(2));
    if (shareAmount > 0) {
      wallet.totalDistributed = Number(((wallet.totalDistributed || 0) + shareAmount).toFixed(2));
      wallet.currentBalance = Number(((wallet.totalDistributed) - (wallet.totalWithdrawn || 0)).toFixed(2));
      wallet.transactions.push({
        date: new Date(),
        type: 'distribution',
        amount: shareAmount,
        month: summary.month,
        reference: `DIST-${summary.month}`,
        notes: `Profit distribution for ${summary.month} (${wallet.sharePercentage}%)`,
      });
      await wallet.save();

      distributionLines.push({
        shareholderId: wallet.shareholderId,
        sharePercentage: wallet.sharePercentage,
        amount: shareAmount,
      });
    }
  }

  summary.distributionLines = distributionLines;
  summary.isDistributed = true;
  summary.distributionDate = new Date();
  summary.status = 'finalized';
  await summary.save();

  return summary;
};

exports.processOwnerWithdrawal = async (cashOutRecord) => {
  const shareholderId = cashOutRecord.shareholderId || cashOutRecord.employeeId;
  if (!shareholderId) {
    const err = new Error('Owner profit withdrawal requires a shareholderId');
    err.statusCode = 400;
    throw err;
  }

  const wallet = await ShareholderWallet.findOne({ shareholderId });
  if (!wallet) {
    const err = new Error('Shareholder wallet not found');
    err.statusCode = 404;
    throw err;
  }

  if (cashOutRecord.amount > wallet.currentBalance) {
    const err = new Error(
      `Cannot withdraw ৳${cashOutRecord.amount}. Available shareholder balance is only ৳${wallet.currentBalance}.`
    );
    err.statusCode = 400;
    throw err;
  }

  wallet.totalWithdrawn = Number(((wallet.totalWithdrawn || 0) + cashOutRecord.amount).toFixed(2));
  wallet.currentBalance = Number(((wallet.totalDistributed || 0) - wallet.totalWithdrawn).toFixed(2));
  wallet.transactions.push({
    date: cashOutRecord.date || new Date(),
    type: 'withdrawal',
    amount: cashOutRecord.amount,
    reference: cashOutRecord.voucherNumber,
    cashOutId: cashOutRecord._id,
    notes: cashOutRecord.notes || 'Owner profit withdrawal',
  });

  await wallet.save();
  return wallet;
};
