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

  // 1. Total Confirmed Sales
  const totalConfirmedSales = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  // 2. Total Purchases
  const totalPurchases = vendorBills.reduce((acc, vb) => acc + (vb.totalAmount || 0), 0);

  // 3. Direct Costs on Bills + Direct Cash Outs (transport, fitting, commission)
  const directCostsFromBills = bills.reduce((acc, b) => acc + (b.directCosts || 0), 0);
  const directCostsFromCashOut = cashOut
    .filter((c) => ['transport', 'fitting_charge', 'commission'].includes(c.type))
    .reduce((acc, c) => acc + c.amount, 0);
  const directCosts = Number((directCostsFromBills + directCostsFromCashOut).toFixed(2));

  // 4. Capital Investments
  const investments = cashIn
    .filter((c) => c.type === 'investment')
    .reduce((acc, c) => acc + c.amount, 0);

  // 5. Operating Expenses
  const operationalExpenses = cashOut
    .filter((c) => !['purchase', 'transport', 'fitting_charge', 'commission', 'withdraw_profit'].includes(c.type))
    .reduce((acc, c) => acc + c.amount, 0);

  // Net Profit formula: (Sales - Purchases - Direct Costs + Investments) - Operating Expenses
  const netProfit = Number(
    ((totalConfirmedSales - totalPurchases - directCosts + investments) - operationalExpenses).toFixed(2)
  );

  let summary = await MonthlyProfitSummary.findOne({ month: targetMonth });
  if (!summary) {
    summary = new MonthlyProfitSummary({
      month: targetMonth,
      totalConfirmedSales,
      totalPurchases,
      directCosts,
      investments,
      operationalExpenses,
      netProfit,
      isDistributed: false,
      status: 'draft',
    });
  } else if (!summary.isDistributed) {
    summary.totalConfirmedSales = totalConfirmedSales;
    summary.totalPurchases = totalPurchases;
    summary.directCosts = directCosts;
    summary.investments = investments;
    summary.operationalExpenses = operationalExpenses;
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
