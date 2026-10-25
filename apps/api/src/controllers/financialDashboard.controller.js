const financialDashboardService = require('../services/financialDashboard.service');
const apiResponse = require('../utils/apiResponse');

exports.getSummary = async (req, res, next) => {
  try {
    const summary = await financialDashboardService.getDashboardSummary(req.query);
    return apiResponse.ok(res, summary, 'Financial performance summary retrieved');
  } catch (err) {
    return next(err);
  }
};
