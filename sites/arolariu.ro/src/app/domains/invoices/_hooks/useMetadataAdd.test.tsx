import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {Invoice} from "@/types/invoices";
import {useMetadataAdd} from "./useMetadataAdd";

vi.mock("@/lib/actions/invoices/patchInvoice", () => ({
  default: vi.fn(),
}));

const upsertEntity = vi.fn();
type MockInvoicesStore = Readonly<{upsertEntity: typeof upsertEntity}>;
vi.mock("@/stores", () => ({
  useInvoicesStore: <T,>(selector: (state: MockInvoicesStore) => T): T => selector({upsertEntity}),
}));

let mockInvoice = {
  id: "inv-1",
  additionalMetadata: {color: "blue"},
} as Invoice;

vi.mock("../edit-invoice/[id]/_context/EditInvoiceContext", () => ({
  useEditInvoiceContext: () => ({invoice: mockInvoice}),
}));

describe("useMetadataAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoice = {
      id: "inv-1",
      additionalMetadata: {color: "blue"},
    } as Invoice;
  });

  it("patches merged metadata and upserts the returned invoice", async () => {
    const updatedInvoice = {
      ...mockInvoice,
      additionalMetadata: {color: "blue", size: "large"},
    } as Invoice;
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updatedInvoice});

    const {result} = renderHook(() => useMetadataAdd());

    await act(async () => {
      await result.current.performAdd("size", "large");
    });

    expect(patchInvoice).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      payload: {additionalMetadata: {color: "blue", size: "large"}},
    });
    expect(upsertEntity).toHaveBeenCalledWith(updatedInvoice);
  });

  it("preserves existing metadata keys when adding a new key", async () => {
    mockInvoice = {
      id: "inv-1",
      additionalMetadata: {a: "1"},
    } as Invoice;
    const updatedInvoice = {
      ...mockInvoice,
      additionalMetadata: {a: "1", b: "2"},
    } as Invoice;
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updatedInvoice});

    const {result} = renderHook(() => useMetadataAdd());

    await act(async () => {
      await result.current.performAdd("b", "2");
    });

    expect(patchInvoice).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      payload: {additionalMetadata: {a: "1", b: "2"}},
    });
  });

  it("starts from empty metadata when the invoice has no metadata map", async () => {
    mockInvoice = {
      id: "inv-1",
    } as Invoice;
    const updatedInvoice = {
      ...mockInvoice,
      additionalMetadata: {color: "blue"},
    } as Invoice;
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updatedInvoice});

    const {result} = renderHook(() => useMetadataAdd());

    await act(async () => {
      await result.current.performAdd("color", "blue");
    });

    expect(patchInvoice).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      payload: {additionalMetadata: {color: "blue"}},
    });
  });

  it("throws when patchInvoice reports failure and does not upsert", async () => {
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: "boom"});

    const {result} = renderHook(() => useMetadataAdd());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd("size", "large");
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "boom"});
    expect(upsertEntity).not.toHaveBeenCalled();
  });
});
