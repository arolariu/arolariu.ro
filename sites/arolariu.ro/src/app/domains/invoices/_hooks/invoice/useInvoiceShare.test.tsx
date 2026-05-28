/**
 * @fileoverview Unit tests for useInvoiceShare client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceShare.test
 */

import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoiceShare} from "./useInvoiceShare";
import type {ServerActionResult} from "@/lib/utils.server";
import type {Invoice} from "@/types/invoices";
import {buildInvoice} from "../../../../../../tests/helpers/invoiceDomain";

// Mock dependencies
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  patchInvoice: vi.fn(),
}));

vi.mock("@/lib/actions/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((promise, messages) => promise),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => (fn: (m: Record<string, Record<string, string>>) => string, vars?: Record<string, string>) => {
    const template = fn({
      toasts: {
        invoices: {
          useInvoiceShare: {
            toggleError: "Failed to toggle public access",
            revokeError: "Failed to revoke access",
            emailSending: "Sending email to {{email}}...",
            emailSuccess: "Email sent to {{email}}",
            emailError: "Failed to send email to {{email}}: {{error}}",
          },
        },
      },
    });
    if (!vars) return template;
    return Object.entries(vars).reduce((str, [key, value]) => str.replace(`{{${key}}}`, value), template);
  }),
}));

vi.mock("@/lib/utils.generic", async () => {
  const actual = await vi.importActual("@/lib/utils.generic");
  return {
    ...actual,
    LAST_GUID: "99999999-9999-9999-9999-999999999999",
  };
});

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");
const {patchInvoice} = await import("../../_actions/invoices");
const {sendEmail} = await import("@/lib/actions/email");
const {toast} = await import("@arolariu/components");
const {LAST_GUID} = await import("@/lib/utils.generic");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockPatchInvoice = vi.mocked(patchInvoice);
const mockSendEmail = vi.mocked(sendEmail);
const mockToast = vi.mocked(toast);

describe("useInvoiceShare", () => {
  const testInvoiceId = "11111111-1111-4111-8111-111111111111";
  const testInvoice = buildInvoice({
    id: testInvoiceId,
    sharedWith: [],
  });

  const mockUpsertEntity = vi.fn();
  const mockGetEntityById = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup store mock
    mockUseInvoicesStore.mockImplementation(((selector: (state: {
      upsertEntity: typeof mockUpsertEntity;
      getEntityById: typeof mockGetEntityById;
    }) => typeof mockUpsertEntity | typeof mockGetEntityById) => {
      return selector({
        upsertEntity: mockUpsertEntity,
        getEntityById: mockGetEntityById,
      });
    }) as never);

    mockGetEntityById.mockReturnValue(testInvoice);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns isSharing false initially", () => {
      const {result} = renderHook(() => useInvoiceShare());

      expect(result.current.isSharing).toBe(false);
      expect(result.current.shareInvoiceCallback).toBeDefined();
    });

    it("accepts optional onComplete callback", () => {
      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      expect(result.current.shareInvoiceCallback).toBeDefined();
    });
  });

  describe("togglePublic action", () => {
    it("adds public sentinel when not present", async () => {
      const updatedInvoice = {...testInvoice, sharedWith: [LAST_GUID]};
      const successResult: ServerActionResult<Invoice> = {success: true, data: updatedInvoice};
      mockPatchInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      const updatedResult = await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "togglePublic",
      });

      await waitFor(() => {
        expect(result.current.isSharing).toBe(false);
      });

      expect(mockPatchInvoice).toHaveBeenCalledWith({
        invoiceId: testInvoiceId,
        payload: {sharedWith: [LAST_GUID]},
      });

      expect(mockUpsertEntity).toHaveBeenCalledWith(updatedInvoice);
      expect(mockOnComplete).toHaveBeenCalled();
      expect(updatedResult).toEqual(updatedInvoice);
    });

    it("does not add duplicate public sentinel", async () => {
      const publicInvoice = {...testInvoice, sharedWith: [LAST_GUID]};
      mockGetEntityById.mockReturnValue(publicInvoice);

      const successResult: ServerActionResult<Invoice> = {success: true, data: publicInvoice};
      mockPatchInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceShare());

      await result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});

      expect(mockPatchInvoice).toHaveBeenCalledWith({
        invoiceId: testInvoiceId,
        payload: {sharedWith: [LAST_GUID]},
      });
    });

    it("handles toggle failure", async () => {
      const errorResult: ServerActionResult<Invoice> = {
        success: false,
        error: {message: "Server error", userMessage: "Failed to update"},
      };
      mockPatchInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoiceShare());

      await expect(async () => {
        await result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});
      }).rejects.toThrow();

      expect(mockUpsertEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe("revoke action", () => {
    it("revokes public access when no userId provided", async () => {
      const publicInvoice = {...testInvoice, sharedWith: [LAST_GUID, "user-123"]};
      mockGetEntityById.mockReturnValue(publicInvoice);

      const updatedInvoice = {...publicInvoice, sharedWith: ["user-123"]};
      const successResult: ServerActionResult<Invoice> = {success: true, data: updatedInvoice};
      mockPatchInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      const updatedResult = await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "revoke",
      });

      expect(mockPatchInvoice).toHaveBeenCalledWith({
        invoiceId: testInvoiceId,
        payload: {sharedWith: ["user-123"]},
      });

      expect(mockUpsertEntity).toHaveBeenCalledWith(updatedInvoice);
      expect(mockOnComplete).toHaveBeenCalled();
      expect(updatedResult).toEqual(updatedInvoice);
    });

    it("revokes specific user access", async () => {
      const sharedInvoice = {...testInvoice, sharedWith: ["user-123", "user-456"]};
      mockGetEntityById.mockReturnValue(sharedInvoice);

      const updatedInvoice = {...sharedInvoice, sharedWith: ["user-456"]};
      const successResult: ServerActionResult<Invoice> = {success: true, data: updatedInvoice};
      mockPatchInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceShare());

      await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "revoke",
        userIdToRemove: "user-123",
      });

      expect(mockPatchInvoice).toHaveBeenCalledWith({
        invoiceId: testInvoiceId,
        payload: {sharedWith: ["user-456"]},
      });

      expect(mockUpsertEntity).toHaveBeenCalledWith(updatedInvoice);
    });

    it("handles revoke failure", async () => {
      const errorResult: ServerActionResult<Invoice> = {
        success: false,
        error: {message: "Server error", userMessage: "Failed to revoke"},
      };
      mockPatchInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoiceShare());

      await expect(async () => {
        await result.current.shareInvoiceCallback(testInvoiceId, {type: "revoke"});
      }).rejects.toThrow();

      expect(mockUpsertEntity).not.toHaveBeenCalled();
    });
  });

  describe("sendEmail action", () => {
    it("sends email without mutating invoice", async () => {
      const emailResult = {success: true as const};
      mockSendEmail.mockResolvedValue(emailResult);

      const {result} = renderHook(() => useInvoiceShare());

      const emailAction = {
        type: "sendEmail" as const,
        to: "recipient@example.com",
        locale: "en" as const,
        fromUsername: "John Doe",
        replyTo: "sender@example.com",
      };

      const emailPromise = result.current.shareInvoiceCallback(testInvoiceId, emailAction);

      await waitFor(() => {
        expect(result.current.isSharing).toBe(true);
      });

      const emailActionResult = await emailPromise;

      await waitFor(() => {
        expect(result.current.isSharing).toBe(false);
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        templateKey: "invoice-shared",
        to: "recipient@example.com",
        props: {
          fromUsername: "John Doe",
          toUsername: "recipient",
          identifier: testInvoiceId,
          locale: "en",
        },
        subjectVars: {fromName: "John Doe"},
        replyTo: "sender@example.com",
      });

      expect(mockUpsertEntity).not.toHaveBeenCalled();
      expect(emailActionResult).toBeNull();
    });

    it("uses default fromUsername when not provided", async () => {
      const emailResult = {success: true as const};
      mockSendEmail.mockResolvedValue(emailResult);

      const {result} = renderHook(() => useInvoiceShare());

      await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "sendEmail",
        to: "recipient@example.com",
        locale: "en",
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            fromUsername: "Someone",
          }),
        }),
      );
    });

    it("handles email send failure", async () => {
      const emailResult = {success: false as const, error: "Email service unavailable"};
      mockSendEmail.mockResolvedValue(emailResult);

      const {result} = renderHook(() => useInvoiceShare());

      await expect(async () => {
        await result.current.shareInvoiceCallback(testInvoiceId, {
          type: "sendEmail",
          to: "recipient@example.com",
          locale: "en",
        });
      }).rejects.toThrow();
    });

    it("omits replyTo when not provided", async () => {
      const emailResult = {success: true as const};
      mockSendEmail.mockResolvedValue(emailResult);

      const {result} = renderHook(() => useInvoiceShare());

      await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "sendEmail",
        to: "recipient@example.com",
        locale: "en",
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.not.objectContaining({
          replyTo: expect.anything(),
        }),
      );
    });
  });

  describe("bulk operations", () => {
    const invoiceIds = [testInvoiceId, "22222222-2222-4222-8222-222222222222"];

    it("successfully processes bulk toggle operations", async () => {
      const invoice1 = buildInvoice({id: invoiceIds[0], sharedWith: []});
      const invoice2 = buildInvoice({id: invoiceIds[1], sharedWith: []});

      mockGetEntityById.mockReturnValueOnce(invoice1).mockReturnValueOnce(invoice2);

      const updated1 = {...invoice1, sharedWith: [LAST_GUID]};
      const updated2 = {...invoice2, sharedWith: [LAST_GUID]};

      mockPatchInvoice
        .mockResolvedValueOnce({success: true, data: updated1})
        .mockResolvedValueOnce({success: true, data: updated2});

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      const bulkResult = await result.current.shareInvoiceCallback(invoiceIds, {
        type: "togglePublic",
      });

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 0,
        failedIds: [],
        updatedInvoices: [updated1, updated2],
      });

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it("handles partial bulk failure", async () => {
      const invoice1 = buildInvoice({id: invoiceIds[0], sharedWith: []});
      const invoice2 = buildInvoice({id: invoiceIds[1], sharedWith: []});

      mockGetEntityById.mockReturnValueOnce(invoice1).mockReturnValueOnce(invoice2);

      const updated1 = {...invoice1, sharedWith: [LAST_GUID]};

      mockPatchInvoice
        .mockResolvedValueOnce({success: true, data: updated1})
        .mockRejectedValueOnce(new Error("Network error"));

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      const bulkResult = await result.current.shareInvoiceCallback(invoiceIds, {
        type: "togglePublic",
      });

      expect(bulkResult).toEqual({
        successCount: 1,
        failureCount: 1,
        failedIds: [invoiceIds[1]],
        updatedInvoices: [updated1],
      });

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it("handles bulk email send (no invoice updates)", async () => {
      mockGetEntityById.mockReturnValue(testInvoice);
      mockSendEmail.mockResolvedValue({success: true});

      const {result} = renderHook(() => useInvoiceShare());

      const bulkResult = await result.current.shareInvoiceCallback(invoiceIds, {
        type: "sendEmail",
        to: "recipient@example.com",
        locale: "en",
      });

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 0,
        failedIds: [],
        updatedInvoices: [],
      });

      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockUpsertEntity).not.toHaveBeenCalled();
    });

    it("handles empty invoice array", async () => {
      const {result} = renderHook(() => useInvoiceShare());

      const bulkResult = await result.current.shareInvoiceCallback([], {type: "togglePublic"});

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 0,
        failedIds: [],
        updatedInvoices: [],
      });
    });
  });

  describe("error handling", () => {
    it("throws error when invoice not found in store", async () => {
      mockGetEntityById.mockReturnValue(null);

      const {result} = renderHook(() => useInvoiceShare());

      await expect(async () => {
        await result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});
      }).rejects.toThrow("Invoice not found in store");

      expect(mockToast.error).toHaveBeenCalled();
    });

    it("resets isSharing flag even on error", async () => {
      mockGetEntityById.mockImplementation(() => {
        throw new Error("Store error");
      });

      const {result} = renderHook(() => useInvoiceShare());

      await expect(async () => {
        await result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});
      }).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isSharing).toBe(false);
      });
    });

    it("returns error result for bulk operation on exception", async () => {
      mockGetEntityById.mockImplementation(() => {
        throw new Error("Store error");
      });

      const {result} = renderHook(() => useInvoiceShare());

      const bulkResult = await result.current.shareInvoiceCallback([testInvoiceId], {
        type: "togglePublic",
      });

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 1,
        failedIds: [testInvoiceId],
        updatedInvoices: [],
      });
    });
  });

  describe("loading state management", () => {
    it("sets isSharing true during operation", async () => {
      let resolvePatch: ((value: ServerActionResult<Invoice>) => void) | undefined;
      const patchPromise = new Promise<ServerActionResult<Invoice>>((resolve) => {
        resolvePatch = resolve;
      });

      mockPatchInvoice.mockReturnValue(patchPromise);

      const {result} = renderHook(() => useInvoiceShare());

      const promise = result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});

      await waitFor(() => {
        expect(result.current.isSharing).toBe(true);
      });

      resolvePatch!({success: true, data: {...testInvoice, sharedWith: [LAST_GUID]}});
      await promise;

      await waitFor(() => {
        expect(result.current.isSharing).toBe(false);
      });
    });
  });

  describe("onComplete callback", () => {
    it("calls onComplete after successful single mutation", async () => {
      const updatedInvoice = {...testInvoice, sharedWith: [LAST_GUID]};
      mockPatchInvoice.mockResolvedValue({success: true, data: updatedInvoice});

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      await result.current.shareInvoiceCallback(testInvoiceId, {type: "togglePublic"});

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it("does not call onComplete after email send", async () => {
      mockSendEmail.mockResolvedValue({success: true});

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      await result.current.shareInvoiceCallback(testInvoiceId, {
        type: "sendEmail",
        to: "test@example.com",
        locale: "en",
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it("calls onComplete after bulk operations", async () => {
      mockGetEntityById.mockReturnValue(testInvoice);
      mockPatchInvoice.mockResolvedValue({
        success: true,
        data: {...testInvoice, sharedWith: [LAST_GUID]},
      });

      const {result} = renderHook(() => useInvoiceShare(mockOnComplete));

      await result.current.shareInvoiceCallback([testInvoiceId], {type: "togglePublic"});

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});
