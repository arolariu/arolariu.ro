/** @format */

import fs from "node:fs";
import path from "node:path";

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
function extractMessageKeys(messages: MessageFormat, verbose: boolean = false): string[] {
  const keys: string[] = [];

  for (const key in messages) {
    verbose && console.info(`[arolariu.ro::generateTranslations] Extracting key: ${key} from message...`);
    if (typeof messages[key] === "string") {
      keys.push(key);
    } else {
      verbose && console.info(`[arolariu.ro::generateTranslations] Key: ${key} is a MessageFormat object. Extracting subkeys...`);
      const subKeys = extractMessageKeys(messages[key] as MessageFormat);
      subKeys.forEach((subKey) => keys.push(`${key}.${subKey}`));
    }
  }

  console.info(`[arolariu.ro::generateTranslations] Extracted keys from translation file: ${keys.length}`);
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

  englishKeys.forEach((key) => {
    verbose && console.info(`[arolariu.ro::generateTranslations] Checking key: ${key}...`);
    if (!translatedKeys.includes(key)) {
      missingKeys.push(key);
    }
  });

  console.info(`[arolariu.ro::generateTranslations] Number of found missing keys: ${missingKeys.length}`);
  return missingKeys;
}

/**
 * This function loads into memory a translation file.
 * The translation file should be a JSON file.
 * @param filePath The path to the translation file.
 * @returns The translation file as a MessageFormat object.
 */
function loadTranslationFile(filePath: string, verbose: boolean = false): MessageFormat {
  try {
    const translationFile = fs.readFileSync(filePath, "utf-8");
    verbose && console.info(`[arolariu.ro::generateTranslations] Loaded translation file: ${filePath}`);
    verbose && console.info(`[arolariu.ro::generateTranslations] Translation file content: ${translationFile}`);
    return JSON.parse(translationFile);
  } catch (error) {
    console.error(`[arolariu.ro::generateTranslations] Error loading translation file: ${filePath}`);
    throw error;
  }
}

/**
 * This function will write the missing translation keys to a file.
 * A missing translation key can be either a string or a MessageFormat object.
 * The function will write the missing keys to a JSON file.
 * ---------
 * Example:
 * {
 * "Home": "Acasă",
 * "Domains": {
 *   "title": "Domenii",
 *  "services": {
 *  "title": "Servicii",
 * "invoices": {
 * "title": "Facturi",
 * }
 * }
 * }
 * }
 * ---------
 * The above object has the following keys array:
 * ["Home", "Domains", "Domains.title", "Domains.services", "Domains.services.title", "Domains.services.invoices", "Domains.services.invoices.title"]
 * ---------
 * The function will write the missing keys to a JSON file.
 * If the file already exists, the function will append the missing keys to the existing file.
 * If the file does not exist, the function will create a new file and write the missing keys to it.
 * ---------
 * @param filePath The path to the file where the missing keys will be written.
 * @param translationKeys The array of missing translation keys.
 */
function writeTranslationKeysFile(filePath: string, translationKeys: string[], verbose: boolean = false) {
  try {
    let existingMessages: MessageFormat = {};

    if (fs.existsSync(filePath)) {
      console.info(`[arolariu.ro::generateTranslations] Translations file exists: ${filePath}`);
      const existingFile = fs.readFileSync(filePath, "utf-8");
      existingMessages = JSON.parse(existingFile);
    } else {
      console.warn(`[arolariu.ro::generateTranslations] File does not exist: ${filePath}`);
      fs.writeFileSync(filePath, "{}", "utf-8");
      console.warn(`[arolariu.ro::generateTranslations] Created file: ${filePath}`);
    }

    // Add the missing keys to the existing messages
    translationKeys.forEach((key) => {
      let currentObject = existingMessages;
      const keyParts = key.split(".");

      keyParts.forEach((keyPart, index) => {
        if (index === keyParts.length - 1) {
          currentObject[keyPart] = "";
        } else {
          if (!currentObject[keyPart]) {
            currentObject[keyPart] = {};
          }
          verbose && console.info(`[arolariu.ro::generateTranslations] Adding key: ${keyPart} to object...`);
          currentObject = currentObject[keyPart] as MessageFormat;
        }
      });
    });

    fs.writeFileSync(filePath, JSON.stringify(existingMessages, null, 2), "utf-8");

    console.info(`[arolariu.ro::generateTranslations] Wrote missing keys to file: ${filePath}`);
  } catch (error) {
    console.error(`[arolariu.ro::generateTranslations] Error writing missing keys to file: ${filePath}`);
    throw error;
  }
}

/**
 * This is the main function of the script.
 * @param verbose A boolean flag that indicates if the script should log verbose output.
 */
export async function main(verbose: boolean = false) {
  console.info("[arolariu.ro::generateTranslations] Generating translations...");
  const currentDirectory = process.cwd();
  const TRANSLATIONS_PATH = currentDirectory.concat("/messages").replace(/\\/g, "/");
  console.info(`[arolariu.ro::generateTranslations] Translations path: ${TRANSLATIONS_PATH}`);

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

  console.info("[arolariu.ro::generateTranslations] Writing missing translations to file...");
  writeTranslationKeysFile(RO_TRANSLATIONS_FILE, missingKeys, verbose);
}

main();
