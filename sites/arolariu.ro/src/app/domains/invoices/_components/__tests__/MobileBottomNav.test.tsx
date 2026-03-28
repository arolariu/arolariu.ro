/**
 * @fileoverview Unit tests for MobileBottomNav component.
 * @module app/domains/invoices/_components/__tests__/MobileBottomNav.test
 */

import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {usePathname} from "next/navigation";
import {beforeEach, describe, expect, it, vi} from "vitest";
import MobileBottomNav from "../MobileBottomNav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockMessages = {
  Invoices: {
    Shared: {
      mobileNav: {
        ariaLabel: "Mobile navigation",
        home: "Home",
        scan: "Scan",
        invoices: "Invoices",
        profile: "Profile",
      },
    },
  },
};

/**
 * Helper to render component with i18n context.
 *
 * @param component - The React component to render.
 * @returns The render result.
 */
function renderWithIntl(component: React.ReactElement): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={mockMessages}>
      {component}
    </NextIntlClientProvider>,
  );
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    // Reset mock before each test
    vi.mocked(usePathname).mockReturnValue("/domains/invoices");
  });

  it("should render all navigation items", () => {
    renderWithIntl(<MobileBottomNav />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Scan")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("should have correct aria-label on nav element", () => {
    renderWithIntl(<MobileBottomNav />);

    const nav = screen.getByRole("navigation", {name: "Mobile navigation"});
    expect(nav).toBeInTheDocument();
  });

  it("should render correct number of links", () => {
    renderWithIntl(<MobileBottomNav />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("should mark home as active when pathname exactly matches /domains/invoices", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices");
    renderWithIntl(<MobileBottomNav />);

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("should not mark home as active when pathname is /domains/invoices/upload-scans", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans");
    renderWithIntl(<MobileBottomNav />);

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).not.toHaveAttribute("aria-current");
  });

  it("should mark scan as active when pathname starts with /domains/invoices/upload-scans", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans");
    renderWithIntl(<MobileBottomNav />);

    const scanLink = screen.getByText("Scan").closest("a");
    expect(scanLink).toHaveAttribute("aria-current", "page");
  });

  it("should mark invoices as active when pathname starts with /domains/invoices/view-invoices", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/view-invoices");
    renderWithIntl(<MobileBottomNav />);

    const invoicesLink = screen.getByText("Invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("aria-current", "page");
  });

  it("should mark profile as active when pathname starts with /auth/profile", () => {
    vi.mocked(usePathname).mockReturnValue("/auth/profile");
    renderWithIntl(<MobileBottomNav />);

    const profileLink = screen.getByText("Profile").closest("a");
    expect(profileLink).toHaveAttribute("aria-current", "page");
  });

  it("should have correct href attributes on links", () => {
    renderWithIntl(<MobileBottomNav />);

    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/domains/invoices");
    expect(screen.getByText("Scan").closest("a")).toHaveAttribute("href", "/domains/invoices/upload-scans");
    expect(screen.getByText("Invoices").closest("a")).toHaveAttribute("href", "/domains/invoices/view-invoices");
    expect(screen.getByText("Profile").closest("a")).toHaveAttribute("href", "/auth/profile");
  });

  it("should render icons with aria-hidden attribute", () => {
    const {container} = renderWithIntl(<MobileBottomNav />);

    const icons = container.querySelectorAll('[aria-hidden="true"]');
    // 4 icons (one for each nav item)
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  it("should apply active class only to the current route", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans");
    const {container} = renderWithIntl(<MobileBottomNav />);

    const scanLink = screen.getByText("Scan").closest("a");
    expect(scanLink?.className).toContain("navItemActive");

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink?.className).not.toContain("navItemActive");
  });

  it("should handle nested routes correctly for scan tab", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans/confirm");
    renderWithIntl(<MobileBottomNav />);

    const scanLink = screen.getByText("Scan").closest("a");
    expect(scanLink).toHaveAttribute("aria-current", "page");
  });

  it("should handle nested routes correctly for invoices tab", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/view-invoices/filter");
    renderWithIntl(<MobileBottomNav />);

    const invoicesLink = screen.getByText("Invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("aria-current", "page");
  });

  it("should not mark any tab as active for unrelated routes", () => {
    vi.mocked(usePathname).mockReturnValue("/some/other/route");
    renderWithIntl(<MobileBottomNav />);

    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current");
    });
  });
});
