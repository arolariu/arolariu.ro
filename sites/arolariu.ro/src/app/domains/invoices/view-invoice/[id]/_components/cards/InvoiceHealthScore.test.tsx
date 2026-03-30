/**
 * @fileoverview Unit tests for InvoiceHealthScore component.
 * @module domains/invoices/view-invoice/[id]/components/cards/InvoiceHealthScore.test
 */

import {InvoiceContextProvider} from "@/app/domains/invoices/view-invoice/[id]/_context/InvoiceContext";
import {InvoiceBuilder, MerchantBuilder, ProductBuilder} from "@/data/mocks";
import {ProductCategory, type Invoice, type Merchant} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {userEvent} from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it, vi} from "vitest";
import {InvoiceHealthScore} from "./InvoiceHealthScore";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({children, href}: {children: React.ReactNode; href: string}) => <a href={href}>{children}</a>,
}));

const messages = {
  Invoices: {
    ViewInvoice: {
      healthScore: {
        title: "Invoice Health Score",
        subtitle: "Comprehensive data quality assessment",
        points: "points",
        showDetails: "Show factor breakdown",
        hideDetails: "Hide factor breakdown",
        factors: {
          productsPresent: "Products extracted",
          productCompleteness: "Product completeness",
          ocrConfidence: "OCR confidence",
          merchantLinked: "Merchant linked",
          paymentInfo: "Payment information",
          categoriesAssigned: "Categories assigned",
          recipesGenerated: "Recipes generated",
        },
        suggestions: {
          title: "Suggested Improvements",
          fix: "Fix",
          noProducts: "No products found — upload a receipt or add items manually",
          incompleteProducts: "{count} products incomplete — review and complete missing fields",
          lowOcrConfidence: "Low OCR confidence on {count} products — review manually for accuracy",
          noMerchant: "No merchant linked — add merchant details for better insights",
          incompletePayment: "Incomplete payment information — add transaction date, amount, and currency",
          uncategorizedProducts: "{count} products uncategorized — assign categories for spending analysis",
          noRecipes: "No recipes generated — run AI analysis to discover meal ideas",
        },
        cta: {
          analyze: "Run AI Analysis",
          edit: "Edit Invoice",
        },
        status: {
          excellent: "Excellent",
          good: "Good",
          needsAttention: "Needs Attention",
          incomplete: "Incomplete",
        },
      },
    },
  },
};

/**
 * Helper to render InvoiceHealthScore with context and i18n.
 */
function renderHealthScore(invoice: Invoice, merchant?: Merchant): ReturnType<typeof render> {
  const testMerchant = merchant ?? new MerchantBuilder().build();

  return render(
    <NextIntlClientProvider
      locale='en'
      messages={messages}>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={testMerchant}>
        <InvoiceHealthScore />
      </InvoiceContextProvider>
    </NextIntlClientProvider>,
  );
}

describe("InvoiceHealthScore", () => {
  describe("Score Calculation", () => {
    it("should display 0% for empty invoice with no products", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withItems([]).withPaymentAmount(0).withMerchantReference("").build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Incomplete")).toBeInTheDocument();
    });

    it("should award 15 points for having products present", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).build();

      // Act
      renderHealthScore(invoice);

      // Assert - Should have at least 15 points from products present
      const scoreText = screen.getByText(/\d+\s*\/\s*100\s*points/);
      expect(scoreText).toBeInTheDocument();
    });

    it("should calculate product completeness ratio correctly", () => {
      // Arrange
      const completeProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.9})
        .build();
      const incompleteProduct = new ProductBuilder()
        .withMetadata({isComplete: false, isEdited: false, isSoftDeleted: false, confidence: 0.5})
        .build();
      const invoice = new InvoiceBuilder().withItems([completeProduct, incompleteProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert - 50% completeness should show in details
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);

      // Product completeness factor should be visible
      expect(screen.getByText("Product completeness")).toBeInTheDocument();
    });

    it("should calculate average OCR confidence from non-zero values", () => {
      // Arrange
      const highConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.95})
        .build();
      const medConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.85})
        .build();
      const zeroConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0})
        .build();
      // Average should be (0.95 + 0.85) / 2 = 0.90 (90%), ignoring zero
      const invoice = new InvoiceBuilder().withItems([highConfProduct, medConfProduct, zeroConfProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert - OCR confidence should be visible in breakdown
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("OCR confidence")).toBeInTheDocument();
    });

    it("should award 10 points when merchant is linked", () => {
      // Arrange
      const merchantId = "550e8400-e29b-41d4-a716-446655440000";
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withMerchantReference(merchantId).build();

      // Act
      renderHealthScore(invoice);

      // Assert - Merchant should contribute to score
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("Merchant linked")).toBeInTheDocument();
    });

    it("should award 15 points for complete payment information", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder()
        .withItems([product])
        .withPaymentAmount(100.5)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date("2024-01-15"))
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("Payment information")).toBeInTheDocument();
    });

    it("should calculate category assignment ratio correctly", () => {
      // Arrange
      const categorizedProduct = new ProductBuilder().withCategory(ProductCategory.DAIRY).build();
      const uncategorizedProduct = new ProductBuilder().withCategory(ProductCategory.NOT_DEFINED).build();
      // 50% categorized
      const invoice = new InvoiceBuilder().withItems([categorizedProduct, uncategorizedProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("Categories assigned")).toBeInTheDocument();
    });

    it("should award 10 points when recipes are generated", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withPossibleRecipes(["Recipe 1", "Recipe 2"]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("Recipes generated")).toBeInTheDocument();
    });

    it("should display 100% for perfect invoice", () => {
      // Arrange
      const perfectProduct = new ProductBuilder()
        .withCategory(ProductCategory.DAIRY)
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 1.0})
        .build();

      const invoice = new InvoiceBuilder()
        .withItems([perfectProduct])
        .withMerchantReference("550e8400-e29b-41d4-a716-446655440000")
        .withPaymentAmount(50)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date())
        .withPossibleRecipes(["Recipe 1"])
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Excellent")).toBeInTheDocument();
      expect(screen.getByText("100 / 100 points")).toBeInTheDocument();
    });
  });

  describe("Status Labels", () => {
    it("should show 'Excellent' for 80-100% score", () => {
      // Arrange - Create invoice with ~85% score
      const product = new ProductBuilder()
        .withCategory(ProductCategory.GROCERIES)
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.95})
        .build();
      const invoice = new InvoiceBuilder()
        .withItems([product])
        .withMerchantReference("550e8400-e29b-41d4-a716-446655440000")
        .withPaymentAmount(100)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date())
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("should show 'Good' for 60-79% score", () => {
      // Arrange - Create invoice with ~65% score (products + some completeness, no merchant/recipes)
      const product = new ProductBuilder()
        .withCategory(ProductCategory.GROCERIES)
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.8})
        .build();
      const invoice = new InvoiceBuilder()
        .withItems([product])
        .withMerchantReference("") // No merchant
        .withPaymentAmount(100)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date())
        .withPossibleRecipes([]) // No recipes
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("should show 'Needs Attention' for 1-59% score", () => {
      // Arrange - Only products present, incomplete
      const product = new ProductBuilder()
        .withCategory(ProductCategory.NOT_DEFINED)
        .withMetadata({isComplete: false, isEdited: false, isSoftDeleted: false, confidence: 0.3})
        .build();
      const invoice = new InvoiceBuilder().withItems([product]).withPaymentAmount(0).withMerchantReference("").build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    });

    it("should show 'Incomplete' for 0% score", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withItems([]).withPaymentAmount(0).withMerchantReference("").build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("Incomplete")).toBeInTheDocument();
    });
  });

  describe("Improvement Suggestions", () => {
    it("should suggest adding products when none exist", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withItems([]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/No products found/)).toBeInTheDocument();
    });

    it("should suggest reviewing incomplete products", () => {
      // Arrange
      const incompleteProduct = new ProductBuilder()
        .withMetadata({isComplete: false, isEdited: false, isSoftDeleted: false, confidence: 0.5})
        .build();
      const invoice = new InvoiceBuilder().withItems([incompleteProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/products incomplete/)).toBeInTheDocument();
    });

    it("should suggest reviewing low OCR confidence products", () => {
      // Arrange
      const lowConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.4})
        .build();
      const invoice = new InvoiceBuilder().withItems([lowConfProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/Low OCR confidence/)).toBeInTheDocument();
    });

    it("should suggest adding merchant when not linked", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withMerchantReference("").build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/No merchant linked/)).toBeInTheDocument();
    });

    it("should suggest completing payment information when incomplete", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withPaymentAmount(0).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/Incomplete payment information/)).toBeInTheDocument();
    });

    it("should suggest assigning categories to uncategorized products", () => {
      // Arrange
      const uncategorizedProduct = new ProductBuilder().withCategory(ProductCategory.NOT_DEFINED).build();
      const invoice = new InvoiceBuilder().withItems([uncategorizedProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/products uncategorized/)).toBeInTheDocument();
    });

    it("should suggest running recipe analysis when no recipes exist", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withPossibleRecipes([]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText(/No recipes generated/)).toBeInTheDocument();
    });

    it("should provide fix links for suggestions", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withItems([]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      const fixLinks = screen.getAllByText("Fix");
      expect(fixLinks.length).toBeGreaterThan(0);
    });
  });

  describe("Interactive Behavior", () => {
    it("should toggle factor breakdown when button clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).build();
      renderHealthScore(invoice);

      // Act - Click show details
      const showButton = screen.getByText("Show factor breakdown");
      await user.click(showButton);

      // Assert - Details should be visible
      expect(screen.getByText("Products extracted")).toBeInTheDocument();
      expect(screen.getByText("Product completeness")).toBeInTheDocument();

      // Act - Click hide details
      const hideButton = screen.getByText("Hide factor breakdown");
      await user.click(hideButton);

      // Assert - Button text changes back
      expect(screen.getByText("Show factor breakdown")).toBeInTheDocument();
    });

    it("should show Edit Invoice CTA when score < 100%", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withPossibleRecipes([]).build();

      // Act
      renderHealthScore(invoice);

      // Assert
      expect(screen.getByText("Edit Invoice")).toBeInTheDocument();
    });

    it("should not show CTA when score = 100%", () => {
      // Arrange - Perfect invoice
      const perfectProduct = new ProductBuilder()
        .withCategory(ProductCategory.DAIRY)
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 1.0})
        .build();

      const invoice = new InvoiceBuilder()
        .withItems([perfectProduct])
        .withMerchantReference("550e8400-e29b-41d4-a716-446655440000")
        .withPaymentAmount(50)
        .withPaymentCurrency("USD")
        .withTransactionDate(new Date())
        .withPossibleRecipes(["Recipe 1"])
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert - No CTA button shown
      expect(screen.queryByText("Edit Invoice")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle soft-deleted products correctly", () => {
      // Arrange - One active, one soft-deleted
      const activeProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.9})
        .build();
      const deletedProduct = new ProductBuilder()
        .withMetadata({isComplete: false, isEdited: false, isSoftDeleted: true, confidence: 0.5})
        .build();
      const invoice = new InvoiceBuilder().withItems([activeProduct, deletedProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert - Should only count active product (1 item, not 2)
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);

      // Check that only 1 product is counted
      expect(screen.getByText(/Products extracted/)).toBeInTheDocument();
    });

    it("should handle zero confidence products in average calculation", () => {
      // Arrange - Mix of zero and non-zero confidence
      const zeroConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0})
        .build();
      const validConfProduct = new ProductBuilder()
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.8})
        .build();
      const invoice = new InvoiceBuilder().withItems([zeroConfProduct, validConfProduct]).build();

      // Act
      renderHealthScore(invoice);

      // Assert - Average should only use non-zero values
      const button = screen.getByText("Show factor breakdown");
      userEvent.click(button);
      expect(screen.getByText("OCR confidence")).toBeInTheDocument();
    });

    it("should handle empty GUID merchant reference", () => {
      // Arrange
      const emptyGuid = "00000000-0000-0000-0000-000000000000";
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder().withItems([product]).withMerchantReference(emptyGuid).build();

      // Act
      renderHealthScore(invoice);

      // Assert - Should suggest adding merchant
      expect(screen.getByText(/No merchant linked/)).toBeInTheDocument();
    });

    it("should handle missing transaction date in payment info", () => {
      // Arrange
      const product = new ProductBuilder().build();
      const invoice = new InvoiceBuilder()
        .withItems([product])
        .withPaymentAmount(100)
        .withTransactionDate(null as never)
        .build();

      // Act
      renderHealthScore(invoice);

      // Assert - Should suggest completing payment info
      expect(screen.getByText(/Incomplete payment information/)).toBeInTheDocument();
    });
  });
});
