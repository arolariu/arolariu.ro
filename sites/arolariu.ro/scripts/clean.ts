/** @format */

/**
 * This script cleans the .next and storybook-static folders.
 */

import {execSync} from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const platform = os.platform();

const nextFolder = path.join(process.cwd(), ".next");
const storybookFolder = path.join(process.cwd(), "storybook-static");
const folders = [nextFolder, storybookFolder];

const testFile = path.join(process.cwd(), "test.txt");
const files = [testFile];

function cleanFolder(folderPath: string) {
  console.log(`[arolariu::clean] >>> Cleaning the ${folderPath} folder...`);

  if (platform === "win32") {
    execSync(`rmdir /s /q ${folderPath}`);
  } else {
    execSync(`rm -rf ${folderPath}`);
  }

  console.log(`[arolariu::clean] >>> The ${folderPath} folder has been cleaned.`);
}

function cleanFile(filePath: string) {
  console.log(`[arolariu::clean] >>> Cleaning the ${filePath} file...`);

  if (platform === "win32") {
    execSync(`del /f ${filePath}`);
  } else {
    execSync(`rm -f ${filePath}`);
  }

  console.log(`[arolariu::clean] >>> The ${filePath} file has been cleaned.`);
}

console.info("[arolariu::clean] >>> Starting the script...");

for (const folder of folders) {
  try {
    if (!fs.existsSync(folder)) {
      console.warn(`[arolariu::clean] The ${folder} folder does not exist!`);
    } else {
      cleanFolder(folder);
    }
  } catch (error) {
    console.error(`[arolariu::clean] >>> Error cleaning the ${folder} folder:`, error);
  }
}
for (const file of files) {
  try {
    if (!fs.existsSync(file)) {
      console.warn(`[arolariu::clean] The ${file} file does not exist!`);
    } else {
      cleanFile(file);
    }
  } catch (error) {
    console.error(`[arolariu::clean] >>> Error cleaning the ${file} file:`, error);
  }
}

console.info("[arolariu::clean] >>> The script has been executed successfully.");
