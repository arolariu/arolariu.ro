/**
 * Unit tests for download utilities
 * Tests downloadText, downloadJSON, and downloadBlob functions
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {downloadBlob, downloadJSON, downloadText} from "./download";

describe("download utilities", () => {
  let originalBlob: typeof Blob;

  beforeEach(() => {
    vi.clearAllMocks();
    originalBlob = globalThis.Blob;
  });

  afterEach(() => {
    // Restore Blob if it was mocked
    globalThis.Blob = originalBlob;
  });

  describe("downloadText", () => {
    describe("SSR/non-browser environment", () => {
      it("should return error when window is not defined", () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - intentionally setting to undefined for testing
        delete globalThis.window;

        const result = downloadText("test content", "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("download not available (SSR)");
        }

        // Restore window
        globalThis.window = originalWindow;
      });
    });

    describe("successful downloads", () => {
      it("should create blob and trigger download with default mime type", () => {
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
        const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
        const appendChildSpy = vi.spyOn(document.body, "appendChild");
        const removeChildSpy = vi.spyOn(document.body, "removeChild");

        const result = downloadText("Hello, World!", "test.txt");

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
      });

      it("should use custom mime type when provided", () => {
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

        const result = downloadText("CSV content", "data.csv", "text/csv");

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalled();
      });

      it("should handle multiline text content", () => {
        const content = "Line 1\nLine 2\nLine 3";
        const result = downloadText(content, "multiline.txt");

        expect(result.ok).toBe(true);
      });

      it("should handle empty string content", () => {
        const result = downloadText("", "empty.txt");

        expect(result.ok).toBe(true);
      });

      it("should handle Unicode characters", () => {
        const content = "Hello 世界 🌍 مرحبا";
        const result = downloadText(content, "unicode.txt");

        expect(result.ok).toBe(true);
      });

      it("should clean up object URL after download", () => {
        const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

        downloadText("test", "test.txt");

        expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
      });
    });

    describe("error handling", () => {
      it("should return error when blob creation fails", () => {
        // Mock Blob constructor to throw, but preserve Blob's interface
        class BlobMock implements Blob {
          readonly size: number = 0;
          readonly type: string = "";

          bytes(): Promise<Uint8Array<ArrayBuffer>> {
            throw new Error("Not implemented");
          }

          slice(): Blob {
            throw new Error("Not implemented");
          }
          stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
            throw new Error("Not implemented");
          }
          text(): Promise<string> {
            throw new Error("Not implemented");
          }
          arrayBuffer(): Promise<ArrayBuffer> {
            throw new Error("Not implemented");
          }
          constructor(...args: unknown[]) {
            throw new Error("Blob creation failed");
          }
        }
        globalThis.Blob = BlobMock as unknown as typeof Blob;

        const result = downloadText("test", "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe("Blob creation failed");
        }
        // Blob will be restored in afterEach
      });

      it("should return error when URL.createObjectURL fails", () => {
        vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
          throw new Error("createObjectURL failed");
        });

        const result = downloadText("test", "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("createObjectURL failed");
        }
      });

      it("should handle non-Error exceptions", () => {
        vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
          throw "String error";
        });

        const result = downloadText("test", "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe("String error");
        }
      });
    });
  });

  describe("downloadJSON", () => {
    describe("successful downloads", () => {
      it("should stringify and download JSON object", () => {
        const data = {name: "John", age: 30, email: "john@example.com"};
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

        const result = downloadJSON(data, "data.json");

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalled();
      });

      it("should prettify JSON with 2-space indentation", () => {
        const data = {nested: {key: "value"}};
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

        const result = downloadJSON(data, "data.json");

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalled();
      });

      it("should handle arrays", () => {
        const data = [1, 2, 3, 4, 5];
        const result = downloadJSON(data, "array.json");

        expect(result.ok).toBe(true);
      });

      it("should handle null value", () => {
        const result = downloadJSON(null, "null.json");

        expect(result.ok).toBe(true);
      });

      it("should handle boolean values", () => {
        const resultTrue = downloadJSON(true, "true.json");
        const resultFalse = downloadJSON(false, "false.json");

        expect(resultTrue.ok).toBe(true);
        expect(resultFalse.ok).toBe(true);
      });

      it("should handle string values", () => {
        const result = downloadJSON("test string", "string.json");

        expect(result.ok).toBe(true);
      });

      it("should handle number values", () => {
        const result = downloadJSON(42, "number.json");

        expect(result.ok).toBe(true);
      });

      it("should handle complex nested objects", () => {
        const data = {
          user: {
            name: "John",
            contacts: {
              emails: ["john@example.com", "john@work.com"],
              phones: ["+1234567890"],
            },
          },
          settings: {
            theme: "dark",
            notifications: true,
          },
        };

        const result = downloadJSON(data, "complex.json");

        expect(result.ok).toBe(true);
      });
    });

    describe("error handling", () => {
      it("should return error when JSON.stringify fails", () => {
        const circularRef: Record<string, unknown> = {prop: "value"};
        circularRef["circular"] = circularRef;

        const result = downloadJSON(circularRef, "circular.json");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
        }
      });

      it("should return error when download fails in SSR", () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - intentionally setting to undefined for testing
        delete globalThis.window;

        const result = downloadJSON({test: "data"}, "data.json");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("download not available (SSR)");
        }

        // Restore window
        globalThis.window = originalWindow;
      });

      it("should handle objects with toJSON methods", () => {
        const data = {
          name: "test",
          toJSON() {
            return {serialized: true, name: this.name};
          },
        };

        const result = downloadJSON(data, "with-toJSON.json");

        expect(result.ok).toBe(true);
      });
    });
  });

  describe("downloadBlob", () => {
    describe("SSR/non-browser environment", () => {
      it("should return error when window is not defined", () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - intentionally setting to undefined for testing
        delete globalThis.window;

        const blob = new Blob(["test"], {type: "text/plain"});
        const result = downloadBlob(blob, "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("download not available (SSR)");
        }

        // Restore window
        globalThis.window = originalWindow;
      });
    });

    describe("successful downloads", () => {
      it("should trigger download for a blob", () => {
        const blob = new Blob(["Hello, World!"], {type: "text/plain"});
        const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
        const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");
        const appendChildSpy = vi.spyOn(document.body, "appendChild");
        const removeChildSpy = vi.spyOn(document.body, "removeChild");

        const result = downloadBlob(blob, "test.txt");

        expect(result.ok).toBe(true);
        expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
        expect(revokeObjectURLSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
      });

      it("should handle blob with different mime types", () => {
        const blob = new Blob(['{"key":"value"}'], {type: "application/json"});
        const result = downloadBlob(blob, "data.json");

        expect(result.ok).toBe(true);
      });

      it("should handle empty blob", () => {
        const blob = new Blob([], {type: "text/plain"});
        const result = downloadBlob(blob, "empty.txt");

        expect(result.ok).toBe(true);
      });

      it("should handle binary data blob", () => {
        const uint8Array = new Uint8Array([0, 1, 2, 3, 4]);
        const blob = new Blob([uint8Array], {type: "application/octet-stream"});
        const result = downloadBlob(blob, "binary.dat");

        expect(result.ok).toBe(true);
      });
    });

    describe("error handling", () => {
      it("should return error when URL.createObjectURL fails", () => {
        vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
          throw new Error("createObjectURL failed");
        });

        const blob = new Blob(["test"], {type: "text/plain"});
        const result = downloadBlob(blob, "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.message).toBe("createObjectURL failed");
        }
      });

      it("should handle non-Error exceptions", () => {
        vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
          throw "String error";
        });

        const blob = new Blob(["test"], {type: "text/plain"});
        const result = downloadBlob(blob, "test.txt");

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe("String error");
        }
      });
    });
  });

  describe("integration scenarios", () => {
    it("should support downloading same content in different formats", () => {
      const data = {message: "Hello, World!"};

      // Download as JSON
      const jsonResult = downloadJSON(data, "message.json");
      expect(jsonResult.ok).toBe(true);

      // Download as text
      const textResult = downloadText(JSON.stringify(data), "message.txt");
      expect(textResult.ok).toBe(true);

      // Download as blob
      const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
      const blobResult = downloadBlob(blob, "message.blob");
      expect(blobResult.ok).toBe(true);
    });

    it("should clean up resources properly in sequence", () => {
      const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

      downloadText("First download", "first.txt");
      downloadText("Second download", "second.txt");
      downloadText("Third download", "third.txt");

      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3);
    });
  });
});
