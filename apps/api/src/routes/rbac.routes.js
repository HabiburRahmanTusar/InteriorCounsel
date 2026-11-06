const express = require('express');
const ctrl = require('../controllers/rbac.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(auth);

// Roles
router.get('/roles', ctrl.getRoles);
router.post('/roles', ctrl.saveRole);
router.delete('/roles/:name', ctrl.deleteRole);

// Users
router.get('/users', ctrl.getUsers);
router.post('/users', ctrl.saveUser);
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;

