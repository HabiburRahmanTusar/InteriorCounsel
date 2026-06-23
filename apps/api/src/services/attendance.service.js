/**
 * Attendance service — the attendance engine.
 * Stubbed; implement later per build plan §7 (Attendance Engine).
 *
 * Critical rules to enforce during implementation:
 *  - Server-side GPS validation via utils/haversine.js (never trust client).
 *  - Late detection via utils/time.js with timezone conversion.
 *  - Idempotent check-in via upsert on { employeeId, attendanceDate }.
 *  - Early-leave detection + workingMinutes calculation on check-out.
 */

exports.getStatus = async function getStatus(userId) {
  // TODO: return today's check-in state for the calling user
  throw new Error('attendance.service.getStatus not implemented');
};

exports.checkIn = async function checkIn({ userId, latitude, longitude }) {
  // TODO: GPS validate → compute status → upsert record
  throw new Error('attendance.service.checkIn not implemented');
};

exports.checkOut = async function checkOut({ userId, latitude, longitude }) {
  // TODO: GPS validate → calc workingMinutes → set checkOut.status (Normal | Early Leave)
  throw new Error('attendance.service.checkOut not implemented');
};

exports.history = async function history({ userId, from, to, page, limit }) {
  // TODO: paginated personal history, date-range filter
  throw new Error('attendance.service.history not implemented');
};

exports.daily = async function daily({ date, departmentId }) {
  // TODO: all employees' attendance for given date
  throw new Error('attendance.service.daily not implemented');
};
