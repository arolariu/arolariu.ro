import type {Mock} from "vitest";

import type {ContainerClient} from "@azure/storage-blob";
import type {ServerActionResult} from "../../../src/lib/utils.server";
import type {BaseEntity, EntityStore} from "../../../src/stores/createEntityStore";
import type {UserInformation} from "../../../src/types";
import type {
  CreateInvoiceDtoPayload,
  CreateInvoiceScanDtoPayload,
  Invoice,
  InvoiceScan,
  Merchant,
  Product,
  RecipeSuggestion,
} from "../../../src/types/invoices";
import type {Scan} from "../../../src/types/scans";
import {
  buildAnonymousUserInformation,
  buildAuthenticatedUserInformation,
  buildUserInformation,
  type UserInformationOverrides,
} from "./auth";
import {buildBlobServiceClientMock, buildBlockBlobClientMock, buildContainerClientMock, type AzureBlobMockOptions} from "./azure";
import {
  buildCreateInvoicePayload,
  buildCreateInvoiceScanPayload,
  buildInvoice,
  buildInvoiceScan,
  buildMerchant,
  buildProduct,
  buildRecipeSuggestion,
  buildScan,
} from "./domain";
import {jsonResponse, noContentResponse, textResponse} from "./http";
import {
  actionFailure,
  actionSuccess,
  mockRejectedServerAction,
  mockResolvedActionFailure,
  mockResolvedActionSuccess,
  type TestServerActionError,
} from "./serverActions";
import {buildEntityStoreState, mockEntityStoreSelector} from "./stores";

export type TestDataKind =
  | "invoice"
  | "product"
  | "merchant"
  | "recipeSuggestion"
  | "invoiceScan"
  | "createInvoicePayload"
  | "createInvoiceScanPayload"
  | "scan"
  | "userInformation"
  | "authenticatedUserInformation"
  | "anonymousUserInformation";

export class TestDataBuilder {
  public static build(kind: "invoice", overrides?: Partial<Invoice>): Invoice;
  public static build(kind: "product", overrides?: Partial<Product>): Product;
  public static build(kind: "merchant", overrides?: Partial<Merchant>): Merchant;
  public static build(kind: "recipeSuggestion", overrides?: Partial<RecipeSuggestion>): RecipeSuggestion;
  public static build(kind: "invoiceScan", overrides?: Partial<InvoiceScan>): InvoiceScan;
  public static build(kind: "createInvoicePayload", overrides?: Partial<CreateInvoiceDtoPayload>): CreateInvoiceDtoPayload;
  public static build(kind: "createInvoiceScanPayload", overrides?: Partial<CreateInvoiceScanDtoPayload>): CreateInvoiceScanDtoPayload;
  public static build(kind: "scan", overrides?: Partial<Scan>): Scan;
  public static build(kind: "userInformation", overrides?: UserInformationOverrides): UserInformation;
  public static build(kind: "authenticatedUserInformation", overrides?: UserInformationOverrides): UserInformation;
  public static build(kind: "anonymousUserInformation"): UserInformation;
  public static build(kind: TestDataKind, overrides?: unknown): unknown {
    switch (kind) {
      case "invoice":
        return buildInvoice(overrides as Partial<Invoice> | undefined);
      case "product":
        return buildProduct(overrides as Partial<Product> | undefined);
      case "merchant":
        return buildMerchant(overrides as Partial<Merchant> | undefined);
      case "recipeSuggestion":
        return buildRecipeSuggestion(overrides as Partial<RecipeSuggestion> | undefined);
      case "invoiceScan":
        return buildInvoiceScan(overrides as Partial<InvoiceScan> | undefined);
      case "createInvoicePayload":
        return buildCreateInvoicePayload(overrides as Partial<CreateInvoiceDtoPayload> | undefined);
      case "createInvoiceScanPayload":
        return buildCreateInvoiceScanPayload(overrides as Partial<CreateInvoiceScanDtoPayload> | undefined);
      case "scan":
        return buildScan(overrides as Partial<Scan> | undefined);
      case "userInformation":
        return buildUserInformation(overrides as UserInformationOverrides | undefined);
      case "authenticatedUserInformation":
        return buildAuthenticatedUserInformation(overrides as UserInformationOverrides | undefined);
      case "anonymousUserInformation":
        return buildAnonymousUserInformation();
      default:
        throw new Error(`Unsupported test data builder kind: ${kind}`);
    }
  }

  public static actionSuccess<TData>(data: TData): ServerActionResult<TData> {
    return actionSuccess(data);
  }

  public static actionFailure<TData = never>(error: TestServerActionError): ServerActionResult<TData> {
    return actionFailure<TData>(error);
  }

  public static mockResolvedActionSuccess<TData>(mock: Mock, data: TData): Mock {
    return mockResolvedActionSuccess(mock, data);
  }

  public static mockResolvedActionFailure(mock: Mock, error: TestServerActionError): Mock {
    return mockResolvedActionFailure(mock, error);
  }

  public static mockRejectedServerAction(mock: Mock, error: unknown): Mock {
    return mockRejectedServerAction(mock, error);
  }

  public static entityStore<TEntity extends BaseEntity>(overrides: Partial<EntityStore<TEntity>> = {}): EntityStore<TEntity> {
    return buildEntityStoreState<TEntity>(overrides);
  }

  public static mockEntityStoreSelector<TEntity extends BaseEntity>(storeHook: Mock, state: EntityStore<TEntity>): Mock {
    return mockEntityStoreSelector(storeHook, state);
  }

  public static jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return jsonResponse(body, init);
  }

  public static textResponse(body: string, init: ResponseInit = {}): Response {
    return textResponse(body, init);
  }

  public static noContentResponse(init: ResponseInit = {}): Response {
    return noContentResponse(init);
  }

  public static blobServiceClient(optionsOrContainer: AzureBlobMockOptions | ContainerClient = {}) {
    if ("getBlockBlobClient" in optionsOrContainer) {
      return buildBlobServiceClientMock(optionsOrContainer);
    }

    return buildBlobServiceClientMock(buildContainerClientMock(optionsOrContainer));
  }

  public static containerClient(options: AzureBlobMockOptions = {}) {
    return buildContainerClientMock(options);
  }

  public static blockBlobClient(options: AzureBlobMockOptions = {}) {
    return buildBlockBlobClientMock(options);
  }
}
