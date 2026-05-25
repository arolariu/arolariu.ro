/**
 * @fileoverview Unit tests for useInvoiceDelete hook.
 * @module app/domains/invoices/_hooks/useInvoiceDelete.test
 */

import {toast} from "@arolariu/components";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import deleteInvoice from "@/lib/actions/invoices/deleteInvoice";
import type {Invoice} from "@/types/invoices";
import {useInvoiceDelete} from "./useInvoiceDelete";

vi.mock("@/lib/actions/invoices/deleteInvoice", () => ({
  default: vi.fn(),
}));

const removeEntity = vi.fn();
type MockInvoicesStore = Readonly<{removeEntity: typeof removeEntity}>;
vi.mock("@/stores", () => ({
  useInvoicesStore: <T,>(selector: (state: MockInvoicesStore) => T): T => selector({removeEntity}),
}));

vi.mock("@arolariu/components", () => ({
  toast: {success: vi.fn(), error: vi.fn(), info: vi.fn()},
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const invoice = {id: "inv-1", name: "Receipt #1"} as Invoice;

describe("useInvoiceDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteInvoice, toasts success, removes the entity, and runs onComplete", async () => {
    vi.mocked(deleteInvoice).mockResolvedValueOnce(undefined);
    const onComplete = vi.fn();

    const {result} = renderHook(() => useInvoiceDelete(onComplete));

    await act(async () => {
      await result.current.deleteInvoiceCallback(invoice.id);
    });

    expect(deleteInvoice).toHaveBeenCalledWith({invoiceId: "inv-1"});
    expect(removeEntity).toHaveBeenCalledWith("inv-1");
    expect(toast.success).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isDeleting).toBe(false);
  });

  it("toasts an error and does not remove the entity when deletion throws", async () => {
    vi.mocked(deleteInvoice).mockRejectedValueOnce(new Error("nope"));
    const onComplete = vi.fn();

    const {result} = renderHook(() => useInvoiceDelete(onComplete));

    await act(async () => {
      await result.current.deleteInvoiceCallback(invoice.id);
    });

    expect(removeEntity).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);

    vi.clearAllMocks();
    vi.mocked(deleteInvoice).mockRejectedValueOnce("still nope");

    await act(async () => {
      await result.current.deleteInvoiceCallback(invoice.id);
    });

    expect(removeEntity).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("performDelete loops, aggregates counters, and toasts the summary", async () => {
    vi.mocked(deleteInvoice)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useInvoiceDelete());

    let bulk: {successCount: number; failureCount: number; failedIds: readonly string[]} | undefined;
    await act(async () => {
      bulk = await result.current.deleteInvoiceCallback(["a", "b", "c"]);
    });

    expect(bulk).toEqual({successCount: 2, failureCount: 1, failedIds: ["b"]});
    expect(toast.info).toHaveBeenCalled();
    expect(removeEntity).toHaveBeenCalledTimes(2);
    expect(removeEntity).toHaveBeenCalledWith("a");
    expect(removeEntity).toHaveBeenCalledWith("c");
    expect(result.current.isDeleting).toBe(false);

    vi.clearAllMocks();
    vi.mocked(deleteInvoice).mockResolvedValueOnce(undefined);

    await act(async () => {
      bulk = await result.current.deleteInvoiceCallback(["success-only"]);
    });

    expect(bulk).toEqual({successCount: 1, failureCount: 0, failedIds: []});
    expect(toast.success).toHaveBeenCalled();
    expect(removeEntity).toHaveBeenCalledWith("success-only");

    vi.clearAllMocks();
    vi.mocked(deleteInvoice).mockRejectedValueOnce(new Error("boom"));

    await act(async () => {
      bulk = await result.current.deleteInvoiceCallback(["failure-only"]);
    });

    expect(bulk).toEqual({successCount: 0, failureCount: 1, failedIds: ["failure-only"]});
    expect(toast.error).toHaveBeenCalled();
    expect(removeEntity).not.toHaveBeenCalled();
  });
});
