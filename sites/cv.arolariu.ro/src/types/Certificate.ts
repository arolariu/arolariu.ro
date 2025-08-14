/** @format */

export type Certificate = {
  name: string;
  issuer: string;
  issuerUrl?: string;
  code: string;
  issueDate: string;
  expirationDate?: string;
  description?: string;
  url?: string;
  level?: string;
};
