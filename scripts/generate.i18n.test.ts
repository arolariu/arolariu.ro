// @vitest-environment node
/**
 * @fileoverview i18n leaf command exit-code contract tests.
 * @module scripts.generate.i18n.test
 *
 * @remarks
 * The pre-migration `main()` leaf returned `totalMissingKeys` and the legacy aggregate stopped
 * generation whenever that count was nonzero. The migrated `generate:i18n` command must preserve
 * that success/failure meaning under the normative `CommandExitCode` contract: `0` when every
 * locale already matched English, `1` when missing keys caused this invocation to change one or
 * more locale files.
 */

import {describe, expect, it} from "vitest";

import {createMemoryFileSystem, repositoryFixtureRoot} from "./common/runtime.testing.ts";
import {buildCommandHost} from "./testing/builders/command-host.builder.ts";

describe("generateI18nCommand", () => {
  it("resolves as completed with exitCode: 1 when missing keys change one or more locale files", async () => {
    const files = createMemoryFileSystem({
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/en.json`]: JSON.stringify({greeting: "Hello", farewell: "Goodbye"}),
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/ro.json`]: JSON.stringify({greeting: "Salut"}),
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/fr.json`]: JSON.stringify({greeting: "Bonjour"}),
    });

    const {createGenerateI18nCommand} = await import("./generate.i18n.ts");
    const command = createGenerateI18nCommand({host: buildCommandHost({runtime: {files}})});

    const execution = await command.invoke({verbose: false}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "completed", exitCode: 1});
    if (execution.status === "completed") {
      expect(execution.value.changedFiles).toHaveLength(2);
      expect(execution.value.changedFiles).toEqual(
        expect.arrayContaining([
          expect.stringContaining("ro.json"),
          expect.stringContaining("fr.json"),
        ]),
      );
    }

    const roContent = JSON.parse(await files.readText(`${repositoryFixtureRoot}/sites/arolariu.ro/messages/ro.json`)) as Record<
      string,
      unknown
    >;
    expect(roContent).toHaveProperty("farewell");
  });

  it("resolves as completed with exitCode: 0 when every locale already matches English", async () => {
    const files = createMemoryFileSystem({
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/en.json`]: JSON.stringify({greeting: "Hello"}),
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/ro.json`]: JSON.stringify({greeting: "Salut"}),
      [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/fr.json`]: JSON.stringify({greeting: "Bonjour"}),
    });

    const {createGenerateI18nCommand} = await import("./generate.i18n.ts");
    const command = createGenerateI18nCommand({host: buildCommandHost({runtime: {files}})});

    const execution = await command.invoke({verbose: false}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    if (execution.status === "completed") {
      expect(execution.value.changedFiles).toHaveLength(0);
    }
  });
});
