/**
 * @fileoverview Unit tests for useInvoiceShare hook.
 * @module app/domains/invoices/_hooks/useInvoiceShare.test
 */

import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {sendEmail} from "@/lib/actions/email";
import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {EmailLocale} from "@/types/emails";
import type {Invoice} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useInvoiceShare} from "./useInvoiceShare";

vi.mock("@/lib/actions/invoices/patchInvoice", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/actions/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/utils.generic", () => ({
  LAST_GUID: "99999999-9999-9999-9999-999999999999",
}));

const upsertEntity = vi.fn();
const getEntityById = vi.fn();
type MockInvoicesStore = Readonly<{
  upsertEntity: typeof upsertEntity;
  getEntityById: typeof getEntityById;
}>;
vi.mock("@/stores", () => ({
  useInvoicesStore: <T,>(selector: (state: MockInvoicesStore) => T): T => selector({upsertEntity, getEntityById}),
}));

vi.mock("@arolariu/components", () => {
  type ToastPromiseOptions = Readonly<{
    loading: string;
    success: string;
    error: (error: unknown) => string;
  }>;

  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      promise: vi.fn(async (promise: Promise<unknown>, options: ToastPromiseOptions): Promise<unknown> => {
        try {
          await promise;
          return options.success;
        } catch (error) {
          options.error(error);
          throw error;
        }
      }),
    },
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Readonly<Record<string, string>>) => {
    if (values?.["email"] && values["error"]) {
      return `${key}:${values["email"]}:${values["error"]}`;
    }
    if (values?.["email"]) {
      return `${key}:${values["email"]}`;
    }
    return key;
  },
}));

const LAST_GUID = "99999999-9999-9999-9999-999999999999";
const locale: EmailLocale = "en";
const baseInvoice = {
  id: "inv-1",
  name: "Receipt #1",
  sharedWith: [] as string[],
} as Invoice;

describe("useInvoiceShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEntityById.mockReturnValue(baseInvoice);
  });

  it("togglePublic patches sharedWith with LAST_GUID appended and upserts the returned invoice", async () => {
    const updated = {...baseInvoice, sharedWith: [LAST_GUID]};
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare());

    let returned: Invoice | undefined;
    await act(async () => {
      returned = await result.current.shareInvoiceCallback(baseInvoice.id, {type: "togglePublic"});
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        payload: expect.objectContaining({sharedWith: [LAST_GUID]}),
      }),
    );
    expect(upsertEntity).toHaveBeenCalledWith(updated);
    expect(returned).toBe(updated);

    vi.clearAllMocks();
    const alreadyPublicInvoice = {...baseInvoice, sharedWith: [LAST_GUID]};
    getEntityById.mockReturnValueOnce(alreadyPublicInvoice);
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: alreadyPublicInvoice});
    const {result: alreadyPublicResult} = renderHook(() => useInvoiceShare());

    await act(async () => {
      returned = await alreadyPublicResult.current.shareInvoiceCallback(alreadyPublicInvoice.id, {type: "togglePublic"});
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({sharedWith: [LAST_GUID]}),
      }),
    );
    expect(returned).toBe(alreadyPublicInvoice);
  });

  it("togglePublic throws/logs when patchInvoice reports failure", async () => {
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: "nope"});

    const {result} = renderHook(() => useInvoiceShare());

    await act(async () => {
      await result.current.shareInvoiceCallback(baseInvoice.id, {type: "togglePublic"});
    });

    expect(upsertEntity).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: ""});

    await act(async () => {
      await result.current.shareInvoiceCallback(baseInvoice.id, {type: "togglePublic"});
    });

    expect(upsertEntity).not.toHaveBeenCalled();
  });

  it("revokeUserAccess() without an id removes LAST_GUID and patches", async () => {
    const sharedInvoice = {...baseInvoice, sharedWith: [LAST_GUID, "user-2"]};
    const updated = {...sharedInvoice, sharedWith: ["user-2"]};
    getEntityById.mockReturnValue(sharedInvoice);
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare());

    await act(async () => {
      await result.current.shareInvoiceCallback(sharedInvoice.id, {type: "revoke"});
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        payload: expect.objectContaining({sharedWith: ["user-2"]}),
      }),
    );
    expect(upsertEntity).toHaveBeenCalledWith(updated);
  });

  it("revokeUserAccess(id) removes the supplied id only", async () => {
    const sharedInvoice = {...baseInvoice, sharedWith: [LAST_GUID, "user-2"]};
    const updated = {...sharedInvoice, sharedWith: [LAST_GUID]};
    getEntityById.mockReturnValue(sharedInvoice);
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare());

    await act(async () => {
      await result.current.shareInvoiceCallback(sharedInvoice.id, {type: "revoke", userIdToRemove: "user-2"});
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({sharedWith: [LAST_GUID]}),
      }),
    );
  });

  it("sendShareEmail wraps sendEmail in toast.promise", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({success: true});

    const {result} = renderHook(() => useInvoiceShare());

    await act(async () => {
      await result.current.shareInvoiceCallback(baseInvoice.id, {type: "sendEmail", to: "x@y.z", locale});
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: "invoice-shared",
        to: "x@y.z",
        props: expect.objectContaining({
          fromUsername: "Someone",
          toUsername: "x",
          identifier: "inv-1",
          locale: "en",
        }),
        subjectVars: {fromName: "Someone"},
      }),
    );
    expect(toast.promise).toHaveBeenCalledWith(
      expect.any(Promise),
      expect.objectContaining({
        loading: "emailSending:x@y.z",
        success: "emailSuccess:x@y.z",
      }),
    );
  });

  it("bulk sharing performShare loops, aggregates results sequentially", async () => {
    const sharedInvoice1 = {...baseInvoice, id: "bulk-1", sharedWith: []};
    const sharedInvoice2 = {...baseInvoice, id: "bulk-2", sharedWith: []};

    getEntityById.mockImplementation((id: string) => {
      if (id === "bulk-1") return sharedInvoice1;
      if (id === "bulk-2") return sharedInvoice2;
      return null;
    });

    const updated1 = {...sharedInvoice1, sharedWith: [LAST_GUID]};

    vi.mocked(patchInvoice)
      .mockResolvedValueOnce({success: true, invoice: updated1})
      .mockResolvedValueOnce({success: false, error: "failed-2"});

    const {result} = renderHook(() => useInvoiceShare());

    let bulk: {successCount: number; failureCount: number; failedIds: readonly string[]; updatedInvoices: readonly Invoice[]} | undefined;
    await act(async () => {
      bulk = await result.current.shareInvoiceCallback(["bulk-1", "bulk-2"], {type: "togglePublic"});
    });

    expect(bulk).toEqual({
      successCount: 1,
      failureCount: 1,
      failedIds: ["bulk-2"],
      updatedInvoices: [updated1],
    });
    expect(upsertEntity).toHaveBeenCalledTimes(1);
    expect(upsertEntity).toHaveBeenCalledWith(updated1);
  });
});
