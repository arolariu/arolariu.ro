// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import {generateGuid} from "@/lib/utils.generic";
import {useScansStore} from "@/stores";
import {ScanType} from "@/types/scans";
import {act, cleanup, renderHook, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import messages from "../../../../../../messages/en.json";
import {buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import {getContainerClientAtSdk, respondToStorageConfig, storageUrl} from "../../../../../../tests/setup/blob-sdk";
import {apiUrl, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {writeBlobMetadata} from "../../_utils/metadataUtilities";
import ReviewStep from "../_components/ReviewStep";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "./CreateInvoiceContext";

const next = vi.hoisted(() => ({router: {push: vi.fn()}, revalidate: vi.fn()}));
vi.mock("next/navigation", () => ({useRouter: () => next.router}));
vi.mock("next/cache", () => ({revalidatePath: next.revalidate}));

const invoiceId = "11111111-1111-4111-8111-111111111111";
const owner = generateGuid("user-1");
const skipAnimations = MotionGlobalConfig.skipAnimations;

beforeEach(async () => {
  vi.stubEnv("AZURE_CLIENT_ID", "");
  MotionGlobalConfig.skipAnimations = true;
  await useScansStore.persist.rehydrate();
});

afterEach(() => {
  cleanup();
  useScansStore.getState().clearScans();
  MotionGlobalConfig.skipAnimations = skipAnimations;
});

it("retries only unfinished attachments, preserving a category clear on the existing invoice", async () => {
  const invoice = buildInvoice({
    id: invoiceId,
    userIdentifier: owner,
    merchantReference: "33333333-3333-4333-8333-333333333333",
    name: "April receipts",
  });
  const scans = ["initial", "attached", "failed", "later"].map((id) => {
    const {metadata} = buildCachedScan();
    return buildCachedScan({
      id,
      userIdentifier: owner,
      name: `${id}.pdf`,
      mimeType: "application/pdf",
      scanType: ScanType.PDF,
      blobUrl: `${storageUrl}/invoices/scans/${owner}/${id}.pdf`,
      metadata: {...metadata, scanId: id, ownerId: owner, uploadedBy: owner},
    });
  });
  useScansStore.getState().setScans(scans);
  const stored = new Map(scans.map((scan) => [`scans/${owner}/${scan.id}.pdf`, writeBlobMetadata(scan.metadata)]));
  const write = vi.fn<(name: string, value: Record<string, string>) => void>((name, value) => {
    stored.set(name, value);
  });
  getContainerClientAtSdk.mockReturnValue({
    async *listBlobsFlat() {
      for (const [name, metadata] of stored) {
        yield {name, metadata, properties: {contentType: "application/pdf", contentLength: 1024, etag: '"scan-etag"'}};
      }
    },
    getBlockBlobClient: (name: string) => ({
      url: `${storageUrl}/invoices/${name}`,
      setMetadata: async (value: Record<string, string>) => write(name, value),
      getProperties: async () => ({metadata: stored.get(name), contentType: "application/pdf", contentLength: 1024}),
    }),
  });

  const requests: {method: string | undefined; path: string; body: unknown}[] = [];
  const attachments: string[] = [];
  const unexpected: string[] = [];
  const path = `/rest/v1/invoices/${invoiceId}`;
  const scanPath = `${path}/scans`;
  fetchAtHttp.mockImplementation(async (input, options) => {
    const url = new URL(String(input));
    const config = respondToStorageConfig(url);
    if (config) return config;
    if (url.origin === apiUrl) {
      const body: unknown = JSON.parse(String(options?.body));
      requests.push({method: options?.method, path: url.pathname, body});
      if (url.pathname === "/rest/v1/invoices" && options?.method === "POST") return Response.json(invoice, {status: 201});
      if (url.pathname === path && options?.method === "PATCH") return Response.json(invoice);
      if (url.pathname === `${path}/analyze` && options?.method === "POST") return Response.json("queue-id", {status: 202});
      if (url.pathname === scanPath && options?.method === "POST" && body !== null && typeof body === "object" && "location" in body) {
        const selected = scans.find((scan) => scan.blobUrl === body.location);
        if (selected) {
          const firstFailure = selected.id === "failed" && !attachments.includes("failed");
          attachments.push(selected.id);
          return firstFailure ? new Response("Conflict", {status: 409, statusText: "Conflict"}) : new Response(null, {status: 204});
        }
      }
    }
    unexpected.push(url.toString());
    throw new Error("Unexpected test HTTP request");
  });

  const {result} = renderHook(useCreateInvoiceContext, {
    wrapper: ({children}) => (
      <NextIntlClientProvider
        locale='en'
        timeZone='UTC'
        messages={{categories: messages.categories, forms: {invoices: {createInvoice: messages.forms.invoices.createInvoice}}}}>
        <CreateInvoiceProvider>
          {children}
          <ReviewStep />
        </CreateInvoiceProvider>
      </NextIntlClientProvider>
    ),
  });
  act(() => {
    result.current.selectAllScans();
    result.current.setName("April receipts");
    result.current.setCategory(3001);
    result.current.goToStep("review");
  });
  const user = userEvent.setup();

  await act(() => user.click(screen.getByRole("button", {name: "Create Invoice"})));

  const retry = await screen.findByRole("button", {name: "Retry attaching scans"});
  expect(result.current.partialOutcome).toMatchObject({
    status: "partial",
    invoiceIdentifier: invoiceId,
    failedStep: "scans",
    message: "An unexpected error occurred while attaching the scan. Please try again.",
  });
  expect(attachments).toEqual(["attached", "failed"]);
  expect(write).not.toHaveBeenCalled();
  expect(next.router.push).not.toHaveBeenCalled();
  expect(useScansStore.getState().scans.map(({status}) => status)).toEqual(["ready", "ready", "ready", "ready"]);

  act(() => result.current.setCategory(null));
  await act(() => user.click(retry));

  await waitFor(() => {
    expect(next.revalidate.mock.calls.filter(([route]) => route === "/domains/invoices/view-scans")).toHaveLength(4);
    expect(next.router.push).toHaveBeenCalledExactlyOnceWith(`/domains/invoices/view-invoice/${invoiceId}`);
  });
  expect(result.current.partialOutcome).toBeNull();
  expect(screen.queryByRole("button", {name: "Retry attaching scans"})).not.toBeInTheDocument();
  expect(attachments).toEqual(["attached", "failed", "failed", "later"]);
  expect(requests.map(({method, path: url}) => `${method} ${url}`)).toEqual([
    "POST /rest/v1/invoices",
    `PATCH ${path}`,
    `POST ${scanPath}`,
    `POST ${scanPath}`,
    `PATCH ${path}`,
    `POST ${scanPath}`,
    `POST ${scanPath}`,
    `POST ${path}/analyze`,
  ]);
  expect(requests[0]?.body).not.toHaveProperty("name");
  expect(requests[1]?.body).toHaveProperty("name", "April receipts");
  expect(requests[1]?.body).toHaveProperty("category", 3001);
  expect(requests[4]?.body).toHaveProperty("category", null);
  expect(requests.at(-1)?.body).toEqual({profile: "comprehensive"});
  expect(useScansStore.getState().scans.map(({status, metadata}) => [status, metadata.attachedTo])).toEqual(
    scans.map(() => ["attached", invoiceId]),
  );
  expect([...stored.values()].map(({status, attachedTo}) => [status, attachedTo])).toEqual(scans.map(() => ["attached", invoiceId]));
  expect(unexpected).toEqual([]);
});
