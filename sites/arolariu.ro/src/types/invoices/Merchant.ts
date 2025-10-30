import type {NamedEntity} from "../DDD";

/**
 * Represents the category of a merchant from the invoice domain system.
 */
export enum MerchantCategory {
  NOT_DEFINED = 0,
  LOCAL_SHOP = 100,
  SUPERMARKET = 200,
  HYPERMARKET = 300,
  ONLINE_SHOP = 400,
  OTHER = 9999,
}

/**
 * Represents a merchant from the invoice domain system.
 */
export interface Merchant extends NamedEntity<string> {
  /** The category of the merchant. */
  category: MerchantCategory;

  /** The address of the merchant. */
  address: string;

  /** The phone number of the merchant. */
  phoneNumber: string;

  /** The unique identifier of the parent company. */
  parentCompanyId: string;
}

/** Represents the data transfer object payload for creating a merchant. */
export type CreateMerchantDtoPayload = {
  /** The name of the merchant. */
  name: string;

  /** The description of the merchant. */
  description: string;

  /** The address of the merchant. */
  address: string;

  /** The unique identifier of the parent company. */
  parentCompanyId: string;
};

export type UpdateMerchantDtoPayload<T = string> = {
  /** The unique identifier of the merchant. */
  id: T;
} & Partial<Omit<Merchant, "id">>;

export type DeleteMerchantDtoPayload<T = string> = {
  /** The unique identifier of the merchant. */
  id: T;

  /** The unique identifier of the parent company. */
  parentCompanyId: string;
};
