const quotationService = require('../services/quotation.service');
const apiResponse = require('../utils/apiResponse');

exports.create = async (req, res, next) => {
  try {
    const quotation = await quotationService.createQuotation(req.body, req.user?.id);
    return apiResponse.created(res, quotation, 'Quotation created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const quotations = await quotationService.listQuotations(req.query);
    return apiResponse.ok(res, quotations, 'Quotations retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const quotation = await quotationService.getQuotationById(req.params.id);
    return apiResponse.ok(res, quotation, 'Quotation retrieved');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const quotation = await quotationService.updateQuotation(req.params.id, req.body);
    return apiResponse.ok(res, quotation, 'Quotation updated');
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await quotationService.deleteQuotation(req.params.id);
    return apiResponse.ok(res, result, 'Quotation deleted');
  } catch (err) {
    return next(err);
  }
};

exports.convertToBill = async (req, res, next) => {
  try {
    const result = await quotationService.convertToBill(req.params.id);
    return apiResponse.ok(res, result, 'Quotation successfully converted to Bill');
  } catch (err) {
    return next(err);
  }
};
