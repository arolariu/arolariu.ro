/* eslint-disable */

import {execSync} from "child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const platform = os.platform();

/**
 * This function will search recursively for a folder or file inside a directory.
 * If the folder or file is found, it will return the path to the item.
 * This function will NOT leave the current working directory given.
 * This function will SKIP the node_modules folder.
 * @param directory The directory to search in.
 * @returns The path to the folder/file, if it exists. Otherwise, it will return null.
 */
function searchDirectory(directory: string, itemName: string, verbose: boolean = false): string | null {
  const entries = fs.readdirSync(directory, {withFileTypes: true});

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    verbose && console.warn(`[arolariu::clean] >>> (search) Current entry: ${fullPath}`);
    if (entry.name === "node_modules") {
      verbose && console.warn(`[arolariu::clean] >>> (search) Skipping node_modules directory: ${fullPath}`);
      continue;
    }
    if (entry.isDirectory() && entry.name === itemName) {
      console.log(`[arolariu::clean] >>> The ${itemName} folder has been found: ${fullPath}`);
      return fullPath;
    } else if (entry.isFile() && entry.name === itemName) {
      console.log(`[arolariu::clean] >>> The ${itemName} file has been found: ${fullPath}`);
      return fullPath;
    } else if (entry.isDirectory()) {
      verbose && console.warn(`[arolariu::clean] >>> (search) Searching in directory: ${fullPath}`);
      const result = searchDirectory(fullPath, itemName, verbose);
      if (result) return result;
    }
  }

  verbose && console.warn(`[arolariu::clean] >>> The ${itemName} has not been found in the directory: ${directory}`);
  return null;
}

/**
 * This function will find the path to a folder, inside of the current working directory.
 * It will search recursively for the folder. If the folder is not found, it will return null.
 * @param folderName The name of the folder to search for.
 * @returns The path to the folder, if it exists. Otherwise, it will return null.
 */
function findFolderPath(folderName: string, verbose: boolean = false): string | null {
  console.log(`[arolariu::clean] >>> Searching for the ${folderName} folder...`);

  const currentPath = process.cwd();
  const folderPath = searchDirectory(currentPath, folderName, verbose);
  verbose && console.warn(`[arolariu::clean] >>> (findFolderPath) folderPath: ${folderPath}`);

  return folderPath;
}

/**
 * This function will find the path to a file, inside of the current working directory.
 * @param fileName The name of the file to search for.
 * @returns The path to the file, if it exists. Otherwise, it will return null.
 */
function findFilePath(fileName: string, verbose: boolean = false): string | null {
  console.log(`[arolariu::clean] >>> Searching for the ${fileName} file...`);

  const currentPath = process.cwd();
  const filePath = searchDirectory(currentPath, fileName, verbose);
  verbose && console.warn(`[arolariu::clean] >>> (findFilePath) filePath: ${filePath}`);

  return filePath;
}

/**
 * This function will clean a folder.
 * By clean, we mean that the folder will be deleted.
 * @param folderPath The path to the folder that will be cleaned.
 */
function cleanFolder(folderPath: string) {
  console.log(`[arolariu::clean] >>> Cleaning the ${folderPath} folder...`);

  try {
    if (!fs.existsSync(folderPath)) {
      console.warn(`[arolariu::clean] The ${folderPath} folder does not exist!`);
    } else {
      if (platform === "win32") {
        execSync(`rmdir /s /q ${folderPath}`);
      } else {
        execSync(`rm -rf ${folderPath}`);
      }

      console.log(`[arolariu::clean] >>> The ${folderPath} folder has been cleaned.`);
    }
  } catch (error) {
    console.error(`[arolariu::clean] >>> Error cleaning the ${folderPath} folder:`, error);
  } finally {
    console.log(`[arolariu::clean] >>> The ${folderPath} folder has been processed.`);
  }
}

/**
 * This function will clean a file.
 * By clean, we mean that the file will be deleted.
 * @param filePath The path to the file that will be cleaned.
 */
function cleanFile(filePath: string) {
  console.log(`[arolariu::clean] >>> Cleaning the ${filePath} file...`);

  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[arolariu::clean] The ${filePath} file does not exist!`);
    } else {
      if (platform === "win32") {
        execSync(`del /f ${filePath}`);
      } else {
        execSync(`rm -f ${filePath}`);
      }

      console.log(`[arolariu::clean] >>> The ${filePath} file has been cleaned.`);
    }
  } catch (error) {
    console.error(`[arolariu::clean] >>> Error cleaning the ${filePath} file:`, error);
  } finally {
    console.log(`[arolariu::clean] >>> The ${filePath} file has been processed.`);
  }
}

/**
 * This function will be the entry point of the script.
 */
export async function main(verbose: boolean = false) {
  const nextFolder = findFolderPath(".next", verbose);
  const storybookFolder = findFolderPath("storybook-static", verbose);
  const folders = [nextFolder, storybookFolder].filter((folder): folder is string => folder !== null);

  const testFile = findFilePath("test.txt", verbose);
  const files = [testFile].filter((file): file is string => file !== null);

  console.info("[arolariu::clean] >>> Starting the clean script...");
  for (const folder of folders) cleanFolder(folder);
  for (const file of files) cleanFile(file);
  console.info("[arolariu::clean] >>> The script has been executed successfully.");
}

main();
