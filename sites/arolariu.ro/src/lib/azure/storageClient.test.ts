/**
 * @fileoverview Tests for Azure Blob Storage client factory.
 * @module sites/arolariu.ro/src/lib/azure/storageClient.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockFromConnectionString} = vi.hoisted(() => ({
  mockFromConnectionString: vi.fn(),
}));

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock @azure/storage-blob
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class MockBlobServiceClient {
    static fromConnectionString = mockFromConnectionString;
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  },
}));

// Mock credentials module for the HTTPS path
vi.mock("@/lib/azure/credentials", () => ({
  getAzureCredential: vi.fn(() => ({getToken: vi.fn()})),
}));

import {createBlobClient, rewriteAzuriteUrl} from "./storageClient";

describe("storageClient", () => {
  beforeEach(() => {
    mockFromConnectionString.mockReturnValue({url: "http://azurite-client"});
  });
  describe("rewriteAzuriteUrl", () => {
    it("rewrites Docker-internal Azurite URLs to localhost", () => {
      const dockerUrl = "http://azurite:10000/devstoreaccount1/container/blob.jpg";
      expect(rewriteAzuriteUrl(dockerUrl)).toBe("http://localhost:10000/devstoreaccount1/container/blob.jpg");
    });

    it("leaves non-Azurite URLs unchanged", () => {
      const azureUrl = "https://mystorage.blob.core.windows.net/container/blob.jpg";
      expect(rewriteAzuriteUrl(azureUrl)).toBe(azureUrl);
    });
  });

  describe("createBlobClient", () => {
    it("uses connection string for HTTP (Azurite) endpoints", async () => {
      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const client = await createBlobClient("http://azurite:10000/devstoreaccount1");
        expect(mockFromConnectionString).toHaveBeenCalledOnce();
        expect(client).toBeDefined();
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });

    it("uses Managed Identity credential for HTTPS (Azure) endpoints", async () => {
      const client = await createBlobClient("https://mystorage.blob.core.windows.net");
      expect(client).toBeDefined();
      expect(client.url).toBe("https://mystorage.blob.core.windows.net");
    });

    it("throws for HTTP endpoints when AZURE_CLIENT_ID is set (production guard)", async () => {
      const original = process.env["AZURE_CLIENT_ID"];
      process.env["AZURE_CLIENT_ID"] = "test-client-id";
      try {
        await expect(createBlobClient("http://azurite:10000/devstoreaccount1")).rejects.toThrow(
          "HTTP storage endpoints are not allowed in production",
        );
      } finally {
        if (original !== undefined) {
          process.env["AZURE_CLIENT_ID"] = original;
        } else {
          delete process.env["AZURE_CLIENT_ID"];
        }
      }
    });
  });
});
