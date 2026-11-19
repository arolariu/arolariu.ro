import {render} from "react-email";
import {describe, expect, it} from "vitest";
import SpendingThresholdAlertEmail from "./SpendingThresholdAlertEmail";

const budget = {
  category: "Groceries",
  period: "November 2026",
  budgetLimit: "500.00 RON",
  categoryBreakdown: [{label: "Groceries", value: 450}],
  chartImageUrl: "https://example.test/expenses.png",
} as const;

describe("SpendingThresholdAlertEmail", () => {
  it("shows the amount remaining and links to the supplied dashboard below the limit", async () => {
    const dashboardUrl = "https://example.test/my-budget";

    const html = await render(
      await SpendingThresholdAlertEmail({
        ...budget,
        username: "Alex",
        currentSpending: "450.00 RON",
        remainingBudget: "50.00 RON",
        thresholdPercent: 90,
        dashboardUrl,
      }),
    );

    expect(html).toContain("Hi Alex,");
    expect(html).toContain("Almost there: 90% of your budget used");
    expect(html).toContain(">50.00 RON<");
    expect(html).toContain(`href="${dashboardUrl}"`);
    expect(html).toContain(`src="${budget.chartImageUrl}"`);
    expect(html).not.toContain("Your spending has reached or exceeded the budget");
  });

  it("shows a warning, defaults the dashboard, and omits the chart when no breakdown is available", async () => {
    const html = await render(
      await SpendingThresholdAlertEmail({
        ...budget,
        username: " ",
        currentSpending: "500.00 RON",
        remainingBudget: "0.00 RON",
        thresholdPercent: 100,
        categoryBreakdown: [],
      }),
    );

    expect(html).toContain("Hi there,");
    expect(html).toContain("Your spending has reached or exceeded the budget");
    expect(html).toContain(">Over budget<");
    expect(html).not.toContain(">0.00 RON<");
    expect(html).not.toContain(budget.chartImageUrl);
    expect(html).toContain('href="https://arolariu.ro/domains/invoices/view-invoices"');
  });
});
