const Quotation = require('../models/Quotation');
const Bill = require('../models/Bill');

exports.createQuotation = async (data, salespersonId) => {
  const quotation = new Quotation({
    ...data,
    salespersonId: salespersonId || data.salespersonId,
  });
  await quotation.save();
  return quotation.populate('customerId salespersonId');
};

exports.listQuotations = async (filter = {}) => {
  const query = {};
  if (filter.customerId) query.customerId = filter.customerId;
  if (filter.status) query.status = filter.status;
  if (filter.search) {
    query.$or = [
      { quotationNumber: { $regex: filter.search, $options: 'i' } },
      { projectName: { $regex: filter.search, $options: 'i' } },
      { subject: { $regex: filter.search, $options: 'i' } },
    ];
  }

  const quotations = await Quotation.find(query)
    .populate('customerId', 'name company email phone address')
    .populate('salespersonId', 'name email')
    .sort({ createdAt: -1 });

  return quotations;
};

exports.getQuotationById = async (id) => {
  const quotation = await Quotation.findById(id)
    .populate('customerId', 'name company email phone address')
    .populate('salespersonId', 'name email');
  if (!quotation) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }
  return quotation;
};

exports.updateQuotation = async (id, data) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }
  Object.assign(quotation, data);
  await quotation.save();
  return quotation.populate('customerId salespersonId');
};

exports.deleteQuotation = async (id) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }
  await quotation.deleteOne();
  return { id };
};

// Convert Quotation directly into a Confirmed Project Sales Bill
exports.convertToBill = async (id) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }

  if (quotation.status === 'Converted to Bill' && quotation.convertedBillId) {
    const err = new Error('Quotation has already been converted to a Bill');
    err.statusCode = 400;
    throw err;
  }

  // Generate Unique Bill Number
  const count = await Bill.countDocuments();
  const year = new Date().getFullYear();
  const billNumber = `BL-${year}-${String(count + 1).padStart(4, '0')}`;

  const bill = new Bill({
    billNumber,
    date: new Date(),
    customerId: quotation.customerId,
    salespersonId: quotation.salespersonId,
    projectName: quotation.projectName,
    siteLocation: quotation.subject || '',
    items: quotation.items.map((it) => ({
      description: it.description,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
    })),
    subtotal: quotation.subtotal,
    discountType: quotation.discountType,
    discountValue: quotation.discountValue,
    discountAmount: quotation.discountAmount,
    vatPercent: quotation.vatPercent,
    vatAmount: quotation.vatAmount,
    totalAmount: quotation.totalAmount,
    customerDue: quotation.totalAmount,
    status: 'Confirmed',
    notes: `Converted from Quotation ${quotation.quotationNumber}`,
  });

  await bill.save();

  quotation.status = 'Converted to Bill';
  quotation.convertedBillId = bill._id;
  await quotation.save();

  return { quotation, bill };
};
