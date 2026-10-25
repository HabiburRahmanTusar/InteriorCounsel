const cashFlowService = require('../services/cashFlow.service');
const apiResponse = require('../utils/apiResponse');

// Cash In
exports.listCashIn = async (req, res, next) => {
  try {
    const result = await cashFlowService.listCashIn(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Cash In records retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.recordCashIn = async (req, res, next) => {
  try {
    const record = await cashFlowService.recordCashIn(req.body, req.user?.id);
    return apiResponse.created(res, record, 'Cash In recorded successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deleteCashIn = async (req, res, next) => {
  try {
    const result = await cashFlowService.deleteCashIn(req.params.id);
    return apiResponse.ok(res, result, 'Cash In record deleted');
  } catch (err) {
    return next(err);
  }
};

// Cash Out
exports.listCashOut = async (req, res, next) => {
  try {
    const result = await cashFlowService.listCashOut(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Cash Out records retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.recordCashOut = async (req, res, next) => {
  try {
    const record = await cashFlowService.recordCashOut(req.body, req.user?.id);
    return apiResponse.created(res, record, 'Cash Out recorded successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deleteCashOut = async (req, res, next) => {
  try {
    const result = await cashFlowService.deleteCashOut(req.params.id);
    return apiResponse.ok(res, result, 'Cash Out record deleted');
  } catch (err) {
    return next(err);
  }
};
