/** @format */

import fs from "node:fs";
import path from "node:path";

/**
 * This file will check the en.json and ro.json translation files for missing translations.
 * A missing translation is considered a translation that either:
 * a) does not exist in one of the translation file (either en.json or ro.json)
 * b) exists in both translation files, but the translation value is an empty string ("")
 * c) exists in both translation files, but the translation value is the same in both files (no translation difference)
 * d) exists in both translation files, but the translation value is null or undefined, in a translation file.
 * -----------------------------------------------------
 * The script will output the missing translations in the console, in the following format:
 * [translation key] - [translation value in en.json] - [translation value in ro.json]
 * -----------------------------------------------------
 *
 * The translation files (either en.json or ro.json) should be located in the `messages` directory.
 * Example of a translation file:
 * // ro.json:
 * {
 *  "Home": "Acasă",
 *  "Domains": {
 *     "title": "Domenii",
 *     "services": {
 *       "title": "Servicii",
 *        "invoices": {
 *         "title": "Facturi",
 *    }
 *   }
 *  }
 * }
 *
 * The messages follow the MessageFormat syntax.
 */

/**
 * A message can be either a string or a MessageFormat object.
 */
type Message = string | MessageFormat;

/**
 * A MessageFormat object is a key-value pair object, where the key is a string and the value is either a string or a MessageFormat object.
 */
type MessageFormat = {
  [key: string]: Message;
};

/**
 * This function loads into memory a translation file.
 * The translation file should be a JSON file.
 * @param filePath The path to the translation file.
 * @returns The translation file as a MessageFormat object.
 */
function loadTranslationFile(filePath: string, verbose: boolean = false): MessageFormat {
  try {
    const translationFile = fs.readFileSync(filePath, "utf-8");
    verbose && console.info(`[arolariu.ro::checkTranslations] Loaded translation file: ${filePath}`);
    verbose && console.info(`[arolariu.ro::checkTranslations] Translation file content: ${translationFile}`);
    return JSON.parse(translationFile);
  } catch (error) {
    console.error(`[arolariu.ro::checkTranslations] Error loading translation file: ${filePath}`);
    throw error;
  }
}

/**
 * This function will extract all keys from a MessageFormat object.
 * The keys are extracted recursively, so if the value of a key is another MessageFormat object, the function will extract the keys from that object as well.
 * -------------
 * Example:
 * {
 * "Home": "Acasă",
 * "Domains": {
 *    "title": "Domenii",
 *   "services": {
 *    "title": "Servicii",
 *   "invoices": {
 *    "title": "Facturi",
 *  }
 * }
 * }
 * }
 * -------------
 * The above object will return the following keys:
 *  ["Home", "Domains", "Domains.title", "Domains.services", "Domains.services.title", "Domains.services.invoices", "Domains.services.invoices.title"]
 * --------------
 * Whenever a key is a string, the function will add it to the keys array.
 * Whenever a key is a MessageFormat object, the function will recursively call itself with the value of the key, and append a dot (.) to the key - e.g. "Domains.services."
 * --------------
 * @param messages
 * @returns
 */
function extractMessageKeys(messages: MessageFormat): string[] {
  const keys: string[] = [];

  for (const key in messages) {
    if (typeof messages[key] === "string") {
      keys.push(key);
    } else {
      const subKeys = extractMessageKeys(messages[key] as MessageFormat);
      subKeys.forEach((subKey) => keys.push(`${key}.${subKey}`));
    }
  }

  return keys;
}

/**
 * This function will try to lookup in the given messages object, a translation key.
 * The translation key is a string that can contain dots (.) to indicate nested keys.
 * If the translation key does NOT contain any dots, we have a simple key, and we can return the value of the key from the messages object.
 * If the translation key contains dots, we have a nested key, and we need to recursively lookup the value of the key.
 * -------------
 * Example:
 * lookupMessageKeyValue(messages, "Domains.services.title")
 * -------------
 * The above example will return the value of the key "title" from the "services" object, which is a child of the "Domains" object.
 * -------------
 * EXTRA NOTE: The function will treat non-existent values as an empty string.
 * @param messages The translation messages object.
 * @param key The translation key to lookup.
 * @returns The value of the translation key.
 */
function lookupMessageKeyValue(messages: MessageFormat, key: string): Message {
  const keys = key.split(".");
  let message: Message = "";

  for (key of keys) {
    if (messages[key]) {
      // If the key exists in the messages object.
      message = messages[key] as Message; // Set the message to the value of the key.
      messages = messages[key] as MessageFormat; // Set the messages object to the value of the key.
    } else {
      // Else, the key does not exist in the messages object.
      message = ""; // Set the message to an empty string.
      break; // Break the loop.
    }
  }

  return message;
}

/**
 * This function will compare the length of the keys from two translation files.
 * If the length of the keys are the same, and every key from the left translation file is present in the right translation file, then the function will return true, meaning that the translation files have equal keys.
 * If the length of the keys are different, then the function will return false, meaning that the translation files have different keys.
 * @param enTranslations The keys from the left translation file.
 * @param roTranslations The keys from the right translation file.
 */
function compareMessageKeys(enTranslations: MessageFormat, roTranslations: MessageFormat): void {
  console.info("[arolariu.ro::checkTranslations] Comparing translation keys...");
  const enKeys = extractMessageKeys(enTranslations);
  const roKeys = extractMessageKeys(roTranslations);

  console.info(`[arolariu.ro::checkTranslations] Extracted ${enKeys.length} keys from en.json`);
  console.info(`[arolariu.ro::checkTranslations] Extracted ${roKeys.length} keys from ro.json`);
  if (enKeys.length === roKeys.length) console.info("[arolariu.ro::checkTranslations] Translation files have equal keys!");

  const missingKeysFromLeft = enKeys.filter((key) => !roKeys.includes(key));
  const missingKeysFromRight = roKeys.filter((key) => !enKeys.includes(key));

  const missingKeys = Array.from(new Set([...missingKeysFromLeft, ...missingKeysFromRight]));
  if (missingKeys.length > 0) console.info(`[arolariu.ro::checkTranslations] Found ${missingKeys.length} missing keys.`);

  missingKeys.forEach((key) => {
    const enValue = JSON.stringify(lookupMessageKeyValue(enTranslations, key));
    const roValue = JSON.stringify(lookupMessageKeyValue(roTranslations, key));
    console.error(`[arolariu.ro::checkTranslations] ${key} - ${enValue} - ${roValue}`);
  });

  console.info("[arolariu.ro::checkTranslations] Finished comparing translation keys.");

  if (missingKeys.length > 0) {
    console.error("[arolariu.ro::checkTranslations] Fix missing translations!");
    process.exit(1);
  }
}

/**
 * This function will compare the values of the keys from two translation files.
 * If the value of a key from the left translation file is the same as the value of the key from the right translation file, then the function will output the key and the values in the console, as an error.
 * @param enTranslations The left translation file.
 * @param roTranslations The right translation file.
 */
function compareMessageValues(enTranslations: MessageFormat, roTranslations: MessageFormat): void {
  console.info("[arolariu.ro::checkTranslations] Comparing translation values...");
  let allGood = true;
  const enKeys = extractMessageKeys(enTranslations);
  const roKeys = extractMessageKeys(roTranslations);

  enKeys.forEach((key) => {
    const enValue = lookupMessageKeyValue(enTranslations, key);
    const roValue = lookupMessageKeyValue(roTranslations, key);

    if (enValue === roValue || enValue === "" || roValue === "" || enValue === null || roValue === null) {
      console.error(`[arolariu.ro::checkTranslations] ${key} - ${JSON.stringify(enValue)} - ${JSON.stringify(roValue)}`);
      allGood = false;
    }
  });

  roKeys.forEach((key) => {
    const enValue = lookupMessageKeyValue(enTranslations, key);
    const roValue = lookupMessageKeyValue(roTranslations, key);

    if (enValue === roValue || enValue === "" || roValue === "" || enValue === null || roValue === null) {
      console.error(`[arolariu.ro::checkTranslations] ${key} - ${JSON.stringify(enValue)} - ${JSON.stringify(roValue)}`);
      allGood = false;
    }
  });

  console.info("[arolariu.ro::checkTranslations] Finished comparing translation values.");

  if (!allGood) {
    console.error("[arolariu.ro::checkTranslations] Fix missing translations!");
    process.exit(1);
  }
}

/**
 * This is the function that will be executed when this script is ran.
 * The function will load the translation files, extract the translation keys, and check for missing translations.
 */
export async function main(verbose: boolean = false) {
  console.info("[arolariu.ro::checkTranslations] Checking translations...");
  const currentDirectory = process.cwd();
  const TRANSLATIONS_PATH = currentDirectory.concat("/messages").replace(/\\/g, "/");
  console.info(`[arolariu.ro::checkTranslations] Translations path: ${TRANSLATIONS_PATH}`);

  const EN_TRANSLATIONS_FILE = path.resolve(TRANSLATIONS_PATH, "en.json");
  const RO_TRANSLATIONS_FILE = path.resolve(TRANSLATIONS_PATH, "ro.json");

  const enTranslations = loadTranslationFile(EN_TRANSLATIONS_FILE, verbose);
  const roTranslations = loadTranslationFile(RO_TRANSLATIONS_FILE, verbose);

  // 1st test: compare all message keys:
  compareMessageKeys(enTranslations, roTranslations);

  // 2nd test: compare all message values:
  compareMessageValues(enTranslations, roTranslations);
}

main();
