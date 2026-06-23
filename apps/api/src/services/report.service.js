/**
 * Report service — daily/monthly aggregation + multi-format export.
 * Stubbed; implement later per build plan §7 (Reports).
 *
 * Notes:
 *  - Daily/monthly use MongoDB aggregation pipelines joining users + attendance.
 *  - Export supports Excel (exceljs), PDF (pdfkit), CSV (json2csv) based on ?format=.
 */

exports.daily = async function daily({ date, departmentId }) {
  // TODO: aggregation pipeline — per-employee statuses for given date
  throw new Error('report.service.daily not implemented');
};

exports.monthly = async function monthly({ month, departmentId }) {
  // TODO: group by employee — sum present/absent/late/early counts
  throw new Error('report.service.monthly not implemented');
};

exports.exportReport = async function exportReport({ format, from, to, departmentId }) {
  // TODO: stream Excel/PDF/CSV based on format
  // format: 'excel' | 'csv' | 'pdf'
  throw new Error('report.service.export not implemented');
};
