/**
 * Technical metadata for the Help dialog and Footer.
 *
 * Distinct from {@link JsonResumeTechnical} (the JSON Resume `technical`
 * block — flat skills inventory). These types describe UI chrome data.
 */
export type Dependency = Readonly<{
  name: string;
  version: string;
}>;

export type TechInfo = Readonly<{
  version: string;
  deployDate: string;
  commitSha: string;
  sourceCodeUrl: string;
  cloudProvider: string;
  region: string;
  framework: string;
  buildTime: string;
  lastUpdated: string;
  dependencies: ReadonlyArray<Dependency>;
}>;

export type FooterLink = Readonly<{
  url: string;
  label: string;
}>;

export type Footer = Readonly<{
  copyright: string;
  links: Readonly<{
    github: FooterLink;
    linkedin: FooterLink;
    website: FooterLink;
  }>;
}>;
