/**
 * @fileoverview Demo utilities for testing NotificationBell component.
 * @module app/domains/invoices/_components/__tests__/NotificationBell.demo
 *
 * @remarks
 * This file provides helper functions to populate sample notifications
 * for testing and demonstration purposes.
 */

import type {Notification} from "../NotificationBell";

/**
 * Generates sample notifications for testing.
 *
 * @returns An array of sample notifications
 */
export function generateSampleNotifications(): Notification[] {
  const now = new Date();

  return [
    {
      id: "notif-1",
      type: "invoice_created",
      title: 'Invoice "Groceries" created',
      description: "Successfully created from uploaded scans",
      timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
      read: false,
    },
    {
      id: "notif-2",
      type: "analysis_complete",
      title: "AI analysis complete",
      description: 'Analysis finished for "Gas Station" invoice',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
      read: false,
    },
    {
      id: "notif-3",
      type: "monthly_report",
      title: "Monthly report ready",
      description: "Your March 2026 spending report is available",
      timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
      read: false,
      invoiceId: "inv-123",
    },
    {
      id: "notif-4",
      type: "invoice_created",
      title: 'Invoice "Office Supplies" created',
      description: "Successfully created from PDF import",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
    },
    {
      id: "notif-5",
      type: "analysis_complete",
      title: "AI analysis complete",
      description: 'Analysis finished for "Restaurant" invoice',
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
    },
  ];
}

/**
 * Adds sample notifications to localStorage for testing.
 *
 * @remarks
 * This is useful for development and testing. In production,
 * notifications should come from the backend API.
 */
export function populateSampleNotifications(): void {
  if (typeof window !== "undefined") {
    const samples = generateSampleNotifications();
    localStorage.setItem("invoice-notifications", JSON.stringify(samples));
    console.log("✓ Sample notifications added to localStorage");
  }
}

/**
 * Clears all notifications from localStorage.
 */
export function clearNotifications(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("invoice-notifications");
    console.log("✓ Notifications cleared from localStorage");
  }
}
