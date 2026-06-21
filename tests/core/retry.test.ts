// file: tests/core/retry.test.ts
/**
 * Native retry helper tests (replacement for p-retry).
 * Covers parseRetryAfter parsing and the withRetry delay/abort policy.
 */

import { describe, expect, test } from "bun:test";
import { parseRetryAfter, withRetry } from "../../src/core/retry";

describe("parseRetryAfter", () => {
  test("parses delay-seconds into ms", () => {
    expect(parseRetryAfter("120")).toBe(120_000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter(" 5 ")).toBe(5_000);
  });

  test("parses an HTTP-date into a non-negative ms delta", () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms!).toBeLessThanOrEqual(60_000);
  });

  test("clamps a past HTTP-date to 0", () => {
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfter(past)).toBe(0);
  });

  test("returns undefined for missing/empty/garbage values", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("not-a-date")).toBeUndefined();
    expect(parseRetryAfter("12abc")).toBeUndefined();
  });
});

describe("withRetry", () => {
  const opts = { retries: 3, baseMs: 1, maxMs: 2, shouldRetry: () => true };

  test("returns on first success without retrying", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return "ok";
    }, opts);
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  test("retries a retryable error then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return "ok";
    }, opts);
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  test("gives up after exhausting retries (1 + retries attempts)", async () => {
    let calls = 0;
    const err = new Error("always");
    await expect(
      withRetry(async () => {
        calls++;
        throw err;
      }, opts),
    ).rejects.toBe(err);
    expect(calls).toBe(4); // 1 initial + 3 retries
  });

  test("does not retry a non-retryable error", async () => {
    let calls = 0;
    const err = new Error("fatal");
    await expect(
      withRetry(
        async () => {
          calls++;
          throw err;
        },
        { ...opts, shouldRetry: () => false },
      ),
    ).rejects.toBe(err);
    expect(calls).toBe(1);
  });

  test("honors a Retry-After within the inline cap then retries", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("429");
        return "ok";
      },
      { ...opts, retryAfterMs: () => 0, inlineCapMs: 15_000 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  test("gives up immediately when Retry-After exceeds the inline cap", async () => {
    let calls = 0;
    const err = new Error("rate-limited for an hour");
    await expect(
      withRetry(
        async () => {
          calls++;
          throw err;
        },
        { ...opts, retryAfterMs: () => 3_600_000, inlineCapMs: 15_000 },
      ),
    ).rejects.toBe(err);
    expect(calls).toBe(1); // never slept, never retried
  });

  test("aborting mid-sleep stops retrying and surfaces the original error", async () => {
    const controller = new AbortController();
    const err = new Error("network");
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          controller.abort();
          throw err;
        },
        { retries: 5, baseMs: 1000, shouldRetry: () => true, signal: controller.signal },
      ),
    ).rejects.toBe(err);
    expect(calls).toBe(1);
  });
});
