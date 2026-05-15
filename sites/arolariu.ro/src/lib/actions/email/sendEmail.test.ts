import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockAuth, mockServiceSend, mockGetSubject, fakeReact, welcomeComponent} = vi.hoisted(() => {
  const mockAuth = vi.fn();
  const mockServiceSend = vi.fn();
  const mockGetSubject = vi.fn();
  const fakeReact = {type: "div", props: {}} as unknown as React.ReactElement;
  const welcomeComponent = vi.fn(async () => fakeReact);

  return {mockAuth, mockServiceSend, mockGetSubject, fakeReact, welcomeComponent};
});

vi.mock("@clerk/nextjs/server", () => ({auth: mockAuth}));
vi.mock("@/lib/email", () => ({emailService: {sendEmail: mockServiceSend}}));
vi.mock("@/../emails/_i18n", () => ({
  DEFAULT_LOCALE: "en",
  getEmailSubject: mockGetSubject,
}));

vi.mock("@/../emails/_registry", () => ({
  emailTemplates: {
    welcome: {component: welcomeComponent, namespace: "email.welcome"},
  },
}));

import {sendEmail} from "./sendEmail";

beforeEach(() => {
  mockAuth.mockReset();
  mockServiceSend.mockReset();
  mockGetSubject.mockReset();
  welcomeComponent.mockClear();
});

describe("sendEmail server action", () => {
  it("returns Unauthorized when no Clerk session", async () => {
    mockAuth.mockResolvedValue({userId: null});
    const result = await sendEmail({
      templateKey: "welcome",
      to: "u@e.com",
      props: {username: "Alex"},
    } as never);
    expect(result).toEqual({success: false, error: "Unauthorized"});
    expect(mockServiceSend).not.toHaveBeenCalled();
  });

  it("resolves subject, renders component, and forwards to emailService", async () => {
    mockAuth.mockResolvedValue({userId: "user_42"});
    mockGetSubject.mockResolvedValue("Welcome to arolariu.ro");
    mockServiceSend.mockResolvedValue(undefined);

    const result = await sendEmail({
      templateKey: "welcome",
      to: "u@e.com",
      props: {username: "Alex", locale: "ro"},
      idempotencyKey: "welcome:user_42",
      replyTo: "noreply@arolariu.ro",
      subjectVars: {brand: "arolariu.ro"},
    } as never);

    expect(result).toEqual({success: true});
    expect(mockGetSubject).toHaveBeenCalledWith("email.welcome", "ro", {brand: "arolariu.ro"});
    expect(welcomeComponent).toHaveBeenCalledWith({username: "Alex", locale: "ro"});
    expect(mockServiceSend).toHaveBeenCalledWith({
      to: "u@e.com",
      subject: "Welcome to arolariu.ro",
      react: fakeReact,
      templateKey: "welcome",
      locale: "ro",
      idempotencyKey: "welcome:user_42",
      replyTo: "noreply@arolariu.ro",
    });
  });

  it("defaults locale to 'en' when omitted", async () => {
    mockAuth.mockResolvedValue({userId: "user_42"});
    mockGetSubject.mockResolvedValue("Welcome");
    mockServiceSend.mockResolvedValue(undefined);

    await sendEmail({
      templateKey: "welcome",
      to: "u@e.com",
      props: {username: "Alex"},
    } as never);

    expect(welcomeComponent).toHaveBeenCalledWith({username: "Alex", locale: "en"});
    expect(mockServiceSend).toHaveBeenCalledWith(expect.objectContaining({locale: "en"}));
  });

  it("returns error result when emailService throws", async () => {
    mockAuth.mockResolvedValue({userId: "user_42"});
    mockGetSubject.mockResolvedValue("Subject");
    mockServiceSend.mockRejectedValue(new Error("rate_limited"));

    const result = await sendEmail({
      templateKey: "welcome",
      to: "u@e.com",
      props: {username: "Alex"},
    } as never);

    expect(result).toEqual({success: false, error: "rate_limited"});
  });
});
