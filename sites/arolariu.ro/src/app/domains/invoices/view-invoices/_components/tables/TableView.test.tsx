/**
 * @fileoverview Unit tests for the paginated, sortable, selectable invoices TableView.
 * @module app/domains/invoices/view-invoices/_components/tables/TableView.test
 *
 * @remarks
 * The real IndexedDB-persisted invoices store (backed by `fake-indexeddb`) owns the selection and the real
 * invoice `DialogProvider` backs the row action menus. Only the parent-owned callbacks are test doubles.
 */

import {useInvoicesStore} from "@/stores";
import {ClassificationOrigin, ClassificationSystem, type Invoice, type StandardClassification} from "@/types/invoices";
import {act, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import type {ComponentProps} from "react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice, buildPaymentInformation} from "../../../../../../../tests/helpers/invoiceDomain";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {TableView} from "./TableView";

type TableViewProps = ComponentProps<typeof TableView>;
type SortField = "date" | "amount" | "name";

const T = "pages.invoices.viewInvoices.tableView";
const SELECT_INVOICE = `${T}.aria.selectInvoice`;
const SELECT_ALL = `${T}.aria.selectAllInvoices`;
const NAME_HEADER = new RegExp(`${T}\\.columns\\.invoice`, "u");
const DATE_HEADER = new RegExp(`${T}\\.columns\\.date`, "u");
const AMOUNT_HEADER = new RegExp(`${T}\\.columns\\.amount`, "u");
const ARROW_UP = "\u25B2";
const ARROW_DOWN = "\u25BC";

const breadClassification: StandardClassification = {
  system: ClassificationSystem.EcoicopV2,
  code: "01.1.1",
  version: "2",
  officialLabel: "Bread and cereals",
  hierarchy: [{level: "division", code: "01", officialLabel: "Food"}],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.9,
  evidence: [],
};

const alphaDate = new Date("2026-03-15T12:00:00.000Z");

const alphaInvoice: Invoice = buildInvoice({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Alpha market",
  classification: breadClassification,
  paymentInformation: buildPaymentInformation({transactionDate: alphaDate, totalCostAmount: 42.5}),
});

const unnamedInvoice: Invoice = buildInvoice({
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "",
  classification: null,
  paymentInformation: buildPaymentInformation({
    transactionDate: null as unknown as Date,
    totalCostAmount: 7,
    currency: {code: "EUR", symbol: "\u20AC", name: "Euro"},
  }),
});

const offPageInvoice: Invoice = buildInvoice({id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", name: "Off page"});

function seedSelection(selectedEntities: Invoice[]): void {
  act(() => {
    useInvoicesStore.setState({selectedEntities});
  });
}

function selectedIds(): string[] {
  return useInvoicesStore.getState().selectedEntities.map((invoice) => invoice.id);
}

function buildProps(overrides: Partial<TableViewProps> = {}): TableViewProps {
  return {
    invoices: [alphaInvoice, unnamedInvoice],
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: vi.fn<() => void>(),
    handleNextPage: vi.fn<() => void>(),
    handlePageSizeChange: vi.fn<(size: number) => void>(),
    sortBy: null,
    sortDirection: null,
    onSort: vi.fn<(field: SortField) => void>(),
    ...overrides,
  };
}

function renderTableView(props: TableViewProps): ReturnType<typeof render> {
  return render(
    <DialogProvider>
      <TableView {...props} />
    </DialogProvider>,
  );
}

function getBodyRow(text: string): HTMLElement {
  return screen.getByRole("row", {name: new RegExp(text, "u")});
}

/** Formats an amount like the UI and collapses the non-breaking space the way Testing Library normalizes DOM text. */
function expectedCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2})
    .format(amount)
    .replaceAll(/\s/gu, " ");
}

describe("TableView", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion components unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    await act(async () => {
      await useInvoicesStore.persist.rehydrate();
    });
    act(() => {
      useInvoicesStore.setState({entities: [], selectedEntities: [], hasHydrated: true});
    });
  });

  describe("empty state", () => {
    it("renders the upload call to action instead of a table when there are no invoices", () => {
      renderTableView(buildProps({invoices: []}));

      expect(screen.getByRole("heading", {name: `${T}.empty.title`})).toBeInTheDocument();
      expect(screen.getByText(`${T}.empty.description`)).toBeInTheDocument();
      expect(screen.getByRole("link", {name: `${T}.empty.uploadCta`})).toHaveAttribute("href", "/domains/invoices/upload-scans");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("switches from rows to the empty state without breaking hook order when the invoices disappear", () => {
      const props = buildProps();
      const view = renderTableView(props);
      expect(screen.getByRole("table")).toBeInTheDocument();

      view.rerender(
        <DialogProvider>
          <TableView
            {...props}
            invoices={[]}
          />
        </DialogProvider>,
      );

      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", {name: `${T}.empty.title`})).toBeInTheDocument();
    });
  });

  describe("rows", () => {
    it("renders the labelled table region with one row per invoice", () => {
      renderTableView(buildProps());

      expect(screen.getByRole("region", {name: `${T}.aria.table`})).toBeInTheDocument();
      // Header row plus one body row per invoice; no pagination footer for a single page.
      expect(screen.getAllByRole("row")).toHaveLength(3);
      expect(screen.getAllByRole("checkbox", {name: SELECT_INVOICE})).toHaveLength(2);
    });

    it("shows the invoice name, classification, short date, and formatted total for an analyzed invoice", () => {
      renderTableView(buildProps());

      const row = getBodyRow("Alpha market");
      const expectedDate = new Intl.DateTimeFormat("en", {dateStyle: "short"}).format(alphaDate);

      expect(within(row).getByText("Alpha market")).toBeInTheDocument();
      expect(within(row).getByText("Bread and cereals")).toBeInTheDocument();
      expect(within(row).getByText(expectedDate)).toBeInTheDocument();
      expect(within(row).getByText(expectedCurrency(42.5, "RON"))).toBeInTheDocument();
      expect(within(row).queryByText("Unclassified")).not.toBeInTheDocument();
      expect(within(row).queryByText("N/A")).not.toBeInTheDocument();
      expect(within(row).getByRole("link", {name: `${T}.viewInvoice`})).toHaveAttribute(
        "href",
        `/domains/invoices/view-invoice/${alphaInvoice.id}`,
      );
    });

    it("falls back to the invoice id, an unclassified badge, and an N/A date for an unanalyzed invoice", () => {
      renderTableView(buildProps());

      const row = getBodyRow(unnamedInvoice.id);

      // The id appears both as the visible fallback name and as the print-only identifier.
      expect(within(row).getAllByText(unnamedInvoice.id)).toHaveLength(2);
      expect(within(row).getByText("Unclassified")).toBeInTheDocument();
      expect(within(row).getByText("N/A")).toBeInTheDocument();
      expect(within(row).getByText(expectedCurrency(7, "EUR"))).toBeInTheDocument();
    });

    it("shows the invoice name and the id separately for a named invoice", () => {
      renderTableView(buildProps());

      const row = getBodyRow("Alpha market");

      expect(within(row).getAllByText(alphaInvoice.id)).toHaveLength(1);
    });
  });

  describe("selection", () => {
    it("adds an unselected invoice to the store selection and marks the header as partially selected", async () => {
      const user = userEvent.setup();
      renderTableView(buildProps());

      await user.click(within(getBodyRow("Alpha market")).getByRole("checkbox", {name: SELECT_INVOICE}));

      expect(selectedIds()).toEqual([alphaInvoice.id]);
      expect(within(getBodyRow("Alpha market")).getByRole("checkbox", {name: SELECT_INVOICE})).toHaveAttribute("aria-checked", "true");
      expect(within(getBodyRow(unnamedInvoice.id)).getByRole("checkbox", {name: SELECT_INVOICE})).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "mixed");
    });

    it("removes an already selected invoice while keeping the rest of the selection", async () => {
      seedSelection([offPageInvoice, alphaInvoice]);
      const user = userEvent.setup();
      renderTableView(buildProps());

      await user.click(within(getBodyRow("Alpha market")).getByRole("checkbox", {name: SELECT_INVOICE}));

      expect(selectedIds()).toEqual([offPageInvoice.id]);
      expect(within(getBodyRow("Alpha market")).getByRole("checkbox", {name: SELECT_INVOICE})).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "false");
    });

    it("selects every invoice on the page without duplicating ones that are already selected", async () => {
      seedSelection([offPageInvoice, alphaInvoice]);
      const user = userEvent.setup();
      renderTableView(buildProps());
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "mixed");

      await user.click(screen.getByRole("checkbox", {name: SELECT_ALL}));

      expect(selectedIds()).toEqual([offPageInvoice.id, alphaInvoice.id, unnamedInvoice.id]);
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "true");
      for (const checkbox of screen.getAllByRole("checkbox", {name: SELECT_INVOICE})) {
        expect(checkbox).toHaveAttribute("aria-checked", "true");
      }
    });

    it("clears only the current page from the selection when every page invoice is already selected", async () => {
      seedSelection([alphaInvoice, offPageInvoice, unnamedInvoice]);
      const user = userEvent.setup();
      renderTableView(buildProps());
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "true");

      await user.click(screen.getByRole("checkbox", {name: SELECT_ALL}));

      expect(selectedIds()).toEqual([offPageInvoice.id]);
      expect(screen.getByRole("checkbox", {name: SELECT_ALL})).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("sorting", () => {
    it.each([
      {header: NAME_HEADER, field: "name"},
      {header: DATE_HEADER, field: "date"},
      {header: AMOUNT_HEADER, field: "amount"},
    ] as const)("requests a $field sort when its header is clicked", async ({header, field}) => {
      const props = buildProps();
      const user = userEvent.setup();
      renderTableView(props);

      await user.click(screen.getByRole("columnheader", {name: header}));

      expect(props.onSort).toHaveBeenCalledTimes(1);
      expect(props.onSort).toHaveBeenCalledWith(field);
    });

    it.each([
      {header: NAME_HEADER, field: "name", key: "{Enter}"},
      {header: DATE_HEADER, field: "date", key: " "},
      {header: AMOUNT_HEADER, field: "amount", key: "{Enter}"},
    ] as const)("requests a $field sort when $key is pressed on its focused header", async ({header, field, key}) => {
      const props = buildProps();
      const user = userEvent.setup();
      renderTableView(props);

      screen.getByRole("columnheader", {name: header}).focus();
      await user.keyboard(key);

      expect(props.onSort).toHaveBeenCalledTimes(1);
      expect(props.onSort).toHaveBeenCalledWith(field);
    });

    it("ignores keys other than Enter and Space on a sortable header", async () => {
      const props = buildProps();
      const user = userEvent.setup();
      renderTableView(props);

      screen.getByRole("columnheader", {name: NAME_HEADER}).focus();
      await user.keyboard("a{Tab}");

      expect(props.onSort).not.toHaveBeenCalled();
    });

    it("marks every sortable header as unsorted with an upward arrow when no sort is active", () => {
      renderTableView(buildProps());

      for (const header of [NAME_HEADER, DATE_HEADER, AMOUNT_HEADER]) {
        const cell = screen.getByRole("columnheader", {name: header});
        expect(cell).toHaveAttribute("aria-sort", "none");
        expect(within(cell).getByText(ARROW_UP)).toBeInTheDocument();
      }
    });

    it.each([
      {field: "name", active: NAME_HEADER, others: [DATE_HEADER, AMOUNT_HEADER]},
      {field: "amount", active: AMOUNT_HEADER, others: [NAME_HEADER, DATE_HEADER]},
    ] as const)("marks only the actively sorted $field header as ascending", ({field, active, others}) => {
      renderTableView(buildProps({sortBy: field, sortDirection: "asc"}));

      const activeHeader = screen.getByRole("columnheader", {name: active});
      expect(activeHeader).toHaveAttribute("aria-sort", "ascending");
      expect(within(activeHeader).getByText(ARROW_UP)).toBeInTheDocument();
      for (const header of others) {
        expect(screen.getByRole("columnheader", {name: header})).toHaveAttribute("aria-sort", "none");
      }
    });

    it("marks the actively sorted header as descending with a downward arrow", () => {
      renderTableView(buildProps({sortBy: "date", sortDirection: "desc"}));

      const dateHeader = screen.getByRole("columnheader", {name: DATE_HEADER});
      expect(dateHeader).toHaveAttribute("aria-sort", "descending");
      expect(within(dateHeader).getByText(ARROW_DOWN)).toBeInTheDocument();
      expect(within(screen.getByRole("columnheader", {name: NAME_HEADER})).queryByText(ARROW_DOWN)).not.toBeInTheDocument();
      expect(screen.getByRole("columnheader", {name: NAME_HEADER})).toHaveAttribute("aria-sort", "none");
    });
  });

  describe("pagination", () => {
    it("hides the pagination footer when there is a single page", () => {
      renderTableView(buildProps({totalPages: 1}));

      expect(screen.queryByText(`${T}.rowsPerPage`)).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox", {name: `${T}.aria.rowsPerPage`})).not.toBeInTheDocument();
      expect(screen.queryByRole("button", {name: `${T}.nextPage`})).not.toBeInTheDocument();
    });

    it("shows the page size, page indicator, and enabled navigation buttons when there are several pages", () => {
      renderTableView(buildProps({currentPage: 2, totalPages: 5, pageSize: 20}));

      expect(screen.getByText(`${T}.rowsPerPage`)).toBeInTheDocument();
      expect(screen.getByText(`${T}.pageOf`)).toBeInTheDocument();
      expect(screen.getByRole("combobox", {name: `${T}.aria.rowsPerPage`})).toHaveTextContent("20");
      expect(screen.getByRole("button", {name: `${T}.previousPage`})).toBeEnabled();
      expect(screen.getByRole("button", {name: `${T}.nextPage`})).toBeEnabled();
    });

    it("forwards previous and next page requests to the parent", async () => {
      const props = buildProps({currentPage: 2, totalPages: 5});
      const user = userEvent.setup();
      renderTableView(props);

      await user.click(screen.getByRole("button", {name: `${T}.previousPage`}));
      expect(props.handlePrevPage).toHaveBeenCalledTimes(1);
      expect(props.handleNextPage).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", {name: `${T}.nextPage`}));
      expect(props.handleNextPage).toHaveBeenCalledTimes(1);
      expect(props.handlePrevPage).toHaveBeenCalledTimes(1);
    });

    it("forwards a numeric page size when a new rows-per-page option is chosen", async () => {
      const props = buildProps({currentPage: 1, totalPages: 3, pageSize: 10});
      const user = userEvent.setup();
      renderTableView(props);

      await user.click(screen.getByRole("combobox", {name: `${T}.aria.rowsPerPage`}));
      await user.click(await screen.findByRole("option", {name: "50"}));

      expect(props.handlePageSizeChange).toHaveBeenCalledTimes(1);
      expect(props.handlePageSizeChange).toHaveBeenCalledWith(50);
    });
  });
});
