const FinancialRecord = require('../models/FinancialRecord');

/**
 * List all financial records with filtering, searching, sorting and pagination.
 */
exports.list = async function list({ page = 1, limit = 10, search, month, year, startDate, endDate, sortBy = 'period', sortOrder = 'desc' }) {
  const query = {};

  // Filter by year
  if (year) {
    query.period = new RegExp(`^${year}-`);
  }

  // Filter by month
  if (month) {
    if (year) {
      query.period = `${year}-${month}`;
    } else {
      query.period = new RegExp(`-${month}$`);
    }
  }

  // Filter by date range (period range, e.g. "2026-01" to "2026-06")
  if (startDate && endDate) {
    query.period = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.period = { $gte: startDate };
  } else if (endDate) {
    query.period = { $lte: endDate };
  }

  // Search by keyword/text
  if (search) {
    const searchLower = search.toLowerCase().trim();
    // Month name map for search helper
    const monthsMap = {
      january: '01', feb: '02', february: '02', mar: '03', march: '03',
      apr: '04', april: '04', may: '05', jun: '06', june: '06',
      jul: '07', july: '07', aug: '08', august: '08', sep: '09', september: '09',
      oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
      jan: '01',
    };
    if (monthsMap[searchLower]) {
      query.period = new RegExp(`-${monthsMap[searchLower]}$`);
    } else if (/^\d{4}$/.test(searchLower)) {
      query.period = new RegExp(`^${searchLower}-`);
    } else if (/^\d{4}-\d{2}$/.test(searchLower)) {
      query.period = searchLower;
    }
  }

  const pg = parseInt(page, 10) || 1;
  const lim = parseInt(limit, 10) || 10;
  const skip = (pg - 1) * lim;
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  // Secondary sort by period descending if sorting by other fields
  if (sortBy !== 'period') {
    sort.period = -1;
  }

  // Tertiary/Secondary sort by createdAt descending to ensure deterministic order for multiple entries
  if (sortBy !== 'createdAt') {
    sort.createdAt = -1;
  }

  const total = await FinancialRecord.countDocuments(query);
  const items = await FinancialRecord.find(query)
    .sort(sort)
    .skip(skip)
    .limit(lim);

  return {
    items,
    total,
  };
};

/**
 * Fetch the last updated financial record.
 */
exports.getLatest = async function getLatest() {
  // Sort by updatedAt descending to get the most recently updated/created record
  return await FinancialRecord.findOne().sort({ updatedAt: -1 });
};

/**
 * Fetch a single record by ID.
 */
exports.getById = async function getById(id) {
  const record = await FinancialRecord.findById(id);
  if (!record) {
    const error = new Error('Financial record not found');
    error.status = 404;
    throw error;
  }
  return record;
};

/**
 * Create a new record.
 */
exports.create = async function create(payload) {
  return await FinancialRecord.create(payload);
};

/**
 * Update an existing record.
 */
exports.update = async function update(id, payload) {
  const record = await FinancialRecord.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!record) {
    const error = new Error('Financial record not found');
    error.status = 404;
    throw error;
  }
  return record;
};

/**
 * Delete a record.
 */
exports.remove = async function remove(id) {
  const record = await FinancialRecord.findByIdAndDelete(id);
  if (!record) {
    const error = new Error('Financial record not found');
    error.status = 404;
    throw error;
  }
  return record;
};
