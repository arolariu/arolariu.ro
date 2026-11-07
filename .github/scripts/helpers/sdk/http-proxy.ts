/**
 * @fileoverview Native proxy selection and bypass decisions.
 * @module github/scripts/helpers/sdk/http-proxy
 *
 * @remarks
 * Forwards the public URL-based proxy helpers without changing environment
 * interpretation. A returned proxy URL can contain credentials and must not be
 * logged indiscriminately. No proxy is configured or contacted on import.
 *
 * @example
 * ```typescript
 * import {checkBypass, getProxyUrl} from "./http-proxy.ts";
 * const target = new URL("https://example.com");
 * const proxy = checkBypass(target) ? undefined : getProxyUrl(target);
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/http-client/README.md
 */
export * from "@actions/http-client/lib/proxy";
