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
type MockInvoicesStore = Readonly<{upsertEntity: typeof upsertEntity}>;
vi.mock("@/stores", () => ({
  useInvoicesStore: <T,>(selector: (state: MockInvoicesStore) => T): T => selector({upsertEntity}),
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
  });

  it("togglePublic patches sharedWith with LAST_GUID appended and upserts the returned invoice", async () => {
    const updated = {...baseInvoice, sharedWith: [LAST_GUID]};
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare(baseInvoice));

    let returned: Invoice | undefined;
    await act(async () => {
      returned = await result.current.togglePublic();
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
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: alreadyPublicInvoice});
    const {result: alreadyPublicResult} = renderHook(() => useInvoiceShare(alreadyPublicInvoice));

    await act(async () => {
      returned = await alreadyPublicResult.current.togglePublic();
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({sharedWith: [LAST_GUID]}),
      }),
    );
    expect(returned).toBe(alreadyPublicInvoice);
  });

  it("togglePublic throws when patchInvoice reports failure", async () => {
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: "nope"});

    const {result} = renderHook(() => useInvoiceShare(baseInvoice));

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.togglePublic();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(upsertEntity).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: ""});

    await act(async () => {
      try {
        await result.current.togglePublic();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(upsertEntity).not.toHaveBeenCalled();
  });

  it("revokeUserAccess() without an id removes LAST_GUID and patches", async () => {
    const sharedInvoice = {...baseInvoice, sharedWith: [LAST_GUID, "user-2"]};
    const updated = {...sharedInvoice, sharedWith: ["user-2"]};
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare(sharedInvoice));

    await act(async () => {
      await result.current.revokeUserAccess();
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        payload: expect.objectContaining({sharedWith: ["user-2"]}),
      }),
    );
    expect(upsertEntity).toHaveBeenCalledWith(updated);

    vi.clearAllMocks();
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: ""});

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.revokeUserAccess();
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(upsertEntity).not.toHaveBeenCalled();
  });

  it("revokeUserAccess(id) removes the supplied id only", async () => {
    const sharedInvoice = {...baseInvoice, sharedWith: [LAST_GUID, "user-2"]};
    const updated = {...sharedInvoice, sharedWith: [LAST_GUID]};
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useInvoiceShare(sharedInvoice));

    await act(async () => {
      await result.current.revokeUserAccess("user-2");
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({sharedWith: [LAST_GUID]}),
      }),
    );
  });

  it("sendShareEmail wraps sendEmail in toast.promise", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({success: true});

    const {result} = renderHook(() => useInvoiceShare(baseInvoice));

    await act(async () => {
      await result.current.sendShareEmail({to: "x@y.z", identifier: "inv-1", locale});
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

    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValueOnce({success: true});

    await act(async () => {
      await result.current.sendShareEmail({
        to: "recipient",
        identifier: "inv-1",
        locale,
        fromUsername: "Alex Example",
        replyTo: "alex@example.com",
      });
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient",
        props: expect.objectContaining({fromUsername: "Alex Example", toUsername: "recipient"}),
        replyTo: "alex@example.com",
        subjectVars: {fromName: "Alex Example"},
      }),
    );

    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValueOnce({success: false, error: ""});

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.sendShareEmail({to: "x@y.z", identifier: "inv-1", locale});
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "unknown"});

    vi.clearAllMocks();
    vi.mocked(sendEmail).mockRejectedValueOnce("network");

    await act(async () => {
      try {
        await result.current.sendShareEmail({to: "x@y.z", identifier: "inv-1", locale});
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe("network");
  });
});
