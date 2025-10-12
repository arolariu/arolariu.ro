import {generateGuid} from "@/lib/utils.generic";
import {createGuestSessionToken, validateGuestSessionToken} from "@/lib/utils.server";

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

  it("should generate different identifiers for each new guest session", () => {
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

describe("Guest Session Security Model - Signed Tokens", () => {
  const testSecret = "test-secret-key-for-signing-tokens-min-32-chars";
  
  it("should create cryptographically signed session tokens", async () => {
    const guestId = generateGuid();
    const token = await createGuestSessionToken(guestId, testSecret);
    
    // Token should be a JWT string
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format: header.payload.signature
  });

  it("should validate legitimate signed tokens", async () => {
    const guestId = generateGuid();
    const token = await createGuestSessionToken(guestId, testSecret);
    
    const validatedId = await validateGuestSessionToken(token, testSecret);
    
    expect(validatedId).toBe(guestId);
  });

  it("should reject tokens with invalid signatures", async () => {
    const guestId = generateGuid();
    const token = await createGuestSessionToken(guestId, testSecret);
    
    // Try to validate with wrong secret
    const validatedId = await validateGuestSessionToken(token, "wrong-secret");
    
    expect(validatedId).toBeNull();
  });

  it("should reject tampered tokens", async () => {
    const guestId = generateGuid();
    const token = await createGuestSessionToken(guestId, testSecret);
    
    // Tamper with token (change last character)
    const tamperedToken = token.slice(0, -1) + "X";
    
    const validatedId = await validateGuestSessionToken(tamperedToken, testSecret);
    
    expect(validatedId).toBeNull();
  });

  it("should prevent session fixation through signature validation", async () => {
    // Attacker tries to create a fake token for victim's ID
    const victimId = generateGuid();
    const attackerFakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({guestId: victimId}))}.fake-signature`;
    
    // Server rejects fake token (invalid signature)
    const validatedId = await validateGuestSessionToken(attackerFakeToken, testSecret);
    
    expect(validatedId).toBeNull(); // Attack prevented
  });

  it("should allow session persistence with valid tokens", async () => {
    const guestId = generateGuid();
    const token = await createGuestSessionToken(guestId, testSecret);
    
    // Simulate returning user with same token
    const validatedId1 = await validateGuestSessionToken(token, testSecret);
    const validatedId2 = await validateGuestSessionToken(token, testSecret);
    
    // Same identifier returned (session persistence)
    expect(validatedId1).toBe(guestId);
    expect(validatedId2).toBe(guestId);
    expect(validatedId1).toBe(validatedId2);
  });

  it("should enforce token expiration", async () => {
    const guestId = generateGuid();
    // Create token with 0 days expiry (immediate expiration)
    const token = await createGuestSessionToken(guestId, testSecret, -1); // Expired
    
    // Wait a tiny bit to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    const validatedId = await validateGuestSessionToken(token, testSecret);
    
    // Expired token rejected
    expect(validatedId).toBeNull();
  });
});
