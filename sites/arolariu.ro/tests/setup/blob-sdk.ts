import {invalidateConfigCache} from "@/lib/config/configProxy";
import {beforeEach, vi} from "vitest";
import {fetchAtHttp} from "./server-http";

const storage = vi.hoisted(() => {
  vi.stubEnv("EXP_PROXY_URL", "https://config.example.test");
  return {getContainerClient: vi.fn(), connect: vi.fn<(endpoint: string | undefined) => void>()};
});

vi.mock("@azure/storage-blob", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@azure/storage-blob")>()),
  BlobServiceClient: {
    fromConnectionString(connectionString: string) {
      storage.connect(/(?:^|;)BlobEndpoint=([^;]+)/u.exec(connectionString)?.[1]);
      return {getContainerClient: storage.getContainerClient};
    },
  },
}));

export const getContainerClientAtSdk = storage.getContainerClient;
export const connectAtSdk = storage.connect;
export const storageUrl = "http://storage.example.test";

beforeEach(() => {
  invalidateConfigCache();
  vi.stubEnv("AZURE_CLIENT_ID", "");
});

/** Provides the storage endpoint through the real configuration request path. */
export function respondToStorageConfig(url: URL): Response | undefined {
  const name = url.searchParams.get("name");
  if (url.origin !== "https://config.example.test" || url.pathname !== "/api/v1/config" || name !== "Endpoints:Storage:Blob")
    return undefined;
  return Response.json({
    name,
    value: storageUrl,
    availableForTargets: ["website"],
    availableInDocuments: ["website.run-time"],
    description: "Test-only storage endpoint",
    fetchedAt: "2026-04-19T13:00:00Z",
    refreshIntervalSeconds: 300,
    requiredInDocuments: ["website.run-time"],
    usage: "Test-only storage endpoint",
  });
}

/** Allows storage-only tests to resolve configuration without permitting other requests. */
export function stubStorageConfig(): void {
  fetchAtHttp.mockImplementation(async (request) => {
    const response = respondToStorageConfig(new URL(String(request)));
    if (!response) throw new Error("Unexpected test HTTP request");
    return response;
  });
}
