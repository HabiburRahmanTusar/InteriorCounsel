/**
 * Report routes — see build plan §6 Reports.
 */
const express = require('express');

const ctrl = require('../controllers/report.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/report.validator');

const router = express.Router();

router.use(auth, rbac('admin', 'hr'));

router.get('/daily', validate(schemas.daily), ctrl.daily);
router.get('/monthly', validate(schemas.monthly), ctrl.monthly);
router.get('/export', validate(schemas.exportReport), ctrl.exportReport);

module.exports = router;
