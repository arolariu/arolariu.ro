/**
 * @vitest-environment jsdom
 */

import {InvoiceBuilder} from "@/data/mocks/builders/InvoiceBuilder";
import {MerchantBuilder} from "@/data/mocks/builders/MerchantBuilder";
import {InvoiceCategory} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it} from "vitest";
import TriviaTipsCard from "./TriviaTips";

const messages = {
  Invoices: {
    EditInvoice: {
      triviaTips: {
        title: "Savings Tips",
        completeness: "Invoice is {percentage}% complete",
        completeLabel: "Invoice is fully complete!",
        difficulty: {
          easy: "Easy",
          medium: "Medium",
        },
        banner: {
          potentialSavingsLabel: "Potential Savings",
          hint: "Apply these tips to save on your next visit to {merchantName}",
        },
        contextTips: {
          noItems: "Run AI analysis to extract items from your receipt",
          noDescription: "Add a description to help you remember this purchase",
          noCategory: "Set a category to track spending patterns",
          defaultCategory: "Change the category from 'Uncategorized' to track better",
          noRecipes: "AI can suggest recipes based on your grocery items",
        },
        contextActions: {
          analyze: "Run Analysis",
          addDescription: "Add Description",
          setCategory: "Set Category",
        },
        tips: {
          loyaltyProgram: {
            title: "Join Loyalty Program",
            description: "Sign up for {merchantName}'s loyalty program to earn points on every purchase.",
          },
          bulkPurchase: {
            title: "Buy in Bulk",
            description: "Purchase non-perishable items in bulk to save on per-unit costs.",
          },
          digitalCoupons: {
            title: "Use Digital Coupons",
            description: "Check {merchantName}'s app for digital coupons before shopping.",
          },
        },
        tooltips: {
          estimatedSavings: "Estimated savings with this tip",
        },
        buttons: {
          viewMoreSavingsTips: "View More Savings Tips",
        },
        disclaimer: "Savings are estimates based on average prices and promotions",
      },
    },
  },
};

describe("TriviaTipsCard", () => {
  it("should render the component with completeness progress", () => {
    // Arrange
    const invoice = new InvoiceBuilder().withName("Test Invoice").withDescription("Test description").build();
    const merchant = new MerchantBuilder().withName("Test Merchant").build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Savings Tips")).toBeInTheDocument();
    expect(screen.getByText(/Invoice is \d+% complete/)).toBeInTheDocument();
  });

  it("should show context tip for missing items", () => {
    // Arrange
    const invoice = new InvoiceBuilder().withItems([]).build();
    const merchant = new MerchantBuilder().build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Run AI analysis to extract items from your receipt")).toBeInTheDocument();
  });

  it("should show context tip for missing description", () => {
    // Arrange
    const invoice = new InvoiceBuilder().withDescription("").build();
    const merchant = new MerchantBuilder().build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Add a description to help you remember this purchase")).toBeInTheDocument();
  });

  it("should show context tip for uncategorized invoice", () => {
    // Arrange
    const invoice = new InvoiceBuilder().withCategory(InvoiceCategory.UNCATEGORIZED).build();
    const merchant = new MerchantBuilder().build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Change the category from 'Uncategorized' to track better")).toBeInTheDocument();
  });

  it("should show complete label when invoice is 100% complete", () => {
    // Arrange
    const invoice = new InvoiceBuilder()
      .withName("Complete Invoice")
      .withDescription("Full description")
      .withCategory(InvoiceCategory.GROCERIES)
      .withItems([{name: "Item 1", quantity: 1, unitPrice: 10, totalPrice: 10}])
      .withPossibleRecipes([{id: "recipe1", name: "Recipe 1"}])
      .build();
    const merchant = new MerchantBuilder().build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText("Invoice is 100% complete")).toBeInTheDocument();
    expect(screen.getByText("Invoice is fully complete!")).toBeInTheDocument();
  });

  it("should display savings tips with merchant name", () => {
    // Arrange
    const invoice = new InvoiceBuilder().build();
    const merchant = new MerchantBuilder().withName("Mega Store").build();

    // Act
    render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}>
        <TriviaTipsCard
          invoice={invoice}
          merchant={merchant}
        />
      </NextIntlClientProvider>,
    );

    // Assert
    expect(screen.getByText(/Apply these tips to save on your next visit to Mega Store/)).toBeInTheDocument();
  });
});
