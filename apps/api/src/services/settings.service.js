const SystemSetting = require('../models/SystemSetting');

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

exports.getWorkCalendar = async function getWorkCalendar() {
  const doc = await SystemSetting.findOne({ key: 'work-calendar' });
  return doc
    ? doc.value
    : {
        weekends: ['Friday', 'Saturday'],
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriod: 15,
        lateResetsMonthly: true,
        consecutiveLatesPenaltyThreshold: 3,
      };
};

exports.updateWorkCalendar = async function updateWorkCalendar(payload) {
  await SystemSetting.findOneAndUpdate(
    { key: 'work-calendar' },
    { key: 'work-calendar', value: payload },
    { upsert: true, new: true },
  );
};
