/**
 * @fileoverview Tests for profile settings helper functions.
 * @module my-profile/_utils/helpers.test
 */

import type {User} from "@clerk/nextjs/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  calculateAccountAge,
  calculateProfileCompletion,
  debounce,
  deepMerge,
  formatStorageSize,
  getDefaultSettings,
  getInitials,
  getMockStatistics,
  isValidEmail,
} from "./helpers";

describe("my-profile helpers", () => {
  describe("getInitials", () => {
    it("should return initials from first and last name", () => {
      expect(getInitials("John", "Doe")).toBe("JD");
    });

    it("should return first initial only when last name is null", () => {
      expect(getInitials("John", null)).toBe("J");
    });

    it("should return first initial only when last name is undefined", () => {
      expect(getInitials("John", undefined)).toBe("J");
    });

    it("should return last initial only when first name is null", () => {
      expect(getInitials(null, "Doe")).toBe("D");
    });

    it("should return last initial only when first name is undefined", () => {
      expect(getInitials(undefined, "Doe")).toBe("D");
    });

    it("should return 'U' when both names are null", () => {
      expect(getInitials(null, null)).toBe("U");
    });

    it("should return 'U' when both names are undefined", () => {
      expect(getInitials(undefined, undefined)).toBe("U");
    });

    it("should return 'U' when both names are empty strings", () => {
      expect(getInitials("", "")).toBe("U");
    });

    it("should uppercase the initials", () => {
      expect(getInitials("john", "doe")).toBe("JD");
    });

    it("should handle single character names", () => {
      expect(getInitials("A", "B")).toBe("AB");
    });

    it("should handle mixed null and empty string", () => {
      expect(getInitials(null, "")).toBe("U");
      expect(getInitials("", null)).toBe("U");
    });
  });

  describe("calculateAccountAge", () => {
    it("should return 0 when createdAt is null", () => {
      expect(calculateAccountAge(null)).toBe(0);
    });

    it("should return 0 when createdAt is undefined", () => {
      expect(calculateAccountAge(undefined)).toBe(0);
    });

    it("should return 0 when createdAt is 0", () => {
      expect(calculateAccountAge(0)).toBe(0);
    });

    it("should calculate days correctly for recent timestamp", () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const result = calculateAccountAge(oneDayAgo);
      // Should be approximately 1 day (accounting for PAGE_LOAD_TIME timing)
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(2);
    });

    it("should calculate days correctly for older timestamp", () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const result = calculateAccountAge(thirtyDaysAgo);
      // Should be approximately 30 days
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });
  });

  describe("calculateProfileCompletion", () => {
    it("should return 0 when user is null", () => {
      expect(calculateProfileCompletion(null)).toBe(0);
    });

    it("should return 0 when user has no fields filled", () => {
      const user = {
        firstName: null,
        lastName: null,
        primaryEmailAddress: null,
        imageUrl: null,
        primaryPhoneNumber: null,
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(0);
    });

    it("should return 20% when one field is filled", () => {
      const user = {
        firstName: "John",
        lastName: null,
        primaryEmailAddress: null,
        imageUrl: null,
        primaryPhoneNumber: null,
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(20);
    });

    it("should return 40% when two fields are filled", () => {
      const user = {
        firstName: "John",
        lastName: "Doe",
        primaryEmailAddress: null,
        imageUrl: null,
        primaryPhoneNumber: null,
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(40);
    });

    it("should return 60% when three fields are filled", () => {
      const user = {
        firstName: "John",
        lastName: "Doe",
        primaryEmailAddress: {emailAddress: "john@example.com"},
        imageUrl: null,
        primaryPhoneNumber: null,
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(60);
    });

    it("should return 80% when four fields are filled", () => {
      const user = {
        firstName: "John",
        lastName: "Doe",
        primaryEmailAddress: {emailAddress: "john@example.com"},
        imageUrl: "https://example.com/avatar.jpg",
        primaryPhoneNumber: null,
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(80);
    });

    it("should return 100% when all fields are filled", () => {
      const user = {
        firstName: "John",
        lastName: "Doe",
        primaryEmailAddress: {emailAddress: "john@example.com"},
        imageUrl: "https://example.com/avatar.jpg",
        primaryPhoneNumber: {phoneNumber: "+1234567890"},
      } as unknown as User;
      expect(calculateProfileCompletion(user)).toBe(100);
    });
  });

  describe("formatStorageSize", () => {
    it("should return '0 B' for 0 bytes", () => {
      expect(formatStorageSize(0)).toBe("0 B");
    });

    it("should format bytes correctly", () => {
      expect(formatStorageSize(500)).toBe("500.00 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatStorageSize(1024)).toBe("1.00 KB");
      expect(formatStorageSize(1536)).toBe("1.50 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatStorageSize(1024 * 1024)).toBe("1.00 MB");
      expect(formatStorageSize(52_428_800)).toBe("50.00 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatStorageSize(1024 * 1024 * 1024)).toBe("1.00 GB");
      expect(formatStorageSize(1_073_741_824)).toBe("1.00 GB");
    });

    it("should format terabytes correctly", () => {
      expect(formatStorageSize(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
    });

    it("should handle fractional sizes", () => {
      expect(formatStorageSize(1500)).toBe("1.46 KB");
    });
  });

  describe("getDefaultSettings", () => {
    it("should return an object with all setting categories", () => {
      const settings = getDefaultSettings();
      expect(settings).toHaveProperty("appearance");
      expect(settings).toHaveProperty("ai");
      expect(settings).toHaveProperty("analytics");
      expect(settings).toHaveProperty("notifications");
      expect(settings).toHaveProperty("security");
      expect(settings).toHaveProperty("data");
    });

    it("should have correct default appearance settings", () => {
      const settings = getDefaultSettings();
      expect(settings.appearance.theme).toBe("system");
      expect(settings.appearance.primaryColor).toBe("#3b82f6");
      expect(settings.appearance.secondaryColor).toBe("#8b5cf6");
      expect(settings.appearance.fontType).toBe("normal");
      expect(settings.appearance.locale).toBe("en");
      expect(settings.appearance.compactMode).toBe(false);
      expect(settings.appearance.animationsEnabled).toBe(true);
    });

    it("should have correct default AI settings", () => {
      const settings = getDefaultSettings();
      expect(settings.ai.model).toBe("gpt-4o-mini");
      expect(settings.ai.behaviorPreset).toBe("concise");
      expect(settings.ai.temperature).toBe(0.7);
      expect(settings.ai.maxTokens).toBe(2048);
      expect(settings.ai.autoSuggestEnabled).toBe(true);
      expect(settings.ai.contextAwareness).toBe(true);
      expect(settings.ai.memoryEnabled).toBe(false);
      expect(settings.ai.voiceEnabled).toBe(false);
    });

    it("should have correct default analytics settings", () => {
      const settings = getDefaultSettings();
      expect(settings.analytics.enabled).toBe(true);
      expect(settings.analytics.granularity).toBe("daily");
      expect(settings.analytics.trackSpending).toBe(true);
      expect(settings.analytics.trackCategories).toBe(true);
      expect(settings.analytics.trackMerchants).toBe(true);
      expect(settings.analytics.benchmarking).toBe(false);
      expect(settings.analytics.predictiveAnalysis).toBe(false);
      expect(settings.analytics.exportFormat).toBe("json");
    });

    it("should have correct default notification settings", () => {
      const settings = getDefaultSettings();
      expect(settings.notifications.emailEnabled).toBe(true);
      expect(settings.notifications.reportFrequency).toBe("weekly");
      expect(settings.notifications.weeklyDigest).toBe(true);
      expect(settings.notifications.monthlyReport).toBe(true);
      expect(settings.notifications.spendingAlerts).toBe(true);
      expect(settings.notifications.budgetAlerts).toBe(false);
      expect(settings.notifications.newFeatures).toBe(true);
      expect(settings.notifications.marketingEmails).toBe(false);
      expect(settings.notifications.securityAlerts).toBe(true);
    });

    it("should have correct default security settings", () => {
      const settings = getDefaultSettings();
      expect(settings.security.twoFactorEnabled).toBe(false);
      expect(settings.security.sessionTimeout).toBe(30);
      expect(settings.security.loginNotifications).toBe(true);
      expect(settings.security.trustedDevices).toEqual([]);
    });

    it("should have correct default data settings", () => {
      const settings = getDefaultSettings();
      expect(settings.data.retention).toBe("1y");
      expect(settings.data.autoBackup).toBe(true);
      expect(settings.data.backupFrequency).toBe("weekly");
      expect(settings.data.shareAnonymousData).toBe(false);
    });

    it("should return a new object each time", () => {
      const settings1 = getDefaultSettings();
      const settings2 = getDefaultSettings();
      expect(settings1).not.toBe(settings2);
      expect(settings1).toEqual(settings2);
    });
  });

  describe("getMockStatistics", () => {
    it("should return an object with all statistic properties", () => {
      const stats = getMockStatistics();
      expect(stats).toHaveProperty("totalInvoices");
      expect(stats).toHaveProperty("totalMerchants");
      expect(stats).toHaveProperty("totalScans");
      expect(stats).toHaveProperty("totalSaved");
      expect(stats).toHaveProperty("monthlyAverage");
      expect(stats).toHaveProperty("aiQueriesUsed");
      expect(stats).toHaveProperty("storageUsed");
      expect(stats).toHaveProperty("storageLimit");
    });

    it("should return correct mock values", () => {
      const stats = getMockStatistics();
      expect(stats.totalInvoices).toBe(42);
      expect(stats.totalMerchants).toBe(15);
      expect(stats.totalScans).toBe(87);
      expect(stats.totalSaved).toBe(156.5);
      expect(stats.monthlyAverage).toBe(320);
      expect(stats.aiQueriesUsed).toBe(156);
      expect(stats.storageUsed).toBe(52_428_800);
      expect(stats.storageLimit).toBe(1_073_741_824);
    });

    it("should return a new object each time", () => {
      const stats1 = getMockStatistics();
      const stats2 = getMockStatistics();
      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.org")).toBe(true);
      expect(isValidEmail("a@b.co")).toBe(true);
    });

    it("should return false for emails without @", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("should return false for emails without domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("should return false for emails without local part", () => {
      expect(isValidEmail("@example.com")).toBe(false);
    });

    it("should return false for emails with spaces", () => {
      expect(isValidEmail("test @example.com")).toBe(false);
      expect(isValidEmail("test@ example.com")).toBe(false);
      expect(isValidEmail("test@example .com")).toBe(false);
    });

    it("should return false for emails without TLD", () => {
      expect(isValidEmail("test@example")).toBe(false);
    });

    it("should return false for emails with dot at end", () => {
      expect(isValidEmail("test@example.")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("should return false for @ only", () => {
      expect(isValidEmail("@")).toBe(false);
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should delay function execution", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should only execute once for multiple rapid calls", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to the debounced function", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should use the last arguments when called multiple times", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith("third");
    });

    it("should reset timer on each call", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should allow multiple independent executions", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("first");
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);

      debouncedFn("second");
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("deepMerge", () => {
    it("should merge simple objects", () => {
      const target = {a: 1, b: 2};
      const source = {b: 3, c: 4};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 1, b: 3, c: 4});
    });

    it("should not mutate original objects", () => {
      const target = {a: 1, b: 2};
      const source = {b: 3};
      const result = deepMerge(target, source);
      expect(target).toEqual({a: 1, b: 2});
      expect(result).not.toBe(target);
    });

    it("should merge nested objects", () => {
      const target = {a: {x: 1, y: 2}, b: 3};
      const source = {a: {y: 4, z: 5}};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: {x: 1, y: 4, z: 5}, b: 3});
    });

    it("should handle deeply nested objects", () => {
      const target = {a: {b: {c: {d: 1}}}};
      const source = {a: {b: {c: {e: 2}}}};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: {b: {c: {d: 1, e: 2}}}});
    });

    it("should handle arrays by replacing them", () => {
      const target = {arr: [1, 2, 3]};
      const source = {arr: [4, 5]};
      const result = deepMerge(target, source);
      expect(result).toEqual({arr: [4, 5]});
    });

    it("should handle null values in source", () => {
      const target = {a: 1, b: {c: 2}};
      const source = {b: null} as unknown as Partial<typeof target>;
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 1, b: null});
    });

    it("should skip undefined values in source", () => {
      const target = {a: 1, b: 2};
      const source = {a: undefined, b: 3};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 1, b: 3});
    });

    it("should handle empty source object", () => {
      const target = {a: 1, b: 2};
      const source = {};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 1, b: 2});
    });

    it("should handle empty target object", () => {
      const target = {};
      const source = {a: 1, b: 2};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 1, b: 2});
    });

    it("should handle replacing object with primitive", () => {
      const target = {a: {b: 1}};
      const source = {a: 5} as unknown as Partial<typeof target>;
      const result = deepMerge(target, source);
      expect(result).toEqual({a: 5});
    });

    it("should handle replacing primitive with object", () => {
      const target = {a: 5} as {a: number | {b: number}};
      const source = {a: {b: 1}};
      const result = deepMerge(target, source);
      expect(result).toEqual({a: {b: 1}});
    });
  });
});
