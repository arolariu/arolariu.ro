import {describe, expect, it} from "vitest";
import {DEFAULT_LOCALE, getEmailSubject, loadMessages, SUPPORTED_LOCALES} from "./index";

describe("emails/_i18n", () => {
  describe("constants", () => {
    it("DEFAULT_LOCALE is 'en'", () => {
      expect(DEFAULT_LOCALE).toBe("en");
    });

    it("SUPPORTED_LOCALES contains en, ro, fr", () => {
      expect(SUPPORTED_LOCALES).toEqual(["en", "ro", "fr"]);
    });
  });

  describe("loadMessages", () => {
    it.each(["en", "ro", "fr"] as const)("loads %s messages with an 'email' namespace", async (locale) => {
      const messages = await loadMessages(locale);
      expect(messages).toBeTypeOf("object");
      expect((messages as Record<string, unknown>)["email"]).toBeTypeOf("object");
    });

    it("defaults to 'en' when no locale is passed", async () => {
      const enMessages = await loadMessages();
      const explicit = await loadMessages("en");
      expect(enMessages).toEqual(explicit);
    });
  });

  describe("getEmailSubject", () => {
    it("resolves a subject from email.welcome with ICU interpolation", async () => {
      const subject = await getEmailSubject("email.welcome", "en", {brand: "arolariu.ro"});
      expect(subject).toContain("arolariu.ro");
    });

    it("interpolates ICU variables for invoiceShared", async () => {
      const subject = await getEmailSubject("email.invoiceShared", "en", {fromName: "Alex"});
      expect(subject).toContain("Alex");
    });

    it("defaults locale to 'en' when omitted", async () => {
      const enSubject = await getEmailSubject("email.welcome", undefined, {brand: "X"});
      const explicit = await getEmailSubject("email.welcome", "en", {brand: "X"});
      expect(enSubject).toBe(explicit);
    });

    it("returns the Romanian subject when locale='ro'", async () => {
      const ro = await getEmailSubject("email.welcome", "ro", {brand: "arolariu.ro"});
      const en = await getEmailSubject("email.welcome", "en", {brand: "arolariu.ro"});
      expect(ro).not.toBe(en);
    });
  });
});
