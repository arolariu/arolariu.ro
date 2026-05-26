import {describe, expect, it} from "vitest";

import {
  BRAND,
  BulletList,
  DonutChart,
  EmailCard,
  EmailHrStyles,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
  MetricsGrid,
} from "./index";

describe("email component barrel", () => {
  it("exports shared email components and tokens", () => {
    expect(BRAND.name).toBeTruthy();
    expect(BulletList).toBeTypeOf("function");
    expect(DonutChart).toBeTypeOf("function");
    expect(EmailCard).toBeTypeOf("function");
    expect(EmailLayout).toBeTypeOf("function");
    expect(KeyValueTable).toBeTypeOf("function");
    expect(MetricsGrid).toBeTypeOf("function");
    expect(EmailHrStyles).toBeTypeOf("object");
    expect(EmailLinkStyles).toBeTypeOf("object");
    expect(EmailParagraphStyles).toBeTypeOf("object");
  });
});
