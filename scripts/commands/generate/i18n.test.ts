// @vitest-environment node
/**
 * @fileoverview i18n generator tests: locale synchronization, exit contract, and failures.
 * @module scripts/commands/generate/i18n.test
 *
 * @remarks
 * The pre-migration leaf returned `totalMissingKeys` and the legacy aggregate stopped generation
 * whenever that count was nonzero. The Effect generator keeps that meaning through
 * `changedFiles`: empty when every locale already matched English, nonempty when missing keys
 * changed one or more locale files (the orchestrator stops generation on it, exit `1`).
 */

import {join} from "node:path";

import {Effect, FileSystem} from "effect";
import {describe, expect, it, vi} from "vitest";

import {effectTest, makeTestLayer, repositoryFixtureRoot, runScoped, type TestHarness} from "../../platform/testing.ts";
import {TranslationSyncFailed} from "./errors.ts";
import {generateI18n} from "./i18n.ts";

const messages = join(repositoryFixtureRoot, "sites", "arolariu.ro", "messages");

/**
 * Builds a harness seeded with the three locale files.
 *
 * @param locales - The `en`, `ro`, and `fr` file texts.
 * @param verbose - Whether debug logs are emitted.
 * @returns The harness.
 */
function localeHarness(locales: Readonly<{en: string; ro: string; fr: string}>, verbose = false): TestHarness {
  return makeTestLayer({
    files: {[join(messages, "en.json")]: locales.en, [join(messages, "ro.json")]: locales.ro, [join(messages, "fr.json")]: locales.fr},
    context: "generate::i18n",
    verbose,
  });
}

/**
 * Reads one locale file from the harness.
 *
 * @param locale - The locale code.
 * @returns The file text.
 */
function readLocale(locale: string): Effect.Effect<string, unknown, FileSystem.FileSystem> {
  return Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString(join(messages, `${locale}.json`)));
}

describe("generateI18n", () => {
  {
    const harness = localeHarness({
      en: JSON.stringify({greeting: "Hello", farewell: "Goodbye"}),
      ro: JSON.stringify({greeting: "Salut"}),
      fr: JSON.stringify({greeting: "Bonjour"}),
    });
    effectTest(
      "reports the changed locale files when missing keys were added",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* generateI18n;

          // Assert
          expect(result.changedFiles).toEqual([join(messages, "ro.json"), join(messages, "fr.json")]);
          expect(JSON.parse(yield* readLocale("ro"))).toHaveProperty("farewell");
        }),
      harness.layer,
    );
  }

  {
    const enText = JSON.stringify({greeting: "Hello", farewell: "Goodbye"});
    const harness = localeHarness({en: enText, ro: JSON.stringify({greeting: "Salut"}), fr: JSON.stringify({greeting: "Bonjour"})});
    effectTest(
      "characterizes the exact locale file diffs for one missing key",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* generateI18n;

          // Assert
          expect(result.summary).toBe("i18n synchronization completed with 2 missing key(s) added.");
          expect(yield* readLocale("en")).toBe(enText);
          expect(yield* readLocale("ro")).toBe('{\n  "greeting": "Salut",\n  "farewell": ""\n}');
          expect(yield* readLocale("fr")).toBe('{\n  "greeting": "Bonjour",\n  "farewell": ""\n}');
          expect(harness.output()).toContainEqual({stream: "stdout", text: "   RO: 1 keys added\n"});
          expect(harness.output()).toContainEqual({stream: "stdout", text: "   Total missing keys added: 2\n"});
        }),
      harness.layer,
    );
  }

  {
    const harness = localeHarness(
      {
        en: JSON.stringify({nav: {home: "Home", about: "About"}}),
        ro: JSON.stringify({nav: {home: "Acasă"}}),
        fr: JSON.stringify({nav: {home: "Accueil", about: "À propos"}}),
      },
      true,
    );
    effectTest(
      "adds a missing nested key and logs its segments when verbose",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* generateI18n;

          // Assert
          expect(result.summary).toBe("i18n synchronization completed with 1 missing key(s) added.");
          expect(yield* readLocale("ro")).toBe('{\n  "nav": {\n    "home": "Acasă",\n    "about": ""\n  }\n}');
          expect(harness.output()).toContainEqual({
            stream: "stdout",
            text: "[arolariu::generate::i18n] 🐛 [writeTranslationKeysFile] Adding key segment: nav\n",
          });
        }),
      harness.layer,
    );
  }

  {
    const harness = localeHarness({
      en: JSON.stringify({greeting: "Hello"}),
      ro: JSON.stringify({greeting: "Salut"}),
      fr: JSON.stringify({greeting: "Bonjour"}),
    });
    effectTest(
      "changes no file when every locale already matches English",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* generateI18n;

          // Assert
          expect(result).toEqual({summary: "i18n synchronization completed with 0 missing key(s) added.", changedFiles: []});
        }),
      harness.layer,
    );
  }

  {
    const harness = localeHarness({
      en: JSON.stringify({greeting: "Hello"}),
      ro: JSON.stringify({greeting: "Salut", extra: "Extra"}),
      fr: JSON.stringify({greeting: "Bonjour"}),
    });
    effectTest(
      "fails with TranslationSyncFailed when a locale has keys English lacks",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateI18n);

          // Assert
          expect(error).toEqual(
            new TranslationSyncFailed({
              message:
                "[arolariu.ro::compareMessageKeysNaive] Current translation file has extra keys that are not present in the base translation file!",
              locale: "ro",
            }),
          );
        }),
      harness.layer,
    );
  }

  {
    const harness = localeHarness({en: JSON.stringify({greeting: "Hello"}), ro: "{not json", fr: JSON.stringify({greeting: "Bonjour"})});
    effectTest(
      "fails with TranslationSyncFailed and logs the path when a locale file is not JSON",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateI18n);

          // Assert
          expect(error).toMatchObject({_tag: "TranslationSyncFailed", locale: "ro"});
          expect(harness.output()).toContainEqual({
            stream: "stderr",
            text: `[arolariu::generate::i18n] ⛔ [loadTranslationFile] Error encountered when loading translation file with path: ${join(messages, "ro.json")}\n`,
          });
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {}});
    effectTest(
      "fails with the filesystem error when the English source is missing",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateI18n);

          // Assert
          expect(error).toMatchObject({_tag: "PlatformError"});
        }),
      harness.layer,
    );
  }

  it("routes generator output through the platform sink, never the console", async () => {
    // Arrange
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );
    const harness = localeHarness({en: '{"greeting":"Hello"}', ro: '{"greeting":"Hello"}', fr: '{"greeting":"Hello"}'});

    // Act
    await runScoped(generateI18n, harness.layer);

    // Assert
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(harness.output().some((record) => record.text.includes("i18n synchronization completed"))).toBe(true);
    vi.restoreAllMocks();
  });
});
