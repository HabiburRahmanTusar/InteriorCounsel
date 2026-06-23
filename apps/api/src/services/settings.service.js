/**
 * Settings service — office locations, attendance rules, company profile.
 * Stubbed; implement later per build plan §6 Settings.
 */

exports.listOfficeLocations = async function listOfficeLocations() {
  // TODO: return all office locations
  throw new Error('settings.service.listOfficeLocations not implemented');
};

exports.createOfficeLocation = async function createOfficeLocation(payload) {
  // TODO: create new office location
  throw new Error('settings.service.createOfficeLocation not implemented');
};

exports.updateOfficeLocation = async function updateOfficeLocation(id, payload) {
  // TODO: update radius/coordinates
  throw new Error('settings.service.updateOfficeLocation not implemented');
};

exports.updateAttendanceRules = async function updateAttendanceRules(payload) {
  // TODO: update default grace period, radius defaults
  throw new Error('settings.service.updateAttendanceRules not implemented');
};

exports.getCompany = async function getCompany() {
  // TODO: return company profile (singleton doc)
  throw new Error('settings.service.getCompany not implemented');
};

exports.updateCompany = async function updateCompany(payload) {
  // TODO: update company info
  throw new Error('settings.service.updateCompany not implemented');
};
