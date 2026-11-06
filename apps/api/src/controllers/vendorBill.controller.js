const vendorBillService = require('../services/vendorBill.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const result = await vendorBillService.listVendorBills(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Vendor bills retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await vendorBillService.getVendorBillById(req.params.id);
    return apiResponse.ok(res, data, 'Vendor bill retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const bill = await vendorBillService.createVendorBill(req.body);
    return apiResponse.created(res, bill, 'Vendor bill created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const bill = await vendorBillService.updateVendorBill(req.params.id, req.body);
    return apiResponse.ok(res, bill, 'Vendor bill updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await vendorBillService.deleteVendorBill(req.params.id);
    return apiResponse.ok(res, result, 'Vendor bill deleted successfully');
  } catch (err) {
    return next(err);
  }
};
