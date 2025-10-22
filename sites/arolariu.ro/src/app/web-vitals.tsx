"use client";

import {retrieveNavigatorInformation, retrieveScreenInformation} from "@/lib/utils.client";
import Dexie, {Table} from "dexie";
import {useReportWebVitals} from "next/web-vitals";
import {useEffect} from "react";

// Dexie configuration
const DB_NAME = "logs";
const STORE_NAME = "web-vitals";
const DB_VERSION = 1;
const MAX_RECORDS = 250;

type LogRecord = {
  id?: number;
  name: string;
  timestamp: string;
  // Allow arbitrary payload fields
  [key: string]: unknown;
};

class LogsDB extends Dexie {
  public webVitals!: Table<LogRecord, number>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      [STORE_NAME]: "++id, name, timestamp",
    });
    this.webVitals = this.table(STORE_NAME);
  }
}

const db = typeof indexedDB === "undefined" ? null : new LogsDB();

// Remove oldest records when count exceeds max
const cleanupOldRecords = async () => {
  if (!db) {
    return;
  }

  try {
    const count = await db.webVitals.count();
    if (count <= MAX_RECORDS) {
      return;
    }

    const toDelete = count - MAX_RECORDS;

    // Oldest first by timestamp (ISO strings are lexicographically sortable)
    const keys = await db.webVitals.orderBy("timestamp").limit(toDelete).primaryKeys();
    if (keys.length > 0) {
      await db.webVitals.bulkDelete(keys);
    }
  } catch (error) {
    console.error("Failed to clean up old records:", error);
  }
};

// Save data to Dexie
const saveToIndexedDB = async (data: Omit<LogRecord, "id" | "timestamp">) => {
  if (!db) {
    return;
  }

  try {
    await db.webVitals.add({
      name: (data["name"] as string) || "unknown",
      timestamp: new Date().toISOString(),
      ...data,
    });
    // Clean up old records after adding new ones
    // Fire and forget to keep UI snappy
    void cleanupOldRecords();
  } catch (error) {
    console.error("Failed to save data:", error);
  }
};

// Collect device and browser information
const collectDeviceInfo = () => {
  const navigatorInfo = retrieveNavigatorInformation();
  const screenInfo = retrieveScreenInformation();
  return {
    navigator: navigatorInfo,
    screen: screenInfo,
  };
};

/**
 * This function sets up the Web Vitals reporting.
 * @returns The Web Vitals reporting component.
 */
export default function WebVitals(): React.JSX.Element | null {
  useEffect(() => {
    // Save initial device information
    void saveToIndexedDB({
      name: "device-info",
      value: collectDeviceInfo(),
    });

    // Set up error tracking
    const onError = (event: ErrorEvent) => {
      void saveToIndexedDB({
        name: "js-error",
        value: {
          message: event.message,
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    };

    globalThis.addEventListener("error", onError);

    // Performance observer for long tasks
    if ("PerformanceObserver" in globalThis) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            void saveToIndexedDB({
              name: `long-task-${entry.name}-${entry.entryType}`,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        longTaskObserver.observe({type: "longtask", buffered: true});
      } catch (error) {
        console.error("Long task observation not supported", error);
      }
    }

    return () => {
      globalThis.removeEventListener("error", onError);
    };
  }, []);

  // Track Web Vitals metrics
  useReportWebVitals((report) => {
    console.debug("Web Vitals:", report);
    void saveToIndexedDB({
      name: "web-vital",
      metric: report.name,
      value: report.value,
      rating: report.rating,
      navigationType: report.navigationType,
    });
  });

  return null;
}
