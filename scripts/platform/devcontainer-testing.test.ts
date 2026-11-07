import {join} from "node:path";
import {writeFileSync} from "node:fs";

import {afterEach, describe, expect, it} from "vitest";

import * as preparation from "./devcontainer-testing.ts";

const fixtures: preparation.PreparationFixture[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.dispose();
});

describe("CLI runtime dependency discovery", () => {
  it("follows local value imports and re-exports without counting erased types or Node built-ins", () => {
    const fixture = preparation.createPreparationFixture("website");
    fixtures.push(fixture);
    writeFileSync(
      join(fixture.root, "entry.ts"),
      'import type {A} from "unused-types"; import {type B} from "other-types"; import "effect"; import {readFile} from "node:fs"; import "./child.ts"; export * from "./barrel.ts";',
    );
    writeFileSync(join(fixture.root, "child.ts"), 'import "@azure/storage-blob"; import "./entry.ts";');
    writeFileSync(join(fixture.root, "barrel.ts"), 'export type {C} from "exported-types"; export {value} from "@effect/platform-node";');

    expect(preparation).toHaveProperty("runtimePackageNames");
    expect([...preparation.runtimePackageNames(join(fixture.root, "entry.ts"))].sort()).toEqual([
      "@azure/storage-blob",
      "@effect/platform-node",
      "effect",
    ]);
  });
});
