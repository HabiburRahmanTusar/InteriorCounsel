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
  const checkInLocal = dayjs(checkInUtc).tz(shift.timezone);
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const shiftStartLocal = checkInLocal.hour(sh).minute(sm).second(0).millisecond(0);
  const thresholdLocal = shiftStartLocal.add(shift.gracePeriod || 0, 'minute');

  return checkInLocal.isAfter(thresholdLocal) ? 'Late' : 'On Time';
}

function checkOutStatus(checkOutUtc, shift) {
  const checkOutLocal = dayjs(checkOutUtc).tz(shift.timezone);
  const [eh, em] = shift.endTime.split(':').map(Number);
  const shiftEndLocal = checkOutLocal.hour(eh).minute(em).second(0).millisecond(0);

  return checkOutLocal.isBefore(shiftEndLocal) ? 'Early Leave' : 'Normal';
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
