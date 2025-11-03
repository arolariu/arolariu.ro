/**
 * @fileoverview Unit tests for HTTP helper
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {createHttpHelper} from "./index";

// Mock @actions/http-client with a factory that creates the mock methods inside
vi.mock("@actions/http-client", () => ({
  HttpClient: vi.fn().mockImplementation(function (this: any) {
    this.get = vi.fn();
    this.post = vi.fn();
    this.put = vi.fn();
    this.patch = vi.fn();
    this.del = vi.fn();
    this.head = vi.fn();
  }),
}));

describe("HttpHelper", () => {
  let httpHelper: ReturnType<typeof createHttpHelper>;
  let mockGet: any;
  let mockPost: any;
  let mockPut: any;
  let mockPatch: any;
  let mockDel: any;
  let mockHead: any;

  beforeEach(() => {
    vi.clearAllMocks();
    httpHelper = createHttpHelper();
    // Access the mock methods from the created instance
    const helperAny = httpHelper as any;
    mockGet = helperAny.client.get;
    mockPost = helperAny.client.post;
    mockPut = helperAny.client.put;
    mockPatch = helperAny.client.patch;
    mockDel = helperAny.client.del;
    mockHead = helperAny.client.head;
  });

  describe("get", () => {
    it("should perform GET request and return JSON", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue(JSON.stringify({data: "test"})),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get<{data: string}>("https://api.example.com/data");

      expect(mockGet).toHaveBeenCalled();
      expect(result.body).toEqual({data: "test"});
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
    });

    it("should pass custom headers", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockGet.mockResolvedValue(mockResponse);

      await httpHelper.get("https://api.example.com/data", {
        headers: {
          Authorization: "Bearer token",
        },
      });

      expect(mockGet).toHaveBeenCalledWith(
        "https://api.example.com/data",
        expect.objectContaining({
          Authorization: "Bearer token",
        }),
      );
    });

    it("should throw error on non-200 status", async () => {
      const mockResponse = {
        message: {statusCode: 404, headers: {}},
        readBody: vi.fn().mockResolvedValue("Not Found"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com/notfound");
      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
    });
  });

  describe("post", () => {
    it("should perform POST request with JSON body", async () => {
      const mockResponse = {
        message: {statusCode: 201, headers: {}},
        readBody: vi.fn().mockResolvedValue(JSON.stringify({id: 123})),
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await httpHelper.post<{id: number}>("https://api.example.com/items", {name: "test"});

      expect(result.body).toEqual({id: 123});
      expect(mockPost).toHaveBeenCalledWith(
        "https://api.example.com/items",
        JSON.stringify({name: "test"}),
        expect.objectContaining({
          "Content-Type": "application/json",
        }),
      );
    });

    it("should merge custom headers with Content-Type", async () => {
      const mockResponse = {
        message: {statusCode: 201, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockPost.mockResolvedValue(mockResponse);

      await httpHelper.post("https://api.example.com/items", {data: "test"}, {headers: {Authorization: "Bearer token"}});

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        }),
      );
    });

    it("should handle POST without body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockPost.mockResolvedValue(mockResponse);

      await httpHelper.post("https://api.example.com/trigger");

      expect(mockPost).toHaveBeenCalledWith("https://api.example.com/trigger", "", expect.any(Object));
    });
  });

  describe("put", () => {
    it("should perform PUT request", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue(JSON.stringify({updated: true})),
      };

      mockPut.mockResolvedValue(mockResponse);

      const result = await httpHelper.put<{updated: boolean}>("https://api.example.com/items/123", {name: "updated"});

      expect(result.body).toEqual({updated: true});
      expect(mockPut).toHaveBeenCalled();
    });

    it("should handle PUT without body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockPut.mockResolvedValue(mockResponse);

      await httpHelper.put("https://api.example.com/reset");

      expect(mockPut).toHaveBeenCalledWith("https://api.example.com/reset", "", expect.any(Object));
    });
  });

  describe("patch", () => {
    it("should perform PATCH request", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue(JSON.stringify({patched: true})),
      };

      mockPatch.mockResolvedValue(mockResponse);

      const result = await httpHelper.patch<{patched: boolean}>("https://api.example.com/items/123", {field: "value"});

      expect(result.body).toEqual({patched: true});
      expect(mockPatch).toHaveBeenCalled();
    });

    it("should handle PATCH without body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockPatch.mockResolvedValue(mockResponse);

      await httpHelper.patch("https://api.example.com/refresh");

      expect(mockPatch).toHaveBeenCalledWith("https://api.example.com/refresh", "", expect.any(Object));
    });
  });

  describe("delete", () => {
    it("should perform DELETE request", async () => {
      const mockResponse = {
        message: {statusCode: 204, headers: {}},
        readBody: vi.fn().mockResolvedValue(""),
      };

      mockDel.mockResolvedValue(mockResponse);

      const result = await httpHelper.delete("https://api.example.com/items/123");

      expect(result.statusCode).toBe(204);
      expect(mockDel).toHaveBeenCalledWith(
        "https://api.example.com/items/123",
        expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      );
    });
  });

  describe("head", () => {
    it("should perform HEAD request", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn(),
      };

      mockHead.mockResolvedValue(mockResponse);

      const result = await httpHelper.head("https://api.example.com/resource");

      expect(result.statusCode).toBe(200);
      expect(mockHead).toHaveBeenCalledWith(
        "https://api.example.com/resource",
        expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      );
    });
  });

  describe("download", () => {
    it("should download file successfully", async () => {
      const fileContent = "File content here";
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue(fileContent),
      };

      mockGet.mockResolvedValue(mockResponse);

      await httpHelper.download("https://example.com/file.txt", "./test-file.txt");

      expect(mockGet).toHaveBeenCalledWith(
        "https://example.com/file.txt",
        expect.objectContaining({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      );
      expect(mockResponse.readBody).toHaveBeenCalled();
    });

    it("should throw error on download failure", async () => {
      const mockError = new Error("Network error");
      mockGet.mockRejectedValue(mockError);

      await expect(httpHelper.download("https://example.com/missing.txt", "./missing-file.txt")).rejects.toThrow(
        "Download failed: Network error",
      );
    });
  });

  describe("request", () => {
    it("should perform custom method request with JSON body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue(JSON.stringify({result: "success"})),
      };

      const helperAny = httpHelper as any;
      helperAny.client.request = vi.fn().mockResolvedValue(mockResponse);

      const result = await httpHelper.request<{result: string}>("OPTIONS", "https://api.example.com/endpoint", {data: "value"});

      expect(result.body).toEqual({result: "success"});
      expect(helperAny.client.request).toHaveBeenCalledWith(
        "OPTIONS",
        "https://api.example.com/endpoint",
        JSON.stringify({data: "value"}),
        expect.any(Object),
      );
    });

    it("should perform custom method request with string body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("response text"),
      };

      const helperAny = httpHelper as any;
      helperAny.client.request = vi.fn().mockResolvedValue(mockResponse);

      await httpHelper.request("POST", "https://api.example.com/text", "raw string body");

      expect(helperAny.client.request).toHaveBeenCalledWith("POST", "https://api.example.com/text", "raw string body", expect.any(Object));
    });

    it("should perform custom method request without body", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      const helperAny = httpHelper as any;
      helperAny.client.request = vi.fn().mockResolvedValue(mockResponse);

      await httpHelper.request("CONNECT", "https://api.example.com");

      expect(helperAny.client.request).toHaveBeenCalledWith("CONNECT", "https://api.example.com", "", expect.any(Object));
    });

    it("should throw error on request failure", async () => {
      const helperAny = httpHelper as any;
      helperAny.client.request = vi.fn().mockRejectedValue(new Error("Connection refused"));

      await expect(httpHelper.request("OPTIONS", "https://api.example.com")).rejects.toThrow("OPTIONS request failed: Connection refused");
    });
  });

  describe("error handling", () => {
    it("should handle GET errors with descriptive messages", async () => {
      mockGet.mockRejectedValue(new Error("Network timeout"));

      await expect(httpHelper.get("https://api.example.com")).rejects.toThrow("GET request failed: Network timeout");
    });

    it("should handle POST errors", async () => {
      mockPost.mockRejectedValue(new Error("Connection refused"));

      await expect(httpHelper.post("https://api.example.com", {data: "test"})).rejects.toThrow("POST request failed: Connection refused");
    });

    it("should handle PUT errors", async () => {
      mockPut.mockRejectedValue(new Error("Server error"));

      await expect(httpHelper.put("https://api.example.com/123", {data: "test"})).rejects.toThrow("PUT request failed: Server error");
    });

    it("should handle PATCH errors", async () => {
      mockPatch.mockRejectedValue(new Error("Unauthorized"));

      await expect(httpHelper.patch("https://api.example.com/123", {data: "test"})).rejects.toThrow("PATCH request failed: Unauthorized");
    });

    it("should handle DELETE errors", async () => {
      mockDel.mockRejectedValue(new Error("Forbidden"));

      await expect(httpHelper.delete("https://api.example.com/123")).rejects.toThrow("DELETE request failed: Forbidden");
    });

    it("should handle HEAD errors", async () => {
      mockHead.mockRejectedValue(new Error("Not found"));

      await expect(httpHelper.head("https://api.example.com/resource")).rejects.toThrow("HEAD request failed: Not found");
    });
  });

  describe("response processing", () => {
    it("should handle non-JSON response bodies", async () => {
      const mockResponse = {
        message: {statusCode: 200, headers: {}},
        readBody: vi.fn().mockResolvedValue("Plain text response"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get<string>("https://api.example.com/text");

      expect(result.body).toBe("Plain text response");
    });

    it("should handle empty response bodies", async () => {
      const mockResponse = {
        message: {statusCode: 204, headers: {}},
        readBody: vi.fn().mockResolvedValue(""),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com/no-content");

      expect(result.statusCode).toBe(204);
      expect(result.body).toBe("");
    });

    it("should parse headers correctly with string values", async () => {
      const mockResponse = {
        message: {
          statusCode: 200,
          headers: {
            "content-type": "application/json",
            "x-custom-header": "custom-value",
          },
        },
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com");

      expect(result.headers["content-type"]).toBe("application/json");
      expect(result.headers["x-custom-header"]).toBe("custom-value");
    });

    it("should parse headers with array values", async () => {
      const mockResponse = {
        message: {
          statusCode: 200,
          headers: {
            "set-cookie": ["cookie1=value1", "cookie2=value2"],
          },
        },
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com");

      expect(result.headers["set-cookie"]).toBe("cookie1=value1, cookie2=value2");
    });

    it("should handle missing status code", async () => {
      const mockResponse = {
        message: {headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com");

      expect(result.statusCode).toBe(0);
      expect(result.success).toBe(false);
    });

    it("should mark 3xx responses as unsuccessful", async () => {
      const mockResponse = {
        message: {statusCode: 302, headers: {}},
        readBody: vi.fn().mockResolvedValue("{}"),
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await httpHelper.get("https://api.example.com");

      expect(result.success).toBe(false);
    });
  });

  describe("createHttpHelper with custom user agent", () => {
    it("should create HTTP helper with custom user agent", () => {
      const customHelper = createHttpHelper("my-custom-agent/1.0");
      expect(customHelper).toBeDefined();
    });
  });
});
