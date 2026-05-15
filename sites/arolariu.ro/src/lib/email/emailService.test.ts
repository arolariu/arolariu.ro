import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockSend, mockGetClient, mockWithSpan, mockLog} = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetClient: vi.fn(),
  mockWithSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  mockLog: vi.fn(),
}));

vi.mock("./resendClient", () => ({
  getResendClient: mockGetClient,
}));

vi.mock("@/instrumentation.server", () => ({
  withSpan: mockWithSpan,
  logWithTrace: mockLog,
}));

import {emailService} from "./emailService";

const reactEl = {type: "div", props: {}} as unknown as React.ReactElement;

beforeEach(() => {
  mockSend.mockReset();
  mockGetClient.mockReset();
  mockGetClient.mockResolvedValue({emails: {send: mockSend}});
  mockWithSpan.mockClear();
  mockLog.mockClear();
});

describe("emailService.sendEmail", () => {
  it("throws when API key is missing", async () => {
    mockGetClient.mockRejectedValueOnce(new Error("Resend API key not configured"));
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
      expect.arrayContaining([{name: "template", value: "welcome"}, {name: "locale", value: "ro"}, expect.objectContaining({name: "env"})]),
    );
    expect(options).toBeUndefined();
  });

  it("forwards idempotencyKey when provided", async () => {
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

  it("logs an error entry when Resend returns an error", async () => {
    mockSend.mockResolvedValue({data: null, error: {message: "domain_not_verified", name: "validation_error"}});

    await expect(
      emailService.sendEmail({
        to: "u@e.com",
        subject: "S",
        react: reactEl,
        templateKey: "welcome",
        locale: "en",
      }),
    ).rejects.toThrow();

    expect(mockLog).toHaveBeenCalledWith(
      "error",
      "Resend send failed",
      expect.objectContaining({to: "u@e.com", template: "welcome", locale: "en", error: "domain_not_verified"}),
      "api",
    );
  });

  it("logs a success entry on successful send", async () => {
    mockSend.mockResolvedValue({data: {id: "id_success"}, error: null});

    await emailService.sendEmail({
      to: "u@e.com",
      subject: "S",
      react: reactEl,
      templateKey: "welcome",
      locale: "en",
    });

    expect(mockLog).toHaveBeenCalledWith(
      "info",
      "Email sent",
      expect.objectContaining({to: "u@e.com", template: "welcome", locale: "en", id: "id_success"}),
      "api",
    );
  });

  it("uses 'unknown' as the env tag value when NODE_ENV is not set", async () => {
    // Covers the `process.env["NODE_ENV"] ?? "unknown"` fallback branch.
    mockSend.mockResolvedValue({data: {id: "id_1"}, error: null});
    const original = process.env["NODE_ENV"];
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (process.env as Record<string, string | undefined>)["NODE_ENV"];
    try {
      await emailService.sendEmail({
        to: "u@e.com",
        subject: "S",
        react: reactEl,
        templateKey: "welcome",
        locale: "en",
      });
      const payload = mockSend.mock.calls[0]![0];
      const envTag = (payload.tags as readonly {name: string; value: string}[]).find((t) => t.name === "env");
      expect(envTag?.value).toBe("unknown");
    } finally {
      if (original !== undefined) {
        process.env["NODE_ENV"] = original;
      }
    }
  });

  it("reuses the singleton Resend client across multiple sends", async () => {
    mockSend.mockResolvedValue({data: {id: "id_1"}, error: null});

    await emailService.sendEmail({
      to: "a@e.com",
      subject: "S1",
      react: reactEl,
      templateKey: "welcome",
      locale: "en",
    });
    await emailService.sendEmail({
      to: "b@e.com",
      subject: "S2",
      react: reactEl,
      templateKey: "welcome",
      locale: "en",
    });

    // getResendClient mock returns the same stub client both times; the real
    // singleton's responsibility is tested in resendClient.test.ts. Here we
    // assert emailService called the singleton accessor exactly once per send
    // (i.e. it does not instantiate Resend directly).
    expect(mockGetClient).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
