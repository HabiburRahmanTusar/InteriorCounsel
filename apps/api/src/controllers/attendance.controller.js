const attendanceService = require('../services/attendance.service');
const apiResponse = require('../utils/apiResponse');

exports.getStatus = async (req, res, next) => {
  try {
    const data = await attendanceService.getStatus(req.user.id);
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};

exports.checkIn = async (req, res, next) => {
  try {
    const { latitude, longitude, address } = req.body;
    const data = await attendanceService.checkIn({
      userId: req.user.id,
      latitude,
      longitude,
      address,
    });
    return apiResponse.created(res, data, 'Check-in successful');
  } catch (err) {
    return next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    const { latitude, longitude, address } = req.body;
    const data = await attendanceService.checkOut({
      userId: req.user.id,
      latitude,
      longitude,
      address,
    });
    return apiResponse.ok(res, data, 'Check-out successful');
  } catch (err) {
    return next(err);
  }
};

exports.history = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const { from, to } = req.query;

    const { items, total } = await attendanceService.history({
      userId: req.user.id,
      from,
      to,
      page,
      limit,
    });

    return apiResponse.paginated(res, {
      items,
      total,
      page,
      limit,
    });
  } catch (err) {
    return next(err);
  }
};

exports.daily = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      const error = new Error('Date parameter is required');
      error.status = 400;
      throw error;
    }
    const data = await attendanceService.daily({ date });
    return apiResponse.ok(res, data);
  } catch (err) {
    return next(err);
  }
};
