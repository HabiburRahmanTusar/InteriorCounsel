const express = require('express');
const ctrl = require('../controllers/financialDashboard.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/summary', rbac('admin', 'hr', 'manager'), ctrl.getSummary);

module.exports = router;
