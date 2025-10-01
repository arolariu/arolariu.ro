import {execSync} from "child_process";
import {existsSync, mkdirSync} from "fs";
import {homedir, platform, tmpdir} from "os";
import {join} from "path";
import pc from "picocolors";

const REQUIRED_DOTNET_VERSION = 10;
const REQUIRED_NODE_VERSION = 24;
const REQUIRED_NPM_VERSION = 11;

/**
 * Check if a command exists in the system
 */
function commandExists(command: string): boolean {
  try {
    const testCmd = platform() === "win32" ? `where ${command}` : `which ${command}`;
    execSync(testCmd, {stdio: "pipe"});
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current .NET SDK version
 */
function getDotnetVersion(): {installed: boolean; version: string; majorVersion: number} {
  if (!commandExists("dotnet")) {
    return {installed: false, version: "not installed", majorVersion: 0};
  }

  try {
    const result = execSync("dotnet --version", {encoding: "utf-8", stdio: "pipe"});
    const version = result.trim();
    const majorVersion = parseInt(version.split(".")[0]!, 10);
    return {installed: true, version, majorVersion};
  } catch {
    return {installed: false, version: "error", majorVersion: 0};
  }
}

/**
 * Get the current Node.js version
 */
function getNodeVersion(): {installed: boolean; version: string; majorVersion: number} {
  if (!commandExists("node")) {
    return {installed: false, version: "not installed", majorVersion: 0};
  }

  try {
    const result = execSync("node --version", {encoding: "utf-8", stdio: "pipe"});
    const version = result.trim().replace("v", "");
    const majorVersion = parseInt(version.split(".")[0]!, 10);
    return {installed: true, version, majorVersion};
  } catch {
    return {installed: false, version: "error", majorVersion: 0};
  }
}

/**
 * Get the current npm version
 */
function getNpmVersion(): {installed: boolean; version: string; majorVersion: number} {
  if (!commandExists("npm")) {
    return {installed: false, version: "not installed", majorVersion: 0};
  }

  try {
    const result = execSync("npm --version", {encoding: "utf-8", stdio: "pipe"});
    const version = result.trim();
    const majorVersion = parseInt(version.split(".")[0]!, 10);
    return {installed: true, version, majorVersion};
  } catch {
    return {installed: false, version: "error", majorVersion: 0};
  }
}

/**
 * Download and install .NET 10 SDK
 */
async function installDotnet(): Promise<boolean> {
  console.log(pc.cyan("\n📥 Installing .NET 10 SDK..."));

  const isWindows = platform() === "win32";
  const installDir = join(homedir(), ".dotnet");

  try {
    // Create install directory if it doesn't exist
    if (!existsSync(installDir)) {
      mkdirSync(installDir, {recursive: true});
    }

    if (isWindows) {
      // Download and run PowerShell install script
      console.log(pc.gray("  → Downloading .NET install script for Windows..."));
      const scriptPath = join(tmpdir(), "dotnet-install.ps1");

      // Download the script
      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://dot.net/v1/dotnet-install.ps1' -OutFile '${scriptPath}'"`,
        {stdio: "inherit"},
      );

      // Run the script to install .NET 10
      console.log(pc.gray("  → Installing .NET 10 SDK..."));
      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Channel 10.0 -InstallDir "${installDir}" -Version latest`,
        {stdio: "inherit"},
      );
    } else {
      // Download and run bash install script for Linux/macOS
      console.log(pc.gray("  → Downloading .NET install script for Unix..."));
      const scriptPath = join(tmpdir(), "dotnet-install.sh");

      // Download the script
      execSync(`curl -sSL https://dot.net/v1/dotnet-install.sh -o "${scriptPath}"`, {stdio: "inherit"});
      execSync(`chmod +x "${scriptPath}"`, {stdio: "inherit"});

      // Run the script to install .NET 10
      console.log(pc.gray("  → Installing .NET 10 SDK..."));
      execSync(`"${scriptPath}" --channel 10.0 --install-dir "${installDir}" --version latest`, {stdio: "inherit"});
    }

    // Add to PATH for current session
    process.env["PATH"] = `${installDir}${isWindows ? ";" : ":"}${process.env["PATH"]}`;
    process.env["DOTNET_ROOT"] = installDir;

    console.log(pc.green("  ✓ .NET 10 SDK installed successfully!"));
    console.log(pc.yellow(`  ⚠ Please add ${installDir} to your PATH environment variable permanently.`));
    console.log(pc.yellow(`  ⚠ Also set DOTNET_ROOT=${installDir}`));

    return true;
  } catch (error: any) {
    console.error(pc.red("  ✗ Failed to install .NET 10 SDK:"), error.message);
    return false;
  }
}

/**
 * Download and install Node.js 24
 */
async function installNodeJs(): Promise<boolean> {
  console.log(pc.cyan("\n📥 Installing Node.js 24..."));

  const currentPlatform = platform();
  const arch = process.arch;

  // Map process.arch to Node.js download arch naming
  const archMap: Record<string, string> = {
    x64: "x64",
    arm64: "arm64",
    ia32: "x86",
  };

  const nodeArch = archMap[arch] || arch;

  try {
    if (currentPlatform === "win32") {
      console.log(pc.gray("  → Downloading Node.js 24 installer for Windows..."));
      const installerUrl = `https://nodejs.org/dist/v24.9.0/node-v24.9.0-${nodeArch}.msi`;
      const installerPath = join(tmpdir(), "node-installer.msi");

      execSync(`powershell -Command "Invoke-WebRequest -Uri '${installerUrl}' -OutFile '${installerPath}'"`, {
        stdio: "inherit",
      });

      console.log(pc.gray("  → Running Node.js installer..."));
      console.log(pc.yellow("  ⚠ Please follow the installation wizard to complete the installation."));
      execSync(`msiexec /i "${installerPath}" /qn`, {stdio: "inherit"});
    } else if (currentPlatform === "darwin") {
      console.log(pc.gray("  → Downloading Node.js 24 package for macOS..."));
      const installerUrl = `https://nodejs.org/dist/v24.9.0/node-v24.9.0.pkg`;
      const installerPath = join(tmpdir(), "node-installer.pkg");

      execSync(`curl -o "${installerPath}" "${installerUrl}"`, {stdio: "inherit"});

      console.log(pc.gray("  → Running Node.js installer..."));
      console.log(pc.yellow("  ⚠ You may be prompted for your password."));
      execSync(`sudo installer -pkg "${installerPath}" -target /`, {stdio: "inherit"});
    } else {
      // Linux - download and extract tarball
      console.log(pc.gray("  → Downloading Node.js 24 for Linux..."));
      const installDir = join(homedir(), ".nodejs");
      const tarballUrl = `https://nodejs.org/dist/v24.9.0/node-v24.9.0-linux-${nodeArch}.tar.xz`;
      const tarballPath = join(tmpdir(), "node.tar.xz");

      execSync(`curl -o "${tarballPath}" "${tarballUrl}"`, {stdio: "inherit"});

      if (!existsSync(installDir)) {
        mkdirSync(installDir, {recursive: true});
      }

      console.log(pc.gray("  → Extracting Node.js..."));
      execSync(`tar -xf "${tarballPath}" -C "${installDir}" --strip-components=1`, {stdio: "inherit"});

      // Add to PATH for current session
      const binDir = join(installDir, "bin");
      process.env["PATH"] = `${binDir}:${process.env["PATH"]}`;

      console.log(pc.yellow(`  ⚠ Please add ${binDir} to your PATH environment variable permanently.`));
    }

    console.log(pc.green("  ✓ Node.js 24 installation completed!"));
    console.log(pc.yellow("  ⚠ You may need to restart your terminal or IDE for changes to take effect."));

    return true;
  } catch (error: any) {
    console.error(pc.red("  ✗ Failed to install Node.js 24:"), error.message);
    console.log(pc.yellow("\n  💡 Please install Node.js 24 manually from https://nodejs.org/"));
    return false;
  }
}

/**
 * Main setup function
 */
export async function main(): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║   arolariu.ro Development Setup Tool   ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  let hasErrors = false;

  // Check .NET version
  console.log(pc.bold("\n🔍 Checking .NET SDK..."));
  const dotnetInfo = getDotnetVersion();

  if (!dotnetInfo.installed) {
    console.log(pc.red(`  ✗ .NET is not installed`));
    console.log(pc.yellow(`  → Required: .NET ${REQUIRED_DOTNET_VERSION}.x`));

    const installed = await installDotnet();
    if (!installed) {
      hasErrors = true;
    }
  } else if (dotnetInfo.majorVersion < REQUIRED_DOTNET_VERSION) {
    console.log(pc.yellow(`  ⚠ Found .NET ${dotnetInfo.version}`));
    console.log(pc.yellow(`  → Required: .NET ${REQUIRED_DOTNET_VERSION}.x`));

    const installed = await installDotnet();
    if (!installed) {
      hasErrors = true;
    }
  } else {
    console.log(pc.green(`  ✓ .NET ${dotnetInfo.version} is installed`));
  }

  // Check Node.js version
  console.log(pc.bold("\n🔍 Checking Node.js..."));
  const nodeInfo = getNodeVersion();

  if (!nodeInfo.installed) {
    console.log(pc.red(`  ✗ Node.js is not installed`));
    console.log(pc.yellow(`  → Required: Node.js ${REQUIRED_NODE_VERSION}.x or higher`));

    const installed = await installNodeJs();
    if (!installed) {
      hasErrors = true;
    }
  } else if (nodeInfo.majorVersion < REQUIRED_NODE_VERSION) {
    console.log(pc.yellow(`  ⚠ Found Node.js ${nodeInfo.version}`));
    console.log(pc.yellow(`  → Required: Node.js ${REQUIRED_NODE_VERSION}.x or higher`));

    const installed = await installNodeJs();
    if (!installed) {
      hasErrors = true;
    }
  } else {
    console.log(pc.green(`  ✓ Node.js ${nodeInfo.version} is installed`));
  }

  // Check npm version
  console.log(pc.bold("\n🔍 Checking npm..."));
  const npmInfo = getNpmVersion();

  if (!npmInfo.installed) {
    console.log(pc.red(`  ✗ npm is not installed`));
    console.log(pc.yellow(`  → npm should be installed with Node.js`));
    hasErrors = true;
  } else if (npmInfo.majorVersion < REQUIRED_NPM_VERSION) {
    console.log(pc.yellow(`  ⚠ Found npm ${npmInfo.version}`));
    console.log(pc.yellow(`  → Required: npm ${REQUIRED_NPM_VERSION}.x or higher`));
    console.log(pc.gray(`  → Updating npm...`));

    try {
      execSync("npm install -g npm@latest", {stdio: "inherit"});
      console.log(pc.green(`  ✓ npm updated successfully`));
    } catch (error: any) {
      console.error(pc.red(`  ✗ Failed to update npm: ${error.message}`));
      hasErrors = true;
    }
  } else {
    console.log(pc.green(`  ✓ npm ${npmInfo.version} is installed`));
  }

  // Stop if there were critical errors
  if (hasErrors) {
    console.log(pc.bold(pc.red("\n❌ Setup encountered errors. Please resolve them before continuing.\n")));
    return 1;
  }

  // Final summary
  if (hasErrors) {
    console.log(pc.bold(pc.red("\n❌ Setup completed with errors.\n")));
    return 1;
  }

  console.log(pc.bold(pc.green("\n✅ Setup completed successfully!")));
  console.log(pc.gray("\n📝 Next steps:"));
  console.log(pc.gray("  1. Restart your terminal or IDE if you installed new software"));
  console.log(pc.gray("  2. Run 'npm run dev' to start development"));
  console.log(pc.gray("  3. Check the README.md for more information\n"));

  return 0;
}

if (import.meta.main) {
  main()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error(pc.red("\n❌ Unexpected error:"), error);
      process.exit(1);
    });
}
