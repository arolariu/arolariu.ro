import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockSend, mockFetchKey, mockWithSpan, mockLog} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockFetchKey: vi.fn(),
  mockWithSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  mockLog: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {send: mockSend};
    },
  };
});

vi.mock("@/lib/config/configProxy", () => ({
  fetchResendApiKey: mockFetchKey,
}));

vi.mock("@/instrumentation.server", () => ({
  withSpan: mockWithSpan,
  logWithTrace: mockLog,
}));

import {emailService} from "./emailService";

const reactEl = {type: "div", props: {}} as unknown as React.ReactElement;

beforeEach(() => {
  mockSend.mockReset();
  mockFetchKey.mockReset();
  mockWithSpan.mockClear();
  mockLog.mockClear();
});

describe("emailService.sendEmail", () => {
  it("throws when API key is missing", async () => {
    mockFetchKey.mockResolvedValue("");
    await expect(
      emailService.sendEmail({
        to: "x@y.com",
        subject: "S",
        react: reactEl,
        templateKey: "welcome",
        locale: "en",
      }),
    ).rejects.toThrow(/api key/i);
  });

  it("calls Resend with from address, tags, and the rendered react element", async () => {
    mockFetchKey.mockResolvedValue("re_test_key");
    mockSend.mockResolvedValue({data: {id: "id_123"}, error: null});

    await emailService.sendEmail({
      to: "user@example.com",
      subject: "Welcome",
      react: reactEl,
      templateKey: "welcome",
      locale: "ro",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const [payload, options] = mockSend.mock.calls[0]!;
    expect(payload.from).toMatch(/AROLARIU\.RO/);
    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toBe("Welcome");
    expect(payload.react).toBe(reactEl);
    expect(payload.tags).toEqual(
      expect.arrayContaining([
        {name: "template", value: "welcome"},
        {name: "locale", value: "ro"},
        expect.objectContaining({name: "env"}),
      ]),
    );
    expect(options).toBeUndefined();
  });

  it("forwards idempotencyKey when provided", async () => {
    mockFetchKey.mockResolvedValue("re_key");
    mockSend.mockResolvedValue({data: {id: "id_1"}, error: null});

    await emailService.sendEmail({
      to: "u@e.com",
      subject: "S",
      react: reactEl,
      templateKey: "welcome",
      locale: "en",
      idempotencyKey: "welcome:user_42",
    });

    const options = mockSend.mock.calls[0]![1];
    expect(options).toEqual({idempotencyKey: "welcome:user_42"});
  });

  it("forwards replyTo when provided", async () => {
    mockFetchKey.mockResolvedValue("re_key");
    mockSend.mockResolvedValue({data: {id: "id_1"}, error: null});

    await emailService.sendEmail({
      to: "u@e.com",
      subject: "S",
      react: reactEl,
      templateKey: "invoice-shared",
      locale: "en",
      replyTo: "alex@example.com",
    });

    const payload = mockSend.mock.calls[0]![0];
    expect(payload.replyTo).toBe("alex@example.com");
  });

  it("wraps the call in a withSpan trace", async () => {
    mockFetchKey.mockResolvedValue("re_key");
    mockSend.mockResolvedValue({data: {id: "id_1"}, error: null});

    await emailService.sendEmail({
      to: "u@e.com",
      subject: "S",
      react: reactEl,
      templateKey: "welcome",
      locale: "en",
    });

    expect(mockWithSpan).toHaveBeenCalledWith("api.email.send", expect.any(Function));
  });

  it("throws when Resend returns an error", async () => {
    mockFetchKey.mockResolvedValue("re_key");
    mockSend.mockResolvedValue({data: null, error: {message: "domain_not_verified", name: "validation_error"}});

    await expect(
      emailService.sendEmail({
        to: "u@e.com",
        subject: "S",
        react: reactEl,
        templateKey: "welcome",
        locale: "en",
      }),
    ).rejects.toThrow("domain_not_verified");
  });
});
