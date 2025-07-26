/** @format */

import {execSync} from "child_process";
import fs from "node:fs";

/**
 * Show build status across all projects
 */
export async function main() {
  console.log("📊 Build Status Report:\n");
  
  // Components status
  console.log("📦 Components:");
  try {
    const componentsDist = "packages/components/dist";
    if (fs.existsSync(componentsDist)) {
      const files = fs.readdirSync(componentsDist);
      console.log(`  ${files.length} build artifacts found`);
    } else {
      console.log("  ❌ No build artifacts found");
    }
  } catch {
    console.log("  ❌ No build artifacts found");
  }
  
  // Website status
  console.log("🌐 Website:");
  try {
    const websiteNext = "sites/arolariu.ro/.next";
    if (fs.existsSync(websiteNext)) {
      const files = fs.readdirSync(websiteNext);
      console.log(`  ${files.length} build artifacts found`);
    } else {
      console.log("  ❌ No build artifacts found");
    }
  } catch {
    console.log("  ❌ No build artifacts found");
  }
  
  // Documentation status
  console.log("📚 Documentation:");
  try {
    const docsSite = "sites/docs.arolariu.ro/_site";
    if (fs.existsSync(docsSite)) {
      const files = fs.readdirSync(docsSite);
      console.log(`  ${files.length} build artifacts found`);
    } else {
      console.log("  ❌ No build artifacts found");
    }
  } catch {
    console.log("  ❌ No build artifacts found");
  }
  
  // API status
  console.log("⚙️  API:");
  try {
    const result = execSync("find sites/api.arolariu.ro -name 'bin' -type d 2>/dev/null | wc -l", {encoding: "utf8"});
    const count = parseInt(result.trim());
    if (count > 0) {
      console.log(`  ${count} build outputs found`);
    } else {
      console.log("  ❌ No build artifacts found");
    }
  } catch {
    console.log("  ❌ No build artifacts found");
  }
}

main();