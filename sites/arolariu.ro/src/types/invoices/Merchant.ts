/** @format */

import NamedEntity from "../DDD/Entities/NamedEntity";

/**
 * Represents the category of a merchant from the invoice domain system.
 */
export enum MerchantCategory {
  NOT_DEFINED,
  LOCAL_SHOP,
  SUPERMARKET,
  HYPERMARKET,
  ONLINE_SHOP,
  OTHER,
}

/**
 * Represents a merchant from the invoice domain system.
 */
export default interface Merchant extends NamedEntity<string> {
  category: MerchantCategory;
  address: string;
  phoneNumber: string;
  parentCompanyId: string;
}
