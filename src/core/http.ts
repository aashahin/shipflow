// file: src/core/http.ts
/**
 * HTTP client for ShipFlow
 * - Uses the runtime's global `fetch` (Node 18+, Deno, Bun, edge/workers)
 * - Handles "Fake 200 OK" responses (Aramex pattern)
 * - Automatic JSON parsing with error extraction
 * - Native retry with jittered exponential backoff (GET only by default)
 * - Honors Retry-After on 429/503 within an inline cap (see ./retry)
 *
 * SAFETY: Mutating requests (POST/PUT/DELETE/PATCH) are NOT retried by default
 * because retrying e.g. createShipment after a 500 could create duplicate
 * shipments on the carrier side. Use `retry: true` in RequestOptions to
 * explicitly opt-in for safe POST endpoints (e.g. bulk tracking).
 */

import {
  APIError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  ShipFlowError,
} from "./errors";
import { parseRetryAfter, withRetry } from "./retry";

export interface RetryConfig {
  /** Max number of retries (default: 2) */
  retries?: number;
  /** HTTP status codes to retry on (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Base delay (ms) for exponential backoff (default: 500) */
  baseMs?: number;
  /** Ceiling (ms) for the exponential-backoff window (default: 20_000) */
  maxMs?: number;
  /**
   * Largest Retry-After delay (ms) we sleep on inline (default: 15_000).
   * A 429/503 asking us to wait longer than this is surfaced as a
   * `RateLimitError` (carrying `retryAfterMs`) instead of being retried inline,
   * so a durable queue/workflow can reschedule it.
   */
  inlineCapMs?: number;
}

export interface HttpClientConfig {
  baseUrl: string;
  carrier: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry?: RetryConfig | false;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /**
   * Override default retry behavior for this request.
   * - `true`  → allow retries (use for safe/idempotent POST endpoints like tracking)
   * - `false` → never retry this request
   * - omitted → auto (GET retries, mutating methods do not)
   */
  retry?: boolean;
  /**
   * Caller cancellation. Aborts both the in-flight request and any
   * inter-attempt retry sleep, so one signal tears down the whole operation.
   */
  signal?: AbortSignal;
  /** Custom error extractor for carriers with non-standard error formats */
  errorExtractor?: (json: unknown) => {
    hasError: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    /** Carrier signalled throttling inside an otherwise-OK response. */
    rateLimited?: boolean;
    /** Suggested wait (ms) if the carrier provided one in-band. */
    retryAfterMs?: number;
  };
}

export class HttpClient {
  private config: HttpClientConfig;
  private retryConfig: {
    retries: number;
    retryableStatuses: number[];
    baseMs: number;
    maxMs: number;
    inlineCapMs: number;
  };

  private static readonly DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];
  private static readonly SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

  constructor(config: HttpClientConfig) {
    this.config = {
      ...config,
      // Guarantee a numeric timeout even if `timeout: undefined` is passed
      // explicitly — AbortSignal.timeout() requires a real number.
      timeout: config.timeout ?? 30_000,
    };
    const retry =
      config.retry === false ? { retries: 0 } : (config.retry ?? {});
    this.retryConfig = {
      retries: retry.retries ?? 2,
      retryableStatuses:
        retry.retryableStatuses ?? HttpClient.DEFAULT_RETRYABLE,
      baseMs: retry.baseMs ?? 500,
      maxMs: retry.maxMs ?? 20_000,
      inlineCapMs: retry.inlineCapMs ?? 15_000,
    };
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const shouldRetry = this.shouldRetry(method, options.retry);

    if (!shouldRetry) {
      return this.executeRequest<T>(endpoint, options);
    }

    return withRetry(() => this.executeRequest<T>(endpoint, options), {
      retries: this.retryConfig.retries,
      baseMs: this.retryConfig.baseMs,
      maxMs: this.retryConfig.maxMs,
      inlineCapMs: this.retryConfig.inlineCapMs,
      shouldRetry: (error) => this.isRetryable(error),
      retryAfterMs: (error) =>
        error instanceof RateLimitError ? error.retryAfterMs : undefined,
      signal: options.signal,
    });
  }

  /**
   * Determine if a request should be retried.
   * - Explicit `retry` option on the request takes priority
   * - Otherwise: only safe/idempotent methods (GET) are retried
   */
  private shouldRetry(method: string, requestRetry?: boolean): boolean {
    if (this.retryConfig.retries === 0) return false;
    if (requestRetry !== undefined) return requestRetry;
    return HttpClient.SAFE_METHODS.has(method);
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof NetworkError) return true;
    // A rate-limit is always retryable in principle (the retry helper decides
    // whether the Retry-After window is short enough to honor inline). This also
    // covers carrier "fake 200" throttles, whose statusCode (200) isn't listed.
    if (error instanceof RateLimitError) return true;
    if (error instanceof APIError && error.statusCode != null) {
      return this.retryConfig.retryableStatuses.includes(error.statusCode);
    }
    return false;
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      params,
      errorExtractor,
      signal: callerSignal,
    } = options;

    // Build URL with query params
    let url = `${this.config.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Native, leak-free per-request timeout. `AbortSignal.timeout` schedules an
    // unref'd timer that's GC'd with the signal — no manual setTimeout/clearTimeout
    // to leak. Combine with the caller's signal so either source cancels the fetch.
    const timeoutSignal = AbortSignal.timeout(this.config.timeout!);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.config.headers,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      // Parse JSON response
      let json: unknown;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        json = await response.json();
      } else {
        const text = await response.text();
        // Try parsing as JSON anyway (some APIs don't set proper content-type).
        // If it isn't JSON, keep the raw string so endpoints documented to
        // return a bare string (e.g. SMSA cancel/invoice) resolve correctly.
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
      }

      // Handle HTTP errors
      if (!response.ok) {
        // Capture the carrier's rate-limit window on the canonical statuses so
        // the retry helper can honor (or reschedule against) it.
        const retryAfterMs =
          response.status === 429 || response.status === 503
            ? parseRetryAfter(response.headers.get("retry-after"))
            : undefined;
        this.handleHttpError(response.status, json, retryAfterMs);
      }

      // Check for "Fake 200 OK" pattern (Aramex, some Aymakan endpoints)
      if (errorExtractor) {
        const extracted = errorExtractor(json);
        if (extracted.hasError) {
          if (extracted.rateLimited) {
            throw new RateLimitError(
              extracted.message ?? "Carrier rate limit",
              {
                carrier: this.config.carrier,
                statusCode: 200,
                errors: extracted.errors,
                retryAfterMs: extracted.retryAfterMs,
                raw: json,
              },
            );
          }
          throw new APIError(extracted.message ?? "API returned an error", {
            carrier: this.config.carrier,
            statusCode: 200,
            errors: extracted.errors,
            raw: json,
          });
        }
      }

      return json as T;
    } catch (error) {
      if (error instanceof ShipFlowError) {
        throw error;
      }

      // Caller explicitly cancelled → surface the abort as-is (not a retryable
      // network failure). Distinguishes from the internal timeout below.
      if (callerSignal?.aborted) {
        throw error;
      }

      // `AbortSignal.timeout` aborts with a "TimeoutError"; legacy/mocked aborts
      // use "AbortError". Either means the per-request deadline elapsed.
      if (
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new NetworkError(
          `Request timeout after ${this.config.timeout}ms`,
          {
            carrier: this.config.carrier,
          },
        );
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new NetworkError(`Network error: ${error.message}`, {
          carrier: this.config.carrier,
          cause: error,
        });
      }

      throw new NetworkError(`Unexpected error: ${(error as Error).message}`, {
        carrier: this.config.carrier,
        cause: error as Error,
      });
    }
  }

  private handleHttpError(
    status: number,
    json: unknown,
    retryAfterMs?: number,
  ): never {
    const message = this.extractErrorMessage(json) ?? `HTTP ${status}`;

    if (status === 401) {
      throw new AuthenticationError(message, {
        carrier: this.config.carrier,
        raw: json,
      });
    }

    if (status === 429 || status === 503) {
      throw new RateLimitError(message, {
        carrier: this.config.carrier,
        statusCode: status,
        errors: this.extractValidationErrors(json),
        retryAfterMs,
        raw: json,
      });
    }

    throw new APIError(message, {
      carrier: this.config.carrier,
      statusCode: status,
      errors: this.extractValidationErrors(json),
      raw: json,
    });
  }

  private extractErrorMessage(json: unknown): string | undefined {
    // Some carriers return a bare plain-text error body.
    if (typeof json === "string") return json.trim() || undefined;
    if (!json || typeof json !== "object") return undefined;
    const obj = json as Record<string, unknown>;

    // Common patterns across carriers
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.response === "string") return obj.response;
    if (obj.Message && typeof obj.Message === "string") return obj.Message; // Aramex pattern

    return undefined;
  }

  private extractValidationErrors(
    json: unknown,
  ): Record<string, string[]> | undefined {
    if (!json || typeof json !== "object") return undefined;
    const obj = json as Record<string, unknown>;

    // Aymakan pattern: { errors: { field: ["message"] } }
    if (obj.errors && typeof obj.errors === "object") {
      return obj.errors as Record<string, string[]>;
    }

    return undefined;
  }

  /** Create GET request */
  get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  /** Create POST request */
  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request(endpoint, { ...options, method: "POST", body });
  }

  /** Create PUT request */
  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ): Promise<T> {
    return this.request(endpoint, { ...options, method: "PUT", body });
  }

  /** Create DELETE request */
  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method">,
  ): Promise<T> {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}
