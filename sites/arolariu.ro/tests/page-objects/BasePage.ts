/**
 * @fileoverview Base page object with common functionality.
 * All page objects should extend this class.
 * @module tests/page-objects/BasePage
 */

import {expect, type Locator, type Page} from "@playwright/test";

import {TIMEOUTS} from "../config";
import {navigateWithRetry, type NavigateOptions, type NavigationResult} from "../fixtures/navigation.fixture";

/* eslint-disable no-magic-numbers -- Page objects use explicit timeout values */

/**
 * Base class for all page objects.
 * Provides common functionality for navigation, waiting, and assertions.
 */
export abstract class BasePage {
  /**
   * Default timeout for element operations.
   */
  protected readonly defaultTimeout = TIMEOUTS.element;

  /**
   * Playwright page instance.
   */
  protected readonly page: Page;

  /**
   * Create a new page object.
   * @param page - Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to this page's URL with retry logic.
   * Override in subclasses to set the specific URL.
   */
  abstract navigate(): Promise<NavigationResult>;

  /**
   * Wait for the page to be ready for interaction.
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Navigate to a URL with retry logic.
   */
  protected async navigateTo(url: string, options?: NavigateOptions): Promise<NavigationResult> {
    return navigateWithRetry(this.page, url, options);
  }

  /**
   * Get the current URL.
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Get the page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Take a screenshot of the current page state.
   */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({path: `screenshots/${name}.png`});
  }

  /**
   * Wait for an element to be visible.
   */
  protected async waitForVisible(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).toBeVisible({timeout: timeout ?? this.defaultTimeout});
  }

  /**
   * Wait for an element to be hidden.
   */
  protected async waitForHidden(locator: Locator, timeout?: number): Promise<void> {
    await expect(locator).toBeHidden({timeout: timeout ?? this.defaultTimeout});
  }

  /**
   * Scroll an element into view.
   */
  protected async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded({timeout: this.defaultTimeout});
  }

  /**
   * Click an element with force option for overlays.
   */
  protected async forceClick(locator: Locator): Promise<void> {
    await locator.click({force: true, timeout: this.defaultTimeout});
  }

  /**
   * Get text content of an element.
   */
  protected async getText(locator: Locator): Promise<string | null> {
    return locator.textContent({timeout: this.defaultTimeout});
  }

  /**
   * Check if an element is visible.
   */
  protected async isVisible(locator: Locator): Promise<boolean> {
    try {
      await expect(locator).toBeVisible({timeout: 1000});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get count of matching elements.
   */
  protected async getCount(locator: Locator): Promise<number> {
    return locator.count();
  }
}

/**
 * Base class for component page objects (Header, Footer, etc.).
 * Components are parts of pages that appear on multiple pages.
 */
export abstract class BaseComponent {
  /**
   * Default timeout for element operations.
   */
  protected readonly defaultTimeout = TIMEOUTS.element;

  /**
   * Playwright page instance.
   */
  protected readonly page: Page;

  /**
   * Create a new component object.
   * @param page - Playwright page instance
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get the root locator for this component.
   */
  abstract get root(): Locator;

  /**
   * Assert the component is visible.
   */
  async shouldBeVisible(): Promise<this> {
    await expect(this.root).toBeVisible({timeout: this.defaultTimeout});
    return this;
  }

  /**
   * Assert the component is hidden.
   */
  async shouldBeHidden(): Promise<this> {
    await expect(this.root).toBeHidden({timeout: this.defaultTimeout});
    return this;
  }

  /**
   * Wait for the component to be ready.
   */
  async waitForReady(): Promise<void> {
    await this.shouldBeVisible();
  }

  /**
   * Scroll the component into view.
   */
  async scrollIntoView(): Promise<void> {
    await this.root.scrollIntoViewIfNeeded({timeout: this.defaultTimeout});
  }

  /**
   * Get text content of the component.
   */
  async getText(): Promise<string | null> {
    return this.root.textContent({timeout: this.defaultTimeout});
  }

  /**
   * Check if component is visible without throwing.
   */
  async isVisible(): Promise<boolean> {
    try {
      await expect(this.root).toBeVisible({timeout: 1000});
      return true;
    } catch {
      return false;
    }
  }
}

/* eslint-enable no-magic-numbers */
