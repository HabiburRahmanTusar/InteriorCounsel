const billingService = require('../services/billing.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const result = await billingService.listBills(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Bills retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await billingService.getBillById(req.params.id);
    return apiResponse.ok(res, data, 'Bill details retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const bill = await billingService.createBill({
      ...req.body,
      salespersonId: req.body.salespersonId || req.user.id,
    });
    return apiResponse.created(res, bill, 'Bill created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const bill = await billingService.updateBill(req.params.id, req.body);
    return apiResponse.ok(res, bill, 'Bill updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await billingService.deleteBill(req.params.id);
    return apiResponse.ok(res, result, 'Bill deleted successfully');
  } catch (err) {
    return next(err);
  }
};

// Odoo Action: Product line mirroring from Master Bill to Vendor Bill
exports.getLinesForVendor = async (req, res, next) => {
  try {
    const lines = await billingService.getBillLinesForVendor(req.params.id);
    return apiResponse.ok(res, lines, 'Master bill lines retrieved for vendor procurement');
  } catch (err) {
    return next(err);
  }
};
