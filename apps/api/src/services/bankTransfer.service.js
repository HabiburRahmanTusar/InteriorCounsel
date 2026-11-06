const BankTransfer = require('../models/BankTransfer');

exports.listTransfers = async ({ search, status, page = 1, limit = 50 }) => {
  const query = {};
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { transferNumber: { $regex: search, $options: 'i' } },
      { memo: { $regex: search, $options: 'i' } },
      { transferFrom: { $regex: search, $options: 'i' } },
      { transferTo: { $regex: search, $options: 'i' } },
      { chequeNo: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [transfers, total] = await Promise.all([
    BankTransfer.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    BankTransfer.countDocuments(query),
  ]);

  return {
    data: transfers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getTransferById = async (id) => {
  const transfer = await BankTransfer.findById(id).populate('transferredBy', 'name email');
  if (!transfer) {
    const error = new Error('Bank transfer record not found');
    error.statusCode = 404;
    throw error;
  }
  return transfer;
};

exports.createTransfer = async (data, userId) => {
  if (data.transferFrom === data.transferTo) {
    const error = new Error('Transfer From and Transfer To must be different accounts');
    error.statusCode = 400;
    throw error;
  }
  const transfer = new BankTransfer({
    ...data,
    transferredBy: userId || data.transferredBy,
  });
  return transfer.save();
};

exports.deleteTransfer = async (id) => {
  const transfer = await BankTransfer.findByIdAndDelete(id);
  if (!transfer) {
    const error = new Error('Bank transfer record not found');
    error.statusCode = 404;
    throw error;
  }
  return transfer;
};
