/**
 * @fileoverview Unit tests for RelatedInvoicesCard component.
 * @module domains/invoices/view-invoice/[id]/components/cards/RelatedInvoicesCard.test
 */

import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import {useInvoicesStore} from "@/stores";
import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import * as InvoiceContext from "../../_context/InvoiceContext";
import {RelatedInvoicesCard} from "./RelatedInvoicesCard";

// Mock dependencies
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({children, ...props}: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("../../_context/InvoiceContext", () => ({
  useInvoiceContext: vi.fn(),
}));

vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

describe("RelatedInvoicesCard", () => {
  const mockCurrentInvoice = new InvoiceBuilder()
    .withInvoiceIdentifier("current-invoice-id")
    .withName("Current Invoice")
    .withCategory(100) // GROCERY
    .withTotalAmount(150.0)
    .withMerchantIdentifier("merchant-1")
    .build();

  const mockMerchant = new MerchantBuilder().withMerchantIdentifier("merchant-1").withName("Test Merchant").build();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InvoiceContext.useInvoiceContext).mockReturnValue({
      invoice: mockCurrentInvoice,
      merchant: mockMerchant,
    });
  });

  describe("when no related invoices exist", () => {
    it("should return null", () => {
      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice]);

      const {container} = render(<RelatedInvoicesCard />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when related invoices exist", () => {
    it("should display same merchant invoices", () => {
      const sameMerchantInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related-1")
        .withName("Same Merchant Invoice")
        .withMerchantIdentifier("merchant-1")
        .withTotalAmount(200.0)
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, sameMerchantInvoice]);

      render(<RelatedInvoicesCard />);

      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("Same Merchant Invoice")).toBeInTheDocument();
      expect(screen.getByText("sameMerchant")).toBeInTheDocument();
    });

    it("should display same category invoices", () => {
      const sameCategoryInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related-2")
        .withName("Same Category Invoice")
        .withCategory(100) // GROCERY
        .withMerchantIdentifier("merchant-2")
        .withTotalAmount(300.0)
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, sameCategoryInvoice]);

      render(<RelatedInvoicesCard />);

      expect(screen.getByText("Same Category Invoice")).toBeInTheDocument();
      expect(screen.getByText("sameCategory")).toBeInTheDocument();
    });

    it("should display similar amount invoices", () => {
      const similarAmountInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related-3")
        .withName("Similar Amount Invoice")
        .withCategory(200) // Different category
        .withMerchantIdentifier("merchant-3")
        .withTotalAmount(160.0) // Within ±30% of 150
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, similarAmountInvoice]);

      render(<RelatedInvoicesCard />);

      expect(screen.getByText("Similar Amount Invoice")).toBeInTheDocument();
      expect(screen.getByText("similarAmount")).toBeInTheDocument();
    });

    it("should limit to maximum 6 invoices", () => {
      const invoices = [
        mockCurrentInvoice,
        ...Array.from({length: 10}, (_, i) =>
          new InvoiceBuilder().withInvoiceIdentifier(`related-${i}`).withName(`Invoice ${i}`).withMerchantIdentifier("merchant-1").build(),
        ),
      ];

      vi.mocked(useInvoicesStore).mockReturnValue(invoices);

      render(<RelatedInvoicesCard />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(6);
    });

    it("should prioritize same merchant over same category", () => {
      const sameMerchantInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related-merchant")
        .withName("Same Merchant")
        .withMerchantIdentifier("merchant-1")
        .withIssuedDate("2024-01-01")
        .build();

      const sameCategoryInvoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related-category")
        .withName("Same Category")
        .withCategory(100)
        .withMerchantIdentifier("merchant-2")
        .withIssuedDate("2024-01-02") // Newer
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, sameMerchantInvoice, sameCategoryInvoice]);

      render(<RelatedInvoicesCard />);

      const links = screen.getAllByRole("link");
      // First link should be same merchant (higher priority)
      expect(links[0]).toHaveTextContent("Same Merchant");
    });

    it("should exclude current invoice from results", () => {
      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice]);

      const {container} = render(<RelatedInvoicesCard />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("similar amount calculation", () => {
    it("should include invoices within +30% range", () => {
      const invoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related")
        .withMerchantIdentifier("merchant-2")
        .withCategory(200)
        .withTotalAmount(195.0) // 150 * 1.3 = 195
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, invoice]);

      const {container} = render(<RelatedInvoicesCard />);
      expect(container.firstChild).not.toBeNull();
    });

    it("should include invoices within -30% range", () => {
      const invoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related")
        .withMerchantIdentifier("merchant-2")
        .withCategory(200)
        .withTotalAmount(105.0) // 150 * 0.7 = 105
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, invoice]);

      const {container} = render(<RelatedInvoicesCard />);
      expect(container.firstChild).not.toBeNull();
    });

    it("should exclude invoices outside ±30% range", () => {
      const invoice = new InvoiceBuilder()
        .withInvoiceIdentifier("related")
        .withMerchantIdentifier("merchant-2")
        .withCategory(200)
        .withTotalAmount(250.0) // Too high
        .build();

      vi.mocked(useInvoicesStore).mockReturnValue([mockCurrentInvoice, invoice]);

      const {container} = render(<RelatedInvoicesCard />);
      expect(container.firstChild).toBeNull();
    });
  });
});
