/** @format */

import {execSync} from "child_process";

/**
 * Build .NET API
 */
export async function main() {
  console.log("⚙️  Building API...");
  
  try {
    execSync("cd sites/api.arolariu.ro && dotnet build", {stdio: "inherit"});
    console.log("✅ API built successfully!");
  } catch (error) {
    console.log("⚠️  .NET SDK not available - install .NET 9.0 SDK to build API");
    process.exit(1);
  }
}

main();