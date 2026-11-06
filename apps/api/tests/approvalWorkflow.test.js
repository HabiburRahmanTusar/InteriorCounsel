const mongoose = require('mongoose');
const User = require('../src/models/User');
const LeaveRequest = require('../src/models/LeaveRequest');
const LeaveBalance = require('../src/models/LeaveBalance');
const LeaveType = require('../src/models/LeaveType');
const ApprovalWorkflow = require('../src/models/ApprovalWorkflow');
const SystemSetting = require('../src/models/SystemSetting');
const Holiday = require('../src/models/Holiday');

const leaveCtrl = require('../src/controllers/leave.controller');

const TEST_DB_URI = 'mongodb://localhost:27017/workforce_management_test';

// Mock response object
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Multi-Stage Approval Workflow Engine', () => {
  let employeeUser, managerUser, hrUser;
  let annualLeaveType;
  let leaveBalanceDoc;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      LeaveRequest.deleteMany({}),
      LeaveBalance.deleteMany({}),
      LeaveType.deleteMany({}),
      ApprovalWorkflow.deleteMany({}),
      SystemSetting.deleteMany({}),
      Holiday.deleteMany({}),
    ]);

    // Seed Leave Type
    annualLeaveType = await LeaveType.create({
      name: 'Annual',
      code: 'annual',
      isPaid: true,
      deductsFromBalance: true,
    });

    // Seed system settings
    await SystemSetting.create({
      key: 'work-calendar',
      value: { weekends: ['Friday', 'Saturday'] },
    });

    // Seed manager
    managerUser = await User.create({
      employeeId: 'MGR00001',
      name: 'Test Manager',
      email: 'manager@company.com',
      password: 'password123',
      role: 'manager',
      status: 'active',
    });

    // Seed employee reporting to manager
    employeeUser = await User.create({
      employeeId: 'EMP00002',
      name: 'Test Employee',
      email: 'employee@company.com',
      password: 'password123',
      role: 'employee',
      status: 'active',
      reportsTo: managerUser._id,
    });

    // Seed HR user
    hrUser = await User.create({
      employeeId: 'HR00001',
      name: 'Test HR',
      email: 'hr@company.com',
      password: 'password123',
      role: 'hr',
      status: 'active',
    });

    // Seed Leave Balance for employee
    leaveBalanceDoc = await LeaveBalance.create({
      employeeId: employeeUser._id,
      year: 2026,
      leaveType: annualLeaveType._id,
      allocated: 15,
      used: 0,
    });
  });

  test('should append default single-stage HR workflow if no config matches', async () => {
    const req = {
      user: { id: employeeUser._id, role: 'employee' },
      body: {
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        leaveType: 'Annual',
        reason: 'Holiday plans',
        halfDay: false,
      },
    };
    const res = mockRes();

    await leaveCtrl.submitMyRequest(req, res, (err) => {
      throw err;
    });

    expect(res.status).toHaveBeenCalledWith(201);
    const data = res.json.mock.calls[0][0].data;
    expect(data.approvalStages).toBeDefined();
    expect(data.approvalStages.length).toBe(1);
    expect(data.approvalStages[0].role).toBe('hr');
    expect(data.approvalStages[0].status).toBe('Pending');
  });

  test('should fail submission if manager stage is required but direct manager reportsTo is missing', async () => {
    // Remove employee manager
    employeeUser.reportsTo = undefined;
    await employeeUser.save();

    // Create a workflow setting: Employee applicants require Manager -> HR approval
    await ApprovalWorkflow.create({
      applicantRole: 'employee',
      stages: [
        { sequence: 1, role: 'manager', label: 'Manager Sign-off' },
        { sequence: 2, role: 'hr', label: 'HR Sign-off' },
      ],
    });

    const req = {
      user: { id: employeeUser._id, role: 'employee' },
      body: {
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        leaveType: 'Annual',
        reason: 'Holiday plans',
        halfDay: false,
      },
    };
    const res = mockRes();

    await leaveCtrl.submitMyRequest(req, res, (err) => {
      throw err;
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toContain('Direct manager is required');
  });

  test('should sequence multi-stage approvals: Manager -> HR -> Fully Approved', async () => {
    // Create workflow setting
    await ApprovalWorkflow.create({
      applicantRole: 'employee',
      stages: [
        { sequence: 1, role: 'manager', label: 'Manager Sign-off' },
        { sequence: 2, role: 'hr', label: 'HR Sign-off' },
      ],
    });

    // 1. Submit Leave Request (June 1st to June 2nd = 2 working days)
    const submitReq = {
      user: { id: employeeUser._id, role: 'employee' },
      body: {
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        leaveType: 'Annual',
        reason: 'Holiday',
        halfDay: false,
      },
    };
    const submitRes = mockRes();
    await leaveCtrl.submitMyRequest(submitReq, submitRes, (err) => {
      throw err;
    });
    const leaveRequestObj = submitRes.json.mock.calls[0][0].data;
    const leaveRequestId = leaveRequestObj._id;

    // Verify initial state
    expect(leaveRequestObj.status).toBe('Pending');
    expect(leaveRequestObj.approvalStages.length).toBe(2);
    expect(leaveRequestObj.approvalStages[0].status).toBe('Pending'); // manager stage
    expect(leaveRequestObj.approvalStages[1].status).toBe('Pending'); // hr stage

    // 2. HR attempts to approve first stage (should fail as Manager is active pending stage)
    const hrAttemptReq = {
      params: { id: leaveRequestId },
      user: { id: hrUser._id, role: 'hr' },
      body: { status: 'Approved', approverRemarks: 'HR quick sign-off' },
    };
    const hrAttemptRes = mockRes();
    await leaveCtrl.updateRequestStatus(hrAttemptReq, hrAttemptRes, (err) => {
      throw err;
    });
    expect(hrAttemptRes.status).toHaveBeenCalledWith(403);
    expect(hrAttemptRes.json.mock.calls[0][0].message).toContain('not authorized to approve');

    // 3. Designated manager approves first stage
    const managerReq = {
      params: { id: leaveRequestId },
      user: { id: managerUser._id, role: 'manager' },
      body: { status: 'Approved', approverRemarks: 'Approved by manager' },
    };
    const managerRes = mockRes();
    await leaveCtrl.updateRequestStatus(managerReq, managerRes, (err) => {
      throw err;
    });
    expect(managerRes.status).toHaveBeenCalledWith(200);
    const midRequest = managerRes.json.mock.calls[0][0].data;

    // Check intermediate state (request is still Pending, no balance is deducted yet)
    expect(midRequest.status).toBe('Pending');
    expect(midRequest.approvalStages[0].status).toBe('Approved');
    expect(midRequest.approvalStages[1].status).toBe('Pending');

    let balance = await LeaveBalance.findOne({ employeeId: employeeUser._id });
    expect(balance.used).toBe(0); // Still 0

    // 4. HR approves second (final) stage
    const hrReq = {
      params: { id: leaveRequestId },
      user: { id: hrUser._id, role: 'hr' },
      body: { status: 'Approved', approverRemarks: 'Final approval from HR' },
    };
    const hrRes = mockRes();
    await leaveCtrl.updateRequestStatus(hrReq, hrRes, (err) => {
      throw err;
    });
    expect(hrRes.status).toHaveBeenCalledWith(200);
    const finalRequest = hrRes.json.mock.calls[0][0].data;

    // Check final state (overall Approved, used days incremented)
    expect(finalRequest.status).toBe('Approved');
    expect(finalRequest.approvalStages[0].status).toBe('Approved');
    expect(finalRequest.approvalStages[1].status).toBe('Approved');

    balance = await LeaveBalance.findOne({ employeeId: employeeUser._id });
    expect(balance.used).toBe(2); // 2 days deducted
  });

  test('should terminate approval sequence and mark request Rejected immediately upon any stage rejection', async () => {
    await ApprovalWorkflow.create({
      applicantRole: 'employee',
      stages: [
        { sequence: 1, role: 'manager', label: 'Manager Sign-off' },
        { sequence: 2, role: 'hr', label: 'HR Sign-off' },
      ],
    });

    const submitReq = {
      user: { id: employeeUser._id, role: 'employee' },
      body: {
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        leaveType: 'Annual',
        reason: 'Holiday',
        halfDay: false,
      },
    };
    const submitRes = mockRes();
    await leaveCtrl.submitMyRequest(submitReq, submitRes, (err) => {
      throw err;
    });
    const leaveRequestId = submitRes.json.mock.calls[0][0].data._id;

    // Manager rejects the first stage
    const managerRejectReq = {
      params: { id: leaveRequestId },
      user: { id: managerUser._id, role: 'manager' },
      body: { status: 'Rejected', approverRemarks: 'Rejected due to project release' },
    };
    const managerRejectRes = mockRes();
    await leaveCtrl.updateRequestStatus(managerRejectReq, managerRejectRes, (err) => {
      throw err;
    });
    expect(managerRejectRes.status).toHaveBeenCalledWith(200);
    const rejectedRequest = managerRejectRes.json.mock.calls[0][0].data;

    // Check rejection state
    expect(rejectedRequest.status).toBe('Rejected');
    expect(rejectedRequest.approvalStages[0].status).toBe('Rejected');
    expect(rejectedRequest.approvalStages[1].status).toBe('Pending'); // Terminated, next stage remains Pending

    const balance = await LeaveBalance.findOne({ employeeId: employeeUser._id });
    expect(balance.used).toBe(0); // No deduction
  });
});
