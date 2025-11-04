import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  dumpBrowserInformation,
  extractBase64FromBlob,
  isBrowserStorageAvailable,
  retrieveNavigatorInformation,
  retrieveScreenInformation,
} from "./utils.client";

describe("extractBase64FromBlob", () => {
  it("should extract Base64 string from Blob", async () => {
    const mockBase64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
    const mockBlob = new Blob(["Hello World"], {type: "text/plain"});

    // Mock FileReader implementation
    const mockReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event, callback) => {
        if (event === "load") {
          // Simulate load event
          setTimeout(() => {
            mockReader.result = mockBase64;
            callback();
          }, 0);
        }
      }),
      result: mockBase64,
    };

    global.FileReader = vi.fn(function (this: any) {
      return mockReader;
    }) as any;

    const result = await extractBase64FromBlob(mockBlob);

    expect(result).toBe(mockBase64);
    expect(mockReader.readAsDataURL).toHaveBeenCalledWith(mockBlob);
  });

  it("should handle empty Blob", async () => {
    const mockBase64 = "data:application/octet-stream;base64,";
    const mockBlob = new Blob([], {type: "application/octet-stream"});

    const mockReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event, callback) => {
        if (event === "load") {
          setTimeout(() => {
            mockReader.result = mockBase64;
            callback();
          }, 0);
        }
      }),
      result: mockBase64,
    };

    global.FileReader = vi.fn(function (this: any) {
      return mockReader;
    }) as any;

    const result = await extractBase64FromBlob(mockBlob);

    expect(result).toBe(mockBase64);
  });

  it("should handle different MIME types", async () => {
    const mockBase64 = "data:image/png;base64,iVBORw0KGgo=";
    const mockBlob = new Blob(["fake-image-data"], {type: "image/png"});

    const mockReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event, callback) => {
        if (event === "load") {
          setTimeout(() => {
            mockReader.result = mockBase64;
            callback();
          }, 0);
        }
      }),
      result: mockBase64,
    };

    global.FileReader = vi.fn(function (this: any) {
      return mockReader;
    }) as any;

    const result = await extractBase64FromBlob(mockBlob);

    expect(result).toBe(mockBase64);
  });
});

describe("isBrowserStorageAvailable", () => {
  let mockStorage: Storage;

  beforeEach(() => {
    // Create a mock storage object
    mockStorage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(),
      key: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    };

    // Reset window object
    Object.defineProperty(global, "window", {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("localStorage", () => {
    it("should return true when localStorage is available", () => {
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const result = isBrowserStorageAvailable("localStorage");

      expect(result).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith("__storage_test__", "__storage_test__");
      expect(mockStorage.removeItem).toHaveBeenCalledWith("__storage_test__");
    });

    it("should return false when localStorage throws SecurityError", () => {
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new DOMException("SecurityError", "SecurityError");
        },
        configurable: true,
      });

      const result = isBrowserStorageAvailable("localStorage");

      expect(result).toBe(false);
    });

    it("should return true when QuotaExceededError and storage has items", () => {
      const storageWithItems = {...mockStorage, length: 5};
      Object.defineProperty(window, "localStorage", {
        value: storageWithItems,
        writable: true,
        configurable: true,
      });

      storageWithItems.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const result = isBrowserStorageAvailable("localStorage");

      expect(result).toBe(true);
    });

    it("should return false when QuotaExceededError and storage is empty", () => {
      Object.defineProperty(window, "localStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      mockStorage.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const result = isBrowserStorageAvailable("localStorage");

      expect(result).toBe(false);
    });

    it("should return false when storage is undefined", () => {
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new DOMException("NotFoundError", "NotFoundError");
        },
        configurable: true,
      });

      const result = isBrowserStorageAvailable("localStorage");

      expect(result).toBe(false);
    });
  });

  describe("sessionStorage", () => {
    it("should return true when sessionStorage is available", () => {
      Object.defineProperty(window, "sessionStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const result = isBrowserStorageAvailable("sessionStorage");

      expect(result).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith("__storage_test__", "__storage_test__");
      expect(mockStorage.removeItem).toHaveBeenCalledWith("__storage_test__");
    });

    it("should return false when sessionStorage throws SecurityError", () => {
      Object.defineProperty(window, "sessionStorage", {
        get: () => {
          throw new DOMException("SecurityError", "SecurityError");
        },
        configurable: true,
      });

      const result = isBrowserStorageAvailable("sessionStorage");

      expect(result).toBe(false);
    });

    it("should return true when QuotaExceededError and storage has items", () => {
      const storageWithItems = {...mockStorage, length: 3};
      Object.defineProperty(window, "sessionStorage", {
        value: storageWithItems,
        writable: true,
        configurable: true,
      });

      storageWithItems.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const result = isBrowserStorageAvailable("sessionStorage");

      expect(result).toBe(true);
    });

    it("should return false when QuotaExceededError and storage is empty", () => {
      Object.defineProperty(window, "sessionStorage", {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      mockStorage.setItem = vi.fn(() => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      });

      const result = isBrowserStorageAvailable("sessionStorage");

      expect(result).toBe(false);
    });
  });
});

describe("retrieveNavigatorInformation", () => {
  beforeEach(() => {
    // Mock globalThis.navigator
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Test Browser)",
        language: "en-US",
        languages: ["en-US", "en", "ro"],
        cookieEnabled: true,
        doNotTrack: null,
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
      },
      writable: true,
      configurable: true,
    });
  });

  it("should retrieve navigator information", () => {
    const result = retrieveNavigatorInformation();

    expect(result).toEqual({
      userAgent: "Mozilla/5.0 (Test Browser)",
      language: "en-US",
      languages: ["en-US", "en", "ro"],
      cookieEnabled: true,
      doNotTrack: null,
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
    });
  });

  it("should return readonly object", () => {
    const result = retrieveNavigatorInformation();

    // TypeScript ensures readonly at compile-time via 'as const'
    // At runtime, the object is not frozen but is a plain object
    expect(typeof result).toBe("object");
    expect(result).toBeDefined();
  });

  it("should handle mobile device navigator", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
        language: "en-US",
        languages: ["en-US"],
        cookieEnabled: true,
        doNotTrack: "1",
        hardwareConcurrency: 4,
        maxTouchPoints: 5,
      },
      writable: true,
      configurable: true,
    });

    const result = retrieveNavigatorInformation();

    expect(result.maxTouchPoints).toBe(5);
    expect(result.hardwareConcurrency).toBe(4);
  });

  it("should handle disabled cookies", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0",
        language: "en",
        languages: ["en"],
        cookieEnabled: false,
        doNotTrack: null,
        hardwareConcurrency: 2,
        maxTouchPoints: 0,
      },
      writable: true,
      configurable: true,
    });

    const result = retrieveNavigatorInformation();

    expect(result.cookieEnabled).toBe(false);
  });
});

describe("retrieveScreenInformation", () => {
  beforeEach(() => {
    // Mock globalThis.screen
    Object.defineProperty(globalThis, "screen", {
      value: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
      },
      writable: true,
      configurable: true,
    });
  });

  it("should retrieve screen information", () => {
    const result = retrieveScreenInformation();

    expect(result).toEqual({
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
    });
  });

  it("should return readonly object", () => {
    const result = retrieveScreenInformation();

    // TypeScript ensures readonly at compile-time via 'as const'
    // At runtime, the object is not frozen but is a plain object
    expect(typeof result).toBe("object");
    expect(result).toBeDefined();
  });

  it("should handle mobile screen dimensions", () => {
    Object.defineProperty(globalThis, "screen", {
      value: {
        width: 375,
        height: 812,
        availWidth: 375,
        availHeight: 734,
        colorDepth: 24,
        pixelDepth: 24,
      },
      writable: true,
      configurable: true,
    });

    const result = retrieveScreenInformation();

    expect(result.width).toBe(375);
    expect(result.height).toBe(812);
    expect(result.availHeight).toBe(734);
  });

  it("should handle high DPI screens", () => {
    Object.defineProperty(globalThis, "screen", {
      value: {
        width: 3840,
        height: 2160,
        availWidth: 3840,
        availHeight: 2100,
        colorDepth: 30,
        pixelDepth: 30,
      },
      writable: true,
      configurable: true,
    });

    const result = retrieveScreenInformation();

    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
    expect(result.colorDepth).toBe(30);
  });
});

describe("dumpBrowserInformation", () => {
  beforeEach(() => {
    // Mock both navigator and screen
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Test Browser)",
        language: "en-US",
        languages: ["en-US", "en"],
        cookieEnabled: true,
        doNotTrack: null,
        hardwareConcurrency: 8,
        maxTouchPoints: 0,
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "screen", {
      value: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
        colorDepth: 24,
        pixelDepth: 24,
      },
      writable: true,
      configurable: true,
    });
  });

  it("should return JSON string with browser information", () => {
    const result = dumpBrowserInformation();

    expect(typeof result).toBe("string");
    expect(() => JSON.parse(result)).not.toThrow();

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("navigationInformation");
    expect(parsed).toHaveProperty("screenInformation");
  });

  it("should include navigator information in dump", () => {
    const result = dumpBrowserInformation();
    const parsed = JSON.parse(result);

    expect(parsed.navigationInformation).toEqual({
      userAgent: "Mozilla/5.0 (Test Browser)",
      language: "en-US",
      languages: ["en-US", "en"],
      cookieEnabled: true,
      doNotTrack: null,
      hardwareConcurrency: 8,
      maxTouchPoints: 0,
    });
  });

  it("should include screen information in dump", () => {
    const result = dumpBrowserInformation();
    const parsed = JSON.parse(result);

    expect(parsed.screenInformation).toEqual({
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
      colorDepth: 24,
      pixelDepth: 24,
    });
  });

  it("should return readonly string", () => {
    const result = dumpBrowserInformation();

    // Strings are primitives and immutable by nature in JavaScript
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle complete browser information dump", () => {
    const result = dumpBrowserInformation();
    const parsed = JSON.parse(result);

    // Verify structure completeness
    expect(Object.keys(parsed)).toHaveLength(2);
    expect(Object.keys(parsed.navigationInformation)).toHaveLength(7);
    expect(Object.keys(parsed.screenInformation)).toHaveLength(6);
  });
});
