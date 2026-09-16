/**
 * Operational error that is safe to show to the client.
 * Throw one of the subclasses below instead of sending error responses manually.
 */
export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Permintaan tidak valid', details) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Silakan login terlebih dahulu', details) {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED', details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki akses ke sumber daya ini', details) {
    super(message, { statusCode: 403, code: 'FORBIDDEN', details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan', details) {
    super(message, { statusCode: 404, code: 'NOT_FOUND', details });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Data sudah ada', details) {
    super(message, { statusCode: 409, code: 'CONFLICT', details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Data yang dikirim tidak valid', details) {
    super(message, { statusCode: 422, code: 'VALIDATION_ERROR', details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Terlalu banyak permintaan, silakan coba lagi nanti', details) {
    super(message, { statusCode: 429, code: 'TOO_MANY_REQUESTS', details });
  }
}
