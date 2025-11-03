/**
 * @fileoverview HTTP client operations using @actions/http-client
 * @module helpers/http
 *
 * Provides a clean, type-safe API for HTTP operations in GitHub Actions.
 * Uses @actions/http-client for making HTTP requests with proper error handling.
 * Follows Single Responsibility Principle by focusing on HTTP operations.
 */

import * as core from "@actions/core";
import * as http from "@actions/http-client";

/**
 * HTTP request options
 */
export interface HttpRequestOptions {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to allow redirects */
  allowRedirects?: boolean;
  /** Maximum number of redirects */
  maxRedirects?: number;
  /** Whether to allow retries */
  allowRetries?: boolean;
  /** Maximum number of retries */
  maxRetries?: number;
}

/**
 * HTTP response
 */
export interface HttpResponse<T = unknown> {
  /** HTTP status code */
  readonly statusCode: number;
  /** Response headers */
  readonly headers: Readonly<Record<string, string>>;
  /** Response body (parsed if JSON) */
  readonly body: T;
  /** Whether request was successful (2xx status) */
  readonly success: boolean;
}

/**
 * JSON request body
 */
export type JsonBody = Record<string, unknown> | unknown[];

/**
 * HTTP helper interface
 * Provides methods for HTTP operations
 */
export interface IHttpHelper {
  /**
   * Makes a GET request
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Makes a POST request
   * @param url - Request URL
   * @param body - Request body (JSON)
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  post<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Makes a PUT request
   * @param url - Request URL
   * @param body - Request body (JSON)
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  put<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Makes a PATCH request
   * @param url - Request URL
   * @param body - Request body (JSON)
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  patch<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Makes a DELETE request
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;

  /**
   * Makes a HEAD request
   * @param url - Request URL
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<void>>;

  /**
   * Downloads a file
   * @param url - File URL
   * @param destination - Destination path
   * @param options - Request options
   * @returns Promise resolving when download completes
   */
  download(url: string, destination: string, options?: HttpRequestOptions): Promise<void>;

  /**
   * Makes a request with custom method
   * @param method - HTTP method
   * @param url - Request URL
   * @param body - Optional request body
   * @param options - Request options
   * @returns Promise resolving to HTTP response
   */
  request<T = unknown>(method: string, url: string, body?: string | JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

/**
 * Implementation of HTTP helper
 */
export class HttpHelper implements IHttpHelper {
  private client: http.HttpClient;

  /**
   * Creates a new HTTP helper instance
   * @param userAgent - User agent string (default: 'github-actions-toolkit')
   */
  constructor(userAgent: string = "github-actions-toolkit") {
    this.client = new http.HttpClient(userAgent);
  }

  /**
   * Processes HTTP response
   * @param response - HTTP client response
   * @returns Processed HTTP response
   */
  private async processResponse<T>(response: http.HttpClientResponse): Promise<HttpResponse<T>> {
    const statusCode = response.message.statusCode ?? 0;
    const success = statusCode >= 200 && statusCode < 300;

    // Get response body
    const bodyText = await response.readBody();
    let body: T;

    // Try to parse as JSON
    try {
      body = JSON.parse(bodyText) as T;
    } catch {
      body = bodyText as T;
    }

    // Extract headers
    const headers: Record<string, string> = {};
    const rawHeaders = response.message.headers;
    if (rawHeaders) {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (typeof value === "string") {
          headers[key] = value;
        } else if (Array.isArray(value)) {
          headers[key] = value.join(", ");
        }
      }
    }

    return {
      statusCode,
      headers,
      body,
      success,
    };
  }

  /**
   * Creates request headers
   * @param options - Request options
   * @returns Request headers
   */
  private createHeaders(options?: HttpRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    };

    return headers;
  }

  /**
   * {@inheritDoc IHttpHelper.get}
   */
  async get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      core.debug(`GET ${url}`);

      const response = await this.client.get(url, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`GET request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.post}
   */
  async post<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      core.debug(`POST ${url}`);

      const data = body ? JSON.stringify(body) : "";
      const response = await this.client.post(url, data, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`POST request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.put}
   */
  async put<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      core.debug(`PUT ${url}`);

      const data = body ? JSON.stringify(body) : "";
      const response = await this.client.put(url, data, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`PUT request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.patch}
   */
  async patch<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      core.debug(`PATCH ${url}`);

      const data = body ? JSON.stringify(body) : "";
      const response = await this.client.patch(url, data, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`PATCH request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.delete}
   */
  async delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    try {
      core.debug(`DELETE ${url}`);

      const response = await this.client.del(url, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`DELETE request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.head}
   */
  async head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<void>> {
    try {
      core.debug(`HEAD ${url}`);

      const response = await this.client.head(url, this.createHeaders(options));

      return this.processResponse<void>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`HEAD request failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.download}
   */
  async download(url: string, destination: string, options?: HttpRequestOptions): Promise<void> {
    try {
      core.info(`📥 Downloading from ${url} to ${destination}`);

      // Get the file
      const response = await this.client.get(url, this.createHeaders(options));

      // Save to destination
      const {writeFile} = await import("node:fs/promises");
      const {dirname} = await import("node:path");
      const {mkdir} = await import("node:fs/promises");

      // Ensure destination directory exists
      await mkdir(dirname(destination), {recursive: true});

      // Write file
      const body = await response.readBody();
      await writeFile(destination, body);

      core.info(`✅ Download complete: ${destination}`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Download failed: ${err.message}`);
    }
  }

  /**
   * {@inheritDoc IHttpHelper.request}
   */
  async request<T = unknown>(
    method: string,
    url: string,
    body?: string | JsonBody,
    options?: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    try {
      core.debug(`${method.toUpperCase()} ${url}`);

      const data = typeof body === "string" ? body : body ? JSON.stringify(body) : "";

      const response = await this.client.request(method, url, data, this.createHeaders(options));

      return this.processResponse<T>(response);
    } catch (error) {
      const err = error as Error;
      throw new Error(`${method} request failed: ${err.message}`);
    }
  }
}

/**
 * Creates a new HTTP helper instance
 * @param userAgent - Optional user agent string
 * @returns HTTP helper instance
 * @example
 * ```typescript
 * const http = createHttpHelper('my-action/1.0');
 *
 * // GET request
 * const response = await http.get('https://api.example.com/data');
 * if (response.success) {
 *   console.log(response.body);
 * }
 *
 * // POST request with body
 * await http.post('https://api.example.com/create', {
 *   name: 'test',
 *   value: 123
 * });
 *
 * // Download file
 * await http.download(
 *   'https://example.com/file.zip',
 *   './downloads/file.zip'
 * );
 * ```
 */
export function createHttpHelper(userAgent?: string): IHttpHelper {
  return new HttpHelper(userAgent);
}

/**
 * Default HTTP helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const httpClient = createHttpHelper();
