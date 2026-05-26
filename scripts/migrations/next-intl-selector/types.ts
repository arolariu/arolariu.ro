export const translatorMethods = new Set(["", "rich", "markup", "raw", "has"]);

export const skippedPathSegments = [
  "\\node_modules\\",
  "\\.next\\",
  "\\coverage\\",
  "\\storybook-static\\",
  "\\messages\\en.d.json.ts",
  "\\messages\\en.json.bak",
  "\\messages\\ro.json.bak",
  "\\messages\\fr.json.bak",
] as const;

export const selectorClientModule = "next-intl-selector";
export const selectorServerModule = "next-intl-selector/server";
export const legacyClientModule = "next-intl";
export const legacyServerModule = "next-intl/server";

export type TranslatorFactoryName = "useTranslations" | "getTranslations" | "createTranslator";

export type MigrationReport = {
  readonly filesVisited: number;
  readonly filesChanged: number;
  readonly literalCallsChanged: number;
  readonly namespaceFactoriesChanged: number;
  readonly dynamicCallsSkipped: readonly string[];
};

export type TextEdit = {
  readonly start: number;
  readonly end: number;
  readonly replacement: string;
};

export type FileMigrationState = {
  readonly fileName: string;
  readonly namespacesByTranslator: Map<string, string | undefined>;
  readonly edits: TextEdit[];
  literalCallsChanged: number;
  namespaceFactoriesChanged: number;
  readonly dynamicCallsSkipped: string[];
};
