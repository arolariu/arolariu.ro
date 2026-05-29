import type {UserInformation} from "../../../src/types";

/**
 * Minimal structural representation of Clerk User for testing purposes.
 *
 * @remarks
 * Clerk's UserResource type is extensive and not practical to fully construct in tests.
 * This type includes only the essential properties needed for test scenarios.
 */
type TestUserResource = Readonly<{
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  primaryEmailAddressId: string;
}>;

/**
 * Override options for building UserInformation test objects.
 *
 * @remarks
 * Allows partial overrides of UserInformation properties for flexible test scenarios.
 * The `user` property can be fully customized or omitted to use the default builder.
 */
export type UserInformationOverrides = Partial<
  Omit<UserInformation, "user">
> &
  Readonly<{
    user?: UserInformation["user"];
  }>;

/**
 * Constructs a minimal test User object with Clerk-compatible structure.
 *
 * @param overrides - Optional partial overrides for user properties
 * @returns A test user object cast to match Clerk's User type
 *
 * @remarks
 * Uses `unknown` cast to bridge between the minimal test structure and Clerk's
 * full UserResource interface. This is intentional and isolated to the builder layer.
 * The cast is safe because tests only access the properties defined in TestUserResource.
 */
function buildUserResource(
  overrides: Partial<TestUserResource> = {},
): UserInformation["user"] {
  return {
    id: overrides.id ?? "user_test_123",
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "User",
    fullName: overrides.fullName ?? "Test User",
    primaryEmailAddressId: overrides.primaryEmailAddressId ?? "email_test_123",
  } as unknown as UserInformation["user"];
}

/**
 * Builds a UserInformation object for testing.
 *
 * @param overrides - Optional partial overrides for user information fields
 * @returns Complete UserInformation object with test defaults
 *
 * @example
 * ```typescript
 * // Default authenticated user
 * const userInfo = buildUserInformation();
 * expect(userInfo.userIdentifier).toBe("user_test_123");
 *
 * // Custom user
 * const customUser = buildUserInformation({
 *   userIdentifier: "user_custom_456",
 *   userJwt: "custom-jwt-token"
 * });
 * ```
 *
 * @see {@link buildAuthenticatedUserInformation} - Alias for authenticated scenarios
 * @see {@link buildAnonymousUserInformation} - For unauthenticated scenarios
 */
export function buildUserInformation(
  overrides: UserInformationOverrides = {},
): UserInformation {
  const userIdentifier = overrides.userIdentifier ?? "user_test_123";

  return {
    user: overrides.user ?? buildUserResource({id: userIdentifier}),
    userIdentifier,
    userJwt: overrides.userJwt ?? "jwt-test-token",
  };
}

/**
 * Builds an authenticated UserInformation object for testing.
 *
 * @param overrides - Optional partial overrides for user information fields
 * @returns Complete UserInformation object representing an authenticated user
 *
 * @remarks
 * Alias for `buildUserInformation` with semantic clarity for authenticated test cases.
 *
 * @example
 * ```typescript
 * const authenticatedUser = buildAuthenticatedUserInformation();
 * expect(authenticatedUser.user).not.toBeNull();
 * expect(authenticatedUser.userJwt).toBeTruthy();
 * ```
 *
 * @see {@link buildUserInformation} - Base builder function
 * @see {@link buildAnonymousUserInformation} - Counterpart for anonymous users
 */
export function buildAuthenticatedUserInformation(
  overrides: UserInformationOverrides = {},
): UserInformation {
  return buildUserInformation(overrides);
}

/**
 * Builds an anonymous (unauthenticated) UserInformation object for testing.
 *
 * @returns UserInformation object representing an unauthenticated state
 *
 * @remarks
 * Used for testing unauthenticated code branches, authentication guards,
 * and public-only access scenarios.
 *
 * @example
 * ```typescript
 * const anonymousUser = buildAnonymousUserInformation();
 * expect(anonymousUser.user).toBeNull();
 * expect(anonymousUser.userIdentifier).toBe("");
 * expect(anonymousUser.userJwt).toBe("");
 * ```
 *
 * @see {@link buildAuthenticatedUserInformation} - Counterpart for authenticated users
 */
export function buildAnonymousUserInformation(): UserInformation {
  return {
    user: null,
    userIdentifier: "",
    userJwt: "",
  };
}
