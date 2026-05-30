import {afterEach, describe, expect, it, vi} from "vitest";

describe("sendEmail action import graph", () => {
  afterEach(() => {
    vi.doUnmock("@clerk/nextjs/server");
    vi.doUnmock("@/lib/email");
    vi.doUnmock("@/../emails/_registry");
    vi.resetModules();
  });

  it("does not import the email template registry when the action module is imported", async () => {
    const mockRegistryImport = vi.fn();

    vi.doMock("@clerk/nextjs/server", () => ({auth: vi.fn()}));
    vi.doMock("@/lib/email", () => ({emailService: {sendEmail: vi.fn()}}));
    vi.doMock("@/../emails/_registry", () => {
      mockRegistryImport();
      return {
        emailTemplates: {},
      };
    });

    await import("./sendEmail");

    expect(mockRegistryImport).not.toHaveBeenCalled();
  });
});
