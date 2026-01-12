/**
 * @fileoverview i18n asset generator for the monorepo.
 * @module scripts/generate.i18n
 *
 * @remarks
 * Reads translation JSON files, validates structure, and generates i18n artifacts.
 * This script is used by `npm run generate` as part of the build toolchain.
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

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
 * @param filePath - The path to the translation file.
 * @param verbose - Enables verbose logging.
 * @returns The translation file as a `MessageFormat` object.
 */
function loadTranslationFile(filePath: string, verbose: boolean = false): MessageFormat {
  try {
    const translationFile = fs.readFileSync(filePath, "utf-8");
    verbose && console.info(`[arolariu.ro::loadTranslationFile] Loaded translation file: ${filePath}`);
    const convertedJsonFileToMessageFormat = JSON.parse(translationFile) as MessageFormat;
    verbose && console.info(`[arolariu.ro::loadTranslationFile] Converted translation file to MessageFormat object...`);
    return convertedJsonFileToMessageFormat;
  } catch (error: unknown) {
    console.error(`[arolariu.ro::loadTranslationFile] Error encountered when loading translation file with path: ${filePath}`);
    console.error(`[arolariu.ro::loadTranslationFile] Error details: ${error}`);
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
 *
 * @example
 * extractMessageValue(messages, "Domains.services.title")
 * // > The above invocation will try to return the value of the key "title" from the "services" object, which is a child of the "Domains" object.
 *
 * @remarks The function will treat non-existent values as an empty string.
 * @returns The value of the translation key.
 */
function extractMessageValue(messages: MessageFormat, keyNamespace: string, verbose: boolean = false): Message {
  verbose && console.info(`[arolariu.ro::extractMessageValue] Extracting message value for key: ${keyNamespace}`);
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
 * @returns The comparison result: true if equal, false if different.
 */
function compareMessageKeysNaive(
  baseTranslationKeys: MessageFormat,
  currentTranslationsKeys: MessageFormat,
  verbose: boolean = false,
): boolean {
  console.info("[arolariu.ro::compareMessageKeysNaive] Comparing translation keys...");
  const baseKeys = extractMessageKeys(baseTranslationKeys, verbose);
  const currentKeys = extractMessageKeys(currentTranslationsKeys, verbose);

  console.info(
    `[arolariu.ro::compareMessageKeysNaive] Extracted ${pc.yellow(baseKeys.length)} keys from the base translation file (en.json)`,
  );
  console.info(`[arolariu.ro::compareMessageKeysNaive] Extracted ${pc.yellow(currentKeys.length)} keys from the current translation file.`);

  if (baseKeys.length === currentKeys.length) {
    console.info(pc.green("[arolariu.ro::compareMessageKeysNaive] Translation files have equal keys!"));
    return true;
  }

  // Safety check.
  const missingKeysFromBase = currentKeys.filter((key) => !baseKeys.includes(key));
  console.info(`[arolariu.ro::compareMessageKeysNaive] Found ${missingKeysFromBase.length} missing keys from the base translation file.`);
  if (missingKeysFromBase.length > 0) {
    verbose
      && console.error(
        "The base translation file should be the source of truth for keys. Found extra keys in the current translation file.",
      );
    throw new Error(
      `[arolariu.ro::compareMessageKeysNaive] Current translation file has extra keys that are not present in the base translation file!`,
    );
  }

  const missingKeys = baseKeys.filter((key) => !currentKeys.includes(key));
  console.info(`[arolariu.ro::compareMessageKeysNaive] KEY - BASE VALUE - CURRENT VALUE`);

  let duplicateValuesCount = 0;
  for (const key of currentKeys) {
    const baseValue = extractMessageValue(baseTranslationKeys, key, verbose);
    const currentValue = extractMessageValue(currentTranslationsKeys, key, verbose);
    if (areMessageValuesEqual(baseValue, currentValue, verbose)) {
      console.warn(`[arolariu.ro::compareMessageKeysNaive] ${key} - ${JSON.stringify(baseValue)} - ${JSON.stringify(currentValue)}`);
      duplicateValuesCount++;
    }
  }

  // Output the missing keys in the console.
  for (const key of missingKeys) {
    const baseValue = JSON.stringify(extractMessageValue(baseTranslationKeys, key, verbose));
    const currentValue = JSON.stringify(extractMessageValue(currentTranslationsKeys, key, verbose));
    console.error(`[arolariu.ro::compareMessageKeysNaive] ${key} - ${baseValue} - ${currentValue}`);
  }

  console.warn(`[arolariu.ro::compareMessageKeysNaive] Found ${duplicateValuesCount} keys with same value between translation files.`);
  console.error(`[arolariu.ro::compareMessageKeysNaive] Found ${missingKeys.length} missing keys from the current translation file.`);
  console.info("[arolariu.ro::compareMessageKeysNaive] Finished comparing translation keys.");
  return false;
}

/**
 * This function will compare the values of two translation messages.
 *
 * @param baseTranslationMessage The base message object.
 * @param currentTranslationMessage The current message object.
 * @returns The comparison result: true if the values are equal, false if some values are distinct.
 */
function areMessageValuesEqual(baseTranslationMessage: Message, currentTranslationMessage: Message, verbose: boolean = false): boolean {
  verbose && console.info("[arolariu.ro::areMessageValuesEqual] Comparing translation message values...");

  const typeofBase = typeof baseTranslationMessage;
  const typeofCurrent = typeof currentTranslationMessage;
  verbose && console.info(`[arolariu.ro::areMessageValuesEqual] Base message type: ${typeofBase}`);
  verbose && console.info(`[arolariu.ro::areMessageValuesEqual] Current message type: ${typeofCurrent}`);

  const isSameType = typeofBase === typeofCurrent;
  if (!isSameType) {
    console.info("[arolariu.ro::areMessageValuesEqual] Messages have different types, cannot be equal.");
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

    if (compareMessageKeysNaive(baseMessageFormat, currentMessageFormat, verbose) === false) {
      console.info("[arolariu.ro::areMessageValuesEqual] MessageFormat objects have different keys, cannot be equal.");
      return false;
    }

    // Iterate through every key-value pair in the base MessageFormat object
    // If any of the sub-messages are different, return false.
    const baseMessageKeys = extractMessageKeys(baseMessageFormat, verbose);
    let equalValuesCount = 0;
    for (const key of baseMessageKeys) {
      verbose && console.info(`[arolariu.ro::areMessageValuesEqual] Comparing sub-message for key: ${key}...`);
      const baseSubMessage = extractMessageValue(baseMessageFormat, key, verbose);
      const currSubMessage = extractMessageValue(currentMessageFormat, key, verbose);
      const areEqual = areMessageValuesEqual(baseSubMessage, currSubMessage, verbose);
      if (areEqual === false) verbose && console.info(`[arolariu.ro::areMessageValuesEqual] Sub-messages for key: ${key} are different.`);
      equalValuesCount += areEqual ? 1 : 0;
    }

    console.info("[arolariu.ro::areMessageValuesEqual] Finished comparing MessageFormat objects.");
    console.warn(
      pc.yellow(
        `[arolariu.ro::areMessageValuesEqual] Found ${pc.red(equalValuesCount)} equal sub-message values out of ${pc.green(baseMessageKeys.length)} total sub-messages.`,
      ),
    );
    return equalValuesCount === baseMessageKeys.length;
  }
}

/**
 * This function will extract all keys from a MessageFormat object.
 * The keys are extracted recursively, so if the value of a key is another MessageFormat object, the function will extract the keys from that object as well.
 *
 * Whenever a key is a string, the function will add it to the keys array.
 * Whenever a key is a MessageFormat object, the function will recursively call itself with the value of the key, and append a dot (.) to the key - e.g. "Domains.services."
 * @param messages
 * @returns
 */
function extractMessageKeys(messages: MessageFormat, verbose: boolean = false): string[] {
  const keys: string[] = [];
  verbose && console.log(`[arolariu.ro::extractMessageKeys] MessageFormat object: ${JSON.stringify(messages)}`);

  for (const key in messages) {
    verbose && console.info(`[arolariu.ro::extractMessageKeys] Extracting key: ${key} from message...`);
    if (typeof messages[key] === "string") {
      keys.push(key);
    } else {
      verbose && console.info(`[arolariu.ro::extractMessageKeys] Key ${key} is a MessageFormat object. Extracting subkeys...`);
      const subKeys = extractMessageKeys(messages[key] as MessageFormat);
      subKeys.forEach((subKey) => keys.push(`${key}.${subKey}`));
    }
  }

  verbose && console.info(`[arolariu.ro::extractMessageKeys] Extracted keys from translation file: ${keys.length}`);
  return keys;
}

/**
 * This function will find the keys that are missing from the translated keys.
 * The function will compare the keys from the English translation with the keys from the translated file.
 * @param englishKeys The array of keys from the English translation.
 * @param translatedKeys The array of keys from the translated file.
 * @returns An array of keys that are missing from the translated file.
 */
function findMissingKeys(englishKeys: string[], translatedKeys: string[], verbose: boolean = false): string[] {
  const missingKeys: string[] = [];

  for (const englishKey of englishKeys) {
    verbose && console.info(`[arolariu.ro::findMissingKeys] Checking key: ${englishKey}...`);
    if (!translatedKeys.includes(englishKey)) {
      missingKeys.push(englishKey);
    }
  }

  if (missingKeys.length !== 0) {
    console.info(`[arolariu.ro::findMissingKeys] Number of found missing keys: ${missingKeys.length}`);
    console.info(`[arolariu.ro::findMissingKeys] Missing keys: ${JSON.stringify(missingKeys)}`);
  }

  return missingKeys;
}

/**
 * This function will write the missing translation keys to a file.
 * A missing translation key can be either a string or a MessageFormat object.
 * The function will write the missing keys to a JSON file.
 *
 * @param filePath The path to the file where the missing keys will be written.
 * @param translationKeys The array of missing translation keys.
 * @remarks If the file already exists, the function will append the missing keys to the existing file.
 * If the file does not exist, the function will create a new file and write the missing keys to it.
 *
 */
function addMissingKey(existing: MessageFormat, compoundKey: string, verbose: boolean): void {
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
    verbose && console.info(`[arolariu.ro::writeTranslationKeysFile] Adding key segment: ${part}`);
    cursor = cursor[part] as MessageFormat;
  }
}

function writeTranslationKeysFile(filePath: string, translationKeys: string[], verbose: boolean = false) {
  try {
    let existingMessages: MessageFormat = {};

    if (fs.existsSync(filePath)) {
      console.info(`[arolariu.ro::writeTranslationKeysFile] Translations file already exists: ${filePath}`);
      const existingFile = fs.readFileSync(filePath, "utf-8");
      existingMessages = JSON.parse(existingFile);
    } else {
      console.warn(`[arolariu.ro::writeTranslationKeysFile] File does not exist: ${filePath}`);
      fs.writeFileSync(filePath, "{}", "utf-8");
      console.warn(`[arolariu.ro::writeTranslationKeysFile] Created file: ${filePath}`);
    }

    for (const key of translationKeys) addMissingKey(existingMessages, key, verbose);
    fs.writeFileSync(filePath, JSON.stringify(existingMessages, null, 2), "utf-8");

    console.info(`[arolariu.ro::writeTranslationKeysFile] Wrote missing keys to file: ${filePath}`);
  } catch (error) {
    console.error(`[arolariu.ro::writeTranslationKeysFile] Error writing missing keys to file: ${filePath}`);
    console.error(`[arolariu.ro::writeTranslationKeysFile] Error details: ${error}`);
    throw error;
  }
}

/**
 * This is the main function of the script.
 * @param verbose A boolean flag that indicates if the script should log verbose output.
 */
export async function main(verbose: boolean = false): Promise<number> {
  console.log(pc.cyan("🔧 Configuration:\n"));
  console.log(pc.gray(`   Verbose: ${verbose ? pc.green("✅ Enabled") : pc.red("❌ Disabled")}`));
  console.log(pc.gray(`   Working Directory: ${pc.dim(process.cwd())}`));
  console.log();

  console.info("[arolariu.ro::generateTranslations] Generating translations...");
  const currentDirectory = process.cwd();
  const TRANSLATIONS_PATH = currentDirectory.concat("/sites/arolariu.ro/messages").replaceAll("\\", "/");
  console.info(`[arolariu.ro::generateTranslations] Base translation path set as:\n\t >> ${TRANSLATIONS_PATH}`);

  const EN_TRANSLATIONS_FILE = path.resolve(TRANSLATIONS_PATH, "en.json");
  const RO_TRANSLATIONS_FILE = path.resolve(TRANSLATIONS_PATH, "ro.json");

  console.info("[arolariu.ro::generateTranslations] Loading translation files...");
  const enTranslations = loadTranslationFile(EN_TRANSLATIONS_FILE, verbose);
  const roTranslations = loadTranslationFile(RO_TRANSLATIONS_FILE, verbose);

  console.info("[arolariu.ro::generateTranslations] Extracting translation keys...");
  const enKeys = extractMessageKeys(enTranslations, verbose);
  const roKeys = extractMessageKeys(roTranslations, verbose);

  console.info("[arolariu.ro::generateTranslations] Finding missing translations keys...");
  const missingKeys = findMissingKeys(enKeys, roKeys, verbose);

  if (missingKeys.length > 0) {
    console.info(pc.yellow("[arolariu.ro::generateTranslations] Writing missing translations to translation file(s)..."));
    writeTranslationKeysFile(RO_TRANSLATIONS_FILE, missingKeys, verbose);
  } else {
    console.log(pc.green("[arolariu.ro::generateTranslations] No missing keys detected."));
  }

  areMessageValuesEqual(enTranslations, roTranslations, verbose);

  console.log(pc.green("\n✨ i18n synchronization completed."));
  console.log(pc.gray(`   Missing keys added: ${pc.green(String(missingKeys.length))}`));
  return missingKeys.length;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const verbose = argv.some((a) => ["/verbose", "/v", "--verbose", "-v"].includes(a));
  const wantsHelp = argv.some((a) => ["/help", "/h", "--help", "-h"].includes(a));

  if (wantsHelp) {
    console.log(pc.magenta("\n╔══════════════════════════════════════════════════════════════════╗"));
    console.log(pc.magenta("║                   ||arolariu.ro|| i18n Generator - Help          ║"));
    console.log(pc.magenta("╚══════════════════════════════════════════════════════════════════╝\n"));
    console.log(pc.cyan("Usage:"), pc.gray("npm run generate /i18n [flags]\n"));
    console.log(pc.cyan("Flags:"));
    console.log(`  ${pc.green("/verbose     /v    --verbose     -v")}  Enable verbose logging 🔊`);
    console.log(`  ${pc.green("/help        /h    --help        -h")}  Show this help menu ❓`);
    console.log("\nExample:");
    console.log(pc.gray("  npm run generate /i18n /verbose"));
    process.exit(0);
  }

  try {
    const code = await main(verbose);
    process.exit(code);
  } catch (err) {
    console.error(pc.red("i18n generation failed:"));
    console.error(err);
    process.exit(1);
  }
}
