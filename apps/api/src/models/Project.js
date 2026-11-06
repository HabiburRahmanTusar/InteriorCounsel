const mongoose = require('mongoose');

const PROJ_TYPES = [
  'Residential',
  'Commercial',
  'Office',
  'Restaurant',
  'Showroom',
  'Hotel',
  'Retail',
  'Corporate',
];

const PROJ_STATUS = [
  'Planning',
  'Quotation',
  'Approved',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
];

const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    customer: { type: String, required: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    type: { type: String, enum: PROJ_TYPES, default: 'Residential' },
    manager: { type: String, trim: true },
    designer: { type: String, trim: true },
    loc: { type: String, default: 'Mohakhali', trim: true },
    budget: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    received: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: PROJ_STATUS, default: 'Planning' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    start: { type: Date },
    expected: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

projectSchema.pre('validate', async function (next) {
  if (!this.projectId) {
    const count = await mongoose.model('Project').countDocuments();
    this.projectId = `IC-P-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
module.exports.PROJ_TYPES = PROJ_TYPES;
module.exports.PROJ_STATUS = PROJ_STATUS;

