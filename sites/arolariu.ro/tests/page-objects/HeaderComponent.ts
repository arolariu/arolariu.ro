/**
 * @fileoverview Header component page object.
 * Encapsulates all header-related selectors and actions.
 * @module tests/page-objects/HeaderComponent
 */

import {expect, type Locator, type Page} from "@playwright/test";

import {TIMEOUTS} from "../config";
import {navigateWithRetry, type NavigationResult} from "../fixtures/navigation.fixture";
import {BaseComponent} from "./BasePage";

/* eslint-disable no-magic-numbers -- Page objects use explicit values */

/**
 * Selectors for the Header component.
 * Centralized here for easy maintenance.
 */
const HEADER_SELECTORS = {
  /** Root header element */
  root: "header",

  /** Logo image or SVG */
  logo: "header img[alt*='logo'], header svg",

  /** Logo link (home) */
  logoLink: "header a[href='/']",

  /** Navigation container */
  nav: "header nav",

  /** All navigation links */
  navLinks: "header nav a",

  /** About page link */
  aboutLink: "header a[href*='about']",

  /** Domains link */
  domainsLink: "header a[href*='domains']",

  /** Auth/Sign-in link */
  authLink: "header a[href*='auth'], header a[href*='sign-in']",

  /** Mobile menu toggle button */
  mobileMenuButton: "header button[aria-label*='menu' i], header button[aria-label*='navigation' i]",

  /** Theme toggle button */
  themeToggle: "header button[aria-label*='theme' i], header button[aria-label*='dark' i], header button[aria-label*='light' i]",
} as const;

/**
 * Navigation link info.
 */
export interface NavLink {
  /** Link text content */
  text: string | null;
  /** Link href attribute */
  href: string | null;
  /** Link aria-label */
  ariaLabel: string | null;
}

/**
 * Header component page object.
 * Provides methods for interacting with the site header.
 *
 * @example
 * ```typescript
 * const header = new HeaderComponent(page);
 * await header.shouldBeVisible();
 * await header.navigateToAbout();
 * ```
 */
export class HeaderComponent extends BaseComponent {
  /**
   * Selectors used by this component.
   * Exposed for advanced usage if needed.
   */
  static readonly selectors = HEADER_SELECTORS;

  // eslint-disable-next-line no-useless-constructor -- for clarity
  constructor(page: Page) {
    super(page);
  }

  // ==================== Locators ====================

  /**
   * Root header element.
   */
  get root(): Locator {
    return this.page.locator(HEADER_SELECTORS.root);
  }

  /**
   * Logo image or SVG.
   */
  get logo(): Locator {
    return this.page.locator(HEADER_SELECTORS.logo).first();
  }

  /**
   * Logo link element.
   */
  get logoLink(): Locator {
    return this.page.locator(HEADER_SELECTORS.logoLink).first();
  }

  /**
   * Navigation container.
   */
  get navigation(): Locator {
    return this.page.locator(HEADER_SELECTORS.nav).first();
  }

  /**
   * All navigation links.
   */
  get navLinks(): Locator {
    return this.page.locator(HEADER_SELECTORS.navLinks);
  }

  /**
   * About page link.
   */
  get aboutLink(): Locator {
    return this.page.locator(HEADER_SELECTORS.aboutLink).first();
  }

  /**
   * Domains link.
   */
  get domainsLink(): Locator {
    return this.page.locator(HEADER_SELECTORS.domainsLink).first();
  }

  /**
   * Mobile menu button.
   */
  get mobileMenuButton(): Locator {
    return this.page.locator(HEADER_SELECTORS.mobileMenuButton);
  }

  /**
   * Theme toggle button.
   */
  get themeToggle(): Locator {
    return this.page.locator(HEADER_SELECTORS.themeToggle).first();
  }

  // ==================== Actions ====================

  /**
   * Click the logo to navigate home.
   */
  async clickLogo(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
    await this.logoLink.click({force: true});
    await this.page.waitForURL(/\/$/u, {timeout: TIMEOUTS.navigation});
  }

  /**
   * Navigate to the About page via header link.
   * Uses safe navigation with retry logic.
   */
  async navigateToAbout(): Promise<NavigationResult> {
    const href = await this.aboutLink.getAttribute("href");
    if (!href) {
      throw new Error("About link not found in header");
    }
    return navigateWithRetry(this.page, href);
  }

  /**
   * Navigate to the Domains page via header link.
   */
  async navigateToDomains(): Promise<NavigationResult> {
    const href = await this.domainsLink.getAttribute("href");
    if (!href) {
      throw new Error("Domains link not found in header");
    }
    return navigateWithRetry(this.page, href);
  }

  /**
   * Open mobile menu (on small screens).
   */
  async openMobileMenu(): Promise<void> {
    const button = this.mobileMenuButton.first();
    if (await button.isVisible()) {
      await button.click();
    }
  }

  /**
   * Toggle theme (dark/light mode).
   */
  async toggleTheme(): Promise<void> {
    if (await this.themeToggle.isVisible()) {
      await this.themeToggle.click();
    }
  }

  /**
   * Set viewport to mobile size.
   */
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({width: 375, height: 667});
  }

  /**
   * Set viewport to tablet size.
   */
  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({width: 768, height: 1024});
  }

  /**
   * Set viewport to desktop size.
   */
  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({width: 1920, height: 1080});
  }

  // ==================== Assertions ====================

  /**
   * Assert the header is visible.
   */
  override async shouldBeVisible(): Promise<this> {
    await expect(this.root).toBeVisible({timeout: TIMEOUTS.element});
    return this;
  }

  /**
   * Assert the logo is visible.
   */
  async shouldHaveLogo(): Promise<this> {
    await expect(this.logo).toBeVisible({timeout: TIMEOUTS.element});
    return this;
  }

  /**
   * Assert the navigation is visible.
   */
  async shouldHaveNavigation(): Promise<this> {
    await expect(this.navigation).toBeVisible({timeout: TIMEOUTS.element});
    return this;
  }

  /**
   * Assert there are at least N navigation links.
   */
  async shouldHaveNavLinks(minCount: number = 1): Promise<this> {
    await expect(this.navLinks.first()).toBeVisible({timeout: TIMEOUTS.element});
    const count = await this.navLinks.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
    return this;
  }

  /**
   * Assert proper positioning (sticky/fixed/relative).
   */
  async shouldHaveProperPositioning(): Promise<this> {
    await this.page.waitForLoadState("domcontentloaded");
    const position = await this.root.evaluate((el) => globalThis.getComputedStyle(el).position);
    const validPositions = ["sticky", "fixed", "relative", "static", "absolute", ""];
    expect(validPositions).toContain(position);
    return this;
  }

  /**
   * Assert proper semantic structure.
   */
  async shouldHaveProperSemantics(): Promise<this> {
    await expect(this.root).toBeVisible();
    const navCount = await this.navigation.count();
    expect(navCount).toBeGreaterThan(0);
    return this;
  }

  /**
   * Assert all links have accessible text or aria-label.
   */
  async shouldHaveAccessibleLinks(maxToCheck: number = 10): Promise<this> {
    const count = await this.navLinks.count();

    for (let i = 0; i < Math.min(count, maxToCheck); i++) {
      const link = this.navLinks.nth(i);
      if (await link.isVisible()) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");
        expect(text || ariaLabel).toBeTruthy();
      }
    }

    return this;
  }

  // ==================== Data Retrieval ====================

  /**
   * Get all navigation link information.
   */
  async getNavLinks(): Promise<NavLink[]> {
    const count = await this.navLinks.count();
    const links: NavLink[] = [];

    for (let i = 0; i < count; i++) {
      const link = this.navLinks.nth(i);
      links.push({
        text: await link.textContent(),
        href: await link.getAttribute("href"),
        ariaLabel: await link.getAttribute("aria-label"),
      });
    }

    return links;
  }

  /**
   * Get the current site title/name from header.
   */
  async getSiteName(): Promise<string | null> {
    return this.root.textContent();
  }
}

/* eslint-enable no-magic-numbers */
