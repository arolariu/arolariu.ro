/**
 * @fileoverview Unit tests for the paginated, selectable invoices GridView.
 * @module app/domains/invoices/view-invoices/_components/tables/GridView.test
 *
 * @remarks
 * The real IndexedDB-persisted invoices store (backed by `fake-indexeddb`) owns the selection and the real
 * invoice `DialogProvider` backs the card action menus. Only the parent-owned pagination callbacks are test
 * doubles; scan prefetching is observed through the browser `HTMLImageElement#src` setter.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import type {ComponentProps} from "react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";
import {buildInvoice} from "../../../../../../../tests/helpers/invoiceDomain";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {GridView} from "./GridView";

type GridViewProps = ComponentProps<typeof GridView>;

const T = "pages.invoices.viewInvoices.tableView";
const SELECT_INVOICE = `${T}.aria.selectInvoice`;

/** Builds an invoice with a deterministic id/name and one image scan located at a per-invoice URL. */
function buildScannedInvoice(index: number): Invoice {
  const suffix = String(index).padStart(12, "0");
  return buildInvoice({
    id: `00000000-0000-4000-8000-${suffix}`,
    name: `Invoice ${index}`,
    scans: [TestDataBuilder.build("invoiceScan", {location: `https://storage.test/scan-${index}.jpg`})],
  });
}

const firstInvoice = buildScannedInvoice(1);
const secondInvoice = buildScannedInvoice(2);
const unscannedInvoice = buildInvoice({id: "ffffffff-ffff-4fff-8fff-ffffffffffff", name: "No scan", scans: []});

function selectedIds(): string[] {
  return useInvoicesStore.getState().selectedEntities.map((invoice) => invoice.id);
}

function buildProps(overrides: Partial<GridViewProps> = {}): GridViewProps {
  return {
    invoices: [firstInvoice, secondInvoice],
    pageSize: 10,
    currentPage: 1,
    totalPages: 1,
    handlePrevPage: vi.fn<() => void>(),
    handleNextPage: vi.fn<() => void>(),
    handlePageSizeChange: vi.fn<(size: number) => void>(),
    ...overrides,
  };
}

function renderGridView(props: GridViewProps): ReturnType<typeof render> {
  return render(
    <DialogProvider>
      <GridView {...props} />
    </DialogProvider>,
  );
}

function getCardCheckbox(position: number): HTMLElement {
  const checkbox = screen.getAllByRole("checkbox", {name: SELECT_INVOICE}).at(position);
  if (checkbox === undefined) throw new Error(`No card checkbox at position ${position}`);
  return checkbox;
}

describe("GridView", () => {
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
    it("renders the upload call to action instead of a grid when there are no invoices", () => {
      renderGridView(buildProps({invoices: []}));

      expect(screen.getByRole("heading", {name: `${T}.empty.title`})).toBeInTheDocument();
      expect(screen.getByText(`${T}.empty.description`)).toBeInTheDocument();
      expect(screen.getByRole("link", {name: `${T}.empty.uploadCta`})).toHaveAttribute("href", "/domains/invoices/upload-scans");
      expect(screen.queryByRole("checkbox", {name: SELECT_INVOICE})).not.toBeInTheDocument();
    });
  });

  describe("cards", () => {
    it("renders one selectable card per invoice", () => {
      renderGridView(buildProps());

      expect(screen.getAllByRole("checkbox", {name: SELECT_INVOICE})).toHaveLength(2);
      expect(screen.getByText("Invoice 1")).toBeInTheDocument();
      expect(screen.getByText("Invoice 2")).toBeInTheDocument();
    });

    it("loads the first nine card images eagerly and the rest lazily", () => {
      const invoices = Array.from({length: 10}, (_, index) => buildScannedInvoice(index + 1));

      renderGridView(buildProps({invoices}));

      expect(screen.getByAltText("Invoice 1 scan 1")).toHaveAttribute("loading", "eager");
      expect(screen.getByAltText("Invoice 9 scan 1")).toHaveAttribute("loading", "eager");
      expect(screen.getByAltText("Invoice 10 scan 1")).toHaveAttribute("loading", "lazy");
    });

    it("prefetches the first scan of at most the first twenty invoices that have scans", () => {
      const srcSetter = vi.spyOn(HTMLImageElement.prototype, "src", "set");
      const scanned = Array.from({length: 21}, (_, index) => buildScannedInvoice(index + 1));
      const invoices = [unscannedInvoice, ...scanned];

      renderGridView(buildProps({invoices}));

      // Rendered card images also assign `src`; prefetch images are the ones never attached to the document.
      const prefetchedUrls = srcSetter.mock.calls
        .filter((_, callIndex) => !(srcSetter.mock.contexts[callIndex] as HTMLImageElement).isConnected)
        .map(([url]) => url);
      // The unscanned invoice occupies one of the twenty prefetch slots but has nothing to fetch.
      expect(prefetchedUrls).toHaveLength(19);
      expect(prefetchedUrls).toContain("https://storage.test/scan-1.jpg");
      expect(prefetchedUrls).toContain("https://storage.test/scan-19.jpg");
      expect(prefetchedUrls).not.toContain("https://storage.test/scan-20.jpg");
      expect(prefetchedUrls).not.toContain("https://storage.test/scan-21.jpg");
      expect(screen.getByAltText("Invoice 21 scan 1")).toHaveAttribute("src", "https://storage.test/scan-21.jpg");
    });
  });

  describe("selection", () => {
    it("adds an unselected invoice to the store selection", async () => {
      const user = userEvent.setup();
      renderGridView(buildProps());

      await user.click(getCardCheckbox(1));

      expect(selectedIds()).toEqual([secondInvoice.id]);
      expect(getCardCheckbox(1)).toHaveAttribute("aria-checked", "true");
      expect(getCardCheckbox(0)).toHaveAttribute("aria-checked", "false");
    });

    it("removes an already selected invoice from the store selection", async () => {
      act(() => {
        useInvoicesStore.setState({selectedEntities: [firstInvoice, secondInvoice]});
      });
      const user = userEvent.setup();
      renderGridView(buildProps());
      expect(getCardCheckbox(0)).toHaveAttribute("aria-checked", "true");

      await user.click(getCardCheckbox(0));

      expect(selectedIds()).toEqual([secondInvoice.id]);
      expect(getCardCheckbox(0)).toHaveAttribute("aria-checked", "false");
      expect(getCardCheckbox(1)).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("pagination", () => {
    it("hides the pagination controls when there is a single page", () => {
      renderGridView(buildProps({totalPages: 1}));

      expect(screen.queryByText(`${T}.rowsPerPage`)).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox", {name: `${T}.aria.rowsPerPage`})).not.toBeInTheDocument();
      expect(screen.queryByRole("button", {name: `${T}.nextPage`})).not.toBeInTheDocument();
    });

    it("shows the page size and page indicator when there are several pages", () => {
      renderGridView(buildProps({currentPage: 2, totalPages: 4, pageSize: 20}));

      expect(screen.getByText(`${T}.rowsPerPage`)).toBeInTheDocument();
      expect(screen.getByText(`${T}.pageOf`)).toBeInTheDocument();
      expect(screen.getByRole("combobox", {name: `${T}.aria.rowsPerPage`})).toHaveTextContent("20");
    });

    it.each([
      {currentPage: 1, prevDisabled: true, nextDisabled: false},
      {currentPage: 2, prevDisabled: false, nextDisabled: false},
      {currentPage: 3, prevDisabled: false, nextDisabled: true},
    ])("disables previous=$prevDisabled and next=$nextDisabled on page $currentPage of 3", ({currentPage, prevDisabled, nextDisabled}) => {
      renderGridView(buildProps({currentPage, totalPages: 3}));

      expect(screen.getByRole("button", {name: `${T}.previousPage`})).toHaveProperty("disabled", prevDisabled);
      expect(screen.getByRole("button", {name: `${T}.nextPage`})).toHaveProperty("disabled", nextDisabled);
    });

    it("forwards previous and next page requests to the parent", async () => {
      const props = buildProps({currentPage: 2, totalPages: 3});
      const user = userEvent.setup();
      renderGridView(props);

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
      renderGridView(props);

      await user.click(screen.getByRole("combobox", {name: `${T}.aria.rowsPerPage`}));
      await user.click(await screen.findByRole("option", {name: "100"}));

      expect(props.handlePageSizeChange).toHaveBeenCalledTimes(1);
      expect(props.handlePageSizeChange).toHaveBeenCalledWith(100);
    });
  });
});
