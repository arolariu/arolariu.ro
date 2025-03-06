/** @format */

"use client";

import {useReportWebVitals} from "next/web-vitals";
import {useEffect} from "react";

// IndexedDB configuration
const DB_NAME = "logs";
const STORE_NAME = "web-vitals";
const DB_VERSION = 1;
const MAX_RECORDS = 100;

// Helper function to open IndexedDB
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("error", (event) => {
      console.error("IndexedDB error:", event);
      reject(new Error("Failed to open IndexedDB"));
    });

    request.addEventListener("success", (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    });

    request.addEventListener("upgradeneeded", (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        store.createIndex("name", "name", {unique: false});
        store.createIndex("timestamp", "timestamp", {unique: false});
      }
    });
  });
};

// Get the count of records in the store
const getRecordCount = async (): Promise<number> => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    return new Promise((resolve, reject) => {
      countRequest.addEventListener("success", () => {
        resolve(countRequest.result);
        db.close();
      });

      countRequest.addEventListener("error", () => {
        reject(new Error("Failed to count records"));
        db.close();
      });
    });
  } catch (error) {
    console.error("Failed to get record count:", error);
    return 0;
  }
};

// Remove oldest records when count exceeds max
const cleanupOldRecords = async () => {
  try {
    const count = await getRecordCount();
    if (count <= MAX_RECORDS) return;

    const recordsToDelete = count - MAX_RECORDS;
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");

    // Get the oldest records - use a non-recursive approach
    const cursorRequest = index.openCursor();
    let deletedCount = 0;

    cursorRequest.addEventListener("success", (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor && deletedCount < recordsToDelete) {
        store.delete(cursor.primaryKey);
        deletedCount += 1;
        cursor.continue();
      }
    });

    transaction.addEventListener("complete", () => db.close());
    transaction.addEventListener("error", () => {
      console.error("Error cleaning up records:", transaction.error);
      db.close();
    });
  } catch (error) {
    console.error("Failed to clean up old records:", error);
  }
};

// Save data to IndexedDB
const saveToIndexedDB = async (data: any) => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add({
      ...data,
      timestamp: new Date().toISOString(),
    });

    request.addEventListener("error", () => console.error("Error saving data:", request.error));
    transaction.addEventListener("complete", () => {
      db.close();
      // Clean up old records after adding new ones
      cleanupOldRecords();
    });
  } catch (error) {
    console.error("Failed to save data:", error);
  }
};

// Collect device and browser information
const collectDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: {
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
    },
    screen: {
      width: globalThis.screen.width,
      height: globalThis.screen.height,
    },
    connection:
      "connection" in navigator
        ? {
            type: (navigator as any).connection?.effectiveType || "unknown",
            downlink: (navigator as any).connection?.downlink,
            rtt: (navigator as any).connection?.rtt,
          }
        : "unavailable",
  };
};

/**
 * This function sets up the Web Vitals reporting.
 * @returns The Web Vitals reporting component.
 */
export function WebVitals() {
  useEffect(() => {
    // Save initial device information
    saveToIndexedDB({
      name: "device-info",
      value: collectDeviceInfo(),
    });

    // Set up error tracking
    const errorHandler = (message: any, source?: string, lineno?: number, colno?: number, error?: Error) => {
      saveToIndexedDB({
        name: "js-error",
        value: {message, source, lineno, colno, stack: error?.stack},
      });
      return false;
    };

    globalThis.addEventListener("error", (event: ErrorEvent) => {
      errorHandler(event.message, event.filename, event.lineno, event.colno, event.error);
    });

    // Performance observer for long tasks
    if ("PerformanceObserver" in globalThis) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          Array.from(entries).forEach((entry) =>
            saveToIndexedDB({
              name: `long-task-${entry.name}-${entry.entryType}`,
              duration: entry.duration,
              startTime: entry.startTime,
            }),
          );
        });
        longTaskObserver.observe({type: "longtask", buffered: true});
      } catch (error) {
        console.error("Long task observation not supported", error);
      }
    }

    return () => {
      globalThis.removeEventListener("error", errorHandler as EventListener);
    };
  }, []);

  // Track Web Vitals metrics
  useReportWebVitals((report) => {
    console.debug("Web Vitals:", report);
    saveToIndexedDB({
      name: "web-vital",
      metric: report.name,
      value: report.value,
      rating: report.rating,
      navigationType: report.navigationType,
    });
  });

  return <></>;
}
