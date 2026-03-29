/**
 * @fileoverview Unit tests for MobileBottomNav component.
 * @module app/domains/invoices/_components/MobileBottomNav.test
 */

import {render, screen} from "@testing-library/react";
import {usePathname} from "next/navigation";
import {beforeEach, describe, expect, it, vi} from "vitest";
import MobileBottomNav from "./MobileBottomNav";

// Mock next/navigation (usePathname)
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn()}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl (useTranslations returns key as-is)
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices");
  });

  it("should render all navigation items", () => {
    render(<MobileBottomNav />);
    // Global mock returns keys as-is: t("home") => "home"
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.getByText("scan")).toBeInTheDocument();
    expect(screen.getByText("invoices")).toBeInTheDocument();
    expect(screen.getByText("profile")).toBeInTheDocument();
  });

  it("should render correct number of links", () => {
    render(<MobileBottomNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });

  it("should mark home as active when pathname exactly matches /domains/invoices", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices");
    render(<MobileBottomNav />);
    const homeLink = screen.getByText("home").closest("a");
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("should not mark home as active for sub-routes", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans");
    render(<MobileBottomNav />);
    const homeLink = screen.getByText("home").closest("a");
    expect(homeLink).not.toHaveAttribute("aria-current");
  });

  it("should mark scan as active for upload-scans routes", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/upload-scans");
    render(<MobileBottomNav />);
    const scanLink = screen.getByText("scan").closest("a");
    expect(scanLink).toHaveAttribute("aria-current", "page");
  });

  it("should mark invoices as active for view-invoices routes", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/view-invoices");
    render(<MobileBottomNav />);
    const invoicesLink = screen.getByText("invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("aria-current", "page");
  });

  it("should have correct href attributes", () => {
    render(<MobileBottomNav />);
    expect(screen.getByText("home").closest("a")).toHaveAttribute("href", "/domains/invoices");
    expect(screen.getByText("scan").closest("a")).toHaveAttribute("href", "/domains/invoices/upload-scans");
    expect(screen.getByText("invoices").closest("a")).toHaveAttribute("href", "/domains/invoices/view-invoices");
    expect(screen.getByText("profile").closest("a")).toHaveAttribute("href", "/auth/profile");
  });

  it("should render icons with aria-hidden", () => {
    const {container} = render(<MobileBottomNav />);
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  it("should handle nested routes correctly", () => {
    vi.mocked(usePathname).mockReturnValue("/domains/invoices/view-invoices/filter");
    render(<MobileBottomNav />);
    const invoicesLink = screen.getByText("invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("aria-current", "page");
  });

  it("should not mark any tab active for unrelated routes", () => {
    vi.mocked(usePathname).mockReturnValue("/some/other/route");
    render(<MobileBottomNav />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveAttribute("aria-current");
    });
  });
});
