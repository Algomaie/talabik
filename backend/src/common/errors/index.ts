export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: any[];

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational = true,
    details?: any[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: any[]) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', errorCode = 'AUTHENTICATION_REQUIRED') {
    super(message, 401, errorCode);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', errorCode = 'INSUFFICIENT_PERMISSIONS') {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, errorCode?: string) {
    super(
      `${resource} not found`,
      404,
      errorCode ?? `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, errorCode = 'BUSINESS_RULE_VIOLATION') {
    super(message, 422, errorCode);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred') {
    // Internal errors are NOT operational — they indicate a bug or infrastructure failure
    super(message, 500, 'DATABASE_ERROR', false);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}
