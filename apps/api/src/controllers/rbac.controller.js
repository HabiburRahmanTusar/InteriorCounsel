const Role = require('../models/Role');
const User = require('../models/User');
const apiResponse = require('../utils/apiResponse');

const DEFAULT_ROLES = [
  { name: 'Super Admin', all: true, menus: [], isSystem: true },
  {
    name: 'Manager',
    all: false,
    menus: [
      'dashboard',
      'commercial-dashboard',
      'employees',
      'attendance',
      'manual-attendance',
      'leave',
      'projects',
      'customers',
      'sales',
      'inventory',
      'purchase',
      'suppliers',
      'reports',
    ],
    isSystem: true,
  },
  {
    name: 'HR Manager',
    all: false,
    menus: [
      'dashboard',
      'employees',
      'attendance',
      'manual-attendance',
      'leave',
      'payroll',
      'reports',
    ],
    isSystem: true,
  },
  {
    name: 'Accountant',
    all: false,
    menus: [
      'dashboard',
      'customers',
      'sales',
      'payroll',
      'reports',
      'accounting',
      'cash-flow',
      'transfers',
      'shareholders',
    ],
    isSystem: true,
  },
  {
    name: 'Sales Staff',
    all: false,
    menus: ['dashboard', 'customers', 'sales', 'projects'],
    isSystem: true,
  },
  {
    name: 'Store Keeper',
    all: false,
    menus: ['dashboard', 'inventory', 'purchase', 'suppliers'],
    isSystem: true,
  },
  {
    name: 'Viewer',
    all: false,
    menus: ['dashboard', 'reports'],
    isSystem: true,
  },
];

async function ensureDefaultRoles() {
  const count = await Role.countDocuments();
  if (count === 0) {
    for (const r of DEFAULT_ROLES) {
      await Role.create(r);
    }
  }
}

// ---------------- Roles ----------------
exports.getRoles = async (req, res, next) => {
  try {
    await ensureDefaultRoles();
    const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 });
    return apiResponse.ok(res, roles);
  } catch (err) {
    return next(err);
  }
};

exports.saveRole = async (req, res, next) => {
  try {
    const { name, menus, all } = req.body;
    if (!name || !name.trim()) {
      const err = new Error('Role name is required');
      err.statusCode = 400;
      throw err;
    }

    let role = await Role.findOne({ name: name.trim() });
    if (role) {
      if (role.name === 'Super Admin') {
        role.all = true;
      } else {
        role.menus = menus || [];
        role.all = !!all;
      }
      await role.save();
    } else {
      role = await Role.create({
        name: name.trim(),
        all: !!all,
        menus: menus || [],
        isSystem: false,
      });
    }

    return apiResponse.ok(res, role, 'Role saved successfully');
  } catch (err) {
    return next(err);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const { name } = req.params;
    if (name === 'Super Admin') {
      const err = new Error('Super Admin role cannot be deleted');
      err.statusCode = 400;
      throw err;
    }

    await Role.deleteOne({ name });
    return apiResponse.ok(res, { name }, 'Role deleted successfully');
  } catch (err) {
    return next(err);
  }
};

// ---------------- Users with RBAC ----------------
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name email role status employeeId designation customMenus')
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, users);
  } catch (err) {
    return next(err);
  }
};

exports.saveUser = async (req, res, next) => {
  try {
    const { id, name, email, password, role, status, customMenus } = req.body;

    if (id) {
      const user = await User.findById(id);
      if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
      }
      if (name) user.name = name;
      if (email) user.email = email;
      if (role) user.role = role;
      if (status) user.status = status.toLowerCase() === 'active' ? 'active' : 'inactive';
      if (customMenus !== undefined) user.customMenus = customMenus;
      if (password && password.trim()) user.password = password;

      await user.save();
      return apiResponse.ok(res, user.toSafeJSON(), 'User updated successfully');
    } else {
      if (!name || !email) {
        const err = new Error('Name and email are required');
        err.statusCode = 400;
        throw err;
      }

      const count = await User.countDocuments();
      const employeeId = `EMP${String(count + 1).padStart(3, '0')}`;
      const newUser = new User({
        employeeId,
        name,
        email,
        password: password || '123456',
        role: role || 'Viewer',
        status: status ? status.toLowerCase() : 'active',
        customMenus: customMenus || [],
      });

      await newUser.save();
      return apiResponse.created(res, newUser.toSafeJSON(), 'User created successfully');
    }
  } catch (err) {
    return next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    await user.deleteOne();
    return apiResponse.ok(res, { id }, 'User deleted successfully');
  } catch (err) {
    return next(err);
  }
};

