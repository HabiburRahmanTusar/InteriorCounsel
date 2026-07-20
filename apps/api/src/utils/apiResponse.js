/**
 * Uniform API response helpers.
 */
function ok(res, data, message = 'Success') {
  return res.status(200).json({ success: true, message, data });
}

function created(res, data, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

function noContent(res) {
  return res.status(204).send();
}

function badRequest(res, message = 'Bad request') {
  return res.status(400).json({ success: false, message });
}

function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({ success: false, message });
}

function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({ success: false, message });
}

function notFound(res, message = 'Resource not found') {
  return res.status(404).json({ success: false, message });
}

function notImplemented(res, feature) {
  return res.status(501).json({
    success: false,
    message: `${feature} not implemented yet — scaffolding only`,
  });
}

function paginated(res, { items, total, page, limit }) {
  return res.status(200).json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  });
}

module.exports = {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  notImplemented,
  paginated,
};
