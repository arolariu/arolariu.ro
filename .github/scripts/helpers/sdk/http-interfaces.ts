/**
 * @fileoverview Native HTTP request, handler, option, and typed-response contracts.
 * @module github/scripts/helpers/sdk/http-interfaces
 *
 * @remarks
 * Retains every public interface rather than copying a subset into a competing
 * DTO. Native optionality and response nullability remain visible to callers.
 * This currently type-only SDK entrypoint is preserved as a complete module.
 *
 * @example
 * ```typescript
 * import type {RequestOptions} from "./http-interfaces.ts";
 * const options: RequestOptions = {allowRetries: false, maxRetries: 0};
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/http-client/README.md
 */
export * from "@actions/http-client/lib/interfaces";
