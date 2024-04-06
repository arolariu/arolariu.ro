import {KeyValuePair} from "../KvPair";

export default interface CreateInvoiceDto {
  photoLocation: string;
  photoMetadata: KeyValuePair<string, object>[];
}
