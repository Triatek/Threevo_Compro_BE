/**
 * Standard success response: { success, message?, data, meta? }
 */
export function sendSuccess(res, data = null, { message, meta, statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
  });
}

export function sendCreated(res, data, options = {}) {
  return sendSuccess(res, data, { ...options, statusCode: 201 });
}

/**
 * Standard error response: { success: false, error: { code, message, details? } }
 */
export function sendError(res, { statusCode = 500, code, message, details }) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details?.length && { details }),
    },
  });
}
