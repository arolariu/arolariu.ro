/**
 * @fileoverview Type for an `awards[]` entry in the JSON Resume export.
 */

/**
 * JSON Resume `awards[]` entry — competition placement, recognition, etc.
 */
export type Award = Readonly<{
  title: string;
  date: string;
  awarder: string;
  summary: string;
  url?: string;
  highlights?: ReadonlyArray<string>;
}>;
