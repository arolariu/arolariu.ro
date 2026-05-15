import {describe, expect, it} from "vitest";
import type {ReactNode} from "react";
import {createEmailTranslator, DEFAULT_LOCALE, type EmailMessages, getEmailSubject, loadMessages, SUPPORTED_LOCALES} from "./index";

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

describe("createEmailTranslator (real next-intl runtime)", () => {
  const fixture: EmailMessages = {
    email: {
      welcome: {
        greeting: "Hi {name}",
        body: "Click <link>here</link> to continue.",
        bothEnds: "<from>Alex</from> shared with <to>Jane</to>.",
        outOfOrder: "Read more at <link>this link</link> and then <link>that link</link>.",
        plural: "{count, plural, one {# invoice} other {# invoices}}",
      },
    },
  };

  it("interpolates scalar vars", () => {
    const t = createEmailTranslator({locale: "en", messages: fixture, namespace: "email.welcome"});
    expect(t("greeting", {name: "Alex"})).toBe("Hi Alex");
  });

  it("handles plural cases via ICU", () => {
    const t = createEmailTranslator({locale: "en", messages: fixture, namespace: "email.welcome"});
    expect(t("plural", {count: 1})).toBe("1 invoice");
    expect(t("plural", {count: 5})).toBe("5 invoices");
  });

  it("handles t.rich with a single tag", () => {
    const t = createEmailTranslator({locale: "en", messages: fixture, namespace: "email.welcome"});
    const out = t.rich("body", {link: (chunks?: ReactNode) => `[${chunks as string}]`});
    expect(String(Array.isArray(out) ? out.join("") : out)).toContain("[here]");
  });

  it("handles t.rich with different tags", () => {
    const t = createEmailTranslator({locale: "en", messages: fixture, namespace: "email.welcome"});
    const out = t.rich("bothEnds", {
      from: (chunks?: ReactNode) => `FROM(${chunks as string})`,
      to: (chunks?: ReactNode) => `TO(${chunks as string})`,
    });
    const joined = String(Array.isArray(out) ? out.join("") : out);
    expect(joined).toContain("FROM(Alex)");
    expect(joined).toContain("TO(Jane)");
  });

  it("handles t.rich with a tag appearing twice in the same message", () => {
    const t = createEmailTranslator({locale: "en", messages: fixture, namespace: "email.welcome"});
    let calls = 0;
    const out = t.rich("outOfOrder", {link: (chunks?: ReactNode) => `[#${++calls}:${chunks as string}]`});
    const joined = String(Array.isArray(out) ? out.join("") : out);
    expect(joined).toContain("[#1:this link]");
    expect(joined).toContain("[#2:that link]");
  });
});
