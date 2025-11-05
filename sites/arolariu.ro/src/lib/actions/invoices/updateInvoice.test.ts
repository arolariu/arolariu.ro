import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import updateInvoice from "./updateInvoice";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("updateInvoice", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should update invoice successfully", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Updated Invoice",
      totalAmount: 150.5,
    };

    const mockUserInfo: Partial<UserInformation> = {
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    } as Response);

    const result = await updateInvoice(mockInvoice as Invoice, mockUserInfo as UserInformation);

    expect(result).toEqual(mockInvoice);
    expect(global.fetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/invoices/invoice-1", {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-jwt-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockInvoice),
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Updating invoice for user:", mockUserInfo);
  });

  it("should return null when response is not ok", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Updated Invoice",
    };

    const mockUserInfo: Partial<UserInformation> = {
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await updateInvoice(mockInvoice as Invoice, mockUserInfo as UserInformation);

    expect(result).toBeNull();
  });

  it("should handle 401 unauthorized", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Updated Invoice",
    };

    const mockUserInfo: Partial<UserInformation> = {
      userIdentifier: "user-123",
      userJwt: "invalid-token",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const result = await updateInvoice(mockInvoice as Invoice, mockUserInfo as UserInformation);

    expect(result).toBeNull();
  });

  it("should handle 500 server error", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Updated Invoice",
    };

    const mockUserInfo: Partial<UserInformation> = {
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await updateInvoice(mockInvoice as Invoice, mockUserInfo as UserInformation);

    expect(result).toBeNull();
  });

  it("should handle fetch exception", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Updated Invoice",
    };

    const mockUserInfo: Partial<UserInformation> = {
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    };

    const mockError = new Error("Fetch exception");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    const result = await updateInvoice(mockInvoice as Invoice, mockUserInfo as UserInformation);

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error updating the invoice:", mockError);
  });
});
