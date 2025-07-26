/** @format */

import {execSync} from "child_process";

/**
 * Check if a command exists
 */
function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, {stdio: "ignore"});
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if .NET SDK is installed
 */
function checkDotNetSDK(): boolean {
  try {
    const output = execSync("dotnet --version", {encoding: "utf8", stdio: "pipe"});
    console.log(`✅ .NET SDK found: ${output.trim()}`);
    return true;
  } catch {
    console.log("❌ .NET SDK not found");
    console.log("💡 Please install .NET 9.0 SDK from: https://dotnet.microsoft.com/download");
    return false;
  }
}

/**
 * Check if Docker is installed
 */
function checkDocker(): boolean {
  try {
    const output = execSync("docker --version", {encoding: "utf8", stdio: "pipe"});
    console.log(`✅ Docker found: ${output.trim()}`);
    return true;
  } catch {
    console.log("❌ Docker not found");
    console.log("💡 Please install Docker from: https://docs.docker.com/get-docker/");
    return false;
  }
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): boolean {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    if (majorVersion >= 24) {
      console.log(`✅ Node.js ${version} (compatible)`);
      return true;
    } else {
      console.log(`❌ Node.js ${version} is too old. Please upgrade to Node.js 24.0 or later`);
      return false;
    }
  } catch {
    console.log("❌ Unable to check Node.js version");
    return false;
  }
}

/**
 * Install all dependencies across the monorepo
 */
export async function main() {
  console.log("🔧 Setting up development environment...");
  
  // Check prerequisites
  console.log("\n📋 Checking prerequisites...");
  let allPrerequisitesMet = true;
  
  // Check Node.js version
  if (!checkNodeVersion()) {
    allPrerequisitesMet = false;
  }
  
  // Check .NET SDK
  if (!checkDotNetSDK()) {
    allPrerequisitesMet = false;
  }
  
  // Check Docker
  if (!checkDocker()) {
    allPrerequisitesMet = false;
  }
  
  if (!allPrerequisitesMet) {
    console.log("\n⚠️  Some prerequisites are missing. Please install them before continuing.");
    console.log("You can still proceed with frontend development, but backend features may not work.");
    
    // Ask user if they want to continue (in a real scenario, you'd use a prompt library)
    console.log("\nContinuing with frontend package installation...");
  }
  
  try {
    // Install root dependencies
    console.log("\n📦 Installing root dependencies...");
    execSync("yarn install", {stdio: "inherit"});
    
    console.log("\n✅ Dependencies installed successfully!");
    
    if (allPrerequisitesMet) {
      console.log("🎉 Development environment is ready!");
    } else {
      console.log("⚠️  Development environment partially ready (frontend only)");
    }
  } catch (error) {
    console.error("❌ Error installing dependencies:", error);
    process.exit(1);
  }
}

main();