// file: src/core/errors.ts
/**
 * ShipFlow Error Hierarchy
 * All errors extend ShipFlowError for consistent catch/handle patterns
 */

export class ShipFlowError extends Error {
  readonly carrier?: string;
  readonly code?: string;
  readonly raw?: unknown;

  constructor(
    message: string,
    options?: { carrier?: string; code?: string; raw?: unknown; cause?: Error }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ShipFlowError';
    this.carrier = options?.carrier;
    this.code = options?.code;
    this.raw = options?.raw;
  }
}

/** Network-level errors (timeout, DNS, connection refused) */
export class NetworkError extends ShipFlowError {
  constructor(message: string, options?: { carrier?: string; cause?: Error }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/** API returned an error response (4xx, 5xx, or logical error like Aramex HasErrors: true) */
export class APIError extends ShipFlowError {
  readonly statusCode?: number;
  readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    options?: {
      carrier?: string;
      code?: string;
      statusCode?: number;
      errors?: Record<string, string[]>;
      raw?: unknown;
    }
  ) {
    super(message, options);
    this.name = 'APIError';
    this.statusCode = options?.statusCode;
    this.errors = options?.errors;
  }
}

/**
 * Carrier rate-limited the request (HTTP 429, 503, or a carrier-specific throttle
 * such as Aramex's "fake 200" envelope). Extends APIError so existing
 * `instanceof APIError` handling keeps working, while `retryAfterMs` lets callers
 * (and the retry helper) honor or reschedule against the carrier's wait window.
 */
export class RateLimitError extends APIError {
  /** Suggested wait before retrying, in ms (parsed from Retry-After when present). */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options?: {
      carrier?: string;
      code?: string;
      statusCode?: number;
      errors?: Record<string, string[]>;
      retryAfterMs?: number;
      raw?: unknown;
    }
  ) {
    super(message, options);
    this.name = 'RateLimitError';
    this.retryAfterMs = options?.retryAfterMs;
  }
}

/** Validation failed before sending request (Valibot parse failure) */
export class ValidationError extends ShipFlowError {
  readonly field?: string;
  readonly issues?: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    options?: {
      field?: string;
      issues?: Array<{ path: string; message: string }>;
      raw?: unknown;
    }
  ) {
    super(message, options);
    this.name = 'ValidationError';
    this.field = options?.field;
    this.issues = options?.issues;
  }
}

/** Invalid or missing credentials */
export class AuthenticationError extends ShipFlowError {
  constructor(message: string, options?: { carrier?: string; raw?: unknown }) {
    super(message, options);
    this.name = 'AuthenticationError';
  }
}

/** Webhook signature/auth verification failed */
export class WebhookVerificationError extends ShipFlowError {
  constructor(message: string, options?: { carrier?: string }) {
    super(message, options);
    this.name = 'WebhookVerificationError';
  }
}

/** Carrier does not support this operation */
export class UnsupportedOperationError extends ShipFlowError {
  readonly operation: string;

  constructor(carrier: string, operation: string) {
    super(`${carrier} does not support operation: ${operation}`, { carrier });
    this.name = 'UnsupportedOperationError';
    this.operation = operation;
  }
}
