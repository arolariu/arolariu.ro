import {describe, expect, it, vi} from "vitest";
import {extractBase64FromBlob, isBrowserStorageAvailable} from "./utils.client";

describe("extractBase64FromBlob", () => {
  it("should extract base64 string from a blob", async () => {
    const blob = new Blob(["Hello, world!"], {type: "text/plain"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toMatch(/^data:text\/plain;base64,/);
  });

  it("should handle empty blob", async () => {
    const blob = new Blob([], {type: "text/plain"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toBe("data:text/plain;base64,");
  });

  it("should handle binary data", async () => {
    const binaryData = new Uint8Array([72, 101, 108, 108, 111]);
    const blob = new Blob([binaryData], {type: "application/octet-stream"});
    const base64String = await extractBase64FromBlob(blob);
    expect(base64String).toMatch(/^data:application\/octet-stream;base64,/);
  });
});

describe("isBrowserStorageAvailable", () => {
  it("should return true for available localStorage", () => {
    const mockLocalStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });
    expect(isBrowserStorageAvailable("localStorage")).toBe(true);
  });

  it("should return true for available sessionStorage", () => {
    const mockSessionStorage = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    });
    expect(isBrowserStorageAvailable("sessionStorage")).toBe(true);
  });

  it("should return false if localStorage is not available", () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: undefined,
      writable: true,
    });
    expect(isBrowserStorageAvailable("localStorage")).toBe(false);
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    }); // Restore original localStorage
  });

  it("should return false if sessionStorage is not available", () => {
    const originalSessionStorage = window.sessionStorage;
    Object.defineProperty(window, "sessionStorage", {
      value: undefined,
      writable: true,
    });
    expect(isBrowserStorageAvailable("sessionStorage")).toBe(false);
    Object.defineProperty(window, "sessionStorage", {
      value: originalSessionStorage,
      writable: true,
    }); // Restore original sessionStorage
  });

  it("should return true when QuotaExceededError is thrown with existing storage", () => {
    const mockStorage = {
      setItem: vi.fn().mockImplementation(() => {
        const error = new DOMException("QuotaExceededError", "QuotaExceededError");
        Object.defineProperty(error, "name", {
          value: "QuotaExceededError",
          writable: true,
        });
        throw error;
      }),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 5, // Storage has items
    };

    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    expect(isBrowserStorageAvailable("localStorage")).toBe(true);
  });
});

describe("retrieveNavigatorInformation", () => {
  it("should retrieve navigator information", async () => {
    const {retrieveNavigatorInformation} = await import("./utils.client");
    const info = retrieveNavigatorInformation();

    expect(info).toHaveProperty("userAgent");
    expect(info).toHaveProperty("language");
    expect(info).toHaveProperty("languages");
    expect(info).toHaveProperty("cookieEnabled");
    expect(info).toHaveProperty("doNotTrack");
    expect(info).toHaveProperty("hardwareConcurrency");
    expect(info).toHaveProperty("maxTouchPoints");
  });

  it("should return correct types for navigator properties", async () => {
    const {retrieveNavigatorInformation} = await import("./utils.client");
    const info = retrieveNavigatorInformation();

    expect(typeof info.userAgent).toBe("string");
    expect(typeof info.language).toBe("string");
    expect(Array.isArray(info.languages)).toBe(true);
    expect(typeof info.cookieEnabled).toBe("boolean");
    expect(typeof info.hardwareConcurrency).toBe("number");
    // maxTouchPoints may be undefined in test environment
    expect(["number", "undefined"].includes(typeof info.maxTouchPoints)).toBe(true);
  });
});

describe("retrieveScreenInformation", () => {
  it("should retrieve screen information", async () => {
    const {retrieveScreenInformation} = await import("./utils.client");
    const info = retrieveScreenInformation();

    expect(info).toHaveProperty("width");
    expect(info).toHaveProperty("height");
    expect(info).toHaveProperty("availWidth");
    expect(info).toHaveProperty("availHeight");
    expect(info).toHaveProperty("colorDepth");
    expect(info).toHaveProperty("pixelDepth");
  });

  it("should return correct types for screen properties", async () => {
    const {retrieveScreenInformation} = await import("./utils.client");
    const info = retrieveScreenInformation();

    expect(typeof info.width).toBe("number");
    expect(typeof info.height).toBe("number");
    expect(typeof info.availWidth).toBe("number");
    expect(typeof info.availHeight).toBe("number");
    expect(typeof info.colorDepth).toBe("number");
    expect(typeof info.pixelDepth).toBe("number");
  });

  it("should return non-negative values for screen dimensions", async () => {
    const {retrieveScreenInformation} = await import("./utils.client");
    const info = retrieveScreenInformation();

    // In test environment, screen values may be 0
    expect(info.width).toBeGreaterThanOrEqual(0);
    expect(info.height).toBeGreaterThanOrEqual(0);
    expect(info.availWidth).toBeGreaterThanOrEqual(0);
    expect(info.availHeight).toBeGreaterThanOrEqual(0);
  });
});

describe("dumpBrowserInformation", () => {
  it("should return a JSON string", async () => {
    const {dumpBrowserInformation} = await import("./utils.client");
    const dump = dumpBrowserInformation();

    expect(typeof dump).toBe("string");
    expect(() => JSON.parse(dump)).not.toThrow();
  });

  it("should contain navigation and screen information", async () => {
    const {dumpBrowserInformation} = await import("./utils.client");
    const dump = dumpBrowserInformation();
    const parsed = JSON.parse(dump);

    expect(parsed).toHaveProperty("navigationInformation");
    expect(parsed).toHaveProperty("screenInformation");
  });

  it("should include core navigator properties in the dump", async () => {
    const {dumpBrowserInformation} = await import("./utils.client");
    const dump = dumpBrowserInformation();
    const parsed = JSON.parse(dump);

    // Test only properties that are reliably serialized in all environments
    expect(parsed.navigationInformation).toHaveProperty("userAgent");
    expect(parsed.navigationInformation).toHaveProperty("language");
    expect(parsed.navigationInformation).toHaveProperty("languages");
    expect(parsed.navigationInformation).toHaveProperty("cookieEnabled");
    expect(parsed.navigationInformation).toHaveProperty("hardwareConcurrency");
    // maxTouchPoints and doNotTrack may not be serialized in test environments
  });

  it("should include all screen properties in the dump", async () => {
    const {dumpBrowserInformation} = await import("./utils.client");
    const dump = dumpBrowserInformation();
    const parsed = JSON.parse(dump);

    expect(parsed.screenInformation).toHaveProperty("width");
    expect(parsed.screenInformation).toHaveProperty("height");
    expect(parsed.screenInformation).toHaveProperty("availWidth");
    expect(parsed.screenInformation).toHaveProperty("availHeight");
    expect(parsed.screenInformation).toHaveProperty("colorDepth");
    expect(parsed.screenInformation).toHaveProperty("pixelDepth");
  });
});
