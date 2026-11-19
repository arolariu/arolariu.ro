// @vitest-environment node
import {it} from "vitest";
import {runCompilerCheck} from "../scripts/run-compiler-check.ts";

it("satisfies the public API JSDoc contracts", async () => {
  await runCompilerCheck("check-jsdoc-contracts.ts", [], 120_000);
}, 120_000);
