const OfficeLocation = require('../models/OfficeLocation');
const SystemSetting = require('../models/SystemSetting');

exports.listOfficeLocations = async function listOfficeLocations() {
  return OfficeLocation.find({});
};

exports.createOfficeLocation = async function createOfficeLocation(payload) {
  return OfficeLocation.create(payload);
};

exports.updateOfficeLocation = async function updateOfficeLocation(id, payload) {
  const loc = await OfficeLocation.findByIdAndUpdate(id, payload, { new: true });
  if (!loc) {
    const error = new Error('Office location not found');
    error.status = 404;
    throw error;
  }
  return loc;
};

exports.updateAttendanceRules = async function updateAttendanceRules(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'attendance-rules' },
    { key: 'attendance-rules', value: payload },
    { upsert: true, new: true },
  );
};

exports.getCompany = async function getCompany() {
  const doc = await SystemSetting.findOne({ key: 'company' });
  return doc ? doc.value : { name: 'Attendly Inc', legalName: 'Attendly Incorporated' };
};

exports.updateCompany = async function updateCompany(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'company' },
    { key: 'company', value: payload },
    { upsert: true, new: true },
  );
};
