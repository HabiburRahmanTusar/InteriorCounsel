const Product = require('../models/Product');

exports.listProducts = async ({ search, category, productType, page = 1, limit = 100 }) => {
  const query = {};
  if (category && category !== 'All') query.category = category;
  if (productType) query.productType = productType;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { internalRef: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).sort({ name: 1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  return {
    data: products,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

exports.getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};

exports.createProduct = async (data) => {
  const product = new Product(data);
  return product.save();
};

exports.updateProduct = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};

exports.deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};
