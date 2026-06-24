/**
 * Time + timezone helpers.
 * All timestamps are stored as UTC; comparison against shift local time requires
 * timezone-aware conversion via dayjs (see build plan §11 Risk #2).
 */
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

/**
 * Returns "On Time" or "Late" given a check-in instant and shift config.
 *
 * @param {Date} checkInUtc
 * @param {{startTime:string, gracePeriod:number, timezone:string}} shift
 * @returns {'On Time' | 'Late'}
 */
function checkInStatus(checkInUtc, shift) {
  const checkInLocal = dayjs(checkInUtc).tz('Asia/Dhaka');
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const shiftStartLocal = checkInLocal.hour(sh).minute(sm).second(0).millisecond(0);
  const thresholdLocal = shiftStartLocal.add(shift.gracePeriod || 0, 'minute');

  return checkInLocal.isAfter(thresholdLocal) ? 'Late' : 'On Time';
}

function checkOutStatus(checkOutUtc, shift, checkInUtc) {
  const checkOutLocal = dayjs(checkOutUtc).tz('Asia/Dhaka');
  const [eh, em] = shift.endTime.split(':').map(Number);

  const baseLocal = checkInUtc ? dayjs(checkInUtc).tz('Asia/Dhaka') : checkOutLocal;
  let shiftEndLocal = baseLocal.hour(eh).minute(em).second(0).millisecond(0);

  const [sh, sm] = shift.startTime.split(':').map(Number);
  const isOvernight = eh < sh || (eh === sh && em < sm);
  if (isOvernight) {
    shiftEndLocal = shiftEndLocal.add(1, 'day');
  }

  if (checkOutLocal.isBefore(shiftEndLocal)) {
    return 'Early Leave';
  }

  const overtimeMinutes = checkOutLocal.diff(shiftEndLocal, 'minute');
  if (overtimeMinutes > 120) {
    return 'Late Checkout';
  }

  return 'Normal';
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

function getLateMinutes(checkInUtc, shift) {
  const checkInLocal = dayjs(checkInUtc).tz('Asia/Dhaka');
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const shiftStartLocal = checkInLocal.hour(sh).minute(sm).second(0).millisecond(0);

  if (checkInLocal.isAfter(shiftStartLocal)) {
    return Math.max(0, checkInLocal.diff(shiftStartLocal, 'minute'));
  }
  return 0;
}

module.exports = { dayjs, checkInStatus, checkOutStatus, workingMinutes, getLateMinutes };
