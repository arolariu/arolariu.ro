import {ESLint, Linter} from "eslint";
import process from "node:process";
import eslintConfig from "../eslint.config.ts";

type LintTarget = "all" | "packages" | "website" | "cv";

/**
 * Load ESLint configuration based on the lint target.
 * This filters the configurations defined in eslint.config.ts.
 * @param lintTarget The target to load the ESLint config for.
 * @returns The ESLint configuration for the specified target.
 */
function loadESLintConfig(lintTarget: LintTarget): Linter.Config<Linter.RulesRecord> | Linter.Config<Linter.RulesRecord>[] {
  switch (lintTarget) {
    case "all":
      return eslintConfig;
    case "packages":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/packages]")!;
    case "website":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/website]")!;
    case "cv":
      return eslintConfig.find((cfg) => cfg.name === "[@arolariu/cv]")!;
    default:
      throw new Error(`Unknown lint target: ${lintTarget}`);
  }
}

async function runESLint(config: Linter.Config<Linter.RulesRecord>) {
  const eslint = new ESLint({
    baseConfig: config,
    cache: false,
    errorOnUnmatchedPattern: true,
  });

  console.log(`Using ESLint config: ${config.name}`);

  const rawPatterns = Array.isArray(config.files) ? config.files : [config.files];
  const stringPatterns = rawPatterns.filter((p): p is string => typeof p === "string");

  console.info(`Lint file paths:`);
  console.info(stringPatterns.map((p) => ` - ${p}`).join("\n"));

  const results = await eslint.lintFiles(stringPatterns);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  if (resultText) {
    console.log(resultText);
  } else {
    console.log(`No linting issues found for target: ${config.name}`);
  }

  const errorCount = results.reduce((sum, res) => sum + res.errorCount, 0);
  const warningCount = results.reduce((sum, res) => sum + res.warningCount, 0);

  if (errorCount > 0 || warningCount > 0) {
    console.log(`ESLint found ${errorCount} errors and ${warningCount} warnings in target: ${config.name}`);
    return errorCount > 0 ? 1 : 0;
  }

  console.log(`ESLint found no issues in target: ${config.name}`);
  return 0;
}

/**
 * Run ESLint for the specified target.
 * @param lintTarget The target to lint.
 */
async function startESLint(lintTarget: LintTarget): Promise<void> {
  console.log(`Running ESLint for target: ${lintTarget}...`);
  let lintConfig = loadESLintConfig(lintTarget);

  if (lintTarget === "all") {
    console.warn("Warning: Running lint on 'all' may take a while...");
    for (const config of Array.isArray(lintConfig) ? lintConfig : [lintConfig]) {
      console.warn("\n===================================================\n");
      await runESLint(config);
      console.warn("\n===================================================\n");
    }
  } else {
    const config = lintConfig as Linter.Config<Linter.RulesRecord>;
    await runESLint(config);
  }
}

export async function main(arg?: string): Promise<number> {
  if (!arg) {
    console.error("Missing target. Usage: lint <all|packages|website|cv>");
    return 1;
  }

  switch (arg) {
    case "all":
      await startESLint("all");
      break;
    case "packages":
      await startESLint("packages");
      break;
    case "website":
      await startESLint("website");
      break;
    case "cv":
      await startESLint("cv");
      break;
    default:
      console.error("Invalid or missing target. Usage: lint <packages|website|cv>");
      return 1;
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
