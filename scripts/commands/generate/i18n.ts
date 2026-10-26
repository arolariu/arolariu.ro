/**
 * @fileoverview i18n asset generator: synchronizes locale files with English as an Effect program.
 * @module scripts/commands/generate/i18n
 *
 * @remarks
 * Validates and synchronizes translation files for all supported locales against the English
 * source of truth. The generator ensures all locales (Romanian and French) have complete
 * translation coverage by:
 * 1. Loading the English translations as the source of truth
 * 2. Validating each target locale against English keys
 * 3. Adding missing keys with empty strings for translators to fill
 * 4. Reporting translation coverage statistics
 *
 * Supported locales:
 * - en.json (English - source of truth)
 * - ro.json (Romanian)
 * - fr.json (French)
 *
 * Every ambient effect goes through the `FileSystem`, `Path`, `Environment`, and `Presenter`
 * services and the Effect logger. A locale file that cannot be parsed, or that has keys English
 * lacks, fails with {@link TranslationSyncFailed}.
 */

import {Effect, FileSystem, Path, type PlatformError} from "effect";

import {Environment} from "../../platform/Environment.ts";
import {writeTextAtomic} from "../../platform/Files.ts";
import {debugLogsEnabled, Presenter} from "../../platform/Output.ts";
import type {GenerateLeafResult, GenerateRequirements} from "./env.ts";
import {TranslationSyncFailed} from "./errors.ts";

/**
 * Represents either a plain string message or a message formatted with `MessageFormat`.
 */
type Message = string | MessageFormat;

/**
 * Describes a map of translation keys to their corresponding localized messages.
 * Each key is a string identifier that resolves to either a leaf message string
 * or a nested {@link MessageFormat} object, allowing hierarchical localization trees.
 */
type MessageFormat = {
  [key: string]: Message;
};

/** Every failure {@link generateI18n} may report. */
export type GenerateI18nError = TranslationSyncFailed | PlatformError.PlatformError;

/**
 * Describes an unknown thrown value.
 *
 * @param error - The thrown value.
 * @returns Its message.
 */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Parses a translation file as a {@link MessageFormat}.
 *
 * @param text - The file text.
 * @param locale - The locale the file belongs to.
 * @returns The parsed messages, or {@link TranslationSyncFailed} for invalid JSON.
 */
function parseMessages(text: string, locale: string): Effect.Effect<MessageFormat, TranslationSyncFailed> {
  return Effect.try({
    try: () => JSON.parse(text) as MessageFormat,
    catch: (error) => new TranslationSyncFailed({message: describe(error), locale}),
  });
}

/**
 * Loads a translation file into memory as a {@link MessageFormat}.
 *
 * @param filePath - The path to the translation file.
 * @param locale - The locale the file belongs to.
 * @param verbose - Enables verbose logging.
 * @returns The translation file contents.
 */
function loadTranslationFile(
  filePath: string,
  locale: string,
  verbose: boolean,
): Effect.Effect<MessageFormat, GenerateI18nError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const translationFile = yield* fs.readFileString(filePath);
    if (verbose) {
      yield* Effect.logDebug(`[loadTranslationFile] Loaded translation file: ${filePath}`);
    }
    const messages = yield* parseMessages(translationFile, locale);
    if (verbose) {
      yield* Effect.logDebug("[loadTranslationFile] Converted translation file to MessageFormat object.");
    }
    return messages;
  }).pipe(
    Effect.tapError((error) =>
      Effect.andThen(
        Effect.logError(`[loadTranslationFile] Error encountered when loading translation file with path: ${filePath}`),
        Effect.logError(`[loadTranslationFile] Error details: ${error.message}`),
      ),
    ),
  );
}

/**
 * Looks up a translation key in the given MessageFormat object.
 *
 * The translation key is a string that can contain dots (.) to indicate nested keys.
 *
 * IF the translation key does NOT contain any dots,
 * THEN we have a simple key,
 * AND we can return the value of the key from the messages object.
 *
 * IF the translation key contains dots,
 * THEN we have a nested key,
 * AND we need to recursively lookup the value of the key.
 *
 * @param messages The translation messages object.
 * @param keyNamespace The translation key to lookup.
 * @param verbose Whether to emit lookup diagnostics.
 *
 * @example
 * extractMessageValue(messages, "pages.domains.services.title")
 * // > The above invocation will try to return the value of the key "title" from the "services" object, which is a child of the "Domains" object.
 *
 * @remarks The function will treat non-existent values as an empty string.
 * @returns The value of the translation key.
 */
function extractMessageValue(messages: MessageFormat, keyNamespace: string, verbose: boolean): Effect.Effect<Message> {
  return Effect.gen(function* () {
    if (verbose) {
      yield* Effect.logDebug(`[extractMessageValue] Extracting message value for key: ${keyNamespace}`);
    }
    // We can potentially have nested keys, so we need to split the key by dots (.)
    const keys = keyNamespace.split(".");
    let message: Message = "";
    let messagesPointer: MessageFormat = new Object(messages) as MessageFormat;

    for (const key of keys) {
      if (!messagesPointer) break;

      if (messagesPointer[key] && keys.at(-1) === key) {
        message = messagesPointer[key]; // Set the message to the value of the key.
        break; // Break the loop.
      }

      // Move the pointer to the next level.
      messagesPointer = messagesPointer[key] as MessageFormat;
    }

    return message;
  });
}

/**
 * Compares the keys from two translation files.
 * This is a naive implementation that will only compare the length of the keys.
 *
 * CASE 1:
 * IF the length of the keys are the same
 * THEN the function will return true, meaning that the translation files have equal keys.
 *
 * CASE 2:
 * IF the length of the keys are different,
 * THEN the function will return false, meaning that the translation files have different keys,
 * unless the current file has keys the base file lacks, which fails with {@link TranslationSyncFailed}.
 * @param baseTranslationKeys The base translation file keys.
 * @param currentTranslationsKeys The current translation file keys.
 * @param verbose Whether to emit detailed comparison diagnostics.
 * @param locale The locale being compared, reported by a failure.
 * @returns The comparison result: true if equal, false if different.
 */
function compareMessageKeysNaive(
  baseTranslationKeys: MessageFormat,
  currentTranslationsKeys: MessageFormat,
  verbose: boolean,
  locale: string,
): Effect.Effect<boolean, TranslationSyncFailed, Presenter> {
  return Effect.gen(function* () {
    yield* Effect.logInfo("[compareMessageKeysNaive] Comparing translation keys.");
    const baseKeys = yield* extractMessageKeys(baseTranslationKeys, verbose);
    const currentKeys = yield* extractMessageKeys(currentTranslationsKeys, verbose);

    yield* Effect.logInfo(`[compareMessageKeysNaive] Extracted ${baseKeys.length} keys from the base translation file (en.json).`);
    yield* Effect.logInfo(`[compareMessageKeysNaive] Extracted ${currentKeys.length} keys from the current translation file.`);

    if (baseKeys.length === currentKeys.length) {
      yield* (yield* Presenter).success("[compareMessageKeysNaive] Translation files have equal keys.");
      return true;
    }

    // Safety check.
    const missingKeysFromBase = currentKeys.filter((key) => !baseKeys.includes(key));
    yield* Effect.logInfo(`[compareMessageKeysNaive] Found ${missingKeysFromBase.length} missing keys from the base translation file.`);
    if (missingKeysFromBase.length > 0) {
      if (verbose) {
        yield* Effect.logError(
          "The base translation file should be the source of truth for keys. Found extra keys in the current translation file.",
        );
      }
      return yield* new TranslationSyncFailed({
        message:
          "[arolariu.ro::compareMessageKeysNaive] Current translation file has extra keys that are not present in the base translation file!",
        locale,
      });
    }

    const missingKeys = baseKeys.filter((key) => !currentKeys.includes(key));
    yield* Effect.logInfo("[compareMessageKeysNaive] KEY - BASE VALUE - CURRENT VALUE");

    let duplicateValuesCount = 0;
    for (const key of currentKeys) {
      const baseValue = yield* extractMessageValue(baseTranslationKeys, key, verbose);
      const currentValue = yield* extractMessageValue(currentTranslationsKeys, key, verbose);
      if (yield* areMessageValuesEqual(baseValue, currentValue, verbose, locale)) {
        yield* Effect.logWarning(`[compareMessageKeysNaive] ${key} - ${JSON.stringify(baseValue)} - ${JSON.stringify(currentValue)}`);
        duplicateValuesCount++;
      }
    }

    for (const key of missingKeys) {
      const baseValue = JSON.stringify(yield* extractMessageValue(baseTranslationKeys, key, verbose));
      const currentValue = JSON.stringify(yield* extractMessageValue(currentTranslationsKeys, key, verbose));
      yield* Effect.logError(`[compareMessageKeysNaive] ${key} - ${baseValue} - ${currentValue}`);
    }

    yield* Effect.logWarning(`[compareMessageKeysNaive] Found ${duplicateValuesCount} keys with same value between translation files.`);
    yield* Effect.logError(`[compareMessageKeysNaive] Found ${missingKeys.length} missing keys from the current translation file.`);
    yield* Effect.logInfo("[compareMessageKeysNaive] Finished comparing translation keys.");
    return false;
  });
}

/**
 * Compares the values of two translation messages.
 *
 * @param baseTranslationMessage The base message object.
 * @param currentTranslationMessage The current message object.
 * @param verbose Whether to emit detailed comparison diagnostics.
 * @param locale The locale being compared, reported by a failure.
 * @returns The comparison result: true if the values are equal, false if some values are distinct.
 */
function areMessageValuesEqual(
  baseTranslationMessage: Message,
  currentTranslationMessage: Message,
  verbose: boolean,
  locale: string,
): Effect.Effect<boolean, TranslationSyncFailed, Presenter> {
  return Effect.gen(function* () {
    if (verbose) {
      yield* Effect.logDebug("[areMessageValuesEqual] Comparing translation message values.");
    }

    const typeofBase = typeof baseTranslationMessage;
    const typeofCurrent = typeof currentTranslationMessage;
    if (verbose) {
      yield* Effect.logDebug(`[areMessageValuesEqual] Base message type: ${typeofBase}`);
      yield* Effect.logDebug(`[areMessageValuesEqual] Current message type: ${typeofCurrent}`);
    }

    if (typeofBase !== typeofCurrent) {
      yield* Effect.logInfo("[areMessageValuesEqual] Messages have different types, cannot be equal.");
      return false;
    }

    if (typeof baseTranslationMessage === "string") {
      return baseTranslationMessage.trim() === (currentTranslationMessage as string).trim();
    }

    const baseMessageFormat = baseTranslationMessage;
    const currentMessageFormat = currentTranslationMessage as MessageFormat;

    if (!(yield* compareMessageKeysNaive(baseMessageFormat, currentMessageFormat, verbose, locale))) {
      yield* Effect.logInfo("[areMessageValuesEqual] MessageFormat objects have different keys, cannot be equal.");
      return false;
    }

    // Iterate through every key-value pair in the base MessageFormat object
    // If any of the sub-messages are different, return false.
    const baseMessageKeys = yield* extractMessageKeys(baseMessageFormat, verbose);
    let equalValuesCount = 0;
    for (const key of baseMessageKeys) {
      if (verbose) {
        yield* Effect.logDebug(`[areMessageValuesEqual] Comparing sub-message for key: ${key}.`);
      }
      const baseSubMessage = yield* extractMessageValue(baseMessageFormat, key, verbose);
      const currSubMessage = yield* extractMessageValue(currentMessageFormat, key, verbose);
      const areEqual = yield* areMessageValuesEqual(baseSubMessage, currSubMessage, verbose, locale);
      if (!areEqual && verbose) {
        yield* Effect.logDebug(`[areMessageValuesEqual] Sub-messages for key: ${key} are different.`);
      }
      equalValuesCount += areEqual ? 1 : 0;
    }

    yield* Effect.logInfo("[areMessageValuesEqual] Finished comparing MessageFormat objects.");
    yield* Effect.logWarning(
      `[areMessageValuesEqual] Found ${equalValuesCount} equal sub-message values out of ${baseMessageKeys.length} total sub-messages.`,
    );
    return equalValuesCount === baseMessageKeys.length;
  });
}

/**
 * Extracts all keys from a MessageFormat object.
 * The keys are extracted recursively, so if the value of a key is another MessageFormat object, the function will extract the keys from that object as well.
 *
 * Whenever a key is a string, the function will add it to the keys array.
 * Whenever a key is a MessageFormat object, the function will recursively call itself with the value of the key, and append a dot (.) to the key - e.g. "pages.domains.services."
 * @param messages The translation tree whose compound leaf keys are extracted.
 * @param verbose Whether to emit recursive extraction diagnostics.
 * @returns Compound translation keys in traversal order.
 */
function extractMessageKeys(messages: MessageFormat, verbose: boolean): Effect.Effect<string[]> {
  return Effect.gen(function* () {
    const keys: string[] = [];

    if (verbose) {
      yield* Effect.logDebug(`[extractMessageKeys] MessageFormat object: ${JSON.stringify(messages)}`);
    }

    for (const key in messages) {
      if (verbose) {
        yield* Effect.logDebug(`[extractMessageKeys] Extracting key: ${key} from message.`);
      }
      if (typeof messages[key] === "string") {
        keys.push(key);
      } else {
        if (verbose) {
          yield* Effect.logDebug(`[extractMessageKeys] Key ${key} is a MessageFormat object. Extracting subkeys.`);
        }
        const subKeys = yield* extractMessageKeys(messages[key] as MessageFormat, verbose);
        subKeys.forEach((subKey) => keys.push(`${key}.${subKey}`));
      }
    }

    if (verbose) {
      yield* Effect.logDebug(`[extractMessageKeys] Extracted keys from translation file: ${keys.length}`);
    }
    return keys;
  });
}

/**
 * Finds the keys that are missing from the translated keys.
 * The function will compare the keys from the English translation with the keys from the translated file.
 * @param englishKeys The array of keys from the English translation.
 * @param translatedKeys The array of keys from the translated file.
 * @param verbose Whether to emit per-key diagnostics.
 * @returns An array of keys that are missing from the translated file.
 */
function findMissingKeys(englishKeys: string[], translatedKeys: string[], verbose: boolean): Effect.Effect<string[]> {
  return Effect.gen(function* () {
    const missingKeys: string[] = [];

    for (const englishKey of englishKeys) {
      if (verbose) {
        yield* Effect.logDebug(`[findMissingKeys] Checking key: ${englishKey}.`);
      }
      if (!translatedKeys.includes(englishKey)) {
        missingKeys.push(englishKey);
      }
    }

    if (missingKeys.length !== 0) {
      yield* Effect.logInfo(`[findMissingKeys] Number of found missing keys: ${missingKeys.length}`);
      yield* Effect.logInfo(`[findMissingKeys] Missing keys: ${JSON.stringify(missingKeys)}`);
    }

    return missingKeys;
  });
}

/**
 * Adds one missing compound key, as an empty leaf string, to a translation tree.
 *
 * @param existing The mutable translation tree receiving the new key.
 * @param compoundKey The dot-delimited missing key to add.
 * @param verbose Whether to emit segment diagnostics.
 * @returns An effect that mutates `existing`.
 */
function addMissingKey(existing: MessageFormat, compoundKey: string, verbose: boolean): Effect.Effect<void> {
  return Effect.gen(function* () {
    let cursor: MessageFormat = existing;
    const parts = compoundKey.split(".");
    for (const [idx, part] of parts.entries()) {
      const isLeaf = idx === parts.length - 1;
      if (isLeaf) {
        (cursor as Record<string, Message>)[part] = "";
        return;
      }
      if (!(part in cursor)) (cursor as Record<string, MessageFormat>)[part] = {} as MessageFormat;
      if (verbose) {
        yield* Effect.logDebug(`[writeTranslationKeysFile] Adding key segment: ${part}`);
      }
      cursor = cursor[part] as MessageFormat;
    }
  });
}

/**
 * Writes missing translation keys to a locale file.
 *
 * @param filePath The locale file to update.
 * @param translationKeys The compound missing keys to add.
 * @param verbose Whether to emit key-segment diagnostics.
 * @param locale The locale the file belongs to.
 * @returns An effect that completes once the file holds every key.
 */
function writeTranslationKeysFile(
  filePath: string,
  translationKeys: readonly string[],
  verbose: boolean,
  locale: string,
): Effect.Effect<void, GenerateI18nError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    let existingMessages: MessageFormat = {};

    if (yield* fs.exists(filePath)) {
      yield* Effect.logInfo(`[writeTranslationKeysFile] Translations file already exists: ${filePath}`);
      existingMessages = yield* parseMessages(yield* fs.readFileString(filePath), locale);
    } else {
      yield* Effect.logWarning(`[writeTranslationKeysFile] File does not exist: ${filePath}`);
      yield* writeTextAtomic(filePath, "{}");
      yield* Effect.logWarning(`[writeTranslationKeysFile] Created file: ${filePath}`);
    }

    for (const key of translationKeys) {
      yield* addMissingKey(existingMessages, key, verbose);
    }
    yield* writeTextAtomic(filePath, JSON.stringify(existingMessages, null, 2));

    yield* Effect.logInfo(`[writeTranslationKeysFile] Wrote missing keys to file: ${filePath}`);
  }).pipe(
    Effect.tapError((error) =>
      Effect.andThen(
        Effect.logError(`[writeTranslationKeysFile] Error writing missing keys to file: ${filePath}`),
        Effect.logError(`[writeTranslationKeysFile] Error details: ${error.message}`),
      ),
    ),
  );
}

/** Outcome of validating one target locale against the English source of truth. */
interface LocaleValidationResult {
  /** Number of missing keys that were found (and, when positive, added) for this locale. */
  readonly missingKeyCount: number;
  /** Absolute path to the locale file that was validated. */
  readonly targetFile: string;
}

/**
 * Validates and synchronizes a single target locale against the English source.
 * @param enTranslations The English translations (source of truth).
 * @param enKeys The extracted English translation keys.
 * @param targetLocale The target locale code (e.g., "ro", "fr").
 * @param translationsPath The base path to the messages directory.
 * @param verbose Whether to enable verbose logging.
 * @returns The target locale file path and the number of missing keys that were added.
 */
function validateLocale(
  enTranslations: MessageFormat,
  enKeys: string[],
  targetLocale: string,
  translationsPath: string,
  verbose: boolean,
): Effect.Effect<LocaleValidationResult, GenerateI18nError, GenerateRequirements> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const path = yield* Path.Path;
    const targetFile = path.resolve(translationsPath, `${targetLocale}.json`);
    yield* presenter.section(`Validating ${targetLocale.toUpperCase()} translations`, "📋");

    const targetTranslations = yield* loadTranslationFile(targetFile, targetLocale, verbose);
    const targetKeys = yield* extractMessageKeys(targetTranslations, verbose);

    yield* Effect.logInfo(`[generateTranslations] Finding missing keys for ${targetLocale}.`);
    const missingKeys = yield* findMissingKeys(enKeys, targetKeys, verbose);

    if (missingKeys.length > 0) {
      yield* Effect.logWarning(`[generateTranslations] Writing ${missingKeys.length} missing keys to ${targetLocale}.json.`);
      yield* writeTranslationKeysFile(targetFile, missingKeys, verbose, targetLocale);
    } else {
      yield* presenter.success(`[generateTranslations] No missing keys detected for ${targetLocale}.`);
    }

    yield* areMessageValuesEqual(enTranslations, targetTranslations, verbose, targetLocale);

    return {missingKeyCount: missingKeys.length, targetFile};
  });
}

/** Locales validated against English, in order. */
const SUPPORTED_LOCALES = ["ro", "fr"] as const;

/**
 * Validates every supported locale (Romanian and French) against the English source of truth and
 * adds each missing key as an empty string.
 *
 * @remarks
 * A nonempty `changedFiles` is the legacy negative result: the orchestrator stops generation on it.
 */
export const generateI18n: Effect.Effect<GenerateLeafResult, GenerateI18nError, GenerateRequirements> = Effect.gen(function* () {
  const environment = yield* Environment;
  const presenter = yield* Presenter;
  const path = yield* Path.Path;
  const verbose = yield* debugLogsEnabled;

  yield* presenter.line("stdout", "🔧 Configuration:");
  yield* presenter.line("stdout", "");
  yield* presenter.line("stdout", `   Verbose: ${verbose ? "✅ Enabled" : "❌ Disabled"}`);
  yield* presenter.line("stdout", `   Working Directory: ${environment.cwd}`);
  yield* presenter.line("stdout", "");

  yield* Effect.logInfo("[generateTranslations] Generating translations.");
  const translationsPath = environment.cwd.concat("/sites/arolariu.ro/messages").replaceAll("\\", "/");
  yield* Effect.logInfo(`[generateTranslations] Base translation path set as:\n\t >> ${translationsPath}`);

  const enTranslationsFile = path.resolve(translationsPath, "en.json");

  yield* Effect.logInfo("[generateTranslations] Loading English translations (source of truth).");
  const enTranslations = yield* loadTranslationFile(enTranslationsFile, "en", verbose);

  yield* Effect.logInfo("[generateTranslations] Extracting English translation keys.");
  const enKeys = yield* extractMessageKeys(enTranslations, verbose);
  yield* presenter.line("stdout", `   Total English keys: ${enKeys.length}`);

  // Sequential: each locale's diagnostics stay grouped under its own section.
  const results = yield* Effect.forEach(
    SUPPORTED_LOCALES,
    (locale) => validateLocale(enTranslations, enKeys, locale, translationsPath, verbose),
    {concurrency: 1},
  );
  const totalMissingKeys = results.reduce((total, result) => total + result.missingKeyCount, 0);
  const changedFiles = results.filter((result) => result.missingKeyCount > 0).map((result) => result.targetFile);

  yield* presenter.line("stdout", "");
  yield* presenter.success("i18n synchronization completed.");
  yield* presenter.line("stdout", "📊 Summary:");
  yield* presenter.line("stdout", `   English keys (source): ${enKeys.length}`);
  for (const [index, locale] of SUPPORTED_LOCALES.entries()) {
    const count = results[index]?.missingKeyCount ?? 0;
    yield* presenter.line("stdout", `   ${locale.toUpperCase()}: ${count === 0 ? "✓ complete" : `${count} keys added`}`);
  }
  yield* presenter.line("stdout", `   Total missing keys added: ${totalMissingKeys}`);

  return {
    summary: `i18n synchronization completed with ${String(totalMissingKeys)} missing key(s) added.`,
    changedFiles,
  };
}).pipe(Effect.withSpan("generate.i18n"));
