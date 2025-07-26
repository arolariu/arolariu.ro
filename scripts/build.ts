/** @format */

import {execSync} from "child_process";

/**
 * Build all projects sequentially
 */
export async function main() {
  console.log("🏗️  Building all projects sequentially...");
  
  try {
    // Build components
    console.log("📦 Building components...");
    execSync("cd packages/components && npm run build", {stdio: "inherit"});
    console.log("✅ Components built successfully!");
    
    // Build website
    console.log("🌐 Building website...");
    execSync("cd sites/arolariu.ro && npm run build", {stdio: "inherit"});
    console.log("✅ Website built successfully!");
    
    // Build docs
    console.log("📚 Building documentation...");
    try {
      execSync("cd sites/docs.arolariu.ro && docfx docfx.json", {stdio: "inherit"});
      console.log("✅ Documentation built successfully!");
    } catch {
      console.log("⚠️  DocFX not available - install DocFX to build documentation");
    }
    
    // Build API
    console.log("⚙️  Building API...");
    try {
      execSync("cd sites/api.arolariu.ro && dotnet build", {stdio: "inherit"});
      console.log("✅ API built successfully!");
    } catch {
      console.log("⚠️  .NET SDK not available - install .NET 9.0 SDK to build API");
    }
    
    console.log("✅ All builds completed!");
  } catch (error) {
    console.error("❌ Error building projects:", error);
    process.exit(1);
  }
}

main();