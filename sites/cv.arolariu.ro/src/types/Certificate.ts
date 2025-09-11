export type Certificate = Readonly<{
  name: string;
  issuer: string;
  issuerUrl?: string;
  code: string;
  issueDate: string;
  expirationDate?: string;
  description?: string;
  url?: string;
  level?: string;
}>;
