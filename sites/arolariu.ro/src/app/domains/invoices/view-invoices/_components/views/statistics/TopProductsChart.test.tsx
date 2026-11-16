/**
 * @fileoverview Unit tests for the TopProductsChart leaderboard table and its rank badges.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/TopProductsChart.test
 */

import {render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import type {TopProduct} from "../../../_utils/statistics";
import {TopProductsChart} from "./TopProductsChart";

const TITLE_KEY = "cards.invoices.statistics.topProducts.title";
const DESCRIPTION_KEY = "cards.invoices.statistics.topProducts.description";
const EMPTY_KEY = "cards.invoices.statistics.topProducts.empty";
const ARIA_LABEL_KEY = "cards.invoices.statistics.topProducts.ariaLabel";

const HEADER_KEYS = ["rank", "product", "quantity", "totalSpent", "purchases", "avgPrice"].map(
  (header) => `cards.invoices.statistics.topProducts.headers.${header}`,
);

function makeProduct(name: string, totalSpent: number, overrides: Partial<TopProduct> = {}): TopProduct {
  return {name, totalQuantity: 3, totalSpent, purchaseCount: 2, averagePrice: totalSpent / 3, ...overrides};
}

const products: TopProduct[] = [
  makeProduct("Espresso Beans", 1234.5, {totalQuantity: 12.5, purchaseCount: 7, averagePrice: 98.76}),
  makeProduct("Olive Oil", 300),
  makeProduct("Sourdough", 150),
  makeProduct("Sparkling Water", 42),
  makeProduct("Sea Salt", 9),
];

/** Matches a class-name token for any CSS-module naming strategy (`gold` or `_gold_hash`). */
function hasClassToken(element: Element, token: string): boolean {
  return new RegExp(`(^|[\\s_])${token}([\\s_]|$)`, "u").test(element.className);
}

function getBodyRows(): HTMLElement[] {
  const table = screen.getByRole("table", {name: ARIA_LABEL_KEY});
  const [, body] = within(table).getAllByRole("rowgroup");
  if (body === undefined) throw new Error("Table body row group did not render.");
  return within(body).getAllByRole("row");
}

describe("TopProductsChart", () => {
  it("renders the empty state instead of a table when there are no products", () => {
    render(
      <TopProductsChart
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText(TITLE_KEY)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION_KEY)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_KEY)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders an accessible leaderboard table with every translated column header", () => {
    render(
      <TopProductsChart
        data={products}
        currency='RON'
      />,
    );

    expect(screen.getByText(TITLE_KEY)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION_KEY)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_KEY)).not.toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(HEADER_KEYS);
  });

  it("renders one row per product in the supplied order", () => {
    render(
      <TopProductsChart
        data={products}
        currency='RON'
      />,
    );

    const rows = getBodyRows();
    expect(rows).toHaveLength(products.length);
    for (const [index, product] of products.entries()) {
      const row = rows[index];
      if (row === undefined) throw new Error(`Missing row ${index}`);
      expect(within(row).getByTitle(product.name)).toHaveTextContent(product.name);
    }
  });

  it("formats quantity, spending, purchase count, and average price with the currency code", () => {
    render(
      <TopProductsChart
        data={products}
        currency='EUR'
      />,
    );

    const [firstRow] = getBodyRows();
    if (firstRow === undefined) throw new Error("Missing first row");
    const cells = within(firstRow)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);

    expect(cells.slice(1)).toEqual(["Espresso Beans", "12.50", "1,234.50 EUR", "7", "98.76 EUR"]);
    expect(within(firstRow).queryByText(/RON/u)).not.toBeInTheDocument();
  });

  it("decorates the top three ranks with medal badges and shows numeric ranks afterwards", () => {
    render(
      <TopProductsChart
        data={products}
        currency='RON'
      />,
    );

    const badges = getBodyRows().map((row) => {
      const [rankCell] = within(row).getAllByRole("cell");
      const badge = rankCell?.firstElementChild;
      if (badge === null || badge === undefined) throw new Error("Rank badge did not render.");
      return badge;
    });
    const [gold, silver, bronze, fourth, fifth] = badges;

    expect(gold && hasClassToken(gold, "gold")).toBe(true);
    expect(silver && hasClassToken(silver, "silver")).toBe(true);
    expect(bronze && hasClassToken(bronze, "bronze")).toBe(true);
    for (const medal of [gold, silver, bronze]) {
      expect(medal?.querySelector("svg")).not.toBeNull();
      expect(medal?.textContent).toBe("");
    }

    expect(fourth?.textContent).toBe("4");
    expect(fifth?.textContent).toBe("5");
    for (const plain of [fourth, fifth]) {
      expect(plain?.querySelector("svg")).toBeNull();
      expect(plain && ["gold", "silver", "bronze"].some((token) => hasClassToken(plain, token))).toBe(false);
    }
  });
});
