import {afterEach, describe, expect, it, vi} from "vitest";

describe("email i18n import graph", () => {
  afterEach(() => {
    vi.doUnmock("next-intl-selector");
    vi.resetModules();
  });

  it("does not import next-intl-selector at module evaluation time", async () => {
    const mockSelectorImport = vi.fn();

    vi.doMock("next-intl-selector", () => {
      mockSelectorImport();
      return {
        createTranslator: vi.fn(),
        selectorFromPath: vi.fn((path: string) => path),
      };
    });

    const i18n = await import("./i18n");

    expect(mockSelectorImport).not.toHaveBeenCalled();
    expect(i18n.selectorFromPath("emails.welcome.subject")).toBe("emails.welcome.subject");
  });
});
