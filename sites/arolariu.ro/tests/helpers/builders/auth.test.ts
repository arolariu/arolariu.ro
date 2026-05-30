import {describe, expect, it} from "vitest";

import {buildAnonymousUserInformation, buildAuthenticatedUserInformation, buildUserInformation} from "./auth";

describe("auth builders", () => {
  it("builds authenticated user information with the complete contract", () => {
    const userInformation = buildAuthenticatedUserInformation();

    expect(userInformation.userIdentifier).toBe("user_test_123");
    expect(userInformation.userJwt).toBe("jwt-test-token");
    expect(userInformation.user).toEqual(
      expect.objectContaining({
        id: "user_test_123",
      }),
    );
  });

  it("allows overriding user information fields", () => {
    const userInformation = buildUserInformation({
      userIdentifier: "user_custom",
      userJwt: "jwt-custom",
    });

    expect(userInformation.userIdentifier).toBe("user_custom");
    expect(userInformation.userJwt).toBe("jwt-custom");
    expect(userInformation.user?.id).toBe("user_custom");
  });

  it("builds anonymous user information for unauthenticated branches", () => {
    const userInformation = buildAnonymousUserInformation();

    expect(userInformation.userIdentifier).toBe("");
    expect(userInformation.userJwt).toBe("");
    expect(userInformation.user).toBeNull();
  });
});
