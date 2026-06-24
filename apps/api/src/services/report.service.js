const User = require('../models/User');
const Attendance = require('../models/Attendance');
const attendanceService = require('./attendance.service');
const { dayjs } = require('../utils/time');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

exports.daily = async function daily({ date }) {
  return attendanceService.daily({ date });
};

exports.monthly = async function monthly({ month }) {
  const start = dayjs(month).startOf('month').toDate();
  const end = dayjs(month).endOf('month').toDate();
  const daysInMonth = dayjs(month).daysInMonth();

  const userQuery = { status: 'active', role: { $ne: 'admin' } };

  const users = await User.find(userQuery);
  const userIds = users.map((u) => u._id);

  const logs = await Attendance.find({
    employeeId: { $in: userIds },
    attendanceDate: { $gte: start, $lte: end },
  });

  const logsByUser = new Map();
  for (const log of logs) {
    const key = log.employeeId.toString();
    if (!logsByUser.has(key)) logsByUser.set(key, []);
    logsByUser.get(key).push(log);
  }

  return users.map((user) => {
    const userLogs = logsByUser.get(user._id.toString()) || [];
    const present = userLogs.filter((l) => !!l.checkIn).length;
    const late = userLogs.filter((l) => l.checkIn?.status === 'Late').length;
    const earlyLeave = userLogs.filter((l) => l.checkOut?.status === 'Early Leave').length;
    const absent = Math.max(0, daysInMonth - present);

    return {
      employeeId: user._id,
      employeeName: user.name,
      employeeCode: user.employeeId,
      present,
      absent,
      late,
      earlyLeave,
    };
  });
};

exports.exportReport = async function exportReport({ format, from, to }) {
  const start = dayjs(from).startOf('day').toDate();
  const end = dayjs(to).endOf('day').toDate();

  const userQuery = { status: 'active', role: { $ne: 'admin' } };

  const users = await User.find(userQuery);
  const userIds = users.map((u) => u._id);

  const logs = await Attendance.find({
    employeeId: { $in: userIds },
    attendanceDate: { $gte: start, $lte: end },
  })
    .populate('employeeId')
    .sort({ attendanceDate: 1 });

  const rows = logs.map((log) => ({
    Date: dayjs(log.attendanceDate).format('YYYY-MM-DD'),
    'Employee ID': log.employeeId.employeeId,
    Name: log.employeeId.name,
    Email: log.employeeId.email,
    'Check-In Time': log.checkIn?.time ? dayjs(log.checkIn.time).format('HH:mm:ss') : '—',
    'Check-In Status': log.checkIn?.status || 'Absent',
    'Check-Out Time': log.checkOut?.time ? dayjs(log.checkOut.time).format('HH:mm:ss') : '—',
    'Check-Out Status': log.checkOut?.status || '—',
    'Working Minutes': log.workingMinutes || 0,
  }));

  if (format === 'csv') {
    const headers = [
      'Date',
      'Employee ID',
      'Name',
      'Email',
      'Check-In Time',
      'Check-In Status',
      'Check-Out Time',
      'Check-Out Status',
      'Working Minutes',
    ];
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((h) => {
        const val = row[h];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    return { buffer: Buffer.from(csvContent, 'utf-8'), contentType: 'text/csv' };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date Range: ${from} to ${to}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    let y = 150;
    doc.text('Date', 30, y);
    doc.text('Emp ID', 100, y);
    doc.text('Name', 170, y);
    doc.text('Check-In', 270, y);
    doc.text('Status', 350, y);
    doc.text('Check-Out', 420, y);
    doc.text('Worked', 520, y);
    doc
      .moveTo(30, y + 15)
      .lineTo(570, y + 15)
      .stroke();

    y += 25;
    for (const row of rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
        doc.text('Date', 30, y);
        doc.text('Emp ID', 100, y);
        doc.text('Name', 170, y);
        doc.text('Check-In', 270, y);
        doc.text('Status', 350, y);
        doc.text('Check-Out', 420, y);
        doc.text('Worked', 520, y);
        doc
          .moveTo(30, y + 15)
          .lineTo(570, y + 15)
          .stroke();
        y += 25;
      }
      doc.text(row['Date'], 30, y);
      doc.text(row['Employee ID'], 100, y);
      doc.text(row['Name'].substring(0, 15), 170, y);
      doc.text(row['Check-In Time'], 270, y);
      doc.text(row['Check-In Status'], 350, y);
      doc.text(row['Check-Out Time'], 420, y);
      doc.text(String(row['Working Minutes']) + 'm', 520, y);
      y += 20;
    }

    doc.end();
    const buffer = await new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
    return { buffer, contentType: 'application/pdf' };
  }

  // Fallback to Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance Report');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee ID', key: 'empId', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Check-In Time', key: 'checkInTime', width: 18 },
    { header: 'Check-In Status', key: 'checkInStatus', width: 18 },
    { header: 'Check-Out Time', key: 'checkOutTime', width: 18 },
    { header: 'Check-Out Status', key: 'checkOutStatus', width: 18 },
    { header: 'Working Minutes', key: 'workingMinutes', width: 18 },
  ];
  for (const row of rows) {
    sheet.addRow({
      date: row['Date'],
      empId: row['Employee ID'],
      name: row['Name'],
      email: row['Email'],
      checkInTime: row['Check-In Time'],
      checkInStatus: row['Check-In Status'],
      checkOutTime: row['Check-Out Time'],
      checkOutStatus: row['Check-Out Status'],
      workingMinutes: row['Working Minutes'],
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};
