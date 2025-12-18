/**
 * @fileoverview Barrel export for the cookie server actions.
 * @module lib/actions/cookies
 *
 * @remarks
 * This module centralizes exports for cookie-related server actions so callers can
 * import from a single path.
 *
 * @see {@link ./cookies.action} for the implementation details.
 */

/**
 * Cookie server actions.
 *
 * @remarks
 * These functions are implemented as Next.js Server Actions and must be executed
 * on the server.
 */
export {deleteCookie, getCookie, setCookie} from "./cookies.action";
