/**
 * User model — employees + admin/hr/manager accounts.
 * See build plan §5 `users` collection.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'hr', 'manager', 'employee'];
const USER_STATUSES = ['active', 'inactive'];

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
    salary: { type: Number, min: 0, default: 0 },
    role: { type: String, default: 'employee' },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    joiningDate: { type: Date, default: Date.now },
    resignationDate: { type: Date },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    employeeType: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeType' },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Password hashing hook
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
module.exports.USER_STATUSES = USER_STATUSES;
