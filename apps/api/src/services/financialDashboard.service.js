const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const VendorBill = require('../models/VendorBill');
const CashIn = require('../models/CashIn');
const CashOut = require('../models/CashOut');

function getPeriodRange(periodKey) {
  const now = dayjs().tz('Asia/Dhaka');
  let start;
  let end = now.endOf('day').toDate();

  switch (periodKey) {
    case 'today':
      start = now.startOf('day').toDate();
      break;
    case 'prev_month':
      start = now.subtract(1, 'month').startOf('month').toDate();
      end = now.subtract(1, 'month').endOf('month').toDate();
      break;
    case 'this_year':
      start = now.startOf('year').toDate();
      break;
    case 'this_month':
    default:
      start = now.startOf('month').toDate();
      break;
  }

  return { start, end };
}

exports.getDashboardSummary = async ({ period = 'this_month' }) => {
  const { start, end } = getPeriodRange(period);
  const dateFilter = { date: { $gte: start, $lte: end } };

  const [
    periodBills,
    periodCashIn,
    periodCashOut,
    periodVendorBills,
    allCustomers,
    allVendors,
    allTimeCashIn,
    allTimeCashOut,
  ] = await Promise.all([
    Bill.find({ ...dateFilter, status: { $in: ['Confirmed', 'Completed'] } }),
    CashIn.find(dateFilter),
    CashOut.find(dateFilter),
    VendorBill.find({ ...dateFilter, status: { $in: ['Confirmed', 'Paid'] } }),
    Customer.find({ status: 'active' }),
    Vendor.find({ status: 'active' }),
    CashIn.find({}),
    CashOut.find({}),
  ]);

  // Revenue & Collections
  const totalBilledSales = periodBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalCashIn = periodCashIn.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Outstanding Balances (All-time receivables/payables)
  const totalCustomerReceivables = allCustomers.reduce((acc, c) => acc + (c.dueBalance > 0 ? c.dueBalance : 0), 0);
  const totalVendorPayables = allVendors.reduce((acc, v) => acc + (v.dueBalance > 0 ? v.dueBalance : 0), 0);

  // Cost of Goods Sold (Direct Costs / Sales Expenses)
  const materialPurchases = periodVendorBills.reduce((acc, vb) => acc + (vb.totalAmount || 0), 0);
  const fittingCharges = periodCashOut.filter((c) => c.type === 'fitting_charge').reduce((acc, c) => acc + c.amount, 0) + periodBills.reduce((acc, b) => acc + (b.fittingCharge || 0), 0);
  const transportCharges = periodCashOut.filter((c) => c.type === 'transport').reduce((acc, c) => acc + c.amount, 0) + periodBills.reduce((acc, b) => acc + (b.transportCharge || 0), 0);
  const pattyBoxCharges = periodCashOut.filter((c) => ['petty_box', 'petty_cash'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0) + periodBills.reduce((acc, b) => acc + (b.pattyBoxCharge || 0), 0);
  const salesCommissions = periodCashOut.filter((c) => c.type === 'commission').reduce((acc, c) => acc + c.amount, 0) + periodBills.reduce((acc, b) => acc + (b.salesCommission || 0), 0);
  const salesReturns = periodCashOut.filter((c) => ['sales_return', 'return'].includes(c.type)).reduce((acc, c) => acc + c.amount, 0) + periodBills.reduce((acc, b) => acc + (b.salesReturn || 0), 0);

  const totalSalesExpenses = Number((materialPurchases + transportCharges + pattyBoxCharges + salesCommissions + salesReturns + fittingCharges).toFixed(2));

  // Gross Profit = Product Calculation (Sales) - Sales Expenses
  const grossProfit = Number((totalBilledSales - totalSalesExpenses).toFixed(2));
  const grossMarginPercent = totalBilledSales > 0 ? Number(((grossProfit / totalBilledSales) * 100).toFixed(1)) : 0;

  // Operating Expenses Breakdown (Office Expenses deducted from Profit)
  const expenseByCategory = {};
  for (const exp of periodCashOut) {
    if (['purchase', 'fitting_charge', 'transport', 'commission', 'petty_box', 'sales_return', 'withdraw_profit'].includes(exp.type)) continue;
    expenseByCategory[exp.type] = (expenseByCategory[exp.type] || 0) + exp.amount;
  }

  const salariesPaid = expenseByCategory['salary'] || 0;
  const showroomRent = expenseByCategory['showroom_rent'] || 0;
  const utilities = (expenseByCategory['electricity_bill'] || 0) +
                    (expenseByCategory['wasa_bill'] || 0) +
                    (expenseByCategory['mobile_bill'] || 0);

  const totalOperatingExpenses = Object.values(expenseByCategory).reduce((acc, val) => acc + val, 0);

  // Net Profit = Gross Profit - Office Expenses
  const netProfit = Number((grossProfit - totalOperatingExpenses).toFixed(2));
  const netMarginPercent = totalBilledSales > 0 ? Number(((netProfit / totalBilledSales) * 100).toFixed(1)) : 0;

  // Liquidity (Cash vs Bank)
  const totalCashCollectedAllTime = allTimeCashIn.reduce((acc, c) => acc + c.amount, 0);
  const totalCashDisbursedAllTime = allTimeCashOut.reduce((acc, c) => acc + c.amount, 0);
  const netLiquidBalance = Number((totalCashCollectedAllTime - totalCashDisbursedAllTime).toFixed(2));

  return {
    period,
    range: { start, end },
    revenue: {
      totalBilledSales: Number(totalBilledSales.toFixed(2)),
      totalCashCollected: Number(totalCashIn.toFixed(2)),
      totalCustomerReceivables: Number(totalCustomerReceivables.toFixed(2)),
    },
    directCosts: {
      materialPurchases: Number(materialPurchases.toFixed(2)),
      fittingCharges: Number(fittingCharges.toFixed(2)),
      transportCharges: Number(transportCharges.toFixed(2)),
      totalDirectCosts,
    },
    profitability: {
      grossProfit,
      grossMarginPercent,
      netProfit,
      netMarginPercent,
    },
    operatingExpenses: {
      salariesPaid: Number(salariesPaid.toFixed(2)),
      showroomRent: Number(showroomRent.toFixed(2)),
      utilities: Number(utilities.toFixed(2)),
      breakdown: expenseByCategory,
      totalOperatingExpenses: Number(totalOperatingExpenses.toFixed(2)),
    },
    liabilities: {
      totalVendorPayables: Number(totalVendorPayables.toFixed(2)),
    },
    liquidity: {
      netLiquidBalance,
    },
  };
};
