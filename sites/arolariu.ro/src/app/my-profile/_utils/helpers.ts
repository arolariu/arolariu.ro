/**
 * @fileoverview Helper functions for profile settings.
 * @module my-profile/_utils/helpers
 */

import type {User} from "@clerk/nextjs/server";
import type {UserSettings, UserStatistics} from "./types";
import {PAGE_LOAD_TIME} from "./constants";

/**
 * Extracts user initials from first and last name.
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return (first + last).toUpperCase() || "U";
}

/**
 * Calculates account age in days.
 */
export function calculateAccountAge(createdAt?: number | null): number {
  if (!createdAt) return 0;
  return Math.floor((PAGE_LOAD_TIME - createdAt) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates profile completion percentage.
 */
export function calculateProfileCompletion(user: User | null): number {
  if (!user) return 0;
  const fields = [
    user.firstName,
    user.lastName,
    user.primaryEmailAddress?.emailAddress,
    user.imageUrl,
    user.primaryPhoneNumber?.phoneNumber,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

/**
 * Formats storage size in human-readable format.
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

/**
 * Gets default user settings.
 */
export function getDefaultSettings(): UserSettings {
  return {
    appearance: {
      theme: "system",
      primaryColor: "#3b82f6",
      secondaryColor: "#8b5cf6",
      fontType: "normal",
      locale: "en",
      compactMode: false,
      animationsEnabled: true,
    },
    ai: {
      model: "gpt-4o-mini",
      behaviorPreset: "concise",
      temperature: 0.7,
      maxTokens: 2048,
      autoSuggestEnabled: true,
      contextAwareness: true,
      memoryEnabled: false,
      voiceEnabled: false,
    },
    analytics: {
      enabled: true,
      granularity: "daily",
      trackSpending: true,
      trackCategories: true,
      trackMerchants: true,
      benchmarking: false,
      predictiveAnalysis: false,
      exportFormat: "json",
    },
    notifications: {
      emailEnabled: true,
      reportFrequency: "weekly",
      weeklyDigest: true,
      monthlyReport: true,
      spendingAlerts: true,
      budgetAlerts: false,
      newFeatures: true,
      marketingEmails: false,
      securityAlerts: true,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      loginNotifications: true,
      trustedDevices: [],
    },
    data: {
      retention: "1y",
      autoBackup: true,
      backupFrequency: "weekly",
      shareAnonymousData: false,
    },
  };
}

/**
 * Gets mock user statistics.
 */
export function getMockStatistics(): UserStatistics {
  return {
    totalInvoices: 42,
    totalMerchants: 15,
    totalScans: 87,
    totalSaved: 156.5,
    monthlyAverage: 320,
    aiQueriesUsed: 156,
    storageUsed: 52_428_800, // 50 MB
    storageLimit: 1_073_741_824, // 1 GB
  };
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string): boolean {
  // Simple email validation - not vulnerable to ReDoS
  const atIndex = email.indexOf("@");
  const dotIndex = email.lastIndexOf(".");
  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1 && !email.includes(" ");
}

/**
 * Debounce function for settings updates.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = {...target};
  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = result[key as keyof T];
      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key as keyof T] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        ) as T[keyof T];
      } else if (sourceValue !== undefined) {
        result[key as keyof T] = sourceValue as T[keyof T];
      }
    }
  }
  return result;
}
