/**
 * Settings routes — see build plan §6 Settings.
 */
const express = require('express');

const ctrl = require('../controllers/settings.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/settings.validator');

const router = express.Router();

router.use(auth, rbac('admin'));

router.put(
  '/attendance-rules',
  validate(schemas.updateAttendanceRules),
  ctrl.updateAttendanceRules,
);
router.get('/company', ctrl.getCompany);
router.put('/company', validate(schemas.updateCompany), ctrl.updateCompany);

module.exports = router;
