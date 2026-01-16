/**
 * @fileoverview Tests for Navigation components.
 * @module components/Navigation.test
 */

import {fireEvent, render, screen, within} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

// Mock @arolariu/components
vi.mock("@arolariu/components", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    ...props
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: string;
    "aria-expanded"?: boolean;
    "aria-label"?: string;
    "aria-controls"?: string;
  }) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      {...props}>
      {children}
    </button>
  ),
}));

// Mock Clerk's useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next-intl's useTranslations hook
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      Navigation: {
        domains: "Domains",
        invoices: "Invoices",
        uploadScans: "Upload Scans",
        viewScans: "View Scans",
        myInvoices: "My Invoices",
        about: "About",
        thePlatform: "The Platform",
        theAuthor: "The Author",
        myProfile: "My Profile",
      },
      "Navigation.mobile": {
        openNavigation: "Open navigation",
        closeNavigation: "Close navigation",
        title: "Navigation",
      },
    };
    return (key: string) => translations[namespace]?.[key] ?? key;
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({children, href, className}: {children: ReactNode; href: string; className?: string}) => (
    <a
      href={href}
      className={className}>
      {children}
    </a>
  ),
}));

// Mock react-icons
vi.mock("react-icons/tb", () => ({
  TbChevronDown: ({className}: {className?: string}) => <span className={className}>ChevronDown</span>,
  TbMenu: ({className}: {className?: string}) => <span className={className}>Menu</span>,
}));

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to signed out
    mockUseAuth.mockReturnValue({isSignedIn: false});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("DesktopNavigation", () => {
    it("should render without crashing", () => {
      const {container} = render(<DesktopNavigation />);
      expect(container.querySelector("ul")).toBeInTheDocument();
    });

    it("should display Domains link", () => {
      render(<DesktopNavigation />);
      const domainsLink = screen.getByRole("link", {name: "Domains"});
      expect(domainsLink).toBeInTheDocument();
    });

    it("should display About link", () => {
      render(<DesktopNavigation />);
      const aboutLink = screen.getByRole("link", {name: "About"});
      expect(aboutLink).toBeInTheDocument();
    });

    it("should not display My Profile when user is not signed in", () => {
      mockUseAuth.mockReturnValue({isSignedIn: false});
      render(<DesktopNavigation />);
      expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
    });

    it("should display My Profile when user is signed in", () => {
      mockUseAuth.mockReturnValue({isSignedIn: true});
      render(<DesktopNavigation />);
      expect(screen.getByRole("link", {name: "My Profile"})).toBeInTheDocument();
    });

    it("should have correct href for Domains link", () => {
      render(<DesktopNavigation />);
      const domainsLink = screen.getByRole("link", {name: "Domains"});
      expect(domainsLink).toHaveAttribute("href", "/domains");
    });

    it("should have correct href for About link", () => {
      render(<DesktopNavigation />);
      const aboutLink = screen.getByRole("link", {name: "About"});
      expect(aboutLink).toHaveAttribute("href", "/about");
    });

    it("should have correct href for My Profile link when signed in", () => {
      mockUseAuth.mockReturnValue({isSignedIn: true});
      render(<DesktopNavigation />);
      const profileLink = screen.getByRole("link", {name: "My Profile"});
      expect(profileLink).toHaveAttribute("href", "/my-profile");
    });

    it("should render navigation items as list items", () => {
      mockUseAuth.mockReturnValue({isSignedIn: true});
      const {container} = render(<DesktopNavigation />);
      // Get direct children list items (not nested ones)
      const mainList = container.querySelector("ul.flex");
      const directListItems = mainList?.querySelectorAll(":scope > li");
      expect(directListItems?.length).toBe(3); // Domains, About, My Profile
    });

    it("should be memoized", () => {
      expect(DesktopNavigation.displayName).toBe("DesktopNavigation");
    });

    it("should render child menu items for Domains", () => {
      render(<DesktopNavigation />);
      expect(screen.getByRole("link", {name: "Invoices"})).toBeInTheDocument();
    });

    it("should render grandchild items for Invoices", () => {
      render(<DesktopNavigation />);
      expect(screen.getByRole("link", {name: "Upload Scans"})).toBeInTheDocument();
      expect(screen.getByRole("link", {name: "View Scans"})).toBeInTheDocument();
      expect(screen.getByRole("link", {name: "My Invoices"})).toBeInTheDocument();
    });

    it("should render child menu items for About", () => {
      render(<DesktopNavigation />);
      expect(screen.getByRole("link", {name: "The Platform"})).toBeInTheDocument();
      expect(screen.getByRole("link", {name: "The Author"})).toBeInTheDocument();
    });
  });

  describe("MobileNavigation", () => {
    it("should render hamburger menu button", () => {
      render(<MobileNavigation />);
      const buttons = screen.getAllByRole("button");
      // Find the button that contains "Open navigation" text
      const hamburgerButton = buttons.find(
        (btn) => btn.textContent?.includes("Open navigation") || btn.querySelector(".sr-only")?.textContent === "Open navigation",
      );
      expect(hamburgerButton).toBeInTheDocument();
    });

    it("should have correct aria-expanded initially", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("should open mobile menu when hamburger button is clicked", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should display Navigation title when menu is open", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      expect(screen.getByText("Navigation")).toBeInTheDocument();
    });

    it("should close mobile menu when close button is clicked", () => {
      render(<MobileNavigation />);
      const openButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(openButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Find close button by aria-label
      const closeButton = screen.getByRole("button", {name: /close navigation/i});
      fireEvent.click(closeButton);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close mobile menu when overlay is clicked", () => {
      render(<MobileNavigation />);
      const openButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(openButton);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Click the overlay
      const overlay = document.querySelector("[aria-hidden='true']");
      expect(overlay).toBeInTheDocument();
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display Domains and About links when menu is open", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("link", {name: "Domains"})).toBeInTheDocument();
      expect(within(dialog).getByRole("link", {name: "About"})).toBeInTheDocument();
    });

    it("should not display My Profile when user is not signed in", () => {
      mockUseAuth.mockReturnValue({isSignedIn: false});
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
    });

    it("should display My Profile when user is signed in", () => {
      mockUseAuth.mockReturnValue({isSignedIn: true});
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("link", {name: "My Profile"})).toBeInTheDocument();
    });

    it("should expand child items when chevron is clicked", () => {
      render(<MobileNavigation />);
      const menuButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      // Find expand button for Domains
      const expandButtons = within(dialog).getAllByRole("button", {expanded: false});
      const domainExpandButton = expandButtons[0];

      if (domainExpandButton) {
        fireEvent.click(domainExpandButton);
        expect(domainExpandButton).toHaveAttribute("aria-expanded", "true");
      }
    });

    it("should toggle child items open and closed", () => {
      render(<MobileNavigation />);
      const menuButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const expandButtons = within(dialog).getAllByRole("button", {expanded: false});
      const expandButton = expandButtons[0];

      if (expandButton) {
        // Open
        fireEvent.click(expandButton);
        expect(expandButton).toHaveAttribute("aria-expanded", "true");

        // Close
        fireEvent.click(expandButton);
        expect(expandButton).toHaveAttribute("aria-expanded", "false");
      }
    });

    it("should have correct aria-modal on dialog", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("should have correct id on mobile navigation", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});

      fireEvent.click(button);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("id", "mobile-navigation");
    });

    it("should have aria-controls pointing to mobile-navigation", () => {
      render(<MobileNavigation />);
      const button = screen.getByRole("button", {expanded: false});
      expect(button).toHaveAttribute("aria-controls", "mobile-navigation");
    });

    it("should be memoized", () => {
      expect(MobileNavigation.displayName).toBe("MobileNavigation");
    });

    it("should render screen reader only text for hamburger button", () => {
      render(<MobileNavigation />);
      const srText = screen.getByText("Open navigation");
      expect(srText).toHaveClass("sr-only");
    });

    it("should show Invoice children when Domains is expanded", () => {
      render(<MobileNavigation />);
      const menuButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const expandButtons = within(dialog).getAllByRole("button", {expanded: false});

      if (expandButtons[0]) {
        fireEvent.click(expandButtons[0]);
        expect(within(dialog).getByRole("link", {name: "Invoices"})).toBeInTheDocument();
      }
    });

    it("should show grandchild links when Domains is expanded", () => {
      render(<MobileNavigation />);
      const menuButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const expandButtons = within(dialog).getAllByRole("button", {expanded: false});

      if (expandButtons[0]) {
        fireEvent.click(expandButtons[0]);
        expect(within(dialog).getByRole("link", {name: "Upload Scans"})).toBeInTheDocument();
        expect(within(dialog).getByRole("link", {name: "View Scans"})).toBeInTheDocument();
        expect(within(dialog).getByRole("link", {name: "My Invoices"})).toBeInTheDocument();
      }
    });

    it("should show About children when About is expanded", () => {
      render(<MobileNavigation />);
      const menuButton = screen.getByRole("button", {expanded: false});

      fireEvent.click(menuButton);

      const dialog = screen.getByRole("dialog");
      const expandButtons = within(dialog).getAllByRole("button", {expanded: false});

      // About is the second expand button
      if (expandButtons[1]) {
        fireEvent.click(expandButtons[1]);
        expect(within(dialog).getByRole("link", {name: "The Platform"})).toBeInTheDocument();
        expect(within(dialog).getByRole("link", {name: "The Author"})).toBeInTheDocument();
      }
    });
  });

  describe("useNavigationItems hook (tested through components)", () => {
    it("should show My Profile when signed in and hide when signed out", () => {
      // Test signed out state
      mockUseAuth.mockReturnValue({isSignedIn: false});
      const {unmount: unmount1} = render(<DesktopNavigation />);
      expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
      unmount1();

      // Test signed in state (requires new mount since component is memoized)
      mockUseAuth.mockReturnValue({isSignedIn: true});
      render(<DesktopNavigation />);
      expect(screen.getByRole("link", {name: "My Profile"})).toBeInTheDocument();
    });

    it("should include correct nested structure for Domains", () => {
      render(<DesktopNavigation />);

      // Domains has Invoices child
      const invoicesLink = screen.getByRole("link", {name: "Invoices"});
      expect(invoicesLink).toHaveAttribute("href", "/domains/invoices");

      // Invoices has children
      expect(screen.getByRole("link", {name: "Upload Scans"})).toHaveAttribute("href", "/domains/invoices/upload-scans");
    });

    it("should include correct nested structure for About", () => {
      render(<DesktopNavigation />);

      expect(screen.getByRole("link", {name: "The Platform"})).toHaveAttribute("href", "/about/the-platform");
      expect(screen.getByRole("link", {name: "The Author"})).toHaveAttribute("href", "/about/the-author");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined isSignedIn (falsy)", () => {
      mockUseAuth.mockReturnValue({isSignedIn: undefined});
      render(<DesktopNavigation />);
      expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
    });

    it("should handle null isSignedIn (falsy)", () => {
      mockUseAuth.mockReturnValue({isSignedIn: null});
      render(<DesktopNavigation />);
      expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
    });

    it("should render with correct container classes", () => {
      const {container} = render(<DesktopNavigation />);
      const navContainer = container.querySelector("div");
      expect(navContainer).toHaveClass("dark:text-white");
    });

    it("should render arrow icons in desktop dropdown", () => {
      render(<DesktopNavigation />);
      // Check for arrow spans
      const arrows = screen.getAllByText("→");
      expect(arrows.length).toBeGreaterThan(0);
    });
  });
});
