const express = require('express');
const ctrl = require('../controllers/holiday.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', ctrl.list);
router.post('/', rbac('admin', 'hr'), ctrl.create);
router.delete('/:id', rbac('admin', 'hr'), ctrl.remove);

module.exports = router;
