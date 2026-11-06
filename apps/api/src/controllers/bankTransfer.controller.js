const bankTransferService = require('../services/bankTransfer.service');
const { ok, created, paginated, successResponse } = require('../utils/apiResponse');

exports.listTransfers = async (req, res, next) => {
  try {
    const result = await bankTransferService.listTransfers(req.query);
    return paginated(res, result.data, result.pagination, 'Transfers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getTransferById = async (req, res, next) => {
  try {
    const transfer = await bankTransferService.getTransferById(req.params.id);
    return ok(res, transfer, 'Transfer retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.createTransfer = async (req, res, next) => {
  try {
    const transfer = await bankTransferService.createTransfer(req.body, req.user?.id);
    return created(res, transfer, 'Bank transfer created successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteTransfer = async (req, res, next) => {
  try {
    const transfer = await bankTransferService.deleteTransfer(req.params.id);
    return ok(res, transfer, 'Bank transfer deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.list = exports.listTransfers;
exports.getById = exports.getTransferById;
exports.create = exports.createTransfer;
exports.delete = exports.deleteTransfer;

