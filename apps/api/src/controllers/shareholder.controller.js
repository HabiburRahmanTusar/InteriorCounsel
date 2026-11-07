const shareholderService = require('../services/shareholder.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const wallets = await shareholderService.listShareholders();
    return apiResponse.ok(res, wallets, 'Shareholder wallets retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.getWallet = async (req, res, next) => {
  try {
    const shareholderId = req.params.shareholderId || req.user.id;
    const wallet = await shareholderService.getWallet(shareholderId);
    return apiResponse.ok(res, wallet, 'Shareholder wallet retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.createOrUpdate = async (req, res, next) => {
  try {
    const { shareholderId, name, email, phone, designation, sharePercentage } = req.body;
    const wallet = await shareholderService.registerShareholder({
      shareholderId,
      name,
      email,
      phone,
      designation,
      sharePercentage: sharePercentage !== undefined ? Number(sharePercentage) : 0,
    });
    return apiResponse.ok(res, wallet, 'Shareholder account registered/updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.updateSharePercentage = async (req, res, next) => {
  try {
    const { sharePercentage } = req.body;
    const wallet = await shareholderService.updateSharePercentage(req.params.shareholderId, sharePercentage);
    return apiResponse.ok(res, wallet, 'Share percentage updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const wallet = await shareholderService.removeShareholder(req.params.shareholderId);
    return apiResponse.ok(res, wallet, 'Shareholder account removed');
  } catch (err) {
    return next(err);
  }
};

exports.calculateProfit = async (req, res, next) => {
  try {
    const fromMonth = req.query.fromMonth || req.query.from || req.query.month;
    const toMonth = req.query.toMonth || req.query.to || fromMonth;
    const summary = await shareholderService.calculateProfitRange(fromMonth, toMonth);
    return apiResponse.ok(res, summary, `Profit summary for ${summary.periodLabel} computed`);
  } catch (err) {
    return next(err);
  }
};

exports.distributeProfit = async (req, res, next) => {
  try {
    const fromMonth = req.body.fromMonth || req.body.from || req.body.month;
    const toMonth = req.body.toMonth || req.body.to || fromMonth;
    const { distributableAmount, notes, reference } = req.body;
    const result = await shareholderService.disburseProfitRange({
      fromMonth,
      toMonth,
      distributableAmount,
      notes,
      reference,
    });
    return apiResponse.ok(res, result, `Net profit for ${result.periodLabel} disbursed successfully to shareholder wallets`);
  } catch (err) {
    return next(err);
  }
};

exports.getPortalSummary = async (req, res, next) => {
  try {
    const targetUserId = req.query.shareholderId || (req.user.role === 'shareholder' ? req.user.id : null);
    const summary = await shareholderService.getPortalSummary(targetUserId, req.user);
    return apiResponse.ok(res, summary, 'Shareholder portal summary loaded');
  } catch (err) {
    return next(err);
  }
};

exports.requestWithdrawal = async (req, res, next) => {
  try {
    const shareholderId = req.user.role === 'shareholder' ? req.user.id : (req.body.shareholderId || req.user.id);
    const result = await shareholderService.requestWithdrawal({
      ...req.body,
      shareholderId,
      userId: req.user.id,
    });
    return apiResponse.ok(res, result, 'Withdrawal processed successfully');
  } catch (err) {
    return next(err);
  }
};
