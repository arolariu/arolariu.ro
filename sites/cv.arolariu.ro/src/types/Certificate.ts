export type CertificateCategory = "Microsoft" | "GitHub";

export type Certificate = Readonly<{
  name: string;
  issuer: string;
  issuerUrl?: string;
  code: string;
  issueDate: string;
  category: CertificateCategory;
  expirationDate?: string;
  description?: string;
  url?: string;
  level?: string;
}>;
