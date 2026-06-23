/**
 * Employee service — CRUD + soft-delete + assignment helpers.
 * Stubbed; implement later per build plan §7 (Employee & Shift APIs).
 */

exports.list = async function list({ page, limit, search, departmentId, status }) {
  // TODO: paginated list with search/filter
  throw new Error('employee.service.list not implemented');
};

exports.getById = async function getById(id) {
  // TODO: fetch single employee by id
  throw new Error('employee.service.getById not implemented');
};

exports.create = async function create(payload) {
  // TODO: create new employee (hash password handled by model hook)
  throw new Error('employee.service.create not implemented');
};

exports.update = async function update(id, payload) {
  // TODO: update employee fields (re-hash password if changed)
  throw new Error('employee.service.update not implemented');
};

exports.deactivate = async function deactivate(id) {
  // TODO: soft-delete — set status to inactive
  throw new Error('employee.service.deactivate not implemented');
};

exports.assignShift = async function assignShift(id, shiftId) {
  // TODO: assign shift to employee
  throw new Error('employee.service.assignShift not implemented');
};

exports.assignDepartment = async function assignDepartment(id, departmentId) {
  // TODO: assign department to employee
  throw new Error('employee.service.assignDepartment not implemented');
};
