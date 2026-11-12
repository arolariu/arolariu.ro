/**
 * @fileoverview Unit tests for the invoice FilterBar.
 * @module app/domains/invoices/view-invoices/_components/filters/FilterBar.test
 *
 * @remarks
 * The real invoices store (backed by `fake-indexeddb`), filter-option derivers, filter cards, and
 * `@arolariu/components` primitives run unmodified. Only the viewport width is stubbed to switch between the
 * desktop inline panel and the mobile sheet, and timers are faked where the search debounce is the contract.
 */

import {useInvoicesStore} from "@/stores";
import {PaymentType, type Invoice} from "@/types/invoices";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice, buildPaymentInformation} from "../../../../../../../tests/helpers/invoiceDomain";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import FilterBar from "./FilterBar";

type FilterBarProps = React.ComponentProps<typeof FilterBar>;

const FILTERS = "forms.invoices.filters";
const FILTER_BUTTON = /^forms\.invoices\.filters\.button/;
const PANEL_TITLE = `${FILTERS}.title`;
const CLEAR = `${FILTERS}.clear`;
const SEARCH_PLACEHOLDER = "pages.invoices.viewInvoices.invoicesView.searchPlaceholder";

/** The payload every "clear filters" action emits; `view` is intentionally preserved. */
const RESET_PATCH: Partial<FilterState> = {
  search: "",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  classificationGroups: [],
  paymentTypes: [],
  currencies: [],
  sortBy: "date",
  sortOrder: "desc",
};

/** One invoice per payment type so every payment-type chip label is rendered. */
const PAYMENT_TYPE_LABELS = [
  {paymentType: PaymentType.Cash, label: "cash"},
  {paymentType: PaymentType.Card, label: "card"},
  {paymentType: PaymentType.Transfer, label: "transfer"},
  {paymentType: PaymentType.MobilePayment, label: "mobile"},
  {paymentType: PaymentType.Voucher, label: "voucher"},
  {paymentType: PaymentType.Other, label: "other"},
] as const;

const INVOICES: ReadonlyArray<Invoice> = PAYMENT_TYPE_LABELS.map(({paymentType}, index) =>
  buildInvoice({
    id: `00000000-0000-4000-8000-00000000000${index}`,
    paymentInformation: buildPaymentInformation({
      paymentType,
      currency: index % 2 === 0 ? {code: "RON", symbol: "lei", name: "Romanian Leu"} : {code: "EUR", symbol: "€", name: "Euro"},
    }),
  }),
);

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return {
    search: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    classificationGroups: [],
    paymentTypes: [],
    currencies: [],
    sortBy: "date",
    sortOrder: "desc",
    view: "table",
    ...overrides,
  };
}

function renderFilterBar(overrides: Partial<FilterBarProps> = {}): ReturnType<typeof render> {
  return render(
    <FilterBar
      filters={makeFilters()}
      onFiltersChange={vi.fn()}
      activeFilterCount={0}
      viewMode='table'
      onViewModeChange={vi.fn()}
      filteredCount={0}
      {...overrides}
    />,
  );
}

function seedInvoices(entities: ReadonlyArray<Invoice>): void {
  act(() => {
    useInvoicesStore.setState({entities: [...entities], selectedEntities: [], hasHydrated: true});
  });
}

const VIEW_MODES = "pages.invoices.viewInvoices.invoicesView.viewModes";

function viewToggleButtons(): {table: HTMLElement; grid: HTMLElement} {
  return {
    table: screen.getByRole("button", {name: `${VIEW_MODES}.table`}),
    grid: screen.getByRole("button", {name: `${VIEW_MODES}.grid`}),
  };
}

/** The desktop inline panel is an unlabelled region, so locate it by the id the filter button controls. */
function getInlinePanel(container: HTMLElement): HTMLElement {
  const panel = container.querySelector<HTMLElement>("#inline-filter-panel");
  if (!panel) throw new Error("Expected the inline filter panel to render.");
  return panel;
}

function expectEveryFilterCard(region: HTMLElement): void {
  const scope = within(region);
  expect(scope.getByText(`${FILTERS}.dateRange`)).toBeInTheDocument();
  expect(scope.getByText(`${FILTERS}.amountRange`)).toBeInTheDocument();
  expect(scope.getByText(/forms\.invoices\.filters\.currency$/)).toBeInTheDocument();
  expect(scope.getByText(/forms\.invoices\.filters\.classificationGroups$/)).toBeInTheDocument();
  expect(scope.getByText(/forms\.invoices\.filters\.paymentTypes$/)).toBeInTheDocument();
  expect(scope.getByText(/forms\.invoices\.filters\.sortBy$/)).toBeInTheDocument();
  for (const {label} of PAYMENT_TYPE_LABELS) {
    expect(scope.getByRole("button", {name: `${FILTERS}.paymentTypeLabels.${label}`})).toBeInTheDocument();
  }
  expect(scope.getByRole("button", {name: "RON"})).toBeInTheDocument();
  expect(scope.getByRole("button", {name: "EUR"})).toBeInTheDocument();
  expect(scope.getByRole("button", {name: "unclassified"})).toBeInTheDocument();
}

describe("FilterBar", () => {
  beforeEach(async () => {
    await act(async () => {
      await useInvoicesStore.persist.rehydrate();
    });
    seedInvoices([]);
  });

  afterEach(() => {
    seedInvoices([]);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("search", () => {
    it("emits the search text only after the 300ms debounce and not for the initial value", () => {
      // Arrange
      vi.useFakeTimers();
      const onFiltersChange = vi.fn();
      renderFilterBar({onFiltersChange});
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(onFiltersChange).not.toHaveBeenCalled();

      // Act
      fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {target: {value: "milk"}});
      act(() => {
        vi.advanceTimersByTime(299);
      });
      const callsBeforeDebounce = onFiltersChange.mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Assert
      expect(callsBeforeDebounce).toBe(0);
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("milk");
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith({search: "milk"});
    });
  });

  describe("view mode toggle", () => {
    it.each([
      {viewMode: "table", tableVariant: "default", gridVariant: "ghost"},
      {viewMode: "grid", tableVariant: "ghost", gridVariant: "default"},
    ] as const)("highlights the $viewMode toggle as the current view", ({viewMode, tableVariant, gridVariant}) => {
      // Arrange & Act
      renderFilterBar({viewMode});

      // Assert
      const {table, grid} = viewToggleButtons();
      expect(table).toHaveAttribute("data-variant", tableVariant);
      expect(grid).toHaveAttribute("data-variant", gridVariant);
    });

    it("emits the chosen view mode from each toggle", async () => {
      // Arrange
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();
      renderFilterBar({onViewModeChange});
      const {table, grid} = viewToggleButtons();

      // Act
      await user.click(grid);
      await user.click(table);

      // Assert
      expect(onViewModeChange).toHaveBeenCalledTimes(2);
      expect(onViewModeChange).toHaveBeenNthCalledWith(1, "grid");
      expect(onViewModeChange).toHaveBeenNthCalledWith(2, "table");
    });
  });

  describe("desktop layout", () => {
    beforeEach(() => {
      vi.stubGlobal("innerWidth", 1280);
    });

    it("shows a collapsed filter button without a badge or clear action when no filter is active", () => {
      // Arrange & Act
      renderFilterBar();

      // Assert
      const filterButton = screen.getByRole("button", {name: FILTER_BUTTON});
      expect(filterButton).toHaveAttribute("aria-expanded", "false");
      expect(filterButton).toHaveAccessibleName(`${FILTERS}.button`);
      expect(screen.queryByRole("button", {name: CLEAR})).not.toBeInTheDocument();
      expect(screen.queryByText(PANEL_TITLE)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
    });

    it("toggles an inline panel with every filter card and closes it from the panel close button", async () => {
      // Arrange
      const user = userEvent.setup();
      seedInvoices(INVOICES);
      const {container} = renderFilterBar();
      const filterButton = screen.getByRole("button", {name: FILTER_BUTTON});

      // Act — open from the filter button.
      await user.click(filterButton);

      // Assert
      const panel = getInlinePanel(container);
      expect(filterButton).toHaveAttribute("aria-controls", "inline-filter-panel");
      expect(filterButton).toHaveAttribute("aria-expanded", "true");
      expect(within(panel).getByRole("heading", {name: PANEL_TITLE})).toBeInTheDocument();
      expect(within(panel).queryByText(`${FILTERS}.activeCount`)).not.toBeInTheDocument();
      expect(within(panel).queryByRole("button", {name: CLEAR})).not.toBeInTheDocument();
      expectEveryFilterCard(panel);

      // Act — close from the panel's own close button.
      await user.click(within(panel).getByRole("button", {name: PANEL_TITLE}));

      // Assert
      expect(container.querySelector("#inline-filter-panel")).toBeNull();
      expect(filterButton).toHaveAttribute("aria-expanded", "false");

      // Act — the filter button toggles the panel open and closed again.
      await user.click(filterButton);
      expect(getInlinePanel(container)).toBeInTheDocument();
      await user.click(filterButton);

      // Assert
      expect(container.querySelector("#inline-filter-panel")).toBeNull();
    });

    it("shows the active count and clears every filter from the top bar and the inline panel", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      const {container} = renderFilterBar({onFiltersChange, activeFilterCount: 3});
      const filterButton = screen.getByRole("button", {name: FILTER_BUTTON});
      expect(within(filterButton).getByText("3")).toBeInTheDocument();

      // Act — clear from the top bar.
      await user.click(screen.getByRole("button", {name: CLEAR}));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenLastCalledWith(RESET_PATCH);

      // Act — clear from the open inline panel.
      await user.click(filterButton);
      const panel = getInlinePanel(container);
      expect(within(panel).getByText(`${FILTERS}.activeCount`)).toBeInTheDocument();
      await user.click(within(panel).getByRole("button", {name: CLEAR}));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(2);
      expect(onFiltersChange).toHaveBeenLastCalledWith(RESET_PATCH);
    });

    it("empties the search input immediately when filters are cleared", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      renderFilterBar({onFiltersChange, activeFilterCount: 1, filters: makeFilters({search: "milk"})});
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("milk");

      // Act
      await user.click(screen.getByRole("button", {name: CLEAR}));

      // Assert
      expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
      expect(onFiltersChange).toHaveBeenNthCalledWith(1, RESET_PATCH);
    });
  });

  describe("mobile layout", () => {
    beforeEach(() => {
      vi.stubGlobal("innerWidth", 375);
    });

    it("replaces the inline filter button and top-bar clear action with a labelled sheet trigger showing the count", () => {
      // Arrange & Act
      renderFilterBar({activeFilterCount: 2});

      // Assert
      const sheetTrigger = screen.getByRole("button", {name: `${FILTERS}.button`});
      expect(sheetTrigger).toHaveAttribute("aria-haspopup", "dialog");
      expect(sheetTrigger).toHaveAttribute("aria-expanded", "false");
      expect(sheetTrigger).not.toHaveAttribute("aria-controls", "inline-filter-panel");
      expect(within(sheetTrigger).getByText("2")).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: CLEAR})).not.toBeInTheDocument();
      expect(document.querySelector("#inline-filter-panel")).toBeNull();
    });

    it("opens a sheet with every filter card and closes it from the show-results action", async () => {
      // Arrange
      const user = userEvent.setup();
      seedInvoices(INVOICES);
      renderFilterBar({activeFilterCount: 2, filteredCount: 7});

      // Act
      await user.click(screen.getByRole("button", {name: `${FILTERS}.button`}));

      // Assert
      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByRole("heading", {name: new RegExp(`^${PANEL_TITLE}`)})).toBeInTheDocument();
      expect(within(sheet).getByText(`${FILTERS}.activeCount`)).toBeInTheDocument();
      expect(within(sheet).getByRole("button", {name: "shared.accessibility.close"})).toBeInTheDocument();
      expectEveryFilterCard(sheet);

      // Act
      await user.click(within(sheet).getByRole("button", {name: `${FILTERS}.showResults`}));

      // Assert
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("clears every filter from the sheet header", async () => {
      // Arrange
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      renderFilterBar({onFiltersChange, activeFilterCount: 2});
      await user.click(screen.getByRole("button", {name: `${FILTERS}.button`}));
      const sheet = await screen.findByRole("dialog");

      // Act
      await user.click(within(sheet).getByRole("button", {name: CLEAR}));

      // Assert
      expect(onFiltersChange).toHaveBeenCalledTimes(1);
      expect(onFiltersChange).toHaveBeenCalledWith(RESET_PATCH);
    });

    it("omits the count badge and the clear action when no filter is active", async () => {
      // Arrange
      const user = userEvent.setup();
      renderFilterBar();
      const sheetTrigger = screen.getByRole("button", {name: `${FILTERS}.button`});
      expect(sheetTrigger.textContent).toBe("");

      // Act
      await user.click(sheetTrigger);

      // Assert
      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByRole("heading", {name: PANEL_TITLE})).toBeInTheDocument();
      expect(within(sheet).queryByText(`${FILTERS}.activeCount`)).not.toBeInTheDocument();
      expect(within(sheet).queryByRole("button", {name: CLEAR})).not.toBeInTheDocument();
    });
  });
});
