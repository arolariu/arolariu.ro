// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {fireEvent, render, screen, within} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it, vi} from "vitest";
import messages from "../../messages/en.json";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

const useAuth = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs", () => ({useAuth}));

const invoiceLinks = [
  ["Invoices", "/domains/invoices"],
  ["Upload Scans", "/domains/invoices/upload-scans"],
  ["View Scans", "/domains/invoices/view-scans"],
  ["My Invoices", "/domains/invoices/view-invoices"],
] as const;
const aboutLinks = [
  ["The Platform", "/about/the-platform"],
  ["The Author", "/about/the-author"],
] as const;

function renderNavigation(view: React.JSX.Element, signedIn: boolean | undefined): void {
  useAuth.mockReturnValue({isLoaded: signedIn !== undefined, isSignedIn: signedIn});
  render(
    <NextIntlClientProvider
      locale='en'
      messages={{app: {navigation: messages.app.navigation}}}>
      {view}
    </NextIntlClientProvider>,
  );
}

function openMobile(): HTMLElement {
  const trigger = screen.getByRole("button", {name: "Open navigation", expanded: false});
  expect(trigger).toHaveAttribute("aria-controls", "mobile-navigation");

  fireEvent.click(trigger);

  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const dialog = screen.getByRole("dialog", {name: "Navigation"});
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAttribute("id", "mobile-navigation");
  return dialog;
}

function expandButton(dialog: HTMLElement, label: string): HTMLElement {
  const item = within(dialog).getByRole("link", {name: label}).closest("li");
  if (!item) throw new Error(`Missing navigation item for ${label}`);
  return within(item).getByRole("button", {expanded: false});
}

describe("desktop navigation", () => {
  it("renders real links for each translated destination and hides decorative arrows from assistive technology", () => {
    renderNavigation(<DesktopNavigation />, false);

    expect(screen.getByRole("link", {name: "Domains"})).toHaveAttribute("href", "/domains");
    expect(screen.getByRole("link", {name: "About"})).toHaveAttribute("href", "/about");
    for (const [label, href] of [...invoiceLinks, ...aboutLinks]) {
      expect(screen.getByRole("link", {name: label})).toHaveAttribute("href", href);
    }
    for (const arrow of screen.getAllByText("→")) expect(arrow).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
  });

  it("does not offer a profile destination before Clerk has loaded", () => {
    renderNavigation(<DesktopNavigation />, undefined);

    expect(screen.getByRole("link", {name: "Domains"})).toBeInTheDocument();
    expect(screen.queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();
  });

  it("includes the profile destination for a signed-in user", () => {
    renderNavigation(<DesktopNavigation />, true);

    expect(screen.getByRole("link", {name: "My Profile"})).toHaveAttribute("href", "/my-profile");
  });
});

describe("mobile navigation", () => {
  it.each(["header", "backdrop"])("closes from the %s and restores the trigger state", (control) => {
    renderNavigation(<MobileNavigation />, false);
    const dialog = openMobile();
    const header = within(dialog).getByRole("button", {name: "Close navigation"});
    const backdrop = screen.getAllByRole("button", {name: "Close navigation"}).find((button) => !dialog.contains(button));
    if (!backdrop) throw new Error("Missing mobile backdrop control");
    expect(within(dialog).getByRole("link", {name: "Domains"})).toHaveAttribute("href", "/domains");
    expect(within(dialog).getByRole("link", {name: "About"})).toHaveAttribute("href", "/about");
    expect(within(dialog).queryByRole("link", {name: "My Profile"})).not.toBeInTheDocument();

    fireEvent.click(control === "header" ? header : backdrop);

    expect(screen.queryByRole("dialog", {name: "Navigation"})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Open navigation", expanded: false})).toBeInTheDocument();
  });

  it("toggles nested destinations independently and preserves their real links", () => {
    renderNavigation(<MobileNavigation />, true);
    const dialog = openMobile();
    const links = within(dialog);
    const domains = expandButton(dialog, "Domains");
    const about = expandButton(dialog, "About");
    expect(links.queryByRole("link", {name: "Upload Scans"})).not.toBeInTheDocument();
    expect(links.queryByRole("link", {name: "The Platform"})).not.toBeInTheDocument();

    fireEvent.click(domains);
    fireEvent.click(about);

    expect(domains).toHaveAttribute("aria-expanded", "true");
    expect(about).toHaveAttribute("aria-expanded", "true");
    for (const [label, href] of [...invoiceLinks, ...aboutLinks]) {
      expect(links.getByRole("link", {name: label})).toHaveAttribute("href", href);
    }
    expect(links.getByRole("link", {name: "My Profile"})).toHaveAttribute("href", "/my-profile");

    fireEvent.click(domains);

    expect(domains).toHaveAttribute("aria-expanded", "false");
    expect(links.queryByRole("link", {name: "Invoices"})).not.toBeInTheDocument();
    expect(links.getByRole("link", {name: "The Platform"})).toBeInTheDocument();
  });
});
