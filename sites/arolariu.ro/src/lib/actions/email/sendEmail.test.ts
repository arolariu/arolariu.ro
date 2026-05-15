import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockAuth, mockSend} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockSend: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({auth: mockAuth}));
vi.mock("@/lib/email", () => ({emailService: {sendEmail: mockSend}}));

// We mock the registry to use stub templates we control:
const {mockWelcomeTemplate, mockWelcomeSubject, mockInactivityTemplate, mockInactivitySubject} = vi.hoisted(() => ({
  mockWelcomeTemplate: vi.fn(),
  mockWelcomeSubject: vi.fn(),
  mockInactivityTemplate: vi.fn(),
  mockInactivitySubject: vi.fn(),
}));

vi.mock("@/../emails/_registry", () => {
  const welcome = Object.assign(mockWelcomeTemplate, {
    namespace: "email.welcome",
    getSubject: mockWelcomeSubject,
  });
  const inactivity = Object.assign(mockInactivityTemplate, {
    namespace: "email.invoiceInactivity",
    getSubject: mockInactivitySubject,
  });
  return {
    emailTemplates: {
      welcome: {template: welcome},
      "inactivity-7d": {template: inactivity, variantProps: {daysWithoutUpload: 7}},
    },
  };
});

import {sendEmail} from "./sendEmail";

beforeEach(() => {
  mockAuth.mockReset();
  mockSend.mockReset();
  mockWelcomeTemplate.mockReset();
  mockWelcomeSubject.mockReset();
  mockInactivityTemplate.mockReset();
  mockInactivitySubject.mockReset();
  mockWelcomeTemplate.mockResolvedValue({type: "div", props: {}});
  mockWelcomeSubject.mockResolvedValue("Welcome subject");
  mockInactivityTemplate.mockResolvedValue({type: "div", props: {}});
  mockInactivitySubject.mockResolvedValue("Inactivity subject");
  mockAuth.mockResolvedValue({userId: "user_test"});
});

describe("sendEmail action", () => {
  it("returns Unauthorized when no Clerk session", async () => {
    mockAuth.mockResolvedValueOnce({userId: null});
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {} as never});
    expect(result).toEqual({success: false, error: "Unauthorized"});
  });

  it("returns 'Unknown template' for an unregistered key", async () => {
    const result = await sendEmail({templateKey: "definitely-not-a-template" as never, to: "x@y.z", props: {} as never});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/Unknown template/);
  });

  it("calls Template.getSubject with locale + subjectVars", async () => {
    await sendEmail({
      templateKey: "welcome",
      to: "x@y.z",
      props: {name: "Alex", locale: "ro"} as never,
      subjectVars: {brand: "arolariu.ro"},
    });
    expect(mockWelcomeSubject).toHaveBeenCalledWith("ro", {brand: "arolariu.ro"});
  });

  it("defaults locale to 'en' when omitted", async () => {
    await sendEmail({templateKey: "welcome", to: "x@y.z", props: {name: "Alex"} as never});
    expect(mockWelcomeSubject).toHaveBeenCalledWith("en", {});
  });

  it("variantProps override caller props at render time", async () => {
    await sendEmail({
      templateKey: "inactivity-7d",
      to: "x@y.z",
      props: {daysWithoutUpload: 999, locale: "en"} as never,
    });
    const renderArgs = mockInactivityTemplate.mock.calls.at(-1)?.[0];
    expect((renderArgs as {daysWithoutUpload: number}).daysWithoutUpload).toBe(7);
  });

  it("variantProps contribute to subjectVars by default", async () => {
    await sendEmail({templateKey: "inactivity-7d", to: "x@y.z", props: {locale: "en"} as never});
    expect(mockInactivitySubject).toHaveBeenCalledWith("en", expect.objectContaining({daysWithoutUpload: 7}));
  });

  it("locale always wins last in renderProps", async () => {
    await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "fr"} as never});
    const renderArgs = mockWelcomeTemplate.mock.calls.at(-1)?.[0];
    expect((renderArgs as {locale: string}).locale).toBe("fr");
  });

  it("forwards idempotencyKey and replyTo to emailService", async () => {
    await sendEmail({
      templateKey: "welcome",
      to: "x@y.z",
      props: {locale: "en"} as never,
      idempotencyKey: "welcome/user_test",
      replyTo: "alex@example.com",
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "welcome/user_test",
      replyTo: "alex@example.com",
    }));
  });

  it("returns {success: false} when getSubject throws", async () => {
    mockWelcomeSubject.mockRejectedValueOnce(new Error("subject boom"));
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "en"} as never});
    expect(result).toEqual({success: false, error: "subject boom"});
  });

  it("returns {success: false} when template render throws", async () => {
    mockWelcomeTemplate.mockRejectedValueOnce(new Error("render boom"));
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "en"} as never});
    expect(result).toEqual({success: false, error: "render boom"});
  });

  it("returns {success: false} when emailService.sendEmail throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("send boom"));
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "en"} as never});
    expect(result).toEqual({success: false, error: "send boom"});
  });

  it("returns {success: false, error: 'Unknown error'} when a non-Error value is thrown", async () => {
    // Covers the `err instanceof Error ? err.message : "Unknown error"` fallback branch.
    mockSend.mockRejectedValueOnce("plain string failure");
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "en"} as never});
    expect(result).toEqual({success: false, error: "Unknown error"});
  });

  it("returns {success: true} on the happy path", async () => {
    const result = await sendEmail({templateKey: "welcome", to: "x@y.z", props: {locale: "en"} as never});
    expect(result).toEqual({success: true});
  });
});
