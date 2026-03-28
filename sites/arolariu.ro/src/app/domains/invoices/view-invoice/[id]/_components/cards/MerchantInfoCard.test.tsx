/**
 * @fileoverview Unit tests for MerchantInfoCard component.
 * @module domains/invoices/view-invoice/[id]/components/cards/MerchantInfoCard.test
 */

import {useInvoicesStore} from "@/stores/invoicesStore";
import type {Invoice, Merchant} from "@/types/invoices";
import {InvoiceCategory, MerchantCategory} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {MerchantInfoCard} from "./MerchantInfoCard";

// Mock the invoices store
vi.mock("@/stores/invoicesStore", () => ({
  useInvoicesStore: vi.fn(),
}));

const mockMerchant: Merchant = {
  id: "merchant-123",
  name: "Test Merchant",
  description: "A test merchant",
  category: MerchantCategory.SUPERMARKET,
  address: {
    fullName: "Test Merchant LLC",
    address: "123 Test Street, Test City",
    phoneNumber: "+1234567890",
    emailAddress: "test@merchant.com",
    website: "https://testmerchant.com",
  },
  parentCompanyId: "",
  createdAt: new Date(),
  lastUpdatedAt: new Date(),
  isDeleted: false,
};

const mockInvoice: Invoice = {
  id: "invoice-123",
  name: "Test Invoice",
  description: "A test invoice",
  userIdentifier: "user-123",
  sharedWith: [],
  category: InvoiceCategory.GROCERY,
  scans: [],
  paymentInformation: {
    totalCostAmount: 100,
    currency: "USD",
    paidAtDateAndTime: new Date("2024-01-15"),
  },
  merchantReference: "merchant-123",
  items: [],
  possibleRecipes: [],
  createdAt: new Date(),
  lastUpdatedAt: new Date(),
  isDeleted: false,
};

const messages = {
  Invoices: {
    ViewInvoice: {
      merchantInfoCard: {
        viewAllReceipts: "View All Receipts",
        viewAllInvoices: "View All Invoices",
        viewOnMap: "View on Map",
        spendingHistory: "Spending History",
        categoryDistribution: "Category Distribution",
        stats: {
          visits: "visits",
          avgSpend: "Avg Spend",
          daysAgo: "days ago",
        },
      },
    },
  },
};

describe("MerchantInfoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render merchant basic information", () => {
    // Arrange
    vi.mocked(useInvoicesStore).mockReturnValue({
      invoices: [],
      selectedInvoices: [],
      hasHydrated: true,
      setInvoices: vi.fn(),
      setSelectedInvoices: vi.fn(),
      upsertInvoice: vi.fn(),
      removeInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      toggleInvoiceSelection: vi.fn(),
      clearSelectedInvoices: vi.fn(),
      clearInvoices: vi.fn(),
      setHasHydrated: vi.fn(),
    });

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <MerchantInfoCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Test Merchant")).toBeInTheDocument();
    expect(screen.getByText("123 Test Street, Test City")).toBeInTheDocument();
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
  });

  it("should display spending history when merchant has multiple invoices", () => {
    // Arrange
    const merchantInvoices = [
      {...mockInvoice, id: "invoice-1", paymentInformation: {...mockInvoice.paymentInformation, totalCostAmount: 50}},
      {...mockInvoice, id: "invoice-2", paymentInformation: {...mockInvoice.paymentInformation, totalCostAmount: 75}},
      {...mockInvoice, id: "invoice-3", paymentInformation: {...mockInvoice.paymentInformation, totalCostAmount: 100}},
    ];

    vi.mocked(useInvoicesStore).mockReturnValue({
      invoices: merchantInvoices,
      selectedInvoices: [],
      hasHydrated: true,
      setInvoices: vi.fn(),
      setSelectedInvoices: vi.fn(),
      upsertInvoice: vi.fn(),
      removeInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      toggleInvoiceSelection: vi.fn(),
      clearSelectedInvoices: vi.fn(),
      clearInvoices: vi.fn(),
      setHasHydrated: vi.fn(),
    });

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <MerchantInfoCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Spending History")).toBeInTheDocument();
  });

  it("should display visit statistics when invoices are available", () => {
    // Arrange
    const merchantInvoices = [
      {...mockInvoice, id: "invoice-1", paymentInformation: {...mockInvoice.paymentInformation, totalCostAmount: 100}},
      {...mockInvoice, id: "invoice-2", paymentInformation: {...mockInvoice.paymentInformation, totalCostAmount: 200}},
    ];

    vi.mocked(useInvoicesStore).mockReturnValue({
      invoices: merchantInvoices,
      selectedInvoices: [],
      hasHydrated: true,
      setInvoices: vi.fn(),
      setSelectedInvoices: vi.fn(),
      upsertInvoice: vi.fn(),
      removeInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      toggleInvoiceSelection: vi.fn(),
      clearSelectedInvoices: vi.fn(),
      clearInvoices: vi.fn(),
      setHasHydrated: vi.fn(),
    });

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <MerchantInfoCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("2")).toBeInTheDocument(); // visit count
    expect(screen.getByText("150.00")).toBeInTheDocument(); // average spend
  });

  it("should render Google Maps link when address is available", () => {
    // Arrange
    vi.mocked(useInvoicesStore).mockReturnValue({
      invoices: [],
      selectedInvoices: [],
      hasHydrated: true,
      setInvoices: vi.fn(),
      setSelectedInvoices: vi.fn(),
      upsertInvoice: vi.fn(),
      removeInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      toggleInvoiceSelection: vi.fn(),
      clearSelectedInvoices: vi.fn(),
      clearInvoices: vi.fn(),
      setHasHydrated: vi.fn(),
    });

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <MerchantInfoCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("View on Map")).toBeInTheDocument();
    const mapLink = screen.getByRole("link", {name: /view on map/i});
    expect(mapLink).toHaveAttribute("href", expect.stringContaining("google.com/maps"));
  });

  it("should render view all invoices link", () => {
    // Arrange
    vi.mocked(useInvoicesStore).mockReturnValue({
      invoices: [],
      selectedInvoices: [],
      hasHydrated: true,
      setInvoices: vi.fn(),
      setSelectedInvoices: vi.fn(),
      upsertInvoice: vi.fn(),
      removeInvoice: vi.fn(),
      updateInvoice: vi.fn(),
      toggleInvoiceSelection: vi.fn(),
      clearSelectedInvoices: vi.fn(),
      clearInvoices: vi.fn(),
      setHasHydrated: vi.fn(),
    });

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <InvoiceContextProvider
          invoice={mockInvoice}
          merchant={mockMerchant}>
          <MerchantInfoCard />
        </InvoiceContextProvider>
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("View All Invoices")).toBeInTheDocument();
  });
});
