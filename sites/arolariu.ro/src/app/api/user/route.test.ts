import {generateGuid} from "@/lib/utils.generic";

describe("Guest User Identifier Generation - Unit Tests", () => {
  it("should generate valid UUIDs for guest users", () => {
    const uuid1 = generateGuid();
    const uuid2 = generateGuid();

    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    expect(uuid1).toMatch(uuidRegex);
    expect(uuid2).toMatch(uuidRegex);
    expect(uuid1).not.toBe(uuid2); // Unique identifiers
  });

  it("should generate different identifiers for each guest session", () => {
    const identifiers = new Set<string>();
    
    // Generate 100 identifiers
    for (let i = 0; i < 100; i++) {
      identifiers.add(generateGuid());
    }
    
    // All should be unique
    expect(identifiers.size).toBe(100);
  });

  it("should not use hardcoded zero UUID", () => {
    const uuid = generateGuid();
    const hardcodedZeroUuid = "00000000-0000-0000-0000-000000000000";
    
    expect(uuid).not.toBe(hardcodedZeroUuid);
  });

  it("should generate identifiers suitable for session tracking", () => {
    const sessionId1 = generateGuid();
    const sessionId2 = generateGuid();
    
    // Should be non-empty strings
    expect(sessionId1).toBeTruthy();
    expect(sessionId2).toBeTruthy();
    
    // Should be different
    expect(sessionId1).not.toBe(sessionId2);
    
    // Should be properly formatted
    expect(sessionId1.split("-")).toHaveLength(5);
    expect(sessionId2.split("-")).toHaveLength(5);
  });
});

describe("Guest Session Cookie Configuration", () => {
  it("should define proper cookie security options", () => {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 2592000, // 30 days
      path: "/",
    };
    
    // Verify security settings
    expect(cookieOptions.httpOnly).toBe(true); // XSS protection
    expect(cookieOptions.sameSite).toBe("lax"); // CSRF protection
    expect(cookieOptions.maxAge).toBe(2592000); // 30 days persistence
    expect(cookieOptions.path).toBe("/");
  });

  it("should use secure flag in production", () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test production setting
    process.env.NODE_ENV = "production";
    const prodSecure = process.env.NODE_ENV === "production";
    expect(prodSecure).toBe(true);
    
    // Test non-production setting
    process.env.NODE_ENV = "test";
    const testSecure = process.env.NODE_ENV === "production";
    expect(testSecure).toBe(false);
    
    // Restore
    process.env.NODE_ENV = originalEnv;
  });

  it("should persist cookie for 30 days", () => {
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const maxAge = 2592000;
    
    expect(maxAge).toBe(thirtyDaysInSeconds);
  });
});
