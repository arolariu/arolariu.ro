/** @format */

import {execSync} from "child_process";
import fs from "node:fs";

/**
 * Clean build artifacts from all projects
 */
export async function main() {
  console.log("🧹 Cleaning all build artifacts...");
  
  try {
    // Clean components
    console.log("📦 Cleaning components...");
    try {
      execSync("cd packages/components && npm run build:clean", {stdio: "inherit"});
    } catch {
      execSync("cd packages/components && rm -rf dist", {stdio: "inherit"});
    }
    console.log("  ✅ Components cleaned");
    
    // Clean website
    console.log("🌐 Cleaning website...");
    try {
      execSync("cd sites/arolariu.ro && npm run clean", {stdio: "inherit"});
    } catch {
      execSync("cd sites/arolariu.ro && rm -rf .next", {stdio: "inherit"});
    }
    console.log("  ✅ Website cleaned");
    
    // Clean docs
    console.log("📚 Cleaning docs...");
    execSync("cd sites/docs.arolariu.ro && rm -rf _site api", {stdio: "inherit"});
    console.log("  ✅ Documentation cleaned");
    
    // Clean API
    console.log("⚙️  Cleaning API...");
    try {
      execSync("cd sites/api.arolariu.ro && dotnet clean", {stdio: "inherit"});
    } catch {
      console.log("  ⚠️  .NET not available");
    }
    console.log("  ✅ API cleaned");
    
    console.log("✅ All projects cleaned!");
  } catch (error) {
    console.error("❌ Error cleaning projects:", error);
    process.exit(1);
  }
}

main();