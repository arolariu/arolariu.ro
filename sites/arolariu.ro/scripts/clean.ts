/** @format */

/**
 * This script cleans the .next folder.
 */

import {execSync} from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const platform = os.platform();

const nextFolder = path.join(process.cwd(), ".next");

if (fs.existsSync(nextFolder)) {
  console.log("Cleaning the .next folder...");
  if (platform === "win32") {
    execSync(`rmdir /s /q ${nextFolder}`);
  } else {
    execSync(`rm -rf ${nextFolder}`);
  }
  console.log("The .next folder has been cleaned.");
} else {
  console.log("The .next folder does not exist!");
}
