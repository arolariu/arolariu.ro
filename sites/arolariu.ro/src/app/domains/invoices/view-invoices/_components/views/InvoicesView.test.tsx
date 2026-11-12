/**
 * @fileoverview Unit tests for the invoices list view (filters, view modes, sorting, and pagination).
 * @module app/domains/invoices/view-invoices/_components/views/InvoicesView.test
 *
 * @remarks
 * The real `useInvoiceFilters`, `useFilteredInvoices`, `usePaginationWithSearch`, `FilterBar`, `TableView`,
 * `GridView`, `DialogProvider`, and IndexedDB-persisted stores (backed by `fake-indexeddb`) all run unmodified.
 * Only the external Next.js navigation runtime is replaced, by a minimal in-memory URL so `router.replace`
 * updates the search params the view reads back, the same way the App Router would.
 */

import {useInvoicesStore, useMerchantsStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {act, render, screen, type RenderResult} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice, buildPaymentInformation} from "../../../../../../../tests/helpers/invoiceDomain";
import {DialogProvider} from "../../../_contexts/DialogContext";
import RenderInvoicesView from "./InvoicesView";

const navigation = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state: {search: string; replacements: string[]} = {search: "", replacements: []};

  return {
    pathname: "/domains/invoices/view-invoices",
    state,
    getSearch: (): string => state.search,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    replace(href: string): void {
      state.replacements.push(href);
      const queryStart = href.indexOf("?");
      state.search = queryStart === -1 ? "" : href.slice(queryStart + 1);
      for (const listener of listeners) {
        listener();
      }
    },
    reset(search: string): void {
      state.search = search;
      state.replacements = [];
    },
  };
});

vi.mock("next/navigation", async () => {
  const {useMemo, useSyncExternalStore} = await import("react");
  const router = {
    push: () => undefined,
    replace: (href: string) => navigation.replace(href),
    prefetch: () => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
  };

  return {
    useRouter: () => router,
    usePathname: () => navigation.pathname,
    useSearchParams: () => {
      const search = useSyncExternalStore(navigation.subscribe, navigation.getSearch, navigation.getSearch);
      return useMemo(() => new URLSearchParams(search), [search]);
    },
  };
});

const PATHNAME = navigation.pathname;
const TABLE_REGION = "pages.invoices.viewInvoices.tableView.aria.table";
const UNKNOWN_MERCHANT = "pages.invoices.viewInvoices.gridView.unknownMerchant";
const NEXT_PAGE = "pages.invoices.viewInvoices.tableView.nextPage";
const PREVIOUS_PAGE = "pages.invoices.viewInvoices.tableView.previousPage";
const ROWS_PER_PAGE = "pages.invoices.viewInvoices.tableView.aria.rowsPerPage";
const CLEAR_FILTERS = "forms.invoices.filters.clear";
const NAMED_INVOICE = /^(Alpha market|Bravo bakery|Charlie cafe)$/u;
const NUMBERED_INVOICE = /^Invoice \d{2}$/u;

function buildDatedInvoice(id: string, name: string, transactionDate: string, totalCostAmount: number): Invoice {
  return buildInvoice({
    id,
    name,
    paymentInformation: buildPaymentInformation({transactionDate: new Date(transactionDate), totalCostAmount}),
  });
}

/** Three invoices whose date, amount, and name orders are all different. */
const namedInvoices: ReadonlyArray<Invoice> = [
  buildDatedInvoice("11111111-1111-4111-8111-111111111111", "Bravo bakery", "2026-01-10T10:00:00.000Z", 20),
  buildDatedInvoice("22222222-2222-4222-8222-222222222222", "Alpha market", "2026-02-10T10:00:00.000Z", 10),
  buildDatedInvoice("33333333-3333-4333-8333-333333333333", "Charlie cafe", "2026-03-10T10:00:00.000Z", 30),
];

/** Twenty-five invoices spread over consecutive days: two pages at the default page size of 20. */
const numberedInvoices: ReadonlyArray<Invoice> = Array.from({length: 25}, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return buildDatedInvoice(
    `00000000-0000-4000-8000-0000000000${number}`,
    `Invoice ${number}`,
    `2026-01-${number}T10:00:00.000Z`,
    index + 1,
  );
});

type RenderedView = RenderResult & {user: ReturnType<typeof userEvent.setup>};

function renderView(invoices: ReadonlyArray<Invoice>, search = ""): RenderedView {
  navigation.reset(search);
  act(() => {
    useInvoicesStore.setState({entities: [...invoices], selectedEntities: [], hasHydrated: true});
  });
  const user = userEvent.setup();
  const result = render(
    <DialogProvider>
      <RenderInvoicesView invoices={invoices} />
    </DialogProvider>,
  );
  return {...result, user};
}

function renderedNames(pattern: RegExp): string[] {
  return screen.queryAllByText(pattern).map((element) => element.textContent ?? "");
}

function getViewToggle(mode: "table" | "grid"): HTMLElement {
  return screen.getByRole("button", {name: `pages.invoices.viewInvoices.invoicesView.viewModes.${mode}`});
}

describe("RenderInvoicesView", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion elements unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    await act(async () => {
      await useInvoicesStore.persist.rehydrate();
      await useMerchantsStore.persist.rehydrate();
    });
    act(() => {
      useMerchantsStore.setState({entities: [], selectedEntities: [], hasHydrated: true});
    });
  });

  describe("view mode", () => {
    it("renders a newest-first table by default without rewriting the URL", () => {
      // Arrange & Act
      renderView(namedInvoices);

      // Assert
      expect(screen.getByRole("region", {name: TABLE_REGION})).toBeInTheDocument();
      expect(renderedNames(NAMED_INVOICE)).toEqual(["Charlie cafe", "Alpha market", "Bravo bakery"]);
      expect(screen.queryByText(UNKNOWN_MERCHANT)).not.toBeInTheDocument();
      expect(navigation.state.replacements).toEqual([]);
    });

    it("renders invoice cards instead of a table when the URL selects the grid view", () => {
      // Arrange & Act
      renderView(namedInvoices, "view=grid");

      // Assert
      expect(screen.queryByRole("region", {name: TABLE_REGION})).not.toBeInTheDocument();
      expect(screen.getAllByText(UNKNOWN_MERCHANT)).toHaveLength(namedInvoices.length);
      expect(renderedNames(NAMED_INVOICE)).toEqual(["Charlie cafe", "Alpha market", "Bravo bakery"]);
      expect(navigation.state.replacements).toEqual([]);
    });

    it("falls back to the table view without rewriting the URL when the view parameter is empty", () => {
      // Arrange & Act
      renderView(namedInvoices, "view=");

      // Assert
      expect(navigation.state.replacements).toEqual([]);
      expect(screen.getByRole("region", {name: TABLE_REGION})).toBeInTheDocument();
      expect(screen.queryByText(UNKNOWN_MERCHANT)).not.toBeInTheDocument();
    });

    it("switches between the grid and table views from the view toggle", async () => {
      // Arrange
      const {user} = renderView(namedInvoices);

      // Act
      await user.click(getViewToggle("grid"));

      // Assert
      expect(navigation.state.replacements).toEqual([`${PATHNAME}?view=grid`]);
      expect(screen.queryByRole("region", {name: TABLE_REGION})).not.toBeInTheDocument();
      expect(screen.getAllByText(UNKNOWN_MERCHANT)).toHaveLength(namedInvoices.length);

      // Act
      await user.click(getViewToggle("table"));

      // Assert
      expect(navigation.state.replacements).toEqual([`${PATHNAME}?view=grid`, PATHNAME]);
      expect(screen.getByRole("region", {name: TABLE_REGION})).toBeInTheDocument();
      expect(screen.queryByText(UNKNOWN_MERCHANT)).not.toBeInTheDocument();
    });

    describe("on a mobile viewport", () => {
      beforeEach(() => {
        vi.stubGlobal("innerWidth", 375);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it("defaults to the grid view when the URL does not choose a view", () => {
        // Arrange & Act
        renderView(namedInvoices);

        // Assert
        expect(screen.queryByRole("region", {name: TABLE_REGION})).not.toBeInTheDocument();
        expect(screen.getAllByText(UNKNOWN_MERCHANT)).toHaveLength(namedInvoices.length);
        expect(navigation.state.replacements).toEqual([]);
      });

      it("honours a table view chosen in the URL", () => {
        // Arrange & Act
        renderView(namedInvoices, "view=table");

        // Assert
        expect(screen.getByRole("region", {name: TABLE_REGION})).toBeInTheDocument();
        expect(screen.queryByText(UNKNOWN_MERCHANT)).not.toBeInTheDocument();
      });

      it("keeps the table view once the user picks it, even though the URL omits the default table view", async () => {
        // Arrange
        const {user} = renderView(namedInvoices);

        // Act
        await user.click(getViewToggle("table"));

        // Assert
        expect(navigation.state.replacements).toEqual([PATHNAME]);
        expect(screen.getByRole("region", {name: TABLE_REGION})).toBeInTheDocument();
        expect(screen.queryByText(UNKNOWN_MERCHANT)).not.toBeInTheDocument();
      });
    });
  });

  describe("sorting", () => {
    it("reverses the active date sort each time its column header is clicked", async () => {
      // Arrange
      const {user} = renderView(namedInvoices);

      // Act
      await user.click(screen.getByRole("columnheader", {name: /tableView\.columns\.date/u}));

      // Assert
      expect(navigation.state.replacements).toEqual([`${PATHNAME}?sortBy=date&sortOrder=asc`]);
      expect(renderedNames(NAMED_INVOICE)).toEqual(["Bravo bakery", "Alpha market", "Charlie cafe"]);

      // Act
      await user.click(screen.getByRole("columnheader", {name: /tableView\.columns\.date/u}));

      // Assert
      expect(navigation.state.replacements.at(-1)).toBe(PATHNAME);
      expect(renderedNames(NAMED_INVOICE)).toEqual(["Charlie cafe", "Alpha market", "Bravo bakery"]);
    });

    it.each([
      {
        column: /tableView\.columns\.amount/u,
        label: "amount column from highest to lowest",
        href: `${PATHNAME}?sortBy=amount&sortOrder=desc`,
        order: ["Charlie cafe", "Bravo bakery", "Alpha market"],
      },
      {
        column: /tableView\.columns\.invoice/u,
        label: "name column alphabetically",
        href: `${PATHNAME}?sortBy=name&sortOrder=asc`,
        order: ["Alpha market", "Bravo bakery", "Charlie cafe"],
      },
    ])("sorts a newly chosen $label", async ({column, href, order}) => {
      // Arrange
      const {user} = renderView(namedInvoices);

      // Act
      await user.click(screen.getByRole("columnheader", {name: column}));

      // Assert
      expect(navigation.state.replacements).toEqual([href]);
      expect(renderedNames(NAMED_INVOICE)).toEqual(order);
    });
  });

  describe("pagination", () => {
    it("moves between pages and stays put when asked to go before the first or past the last page", async () => {
      // Arrange
      const {user} = renderView(numberedInvoices);
      expect(renderedNames(NUMBERED_INVOICE)).toHaveLength(20);
      expect(renderedNames(NUMBERED_INVOICE)[0]).toBe("Invoice 25");

      // Act & Assert: previous on the first page is ignored.
      await user.click(screen.getByRole("button", {name: PREVIOUS_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)[0]).toBe("Invoice 25");

      // Act & Assert: next shows the remaining invoices.
      await user.click(screen.getByRole("button", {name: NEXT_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)).toEqual(["Invoice 05", "Invoice 04", "Invoice 03", "Invoice 02", "Invoice 01"]);

      // Act & Assert: next on the last page is ignored.
      await user.click(screen.getByRole("button", {name: NEXT_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)).toEqual(["Invoice 05", "Invoice 04", "Invoice 03", "Invoice 02", "Invoice 01"]);

      // Act & Assert: previous returns to the first page.
      await user.click(screen.getByRole("button", {name: PREVIOUS_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)[0]).toBe("Invoice 25");
      expect(screen.queryByText("Invoice 05")).not.toBeInTheDocument();
    });

    it("returns to the first page when the sort column changes", async () => {
      // Arrange
      const {user} = renderView(numberedInvoices);
      await user.click(screen.getByRole("button", {name: NEXT_PAGE}));
      expect(screen.getByText("Invoice 01")).toBeInTheDocument();

      // Act
      await user.click(screen.getByRole("columnheader", {name: /tableView\.columns\.invoice/u}));

      // Assert
      const names = renderedNames(NUMBERED_INVOICE);
      expect(names).toHaveLength(20);
      expect(names[0]).toBe("Invoice 01");
      expect(screen.queryByText("Invoice 21")).not.toBeInTheDocument();
    });

    it("returns to the first page when the rows-per-page size changes", async () => {
      // Arrange
      const {user} = renderView(numberedInvoices);
      await user.click(screen.getByRole("button", {name: NEXT_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)[0]).toBe("Invoice 05");

      // Act
      await user.click(screen.getByRole("combobox", {name: ROWS_PER_PAGE}));
      await user.click(await screen.findByRole("option", {name: "10"}));

      // Assert
      const names = renderedNames(NUMBERED_INVOICE);
      expect(names).toHaveLength(10);
      expect(names[0]).toBe("Invoice 25");
      expect(screen.queryByText("Invoice 15")).not.toBeInTheDocument();
    });

    it("returns to the first page when the active filters are cleared", async () => {
      // Arrange
      const {user} = renderView(numberedInvoices, "sortBy=name&sortOrder=asc");
      await user.click(screen.getByRole("button", {name: NEXT_PAGE}));
      expect(renderedNames(NUMBERED_INVOICE)).toEqual(["Invoice 21", "Invoice 22", "Invoice 23", "Invoice 24", "Invoice 25"]);

      // Act
      await user.click(screen.getByRole("button", {name: CLEAR_FILTERS}));

      // Assert
      expect(navigation.state.replacements).toEqual([PATHNAME]);
      const names = renderedNames(NUMBERED_INVOICE);
      expect(names).toHaveLength(20);
      expect(names[0]).toBe("Invoice 25");
      expect(names).toContain("Invoice 06");
      expect(screen.queryByText("Invoice 05")).not.toBeInTheDocument();
    });
  });
});
