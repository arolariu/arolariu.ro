import {execSync} from "child_process";
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
  console.log(`Checking code format for target: ${target}`);
  const directoryToCheck = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  try {
    execSync(
      `tsx node_modules/prettier/bin/prettier.cjs --check ${directoryToCheck} --cache --config ${configFilePath} --config-precedence prefer-file --check-ignore-pragma`,
      {
        stdio: "inherit",
      },
    );
  } catch (error) {
    console.error(error);
    return 1;
  }

  return 0;
}

/**
 * Formats the code for a specific target using Prettier.
 * @param target The target to format (e.g., "packages", "website", "cv").
 */
async function formatCodeWithPrettier(target: Exclude<FormatTarget, "all" | "api">): Promise<void> {
  console.log(`Formatting code for target: ${target}`);
  const directoryToFormat = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  try {
    execSync(
      `tsx node_modules/prettier/bin/prettier.cjs --write ${directoryToFormat} --cache --config ${configFilePath} --config-precedence prefer-file --check-ignore-pragma`,
      {
        stdio: "inherit",
      },
    );
  } catch (error) {
    console.error(`Encountered error when formatting ${target}, error:`, error);
  }
}

async function startPrettier(formatTarget: Exclude<FormatTarget, "api">): Promise<void> {
  console.log(`Running Prettier for target: ${formatTarget}...`);
  if (formatTarget === "all") {
    console.warn("Warning: Running format on 'all' may take a while...");
    const targets: Exclude<FormatTarget, "all" | "api">[] = ["packages", "website", "cv"];
    for (const target of targets) {
      const checkCode = await checkCodeWithPrettier(target);
      if (checkCode !== 0) await formatCodeWithPrettier(target);
      console.warn("\n===================================================\n");
    }
  } else {
    const checkCode = await checkCodeWithPrettier(formatTarget);
    if (checkCode !== 0) await formatCodeWithPrettier(formatTarget);
  }
}

async function startDotnet(formatTarget: Exclude<FormatTarget, "packages" | "website" | "cv">): Promise<void> {
  console.log(`Running dotnet format for target: ${formatTarget}...`);
  if (formatTarget === "all" || formatTarget === "api") {
    console.warn("Warning: Running format on 'all' may take a while...");
    try {
      execSync(`dotnet format arolariu.slnx --verify-no-changes --verbosity detailed`, {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Code is not formatted properly, running dotnet format...");
      try {
        execSync(`dotnet format arolariu.slnx --verbosity detailed`, {
          stdio: "inherit",
        });
      } catch (formatError) {
        console.error("Encountered error when formatting with dotnet format, error:", formatError);
      }
      console.debug("error:", error);
    }
  } else {
    console.error("Invalid target for dotnet format. Only 'all' or 'api' is supported.");
  }
}

export async function main(arg?: string): Promise<number> {
  if (!arg) {
    console.error("Missing target. Usage: format <all|packages|website|cv|api>");
    return 1;
  }

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
      console.error("Invalid or missing target. Usage: format <packages|website|cv|api>");
  }

  return 0;
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

