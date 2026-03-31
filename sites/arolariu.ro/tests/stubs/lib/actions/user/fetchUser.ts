/**
 * @fileoverview Stub for `@/lib/actions/user/fetchUser` in Vitest tests.
 * @module tests/stubs/lib/actions/user/fetchUser
 *
 * @remarks
 * The real module is a server action that calls Clerk and issues JWTs.
 * This stub provides no-op mocks — tests set their own return values:
 *
 * ```ts
 * import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
 * vi.mocked(fetchBFFUserFromAuthService).mockResolvedValue({
 *   isAuthenticated: true,
 *   user: mockUser,
 *   jwtToken: "test-jwt",
 * });
 * ```
 */

import {vi} from "vitest";

export const fetchBFFUserFromAuthService = vi.fn();
export const fetchAaaSUserFromAuthService = vi.fn();
