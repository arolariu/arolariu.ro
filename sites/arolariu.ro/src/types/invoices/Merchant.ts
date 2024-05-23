/** @format */

import NamedEntity from "../DDD/NamedEntity";

/**
 * Represents a merchant from the invoice domain system.
 */
export default interface Merchant extends NamedEntity<string> {
  category: MerchantCategory;
  address: string;
  phoneNumber: string;
  parentCompanyId: string;
}

/**
 * Represents the category of a merchant from the invoice domain system.
 */
export enum MerchantCategory {
  NOT_DEFINED = 0,
  LOCAL_SHOP,
  SUPERMARKET,
  HYPERMARKET,
  ONLINE_SHOP,
  OTHER,
}
