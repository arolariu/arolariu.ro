/**
 * @fileoverview Footer component page object.
 * Encapsulates all footer-related selectors and actions.
 * @module tests/page-objects/FooterComponent
 */

import {expect, type Locator, type Page} from "@playwright/test";

import {TIMEOUTS} from "../config";
import {navigateWithRetry, type NavigationResult} from "../fixtures/navigation.fixture";
import {BaseComponent} from "./BasePage";

/* eslint-disable no-magic-numbers -- Page objects use explicit values */

/**
 * Selectors for the Footer component.
 * Centralized here for easy maintenance.
 */
const FOOTER_SELECTORS = {
  /** Root footer element */
  root: "footer",

  /** SVG wave decoration */
  svgWave: "footer > svg[preserveAspectRatio='none']",

  /** Hero section with logo and site name */
  heroLink: "footer a[title='AROLARIU.RO']",

  /** Logo image in footer */
  logo: "footer a[title='AROLARIU.RO'] img",

  /** Site name span */
  siteName: "footer a[title='AROLARIU.RO'] span",

  /** Footer description (prose content) */
  description: "footer div[class*='md:col-span-1'] div[class*='mt-4'] .prose",

  /** Subdomains section heading */
  subdomainsHeading: "footer div > p:has-text('Subdomains')",

  /** About section heading */
  aboutHeading: "footer div > p:has-text('About')",

  /** All internal links */
  internalLinks: "footer a[href^='/']:not([href*='#'])",

  /** All external links */
  externalLinks: "footer a[target='_blank']",

  /** API subdomain link */
  apiLink: "footer a[href='https://api.arolariu.ro']",

  /** Docs subdomain link */
  docsLink: "footer a[href='https://docs.arolariu.ro']",

  /** About page link */
  aboutLink: "footer a[href='/about/']",

  /** Acknowledgements link */
  acknowledgementsLink: "footer a[href='/acknowledgements/']",

  /** Terms of service link */
  termsLink: "footer a[href='/terms-of-service/']",

  /** Privacy policy link */
  privacyLink: "footer a[href='/privacy-policy/']",

  /** Copyright text */
  copyright: "footer p:has-text('Alexandru-Razvan Olariu')",

  /** GitHub repository link */
  githubRepoLink: "footer a[href='https://github.com/arolariu/arolariu.ro/']",

  /** Author's GitHub profile link */
  authorGithubLink: "footer a[href='https://github.com/arolariu']",

  /** Author's LinkedIn link */
  authorLinkedinLink: "footer a[href='https://linkedin.com/in/olariu-alexandru']",

  /** Build info section */
  buildInfo: "footer div.text-slate-300",

  /** Commit SHA element */
  commitSha: "footer span:has-text('Commit SHA:') code",
} as const;

/**
 * Link information for footer links.
 */
export interface FooterLink {
  /** Link text content */
  text: string | null;
  /** Link href attribute */
  href: string | null;
  /** Whether link opens in new tab */
  isExternal: boolean;
}

/**
 * Footer component page object.
 * Provides methods for interacting with the site footer.
 *
 * @example
 * ```typescript
 * const footer = new FooterComponent(page);
 * await footer.shouldBeVisible();
 * await footer.shouldHaveCopyright(2024);
 * ```
 */
export class FooterComponent extends BaseComponent {
  /**
   * Selectors used by this component.
   * Exposed for advanced usage if needed.
   */
  static readonly selectors = FOOTER_SELECTORS;

  // eslint-disable-next-line no-useless-constructor -- for clarity
  constructor(page: Page) {
    super(page);
  }

  // ==================== Locators ====================

  /**
   * Root footer element.
   */
  get root(): Locator {
    return this.page.locator(FOOTER_SELECTORS.root);
  }

  /**
   * SVG wave decoration.
   */
  get svgWave(): Locator {
    return this.page.locator(FOOTER_SELECTORS.svgWave).first();
  }

  /**
   * Hero section link with logo.
   */
  get heroLink(): Locator {
    return this.page.locator(FOOTER_SELECTORS.heroLink);
  }

  /**
   * Logo image.
   */
  get logo(): Locator {
    return this.page.locator(FOOTER_SELECTORS.logo);
  }

  /**
   * Footer description prose.
   */
  get description(): Locator {
    return this.page.locator(FOOTER_SELECTORS.description).first();
  }

  /**
   * All internal footer links.
   */
  get internalLinks(): Locator {
    return this.page.locator(FOOTER_SELECTORS.internalLinks);
  }

  /**
   * All external footer links.
   */
  get externalLinks(): Locator {
    return this.page.locator(FOOTER_SELECTORS.externalLinks);
  }

  /**
   * Copyright text element.
   */
  get copyright(): Locator {
    return this.page.locator(FOOTER_SELECTORS.copyright).first();
  }

  /**
   * Build info section.
   */
  get buildInfo(): Locator {
    return this.page.locator(FOOTER_SELECTORS.buildInfo).first();
  }

  // ==================== Actions ====================

  /**
   * Click the footer logo to navigate home.
   */
  async clickLogo(): Promise<void> {
    await this.heroLink.click();
    await this.page.waitForURL(/\/$/u, {timeout: TIMEOUTS.navigation});
  }

  /**
   * Scroll footer into view.
   */
  async scrollToFooter(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded();
  }

  /**
   * Get all internal link hrefs.
   */
  async getInternalLinkHrefs(): Promise<string[]> {
    const count = await this.internalLinks.count();
    const hrefs: string[] = [];

    for (let i = 0; i < count; i++) {
      const href = await this.internalLinks.nth(i).getAttribute("href");
      if (href && !hrefs.includes(href)) {
        hrefs.push(href);
      }
    }

    return hrefs;
  }

  /**
   * Check if all internal links are navigable (return 200).
   */
  async checkAllInternalLinks(): Promise<Map<string, NavigationResult>> {
    const hrefs = await this.getInternalLinkHrefs();
    const results = new Map<string, NavigationResult>();

    for (const href of hrefs) {
      // Open in new page to avoid affecting current state
      const newPage = await this.page.context().newPage();
      try {
        const result = await navigateWithRetry(newPage, href);
        results.set(href, result);
      } finally {
        await newPage.close();
      }
    }

    return results;
  }

  // ==================== Assertions ====================

  /**
   * Assert the footer is visible.
   */
  override async shouldBeVisible(): Promise<this> {
    await expect(this.root).toBeVisible({timeout: TIMEOUTS.element});
    return this;
  }

  /**
   * Assert the SVG wave is visible.
   */
  async shouldHaveSvgWave(): Promise<this> {
    await expect(this.svgWave).toBeVisible();
    return this;
  }

  /**
   * Assert the logo is visible and links to home.
   */
  async shouldHaveLogo(): Promise<this> {
    await expect(this.heroLink).toBeVisible();
    await expect(this.heroLink).toHaveAttribute("href", "/");
    await expect(this.logo).toBeVisible();
    return this;
  }

  /**
   * Assert the description is visible and not empty.
   */
  async shouldHaveDescription(): Promise<this> {
    await expect(this.description).toBeVisible();
    await expect(this.description).not.toBeEmpty();
    return this;
  }

  /**
   * Assert copyright includes current year.
   */
  async shouldHaveCopyright(year?: number): Promise<this> {
    const currentYear = year ?? new Date().getFullYear();
    await expect(this.copyright).toBeVisible();
    await expect(this.copyright).toContainText(`2022-${currentYear} Alexandru-Razvan Olariu`);
    return this;
  }

  /**
   * Assert subdomains section exists.
   */
  async shouldHaveSubdomainsSection(): Promise<this> {
    const heading = this.page.locator(FOOTER_SELECTORS.subdomainsHeading).first();
    await expect(heading).toBeVisible();
    return this;
  }

  /**
   * Assert about section exists.
   */
  async shouldHaveAboutSection(): Promise<this> {
    const heading = this.page.locator(FOOTER_SELECTORS.aboutHeading).first();
    await expect(heading).toBeVisible();
    return this;
  }

  /**
   * Assert API subdomain link has correct attributes.
   */
  async shouldHaveApiLink(): Promise<this> {
    const link = this.page.locator(FOOTER_SELECTORS.apiLink);
    await expect(link).toBeVisible({timeout: TIMEOUTS.element});
    await expect(link).toHaveAttribute("href", "https://api.arolariu.ro");
    return this;
  }

  /**
   * Assert docs subdomain link has correct attributes.
   */
  async shouldHaveDocsLink(): Promise<this> {
    const link = this.page.locator(FOOTER_SELECTORS.docsLink);
    await expect(link).toBeVisible({timeout: TIMEOUTS.element});
    await expect(link).toHaveAttribute("href", "https://docs.arolariu.ro");
    return this;
  }

  /**
   * Assert GitHub repository link exists with correct attributes.
   */
  async shouldHaveGithubRepoLink(): Promise<this> {
    const link = this.page.locator(FOOTER_SELECTORS.githubRepoLink);
    await expect(link).toBeVisible({timeout: TIMEOUTS.element});
    await expect(link).toHaveAttribute("target", "_blank");
    return this;
  }

  /**
   * Assert social profile links exist.
   */
  async shouldHaveSocialLinks(): Promise<this> {
    // GitHub profile
    const githubLink = this.page.locator(FOOTER_SELECTORS.authorGithubLink);
    await expect(githubLink).toBeVisible({timeout: TIMEOUTS.element});
    await expect(githubLink).toHaveAttribute("target", "_blank");

    // LinkedIn profile
    const linkedinLink = this.page.locator(FOOTER_SELECTORS.authorLinkedinLink);
    await expect(linkedinLink).toBeVisible({timeout: TIMEOUTS.element});
    await expect(linkedinLink).toHaveAttribute("target", "_blank");

    return this;
  }

  /**
   * Assert build info is visible.
   */
  async shouldHaveBuildInfo(): Promise<this> {
    await expect(this.buildInfo).toBeVisible();
    await expect(this.buildInfo).toContainText(/Built on/iu);
    return this;
  }

  /**
   * Assert all internal links return 200.
   */
  async shouldHaveAllLinksNavigable(): Promise<this> {
    const results = await this.checkAllInternalLinks();

    for (const [href, result] of results) {
      expect(result.status, `Link ${href} should return 200 (got ${result.status})`).toBe(200);
    }

    return this;
  }

  // ==================== Data Retrieval ====================

  /**
   * Get all footer links with their info.
   */
  async getAllLinks(): Promise<FooterLink[]> {
    const links: FooterLink[] = [];

    // Internal links
    const internalCount = await this.internalLinks.count();
    for (let i = 0; i < internalCount; i++) {
      const link = this.internalLinks.nth(i);
      links.push({
        text: await link.textContent(),
        href: await link.getAttribute("href"),
        isExternal: false,
      });
    }

    // External links
    const externalCount = await this.externalLinks.count();
    for (let i = 0; i < externalCount; i++) {
      const link = this.externalLinks.nth(i);
      links.push({
        text: await link.textContent(),
        href: await link.getAttribute("href"),
        isExternal: true,
      });
    }

    return links;
  }

  /**
   * Get the build timestamp from footer.
   */
  async getBuildTimestamp(): Promise<string | null> {
    const text = await this.buildInfo.textContent();
    const match = text?.match(/Built on (.+?) -/u);
    return match?.[1] ?? null;
  }

  /**
   * Get the commit SHA from footer.
   */
  async getCommitSha(): Promise<string | null> {
    const sha = this.page.locator(FOOTER_SELECTORS.commitSha).first();
    return sha.textContent();
  }
}

/* eslint-enable no-magic-numbers */
