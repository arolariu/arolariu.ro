/* eslint-disable no-unused-vars */
import NamedEntity from "../DDD/NamedEntity";

export default interface Merchant extends NamedEntity<string>{
    category: MerchantCategory;
    address: string;
    phoneNumber: string;
    parentCompanyId: string;
}

export enum MerchantCategory {
	NOT_DEFINED = 0,
	LOCAL_SHOP,
	SUPERMARKET,
	HYPERMARKET,
	ONLINE_SHOP,
	OTHER,
}
