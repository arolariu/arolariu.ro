/** @format */

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
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
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
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
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
});
