/**
 * @fileoverview HTTP response conveniences with explicit native client ownership.
 * @module github/scripts/helpers/http
 *
 * @remarks
 * Native HTTP APIs remain available through helpers/sdk. This decorator adds
 * parsed responses and required binary downloads, without changing SDK error
 * identities or accepting options that it does not actually apply.
 */
import {fs} from "../filesystem/index.ts";
import * as native from "../sdk/http-client.ts";
import type {RequestHandler, RequestOptions} from "../sdk/http-interfaces.ts";

/** Request-level policy; configured clients are not mutated to apply overrides. */
export interface HttpRequestOptions {
  readonly headers?: Record<string, string>;
  /** Native socket inactivity timeout in milliseconds, not a total deadline. */
  readonly timeout?: number;
  readonly allowRedirects?: boolean;
  readonly maxRedirects?: number;
  readonly allowRetries?: boolean;
  readonly maxRetries?: number;
}

/** Factory of independently owned native clients; every call must return a fresh client. */
export type HttpClientFactory = (...args: ConstructorParameters<typeof native.HttpClient>) => native.HttpClient;

/** Full native configuration plus an injectable external client factory. */
export interface HttpHelperOptions {
  readonly handlers?: readonly RequestHandler[];
  readonly requestOptions?: Readonly<RequestOptions>;
  readonly createClient?: HttpClientFactory;
}

/** Parsed response; the generic type remains a caller assertion, not a schema decoder. */
export interface HttpResponse<T = unknown> {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: T;
  readonly success: boolean;
}

/** Serializable JSON request bodies accepted by the convenience verbs. */
export type JsonBody = Record<string, unknown> | unknown[];

/** Reusable HTTP conveniences; the owner disposes the helper when finished. */
export interface IHttpHelper {
  /**
   * Fetches a parsed JSON value or text without requiring a successful status.
   * @param url - Target URL.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response; T does not validate runtime data.
   * @throws Native transport/body errors unchanged.
   */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /**
   * Sends a JSON POST.
   * @param url - Target URL.
   * @param body - Optional serializable JSON.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response without concealing non-2xx status.
   */
  post<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /**
   * Sends a JSON PUT.
   * @param url - Target URL.
   * @param body - Optional serializable JSON.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response.
   */
  put<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /**
   * Sends a JSON PATCH.
   * @param url - Target URL.
   * @param body - Optional serializable JSON.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response.
   */
  patch<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /**
   * Sends a DELETE.
   * @param url - Target URL.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response.
   */
  delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /**
   * Fetches response metadata without fabricating a body.
   * @param url - Target URL.
   * @param options - Headers and request-level native policy.
   * @returns Response metadata with undefined body.
   */
  head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<void>>;
  /**
   * Requires a 2xx response and atomically writes its original bytes.
   * @param url - Download URL.
   * @param destination - File to replace only after successful transfer.
   * @param options - Headers and request-level native policy.
   * @returns Completion after stream/file closure.
   * @throws {native.HttpClientError} For a non-2xx status.
   * @throws Original transport/file errors without leaving a success-shaped file.
   */
  download(url: string, destination: string, options?: HttpRequestOptions): Promise<void>;
  /**
   * Sends an explicit method and string/JSON body.
   * @param method - HTTP method.
   * @param url - Target URL.
   * @param body - Raw text or serializable JSON.
   * @param options - Headers and request-level native policy.
   * @returns Parsed response.
   */
  request<T = unknown>(method: string, url: string, body?: string | JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
  /** Releases the base client's agents once; request-owned clients are released automatically. */
  dispose(): void;
}

/** Composition-based HTTP decorator; no SDK subclassing or shared option mutation. */
export class HttpHelper implements IHttpHelper {
  private readonly userAgent: string;
  private readonly client: native.HttpClient;
  private readonly factory: HttpClientFactory;
  private readonly handlers: RequestHandler[];
  private readonly requestOptions: RequestOptions;
  private disposed = false;

  /**
   * Creates a reusable base client.
   * @param userAgent - Native user-agent value.
   * @param options - Native handlers/configuration and optional fresh-client factory.
   */
  constructor(userAgent = "github-actions-toolkit", options: HttpHelperOptions = {}) {
    this.userAgent = userAgent;
    this.factory = options.createClient ?? ((...args) => new native.HttpClient(...args));
    this.handlers = [...(options.handlers ?? [])];
    this.requestOptions = {...options.requestOptions};
    this.client = this.factory(userAgent, [...this.handlers], {...this.requestOptions});
  }

  private headers(options?: HttpRequestOptions): Record<string, string> {
    return {"Content-Type": "application/json", Accept: "application/json", ...options?.headers};
  }

  private async withClient<T>(options: HttpRequestOptions | undefined, operation: (client: native.HttpClient) => Promise<T>): Promise<T> {
    if (this.disposed) throw new Error("HTTP helper has been disposed");
    const overrides: RequestOptions = {};
    const supported = new Set(["headers", "timeout", "allowRedirects", "maxRedirects", "allowRetries", "maxRetries"]);
    for (const key of Object.keys(options ?? {})) {
      if (!supported.has(key)) throw new TypeError(`Unsupported HTTP request option '${key}'`);
    }
    if (options?.timeout !== undefined) overrides.socketTimeout = options.timeout;
    if (options?.allowRedirects !== undefined) overrides.allowRedirects = options.allowRedirects;
    if (options?.maxRedirects !== undefined) overrides.maxRedirects = options.maxRedirects;
    if (options?.allowRetries !== undefined) overrides.allowRetries = options.allowRetries;
    if (options?.maxRetries !== undefined) overrides.maxRetries = options.maxRetries;
    const owned = Object.keys(overrides).length > 0;
    const client = owned ? this.factory(this.userAgent, [...this.handlers], {...this.requestOptions, ...overrides}) : this.client;
    try {
      return await operation(client);
    } finally {
      if (owned) client.dispose();
    }
  }

  private metadata<T>(response: native.HttpClientResponse, body: T): HttpResponse<T> {
    const statusCode = response.message.statusCode ?? 0;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.message.headers)) {
      if (typeof value === "string") headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(", ");
    }
    return {statusCode, headers, body, success: statusCode >= 200 && statusCode < 300};
  }

  private async parsed<T>(response: native.HttpClientResponse): Promise<HttpResponse<T>> {
    const text = await response.readBody();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      body = text;
    }
    // Compatibility generic: callers must still decode unknown domain payloads.
    return this.metadata(response, body as T);
  }

  /** {@inheritDoc IHttpHelper.get} */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.withClient(options, async (client) => this.parsed<T>(await client.get(url, this.headers(options))));
  }

  /** {@inheritDoc IHttpHelper.post} */
  post<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.withClient(options, async (client) =>
      this.parsed<T>(await client.post(url, body === undefined ? "" : JSON.stringify(body), this.headers(options))),
    );
  }

  /** {@inheritDoc IHttpHelper.put} */
  put<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.withClient(options, async (client) =>
      this.parsed<T>(await client.put(url, body === undefined ? "" : JSON.stringify(body), this.headers(options))),
    );
  }

  /** {@inheritDoc IHttpHelper.patch} */
  patch<T = unknown>(url: string, body?: JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.withClient(options, async (client) =>
      this.parsed<T>(await client.patch(url, body === undefined ? "" : JSON.stringify(body), this.headers(options))),
    );
  }

  /** {@inheritDoc IHttpHelper.delete} */
  delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.withClient(options, async (client) => this.parsed<T>(await client.del(url, this.headers(options))));
  }

  /** {@inheritDoc IHttpHelper.head} */
  head(url: string, options?: HttpRequestOptions): Promise<HttpResponse<void>> {
    return this.withClient(options, async (client) => this.metadata(await client.head(url, this.headers(options)), undefined));
  }

  /** {@inheritDoc IHttpHelper.download} */
  download(url: string, destination: string, options?: HttpRequestOptions): Promise<void> {
    return this.withClient(options, async (client) => {
      const response = await client.get(url, this.headers(options));
      const status = response.message.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        response.message.destroy();
        throw new native.HttpClientError(`Download returned HTTP ${status}`, status);
      }
      await fs.writeStreamAtomic(destination, response.message);
    });
  }

  /** {@inheritDoc IHttpHelper.request} */
  request<T = unknown>(method: string, url: string, body?: string | JsonBody, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    const data = typeof body === "string" ? body : body === undefined ? "" : JSON.stringify(body);
    return this.withClient(options, async (client) => this.parsed<T>(await client.request(method, url, data, this.headers(options))));
  }

  /** {@inheritDoc IHttpHelper.dispose} */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.client.dispose();
  }
}

/**
 * Creates an owned HTTP decorator; retain and dispose it after use.
 * @param userAgent - Optional native user-agent value.
 * @param options - Native client handlers/options and optional external factory.
 * @returns A reusable helper with automatically disposed request-specific clients.
 */
export function createHttpHelper(userAgent?: string, options?: HttpHelperOptions): IHttpHelper {
  return new HttpHelper(userAgent, options);
}

/** Default non-keepalive convenience instance; prefer an owned factory for configured lifecycles. */
export const httpClient = createHttpHelper();
