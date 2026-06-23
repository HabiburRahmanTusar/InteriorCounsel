const employeeService = require('../services/employee.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const { search, status } = req.query;

    const { items, total } = await employeeService.list({
      page,
      limit,
      search,
      status,
    });

    return apiResponse.paginated(res, {
      items: items.map((item) => item.toSafeJSON()),
      total,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await employeeService.getById(req.params.id);
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await employeeService.create(req.body);
    return apiResponse.created(res, data, 'Employee created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await employeeService.update(req.params.id, req.body);
    return apiResponse.ok(res, data, 'Employee updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await employeeService.remove(req.params.id);
    return apiResponse.noContent(res);
  } catch (err) {
    return next(err);
  }
};

exports.assignShift = async (req, res, next) => {
  try {
    const { shiftId } = req.body;
    const data = await employeeService.assignShift(req.params.id, shiftId);
    return apiResponse.ok(res, data, 'Shift assigned successfully');
  } catch (err) {
    return next(err);
  }
};
