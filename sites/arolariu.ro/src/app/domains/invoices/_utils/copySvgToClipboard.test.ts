/**
 * @fileoverview Unit tests for copySvgToClipboard utility.
 * @module domains/invoices/_utils/copySvgToClipboard.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {copySvgToClipboard} from "./copySvgToClipboard";

describe("copySvgToClipboard", () => {
  // Mock objects
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockBlob: Blob;

  // Track Image instance for assertions
  let lastImageInstance: {
    src: string;
    loadHandler: (() => void) | null;
    errorHandler: ((error: Event) => void) | null;
  };

  // Track ClipboardItem calls
  let clipboardItemCalls: Array<Record<string, Blob>>;

  // Store original globals
  const originalImage = globalThis.Image;
  const originalURL = globalThis.URL;
  const originalXMLSerializer = globalThis.XMLSerializer;
  const originalClipboardItem = globalThis.ClipboardItem;

  beforeEach(() => {
    // Reset trackers
    lastImageInstance = {
      src: "",
      loadHandler: null,
      errorHandler: null,
    };
    clipboardItemCalls = [];

    // Create a mock blob for toBlob callback
    mockBlob = new Blob(["test"], {type: "image/png"});

    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    // Mock canvas element
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(mockBlob);
      }),
    } as unknown as HTMLCanvasElement;

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        return mockCanvas;
      }
      return originalCreateElement(tagName);
    });

    // Mock Image constructor using a class
    globalThis.Image = class MockImage {
      private _src = "";

      get src(): string {
        return this._src;
      }

      set src(value: string) {
        this._src = value;
        lastImageInstance.src = value;
      }

      addEventListener(event: string, handler: EventListener): void {
        if (event === "load") {
          lastImageInstance.loadHandler = handler as () => void;
        } else if (event === "error") {
          lastImageInstance.errorHandler = handler as (error: Event) => void;
        }
      }
    } as unknown as typeof Image;

    // Mock URL
    globalThis.URL = {
      ...originalURL,
      createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;

    // Mock XMLSerializer
    globalThis.XMLSerializer = class {
      serializeToString(): string {
        return "<svg></svg>";
      }
    } as unknown as typeof XMLSerializer;

    // Mock ClipboardItem as a class
    globalThis.ClipboardItem = class MockClipboardItem {
      constructor(items: Record<string, Blob>) {
        clipboardItemCalls.push(items);
      }
    } as unknown as typeof ClipboardItem;

    // Mock navigator.clipboard
    Object.defineProperty(globalThis, "navigator", {
      value: {
        clipboard: {
          write: vi.fn().mockResolvedValue(undefined),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.Image = originalImage;
    globalThis.URL = originalURL;
    globalThis.XMLSerializer = originalXMLSerializer;
    globalThis.ClipboardItem = originalClipboardItem;
  });

  describe("successful copy operations", () => {
    it("should copy SVG to clipboard with default size", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      // Wait for image load handler to be set
      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(mockCanvas.width).toBe(128);
      expect(mockCanvas.height).toBe(128);
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(navigator.clipboard.write).toHaveBeenCalled();
    });

    it("should copy SVG to clipboard with custom size", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const customSize = 256;

      const copyPromise = copySvgToClipboard(mockSvgElement, customSize);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(mockCanvas.width).toBe(customSize);
      expect(mockCanvas.height).toBe(customSize);
    });

    it("should serialize SVG element and create blob URL", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      mockSvgElement.setAttribute("width", "100");
      mockSvgElement.setAttribute("height", "100");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it("should clean up object URL after successful copy", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should create ClipboardItem with PNG blob", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(clipboardItemCalls).toHaveLength(1);
      expect(clipboardItemCalls[0]).toHaveProperty("image/png");
    });
  });

  describe("error handling", () => {
    it("should throw error when canvas context cannot be created", async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      await expect(copySvgToClipboard(mockSvgElement)).rejects.toThrow("Could not create canvas context");
    });

    it("should throw error when image fails to load", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.errorHandler).not.toBeNull();
      });
      lastImageInstance.errorHandler!(new Event("error"));

      await expect(copyPromise).rejects.toBeDefined();
    });

    it("should throw error when blob creation fails", async () => {
      mockCanvas.toBlob = vi.fn((callback: BlobCallback) => {
        callback(null);
      });
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await expect(copyPromise).rejects.toThrow("Failed to create blob");
    });

    it("should clean up object URL even when blob creation fails", async () => {
      mockCanvas.toBlob = vi.fn((callback: BlobCallback) => {
        callback(null);
      });
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await expect(copyPromise).rejects.toThrow();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  describe("canvas operations", () => {
    it("should request 2d context from canvas", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
    });

    it("should call toBlob with image/png type", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
      });
      lastImageInstance.loadHandler!();

      await copyPromise;

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    });
  });

  describe("image loading", () => {
    it("should set image src to blob URL", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.src).toBe("blob:mock-url");
      });

      lastImageInstance.loadHandler!();
      await copyPromise;
    });

    it("should register event listeners on image", async () => {
      const mockSvgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

      const copyPromise = copySvgToClipboard(mockSvgElement);

      await vi.waitFor(() => {
        expect(lastImageInstance.loadHandler).not.toBeNull();
        expect(lastImageInstance.errorHandler).not.toBeNull();
      });

      lastImageInstance.loadHandler!();
      await copyPromise;
    });
  });
});
