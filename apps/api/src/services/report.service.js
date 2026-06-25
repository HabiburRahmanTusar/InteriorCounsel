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

function formatWorkingHours(minutes) {
  if (!minutes) return '0h';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

function formatLateDuration(minutes) {
  if (!minutes) return '0 mins';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hrStr = hrs === 1 ? '1 hour' : `${hrs} hours`;
  const minStr = mins === 1 ? '1 min' : `${mins} mins`;
  if (hrs === 0) return minStr;
  if (mins === 0) return hrStr;
  return `${hrStr} ${minStr}`;
}

exports.employeeWise = async function employeeWise({ employeeId, from, to }) {
  const LeaveRequest = require('../models/LeaveRequest');
  const Holiday = require('../models/Holiday');
  const automationService = require('./automation.service');

  const fromDate = dayjs(from).tz('Asia/Dhaka').startOf('day');
  const toDate = dayjs(to).tz('Asia/Dhaka').startOf('day');

  const user = await User.findById(employeeId).populate('shiftId');
  if (!user) {
    const error = new Error('Employee not found');
    error.status = 404;
    throw error;
  }
  const shift = user.shiftId;

  let shiftRequiredMinutes = 0;
  if (shift) {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins < startMins) {
      endMins += 24 * 60;
    }
    shiftRequiredMinutes = endMins - startMins;
  }

  const weekends = await automationService.getWeekends();

  const holidays = await Holiday.find({
    date: { $gte: fromDate.toDate(), $lte: toDate.endOf('day').toDate() },
  });
  const holidayMap = new Map(
    holidays.map((h) => [dayjs(h.date).tz('Asia/Dhaka').format('YYYY-MM-DD'), h.name]),
  );

  const leaveRequests = await LeaveRequest.find({
    employeeId,
    status: 'Approved',
    startDate: { $lte: toDate.endOf('day').toDate() },
    endDate: { $gte: fromDate.toDate() },
  });

  const attendances = await Attendance.find({
    employeeId,
    attendanceDate: { $gte: fromDate.toDate(), $lte: toDate.endOf('day').toDate() },
  });
  const attendanceMap = new Map(
    attendances.map((a) => [dayjs(a.attendanceDate).tz('Asia/Dhaka').format('YYYY-MM-DD'), a]),
  );

  const joining = dayjs(user.joiningDate || user.createdAt)
    .tz('Asia/Dhaka')
    .startOf('day');
  const resignation = user.resignationDate
    ? dayjs(user.resignationDate).tz('Asia/Dhaka').endOf('day')
    : null;

  let current = fromDate;
  const dates = [];
  while (current.isBefore(toDate) || current.isSame(toDate, 'day')) {
    dates.push(current);
    current = current.add(1, 'day');
  }
  dates.reverse();

  const rows = [];
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLate = 0;
  let totalWorkingMinutes = 0;

  for (const date of dates) {
    const dateStr = date.format('YYYY-MM-DD');
    const dayName = date.format('dddd');
    const isWeekend = weekends.includes(dayName);
    const holidayName = holidayMap.get(dateStr);
    const log = attendanceMap.get(dateStr);

    let approvedLeave = null;
    for (const req of leaveRequests) {
      const sDate = dayjs(req.startDate).tz('Asia/Dhaka').startOf('day');
      const eDate = dayjs(req.endDate).tz('Asia/Dhaka').endOf('day');
      if (date.isBetween(sDate, eDate, null, '[]')) {
        approvedLeave = req;
        break;
      }
    }

    let status = '—';
    let checkInTime = '—';
    let checkOutTime = '—';
    let workingHours = '—';
    let overtimeHours = '—';
    let remarks = '—';
    let workingMins = 0;

    // Check contract status bounds
    if (date.isBefore(joining, 'day') || (resignation && date.isAfter(resignation, 'day'))) {
      status = '—';
      remarks = 'Not Employed / Inactive';
    } else if (log?.checkIn) {
      checkInTime = dayjs(log.checkIn.time).tz('Asia/Dhaka').format('hh:mm A');

      if (log.checkOut) {
        checkOutTime = dayjs(log.checkOut.time).tz('Asia/Dhaka').format('hh:mm A');
        workingMins = log.workingMinutes || 0;
        workingHours = formatWorkingHours(workingMins);

        if (shift) {
          const [eh, em] = shift.endTime.split(':').map(Number);
          const checkInLocal = dayjs(log.checkIn.time).tz('Asia/Dhaka');
          const checkOutLocal = dayjs(log.checkOut.time).tz('Asia/Dhaka');
          let shiftEndLocal = checkInLocal.hour(eh).minute(em).second(0).millisecond(0);
          const [sh, sm] = shift.startTime.split(':').map(Number);
          const isOvernight = eh < sh || (eh === sh && em < sm);
          if (isOvernight) {
            shiftEndLocal = shiftEndLocal.add(1, 'day');
          }
          if (checkOutLocal.isAfter(shiftEndLocal)) {
            const otMins = checkOutLocal.diff(shiftEndLocal, 'minute');
            overtimeHours = formatWorkingHours(otMins);
          }
        }
      }

      if (log.checkOut) {
        const isOnTime = log.checkIn.status === 'On Time';
        const isEarlyLeave = log.checkOut.status === 'Early Leave';

        if (
          shiftRequiredMinutes > 0 &&
          workingMins < shiftRequiredMinutes / 2 &&
          !(isOnTime && !isEarlyLeave)
        ) {
          status = 'Half-Day';
          remarks = `Short hours: ${workingMins} mins worked (Shift requires ${shiftRequiredMinutes} mins)`;
        } else if (log.checkIn.status === 'Late') {
          status = 'Late';
          remarks = `Late check-in by ${formatLateDuration(log.checkIn.lateMinutes || 0)}`;
          totalLate++;
        } else {
          status = 'Present';
          remarks = 'On Time check-in';
        }
      } else {
        const todayStr = dayjs().tz('Asia/Dhaka').format('YYYY-MM-DD');
        if (dateStr === todayStr) {
          if (log.checkIn.status === 'Late') {
            status = 'Late';
            remarks = `Late check-in by ${formatLateDuration(log.checkIn.lateMinutes || 0)}, check-out pending`;
            totalLate++;
          } else {
            status = 'Present';
            remarks = 'Checked in, check-out pending';
          }
        } else {
          status = 'Half-Day';
          remarks = 'Missing check-out';
        }
      }

      if (status === 'Present' || status === 'Late') {
        totalPresent++;
      }
      totalWorkingMinutes += workingMins;

      if (isWeekend) {
        remarks = `Weekend work. ${remarks}`;
      } else if (holidayName) {
        remarks = `Holiday work (${holidayName}). ${remarks}`;
      }
    } else {
      if (approvedLeave) {
        status = 'Leave';
        remarks = `Approved Leave: ${approvedLeave.reason}`;
      } else if (isWeekend) {
        status = 'Weekend';
        remarks = 'Weekend';
      } else if (holidayName) {
        status = 'Holiday';
        remarks = `Public Holiday: ${holidayName}`;
      } else {
        if (date.isBefore(dayjs().tz('Asia/Dhaka').startOf('day'))) {
          status = 'Absent';
          remarks = 'Absent';
          totalAbsent++;
        } else {
          status = '—';
          remarks = '—';
        }
      }
    }

    rows.push({
      employeeId: user.employeeId,
      employeeName: user.name,
      date: dateStr,
      checkInTime,
      checkOutTime,
      workingHours,
      overtimeHours,
      status,
      remarks,
    });
  }

  return {
    items: rows,
    summary: {
      totalPresentDays: totalPresent,
      totalAbsentDays: totalAbsent,
      totalLateDays: totalLate,
      totalWorkingHours: formatWorkingHours(totalWorkingMinutes),
    },
  };
};

exports.exportEmployeeWise = async function exportEmployeeWise({ format, employeeId, from, to }) {
  const { items, summary } = await exports.employeeWise({ employeeId, from, to });

  const user = await User.findById(employeeId);
  const employeeName = user ? user.name : 'Employee';

  if (format === 'csv') {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Date',
      'Check-In Time',
      'Check-Out Time',
      'Working Hours',
      'Overtime Hours',
      'Status',
      'Remarks',
    ];
    const csvRows = [headers.join(',')];
    for (const item of items) {
      const values = [
        `"${item.employeeId}"`,
        `"${item.employeeName.replace(/"/g, '""')}"`,
        item.date,
        item.checkInTime,
        item.checkOutTime,
        item.workingHours,
        item.overtimeHours,
        item.status,
        `"${item.remarks.replace(/"/g, '""')}"`,
      ];
      csvRows.push(values.join(','));
    }
    csvRows.push('');
    csvRows.push(`Total Present Days,${summary.totalPresentDays}`);
    csvRows.push(`Total Absent Days,${summary.totalAbsentDays}`);
    csvRows.push(`Total Late Days,${summary.totalLateDays}`);
    csvRows.push(`Total Working Hours,${summary.totalWorkingHours}`);

    return { buffer: Buffer.from(csvRows.join('\n'), 'utf-8'), contentType: 'text/csv' };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Employee Wise Attendance Report', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Employee: ${employeeName} (${items[0]?.employeeId || ''})`, { align: 'center' });
    doc.text(`Date Range: ${from} to ${to}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(11).text('Summary Statistics:', { underline: true });
    doc.fontSize(10).text(`Total Present Days: ${summary.totalPresentDays}`);
    doc.text(`Total Absent Days: ${summary.totalAbsentDays}`);
    doc.text(`Total Late Days: ${summary.totalLateDays}`);
    doc.text(`Total Working Hours: ${summary.totalWorkingHours}`);
    doc.moveDown(2);

    doc.fontSize(9);
    let y = doc.y;
    doc.text('Date', 30, y);
    doc.text('Check-In', 90, y);
    doc.text('Check-Out', 150, y);
    doc.text('Worked', 210, y);
    doc.text('Overtime', 270, y);
    doc.text('Status', 330, y);
    doc.text('Remarks', 400, y);
    doc
      .moveTo(30, y + 12)
      .lineTo(570, y + 12)
      .stroke();

    y += 20;
    for (const item of items) {
      if (y > 700) {
        doc.addPage();
        y = 40;
        doc.text('Date', 30, y);
        doc.text('Check-In', 90, y);
        doc.text('Check-Out', 150, y);
        doc.text('Worked', 210, y);
        doc.text('Overtime', 270, y);
        doc.text('Status', 330, y);
        doc.text('Remarks', 400, y);
        doc
          .moveTo(30, y + 12)
          .lineTo(570, y + 12)
          .stroke();
        y += 20;
      }
      doc.text(item.date, 30, y);
      doc.text(item.checkInTime, 90, y);
      doc.text(item.checkOutTime, 150, y);
      doc.text(item.workingHours, 210, y);
      doc.text(item.overtimeHours, 270, y);
      doc.text(item.status, 330, y);
      doc.text(item.remarks.substring(0, 30), 400, y);
      y += 18;
    }

    doc.end();
    const buffer = await new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
    return { buffer, contentType: 'application/pdf' };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employee Attendance');

  sheet.columns = [
    { header: 'Employee ID', key: 'empId', width: 15 },
    { header: 'Employee Name', key: 'empName', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Check-In Time', key: 'checkIn', width: 15 },
    { header: 'Check-Out Time', key: 'checkOut', width: 15 },
    { header: 'Working Hours', key: 'workingHours', width: 15 },
    { header: 'Overtime Hours', key: 'overtimeHours', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Remarks', key: 'remarks', width: 35 },
  ];

  for (const item of items) {
    sheet.addRow({
      empId: item.employeeId,
      empName: item.employeeName,
      date: item.date,
      checkIn: item.checkInTime,
      checkOut: item.checkOutTime,
      workingHours: item.workingHours,
      overtimeHours: item.overtimeHours,
      status: item.status,
      remarks: item.remarks,
    });
  }

  sheet.addRow([]);
  sheet.addRow(['Summary Statistics']);
  sheet.addRow(['Total Present Days', summary.totalPresentDays]);
  sheet.addRow(['Total Absent Days', summary.totalAbsentDays]);
  sheet.addRow(['Total Late Days', summary.totalLateDays]);
  sheet.addRow(['Total Working Hours', summary.totalWorkingHours]);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

exports.leaveWise = async function leaveWise({ employeeId, leaveType, from, to }) {
  const LeaveRequest = require('../models/LeaveRequest');

  const fromDate = dayjs(from).tz('Asia/Dhaka').startOf('day').toDate();
  const toDate = dayjs(to).tz('Asia/Dhaka').endOf('day').toDate();

  const query = {
    startDate: { $lte: toDate },
    endDate: { $gte: fromDate },
  };

  if (employeeId) {
    query.employeeId = employeeId;
  }
  if (leaveType) {
    query.leaveType = leaveType;
  }

  const requests = await LeaveRequest.find(query)
    .populate('employeeId', 'name employeeId')
    .populate('approvedBy', 'name')
    .sort({ startDate: -1 });

  const items = requests.map((req) => ({
    employeeId: req.employeeId?.employeeId || '—',
    employeeName: req.employeeId?.name || '—',
    leaveType: req.leaveType,
    startDate: dayjs(req.startDate).tz('Asia/Dhaka').format('YYYY-MM-DD'),
    endDate: dayjs(req.endDate).tz('Asia/Dhaka').format('YYYY-MM-DD'),
    totalDays: req.requestedDays,
    reason: req.reason,
    status: req.status,
    approvedBy: req.approvedBy?.name || '—',
    approvalDate: req.approvalDate
      ? dayjs(req.approvalDate).tz('Asia/Dhaka').format('YYYY-MM-DD hh:mm A')
      : '—',
  }));

  // Calculate stats
  let totalLeaveTaken = 0;
  let pendingRequests = 0;
  let approvedLeaves = 0;
  let rejectedLeaves = 0;

  for (const req of requests) {
    if (req.status === 'Approved') {
      approvedLeaves++;
      totalLeaveTaken += req.requestedDays;
    } else if (req.status === 'Pending') {
      pendingRequests++;
    } else if (req.status === 'Rejected') {
      rejectedLeaves++;
    }
  }

  return {
    items,
    summary: {
      totalLeaveTaken,
      pendingRequests,
      approvedLeaves,
      rejectedLeaves,
    },
  };
};

exports.exportLeaveWise = async function exportLeaveWise({
  format,
  employeeId,
  leaveType,
  from,
  to,
}) {
  const { items, summary } = await exports.leaveWise({ employeeId, leaveType, from, to });

  if (format === 'csv') {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Leave Type',
      'Start Date',
      'End Date',
      'Total Days',
      'Reason',
      'Status',
      'Approved By',
      'Approval Date',
    ];
    const csvRows = [headers.join(',')];
    for (const item of items) {
      const values = [
        `"${item.employeeId}"`,
        `"${item.employeeName.replace(/"/g, '""')}"`,
        `"${item.leaveType}"`,
        item.startDate,
        item.endDate,
        item.totalDays,
        `"${item.reason.replace(/"/g, '""')}"`,
        item.status,
        `"${item.approvedBy.replace(/"/g, '""')}"`,
        `"${item.approvalDate}"`,
      ];
      csvRows.push(values.join(','));
    }
    csvRows.push('');
    csvRows.push(`Total Leave Taken (Days),${summary.totalLeaveTaken}`);
    csvRows.push(`Pending Requests,${summary.pendingRequests}`);
    csvRows.push(`Approved Leaves,${summary.approvedLeaves}`);
    csvRows.push(`Rejected Leaves,${summary.rejectedLeaves}`);

    return { buffer: Buffer.from(csvRows.join('\n'), 'utf-8'), contentType: 'text/csv' };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30, layout: 'landscape' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.fontSize(20).text('Employee Wise Leave Report', { align: 'center' });
    doc.moveDown();

    let subTitle = `Date Range: ${from} to ${to}`;
    if (leaveType) subTitle += ` | Leave Type: ${leaveType}`;
    doc.fontSize(11).text(subTitle, { align: 'center' });
    doc.moveDown();

    doc.fontSize(11).text('Summary Statistics:', { underline: true });
    doc.fontSize(10).text(`Total Leave Taken (Days): ${summary.totalLeaveTaken}`);
    doc.text(`Pending Requests: ${summary.pendingRequests}`);
    doc.text(`Approved Leaves: ${summary.approvedLeaves}`);
    doc.text(`Rejected Leaves: ${summary.rejectedLeaves}`);
    doc.moveDown(2);

    doc.fontSize(8);
    let y = doc.y;
    doc.text('Emp ID', 30, y);
    doc.text('Employee Name', 90, y);
    doc.text('Type', 210, y);
    doc.text('Start Date', 270, y);
    doc.text('End Date', 340, y);
    doc.text('Days', 410, y);
    doc.text('Reason', 440, y);
    doc.text('Status', 560, y);
    doc.text('Approved By', 620, y);
    doc.text('Approval Date', 700, y);

    doc
      .moveTo(30, y + 12)
      .lineTo(760, y + 12)
      .stroke();

    y += 20;
    for (const item of items) {
      if (y > 500) {
        doc.addPage();
        y = 40;
        doc.text('Emp ID', 30, y);
        doc.text('Employee Name', 90, y);
        doc.text('Type', 210, y);
        doc.text('Start Date', 270, y);
        doc.text('End Date', 340, y);
        doc.text('Days', 410, y);
        doc.text('Reason', 440, y);
        doc.text('Status', 560, y);
        doc.text('Approved By', 620, y);
        doc.text('Approval Date', 700, y);
        doc
          .moveTo(30, y + 12)
          .lineTo(760, y + 12)
          .stroke();
        y += 20;
      }
      doc.text(item.employeeId, 30, y);
      doc.text(item.employeeName.substring(0, 20), 90, y);
      doc.text(item.leaveType, 210, y);
      doc.text(item.startDate, 270, y);
      doc.text(item.endDate, 340, y);
      doc.text(String(item.totalDays), 410, y);
      doc.text(item.reason.substring(0, 22), 440, y);
      doc.text(item.status, 560, y);
      doc.text(item.approvedBy.substring(0, 15), 620, y);
      doc.text(item.approvalDate, 700, y);
      y += 18;
    }

    doc.end();
    const buffer = await new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
    return { buffer, contentType: 'application/pdf' };
  }

  // Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leave Report');

  sheet.columns = [
    { header: 'Employee ID', key: 'empId', width: 15 },
    { header: 'Employee Name', key: 'empName', width: 25 },
    { header: 'Leave Type', key: 'leaveType', width: 15 },
    { header: 'Start Date', key: 'startDate', width: 15 },
    { header: 'End Date', key: 'endDate', width: 15 },
    { header: 'Total Days', key: 'totalDays', width: 12 },
    { header: 'Reason', key: 'reason', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Approved By', key: 'approvedBy', width: 20 },
    { header: 'Approval Date', key: 'approvalDate', width: 22 },
  ];

  for (const item of items) {
    sheet.addRow({
      empId: item.employeeId,
      empName: item.employeeName,
      leaveType: item.leaveType,
      startDate: item.startDate,
      endDate: item.endDate,
      totalDays: item.totalDays,
      reason: item.reason,
      status: item.status,
      approvedBy: item.approvedBy,
      approvalDate: item.approvalDate,
    });
  }

  sheet.addRow([]);
  sheet.addRow(['Summary Statistics']);
  sheet.addRow(['Total Leave Taken (Days)', summary.totalLeaveTaken]);
  sheet.addRow(['Pending Requests', summary.pendingRequests]);
  sheet.addRow(['Approved Leaves', summary.approvedLeaves]);
  sheet.addRow(['Rejected Leaves', summary.rejectedLeaves]);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};
