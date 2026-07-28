/**
 * @fileoverview Tests for Azure Blob Storage client factory.
 * @module sites/arolariu.ro/src/lib/azure/storageClient.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

const {
  mockFromConnectionString,
  mockGetContainerClient,
  mockGetBlockBlobClient,
  mockUploadData,
  mockListBlobsFlat,
  mockGetProperties,
  mockSetMetadata,
  mockDeleteIfExists,
  mockGetUserDelegationKey,
  mockGenerateBlobSASQueryParameters,
} = vi.hoisted(() => ({
  mockFromConnectionString: vi.fn(),
  mockGetContainerClient: vi.fn(),
  mockGetBlockBlobClient: vi.fn(),
  mockUploadData: vi.fn(),
  mockListBlobsFlat: vi.fn(),
  mockGetProperties: vi.fn(),
  mockSetMetadata: vi.fn(),
  mockDeleteIfExists: vi.fn(),
  mockGetUserDelegationKey: vi.fn(),
  mockGenerateBlobSASQueryParameters: vi.fn(),
}));

// Mock server-only
vi.mock("server-only", () => ({}));

// Undo the global storageClient mock so we test the REAL implementation
vi.unmock("@/lib/azure/storageClient");

// Mock @azure/storage-blob
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class MockBlobServiceClient {
    static fromConnectionString = mockFromConnectionString;
    url: string;
    constructor(url: string) {
      this.url = url;
    }
    getContainerClient = mockGetContainerClient;
    getUserDelegationKey = mockGetUserDelegationKey;
  },
  generateBlobSASQueryParameters: mockGenerateBlobSASQueryParameters,
  BlobSASPermissions: {
    parse: vi.fn((permissions: string) => ({toString: () => permissions})),
  },
}));

// Mock credentials module for the HTTPS path
vi.mock("@/lib/azure/credentials", () => ({
  getAzureCredential: vi.fn(() => ({getToken: vi.fn()})),
}));

import {
  createBlobClient,
  rewriteAzuriteUrl,
  createBlobUploadTarget,
  uploadBlobObject,
  listBlobObjects,
  getBlobObject,
  updateBlobObject,
  deleteBlobObject,
  resolveBlobObjectByMetadata,
} from "./storageClient";

describe("storageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromConnectionString.mockReturnValue({
      url: "http://azurite-client",
      getContainerClient: mockGetContainerClient,
      getUserDelegationKey: mockGetUserDelegationKey,
    });
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

  describe("createBlobUploadTarget", () => {
    it("returns direct URL with required headers for HTTP/Azurite endpoints", async () => {
      const mockBlockBlobClient = {
        url: "http://azurite:10000/devstoreaccount1/test-container/test-blob.jpg",
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await createBlobUploadTarget({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
          contentType: "image/jpeg",
          metadata: {scanId: "scan-123", userId: "user-456"},
          expiresInMinutes: 60,
        });

        expect(result.blobName).toBe("test-blob.jpg");
        expect(result.sasUrl).toBe("http://localhost:10000/devstoreaccount1/test-container/test-blob.jpg");
        expect(result.blobUrl).toBe("http://localhost:10000/devstoreaccount1/test-container/test-blob.jpg");
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.requiredHeaders["x-ms-blob-type"]).toBe("BlockBlob");
        expect(result.requiredHeaders["Content-Type"]).toBe("image/jpeg");
        expect(result.requiredHeaders["x-ms-meta-scanId"]).toBe("scan-123");
        expect(result.requiredHeaders["x-ms-meta-userId"]).toBe("user-456");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });

    it("returns SAS URL with required headers for HTTPS/Azure endpoints", async () => {
      const mockBlockBlobClient = {
        url: "https://mystorage.blob.core.windows.net/test-container/test-blob.jpg",
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockGetUserDelegationKey.mockResolvedValue({
        signedOid: "oid-123",
        signedTid: "tid-456",
        signedStart: new Date(),
        signedExpiry: new Date(Date.now() + 3600000),
        signedService: "b",
        signedVersion: "2020-12-06",
        value: "key-value",
      });
      mockGenerateBlobSASQueryParameters.mockReturnValue({
        toString: () => "sv=2020-12-06&sig=test-signature",
      });

      const result = await createBlobUploadTarget({
        storageEndpoint: "https://mystorage.blob.core.windows.net",
        containerName: "test-container",
        blobName: "test-blob.jpg",
        contentType: "image/jpeg",
        metadata: {scanId: "scan-123"},
        expiresInMinutes: 60,
      });

      expect(result.blobName).toBe("test-blob.jpg");
      expect(result.sasUrl).toContain("sv=2020-12-06&sig=test-signature");
      expect(result.blobUrl).toBe("https://mystorage.blob.core.windows.net/test-container/test-blob.jpg");
      expect(result.requiredHeaders["x-ms-blob-type"]).toBe("BlockBlob");
      expect(result.requiredHeaders["Content-Type"]).toBe("image/jpeg");
      expect(result.requiredHeaders["x-ms-meta-scanId"]).toBe("scan-123");
      expect(mockGetUserDelegationKey).toHaveBeenCalled();
      expect(mockGenerateBlobSASQueryParameters).toHaveBeenCalled();
    });
  });

  describe("uploadBlobObject", () => {
    it("calls uploadData with content type and metadata", async () => {
      const mockBlockBlobClient = {
        url: "http://azurite:10000/devstoreaccount1/test-container/test-blob.jpg",
        uploadData: mockUploadData,
        getProperties: mockGetProperties,
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockUploadData.mockResolvedValue({});
      mockGetProperties.mockResolvedValue({
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01"),
        etag: '"etag-123"',
        metadata: {scanId: "scan-123"},
      });

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const content = new Uint8Array([1, 2, 3]);
        const result = await uploadBlobObject({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
          content,
          contentType: "image/jpeg",
          metadata: {scanId: "scan-123"},
        });

        expect(mockUploadData).toHaveBeenCalledWith(content, {
          blobHTTPHeaders: {blobContentType: "image/jpeg"},
          metadata: {scanId: "scan-123"},
        });
        expect(result.name).toBe("test-blob.jpg");
        expect(result.contentType).toBe("image/jpeg");
        expect(result.contentLength).toBe(1024);
        expect(result.url).toBe("http://localhost:10000/devstoreaccount1/test-container/test-blob.jpg");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });

  describe("listBlobObjects", () => {
    it("maps blob items to BlobObject with normalized URLs", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            name: "blob1.jpg",
            properties: {
              contentType: "image/jpeg",
              contentLength: 1024,
              createdOn: new Date("2024-01-01"),
              etag: '"etag-1"',
            },
            metadata: {scanId: "scan-1"},
          };
          yield {
            name: "blob2.pdf",
            properties: {
              contentType: "application/pdf",
              contentLength: 2048,
              createdOn: new Date("2024-01-02"),
              etag: '"etag-2"',
            },
            metadata: {scanId: "scan-2"},
          };
        },
      };

      mockGetContainerClient.mockReturnValue({
        listBlobsFlat: mockListBlobsFlat,
        getBlockBlobClient: (name: string) => ({
          url: `http://azurite:10000/devstoreaccount1/test-container/${name}`,
        }),
      });
      mockListBlobsFlat.mockReturnValue(mockIterator);

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await listBlobObjects({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          prefix: "prefix/",
          includeMetadata: true,
        });

        expect(mockListBlobsFlat).toHaveBeenCalledWith({prefix: "prefix/", includeMetadata: true});
        expect(result).toHaveLength(2);
        expect(result[0]?.name).toBe("blob1.jpg");
        expect(result[0]?.url).toBe("http://localhost:10000/devstoreaccount1/test-container/blob1.jpg");
        expect(result[0]?.contentType).toBe("image/jpeg");
        expect(result[1]?.name).toBe("blob2.pdf");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });

  describe("getBlobObject", () => {
    it("calls getProperties and maps to BlobObject", async () => {
      const mockBlockBlobClient = {
        url: "http://azurite:10000/devstoreaccount1/test-container/test-blob.jpg",
        getProperties: mockGetProperties,
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockGetProperties.mockResolvedValue({
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01"),
        etag: '"etag-123"',
        metadata: {scanId: "scan-123"},
      });

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await getBlobObject({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
        });

        expect(mockGetProperties).toHaveBeenCalled();
        expect(result.name).toBe("test-blob.jpg");
        expect(result.url).toBe("http://localhost:10000/devstoreaccount1/test-container/test-blob.jpg");
        expect(result.contentType).toBe("image/jpeg");
        expect(result.contentLength).toBe(1024);
        expect(result.metadata["scanId"]).toBe("scan-123");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });

  describe("updateBlobObject", () => {
    it("uses uploadData when content is provided", async () => {
      const mockBlockBlobClient = {
        url: "http://azurite:10000/devstoreaccount1/test-container/test-blob.jpg",
        uploadData: mockUploadData,
        getProperties: mockGetProperties,
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockUploadData.mockResolvedValue({});
      mockGetProperties.mockResolvedValue({
        contentType: "image/png",
        contentLength: 2048,
        createdOn: new Date("2024-01-01"),
        etag: '"etag-updated"',
        metadata: {scanId: "scan-updated"},
      });

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const content = new Uint8Array([4, 5, 6]);
        const result = await updateBlobObject({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
          content,
          contentType: "image/png",
          metadata: {scanId: "scan-updated"},
        });

        expect(mockUploadData).toHaveBeenCalledWith(content, {
          blobHTTPHeaders: {blobContentType: "image/png"},
          metadata: {scanId: "scan-updated"},
        });
        expect(result.contentType).toBe("image/png");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });

    it("uses setMetadata with ETag condition when only metadata is provided", async () => {
      const mockBlockBlobClient = {
        url: "http://azurite:10000/devstoreaccount1/test-container/test-blob.jpg",
        setMetadata: mockSetMetadata,
        getProperties: mockGetProperties,
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockSetMetadata.mockResolvedValue({});
      mockGetProperties.mockResolvedValue({
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01"),
        etag: '"etag-new"',
        metadata: {status: "processed"},
      });

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await updateBlobObject({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
          metadata: {status: "processed"},
          etag: '"etag-123"',
        });

        expect(mockSetMetadata).toHaveBeenCalledWith({status: "processed"}, {conditions: {ifMatch: '"etag-123"'}});
        expect(result.metadata["status"]).toBe("processed");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });

  describe("deleteBlobObject", () => {
    it("calls deleteIfExists and returns result", async () => {
      const mockBlockBlobClient = {
        deleteIfExists: mockDeleteIfExists,
      };
      mockGetContainerClient.mockReturnValue({
        getBlockBlobClient: mockGetBlockBlobClient,
      });
      mockGetBlockBlobClient.mockReturnValue(mockBlockBlobClient);
      mockDeleteIfExists.mockResolvedValue({succeeded: true, errorCode: undefined});

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await deleteBlobObject({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          blobName: "test-blob.jpg",
        });

        expect(mockDeleteIfExists).toHaveBeenCalled();
        expect(result.succeeded).toBe(true);
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });

  describe("resolveBlobObjectByMetadata", () => {
    it("returns first blob where predicate returns true", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            name: "blob1.jpg",
            properties: {
              contentType: "image/jpeg",
              contentLength: 1024,
              createdOn: new Date("2024-01-01"),
              etag: '"etag-1"',
            },
            metadata: {scanId: "scan-1", status: "pending"},
          };
          yield {
            name: "blob2.jpg",
            properties: {
              contentType: "image/jpeg",
              contentLength: 2048,
              createdOn: new Date("2024-01-02"),
              etag: '"etag-2"',
            },
            metadata: {scanId: "scan-2", status: "processed"},
          };
        },
      };

      mockGetContainerClient.mockReturnValue({
        listBlobsFlat: mockListBlobsFlat,
        getBlockBlobClient: (name: string) => ({
          url: `http://azurite:10000/devstoreaccount1/test-container/${name}`,
        }),
      });
      mockListBlobsFlat.mockReturnValue(mockIterator);

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await resolveBlobObjectByMetadata({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          prefix: "prefix/",
          predicate: (blob) => blob.metadata["status"] === "processed",
        });

        expect(result).not.toBeNull();
        expect(result?.name).toBe("blob2.jpg");
        expect(result?.metadata["status"]).toBe("processed");
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });

    it("returns null when no blob matches predicate", async () => {
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            name: "blob1.jpg",
            properties: {
              contentType: "image/jpeg",
              contentLength: 1024,
              createdOn: new Date("2024-01-01"),
              etag: '"etag-1"',
            },
            metadata: {status: "pending"},
          };
        },
      };

      mockGetContainerClient.mockReturnValue({
        listBlobsFlat: mockListBlobsFlat,
        getBlockBlobClient: (name: string) => ({
          url: `http://azurite:10000/devstoreaccount1/test-container/${name}`,
        }),
      });
      mockListBlobsFlat.mockReturnValue(mockIterator);

      const original = process.env["AZURE_CLIENT_ID"];
      delete process.env["AZURE_CLIENT_ID"];
      try {
        const result = await resolveBlobObjectByMetadata({
          storageEndpoint: "http://azurite:10000/devstoreaccount1",
          containerName: "test-container",
          prefix: "prefix/",
          predicate: (blob) => blob.metadata["status"] === "processed",
        });

        expect(result).toBeNull();
      } finally {
        if (original !== undefined) process.env["AZURE_CLIENT_ID"] = original;
      }
    });
  });
});
