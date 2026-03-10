/**
 * @fileoverview Tests for Azure credential singleton.
 * @module sites/arolariu.ro/src/lib/azure/credentials.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Hoisted mock constructor so we can control DefaultAzureCredential behavior
const {mockCredentialInstance, MockDefaultAzureCredential} = vi.hoisted(() => {
  const instance = {getToken: vi.fn()};
  // Must use regular function (not arrow) so it can be called with `new`
  const Ctor = vi.fn(function (this: Record<string, unknown>) {
    Object.assign(this, instance);
  });
  return {mockCredentialInstance: instance, MockDefaultAzureCredential: Ctor};
});

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: MockDefaultAzureCredential,
}));

describe("credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env["AZURE_CLIENT_ID"];
    // Re-apply default constructor implementation after mockReset clears it
    MockDefaultAzureCredential.mockImplementation(function (this: Record<string, unknown>) {
      Object.assign(this, mockCredentialInstance);
    });
  });

  it("returns a credential instance without AZURE_CLIENT_ID", async () => {
    const {getAzureCredential} = await import("./credentials");
    const cred = getAzureCredential();

    expect(cred).toBeDefined();
    expect(MockDefaultAzureCredential).toHaveBeenCalledWith();
  });

  it("passes managedIdentityClientId when AZURE_CLIENT_ID is set", async () => {
    process.env["AZURE_CLIENT_ID"] = "test-client-id";

    const {getAzureCredential} = await import("./credentials");
    getAzureCredential();

    expect(MockDefaultAzureCredential).toHaveBeenCalledWith({managedIdentityClientId: "test-client-id"});
  });

  it("returns the same cached instance on subsequent calls", async () => {
    const {getAzureCredential} = await import("./credentials");
    const first = getAzureCredential();
    const second = getAzureCredential();

    expect(first).toBe(second);
    expect(MockDefaultAzureCredential).toHaveBeenCalledTimes(1);
  });

  it("throws a descriptive error when DefaultAzureCredential construction fails", async () => {
    MockDefaultAzureCredential.mockImplementationOnce(() => {
      throw new Error("No credential providers available");
    });

    const {getAzureCredential} = await import("./credentials");

    expect(() => getAzureCredential()).toThrow("Azure credential initialization failed");
  });

  it("wraps non-Error causes when DefaultAzureCredential throws a non-Error", async () => {
    MockDefaultAzureCredential.mockImplementationOnce(() => {
      throw "string-error"; // eslint-disable-line no-throw-literal
    });

    const {getAzureCredential} = await import("./credentials");

    expect(() => getAzureCredential()).toThrow("Azure credential initialization failed");
  });
});
