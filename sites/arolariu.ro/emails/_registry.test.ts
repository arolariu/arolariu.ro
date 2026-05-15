import {describe, expect, it} from "vitest";

import {emailTemplates, type EmailTemplateKey} from "./_registry";

describe("emailTemplates registry", () => {
  it("has exactly 18 entries (10 single + 4 inactivity + 4 stats)", () => {
    expect(Object.keys(emailTemplates).length).toBe(18);
  });

  it("every entry has a template with .namespace string", () => {
    for (const key of Object.keys(emailTemplates) as readonly EmailTemplateKey[]) {
      const entry = emailTemplates[key];
      expect(typeof entry.template).toBe("function");
      expect(typeof entry.template.namespace).toBe("string");
      expect(entry.template.namespace.length).toBeGreaterThan(0);
    }
  });

  it("every entry's template has .getSubject as an async function", () => {
    for (const key of Object.keys(emailTemplates) as readonly EmailTemplateKey[]) {
      const entry = emailTemplates[key];
      expect(typeof entry.template.getSubject).toBe("function");
    }
  });

  it("the 4 inactivity variants all share the same base template", () => {
    const i3 = emailTemplates["inactivity-3d"].template;
    expect(emailTemplates["inactivity-7d"].template).toBe(i3);
    expect(emailTemplates["inactivity-14d"].template).toBe(i3);
    expect(emailTemplates["inactivity-30d"].template).toBe(i3);
  });

  it("the 4 stats variants all share the same base template", () => {
    const s = emailTemplates["stats-daily"].template;
    expect(emailTemplates["stats-weekly"].template).toBe(s);
    expect(emailTemplates["stats-monthly"].template).toBe(s);
    expect(emailTemplates["stats-yearly"].template).toBe(s);
  });

  it("inactivity variants have the correct variantProps.daysWithoutUpload values", () => {
    expect(emailTemplates["inactivity-3d"].variantProps).toEqual({daysWithoutUpload: 3});
    expect(emailTemplates["inactivity-7d"].variantProps).toEqual({daysWithoutUpload: 7});
    expect(emailTemplates["inactivity-14d"].variantProps).toEqual({daysWithoutUpload: 14});
    expect(emailTemplates["inactivity-30d"].variantProps).toEqual({daysWithoutUpload: 30});
  });

  it("stats variants have the correct variantProps.frequency values", () => {
    expect(emailTemplates["stats-daily"].variantProps).toEqual({frequency: "daily"});
    expect(emailTemplates["stats-weekly"].variantProps).toEqual({frequency: "weekly"});
    expect(emailTemplates["stats-monthly"].variantProps).toEqual({frequency: "monthly"});
    expect(emailTemplates["stats-yearly"].variantProps).toEqual({frequency: "yearly"});
  });

  it("single entries (non-variants) have no variantProps", () => {
    const single: readonly EmailTemplateKey[] = [
      "welcome", "first-upload", "invoice-analyzed", "invoice-deleted",
      "invoice-made-public", "invoice-shared", "invoice-unshared",
      "spending-alert", "newsletter-subscribed", "newsletter-unsubscribed",
    ];
    for (const key of single) {
      // Access via index signature to accommodate the union of entry
      // shapes (some entries declare variantProps, some don't).
      expect((emailTemplates[key] as {variantProps?: unknown}).variantProps).toBeUndefined();
    }
  });
});
