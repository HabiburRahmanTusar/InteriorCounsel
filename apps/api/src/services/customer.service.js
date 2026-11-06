const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const CashIn = require('../models/CashIn');

exports.listCustomers = async ({ search, status, page = 1, limit = 20 }) => {
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { customerCode: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { siteAddress: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(query),
  ]);

  return {
    data: customers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getCustomerById = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  // Get project bills and recent payments
  const [bills, payments] = await Promise.all([
    Bill.find({ customerId: id }).sort({ date: -1 }),
    CashIn.find({ customerId: id }).sort({ date: -1 }).limit(10),
  ]);

  return {
    customer,
    bills,
    recentPayments: payments,
  };
};

exports.createCustomer = async (data) => {
  const payload = { ...data };
  if (!payload.phone || !payload.phone.trim()) {
    payload.phone = '01XXXXXXXXX';
  }
  if (payload.company && !payload.companyName) {
    payload.companyName = payload.company;
  }
  const customer = new Customer(payload);
  return customer.save();
};

exports.updateCustomer = async (id, data) => {
  const customer = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  return customer;
};

exports.deleteCustomer = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  const activeBills = await Bill.countDocuments({ customerId: id });
  if (activeBills > 0) {
    const error = new Error('Cannot delete customer with existing project bills. Deactivate instead.');
    error.statusCode = 400;
    throw error;
  }

  await customer.deleteOne();
  return { message: 'Customer deleted successfully' };
};
