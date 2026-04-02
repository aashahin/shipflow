// file: src/core/http.ts
/**
 * Bun-native HTTP client for ShipFlow
 * - Uses native fetch (optimized in Bun)
 * - Handles "Fake 200 OK" responses (Aramex pattern)
 * - Automatic JSON parsing with error extraction
 */

import { APIError, AuthenticationError, NetworkError } from './errors';

export interface HttpClientConfig {
    baseUrl: string;
    carrier: string;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    /** Custom error extractor for carriers with non-standard error formats */
    errorExtractor?: (json: unknown) => { hasError: boolean; message?: string; errors?: Record<string, string[]> };
}

export class HttpClient {
    private config: HttpClientConfig;

    constructor(config: HttpClientConfig) {
        this.config = {
            timeout: 30_000,
            ...config,
        };
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', headers = {}, body, params, errorExtractor } = options;

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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...this.config.headers,
                    ...headers,
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse JSON response
            let json: unknown;
            const contentType = response.headers.get('content-type') ?? '';
            if (contentType.includes('application/json')) {
                json = await response.json();
            } else {
                const text = await response.text();
                // Try parsing as JSON anyway (some APIs don't set proper content-type)
                try {
                    json = JSON.parse(text);
                } catch {
                    json = { text };
                }
            }

            // Handle HTTP errors
            if (!response.ok) {
                this.handleHttpError(response.status, json);
            }

            // Check for "Fake 200 OK" pattern (Aramex, some Aymakan endpoints)
            if (errorExtractor) {
                const extracted = errorExtractor(json);
                if (extracted.hasError) {
                    throw new APIError(extracted.message ?? 'API returned an error', {
                        carrier: this.config.carrier,
                        statusCode: 200,
                        errors: extracted.errors,
                        raw: json,
                    });
                }
            }

            return json as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof ShipFlowError) {
                throw error;
            }

            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new NetworkError(`Request timeout after ${this.config.timeout}ms`, {
                    carrier: this.config.carrier,
                });
            }

            if (error instanceof TypeError && error.message.includes('fetch')) {
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

    private handleHttpError(status: number, json: unknown): never {
        const message = this.extractErrorMessage(json) ?? `HTTP ${status}`;

        if (status === 401) {
            throw new AuthenticationError(message, {
                carrier: this.config.carrier,
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
        if (!json || typeof json !== 'object') return undefined;
        const obj = json as Record<string, unknown>;

        // Common patterns across carriers
        if (typeof obj.message === 'string') return obj.message;
        if (typeof obj.error === 'string') return obj.error;
        if (typeof obj.response === 'string') return obj.response;
        if (obj.Message && typeof obj.Message === 'string') return obj.Message; // Aramex pattern

        return undefined;
    }

    private extractValidationErrors(json: unknown): Record<string, string[]> | undefined {
        if (!json || typeof json !== 'object') return undefined;
        const obj = json as Record<string, unknown>;

        // Aymakan pattern: { errors: { field: ["message"] } }
        if (obj.errors && typeof obj.errors === 'object') {
            return obj.errors as Record<string, string[]>;
        }

        return undefined;
    }

    /** Create GET request */
    get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /** Create POST request */
    post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    /** Create PUT request */
    put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    /** Create DELETE request */
    delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

// Need to import here to avoid circular dependency issues
import { ShipFlowError } from './errors';
