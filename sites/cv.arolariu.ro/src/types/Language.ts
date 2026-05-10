/**
 * JSON Resume `languages[]` entry — spoken language with fluency note.
 */
export type Language = Readonly<{
  language: string;
  fluency: string;
  certifications?: ReadonlyArray<string>;
}>;
