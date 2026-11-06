const productService = require('../services/product.service');
const { ok, created, paginated, successResponse } = require('../utils/apiResponse');

exports.listProducts = async (req, res, next) => {
  try {
    const result = await productService.listProducts(req.query);
    return paginated(res, result.data, result.pagination, 'Products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return ok(res, product, 'Product retrieved successfully');
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return created(res, product, 'Product created successfully');
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return ok(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await productService.deleteProduct(req.params.id);
    return ok(res, product, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.list = exports.listProducts;
exports.getById = exports.getProductById;
exports.create = exports.createProduct;
exports.update = exports.updateProduct;
exports.delete = exports.deleteProduct;

