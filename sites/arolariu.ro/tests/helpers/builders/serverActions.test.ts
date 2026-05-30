import {describe, expect, it, vi} from "vitest";

import {
  actionFailure,
  actionSuccess,
  mockRejectedServerAction,
  mockResolvedActionFailure,
  mockResolvedActionSuccess,
} from "./serverActions";

describe("server action builders", () => {
  it("creates a resolved success result", async () => {
    const result = await actionSuccess({id: "invoice-1"});

    expect(result).toEqual({
      success: true,
      data: {id: "invoice-1"},
    });
  });

  it("creates a resolved failure result with the current error shape", async () => {
    const result = await actionFailure({
      code: "VALIDATION_ERROR",
      message: "Invoice is invalid.",
      status: 400,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invoice is invalid.",
        status: 400,
      },
    });
  });

  it("configures Vitest mocks with resolved success and failure values", async () => {
    const serverAction = vi.fn();

    mockResolvedActionSuccess(serverAction, {id: "invoice-1"});
    mockResolvedActionFailure(serverAction, {
      code: "NOT_FOUND",
      message: "Invoice not found.",
      status: 404,
    });

    await expect(serverAction()).resolves.toEqual({
      success: true,
      data: {id: "invoice-1"},
    });
    await expect(serverAction()).resolves.toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Invoice not found.",
        status: 404,
      },
    });
  });

  it("configures rejected server action mocks", async () => {
    const serverAction = vi.fn();
    const error = new Error("Network failure.");

    mockRejectedServerAction(serverAction, error);

    await expect(serverAction()).rejects.toThrow("Network failure.");
  });
});
