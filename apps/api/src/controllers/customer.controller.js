const customerService = require('../services/customer.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const result = await customerService.listCustomers(req.query);
    return apiResponse.paginated(res, result.data, result.pagination, 'Customers retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await customerService.getCustomerById(req.params.id);
    return apiResponse.ok(res, data, 'Customer retrieved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return apiResponse.created(res, customer, 'Customer created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    return apiResponse.ok(res, customer, 'Customer updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    return apiResponse.ok(res, result, 'Customer deleted successfully');
  } catch (err) {
    return next(err);
  }
};
