/**
 * Shift service — CRUD with delete guard.
 * Stubbed; implement later per build plan §7 (Employee & Shift APIs).
 */

exports.list = async function list() {
  // TODO: return all shifts
  throw new Error('shift.service.list not implemented');
};

exports.create = async function create(payload) {
  // TODO: create shift
  throw new Error('shift.service.create not implemented');
};

exports.update = async function update(id, payload) {
  // TODO: update shift config
  throw new Error('shift.service.update not implemented');
};

exports.remove = async function remove(id) {
  // TODO: block delete if any employee is assigned to this shift
  throw new Error('shift.service.remove not implemented');
};
