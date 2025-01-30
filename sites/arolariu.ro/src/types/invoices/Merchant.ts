/** @format */

import {NamedEntity} from "../DDD";

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
  category: MerchantCategory;
  address: string;
  phoneNumber: string;
  parentCompanyId: string;
}
