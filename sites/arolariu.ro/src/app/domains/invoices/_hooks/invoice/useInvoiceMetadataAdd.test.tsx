import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {Invoice} from "@/types/invoices";
import {useInvoiceMetadataAdd} from "./useInvoiceMetadataAdd";

vi.mock("@/lib/actions/invoices/patchInvoice", () => ({
  default: vi.fn(),
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

let mockInvoice = {
  id: "inv-1",
  additionalMetadata: {color: "blue"},
} as Invoice;

describe("useInvoiceMetadataAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoice = {
      id: "inv-1",
      additionalMetadata: {color: "blue"},
    } as Invoice;
    getEntityById.mockImplementation(() => mockInvoice);
  });

  it("patches merged metadata and upserts the returned invoice", async () => {
    const updatedInvoice = {
      ...mockInvoice,
      additionalMetadata: {color: "blue", size: "large"},
    } as Invoice;
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updatedInvoice});

    const {result} = renderHook(() => useInvoiceMetadataAdd(mockInvoice));

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

    const {result} = renderHook(() => useInvoiceMetadataAdd(mockInvoice));

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

    const {result} = renderHook(() => useInvoiceMetadataAdd(mockInvoice));

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

    const {result} = renderHook(() => useInvoiceMetadataAdd(mockInvoice));

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

  it("handles empty record bulk additions smoothly", async () => {
    const {result} = renderHook(() => useInvoiceMetadataAdd(mockInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performAdd({});
    });

    expect(bulkResult).toEqual({
      successCount: 0,
      failureCount: 0,
      failedItems: [],
    });
    expect(patchInvoice).not.toHaveBeenCalled();
  });

  it("performs sequential bulk metadata additions and returns detailed results", async () => {
    const initialInvoice = {
      id: "inv-1",
      additionalMetadata: {color: "blue"},
    } as Invoice;

    const firstUpdate = {
      ...initialInvoice,
      additionalMetadata: {color: "blue", key1: "val1"},
    } as Invoice;

    const secondUpdate = {
      ...firstUpdate,
      additionalMetadata: {color: "blue", key1: "val1", key2: "val2"},
    } as Invoice;

    vi.mocked(patchInvoice)
      .mockResolvedValueOnce({success: true, invoice: firstUpdate})
      .mockResolvedValueOnce({success: true, invoice: secondUpdate});

    // Emulate sequential store updates by returning updated invoice on subsequent gets
    getEntityById
      .mockReturnValueOnce(initialInvoice)
      .mockReturnValueOnce(firstUpdate);

    const {result} = renderHook(() => useInvoiceMetadataAdd(initialInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performAdd({key1: "val1", key2: "val2"});
    });

    expect(bulkResult).toEqual({
      successCount: 2,
      failureCount: 0,
      failedItems: [],
    });
    expect(patchInvoice).toHaveBeenCalledTimes(2);
    expect(upsertEntity).toHaveBeenCalledTimes(2);
    expect(upsertEntity).toHaveBeenNthCalledWith(1, firstUpdate);
    expect(upsertEntity).toHaveBeenNthCalledWith(2, secondUpdate);
  });

  it("isolates failures and supports partial success for bulk metadata additions", async () => {
    const initialInvoice = {
      id: "inv-1",
      additionalMetadata: {color: "blue"},
    } as Invoice;

    const firstUpdate = {
      ...initialInvoice,
      additionalMetadata: {color: "blue", key1: "val1"},
    } as Invoice;

    vi.mocked(patchInvoice)
      .mockResolvedValueOnce({success: true, invoice: firstUpdate})
      .mockResolvedValueOnce({success: false, error: "failed key2"});

    getEntityById
      .mockReturnValueOnce(initialInvoice)
      .mockReturnValueOnce(firstUpdate);

    const {result} = renderHook(() => useInvoiceMetadataAdd(initialInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performAdd({key1: "val1", key2: "val2"});
    });

    expect(bulkResult).toEqual({
      successCount: 1,
      failureCount: 1,
      failedItems: [{key: "key2", value: "val2"}],
    });
    expect(patchInvoice).toHaveBeenCalledTimes(2);
    expect(upsertEntity).toHaveBeenCalledTimes(1);
    expect(upsertEntity).toHaveBeenCalledWith(firstUpdate);
  });
});
