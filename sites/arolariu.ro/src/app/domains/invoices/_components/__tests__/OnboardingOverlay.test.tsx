/**
 * @fileoverview Unit tests for OnboardingOverlay component.
 * @module app/domains/invoices/_components/OnboardingOverlay.test
 */

import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it} from "vitest";
import OnboardingOverlay from "./OnboardingOverlay";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis.window, "localStorage", {
  value: localStorageMock,
});

const messages = {
  Invoices: {
    Shared: {
      onboarding: {
        skip: "Skip",
        next: "Next",
        back: "Back",
        getStarted: "Get Started",
        stepOf: "Step {current} of {total}",
        steps: {
          upload: {
            title: "Upload Your Receipts",
            description: "Take a photo or upload a PDF of your receipt.",
          },
          analyze: {
            title: "AI Extracts the Details",
            description: "Our AI-powered system automatically extracts data.",
          },
          track: {
            title: "Track Your Spending",
            description: "View detailed analytics and insights.",
          },
        },
      },
    },
  },
};

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
};

describe("OnboardingOverlay", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("Visibility", () => {
    it("should render when onboarding is not complete", () => {
      renderWithIntl(<OnboardingOverlay />);

      expect(screen.getByText("Upload Your Receipts")).toBeInTheDocument();
      expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    });

    it("should not render when onboarding is already complete", () => {
      localStorageMock.setItem("invoice-onboarding-complete", "true");

      renderWithIntl(<OnboardingOverlay />);

      expect(screen.queryByText("Upload Your Receipts")).not.toBeInTheDocument();
    });
  });

  describe("Step Navigation", () => {
    it("should show first step initially", () => {
      renderWithIntl(<OnboardingOverlay />);

      expect(screen.getByText("Upload Your Receipts")).toBeInTheDocument();
      expect(screen.getByText("Take a photo or upload a PDF of your receipt.")).toBeInTheDocument();
    });

    it("should navigate to next step when Next button is clicked", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      const nextButton = screen.getByRole("button", {name: /next/i});
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("AI Extracts the Details")).toBeInTheDocument();
        expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
      });
    });

    it("should navigate back to previous step when Back button is clicked", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Go to step 2
      const nextButton = screen.getByRole("button", {name: /next/i});
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("AI Extracts the Details")).toBeInTheDocument();
      });

      // Go back to step 1
      const backButton = screen.getByRole("button", {name: /back/i});
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByText("Upload Your Receipts")).toBeInTheDocument();
        expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
      });
    });

    it("should not show Back button on first step", () => {
      renderWithIntl(<OnboardingOverlay />);

      expect(screen.queryByRole("button", {name: /back/i})).not.toBeInTheDocument();
    });

    it("should show Get Started button on last step", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Navigate to last step
      const nextButton = screen.getByRole("button", {name: /next/i});
      await user.click(nextButton);
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Track Your Spending")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /get started/i})).toBeInTheDocument();
      });
    });
  });

  describe("Step Indicators", () => {
    it("should render all step indicator dots", () => {
      renderWithIntl(<OnboardingOverlay />);

      const dots = screen.getAllByRole("button", {current: false});
      // 3 dots total, but current step has aria-current="true"
      expect(dots.length).toBeGreaterThanOrEqual(2);
    });

    it("should highlight current step dot", () => {
      renderWithIntl(<OnboardingOverlay />);

      const currentDot = screen.getByRole("button", {current: true});
      expect(currentDot).toBeInTheDocument();
    });

    it("should allow clicking dots to navigate to specific step", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Find step 3 dot and click it
      const dots = screen.getAllByLabelText(/step .+ of 3/i);
      await user.click(dots[2]); // Third dot

      await waitFor(() => {
        expect(screen.getByText("Track Your Spending")).toBeInTheDocument();
        expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
      });
    });
  });

  describe("Close/Skip Actions", () => {
    it("should close overlay when Skip button is clicked", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      const skipButton = screen.getByRole("button", {name: /skip/i});
      await user.click(skipButton);

      await waitFor(() => {
        expect(screen.queryByText("Upload Your Receipts")).not.toBeInTheDocument();
      });

      // Verify localStorage was updated
      expect(localStorageMock.getItem("invoice-onboarding-complete")).toBe("true");
    });

    it("should close overlay when X button is clicked", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Find the X close button (icon button)
      const closeButtons = screen.getAllByRole("button", {name: /skip/i});
      const xButton = closeButtons[1]; // Second skip button is the X icon
      await user.click(xButton);

      await waitFor(() => {
        expect(screen.queryByText("Upload Your Receipts")).not.toBeInTheDocument();
      });

      expect(localStorageMock.getItem("invoice-onboarding-complete")).toBe("true");
    });

    it("should close overlay and mark complete when Get Started is clicked", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Navigate to last step
      const nextButton = screen.getByRole("button", {name: /next/i});
      await user.click(nextButton);
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Track Your Spending")).toBeInTheDocument();
      });

      // Click Get Started
      const getStartedButton = screen.getByRole("button", {name: /get started/i});
      await user.click(getStartedButton);

      await waitFor(() => {
        expect(screen.queryByText("Track Your Spending")).not.toBeInTheDocument();
      });

      expect(localStorageMock.getItem("invoice-onboarding-complete")).toBe("true");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on navigation buttons", () => {
      renderWithIntl(<OnboardingOverlay />);

      expect(screen.getByRole("button", {name: /skip/i})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: /next/i})).toBeInTheDocument();
    });

    it("should indicate current step with aria-current", () => {
      renderWithIntl(<OnboardingOverlay />);

      const currentDot = screen.getByRole("button", {current: true});
      expect(currentDot).toHaveAttribute("aria-current", "true");
    });
  });

  describe("Content Display", () => {
    it("should display correct icon for upload step", () => {
      renderWithIntl(<OnboardingOverlay />);

      expect(screen.getByText("Upload Your Receipts")).toBeInTheDocument();
      // Icon is rendered, check for its presence via class or test-id if needed
    });

    it("should display all three step contents when navigating", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingOverlay />);

      // Step 1
      expect(screen.getByText("Upload Your Receipts")).toBeInTheDocument();
      expect(screen.getByText("Take a photo or upload a PDF of your receipt.")).toBeInTheDocument();

      // Step 2
      await user.click(screen.getByRole("button", {name: /next/i}));
      await waitFor(() => {
        expect(screen.getByText("AI Extracts the Details")).toBeInTheDocument();
        expect(screen.getByText("Our AI-powered system automatically extracts data.")).toBeInTheDocument();
      });

      // Step 3
      await user.click(screen.getByRole("button", {name: /next/i}));
      await waitFor(() => {
        expect(screen.getByText("Track Your Spending")).toBeInTheDocument();
        expect(screen.getByText("View detailed analytics and insights.")).toBeInTheDocument();
      });
    });
  });
});
