/** @format */

import {execSync} from "child_process";

/**
 * Install all dependencies across the monorepo
 */
export async function main() {
  console.log("🔧 Installing dependencies...");
  
  try {
    // Install root dependencies
    console.log("📦 Installing root dependencies...");
    execSync("yarn install", {stdio: "inherit"});
    
    // Install components dependencies
    console.log("📦 Installing components dependencies...");
    execSync("cd packages/components && npm install", {stdio: "inherit"});
    
    // Install website dependencies
    console.log("📦 Installing website dependencies...");
    execSync("cd sites/arolariu.ro && npm install", {stdio: "inherit"});
    
    console.log("✅ Dependencies installed successfully!");
  } catch (error) {
    console.error("❌ Error installing dependencies:", error);
    process.exit(1);
  }
}

main();