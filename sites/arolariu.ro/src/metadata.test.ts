/**
 * @fileoverview Unit tests for the metadata configuration module.
 * @module metadata.test
 *
 * @remarks
 * Tests the Next.js metadata configuration including:
 * - Base metadata object validation
 * - `createMetadata` function for page-specific overrides
 * - Locale mapping for OpenGraph metadata
 * - Title/description propagation to social media metadata
 */

import type {Twitter} from "next/dist/lib/metadata/types/twitter-types";
import {describe, expect, test} from "vitest";
import {createMetadata, metadata} from "./metadata";

// ============================================================================
// Base Metadata Tests
// ============================================================================

describe("metadata", () => {
  describe("base configuration", () => {
    test("has correct site name in title", () => {
      expect(metadata.title).toBeDefined();
      expect(metadata.title).toHaveProperty("absolute");
      expect(metadata.title).toHaveProperty("default");
      expect(metadata.title).toHaveProperty("template");

      const title = metadata.title as {absolute: string; default: string; template: string};
      expect(title.absolute).toContain("arolariu.ro");
      expect(title.template).toContain("arolariu.ro");
    });

    test("has description", () => {
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe("string");
      expect(metadata.description!.length).toBeGreaterThan(0);
    });

    test("has metadataBase URL", () => {
      expect(metadata.metadataBase).toBeDefined();
      expect(metadata.metadataBase).toBeInstanceOf(URL);
    });

    test("has application name", () => {
      expect(metadata.applicationName).toBe("arolariu.ro");
    });

    test("has author information", () => {
      expect(metadata.authors).toBeDefined();
      expect(Array.isArray(metadata.authors)).toBe(true);

      const authors = metadata.authors as Array<{name: string; url: URL}>;
      expect(authors).toHaveLength(1);
      expect(authors[0]).toHaveProperty("name", "Alexandru-Razvan Olariu");
    });

    test("has category", () => {
      expect(metadata.category).toBe("Technology");
    });

    test("has keywords array", () => {
      expect(metadata.keywords).toBeDefined();
      expect(Array.isArray(metadata.keywords)).toBe(true);
      expect(metadata.keywords!.length).toBeGreaterThan(0);
      expect(metadata.keywords).toContain("arolariu");
      expect(metadata.keywords).toContain("software engineer");
    });
  });

  describe("robots configuration", () => {
    test("allows indexing", () => {
      expect(metadata.robots).toBeDefined();
      expect(metadata.robots).toHaveProperty("index", true);
      expect(metadata.robots).toHaveProperty("follow", true);
    });

    test("has googleBot configuration", () => {
      const robots = metadata.robots as {googleBot: object};
      expect(robots.googleBot).toBeDefined();
      expect(robots.googleBot).toHaveProperty("index", true);
      expect(robots.googleBot).toHaveProperty("follow", true);
    });
  });

  describe("OpenGraph configuration", () => {
    test("has OpenGraph metadata", () => {
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph).toHaveProperty("type", "website");
      expect(metadata.openGraph).toHaveProperty("siteName", "arolariu.ro");
      expect(metadata.openGraph).toHaveProperty("locale", "en_US");
    });

    test("has OpenGraph images", () => {
      expect(metadata.openGraph).toHaveProperty("images");
      const og = metadata.openGraph as {images: Array<{url: string; width: number; height: number}>};
      expect(Array.isArray(og.images)).toBe(true);
      expect(og.images.length).toBeGreaterThan(0);
      expect(og.images[0]).toHaveProperty("url");
      expect(og.images[0]).toHaveProperty("width", 1200);
      expect(og.images[0]).toHaveProperty("height", 630);
    });

    test("has alternate locale", () => {
      expect(metadata.openGraph).toHaveProperty("alternateLocale");
      const og = metadata.openGraph as {alternateLocale: string[]};
      expect(og.alternateLocale).toContain("ro_RO");
    });
  });

  describe("Twitter Card configuration", () => {
    test("has Twitter metadata", () => {
      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter).toHaveProperty("card", "summary_large_image");
      expect(metadata.twitter).toHaveProperty("creator");
    });

    test("has Twitter images", () => {
      const twitter = metadata.twitter as {images: Array<{url: string}>};
      expect(twitter.images).toBeDefined();
      expect(Array.isArray(twitter.images)).toBe(true);
      expect(twitter.images.length).toBeGreaterThan(0);
    });
  });

  describe("Apple Web App configuration", () => {
    test("has Apple Web App metadata", () => {
      expect(metadata.appleWebApp).toBeDefined();
      expect(metadata.appleWebApp).toHaveProperty("capable", true);
      expect(metadata.appleWebApp).toHaveProperty("title", "arolariu.ro");
      expect(metadata.appleWebApp).toHaveProperty("statusBarStyle", "black-translucent");
    });
  });

  describe("icons configuration", () => {
    test("has icons array", () => {
      expect(metadata.icons).toBeDefined();
      expect(Array.isArray(metadata.icons)).toBe(true);
    });

    test("includes standard favicons", () => {
      const icons = metadata.icons as Array<{rel: string; sizes: string}>;
      const favicon16 = icons.find((icon) => icon.rel === "icon" && icon.sizes === "16x16");
      const favicon32 = icons.find((icon) => icon.rel === "icon" && icon.sizes === "32x32");

      expect(favicon16).toBeDefined();
      expect(favicon32).toBeDefined();
    });

    test("includes Apple touch icons", () => {
      const icons = metadata.icons as Array<{rel: string; sizes: string}>;
      const appleTouchIcons = icons.filter((icon) => icon.rel === "apple-touch-icon");

      expect(appleTouchIcons.length).toBeGreaterThan(0);
      // Should have 180x180 for modern iPhones
      const largeIcon = appleTouchIcons.find((icon) => icon.sizes === "180x180");
      expect(largeIcon).toBeDefined();
    });
  });

  describe("manifest configuration", () => {
    test("has manifest path", () => {
      expect(metadata.manifest).toBe("/manifest.json");
    });
  });

  describe("other metadata", () => {
    test("has theme color", () => {
      expect(metadata.other).toBeDefined();
      expect(metadata.other).toHaveProperty("theme-color", "#9013fe");
    });

    test("has color scheme", () => {
      expect(metadata.other).toHaveProperty("color-scheme", "dark light");
    });

    test("has mobile web app capable flags", () => {
      expect(metadata.other).toHaveProperty("mobile-web-app-capable", "yes");
      expect(metadata.other).toHaveProperty("apple-mobile-web-app-capable", "yes");
    });
  });
});

// ============================================================================
// createMetadata Function Tests
// ============================================================================

describe("createMetadata", () => {
  describe("with no arguments", () => {
    test("returns base metadata", () => {
      const result = createMetadata();

      expect(result.title).toEqual(metadata.title);
      expect(result.description).toEqual(metadata.description);
      expect(result.applicationName).toEqual(metadata.applicationName);
    });

    test("preserves OpenGraph configuration", () => {
      const result = createMetadata();

      expect(result.openGraph).toBeDefined();
      expect(result.openGraph).toHaveProperty("type", "website");
      expect(result.openGraph).toHaveProperty("siteName", "arolariu.ro");
    });

    test("preserves Twitter configuration", () => {
      const result = createMetadata();

      expect(result.twitter).toBeDefined();
      expect(result.twitter).toHaveProperty("card", "summary_large_image");
    });
  });

  describe("with title override", () => {
    test("overrides title in base metadata", () => {
      const customTitle = "Custom Page Title";
      const result = createMetadata({title: customTitle});

      expect(result.title).toBe(customTitle);
    });

    test("propagates title to OpenGraph", () => {
      const customTitle = "Custom Page Title";
      const result = createMetadata({title: customTitle});

      expect(result.openGraph).toHaveProperty("title", customTitle);
    });

    test("propagates title to Twitter", () => {
      const customTitle = "Custom Page Title";
      const result = createMetadata({title: customTitle});

      expect(result.twitter).toHaveProperty("title", customTitle);
    });
  });

  describe("with description override", () => {
    test("overrides description in base metadata", () => {
      const customDescription = "A custom page description for testing.";
      const result = createMetadata({description: customDescription});

      expect(result.description).toBe(customDescription);
    });

    test("propagates description to OpenGraph", () => {
      const customDescription = "A custom page description for testing.";
      const result = createMetadata({description: customDescription});

      expect(result.openGraph).toHaveProperty("description", customDescription);
    });

    test("propagates description to Twitter", () => {
      const customDescription = "A custom page description for testing.";
      const result = createMetadata({description: customDescription});

      expect(result.twitter).toHaveProperty("description", customDescription);
    });
  });

  describe("with both title and description", () => {
    test("overrides both in all locations", () => {
      const customTitle = "Invoice Dashboard";
      const customDescription = "Manage your invoices efficiently.";
      const result = createMetadata({
        title: customTitle,
        description: customDescription,
      });

      expect(result.title).toBe(customTitle);
      expect(result.description).toBe(customDescription);
      expect(result.openGraph).toHaveProperty("title", customTitle);
      expect(result.openGraph).toHaveProperty("description", customDescription);
      expect(result.twitter).toHaveProperty("title", customTitle);
      expect(result.twitter).toHaveProperty("description", customDescription);
    });
  });

  describe("with locale override", () => {
    test("maps 'en' to 'en_US' for OpenGraph", () => {
      const result = createMetadata({locale: "en"});

      expect(result.openGraph).toHaveProperty("locale", "en");
      expect(result.openGraph).toHaveProperty("alternateLocale", "en_US");
    });

    test("maps 'ro' to 'ro_RO' for OpenGraph", () => {
      const result = createMetadata({locale: "ro"});

      expect(result.openGraph).toHaveProperty("locale", "ro");
      expect(result.openGraph).toHaveProperty("alternateLocale", "ro_RO");
    });

    test("defaults unknown locale to 'en_US'", () => {
      const result = createMetadata({locale: "fr"});

      expect(result.openGraph).toHaveProperty("locale", "fr");
      expect(result.openGraph).toHaveProperty("alternateLocale", "en_US");
    });
  });

  describe("with OpenGraph override", () => {
    test("merges custom OpenGraph images", () => {
      const customImages = [{url: "/custom-og.png", width: 800, height: 400}];
      const result = createMetadata({
        openGraph: {images: customImages},
      });

      const og = result.openGraph as {images: Array<{url: string}>};
      expect(og.images).toEqual(customImages);
    });

    test("preserves base OpenGraph properties when adding custom ones", () => {
      const result = createMetadata({
        openGraph: {countryName: "Germany"},
      });

      expect(result.openGraph).toHaveProperty("type", "website");
      expect(result.openGraph).toHaveProperty("siteName", "arolariu.ro");
      expect(result.openGraph).toHaveProperty("countryName", "Germany");
    });
  });

  describe("with Twitter override", () => {
    test("merges custom Twitter images", () => {
      const customImages = [{url: "/custom-twitter.png", width: 1000, height: 500}];
      const result = createMetadata({
        twitter: {images: customImages},
      });

      const twitter = result.twitter as {images: Array<{url: string}>};
      expect(twitter.images).toEqual(customImages);
    });

    test("preserves base Twitter properties when adding custom ones", () => {
      const result = createMetadata({
        twitter: {site: "@customsite"},
      });

      expect(result.twitter).toHaveProperty("card", "summary_large_image");
      expect(result.twitter).toHaveProperty("site", "@customsite");
    });
  });

  describe("with other metadata overrides", () => {
    test("overrides category", () => {
      const result = createMetadata({category: "Finance"});

      expect(result.category).toBe("Finance");
    });

    test("overrides keywords", () => {
      const customKeywords = ["invoice", "finance", "management"];
      const result = createMetadata({keywords: customKeywords});

      expect(result.keywords).toEqual(customKeywords);
    });

    test("preserves icons from base metadata", () => {
      const result = createMetadata({title: "Custom Title"});

      expect(result.icons).toEqual(metadata.icons);
    });

    test("preserves manifest from base metadata", () => {
      const result = createMetadata({title: "Custom Title"});

      expect(result.manifest).toBe("/manifest.json");
    });
  });

  describe("immutability", () => {
    test("returns a new object each call", () => {
      const result1 = createMetadata({title: "Title 1"});
      const result2 = createMetadata({title: "Title 2"});

      expect(result1).not.toBe(result2);
      expect(result1.title).toBe("Title 1");
      expect(result2.title).toBe("Title 2");
    });

    test("does not mutate base metadata", () => {
      const originalTitle = metadata.title;
      const originalDescription = metadata.description;

      createMetadata({title: "Modified Title", description: "Modified Description"});

      expect(metadata.title).toEqual(originalTitle);
      expect(metadata.description).toEqual(originalDescription);
    });
  });

  describe("real-world usage patterns", () => {
    test("creates invoice page metadata", () => {
      const result = createMetadata({
        title: "Invoice Dashboard",
        description: "View and manage your invoices with AI-powered analysis.",
        locale: "en",
        openGraph: {
          images: [{url: "/og-invoices.png", width: 1200, height: 630, alt: "Invoice Dashboard"}],
        },
      });

      expect(result.title).toBe("Invoice Dashboard");
      expect(result.description).toBe("View and manage your invoices with AI-powered analysis.");
      expect(result.openGraph).toHaveProperty("title", "Invoice Dashboard");
      expect(result.openGraph).toHaveProperty("locale", "en");
    });

    test("creates about page metadata", () => {
      const result = createMetadata({
        title: "About",
        description: "Learn more about Alexandru-Razvan Olariu and the arolariu.ro platform.",
        category: "Personal",
      });

      expect(result.title).toBe("About");
      expect(result.category).toBe("Personal");
      // Should still have base properties
      expect(result.applicationName).toBe("arolariu.ro");
    });

    test("creates Romanian locale page metadata", () => {
      const result = createMetadata({
        title: "Acasă",
        description: "Bine ați venit pe arolariu.ro - platforma de gestionare a facturilor.",
        locale: "ro",
      });

      expect(result.title).toBe("Acasă");
      expect(result.openGraph).toHaveProperty("locale", "ro");
      expect(result.openGraph).toHaveProperty("alternateLocale", "ro_RO");
    });
  });
});

// ============================================================================
// Comprehensive createMetadata Function Tests
// ============================================================================

describe("createMetadata (comprehensive)", () => {
  describe("output object structure validation", () => {
    test("result contains all required Next.js metadata properties", () => {
      const result = createMetadata({title: "Test Page"});

      // Core properties
      expect(result).toHaveProperty("metadataBase");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("applicationName");
      expect(result).toHaveProperty("authors");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("keywords");
      expect(result).toHaveProperty("robots");
      expect(result).toHaveProperty("openGraph");
      expect(result).toHaveProperty("twitter");
      expect(result).toHaveProperty("appleWebApp");
      expect(result).toHaveProperty("icons");
      expect(result).toHaveProperty("manifest");
      expect(result).toHaveProperty("other");
      expect(result).toHaveProperty("alternates");
      expect(result).toHaveProperty("appLinks");
      expect(result).toHaveProperty("classification");
      expect(result).toHaveProperty("creator");
    });

    test("result OpenGraph object has complete structure", () => {
      const result = createMetadata({title: "Test", description: "Test desc"});
      const og = result.openGraph as Record<string, unknown>;

      expect(og).toHaveProperty("type");
      expect(og).toHaveProperty("url");
      expect(og).toHaveProperty("countryName");
      expect(og).toHaveProperty("description");
      expect(og).toHaveProperty("siteName");
      expect(og).toHaveProperty("locale");
      expect(og).toHaveProperty("title");
      expect(og).toHaveProperty("alternateLocale");
      expect(og).toHaveProperty("images");
    });

    test("result Twitter object has complete structure", () => {
      const result = createMetadata({title: "Test", description: "Test desc"});
      const twitter = result.twitter as Record<string, unknown>;

      expect(twitter).toHaveProperty("creator");
      expect(twitter).toHaveProperty("title");
      expect(twitter).toHaveProperty("description");
      expect(twitter).toHaveProperty("card");
      expect(twitter).toHaveProperty("images");
    });

    test("result robots object has complete structure", () => {
      const result = createMetadata();
      const robots = result.robots as Record<string, unknown>;

      expect(robots).toHaveProperty("follow");
      expect(robots).toHaveProperty("index");
      expect(robots).toHaveProperty("max-image-preview");
      expect(robots).toHaveProperty("max-snippet");
      expect(robots).toHaveProperty("max-video-preview");
      expect(robots).toHaveProperty("googleBot");
    });
  });

  describe("edge cases for title handling", () => {
    test("empty string title is treated as falsy (preserves base title)", () => {
      // Empty strings are falsy in JavaScript, so the function preserves base metadata
      const result = createMetadata({title: ""});

      // Base title is preserved because empty string is falsy
      expect(result.title).toEqual(metadata.title);
      // OpenGraph and Twitter don't get empty title override
      expect(result.openGraph).not.toHaveProperty("title", "");
    });

    test("handles title with special characters", () => {
      const specialTitle = "Invoice #123 - €500.00 & More <test>";
      const result = createMetadata({title: specialTitle});

      expect(result.title).toBe(specialTitle);
      expect(result.openGraph).toHaveProperty("title", specialTitle);
    });

    test("handles title with unicode characters", () => {
      const unicodeTitle = "Facturi și Bonuri 📄💰";
      const result = createMetadata({title: unicodeTitle});

      expect(result.title).toBe(unicodeTitle);
      expect(result.openGraph).toHaveProperty("title", unicodeTitle);
    });

    test("handles very long title", () => {
      const longTitle = "A".repeat(500);
      const result = createMetadata({title: longTitle});

      expect(result.title).toBe(longTitle);
      expect((result.title as string).length).toBe(500);
    });

    test("does not override title when undefined", () => {
      const result = createMetadata({description: "Only description"});

      expect(result.title).toEqual(metadata.title);
    });
  });

  describe("edge cases for description handling", () => {
    test("empty string description is treated as falsy (preserves base description)", () => {
      // Empty strings are falsy in JavaScript, so the function preserves base metadata
      const result = createMetadata({description: ""});

      // Base description is preserved because empty string is falsy
      expect(result.description).toEqual(metadata.description);
      // OpenGraph and Twitter don't get empty description override
      expect(result.openGraph).not.toHaveProperty("description", "");
    });

    test("handles description with HTML-like content", () => {
      const htmlDescription = "Learn about <strong>invoices</strong> & more";
      const result = createMetadata({description: htmlDescription});

      expect(result.description).toBe(htmlDescription);
    });

    test("handles multiline description", () => {
      const multilineDesc = "Line 1\nLine 2\nLine 3";
      const result = createMetadata({description: multilineDesc});

      expect(result.description).toBe(multilineDesc);
    });

    test("does not override description when undefined", () => {
      const result = createMetadata({title: "Only title"});

      expect(result.description).toEqual(metadata.description);
    });
  });

  describe("locale handling edge cases", () => {
    test("handles empty string locale gracefully", () => {
      const result = createMetadata({locale: ""});
      const og = result.openGraph as Record<string, unknown>;

      // Empty string is falsy, so locale shouldn't be applied
      expect(og["locale"]).toBe("en_US"); // base value preserved
    });

    test("handles uppercase locale", () => {
      const result = createMetadata({locale: "EN"});
      const og = result.openGraph as Record<string, unknown>;

      // Map doesn't have "EN", so it falls back
      expect(og["locale"]).toBe("EN");
      expect(og["alternateLocale"]).toBe("en_US");
    });

    test("handles locale with region code", () => {
      const result = createMetadata({locale: "en-GB"});
      const og = result.openGraph as Record<string, unknown>;

      expect(og["locale"]).toBe("en-GB");
      expect(og["alternateLocale"]).toBe("en_US"); // fallback for unknown
    });

    test("handles all supported locales", () => {
      const enResult = createMetadata({locale: "en"});
      const roResult = createMetadata({locale: "ro"});

      expect(enResult.openGraph).toHaveProperty("alternateLocale", "en_US");
      expect(roResult.openGraph).toHaveProperty("alternateLocale", "ro_RO");
    });
  });

  describe("OpenGraph deep merge behavior", () => {
    test("custom images completely replace base images", () => {
      const customImages = [
        {url: "/custom1.png", width: 100, height: 100},
        {url: "/custom2.png", width: 200, height: 200},
      ];
      const result = createMetadata({openGraph: {images: customImages}});
      const og = result.openGraph as {images: Array<{url: string}>};

      expect(og.images).toHaveLength(2);
      expect(og.images[0]).toHaveProperty("url", "/custom1.png");
      expect(og.images[1]).toHaveProperty("url", "/custom2.png");
    });

    test("preserves base images when not overriding", () => {
      const result = createMetadata({openGraph: {countryName: "Germany"}});
      const og = result.openGraph as {images: Array<{url: string}>};

      expect(og.images.length).toBeGreaterThan(0);
      expect(og.images[0]?.url).toContain("og-default.png");
    });

    test("can override countryName", () => {
      const result = createMetadata({openGraph: {countryName: "United States"}});

      expect(result.openGraph).toHaveProperty("countryName", "United States");
    });

    test("can override url", () => {
      const customUrl = new URL("https://example.com/page");
      const result = createMetadata({openGraph: {url: customUrl}});

      expect(result.openGraph).toHaveProperty("url", customUrl);
    });

    test("title and description from partial override OpenGraph", () => {
      const result = createMetadata({
        title: "Page Title",
        description: "Page Description",
        openGraph: {countryName: "France"},
      });

      expect(result.openGraph).toHaveProperty("title", "Page Title");
      expect(result.openGraph).toHaveProperty("description", "Page Description");
      expect(result.openGraph).toHaveProperty("countryName", "France");
      expect(result.openGraph).toHaveProperty("siteName", "arolariu.ro");
    });
  });

  describe("Twitter deep merge behavior", () => {
    test("custom images completely replace base images", () => {
      const customImages = [{url: "/twitter-custom.png", width: 1200, height: 600}];
      const result = createMetadata({twitter: {images: customImages}});
      const twitter = result.twitter as {images: Array<{url: string}>};

      expect(twitter.images).toHaveLength(1);
      expect(twitter.images[0]).toHaveProperty("url", "/twitter-custom.png");
    });

    test("can override card type", () => {
      // Note: card is technically part of Twitter base type but we test the merge behavior
      const result = createMetadata({
        twitter: {card: "summary"} as unknown as Partial<Omit<Twitter, "title" | "description">>,
      });

      expect(result.twitter).toHaveProperty("card", "summary");
    });

    test("can add site handle", () => {
      const result = createMetadata({twitter: {site: "@araborolariu"}});

      expect(result.twitter).toHaveProperty("site", "@araborolariu");
      expect(result.twitter).toHaveProperty("card", "summary_large_image"); // preserved
    });

    test("title and description from partial override Twitter", () => {
      const result = createMetadata({
        title: "Tweet Title",
        description: "Tweet Description",
        twitter: {site: "@test"},
      });

      expect(result.twitter).toHaveProperty("title", "Tweet Title");
      expect(result.twitter).toHaveProperty("description", "Tweet Description");
      expect(result.twitter).toHaveProperty("site", "@test");
      expect(result.twitter).toHaveProperty("creator"); // preserved from base
    });
  });

  describe("combined overrides", () => {
    test("handles all overrides simultaneously", () => {
      const result = createMetadata({
        title: "Full Override Page",
        description: "A comprehensive test of all overrides.",
        locale: "ro",
        category: "Testing",
        keywords: ["test", "comprehensive", "override"],
        openGraph: {
          countryName: "Romania",
          images: [{url: "/test-og.png", width: 1200, height: 630}],
        },
        twitter: {
          site: "@testsite",
        },
      });

      // Title and description
      expect(result.title).toBe("Full Override Page");
      expect(result.description).toBe("A comprehensive test of all overrides.");

      // Category and keywords
      expect(result.category).toBe("Testing");
      expect(result.keywords).toEqual(["test", "comprehensive", "override"]);

      // OpenGraph
      expect(result.openGraph).toHaveProperty("title", "Full Override Page");
      expect(result.openGraph).toHaveProperty("description", "A comprehensive test of all overrides.");
      expect(result.openGraph).toHaveProperty("locale", "ro");
      expect(result.openGraph).toHaveProperty("alternateLocale", "ro_RO");
      expect(result.openGraph).toHaveProperty("countryName", "Romania");

      // Twitter
      expect(result.twitter).toHaveProperty("title", "Full Override Page");
      expect(result.twitter).toHaveProperty("description", "A comprehensive test of all overrides.");
      expect(result.twitter).toHaveProperty("site", "@testsite");
      expect(result.twitter).toHaveProperty("card", "summary_large_image"); // Base card preserved

      // Preserved base properties
      expect(result.applicationName).toBe("arolariu.ro");
      expect(result.manifest).toBe("/manifest.json");
    });

    test("OpenGraph and Twitter get same title when both specified", () => {
      const result = createMetadata({title: "Unified Title"});
      const og = result.openGraph as {title: string};
      const twitter = result.twitter as {title: string};

      expect(og.title).toBe("Unified Title");
      expect(twitter.title).toBe("Unified Title");
      expect(og.title).toBe(twitter.title);
    });

    test("OpenGraph and Twitter get same description when both specified", () => {
      const result = createMetadata({description: "Unified Description"});
      const og = result.openGraph as {description: string};
      const twitter = result.twitter as {description: string};

      expect(og.description).toBe("Unified Description");
      expect(twitter.description).toBe("Unified Description");
      expect(og.description).toBe(twitter.description);
    });
  });

  describe("preservation of complex base properties", () => {
    test("preserves appleWebApp configuration", () => {
      const result = createMetadata({title: "Test"});

      expect(result.appleWebApp).toHaveProperty("capable", true);
      expect(result.appleWebApp).toHaveProperty("statusBarStyle", "black-translucent");
      expect(result.appleWebApp).toHaveProperty("title", "arolariu.ro");
      expect(result.appleWebApp).toHaveProperty("startupImage");
    });

    test("preserves all icon definitions", () => {
      const result = createMetadata({title: "Test"});
      const icons = result.icons as Array<{rel: string; sizes: string}>;

      // Standard favicons
      const favicon16 = icons.find((i) => i.rel === "icon" && i.sizes === "16x16");
      const favicon32 = icons.find((i) => i.rel === "icon" && i.sizes === "32x32");
      expect(favicon16).toBeDefined();
      expect(favicon32).toBeDefined();

      // Apple touch icons (should have multiple sizes)
      const appleTouchIcons = icons.filter((i) => i.rel === "apple-touch-icon");
      expect(appleTouchIcons.length).toBeGreaterThanOrEqual(9); // All 9 sizes
    });

    test("preserves robots configuration", () => {
      const result = createMetadata({title: "Test"});
      const robots = result.robots as Record<string, unknown>;

      expect(robots["index"]).toBe(true);
      expect(robots["follow"]).toBe(true);
      expect(robots["max-snippet"]).toBe(-1);
      expect(robots["max-image-preview"]).toBe("large");
    });

    test("preserves alternates configuration", () => {
      const result = createMetadata({title: "Test"});

      expect(result.alternates).toBeDefined();
      expect(result.alternates).toHaveProperty("canonical");
    });

    test("preserves appLinks configuration", () => {
      const result = createMetadata({title: "Test"});

      expect(result.appLinks).toBeDefined();
      expect(result.appLinks).toHaveProperty("web");
    });

    test("preserves other metadata configuration", () => {
      const result = createMetadata({title: "Test"});
      const other = result.other as Record<string, string>;

      expect(other["theme-color"]).toBe("#9013fe");
      expect(other["color-scheme"]).toBe("dark light");
      expect(other["mobile-web-app-capable"]).toBe("yes");
      expect(other["apple-mobile-web-app-capable"]).toBe("yes");
      expect(other["msapplication-TileColor"]).toBe("#9013fe");
      expect(other["format-detection"]).toBe("telephone=no");
    });

    test("preserves classification", () => {
      const result = createMetadata({title: "Test"});

      expect(result.classification).toContain("Personal Website");
    });

    test("preserves creator", () => {
      const result = createMetadata({title: "Test"});

      expect(result.creator).toBe("Alexandru-Razvan Olariu");
    });
  });

  describe("type safety and return value", () => {
    test("returns object with correct type", () => {
      const result = createMetadata();

      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(false);
    });

    test("metadataBase is always a URL instance", () => {
      const result = createMetadata({title: "Test"});

      expect(result.metadataBase).toBeInstanceOf(URL);
    });

    test("icons is always an array", () => {
      const result = createMetadata({title: "Test"});

      expect(Array.isArray(result.icons)).toBe(true);
    });

    test("keywords is always an array when set", () => {
      const result = createMetadata({keywords: ["one", "two"]});

      expect(Array.isArray(result.keywords)).toBe(true);
      expect(result.keywords).toHaveLength(2);
    });

    test("authors is always an array", () => {
      const result = createMetadata();

      expect(Array.isArray(result.authors)).toBe(true);
    });
  });

  describe("multiple sequential calls isolation", () => {
    test("sequential calls produce independent results", () => {
      const result1 = createMetadata({title: "First"});
      const result2 = createMetadata({title: "Second"});
      const result3 = createMetadata({description: "Third Desc"});

      expect(result1.title).toBe("First");
      expect(result2.title).toBe("Second");
      expect(result3.title).toEqual(metadata.title); // base title

      expect(result1.description).toEqual(metadata.description);
      expect(result2.description).toEqual(metadata.description);
      expect(result3.description).toBe("Third Desc");
    });

    test("modifications to result do not affect subsequent calls", () => {
      const result1 = createMetadata({title: "Mutable Test"});

      // Attempt to mutate (TypeScript would prevent this normally)
      (result1 as Record<string, unknown>)["title"] = "Mutated";

      const result2 = createMetadata({title: "Fresh"});

      expect(result2.title).toBe("Fresh");
      expect(result1.title).toBe("Mutated"); // Only result1 was affected
    });

    test("base metadata remains unchanged after many calls", () => {
      const originalTitle = JSON.stringify(metadata.title);
      const originalDescription = metadata.description;

      // Make many calls with different overrides
      for (let i = 0; i < 10; i++) {
        createMetadata({
          title: `Title ${i}`,
          description: `Description ${i}`,
          locale: i % 2 === 0 ? "en" : "ro",
        });
      }

      expect(JSON.stringify(metadata.title)).toBe(originalTitle);
      expect(metadata.description).toBe(originalDescription);
    });
  });

  describe("integration with Next.js patterns", () => {
    test("works with generateMetadata async pattern", async () => {
      // Simulate async metadata generation
      const fetchTitle = async (): Promise<string> => "Async Title";
      const fetchDescription = async (): Promise<string> => "Async Description";

      const [title, description] = await Promise.all([fetchTitle(), fetchDescription()]);

      const result = createMetadata({title, description});

      expect(result.title).toBe("Async Title");
      expect(result.description).toBe("Async Description");
    });

    test("works with dynamic route parameters", () => {
      // Simulate dynamic route like [id]
      const invoiceId = "inv_123456";
      const invoiceName = "March Groceries";

      const result = createMetadata({
        title: `Invoice: ${invoiceName}`,
        description: `View details for invoice ${invoiceId}`,
      });

      expect(result.title).toBe("Invoice: March Groceries");
      expect(result.description).toContain("inv_123456");
    });

    test("works with conditional metadata", () => {
      const isPrivate = true;

      const result = createMetadata({
        title: isPrivate ? "Private Invoice" : "Public Invoice",
        robots: isPrivate ? {index: false, follow: false} : undefined,
      });

      expect(result.title).toBe("Private Invoice");
      // Note: robots override would need to be supported in createMetadata
    });

    test("produces valid OG image dimensions", () => {
      const result = createMetadata({
        openGraph: {
          images: [{url: "/og.png", width: 1200, height: 630, alt: "Test"}],
        },
      });

      const og = result.openGraph as {images: Array<{width: number; height: number}>};
      const image = og.images[0];

      // Standard OG image dimensions
      expect(image?.width).toBe(1200);
      expect(image?.height).toBe(630);
    });

    test("produces valid Twitter card image dimensions", () => {
      const result = createMetadata({
        twitter: {
          images: [{url: "/twitter.png", width: 1200, height: 600, alt: "Test"}],
        },
      });

      const twitter = result.twitter as {images: Array<{width: number; height: number}>};
      const image = twitter.images[0];

      // Twitter summary_large_image dimensions
      expect(image?.width).toBe(1200);
      expect(image?.height).toBe(600);
    });
  });
});
