const express = require('express');
const ctrl = require('../controllers/product.controller');
const auth = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(auth);

router.get('/', rbac('admin', 'hr', 'manager', 'employee'), ctrl.listProducts);
router.get('/:id', rbac('admin', 'hr', 'manager', 'employee'), ctrl.getProductById);
router.post('/', rbac('admin', 'hr', 'manager'), ctrl.createProduct);
router.put('/:id', rbac('admin', 'hr', 'manager'), ctrl.updateProduct);
router.delete('/:id', rbac('admin'), ctrl.deleteProduct);

module.exports = router;
