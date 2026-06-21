// file: tests/core/http.test.ts
/**
 * HttpClient rate-limit / Retry-After integration tests.
 * Exercises the native retry path end-to-end through the fetch boundary.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { APIError, RateLimitError } from "../../src/core/errors";
import { HttpClient } from "../../src/core/http";

const originalFetch = globalThis.fetch;
const mockFetch = mock(async () => new Response());

const rateLimited = (retryAfter?: string) =>
  new Response(JSON.stringify({ message: "slow down" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      ...(retryAfter ? { "retry-after": retryAfter } : {}),
    },
  });

const ok = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mockFetch.mockReset();
});

describe("HttpClient Retry-After / rate limiting", () => {
  test("retries a 429 honoring Retry-After, then succeeds", async () => {
    const client = new HttpClient({ baseUrl: "https://x", carrier: "test" });
    mockFetch.mockResolvedValueOnce(rateLimited("0"));
    mockFetch.mockResolvedValueOnce(ok());

    const result = await client.get<{ ok: boolean }>("/x");

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("surfaces RateLimitError with retryAfterMs after exhausting retries", async () => {
    const client = new HttpClient({
      baseUrl: "https://x",
      carrier: "test",
      retry: { retries: 1 },
    });
    mockFetch.mockImplementation(async () => rateLimited("0"));

    const error = (await client.get("/x").catch((e) => e)) as RateLimitError;

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterMs).toBe(0);
    expect(error.statusCode).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  test("does not retry when Retry-After exceeds the inline cap", async () => {
    const client = new HttpClient({
      baseUrl: "https://x",
      carrier: "test",
      retry: { inlineCapMs: 1_000 },
    });
    mockFetch.mockImplementation(async () => rateLimited("3600"));

    const err = (await client.get("/x").catch((e) => e)) as RateLimitError;

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfterMs).toBe(3_600_000);
    expect(mockFetch).toHaveBeenCalledTimes(1); // gave up without sleeping
  });

  test("does not auto-retry a mutating POST but still surfaces RateLimitError", async () => {
    const client = new HttpClient({ baseUrl: "https://x", carrier: "test" });
    mockFetch.mockImplementation(async () => rateLimited("0"));

    const err = (await client.post("/x", {}).catch((e) => e)) as RateLimitError;

    expect(err).toBeInstanceOf(RateLimitError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("maps 503 to a RateLimitError that is still an APIError", async () => {
    const client = new HttpClient({
      baseUrl: "https://x",
      carrier: "test",
      retry: { retries: 0 },
    });
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "maintenance" }), {
        status: 503,
        headers: { "content-type": "application/json", "retry-after": "0" },
      }),
    );

    const err = (await client.get("/x").catch((e) => e)) as RateLimitError;

    expect(err).toBeInstanceOf(RateLimitError);
    expect(err).toBeInstanceOf(APIError); // back-compat: still an APIError
    expect(err.statusCode).toBe(503);
  });
});
