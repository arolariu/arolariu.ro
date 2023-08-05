/*
Invoice object type:
{
    "invoiceId": "",
    "invoiceImageURI": "",
    "invoiceMetadata": {
        "metadataBag": {
            "Key": "Value",
            "Key": "Value",
        }
    },
    "merchantInformation": {
        "merchantName": "",
        "merchantAddress": "",
        "merchantPhoneNumber": ""
    },
    "invoiceTime": {
        "invoiceSubmittedDate": "",
        "invoiceIdentifiedDate": ""
    },
    "transactionInformation": {
        "transactionDescription": "Simple invoice made by a cool user.",
        "transactionTotal": 100.12,
        "transactionCalories": 340.2
    },
    "items": {
        "boughtItems": [
            {
                "itemName": "Coca-Cola",
                "itemPrice": 10.12,
                "itemCalories": 100.2,
                "itemQuantity": 100,
                "itemTotal": 1012
                "itemQuantityUnits": "ml",
                "itemCaloriesUnits": "kcal",
                "itemPriceUnits": "RON"
            },
        ],
        "discountedItems": [
            {
                "itemName": "Coca-Cola",
                "itemPrice": 10.12,
                "itemCalories": 100.2,
                "itemQuantity": 100,
                "itemTotal": 1012
                "itemQuantityUnits": "ml",
                "itemCaloriesUnits": "kcal",
                "itemPriceUnits": "RON"
            },
        ]
    }
}
 */

export default interface Invoice {
  invoiceId: string;
  invoiceImageURI: string;
  invoiceMetadata: InvoiceMetadata;
  merchantInformation: MerchantInformation;
  invoiceTime: InvoiceTime;
  transactionInformation: TransactionInformation;
  items: Items;
}

export interface InvoiceMetadata {
  metadataBag: MetadataBag;
}

export interface MetadataBag {
  [key: string]: string;
}

export interface MerchantInformation {
  merchantName: string;
  merchantAddress: string;
  merchantPhoneNumber: string;
}

export interface InvoiceTime {
  invoiceSubmittedDate: string;
  invoiceIdentifiedDate: string;
}

export interface TransactionInformation {
  transactionDescription: string;
  transactionTotal: number;
  transactionCalories: number;
}

export interface Items {
  boughtItems: Item[];
  discountedItems: Item[];
}

export interface Item {
  itemName: string;
  itemPrice: number;
  itemCalories: number;
  itemQuantity: number;
  itemTotal: number;
  itemQuantityUnits: string;
  itemCaloriesUnits: string;
  itemPriceUnits: string;
}
