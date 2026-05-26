import {selectorFromPath} from "next-intl-selector";
import {beforeEach, describe, expect, it, vi} from "vitest";

import * as i18n from "../_lib/i18n";
import {__resetLayoutTranslatorCache, getLayoutTranslator} from "./layoutTranslator";

const FIXTURE = {email: {layout: {tagline: "Tag", buttonFallback: "BF"}}};

describe("getLayoutTranslator", () => {
  beforeEach(() => {
    __resetLayoutTranslatorCache();
    vi.restoreAllMocks();
  });

  it("constructs on first call per locale", async () => {
    const loadSpy = vi.spyOn(i18n, "loadMessages").mockResolvedValue(FIXTURE);
    const createSpy = vi.spyOn(i18n, "createEmailTranslator");
    await getLayoutTranslator("en");
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("returns the cached translator on subsequent calls for the same locale", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValue(FIXTURE);
    const createSpy = vi.spyOn(i18n, "createEmailTranslator");
    const first = await getLayoutTranslator("en");
    const second = await getLayoutTranslator("en");
    const third = await getLayoutTranslator("en");
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("caches independently per locale", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValue(FIXTURE);
    const createSpy = vi.spyOn(i18n, "createEmailTranslator");
    const en1 = await getLayoutTranslator("en");
    const ro1 = await getLayoutTranslator("ro");
    const en2 = await getLayoutTranslator("en");
    const fr1 = await getLayoutTranslator("fr");
    expect(en1).toBe(en2);
    expect(en1).not.toBe(ro1);
    expect(ro1).not.toBe(fr1);
    expect(createSpy).toHaveBeenCalledTimes(3); // one per locale
  });

  it("returns translators that resolve namespace 'email.layout' keys", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValue(FIXTURE);
    const t = await getLayoutTranslator("en");
    expect(t(selectorFromPath("emails.layout.tagline"))).toBe("Tag");
    expect(t(selectorFromPath("emails.layout.buttonFallback"))).toBe("BF");
  });

  it("__resetLayoutTranslatorCache clears the cache", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValue(FIXTURE);
    const createSpy = vi.spyOn(i18n, "createEmailTranslator");
    await getLayoutTranslator("en");
    __resetLayoutTranslatorCache();
    await getLayoutTranslator("en");
    expect(createSpy).toHaveBeenCalledTimes(2);
  });
});
