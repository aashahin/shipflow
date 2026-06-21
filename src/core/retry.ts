// file: src/core/retry.ts
/**
 * Native, dependency-free retry helper for ShipFlow's HTTP client (replaces p-retry).
 *
 * Delay policy per failed-but-retryable attempt:
 * - explicit Retry-After ≤ inlineCap → wait the window out + small positive jitter
 * - explicit Retry-After > inlineCap → stop now, surface the error so a durable
 *   queue/workflow can reschedule (a long inline sleep is unsafe in serverless /
 *   request-bound contexts, and Retry-After is a contract — don't retry early)
 * - otherwise → full-jitter exponential backoff
 *
 * The inter-attempt sleep uses `node:timers/promises` with an AbortSignal so a
 * caller cancellation cleans up the timer (no zombie retries, no leaked `abort`
 * listeners). Never hand-roll `new Promise(r => setTimeout(r, ms))` here.
 */

import { setTimeout as sleep } from "node:timers/promises";

export interface RetryOptions {
  /** Max number of retries after the first attempt. */
  retries: number;
  /** Base delay (ms) for exponential backoff. Default 500. */
  baseMs?: number;
  /** Ceiling (ms) for the exponential-backoff window. Default 20_000. */
  maxMs?: number;
  /**
   * Largest Retry-After delay (ms) we sleep on inline. Beyond this we stop
   * retrying and surface the error so the caller can reschedule durably.
   * Default 15_000.
   */
  inlineCapMs?: number;
  /** Whether a thrown error is retryable at all. */
  shouldRetry: (error: unknown) => boolean;
  /** Extracts an explicit Retry-After delay (ms) from the error, if any. */
  retryAfterMs?: (error: unknown) => number | undefined;
  /** Caller cancellation — aborts the in-flight request and the inter-attempt sleep. */
  signal?: AbortSignal;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    retries,
    baseMs = 500,
    maxMs = 20_000,
    inlineCapMs = 15_000,
    shouldRetry,
    retryAfterMs,
    signal,
  } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;

      const retryAfter = retryAfterMs?.(error);
      let delay: number;
      if (retryAfter != null) {
        // Retry-After window longer than we'll sleep inline → surface the error
        // (carrying retryAfterMs) so the caller can reschedule out-of-band.
        if (retryAfter > inlineCapMs) throw error;
        // Positive jitter only: never retry before the window, and spread a herd
        // of bulk requests past its edge.
        delay = retryAfter + Math.random() * 1000;
      } else {
        // Full jitter over an exponentially growing window.
        delay = Math.random() * Math.min(maxMs, baseMs * 2 ** attempt);
      }

      try {
        await sleep(delay, undefined, { signal });
      } catch {
        // Aborted mid-sleep → stop retrying and surface the original error.
        throw error;
      }
    }
  }
}

/**
 * Parse an HTTP `Retry-After` header into milliseconds.
 * Supports both delay-seconds (`"120"`) and HTTP-date forms. Returns undefined
 * when absent or unparseable; clamps past dates to 0.
 */
export function parseRetryAfter(
  headerValue: string | null | undefined,
): number | undefined {
  if (headerValue == null) return undefined;
  const trimmed = headerValue.trim();
  if (trimmed === "") return undefined;
  // delay-seconds: a non-negative integer number of seconds (RFC 7231).
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  // HTTP-date form.
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}
