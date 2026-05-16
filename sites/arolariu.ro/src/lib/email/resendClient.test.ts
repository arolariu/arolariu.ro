import {beforeEach, describe, expect, it, vi} from "vitest";

const {ctorSpy, mockFetchKey} = vi.hoisted(() => ({
  ctorSpy: vi.fn(),
  mockFetchKey: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    constructor(key: string) {
      ctorSpy(key);
    }
    emails = {send: vi.fn()};
  },
}));

vi.mock("@/lib/config/configProxy", () => ({fetchResendApiKey: mockFetchKey}));

describe("getResendClient", () => {
  beforeEach(() => {
    ctorSpy.mockClear();
    mockFetchKey.mockReset();
  });

  it("constructs Resend exactly once across N concurrent first-callers", async () => {
    mockFetchKey.mockResolvedValue("re_test_key");
    const {getResendClient, __resetResendClient} = await import("./resendClient");
    __resetResendClient();
    const [a, b, c] = await Promise.all([getResendClient(), getResendClient(), getResendClient()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    expect(ctorSpy).toHaveBeenCalledWith("re_test_key");
  });

  it("caches across subsequent calls", async () => {
    mockFetchKey.mockResolvedValue("re_test_key");
    const {getResendClient, __resetResendClient} = await import("./resendClient");
    __resetResendClient();
    await getResendClient();
    await getResendClient();
    await getResendClient();
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    expect(mockFetchKey).toHaveBeenCalledTimes(1);
  });

  it("throws when the API key is missing", async () => {
    mockFetchKey.mockResolvedValue("");
    const {getResendClient, __resetResendClient} = await import("./resendClient");
    __resetResendClient();
    await expect(getResendClient()).rejects.toThrow(/api key/i);
  });

  it("__resetResendClient clears the cached singleton", async () => {
    mockFetchKey.mockResolvedValue("re_test_key");
    const {getResendClient, __resetResendClient} = await import("./resendClient");
    __resetResendClient();
    await getResendClient();
    __resetResendClient();
    await getResendClient();
    expect(ctorSpy).toHaveBeenCalledTimes(2);
  });
});
