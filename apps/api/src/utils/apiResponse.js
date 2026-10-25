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

function paginated(res, dataOrOptions, maybePagination, message = 'Success') {
  if (Array.isArray(dataOrOptions)) {
    const p = maybePagination || {};
    const page = Number(p.page) || 1;
    const limit = Number(p.limit) || dataOrOptions.length || 20;
    const total = p.total !== undefined ? Number(p.total) : dataOrOptions.length;
    const totalPages = Number(p.totalPages) || Math.ceil(total / limit) || 1;
    return res.status(200).json({
      success: true,
      message,
      data: dataOrOptions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  const opts = dataOrOptions || {};
  const items = opts.items || opts.data || [];
  const page = Number(opts.page) || 1;
  const limit = Number(opts.limit) || items.length || 20;
  const total = opts.total !== undefined ? Number(opts.total) : items.length;
  const totalPages = Number(opts.totalPages) || Math.ceil(total / limit) || 0;

  return res.status(200).json({
    success: true,
    message: typeof maybePagination === 'string' ? maybePagination : message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

function successResponse(res, data, message = 'Success', statusCode = 200, pagination) {
  if (pagination) {
    return paginated(res, data, pagination, message);
  }
  return res.status(statusCode).json({ success: true, message, data });
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
  successResponse,
};

