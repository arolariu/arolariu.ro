/**
 * @fileoverview Unit tests for the merchant classification update server action.
 * @module app/domains/invoices/_actions/merchants/updateMerchant.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {ClassificationOrigin, ClassificationSystem} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
vi.mock("@/lib/utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils.server")>();
  return {...actual, fetchWithTimeout: vi.fn()};
});

const {updateMerchant} = await import("./updateMerchant");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

const merchantId = "11111111-1111-4111-8111-111111111111";
const classification = {
  system: ClassificationSystem.Nace21,
  code: "47.11",
  version: "2.1",
  officialLabel: "Retail sale in non-specialised stores",
  hierarchy: [{level: "class", code: "47.11", officialLabel: "Retail sale in non-specialised stores"}],
  origin: ClassificationOrigin.Manual,
  confidence: null,
  evidence: [],
} as const;

const payload = {
  name: "Test Merchant",
  description: "Test merchant description",
  classification: {system: ClassificationSystem.Nace21, code: "47.11"},
  address: {
    fullName: "Test Merchant",
    address: "1 Market Street",
    phoneNumber: "+40 21 123 4567",
    emailAddress: "merchant@example.test",
    website: "https://merchant.example.test",
  },
  parentCompanyId: null,
  additionalMetadata: {storeCode: "MKT-1"},
} as const;

describe("updateMerchant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse({
        id: merchantId,
        ...payload,
        parentCompanyId: "00000000-0000-0000-0000-000000000000",
        classification,
      }) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("sends the exact camel-case NACE selection and revalidates affected pages", async () => {
    // Act
    const result = await updateMerchant({merchantId, payload});

    // Assert
    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/merchants/${merchantId}`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/domains/invoices", "layout");
  });

  it("rejects malformed outer input and malformed JSON responses", async () => {
    // Act
    const invalidInput = await updateMerchant(null);
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse({invalid: true}) as Awaited<ReturnType<typeof fetchWithTimeout>>);
    const invalidResponse = await updateMerchant({merchantId, payload});

    // Assert
    expect(invalidInput).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(invalidResponse).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });
});
