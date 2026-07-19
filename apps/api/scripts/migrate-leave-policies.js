require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../src/config/db');

// ... other imports
const LeaveType = require('../src/models/LeaveType');
const EmployeeType = require('../src/models/EmployeeType');
const LeavePolicy = require('../src/models/LeavePolicy');
const LeaveBalance = require('../src/models/LeaveBalance');
const LeaveRequest = require('../src/models/LeaveRequest');
const User = require('../src/models/User');
const { dayjs } = require('../src/utils/time');

async function migrate() {
  await connectDatabase(process.env.MONGODB_URI || 'mongodb://localhost:27017/workforce_management');
  console.log('Connected to DB');

  try {
    // 1. Create standard Leave Types
    console.log('Migrating Leave Types...');
    const types = [
      { name: 'Annual Leave', code: 'annual', isPaid: true, deductsFromBalance: true },
      { name: 'Sick Leave', code: 'sick', isPaid: true, deductsFromBalance: true },
      { name: 'Casual Leave', code: 'casual', isPaid: true, deductsFromBalance: true },
      { name: 'Unpaid Leave', code: 'unpaid', isPaid: false, deductsFromBalance: false },
    ];

    const typeDocs = {};
    for (const t of types) {
      let doc = await LeaveType.findOne({ code: t.code });
      if (!doc) {
        doc = await LeaveType.create(t);
      }
      typeDocs[t.code] = doc;
    }
    console.log('Leave Types seeded.');

    // 2. Create default Employee Type
    console.log('Migrating Employee Types...');
    let fullTime = await EmployeeType.findOne({ code: 'full_time' });
    if (!fullTime) {
      fullTime = await EmployeeType.create({ code: 'full_time', label: 'Full-Time' });
    }
    console.log('Employee Types seeded.');

    // 3. Update all Users to have the default employeeType
    console.log('Assigning default employee type to users...');
    await User.updateMany({ employeeType: { $exists: false } }, { $set: { employeeType: fullTime._id } });

    // 4. Create default Leave Policy
    const year = dayjs().year();
    console.log(`Migrating Leave Policy for year ${year}...`);
    let policy = await LeavePolicy.findOne({ name: 'Standard Leave Policy' });
    if (!policy) {
      policy = await LeavePolicy.create({
        name: 'Standard Leave Policy',
        description: 'Default policy for all full-time employees',
        employeeTypes: [fullTime._id],
        year,
        status: 'Active',
        isDefault: true,
        leaveAllocations: [
          { leaveType: typeDocs['annual']._id, days: 15 },
          { leaveType: typeDocs['sick']._id, days: 10 },
          { leaveType: typeDocs['casual']._id, days: 10 },
        ],
      });
    }
    console.log('Default Leave Policy created.');

    // 5. Migrate LeaveBalance documents
    console.log('Dropping old LeaveBalance index...');
    try {
      await LeaveBalance.collection.dropIndex('employeeId_1_year_1');
    } catch (e) {
      console.log('Old index might not exist or already dropped:', e.message);
    }
    
    // Old schema: { allocated: { Annual: X, ... }, used: { Annual: Y, ... } }
    console.log('Migrating Leave Balances...');
    const oldBalances = await LeaveBalance.find({ 'allocated.Annual': { $exists: true } }).lean(); // Use lean to get raw objects
    
    let balancesMigrated = 0;
    for (const oldBalance of oldBalances) {
      const year = oldBalance.year;
      const empId = oldBalance.employeeId;
      
      const newDocs = [];
      const keys = ['Annual', 'Sick', 'Casual'];
      for (const key of keys) {
        const allocated = oldBalance.allocated[key];
        const used = oldBalance.used ? oldBalance.used[key] || 0 : 0;
        
        if (allocated !== undefined) {
          const typeDoc = typeDocs[key.toLowerCase()];
          newDocs.push({
            employeeId: empId,
            year: year,
            leaveType: typeDoc._id,
            allocated: allocated,
            used: used,
            policy: policy._id,
            source: 'PolicyAssigned'
          });
        }
      }

      // Delete the old consolidated document and insert new separate ones
      if (newDocs.length > 0) {
        await LeaveBalance.deleteOne({ _id: oldBalance._id });
        await LeaveBalance.insertMany(newDocs);
        balancesMigrated++;
      }
    }
    console.log(`Migrated ${balancesMigrated} LeaveBalance grouped documents to per-type documents.`);

    // 6. Migrate LeaveRequest
    console.log('Migrating Leave Requests...');
    const requests = await LeaveRequest.find({ leaveType: { $type: 'string' } });
    let requestsMigrated = 0;
    for (const req of requests) {
      if (typeof req.leaveType === 'string') {
        const code = req.leaveType.toLowerCase();
        const typeDoc = typeDocs[code];
        if (typeDoc) {
          req.leaveType = typeDoc._id;
          await req.save();
          requestsMigrated++;
        }
      }
    }
    console.log(`Migrated ${requestsMigrated} LeaveRequests.`);

    console.log('Migration completed successfully.');
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await disconnectDatabase();
    process.exit(1);
  }
}

migrate();
