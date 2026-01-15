/**
 * @fileoverview Constants for the profile settings page.
 * @module my-profile/_utils/constants
 */

import {
  TbBell,
  TbBrain,
  TbBrush,
  TbChartBar,
  TbDatabase,
  TbFileInvoice,
  TbShield,
  TbShoppingCart,
  TbUpload,
  TbUser,
} from "react-icons/tb";

/** Color palette for theme customization */
export const COLOR_PALETTE = [
  {name: "Blue", value: "#3b82f6"},
  {name: "Purple", value: "#8b5cf6"},
  {name: "Pink", value: "#ec4899"},
  {name: "Red", value: "#ef4444"},
  {name: "Orange", value: "#f97316"},
  {name: "Yellow", value: "#eab308"},
  {name: "Green", value: "#22c55e"},
  {name: "Teal", value: "#14b8a6"},
  {name: "Cyan", value: "#06b6d4"},
  {name: "Indigo", value: "#6366f1"},
  {name: "Slate", value: "#64748b"},
  {name: "Rose", value: "#f43f5e"},
] as const;

/** Available AI models for the assistant */
export const AI_MODELS = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Most capable model with vision and reasoning",
    tier: "premium",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast and efficient for everyday tasks",
    tier: "standard",
  },
  {
    id: "claude-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "Balanced performance and cost",
    tier: "premium",
  },
  {
    id: "claude-haiku",
    name: "Claude 3.5 Haiku",
    description: "Fast responses for simple queries",
    tier: "standard",
  },
] as const;

/** AI behavior presets */
export const AI_BEHAVIOR_PRESETS = [
  {id: "detailed", name: "Detailed", description: "Thorough explanations and analysis"},
  {id: "concise", name: "Concise", description: "Brief, to-the-point responses"},
  {id: "friendly", name: "Friendly", description: "Casual and approachable tone"},
  {id: "professional", name: "Professional", description: "Formal business communication"},
] as const;

/** Email report frequencies */
export const REPORT_FREQUENCIES = [
  {id: "daily", name: "Daily", description: "Every day at 8 AM"},
  {id: "weekly", name: "Weekly", description: "Every Monday morning"},
  {id: "monthly", name: "Monthly", description: "First day of each month"},
  {id: "never", name: "Never", description: "Disable email reports"},
] as const;

/** Data retention periods */
export const DATA_RETENTION_OPTIONS = [
  {id: "30d", name: "30 Days", days: 30},
  {id: "90d", name: "90 Days", days: 90},
  {id: "1y", name: "1 Year", days: 365},
  {id: "forever", name: "Forever", days: -1},
] as const;

/** Analytics granularity options */
export const ANALYTICS_GRANULARITY = [
  {id: "hourly", name: "Hourly"},
  {id: "daily", name: "Daily"},
  {id: "weekly", name: "Weekly"},
  {id: "monthly", name: "Monthly"},
] as const;

/** Sidebar navigation items */
export const SIDEBAR_NAV_ITEMS = [
  {id: "profile", label: "Profile", icon: TbUser, section: "account"},
  {id: "appearance", label: "Appearance", icon: TbBrush, section: "preferences"},
  {id: "ai", label: "AI Assistant", icon: TbBrain, section: "preferences"},
  {id: "analytics", label: "Analytics", icon: TbChartBar, section: "preferences"},
  {id: "notifications", label: "Notifications", icon: TbBell, section: "preferences"},
  {id: "security", label: "Security", icon: TbShield, section: "account"},
  {id: "data", label: "Data Management", icon: TbDatabase, section: "account"},
] as const;

/** User achievements */
export const ACHIEVEMENTS = [
  {id: "first_scan", name: "First Scan", description: "Uploaded your first receipt", icon: TbUpload, earned: true},
  {id: "invoice_master", name: "Invoice Master", description: "Processed 10 invoices", icon: TbFileInvoice, earned: true},
  {id: "merchant_explorer", name: "Merchant Explorer", description: "Discovered 5 merchants", icon: TbShoppingCart, earned: true},
  {id: "data_analyst", name: "Data Analyst", description: "Viewed statistics 10 times", icon: TbChartBar, earned: false},
  {id: "ai_enthusiast", name: "AI Enthusiast", description: "Used AI features 20 times", icon: TbBrain, earned: false},
  {id: "security_pro", name: "Security Pro", description: "Enabled 2FA authentication", icon: TbShield, earned: false},
] as const;

/** Recent activity mock data */
export const RECENT_ACTIVITY = [
  {id: 1, type: "scan" as const, title: "Uploaded receipt", description: "Lidl - Groceries", time: "2 hours ago"},
  {id: 2, type: "invoice" as const, title: "Invoice processed", description: "Amazon - Electronics", time: "5 hours ago"},
  {id: 3, type: "ai" as const, title: "AI Analysis", description: "Spending patterns detected", time: "1 day ago"},
  {id: 4, type: "settings" as const, title: "Updated settings", description: "Changed AI model", time: "2 days ago"},
] as const;

/** Page load timestamp for calculations */
export const PAGE_LOAD_TIME = Date.now();
