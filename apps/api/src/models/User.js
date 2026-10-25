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
    attendanceDeductionDays: { type: Number, default: 3, min: 1 }, // Odoo: Late Days per Deduction (e.g. 3 = 1 day salary deduction per 3 late check-ins in month)
    role: { type: String, default: 'employee' },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    joiningDate: { type: Date, default: Date.now },
    resignationDate: { type: Date },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    employeeType: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeType' },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Extended employee information from HR custom logic
    fatherName: { type: String, trim: true },
    fatherMobile: { type: String, trim: true },
    motherName: { type: String, trim: true },
    motherMobile: { type: String, trim: true },
    spouseMobile: { type: String, trim: true },
    childrenNames: [{ type: String, trim: true }],
    presentAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    education: [
      {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        passingYear: { type: String, trim: true },
        result: { type: String, trim: true },
      },
    ],
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    documents: [
      {
        documentType: {
          type: String,
          enum: ['NID', 'Passport', 'Certificate', 'TIN', 'Photo', 'Others'],
          default: 'Others',
        },
        documentName: { type: String, trim: true },
        documentUrl: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
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
