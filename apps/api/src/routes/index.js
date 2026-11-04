const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Public test/health endpoint
router.get('/test', (req, res) => {
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    message: 'Attendly API is live and public!',
    database: dbStatus[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/employees', require('./employee.routes'));
router.use('/shifts', require('./shift.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/reports', require('./report.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/holidays', require('./holiday.routes'));
router.use('/salary', require('./salary.routes'));
router.use('/leaves', require('./leave.routes'));
router.use('/financial', require('./financial.routes'));
router.use('/admin', require('./admin.routes'));

// Interior Company Commercial & Financial Operations
router.use('/clients', require('./customer.routes'));
router.use('/vendors', require('./vendor.routes'));
router.use('/billing', require('./billing.routes'));
router.use('/quotations', require('./quotation.routes'));
router.use('/vendor-bills', require('./vendorBill.routes'));
router.use('/cash-flow', require('./cashFlow.routes'));
router.use('/financial-analytics', require('./financialDashboard.routes'));
router.use('/shareholders', require('./shareholder.routes'));
router.use('/products', require('./product.routes'));
router.use('/transfers', require('./bankTransfer.routes'));
router.use('/projects', require('./project.routes'));
router.use('/rbac', require('./rbac.routes'));

module.exports = router;
