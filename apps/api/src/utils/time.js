/**
 * Time + timezone helpers.
 * All timestamps are stored as UTC; comparison against shift local time requires
 * timezone-aware conversion via dayjs (see build plan §11 Risk #2).
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Returns "On Time" or "Late" given a check-in instant and shift config.
 *
 * @param {Date} checkInUtc
 * @param {{startTime:string, gracePeriod:number, timezone:string}} shift
 * @returns {'On Time' | 'Late'}
 */
function checkInStatus(checkInUtc, shift) {
  // TODO: implement timezone-aware comparison
  // 1. Parse shift.startTime (HH:mm) in shift.timezone on checkInUtc's date.
  // 2. Add gracePeriod minutes → threshold UTC.
  // 3. Compare checkInUtc <= threshold → "On Time", else "Late".
  throw new Error('time.checkInStatus not implemented');
}

/**
 * Returns "Normal" or "Early Leave" given a check-out instant and shift config.
 *
 * @param {Date} checkOutUtc
 * @param {{endTime:string, timezone:string}} shift
 * @returns {'Normal' | 'Early Leave'}
 */
function checkOutStatus(checkOutUtc, shift) {
  // TODO: parse shift.endTime in shift.timezone on checkOutUtc's date → compare.
  throw new Error('time.checkOutStatus not implemented');
}

/**
 * Working minutes between check-in and check-out.
 *
 * @param {Date} checkInUtc
 * @param {Date} checkOutUtc
 * @returns {number}
 */
function workingMinutes(checkInUtc, checkOutUtc) {
  return Math.max(0, Math.round((checkOutUtc - checkInUtc) / 60000));
}

module.exports = { dayjs, checkInStatus, checkOutStatus, workingMinutes };
