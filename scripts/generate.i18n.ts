/**
 * @fileoverview i18n asset generator command for the monorepo.
 * @module scripts/generate.i18n
 *
 * @remarks
 * Validates and synchronizes translation files for all supported locales against
 * the English source of truth. The command ensures all locales (Romanian and French)
 * have complete translation coverage by:
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
 * This command is used by `npm run generate` as part of the build toolchain. Every ambient
 * effect (filesystem and environment) is routed through the injected
 * {@link CommandContext.runtime} instead of touching Node globals directly.
 */

import path from "node:path";
import {MonorepoCommand, type CommandContext, type CommandRuntimeFactory} from "./common/commander.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";

/** Typed input accepted by every migrated `generate` leaf command. */
export interface GenerateLeafInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
}

/** Typed business result produced by every migrated `generate` leaf command. */
export interface GenerateLeafResult {
  /** Human-readable completion summary rendered by the command's human presentation. */
  readonly summary: string;
  /** Paths of every file this command created or modified. */
  readonly changedFiles: readonly string[];
}

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

/**
 * This function loads into memory a translation file.
 * The translation file should be a JSON file.
 *
 * This JSON file respects the {@link MessageFormat} structure.
 * @param context - Command context whose runtime owns the filesystem and logging.
 * @param filePath - The path to the translation file.
 * @param verbose - Enables verbose logging.
 * @returns The translation file as a `MessageFormat` object.
 */
async function loadTranslationFile(context: Readonly<CommandContext>, filePath: string, verbose: boolean): Promise<MessageFormat> {
  const {logger, files} = context.runtime;
  try {
    const translationFile = await files.readText(filePath);
    if (verbose) {
      logger.debug(`[loadTranslationFile] Loaded translation file: ${filePath}`);
    }
    const convertedJsonFileToMessageFormat = JSON.parse(translationFile) as MessageFormat;
    if (verbose) {
      logger.debug("[loadTranslationFile] Converted translation file to MessageFormat object.");
    }
    return convertedJsonFileToMessageFormat;
  } catch (error: unknown) {
    logger.error(`[loadTranslationFile] Error encountered when loading translation file with path: ${filePath}`);
    logger.error(`[loadTranslationFile] Error details: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * This function will try to lookup in the given MessageFormat object, a translation key.
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
 * @param logger Logger used for lookup diagnostics.
 *
 * @example
 * extractMessageValue(messages, "pages.domains.services.title")
 * // > The above invocation will try to return the value of the key "title" from the "services" object, which is a child of the "Domains" object.
 *
 * @remarks The function will treat non-existent values as an empty string.
 * @returns The value of the translation key.
 */
function extractMessageValue(messages: MessageFormat, keyNamespace: string, verbose: boolean, logger: MonorepositoryLogger): Message {
  if (verbose) {
    logger.debug(`[extractMessageValue] Extracting message value for key: ${keyNamespace}`);
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
}

/**
 * This function will compare the keys from two translation files.
 * This is a naive implementation that will only compare the length of the keys.
 *
 * CASE 1:
 * IF the length of the keys are the same
 * AND every key from the base translation file is present in the right translation file
 * THEN the function will return true, meaning that the translation files have equal keys.
 *
 * CASE 2:
 * IF the length of the keys are different,
 * THEN the function will return false, meaning that the translation files have different keys.
 * @param baseTranslationKeys The base translation file keys.
 * @param currentTranslationsKeys The current translation file keys.
 * @param verbose Whether to emit detailed comparison diagnostics.
 * @param logger Logger used for comparison output.
 * @returns The comparison result: true if equal, false if different.
 */
function compareMessageKeysNaive(
  baseTranslationKeys: MessageFormat,
  currentTranslationsKeys: MessageFormat,
  verbose: boolean,
  logger: MonorepositoryLogger,
): boolean {
  logger.info("[compareMessageKeysNaive] Comparing translation keys.");
  const baseKeys = extractMessageKeys(baseTranslationKeys, verbose, logger);
  const currentKeys = extractMessageKeys(currentTranslationsKeys, verbose, logger);

  logger.info(`[compareMessageKeysNaive] Extracted ${baseKeys.length} keys from the base translation file (en.json).`);
  logger.info(`[compareMessageKeysNaive] Extracted ${currentKeys.length} keys from the current translation file.`);

  if (baseKeys.length === currentKeys.length) {
    logger.success("[compareMessageKeysNaive] Translation files have equal keys.");
    return true;
  }

  // Safety check.
  const missingKeysFromBase = currentKeys.filter((key) => !baseKeys.includes(key));
  logger.info(`[compareMessageKeysNaive] Found ${missingKeysFromBase.length} missing keys from the base translation file.`);
  if (missingKeysFromBase.length > 0) {
    if (verbose) {
      logger.error("The base translation file should be the source of truth for keys. Found extra keys in the current translation file.");
    }
    throw new Error(
      `[arolariu.ro::compareMessageKeysNaive] Current translation file has extra keys that are not present in the base translation file!`,
    );
  }

  const missingKeys = baseKeys.filter((key) => !currentKeys.includes(key));
  logger.info("[compareMessageKeysNaive] KEY - BASE VALUE - CURRENT VALUE");

  let duplicateValuesCount = 0;
  for (const key of currentKeys) {
    const baseValue = extractMessageValue(baseTranslationKeys, key, verbose, logger);
    const currentValue = extractMessageValue(currentTranslationsKeys, key, verbose, logger);
    if (areMessageValuesEqual(baseValue, currentValue, verbose, logger)) {
      logger.warn(`[compareMessageKeysNaive] ${key} - ${JSON.stringify(baseValue)} - ${JSON.stringify(currentValue)}`);
      duplicateValuesCount++;
    }
  }

  for (const key of missingKeys) {
    const baseValue = JSON.stringify(extractMessageValue(baseTranslationKeys, key, verbose, logger));
    const currentValue = JSON.stringify(extractMessageValue(currentTranslationsKeys, key, verbose, logger));
    logger.error(`[compareMessageKeysNaive] ${key} - ${baseValue} - ${currentValue}`);
  }

  logger.warn(`[compareMessageKeysNaive] Found ${duplicateValuesCount} keys with same value between translation files.`);
  logger.error(`[compareMessageKeysNaive] Found ${missingKeys.length} missing keys from the current translation file.`);
  logger.info("[compareMessageKeysNaive] Finished comparing translation keys.");
  return false;
}

/**
 * This function will compare the values of two translation messages.
 *
 * @param baseTranslationMessage The base message object.
 * @param currentTranslationMessage The current message object.
 * @param verbose Whether to emit detailed comparison diagnostics.
 * @param logger Logger used for comparison output.
 * @returns The comparison result: true if the values are equal, false if some values are distinct.
 */
function areMessageValuesEqual(
  baseTranslationMessage: Message,
  currentTranslationMessage: Message,
  verbose: boolean,
  logger: MonorepositoryLogger,
): boolean {
  if (verbose) {
    logger.debug("[areMessageValuesEqual] Comparing translation message values.");
  }

  const typeofBase = typeof baseTranslationMessage;
  const typeofCurrent = typeof currentTranslationMessage;
  if (verbose) {
    logger.debug(`[areMessageValuesEqual] Base message type: ${typeofBase}`);
    logger.debug(`[areMessageValuesEqual] Current message type: ${typeofCurrent}`);
  }

  const isSameType = typeofBase === typeofCurrent;
  if (!isSameType) {
    logger.info("[areMessageValuesEqual] Messages have different types, cannot be equal.");
    return false;
  }

  const isStringType = typeofBase === "string";
  if (isStringType) {
    const baseMessage = baseTranslationMessage as string;
    const currentMessage = currentTranslationMessage as string;
    return baseMessage.trim() === currentMessage.trim();
  } else {
    const baseMessageFormat = baseTranslationMessage as MessageFormat;
    const currentMessageFormat = currentTranslationMessage as MessageFormat;

    if (compareMessageKeysNaive(baseMessageFormat, currentMessageFormat, verbose, logger) === false) {
      logger.info("[areMessageValuesEqual] MessageFormat objects have different keys, cannot be equal.");
      return false;
    }

    // Iterate through every key-value pair in the base MessageFormat object
    // If any of the sub-messages are different, return false.
    const baseMessageKeys = extractMessageKeys(baseMessageFormat, verbose, logger);
    let equalValuesCount = 0;
    for (const key of baseMessageKeys) {
      if (verbose) {
        logger.debug(`[areMessageValuesEqual] Comparing sub-message for key: ${key}.`);
      }
      const baseSubMessage = extractMessageValue(baseMessageFormat, key, verbose, logger);
      const currSubMessage = extractMessageValue(currentMessageFormat, key, verbose, logger);
      const areEqual = areMessageValuesEqual(baseSubMessage, currSubMessage, verbose, logger);
      if (areEqual === false && verbose) {
        logger.debug(`[areMessageValuesEqual] Sub-messages for key: ${key} are different.`);
      }
      equalValuesCount += areEqual ? 1 : 0;
    }

    logger.info("[areMessageValuesEqual] Finished comparing MessageFormat objects.");
    logger.warn(
      `[areMessageValuesEqual] Found ${equalValuesCount} equal sub-message values out of ${baseMessageKeys.length} total sub-messages.`,
    );
    return equalValuesCount === baseMessageKeys.length;
  }
}

/**
 * This function will extract all keys from a MessageFormat object.
 * The keys are extracted recursively, so if the value of a key is another MessageFormat object, the function will extract the keys from that object as well.
 *
 * Whenever a key is a string, the function will add it to the keys array.
 * Whenever a key is a MessageFormat object, the function will recursively call itself with the value of the key, and append a dot (.) to the key - e.g. "pages.domains.services."
 * @param messages The translation tree whose compound leaf keys are extracted.
 * @param verbose Whether to emit recursive extraction diagnostics.
 * @param logger Logger used for extraction diagnostics.
 * @returns Compound translation keys in traversal order.
 */
function extractMessageKeys(messages: MessageFormat, verbose: boolean, logger: MonorepositoryLogger): string[] {
  const keys: string[] = [];

  if (verbose) {
    logger.debug(`[extractMessageKeys] MessageFormat object: ${JSON.stringify(messages)}`);
  }

  for (const key in messages) {
    if (verbose) {
      logger.debug(`[extractMessageKeys] Extracting key: ${key} from message.`);
    }
    if (typeof messages[key] === "string") {
      keys.push(key);
    } else {
      if (verbose) {
        logger.debug(`[extractMessageKeys] Key ${key} is a MessageFormat object. Extracting subkeys.`);
      }
      const subKeys = extractMessageKeys(messages[key] as MessageFormat, verbose, logger);
      subKeys.forEach((subKey) => keys.push(`${key}.${subKey}`));
    }
  }

  if (verbose) {
    logger.debug(`[extractMessageKeys] Extracted keys from translation file: ${keys.length}`);
  }
  return keys;
}

/**
 * This function will find the keys that are missing from the translated keys.
 * The function will compare the keys from the English translation with the keys from the translated file.
 * @param englishKeys The array of keys from the English translation.
 * @param translatedKeys The array of keys from the translated file.
 * @param verbose Whether to emit per-key diagnostics.
 * @param logger Logger used for missing-key output.
 * @returns An array of keys that are missing from the translated file.
 */
function findMissingKeys(englishKeys: string[], translatedKeys: string[], verbose: boolean, logger: MonorepositoryLogger): string[] {
  const missingKeys: string[] = [];

  for (const englishKey of englishKeys) {
    if (verbose) {
      logger.debug(`[findMissingKeys] Checking key: ${englishKey}.`);
    }
    if (!translatedKeys.includes(englishKey)) {
      missingKeys.push(englishKey);
    }
  }

  if (missingKeys.length !== 0) {
    logger.info(`[findMissingKeys] Number of found missing keys: ${missingKeys.length}`);
    logger.info(`[findMissingKeys] Missing keys: ${JSON.stringify(missingKeys)}`);
  }

  return missingKeys;
}

/**
 * This function will write the missing translation keys to a file.
 * A missing translation key can be either a string or a MessageFormat object.
 * The function will write the missing keys to a JSON file.
 *
 * @param existing The mutable translation tree receiving the new key.
 * @param compoundKey The dot-delimited missing key to add.
 * @param verbose Whether to emit segment diagnostics.
 * @param logger Logger used for segment diagnostics.
 */
function addMissingKey(existing: MessageFormat, compoundKey: string, verbose: boolean, logger: MonorepositoryLogger): void {
  let cursor: MessageFormat = existing;
  const parts = compoundKey.split(".");
  for (const [idx, part] of parts.entries()) {
    if (part === undefined) continue;
    const isLeaf = idx === parts.length - 1;
    if (isLeaf) {
      (cursor as Record<string, Message>)[part] = "";
      return;
    }
    if (!(part in cursor)) (cursor as Record<string, MessageFormat>)[part] = {} as MessageFormat;
    if (verbose) {
      logger.debug(`[writeTranslationKeysFile] Adding key segment: ${part}`);
    }
    cursor = cursor[part] as MessageFormat;
  }
}

/**
 * Writes missing translation keys to a locale file.
 *
 * @param context The command context whose runtime owns the filesystem and logging.
 * @param filePath The locale file to update.
 * @param translationKeys The compound missing keys to add.
 * @param verbose Whether to emit key-segment diagnostics.
 */
async function writeTranslationKeysFile(
  context: Readonly<CommandContext>,
  filePath: string,
  translationKeys: readonly string[],
  verbose: boolean,
): Promise<void> {
  const {logger, files} = context.runtime;
  try {
    let existingMessages: MessageFormat = {};

    if (await files.exists(filePath)) {
      logger.info(`[writeTranslationKeysFile] Translations file already exists: ${filePath}`);
      const existingFile = await files.readText(filePath);
      existingMessages = JSON.parse(existingFile);
    } else {
      logger.warn(`[writeTranslationKeysFile] File does not exist: ${filePath}`);
      await files.writeText(filePath, "{}");
      logger.warn(`[writeTranslationKeysFile] Created file: ${filePath}`);
    }

    for (const key of translationKeys) addMissingKey(existingMessages, key, verbose, logger);
    await files.writeText(filePath, JSON.stringify(existingMessages, null, 2));

    logger.info(`[writeTranslationKeysFile] Wrote missing keys to file: ${filePath}`);
  } catch (error: unknown) {
    logger.error(`[writeTranslationKeysFile] Error writing missing keys to file: ${filePath}`);
    logger.error(`[writeTranslationKeysFile] Error details: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
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
 * @param context The command context whose runtime owns the filesystem and logging.
 * @param enTranslations The English translations (source of truth).
 * @param enKeys The extracted English translation keys.
 * @param targetLocale The target locale code (e.g., "ro", "fr").
 * @param translationsPath The base path to the messages directory.
 * @param verbose Whether to enable verbose logging.
 * @returns The target locale file path and the number of missing keys that were added.
 */
async function validateLocale(
  context: Readonly<CommandContext>,
  enTranslations: MessageFormat,
  enKeys: string[],
  targetLocale: string,
  translationsPath: string,
  verbose: boolean,
): Promise<LocaleValidationResult> {
  const {logger} = context.runtime;
  const targetFile = path.resolve(translationsPath, `${targetLocale}.json`);
  logger.section(`Validating ${targetLocale.toUpperCase()} translations`, "📋");

  const targetTranslations = await loadTranslationFile(context, targetFile, verbose);
  const targetKeys = extractMessageKeys(targetTranslations, verbose, logger);

  logger.info(`[generateTranslations] Finding missing keys for ${targetLocale}.`);
  const missingKeys = findMissingKeys(enKeys, targetKeys, verbose, logger);

  if (missingKeys.length > 0) {
    logger.warn(`[generateTranslations] Writing ${missingKeys.length} missing keys to ${targetLocale}.json.`);
    await writeTranslationKeysFile(context, targetFile, missingKeys, verbose);
  } else {
    logger.success(`[generateTranslations] No missing keys detected for ${targetLocale}.`);
  }

  areMessageValuesEqual(enTranslations, targetTranslations, verbose, logger);

  return {missingKeyCount: missingKeys.length, targetFile};
}

/**
 * Runs the i18n generator's business logic.
 * Validates all supported locales (Romanian and French) against the English source of truth.
 * @param context The command context whose runtime owns every ambient capability.
 * @param input Typed command input.
 * @returns The completion summary and every locale file this invocation modified.
 */
async function generateI18n(
  context: Readonly<CommandContext>,
  input: Readonly<GenerateLeafInput>,
): Promise<GenerateLeafResult> {
  const {logger, environment} = context.runtime;
  const {verbose} = input;

  logger.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  logger.line();
  logger.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: verbose ? "✅ Enabled" : "❌ Disabled", styles: [verbose ? "green" : "red"]},
  ]);
  logger.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: environment.cwd, styles: ["dim"]},
  ]);
  logger.line();

  logger.info("[generateTranslations] Generating translations.");
  const TRANSLATIONS_PATH = environment.cwd.concat("/sites/arolariu.ro/messages").replaceAll("\\", "/");
  logger.info(`[generateTranslations] Base translation path set as:\n\t >> ${TRANSLATIONS_PATH}`);

  // Supported locales to validate against English (source of truth)
  const SUPPORTED_LOCALES = ["ro", "fr"] as const;

  const EN_TRANSLATIONS_FILE = path.resolve(TRANSLATIONS_PATH, "en.json");

  logger.info("[generateTranslations] Loading English translations (source of truth).");
  const enTranslations = await loadTranslationFile(context, EN_TRANSLATIONS_FILE, verbose);

  logger.info("[generateTranslations] Extracting English translation keys.");
  const enKeys = extractMessageKeys(enTranslations, verbose, logger);
  logger.line([
    {text: "   Total English keys: ", styles: ["gray"]},
    {text: String(enKeys.length), styles: ["green"]},
  ]);

  // Validate each supported locale against English
  let totalMissingKeys = 0;
  const localeResults: Record<string, number> = {};
  const changedFiles: string[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await validateLocale(context, enTranslations, enKeys, locale, TRANSLATIONS_PATH, verbose);
    localeResults[locale] = result.missingKeyCount;
    totalMissingKeys += result.missingKeyCount;
    if (result.missingKeyCount > 0) {
      changedFiles.push(result.targetFile);
    }
  }

  logger.line();
  logger.success("i18n synchronization completed.");
  logger.line([{text: "📊 Summary:", styles: ["cyan"]}]);
  logger.line([
    {text: "   English keys (source): ", styles: ["gray"]},
    {text: String(enKeys.length), styles: ["green"]},
  ]);
  for (const locale of SUPPORTED_LOCALES) {
    const count = localeResults[locale] ?? 0;
    logger.line([
      {text: `   ${locale.toUpperCase()}: `, styles: ["gray"]},
      {text: count === 0 ? "✓ complete" : `${count} keys added`, styles: [count === 0 ? "green" : "yellow"]},
    ]);
  }
  logger.line([
    {text: "   Total missing keys added: ", styles: ["gray"]},
    {text: String(totalMissingKeys), styles: ["green"]},
  ]);

  return {
    summary: `i18n synchronization completed with ${String(totalMissingKeys)} missing key(s) added.`,
    changedFiles,
  };
}

/**
 * Creates the i18n generator command.
 *
 * @param runtimeFactory - Optional runtime factory; tests inject a fake instead of the Node adapter.
 * @returns The typed `generate:i18n` command object.
 */
export function createGenerateI18nCommand(
  runtimeFactory?: CommandRuntimeFactory,
): MonorepoCommand<GenerateLeafInput, GenerateLeafResult> {
  return new MonorepoCommand<GenerateLeafInput, GenerateLeafResult>(
    {
      metadata: {
        name: "generate:i18n",
        description: "Validates and synchronizes translation files against English (en.json).",
        examples: ["npm run generate:i18n", "npm run generate:i18n -- --verbose"],
        slashAliases: {"/v": "--verbose", "/verbose": "--verbose"},
      },
      configure: (program) => {
        program.option("-v, --verbose", "Enable verbose logging.");
      },
      decode: (program) => ({verbose: program.opts<{verbose?: boolean}>().verbose === true}),
      execute: generateI18n,
      completion: (result) => ({
        exitCode: 0,
        human: (logger) => logger.success(result.summary),
      }),
    },
    runtimeFactory,
  );
}

/** Production singleton used by the aggregate CLI and this module's direct entrypoint. */
export const generateI18nCommand: MonorepoCommand<GenerateLeafInput, GenerateLeafResult> = createGenerateI18nCommand();

await generateI18nCommand.runIfMain(import.meta.url);

