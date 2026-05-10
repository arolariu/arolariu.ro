/**
 * @fileoverview Type for an `interests[]` entry in the JSON Resume export.
 */

/**
 * JSON Resume `interests[]` entry — personal interest area + tag keywords.
 */
export type Interest = Readonly<{
  name: string;
  keywords: ReadonlyArray<string>;
}>;
