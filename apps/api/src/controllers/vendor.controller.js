const vendorService = require('../services/vendor.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const result = await vendorService.listVendors(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Vendors retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await vendorService.getVendorById(req.params.id);
    return apiResponse.ok(res, data, 'Vendor retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    return apiResponse.created(res, vendor, 'Vendor created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    return apiResponse.ok(res, vendor, 'Vendor updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await vendorService.deleteVendor(req.params.id);
    return apiResponse.ok(res, result, 'Vendor deleted successfully');
  } catch (err) {
    return next(err);
  }
};

exports.applyDiscount = async (req, res, next) => {
  try {
    const result = await vendorService.applySupplierDiscount(req.params.id, req.body);
    return apiResponse.ok(res, result, 'Supplier discount applied successfully');
  } catch (err) {
    return next(err);
  }
};

exports.reverseDiscount = async (req, res, next) => {
  try {
    const result = await vendorService.reverseSupplierDiscount(req.params.id, req.params.discountId);
    return apiResponse.ok(res, result, 'Supplier discount reversed successfully');
  } catch (err) {
    return next(err);
  }
};
