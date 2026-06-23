/**
 * Haversine distance formula — great-circle distance between two GPS points.
 * Used for server-side GPS validation per build plan §11 (Risk #1).
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in metres
 */
const EARTH_RADIUS_METRES = 6371000;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METRES * c;
}

/**
 * @param {{latitude:number, longitude:number}} point
 * @param {{latitude:number, longitude:number, radius:number}} office
 * @returns {boolean} true if `point` is within `office.radius` metres of `office`
 */
function isWithinOfficeRadius(point, office) {
  const distance = haversineDistance(
    point.latitude,
    point.longitude,
    office.latitude,
    office.longitude,
  );
  return distance <= office.radius;
}

module.exports = { haversineDistance, isWithinOfficeRadius };
