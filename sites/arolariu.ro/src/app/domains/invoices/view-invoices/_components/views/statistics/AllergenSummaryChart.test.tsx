import enMessages from "../../../../../../../../messages/en.json";
import frMessages from "../../../../../../../../messages/fr.json";
import roMessages from "../../../../../../../../messages/ro.json";
import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it} from "vitest";
import {AllergenCode} from "@/types/invoices";
import {AllergenSummaryChart} from "./AllergenSummaryChart";
import {Default, Empty} from "./AllergenSummaryChart.stories";

describe("AllergenSummaryChart", () => {
  it("labels signal percentages with the assessed-product denominator", () => {
    render(
      <NextIntlClientProvider
        locale='en'
        messages={enMessages}>
        <AllergenSummaryChart
          data={[{name: AllergenCode.Milk, description: "milk", productCount: 1, percentage: 50}]}
          coverage={{
            assessedProductCount: 2,
            insufficientDataProductCount: 1,
            unassessedProductCount: 1,
            totalProductCount: 4,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("cards.invoices.statistics.allergenSummary.stats.ofAssessedProducts")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("reports empty signal coverage without asserting a positive safety outcome", () => {
    render(
      <NextIntlClientProvider
        locale='en'
        messages={enMessages}>
        <AllergenSummaryChart
          data={[]}
          coverage={{
            assessedProductCount: 0,
            insufficientDataProductCount: 1,
            unassessedProductCount: 2,
            totalProductCount: 3,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("cards.invoices.statistics.allergenSummary.empty")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("keeps the assessed-products label parallel in every supported locale", () => {
    expect(enMessages.cards.invoices.statistics.allergenSummary.stats.ofAssessedProducts).toBe("of assessed products");
    expect(roMessages.cards.invoices.statistics.allergenSummary.stats.ofAssessedProducts).toBe("din produsele evaluate");
    expect(frMessages.cards.invoices.statistics.allergenSummary.stats.ofAssessedProducts).toBe("des produits évalués");
  });

  it("supplies coherent calculated coverage to real Storybook component stories", () => {
    expect(Default.render).toBeTypeOf("function");
    expect(Default.args?.coverage).toEqual({
      assessedProductCount: 3,
      insufficientDataProductCount: 0,
      unassessedProductCount: 0,
      totalProductCount: 3,
    });
    expect(Empty.render).toBeTypeOf("function");
    expect(Empty.args?.coverage).toEqual({
      assessedProductCount: 0,
      insufficientDataProductCount: 1,
      unassessedProductCount: 1,
      totalProductCount: 2,
    });
  });
});
