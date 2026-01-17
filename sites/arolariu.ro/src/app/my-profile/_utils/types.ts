/**
 * @fileoverview TypeScript types for profile settings.
 * @module my-profile/_utils/types
 */

import type {AI_BEHAVIOR_PRESETS, AI_MODELS, ANALYTICS_GRANULARITY, DATA_RETENTION_OPTIONS, REPORT_FREQUENCIES} from "./constants";

/** Navigation section identifier */
export type SettingsSection = "profile" | "appearance" | "ai" | "analytics" | "notifications" | "security" | "data";

/** AI model identifier */
export type AIModelId = (typeof AI_MODELS)[number]["id"];

/** AI behavior preset */
export type AIBehaviorPreset = (typeof AI_BEHAVIOR_PRESETS)[number]["id"];

/** Report frequency */
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number]["id"];

/** Data retention period */
export type DataRetention = (typeof DATA_RETENTION_OPTIONS)[number]["id"];

/** Analytics granularity */
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITY)[number]["id"];

/** Activity type */
export type ActivityType = "scan" | "invoice" | "ai" | "settings" | "export";

/** User appearance settings */
export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  primaryColor: string;
  secondaryColor: string;
  fontType: "normal" | "dyslexic";
  locale: string;
  compactMode: boolean;
  animationsEnabled: boolean;
}

/** AI assistant settings */
export interface AISettings {
  model: AIModelId;
  behaviorPreset: AIBehaviorPreset;
  temperature: number;
  maxTokens: number;
  autoSuggestEnabled: boolean;
  contextAwareness: boolean;
  memoryEnabled: boolean;
  voiceEnabled: boolean;
}

/** Analytics settings */
export interface AnalyticsSettings {
  enabled: boolean;
  granularity: AnalyticsGranularity;
  trackSpending: boolean;
  trackCategories: boolean;
  trackMerchants: boolean;
  benchmarking: boolean;
  predictiveAnalysis: boolean;
  exportFormat: "json" | "csv" | "excel";
}

/** Notification settings */
export interface NotificationSettings {
  emailEnabled: boolean;
  reportFrequency: ReportFrequency;
  weeklyDigest: boolean;
  monthlyReport: boolean;
  spendingAlerts: boolean;
  budgetAlerts: boolean;
  newFeatures: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

/** Trusted device */
export interface TrustedDevice {
  id: string;
  name: string;
  lastUsed: string;
  isCurrent: boolean;
}

/** Security settings */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  trustedDevices: TrustedDevice[];
}

/** Data management settings */
export interface DataSettings {
  retention: DataRetention;
  autoBackup: boolean;
  backupFrequency: ReportFrequency;
  shareAnonymousData: boolean;
}

/** Combined user settings */
export interface UserSettings {
  appearance: AppearanceSettings;
  ai: AISettings;
  analytics: AnalyticsSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  data: DataSettings;
}

/** User statistics */
export interface UserStatistics {
  totalInvoices: number;
  totalMerchants: number;
  totalScans: number;
  totalSaved: number;
  monthlyAverage: number;
  aiQueriesUsed: number;
  storageUsed: number;
  storageLimit: number;
}

/** Props for settings section components */
export interface SettingsSectionProps {
  onSave?: () => void;
  isLoading?: boolean;
}

/** Activity item */
export interface ActivityItem {
  id: number;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
}

/** Achievement item */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{className?: string}>;
  earned: boolean;
}
