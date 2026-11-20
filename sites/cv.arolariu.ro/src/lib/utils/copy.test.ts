/**
 * Unit tests for clipboard copy utility
 * Tests clipboard operations with modern API and fallback
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {copyText} from "./copy";

describe("copyText", () => {
  const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");

  beforeEach(() => {
    Object.defineProperty(document, "execCommand", {configurable: true, value: vi.fn(() => true)});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (execCommandDescriptor) {
      Object.defineProperty(document, "execCommand", execCommandDescriptor);
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }
  });

  describe("SSR/non-browser environment", () => {
    it("should return error when window is not defined", async () => {
      vi.stubGlobal("window", undefined);

      const result = await copyText("test text");

      expect(result).toMatchObject({ok: false, error: {message: "Clipboard not available (SSR)"}});
    });
  });

  describe("empty text handling", () => {
    it("should return ok() when text is empty string", async () => {
      const result = await copyText("");

      expect(result.ok).toBe(true);
    });

    it("should not call clipboard API when text is empty", async () => {
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");

      await copyText("");

      expect(writeTextSpy).not.toHaveBeenCalled();
    });
  });

  describe("modern clipboard API", () => {
    it("should use navigator.clipboard.writeText when available", async () => {
      const testText = "Hello, World!";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(testText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(testText);
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
    });

    it("should return ok result on successful copy", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText("test");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
    });

    it("should handle multiline text", async () => {
      const multilineText = "Line 1\nLine 2\nLine 3";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(multilineText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(multilineText);
    });

    it("should handle special characters", async () => {
      const specialText = "Special: @#$%^&*()_+-=[]{}|;':\",./<>?";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(specialText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(specialText);
    });

    it("should handle Unicode characters", async () => {
      const unicodeText = "Hello 世界 🌍 مرحبا";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(unicodeText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(unicodeText);
    });
  });

  describe("clipboard API failures and fallback", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should fallback to execCommand when clipboard API fails", async () => {
      const testText = "Fallback test";
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard API failed"));
      const execCommandSpy = vi.spyOn(document, "execCommand");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      const result = await copyText(testText);

      expect(result.ok).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith("copy");
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it("should create textarea with correct attributes in fallback", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Failed"));
      const createElementSpy = vi.spyOn(document, "createElement");

      await copyText("test");

      expect(createElementSpy).toHaveBeenCalledWith("textarea");
    });

    it("should use textarea in fallback for copying", async () => {
      const testText = "Fallback value";
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Failed"));

      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      const result = await copyText(testText);

      expect(result.ok).toBe(true);
      expect(createElementSpy).toHaveBeenCalledWith("textarea");
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it("should clean up textarea after fallback copy", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Failed"));
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      await copyText("test");

      expect(removeChildSpy).toHaveBeenCalled();
    });

    it("should return error when fallback also fails", async () => {
      const clipboardError = new Error("Clipboard API failed");
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(clipboardError);
      vi.spyOn(document, "execCommand").mockImplementation(() => {
        throw new Error("execCommand failed");
      });

      const result = await copyText("test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("execCommand failed");
      }
    });

    it("should handle non-Error exceptions in fallback", async () => {
      vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Failed"));
      vi.spyOn(document, "execCommand").mockImplementation(() => {
        throw "String error";
      });

      const result = await copyText("test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("String error");
      }
    });
  });

  describe("edge cases", () => {
    it("should handle very long text", async () => {
      const longText = "a".repeat(10000);
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(longText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(longText);
    });

    it("should handle text with null characters", async () => {
      const textWithNull = "before\0after";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(textWithNull);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(textWithNull);
    });

    it("should handle whitespace-only text", async () => {
      const whitespaceText = "   \n\t\r   ";
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const result = await copyText(whitespaceText);

      expect(result.ok).toBe(true);
      expect(writeTextSpy).toHaveBeenCalledWith(whitespaceText);
    });
  });

  describe("clipboard API unavailable", () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    afterEach(() => {
      if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      else Reflect.deleteProperty(navigator, "clipboard");
    });

    it.each([
      ["navigator.clipboard", undefined],
      ["navigator.clipboard.writeText", {}],
    ])("falls back to the legacy copy command when %s is unavailable", async (_missing, clipboard) => {
      Object.defineProperty(navigator, "clipboard", {value: clipboard, configurable: true});
      const execCommand = vi.spyOn(document, "execCommand");

      const result = await copyText("test");

      expect(result).toMatchObject({ok: true});
      expect(execCommand).toHaveBeenCalledExactlyOnceWith("copy");
    });
  });
});
