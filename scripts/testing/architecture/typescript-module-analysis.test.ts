// @vitest-environment node

import {describe, expect, it} from "vitest";

import {analyzeCommandEntrypointSource, collectTypeScriptModuleReferences} from "./typescript-module-analysis.ts";

describe("TypeScript module analysis", () => {
  it("collects imports, re-exports, literal dynamic imports, and type-only state", () => {
    const result = collectTypeScriptModuleReferences(
      [
        'import type {Alpha} from "./alpha.ts";',
        'import {Beta as Renamed} from "./beta.ts";',
        'import {default as DefaultValue} from "./default.ts";',
        'import MixedDefault, {type Zeta} from "./mixed.ts";',
        'export {Gamma} from "./gamma.ts";',
        'export {default as Other} from "./other.ts";',
        'export {type Epsilon} from "./epsilon.ts";',
        'await import("./delta.ts");',
        "await import(dynamicPath);",
      ].join("\n"),
      "scripts/example.ts",
    );

    expect(result.references).toEqual([
      {specifier: "./alpha.ts", importedNames: ["Alpha"], referenceKind: "import", typeOnly: true},
      {specifier: "./beta.ts", importedNames: ["Beta"], referenceKind: "import", typeOnly: false},
      {specifier: "./default.ts", importedNames: ["*"], referenceKind: "import", typeOnly: false},
      {specifier: "./mixed.ts", importedNames: ["*", "Zeta"], referenceKind: "import", typeOnly: false},
      {specifier: "./gamma.ts", importedNames: ["Gamma"], referenceKind: "re-export", typeOnly: false},
      {specifier: "./other.ts", importedNames: ["*"], referenceKind: "re-export", typeOnly: false},
      {specifier: "./epsilon.ts", importedNames: ["Epsilon"], referenceKind: "re-export", typeOnly: true},
      {specifier: "./delta.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
    ]);
    expect(result.nonLiteralDynamicImportLines).toEqual([9]);
  });

  it("recognizes the exported command singleton and shared direct-entry call", () => {
    const result = analyzeCommandEntrypointSource(
      [
        "export const doctorCommand: LazyMonorepoCommand<Input, Output, never> = createDoctorCommand();",
        "await doctorCommand.runIfMain(import.meta.url);",
      ].join("\n"),
      "scripts/doctor.ts",
    );

    expect(result).toEqual({exportsCommandSingleton: true, usesSharedRunIfMain: true});
  });
});
