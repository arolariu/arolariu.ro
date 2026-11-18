import {writeBlobMetadata} from "@/app/domains/invoices/_utils/metadataUtilities";
import {generateGuid} from "@/lib/utils.generic";
import {InvoiceScanType} from "@/types/invoices";
import {ScanType, type Scan} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice, buildScan} from "../../../../../../tests/helpers/builders/domain";
import {getContainerClientAtSdk, respondToStorageConfig, storageUrl} from "../../../../../../tests/setup/blob-sdk";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {createInvoiceFromScans} from "./createInvoiceFromScans";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({revalidatePath}));

const owner = generateGuid("user-1");
const invoiceIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
] as const;
const invoicePath = "/rest/v1/invoices";
const timestamp = new Date("2026-04-19T13:00:00Z");
const blobName = (id: string): string => `scans/${owner}/${id}.jpg`;

function scan(id: string, scanType: ScanType): Scan {
  const {metadata} = buildScan();
  return buildScan({
    id,
    userIdentifier: owner,
    scanType,
    blobUrl: `${storageUrl}/invoices/${blobName(id)}`,
    metadata: {
      ...metadata,
      scanId: id,
      ownerId: owner,
      uploadedAt: timestamp,
      uploadedBy: owner,
      archivedBy: owner,
      archivedAt: timestamp,
      detachedBy: owner,
      detachedAt: timestamp,
      detachedFrom: invoiceIds[0],
    },
  });
}

function invoiceResponse(id: string): Response {
  return Response.json(buildInvoice({id, userIdentifier: owner, merchantReference: invoiceIds[0]}), {status: 201});
}

function arrangeStorage(scans: readonly Scan[]) {
  const stored = new Map(scans.map((item) => [blobName(item.id), writeBlobMetadata(item.metadata)]));
  const write = vi.fn<(name: string, value: Record<string, string>) => void>((name, value) => {
    stored.set(name, value);
  });
  const list = vi.fn(async function* () {
    for (const [name, metadata] of stored) {
      yield {name, metadata, properties: {contentType: "image/jpeg", contentLength: 1024, etag: '"scan-etag"'}};
    }
  });
  getContainerClientAtSdk.mockReturnValue({
    listBlobsFlat: list,
    getBlockBlobClient: (name: string) => ({
      url: `${storageUrl}/invoices/${name}`,
      setMetadata: async (value: Record<string, string>) => write(name, value),
      getProperties: async () => ({metadata: stored.get(name), contentType: "image/jpeg", contentLength: 1024}),
    }),
  });
  return {stored, write, list};
}

type Reply = () => Response;
type RequestRecord = {readonly path: string; readonly body: unknown; readonly headers: Headers};

function arrangeHttp(
  creates: readonly Reply[],
  attaches: readonly Reply[] = [],
  analyze: Reply = () => Response.json("queue-id", {status: 202}),
) {
  const creation: RequestRecord[] = [];
  const attachments: RequestRecord[] = [];
  const analysis: RequestRecord[] = [];
  const unexpected: string[] = [];
  fetchAtHttp.mockImplementation(async (input, options) => {
    const url = new URL(String(input));
    const config = respondToStorageConfig(url);
    if (config) return config;

    if (url.origin === apiUrl && options?.method === "POST") {
      const request = {path: url.pathname, body: JSON.parse(String(options.body)) as unknown, headers: new Headers(options.headers)};
      if (request.path === invoicePath) {
        const reply = creates[creation.length];
        creation.push(request);
        if (reply) return reply();
      } else if (request.path.startsWith(`${invoicePath}/`) && request.path.endsWith("/scans")) {
        const reply = attaches[attachments.length];
        attachments.push(request);
        if (reply) return reply();
      } else if (request.path.startsWith(`${invoicePath}/`) && request.path.endsWith("/analyze")) {
        analysis.push(request);
        return analyze();
      }
    }

    unexpected.push(url.toString());
    throw new Error("Unexpected test HTTP request");
  });
  return {creation, attachments, analysis, unexpected};
}

function expectLinked(stored: Map<string, Record<string, string>>, scanId: string, invoiceId: string): void {
  const metadata = stored.get(blobName(scanId));
  expect(metadata).toMatchObject({
    scanId,
    ownerId: owner,
    status: "attached",
    attachedTo: invoiceId,
    attachedBy: owner,
    attachedAt: expect.any(String),
  });
  for (const key of ["archivedAt", "archivedBy", "detachedAt", "detachedBy", "detachedFrom"]) {
    expect(metadata).not.toHaveProperty(key);
  }
}

function expectCreatedFrom(request: RequestRecord | undefined, source: Scan | undefined, type: InvoiceScanType): void {
  expect(request?.path).toBe(invoicePath);
  expect(request?.headers.get("authorization")).toMatch(/^Bearer \S+$/u);
  expect(request?.body).toEqual({
    userIdentifier: owner,
    initialScan: {
      type,
      location: source?.blobUrl,
      metadata: {
        sourceScanId: source?.id,
        sourceOwnerId: owner,
        documentKind: "receipt",
        documentRole: "primary",
        uploadedAt: timestamp.toISOString(),
      },
    },
    additionalMetadata: {sourceScanId: source?.id, isImportant: "false", requiresAnalysis: "true"},
  });
}

describe("createInvoiceFromScans", () => {
  beforeEach(() => {
    vi.stubEnv("AZURE_CLIENT_ID", "");
  });

  it.each([false, true])("creates one invoice per successful scan and keeps the original order (partial failure: %s)", async (partial) => {
    const scans = [scan("first", ScanType.JPEG), scan("second", ScanType.PNG), scan("third", ScanType.PDF)];
    const storage = arrangeStorage(scans);
    const http = arrangeHttp([
      () => invoiceResponse(invoiceIds[0]),
      () => (partial ? new Response("Unavailable", {status: 503}) : invoiceResponse(invoiceIds[1])),
      () => invoiceResponse(invoiceIds[2]),
    ]);
    const expected = partial ? [invoiceIds[0], invoiceIds[2]] : [...invoiceIds];

    const result = await createInvoiceFromScans({scans, mode: "single"});
    await vi.waitFor(() => expect(revalidatePath).toHaveBeenCalledTimes(expected.length));

    expect(result.invoices).toEqual(expected.map((id) => expect.objectContaining({id, createdAt: expect.any(Date)})));
    expect(result.convertedScanIds).toEqual(partial ? ["first", "third"] : ["first", "second", "third"]);
    expect(result.errors).toEqual(partial ? [{scanId: "second", error: "Failed to create invoice: 503 - Unavailable"}] : []);
    expect(http.creation).toHaveLength(3);
    [InvoiceScanType.JPEG, InvoiceScanType.PNG, InvoiceScanType.PDF].forEach((type, index) => {
      expectCreatedFrom(http.creation[index], scans[index], type);
    });
    expect(http.attachments).toEqual([]);
    expect(http.analysis.map(({path}) => path).sort()).toEqual(expected.map((id) => `${invoicePath}/${id}/analyze`));
    expect(storage.list).toHaveBeenCalledWith({prefix: `scans/${owner}/`, includeMetadata: true});
    expectLinked(storage.stored, "first", invoiceIds[0]);
    expectLinked(storage.stored, "third", invoiceIds[2]);
    if (partial) {
      expect(storage.stored.get(blobName("second"))).toMatchObject({status: "ready", archivedBy: owner});
      expect(storage.write.mock.calls.map(([name]) => name).sort()).toEqual([blobName("first"), blobName("third")]);
    } else {
      expectLinked(storage.stored, "second", invoiceIds[1]);
    }
    expect(http.unexpected).toEqual([]);
  });

  it.each(["all", "partial", "non-Error", "single scan"])("links only converted scans to the batch invoice (%s)", async (scenario) => {
    const scans = [
      scan("first", ScanType.OTHER),
      ...(scenario === "single scan" ? [] : [scan("second", ScanType.PNG), scan("third", ScanType.PDF)]),
    ];
    const storage = arrangeStorage(scans);
    const respondToSecond = () => {
      if (scenario === "non-Error") throw "Attachment error";
      return scenario === "partial" ? new Response("Conflict", {status: 409}) : new Response(null, {status: 204});
    };
    const http = arrangeHttp([() => invoiceResponse(invoiceIds[0])], [respondToSecond, () => new Response(null, {status: 204})]);
    const rejected = scenario === "partial" || scenario === "non-Error";
    const convertedIds = scans.filter(({id}) => !rejected || id !== "second").map(({id}) => id);

    const result = await createInvoiceFromScans({scans, mode: "batch"});
    await vi.waitFor(() => expect(revalidatePath).toHaveBeenCalledTimes(convertedIds.length));

    expect(result.invoices).toEqual([expect.objectContaining({id: invoiceIds[0], createdAt: expect.any(Date)})]);
    expect(result.convertedScanIds).toEqual(convertedIds);
    expect(result.errors).toEqual(
      rejected
        ? [{scanId: "second", error: scenario === "partial" ? "Failed to attach scan to invoice: 409 - Conflict" : "Unknown error"}]
        : [],
    );
    expect(http.creation).toHaveLength(1);
    expectCreatedFrom(http.creation[0], scans[0], InvoiceScanType.UNKNOWN);
    expect(http.attachments).toHaveLength(scans.length - 1);
    scans.slice(1).forEach((source, index) => {
      const request = http.attachments[index];
      expect(request?.path).toBe(`${invoicePath}/${invoiceIds[0]}/scans`);
      expect(request?.body).toEqual({
        type: index === 0 ? InvoiceScanType.PNG : InvoiceScanType.PDF,
        location: source.blobUrl,
        additionalMetadata: {
          sourceScanId: source.id,
          sourceOwnerId: owner,
          documentKind: "receipt",
          documentRole: "primary",
          attachedAt: expect.any(String),
        },
      });
    });
    expect(http.analysis).toMatchObject([{path: `${invoicePath}/${invoiceIds[0]}/analyze`, body: {profile: "comprehensive"}}]);
    expect(storage.write.mock.calls.map(([name]) => name).sort()).toEqual(convertedIds.map(blobName).sort());
    for (const id of convertedIds) expectLinked(storage.stored, id, invoiceIds[0]);
    if (rejected) expect(storage.stored.get(blobName("second"))).toMatchObject({status: "ready", archivedBy: owner});
    expect(http.unexpected).toEqual([]);
  });

  it.each([
    ["single", () => new Response("Bad request", {status: 400}), "Failed to create invoice: 400 - Bad request", 2],
    [
      "single",
      () => {
        throw new Error("Network error");
      },
      "Network error",
      2,
    ],
    [
      "single",
      () => {
        throw "Invalid connection";
      },
      "Unknown error",
      2,
    ],
    ["batch", () => new Response("Unavailable", {status: 503}), "Failed to create invoice: 503 - Unavailable", 1],
    [
      "batch",
      () => {
        throw "Invalid connection";
      },
      "Unknown error",
      1,
    ],
  ] as const)("returns affected scans without running background work when %s creation fails (%s)", async (mode, reply, error, calls) => {
    const scans = [scan("first", ScanType.JPEG), scan("second", ScanType.PNG)];
    const http = arrangeHttp([reply, reply]);

    const result = await createInvoiceFromScans({scans, mode});

    expect(result).toEqual({
      invoices: [],
      convertedScanIds: [],
      errors: [
        {scanId: "first", error},
        {scanId: "second", error},
      ],
    });
    expect(http.creation).toHaveLength(calls);
    expect(http.attachments).toEqual([]);
    expect(http.analysis).toEqual([]);
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
    expect(http.unexpected).toEqual([]);
  });

  it("does not convert a scan when the upstream success body is malformed", async () => {
    const http = arrangeHttp([() => Response.json({id: invoiceIds[0]}, {status: 201})]);

    const result = await createInvoiceFromScans({scans: [scan("first", ScanType.JPEG)], mode: "single"});

    expect(result).toEqual({invoices: [], convertedScanIds: [], errors: [{scanId: "first", error: expect.any(String)}]});
    expect(http.analysis).toEqual([]);
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it("does not reach HTTP for empty input or a rejected identity lookup", async () => {
    await expect(createInvoiceFromScans({scans: [], mode: "single"})).resolves.toEqual({invoices: [], errors: [], convertedScanIds: []});
    await expect(createInvoiceFromScans({scans: [], mode: "batch"})).rejects.toThrow("No scans provided for batch creation");
    auth.mockRejectedValue(new Error("Auth service unavailable"));

    await expect(createInvoiceFromScans({scans: [scan("first", ScanType.JPEG)], mode: "single"})).rejects.toThrow(
      "Auth service unavailable",
    );

    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it.each(["single", "batch"] as const)("keeps %s conversion successful when real best-effort actions fail", async (mode) => {
    const scans = [scan("first", ScanType.JPEG)];
    const storage = arrangeStorage(scans);
    const metadataError = new Error("SDK refused metadata update");
    const analysisError = new Error("Analysis network down");
    storage.write.mockImplementation(() => {
      throw metadataError;
    });
    const http = arrangeHttp([() => invoiceResponse(invoiceIds[0])], [], () => {
      throw analysisError;
    });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createInvoiceFromScans({scans, mode});

    expect(result).toEqual({invoices: [expect.objectContaining({id: invoiceIds[0]})], convertedScanIds: ["first"], errors: []});
    await vi.waitFor(() => {
      expect(errorLog).toHaveBeenCalledWith("analyzeInvoice failed:", analysisError.message, analysisError);
      expect(errorLog).toHaveBeenCalledWith("Error updating scan:", metadataError);
    });
    expect(storage.stored.get(blobName("first"))).toMatchObject({status: "ready", archivedBy: owner});
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(http.unexpected).toEqual([]);
  });
});
