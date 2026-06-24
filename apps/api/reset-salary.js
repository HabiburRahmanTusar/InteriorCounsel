const mongoose = require('mongoose');
const automation = require('./src/services/automation.service');

mongoose.connect('mongodb://localhost:27017/workforce_management').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('salaryrecords').updateMany({}, { $set: { status: 'Draft' } });
  await automation.evaluateAllActive();
  console.log('Done resetting & recalculating!');
  process.exit(0);
}).catch(console.error);
