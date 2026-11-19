import {render} from "react-email";
import {describe, expect, it} from "vitest";
import IncompleteInvoiceReminderEmail from "./IncompleteInvoiceReminderEmail";

const invoice = {
  invoiceName: "April receipt",
  analysisDate: "April 19, 2026",
  editInvoiceUrl: "https://example.test/edit/receipt",
} as const;

describe("IncompleteInvoiceReminderEmail", () => {
  it("uses the default greeting and shows only fixes for the missing fields", async () => {
    const html = await render(await IncompleteInvoiceReminderEmail({...invoice, username: " ", missingFields: ["merchant", "payment"]}));

    expect(html).toContain("Hi there,");
    expect(html).toContain("April receipt");
    expect(html).toContain("April 19, 2026");
    expect(html).toContain("Add the store name manually in the edit view");
    expect(html).toContain("Enter the total amount and payment method in the edit view");
    expect(html).not.toContain("Try re-uploading a clearer photo, or add items manually");
    expect(html).toContain(`href="${invoice.editInvoiceUrl}"`);
    expect(html).not.toContain("Re-run analysis");
  });

  it("uses the supplied locale and links to analysis when a retry URL is available", async () => {
    const reanalyzeUrl = "https://example.test/analyze/receipt";

    const html = await render(
      await IncompleteInvoiceReminderEmail({...invoice, username: "Camille", missingFields: ["items"], reanalyzeUrl, locale: "fr"}),
    );

    expect(html).toContain("Bonjour Camille,");
    expect(html).toContain("Articles ligne par ligne");
    expect(html).not.toContain("Line items");
    expect(html).toContain(`href="${invoice.editInvoiceUrl}"`);
    expect(html).toContain(`href="${reanalyzeUrl}"`);
  });
});
