const financialService = require('../services/financial.service');
const apiResponse = require('../utils/apiResponse');

/**
 * Get all financial records with pagination.
 */
exports.list = async (req, res, next) => {
  try {
    const { items, total } = await financialService.list(req.query);
    return apiResponse.paginated(res, {
      items,
      total,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get the most recently created financial record.
 */
exports.getLatest = async (req, res, next) => {
  try {
    const record = await financialService.getLatest();
    return apiResponse.ok(res, record);
  } catch (err) {
    return next(err);
  }
};

/**
 * Get a specific financial record by ID.
 */
exports.getById = async (req, res, next) => {
  try {
    const record = await financialService.getById(req.params.id);
    return apiResponse.ok(res, record);
  } catch (err) {
    return next(err);
  }
};

/**
 * Create a new financial record.
 */
exports.create = async (req, res, next) => {
  try {
    const record = await financialService.create(req.body);
    return apiResponse.created(res, record, 'Financial record created successfully');
  } catch (err) {
    return next(err);
  }
};

/**
 * Update a financial record by ID.
 */
exports.update = async (req, res, next) => {
  try {
    const record = await financialService.update(req.params.id, req.body);
    return apiResponse.ok(res, record, 'Financial record updated successfully');
  } catch (err) {
    return next(err);
  }
};

/**
 * Delete a financial record by ID.
 */
exports.remove = async (req, res, next) => {
  try {
    await financialService.remove(req.params.id);
    return apiResponse.ok(res, null, 'Financial record deleted successfully');
  } catch (err) {
    return next(err);
  }
};
