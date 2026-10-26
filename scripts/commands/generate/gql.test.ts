// @vitest-environment node
/**
 * @fileoverview GraphQL placeholder generator tests.
 * @module scripts/commands/generate/gql.test
 */

import {join} from "node:path";

import {Effect, FileSystem} from "effect";
import {TestClock} from "effect/testing";
import {expect, vi} from "vitest";

import {effectTest, makeTestLayer, repositoryFixtureRoot} from "../../platform/testing.ts";
import {generateGraphql} from "./gql.ts";

const outputFile = join(repositoryFixtureRoot, "scripts", "__generated__", "gql", "README.placeholder.txt");

{
  const harness = makeTestLayer({context: "generate::gql"});
  effectTest(
    "characterizes the GraphQL summary line and the placeholder artifact",
    () =>
      Effect.gen(function* () {
        // Arrange
        yield* TestClock.setTime(Date.parse("2025-01-01T00:00:00.000Z"));
        const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
          vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
        );

        // Act
        const result = yield* generateGraphql;

        // Assert
        expect(result).toEqual({summary: "GraphQL generation completed (placeholder).", changedFiles: [outputFile]});
        expect(harness.output().filter((record) => record.text.startsWith("[arolariu::"))).toEqual([
          {stream: "stdout", text: "[arolariu::generate::gql] ✅ GraphQL generation completed (placeholder).\n"},
        ]);
        expect(yield* Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString(outputFile))).toBe(
          "// Generated at 2025-01-01T00:00:00.000Z\n// TODO: Integrate GraphQL Codegen here.\n",
        );
        expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
        vi.restoreAllMocks();
      }),
    harness.layer,
  );
}

{
  const harness = makeTestLayer({context: "generate::gql", verbose: true});
  effectTest(
    "reports verbose mode and logs its diagnostics",
    () =>
      Effect.gen(function* () {
        // Act
        yield* generateGraphql;

        // Assert
        const texts = harness.output().map((record) => record.text);
        expect(texts).toContain("   Verbose: ✅ Enabled\n");
        expect(texts).toContain("[arolariu::generate::gql] 🐛 Wrote placeholder artifact.\n");
      }),
    harness.layer,
  );
}
