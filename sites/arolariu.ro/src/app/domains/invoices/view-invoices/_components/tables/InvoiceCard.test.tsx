/**
 * @fileoverview Unit tests for the invoice grid card with its scan carousel.
 * @module app/domains/invoices/view-invoices/_components/tables/InvoiceCard.test
 *
 * @remarks
 * The real IndexedDB-persisted merchants store (backed by `fake-indexeddb`) resolves merchant names and the
 * real invoice `DialogProvider` backs the card action menu. Only the selection callback is a test double.
 */

import {useMerchantsStore} from "@/stores";
import {InvoiceScanType, type Invoice, type Product} from "@/types/invoices";
import {act, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import type {ComponentProps} from "react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";
import {buildInvoice, buildMerchant, buildPaymentInformation} from "../../../../../../../tests/helpers/invoiceDomain";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {InvoiceCard} from "./InvoiceCard";

type InvoiceCardProps = ComponentProps<typeof InvoiceCard>;

const G = "pages.invoices.viewInvoices.gridView";
const SELECT_INVOICE = "pages.invoices.viewInvoices.tableView.aria.selectInvoice";

const merchant = buildMerchant({id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", name: "Corner bakery"});
const transactionDate = new Date("2026-04-10T12:00:00.000Z");
const createdAt = new Date("2026-02-20T12:00:00.000Z");

const imageScan = TestDataBuilder.build("invoiceScan", {type: InvoiceScanType.PNG, location: "https://storage.test/scan-1.png"});
const pdfScan = TestDataBuilder.build("invoiceScan", {type: InvoiceScanType.PDF, location: "https://storage.test/scan-2.pdf"});

const baseInvoice: Invoice = buildInvoice({
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  name: "Bakery run",
  description: "Morning bread",
  merchantReference: merchant.id,
  scans: [imageScan],
  createdAt,
  paymentInformation: buildPaymentInformation({transactionDate, totalCostAmount: 18.75}),
});

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {dateStyle: "full"}).format(date);
}

/** Formats an amount like the UI and collapses the non-breaking space the way Testing Library normalizes DOM text. */
function expectedCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en", {style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2})
    .format(amount)
    .replaceAll(/\s/gu, " ");
}

function buildProps(overrides: Partial<InvoiceCardProps> = {}): InvoiceCardProps {
  return {
    invoice: baseInvoice,
    isSelected: false,
    loading: "lazy",
    onToggleSelection: vi.fn<(invoiceId: string) => void>(),
    ...overrides,
  };
}

function renderCard(props: InvoiceCardProps): ReturnType<typeof render> {
  return render(
    <DialogProvider>
      <InvoiceCard {...props} />
    </DialogProvider>,
  );
}

function getCarousel(): HTMLElement {
  return screen.getByRole("region", {name: `${G}.scansCarousel`});
}

describe("InvoiceCard", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion components unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    await act(async () => {
      await useMerchantsStore.persist.rehydrate();
    });
    act(() => {
      useMerchantsStore.setState({entities: [merchant], selectedEntities: [], hasHydrated: true});
    });
  });

  describe("details", () => {
    it("shows the invoice title, description, merchant, transaction date, total, and item count", () => {
      renderCard(buildProps());

      expect(screen.getByText("Bakery run")).toBeInTheDocument();
      expect(screen.getByText("Morning bread")).toBeInTheDocument();
      expect(screen.getByText("Corner bakery")).toBeInTheDocument();
      expect(screen.getByText(formatFullDate(transactionDate))).toBeInTheDocument();
      expect(screen.getByText(expectedCurrency(18.75, "RON"))).toBeInTheDocument();
      expect(screen.getByText(`${G}.itemCount`)).toBeInTheDocument();
      expect(screen.queryByText(`${G}.unknownMerchant`)).not.toBeInTheDocument();
      expect(screen.queryByText(formatFullDate(createdAt))).not.toBeInTheDocument();
    });

    it("falls back to the unknown merchant label when the merchant is not cached", () => {
      act(() => {
        useMerchantsStore.setState({entities: []});
      });

      renderCard(buildProps());

      expect(screen.getByText(`${G}.unknownMerchant`)).toBeInTheDocument();
      expect(screen.queryByText("Corner bakery")).not.toBeInTheDocument();
    });

    it("falls back to the creation date when the invoice has no transaction date", () => {
      const invoice = buildInvoice({
        ...baseInvoice,
        paymentInformation: buildPaymentInformation({transactionDate: null as unknown as Date, totalCostAmount: 18.75}),
      });

      renderCard(buildProps({invoice}));

      expect(screen.getByText(formatFullDate(createdAt))).toBeInTheDocument();
      expect(screen.queryByText(formatFullDate(transactionDate))).not.toBeInTheDocument();
    });

    it("still renders the item count label when the invoice has no item list", () => {
      const invoice = buildInvoice({...baseInvoice, items: undefined as unknown as Product[]});

      renderCard(buildProps({invoice}));

      expect(screen.getByText(`${G}.itemCount`)).toBeInTheDocument();
    });

    it("links to the invoice details page with an accessible name", () => {
      renderCard(buildProps());

      expect(screen.getByRole("link", {name: `${G}.tooltips.viewDetails`})).toHaveAttribute(
        "href",
        `/domains/invoices/view-invoice/${baseInvoice.id}`,
      );
    });
  });

  describe("selection", () => {
    it.each([
      {isSelected: false, ariaChecked: "false"},
      {isSelected: true, ariaChecked: "true"},
    ])("reflects isSelected=$isSelected on the selection checkbox", ({isSelected, ariaChecked}) => {
      renderCard(buildProps({isSelected}));

      expect(screen.getByRole("checkbox", {name: SELECT_INVOICE})).toHaveAttribute("aria-checked", ariaChecked);
    });

    it("reports the invoice id when the selection checkbox is toggled", async () => {
      const props = buildProps();
      const user = userEvent.setup();
      renderCard(props);

      await user.click(screen.getByRole("checkbox", {name: SELECT_INVOICE}));

      expect(props.onToggleSelection).toHaveBeenCalledTimes(1);
      expect(props.onToggleSelection).toHaveBeenCalledWith(baseInvoice.id);
    });
  });

  describe("scan carousel", () => {
    it("renders a single image scan with the requested loading strategy and no navigation", () => {
      renderCard(buildProps({loading: "eager"}));

      const image = within(getCarousel()).getByAltText("Bakery run scan 1");
      expect(image).toHaveAttribute("src", imageScan.location);
      expect(image).toHaveAttribute("loading", "eager");
      expect(screen.queryByRole("button", {name: "Previous slide"})).not.toBeInTheDocument();
      expect(screen.queryByRole("button", {name: "Next slide"})).not.toBeInTheDocument();
    });

    it("renders a no-preview placeholder slide when the invoice has no scans", () => {
      const invoice = buildInvoice({...baseInvoice, scans: []});

      renderCard(buildProps({invoice}));

      const slide = within(getCarousel()).getByRole("img", {name: "Bakery run scan 1"});
      expect(within(slide).getByText("No preview")).toBeInTheDocument();
      expect(screen.queryByAltText("Bakery run scan 1")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", {name: "Next slide"})).not.toBeInTheDocument();
    });

    it("renders one slide per scan, a PDF placeholder, and carousel navigation for multiple scans", () => {
      const invoice = buildInvoice({...baseInvoice, scans: [imageScan, pdfScan]});

      renderCard(buildProps({invoice}));

      const carousel = getCarousel();
      expect(within(carousel).getByAltText("Bakery run scan 1")).toHaveAttribute("loading", "lazy");
      const pdfSlide = within(carousel).getByRole("img", {name: "Bakery run scan 2"});
      expect(within(pdfSlide).getByText("PDF")).toBeInTheDocument();
      expect(within(pdfSlide).queryByText("No preview")).not.toBeInTheDocument();
      expect(within(carousel).queryByAltText("Bakery run scan 2")).not.toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Previous slide"})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Next slide"})).toBeInTheDocument();
    });
  });
});
