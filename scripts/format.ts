import {execSync} from "child_process";
import pc from "picocolors";
import {resolveConfigFile} from "prettier";

type FormatTarget = "all" | "packages" | "website" | "cv" | "api";

const directoryMap: Record<Exclude<FormatTarget, "all">, string> = {
  packages: "packages/components/**",
  website: "sites/arolariu.ro/**",
  cv: "sites/cv.arolariu.ro/**",
  api: "sites/api.arolariu.ro/**",
};

/**
 * Checks the code formatting for a specific target using Prettier.
 * @param target The target to check (e.g., "packages", "website", "cv").
 */
async function checkCodeWithPrettier(target: Exclude<FormatTarget, "all" | "api">): Promise<1 | 0> {
  console.log(pc.cyan(`\n🔍 Checking code format for: ${pc.bold(target)}`));
  const directoryToCheck = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  try {
    execSync(
      `tsx node_modules/prettier/bin/prettier.cjs --check ${directoryToCheck} --cache --config ${configFilePath} --config-precedence prefer-file --check-ignore-pragma`,
      {
        stdio: "inherit",
      },
    );
    console.log(pc.green(`  ✓ Code format is correct for ${target}`));
  } catch (error) {
    console.log(pc.yellow(`  ⚠ Code format issues detected for ${target}`));
    return 1;
  }

  return 0;
}

/**
 * Formats the code for a specific target using Prettier.
 * @param target The target to format (e.g., "packages", "website", "cv").
 */
async function formatCodeWithPrettier(target: Exclude<FormatTarget, "all" | "api">): Promise<void> {
  console.log(pc.cyan(`\n✨ Formatting code for: ${pc.bold(target)}`));
  const directoryToFormat = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  try {
    execSync(
      `tsx node_modules/prettier/bin/prettier.cjs --write ${directoryToFormat} --cache --config ${configFilePath} --config-precedence prefer-file --check-ignore-pragma`,
      {
        stdio: "inherit",
      },
    );
    console.log(pc.green(`  ✓ Code formatted successfully for ${target}`));
  } catch (error) {
    console.error(pc.red(`  ✗ Encountered error when formatting ${target}:`), error);
  }
}

async function startPrettier(formatTarget: Exclude<FormatTarget, "api">): Promise<void> {
  console.log(pc.bold(pc.magenta(`\n🎨 Running Prettier for: ${formatTarget}`)));
  if (formatTarget === "all") {
    console.log(pc.yellow("⏱️  Warning: Running format on 'all' may take a while..."));
    const targets: Exclude<FormatTarget, "all" | "api">[] = ["packages", "website", "cv"];
    for (const target of targets) {
      const checkCode = await checkCodeWithPrettier(target);
      if (checkCode !== 0) await formatCodeWithPrettier(target);
      console.log(pc.gray("\n─────────────────────────────────────────────────\n"));
    }
  } else {
    const checkCode = await checkCodeWithPrettier(formatTarget);
    if (checkCode !== 0) await formatCodeWithPrettier(formatTarget);
  }
}

async function startDotnet(formatTarget: Exclude<FormatTarget, "packages" | "website" | "cv">): Promise<void> {
  console.log(pc.bold(pc.magenta(`\n🔧 Running dotnet format for: ${formatTarget}`)));
  if (formatTarget === "all" || formatTarget === "api") {
    console.log(pc.yellow("⏱️  Warning: Running format on 'all' may take a while..."));
    console.log(pc.cyan("\n🔍 Checking .NET code format..."));
    try {
      execSync(`dotnet format arolariu.slnx --verify-no-changes --verbosity detailed`, {
        stdio: "inherit",
      });
      console.log(pc.green("  ✓ .NET code format is correct"));
    } catch (error) {
      console.log(pc.yellow("  ⚠ Code format issues detected, running dotnet format..."));
      try {
        execSync(`dotnet format arolariu.slnx --verbosity detailed`, {
          stdio: "inherit",
        });
        console.log(pc.green("  ✓ .NET code formatted successfully"));
      } catch (formatError) {
        console.error(pc.red("  ✗ Encountered error when formatting with dotnet format:"), formatError);
        throw formatError;
      }
    }
  } else {
    console.error(pc.red("  ✗ Invalid target for dotnet format. Only 'all' or 'api' is supported."));
  }
}

export async function main(arg?: string): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║   arolariu.ro Code Formatter Tool      ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  if (!arg) {
    console.error(pc.red("✗ Missing target argument"));
    console.log(pc.gray("\n💡 Usage: format <all|packages|website|cv|api>"));
    console.log(pc.gray("   - all:      Format all targets (Prettier + dotnet)"));
    console.log(pc.gray("   - packages: Format component packages"));
    console.log(pc.gray("   - website:  Format main website"));
    console.log(pc.gray("   - cv:       Format CV site"));
    console.log(pc.gray("   - api:      Format backend API (.NET)\n"));
    return 1;
  }

  try {
    switch (arg) {
      case "all":
        await startPrettier("all");
        await startDotnet("all");
        break;
      case "packages":
        await startPrettier("packages");
        break;
      case "website":
        await startPrettier("website");
        break;
      case "cv":
        await startPrettier("cv");
        break;
      case "api":
        await startDotnet("api");
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: all, packages, website, cv, api\n"));
        return 1;
    }

    console.log(pc.bold(pc.green("\n✅ Formatting completed successfully!\n")));
    return 0;
  } catch (error) {
    console.error(pc.bold(pc.red("\n❌ Formatting failed with errors\n")));
    console.error(pc.red(JSON.stringify(error, null, 2) || "Unknown error."));
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  main(arg)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
