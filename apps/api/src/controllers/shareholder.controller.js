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
    const { month } = req.query;
    const summary = await shareholderService.calculateMonthlyProfit(month);
    return apiResponse.ok(res, summary, 'Monthly profit summary computed');
  } catch (err) {
    return next(err);
  }
};

exports.distributeProfit = async (req, res, next) => {
  try {
    const { month } = req.body;
    const summary = await shareholderService.distributeMonthlyProfit(month);
    return apiResponse.ok(res, summary, `Profit for ${summary.month} distributed successfully to shareholder wallets`);
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
