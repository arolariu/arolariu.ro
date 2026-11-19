// @vitest-environment node
import {it} from "vitest";
import {runCompilerCheck} from "../scripts/run-compiler-check.ts";

it("checks production code, negative Vitest assertions, and the complete story graph", async () => {
  await runCompilerCheck("check-type-contracts.ts", [], 120_000);
}, 120_000);
